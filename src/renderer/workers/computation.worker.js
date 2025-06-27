// src/renderer/workers/computation.worker.js
// Web Worker для виконання обчислень Canvas OS

// Імпорт необхідних бібліотек (якщо підтримується)
// import * as math from 'mathjs';

// Стан воркера
const workerState = {
  id: self.crypto.randomUUID ? self.crypto.randomUUID() : Date.now().toString(),
  tasksCompleted: 0,
  errors: 0
};

// Основний обробник повідомлень
self.onmessage = async function(event) {
  const { taskId, type, ...params } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'executeCode':
        result = await executeCode(params);
        break;
        
      case 'processArray':
        result = await processArray(params);
        break;
        
      case 'simulateAutomaton':
        result = await simulateAutomaton(params);
        break;
        
      case 'calculate':
        result = await calculate(params);
        break;
        
      case 'processImage':
        result = await processImage(params);
        break;
        
      case 'fft':
        result = await performFFT(params);
        break;
        
      case 'statistics':
        result = await calculateStatistics(params);
        break;
        
      case 'sort':
        result = await sortData(params);
        break;
        
      case 'filter':
        result = await filterData(params);
        break;
        
      case 'aggregate':
        result = await aggregateData(params);
        break;
        
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
    
    workerState.tasksCompleted++;
    
    // Відправка результату
    self.postMessage({
      taskId,
      result,
      workerId: workerState.id
    });
    
  } catch (error) {
    workerState.errors++;
    
    // Відправка помилки
    self.postMessage({
      taskId,
      error: error.message,
      stack: error.stack,
      workerId: workerState.id
    });
  }
};

// === Виконання користувацького коду ===
async function executeCode({ code, input, state }) {
  try {
    // Створюємо безпечний контекст
    const safeGlobals = {
      Math,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      JSON,
      console: {
        log: (...args) => {
          self.postMessage({
            type: 'console',
            data: args
          });
        }
      }
    };
    
    // Створюємо функцію з обмеженим контекстом
    const func = new Function(
      'input',
      'state',
      'globals',
      `
      'use strict';
      const { ${Object.keys(safeGlobals).join(', ')} } = globals;
      ${code}
      `
    );
    
    // Виконуємо код
    const result = await func(input, state || {}, safeGlobals);
    
    return result;
  } catch (error) {
    throw new Error(`Code execution error: ${error.message}`);
  }
}

// === Обробка масивів ===
async function processArray({ array, operation }) {
  if (!Array.isArray(array)) {
    throw new Error('Input must be an array');
  }
  
  switch (operation) {
    case 'sum':
      return array.reduce((a, b) => a + b, 0);
      
    case 'average':
      return array.length > 0 ? array.reduce((a, b) => a + b, 0) / array.length : 0;
      
    case 'min':
      return Math.min(...array);
      
    case 'max':
      return Math.max(...array);
      
    case 'unique':
      return [...new Set(array)];
      
    case 'reverse':
      return array.slice().reverse();
      
    case 'shuffle':
      const shuffled = array.slice();
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
      
    case 'flatten':
      return array.flat(Infinity);
      
    case 'chunk':
      const chunkSize = operation.size || 10;
      const chunks = [];
      for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
      }
      return chunks;
      
    default:
      throw new Error(`Unknown array operation: ${operation}`);
  }
}

// === Симуляція клітинного автомата ===
async function simulateAutomaton({ grid, rules, steps }) {
  const result = [];
  let currentGrid = grid;
  
  for (let step = 0; step < steps; step++) {
    // Збереження поточного стану
    result.push(JSON.parse(JSON.stringify(currentGrid)));
    
    // Обчислення наступного стану
    if (Array.isArray(currentGrid[0])) {
      // 2D автомат (Game of Life)
      currentGrid = simulate2DAutomaton(currentGrid, rules);
    } else {
      // 1D автомат
      currentGrid = simulate1DAutomaton(currentGrid, rules);
    }
    
    // Перевірка переривання (кожні 100 кроків)
    if (step % 100 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  return result;
}

// 1D клітинний автомат
function simulate1DAutomaton(grid, rule) {
  const newGrid = new Array(grid.length).fill(0);
  
  for (let i = 0; i < grid.length; i++) {
    const left = grid[(i - 1 + grid.length) % grid.length];
    const center = grid[i];
    const right = grid[(i + 1) % grid.length];
    
    const pattern = (left << 2) | (center << 1) | right;
    newGrid[i] = (rule >> pattern) & 1;
  }
  
  return newGrid;
}

// 2D клітинний автомат (Game of Life)
function simulate2DAutomaton(grid, rules) {
  const height = grid.length;
  const width = grid[0].length;
  const newGrid = grid.map(row => row.slice());
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const neighbors = countNeighbors(grid, x, y);
      const cell = grid[y][x];
      
      if (cell === 1) {
        // Жива клітинка
        newGrid[y][x] = (rules.survive || [2, 3]).includes(neighbors) ? 1 : 0;
      } else {
        // Мертва клітинка
        newGrid[y][x] = (rules.birth || [3]).includes(neighbors) ? 1 : 0;
      }
    }
  }
  
  return newGrid;
}

