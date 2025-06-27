// src/renderer/components/Editor.js
// Редактор коду для вузлів

import React, { useState, useEffect, useRef } from 'react';
import { NodeType } from '../core/constants.js';
import { ProcessNode } from '../nodes/ProcessNode.js';

export function Editor({ nodeId, node, onClose, onUpdate }) {
  const [code, setCode] = useState('');
  const [config, setConfig] = useState({});
  const [activeTab, setActiveTab] = useState('code');
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);
  
  useEffect(() => {
    if (node) {
      setCode(node.data.code || '');
      setConfig(node.data);
    }
  }, [node]);
  
  if (!node) return null;
  
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    setError(null);
  };
  
  const handleApply = () => {
    try {
      if (node.type === NodeType.PROCESS) {
        // Перевірка синтаксису
        new Function('input', 'state', 'emit', newCode);
        
        // Оновлення вузла
        node.updateCode(newCode);
        onUpdate(nodeId, { data: { ...config, code: newCode } });
        setError(null);
      }
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleConfigChange = (key, value) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onUpdate(nodeId, { data: newConfig });
  };
  
  const insertSnippet = (snippet) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = code.substring(0, start) + snippet + code.substring(end);
      setCode(newCode);
      
      // Встановлення курсора після вставки
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + snippet.length;
        textarea.focus();
      }, 0);
    }
  };
  
  const tabs = [
    { id: 'code', label: 'Код', show: node.type === NodeType.PROCESS },
    { id: 'config', label: 'Налаштування', show: true },
    { id: 'help', label: 'Довідка', show: true }
  ].filter(tab => tab.show);
  
  return (
    <div className="panel editor-panel">
      <div className="panel-header">
        <div className="editor-title">
          <span className="node-type-badge" style={{ backgroundColor: getNodeColor(node.type) }}>
            {node.type}
          </span>
          <span className="node-id">{nodeId.slice(0, 12)}...</span>
        </div>
        <button className="panel-close" onClick={onClose}>✕</button>
      </div>
      
      <div className="editor-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`editor-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="panel-content editor-content">
        {activeTab === 'code' && node.type === NodeType.PROCESS && (
          <CodeTab
            code={code}
            error={error}
            onChange={handleCodeChange}
            onApply={handleApply}
            insertSnippet={insertSnippet}
            textareaRef={textareaRef}
          />
        )}
        
        {activeTab === 'config' && (
          <ConfigTab
            node={node}
            config={config}
            onChange={handleConfigChange}
          />
        )}
        
        {activeTab === 'help' && (
          <HelpTab nodeType={node.type} />
        )}
      </div>
    </div>
  );
}

