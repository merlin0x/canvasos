// src/renderer/components/InfoPanel.js
// Інформаційна панель Canvas OS

import React, { useState, useEffect } from 'react';
import { Hotkeys } from '@core/constants.js';

export function InfoPanel({ onClose, graphManager }) {
  const [activeTab, setActiveTab] = useState('help');
  const [diagnostics, setDiagnostics] = useState(null);
  
  useEffect(() => {
    if (activeTab === 'diagnostics') {
      const interval = setInterval(() => {
        setDiagnostics(graphManager.getDiagnostics());
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [activeTab, graphManager]);
  
  const tabs = [
    { id: 'help', label: 'Допомога', icon: '❓' },
    { id: 'shortcuts', label: 'Гарячі клавіші', icon: '⌨️' },
    { id: 'examples', label: 'Приклади', icon: '📚' },
    { id: 'diagnostics', label: 'Діагностика', icon: '🔧' }
  ];
  
  return (
    <div className="panel info-panel">
      <div className="panel-header">
        <div className="panel-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`panel-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <button className="panel-close" onClick={onClose}>✕</button>
      </div>
      
      <div className="panel-content">
        {activeTab === 'help' && <HelpContent />}
        {activeTab === 'shortcuts' && <ShortcutsContent />}
        {activeTab === 'examples' && <ExamplesContent onExample={(type) => {
          // Створити приклад
          createExample(graphManager, type);
          onClose();
        }} />}
        {activeTab === 'diagnostics' && <DiagnosticsContent diagnostics={diagnostics} />}
      </div>
    </div>
  );
}

function HelpContent() {
  return (
    <div className="help-content">
      <h3>🎯 Canvas OS - Візуальне програмування</h3>
      
      <section>
        <h4>Основи роботи</h4>
        <ul>
          <li><strong>Створення вузлів:</strong> Подвійний клік на канві або використовуйте панель інструментів</li>
          <li><strong>З'єднання:</strong> Клікніть на вихідний порт і потім на вхідний</li>
          <li><strong>Переміщення:</strong> Перетягуйте вузли мишкою</li>
          <li><strong>Видалення:</strong> Виберіть елемент і натисніть Delete</li>
          <li><strong>Панорамування:</strong> Утримуйте середню кнопку миші або Alt+ЛКМ</li>
          <li><strong>Масштабування:</strong> Колесо миші</li>
        </ul>
      </section>
      
      <section>
        <h4>Типи вузлів</h4>
        <ul>
          <li><strong>Input:</strong> Генерує дані (таймер, випадкові числа, миша)</li>
          <li><strong>Process:</strong> Обробляє дані користувацьким кодом</li>
          <li><strong>Filter:</strong> Фільтрує дані за умовою</li>
          <li><strong>Output:</strong> Виводить результат</li>
          <li><strong>Visualizer:</strong> Візуалізує дані графічно</li>
          <li><strong>Automaton:</strong> Клітинний автомат</li>
        </ul>
      </section>
      
      <section>
        <h4>Поради</h4>
        <ul>
          <li>Використовуйте Ctrl/Cmd для множинного вибору</li>
          <li>Групуйте пов'язані вузли для кращої організації</li>
          <li>Зберігайте роботу регулярно (Ctrl/Cmd+S)</li>
          <li>Експериментуйте з різними типами візуалізації</li>
        </ul>
      </section>
    </div>
  );
}

function ShortcutsContent() {
  const shortcuts = [
    { keys: 'Ctrl/Cmd + S', action: 'Зберегти граф' },
    { keys: 'Ctrl/Cmd + O', action: 'Відкрити граф' },
    { keys: 'Ctrl/Cmd + Z', action: 'Скасувати' },
    { keys: 'Ctrl/Cmd + Shift + Z', action: 'Повторити' },
    { keys: 'Delete/Backspace', action: 'Видалити вибране' },
    { keys: 'Ctrl/Cmd + A', action: 'Вибрати все' },
    { keys: 'Ctrl/Cmd + C', action: 'Копіювати' },
    { keys: 'Ctrl/Cmd + V', action: 'Вставити' },
    { keys: 'Ctrl/Cmd + D', action: 'Дублювати' },
    { keys: 'F11', action: 'Повноекранний режим' },
    { keys: 'Подвійний клік', action: 'Створити вузол' },
    { keys: 'Колесо миші', action: 'Масштабування' },
    { keys: 'Середня кнопка', action: 'Панорамування' },
    { keys: 'Alt + ЛКМ', action: 'Панорамування' }
  ];
  
  return (
    <div className="shortcuts-content">
      <table className="shortcuts-table">
        <thead>
          <tr>
            <th>Комбінація</th>
            <th>Дія</th>
          </tr>
        </thead>
        <tbody>
          {shortcuts.map((shortcut, index) => (
            <tr key={index}>
              <td><kbd>{shortcut.keys}</kbd></td>
              <td>{shortcut.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExamplesContent({ onExample }) {
  const examples = [
    {
      id: 'simple-flow',
      name: 'Простий потік даних',
      description: 'Таймер → Обробка → Візуалізація',
      icon: '📊'
    },
    {
      id: 'automaton',
      name: 'Клітинний автомат',
      description: 'Game of Life з візуалізацією',
      icon: '🎮'
    },
    {
      id: 'data-processing',
      name: 'Обробка даних',
      description: 'Фільтрація та трансформація',
      icon: '⚙️'
    },
    {
      id: 'interactive',
      name: 'Інтерактивний',
      description: 'Реакція на рух миші',
      icon: '🖱️'
    },
    {
      id: 'complex',
      name: 'Складний граф',
      description: 'Множинні потоки даних',
      icon: '🕸️'
    }
  ];
  
  return (
    <div className="examples-content">
      <div className="examples-grid">
        {examples.map(example => (
          <button
            key={example.id}
            className="example-card"
            onClick={() => onExample(example.id)}
          >
            <div className="example-icon">{example.icon}</div>
            <div className="example-info">
              <h4>{example.name}</h4>
              <p>{example.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DiagnosticsContent({ diagnostics }) {
  if (!diagnostics) {
    return <div className="diagnostics-loading">Завантаження...</div>;
  }
  
  return (
    <div className="diagnostics-content">
      <section>
        <h4>Загальна інформація</h4>
        <table className="diagnostics-table">
          <tbody>
            <tr>
              <td>ID графа:</td>
              <td><code>{diagnostics.metadata.id}</code></td>
            </tr>
            <tr>
              <td>Назва:</td>
              <td>{diagnostics.metadata.name}</td>
            </tr>
            <tr>
              <td>Вузлів:</td>
              <td>{diagnostics.nodesCount}</td>
            </tr>
            <tr>
              <td>З'єднань:</td>
              <td>{diagnostics.edgesCount}</td>
            </tr>
            <tr>
              <td>Вибрано:</td>
              <td>{diagnostics.selectedNodes} вузлів, {diagnostics.selectedEdges} з'єднань</td>
            </tr>
            <tr>
              <td>Історія:</td>
              <td>{diagnostics.historyIndex + 1} / {diagnostics.historySize}</td>
            </tr>
          </tbody>
        </table>
      </section>
      
      {diagnostics.nodes.length > 0 && (
        <section>
          <h4>Активні вузли</h4>
          <div className="diagnostics-nodes">
            {diagnostics.nodes.slice(0, 5).map(node => (
              <div key={node.id} className="diagnostic-node">
                <strong>{node.type}</strong> - {node.id.slice(0, 8)}
                {node.hasError && <span className="error-badge">Error</span>}
                <div className="node-metrics">
                  Виконань: {node.metadata.executionCount}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      
      <section>
        <h4>Системна інформація</h4>
        <table className="diagnostics-table">
          <tbody>
            <tr>
              <td>Платформа:</td>
              <td>{window.canvasAPI?.system?.platform || 'Browser'}</td>
            </tr>
            <tr>
              <td>Версія:</td>
              <td>1.0.0</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

// Функція створення прикладів
function createExample(graphManager, type) {
  // Очищення канви
  graphManager.clear();
  
  switch (type) {
    case 'simple-flow':
      const input1 = graphManager.addNode('input', { x: 100, y: 200 });
      const process1 = graphManager.addNode('process', { x: 300, y: 200 });
      const viz1 = graphManager.addNode('visualizer', { x: 500, y: 200 });
      
      setTimeout(() => {
        graphManager.addEdge(input1.id, process1.id);
        graphManager.addEdge(process1.id, viz1.id);
        
        // Налаштування вузлів
        input1.updateConfig({ inputType: 'timer', interval: 1000 });
        process1.updateCode('return Math.sin(input / 10) * 50 + 50;');
      }, 100);
      break;
      
    case 'automaton':
      const automaton = graphManager.addNode('automaton', { x: 200, y: 150 });
      const viz2 = graphManager.addNode('visualizer', { x: 450, y: 150 });
      
      setTimeout(() => {
        graphManager.addEdge(automaton.id, viz2.id);
        automaton.updateData({ automatonType: 'life', autoRun: true });
      }, 100);
      break;
      
    // Інші приклади...
  }
}