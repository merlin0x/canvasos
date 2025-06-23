import React, { useState, useEffect, useRef } from 'react';
import { Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';

// Типи вузлів
const NodeType = {
  INPUT: 'input',
  PROCESS: 'process',
  OUTPUT: 'output',
  AUTOMATON: 'automaton'
};

// Базовий клас вузла
class CanvasNode {
  constructor(id, type, position, data = {}) {
    this.id = id;
    this.type = type;
    this.position = position;
    this.data = data;
    this.input$ = new Subject();
    this.output$ = new Subject();
    this.state$ = new BehaviorSubject(data.initialState || null);
    
    // Налаштування обробки залежно від типу
    this.setupProcessing();
  }
  
  setupProcessing() {
    switch (this.type) {
      case NodeType.INPUT:
        // Просто передає значення далі
        this.input$.subscribe(value => {
          this.output$.next(value);
        });
        break;
        
      case NodeType.PROCESS:
        // Виконує трансформацію
        this.input$.subscribe(value => {
          const result = this.data.transform ? 
            this.data.transform(value) : 
            value * 2; // default transformation
          this.output$.next(result);
        });
        break;
        
      case NodeType.AUTOMATON:
        // Клітинний автомат (простий приклад)
        this.input$.subscribe(value => {
          const currentState = this.state$.value;
          const newState = this.updateAutomatonState(currentState, value);
          this.state$.next(newState);
          this.output$.next(newState);
        });
        break;
    }
  }
  
  updateAutomatonState(state, input) {
    // Простий клітинний автомат (Rule 30)
    if (!state) state = Array(50).fill(0);
    const newState = [...state];
    
    for (let i = 1; i < state.length - 1; i++) {
      const left = state[i - 1];
      const center = state[i];
      const right = state[i + 1];
      const pattern = (left << 2) | (center << 1) | right;
      newState[i] = (30 >> pattern) & 1;
    }
    
    return newState;
  }
  
  destroy() {
    this.input$.complete();
    this.output$.complete();
    this.state$.complete();
  }
}

// Клас для з'єднань
class Edge {
  constructor(id, sourceId, targetId, sourcePort = 'output', targetPort = 'input') {
    this.id = id;
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.sourcePort = sourcePort;
    this.targetPort = targetPort;
    this.subscription = null;
  }
  
  connect(nodes) {
    const source = nodes.get(this.sourceId);
    const target = nodes.get(this.targetId);
    
    if (source && target) {
      this.subscription = source.output$.subscribe(value => {
        target.input$.next(value);
      });
    }
  }
  
  disconnect() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }
}

// Компонент вузла на канві
const NodeComponent = ({ node, selected, onSelect, onDelete }) => {
  const getNodeColor = () => {
    switch (node.type) {
      case NodeType.INPUT: return '#4CAF50';
      case NodeType.PROCESS: return '#2196F3';
      case NodeType.OUTPUT: return '#FF9800';
      case NodeType.AUTOMATON: return '#9C27B0';
      default: return '#666';
    }
  };
  
  return (
    <div
      className={`node ${selected ? 'selected' : ''}`}
      style={{
        position: 'absolute',
        left: node.position.x,
        top: node.position.y,
        width: 120,
        height: 60,
        background: getNodeColor(),
        border: selected ? '2px solid #fff' : '1px solid #333',
        borderRadius: 8,
        padding: 8,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#fff',
        fontSize: 14,
        fontWeight: 500,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
      }}
      onClick={() => onSelect(node.id)}
      onDoubleClick={() => onDelete(node.id)}
    >
      <div>{node.type.toUpperCase()}</div>
      <div style={{ fontSize: 11, opacity: 0.8 }}>{node.id}</div>
    </div>
  );
};

// Компонент з'єднання
const EdgeComponent = ({ edge, sourcePos, targetPos }) => {
  const path = `M ${sourcePos.x} ${sourcePos.y} C ${sourcePos.x + 100} ${sourcePos.y}, ${targetPos.x - 100} ${targetPos.y}, ${targetPos.x} ${targetPos.y}`;
  
  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
      }}
    >
      <path
        d={path}
        fill="none"
        stroke="#666"
        strokeWidth="2"
        strokeDasharray="5,5"
      />
    </svg>
  );
};

