// src/renderer/hooks/useEdges.js
// Хук для управління з'єднаннями

import { useState, useEffect, useCallback } from 'react';

export function useEdges(graphManager) {
  const [edges, setEdges] = useState(new Map());
  const [selectedEdges, setSelectedEdges] = useState(new Set());
  const [connectingFrom, setConnectingFrom] = useState(null);
  
  // Підписка на зміни з'єднань
  useEffect(() => {
    const subscription = graphManager.edges$.subscribe(edgesMap => {
      setEdges(new Map(edgesMap));
    });
    
    const eventsSubscription = graphManager.events$.subscribe(event => {
      if (event.type === 'selectionChanged') {
        setSelectedEdges(new Set(event.data.edges));
      }
    });
    
    return () => {
      subscription.unsubscribe();
      eventsSubscription.unsubscribe();
    };
  }, [graphManager]);
  
  // Обробка кліку на порт
  const handlePortClick = useCallback((nodeId, portType) => {
    if (portType === 'output') {
      // Початок з'єднання
      setConnectingFrom(nodeId);
    } else if (portType === 'input' && connectingFrom) {
      // Завершення з'єднання
      if (connectingFrom !== nodeId) {
        const edge = graphManager.addEdge(connectingFrom, nodeId);
        if (edge) {
          // Автоматичний вибір нового з'єднання
          graphManager.selectEdge(edge.id);
        }
      }
      setConnectingFrom(null);
    }
  }, [connectingFrom, graphManager]);
  
  // Скасування з'єднання
  const cancelConnection = useCallback(() => {
    setConnectingFrom(null);
  }, []);
  
  // Вибір з'єднання
  const handleEdgeSelect = useCallback((edgeId, multiSelect = false) => {
    const event = window.event || {};
    const isMultiSelect = multiSelect || event.ctrlKey || event.metaKey || event.shiftKey;
    
    graphManager.selectEdge(edgeId, isMultiSelect);
  }, [graphManager]);
  
  // Видалення з'єднання
  const deleteEdge = useCallback((edgeId) => {
    graphManager.removeEdge(edgeId);
  }, [graphManager]);
  
  // Видалення вибраних з'єднань
  const deleteSelectedEdges = useCallback(() => {
    selectedEdges.forEach(edgeId => {
      graphManager.removeEdge(edgeId);
    });
  }, [selectedEdges, graphManager]);
  
  // Оновлення параметрів з'єднання
  const updateEdgeOptions = useCallback((edgeId, options) => {
    const edge = edges.get(edgeId);
    if (edge) {
      edge.updateOptions(options);
      graphManager.saveToHistory();
    }
  }, [edges, graphManager]);
  
  // Отримання статистики з'єднань
  const getEdgeStats = useCallback(() => {
    let totalTransmissions = 0;
    let totalDataSize = 0;
    let activeEdges = 0;
    
    edges.forEach(edge => {
      if (edge.state$.value.connected) {
        activeEdges++;
      }
      totalTransmissions += edge.metrics.totalTransmissions;
      totalDataSize += edge.metrics.totalDataSize;
    });
    
    return {
      total: edges.size,
      active: activeEdges,
      transmissions: totalTransmissions,
      dataSize: totalDataSize
    };
  }, [edges]);
  
  // Пошук з'єднань для вузла
  const getNodeConnections = useCallback((nodeId) => {
    const incoming = [];
    const outgoing = [];
    
    edges.forEach(edge => {
      if (edge.targetId === nodeId) {
        incoming.push(edge);
      } else if (edge.sourceId === nodeId) {
        outgoing.push(edge);
      }
    });
    
    return { incoming, outgoing };
  }, [edges]);
  
  // Перевірка можливості створення з'єднання
  const canConnect = useCallback((sourceId, targetId) => {
    // Не можна з'єднати вузол сам з собою
    if (sourceId === targetId) return false;
    
    // Перевірка на існуюче з'єднання
    const existingEdge = Array.from(edges.values()).find(
      edge => edge.sourceId === sourceId && edge.targetId === targetId
    );
    if (existingEdge) return false;
    
    // Перевірка на цикли (опціонально)
    // TODO: Implement cycle detection if needed
    
    return true;
  }, [edges]);
  
  // Обробка ESC для скасування з'єднання
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && connectingFrom) {
        cancelConnection();
      }
    };
    
    if (connectingFrom) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [connectingFrom, cancelConnection]);
  
  return {
    edges,
    selectedEdges,
    connectingFrom,
    handlePortClick,
    handleEdgeSelect,
    deleteEdge,
    deleteSelectedEdges,
    updateEdgeOptions,
    getEdgeStats,
    getNodeConnections,
    canConnect,
    cancelConnection
  };
}