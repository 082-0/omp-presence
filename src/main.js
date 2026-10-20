'use strict';
const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell, dialog } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DiscordConnection } = require('./ipc');
const { detectOmp } = require('./detect');
const { readLive, presence, clean } = require('./live');
const { readSessionMetadata } = require('./session-metadata');
const { extensionStatus, installExtension } = require('./extension-install');
const { readAvatar, saveAvatar, removeAvatar } = require('./avatar');
const bundledId = require('./app-id.json').clientId;

if (!app.requestSingleInstanceLock()) app.quit();
// Match the opt-in OMP extension's shared metadata folder.
const userData = path.join(app.getPath('appData'), 'omp-presence');
fs.mkdirSync(userData, { recursive: true });
app.setPath('userData', userData);
const defaults = { userName: '', showTitle: true, showModel: true, showEffort: true, showElapsed: true, pause: false, theme: 'omp', launchWithOmp: false };
let settings = { ...defaults };
let avatar = '';
let window;
let tray;
let discord = 'disconnected';
let session = null;
let startedAt = 0;
let lastActivity = '';
let quitting = false;
let checking = false;
let lastProcessCheck = 0;
let ompRunning = false;
const connection = new DiscordConnection((status) => {
  discord = status;
  broadcast();
  if (status === 'connected') publish();
});
function settingsFile() { return path.join(app.getPath('userData'), 'settings.json'); }
function loadSettings() {
  try {
    const saved = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
    if (!saved.userName && saved.userLabel && saved.userLabel !== 'Coding with OMP') saved.userName = saved.userLabel;
    delete saved.userLabel;
    delete saved.clientId; // Ignore settings written before the bundled OMP identity.
    settings = { ...defaults, ...saved, theme: ['omp', 'black', 'white'].includes(saved.theme) ? saved.theme : defaults.theme };
  } catch { settings = { ...defaults }; }
}
function saveSettings() {
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2));
}
function avatarFile() { return path.join(app.getPath('userData'), 'avatar.png'); }
function loadAvatar() { avatar = readAvatar(avatarFile()); }
function launcherFile() { return path.join(app.getPath('userData'), 'launcher.json'); }
function runningFile() { return path.join(app.getPath('userData'), 'running.json'); }
function recordLauncher() {
  const executable = process.env.PORTABLE_EXECUTABLE_FILE;
  if (process.platform !== 'win32' || !app.isPackaged || !executable || !fs.existsSync(executable)) return;
  fs.writeFileSync(launcherFile(), JSON.stringify({ executable }));
}
function extensionFile() { return path.join(os.homedir(), '.omp', 'agent', 'extensions', 'omp-presence.js'); }
function extensionSource() { return path.join(__dirname, '..', 'extension', 'omp-presence.js'); }
function snapshot() {
  const status = extensionStatus(extensionSource(), extensionFile());
  return { settings, discord, session, startedAt, extensionInstalled: status === 'current', extensionStatus: status, avatar };
}
function broadcast() {
  if (window && !window.isDestroyed()) window.webContents.send('snapshot', snapshot());
  tray?.setToolTip(`OMP Presence · ${session ? 'OMP active' : 'Waiting for OMP'} · ${discord}`);
  updateTrayMenu();
}
function publish() {
  if (!connection.ready) return;
  const activity = presence(session, settings, startedAt);
  const serialized = JSON.stringify(activity);
  if (serialized === lastActivity) return;
  lastActivity = serialized;
  connection.activity(activity);
}
async function tick() {
  if (checking) return;
  checking = true;
  try {
    const live = readLive(path.join(app.getPath('userData'), 'live'));
    if (!live && Date.now() - lastProcessCheck >= 9000) {
      lastProcessCheck = Date.now();
      ompRunning = await detectOmp();
    }
    const next = live || (ompRunning ? readSessionMetadata(path.join(os.homedir(), '.omp', 'agent', 'sessions')) || { model: '', effort: '', source: 'process' } : null);
    if (JSON.stringify(next && [next.project, next.title, next.model, next.effort, next.source]) !== JSON.stringify(session && [session.project, session.title, session.model, session.effort, session.source])) {
      if (!session && next) startedAt = Math.floor(Date.now() / 1000);
      if (!next) startedAt = 0;
      session = next;
      broadcast();
      publish();
    }
    if (!connection.ready) {
      await connection.connect(bundledId);
      if (connection.ready) { lastActivity = ''; publish(); }
    }
  } finally { checking = false; }
}
function showWindow() { window?.show(); window?.focus(); }
function updateTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'OMP Presence', enabled: false },
    { label: session ? 'OMP: active' : 'OMP: waiting', enabled: false },
    { label: `Discord: ${discord}`, enabled: false },
    { type: 'separator' },
    { label: 'Open dashboard', click: showWindow },
    { label: settings.pause ? 'Resume presence' : 'Pause presence', click: () => { settings.pause = !settings.pause; saveSettings(); publish(); broadcast(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { quitting = true; connection.activity(null); app.quit(); } },
  ]));
}
app.on('second-instance', showWindow);
app.on('activate', showWindow);
app.whenReady().then(() => {
  app.setAppUserModelId('dev.eight.omppresence');
  loadSettings();
  loadAvatar();
  recordLauncher();
  fs.writeFileSync(runningFile(), JSON.stringify({ pid: process.pid }));
  try {
    if (extensionStatus(extensionSource(), extensionFile()) === 'outdated') installExtension(extensionSource(), extensionFile());
  } catch (error) { console.error('Could not update the OMP extension:', error); }
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'omp.png'));
  window = new BrowserWindow({
    width: 1050, height: 790, minWidth: 790, minHeight: 650,
    backgroundColor: '#13111b', icon, title: 'OMP Presence',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  window.removeMenu();
  window.loadFile(path.join(__dirname, 'ui.html'));
  window.on('close', (event) => { if (!quitting) { event.preventDefault(); window.hide(); } });
  tray = new Tray(icon.resize({ width: 32, height: 32 }));
  tray.on('double-click', showWindow);
  updateTrayMenu();
  ipcMain.handle('snapshot', () => snapshot());
  ipcMain.handle('save', (_event, next) => {
    if (next.launchWithOmp && (process.platform !== 'win32' || !app.isPackaged || !fs.existsSync(launcherFile()))) {
      throw new Error('Start with OMP needs the portable Windows app. Open that EXE and save again.');
    }
    settings = { userName: clean(next.userName, 30), showTitle: Boolean(next.showTitle), showModel: Boolean(next.showModel), showEffort: Boolean(next.showEffort), showElapsed: Boolean(next.showElapsed), pause: settings.pause, theme: settings.theme, launchWithOmp: Boolean(next.launchWithOmp) };
    saveSettings();
    broadcast(); publish(); void tick();
    return snapshot();
  });
  ipcMain.handle('pause', () => { settings.pause = !settings.pause; saveSettings(); publish(); broadcast(); return snapshot(); });
  ipcMain.handle('set-theme', (_event, theme) => {
    if (!['omp', 'black', 'white'].includes(theme)) throw new Error('Invalid theme');
    settings.theme = theme;
    saveSettings();
    broadcast();
    return snapshot();
  });
  ipcMain.handle('open-github', () => shell.openExternal('https://github.com/082-0'));
  ipcMain.handle('pick-avatar', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
      title: 'Choose a profile picture',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }],
    });
    if (canceled || !filePaths.length) return snapshot();
    avatar = saveAvatar(filePaths[0], avatarFile(), nativeImage);
    broadcast();
    return snapshot();
  });
  ipcMain.handle('remove-avatar', () => {
    removeAvatar(avatarFile());
    avatar = '';
    broadcast();
    return snapshot();
  });
  ipcMain.handle('reconnect', async () => { connection.activity(null); connection.close(); lastActivity = ''; await tick(); return snapshot(); });
  ipcMain.handle('install-extension', () => {
    installExtension(extensionSource(), extensionFile());
    broadcast();
    return snapshot();
  });
  void tick();
  setInterval(() => void tick(), 3000);
});
app.on('before-quit', () => {
  quitting = true;
  try {
    if (JSON.parse(fs.readFileSync(runningFile(), 'utf8')).pid === process.pid) fs.rmSync(runningFile());
  } catch { /* A stale marker is checked before launching a new copy. */ }
  connection.activity(null);
  connection.close();
});
