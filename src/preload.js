const { contextBridge, ipcRenderer } = require('electron');

// Безпечний API для renderer процесу
contextBridge.exposeInMainWorld('canvasAPI', {
  // Worker management
  createWorker: (code) => ipcRenderer.invoke('worker:create', code),
  
  // File operations
  saveGraph: (data) => ipcRenderer.invoke('file:save', data),
  loadGraph: () => ipcRenderer.invoke('file:load'),
  
  // System info
  platform: process.platform,
  version: process.versions
});