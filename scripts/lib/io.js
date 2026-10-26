'use strict';

function readStdinJson() {
  try {
    return JSON.parse(require('fs').readFileSync(0, 'utf8'));
  } catch {
    return null;
  }
}

module.exports = { readStdinJson };
