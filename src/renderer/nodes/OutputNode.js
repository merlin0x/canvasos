// src/renderer/nodes/OutputNode.js
// Вузол виведення даних

import { CanvasNode } from '@core/Node.js';
import { NodeType } from '@core/constants.js';

export class OutputNode extends CanvasNode {
  constructor(id, position, data = {}) {
    super(id, NodeType.OUTPUT, position, {
      outputType: 'console', // console, file, clipboard, notification, custom
      format: 'json', // json, text, csv, binary
      prettify: true,
      timestamp: true,
      accumulate: false,
      maxAccumulation: 100,
      autoSave: false,
      fileName: 'output.json',
      ...data
    });
    
    this.accumulator = [];
    this.outputCount = 0;
  }
  
  initialize() {
    super.initialize();
    
    // Підписка на вхідні дані
    this.input$.subscribe(value => {
      this.handleOutput(value);
    });
  }
  
  // Обробка виведення
  handleOutput(value) {
    this.outputCount++;
    
    // Додавання мітки часу якщо потрібно
    const outputValue = this.data.timestamp ? {
      timestamp: new Date().toISOString(),
      value: value
    } : value;
    
    // Накопичення даних якщо увімкнено
    if (this.data.accumulate) {
      this.accumulator.push(outputValue);
      
      // Обмеження розміру накопичувача
      if (this.accumulator.length > this.data.maxAccumulation) {
        this.accumulator.shift();
      }
      
      // Виводимо весь накопичувач
      this.performOutput(this.accumulator);
    } else {
      // Виводимо одне значення
      this.performOutput(outputValue);
    }
    
    // Оновлення стану
    this.state$.next({
      ...outputValue,
      outputCount: this.outputCount,
      accumulatorSize: this.accumulator.length
    });
  }
  
  // Виконання виведення залежно від типу
  performOutput(data) {
    try {
      switch (this.data.outputType) {
        case 'console':
          this.outputToConsole(data);
          break;
          
        case 'file':
          this.outputToFile(data);
          break;
          
        case 'clipboard':
          this.outputToClipboard(data);
          break;
          
        case 'notification':
          this.outputToNotification(data);
          break;
          
        case 'websocket':
          this.outputToWebSocket(data);
          break;
          
        case 'http':
          this.outputToHTTP(data);
          break;
          
        case 'dom':
          this.outputToDOM(data);
          break;
          
        case 'custom':
          this.outputCustom(data);
          break;
          
        default:
          console.log('Output:', data);
      }
      
      // Емісія події успішного виведення
      this.output$.next({
        success: true,
        data: data,
        type: this.data.outputType,
        count: this.outputCount
      });
      
    } catch (error) {
      this.error$.next(error);
      this.output$.next({
        success: false,
        error: error.message,
        data: data
      });
    }
  }
  
  // Виведення в консоль
  outputToConsole(data) {
    const formatted = this.formatData(data);
    
    console.group(`[${this.id}] Output #${this.outputCount}`);
    console.log(formatted);
    console.groupEnd();
  }
  
