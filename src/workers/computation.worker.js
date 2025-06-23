// Web Worker для обчислень клітинних автоматів та інших симуляцій

let automaton = null;
let running = false;

// Базовий клас для клітинних автоматів
class CellularAutomaton {
  constructor(width, height, rule = 30) {
    this.width = width;
    this.height = height;
    this.rule = rule;
    this.grid = this.initializeGrid();
  }
  
  initializeGrid() {
    const grid = Array(this.height).fill(null).map(() => 
      Array(this.width).fill(0)
    );
    
    // Початкова конфігурація - одна клітинка посередині
    grid[0][Math.floor(this.width / 2)] = 1;
    
    return grid;
  }
  
  // Елементарний клітинний автомат (1D)
  updateElementary(row) {
    const newRow = Array(this.width).fill(0);
    
    for (let i = 0; i < this.width; i++) {
      const left = row[i - 1] || 0;
      const center = row[i];
      const right = row[i + 1] || 0;
      
      const pattern = (left << 2) | (center << 1) | right;
      newRow[i] = (this.rule >> pattern) & 1;
    }
    
    return newRow;
  }
  
  // Гра життя Конвея (2D)
  updateGameOfLife() {
    const newGrid = this.grid.map(row => [...row]);
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
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
    return newGrid;
  }
  
  countNeighbors(x, y) {
    let count = 0;
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const nx = (x + dx + this.width) % this.width;
        const ny = (y + dy + this.height) % this.height;
        
        count += this.grid[ny][nx];
      }
    }
    
    return count;
  }
  
  step() {
    // Для 1D автомата
    if (this.height === 1) {
      return this.updateElementary(this.grid[0]);
    }
    
    // Для 2D автомата (Game of Life)
    return this.updateGameOfLife();
  }
}

// Обробка повідомлень
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'INIT':
      automaton = new CellularAutomaton(
        data.width || 100,
        data.height || 100,
        data.rule || 30
      );
      
      self.postMessage({
        type: 'INITIALIZED',
        data: { grid: automaton.grid }
      });
      break;
      
    case 'START':
      running = true;
      runSimulation();
      break;
      
    case 'STOP':
      running = false;
      break;
      
    case 'STEP':
      if (automaton) {
        const grid = automaton.step();
        self.postMessage({
          type: 'UPDATE',
          data: { grid }
        });
      }
      break;
      
    case 'SET_RULE':
      if (automaton) {
        automaton.rule = data.rule;
      }
      break;
      
    case 'SET_CELL':
      if (automaton && data.x !== undefined && data.y !== undefined) {
        automaton.grid[data.y][data.x] = data.value;
        self.postMessage({
          type: 'UPDATE',
          data: { grid: automaton.grid }
        });
      }
      break;
      
    case 'CLEAR':
      if (automaton) {
        automaton.grid = automaton.initializeGrid();
        self.postMessage({
          type: 'UPDATE',
          data: { grid: automaton.grid }
        });
      }
      break;
  }
});

// Запуск симуляції
function runSimulation() {
  if (!running || !automaton) return;
  
  const grid = automaton.step();
  
  self.postMessage({
    type: 'UPDATE',
    data: { 
      grid,
      generation: automaton.generation || 0
    }
  });
  
  // Затримка між кроками (можна налаштувати)
  setTimeout(() => {
    if (running) {
      runSimulation();
    }
  }, 100);
}

// FFT для аналізу сигналів
function fft(signal) {
  const N = signal.length;
  if (N <= 1) return signal;
  
  // Проста реалізація FFT (Cooley-Tukey)
  const even = fft(signal.filter((_, i) => i % 2 === 0));
  const odd = fft(signal.filter((_, i) => i % 2 === 1));
  
  const result = Array(N);
  for (let k = 0; k < N / 2; k++) {
    const t = -2 * Math.PI * k / N;
    const w = { re: Math.cos(t), im: Math.sin(t) };
    
    const oddK = {
      re: odd[k].re * w.re - odd[k].im * w.im,
      im: odd[k].re * w.im + odd[k].im * w.re
    };
    
    result[k] = {
      re: even[k].re + oddK.re,
      im: even[k].im + oddK.im
    };
    
    result[k + N / 2] = {
      re: even[k].re - oddK.re,
      im: even[k].im - oddK.im
    };
  }
  
  return result;
}

console.log('Computation worker ready');