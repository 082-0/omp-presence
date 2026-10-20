'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { extensionStatus, installExtension } = require('../src/extension-install');

test('installs, upgrades known old versions, and preserves edits', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'omp-presence-install-test-'));
  try {
    const source = path.join(dir, 'new.js');
    const target = path.join(dir, 'extensions', 'omp-presence.js');
    const old = 'old version';
    const known = new Set([createHash('sha256').update(old).digest('hex')]);
    fs.writeFileSync(source, 'new version');
    assert.equal(extensionStatus(source, target, known), 'missing');
    installExtension(source, target, known);
    assert.equal(extensionStatus(source, target, known), 'current');
    fs.writeFileSync(target, old);
    assert.equal(extensionStatus(source, target, known), 'outdated');
    installExtension(source, target, known);
    assert.equal(fs.readFileSync(target, 'utf8'), 'new version');
    fs.writeFileSync(target, 'user changes');
    assert.equal(extensionStatus(source, target, known), 'custom');
    assert.throws(() => installExtension(source, target, known), /changed/);
    assert.equal(fs.readFileSync(target, 'utf8'), 'user changes');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
