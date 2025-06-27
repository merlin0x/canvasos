"use strict";
const electron = require("electron");
const url = require("url");
const path = require("path");
const fs = require("fs");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const __filename$1 = url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("index.js", document.baseURI).href);
const __dirname$1 = path.dirname(__filename$1);
let mainWindow;
let unsavedChanges = false;
const isMac = process.platform === "darwin";
process.env.NODE_ENV !== "production";
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const VITE_DIST = process.env.VITE_DIST;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname$1, "../../build/icon.png"),
    titleBarStyle: isMac ? "hiddenInset" : "default",
    backgroundColor: "#0a0a0a"
  });
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(VITE_DIST, "index.html"));
  }
  mainWindow.on("close", async (e) => {
    if (unsavedChanges) {
      e.preventDefault();
      const choice = electron.dialog.showMessageBoxSync(mainWindow, {
        type: "question",
        buttons: ["Зберегти", "Не зберігати", "Скасувати"],
        defaultId: 0,
        message: "У вас є незбережені зміни. Зберегти їх перед закриттям?"
      });
      if (choice === 0) {
        mainWindow.webContents.send("menu-save");
      } else if (choice === 1) {
        unsavedChanges = false;
        mainWindow.close();
      }
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.webContents.on("did-fail-load", () => {
    console.error("Failed to load app");
  });
}
function createMenu() {
  const template = [
    // Файл
    {
      label: "Файл",
      submenu: [
        {
          label: "Новий",
          accelerator: "CmdOrCtrl+N",
          click: () => mainWindow == null ? void 0 : mainWindow.webContents.send("menu-new")
        },
        {
          label: "Відкрити...",
          accelerator: "CmdOrCtrl+O",
          click: () => mainWindow == null ? void 0 : mainWindow.webContents.send("menu-open")
        },
        { type: "separator" },
        {
          label: "Зберегти",
          accelerator: "CmdOrCtrl+S",
          click: () => mainWindow == null ? void 0 : mainWindow.webContents.send("menu-save")
        },
        {
          label: "Зберегти як...",
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => mainWindow == null ? void 0 : mainWindow.webContents.send("menu-save-as")
        },
        { type: "separator" },
        {
          label: "Експортувати",
          submenu: [
            { label: "JSON", click: () => mainWindow == null ? void 0 : mainWindow.webContents.send("menu-export", "json") },
            { label: "PNG", click: () => mainWindow == null ? void 0 : mainWindow.webContents.send("menu-export", "png") },
            { label: "SVG", click: () => mainWindow == null ? void 0 : mainWindow.webContents.send("menu-export", "svg") }
          ]
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" }
      ]
    },
    // Редагування
    {
      label: "Редагування",
      submenu: [
        {
          label: "Скасувати",
          accelerator: "CmdOrCtrl+Z",
          click: () => mainWindow == null ? void 0 : mainWindow.webContents.send("menu-undo")
        },
        {
          label: "Повторити",
          accelerator: "CmdOrCtrl+Shift+Z",
          click: () => mainWindow == null ? void 0 : mainWindow.webContents.send("menu-redo")
        },
        { type: "separator" },
        { role: "cut", label: "Вирізати" },
        { role: "copy", label: "Копіювати" },
        { role: "paste", label: "Вставити" },
        { role: "delete", label: "Видалити" },
        { type: "separator" },
        {
          label: "Вибрати все",
          accelerator: "CmdOrCtrl+A",
          click: () => mainWindow == null ? void 0 : mainWindow.webContents.send("menu-select-all")
        }
      ]
    },
    // Вид
    {
      label: "Вид",
      submenu: [
        { role: "reload", label: "Перезавантажити" },
        { role: "forceReload", label: "Примусово перезавантажити" },
        { role: "toggleDevTools", label: "Інструменти розробника" },
        { type: "separator" },
        { role: "resetZoom", label: "Скинути масштаб" },
        { role: "zoomIn", label: "Збільшити" },
        { role: "zoomOut", label: "Зменшити" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Повноекранний режим" }
      ]
    },
    // Вікно
    {
      label: "Вікно",
      submenu: [
        { role: "minimize", label: "Згорнути" },
        { role: "close", label: "Закрити" },
        ...isMac ? [
          { type: "separator" },
          { role: "front", label: "Всі на передній план" },
          { type: "separator" },
          { role: "window", label: "Вікно" }
        ] : []
      ]
    },
    // Допомога
    {
      label: "Допомога",
      submenu: [
        {
          label: "Документація",
          click: async () => {
            await electron.shell.openExternal("https://github.com/canvasos/docs");
          }
        },
        {
          label: "Приклади",
          click: () => mainWindow == null ? void 0 : mainWindow.webContents.send("menu-examples")
        },
        { type: "separator" },
        {
          label: "Про Canvas OS",
          click: () => {
            electron.dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "Про Canvas OS",
              message: "Canvas OS v1.0.0",
              detail: "Візуальне середовище програмування\nна основі нескінченної канви.\n\n© 2024 Canvas OS Team",
              buttons: ["OK"]
            });
          }
        }
      ]
    }
  ];
  if (isMac) {
    template.unshift({
      label: electron.app.getName(),
      submenu: [
        { role: "about", label: "Про Canvas OS" },
        { type: "separator" },
        { role: "services", submenu: [], label: "Послуги" },
        { type: "separator" },
        { role: "hide", label: "Приховати Canvas OS" },
        { role: "hideOthers", label: "Приховати інші" },
        { role: "unhide", label: "Показати все" },
        { type: "separator" },
        { role: "quit", label: "Вийти з Canvas OS" }
      ]
    });
  }
  const menu = electron.Menu.buildFromTemplate(template);
  electron.Menu.setApplicationMenu(menu);
}
function setupIpcHandlers() {
  electron.ipcMain.handle("dialog:save", async () => {
    const result = await electron.dialog.showSaveDialog(mainWindow, {
      filters: [
        { name: "Canvas OS Graph", extensions: ["canvas"] },
        { name: "JSON", extensions: ["json"] }
      ],
      defaultPath: "untitled.canvas"
    });
    return result;
  });
  electron.ipcMain.handle("dialog:open", async () => {
    const result = await electron.dialog.showOpenDialog(mainWindow, {
      filters: [
        { name: "Canvas OS Graph", extensions: ["canvas", "json"] },
        { name: "All Files", extensions: ["*"] }
      ],
      properties: ["openFile"]
    });
    return result;
  });
  electron.ipcMain.handle("file:save", async (event, filePath, data) => {
    try {
      await fs.promises.writeFile(filePath, data, "utf8");
      unsavedChanges = false;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("file:read", async (event, filePath) => {
    try {
      const data = await fs.promises.readFile(filePath, "utf8");
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.on("set-unsaved-changes", (event, hasChanges) => {
    unsavedChanges = hasChanges;
    const title = hasChanges ? "Canvas OS *" : "Canvas OS";
    mainWindow == null ? void 0 : mainWindow.setTitle(title);
  });
  electron.ipcMain.handle("system:info", async () => {
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.versions,
      memory: process.memoryUsage()
    };
  });
  electron.ipcMain.handle("worker:create", async (event, code) => {
    return { success: true };
  });
}
electron.app.whenReady().then(() => {
  createWindow();
  createMenu();
  setupIpcHandlers();
});
electron.app.on("window-all-closed", () => {
  if (!isMac) {
    electron.app.quit();
  }
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
electron.app.on("web-contents-created", (event, contents) => {
  contents.on("will-navigate", (event2, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "file:" && parsedUrl.protocol !== "devtools:") {
      event2.preventDefault();
    }
  });
  contents.setWindowOpenHandler(({ url: url2 }) => {
    if (url2.startsWith("https://") || url2.startsWith("http://")) {
      electron.shell.openExternal(url2);
    }
    return { action: "deny" };
  });
});
