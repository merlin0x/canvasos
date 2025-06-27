// src/shared/types.js
// Спільні типи та інтерфейси Canvas OS

// === Основні типи ===

// Типи вузлів
export const NodeTypeEnum = {
  INPUT: 'input',
  PROCESS: 'process',
  OUTPUT: 'output',
  FILTER: 'filter',
  VISUALIZER: 'visualizer',
  AUTOMATON: 'automaton',
  LLM: 'llm',
  FILE: 'file',
  COMPOSITE: 'composite',
  CUSTOM: 'custom'
};

// Типи з'єднань
export const EdgeTypeEnum = {
  DATA: 'data',
  CONTROL: 'control',
  REFERENCE: 'reference',
  BROADCAST: 'broadcast'
};

// Типи портів
export const PortTypeEnum = {
  INPUT: 'input',
  OUTPUT: 'output',
  BIDIRECTIONAL: 'bidirectional'
};

// Типи даних
export const DataTypeEnum = {
  ANY: 'any',
  NUMBER: 'number',
  STRING: 'string',
  BOOLEAN: 'boolean',
  ARRAY: 'array',
  OBJECT: 'object',
  FUNCTION: 'function',
  DATE: 'date',
  REGEX: 'regex',
  BUFFER: 'buffer',
  STREAM: 'stream',
  ERROR: 'error',
  NULL: 'null',
  UNDEFINED: 'undefined'
};

// Статуси вузлів
export const NodeStatusEnum = {
  IDLE: 'idle',
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  PAUSED: 'paused',
  STOPPED: 'stopped'
};

// Типи подій
export const EventTypeEnum = {
  // Node events
  NODE_CREATED: 'nodeCreated',
  NODE_UPDATED: 'nodeUpdated',
  NODE_DELETED: 'nodeDeleted',
  NODE_SELECTED: 'nodeSelected',
  NODE_MOVED: 'nodePositionChanged',
  NODE_EXECUTED: 'nodeExecuted',
  NODE_ERROR: 'nodeError',
  
  // Edge events
  EDGE_CREATED: 'edgeCreated',
  EDGE_UPDATED: 'edgeUpdated',
  EDGE_DELETED: 'edgeDeleted',
  EDGE_SELECTED: 'edgeSelected',
  
  // Graph events
  GRAPH_LOADED: 'graphLoaded',
  GRAPH_SAVED: 'graphSaved',
  GRAPH_CLEARED: 'graphCleared',
  GRAPH_CHANGED: 'graphChanged',
  
  // Simulation events
  SIMULATION_STARTED: 'simulationStarted',
  SIMULATION_STOPPED: 'simulationStopped',
  SIMULATION_PAUSED: 'simulationPaused',
  SIMULATION_STEP: 'simulationStep',
  
  // UI events
  SELECTION_CHANGED: 'selectionChanged',
  VIEWPORT_CHANGED: 'viewportChanged',
  TOOL_CHANGED: 'toolChanged',
  
  // Worker events
  WORKER_CREATED: 'workerCreated',
  WORKER_TERMINATED: 'workerTerminated',
  WORKER_ERROR: 'workerError',
  
  // Task events
  TASK_QUEUED: 'taskQueued',
  TASK_STARTED: 'taskStarted',
  TASK_COMPLETED: 'taskCompleted',
  TASK_FAILED: 'taskFailed',
  TASK_CANCELLED: 'taskCancelled'
};

// Режими інструментів
export const ToolModeEnum = {
  SELECT: 'select',
  MOVE: 'move',
  PAN: 'pan',
  ZOOM: 'zoom',
  CONNECT: 'connect',
  DELETE: 'delete',
  COMMENT: 'comment'
};

// === Структури даних ===

// Позиція
export class Position {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  
  clone() {
    return new Position(this.x, this.y);
  }
  
  add(other) {
    return new Position(this.x + other.x, this.y + other.y);
  }
  
  subtract(other) {
    return new Position(this.x - other.x, this.y - other.y);
  }
  
  multiply(scalar) {
    return new Position(this.x * scalar, this.y * scalar);
  }
  
