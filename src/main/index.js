// src/main/index.js
// Основний процес Electron для Canvas OS

const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;
let unsavedChanges = false;

// Налаштування для різних платформ
const isMac = process.platform === 'darwin';
const isDev = process.argv.includes('--dev');

function createWindow() {
  // Створення вікна браузера
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, '../renderer/assets/icon.png'),
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    backgroundColor: '#0a0a0a'
  });

  // Завантаження додатку
  if (isDev) {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Обробка закриття вікна
  mainWindow.on('close', async (e) => {
    if (unsavedChanges) {
      e.preventDefault();
      
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: ['Зберегти', 'Не зберігати', 'Скасувати'],
        defaultId: 0,
        message: 'У вас є незбережені зміни. Зберегти їх перед закриттям?'
      });
      
      if (choice === 0) {
        // Зберегти
        mainWindow.webContents.send('menu-save');
      } else if (choice === 1) {
        // Не зберігати
        unsavedChanges = false;
        mainWindow.close();
      }
      // choice === 2 - Скасувати (нічого не робимо)
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Створення меню
function createMenu() {
  const template = [
    // Файл
    {
      label: 'Файл',
      submenu: [
        {
          label: 'Новий',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu-new')
        },
        {
          label: 'Відкрити...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu-open')
        },
        { type: 'separator' },
        {
          label: 'Зберегти',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu-save')
        },
        {
          label: 'Зберегти як...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow.webContents.send('menu-save-as')
        },
        { type: 'separator' },
        {
          label: 'Експортувати',
          submenu: [
            { label: 'JSON', click: () => mainWindow.webContents.send('menu-export', 'json') },
            { label: 'PNG', click: () => mainWindow.webContents.send('menu-export', 'png') },
            { label: 'SVG', click: () => mainWindow.webContents.send('menu-export', 'svg') }
          ]
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    // Редагування
    {
      label: 'Редагування',
      submenu: [
        {
          label: 'Скасувати',
          accelerator: 'CmdOrCtrl+Z',
          click: () => mainWindow.webContents.send('menu-undo')
        },
        {
          label: 'Повторити',
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: () => mainWindow.webContents.send('menu-redo')
        },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        {
          label: 'Вибрати все',
          accelerator: 'CmdOrCtrl+A',
          click: () => mainWindow.webContents.send('menu-select-all')
        }
      ]
    },
    // Вид
    {
      label: 'Вид',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    // Вікно
    {
      label: 'Вікно',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [])
      ]
    },
    // Допомога
    {
      label: 'Допомога',
      submenu: [
        {
          label: 'Документація',
          click: async () => {
            await shell.openExternal('https://github.com/canvasos/docs');
          }
        },
        {
          label: 'Приклади',
          click: () => mainWindow.webContents.send('menu-examples')
        },
        { type: 'separator' },
        {
          label: 'Про Canvas OS',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Про Canvas OS',
              message: 'Canvas OS v1.0.0',
              detail: 'Візуальне середовище програмування\nна основі нескінченної канви.\n\n© 2024 Canvas OS Team',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  // Додаткове меню для macOS
  if (isMac) {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC обробники
function setupIpcHandlers() {
  // Діалог збереження файлу
  ipcMain.handle('dialog:save', async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [
        { name: 'Canvas OS Graph', extensions: ['canvas'] },
        { name: 'JSON', extensions: ['json'] }
      ],
      defaultPath: 'untitled.canvas'
    });
    
    return result;
  });

  // Діалог відкриття файлу
  ipcMain.handle('dialog:open', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      filters: [
        { name: 'Canvas OS Graph', extensions: ['canvas', 'json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    return result;
  });

  // Збереження файлу
  ipcMain.handle('file:save', async (event, filePath, data) => {
    try {
      await fs.writeFile(filePath, data, 'utf8');
      unsavedChanges = false;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Читання файлу
  ipcMain.handle('file:read', async (event, filePath) => {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Відстеження змін
  ipcMain.on('set-unsaved-changes', (event, hasChanges) => {
    unsavedChanges = hasChanges;
    
    // Оновлення заголовка вікна
    const title = hasChanges ? 'Canvas OS *' : 'Canvas OS';
    mainWindow.setTitle(title);
  });

  // Створення воркера
  ipcMain.handle('worker:create', async (event, code) => {
    // Воркери створюються в renderer процесі
    return { success: true };
  });

  // Системна інформація
  ipcMain.handle('system:info', async () => {
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.versions,
      memory: process.memoryUsage()
    };
  });
}

// Готовність додатку
app.whenReady().then(() => {
  createWindow();
  createMenu();
  setupIpcHandlers();
});

// Обробка закриття всіх вікон
app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

// Активація додатку (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Безпека - блокування небезпечних протоколів
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'file:') {
      event.preventDefault();
    }
  });
});