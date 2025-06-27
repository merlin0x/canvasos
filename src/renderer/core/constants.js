// src/renderer/core/constants.js
// Константи та конфігурація Canvas OS

// Типи вузлів
export const NodeType = {
  INPUT: 'input',
  PROCESS: 'process',
  OUTPUT: 'output',
  AUTOMATON: 'automaton',
  FILTER: 'filter',
  VISUALIZER: 'visualizer',
  LLM: 'llm',
  FILE: 'file',
  COMPOSITE: 'composite'
};

// Кольори для типів вузлів
export const NodeColors = {
  [NodeType.INPUT]: '#4CAF50',
  [NodeType.PROCESS]: '#2196F3',
  [NodeType.OUTPUT]: '#FF9800',
  [NodeType.AUTOMATON]: '#9C27B0',
  [NodeType.FILTER]: '#00BCD4',
  [NodeType.VISUALIZER]: '#E91E63',
  [NodeType.LLM]: '#795548',
  [NodeType.FILE]: '#607D8B',
  [NodeType.COMPOSITE]: '#9E9E9E'
};

// Розміри вузлів
export const NodeDimensions = {
  DEFAULT: { width: 140, height: 80 },
  VISUALIZER: { width: 200, height: 120 },
  AUTOMATON: { width: 180, height: 100 },
  COMPACT: { width: 100, height: 60 }
};

// Параметри канви
export const CanvasConfig = {
  WIDTH: 5000,
  HEIGHT: 5000,
  GRID_SIZE: 20,
  GRID_COLOR: '#333',
  BACKGROUND_COLOR: '#1a1a1a',
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 3,
  DEFAULT_ZOOM: 1
};

// Параметри з'єднань
export const EdgeConfig = {
  STROKE_WIDTH: 2,
  STROKE_COLOR: '#666',
  STROKE_COLOR_ACTIVE: '#2196F3',
  CURVE_OFFSET: 100,
  ARROW_SIZE: 8
};

// Параметри портів
export const PortConfig = {
  SIZE: 12,
  COLOR: '#666',
  COLOR_HOVER: '#888',
  BORDER_COLOR: '#333',
  BORDER_COLOR_HOVER: '#fff'
};

// Параметри анімації
export const AnimationConfig = {
  NODE_TRANSITION: 200,
  EDGE_DASH_SPEED: 500,
  PORT_HOVER_SCALE: 1.2,
  DRAG_THRESHOLD: 3
};

// Параметри симуляції
export const SimulationConfig = {
  DEFAULT_INTERVAL: 1000,
  MIN_INTERVAL: 50,
  MAX_INTERVAL: 5000,
  BATCH_SIZE: 100,
  MAX_HISTORY: 1000
};

// Гарячі клавіші
export const Hotkeys = {
  SAVE: 'ctrl+s,cmd+s',
  OPEN: 'ctrl+o,cmd+o',
  DELETE: 'delete,backspace',
  COPY: 'ctrl+c,cmd+c',
  PASTE: 'ctrl+v,cmd+v',
  UNDO: 'ctrl+z,cmd+z',
  REDO: 'ctrl+shift+z,cmd+shift+z',
  SELECT_ALL: 'ctrl+a,cmd+a',
  ZOOM_IN: 'ctrl+=,cmd+=',
  ZOOM_OUT: 'ctrl+-,cmd+-',
  ZOOM_RESET: 'ctrl+0,cmd+0'
};

// Обмеження
export const Limits = {
  MAX_NODES: 10000,
  MAX_EDGES: 20000,
  MAX_UNDO_HISTORY: 100,
  MAX_WORKER_THREADS: navigator.hardwareConcurrency || 4,
  MAX_FILE_SIZE: 50 * 1024 * 1024 // 50MB
};

// Повідомлення
export const Messages = {
  DELETE_CONFIRM: 'Видалити цей вузол?',
  CLEAR_CONFIRM: 'Очистити всю канву?',
  SAVE_SUCCESS: 'Граф збережено успішно',
  SAVE_ERROR: 'Помилка збереження графа',
  LOAD_SUCCESS: 'Граф завантажено успішно',
  LOAD_ERROR: 'Помилка завантаження графа',
  INVALID_CONNECTION: 'Неможливо створити з\'єднання',
  MAX_NODES_REACHED: `Досягнуто максимальну кількість вузлів (${Limits.MAX_NODES})`
};