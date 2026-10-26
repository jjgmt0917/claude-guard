'use strict';
const fs = require('fs');
const path = require('path');

// 프로젝트 설정 파일 경로(프로젝트 루트 기준)
const CONFIG_REL_PATH = path.join('.claude', 'claude-guard.json');

// 내장 기본값. 프로젝트 설정의 배열은 뒤에 추가되고, 스칼라 값은 덮어쓴다.
const DEFAULTS = {
  scopeGuard: {
    enabled: true,
    // 차단(deny): 민감 파일
    sensitive: [
      '.env', '.env.*', '*.pem', '*.key', '*.p12', '*.pfx', '*.keystore',
      'id_rsa*', 'id_ed25519*', '*.token', 'credentials*', '.netrc', '.npmrc',
      '**/secrets/**',
    ],
    // 확인 요청(ask): 설정 파일
    settings: [
      'package.json', 'package-lock.json', 'tsconfig*.json', '*.config.js',
      '*.config.ts', '*.config.mjs', '*.config.cjs', 'pyproject.toml',
      'requirements*.txt', 'Dockerfile', 'docker-compose*.yml',
      '.claude/settings*.json', '.claude/claude-guard.json', '.github/workflows/**',
    ],
    // 위 두 목록에서 제외(항상 허용)
    allow: ['.env.example', '.env.sample'],
    // 프로젝트 루트 밖이지만 허용할 디렉터리(~ 는 홈으로 치환)
    allowOutside: ['~/.claude/plans'],
    // Bash 명령에 민감 파일이 보이면 차단
    checkBash: true,
  },
  notify: {
    enabled: true,
    events: { permission: true, idle: true, question: true, stop: true },
    // Stop 알림은 응답 소요 시간이 이 값(초) 이상일 때만
    stopMinSeconds: 30,
    // 이벤트별 토스트 제목
    labels: {
      permission: '🔔 승인 요청이 왔습니다',
      idle: '⌨️ 입력을 기다리고 있습니다',
      question: '❓ 질문이 왔습니다',
      stop: '✅ 답변이 끝났습니다',
    },
    // Stop 알림 본문을 마지막 답변 요약으로 채운다(claude -p 호출, 실패 시 앞부분 잘라서 표시)
    summary: {
      enabled: true,
      model: 'haiku',
      timeoutSec: 25,
      maxInputChars: 4000,
      maxFallbackChars: 40,
      prompt: '다음 답변의 핵심을 40자 이내 한 문장으로만 요약해 출력하라. 한 줄, 존댓말 없이 간결하게, 따옴표·머리말 금지.',
    },
  },
};

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

function mergeSection(base, user) {
  const out = { ...base };
  for (const [key, value] of Object.entries(user || {})) {
    if (Array.isArray(base[key]) && Array.isArray(value)) out[key] = [...base[key], ...value];
    else if (base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) out[key] = mergeSection(base[key], value);
    else out[key] = value;
  }
  return out;
}

function loadConfig(projectDir) {
  const user = readJson(path.join(projectDir, CONFIG_REL_PATH));
  return mergeSection(DEFAULTS, user);
}

module.exports = { loadConfig, DEFAULTS, CONFIG_REL_PATH };
