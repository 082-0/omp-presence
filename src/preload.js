'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('rpc', {
  snapshot: () => ipcRenderer.invoke('snapshot'),
  save: (settings) => ipcRenderer.invoke('save', settings),
  pause: () => ipcRenderer.invoke('pause'),
  reconnect: () => ipcRenderer.invoke('reconnect'),
  installExtension: () => ipcRenderer.invoke('install-extension'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  openGithub: () => ipcRenderer.invoke('open-github'),
  pickAvatar: () => ipcRenderer.invoke('pick-avatar'),
  removeAvatar: () => ipcRenderer.invoke('remove-avatar'),
  onSnapshot: (callback) => ipcRenderer.on('snapshot', (_event, value) => callback(value)),
});
