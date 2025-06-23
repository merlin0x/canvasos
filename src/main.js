const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });

  // Завантажуємо локальний HTML
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Відкриваємо DevTools у режимі розробки
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// IPC обробники для безпечної комунікації
ipcMain.handle('worker:create', async (event, code) => {
  // Створення воркера буде оброблятися в renderer процесі
  return { success: true };
});

ipcMain.handle('file:save', async (event, data) => {
  // Збереження графа (буде реалізовано пізніше)
  console.log('Saving graph:', data);
  return { success: true };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});