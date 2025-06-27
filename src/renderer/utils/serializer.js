// src/renderer/utils/serializer.js
// Утиліти для серіалізації/десеріалізації графа Canvas OS

import { CanvasNode } from '@core/Node.js';
import { Edge } from '@core/Edge.js';
import { InputNode } from '@nodes/InputNode.js';
import { ProcessNode } from '@nodes/ProcessNode.js';
import { OutputNode } from '@nodes/OutputNode.js';
import { FilterNode } from '@nodes/FilterNode.js';
import { VisualizerNode } from '@nodes/VisualizerNode.js';
import { AutomatonNode } from '@nodes/AutomatonNode.js';
import { NodeType } from '@core/constants.js';

// Мапа типів вузлів на класи
const NODE_CLASS_MAP = {
  [NodeType.INPUT]: InputNode,
  [NodeType.PROCESS]: ProcessNode,
  [NodeType.OUTPUT]: OutputNode,
  [NodeType.FILTER]: FilterNode,
  [NodeType.VISUALIZER]: VisualizerNode,
  [NodeType.AUTOMATON]: AutomatonNode
};

// Версія формату серіалізації
const SERIALIZATION_VERSION = '1.0.0';

// === Серіалізація ===

// Серіалізація графа
export function serializeGraph(graphManager) {
  try {
    const serialized = {
      version: SERIALIZATION_VERSION,
      metadata: {
        ...graphManager.metadata,
        serializedAt: new Date().toISOString(),
        nodesCount: graphManager.nodes.size,
        edgesCount: graphManager.edges.size
      },
      nodes: serializeNodes(graphManager.nodes),
      edges: serializeEdges(graphManager.edges),
      viewport: {
        // Можна додати стан viewport якщо потрібно
        zoom: 1,
        position: { x: 0, y: 0 }
      }
    };
    
    return serialized;
  } catch (error) {
    console.error('Serialization error:', error);
    throw new Error(`Failed to serialize graph: ${error.message}`);
  }
}

// Серіалізація вузлів
export function serializeNodes(nodesMap) {
  const nodes = [];
  
  nodesMap.forEach(node => {
    try {
      const serialized = serializeNode(node);
      nodes.push(serialized);
    } catch (error) {
      console.error(`Failed to serialize node ${node.id}:`, error);
    }
  });
  
  return nodes;
}

// Серіалізація одного вузла
export function serializeNode(node) {
  // Базова серіалізація
  let serialized = {
    id: node.id,
    type: node.type,
    position: { ...node.position },
    data: { ...node.data },
    metadata: { ...node.metadata }
  };
  
  // Додаткова серіалізація для спеціальних типів
  if (node.serialize && typeof node.serialize === 'function') {
    serialized = node.serialize();
  }
  
  // Додаємо поточний стан (без функцій)
  const state = node.state$.value;
  if (state) {
    serialized.state = sanitizeForSerialization(state);
  }
  
  return serialized;
}

// Серіалізація з'єднань
export function serializeEdges(edgesMap) {
  const edges = [];
  
  edgesMap.forEach(edge => {
    try {
      const serialized = serializeEdge(edge);
      edges.push(serialized);
    } catch (error) {
      console.error(`Failed to serialize edge ${edge.id}:`, error);
    }
  });
  
  return edges;
}

// Серіалізація одного з'єднання
export function serializeEdge(edge) {
  let serialized = {
    id: edge.id,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    options: { ...edge.options },
    metrics: { ...edge.metrics }
  };
  
  // Видаляємо функції з options
  if (serialized.options.filter && typeof serialized.options.filter === 'function') {
    serialized.options.filter = serialized.options.filter.toString();
  }
  if (serialized.options.transform && typeof serialized.options.transform === 'function') {
    serialized.options.transform = serialized.options.transform.toString();
  }
  
  return serialized;
}

// === Десеріалізація ===

