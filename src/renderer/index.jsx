// src/renderer/index.js
// Точка входу для Canvas OS

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Subject, BehaviorSubject } from 'rxjs';
import { GraphManager } from '@core/Graph.js';
import { ProcessNode } from '@nodes/ProcessNode.js';
import { Canvas } from '@components/Canvas.jsx';

// Імпорт стилів
import '@styles/main.css';
import '@styles/nodes.css';
import '@styles/components.css';

// Глобальний менеджер графа
const graphManager = new GraphManager();

// Глобальний стан додатку
const appState = {
  theme: 'dark',
  language: 'uk',
  showGrid: true,
  snapToGrid: false,
  autoSave: true,
  debugMode: false
};

// Ініціалізація додатку
function initializeApp() {
  console.log('🚀 Canvas OS starting...');
  
  // Налаштування глобальних обробників
  setupGlobalHandlers();
  
  // Завантаження збережених налаштувань
  loadSettings();
  
  // Приховання екрану завантаження
  const loadingScreen = document.querySelector('.loading-screen');
  if (loadingScreen) {
    setTimeout(() => {
      loadingScreen.classList.add('fade-out');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }, 300);
  }
  
  // Створення кореневого компонента
  const root = ReactDOM.createRoot(document.getElementById('root'));
  
  // Рендер додатку
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  // Показ привітального повідомлення
  showWelcomeMessage();
}

// Основний компонент додатку
function App() {
  const [settings, setSettings] = React.useState(appState);
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentFile, setCurrentFile] = React.useState(null);
  
  // Обробка команд меню від Electron
  React.useEffect(() => {
    if (!window.canvasAPI) return;
    
    // Новий файл
    window.canvasAPI.on('menu-new', () => {
      if (confirm('Створити новий граф? Незбережені зміни буде втрачено.')) {
        graphManager.clear();
        setCurrentFile(null);
        showNotification('info', 'Створено новий граф');
      }
    });
    
    // Відкрити файл
    window.canvasAPI.on('menu-open', async () => {
      const result = await window.canvasAPI.dialog.open();
      if (!result.canceled && result.filePaths[0]) {
        setIsLoading(true);
        try {
          const fileResult = await window.canvasAPI.file.read(result.filePaths[0]);
          if (fileResult.success) {
            const parsed = JSON.parse(fileResult.data);
            graphManager.fromJSON(parsed);
            setCurrentFile(result.filePaths[0]);
            showNotification('success', 'Файл завантажено успішно');
          }
        } catch (error) {
          showNotification('error', 'Помилка завантаження файлу');
          console.error(error);
        }
        setIsLoading(false);
      }
    });
    
    // Зберегти
    window.canvasAPI.on('menu-save', async () => {
      if (currentFile) {
        saveToFile(currentFile);
      } else {
        saveAsNewFile();
      }
    });
    
    // Зберегти як
    window.canvasAPI.on('menu-save-as', saveAsNewFile);
    
    // Скасувати/Повторити
    window.canvasAPI.on('menu-undo', () => graphManager.undo());
    window.canvasAPI.on('menu-redo', () => graphManager.redo());
    
    // Експорт
    window.canvasAPI.on('menu-export', (format) => {
      exportGraph(format);
    });
    
    return () => {
      // Відписка від подій при демонтуванні
      if (window.canvasAPI) {
        window.canvasAPI.removeAllListeners('menu-new');
        window.canvasAPI.removeAllListeners('menu-open');
        window.canvasAPI.removeAllListeners('menu-save');
        window.canvasAPI.removeAllListeners('menu-save-as');
        window.canvasAPI.removeAllListeners('menu-undo');
        window.canvasAPI.removeAllListeners('menu-redo');
        window.canvasAPI.removeAllListeners('menu-export');
      }
    };
  }, [currentFile]);
  
  // Відстеження змін
  React.useEffect(() => {
    const subscription = graphManager.changes$.subscribe(() => {
      if (window.canvasAPI) {
        window.canvasAPI.setUnsavedChanges(graphManager.state.isDirty);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  // Збереження у файл
  async function saveToFile(filePath) {
    setIsLoading(true);
    try {
      const data = JSON.stringify(graphManager.toJSON(), null, 2);
      const result = await window.canvasAPI.file.save(filePath, data);
      if (result.success) {
        graphManager.state.isDirty = false;
        showNotification('success', 'Файл збережено');
      } else {
        showNotification('error', 'Помилка збереження');
      }
    } catch (error) {
      showNotification('error', 'Помилка збереження: ' + error.message);
    }
    setIsLoading(false);
  }
  
  // Збереження як новий файл
  async function saveAsNewFile() {
    const result = await window.canvasAPI.dialog.save();
    if (!result.canceled && result.filePath) {
      setCurrentFile(result.filePath);
      saveToFile(result.filePath);
    }
  }
  
  return (
    <div className="app-container" data-theme={settings.theme}>
      <Canvas 
        graphManager={graphManager}
        settings={settings}
        onSettingsChange={updateSettings}
      />
      
      {isLoading && <LoadingOverlay />}
    </div>
  );
  
  function updateSettings(newSettings) {
    setSettings(newSettings);
    saveSettings(newSettings);
  }
}

// Компонент завантаження
function LoadingOverlay() {
  return (
    <div className="loading-overlay">
      <div className="loading-spinner">
        <div className="spinner"></div>
        <div className="loading-text">Завантаження...</div>
      </div>
    </div>
  );
}

// === Глобальні обробники ===

function setupGlobalHandlers() {
  // Обробка помилок
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showNotification('error', 'Виникла помилка: ' + event.error.message);
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showNotification('error', 'Необроблена помилка: ' + event.reason);
  });
  
  // Гарячі клавіші (тільки для браузера, в Electron вони обробляються через меню)
  if (!window.canvasAPI) {
    document.addEventListener('keydown', handleGlobalKeydown);
  }
}

// Обробка глобальних гарячих клавіш (для браузера)
function handleGlobalKeydown(e) {
  // Ctrl/Cmd + S - зберегти
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveGraphBrowser();
  }
  
  // Ctrl/Cmd + O - відкрити
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
    e.preventDefault();
    loadGraphBrowser();
  }
  
  // Ctrl/Cmd + Z - скасувати
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    graphManager.undo();
  }
  
  // Ctrl/Cmd + Shift + Z - повторити
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
    e.preventDefault();
    graphManager.redo();
  }
}

