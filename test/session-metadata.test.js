'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readSessionMetadata } = require('../src/session-metadata');
const { presence } = require('../src/live');

test('reads only OMP title and project metadata and follows the latest session', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'omp-presence-sessions-'));
  try {
    const folder = path.join(root, 'sessions', 'project');
    fs.mkdirSync(folder, { recursive: true });
    const first = path.join(folder, 'first.jsonl');
    const second = path.join(folder, 'second.jsonl');
    const save = (file, title, project) => fs.writeFileSync(file,
      `${JSON.stringify({ type: 'title', title })}\n${JSON.stringify({ type: 'session', cwd: path.join('C:', 'work', project) })}\n{not valid JSON, private message}\n`);
    save(first, 'Explain Discord Rich Presence', 'RICH');
    let data = readSessionMetadata(path.join(root, 'sessions'));
    assert.equal(data.project, 'RICH');
    assert.equal(data.title, 'Explain Discord Rich Presence');
    assert.equal(data.source, 'session');
    const settings = { showTitle: true, showModel: true, showEffort: true, showElapsed: false, userName: '@08' };
    assert.equal(presence(data, settings, 0).state, 'RICH: Explain Discord Rich Presence');
    save(second, 'Other chat', 'NEXT');
    fs.utimesSync(second, new Date(Date.now() + 1000), new Date(Date.now() + 1000));
    data = readSessionMetadata(path.join(root, 'sessions'));
    assert.equal(data.project, 'NEXT');
    assert.equal(data.title, 'Other chat');
    settings.showTitle = false;
    assert.equal(presence(data, settings, 0).state, 'NEXT');
    assert.equal(readSessionMetadata(path.join(root, 'missing')), null);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
