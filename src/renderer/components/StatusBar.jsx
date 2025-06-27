// src/renderer/components/StatusBar.js
// Статус бар Canvas OS

import React from 'react';

export function StatusBar({ 
  nodesCount, 
  edgesCount, 
  selectedCount,
  isSimulating, 
  zoom, 
  position,
  showInfo,
  showEditor,
  showMinimap
}) {
  const formatZoom = (z) => `${Math.round(z * 100)}%`;
  const formatPosition = (pos) => `${Math.round(pos.x)}, ${Math.round(pos.y)}`;
  
  return (
    <div className="status-bar">
      {/* Статистика графа */}
      <div className="status-group">
        <span className="status-item">
          <span className="status-icon">📦</span>
          <span>Вузлів: {nodesCount}</span>
        </span>
        <span className="status-item">
          <span className="status-icon">🔗</span>
          <span>З'єднань: {edgesCount}</span>
        </span>
        {selectedCount > 0 && (
          <span className="status-item">
            <span className="status-icon">✅</span>
            <span>Вибрано: {selectedCount}</span>
          </span>
        )}
      </div>
      
      <div className="status-divider" />
      
      {/* Стан симуляції */}
      <div className="status-group">
        <span className="status-item">
          <span className={`status-indicator ${isSimulating ? 'active' : ''}`} />
          <span>{isSimulating ? 'Виконується' : 'Зупинено'}</span>
        </span>
      </div>
      
      <div className="status-divider" />
      
      {/* Позиція та масштаб */}
      <div className="status-group">
        <span className="status-item">
          <span className="status-icon">📍</span>
          <span>{formatPosition(position)}</span>
        </span>
        <span className="status-item">
          <span className="status-icon">🔍</span>
          <span>{formatZoom(zoom)}</span>
        </span>
      </div>
      
      <div className="status-spacer" />
      
      {/* Перемикачі панелей */}
      <div className="status-group">
        <button 
          className={`status-button ${showInfo ? 'active' : ''}`}
          onClick={showInfo}
          title="Інформаційна панель"
        >
          ℹ️
        </button>
        <button 
          className={`status-button ${showEditor ? 'active' : ''}`}
          onClick={showEditor}
          title="Редактор коду"
        >
          📝
        </button>
        <button 
          className={`status-button ${showMinimap ? 'active' : ''}`}
          onClick={showMinimap}
          title="Мінімапа"
        >
          🗺️
        </button>
      </div>
      
      {/* Версія */}
      <div className="status-group">
        <span className="status-item status-version">
          v1.0.0
        </span>
      </div>
    </div>
  );
}