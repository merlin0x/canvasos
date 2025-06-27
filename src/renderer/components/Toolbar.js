// src/renderer/components/Toolbar.js
// Панель інструментів Canvas OS

import React, { useState } from 'react';
import { NodeType } from '../core/constants.js';

export function Toolbar({ 
  onCommand, 
  currentTool, 
  isSimulating, 
  canUndo, 
  canRedo 
}) {
  const [showNodeMenu, setShowNodeMenu] = useState(false);
  
  const nodeTypes = [
    { type: NodeType.INPUT, label: 'Input', icon: '📥' },
    { type: NodeType.PROCESS, label: 'Process', icon: '⚙️' },
    { type: NodeType.FILTER, label: 'Filter', icon: '🔽' },
    { type: NodeType.OUTPUT, label: 'Output', icon: '📤' },
    { type: NodeType.VISUALIZER, label: 'Visualizer', icon: '📊' },
    { type: NodeType.AUTOMATON, label: 'Automaton', icon: '🎮' }
  ];
  
  const tools = [
    { id: 'select', icon: '👆', title: 'Select' },
    { id: 'pan', icon: '✋', title: 'Pan' },
    { id: 'connect', icon: '🔗', title: 'Connect' }
  ];
  
  return (
    <div className="toolbar">
      {/* Основні інструменти */}
      <div className="toolbar-group">
        {tools.map(tool => (
          <button
            key={tool.id}
            className={`toolbar-button ${currentTool === tool.id ? 'active' : ''}`}
            onClick={() => onCommand('tool', { tool: tool.id })}
            title={tool.title}
          >
            <span className="tool-icon">{tool.icon}</span>
          </button>
        ))}
      </div>
      
      <div className="toolbar-divider" />
      
      {/* Додавання вузлів */}
      <div className="toolbar-group">
        <div className="dropdown">
          <button 
            className="toolbar-button"
            onClick={() => setShowNodeMenu(!showNodeMenu)}
          >
            <span>➕ Додати вузол</span>
          </button>
          
          {showNodeMenu && (
            <div className="dropdown-menu">
              {nodeTypes.map(node => (
                <button
                  key={node.type}
                  className="dropdown-item"
                  onClick={() => {
                    onCommand('add-node', { type: node.type });
                    setShowNodeMenu(false);
                  }}
                >
                  <span className="node-icon">{node.icon}</span>
                  <span>{node.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="toolbar-divider" />
      
      {/* Дії з графом */}
      <div className="toolbar-group">
        <button
          className="toolbar-button"
          onClick={() => onCommand('undo')}
          disabled={!canUndo}
          title="Скасувати (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          className="toolbar-button"
          onClick={() => onCommand('redo')}
          disabled={!canRedo}
          title="Повторити (Ctrl+Shift+Z)"
        >
          ↷
        </button>
      </div>
      
      <div className="toolbar-divider" />
      
      {/* Симуляція */}
      <div className="toolbar-group">
        <button
          className={`toolbar-button ${isSimulating ? 'active' : ''}`}
          onClick={() => onCommand('toggle-simulation')}
          title={isSimulating ? 'Зупинити симуляцію' : 'Запустити симуляцію'}
        >
          <span>{isSimulating ? '⏸️' : '▶️'}</span>
          <span>{isSimulating ? 'Пауза' : 'Запуск'}</span>
        </button>
      </div>
      
      <div className="toolbar-divider" />
      
      {/* Вид */}
      <div className="toolbar-group">
        <button
          className="toolbar-button"
          onClick={() => onCommand('center-view')}
          title="Центрувати вид"
        >
          ⊙
        </button>
        <button
          className="toolbar-button"
          onClick={() => onCommand('fit-to-screen')}
          title="Підігнати під екран"
        >
          ⛶
        </button>
      </div>
      
      <div className="toolbar-spacer" />
      
      {/* Додаткові дії */}
      <div className="toolbar-group">
        <button
          className="toolbar-button"
          onClick={() => onCommand('delete-selected')}
          title="Видалити вибране (Delete)"
        >
          🗑️
        </button>
        <button
          className="toolbar-button danger"
          onClick={() => onCommand('clear-all')}
          title="Очистити все"
        >
          🧹
        </button>
      </div>
    </div>
  );
}