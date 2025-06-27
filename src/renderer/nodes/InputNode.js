// src/renderer/nodes/InputNode.js
// Вузол введення даних

import { CanvasNode } from '@core/Node.js';
import { NodeType } from '@core/constants.js';
import { interval, fromEvent, merge } from 'rxjs';
import { map, throttleTime } from 'rxjs/operators';

export class InputNode extends CanvasNode {
  constructor(id, position, data = {}) {
    super(id, NodeType.INPUT, position, {
      inputType: 'manual', // manual, timer, random, file, sensor
      interval: 1000,
      min: 0,
      max: 100,
      ...data
    });
    
    this.generator = null;
  }
  
  initialize() {
    super.initialize();
    
    // Запуск генератора залежно від типу
    this.setupGenerator();
  }
  
  setupGenerator() {
    // Зупинка попереднього генератора
    this.stopGenerator();
    
    switch (this.data.inputType) {
      case 'manual':
        // Ручне введення - чекаємо на оновлення стану
        this.state$.subscribe(value => {
          if (value !== null && value !== undefined) {
            this.output$.next(value);
          }
        });
        break;
        
      case 'timer':
        // Таймер - генерує інкрементні значення
        this.generator = interval(this.data.interval).subscribe(i => {
          const value = i;
          this.state$.next(value);
          this.output$.next(value);
        });
        break;
        
      case 'random':
        // Випадкові числа
        this.generator = interval(this.data.interval).subscribe(() => {
          const value = Math.random() * (this.data.max - this.data.min) + this.data.min;
          this.state$.next(value);
          this.output$.next(value);
        });
        break;
        
      case 'sine':
        // Синусоїда
        let phase = 0;
        this.generator = interval(this.data.interval).subscribe(() => {
          const value = Math.sin(phase) * (this.data.max - this.data.min) / 2 + 
                       (this.data.max + this.data.min) / 2;
          phase += 0.1;
          this.state$.next(value);
          this.output$.next(value);
        });
        break;
        
      case 'noise':
        // Шум Перліна (спрощений)
        this.generator = interval(this.data.interval).subscribe(() => {
          const value = this.perlinNoise(Date.now() / 10000) * 
                       (this.data.max - this.data.min) + this.data.min;
          this.state$.next(value);
          this.output$.next(value);
        });
        break;
        
      case 'mouse':
        // Позиція миші
        this.generator = fromEvent(document, 'mousemove')
          .pipe(throttleTime(this.data.interval))
          .subscribe(event => {
            const value = { x: event.clientX, y: event.clientY };
            this.state$.next(value);
            this.output$.next(value);
          });
        break;
        
      case 'keyboard':
        // Клавіатурні події
        this.generator = merge(
          fromEvent(document, 'keydown').pipe(map(e => ({ type: 'down', key: e.key }))),
          fromEvent(document, 'keyup').pipe(map(e => ({ type: 'up', key: e.key })))
        ).subscribe(value => {
          this.state$.next(value);
          this.output$.next(value);
        });
        break;
        
      case 'time':
        // Поточний час
        this.generator = interval(this.data.interval).subscribe(() => {
          const value = {
            timestamp: Date.now(),
            date: new Date().toISOString(),
            time: new Date().toLocaleTimeString()
          };
          this.state$.next(value);
          this.output$.next(value);
        });
        break;
        
      case 'sequence':
        // Послідовність значень
        const sequence = this.data.sequence || [1, 2, 3, 4, 5];
        let index = 0;
        this.generator = interval(this.data.interval).subscribe(() => {
          const value = sequence[index % sequence.length];
          index++;
          this.state$.next(value);
          this.output$.next(value);
        });
        break;
    }
  }
  
  // Спрощений шум Перліна
  perlinNoise(x) {
    const p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (t, a, b) => a + t * (b - a);
    const grad = (hash, x) => {
      const h = hash & 15;
      const grad = 1 + (h & 7);
      return (h & 8) ? -grad * x : grad * x;
    };
    
    const X = Math.floor(x) & 255;
    const xf = x - Math.floor(x);
    const u = fade(xf);
    
    const a = p[X];
    const b = p[X + 1];
    
    return lerp(u, grad(p[a], xf), grad(p[b], xf - 1));
  }
  
  // Оновлення конфігурації
  updateConfig(config) {
    this.data = { ...this.data, ...config };
    this.setupGenerator();
  }
  
  // Зупинка генератора
  stopGenerator() {
    if (this.generator) {
      this.generator.unsubscribe();
      this.generator = null;
    }
  }
  
  // Ручне введення значення
  setValue(value) {
    if (this.data.inputType === 'manual') {
      this.state$.next(value);
      this.output$.next(value);
    }
  }
  
  // Очищення
  destroy() {
    this.stopGenerator();
    super.destroy();
  }
  
  // Серіалізація
  serialize() {
    const base = super.serialize();
    return {
      ...base,
      generatorActive: !!this.generator
    };
  }
  
  // Приклади конфігурацій
  static presets = {
    counter: {
      inputType: 'timer',
      interval: 1000
    },
    random: {
      inputType: 'random',
      interval: 500,
      min: 0,
      max: 100
    },
    sine: {
      inputType: 'sine',
      interval: 50,
      min: -1,
      max: 1
    },
    mouse: {
      inputType: 'mouse',
      interval: 100
    },
    clock: {
      inputType: 'time',
      interval: 1000
    },
    fibonacci: {
      inputType: 'sequence',
      interval: 1000,
      sequence: [1, 1, 2, 3, 5, 8, 13, 21, 34, 55]
    }
  };
}