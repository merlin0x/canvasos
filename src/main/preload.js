// src/main/preload.js
// Preload скрипт для безпечної комунікації між процесами

const { contextBridge, ipcRenderer } = require('electron');

// Безпечний API для renderer процесу
contextBridge.exposeInMainWorld('canvasAPI', {
  // Діалогові вікна
  dialog: {
    save: () => ipcRenderer.invoke('dialog:save'),
    open: () => ipcRenderer.invoke('dialog:open')
  },
  
  // Файлові операції
  file: {
    save: (filePath, data) => ipcRenderer.invoke('file:save', filePath, data),
    read: (filePath) => ipcRenderer.invoke('file:read', filePath)
  },
  
  // Управління воркерами
  worker: {
    create: (code) => ipcRenderer.invoke('worker:create', code)
  },
  
  // Системна інформація
  system: {
    getInfo: () => ipcRenderer.invoke('system:info'),
    platform: process.platform
  },
  
  // Відстеження змін
  setUnsavedChanges: (hasChanges) => {
    ipcRenderer.send('set-unsaved-changes', hasChanges);
  },
  
  // Підписка на події меню
  on: (channel, callback) => {
    const validChannels = [
      'menu-new',
      'menu-open',
      'menu-save',
      'menu-save-as',
      'menu-export',
      'menu-undo',
      'menu-redo',
      'menu-select-all',
      'menu-examples'
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  
  // Відписка від подій
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Експонуємо версію
contextBridge.exposeInMainWorld('versions', {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron
});