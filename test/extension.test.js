'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { readLive } = require('../src/live');

test('extension follows project and title changes without sharing full paths or prompts', async () => {
  const appData = fs.mkdtempSync(path.join(os.tmpdir(), 'omp-presence-extension-test-'));
  const before = process.env.APPDATA;
  process.env.APPDATA = appData;
  try {
    const entry = await import(pathToFileURL(path.join(__dirname, '..', 'extension', 'omp-presence.js')).href);
    const handlers = new Map();
    let title = 'Explain Discord Rich Presence';
    let heartbeat;
    entry.default({ on: (name, handler) => handlers.set(name, handler), getThinkingLevel: () => 'high', getSessionName: () => title });
    const ctx = { cwd: 'C:\\work\\RICH', models: { current: () => ({ id: 'gpt-6-sol' }) }, setInterval: (handler) => { heartbeat = handler; return 1; } };
    handlers.get('session_start')({}, ctx);
    const folder = path.join(appData, 'omp-presence', 'live');
    const live = readLive(folder);
    assert.equal(live.model, 'gpt-6-sol');
    assert.equal(live.effort, 'high');
    assert.equal(live.project, 'RICH');
    assert.equal(live.title, title);
    assert.doesNotMatch(fs.readFileSync(path.join(folder, `${process.pid}.json`), 'utf8'), /C:\\\\work/);
    title = 'New chat';
    heartbeat();
    assert.equal(readLive(folder).title, 'New chat');
    ctx.cwd = 'C:\\work\\OTHER';
    handlers.get('session_switch')({}, ctx);
    assert.equal(readLive(folder).project, 'OTHER');
    handlers.get('session_shutdown')();
    assert.equal(readLive(folder), null);
  } finally {
    if (before === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = before;
    fs.rmSync(appData, { recursive: true, force: true });
  }
});

test('opt-in starts portable RPC once when OMP opens, not while RPC is running', async (t) => {
  const appData = fs.mkdtempSync(path.join(os.tmpdir(), 'omp-autostart-'));
  const before = process.env.APPDATA;
  process.env.APPDATA = appData;
  t.after(() => {
    if (before === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = before;
    fs.rmSync(appData, { recursive: true, force: true });
  });
  const root = path.join(appData, 'omp-presence');
  fs.mkdirSync(root);
  const executable = path.join(root, 'omp rpc v7.exe');
  fs.writeFileSync(executable, 'portable');
  fs.writeFileSync(path.join(root, 'launcher.json'), JSON.stringify({ executable }));
  fs.writeFileSync(path.join(root, 'settings.json'), JSON.stringify({ launchWithOmp: false }));
  const entry = await import(pathToFileURL(path.join(__dirname, '..', 'extension', 'omp-presence.js')).href);
  const handlers = new Map();
  let heartbeat;
  const launches = [];
  const pi = { on: (name, handler) => handlers.set(name, handler), getThinkingLevel: () => 'off', getSessionName: () => '' };
  const ctx = { cwd: root, models: { current: () => null }, setInterval: (handler) => { heartbeat = handler; return 1; } };
  const launch = { platform: 'win32', spawnProcess: (file, args, options) => {
    launches.push({ file, args, options });
    return { on() {}, unref() {} };
  } };
  entry.default(pi, launch);
  handlers.get('session_start')({}, ctx);
  assert.equal(launches.length, 0);
  fs.writeFileSync(path.join(root, 'settings.json'), JSON.stringify({ launchWithOmp: true }));
  heartbeat();
  heartbeat();
  assert.equal(launches.length, 1);
  assert.equal(launches[0].file, executable);
  assert.deepEqual(launches[0].args, []);
  assert.equal(launches[0].options.detached, true);
  handlers.get('session_shutdown')();

  fs.writeFileSync(path.join(root, 'running.json'), JSON.stringify({ pid: process.pid }));
  const otherHandlers = new Map();
  entry.default({ ...pi, on: (name, handler) => otherHandlers.set(name, handler) }, launch);
  otherHandlers.get('session_start')({}, ctx);
  assert.equal(launches.length, 1);
  otherHandlers.get('session_shutdown')();
});
