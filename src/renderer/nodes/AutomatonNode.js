// src/renderer/nodes/AutomatonNode.js
// Вузол клітинного автомата

import { CanvasNode } from '@core/Node.js';
import { NodeType } from '@core/constants.js';
import { interval } from 'rxjs';

export class AutomatonNode extends CanvasNode {
  constructor(id, position, data = {}) {
    super(id, NodeType.AUTOMATON, position, {
      automatonType: 'elementary', // elementary, life, custom
      rule: 30, // Для елементарних автоматів
      width: 50,
      height: 50,
      wrap: true, // Тороїдальна топологія
      stepInterval: 100, // мс між кроками
      autoRun: false,
      colorAlive: '#4CAF50',
      colorDead: '#333333',
      ...data
    });
    
    this.grid = null;
    this.generation = 0;
    this.runner = null;
    this.history = [];
    
    this.initializeGrid();
  }
  
  initialize() {
    super.initialize();
    
    // Підписка на вхідні дані для модифікації стану
    this.input$.subscribe(value => {
      this.handleInput(value);
    });
    
    // Автозапуск якщо потрібно
    if (this.data.autoRun) {
      this.start();
    }
  }
  
  // Ініціалізація сітки
  initializeGrid() {
    if (this.data.automatonType === 'elementary') {
      // 1D елементарний автомат
      this.grid = Array(this.data.width).fill(0);
      this.grid[Math.floor(this.data.width / 2)] = 1;
      this.history = [this.grid.slice()];
    } else {
      // 2D автомат (Game of Life, etc)
      this.grid = Array(this.data.height).fill(null)
        .map(() => Array(this.data.width).fill(0));
      
      // Випадкова ініціалізація для 2D
      if (this.data.automatonType === 'life') {
        this.randomize(0.3);
      }
    }
    
    this.generation = 0;
    this.updateState();
  }
  
  // Обробка вхідних даних
  handleInput(value) {
    if (typeof value === 'number') {
      // Число - змінити правило або щільність
      if (this.data.automatonType === 'elementary') {
        this.data.rule = Math.floor(value) % 256;
      } else {
        this.randomize(value / 100);
      }
    } else if (Array.isArray(value)) {
      // Масив - нова конфігурація
      if (this.data.automatonType === 'elementary' && value.length === this.data.width) {
        this.grid = value.slice();
      } else if (value.length === this.data.height && 
                 Array.isArray(value[0]) && 
                 value[0].length === this.data.width) {
        this.grid = value.map(row => row.slice());
      }
      this.updateState();
    } else if (typeof value === 'object' && value.command) {
      // Команди
      this.handleCommand(value);
    }
  }
  
  // Обробка команд
  handleCommand(cmd) {
    switch (cmd.command) {
      case 'start':
        this.start();
        break;
      case 'stop':
        this.stop();
        break;
      case 'step':
        this.step();
        break;
      case 'reset':
        this.initializeGrid();
        break;
      case 'randomize':
        this.randomize(cmd.density || 0.3);
        break;
      case 'pattern':
        this.loadPattern(cmd.pattern);
        break;
      case 'setCell':
        if (cmd.x !== undefined && cmd.y !== undefined) {
          this.setCell(cmd.x, cmd.y, cmd.value || 1);
        }
        break;
    }
  }
  
  // Крок симуляції
  step() {
    if (this.data.automatonType === 'elementary') {
      this.stepElementary();
    } else if (this.data.automatonType === 'life') {
      this.stepLife();
    } else if (this.data.automatonType === 'custom') {
      this.stepCustom();
    }
    
    this.generation++;
    this.updateState();
    
    // Відправка результату
    this.output$.next({
      grid: this.grid,
      generation: this.generation,
      population: this.getPopulation()
    });
  }
  
  // Елементарний клітинний автомат (1D)
  stepElementary() {
    const newGrid = Array(this.data.width).fill(0);
    const rule = this.data.rule;
    
    for (let i = 0; i < this.data.width; i++) {
      const left = this.data.wrap ? 
        this.grid[(i - 1 + this.data.width) % this.data.width] : 
        (i > 0 ? this.grid[i - 1] : 0);
      
      const center = this.grid[i];
      
      const right = this.data.wrap ? 
        this.grid[(i + 1) % this.data.width] : 
        (i < this.data.width - 1 ? this.grid[i + 1] : 0);
      
      const pattern = (left << 2) | (center << 1) | right;
      newGrid[i] = (rule >> pattern) & 1;
    }
    
    this.grid = newGrid;
    
    // Зберігаємо історію
    this.history.push(this.grid.slice());
    if (this.history.length > this.data.height) {
      this.history.shift();
    }
  }
  
  // Game of Life (2D)
  stepLife() {
    const newGrid = this.grid.map(row => row.slice());
    
    for (let y = 0; y < this.data.height; y++) {
      for (let x = 0; x < this.data.width; x++) {
        const neighbors = this.countNeighbors(x, y);
        const cell = this.grid[y][x];
        
        if (cell === 1) {
          // Жива клітинка
          newGrid[y][x] = (neighbors === 2 || neighbors === 3) ? 1 : 0;
        } else {
          // Мертва клітинка
          newGrid[y][x] = (neighbors === 3) ? 1 : 0;
        }
      }
    }
    
    this.grid = newGrid;
  }
  
