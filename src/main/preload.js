// src/main/preload.js
// Preload скрипт для безпечної комунікації між процесами

import { contextBridge, ipcRenderer } from 'electron';

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
      // Обгортка для видалення event з callback
      const subscription = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, subscription);
      
      // Повертаємо функцію для відписки
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
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

// Налаштування для розробки
if (process.env.NODE_ENV === 'development') {
  contextBridge.exposeInMainWorld('devTools', {
    reload: () => ipcRenderer.send('dev-reload'),
    openDevTools: () => ipcRenderer.send('dev-open-devtools')
  });
}