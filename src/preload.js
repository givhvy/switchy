'use strict';
const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('switchy', {
  state: () => ipcRenderer.invoke('state'),
  refresh: () => ipcRenderer.invoke('refresh'),
  switch: target => ipcRenderer.invoke('switch',target),
  save: settings => ipcRenderer.invoke('save',settings),
  openLink: key => ipcRenderer.invoke('open-link',key),
  onState: callback => { ipcRenderer.on('state', (_event,state) => callback(state)); }
});
