'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function renderer() {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      type: id.startsWith('show') || id === 'launchWithOmp' ? 'checkbox' : 'text', value: '', checked: false, hidden: false,
      classList: { toggle() {}, remove() {}, add() {} }, addEventListener() {}, focus() { this.focused = true; },
      setAttribute(name, value) { this[name] = value; }, removeAttribute(name) { delete this[name]; },
    });
    return elements.get(id);
  }
  const choices = ['omp', 'black', 'white'].map((choice) => ({ dataset: { choice }, setAttribute(name, value) { this[name] = value; }, addEventListener() {} }));
  const document = { getElementById: element, querySelectorAll: () => choices, body: { dataset: {} } };
  const window = { rpc: { snapshot: () => new Promise(() => {}), onSnapshot() {} } };
  const code = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui.js'), 'utf8');
  const { render, showView } = vm.runInNewContext(`${code}\n({ render, showView })`, { window, document, setInterval() {} });
  return { element, choices, document, render, showView };
}

const settings = { userName: '@example', showTitle: true, showModel: true, showEffort: true, showElapsed: false, theme: 'omp', pause: false, launchWithOmp: true };

test('Home shows live saved presence and keeps extension setup available', () => {
  const { element, render } = renderer();
  const data = { settings, session: null, discord: 'disconnected', extensionInstalled: false, extensionStatus: 'missing' };
  render(data);
  assert.equal(element('setup-details').hidden, false);
  assert.equal(element('preview-name').textContent, 'No activity to show');
  render({ ...data, extensionInstalled: true, extensionStatus: 'current' });
  assert.equal(element('setup-details').hidden, true);
  assert.equal(element('omp-status').textContent, 'Start or restart OMP');
  render({ ...data, extensionInstalled: true, extensionStatus: 'current', session: { project: 'RICH', title: 'Explain Discord Rich Presence', model: 'gpt-6-sol', effort: 'high', source: 'session' }, discord: 'connected' });
  assert.equal(element('omp-status').textContent, 'Project and chat title found');
  assert.equal(element('preview-state').textContent, 'RICH: Explain Discord Rich Presence');
  assert.equal(element('preview-details').textContent, 'gpt-6-sol · high effort · @example');
  render({ ...data, settings: { ...settings, showTitle: false, pause: true }, session: { project: 'OTHER', title: 'Private chat' }, discord: 'connected' });
  assert.equal(element('preview-name').textContent, 'No activity to show');
  assert.equal(element('preview-details').textContent, 'Presence is paused');
});

test('Settings is a separate view with saved theme and local image', () => {
  const { element, choices, document, render, showView } = renderer();
  render({ settings: { ...settings, theme: 'white' }, session: null, discord: 'disconnected', extensionInstalled: true, avatar: 'data:image/png;base64,aGVsbG8=' });
  showView('settings');
  assert.equal(element('home-view').hidden, true);
  assert.equal(element('settings-view').hidden, false);
  assert.equal(element('settings-title').focused, true);
  assert.equal(element('settings-nav')['aria-current'], 'page');
  assert.equal(document.body.dataset.theme, 'white');
  assert.equal(element('launchWithOmp').checked, true);
  assert.equal(choices[2]['aria-pressed'], 'true');
  assert.equal(element('avatar').src, 'data:image/png;base64,aGVsbG8=');
  assert.equal(element('remove-avatar').disabled, false);
  showView('home');
  assert.equal(element('home-view').hidden, false);
  assert.equal(element('settings-view').hidden, true);
});

test('dashboard has no edition badge', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui.html'), 'utf8');
  assert.doesNotMatch(html, /WINDOWS EDITION|class="top-pill"/i);
});
