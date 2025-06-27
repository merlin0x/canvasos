# Canvas OS - Гайд з міграції на модульну структуру

## 🎯 Огляд реструктуризації

Canvas OS тепер має модульну архітектуру, яка забезпечує:
- ✅ Кращу підтримність коду
- ✅ Оптимізацію для роботи з AI асистентами (менше токенів)
- ✅ Легше додавання нових функцій
- ✅ Кращу продуктивність завдяки lazy loading
- ✅ Простіше тестування

## 📁 Нова структура файлів

```
src/
├── main/                      # Electron основний процес
│   ├── index.js              # Точка входу Electron
│   └── preload.js            # Preload скрипт
│
├── renderer/                  # Renderer процес (UI)
│   ├── index.html            # HTML з підтримкою ES модулів
│   ├── index.js              # Точка входу додатку
│   │
│   ├── core/                 # Основна логіка
│   │   ├── constants.js      # Всі константи в одному місці
│   │   ├── Node.js          # Базовий клас вузла
│   │   ├── Edge.js          # Клас з'єднання
│   │   └── Graph.js         # Менеджер графа
│   │
│   ├── nodes/               # Типи вузлів
│   │   ├── InputNode.js     # Вузол введення
│   │   ├── ProcessNode.js   # Вузол обробки
│   │   ├── OutputNode.js    # Вузол виведення
│   │   ├── VisualizerNode.js # Візуалізатор
│   │   └── AutomatonNode.js  # Клітинний автомат
│   │
│   ├── components/          # React компоненти
│   │   ├── Canvas.js        # Основна канва
│   │   ├── Node.js          # Компонент вузла
│   │   ├── Edge.js          # Компонент з'єднання
│   │   ├── Toolbar.js       # Панель інструментів
│   │   └── ...              # Інші компоненти
│   │
│   ├── hooks/               # React хуки
│   │   ├── useNodes.js      # Управління вузлами
│   │   ├── useEdges.js      # Управління з'єднаннями
│   │   ├── useCanvas.js     # Pan & Zoom
│   │   └── useDragDrop.js   # Drag & Drop
│   │
│   ├── utils/               # Утиліти
│   │   └── geometry.js      # Геометричні обчислення
│   │
│   └── styles/             # CSS стилі
│       ├── main.css        # Основні стилі
│       ├── nodes.css       # Стилі вузлів
│       └── components.css  # Стилі компонентів
```

## 🚀 Як почати працювати з новою структурою

### 1. Встановлення залежностей

```bash
npm install
```

### 2. Запуск в режимі розробки

```bash
npm run dev
```

### 3. Збірка для продакшн

```bash
npm run build
```

## 🔧 Приклади використання

### Створення нового типу вузла

```javascript
// src/renderer/nodes/MyCustomNode.js
import { CanvasNode } from '@core/Node.js';
import { NodeType } from '@core/constants.js';

// Додайте новий тип в constants.js
// NodeType.CUSTOM = 'custom';

export class MyCustomNode extends CanvasNode {
  constructor(id, position, data = {}) {
    super(id, NodeType.CUSTOM, position, data);
  }
  
  initialize() {
    super.initialize();
    
    // Ваша логіка
    this.input$.subscribe(value => {
      const result = this.processValue(value);
      this.output$.next(result);
    });
  }
  
  processValue(value) {
    // Ваша обробка
    return value * 2;
  }
}
```

### Додавання нової команди в тулбар

```javascript
// В компоненті Toolbar.js
<button onClick={() => onCommand('my-command', { data: 'test' })}>
  My Command
</button>

// В компоненті Canvas.js
const handleToolbarCommand = (command, data) => {
  switch (command) {
    case 'my-command':
      // Ваша логіка
      break;
  }
};
```

### Робота з GraphManager

```javascript
// Створення вузла
const node = graphManager.addNode('process', { x: 100, y: 100 });

// Створення з'єднання
const edge = graphManager.addEdge(sourceId, targetId);

// Збереження графа
const json = graphManager.toJSON();

// Завантаження графа
graphManager.fromJSON(json);

// Підписка на події
graphManager.events$.subscribe(event => {
  console.log('Event:', event.type, event.data);
});
```

## 🎨 Додавання нових стилів

Стилі розділені на три файли:
- `main.css` - загальні стилі додатку
- `nodes.css` - стилі для вузлів
- `components.css` - стилі для UI компонентів

Додавайте нові стилі у відповідні файли для кращої організації.

## 🔄 Міграція старого коду

### Було:
```javascript
// Все в одному файлі
class CanvasNode { ... }
function NodeComponent() { ... }
// 1000+ рядків коду
```

### Стало:
```javascript
// core/Node.js
export class CanvasNode { ... }

// components/Node.js
import { CanvasNode } from '@core/Node.js';
export function NodeComponent() { ... }
```

## 📝 Конвенції коду

1. **Імпорти**: Використовуйте ES6 модулі з розширенням `.js`
2. **Експорти**: Іменовані експорти для утиліт, default для компонентів
3. **Файли**: Один клас/компонент на файл
4. **Іменування**: PascalCase для класів/компонентів, camelCase для функцій

## 🐛 Вирішення проблем

### Помилка "Cannot find module"
Переконайтеся, що вказуєте розширення `.js` в імпортах:
```javascript
// ✅ Правильно
import { Node } from '@/Node.js';

// ❌ Неправильно
import { Node } from '@/Node';
```

### Помилка CORS при локальній розробці
Використовуйте локальний сервер або Electron для розробки.

## 🚦 Наступні кроки

1. **Фаза 1**: Перенесення базової функціональності ✅
2. **Фаза 2**: Додавання нових типів вузлів
3. **Фаза 3**: Інтеграція з WebAssembly
4. **Фаза 4**: Система плагінів
5. **Фаза 5**: Мультиплеєр підтримка

## 💡 Поради для розробників

- Використовуйте React DevTools для налагодження компонентів
- RxJS DevTools для моніторингу потоків даних
- Chrome DevTools Performance для оптимізації
- Зберігайте незалежність модулів для легкого тестування

## 📚 Додаткові ресурси

- [RxJS Documentation](https://rxjs.dev/)
- [React Hooks Guide](https://react.dev/reference/react)
- [ES Modules Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Electron Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)