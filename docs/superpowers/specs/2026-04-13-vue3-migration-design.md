# Спецификация: Миграция FlowFinance с React на Vue 3

**Дата:** 2026-04-13  
**Статус:** Утверждено  

---

## Контекст

FlowFinance — персональная финансовая учётная система: календарный просмотр транзакций, управление бюджетами, прогнозирование баланса и предсказание кассовых разрывов.

Текущий стек: React 19 + TypeScript + Vite. Пользователь предпочитает Vue 3 — миграция выполняется перед добавлением новых фич.

---

## Решения

| Вопрос | Решение |
|--------|---------|
| API компонентов | Composition API + `<script setup>` |
| Стейт-менеджмент | Pinia |
| Роутинг | Не нужен (SPA без маршрутов) |
| Стиль кода | TypeScript |
| Ввод данных | Модальные окна (добавятся позже) |

---

## Архитектура

### Структура файлов

```
src/
├── components/
│   ├── ui/
│   │   ├── AppCard.vue          ← Card (обёртка с blur-эффектом)
│   │   └── ProgressBar.vue      ← прогресс-бар бюджета
│   ├── icons/                   ← SVG-иконки как Vue-компоненты
│   ├── AppHeader.vue            ← навигация по месяцам, профиль
│   ├── LeftSidebar.vue          ← счета, бюджеты, итоги
│   ├── MainCalendar.vue         ← основной календарь с транзакциями
│   ├── RightSidebar.vue         ← детали выбранного дня
│   └── AnalyticsPanel.vue       ← график прогноза баланса
├── stores/
│   └── finance.ts               ← Pinia store: весь стейт приложения
├── composables/
│   └── useProjectedBalance.ts   ← логика расчёта прогнозируемого баланса
├── types/
│   └── index.ts                 ← Transaction, Account, Category, Budget
├── data/
│   └── mockData.ts              ← моковые данные (без изменений)
├── utils/
│   └── helpers.ts               ← isSameDay, getMonthName, classNames
├── App.vue
└── main.ts
```

### Pinia store (`stores/finance.ts`)

Заменяет `useState` из `App.tsx`. Содержит:

**State:**
- `transactions: Transaction[]`
- `accounts: Account[]`
- `categories: Category[]`
- `budgets: Budget[]`
- `currentDate: Date` — текущий отображаемый месяц
- `selectedDate: Date | null` — выбранный день в календаре

**Actions:**
- `setCurrentDate(date: Date)`
- `setSelectedDate(date: Date | null)`
- `updateTransaction(id: string, changes: Partial<Transaction>)`
- `prevMonth()` / `nextMonth()`

**Getters:**
- `transactionsForDate(date: Date): Transaction[]`
- `monthTransactions: Transaction[]` — транзакции текущего месяца
- `totalBalance: number` — сумма балансов всех счетов
- `monthlyIncome / monthlyExpenses: number`
- `budgetProgress: Record<string, number>` — факт расходов по категориям

### Composable (`composables/useProjectedBalance.ts`)

Принимает дату, возвращает прогнозируемый баланс используя данные из Pinia store. Переносит логику `calculateProjectedBalanceForDate` из `utils/helpers.ts`.

### Компоненты → Vue

| React | Vue | Изменения |
|-------|-----|-----------|
| Props + callbacks наверх | `defineProps` + `emit` | Стандартный Vue-паттерн |
| `useState` в App | Pinia store | Убирает проп-дриллинг |
| Inline обработчики drag | `@dragstart`, `@drop` | Нативные события Vue |
| `className` | `:class` binding | Vue-синтаксис |
| `{condition && <X/>}` | `v-if` | Vue-директива |
| `.map()` в JSX | `v-for` | Vue-директива |

---

## Зависимости

```json
{
  "vue": "^3.5",
  "pinia": "^2.3",
  "@vitejs/plugin-vue": "^5.0",
  "recharts": "удаляется → vue-chartjs или Chart.js"
}
```

> Recharts — React-библиотека, не совместима с Vue. Заменяется на **vue-chartjs** (обёртка над Chart.js) — аналогичный API, те же типы графиков.

---

## Сохранение дизайна

Визуальный дизайн остаётся без изменений:
- Tailwind CSS (CDN) — без изменений
- Glassmorphism стиль (`backdrop-blur-xl`) — без изменений
- Тёмная тема (`dark:` классы) — без изменений
- Drag-and-drop транзакций в календаре — через нативные HTML5 события

---

## Что НЕ входит в эту задачу

- Новые фичи (модалки для ввода данных, кредиты, и т.д.) — после миграции
- Реальный бэкенд — после миграции
- Vue Router — не нужен пока

---

## Критерии готовности

- [ ] Все 5 основных компонентов портированы на Vue 3
- [ ] Pinia store заменяет useState в App
- [ ] Drag-and-drop в календаре работает
- [ ] График прогноза баланса отображается (vue-chartjs)
- [ ] Тёмная тема работает
- [ ] `npm run dev` запускается без ошибок
- [ ] TypeScript без ошибок компиляции
