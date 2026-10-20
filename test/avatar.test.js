'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readAvatar, saveAvatar, removeAvatar } = require('../src/avatar');

test('profile image is cropped, saved locally, reloaded, and removed', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'omp-avatar-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'image.jpg');
  const destination = path.join(dir, 'avatar.png');
  fs.writeFileSync(source, Buffer.from('sample image'));
  const image = {
    isEmpty: () => false,
    getSize: () => ({ width: 160, height: 120 }),
    crop(rect) {
      assert.deepEqual(rect, { x: 20, y: 0, width: 120, height: 120 });
      return { resize(size) { assert.deepEqual(size, { width: 128, height: 128 }); return { toPNG: () => Buffer.from('png-data') }; } };
    },
  };
  assert.equal(readAvatar(destination), '');
  const value = saveAvatar(source, destination, { createFromPath: () => image });
  assert.equal(value, `data:image/png;base64,${Buffer.from('png-data').toString('base64')}`);
  assert.equal(readAvatar(destination), value);
  removeAvatar(destination);
  assert.equal(readAvatar(destination), '');
  removeAvatar(destination);
});

test('invalid and oversized images leave the saved picture unchanged', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'omp-avatar-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'invalid.png');
  const destination = path.join(dir, 'avatar.png');
  fs.writeFileSync(source, 'invalid');
  fs.writeFileSync(destination, 'existing picture');
  assert.throws(() => saveAvatar(source, destination, { createFromPath: () => ({ isEmpty: () => true }) }), /Could not open/);
  fs.writeFileSync(source, Buffer.alloc(5 * 1024 * 1024 + 1));
  assert.throws(() => saveAvatar(source, destination, { createFromPath: () => { throw new Error('Image was opened'); } }), /smaller than 5 MB/);
  assert.equal(fs.readFileSync(destination, 'utf8'), 'existing picture');
});
