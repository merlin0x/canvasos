// src/renderer/utils/geometry.js
// Утиліти для геометричних обчислень Canvas OS

// Обчислення відстані між двома точками
export function distance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Обчислення кута між двома точками (в радіанах)
export function angle(p1, p2) {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

// Обчислення кута в градусах
export function angleDegrees(p1, p2) {
  return angle(p1, p2) * (180 / Math.PI);
}

// Точка на лінії між двома точками (t від 0 до 1)
export function lerp(p1, p2, t) {
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t
  };
}

// Обчислення контрольних точок для кривої Безьє
export function bezierControlPoints(start, end, curvature = 0.5) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const offset = Math.min(100, distance * curvature);
  
  return {
    cp1: { x: start.x + offset, y: start.y },
    cp2: { x: end.x - offset, y: end.y }
  };
}

// Точка на кубічній кривій Безьє
export function cubicBezier(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
  };
}

// Перевірка чи точка знаходиться в прямокутнику
export function pointInRect(point, rect) {
  return point.x >= rect.x && 
         point.x <= rect.x + rect.width &&
         point.y >= rect.y && 
         point.y <= rect.y + rect.height;
}

// Перевірка чи точка знаходиться в колі
export function pointInCircle(point, center, radius) {
  return distance(point, center) <= radius;
}

// Перевірка перетину двох прямокутників
export function rectsIntersect(rect1, rect2) {
  return !(rect1.x + rect1.width < rect2.x ||
           rect2.x + rect2.width < rect1.x ||
           rect1.y + rect1.height < rect2.y ||
           rect2.y + rect2.height < rect1.y);
}

// Обчислення меж для набору точок
export function getBounds(points) {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  points.forEach(point => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

// Центр прямокутника
export function rectCenter(rect) {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2
  };
}

// Snap до сітки
export function snapToGrid(point, gridSize = 20) {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  };
}

// Обмеження точки межами
export function clampPoint(point, bounds) {
  return {
    x: Math.max(bounds.x, Math.min(bounds.x + bounds.width, point.x)),
    y: Math.max(bounds.y, Math.min(bounds.y + bounds.height, point.y))
  };
}

// Розрахунок позиції порта на вузлі
export function getPortPosition(nodeRect, portType, portIndex = 0, totalPorts = 1) {
  const spacing = nodeRect.height / (totalPorts + 1);
  const y = nodeRect.y + spacing * (portIndex + 1);
  
  if (portType === 'input') {
    return { x: nodeRect.x, y };
  } else {
    return { x: nodeRect.x + nodeRect.width, y };
  }
}

// Найближча точка на лінії до заданої точки
export function nearestPointOnLine(point, lineStart, lineEnd) {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const length2 = dx * dx + dy * dy;
  
  if (length2 === 0) return lineStart;
  
  let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / length2;
  t = Math.max(0, Math.min(1, t));
  
  return {
    x: lineStart.x + t * dx,
    y: lineStart.y + t * dy
  };
}

// Відстань від точки до лінії
export function distanceToLine(point, lineStart, lineEnd) {
  const nearest = nearestPointOnLine(point, lineStart, lineEnd);
  return distance(point, nearest);
}

// Чи точка біля кривої Безьє (спрощено)
export function isPointNearBezier(point, start, cp1, cp2, end, threshold = 10) {
  // Перевіряємо кілька точок на кривій
  for (let t = 0; t <= 1; t += 0.1) {
    const curvePoint = cubicBezier(start, cp1, cp2, end, t);
    if (distance(point, curvePoint) <= threshold) {
      return true;
    }
  }
  return false;
}

// Обчислення кутів для стрілки
export function getArrowPoints(end, angle, size = 10) {
  const arrowAngle = Math.PI / 6; // 30 градусів
  
  return [
    {
      x: end.x - size * Math.cos(angle - arrowAngle),
      y: end.y - size * Math.sin(angle - arrowAngle)
    },
    end,
    {
      x: end.x - size * Math.cos(angle + arrowAngle),
      y: end.y - size * Math.sin(angle + arrowAngle)
    }
  ];
}

// Перетворення координат
export function transformPoint(point, transform) {
  return {
    x: point.x * transform.scale + transform.translate.x,
    y: point.y * transform.scale + transform.translate.y
  };
}

// Зворотне перетворення координат
export function inverseTransformPoint(point, transform) {
  return {
    x: (point.x - transform.translate.x) / transform.scale,
    y: (point.y - transform.translate.y) / transform.scale
  };
}

