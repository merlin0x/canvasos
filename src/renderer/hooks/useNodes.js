// src/renderer/hooks/useNodes.js
// Хук для управління вузлами

import { useState, useEffect, useCallback } from 'react';

export function useNodes(graphManager) {
  const [nodes, setNodes] = useState(new Map());
  const [selectedNodes, setSelectedNodes] = useState(new Set());
  
  // Підписка на зміни вузлів
  useEffect(() => {
    const subscription = graphManager.nodes$.subscribe(nodesMap => {
      setNodes(new Map(nodesMap));
    });
    
    const eventsSubscription = graphManager.events$.subscribe(event => {
      if (event.type === 'selectionChanged') {
        setSelectedNodes(new Set(event.data.nodes));
      }
    });
    
    return () => {
      subscription.unsubscribe();
      eventsSubscription.unsubscribe();
    };
  }, [graphManager]);
  
  // Вибір вузла
  const handleNodeSelect = useCallback((nodeId, multiSelect = false) => {
    const event = window.event || {};
    const isMultiSelect = multiSelect || event.ctrlKey || event.metaKey || event.shiftKey;
    
    graphManager.selectNode(nodeId, isMultiSelect);
  }, [graphManager]);
  
  // Видалення вузла
  const handleNodeDelete = useCallback((nodeId) => {
    graphManager.removeNode(nodeId);
  }, [graphManager]);
  
  // Оновлення позиції вузла
  const updateNodePosition = useCallback((nodeId, x, y) => {
    graphManager.updateNode(nodeId, { position: { x, y } });
  }, [graphManager]);
  
  // Оновлення даних вузла
  const updateNodeData = useCallback((nodeId, data) => {
    graphManager.updateNode(nodeId, { data });
  }, [graphManager]);
  
  // Створення вузла
  const createNode = useCallback((type, position) => {
    return graphManager.addNode(type, position);
  }, [graphManager]);
  
  // Клонування вузла
  const cloneNode = useCallback((nodeId) => {
    const node = nodes.get(nodeId);
    if (node) {
      const offset = 50;
      const newPosition = {
        x: node.position.x + offset,
        y: node.position.y + offset
      };
      
      const newNode = graphManager.addNode(node.type, newPosition, { ...node.data });
      if (newNode) {
        graphManager.selectNode(newNode.id);
      }
    }
  }, [graphManager, nodes]);
  
  // Групове переміщення
  const moveSelectedNodes = useCallback((deltaX, deltaY) => {
    selectedNodes.forEach(nodeId => {
      const node = nodes.get(nodeId);
      if (node) {
        updateNodePosition(nodeId, 
          node.position.x + deltaX,
          node.position.y + deltaY
        );
      }
    });
  }, [nodes, selectedNodes, updateNodePosition]);
  
  // Вирівнювання вузлів
  const alignNodes = useCallback((alignment) => {
    if (selectedNodes.size < 2) return;
    
    const selectedNodesList = Array.from(selectedNodes)
      .map(id => nodes.get(id))
      .filter(Boolean);
    
    if (selectedNodesList.length < 2) return;
    
    switch (alignment) {
      case 'left':
        const minX = Math.min(...selectedNodesList.map(n => n.position.x));
        selectedNodesList.forEach(node => {
          updateNodePosition(node.id, minX, node.position.y);
        });
        break;
        
      case 'right':
        const maxX = Math.max(...selectedNodesList.map(n => n.position.x));
        selectedNodesList.forEach(node => {
          updateNodePosition(node.id, maxX, node.position.y);
        });
        break;
        
      case 'top':
        const minY = Math.min(...selectedNodesList.map(n => n.position.y));
        selectedNodesList.forEach(node => {
          updateNodePosition(node.id, node.position.x, minY);
        });
        break;
        
      case 'bottom':
        const maxY = Math.max(...selectedNodesList.map(n => n.position.y));
        selectedNodesList.forEach(node => {
          updateNodePosition(node.id, node.position.x, maxY);
        });
        break;
        
      case 'horizontal':
        const avgY = selectedNodesList.reduce((sum, n) => sum + n.position.y, 0) / selectedNodesList.length;
        selectedNodesList.forEach(node => {
          updateNodePosition(node.id, node.position.x, avgY);
        });
        break;
        
      case 'vertical':
        const avgX = selectedNodesList.reduce((sum, n) => sum + n.position.x, 0) / selectedNodesList.length;
        selectedNodesList.forEach(node => {
          updateNodePosition(node.id, avgX, node.position.y);
        });
        break;
    }
    
    graphManager.saveToHistory();
  }, [nodes, selectedNodes, updateNodePosition, graphManager]);
  
  // Розподіл вузлів
  const distributeNodes = useCallback((direction) => {
    if (selectedNodes.size < 3) return;
    
    const selectedNodesList = Array.from(selectedNodes)
      .map(id => nodes.get(id))
      .filter(Boolean);
    
    if (selectedNodesList.length < 3) return;
    
    if (direction === 'horizontal') {
      selectedNodesList.sort((a, b) => a.position.x - b.position.x);
      const startX = selectedNodesList[0].position.x;
      const endX = selectedNodesList[selectedNodesList.length - 1].position.x;
      const spacing = (endX - startX) / (selectedNodesList.length - 1);
      
      selectedNodesList.forEach((node, index) => {
        updateNodePosition(node.id, startX + spacing * index, node.position.y);
      });
    } else if (direction === 'vertical') {
      selectedNodesList.sort((a, b) => a.position.y - b.position.y);
      const startY = selectedNodesList[0].position.y;
      const endY = selectedNodesList[selectedNodesList.length - 1].position.y;
      const spacing = (endY - startY) / (selectedNodesList.length - 1);
      
      selectedNodesList.forEach((node, index) => {
        updateNodePosition(node.id, node.position.x, startY + spacing * index);
      });
    }
    
    graphManager.saveToHistory();
  }, [nodes, selectedNodes, updateNodePosition, graphManager]);
  
  return {
    nodes,
    selectedNodes,
    handleNodeSelect,
    handleNodeDelete,
    updateNodePosition,
    updateNodeData,
    createNode,
    cloneNode,
    moveSelectedNodes,
    alignNodes,
    distributeNodes
  };
}