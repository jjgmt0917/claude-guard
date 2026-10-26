'use strict';

// 최소 glob → 정규식 변환: ** (경로 포함), * (경로 제외), ?
function globToRegex(pattern) {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        i++;
        if (pattern[i + 1] === '/') i++;
        re += '(?:.*/)?';
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`, 'i');
}

// 슬래시가 없는 패턴은 파일명, 있는 패턴은 프로젝트 상대 경로에 매칭
function matchesAny(patterns, relPath) {
  const rel = relPath.replace(/\\/g, '/');
  const base = rel.split('/').pop();
  return patterns.some((p) => {
    const target = p.includes('/') ? rel : base;
    return globToRegex(p).test(target);
  });
}

module.exports = { globToRegex, matchesAny };
