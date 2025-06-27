// src/renderer/components/Minimap.js
// Мінікарта для навігації по канві

import React, { useRef, useEffect, useState } from 'react';
import { NodeColors } from '../core/constants.js';

export function Minimap({ 
  nodes, 
  edges, 
  viewportPos, 
  viewportSize, 
  zoom, 
  canvasSize,
  onClick 
}) {
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(0.05);
  const minimapWidth = 200;
  const minimapHeight = 150;
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Налаштування canvas для retina дисплеїв
    canvas.width = minimapWidth * dpr;
    canvas.height = minimapHeight * dpr;
    canvas.style.width = `${minimapWidth}px`;
    canvas.style.height = `${minimapHeight}px`;
    ctx.scale(dpr, dpr);
    
    // Очищення
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, minimapWidth, minimapHeight);
    
    // Обчислення масштабу
    const scaleX = minimapWidth / canvasSize.width;
    const scaleY = minimapHeight / canvasSize.height;
    const minScale = Math.min(scaleX, scaleY) * 0.9;
    setScale(minScale);
    
    // Сітка
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 0.5;
    const gridSize = 100 * minScale;
    
    for (let x = 0; x < minimapWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, minimapHeight);
      ctx.stroke();
    }
    
    for (let y = 0; y < minimapHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(minimapWidth, y);
      ctx.stroke();
    }
    
    // З'єднання
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    edges.forEach(edge => {
      const sourceNode = nodes.get(edge.sourceId);
      const targetNode = nodes.get(edge.targetId);
      
      if (sourceNode && targetNode) {
        ctx.beginPath();
        ctx.moveTo(
          sourceNode.position.x * minScale + 5,
          sourceNode.position.y * minScale + 5
        );
        ctx.lineTo(
          targetNode.position.x * minScale + 5,
          targetNode.position.y * minScale + 5
        );
        ctx.stroke();
      }
    });
    
    // Вузли
    nodes.forEach(node => {
      ctx.fillStyle = NodeColors[node.type] || '#666';
      ctx.fillRect(
        node.position.x * minScale,
        node.position.y * minScale,
        10,
        8
      );
    });
    
    // Вьюпорт
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      -viewportPos.x / zoom * minScale,
      -viewportPos.y / zoom * minScale,
      viewportSize.width / zoom * minScale,
      viewportSize.height / zoom * minScale
    );
    
    // Рамка вьюпорту
    ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
    ctx.fillRect(
      -viewportPos.x / zoom * minScale,
      -viewportPos.y / zoom * minScale,
      viewportSize.width / zoom * minScale,
      viewportSize.height / zoom * minScale
    );
    
  }, [nodes, edges, viewportPos, viewportSize, zoom, canvasSize]);
  
  const handleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    if (onClick) {
      onClick(x, y);
    }
  };
  
  const handleDrag = (e) => {
    if (e.buttons === 1) {
      handleClick(e);
    }
  };
  
  return (
    <div className="minimap">
      <div className="minimap-header">
        <span>Мінікарта</span>
        <span className="minimap-zoom">{Math.round(zoom * 100)}%</span>
      </div>
      <canvas
        ref={canvasRef}
        className="minimap-canvas"
        onClick={handleClick}
        onMouseMove={handleDrag}
        style={{ cursor: 'pointer' }}
      />
      <div className="minimap-stats">
        <span>{nodes.size} вузлів</span>
        <span>{edges.size} з'єднань</span>
      </div>
    </div>
  );
}