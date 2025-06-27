// src/renderer/core/Edge.js
// Клас з'єднання між вузлами

import { Subject, BehaviorSubject } from 'rxjs';
import { filter, map, throttleTime, debounceTime } from 'rxjs/operators';

export class Edge {
  constructor(id, sourceId, targetId, options = {}) {
    this.id = id;
    this.sourceId = sourceId;
    this.targetId = targetId;
    
    // Опції з'єднання
    this.options = {
      sourcePort: 'output',
      targetPort: 'input',
      throttle: null,        // Обмеження частоти передачі (мс)
      debounce: null,        // Затримка передачі (мс)
      filter: null,          // Функція фільтрації
      transform: null,       // Функція трансформації
      buffer: false,         // Буферизація значень
      bufferSize: 10,        // Розмір буфера
      ...options
    };
    
    // Стан з'єднання
    this.state$ = new BehaviorSubject({
      connected: false,
      dataFlow: 0,          // Кількість переданих даних
      lastTransmission: null,
      errors: 0
    });
    
    // Потік даних через з'єднання
    this.data$ = new Subject();
    
    // Підписка на передачу даних
    this.subscription = null;
    
    // Буфер для накопичення даних
    this.buffer = [];
    
    // Метрики
    this.metrics = {
      created: Date.now(),
      totalTransmissions: 0,
      totalDataSize: 0,
      averageLatency: 0,
      errors: []
    };
  }
  
  // Підключення до вузлів
  connect(sourceNode, targetNode) {
    if (this.subscription) {
      console.warn(`Edge ${this.id} already connected`);
      return false;
    }
    
    if (!sourceNode || !targetNode) {
      console.error(`Cannot connect edge ${this.id}: missing nodes`);
      return false;
    }
    
    try {
      // Створюємо pipeline з опціональними операторами
      let pipeline = sourceNode.output$;
      
      // Фільтрація
      if (this.options.filter) {
        pipeline = pipeline.pipe(
          filter(value => {
            try {
              return this.options.filter(value);
            } catch (error) {
              this.handleError('Filter error', error);
              return false;
            }
          })
        );
      }
      
      // Трансформація
      if (this.options.transform) {
        pipeline = pipeline.pipe(
          map(value => {
            try {
              return this.options.transform(value);
            } catch (error) {
              this.handleError('Transform error', error);
              return value; // Повертаємо оригінальне значення при помилці
            }
          })
        );
      }
      
      // Throttle
      if (this.options.throttle) {
        pipeline = pipeline.pipe(throttleTime(this.options.throttle));
      }
      
      // Debounce
      if (this.options.debounce) {
        pipeline = pipeline.pipe(debounceTime(this.options.debounce));
      }
      
      // Підписка на передачу даних
      this.subscription = pipeline.subscribe({
        next: value => this.transmit(value, targetNode),
        error: error => this.handleError('Transmission error', error),
        complete: () => this.handleComplete()
      });
      
      // Оновлення стану
      this.updateState({ connected: true });
      
      console.log(`Edge ${this.id} connected: ${this.sourceId} -> ${this.targetId}`);
      return true;
      
    } catch (error) {
      this.handleError('Connection error', error);
      return false;
    }
  }
  
  // Передача даних
  transmit(value, targetNode) {
    const startTime = performance.now();
    
    try {
      // Буферизація
      if (this.options.buffer) {
        this.buffer.push(value);
        
        if (this.buffer.length >= this.options.bufferSize) {
          // Передаємо весь буфер
          targetNode.input$.next([...this.buffer]);
          this.buffer = [];
        } else {
          // Ще накопичуємо
          return;
        }
      } else {
        // Звичайна передача
        targetNode.input$.next(value);
      }
      
      // Оновлення метрик
      const latency = performance.now() - startTime;
      this.updateMetrics(value, latency);
      
      // Emit для візуалізації
      this.data$.next(value);
      
    } catch (error) {
      this.handleError('Transmission failed', error);
    }
  }
  
  // Оновлення метрик
  updateMetrics(value, latency) {
    this.metrics.totalTransmissions++;
    
    // Розмір даних (приблизний)
    const dataSize = JSON.stringify(value).length;
    this.metrics.totalDataSize += dataSize;
    
    // Середня затримка
    this.metrics.averageLatency = 
      (this.metrics.averageLatency * (this.metrics.totalTransmissions - 1) + latency) / 
      this.metrics.totalTransmissions;
    
    // Оновлення стану
    this.updateState({
      dataFlow: this.metrics.totalTransmissions,
      lastTransmission: Date.now()
    });
  }
  
  // Від'єднання
  disconnect() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
      
      // Очищення буфера
      if (this.buffer.length > 0) {
        console.warn(`Edge ${this.id} disconnected with ${this.buffer.length} buffered items`);
        this.buffer = [];
      }
      
      this.updateState({ connected: false });
      console.log(`Edge ${this.id} disconnected`);
    }
  }
  
  // Обробка помилок
  handleError(message, error) {
    console.error(`Edge ${this.id} - ${message}:`, error);
    
    this.metrics.errors.push({
      timestamp: Date.now(),
      message,
      error: error.message
    });
    
    const currentState = this.state$.value;
    this.updateState({ errors: currentState.errors + 1 });
  }
  
  // Обробка завершення потоку
  handleComplete() {
    console.log(`Edge ${this.id} source completed`);
    this.disconnect();
  }
  
  // Оновлення стану
  updateState(updates) {
    const currentState = this.state$.value;
    this.state$.next({ ...currentState, ...updates });
  }
  
  // Оновлення опцій
  updateOptions(options) {
    this.options = { ...this.options, ...options };
    
    // Переподключення з новими опціями
    if (this.subscription) {
      const wasConnected = true;
      this.disconnect();
      // TODO: Потрібні посилання на вузли для переподключення
    }
  }
  
  // Серіалізація
  serialize() {
    return {
      id: this.id,
      sourceId: this.sourceId,
      targetId: this.targetId,
      options: { ...this.options },
      metrics: { ...this.metrics }
    };
  }
  
  // Десеріалізація
  static deserialize(serialized) {
    const edge = new Edge(
      serialized.id,
      serialized.sourceId,
      serialized.targetId,
      serialized.options
    );
    
    if (serialized.metrics) {
      edge.metrics = { ...edge.metrics, ...serialized.metrics };
    }
    
    return edge;
  }
  
  // Діагностика
  getDiagnostics() {
    return {
      id: this.id,
      connection: `${this.sourceId} -> ${this.targetId}`,
      state: this.state$.value,
      metrics: this.metrics,
      bufferSize: this.buffer.length,
      options: this.options
    };
  }
  
  // Очищення
  destroy() {
    this.disconnect();
    this.data$.complete();
    this.state$.complete();
  }
}