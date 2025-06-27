// src/renderer/nodes/ProcessNode.js
// Вузол обробки даних з підтримкою користувацького коду

import { CanvasNode } from '@core/Node.js';
import { NodeType } from '@core/constants.js';

export class ProcessNode extends CanvasNode {
  constructor(id, position, data = {}) {
    super(id, NodeType.PROCESS, position, {
      code: 'return input * 2;',
      async: false,
      timeout: 5000,
      ...data
    });
    
    this.compiledFunction = null;
    this.compileCode();
  }
  
  initialize() {
    super.initialize();
    
    // Підписка на вхідні дані
    this.input$.subscribe(value => {
      this.processInput(value);
    });
  }
  
  // Компіляція користувацького коду
  compileCode() {
    try {
      const code = this.data.code || 'return input;';
      
      // Створюємо безпечний контекст для виконання
      const safeCode = `
        'use strict';
        return (function(input, state, emit) {
          try {
            ${code}
          } catch (error) {
            throw new Error('Runtime error: ' + error.message);
          }
        });
      `;
      
      // Компілюємо функцію
      this.compiledFunction = new Function(safeCode)();
      
      // Оновлюємо стан
      this.state$.next({ 
        ...this.state$.value, 
        compiled: true, 
        error: null 
      });
      
    } catch (error) {
      this.compiledFunction = null;
      this.error$.next(new Error(`Compilation error: ${error.message}`));
      this.state$.next({ 
        ...this.state$.value, 
        compiled: false, 
        error: error.message 
      });
    }
  }
  
  // Обробка вхідних даних
  async processInput(input) {
    if (!this.compiledFunction) {
      this.error$.next(new Error('No compiled function'));
      return;
    }
    
    try {
      let result;
      
      // Створюємо контекст для виконання
      const context = {
        state: this.state$.value,
        emit: (value) => this.emit(value)
      };
      
      if (this.data.async) {
        // Асинхронне виконання з таймаутом
        result = await this.executeAsync(input, context);
      } else {
        // Синхронне виконання
        result = this.compiledFunction(input, context.state, context.emit);
      }
      
      // Оновлюємо стан і передаємо результат
      this.state$.next({ 
        ...this.state$.value, 
        lastInput: input, 
        lastOutput: result,
        error: null 
      });
      
      this.output$.next(result);
      
    } catch (error) {
      this.handleProcessError(error, input);
    }
  }
  
  // Асинхронне виконання з таймаутом
  executeAsync(input, context) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Execution timeout'));
      }, this.data.timeout);
      
      try {
        const result = this.compiledFunction(input, context.state, context.emit);
        
        // Обробка промісів
        if (result && typeof result.then === 'function') {
          result
            .then(value => {
              clearTimeout(timeoutId);
              resolve(value);
            })
            .catch(error => {
              clearTimeout(timeoutId);
              reject(error);
            });
        } else {
          clearTimeout(timeoutId);
          resolve(result);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }
  
  // Емісія проміжних значень
  emit(value) {
    // Можна використовувати для відправки проміжних результатів
    this.output$.next({ intermediate: true, value });
  }
  
  // Обробка помилок виконання
  handleProcessError(error, input) {
    const errorInfo = {
      message: error.message,
      input,
      timestamp: Date.now()
    };
    
    this.error$.next(error);
    this.state$.next({ 
      ...this.state$.value, 
      error: errorInfo,
      lastInput: input,
      lastOutput: null
    });
    
    // Передаємо помилку далі як спеціальний об'єкт
    this.output$.next({ error: errorInfo });
  }
  
  // Оновлення коду
  updateCode(newCode) {
    this.data.code = newCode;
    this.compileCode();
    
    // Якщо є останній вхід, перезапускаємо обробку
    const state = this.state$.value;
    if (state.lastInput !== undefined && state.compiled) {
      this.processInput(state.lastInput);
    }
  }
  
  // Валідація вхідних даних
  validateInput(input) {
    // Можна додати спеціальну валідацію
    if (this.data.validateInput) {
      try {
        const validator = new Function('input', this.data.validateInput);
        return validator(input);
      } catch (error) {
        this.error$.next(new Error(`Validation error: ${error.message}`));
        return false;
      }
    }
    return true;
  }
  
  // Серіалізація з додатковими полями
  serialize() {
    const base = super.serialize();
    return {
      ...base,
      compiled: !!this.compiledFunction
    };
  }
  
  // Десеріалізація
  static deserialize(data) {
    const node = new ProcessNode(data.id, data.position, data.data);
    
    if (data.state) {
      node.state$.next(data.state);
    }
    
    if (data.metadata) {
      node.metadata = { ...node.metadata, ...data.metadata };
    }
    
    return node;
  }
  
  // Приклади готових функцій
  static examples = {
    double: 'return input * 2;',
    square: 'return input * input;',
    stringify: 'return JSON.stringify(input, null, 2);',
    parse: 'return JSON.parse(input);',
    filter: 'return input > 0 ? input : null;',
    accumulate: `
      state.sum = (state.sum || 0) + input;
      return state.sum;
    `,
    async: `
      // Асинхронний приклад
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(input.toUpperCase());
        }, 1000);
      });
    `,
    batch: `
      // Накопичення пакету
      state.batch = state.batch || [];
      state.batch.push(input);
      
      if (state.batch.length >= 10) {
        const result = [...state.batch];
        state.batch = [];
        return result;
      }
      
      return null; // Не передаємо далі поки не накопичимо
    `
  };
}