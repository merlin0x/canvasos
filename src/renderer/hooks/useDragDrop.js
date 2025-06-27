// src/renderer/hooks/useDragDrop.js
// Хук для drag & drop функціональності

import { useState, useCallback, useRef, useEffect } from 'react';
import { AnimationConfig } from '../core/constants.js';

export function useDragDrop(graphManager) {
  const [draggedNode, setDraggedNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodes, setDraggedNodes] = useState(new Map());
  
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  
  // Початок перетягування
  const handleNodeDragStart = useCallback((e, nodeId) => {
    const node = graphManager.getNode(nodeId);
    if (!node) return;
    
    // Якщо вузол не вибраний, вибираємо його
    if (!graphManager.state.selectedNodes.has(nodeId)) {
      graphManager.selectNode(nodeId, e.ctrlKey || e.metaKey);
    }
    
    // Зберігаємо початкові позиції всіх вибраних вузлів
    const selectedNodesData = new Map();
    graphManager.state.selectedNodes.forEach(id => {
      const n = graphManager.getNode(id);
      if (n) {
        selectedNodesData.set(id, {
          startX: n.position.x,
          startY: n.position.y
        });
      }
    });
    
    setDraggedNodes(selectedNodesData);
    setDraggedNode(nodeId);
    setDragOffset({
      x: e.clientX - node.position.x,
      y: e.clientY - node.position.y
    });
    
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    hasMoved.current = false;
    setIsDragging(true);
    
    // Запобігаємо виділенню тексту
    e.preventDefault();
  }, [graphManager]);
  
  // Переміщення при перетягуванні
  const handleDrag = useCallback((e) => {
    if (!isDragging || !draggedNode) return;
    
    const deltaX = e.clientX - dragStartPos.current.x;
    const deltaY = e.clientY - dragStartPos.current.y;
    
    // Перевірка порогу руху
    if (!hasMoved.current && 
        Math.abs(deltaX) < AnimationConfig.DRAG_THRESHOLD && 
        Math.abs(deltaY) < AnimationConfig.DRAG_THRESHOLD) {
      return;
    }
    
    hasMoved.current = true;
    
    // Переміщення всіх вибраних вузлів
    draggedNodes.forEach((startPos, nodeId) => {
      const node = graphManager.getNode(nodeId);
      if (node) {
        const newX = startPos.startX + deltaX;
        const newY = startPos.startY + deltaY;
        
        // Обмеження позиції вузла межами канви
        const constrainedX = Math.max(0, Math.min(4900, newX));
        const constrainedY = Math.max(0, Math.min(4900, newY));
        
        node.setPosition(constrainedX, constrainedY);
      }
    });
    
    // Оновлення потоку для перерендеру
    graphManager.updateNodesStream();
  }, [isDragging, draggedNode, draggedNodes, graphManager]);
  
  // Завершення перетягування
  const handleNodeDragEnd = useCallback((nodeId) => {
    if (!isDragging) return;
    
    // Зберігаємо зміни в історії тільки якщо вузли були переміщені
    if (hasMoved.current) {
      graphManager.saveToHistory();
    }
    
    setDraggedNode(null);
    setDraggedNodes(new Map());
    setIsDragging(false);
    hasMoved.current = false;
  }, [isDragging, graphManager]);
  
  // Drag & Drop з панелі інструментів
  const handleToolbarDragStart = useCallback((e, nodeType) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('nodeType', nodeType);
    
    // Створюємо візуальний елемент для перетягування
    const dragImage = document.createElement('div');
    dragImage.className = 'drag-preview';
    dragImage.textContent = nodeType.toUpperCase();
    dragImage.style.position = 'absolute';
    dragImage.style.left = '-1000px';
    document.body.appendChild(dragImage);
    
    e.dataTransfer.setDragImage(dragImage, 50, 20);
    
    setTimeout(() => document.body.removeChild(dragImage), 0);
  }, []);
  
  const handleCanvasDrop = useCallback((e, canvasPosition) => {
    e.preventDefault();
    
    const nodeType = e.dataTransfer.getData('nodeType');
    if (nodeType) {
      graphManager.addNode(nodeType, canvasPosition);
    }
  }, [graphManager]);
  
  const handleCanvasDragOver = useCallback((e) => {
    if (e.dataTransfer.types.includes('nodeType')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);
  
  // Глобальні обробники для drag
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e) => handleDrag(e);
      const handleMouseUp = () => {
        if (draggedNode) {
          handleNodeDragEnd(draggedNode);
        }
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Стиль курсора під час перетягування
      document.body.style.cursor = 'grabbing';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
      };
    }
  }, [isDragging, draggedNode, handleDrag, handleNodeDragEnd]);
  
  // Snap to grid (опціонально)
  const snapToGrid = useCallback((position, gridSize = 20) => {
    return {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize
    };
  }, []);
  
  return {
    draggedNode,
    isDragging,
    handleNodeDragStart,
    handleNodeDragEnd,
    handleToolbarDragStart,
    handleCanvasDrop,
    handleCanvasDragOver,
    snapToGrid
  };
}