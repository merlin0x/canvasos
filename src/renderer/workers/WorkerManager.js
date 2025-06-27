// src/renderer/workers/WorkerManager.js
// Менеджер Web Workers для Canvas OS

import { Subject } from 'rxjs';
import { Limits } from '../core/constants.js';

// Клас для управління пулом воркерів
export class WorkerManager {
  constructor() {
    // Пул воркерів
    this.workers = new Map();
    
    // Черга задач
    this.taskQueue = [];
    
    // Активні задачі
    this.activeTasks = new Map();
    
    // Налаштування
    this.config = {
      maxWorkers: Limits.MAX_WORKER_THREADS || 4,
      taskTimeout: 30000, // 30 секунд
      idleTimeout: 60000, // 60 секунд до видалення неактивного воркера
      retryAttempts: 3,
      retryDelay: 1000
    };
    
    // Події
    this.events$ = new Subject();
    
    // Статистика
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageExecutionTime: 0,
      peakWorkers: 0
    };
    
    // Ініціалізація
    this.initialize();
  }
  
  // Ініціалізація менеджера
  initialize() {
    // Створюємо початковий пул воркерів
    this.createWorker();
    
    // Періодична очистка неактивних воркерів
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleWorkers();
    }, 10000);
  }
  
  // Створення нового воркера
  createWorker() {
    if (this.workers.size >= this.config.maxWorkers) {
      return null;
    }
    
    const workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Створюємо воркер з computation.worker.js
      const worker = new Worker(
        new URL('./computation.worker.js', import.meta.url),
        { type: 'module' }
      );
      
      const workerInfo = {
        id: workerId,
        worker: worker,
        busy: false,
        currentTask: null,
        tasksCompleted: 0,
        lastActivity: Date.now(),
        errors: 0
      };
      
      // Налаштування обробників
      worker.onmessage = (event) => this.handleWorkerMessage(workerId, event);
      worker.onerror = (error) => this.handleWorkerError(workerId, error);
      
      this.workers.set(workerId, workerInfo);
      
      // Оновлення статистики
      this.stats.peakWorkers = Math.max(this.stats.peakWorkers, this.workers.size);
      
      this.emitEvent('workerCreated', { workerId });
      
      return workerId;
    } catch (error) {
      console.error('Failed to create worker:', error);
      this.emitEvent('workerError', { error: error.message });
      return null;
    }
  }
  
  // Виконання задачі
  async executeTask(task) {
    return new Promise((resolve, reject) => {
      const taskId = this.generateTaskId();
      
      const taskInfo = {
        id: taskId,
        task: task,
        resolve: resolve,
        reject: reject,
        attempts: 0,
        startTime: null,
        timeout: null
      };
      
      this.stats.totalTasks++;
      this.activeTasks.set(taskId, taskInfo);
      this.taskQueue.push(taskId);
      
      this.emitEvent('taskQueued', { taskId, taskType: task.type });
      
      // Спробувати виконати задачу
      this.processQueue();
    });
  }
  
  // Обробка черги задач
  processQueue() {
    if (this.taskQueue.length === 0) return;
    
    // Знайти вільний воркер
    let availableWorker = null;
    for (const [workerId, workerInfo] of this.workers) {
      if (!workerInfo.busy) {
        availableWorker = workerId;
        break;
      }
    }
    
    // Якщо немає вільних воркерів, спробувати створити новий
    if (!availableWorker && this.workers.size < this.config.maxWorkers) {
      availableWorker = this.createWorker();
    }
    
    // Якщо є доступний воркер, виконати задачу
    if (availableWorker) {
      const taskId = this.taskQueue.shift();
      const taskInfo = this.activeTasks.get(taskId);
      
      if (taskInfo) {
        this.runTask(availableWorker, taskId);
      }
    }
  }
  
  // Запуск задачі на воркері
  runTask(workerId, taskId) {
    const workerInfo = this.workers.get(workerId);
    const taskInfo = this.activeTasks.get(taskId);
    
    if (!workerInfo || !taskInfo) return;
    
    // Позначаємо воркер як зайнятий
    workerInfo.busy = true;
    workerInfo.currentTask = taskId;
    workerInfo.lastActivity = Date.now();
    
    // Запускаємо таймер
    taskInfo.startTime = Date.now();
    taskInfo.attempts++;
    
    // Встановлюємо таймаут
    taskInfo.timeout = setTimeout(() => {
      this.handleTaskTimeout(taskId);
    }, this.config.taskTimeout);
    
    // Відправляємо задачу воркеру
    workerInfo.worker.postMessage({
      taskId: taskId,
      ...taskInfo.task
    });
    
    this.emitEvent('taskStarted', { taskId, workerId });
  }
  
  // Обробка повідомлень від воркера
  handleWorkerMessage(workerId, event) {
    const { taskId, result, error } = event.data;
    const workerInfo = this.workers.get(workerId);
    const taskInfo = this.activeTasks.get(taskId);
    
    if (!workerInfo || !taskInfo) return;
    
    // Очищення таймауту
    if (taskInfo.timeout) {
      clearTimeout(taskInfo.timeout);
    }
    
    // Обчислення часу виконання
    const executionTime = Date.now() - taskInfo.startTime;
    
    // Оновлення статистики воркера
    workerInfo.busy = false;
    workerInfo.currentTask = null;
    workerInfo.tasksCompleted++;
    workerInfo.lastActivity = Date.now();
    
    if (error) {
      // Обробка помилки
      this.handleTaskError(taskId, error);
    } else {
      // Успішне завершення
      this.stats.completedTasks++;
      this.updateAverageExecutionTime(executionTime);
      
      taskInfo.resolve(result);
      this.activeTasks.delete(taskId);
      
      this.emitEvent('taskCompleted', { 
        taskId, 
        workerId, 
        executionTime,
        result
      });
    }
    
    // Обробка наступної задачі з черги
    this.processQueue();
  }
  
  // Обробка помилки воркера
  handleWorkerError(workerId, error) {
    console.error(`Worker ${workerId} error:`, error);
    
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo) return;
    
    workerInfo.errors++;
    
    // Якщо воркер мав активну задачу, повернути її в чергу
    if (workerInfo.currentTask) {
      const taskId = workerInfo.currentTask;
      this.taskQueue.unshift(taskId);
      workerInfo.currentTask = null;
      workerInfo.busy = false;
    }
    
    // Якщо занадто багато помилок, видалити воркер
    if (workerInfo.errors > 5) {
      this.removeWorker(workerId);
    }
    
    this.emitEvent('workerError', { workerId, error: error.message });
    
    // Обробка черги
    this.processQueue();
  }
  
  // Обробка помилки задачі
  handleTaskError(taskId, error) {
    const taskInfo = this.activeTasks.get(taskId);
    if (!taskInfo) return;
    
    // Спроба повторного виконання
    if (taskInfo.attempts < this.config.retryAttempts) {
      setTimeout(() => {
        this.taskQueue.push(taskId);
        this.processQueue();
      }, this.config.retryDelay * taskInfo.attempts);
      
      this.emitEvent('taskRetry', { 
        taskId, 
        attempt: taskInfo.attempts,
        error: error
      });
    } else {
      // Остаточна помилка
      this.stats.failedTasks++;
      taskInfo.reject(new Error(error));
      this.activeTasks.delete(taskId);
      
      this.emitEvent('taskFailed', { taskId, error });
    }
  }
  
  // Обробка таймауту задачі
  handleTaskTimeout(taskId) {
    const taskInfo = this.activeTasks.get(taskId);
    if (!taskInfo) return;
    
    // Знайти воркер, що виконує цю задачу
    let workerId = null;
    for (const [id, workerInfo] of this.workers) {
      if (workerInfo.currentTask === taskId) {
        workerId = id;
        break;
      }
    }
    
    if (workerId) {
      // Перезапустити воркер
      this.restartWorker(workerId);
    }
    
    // Обробити помилку таймауту
    this.handleTaskError(taskId, 'Task timeout');
  }
  
  // Перезапуск воркера
  restartWorker(workerId) {
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo) return;
    
    // Зберегти інформацію про задачу
    const currentTask = workerInfo.currentTask;
    
    // Видалити старий воркер
    this.removeWorker(workerId);
    
    // Створити новий
    const newWorkerId = this.createWorker();
    
    // Повернути задачу в чергу
    if (currentTask) {
      this.taskQueue.unshift(currentTask);
    }
    
    this.emitEvent('workerRestarted', { oldWorkerId: workerId, newWorkerId });
  }
  
  // Видалення воркера
  removeWorker(workerId) {
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo) return;
    
    // Завершити воркер
    workerInfo.worker.terminate();
    
    // Видалити з пулу
    this.workers.delete(workerId);
    
    this.emitEvent('workerRemoved', { workerId });
  }
  
  // Очищення неактивних воркерів
  cleanupIdleWorkers() {
    const now = Date.now();
    const toRemove = [];
    
    // Залишити хоча б один воркер
    if (this.workers.size <= 1) return;
    
    for (const [workerId, workerInfo] of this.workers) {
      if (!workerInfo.busy && 
          now - workerInfo.lastActivity > this.config.idleTimeout) {
        toRemove.push(workerId);
      }
    }
    
    // Видалити неактивні воркери, але залишити хоча б один
    toRemove.slice(0, -1).forEach(workerId => {
      this.removeWorker(workerId);
    });
  }
  
  // === Спеціалізовані методи для різних типів обчислень ===
  
  // Виконання JavaScript коду
  async executeCode(code, input, state = {}) {
    return this.executeTask({
      type: 'executeCode',
      code: code,
      input: input,
      state: state
    });
  }
  
  // Обробка масиву даних
  async processArray(array, operation) {
    return this.executeTask({
      type: 'processArray',
      array: array,
      operation: operation
    });
  }
  
  // Симуляція клітинного автомата
  async simulateAutomaton(grid, rules, steps) {
    return this.executeTask({
      type: 'simulateAutomaton',
      grid: grid,
      rules: rules,
      steps: steps
    });
  }
  
  // Математичні обчислення
  async calculate(expression, variables = {}) {
    return this.executeTask({
      type: 'calculate',
      expression: expression,
      variables: variables
    });
  }
  
  // Обробка зображення (canvas)
  async processImage(imageData, filters) {
    return this.executeTask({
      type: 'processImage',
      imageData: imageData,
      filters: filters
    });
  }
  
  // === Утиліти ===
  
  // Генерація ID задачі
  generateTaskId() {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Оновлення середнього часу виконання
  updateAverageExecutionTime(executionTime) {
    const total = this.stats.averageExecutionTime * (this.stats.completedTasks - 1) + executionTime;
    this.stats.averageExecutionTime = total / this.stats.completedTasks;
  }
  
  // Емісія події
  emitEvent(type, data) {
    this.events$.next({
      type: type,
      data: data,
      timestamp: Date.now()
    });
  }
  
  // Отримання статистики
  getStatistics() {
    return {
      ...this.stats,
      currentWorkers: this.workers.size,
      busyWorkers: Array.from(this.workers.values()).filter(w => w.busy).length,
      queueLength: this.taskQueue.length,
      activeTasks: this.activeTasks.size
    };
  }
  
  // Отримання стану воркерів
  getWorkersStatus() {
    const status = [];
    
    this.workers.forEach((workerInfo, workerId) => {
      status.push({
        id: workerId,
        busy: workerInfo.busy,
        tasksCompleted: workerInfo.tasksCompleted,
        errors: workerInfo.errors,
        idleTime: Date.now() - workerInfo.lastActivity
      });
    });
    
    return status;
  }
  
  // Очищення ресурсів
  destroy() {
    // Скасувати всі активні задачі
    this.activeTasks.forEach(taskInfo => {
      if (taskInfo.timeout) {
        clearTimeout(taskInfo.timeout);
      }
      taskInfo.reject(new Error('Worker manager destroyed'));
    });
    
    // Видалити всі воркери
    this.workers.forEach((workerInfo, workerId) => {
      this.removeWorker(workerId);
    });
    
    // Очистити інтервал
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Завершити потік подій
    this.events$.complete();
  }
}

// Singleton instance
let workerManagerInstance = null;

// Функція для отримання instance
export function getWorkerManager() {
  if (!workerManagerInstance) {
    workerManagerInstance = new WorkerManager();
  }
  return workerManagerInstance;
}