'use strict';
const path = require('path');
const { loadConfig } = require('./lib/config');
const { matchesAny } = require('./lib/glob');
const { expandHome, resolveReal, isInside } = require('./lib/paths');
const { readStdinJson } = require('./lib/io');

const FILE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

function respond(decision, reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decision,
      permissionDecisionReason: `[claude-guard] ${reason}`,
    },
  }));
}

// 파일 경로 하나를 판정: { decision, reason } 또는 null(통과)
function checkFile(filePath, root, cfg) {
  const target = resolveReal(path.resolve(root, filePath));
  const realRoot = resolveReal(root);
  const rel = path.relative(realRoot, target);

  if (!isInside(realRoot, target)) {
    const allowed = cfg.allowOutside.some((d) => isInside(resolveReal(expandHome(d)), target));
    if (!allowed) return { decision: 'deny', reason: `프로젝트 루트 밖 경로입니다: ${target}` };
    return null;
  }
  if (matchesAny(cfg.allow, rel)) return null;
  if (matchesAny(cfg.sensitive, rel)) return { decision: 'deny', reason: `민감 파일 수정은 차단됩니다: ${rel}` };
  if (matchesAny(cfg.settings, rel)) return { decision: 'ask', reason: `설정 파일 수정 확인이 필요합니다: ${rel}` };
  return null;
}

// Bash 명령에 민감 파일명이 보이면 차단
function checkBash(command, cfg) {
  const tokens = String(command).split(/[\s"'`<>|&;()=]+/).filter(Boolean);
  const hit = tokens.find((t) => !matchesAny(cfg.allow, t) && matchesAny(cfg.sensitive, t));
  return hit ? { decision: 'deny', reason: `Bash 명령에서 민감 파일 접근이 감지되었습니다: ${hit}` } : null;
}

function main() {
  const payload = readStdinJson();
  if (!payload) return;
  const root = process.env.CLAUDE_PROJECT_DIR || payload.cwd || process.cwd();
  const cfg = loadConfig(root).scopeGuard;
  if (!cfg.enabled) return;

  const input = payload.tool_input || {};
  let result = null;
  if (FILE_TOOLS.has(payload.tool_name)) {
    const filePath = input.file_path || input.notebook_path;
    if (filePath) result = checkFile(filePath, root, cfg);
  } else if (payload.tool_name === 'Bash' && cfg.checkBash) {
    result = checkBash(input.command, cfg);
  }
  if (result) respond(result.decision, result.reason);
}

try {
  main();
} catch {
  // 훅 오류로 작업이 막히지 않도록 통과
}
