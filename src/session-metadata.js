'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { clean } = require('./live');

// OMP keeps the title and session header at the start of each session file.
// Read only those two lines; never read conversation messages or full project paths.
function readHeader(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const buffer = Buffer.alloc(4096);
    let size = 0;
    let linesRead = 0;
    while (size < buffer.length && linesRead < 2) {
      if (fs.readSync(fd, buffer, size, 1, size) !== 1) break;
      if (buffer[size] === 10) linesRead += 1;
      size += 1;
    }
    if (linesRead < 2) return null;
    const lines = buffer.toString('utf8', 0, size).split('\n');
    if (lines.length < 3) return null;
    const first = JSON.parse(lines[0]);
    const second = JSON.parse(lines[1]);
    if (first.type !== 'title' || second.type !== 'session' || typeof second.cwd !== 'string') return null;
    return {
      project: clean(path.basename(second.cwd.replace(/[\\/]+$/, '')), 48),
      title: clean(first.title, 64), model: '', effort: '', source: 'session',
    };
  } finally { fs.closeSync(fd); }
}

function readSessionMetadata(directory) {
  let latest = null;
  try {
    for (const folder of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!folder.isDirectory()) continue;
      const location = path.join(directory, folder.name);
      for (const entry of fs.readdirSync(location, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;
        const file = path.join(location, entry.name);
        try {
          const updatedAt = fs.statSync(file).mtimeMs;
          if (latest && updatedAt <= latest.updatedAt) continue;
          const data = readHeader(file);
          if (data) latest = { ...data, updatedAt };
        } catch { /* Ignore a session being moved or written. */ }
      }
    }
  } catch { /* OMP may not have a session directory yet. */ }
  return latest;
}

module.exports = { readSessionMetadata };
