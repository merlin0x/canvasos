// src/renderer/core/Node.js
// Базовий клас вузла Canvas OS

import { Subject, BehaviorSubject } from 'rxjs';
import { NodeType } from './constants.js';

export class CanvasNode {
  constructor(id, type, position, data = {}) {
    this.id = id;
    this.type = type;
    this.position = { ...position };
    this.data = { ...data };
    
    // RxJS потоки
    this.input$ = new Subject();
    this.output$ = new Subject();
    this.state$ = new BehaviorSubject(data.initialState || null);
    this.error$ = new Subject();
    
    // Метадані
    this.metadata = {
      created: Date.now(),
      updated: Date.now(),
      executionCount: 0,
      lastExecutionTime: null,
      averageExecutionTime: 0
    };
    
    // Підписки
    this.subscriptions = [];
    
    // Ініціалізація
    this.initialize();
  }
  
  initialize() {
    // Базова ініціалізація - перевизначається в підкласах
    this.setupErrorHandling();
  }
  
  setupErrorHandling() {
    // Глобальна обробка помилок
    this.error$.subscribe(error => {
      console.error(`Node ${this.id} error:`, error);
      this.state$.next({ error: error.message });
    });
  }
  
  // Виконання обробки
  process(input) {
    const startTime = performance.now();
    
    try {
      this.metadata.executionCount++;
      
      // Базова обробка - перевизначається в підкласах
      const result = this.transform(input);
      
      // Оновлення метрик
      const executionTime = performance.now() - startTime;
      this.updateMetrics(executionTime);
      
      return result;
    } catch (error) {
      this.error$.next(error);
      throw error;
    }
  }
  
  // Трансформація даних (перевизначається в підкласах)
  transform(input) {
    return input;
  }
  
  // Оновлення метрик продуктивності
  updateMetrics(executionTime) {
    this.metadata.lastExecutionTime = executionTime;
    this.metadata.averageExecutionTime = 
      (this.metadata.averageExecutionTime * (this.metadata.executionCount - 1) + executionTime) / 
      this.metadata.executionCount;
    this.metadata.updated = Date.now();
  }
  
  // Підключення вхідного потоку
  connectInput(observable) {
    const subscription = observable.subscribe({
      next: value => this.handleInput(value),
      error: error => this.error$.next(error),
      complete: () => console.log(`Input completed for node ${this.id}`)
    });
    
    this.subscriptions.push(subscription);
    return subscription;
  }
  
  // Обробка вхідних даних
  handleInput(value) {
    try {
      const result = this.process(value);
      this.state$.next(result);
      this.output$.next(result);
    } catch (error) {
      this.error$.next(error);
    }
  }
  
  // Оновлення позиції
  setPosition(x, y) {
    this.position.x = x;
    this.position.y = y;
    this.metadata.updated = Date.now();
  }
  
  // Оновлення даних
  updateData(data) {
    this.data = { ...this.data, ...data };
    this.metadata.updated = Date.now();
  }
  
  // Валідація вхідних даних
  validateInput(input) {
    // Базова валідація - перевизначається в підкласах
    return true;
  }
  
  // Серіалізація для збереження
  serialize() {
    return {
      id: this.id,
      type: this.type,
      position: { ...this.position },
      data: { ...this.data },
      state: this.state$.value,
      metadata: { ...this.metadata }
    };
  }
  
  // Десеріалізація
  static deserialize(serialized) {
    const node = new CanvasNode(
      serialized.id,
      serialized.type,
      serialized.position,
      serialized.data
    );
    
    if (serialized.state !== undefined) {
      node.state$.next(serialized.state);
    }
    
    if (serialized.metadata) {
      node.metadata = { ...node.metadata, ...serialized.metadata };
    }
    
    return node;
  }
  
  // Клонування вузла
  clone(newId = null) {
    const id = newId || `${this.id}-clone-${Date.now()}`;
    const clone = new CanvasNode(id, this.type, { ...this.position }, { ...this.data });
    clone.state$.next(this.state$.value);
    return clone;
  }
  
  // Очищення ресурсів
  destroy() {
    // Відписка від всіх підписок
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    
    // Завершення потоків
    this.input$.complete();
    this.output$.complete();
    this.state$.complete();
    this.error$.complete();
    
    console.log(`Node ${this.id} destroyed`);
  }
  
  // Діагностична інформація
  getDiagnostics() {
    return {
      id: this.id,
      type: this.type,
      state: this.state$.value,
      metadata: this.metadata,
      hasError: !!this.state$.value?.error,
      subscriptionsCount: this.subscriptions.length
    };
  }
}