// src/renderer/components/Edge.js
// React компонент для відображення з'єднання

import React, { memo, useMemo } from 'react';
import { EdgeConfig } from '@core/constants.js';

export const EdgeComponent = memo(({ 
  edge, 
  sourcePos, 
  targetPos, 
  selected, 
  animated,
  onClick 
}) => {
  // Обчислення шляху для кривої Безьє
  const path = useMemo(() => {
    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Адаптивний offset для кривої
    const offset = Math.min(EdgeConfig.CURVE_OFFSET, distance * 0.5);
    
    // Контрольні точки для кривої Безьє
    const cp1x = sourcePos.x + offset;
    const cp1y = sourcePos.y;
    const cp2x = targetPos.x - offset;
    const cp2y = targetPos.y;
    
    return `M ${sourcePos.x} ${sourcePos.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetPos.x} ${targetPos.y}`;
  }, [sourcePos, targetPos]);
  
  // Обчислення позиції для стрілки
  const arrowTransform = useMemo(() => {
    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    return `translate(${targetPos.x}, ${targetPos.y}) rotate(${angle})`;
  }, [sourcePos, targetPos]);
  
  // Обчислення позиції для мітки
  const labelPos = useMemo(() => {
    return {
      x: (sourcePos.x + targetPos.x) / 2,
      y: (sourcePos.y + targetPos.y) / 2
    };
  }, [sourcePos, targetPos]);
  
  // Обробка кліку
  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick(edge.id);
    }
  };
  
  const strokeColor = selected ? '#2196F3' : 
                     animated ? EdgeConfig.STROKE_COLOR_ACTIVE : 
                     EdgeConfig.STROKE_COLOR;
  
  const strokeWidth = selected ? 3 : EdgeConfig.STROKE_WIDTH;
  
  return (
    <g className="edge-group">
      {/* Невидима область для кліку */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
        onClick={handleClick}
      />
      
      {/* Основна лінія */}
      <path
        className={`edge-path ${animated ? 'animated' : ''} ${selected ? 'selected' : ''}`}
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={animated ? '5,5' : null}
      />
      
      {/* Стрілка */}
      <g transform={arrowTransform}>
        <path
          d={`M 0 0 L -${EdgeConfig.ARROW_SIZE} -${EdgeConfig.ARROW_SIZE/2} L -${EdgeConfig.ARROW_SIZE} ${EdgeConfig.ARROW_SIZE/2} Z`}
          fill={strokeColor}
        />
      </g>
      
      {/* Анімація потоку даних */}
      {animated && (
        <circle r="4" fill="#2196F3">
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path={path}
          />
        </circle>
      )}
      
      {/* Мітка з інформацією */}
      {selected && edge.state$.value.dataFlow > 0 && (
        <g transform={`translate(${labelPos.x}, ${labelPos.y})`}>
          <rect
            x="-30"
            y="-10"
            width="60"
            height="20"
            rx="3"
            fill="rgba(0, 0, 0, 0.8)"
            stroke={strokeColor}
            strokeWidth="1"
          />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="11"
            fontFamily="monospace"
          >
            {edge.state$.value.dataFlow}
          </text>
        </g>
      )}
      
      {/* Індикатор помилки */}
      {edge.state$.value.errors > 0 && (
        <g transform={`translate(${labelPos.x}, ${labelPos.y})`}>
          <circle
            r="8"
            fill="#f44336"
          />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="10"
            fontWeight="bold"
          >
            !
          </text>
        </g>
      )}
    </g>
  );
});

EdgeComponent.displayName = 'EdgeComponent';