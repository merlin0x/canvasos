// src/renderer/components/Node.js
// React компонент для відображення вузла

import React, { useState, useEffect, useRef, memo } from 'react';
import { NodeColors, NodeDimensions, PortConfig, NodeType } from '@core/constants.js';

export const NodeComponent = memo(({ 
  node, 
  selected, 
  onSelect, 
  onDelete, 
  onPortClick,
  onDragStart,
  onDragEnd,
  onUpdateValue
}) => {
  const [state, setState] = useState(node.state$.value);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const nodeRef = useRef(null);
  
  // Підписка на зміни стану вузла
  useEffect(() => {
    const subscription = node.state$.subscribe(newState => {
      setState(newState);
    });
    
    return () => subscription.unsubscribe();
  }, [node]);
  
  // Обробка drag & drop
  const handleMouseDown = (e) => {
    if (e.target.classList.contains('node-port') || 
        e.target.classList.contains('node-input')) {
      return;
    }
    
    setIsDragging(true);
    onDragStart(e, node.id);
  };
  
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        onDragEnd(node.id);
      }
    };
    
    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp);
      return () => document.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging, node.id, onDragEnd]);
  
  // Обробка кліку на порт
  const handlePortClick = (e, portType) => {
    e.stopPropagation();
    onPortClick(node.id, portType);
  };
  
  // Обробка подвійного кліку
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    
    if (node.type === NodeType.INPUT || node.type === NodeType.PROCESS) {
      setIsEditing(true);
    } else if (window.confirm('Видалити цей вузол?')) {
      onDelete(node.id);
    }
  };
  
  // Отримання розмірів вузла
  const getDimensions = () => {
    switch (node.type) {
      case NodeType.VISUALIZER:
        return NodeDimensions.VISUALIZER;
      case NodeType.AUTOMATON:
        return NodeDimensions.AUTOMATON;
      default:
        return NodeDimensions.DEFAULT;
    }
  };
  
  // Рендер вмісту вузла
  const renderContent = () => {
    switch (node.type) {
      case NodeType.INPUT:
        return <InputNodeContent 
          node={node} 
          isEditing={isEditing}
          onStopEditing={() => setIsEditing(false)}
          onUpdateValue={onUpdateValue}
        />;
        
      case NodeType.PROCESS:
        return <ProcessNodeContent 
          node={node} 
          state={state}
          isEditing={isEditing}
          onStopEditing={() => setIsEditing(false)}
        />;
        
      case NodeType.OUTPUT:
        return <OutputNodeContent state={state} />;
        
      case NodeType.VISUALIZER:
        return <VisualizerNodeContent state={state} />;
        
      case NodeType.AUTOMATON:
        return <AutomatonNodeContent state={state} />;
        
      case NodeType.FILTER:
        return <FilterNodeContent state={state} />;
        
      default:
        return <DefaultNodeContent state={state} />;
    }
  };
  
  const dimensions = getDimensions();
  const hasError = state?.error !== null && state?.error !== undefined;
  
  return (
    <div
      ref={nodeRef}
      className={`node ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${hasError ? 'error' : ''}`}
      style={{
        position: 'absolute',
        left: node.position.x,
        top: node.position.y,
        width: dimensions.width,
        minHeight: dimensions.height,
        backgroundColor: NodeColors[node.type],
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Header */}
      <div className="node-header">
        <div className="node-type">{node.type.toUpperCase()}</div>
        <div className="node-id">{node.id.slice(0, 8)}</div>
      </div>
      
      {/* Content */}
      <div className="node-content">
        {renderContent()}
      </div>
      
      {/* Error indicator */}
      {hasError && (
        <div className="node-error" title={state.error?.message || 'Error'}>
          ⚠️
        </div>
      )}
      
      {/* Ports */}
      {node.type !== NodeType.INPUT && (
        <div 
          className="node-port input"
          onClick={(e) => handlePortClick(e, 'input')}
        />
      )}
      {node.type !== NodeType.OUTPUT && (
        <div 
          className="node-port output"
          onClick={(e) => handlePortClick(e, 'output')}
        />
      )}
      
      {/* Execution indicator */}
      {node.metadata.executionCount > 0 && (
        <div className="node-stats">
          <span title="Executions">{node.metadata.executionCount}</span>
          {node.metadata.averageExecutionTime > 0 && (
            <span title="Avg time (ms)">
              {node.metadata.averageExecutionTime.toFixed(1)}ms
            </span>
          )}
        </div>
      )}
    </div>
  );
});

