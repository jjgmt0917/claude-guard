'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const CASE_INSENSITIVE = process.platform === 'win32' || process.platform === 'darwin';

const norm = (p) => (CASE_INSENSITIVE ? p.toLowerCase() : p);

function expandHome(p) {
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;
}

// 존재하는 가장 가까운 상위 경로를 realpath로 풀어 심볼릭 링크 우회를 막는다
function resolveReal(target) {
  const resolved = path.resolve(target);
  let current = resolved;
  const rest = [];
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return resolved;
    rest.unshift(path.basename(current));
    current = parent;
  }
  try {
    return path.join(fs.realpathSync.native(current), ...rest);
  } catch {
    return resolved;
  }
}

function isInside(dir, target) {
  const rel = path.relative(norm(dir), norm(target));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

module.exports = { expandHome, resolveReal, isInside };