  distance(other) {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

// Розміри
export class Dimensions {
  constructor(width = 100, height = 100) {
    this.width = width;
    this.height = height;
  }
  
  clone() {
    return new Dimensions(this.width, this.height);
  }
  
  area() {
    return this.width * this.height;
  }
}

// Прямокутник
export class Rectangle {
  constructor(x = 0, y = 0, width = 100, height = 100) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
  
  get left() { return this.x; }
  get top() { return this.y; }
  get right() { return this.x + this.width; }
  get bottom() { return this.y + this.height; }
  
  get center() {
    return new Position(
      this.x + this.width / 2,
      this.y + this.height / 2
    );
  }
  
  contains(point) {
    return point.x >= this.x && 
           point.x <= this.x + this.width &&
           point.y >= this.y && 
           point.y <= this.y + this.height;
  }
  
  intersects(other) {
    return !(this.right < other.left ||
             other.right < this.left ||
             this.bottom < other.top ||
             other.bottom < this.top);
  }
  
  union(other) {
    const x = Math.min(this.x, other.x);
    const y = Math.min(this.y, other.y);
    const right = Math.max(this.right, other.right);
    const bottom = Math.max(this.bottom, other.bottom);
    
    return new Rectangle(x, y, right - x, bottom - y);
  }
  
  clone() {
    return new Rectangle(this.x, this.y, this.width, this.height);
  }
}

// Колір
export class Color {
  constructor(r = 0, g = 0, b = 0, a = 1) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }
  
  static fromHex(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? new Color(
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ) : null;
  }
  
  toHex() {
    return '#' + [this.r, this.g, this.b]
      .map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('');
  }
  
  toRgba() {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
  }
  
  clone() {
    return new Color(this.r, this.g, this.b, this.a);
  }
}

// === Інтерфейси вузлів ===

// Базовий інтерфейс вузла
export class NodeInterface {
  constructor(config = {}) {
    this.id = config.id || null;
    this.type = config.type || NodeTypeEnum.PROCESS;
    this.position = config.position || new Position();
    this.dimensions = config.dimensions || new Dimensions(140, 80);
    this.data = config.data || {};
    this.metadata = config.metadata || {};
    this.ports = config.ports || {
      input: [],
      output: []
    };
    this.state = config.state || {};
    this.status = config.status || NodeStatusEnum.IDLE;
  }
}

// Інтерфейс порта
export class PortInterface {
  constructor(config = {}) {
    this.id = config.id || null;
    this.name = config.name || 'port';
    this.type = config.type || PortTypeEnum.INPUT;
    this.dataType = config.dataType || DataTypeEnum.ANY;
    this.multiple = config.multiple || false;
    this.required = config.required || false;
    this.connected = config.connected || false;
    this.connections = config.connections || [];
  }
}

// Інтерфейс з'єднання
export class EdgeInterface {
  constructor(config = {}) {
    this.id = config.id || null;
    this.type = config.type || EdgeTypeEnum.DATA;
    this.sourceId = config.sourceId || null;
    this.targetId = config.targetId || null;
    this.sourcePort = config.sourcePort || 'output';
    this.targetPort = config.targetPort || 'input';
    this.options = config.options || {};
    this.metadata = config.metadata || {};
  }
}

// === Інтерфейси даних ===

// Повідомлення між вузлами
export class Message {
  constructor(data, metadata = {}) {
    this.id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = Date.now();
    this.data = data;
    this.metadata = metadata;
    this.source = metadata.source || null;
    this.target = metadata.target || null;
    this.type = metadata.type || 'data';
    this.priority = metadata.priority || 0;
  }
}

// Подія системи
export class SystemEvent {
  constructor(type, data = {}, source = null) {
    this.id = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.data = data;
    this.source = source;
    this.timestamp = Date.now();
  }
}

// Результат виконання
export class ExecutionResult {
  constructor(success = true, value = null, error = null) {
    this.success = success;
    this.value = value;
    this.error = error;
    this.timestamp = Date.now();
    this.duration = 0;
  }
  
  static success(value) {
    return new ExecutionResult(true, value, null);
  }
  
