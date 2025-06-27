// src/renderer/nodes/FilterNode.js
// Вузол фільтрації даних

import { CanvasNode } from '../core/Node.js';
import { NodeType } from '../core/constants.js';

export class FilterNode extends CanvasNode {
  constructor(id, position, data = {}) {
    super(id, NodeType.FILTER, position, {
      filterType: 'pass', // pass, block, range, condition, custom
      condition: '> 0',
      min: 0,
      max: 100,
      passNull: false,
      passUndefined: false,
      customCode: 'return value > 0;',
      invertFilter: false,
      ...data
    });
    
    this.compiledCondition = null;
    this.passedCount = 0;
    this.blockedCount = 0;
    
    this.compileCondition();
  }
  
  initialize() {
    super.initialize();
    
    // Підписка на вхідні дані
    this.input$.subscribe(value => {
      this.filterValue(value);
    });
  }
  
  // Компіляція умови фільтрації
  compileCondition() {
    try {
      if (this.data.filterType === 'custom') {
        // Користувацький код
        const code = `
          'use strict';
          return (function(value, index, state) {
            try {
              ${this.data.customCode}
            } catch (error) {
              throw new Error('Filter error: ' + error.message);
            }
          });
        `;
        this.compiledCondition = new Function(code)();
      } else if (this.data.filterType === 'condition') {
        // Проста умова
        const condition = this.data.condition || 'true';
        const code = `
          'use strict';
          return (function(value) {
            try {
              return value ${condition};
            } catch (error) {
              return false;
            }
          });
        `;
        this.compiledCondition = new Function(code)();
      }
      
      this.state$.next({ 
        ...this.state$.value, 
        compiled: true, 
        error: null 
      });
      
    } catch (error) {
      this.compiledCondition = null;
      this.error$.next(new Error(`Compilation error: ${error.message}`));
      this.state$.next({ 
        ...this.state$.value, 
        compiled: false, 
        error: error.message 
      });
    }
  }
  
  // Фільтрація значення
  filterValue(value) {
    let shouldPass = false;
    
    // Перевірка null/undefined
    if (value === null) {
      shouldPass = this.data.passNull;
    } else if (value === undefined) {
      shouldPass = this.data.passUndefined;
    } else {
      // Застосування фільтра залежно від типу
      switch (this.data.filterType) {
        case 'pass':
          shouldPass = true;
          break;
          
        case 'block':
          shouldPass = false;
          break;
          
        case 'range':
          if (typeof value === 'number') {
            shouldPass = value >= this.data.min && value <= this.data.max;
          } else if (Array.isArray(value)) {
            shouldPass = value.length >= this.data.min && value.length <= this.data.max;
          } else if (typeof value === 'string') {
            shouldPass = value.length >= this.data.min && value.length <= this.data.max;
          } else {
            shouldPass = false;
          }
          break;
          
        case 'condition':
          if (this.compiledCondition) {
            try {
              shouldPass = this.compiledCondition(value);
            } catch (error) {
              this.error$.next(error);
              shouldPass = false;
            }
          }
          break;
          
        case 'custom':
          if (this.compiledCondition) {
            try {
              const index = this.passedCount + this.blockedCount;
              shouldPass = this.compiledCondition(value, index, this.state$.value);
            } catch (error) {
              this.error$.next(error);
              shouldPass = false;
            }
          }
          break;
          
        case 'type':
          shouldPass = this.checkType(value);
          break;
          
        case 'pattern':
          shouldPass = this.checkPattern(value);
          break;
          
        case 'unique':
          shouldPass = this.checkUnique(value);
          break;
          
        default:
          shouldPass = true;
      }
    }
    
    // Інвертування результату якщо потрібно
    if (this.data.invertFilter) {
      shouldPass = !shouldPass;
    }
    
    // Оновлення статистики
    if (shouldPass) {
      this.passedCount++;
      this.output$.next(value);
    } else {
      this.blockedCount++;
    }
    
    // Оновлення стану
    this.updateState(value, shouldPass);
  }
  
