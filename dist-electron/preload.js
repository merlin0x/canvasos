"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("canvasAPI", {
  // Діалогові вікна
  dialog: {
    save: () => electron.ipcRenderer.invoke("dialog:save"),
    open: () => electron.ipcRenderer.invoke("dialog:open")
  },
  // Файлові операції
  file: {
    save: (filePath, data) => electron.ipcRenderer.invoke("file:save", filePath, data),
    read: (filePath) => electron.ipcRenderer.invoke("file:read", filePath)
  },
  // Системна інформація
  system: {
    getInfo: () => electron.ipcRenderer.invoke("system:info"),
    platform: process.platform
  },
  // Відстеження змін
  setUnsavedChanges: (hasChanges) => {
    electron.ipcRenderer.send("set-unsaved-changes", hasChanges);
  },
  // Підписка на події меню
  on: (channel, callback) => {
    const validChannels = [
      "menu-new",
      "menu-open",
      "menu-save",
      "menu-save-as",
      "menu-export",
      "menu-undo",
      "menu-redo",
      "menu-select-all",
      "menu-examples"
    ];
    if (validChannels.includes(channel)) {
      const subscription = (event, ...args) => callback(...args);
      electron.ipcRenderer.on(channel, subscription);
      return () => {
        electron.ipcRenderer.removeListener(channel, subscription);
      };
    }
  },
  // Відписка від подій
  removeAllListeners: (channel) => {
    electron.ipcRenderer.removeAllListeners(channel);
  }
});
electron.contextBridge.exposeInMainWorld("versions", {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron
});
if (process.env.NODE_ENV === "development") {
  electron.contextBridge.exposeInMainWorld("devTools", {
    reload: () => electron.ipcRenderer.send("dev-reload"),
    openDevTools: () => electron.ipcRenderer.send("dev-open-devtools")
  });
}