  static error(error) {
    return new ExecutionResult(false, null, error);
  }
}

// === Валідатори типів ===

export const TypeValidators = {
  isNumber: (value) => typeof value === 'number' && !isNaN(value),
  isString: (value) => typeof value === 'string',
  isBoolean: (value) => typeof value === 'boolean',
  isArray: (value) => Array.isArray(value),
  isObject: (value) => value !== null && typeof value === 'object' && !Array.isArray(value),
  isFunction: (value) => typeof value === 'function',
  isDate: (value) => value instanceof Date,
  isRegex: (value) => value instanceof RegExp,
  isNull: (value) => value === null,
  isUndefined: (value) => value === undefined,
  
  // Комплексні валідатори
  isNodeType: (type) => Object.values(NodeTypeEnum).includes(type),
  isEdgeType: (type) => Object.values(EdgeTypeEnum).includes(type),
  isPortType: (type) => Object.values(PortTypeEnum).includes(type),
  isDataType: (type) => Object.values(DataTypeEnum).includes(type),
  
  // Валідація структур
  isValidPosition: (pos) => pos && TypeValidators.isNumber(pos.x) && TypeValidators.isNumber(pos.y),
  isValidDimensions: (dim) => dim && TypeValidators.isNumber(dim.width) && TypeValidators.isNumber(dim.height) && dim.width > 0 && dim.height > 0,
  isValidRectangle: (rect) => rect && TypeValidators.isValidPosition(rect) && TypeValidators.isValidDimensions(rect),
  isValidColor: (color) => color && TypeValidators.isNumber(color.r) && TypeValidators.isNumber(color.g) && TypeValidators.isNumber(color.b),
  
  // Валідація ID
  isValidId: (id) => TypeValidators.isString(id) && id.length > 0 && /^[a-zA-Z0-9_-]+$/.test(id)
};

// === Перетворювачі типів ===

export const TypeConverters = {
  // Базові перетворення
  toString: (value) => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  },
  
  toNumber: (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value);
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (value instanceof Date) return value.getTime();
    return NaN;
  },
  
  toBoolean: (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    if (value === null || value === undefined) return false;
    return !!value;
  },
  
  toArray: (value) => {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return [];
    return [value];
  },
  
  toObject: (value) => {
    if (TypeValidators.isObject(value)) return value;
    if (Array.isArray(value)) return { ...value };
    return { value };
  },
  
  // Перетворення структур
  positionFromObject: (obj) => {
    if (obj instanceof Position) return obj;
    return new Position(obj.x || 0, obj.y || 0);
  },
  
  dimensionsFromObject: (obj) => {
    if (obj instanceof Dimensions) return obj;
    return new Dimensions(obj.width || 100, obj.height || 100);
  },
  
  rectangleFromObject: (obj) => {
    if (obj instanceof Rectangle) return obj;
    return new Rectangle(obj.x || 0, obj.y || 0, obj.width || 100, obj.height || 100);
  },
  
  colorFromString: (str) => {
    if (str.startsWith('#')) return Color.fromHex(str);
    if (str.startsWith('rgb')) {
      const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match) {
        return new Color(
          parseInt(match[1]),
          parseInt(match[2]),
          parseInt(match[3]),
          parseFloat(match[4] || '1')
        );
      }
    }
    return new Color();
  }
};

// === Утиліти для типів ===

