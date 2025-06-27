// src/renderer/index.js
// Точка входу для Canvas OS

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Subject, BehaviorSubject } from 'rxjs';
import { GraphManager } from './core/Graph.js';
import { ProcessNode } from './nodes/ProcessNode.js';
import { Canvas } from './components/Canvas.js';

// Імпорт стилів
import './styles/main.css';
import './styles/nodes.css';
import './styles/components.css';

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
  
  // Обробка глобальних команд
  React.useEffect(() => {
    const handleCommand = (event) => {
      const { type, data } = event.detail;
      
      switch (type) {
        case 'save':
          saveGraph();
          break;
        case 'load':
          loadGraph();
          break;
        case 'export':
          exportGraph(data.format);
          break;
        case 'settings':
          setSettings(data);
          break;
      }
    };
    
    window.addEventListener('canvas-command', handleCommand);
    return () => window.removeEventListener('canvas-command', handleCommand);
  }, []);
  
  return (
    <div className="app-container" data-theme={settings.theme}>
      <Canvas 
        graphManager={graphManager}
        settings={settings}
        onSettingsChange={setSettings}
      />
      
      {isLoading && <LoadingOverlay />}
    </div>
  );
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
  
  // Гарячі клавіші
  document.addEventListener('keydown', handleGlobalKeydown);
  
  // Запобігання випадковому закриттю
  window.addEventListener('beforeunload', (e) => {
    if (graphManager.state.isDirty) {
      e.preventDefault();
      e.returnValue = 'У вас є незбережені зміни. Ви впевнені, що хочете вийти?';
    }
  });
}

// Обробка глобальних гарячих клавіш
function handleGlobalKeydown(e) {
  // Ctrl/Cmd + S - зберегти
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveGraph();
  }
  
  // Ctrl/Cmd + O - відкрити
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
    e.preventDefault();
    loadGraph();
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
  
  // F11 - повноекранний режим
  if (e.key === 'F11') {
    e.preventDefault();
    toggleFullscreen();
  }
  
  // F12 - режим налагодження
  if (e.key === 'F12') {
    e.preventDefault();
    toggleDebugMode();
  }
}

// === Операції з графом ===

async function saveGraph() {
  try {
    const graphData = graphManager.toJSON();
    
    if (window.canvasAPI) {
      // Electron API
      const result = await window.canvasAPI.saveGraph(graphData);
      if (result.success) {
        showNotification('success', 'Граф збережено успішно');
        graphManager.state.isDirty = false;
      }
    } else {
      // Браузер - завантаження як файл
      const blob = new Blob([graphData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `canvas-os-graph-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      showNotification('success', 'Граф завантажено як файл');
    }
  } catch (error) {
    console.error('Save error:', error);
    showNotification('error', 'Помилка збереження: ' + error.message);
  }
}

async function loadGraph() {
  try {
    if (window.canvasAPI) {
      // Electron API
      const result = await window.canvasAPI.loadGraph();
      if (result.success && result.data) {
        graphManager.fromJSON(result.data);
        showNotification('success', 'Граф завантажено успішно');
      }
    } else {
      // Браузер - вибір файлу
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const text = await file.text();
        if (graphManager.fromJSON(text)) {
          showNotification('success', 'Граф завантажено успішно');
        } else {
          showNotification('error', 'Невірний формат файлу');
        }
      };
      
      input.click();
    }
  } catch (error) {
    console.error('Load error:', error);
    showNotification('error', 'Помилка завантаження: ' + error.message);
  }
}

// === Утиліти ===

function showNotification(type, message) {
  // Створюємо елемент повідомлення
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // Додаємо до body
  document.body.appendChild(notification);
  
  // Анімація появи
  setTimeout(() => notification.classList.add('show'), 10);
  
  // Видаляємо через 3 секунди
  setTimeout(() => {
    notification.classList.remove('show');
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

Гарячі клавіші:
• Ctrl/Cmd + S - Зберегти
• Ctrl/Cmd + O - Відкрити
• Ctrl/Cmd + Z - Скасувати
• Ctrl/Cmd + Shift + Z - Повторити
• Delete - Видалити вибране
• F11 - Повноекранний режим
• F12 - Режим налагодження

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

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

function toggleDebugMode() {
  appState.debugMode = !appState.debugMode;
  console.log('Debug mode:', appState.debugMode);
  
  if (appState.debugMode) {
    // Показати діагностику
    console.log('Graph diagnostics:', graphManager.getDiagnostics());
  }
  
  // Оновити UI
  window.dispatchEvent(new CustomEvent('canvas-command', {
    detail: { type: 'settings', data: { ...appState } }
  }));
}

// === Експорт для глобального доступу ===

window.CanvasOS = {
  graphManager,
  appState,
  saveGraph,
  loadGraph,
  showNotification,
  ProcessNode, // Для доступу з консолі
  version: '1.0.0'
};

// Запуск додатку
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}