  // Виведення у файл
  async outputToFile(data) {
    const formatted = this.formatData(data);
    
    if (window.canvasAPI && window.canvasAPI.file) {
      // Використання Electron API
      const result = await window.canvasAPI.file.save(
        this.data.fileName,
        formatted
      );
      
      if (!result.success) {
        throw new Error(result.error || 'File save failed');
      }
    } else {
      // Браузерне завантаження
      const blob = new Blob([formatted], { 
        type: this.getMimeType() 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.data.fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  }
  
  // Виведення в буфер обміну
  async outputToClipboard(data) {
    const formatted = this.formatData(data);
    
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(formatted);
    } else {
      // Fallback для старих браузерів
      const textarea = document.createElement('textarea');
      textarea.value = formatted;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }
  
  // Виведення як повідомлення
  outputToNotification(data) {
    const message = this.formatData(data, 'text').slice(0, 200);
    
    if (window.CanvasOS && window.CanvasOS.showNotification) {
      window.CanvasOS.showNotification('info', message);
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Canvas OS Output', {
        body: message,
        icon: '/icon.png'
      });
    } else {
      console.log('Notification:', message);
    }
  }
  
  // Виведення через WebSocket
  outputToWebSocket(data) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      const url = this.data.websocketUrl || 'ws://localhost:8080';
      this.websocket = new WebSocket(url);
      
      this.websocket.onopen = () => {
        this.websocket.send(this.formatData(data));
      };
      
      this.websocket.onerror = (error) => {
        this.error$.next(new Error('WebSocket error'));
      };
    } else {
      this.websocket.send(this.formatData(data));
    }
  }
  
  // Виведення через HTTP
  async outputToHTTP(data) {
    const url = this.data.httpUrl || 'http://localhost:3000/output';
    const method = this.data.httpMethod || 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': this.getContentType()
      },
      body: this.formatData(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
  }
  
  // Виведення в DOM
  outputToDOM(data) {
    const elementId = this.data.domElementId || 'canvas-output';
    const element = document.getElementById(elementId);
    
    if (element) {
      const formatted = this.formatData(data, 'html');
      
      if (this.data.appendMode) {
        element.innerHTML += formatted + '<br>';
        
        // Автопрокрутка
        if (this.data.autoScroll) {
          element.scrollTop = element.scrollHeight;
        }
      } else {
        element.innerHTML = formatted;
      }
    } else {
      console.warn(`DOM element #${elementId} not found`);
    }
  }
  
  // Користувацьке виведення
  outputCustom(data) {
    if (this.data.customFunction) {
      try {
        const fn = new Function('data', 'node', this.data.customFunction);
        fn(data, this);
      } catch (error) {
        this.error$.next(new Error('Custom output error: ' + error.message));
      }
    }
  }
  
  // Форматування даних
  formatData(data, format = null) {
    const fmt = format || this.data.format;
    
    switch (fmt) {
      case 'json':
        return this.data.prettify ? 
          JSON.stringify(data, null, 2) : 
          JSON.stringify(data);
          
      case 'text':
        if (typeof data === 'string') return data;
        if (typeof data === 'object') {
          return this.data.prettify ?
            this.objectToText(data, 0) :
            JSON.stringify(data);
        }
        return String(data);
        
      case 'csv':
        return this.toCSV(data);
        
      case 'xml':
        return this.toXML(data);
        
      case 'yaml':
        return this.toYAML(data);
        
      case 'html':
        return this.toHTML(data);
        
      case 'binary':
        return this.toBinary(data);
        
      default:
        return String(data);
    }
  }
  
  // Конвертація об'єкта в текст
  objectToText(obj, indent = 0) {
    const spaces = '  '.repeat(indent);
    let result = '';
    
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        result += `${spaces}[${index}]: ${this.objectToText(item, indent + 1)}\n`;
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          result += `${spaces}${key}:\n${this.objectToText(value, indent + 1)}`;
        } else {
          result += `${spaces}${key}: ${value}\n`;
        }
      });
    } else {
      result = String(obj);
    }
    
    return result;
  }
  
  // Конвертація в CSV
  toCSV(data) {
    if (!Array.isArray(data)) {
      data = [data];
    }
    
    if (data.length === 0) return '';
    
    // Визначення заголовків
    const headers = new Set();
    data.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(key => headers.add(key));
      }
    });
    
    const headerArray = Array.from(headers);
    let csv = headerArray.join(',') + '\n';
    
    // Дані
    data.forEach(item => {
      const row = headerArray.map(header => {
        const value = item[header] !== undefined ? item[header] : '';
        // Екранування коми та лапок
        return typeof value === 'string' && value.includes(',') ?
          `"${value.replace(/"/g, '""')}"` : value;
      });
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }
  
  // Конвертація в XML (спрощена)
  toXML(data, rootName = 'root') {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<${rootName}>\n`;
    xml += this.objectToXML(data, 1);
    xml += `</${rootName}>`;
    return xml;
  }
  
  objectToXML(obj, indent = 0) {
    const spaces = '  '.repeat(indent);
    let xml = '';
    
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        xml += `${spaces}<item index="${index}">\n`;
        xml += this.objectToXML(item, indent + 1);
        xml += `${spaces}</item>\n`;
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
        if (typeof value === 'object' && value !== null) {
          xml += `${spaces}<${safeKey}>\n`;
          xml += this.objectToXML(value, indent + 1);
          xml += `${spaces}</${safeKey}>\n`;
        } else {
          xml += `${spaces}<${safeKey}>${this.escapeXML(value)}</${safeKey}>\n`;
        }
      });
    } else {
      xml += `${spaces}${this.escapeXML(obj)}\n`;
    }
    
    return xml;
  }
  
  escapeXML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  
  // Конвертація в YAML (спрощена)
  toYAML(data) {
    return this.objectToYAML(data, 0);
  }
  
  objectToYAML(obj, indent = 0) {
    const spaces = '  '.repeat(indent);
    let yaml = '';
    
    if (Array.isArray(obj)) {
      obj.forEach(item => {
        yaml += `${spaces}- `;
        if (typeof item === 'object' && item !== null) {
          yaml += '\n' + this.objectToYAML(item, indent + 1);
        } else {
          yaml += `${item}\n`;
        }
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        yaml += `${spaces}${key}: `;
        if (typeof value === 'object' && value !== null) {
          yaml += '\n' + this.objectToYAML(value, indent + 1);
        } else {
          yaml += `${value}\n`;
        }
      });
    } else {
      yaml = String(obj);
    }
    
    return yaml;
  }
  
  // Конвертація в HTML
  toHTML(data) {
    if (typeof data === 'string') {
      return `<pre>${this.escapeHTML(data)}</pre>`;
    }
    
    return `<pre class="json-output">${this.escapeHTML(
      JSON.stringify(data, null, 2)
    )}</pre>`;
  }
  
  escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  // Конвертація в бінарний формат (Base64)
  toBinary(data) {
    const str = JSON.stringify(data);
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      (match, p1) => String.fromCharCode('0x' + p1)));
  }
  
  // Отримання MIME типу
  getMimeType() {
    const mimeTypes = {
      json: 'application/json',
      text: 'text/plain',
      csv: 'text/csv',
      xml: 'application/xml',
      yaml: 'application/x-yaml',
      html: 'text/html',
      binary: 'application/octet-stream'
    };
    
    return mimeTypes[this.data.format] || 'text/plain';
  }
  
  // Отримання Content-Type
  getContentType() {
    return this.getMimeType() + '; charset=utf-8';
  }
  
  // Очищення накопичувача
  clearAccumulator() {
    this.accumulator = [];
    this.updateState();
  }
  
  // Експорт накопичених даних
  exportAccumulator() {
    return this.data.accumulate ? [...this.accumulator] : [];
  }
  
  // Оновлення стану
  updateState() {
    this.state$.next({
      outputCount: this.outputCount,
      accumulatorSize: this.accumulator.length,
      lastOutput: this.accumulator.length > 0 ? 
        this.accumulator[this.accumulator.length - 1] : null
    });
  }
  
  // Очищення ресурсів
  destroy() {
    if (this.websocket) {
      this.websocket.close();
    }
    super.destroy();
  }
}