// === Компоненти вмісту для різних типів вузлів ===

const InputNodeContent = ({ node, isEditing, onStopEditing, onUpdateValue }) => {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  const handleSubmit = () => {
    let parsedValue = value;
    
    // Автоматичне парсинг типів
    if (!isNaN(parseFloat(value)) && isFinite(value)) {
      parsedValue = parseFloat(value);
    } else if (value === 'true' || value === 'false') {
      parsedValue = value === 'true';
    } else if (value.startsWith('[') || value.startsWith('{')) {
      try {
        parsedValue = JSON.parse(value);
      } catch (e) {
        // Залишаємо як рядок
      }
    }
    
    onUpdateValue(node.id, parsedValue);
    node.state$.next(parsedValue);
    node.output$.next(parsedValue);
    onStopEditing();
  };
  
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className="node-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onStopEditing}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleSubmit();
          }
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  
  return (
    <div className="node-value">
      {node.state$.value !== null ? 
        formatValue(node.state$.value) : 
        <span className="placeholder">Click to edit</span>
      }
    </div>
  );
};

const ProcessNodeContent = ({ node, state, isEditing, onStopEditing }) => {
  if (state?.compiled === false) {
    return (
      <div className="node-error-message">
        Code error
      </div>
    );
  }
  
  return (
    <div className="node-value">
      {state?.lastOutput !== undefined ? 
        formatValue(state.lastOutput) : 
        <span className="placeholder">No output</span>
      }
    </div>
  );
};

const OutputNodeContent = ({ state }) => {
  return (
    <div className="node-value output">
      {state !== null ? 
        formatValue(state) : 
        <span className="placeholder">No data</span>
      }
    </div>
  );
};

const VisualizerNodeContent = ({ state }) => {
  const values = state || [];
  
  return (
    <div className="node-visualization">
      {values.slice(-10).map((item, index) => {
        const value = item?.value !== undefined ? item.value : item;
        const numValue = typeof value === 'number' ? value : 50;
        const width = Math.min(100, Math.abs(numValue));
        
        return (
          <div 
            key={index}
            className="viz-bar"
            style={{ 
              width: `${width}%`,
              opacity: 1 - (index / 10) * 0.5
            }}
          >
            <span>{formatValue(value)}</span>
          </div>
        );
      })}
      {values.length === 0 && (
        <div className="placeholder">No data</div>
      )}
    </div>
  );
};

const AutomatonNodeContent = ({ state }) => {
  const cells = Array.isArray(state) ? state : [];
  
  return (
    <div className="automaton-grid">
      {cells.slice(0, 50).map((cell, i) => (
        <div
          key={i}
          className={`automaton-cell ${cell ? 'alive' : 'dead'}`}
        />
      ))}
    </div>
  );
};

const FilterNodeContent = ({ state }) => {
  return (
    <div className="node-value">
      {state !== null ? 
        <span>
          {formatValue(state)}
          <span className="filter-indicator">🔽</span>
        </span> : 
        <span className="placeholder">No data</span>
      }
    </div>
  );
};

const DefaultNodeContent = ({ state }) => {
  return (
    <div className="node-value">
      {formatValue(state)}
    </div>
  );
};

// === Утиліти ===

const formatValue = (value) => {
  if (value === null || value === undefined) {
    return '—';
  }
  
  if (typeof value === 'object') {
    if (value.error) {
      return `❌ ${value.error.message || 'Error'}`;
    }
    return JSON.stringify(value, null, 2).slice(0, 50) + '...';
  }
  
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  
  return String(value).slice(0, 50);
};

NodeComponent.displayName = 'NodeComponent';