// === Операції для браузера ===

function saveGraphBrowser() {
  const data = JSON.stringify(graphManager.toJSON(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `canvas-os-graph-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showNotification('success', 'Граф завантажено як файл');
}

function loadGraphBrowser() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      graphManager.fromJSON(parsed);
      showNotification('success', 'Граф завантажено успішно');
    } catch (error) {
      showNotification('error', 'Невірний формат файлу');
      console.error(error);
    }
  };
  
  input.click();
}

// Експорт графа
async function exportGraph(format) {
  switch (format) {
    case 'json':
      saveGraphBrowser();
      break;
    case 'png':
    case 'svg':
      showNotification('info', `Експорт в ${format.toUpperCase()} буде додано незабаром`);
      break;
  }
}

// === Утиліти ===

function showNotification(type, message) {
  // Створюємо елемент повідомлення
  const notification = document.createElement('div');
  notification.className = `notification notification-${type} show`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#FF9800' : '#2196F3'};
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    z-index: 2000;
    max-width: 300px;
    animation: slideIn 0.3s ease-out;
  `;
  
  // Додаємо до body
  document.body.appendChild(notification);
  
  // Видаляємо через 3 секунди
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function showWelcomeMessage() {
  console.log(`
╔═══════════════════════════════════════╗
║        🎯 Canvas OS MVP v1.0.0        ║
╠═══════════════════════════════════════╣
║  Нескінченна канва для візуального   ║
║  програмування та моделювання         ║
╚═══════════════════════════════════════╝

${window.canvasAPI ? 'Electron версія' : 'Браузер версія'}

Гарячі клавіші:
• ${window.canvasAPI ? 'Cmd/Ctrl' : 'Ctrl'} + S - Зберегти
• ${window.canvasAPI ? 'Cmd/Ctrl' : 'Ctrl'} + O - Відкрити
• ${window.canvasAPI ? 'Cmd/Ctrl' : 'Ctrl'} + Z - Скасувати
• ${window.canvasAPI ? 'Cmd/Ctrl' : 'Ctrl'} + Shift + Z - Повторити
• Delete - Видалити вибране

Подвійний клік на канві - створити вузол
Перетягування з порту на порт - з'єднати
  `);
}

function loadSettings() {
  try {
    const saved = localStorage.getItem('canvasOS-settings');
    if (saved) {
      Object.assign(appState, JSON.parse(saved));
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem('canvasOS-settings', JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// === Експорт для глобального доступу ===

window.CanvasOS = {
  graphManager,
  appState,
  showNotification,
  ProcessNode, // Для доступу з консолі
  version: '1.0.0'
};

// Анімації для повідомлень
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Запуск додатку
initializeApp();