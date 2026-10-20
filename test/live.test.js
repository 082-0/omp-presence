'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readLive, presence } = require('../src/live');

function fixture(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'omp-presence-test-'));
  try { fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
const settings = { pause: false, showTitle: true, showModel: true, showEffort: true, showElapsed: true, userName: '' };

test('accepts freshest heartbeat but ignores stale, future, mismatched and broken records', () => fixture((dir) => {
  const now = 1_000_000;
  const put = (file, data) => fs.writeFileSync(path.join(dir, file), JSON.stringify(data));
  put('1.json', { pid: 1, model: 'stale', updatedAt: now - 12_001 });
  put('4.json', { pid: 9, model: 'wrong pid', activityAt: now + 100, updatedAt: now });
  put('2.json', { pid: 2, model: 'older', effort: 'low', activityAt: now - 100, updatedAt: now });
  put('3.json', { pid: 3, project: 'RICH', title: 'Working', model: 'gpt-6-sol', effort: 'high', activityAt: now, updatedAt: now - 100 });
  put('5.json', { pid: 5, model: 'future', updatedAt: now + 5_000 });
  fs.writeFileSync(path.join(dir, '6.json'), 'bad json');
  put('not-a-pid.json', { model: 'ignored' });
  assert.deepEqual(readLive(dir, now), { project: 'RICH', title: 'Working', model: 'gpt-6-sol', effort: 'high', activityAt: now, updatedAt: now - 100 });
  assert.equal(readLive(dir, now + 20_000), null);
}));

test('shows the project and optional chat title, model, effort, and username without messages', () => {
  const live = { project: 'RICH', title: 'Explain Discord Rich Presence', model: 'gpt-6-sol', effort: 'medium', prompt: 'private prompt' };
  const result = presence(live, { ...settings, userName: '@example' }, 123);
  assert.equal(result.details, 'gpt-6-sol · medium effort · @example');
  assert.equal(result.state, 'RICH: Explain Discord Rich Presence');
  assert.equal(result.assets.large_image, 'logo');
  assert.equal(result.timestamps.start, 123);
  assert.doesNotMatch(JSON.stringify(result), /private/);
  assert.equal(presence(live, { ...settings, pause: true }, 123), null);
  assert.equal(presence(live, { ...settings, showModel: false, showEffort: false, showElapsed: false }, 123).details, 'Using OMP');
  assert.equal(presence({ model: '', effort: '', source: 'process' }, settings, 123).details, 'Using OMP');
  assert.equal(presence(live, { ...settings, showTitle: false }, 123).state, 'RICH');
  assert.equal(presence(null, settings, 123), null);
});