// Вирівнювання точок
export function alignPoints(points, alignment) {
  if (points.length < 2) return points;
  
  const bounds = getBounds(points);
  
  switch (alignment) {
    case 'left':
      return points.map(p => ({ ...p, x: bounds.x }));
      
    case 'right':
      return points.map(p => ({ ...p, x: bounds.x + bounds.width }));
      
    case 'top':
      return points.map(p => ({ ...p, y: bounds.y }));
      
    case 'bottom':
      return points.map(p => ({ ...p, y: bounds.y + bounds.height }));
      
    case 'centerX':
      const centerX = bounds.x + bounds.width / 2;
      return points.map(p => ({ ...p, x: centerX }));
      
    case 'centerY':
      const centerY = bounds.y + bounds.height / 2;
      return points.map(p => ({ ...p, y: centerY }));
      
    default:
      return points;
  }
}

// Розподіл точок рівномірно
export function distributePoints(points, direction) {
  if (points.length < 3) return points;
  
  const sorted = [...points].sort((a, b) => 
    direction === 'horizontal' ? a.x - b.x : a.y - b.y
  );
  
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  
  if (direction === 'horizontal') {
    const spacing = (last.x - first.x) / (sorted.length - 1);
    return sorted.map((p, i) => ({ ...p, x: first.x + spacing * i }));
  } else {
    const spacing = (last.y - first.y) / (sorted.length - 1);
    return sorted.map((p, i) => ({ ...p, y: first.y + spacing * i }));
  }
}

// Масштабування набору точок
export function scalePoints(points, scaleFactor, origin = null) {
  if (!origin) {
    const bounds = getBounds(points);
    origin = rectCenter(bounds);
  }
  
  return points.map(point => ({
    x: origin.x + (point.x - origin.x) * scaleFactor,
    y: origin.y + (point.y - origin.y) * scaleFactor
  }));
}

// Обертання точки навколо центра
export function rotatePoint(point, center, angleRad) {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}

// Обертання набору точок
export function rotatePoints(points, angleRad, center = null) {
  if (!center) {
    const bounds = getBounds(points);
    center = rectCenter(bounds);
  }
  
  return points.map(point => rotatePoint(point, center, angleRad));
}

// Згладжування шляху (спрощений алгоритм)
export function smoothPath(points, tension = 0.5) {
  if (points.length < 3) return points;
  
  const result = [];
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    
    // Catmull-Rom spline
    for (let t = 0; t < 1; t += 0.1) {
      const t2 = t * t;
      const t3 = t2 * t;
      
      const v0 = (p2.x - p0.x) * tension;
      const v1 = (p3.x - p1.x) * tension;
      
      const x = p1.x + v0 * t + (3 * (p2.x - p1.x) - 2 * v0 - v1) * t2 + 
                (2 * (p1.x - p2.x) + v0 + v1) * t3;
      
      const v0y = (p2.y - p0.y) * tension;
      const v1y = (p3.y - p1.y) * tension;
      
      const y = p1.y + v0y * t + (3 * (p2.y - p1.y) - 2 * v0y - v1y) * t2 + 
                (2 * (p1.y - p2.y) + v0y + v1y) * t3;
      
      result.push({ x, y });
    }
  }
  
  result.push(points[points.length - 1]);
  return result;
}

// Перевірка опуклості полігона
export function isConvexPolygon(points) {
  if (points.length < 3) return false;
  
  let sign = null;
  
  for (let i = 0; i < points.length; i++) {
    const p0 = points[i];
    const p1 = points[(i + 1) % points.length];
    const p2 = points[(i + 2) % points.length];
    
    const cross = (p1.x - p0.x) * (p2.y - p1.y) - (p1.y - p0.y) * (p2.x - p1.x);
    const currentSign = Math.sign(cross);
    
    if (currentSign !== 0) {
      if (sign === null) {
        sign = currentSign;
      } else if (sign !== currentSign) {
        return false;
      }
    }
  }
  
  return true;
}

// Площа полігона
export function polygonArea(points) {
  let area = 0;
  
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  
  return Math.abs(area) / 2;
}

// Центроїд полігона
export function polygonCentroid(points) {
  let cx = 0, cy = 0;
  const area = polygonArea(points);
  
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const factor = points[i].x * points[j].y - points[j].x * points[i].y;
    cx += (points[i].x + points[j].x) * factor;
    cy += (points[i].y + points[j].y) * factor;
  }
  
  const scale = 1 / (6 * area);
  return {
    x: cx * scale,
    y: cy * scale
  };
}