  // Перевірка типу
  checkType(value) {
    const allowedTypes = this.data.allowedTypes || ['number', 'string'];
    const valueType = Array.isArray(value) ? 'array' : typeof value;
    return allowedTypes.includes(valueType);
  }
  
  // Перевірка за патерном
  checkPattern(value) {
    if (typeof value !== 'string') return false;
    
    try {
      const pattern = new RegExp(this.data.pattern || '.*');
      return pattern.test(value);
    } catch (error) {
      this.error$.next(error);
      return false;
    }
  }
  
  // Перевірка унікальності
  checkUnique(value) {
    const history = this.state$.value.history || [];
    const key = this.data.uniqueKey ? value[this.data.uniqueKey] : value;
    const serializedKey = JSON.stringify(key);
    
    if (history.includes(serializedKey)) {
      return false;
    }
    
    // Зберігаємо в історії
    history.push(serializedKey);
    if (history.length > 1000) {
      history.shift(); // Обмежуємо розмір історії
    }
    
    this.state$.next({
      ...this.state$.value,
      history
    });
    
    return true;
  }
  
  // Оновлення стану
  updateState(value, passed) {
    const totalCount = this.passedCount + this.blockedCount;
    const passRate = totalCount > 0 ? this.passedCount / totalCount : 0;
    
    this.state$.next({
      ...this.state$.value,
      lastValue: value,
      lastPassed: passed,
      statistics: {
        passed: this.passedCount,
        blocked: this.blockedCount,
        total: totalCount,
        passRate: passRate,
        blockRate: 1 - passRate
      }
    });
  }
  
  // Оновлення конфігурації
  updateConfig(config) {
    this.data = { ...this.data, ...config };
    
    if ('condition' in config || 'customCode' in config || 'filterType' in config) {
      this.compileCondition();
    }
  }
  
  // Скидання статистики
  resetStatistics() {
    this.passedCount = 0;
    this.blockedCount = 0;
    this.updateState(null, null);
  }
  
  // Серіалізація
  serialize() {
    const base = super.serialize();
    return {
      ...base,
      statistics: this.state$.value.statistics || {}
    };
  }
  
  // Приклади фільтрів
  static presets = {
    positive: {
      filterType: 'condition',
      condition: '> 0',
      description: 'Пропускає тільки додатні числа'
    },
    negative: {
      filterType: 'condition',
      condition: '< 0',
      description: 'Пропускає тільки від\'ємні числа'
    },
    even: {
      filterType: 'custom',
      customCode: 'return typeof value === "number" && value % 2 === 0;',
      description: 'Пропускає тільки парні числа'
    },
    odd: {
      filterType: 'custom',
      customCode: 'return typeof value === "number" && value % 2 !== 0;',
      description: 'Пропускає тільки непарні числа'
    },
    inRange: {
      filterType: 'range',
      min: 0,
      max: 100,
      description: 'Пропускає значення в діапазоні'
    },
    nonEmpty: {
      filterType: 'custom',
      customCode: `
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.length > 0;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return true;
      `,
      description: 'Пропускає тільки непорожні значення'
    },
    email: {
      filterType: 'pattern',
      pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$',
      description: 'Пропускає тільки email адреси'
    },
    unique: {
      filterType: 'unique',
      description: 'Пропускає тільки унікальні значення'
    },
    throttle: {
      filterType: 'custom',
      customCode: `
        // Пропускає кожне N-те значення
        const n = state.throttleN || 10;
        return index % n === 0;
      `,
      description: 'Прорідження потоку даних'
    },
    debounce: {
      filterType: 'custom',
      customCode: `
        // Пропускає якщо значення не змінювалось
        const lastValue = state.lastDebounceValue;
        const changed = JSON.stringify(value) !== JSON.stringify(lastValue);
        if (changed) {
          state.lastDebounceValue = value;
        }
        return changed;
      `,
      description: 'Пропускає тільки змінені значення'
    }
  };
}