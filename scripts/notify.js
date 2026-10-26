'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { loadConfig } = require('./lib/config');
const { readStdinJson } = require('./lib/io');
const { showToast } = require('./lib/toast');
const { summarize, SUMMARY_ENV } = require('./lib/summary');

const STATE_DIR = path.join(os.tmpdir(), 'claude-guard');
const MESSAGES = {
  permission: '권한 승인을 기다리고 있습니다.',
  idle: '입력을 기다리고 있습니다.',
  question: '질문에 답변이 필요합니다.',
  stop: '작업이 완료되었습니다.',
};

const startFile = (sessionId) => path.join(STATE_DIR, `${String(sessionId).replace(/[^\w-]/g, '_')}.start`);

function markStart(payload) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(startFile(payload.session_id), String(Date.now()));
}

// Stop: 시작 시각 기록이 있고 임계값 이상 걸린 경우에만 true
function stopIsSlowEnough(payload, minSeconds) {
  const file = startFile(payload.session_id);
  try {
    const elapsed = (Date.now() - Number(fs.readFileSync(file, 'utf8'))) / 1000;
    fs.unlinkSync(file);
    return elapsed >= minSeconds;
  } catch {
    return false;
  }
}

// 요약은 오래 걸릴 수 있어 분리 실행(Claude가 기다리지 않음)
function spawnSummaryWorker(root, transcriptPath) {
  spawn(process.execPath, [__filename, 'summary', root, transcriptPath], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  }).unref();
}

function main() {
  const kind = process.argv[2];

  // 분리 실행된 요약 워커: 요약 후 토스트
  if (kind === 'summary') {
    const [root, transcriptPath] = process.argv.slice(3);
    const cfg = loadConfig(root).notify;
    const text = summarize(transcriptPath, cfg.summary) || MESSAGES.stop;
    showToast(cfg.labels.stop, `[${path.basename(root)}] ${text}`);
    return;
  }

  if (process.env[SUMMARY_ENV]) return;
  const payload = readStdinJson();
  if (!payload) return;
  const root = process.env.CLAUDE_PROJECT_DIR || payload.cwd || process.cwd();
  const cfg = loadConfig(root).notify;
  if (!cfg.enabled) return;

  if (kind === 'start') return markStart(payload);
  if (!cfg.events[kind]) return;
  if (kind === 'stop' && !stopIsSlowEnough(payload, cfg.stopMinSeconds)) return;

  if (kind === 'stop' && cfg.summary.enabled && payload.transcript_path) {
    return spawnSummaryWorker(root, payload.transcript_path);
  }
  const detail = kind === 'permission' && payload.message ? payload.message : MESSAGES[kind];
  showToast(cfg.labels[kind], `[${path.basename(root)}] ${detail}`);
}

try {
  main();
} catch {
  // 알림 실패가 Claude 동작에 영향을 주지 않도록 무시
}