  // Користувацький автомат
  stepCustom() {
    if (this.data.customRule) {
      try {
        const ruleFn = new Function('grid', 'x', 'y', 'neighbors', this.data.customRule);
        const newGrid = this.grid.map(row => row.slice());
        
        for (let y = 0; y < this.data.height; y++) {
          for (let x = 0; x < this.data.width; x++) {
            const neighbors = this.getNeighborhood(x, y);
            newGrid[y][x] = ruleFn(this.grid, x, y, neighbors) ? 1 : 0;
          }
        }
        
        this.grid = newGrid;
      } catch (error) {
        this.error$.next(new Error('Custom rule error: ' + error.message));
      }
    }
  }
  
  // Підрахунок сусідів (Moore neighborhood)
  countNeighbors(x, y) {
    let count = 0;
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        let ny = y + dy;
        let nx = x + dx;
        
        if (this.data.wrap) {
          ny = (ny + this.data.height) % this.data.height;
          nx = (nx + this.data.width) % this.data.width;
        } else {
          if (ny < 0 || ny >= this.data.height || 
              nx < 0 || nx >= this.data.width) continue;
        }
        
        count += this.grid[ny][nx];
      }
    }
    
    return count;
  }
  
  // Отримання околиці клітинки
  getNeighborhood(x, y) {
    const neighborhood = [];
    
    for (let dy = -1; dy <= 1; dy++) {
      const row = [];
      for (let dx = -1; dx <= 1; dx++) {
        let ny = y + dy;
        let nx = x + dx;
        
        if (this.data.wrap) {
          ny = (ny + this.data.height) % this.data.height;
          nx = (nx + this.data.width) % this.data.width;
          row.push(this.grid[ny][nx]);
        } else {
          if (ny < 0 || ny >= this.data.height || 
              nx < 0 || nx >= this.data.width) {
            row.push(0);
          } else {
            row.push(this.grid[ny][nx]);
          }
        }
      }
      neighborhood.push(row);
    }
    
    return neighborhood;
  }
  
  // Встановлення стану клітинки
  setCell(x, y, value) {
    if (this.data.automatonType === 'elementary') {
      if (x >= 0 && x < this.data.width) {
        this.grid[x] = value;
      }
    } else {
      if (x >= 0 && x < this.data.width && 
          y >= 0 && y < this.data.height) {
        this.grid[y][x] = value;
      }
    }
    this.updateState();
  }
  
  // Випадкова ініціалізація
  randomize(density = 0.3) {
    if (this.data.automatonType === 'elementary') {
      this.grid = Array(this.data.width).fill(0)
        .map(() => Math.random() < density ? 1 : 0);
    } else {
      this.grid = Array(this.data.height).fill(null)
        .map(() => Array(this.data.width).fill(0)
          .map(() => Math.random() < density ? 1 : 0));
    }
    this.generation = 0;
    this.updateState();
  }
  
  // Завантаження патерну
  loadPattern(pattern) {
    const patterns = {
      glider: [
        [0, 1, 0],
        [0, 0, 1],
        [1, 1, 1]
      ],
      blinker: [
        [1],
        [1],
        [1]
      ],
      toad: [
        [0, 1, 1, 1],
        [1, 1, 1, 0]
      ],
      beacon: [
        [1, 1, 0, 0],
        [1, 1, 0, 0],
        [0, 0, 1, 1],
        [0, 0, 1, 1]
      ]
    };
    
    if (patterns[pattern] && this.data.automatonType !== 'elementary') {
      const pat = patterns[pattern];
      const startY = Math.floor((this.data.height - pat.length) / 2);
      const startX = Math.floor((this.data.width - pat[0].length) / 2);
      
      // Очищення сітки
      this.grid = Array(this.data.height).fill(null)
        .map(() => Array(this.data.width).fill(0));
      
      // Розміщення патерну
      for (let y = 0; y < pat.length; y++) {
        for (let x = 0; x < pat[y].length; x++) {
          this.grid[startY + y][startX + x] = pat[y][x];
        }
      }
      
      this.generation = 0;
      this.updateState();
    }
  }
  
  // Підрахунок популяції
  getPopulation() {
    if (this.data.automatonType === 'elementary') {
      return this.grid.reduce((sum, cell) => sum + cell, 0);
    } else {
      return this.grid.reduce((sum, row) => 
        sum + row.reduce((rowSum, cell) => rowSum + cell, 0), 0);
    }
  }
  
  // Оновлення стану
  updateState() {
    this.state$.next({
      grid: this.data.automatonType === 'elementary' ? 
        this.history.slice(-this.data.height) : this.grid,
      generation: this.generation,
      population: this.getPopulation(),
      running: !!this.runner
    });
  }
  
  // Запуск автомата
  start() {
    if (!this.runner) {
      this.runner = interval(this.data.stepInterval).subscribe(() => {
        this.step();
      });
    }
  }
  
  // Зупинка автомата
  stop() {
    if (this.runner) {
      this.runner.unsubscribe();
      this.runner = null;
    }
  }
  
  // Очищення
  destroy() {
    this.stop();
    super.destroy();
  }
  
  // Серіалізація
  serialize() {
    const base = super.serialize();
    return {
      ...base,
      generation: this.generation,
      population: this.getPopulation()
    };
  }
  
  // Популярні правила елементарних автоматів
  static elementaryRules = {
    rule30: 30,     // Хаос
    rule90: 90,     // Трикутник Серпінського
    rule110: 110,   // Тюрінг-повний
    rule184: 184    // Трафік
  };
}