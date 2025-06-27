// src/renderer/core/Graph.js
// Менеджер графа - керує вузлами та з'єднаннями

import { BehaviorSubject, Subject } from 'rxjs';
import { CanvasNode } from '@core/Node.js';
import { Edge } from '@core/Edge.js';
import { Limits, Messages } from '@core/constants.js';

export class GraphManager {
  constructor() {
    // Колекції
    this.nodes = new Map();
    this.edges = new Map();
    
    // Реактивні потоки для UI
    this.nodes$ = new BehaviorSubject(new Map());
    this.edges$ = new BehaviorSubject(new Map());
    
    // Події
    this.events$ = new Subject();
    
    // Історія для undo/redo
    this.history = [];
    this.historyIndex = -1;
    
    // Стан графа
    this.state = {
      selectedNodes: new Set(),
      selectedEdges: new Set(),
      isSimulating: false,
      isDirty: false
    };
    
    // Метадані
    this.metadata = {
      id: this.generateId('graph'),
      name: 'Untitled Graph',
      created: Date.now(),
      modified: Date.now(),
      version: '1.0.0'
    };
  }
  
  // Генерація унікального ID
  generateId(prefix = 'item') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // === Управління вузлами ===
  
  addNode(type, position, data = {}) {
    // Перевірка ліміту
    if (this.nodes.size >= Limits.MAX_NODES) {
      this.emitEvent('error', { message: Messages.MAX_NODES_REACHED });
      return null;
    }
    
    const id = this.generateId('node');
    const node = new CanvasNode(id, type, position, data);
    
    this.nodes.set(id, node);
    this.updateNodesStream();
    this.saveToHistory();
    
    this.emitEvent('nodeAdded', { node });
    return node;
  }
  
  removeNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    
    // Видалення пов'язаних з'єднань
    const relatedEdges = this.getNodeEdges(nodeId);
    relatedEdges.forEach(edge => this.removeEdge(edge.id));
    
    // Видалення вузла
    node.destroy();
    this.nodes.delete(nodeId);
    this.state.selectedNodes.delete(nodeId);
    
    this.updateNodesStream();
    this.saveToHistory();
    
