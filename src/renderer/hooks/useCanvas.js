// src/renderer/hooks/useCanvas.js
// Хук для управління канвою (pan, zoom, viewport)

import { useState, useCallback, useRef, useEffect } from 'react';
import { CanvasConfig } from '@core/constants.js';

export function useCanvas(wrapperRef) {
  const [viewportPos, setViewportPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  
  const panStartRef = useRef({ x: 0, y: 0 });
  const viewportStartRef = useRef({ x: 0, y: 0 });
  
  // Центрування канви при першому завантаженні
  useEffect(() => {
    if (wrapperRef.current) {
      centerView();
    }
  }, []);
  
  // Обробка колеса миші для зуму
  const handleWheel = useCallback((e) => {
    if (!wrapperRef.current) return;
    
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(
      CanvasConfig.MIN_ZOOM,
      Math.min(CanvasConfig.MAX_ZOOM, zoom * delta)
    );
    
    if (newZoom !== zoom) {
      // Зум відносно позиції курсора
      const rect = wrapperRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Позиція курсора на канві до зуму
      const canvasX = (x - viewportPos.x) / zoom;
      const canvasY = (y - viewportPos.y) / zoom;
      
      // Нова позиція вьюпорта після зуму
      const newViewportX = x - canvasX * newZoom;
      const newViewportY = y - canvasY * newZoom;
      
      setZoom(newZoom);
      setViewportPos({ x: newViewportX, y: newViewportY });
    }
  }, [zoom, viewportPos]);
  
  // Початок панорамування
  const handleMouseDown = useCallback((e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Середня кнопка або Alt+ЛКМ
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
      viewportStartRef.current = { ...viewportPos };
    }
  }, [viewportPos]);
  
  // Рух при панорамуванні
  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      const deltaX = e.clientX - panStartRef.current.x;
      const deltaY = e.clientY - panStartRef.current.y;
      
      setViewportPos({
        x: viewportStartRef.current.x + deltaX,
        y: viewportStartRef.current.y + deltaY
      });
    }
  }, [isPanning]);
  
  // Кінець панорамування
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);
  
  // Центрування виду
  const centerView = useCallback(() => {
    if (!wrapperRef.current) return;
    
    const wrapperWidth = wrapperRef.current.clientWidth;
    const wrapperHeight = wrapperRef.current.clientHeight;
    
    setViewportPos({
      x: (wrapperWidth - CanvasConfig.WIDTH * zoom) / 2,
      y: (wrapperHeight - CanvasConfig.HEIGHT * zoom) / 2
    });
  }, [zoom]);
  
  // Підгонка під розмір вмісту
  const fitToScreen = useCallback((nodes) => {
    if (!wrapperRef.current || nodes.size === 0) return;
    
    // Знаходимо межі всіх вузлів
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + 140); // ширина вузла
      maxY = Math.max(maxY, node.position.y + 80);  // висота вузла
    });
    
    // Додаємо відступи
    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    const wrapperWidth = wrapperRef.current.clientWidth;
    const wrapperHeight = wrapperRef.current.clientHeight;
    
    // Обчислюємо необхідний зум
    const scaleX = wrapperWidth / contentWidth;
    const scaleY = wrapperHeight / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 1);
    
    // Центруємо вміст
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    setZoom(newZoom);
    setViewportPos({
      x: wrapperWidth / 2 - centerX * newZoom,
      y: wrapperHeight / 2 - centerY * newZoom
    });
  }, []);
  
  // Зум на конкретний рівень
  const setZoomLevel = useCallback((level) => {
    const newZoom = Math.max(
      CanvasConfig.MIN_ZOOM,
      Math.min(CanvasConfig.MAX_ZOOM, level)
    );
    
    if (!wrapperRef.current) {
      setZoom(newZoom);
      return;
    }
    
    // Зум відносно центру вьюпорта
    const wrapperWidth = wrapperRef.current.clientWidth;
    const wrapperHeight = wrapperRef.current.clientHeight;
    
    const centerX = wrapperWidth / 2;
    const centerY = wrapperHeight / 2;
    
    // Позиція центру на канві
    const canvasX = (centerX - viewportPos.x) / zoom;
    const canvasY = (centerY - viewportPos.y) / zoom;
    
    // Нова позиція вьюпорта
    const newViewportX = centerX - canvasX * newZoom;
    const newViewportY = centerY - canvasY * newZoom;
    
    setZoom(newZoom);
    setViewportPos({ x: newViewportX, y: newViewportY });
  }, [zoom, viewportPos]);
  
  // Переміщення виду
  const panView = useCallback((deltaX, deltaY) => {
    setViewportPos(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
  }, []);
  
  // Конвертація координат екрану в координати канви
  const screenToCanvas = useCallback((screenX, screenY) => {
    if (!wrapperRef.current) return { x: 0, y: 0 };
    
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = (screenX - rect.left - viewportPos.x) / zoom;
    const y = (screenY - rect.top - viewportPos.y) / zoom;
    
    return { x, y };
  }, [viewportPos, zoom]);
  
  // Конвертація координат канви в координати екрану
  const canvasToScreen = useCallback((canvasX, canvasY) => {
    if (!wrapperRef.current) return { x: 0, y: 0 };
    
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = canvasX * zoom + viewportPos.x + rect.left;
    const y = canvasY * zoom + viewportPos.y + rect.top;
    
    return { x, y };
  }, [viewportPos, zoom]);
  
  // Глобальні обробники
  useEffect(() => {
    const handleGlobalMouseMove = (e) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();
    
    if (isPanning) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isPanning, handleMouseMove, handleMouseUp]);
  
  return {
    viewportPos,
    zoom,
    isPanning,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    centerView,
    fitToScreen,
    setZoomLevel,
    panView,
    screenToCanvas,
    canvasToScreen
  };
}