function CodeTab({ code, error, onChange, onApply, insertSnippet, textareaRef }) {
  const snippets = [
    { label: 'Подвоєння', code: 'return input * 2;' },
    { label: 'Квадрат', code: 'return input * input;' },
    { label: 'Фільтр > 0', code: 'return input > 0 ? input : null;' },
    { label: 'Накопичення', code: 'state.sum = (state.sum || 0) + input;\nreturn state.sum;' },
    { label: 'Середнє', code: 'state.values = state.values || [];\nstate.values.push(input);\nif (state.values.length > 10) state.values.shift();\nreturn state.values.reduce((a, b) => a + b) / state.values.length;' },
    { label: 'Асинхронний', code: 'return new Promise(resolve => {\n  setTimeout(() => resolve(input * 2), 1000);\n});' }
  ];
  
  return (
    <div className="code-editor">
      <div className="code-toolbar">
        <button onClick={onApply} className="apply-button">
          Застосувати
        </button>
        <div className="snippets-dropdown">
          <button className="snippets-button">Приклади ▼</button>
          <div className="snippets-menu">
            {snippets.map((snippet, index) => (
              <button
                key={index}
                className="snippet-item"
                onClick={() => insertSnippet(snippet.code)}
              >
                {snippet.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="code-input-wrapper">
        <div className="code-line-numbers">
          {code.split('\n').map((_, i) => (
            <div key={i} className="line-number">{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          className="code-textarea"
          value={code}
          onChange={(e) => onChange(e.target.value)}
          placeholder="// Функція обробки
// Доступні змінні:
//   input - вхідне значення
//   state - стан вузла
//   emit - відправка проміжних значень
//
// Приклад:
// return input * 2;"
          spellCheck={false}
        />
      </div>
      
      {error && (
        <div className="code-error">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}
      
      <div className="code-help">
        <p><strong>Доступні змінні:</strong></p>
        <ul>
          <li><code>input</code> - вхідне значення</li>
          <li><code>state</code> - об'єкт для збереження стану між викликами</li>
          <li><code>emit(value)</code> - відправка проміжних значень</li>
        </ul>
      </div>
    </div>
  );
}

function ConfigTab({ node, config, onChange }) {
  const renderConfigField = (key, label, type = 'text') => {
    const value = config[key] || '';
    
    switch (type) {
      case 'number':
        return (
          <div className="config-field" key={key}>
            <label>{label}</label>
            <input
              type="number"
              value={value}
              onChange={(e) => onChange(key, parseFloat(e.target.value) || 0)}
            />
          </div>
        );
        
      case 'select':
        const options = getOptionsForField(node.type, key);
        return (
          <div className="config-field" key={key}>
            <label>{label}</label>
            <select value={value} onChange={(e) => onChange(key, e.target.value)}>
              {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        );
        
      case 'boolean':
        return (
          <div className="config-field" key={key}>
            <label>
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => onChange(key, e.target.checked)}
              />
              {label}
            </label>
          </div>
        );
        
      default:
        return (
          <div className="config-field" key={key}>
            <label>{label}</label>
            <input
              type={type}
              value={value}
              onChange={(e) => onChange(key, e.target.value)}
            />
          </div>
        );
    }
  };
  
  const getConfigFields = () => {
    switch (node.type) {
      case NodeType.INPUT:
        return [
          { key: 'inputType', label: 'Тип вводу', type: 'select' },
          { key: 'interval', label: 'Інтервал (мс)', type: 'number' },
          { key: 'min', label: 'Мінімум', type: 'number' },
          { key: 'max', label: 'Максимум', type: 'number' }
        ];
        
      case NodeType.PROCESS:
        return [
          { key: 'async', label: 'Асинхронний режим', type: 'boolean' },
          { key: 'timeout', label: 'Таймаут (мс)', type: 'number' }
        ];
        
      case NodeType.VISUALIZER:
        return [
          { key: 'visualType', label: 'Тип візуалізації', type: 'select' },
          { key: 'maxValues', label: 'Макс. значень', type: 'number' },
          { key: 'color', label: 'Колір', type: 'color' },
          { key: 'showValues', label: 'Показувати значення', type: 'boolean' },
          { key: 'autoScale', label: 'Автомасштабування', type: 'boolean' }
        ];
        
      case NodeType.AUTOMATON:
        return [
          { key: 'automatonType', label: 'Тип автомата', type: 'select' },
          { key: 'rule', label: 'Правило (0-255)', type: 'number' },
          { key: 'width', label: 'Ширина', type: 'number' },
          { key: 'height', label: 'Висота', type: 'number' },
          { key: 'wrap', label: 'Тороїдальна топологія', type: 'boolean' },
          { key: 'stepInterval', label: 'Інтервал кроку (мс)', type: 'number' },
          { key: 'autoRun', label: 'Автозапуск', type: 'boolean' }
        ];
        
      default:
        return [];
    }
  };
  
  return (
    <div className="config-editor">
      {getConfigFields().map(field => renderConfigField(field.key, field.label, field.type))}
    </div>
  );
}

function HelpTab({ nodeType }) {
  const helpContent = {
    [NodeType.INPUT]: {
      title: 'Вузол введення даних',
      description: 'Генерує дані різними способами',
      types: [
        { name: 'manual', desc: 'Ручне введення значень' },
        { name: 'timer', desc: 'Лічильник з заданим інтервалом' },
        { name: 'random', desc: 'Випадкові числа в діапазоні' },
        { name: 'sine', desc: 'Синусоїдальний сигнал' },
        { name: 'mouse', desc: 'Координати курсора миші' },
        { name: 'time', desc: 'Поточний час' }
      ]
    },
    [NodeType.PROCESS]: {
      title: 'Вузол обробки',
      description: 'Трансформує дані користувацьким кодом',
      examples: [
        { code: 'return input * 2;', desc: 'Подвоєння значення' },
        { code: 'return Math.sqrt(input);', desc: 'Квадратний корінь' },
        { code: 'state.count = (state.count || 0) + 1;\nreturn state.count;', desc: 'Лічильник' }
      ]
    },
    [NodeType.VISUALIZER]: {
      title: 'Візуалізатор',
      description: 'Відображає дані графічно',
      types: [
        { name: 'bars', desc: 'Стовпчикова діаграма' },
        { name: 'line', desc: 'Лінійний графік' },
        { name: 'scatter', desc: 'Точкова діаграма' },
        { name: 'heatmap', desc: 'Теплова карта' },
        { name: 'text', desc: 'Текстовий вивід' }
      ]
    }
  };
  
  const help = helpContent[nodeType] || { title: nodeType, description: '' };
  
  return (
    <div className="help-content">
      <h3>{help.title}</h3>
      <p>{help.description}</p>
      
      {help.types && (
        <div>
          <h4>Доступні типи:</h4>
          <ul>
            {help.types.map((type, i) => (
              <li key={i}>
                <strong>{type.name}</strong> - {type.desc}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {help.examples && (
        <div>
          <h4>Приклади коду:</h4>
          {help.examples.map((ex, i) => (
            <div key={i} className="code-example">
              <pre>{ex.code}</pre>
              <p>{ex.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Утиліти
function getNodeColor(type) {
  const colors = {
    [NodeType.INPUT]: '#4CAF50',
    [NodeType.PROCESS]: '#2196F3',
    [NodeType.OUTPUT]: '#FF9800',
    [NodeType.AUTOMATON]: '#9C27B0',
    [NodeType.FILTER]: '#00BCD4',
    [NodeType.VISUALIZER]: '#E91E63'
  };
  return colors[type] || '#666';
}

function getOptionsForField(nodeType, field) {
  const options = {
    inputType: [
      { value: 'manual', label: 'Ручний' },
      { value: 'timer', label: 'Таймер' },
      { value: 'random', label: 'Випадковий' },
      { value: 'sine', label: 'Синусоїда' },
      { value: 'noise', label: 'Шум' },
      { value: 'mouse', label: 'Миша' },
      { value: 'keyboard', label: 'Клавіатура' },
      { value: 'time', label: 'Час' }
    ],
    visualType: [
      { value: 'bars', label: 'Стовпчики' },
      { value: 'line', label: 'Лінія' },
      { value: 'scatter', label: 'Точки' },
      { value: 'heatmap', label: 'Теплова карта' },
      { value: 'text', label: 'Текст' }
    ],
    automatonType: [
      { value: 'elementary', label: 'Елементарний' },
      { value: 'life', label: 'Game of Life' },
      { value: 'custom', label: 'Користувацький' }
    ]
  };
  
  return options[field] || [];
}