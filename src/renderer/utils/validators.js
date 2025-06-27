// src/renderer/utils/validators.js
// Утиліти для валідації даних Canvas OS

import { NodeType, Limits } from '@core/constants.js';

// === Валідатори типів ===

// Перевірка типу вузла
export function isValidNodeType(type) {
  return Object.values(NodeType).includes(type);
}

// Перевірка числа
export function isNumber(value) {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

// Перевірка цілого числа
export function isInteger(value) {
  return isNumber(value) && Number.isInteger(value);
}

// Перевірка додатного числа
export function isPositiveNumber(value) {
  return isNumber(value) && value > 0;
}

// Перевірка числа в діапазоні
export function isInRange(value, min, max) {
  return isNumber(value) && value >= min && value <= max;
}

// Перевірка рядка
export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// Перевірка булевого значення
export function isBoolean(value) {
  return typeof value === 'boolean';
}

// Перевірка масиву
export function isArray(value) {
  return Array.isArray(value);
}

// Перевірка об'єкта
export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Перевірка функції
export function isFunction(value) {
  return typeof value === 'function';
}

// Перевірка дати
export function isDate(value) {
  return value instanceof Date && !isNaN(value);
}

// Перевірка валідного ID
export function isValidId(id) {
  return isNonEmptyString(id) && /^[a-zA-Z0-9_-]+$/.test(id);
}

// === Валідатори структур ===

// Валідація позиції
export function validatePosition(position) {
  const errors = [];
  
  if (!isObject(position)) {
    errors.push('Position must be an object');
    return errors;
  }
  
  if (!isNumber(position.x)) {
    errors.push('Position.x must be a number');
  } else if (position.x < 0 || position.x > Limits.MAX_CANVAS_SIZE) {
    errors.push(`Position.x must be between 0 and ${Limits.MAX_CANVAS_SIZE}`);
  }
  
  if (!isNumber(position.y)) {
    errors.push('Position.y must be a number');
  } else if (position.y < 0 || position.y > Limits.MAX_CANVAS_SIZE) {
    errors.push(`Position.y must be between 0 and ${Limits.MAX_CANVAS_SIZE}`);
  }
  
  return errors;
}

// Валідація розмірів
export function validateDimensions(dimensions) {
  const errors = [];
  
  if (!isObject(dimensions)) {
    errors.push('Dimensions must be an object');
    return errors;
  }
  
  if (!isPositiveNumber(dimensions.width)) {
    errors.push('Width must be a positive number');
  }
  
  if (!isPositiveNumber(dimensions.height)) {
    errors.push('Height must be a positive number');
  }
  
  return errors;
}

// Валідація вузла
export function validateNode(node) {
  const errors = [];
  
  if (!isObject(node)) {
    errors.push('Node must be an object');
    return errors;
  }
  
  // ID
  if (!isValidId(node.id)) {
    errors.push('Invalid node ID');
  }
  
  // Тип
  if (!isValidNodeType(node.type)) {
    errors.push(`Invalid node type: ${node.type}`);
  }
  
  // Позиція
  const positionErrors = validatePosition(node.position);
  errors.push(...positionErrors);
  
  // Дані (залежно від типу)
  if (node.data) {
    const dataErrors = validateNodeData(node.type, node.data);
    errors.push(...dataErrors);
  }
  
  return errors;
}

// Валідація даних вузла
export function validateNodeData(nodeType, data) {
  const errors = [];
  
  if (!isObject(data)) {
    errors.push('Node data must be an object');
    return errors;
  }
  
  switch (nodeType) {
    case NodeType.INPUT:
      if (data.inputType && !['manual', 'timer', 'random', 'sine', 'noise', 'mouse', 'keyboard', 'time', 'sequence'].includes(data.inputType)) {
        errors.push('Invalid input type');
      }
      if (data.interval !== undefined && !isPositiveNumber(data.interval)) {
        errors.push('Interval must be a positive number');
      }
      break;
      
    case NodeType.PROCESS:
      if (data.code !== undefined && !isNonEmptyString(data.code)) {
        errors.push('Process code must be a non-empty string');
      }
      if (data.async !== undefined && !isBoolean(data.async)) {
        errors.push('Async flag must be a boolean');
      }
      if (data.timeout !== undefined && !isPositiveNumber(data.timeout)) {
        errors.push('Timeout must be a positive number');
      }
      break;
      
    case NodeType.FILTER:
      if (data.filterType && !['pass', 'block', 'range', 'condition', 'custom', 'type', 'pattern', 'unique'].includes(data.filterType)) {
        errors.push('Invalid filter type');
      }
      if (data.min !== undefined && !isNumber(data.min)) {
        errors.push('Min value must be a number');
      }
      if (data.max !== undefined && !isNumber(data.max)) {
        errors.push('Max value must be a number');
      }
      if (data.min !== undefined && data.max !== undefined && data.min > data.max) {
        errors.push('Min value must be less than or equal to max value');
      }
      break;
      
    case NodeType.VISUALIZER:
      if (data.visualType && !['bars', 'line', 'scatter', 'heatmap', 'text'].includes(data.visualType)) {
        errors.push('Invalid visualization type');
      }
      if (data.maxValues !== undefined && !isPositiveNumber(data.maxValues)) {
        errors.push('Max values must be a positive number');
      }
      if (data.color !== undefined && !isValidColor(data.color)) {
        errors.push('Invalid color format');
      }
      break;
      
    case NodeType.AUTOMATON:
      if (data.automatonType && !['elementary', 'life', 'custom'].includes(data.automatonType)) {
        errors.push('Invalid automaton type');
      }
      if (data.rule !== undefined && (!isInteger(data.rule) || data.rule < 0 || data.rule > 255)) {
        errors.push('Rule must be an integer between 0 and 255');
      }
      if (data.width !== undefined && !isPositiveNumber(data.width)) {
        errors.push('Width must be a positive number');
      }
      if (data.height !== undefined && !isPositiveNumber(data.height)) {
        errors.push('Height must be a positive number');
      }
      break;
      
    case NodeType.OUTPUT:
      if (data.outputType && !['console', 'file', 'clipboard', 'notification', 'custom'].includes(data.outputType)) {
        errors.push('Invalid output type');
      }
      if (data.format && !['json', 'text', 'csv', 'xml', 'yaml', 'html', 'binary'].includes(data.format)) {
        errors.push('Invalid format');
      }
      break;
  }
  
  return errors;
}

// Валідація з'єднання
export function validateEdge(edge, nodes) {
  const errors = [];
  
  if (!isObject(edge)) {
    errors.push('Edge must be an object');
    return errors;
  }
  
  // ID
  if (!isValidId(edge.id)) {
    errors.push('Invalid edge ID');
  }
  
  // Source/Target
  if (!isValidId(edge.sourceId)) {
    errors.push('Invalid source ID');
  } else if (nodes && !nodes.has(edge.sourceId)) {
    errors.push('Source node does not exist');
  }
  
  if (!isValidId(edge.targetId)) {
    errors.push('Invalid target ID');
  } else if (nodes && !nodes.has(edge.targetId)) {
    errors.push('Target node does not exist');
  }
  
  // Не можна з'єднати вузол сам з собою
  if (edge.sourceId === edge.targetId) {
    errors.push('Cannot connect node to itself');
  }
  
  // Опції
  if (edge.options) {
    const optionErrors = validateEdgeOptions(edge.options);
    errors.push(...optionErrors);
  }
  
  return errors;
}

// Валідація опцій з'єднання
export function validateEdgeOptions(options) {
  const errors = [];
  
  if (!isObject(options)) {
    errors.push('Edge options must be an object');
    return errors;
  }
  
  if (options.throttle !== undefined && !isPositiveNumber(options.throttle)) {
    errors.push('Throttle must be a positive number');
  }
  
  if (options.debounce !== undefined && !isPositiveNumber(options.debounce)) {
    errors.push('Debounce must be a positive number');
  }
  
  if (options.bufferSize !== undefined && !isPositiveNumber(options.bufferSize)) {
    errors.push('Buffer size must be a positive number');
  }
  
  return errors;
}

// === Валідатори значень ===

// Валідація кольору
export function isValidColor(color) {
  // Hex color
  if (/^#[0-9A-F]{6}$/i.test(color)) return true;
  if (/^#[0-9A-F]{3}$/i.test(color)) return true;
  
  // RGB/RGBA
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/i.test(color)) return true;
  
  // HSL/HSLA
  if (/^hsla?\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*(,\s*[\d.]+\s*)?\)$/i.test(color)) return true;
  
  // Named colors
  const namedColors = ['red', 'green', 'blue', 'yellow', 'cyan', 'magenta', 'black', 'white', 'gray', 'grey'];
  return namedColors.includes(color.toLowerCase());
}

// Валідація email
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Валідація URL
export function isValidURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Валідація JSON
export function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

// Валідація регулярного виразу
export function isValidRegex(pattern) {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

// === Валідація коду ===

// Валідація JavaScript коду
export function validateJavaScriptCode(code) {
  const errors = [];
  
  if (!isNonEmptyString(code)) {
    errors.push('Code must be a non-empty string');
    return errors;
  }
  
  try {
    // Спроба парсингу коду
    new Function(code);
  } catch (error) {
    errors.push(`Syntax error: ${error.message}`);
  }
  
  // Перевірка на небезпечні конструкції
  const dangerousPatterns = [
    /\beval\s*\(/,
    /\bnew\s+Function\s*\(/,
    /\bimport\s*\(/,
    /\brequire\s*\(/,
    /\bglobal\b/,
    /\bprocess\b/,
    /\b__dirname\b/,
    /\b__filename\b/
  ];
  
  dangerousPatterns.forEach(pattern => {
    if (pattern.test(code)) {
      errors.push(`Potentially dangerous code pattern detected: ${pattern}`);
    }
  });
  
  return errors;
}

// === Комплексна валідація ===

// Валідація всього графа
export function validateGraph(graphManager) {
  const errors = [];
  
  // Перевірка лімітів
  if (graphManager.nodes.size > Limits.MAX_NODES) {
    errors.push(`Too many nodes: ${graphManager.nodes.size} (max: ${Limits.MAX_NODES})`);
  }
  
  if (graphManager.edges.size > Limits.MAX_EDGES) {
    errors.push(`Too many edges: ${graphManager.edges.size} (max: ${Limits.MAX_EDGES})`);
  }
  
  // Валідація кожного вузла
  graphManager.nodes.forEach(node => {
    const nodeErrors = validateNode(node);
    nodeErrors.forEach(error => {
      errors.push(`Node ${node.id}: ${error}`);
    });
  });
  
  // Валідація кожного з'єднання
  graphManager.edges.forEach(edge => {
    const edgeErrors = validateEdge(edge, graphManager.nodes);
    edgeErrors.forEach(error => {
      errors.push(`Edge ${edge.id}: ${error}`);
    });
  });
  
  // Перевірка на цикли (опціонально)
  const cycles = detectCycles(graphManager);
  if (cycles.length > 0) {
    errors.push(`Detected ${cycles.length} cycle(s) in the graph`);
  }
  
  return errors;
}

// Детекція циклів у графі
export function detectCycles(graphManager) {
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();
  const adjacencyList = buildAdjacencyList(graphManager);
  
  function dfs(nodeId, path = []) {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);
    
    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recursionStack.has(neighbor)) {
        // Знайдено цикл
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        cycle.push(neighbor);
        cycles.push(cycle);
      }
    }
    
    recursionStack.delete(nodeId);
  }
  
  // Перевіряємо кожен невідвіданий вузол
  graphManager.nodes.forEach((node, nodeId) => {
    if (!visited.has(nodeId)) {
      dfs(nodeId);
    }
  });
  
  return cycles;
}

// Побудова списку суміжності
function buildAdjacencyList(graphManager) {
  const adjacencyList = new Map();
  
  graphManager.edges.forEach(edge => {
    if (!adjacencyList.has(edge.sourceId)) {
      adjacencyList.set(edge.sourceId, []);
    }
    adjacencyList.get(edge.sourceId).push(edge.targetId);
  });
  
  return adjacencyList;
}

// === Санітизація ===

// Санітизація рядка
export function sanitizeString(str, maxLength = 1000) {
  if (!isNonEmptyString(str)) return '';
  
  // Обрізання до максимальної довжини
  str = str.slice(0, maxLength);
  
  // Видалення небезпечних символів
  str = str.replace(/[<>]/g, '');
  
  return str.trim();
}

// Санітизація числа
export function sanitizeNumber(value, min = -Infinity, max = Infinity, defaultValue = 0) {
  if (!isNumber(value)) return defaultValue;
  return Math.max(min, Math.min(max, value));
}

// Санітизація ID
export function sanitizeId(id) {
  if (!isNonEmptyString(id)) return null;
  
  // Видалення недозволених символів
  return id.replace(/[^a-zA-Z0-9_-]/g, '');
}