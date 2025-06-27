// src/renderer/nodes/VisualizerNode.js
// Вузол візуалізації даних

import { CanvasNode } from '../core/Node.js';
import { NodeType } from '../core/constants.js';

export class VisualizerNode extends CanvasNode {
  constructor(id, position, data = {}) {
    super(id, NodeType.VISUALIZER, position, {
      visualType: 'bars', // bars, line, scatter, heatmap, text
      maxValues: 50,
      color: '#2196F3',
      showValues: true,
      autoScale: true,
      min: 0,
      max: 100,
      ...data
    });
    
    this.values = [];
    this.canvas = null;
    this.ctx = null;
  }
  
  initialize() {
    super.initialize();
    
    // Підписка на вхідні дані
    this.input$.subscribe(value => {
      this.addValue(value);
      this.updateVisualization();
    });
  }
  
  // Додавання нового значення
  addValue(value) {
    const timestamp = Date.now();
    
    // Нормалізація значення
    let normalizedValue = value;
    if (typeof value === 'object' && value !== null) {
      // Для об'єктів беремо певне поле або довжину
      normalizedValue = value.value || value.length || Object.keys(value).length;
    }
    
    this.values.push({
      value: normalizedValue,
      originalValue: value,
      timestamp
    });
    
    // Обмеження кількості значень
    if (this.values.length > this.data.maxValues) {
      this.values.shift();
    }
    
    // Автомасштабування
    if (this.data.autoScale && this.values.length > 0) {
      const numbers = this.values
        .map(v => typeof v.value === 'number' ? v.value : 0)
        .filter(v => !isNaN(v));
      
      if (numbers.length > 0) {
        this.data.min = Math.min(...numbers);
        this.data.max = Math.max(...numbers);
      }
    }
    
    // Оновлення стану
    this.state$.next([...this.values]);
  }
  
  // Оновлення візуалізації
  updateVisualization() {
    if (!this.canvas || !this.ctx) return;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Очищення канви
    this.ctx.clearRect(0, 0, width, height);
    
    switch (this.data.visualType) {
      case 'bars':
        this.drawBars();
        break;
      case 'line':
        this.drawLine();
        break;
      case 'scatter':
        this.drawScatter();
        break;
      case 'heatmap':
        this.drawHeatmap();
        break;
      case 'text':
        this.drawText();
        break;
      default:
        this.drawBars();
    }
  }
  
  // Візуалізація стовпчиками
  drawBars() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const barWidth = width / this.data.maxValues;
    const range = this.data.max - this.data.min || 1;
    
    this.ctx.fillStyle = this.data.color;
    
    this.values.forEach((item, index) => {
      if (typeof item.value === 'number') {
        const barHeight = ((item.value - this.data.min) / range) * height;
        const x = index * barWidth;
        const y = height - barHeight;
        
        this.ctx.fillRect(x, y, barWidth - 1, barHeight);
        
        // Значення над стовпчиком
        if (this.data.showValues && barWidth > 20) {
          this.ctx.fillStyle = '#fff';
          this.ctx.font = '10px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(
            item.value.toFixed(1), 
            x + barWidth / 2, 
            y - 5
          );
          this.ctx.fillStyle = this.data.color;
        }
      }
    });
  }
  
  // Візуалізація лінією
  drawLine() {
    if (this.values.length < 2) return;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    const stepX = width / (this.data.maxValues - 1);
    const range = this.data.max - this.data.min || 1;
    
    this.ctx.strokeStyle = this.data.color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    
    this.values.forEach((item, index) => {
      if (typeof item.value === 'number') {
        const x = index * stepX;
        const y = height - ((item.value - this.data.min) / range) * height;
        
        if (index === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
    });
    
    this.ctx.stroke();
    
    // Точки
    this.ctx.fillStyle = this.data.color;
    this.values.forEach((item, index) => {
      if (typeof item.value === 'number') {
        const x = index * stepX;
        const y = height - ((item.value - this.data.min) / range) * height;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
  }
  
  // Візуалізація точками
  drawScatter() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const range = this.data.max - this.data.min || 1;
    
    this.ctx.fillStyle = this.data.color;
    
    this.values.forEach((item, index) => {
      if (typeof item.value === 'number') {
        const x = (index / this.values.length) * width;
        const y = height - ((item.value - this.data.min) / range) * height;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, 4, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
  }
  
  // Візуалізація теплокартою
  drawHeatmap() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const cellWidth = width / this.data.maxValues;
    const cellHeight = height / 10;
    
    this.values.forEach((item, index) => {
      if (typeof item.value === 'number') {
        const intensity = (item.value - this.data.min) / (this.data.max - this.data.min || 1);
        const hue = (1 - intensity) * 240; // Від синього до червоного
        
        for (let row = 0; row < 10; row++) {
          this.ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
          this.ctx.fillRect(
            index * cellWidth,
            row * cellHeight,
            cellWidth - 1,
            cellHeight - 1
          );
        }
      }
    });
  }
  
  // Візуалізація текстом
  drawText() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '12px monospace';
    
    const recentValues = this.values.slice(-10);
    recentValues.forEach((item, index) => {
      const y = 20 + index * 15;
      const text = this.formatValue(item.originalValue);
      this.ctx.fillText(text, 10, y);
    });
  }
  
  // Форматування значення для відображення
  formatValue(value) {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'number') return value.toFixed(2);
    if (typeof value === 'string') return value.slice(0, 30);
    if (typeof value === 'object') return JSON.stringify(value).slice(0, 30);
    return String(value).slice(0, 30);
  }
  
  // Встановлення канви для рендеру
  setCanvas(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.updateVisualization();
  }
  
  // Очищення історії значень
  clearValues() {
    this.values = [];
    this.state$.next([]);
    if (this.canvas && this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
  
  // Експорт даних
  exportData(format = 'json') {
    switch (format) {
      case 'json':
        return JSON.stringify(this.values, null, 2);
        
      case 'csv':
        const header = 'timestamp,value\n';
        const rows = this.values.map(item => 
          `${item.timestamp},${item.value}`
        ).join('\n');
        return header + rows;
        
      case 'array':
        return this.values.map(item => item.value);
        
      default:
        return this.values;
    }
  }
  
  // Статистика
  getStatistics() {
    const numbers = this.values
      .map(v => v.value)
      .filter(v => typeof v === 'number');
    
    if (numbers.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0, sum: 0 };
    }
    
    const sum = numbers.reduce((a, b) => a + b, 0);
    const avg = sum / numbers.length;
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    
    return {
      count: numbers.length,
      min,
      max,
      avg,
      sum,
      stdDev: Math.sqrt(
        numbers.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / numbers.length
      )
    };
  }
  
  // Серіалізація
  serialize() {
    const base = super.serialize();
    return {
      ...base,
      values: this.values.slice(-10), // Зберігаємо тільки останні 10 значень
      statistics: this.getStatistics()
    };
  }
}