export const TypeUtils = {
  // Глибоке клонування
  deepClone: (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => TypeUtils.deepClone(item));
    if (obj instanceof RegExp) return new RegExp(obj);
    
    const cloned = Object.create(Object.getPrototypeOf(obj));
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = TypeUtils.deepClone(obj[key]);
      }
    }
    return cloned;
  },
  
  // Злиття об'єктів
  deepMerge: (target, ...sources) => {
    if (!sources.length) return target;
    const source = sources.shift();
    
    if (TypeValidators.isObject(target) && TypeValidators.isObject(source)) {
      for (const key in source) {
        if (TypeValidators.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          TypeUtils.deepMerge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }
    
    return TypeUtils.deepMerge(target, ...sources);
  },
  
  // Порівняння об'єктів
  deepEqual: (a, b) => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.constructor !== b.constructor) return false;
    
    if (a instanceof Date) return a.getTime() === b.getTime();
    if (a instanceof RegExp) return a.toString() === b.toString();
    
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!TypeUtils.deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    
    if (typeof a === 'object') {
      const keys = Object.keys(a);
      if (keys.length !== Object.keys(b).length) return false;
      for (const key of keys) {
        if (!TypeUtils.deepEqual(a[key], b[key])) return false;
      }
      return true;
    }
    
    return false;
  },
  
  // Визначення типу даних
  getDataType: (value) => {
    if (value === null) return DataTypeEnum.NULL;
    if (value === undefined) return DataTypeEnum.UNDEFINED;
    if (typeof value === 'number') return DataTypeEnum.NUMBER;
    if (typeof value === 'string') return DataTypeEnum.STRING;
    if (typeof value === 'boolean') return DataTypeEnum.BOOLEAN;
    if (typeof value === 'function') return DataTypeEnum.FUNCTION;
    if (Array.isArray(value)) return DataTypeEnum.ARRAY;
    if (value instanceof Date) return DataTypeEnum.DATE;
    if (value instanceof RegExp) return DataTypeEnum.REGEX;
    if (value instanceof Error) return DataTypeEnum.ERROR;
    if (typeof value === 'object') return DataTypeEnum.OBJECT;
    return DataTypeEnum.ANY;
  },
  
  // Перевірка сумісності типів
  isCompatibleType: (value, expectedType) => {
    if (expectedType === DataTypeEnum.ANY) return true;
    const actualType = TypeUtils.getDataType(value);
    return actualType === expectedType;
  }
};

// === Константи ===

export const Constants = {
  // Обмеження
  MAX_NODE_NAME_LENGTH: 50,
  MAX_NODE_DESCRIPTION_LENGTH: 200,
  MAX_PORT_NAME_LENGTH: 30,
  MAX_MESSAGE_SIZE: 1024 * 1024, // 1MB
  MAX_UNDO_HISTORY: 100,
  
  // Таймаути
  DEFAULT_EXECUTION_TIMEOUT: 30000, // 30 секунд
  DEFAULT_CONNECTION_TIMEOUT: 5000, // 5 секунд
  DEFAULT_IDLE_TIMEOUT: 60000, // 1 хвилина
  
  // Інтервали
  DEFAULT_SIMULATION_INTERVAL: 100, // 100мс
  DEFAULT_AUTOSAVE_INTERVAL: 30000, // 30 секунд
  DEFAULT_CLEANUP_INTERVAL: 60000, // 1 хвилина
  
  // Розміри
  DEFAULT_NODE_WIDTH: 140,
  DEFAULT_NODE_HEIGHT: 80,
  DEFAULT_PORT_SIZE: 12,
  DEFAULT_GRID_SIZE: 20,
  
  // Кольори за замовчуванням
  DEFAULT_NODE_COLOR: '#2196F3',
  DEFAULT_EDGE_COLOR: '#666666',
  DEFAULT_SELECTION_COLOR: '#FFFFFF',
  DEFAULT_ERROR_COLOR: '#F44336',
  DEFAULT_SUCCESS_COLOR: '#4CAF50',
  DEFAULT_WARNING_COLOR: '#FF9800'
};

// Експорт всього як окремих констант для зручності
export const {
  NODE_INPUT,
  NODE_PROCESS,
  NODE_OUTPUT,
  NODE_FILTER,
  NODE_VISUALIZER,
  NODE_AUTOMATON
} = NodeTypeEnum;

export const {
  EDGE_DATA,
  EDGE_CONTROL,
  EDGE_REFERENCE,
  EDGE_BROADCAST
} = EdgeTypeEnum;

export const {
  PORT_INPUT,
  PORT_OUTPUT,
  PORT_BIDIRECTIONAL
} = PortTypeEnum;

export const {
  DATA_ANY,
  DATA_NUMBER,
  DATA_STRING,
  DATA_BOOLEAN,
  DATA_ARRAY,
  DATA_OBJECT
} = DataTypeEnum;