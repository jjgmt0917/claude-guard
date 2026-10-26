'use strict';
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');

// 요약용 claude가 이 훅을 다시 발동해도 알림이 중복되지 않도록 구분하는 환경변수
const SUMMARY_ENV = 'CLAUDE_GUARD_SUMMARY';

// transcript(jsonl)에서 마지막 assistant 텍스트 추출
function lastAssistantText(transcriptPath) {
  let last = '';
  try {
    for (const line of fs.readFileSync(transcriptPath, 'utf8').split(/\r?\n/)) {
      if (!line.trim()) continue;
      let entry;
      try { entry = JSON.parse(line); } catch { continue; }
      if (entry.type !== 'assistant') continue;
      const content = entry.message && entry.message.content;
      if (!Array.isArray(content)) continue;
      const text = content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
      if (text.trim()) last = text;
    }
  } catch {
    return '';
  }
  return last;
}

// 요약 문장을 반환. claude 호출이 실패하면 답변 앞부분을 잘라 대신 사용
function summarize(transcriptPath, cfg) {
  const answer = lastAssistantText(transcriptPath).slice(0, cfg.maxInputChars);
  if (!answer) return '';

  // 프롬프트도 stdin으로 넘겨 셸 인자 인용 문제를 피한다. cwd는 임시 폴더(프로젝트 훅 회피)
  const run = spawnSync('claude', ['-p', '--model', cfg.model, '--no-session-persistence'], {
    input: `${cfg.prompt}\n\n${answer}`,
    cwd: os.tmpdir(),
    encoding: 'utf8',
    timeout: cfg.timeoutSec * 1000,
    shell: process.platform === 'win32',
    env: { ...process.env, [SUMMARY_ENV]: '1' },
  });
  // 전역 CLAUDE.md의 인사가 앞에 붙을 수 있어 마지막 줄만 사용
  const lines = String(run.stdout || '').split(/\r?\n/).filter((l) => l.trim());
  if (run.status === 0 && lines.length) return lines[lines.length - 1].trim();
  return answer.replace(/\s+/g, ' ').slice(0, cfg.maxFallbackChars);
}

module.exports = { summarize, SUMMARY_ENV };
