// Renderer процес - точка входу додатку

// Глобальні змінні для RxJS
const { Subject, BehaviorSubject, interval } = rxjs;
const { filter, map, switchMap, throttleTime } = rxjs.operators;

// Типи вузлів
const NodeType = {
  INPUT: 'input',
  PROCESS: 'process',
  OUTPUT: 'output',
  AUTOMATON: 'automaton',
  FILTER: 'filter',
  VISUALIZER: 'visualizer'
};

// Кольори для типів вузлів
const NodeColors = {
  [NodeType.INPUT]: '#4CAF50',
  [NodeType.PROCESS]: '#2196F3',
  [NodeType.OUTPUT]: '#FF9800',
  [NodeType.AUTOMATON]: '#9C27B0',
  [NodeType.FILTER]: '#00BCD4',
  [NodeType.VISUALIZER]: '#E91E63'
};

// Клас вузла
class CanvasNode {
  constructor(id, type, position, data = {}) {
    this.id = id;
    this.type = type;
    this.position = position;
    this.data = data;
    this.input$ = new Subject();
    this.output$ = new Subject();
    this.state$ = new BehaviorSubject(data.initialState || null);
    
    this.setupProcessing();
  }
  
  setupProcessing() {
    switch (this.type) {
      case NodeType.INPUT:
        // Генератор даних
        if (this.data.generatorType === 'timer') {
          this.subscription = interval(1000).subscribe(i => {
            this.output$.next(i);
          });
        }
        break;
        
      case NodeType.PROCESS:
        // Трансформація даних
        this.input$.subscribe(value => {
          try {
            const transform = this.data.transform || ((x) => x * 2);
            const result = transform(value);
            this.output$.next(result);
          } catch (e) {
            console.error('Transform error:', e);
          }
        });
        break;
        
      case NodeType.FILTER:
        // Фільтрація даних
        this.input$.pipe(
          filter(value => {
            const filterFn = this.data.filter || ((x) => x > 0);
            return filterFn(value);
          })
        ).subscribe(value => {
          this.output$.next(value);
        });
        break;
        
      case NodeType.OUTPUT:
        // Вивід даних
        this.input$.subscribe(value => {
          console.log(`Output ${this.id}:`, value);
          this.state$.next(value);
        });
        break;
        
      case NodeType.AUTOMATON:
        // Клітинний автомат
        this.input$.subscribe(value => {
          const currentState = this.state$.value;
          const newState = this.updateAutomatonState(currentState, value);
          this.state$.next(newState);
          this.output$.next(newState);
        });
        break;
        
      case NodeType.VISUALIZER:
        // Візуалізація даних
        this.values = [];
        this.input$.subscribe(value => {
          this.values.push(value);
          if (this.values.length > 50) {
            this.values.shift();
          }
          this.state$.next([...this.values]);
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
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.input$.complete();
    this.output$.complete();
    this.state$.complete();
  }
}

// Клас з'єднання
class Edge {
  constructor(id, sourceId, targetId) {
    this.id = id;
    this.sourceId = sourceId;
    this.targetId = targetId;
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

// React компонент Canvas OS
function CanvasOS() {
  const [nodes, setNodes] = React.useState(new Map());
  const [edges, setEdges] = React.useState(new Map());
  const [selectedNode, setSelectedNode] = React.useState(null);
  const [showEditor, setShowEditor] = React.useState(false);
  const [showInfo, setShowInfo] = React.useState(true);
  const [simulationRunning, setSimulationRunning] = React.useState(false);
  const [draggedNode, setDraggedNode] = React.useState(null);
  const [connectingFrom, setConnectingFrom] = React.useState(null);
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });
  
  const canvasRef = React.useRef(null);
  const nodesRef = React.useRef(nodes);
  const edgesRef = React.useRef(edges);
  
  React.useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);
  
  // Створення нового вузла
  const createNode = React.useCallback((type, position) => {
    const id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const node = new CanvasNode(id, type, position);
    
    if (type === NodeType.INPUT) {
      node.data.generatorType = 'timer';
    }
    
    setNodes(prev => {
      const newMap = new Map(prev);
      newMap.set(id, node);
      return newMap;
    });
    
    return id;
  }, []);
  
  // Створення з'єднання
  const createEdge = React.useCallback((sourceId, targetId) => {
    // Перевірка на існуюче з'єднання
    const existingEdge = Array.from(edgesRef.current.values()).find(
      edge => edge.sourceId === sourceId && edge.targetId === targetId
    );
    
    if (existingEdge) return;
    
    const id = `edge-${Date.now()}`;
    const edge = new Edge(id, sourceId, targetId);
    
    edge.connect(nodesRef.current);
    
    setEdges(prev => {
      const newMap = new Map(prev);
      newMap.set(id, edge);
      return newMap;
    });
  }, []);
  
  // Видалення вузла
  const deleteNode = React.useCallback((nodeId) => {
    const node = nodesRef.current.get(nodeId);
    if (node) {
      node.destroy();
      
      // Видалення з'єднань
      edgesRef.current.forEach((edge, edgeId) => {
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
      
      if (selectedNode === nodeId) {
        setSelectedNode(null);
      }
    }
  }, [selectedNode]);
  
  // Запуск/зупинка симуляції
  const toggleSimulation = React.useCallback(() => {
    setSimulationRunning(prev => !prev);
  }, []);
  
  // Обробка натискання на канву
  const handleCanvasClick = React.useCallback((e) => {
    if (e.target === canvasRef.current) {
      setSelectedNode(null);
      setConnectingFrom(null);
    }
  }, []);
  
  // Обробка подвійного кліку для створення вузла
  const handleCanvasDoubleClick = React.useCallback((e) => {
    if (e.target === canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left - 60,
        y: e.clientY - rect.top - 30
      };
      createNode(NodeType.PROCESS, position);
    }
  }, [createNode]);
  
  // Drag & Drop для вузлів
  const handleNodeMouseDown = React.useCallback((e, nodeId) => {
    e.stopPropagation();
    const node = nodesRef.current.get(nodeId);
    if (node) {
      const rect = canvasRef.current.getBoundingClientRect();
      setDraggedNode({
        id: nodeId,
        offsetX: e.clientX - rect.left - node.position.x,
        offsetY: e.clientY - rect.top - node.position.y
      });
    }
  }, []);
  
  const handleMouseMove = React.useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
    
    if (draggedNode) {
      const newX = x - draggedNode.offsetX;
      const newY = y - draggedNode.offsetY;
      
      setNodes(prev => {
        const newMap = new Map(prev);
        const node = newMap.get(draggedNode.id);
        if (node) {
          node.position = { x: newX, y: newY };
        }
        return newMap;
      });
    }
  }, [draggedNode]);
  
  const handleMouseUp = React.useCallback(() => {
    setDraggedNode(null);
  }, []);
  
  // З'єднання портів
  const handlePortClick = React.useCallback((e, nodeId, portType) => {
    e.stopPropagation();
    
    if (portType === 'output') {
      setConnectingFrom(nodeId);
    } else if (portType === 'input' && connectingFrom) {
      createEdge(connectingFrom, nodeId);
      setConnectingFrom(null);
    }
  }, [connectingFrom, createEdge]);
  
  // Оновлення коду вузла
  const updateNodeCode = React.useCallback((nodeId, code) => {
    try {
      // eslint-disable-next-line no-new-func
      const transform = new Function('x', code);
      
      setNodes(prev => {
        const newMap = new Map(prev);
        const node = newMap.get(nodeId);
        if (node) {
          node.data.transform = transform;
          // Переналаштування обробки
          node.setupProcessing();
        }
        return newMap;
      });
    } catch (e) {
      console.error('Invalid code:', e);
    }
  }, []);
  
  // Обчислення позицій портів
  const getPortPosition = (nodeId, portType) => {
    const node = nodes.get(nodeId);
    if (!node) return { x: 0, y: 0 };
    
    return {
      x: node.position.x + (portType === 'output' ? 120 : 0),
      y: node.position.y + 30
    };
  };
  
  // Створення елементів через React.createElement
  const h = React.createElement;
  
  // Рендер SVG для з'єднань
  const renderEdges = () => {
    const paths = [];
    
    edges.forEach((edge, id) => {
      const sourcePos = getPortPosition(edge.sourceId, 'output');
      const targetPos = getPortPosition(edge.targetId, 'input');
      
      const d = `M ${sourcePos.x} ${sourcePos.y} C ${sourcePos.x + 100} ${sourcePos.y}, ${targetPos.x - 100} ${targetPos.y}, ${targetPos.x} ${targetPos.y}`;
      
      paths.push(
        h('path', {
          key: id,
          d: d,
          className: `edge-path ${simulationRunning ? 'animated' : ''}`,
          fill: 'none',
          stroke: '#666',
          strokeWidth: 2,
          strokeDasharray: simulationRunning ? '5,5' : null
        })
      );
    });
    
    // Лінія з'єднання при drag
    if (connectingFrom) {
      const sourcePos = getPortPosition(connectingFrom, 'output');
      const d = `M ${sourcePos.x} ${sourcePos.y} L ${mousePos.x} ${mousePos.y}`;
      
      paths.push(
        h('path', {
          key: 'connecting',
          d: d,
          className: 'connection-line',
          fill: 'none',
          stroke: '#666',
          strokeWidth: 2,
          strokeDasharray: '5,5'
        })
      );
    }
    
    return paths;
  };
  
  return h('div', { style: { width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' } },
    // Toolbar
    h('div', { className: 'toolbar' },
      h('button', { onClick: () => createNode(NodeType.INPUT, { x: 100, y: 100 }) }, '+ Input'),
      h('button', { onClick: () => createNode(NodeType.PROCESS, { x: 300, y: 100 }) }, '+ Process'),
      h('button', { onClick: () => createNode(NodeType.FILTER, { x: 300, y: 200 }) }, '+ Filter'),
      h('button', { onClick: () => createNode(NodeType.OUTPUT, { x: 500, y: 100 }) }, '+ Output'),
      h('button', { onClick: () => createNode(NodeType.VISUALIZER, { x: 500, y: 200 }) }, '+ Visualizer'),
      h('div', { style: { borderLeft: '1px solid #555', height: 24, margin: '0 8px' } }),
      h('button', { onClick: toggleSimulation }, simulationRunning ? '⏸ Pause' : '▶ Run'),
      h('button', { onClick: () => setShowEditor(!showEditor) }, '📝 Editor'),
      h('button', { onClick: () => setShowInfo(!showInfo) }, 'ℹ️ Info'),
      h('div', { style: { borderLeft: '1px solid #555', height: 24, margin: '0 8px' } }),
      h('button', { 
        onClick: () => {
          nodes.forEach(node => node.destroy());
          edges.forEach(edge => edge.disconnect());
          setNodes(new Map());
          setEdges(new Map());
          setSelectedNode(null);
        }
      }, '🗑️ Clear')
    ),
    
    // Main container
    h('div', { className: 'main-container' },
      // Canvas
      h('div', {
        ref: canvasRef,
        className: 'canvas-container',
        onClick: handleCanvasClick,
        onDoubleClick: handleCanvasDoubleClick,
        onMouseMove: handleMouseMove,
        onMouseUp: handleMouseUp
      },
        // SVG для з'єднань
        h('svg', { 
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1
          }
        }, renderEdges()),
        
        // Вузли
        Array.from(nodes.values()).map(node =>
          h('div', {
            key: node.id,
            className: `node ${selectedNode === node.id ? 'selected' : ''}`,
            style: {
              position: 'absolute',
              left: node.position.x,
              top: node.position.y,
              width: 120,
              height: 60,
              background: NodeColors[node.type],
              border: selectedNode === node.id ? '2px solid #fff' : '1px solid #333',
              borderRadius: 8,
              padding: 8,
              cursor: 'move',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              zIndex: draggedNode?.id === node.id ? 1000 : 10
            },
            onMouseDown: (e) => handleNodeMouseDown(e, node.id),
            onClick: (e) => {
              e.stopPropagation();
              setSelectedNode(node.id);
            },
            onDoubleClick: (e) => {
              e.stopPropagation();
              if (window.confirm('Delete this node?')) {
                deleteNode(node.id);
              }
            }
          },
            h('div', {}, node.type.toUpperCase()),
            h('div', { style: { fontSize: 11, opacity: 0.8 } }, node.id.slice(0, 8)),
            
            // Порти
            node.type !== NodeType.INPUT && h('div', {
              className: 'node-port input',
              style: {
                position: 'absolute',
                width: 12,
                height: 12,
                background: '#666',
                border: '2px solid #333',
                borderRadius: '50%',
                cursor: 'crosshair',
                left: -6,
                top: '50%',
                transform: 'translateY(-50%)'
              },
              onClick: (e) => handlePortClick(e, node.id, 'input')
            }),
            
            node.type !== NodeType.OUTPUT && h('div', {
              className: 'node-port output',
              style: {
                position: 'absolute',
                width: 12,
                height: 12,
                background: '#666',
                border: '2px solid #333',
                borderRadius: '50%',
                cursor: 'crosshair',
                right: -6,
                top: '50%',
                transform: 'translateY(-50%)'
              },
              onClick: (e) => handlePortClick(e, node.id, 'output')
            }),
            
            // Візуалізація для OUTPUT
            node.type === NodeType.OUTPUT && node.state$.value !== null && h('div', {
              style: {
                position: 'absolute',
                top: -20,
                right: 0,
                background: 'rgba(0,0,0,0.8)',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 11
              }
            }, typeof node.state$.value === 'number' ? 
              node.state$.value.toFixed(2) : 
              String(node.state$.value))
          )
        ),
        
        // Info Panel
        showInfo && h('div', { 
          style: {
            position: 'absolute',
            left: 20,
            top: 20,
            background: 'rgba(42, 42, 42, 0.9)',
            border: '1px solid #444',
            borderRadius: 8,
            padding: 16,
            maxWidth: 300
          }
        },
          h('h3', { style: { marginBottom: 12, color: '#fff' } }, '🎯 Canvas OS MVP'),
          h('p', { style: { marginBottom: 8, fontSize: 13, color: '#ccc', lineHeight: 1.5 } }, 
            h('strong', {}, 'Створення вузлів:'), ' Використовуйте кнопки на панелі або подвійний клік на канві'),
          h('p', { style: { marginBottom: 8, fontSize: 13, color: '#ccc', lineHeight: 1.5 } }, 
            h('strong', {}, 'З\'єднання:'), ' Клікніть на вихідний порт (справа), потім на вхідний (зліва)'),
          h('p', { style: { marginBottom: 8, fontSize: 13, color: '#ccc', lineHeight: 1.5 } }, 
            h('strong', {}, 'Переміщення:'), ' Перетягуйте вузли мишкою'),
          h('p', { style: { marginBottom: 8, fontSize: 13, color: '#ccc', lineHeight: 1.5 } }, 
            h('strong', {}, 'Видалення:'), ' Подвійний клік на вузол'),
          h('p', { style: { marginBottom: 8, fontSize: 13, color: '#ccc', lineHeight: 1.5 } }, 
            h('strong', {}, 'Редагування:'), ' Виберіть вузол і відкрийте Editor'),
          h('p', { style: { marginBottom: 8, fontSize: 13, color: '#ccc', lineHeight: 1.5 } }, 
            h('strong', {}, 'Запуск:'), ' Натисніть Run для початку симуляції')
        ),
        
        // Editor Panel
        h('div', {
          className: `editor-panel ${showEditor && selectedNode ? 'active' : ''}`,
          style: showEditor && selectedNode ? { display: 'flex' } : { display: 'none' }
        },
          h('div', { className: 'editor-header' },
            h('span', {}, 'Node Editor'),
            h('button', { 
              onClick: () => setShowEditor(false),
              style: { 
                background: 'transparent', 
                border: 'none', 
                color: '#999',
                cursor: 'pointer'
              }
            }, '✕')
          ),
          h('div', { className: 'editor-content', style: { padding: 16 } },
            selectedNode && nodes.get(selectedNode) && h('div', {},
              h('div', { style: { marginBottom: 16 } },
                h('label', { style: { display: 'block', marginBottom: 4, fontSize: 12, color: '#aaa' } }, 'Node ID'),
                h('input', { 
                  type: 'text', 
                  value: selectedNode, 
                  readOnly: true,
                  style: {
                    width: '100%',
                    background: '#1a1a1a',
                    color: '#fff',
                    border: '1px solid #444',
                    borderRadius: 4,
                    padding: 8
                  }
                })
              ),
              h('div', { style: { marginBottom: 16 } },
                h('label', { style: { display: 'block', marginBottom: 4, fontSize: 12, color: '#aaa' } }, 'Type'),
                h('input', { 
                  type: 'text', 
                  value: nodes.get(selectedNode).type, 
                  readOnly: true,
                  style: {
                    width: '100%',
                    background: '#1a1a1a',
                    color: '#fff',
                    border: '1px solid #444',
                    borderRadius: 4,
                    padding: 8
                  }
                })
              ),
              nodes.get(selectedNode).type === NodeType.PROCESS && h('div', { style: { marginBottom: 16 } },
                h('label', { style: { display: 'block', marginBottom: 4, fontSize: 12, color: '#aaa' } }, 'Transform Function'),
                h('textarea', {
                  defaultValue: 'return x * 2;',
                  onChange: (e) => updateNodeCode(selectedNode, e.target.value),
                  placeholder: '// JavaScript code\n// Input: x\n// Example: return x * 2;',
                  style: {
                    width: '100%',
                    background: '#1a1a1a',
                    color: '#fff',
                    border: '1px solid #444',
                    borderRadius: 4,
                    padding: 8,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    minHeight: 120
                  }
                })
              )
            )
          )
        )
      )
    ),
    
    // Status Bar
    h('div', { className: 'status-bar' },
      h('span', {}, `Nodes: ${nodes.size}`),
      h('span', { style: { marginLeft: 16 } }, `Edges: ${edges.size}`),
      h('span', { style: { marginLeft: 16 } }, `Status: ${simulationRunning ? '🟢 Running' : '⚪ Stopped'}`),
      connectingFrom && h('span', { style: { marginLeft: 16 } }, `Connecting from: ${connectingFrom}`)
    )
  );
}

// Worker Manager
class WorkerManager {
  constructor() {
    this.workers = new Map();
  }
  
  createWorker(id, code) {
    try {
      const blob = new Blob([code], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);
      
      this.workers.set(id, {
        worker,
        url: workerUrl,
        handlers: new Map()
      });
      
      worker.addEventListener('message', (event) => {
        const workerData = this.workers.get(id);
        if (workerData) {
          const handler = workerData.handlers.get(event.data.type);
          if (handler) {
            handler(event.data);
          }
        }
      });
      
      worker.addEventListener('error', (error) => {
        console.error(`Worker ${id} error:`, error);
      });
      
      return worker;
    } catch (error) {
      console.error('Failed to create worker:', error);
      return null;
    }
  }
  
  sendMessage(id, message) {
    const workerData = this.workers.get(id);
    if (workerData) {
      workerData.worker.postMessage(message);
    }
  }
  
  onMessage(id, type, handler) {
    const workerData = this.workers.get(id);
    if (workerData) {
      workerData.handlers.set(type, handler);
    }
  }
  
  terminateWorker(id) {
    const workerData = this.workers.get(id);
    if (workerData) {
      workerData.worker.terminate();
      URL.revokeObjectURL(workerData.url);
      this.workers.delete(id);
    }
  }
  
  terminateAll() {
    this.workers.forEach((_, id) => {
      this.terminateWorker(id);
    });
  }
}

// Створюємо глобальний інстанс
window.workerManager = new WorkerManager();

// Запускаємо додаток
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(CanvasOS));

// Глобальний обробник помилок
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

// Обробка unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Налаштування гарячих клавіш
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + S - зберегти граф
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    console.log('Save graph');
    // Тут буде виклик canvasAPI.saveGraph()
  }
  
  // Ctrl/Cmd + O - відкрити граф
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
    e.preventDefault();
    console.log('Open graph');
    // Тут буде виклик canvasAPI.loadGraph()
  }
});

console.log('Canvas OS MVP loaded successfully');