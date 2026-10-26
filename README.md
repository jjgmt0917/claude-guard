# claude-guard

Claude Code 훅 모음 플러그인 (Node.js, 외부 의존성 없음).

| 훅 | 동작 |
|---|---|
| scope-guard | Write/Edit/MultiEdit/NotebookEdit 경로를 프로젝트 루트 기준으로 검사. 일반 소스는 허용, **민감 파일·루트 밖 경로는 차단**, **설정 파일은 확인 요청** |
| notify | 승인 요청 · 입력 대기 · 질문 도구 · 작업 완료(Stop) 시 Windows 토스트 알림 |

## 설치

```
/plugin marketplace add jjgmt0917/claude-guard
/plugin install claude-guard@claude-guard
```

Node.js가 필요합니다. 알림은 Windows 전용(다른 OS에서는 무시)입니다.

## 설정 (선택)

프로젝트의 `.claude/claude-guard.json`. 배열은 내장 기본값에 **추가**되고, 값은 덮어씁니다.

```json
{
  "scopeGuard": {
    "enabled": true,
    "sensitive": ["*.secret"],
    "settings": ["config/*.yml"],
    "allow": ["sample.env"],
    "allowOutside": ["~/shared"],
    "checkBash": true
  },
  "notify": {
    "enabled": true,
    "events": { "permission": true, "idle": true, "question": true, "stop": true },
    "stopMinSeconds": 15
  }
}
```

기본 패턴은 `scripts/lib/config.js`의 `DEFAULTS`를 참고하세요. 프로젝트 루트 밖에서 기본 허용되는 곳은 `~/.claude/plans`입니다.

## 한계

- Bash는 명령에 **민감 파일명이 보일 때만** 차단합니다. 그 외 Bash 파일 수정(`sed -i`, 리다이렉트 등)은 검사하지 않습니다.
- Stop 알림은 응답이 `stopMinSeconds` 이상 걸린 경우에만 표시됩니다.

## 라이선스

MIT