// Підрахунок сусідів для 2D автомата
function countNeighbors(grid, x, y) {
  const height = grid.length;
  const width = grid[0].length;
  let count = 0;
  
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      
      const ny = (y + dy + height) % height;
      const nx = (x + dx + width) % width;
      
      count += grid[ny][nx];
    }
  }
  
  return count;
}

// === Математичні обчислення ===
async function calculate({ expression, variables = {} }) {
  try {
    // Створюємо безпечний контекст для обчислень
    const safeVariables = { ...variables };
    const safeExpression = expression.replace(/[^0-9+\-*/().,\s\w]/g, '');
    
    // Створюємо функцію для обчислення
    const func = new Function(
      ...Object.keys(safeVariables),
      `return ${safeExpression}`
    );
    
    // Виконуємо обчислення
    const result = func(...Object.values(safeVariables));
    
    return result;
  } catch (error) {
    throw new Error(`Calculation error: ${error.message}`);
  }
}

// === Обробка зображень ===
async function processImage({ imageData, filters }) {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;
  
  for (const filter of filters) {
    switch (filter.type) {
      case 'grayscale':
        applyGrayscale(data);
        break;
        
      case 'invert':
        applyInvert(data);
        break;
        
      case 'blur':
        applyBlur(data, width, height, filter.radius || 1);
        break;
        
      case 'brightness':
        applyBrightness(data, filter.value || 0);
        break;
        
      case 'contrast':
        applyContrast(data, filter.value || 1);
        break;
        
      case 'threshold':
        applyThreshold(data, filter.value || 128);
        break;
    }
  }
  
  return new ImageData(data, width, height);
}

// Фільтр відтінків сірого
function applyGrayscale(data) {
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
}

// Фільтр інверсії
function applyInvert(data) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
}

// Фільтр розмиття (простий box blur)
function applyBlur(data, width, height, radius) {
  const output = new Uint8ClampedArray(data);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      let count = 0;
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = Math.min(Math.max(y + dy, 0), height - 1);
          const nx = Math.min(Math.max(x + dx, 0), width - 1);
          const idx = (ny * width + nx) * 4;
          
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
          count++;
        }
      }
      
      const idx = (y * width + x) * 4;
      output[idx] = r / count;
      output[idx + 1] = g / count;
      output[idx + 2] = b / count;
      output[idx + 3] = a / count;
    }
  }
  
  data.set(output);
}

// Фільтр яскравості
function applyBrightness(data, value) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, data[i] + value));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + value));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + value));
  }
}

// Фільтр контрасту
function applyContrast(data, value) {
  const factor = (259 * (value + 255)) / (255 * (259 - value));
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
    data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
    data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
  }
}

// Фільтр порогу
function applyThreshold(data, threshold) {
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const value = gray > threshold ? 255 : 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
}

// === FFT (Fast Fourier Transform) ===
async function performFFT({ signal, inverse = false }) {
  // Спрощена реалізація FFT
  const N = signal.length;
  
  // Перевірка, чи N є степенем 2
  if ((N & (N - 1)) !== 0) {
    throw new Error('Signal length must be a power of 2');
  }
  
  // Створюємо комплексний масив
  const complex = signal.map(x => ({ real: x, imag: 0 }));
  
  // Виконуємо FFT
  fftRecursive(complex, inverse);
  
  // Нормалізація для оберненого FFT
  if (inverse) {
    const scale = 1 / N;
    complex.forEach(c => {
      c.real *= scale;
      c.imag *= scale;
    });
  }
  
  return complex;
}