// Десеріалізація графа
export function deserializeGraph(data, graphManager) {
  try {
    // Перевірка версії
    if (data.version && !isVersionCompatible(data.version)) {
      console.warn(`Graph version ${data.version} may not be fully compatible with ${SERIALIZATION_VERSION}`);
    }
    
    // Очищення поточного графа
    graphManager.clear(false);
    
    // Відновлення метаданих
    if (data.metadata) {
      graphManager.metadata = {
        ...graphManager.metadata,
        ...data.metadata,
        loaded: Date.now()
      };
    }
    
    // Відновлення вузлів
    const nodeIdMap = new Map();
    if (data.nodes) {
      data.nodes.forEach(nodeData => {
        try {
          const node = deserializeNode(nodeData);
          if (node) {
            graphManager.nodes.set(node.id, node);
            nodeIdMap.set(nodeData.id, node.id);
          }
        } catch (error) {
          console.error(`Failed to deserialize node:`, error);
        }
      });
    }
    
    // Відновлення з'єднань
    if (data.edges) {
      data.edges.forEach(edgeData => {
        try {
          const edge = deserializeEdge(edgeData, graphManager);
          if (edge) {
            graphManager.edges.set(edge.id, edge);
          }
        } catch (error) {
          console.error(`Failed to deserialize edge:`, error);
        }
      });
    }
    
    // Оновлення потоків
    graphManager.updateNodesStream();
    graphManager.updateEdgesStream();
    
    return true;
  } catch (error) {
    console.error('Deserialization error:', error);
    throw new Error(`Failed to deserialize graph: ${error.message}`);
  }
}

// Десеріалізація вузла
export function deserializeNode(data) {
  const NodeClass = NODE_CLASS_MAP[data.type] || CanvasNode;
  
  // Створення екземпляра
  const node = new NodeClass(
    data.id,
    data.position,
    data.data
  );
  
  // Відновлення метаданих
  if (data.metadata) {
    node.metadata = { ...node.metadata, ...data.metadata };
  }
  
  // Відновлення стану
  if (data.state) {
    node.state$.next(data.state);
  }
  
  return node;
}

// Десеріалізація з'єднання
export function deserializeEdge(data, graphManager) {
  const sourceNode = graphManager.nodes.get(data.sourceId);
  const targetNode = graphManager.nodes.get(data.targetId);
  
  if (!sourceNode || !targetNode) {
    console.warn(`Cannot create edge: missing nodes (${data.sourceId} -> ${data.targetId})`);
    return null;
  }
  
  // Відновлення функцій з рядків
  const options = { ...data.options };
  if (typeof options.filter === 'string') {
    try {
      options.filter = new Function('return ' + options.filter)();
    } catch (e) {
      delete options.filter;
    }
  }
  if (typeof options.transform === 'string') {
    try {
      options.transform = new Function('return ' + options.transform)();
    } catch (e) {
      delete options.transform;
    }
  }
  
  const edge = new Edge(
    data.id,
    data.sourceId,
    data.targetId,
    options
  );
  
  // Відновлення метрик
  if (data.metrics) {
    edge.metrics = { ...edge.metrics, ...data.metrics };
  }
  
  // Підключення
  edge.connect(sourceNode, targetNode);
  
  return edge;
}

// === Утиліти ===