    this.emitEvent('nodeRemoved', { nodeId });
    return true;
  }
  
  updateNode(nodeId, updates) {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    
    // Оновлення позиції
    if (updates.position) {
      node.setPosition(updates.position.x, updates.position.y);
    }
    
    // Оновлення даних
    if (updates.data) {
      node.updateData(updates.data);
    }
    
    this.updateNodesStream();
    this.emitEvent('nodeUpdated', { nodeId, updates });
    return true;
  }
  
  getNode(nodeId) {
    return this.nodes.get(nodeId);
  }
  
  getNodeEdges(nodeId) {
    return Array.from(this.edges.values()).filter(
      edge => edge.sourceId === nodeId || edge.targetId === nodeId
    );
  }
  
  // === Управління з'єднаннями ===
  
  addEdge(sourceId, targetId, options = {}) {
    // Перевірки
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      this.emitEvent('error', { message: 'Invalid nodes for edge' });
      return null;
    }
    
    if (sourceId === targetId) {
      this.emitEvent('error', { message: 'Cannot connect node to itself' });
      return null;
    }
    
    // Перевірка на існуюче з'єднання
    const existingEdge = this.findEdge(sourceId, targetId);
    if (existingEdge) {
      this.emitEvent('error', { message: 'Edge already exists' });
      return null;
    }
    
    // Перевірка ліміту
    if (this.edges.size >= Limits.MAX_EDGES) {
      this.emitEvent('error', { message: 'Maximum edges limit reached' });
      return null;
    }
    
    // Створення з'єднання
    const id = this.generateId('edge');
    const edge = new Edge(id, sourceId, targetId, options);
    
    // Підключення
    const sourceNode = this.nodes.get(sourceId);
    const targetNode = this.nodes.get(targetId);
    edge.connect(sourceNode, targetNode);
    
    this.edges.set(id, edge);
    this.updateEdgesStream();
    this.saveToHistory();
    
    this.emitEvent('edgeAdded', { edge });
    return edge;
  }
  
  removeEdge(edgeId) {
    const edge = this.edges.get(edgeId);
    if (!edge) return false;
    
    edge.destroy();
    this.edges.delete(edgeId);
    this.state.selectedEdges.delete(edgeId);
    
    this.updateEdgesStream();
    this.saveToHistory();
    
    this.emitEvent('edgeRemoved', { edgeId });
    return true;
  }
  
  findEdge(sourceId, targetId) {
    return Array.from(this.edges.values()).find(
      edge => edge.sourceId === sourceId && edge.targetId === targetId
    );
  }
  
  // === Вибір елементів ===
  
  selectNode(nodeId, multiple = false) {
    if (!multiple) {
      this.state.selectedNodes.clear();
      this.state.selectedEdges.clear();
    }
    
    if (this.nodes.has(nodeId)) {
      this.state.selectedNodes.add(nodeId);
      this.emitEvent('selectionChanged', { 
        nodes: Array.from(this.state.selectedNodes),
        edges: Array.from(this.state.selectedEdges)
      });
    }
  }
  
  selectEdge(edgeId, multiple = false) {
    if (!multiple) {
      this.state.selectedNodes.clear();
      this.state.selectedEdges.clear();
    }
    
    if (this.edges.has(edgeId)) {
      this.state.selectedEdges.add(edgeId);
      this.emitEvent('selectionChanged', { 
        nodes: Array.from(this.state.selectedNodes),
        edges: Array.from(this.state.selectedEdges)
      });
    }
  }
  
  clearSelection() {
    this.state.selectedNodes.clear();
    this.state.selectedEdges.clear();
    this.emitEvent('selectionChanged', { nodes: [], edges: [] });
  }
  
  // === Групові операції ===
  
  deleteSelected() {
    const nodesToDelete = Array.from(this.state.selectedNodes);
    const edgesToDelete = Array.from(this.state.selectedEdges);
    
    // Видаляємо з'єднання першими
    edgesToDelete.forEach(id => this.removeEdge(id));
    
    // Потім вузли
    nodesToDelete.forEach(id => this.removeNode(id));
    
    this.clearSelection();
  }
  
  // === Історія (Undo/Redo) ===
  
  saveToHistory() {
    // Видаляємо майбутню історію при новій дії
    this.history = this.history.slice(0, this.historyIndex + 1);
    
    // Зберігаємо поточний стан
    const snapshot = this.createSnapshot();
    this.history.push(snapshot);
    
    // Обмежуємо розмір історії
    if (this.history.length > Limits.MAX_UNDO_HISTORY) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
    
    this.state.isDirty = true;
    this.metadata.modified = Date.now();
  }
  
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.restoreSnapshot(this.history[this.historyIndex]);
      this.emitEvent('undo');
    }
  }
  
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.restoreSnapshot(this.history[this.historyIndex]);
      this.emitEvent('redo');
    }
  }
  
  // === Серіалізація ===
  
  createSnapshot() {
    return {
      nodes: Array.from(this.nodes.values()).map(node => node.serialize()),
      edges: Array.from(this.edges.values()).map(edge => edge.serialize()),
      metadata: { ...this.metadata }
    };
  }
  
  restoreSnapshot(snapshot) {
    // Очищення поточного стану
    this.clear(false);
    
    // Відновлення вузлів
    snapshot.nodes.forEach(nodeData => {
      const node = CanvasNode.deserialize(nodeData);
      this.nodes.set(node.id, node);
    });
    
    // Відновлення з'єднань
    snapshot.edges.forEach(edgeData => {
      const edge = Edge.deserialize(edgeData);
      const sourceNode = this.nodes.get(edge.sourceId);
      const targetNode = this.nodes.get(edge.targetId);
      
      if (sourceNode && targetNode) {
        edge.connect(sourceNode, targetNode);
        this.edges.set(edge.id, edge);
      }
    });
    
    // Відновлення метаданих
    if (snapshot.metadata) {
      this.metadata = { ...this.metadata, ...snapshot.metadata };
    }
    
    this.updateNodesStream();
    this.updateEdgesStream();
  }
  
  // === Утиліти ===
  
  clear(saveHistory = true) {
    // Знищення всіх вузлів
    this.nodes.forEach(node => node.destroy());
    this.nodes.clear();
    
    // Знищення всіх з'єднань
    this.edges.forEach(edge => edge.destroy());
    this.edges.clear();
    
    // Очищення вибору
    this.clearSelection();
    
    // Оновлення потоків
    this.updateNodesStream();
    this.updateEdgesStream();
    
    if (saveHistory) {
      this.saveToHistory();
    }
    
    this.emitEvent('cleared');
  }
  
  // Оновлення реактивних потоків
  updateNodesStream() {
    this.nodes$.next(new Map(this.nodes));
  }
  
  updateEdgesStream() {
    this.edges$.next(new Map(this.edges));
  }
  
  // Емісія подій
  emitEvent(type, data = {}) {
    this.events$.next({ type, data, timestamp: Date.now() });
  }
  
  // Діагностика
  getDiagnostics() {
    return {
      metadata: this.metadata,
      nodesCount: this.nodes.size,
      edgesCount: this.edges.size,
      selectedNodes: this.state.selectedNodes.size,
      selectedEdges: this.state.selectedEdges.size,
      historySize: this.history.length,
      historyIndex: this.historyIndex,
      isDirty: this.state.isDirty,
      nodes: Array.from(this.nodes.values()).map(node => node.getDiagnostics()),
      edges: Array.from(this.edges.values()).map(edge => edge.getDiagnostics())
    };
  }
  
  // Збереження/завантаження
  
  toJSON() {
    return JSON.stringify(this.createSnapshot(), null, 2);
  }
  
  fromJSON(json) {
    try {
      const snapshot = JSON.parse(json);
      this.restoreSnapshot(snapshot);
      this.state.isDirty = false;
      return true;
    } catch (error) {
      console.error('Failed to load graph:', error);
      this.emitEvent('error', { message: 'Failed to load graph', error });
      return false;
    }
  }
}