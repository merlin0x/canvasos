// src/renderer/components/Canvas.js
// Основний компонент канви

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { NodeComponent } from '@components/Node.jsx';
import { EdgeComponent } from '@components/Edge.jsx';
import { Toolbar } from '@components/Toolbar.jsx';
import { StatusBar } from '@components/StatusBar.jsx';
import { InfoPanel } from '@components/InfoPanel.jsx';
import { Editor } from '@components/Editor.jsx';
import { Minimap } from '@components/Minimap.jsx';
import { useCanvas } from '@hooks/useCanvas.js';
import { useNodes } from '@hooks/useNodes.js';
import { useEdges } from '@hooks/useEdges.js';
import { useDragDrop } from '@hooks/useDragDrop.js';
import { CanvasConfig } from '@core/constants.js';

export function Canvas({ graphManager, settings, onSettingsChange }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const svgRef = useRef(null);
  
  // Стан канви
  const {
    viewportPos,
    zoom,
    isPanning,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    centerView,
    fitToScreen
  } = useCanvas(wrapperRef);
  
  // Стан вузлів і з'єднань
  const { nodes, selectedNodes, handleNodeSelect, handleNodeDelete } = useNodes(graphManager);
  const { edges, selectedEdges, connectingFrom, handlePortClick, handleEdgeSelect } = useEdges(graphManager);
  const { draggedNode, handleNodeDragStart, handleNodeDragEnd } = useDragDrop(graphManager);
  
  // Локальний стан UI
  const [showInfo, setShowInfo] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentTool, setCurrentTool] = useState('select');
  
  // Миша для рендеру лінії з'єднання
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Обробка кліку на канву
  const handleCanvasClick = useCallback((e) => {
    if (e.target === canvasRef.current) {
      // Очищення вибору
      graphManager.clearSelection();
      
      // Створення вузла при подвійному кліку
      if (e.detail === 2 && currentTool === 'select') {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - viewportPos.x) / zoom;
        const y = (e.clientY - rect.top - viewportPos.y) / zoom;
        
        graphManager.addNode('process', { x, y });
      }
    }
  }, [graphManager, currentTool, viewportPos, zoom]);
  
  // Обробка руху миші
  const handleCanvasMouseMove = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left - viewportPos.x) / zoom,
      y: (e.clientY - rect.top - viewportPos.y) / zoom
    });
    
    handleMouseMove(e);
  }, [handleMouseMove, viewportPos, zoom]);
  
  // Обробка команд з тулбару
  const handleToolbarCommand = useCallback((command, data) => {
    switch (command) {
      case 'add-node':
        const centerX = -viewportPos.x / zoom + wrapperRef.current.clientWidth / 2 / zoom;
        const centerY = -viewportPos.y / zoom + wrapperRef.current.clientHeight / 2 / zoom;
        graphManager.addNode(data.type, { x: centerX, y: centerY });
        break;
        
      case 'delete-selected':
        graphManager.deleteSelected();
        break;
        
      case 'clear-all':
        if (window.confirm('Очистити всю канву?')) {
          graphManager.clear();
        }
        break;
        
      case 'toggle-simulation':
        setIsSimulating(!isSimulating);
        break;
        
      case 'center-view':
        centerView();
        break;
        
      case 'fit-to-screen':
        fitToScreen(nodes);
        break;
        
      case 'undo':
        graphManager.undo();
        break;
        
      case 'redo':
        graphManager.redo();
        break;
        
      case 'tool':
        setCurrentTool(data.tool);
        break;
    }
  }, [graphManager, centerView, fitToScreen, nodes, isSimulating, viewportPos, zoom]);
  
  // Обчислення позиції порта
  const getPortPosition = useCallback((nodeId, portType) => {
    const node = nodes.get(nodeId);
    if (!node) return { x: 0, y: 0 };
    
    const nodeWidth = node.type === 'visualizer' ? 200 : 140;
    return {
      x: node.position.x + (portType === 'output' ? nodeWidth : 0),
      y: node.position.y + 40
    };
  }, [nodes]);
  
  // Ефект для оновлення стану симуляції
  useEffect(() => {
    graphManager.state.isSimulating = isSimulating;
  }, [graphManager, isSimulating]);
  
  // Стиль канви з трансформацією
  const canvasStyle = {
    transform: `translate(${viewportPos.x}px, ${viewportPos.y}px) scale(${zoom})`,
    transformOrigin: '0 0',
    width: CanvasConfig.WIDTH,
    height: CanvasConfig.HEIGHT,
    cursor: isPanning ? 'grabbing' : currentTool === 'pan' ? 'grab' : 'default'
  };
  
  return (
    <div className="canvas-layout">
      <Toolbar 
        onCommand={handleToolbarCommand}
        currentTool={currentTool}
        isSimulating={isSimulating}
        canUndo={graphManager.historyIndex > 0}
        canRedo={graphManager.historyIndex < graphManager.history.length - 1}
      />
      
      <div className="canvas-main">
        <div 
          ref={wrapperRef}
          className={`canvas-wrapper ${connectingFrom ? 'connecting' : ''}`}
          onWheel={handleWheel}
        >
          <div 
            ref={canvasRef}
            className="canvas-container"
            style={canvasStyle}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* SVG для з'єднань */}
            <svg 
              ref={svgRef}
              className="edges-svg"
              style={{ width: CanvasConfig.WIDTH, height: CanvasConfig.HEIGHT }}
            >
              {/* Існуючі з'єднання */}
              {Array.from(edges.values()).map(edge => {
                const sourcePos = getPortPosition(edge.sourceId, 'output');
                const targetPos = getPortPosition(edge.targetId, 'input');
                
                return (
                  <EdgeComponent
                    key={edge.id}
                    edge={edge}
                    sourcePos={sourcePos}
                    targetPos={targetPos}
                    selected={selectedEdges.has(edge.id)}
                    animated={isSimulating && edge.state$.value.connected}
                    onClick={() => handleEdgeSelect(edge.id)}
                  />
                );
              })}
              
              {/* Лінія з'єднання при перетягуванні */}
              {connectingFrom && (
                <line
                  className="connection-line"
                  x1={getPortPosition(connectingFrom, 'output').x}
                  y1={getPortPosition(connectingFrom, 'output').y}
                  x2={mousePos.x}
                  y2={mousePos.y}
                />
              )}
            </svg>
            
            {/* Вузли */}
            {Array.from(nodes.values()).map(node => (
              <NodeComponent
                key={node.id}
                node={node}
                selected={selectedNodes.has(node.id)}
                onSelect={handleNodeSelect}
                onDelete={handleNodeDelete}
                onPortClick={handlePortClick}
                onDragStart={handleNodeDragStart}
                onDragEnd={handleNodeDragEnd}
                onUpdateValue={(nodeId, value) => {
                  const node = nodes.get(nodeId);
                  if (node) {
                    node.state$.next(value);
                    node.output$.next(value);
                  }
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Панелі */}
        {showInfo && (
          <InfoPanel 
            onClose={() => setShowInfo(false)}
            graphManager={graphManager}
          />
        )}
        
        {showEditor && selectedNodes.size > 0 && (
          <Editor
            nodeId={Array.from(selectedNodes)[0]}
            node={nodes.get(Array.from(selectedNodes)[0])}
            onClose={() => setShowEditor(false)}
            onUpdate={(nodeId, updates) => graphManager.updateNode(nodeId, updates)}
          />
        )}
        
        {showMinimap && (
          <Minimap
            nodes={nodes}
            edges={edges}
            viewportPos={viewportPos}
            viewportSize={{
              width: wrapperRef.current?.clientWidth || 0,
              height: wrapperRef.current?.clientHeight || 0
            }}
            zoom={zoom}
            canvasSize={{ width: CanvasConfig.WIDTH, height: CanvasConfig.HEIGHT }}
            onClick={(x, y) => {
              // Центрування на клік в мінімапі
              const newX = -x + wrapperRef.current.clientWidth / 2;
              const newY = -y + wrapperRef.current.clientHeight / 2;
              wrapperRef.current.scrollTo(newX, newY);
            }}
          />
        )}
      </div>
      
      <StatusBar
        nodesCount={nodes.size}
        edgesCount={edges.size}
        selectedCount={selectedNodes.size + selectedEdges.size}
        isSimulating={isSimulating}
        zoom={zoom}
        position={mousePos}
        showInfo={() => setShowInfo(!showInfo)}
        showEditor={() => setShowEditor(!showEditor)}
        showMinimap={() => setShowMinimap(!showMinimap)}
      />
    </div>
  );
}