// Рекурсивна реалізація FFT
function fftRecursive(data, inverse) {
  const N = data.length;
  
  if (N <= 1) return;
  
  // Розділення на парні та непарні
  const even = [];
  const odd = [];
  
  for (let i = 0; i < N; i += 2) {
    even.push(data[i]);
    odd.push(data[i + 1]);
  }
  
  // Рекурсивні виклики
  fftRecursive(even, inverse);
  fftRecursive(odd, inverse);
  
  // Об'єднання результатів
  const angle = (inverse ? 2 : -2) * Math.PI / N;
  
  for (let i = 0; i < N / 2; i++) {
    const t = {
      real: Math.cos(angle * i),
      imag: Math.sin(angle * i)
    };
    
    const temp = {
      real: t.real * odd[i].real - t.imag * odd[i].imag,
      imag: t.real * odd[i].imag + t.imag * odd[i].real
    };
    
    data[i] = {
      real: even[i].real + temp.real,
      imag: even[i].imag + temp.imag
    };
    
    data[i + N / 2] = {
      real: even[i].real - temp.real,
      imag: even[i].imag - temp.imag
    };
  }
}

// === Статистичні обчислення ===
async function calculateStatistics({ data, operations }) {
  const results = {};
  
  for (const op of operations) {
    switch (op) {
      case 'mean':
        results.mean = mean(data);
        break;
        
      case 'median':
        results.median = median(data);
        break;
        
      case 'mode':
        results.mode = mode(data);
        break;
        
      case 'variance':
        results.variance = variance(data);
        break;
        
      case 'stddev':
        results.stddev = Math.sqrt(variance(data));
        break;
        
      case 'min':
        results.min = Math.min(...data);
        break;
        
      case 'max':
        results.max = Math.max(...data);
        break;
        
      case 'range':
        results.range = Math.max(...data) - Math.min(...data);
        break;
        
      case 'percentiles':
        results.percentiles = {
          p25: percentile(data, 0.25),
          p50: percentile(data, 0.50),
          p75: percentile(data, 0.75),
          p90: percentile(data, 0.90),
          p95: percentile(data, 0.95),
          p99: percentile(data, 0.99)
        };
        break;
        
      case 'histogram':
        results.histogram = histogram(data, op.bins || 10);
        break;
    }
  }
  
  return results;
}

// Статистичні функції
function mean(data) {
  return data.reduce((a, b) => a + b, 0) / data.length;
}

function median(data) {
  const sorted = data.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mode(data) {
  const frequency = {};
  let maxFreq = 0;
  let modes = [];
  
  data.forEach(value => {
    frequency[value] = (frequency[value] || 0) + 1;
    if (frequency[value] > maxFreq) {
      maxFreq = frequency[value];
      modes = [value];
    } else if (frequency[value] === maxFreq) {
      modes.push(value);
    }
  });
  
  return modes;
}

function variance(data) {
  const m = mean(data);
  return data.reduce((acc, val) => acc + Math.pow(val - m, 2), 0) / data.length;
}

function percentile(data, p) {
  const sorted = data.slice().sort((a, b) => a - b);
  const index = p * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;
  
  return lower === upper
    ? sorted[lower]
    : sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function histogram(data, bins) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const binWidth = (max - min) / bins;
  const hist = new Array(bins).fill(0);
  
  data.forEach(value => {
    const bin = Math.min(Math.floor((value - min) / binWidth), bins - 1);
    hist[bin]++;
  });
  
  return hist.map((count, i) => ({
    start: min + i * binWidth,
    end: min + (i + 1) * binWidth,
    count: count
  }));
}

// === Сортування даних ===
async function sortData({ data, algorithm = 'quicksort', compareFn }) {
  const compare = compareFn ? new Function('a', 'b', compareFn) : (a, b) => a - b;
  
  switch (algorithm) {
    case 'quicksort':
      return quickSort(data.slice(), compare);
      
    case 'mergesort':
      return mergeSort(data.slice(), compare);
      
    case 'heapsort':
      return heapSort(data.slice(), compare);
      
    case 'bubblesort':
      return bubbleSort(data.slice(), compare);
      
    default:
      return data.slice().sort(compare);
  }
}

// Алгоритми сортування
function quickSort(arr, compare) {
  if (arr.length <= 1) return arr;
  
  const pivot = arr[Math.floor(arr.length / 2)];
  const less = arr.filter((x, i) => i !== Math.floor(arr.length / 2) && compare(x, pivot) < 0);
  const greater = arr.filter((x, i) => i !== Math.floor(arr.length / 2) && compare(x, pivot) >= 0);
  
  return [...quickSort(less, compare), pivot, ...quickSort(greater, compare)];
}

function mergeSort(arr, compare) {
  if (arr.length <= 1) return arr;
  
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid), compare);
  const right = mergeSort(arr.slice(mid), compare);
  
  return merge(left, right, compare);
}