// Основний компонент додатку
export default function CanvasOS() {
  const [nodes, setNodes] = useState(new Map());
  const [edges, setEdges] = useState(new Map());
  const [selectedNode, setSelectedNode] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [simulationRunning, setSimulationRunning] = useState(false);
  
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  
  // Створення нового вузла
  const createNode = (type, position) => {
    const id = `node-${Date.now()}`;
    const node = new CanvasNode(id, type, position);
    
    setNodes(prev => {
      const newMap = new Map(prev);
      newMap.set(id, node);
      return newMap;
    });
    
    return id;
  };
  
  // Створення з'єднання
  const createEdge = (sourceId, targetId) => {
    const id = `edge-${Date.now()}`;
    const edge = new Edge(id, sourceId, targetId);
    
    edge.connect(nodes);
    
    setEdges(prev => {
      const newMap = new Map(prev);
      newMap.set(id, edge);
      return newMap;
    });
  };
  
  // Видалення вузла
  const deleteNode = (nodeId) => {
    const node = nodes.get(nodeId);
    if (node) {
      node.destroy();
      
      // Видалення пов'язаних з'єднань
      edges.forEach((edge, edgeId) => {
        if (edge.sourceId === nodeId || edge.targetId === nodeId) {
          edge.disconnect();
          setEdges(prev => {
            const newMap = new Map(prev);
            newMap.delete(edgeId);
            return newMap;
          });
        }
      });
      
      setNodes(prev => {
        const newMap = new Map(prev);
        newMap.delete(nodeId);
        return newMap;
      });
    }
  };
  
  // Запуск симуляції
  const startSimulation = () => {
    setSimulationRunning(true);
    
    // Знайти input вузли і почати генерувати дані
    nodes.forEach(node => {
      if (node.type === NodeType.INPUT) {
        const interval = setInterval(() => {
          const value = Math.random() * 100;
          node.output$.next(value);
        }, 1000);
        
        // Зберегти interval для зупинки пізніше
        node.data.interval = interval;
      }
    });
  };
  
  // Зупинка симуляції
  const stopSimulation = () => {
    setSimulationRunning(false);
    
    nodes.forEach(node => {
      if (node.data.interval) {
        clearInterval(node.data.interval);
        delete node.data.interval;
      }
    });
  };
  
  // Обробка кліку на канві
  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      // Створити новий вузол при подвійному кліку
      if (e.detail === 2) {
        createNode(NodeType.PROCESS, position);
      }
    }
  };
  
  // Обчислення позицій для з'єднань
  const getNodeConnectionPoint = (nodeId, port) => {
    const node = nodes.get(nodeId);
    if (!node) return { x: 0, y: 0 };
    
    return {
      x: node.position.x + (port === 'output' ? 120 : 0),
      y: node.position.y + 30
    };
  };
  
  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Панель інструментів */}
      <div className="toolbar">
        <button onClick={() => createNode(NodeType.INPUT, { x: 100, y: 100 })}>
          + Input Node
        </button>
        <button onClick={() => createNode(NodeType.PROCESS, { x: 300, y: 100 })}>
          + Process Node
        </button>
        <button onClick={() => createNode(NodeType.OUTPUT, { x: 500, y: 100 })}>
          + Output Node
        </button>
        <button onClick={() => createNode(NodeType.AUTOMATON, { x: 300, y: 250 })}>
          + Automaton
        </button>
        <div style={{ borderLeft: '1px solid #555', height: 24, margin: '0 8px' }} />
        <button onClick={() => {
          if (nodes.size >= 2) {
            const nodeIds = Array.from(nodes.keys());
            createEdge(nodeIds[0], nodeIds[1]);
          }
        }}>
          Connect Nodes
        </button>
        <button onClick={simulationRunning ? stopSimulation : startSimulation}>
          {simulationRunning ? '⏸ Stop' : '▶ Run'}
        </button>
        <button onClick={() => setShowEditor(!showEditor)}>
          {showEditor ? 'Hide Editor' : 'Show Editor'}
        </button>
      </div>
      
      {/* Основна канва */}
      <div className="main-container">
        <div 
          ref={canvasRef}
          className="canvas-container" 
          onClick={handleCanvasClick}
          style={{ 
            position: 'relative', 
            background: '#1a1a1a',
            backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        >
          {/* З'єднання */}
          {Array.from(edges.values()).map(edge => {
            const sourcePos = getNodeConnectionPoint(edge.sourceId, 'output');
            const targetPos = getNodeConnectionPoint(edge.targetId, 'input');
            return (
              <EdgeComponent
                key={edge.id}
                edge={edge}
                sourcePos={sourcePos}
                targetPos={targetPos}
              />
            );
          })}
          
          {/* Вузли */}
          {Array.from(nodes.values()).map(node => (
            <NodeComponent
              key={node.id}
              node={node}
              selected={selectedNode === node.id}
              onSelect={setSelectedNode}
              onDelete={deleteNode}
            />
          ))}
        </div>
        
        {/* Панель редактора */}
        <div className={`editor-panel ${showEditor ? 'active' : ''}`}>
          <div className="editor-header">
            <span>Node Editor</span>
            <button 
              onClick={() => setShowEditor(false)}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: '#999',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
          <div className="editor-content" style={{ padding: 16, color: '#ccc' }}>
            {selectedNode ? (
              <div>
                <h4>Node: {selectedNode}</h4>
                <p>Type: {nodes.get(selectedNode)?.type}</p>
                <p>Position: {JSON.stringify(nodes.get(selectedNode)?.position)}</p>
                <div style={{ marginTop: 16 }}>
                  <textarea
                    style={{
                      width: '100%',
                      height: 150,
                      background: '#1a1a1a',
                      color: '#fff',
                      border: '1px solid #444',
                      borderRadius: 4,
                      padding: 8,
                      fontFamily: 'monospace'
                    }}
                    placeholder="// Node transformation function"
                    defaultValue={`// Transform function
function transform(input) {
  return input * 2;
}`}
                  />
                </div>
              </div>
            ) : (
              <p style={{ color: '#666' }}>Select a node to edit</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Статус бар */}
      <div className="status-bar">
        <span>Nodes: {nodes.size}</span>
        <span style={{ marginLeft: 16 }}>Edges: {edges.size}</span>
        <span style={{ marginLeft: 16 }}>
          Status: {simulationRunning ? '🟢 Running' : '⚪ Stopped'}
        </span>
      </div>
    </div>
  );
}