// Очищення об'єкта від функцій та циклічних посилань
export function sanitizeForSerialization(obj, visited = new WeakSet()) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (visited.has(obj)) {
    return '[Circular Reference]';
  }
  
  visited.add(obj);
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForSerialization(item, visited));
  }
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'function') {
      // Пропускаємо функції або серіалізуємо як рядок
      continue;
    } else if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (typeof value === 'object') {
      result[key] = sanitizeForSerialization(value, visited);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// Перевірка сумісності версій
export function isVersionCompatible(version) {
  const [major] = version.split('.');
  const [currentMajor] = SERIALIZATION_VERSION.split('.');
  return major === currentMajor;
}

// === Експорт/імпорт різних форматів ===

// Експорт у JSON
export function exportToJSON(graphManager, pretty = true) {
  const serialized = serializeGraph(graphManager);
  return pretty ? 
    JSON.stringify(serialized, null, 2) : 
    JSON.stringify(serialized);
}

// Імпорт з JSON
export function importFromJSON(jsonString, graphManager) {
  try {
    const data = JSON.parse(jsonString);
    return deserializeGraph(data, graphManager);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }
}

// Експорт у спрощений формат (без метаданих)
export function exportSimplified(graphManager) {
  const nodes = [];
  const edges = [];
  
  graphManager.nodes.forEach(node => {
    nodes.push({
      id: node.id,
      type: node.type,
      x: node.position.x,
      y: node.position.y,
      data: node.data
    });
  });
  
  graphManager.edges.forEach(edge => {
    edges.push({
      from: edge.sourceId,
      to: edge.targetId
    });
  });
  
  return { nodes, edges };
}

// Експорт як URL (для sharing)
export function exportAsURL(graphManager) {
  const simplified = exportSimplified(graphManager);
  const json = JSON.stringify(simplified);
  const compressed = compressString(json);
  const base64 = btoa(compressed);
  
  return `${window.location.origin}/?graph=${encodeURIComponent(base64)}`;
}

// Імпорт з URL
export function importFromURL(url) {
  try {
    const urlObj = new URL(url);
    const graphParam = urlObj.searchParams.get('graph');
    
    if (!graphParam) {
      throw new Error('No graph data in URL');
    }
    
    const base64 = decodeURIComponent(graphParam);
    const compressed = atob(base64);
    const json = decompressString(compressed);
    
    return JSON.parse(json);
  } catch (error) {
    throw new Error(`Invalid URL: ${error.message}`);
  }
}

// Проста компресія (LZ-string можна додати окремо)
export function compressString(str) {
  // Спрощена компресія - в реальному проекті використовуйте LZ-string
  return str;
}

export function decompressString(str) {
  // Спрощена декомпресія
  return str;
}

// === Валідація ===

// Валідація структури графа
export function validateGraphData(data) {
  const errors = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Data must be an object');
    return errors;
  }
  
  // Перевірка версії
  if (!data.version) {
    errors.push('Missing version field');
  }
  
  // Перевірка вузлів
  if (!Array.isArray(data.nodes)) {
    errors.push('Nodes must be an array');
  } else {
    data.nodes.forEach((node, index) => {
      if (!node.id) errors.push(`Node ${index} missing id`);
      if (!node.type) errors.push(`Node ${index} missing type`);
      if (!node.position) errors.push(`Node ${index} missing position`);
    });
  }
  
  // Перевірка з'єднань
  if (!Array.isArray(data.edges)) {
    errors.push('Edges must be an array');
  } else {
    const nodeIds = new Set(data.nodes.map(n => n.id));
    
    data.edges.forEach((edge, index) => {
      if (!edge.id) errors.push(`Edge ${index} missing id`);
      if (!edge.sourceId) errors.push(`Edge ${index} missing sourceId`);
      if (!edge.targetId) errors.push(`Edge ${index} missing targetId`);
      
      if (!nodeIds.has(edge.sourceId)) {
        errors.push(`Edge ${index} references non-existent source node ${edge.sourceId}`);
      }
      if (!nodeIds.has(edge.targetId)) {
        errors.push(`Edge ${index} references non-existent target node ${edge.targetId}`);
      }
    });
  }
  
  return errors;
}

// === Міграція даних ===

// Міграція старих форматів
export function migrateGraphData(data) {
  // Перевірка версії та міграція якщо потрібно
  if (!data.version) {
    // Стара версія без версії - мігруємо до 1.0.0
    data.version = '1.0.0';
    
    // Міграція структури вузлів
    if (data.nodes) {
      data.nodes = data.nodes.map(node => {
        if (!node.metadata) {
          node.metadata = {
            created: Date.now(),
            updated: Date.now()
          };
        }
        return node;
      });
    }
  }
  
  return data;
}