function merge(left, right, compare) {
  const result = [];
  let i = 0, j = 0;
  
  while (i < left.length && j < right.length) {
    if (compare(left[i], right[j]) <= 0) {
      result.push(left[i++]);
    } else {
      result.push(right[j++]);
    }
  }
  
  return result.concat(left.slice(i)).concat(right.slice(j));
}

function heapSort(arr, compare) {
  // Побудова купи
  for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i--) {
    heapify(arr, arr.length, i, compare);
  }
  
  // Витягування елементів
  for (let i = arr.length - 1; i > 0; i--) {
    [arr[0], arr[i]] = [arr[i], arr[0]];
    heapify(arr, i, 0, compare);
  }
  
  return arr;
}

function heapify(arr, n, i, compare) {
  let largest = i;
  const left = 2 * i + 1;
  const right = 2 * i + 2;
  
  if (left < n && compare(arr[left], arr[largest]) > 0) {
    largest = left;
  }
  
  if (right < n && compare(arr[right], arr[largest]) > 0) {
    largest = right;
  }
  
  if (largest !== i) {
    [arr[i], arr[largest]] = [arr[largest], arr[i]];
    heapify(arr, n, largest, compare);
  }
}

function bubbleSort(arr, compare) {
  const n = arr.length;
  
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (compare(arr[j], arr[j + 1]) > 0) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  
  return arr;
}

// === Фільтрація даних ===
async function filterData({ data, filters }) {
  let result = data;
  
  for (const filter of filters) {
    switch (filter.type) {
      case 'value':
        result = result.filter(item => {
          const value = filter.field ? item[filter.field] : item;
          return evaluateCondition(value, filter.operator, filter.value);
        });
        break;
        
      case 'range':
        result = result.filter(item => {
          const value = filter.field ? item[filter.field] : item;
          return value >= filter.min && value <= filter.max;
        });
        break;
        
      case 'pattern':
        const regex = new RegExp(filter.pattern, filter.flags || '');
        result = result.filter(item => {
          const value = filter.field ? item[filter.field] : String(item);
          return regex.test(value);
        });
        break;
        
      case 'custom':
        const filterFn = new Function('item', 'index', 'array', filter.function);
        result = result.filter(filterFn);
        break;
    }
  }
  
  return result;
}

// Оцінка умови
function evaluateCondition(value, operator, target) {
  switch (operator) {
    case '=':
    case '==':
      return value == target;
    case '===':
      return value === target;
    case '!=':
      return value != target;
    case '!==':
      return value !== target;
    case '>':
      return value > target;
    case '<':
      return value < target;
    case '>=':
      return value >= target;
    case '<=':
      return value <= target;
    case 'includes':
      return String(value).includes(target);
    case 'startsWith':
      return String(value).startsWith(target);
    case 'endsWith':
      return String(value).endsWith(target);
    default:
      return false;
  }
}

// === Агрегація даних ===
async function aggregateData({ data, groupBy, operations }) {
  const groups = {};
  
  // Групування
  data.forEach(item => {
    const key = groupBy ? item[groupBy] : 'all';
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  });
  
  // Агрегація
  const results = {};
  
  for (const [key, items] of Object.entries(groups)) {
    results[key] = {};
    
    for (const op of operations) {
      const values = items.map(item => item[op.field]);
      
      switch (op.type) {
        case 'count':
          results[key][op.name || 'count'] = items.length;
          break;
          
        case 'sum':
          results[key][op.name || 'sum'] = values.reduce((a, b) => a + b, 0);
          break;
          
        case 'avg':
          results[key][op.name || 'avg'] = mean(values);
          break;
          
        case 'min':
          results[key][op.name || 'min'] = Math.min(...values);
          break;
          
        case 'max':
          results[key][op.name || 'max'] = Math.max(...values);
          break;
          
        case 'first':
          results[key][op.name || 'first'] = values[0];
          break;
          
        case 'last':
          results[key][op.name || 'last'] = values[values.length - 1];
          break;
          
        case 'unique':
          results[key][op.name || 'unique'] = [...new Set(values)];
          break;
      }
    }
  }
  
  return results;
}

// Повідомлення про готовність
self.postMessage({
  type: 'ready',
  workerId: workerState.id
});