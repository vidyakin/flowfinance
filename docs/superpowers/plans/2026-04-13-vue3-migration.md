# Vue 3 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite FlowFinance from React 19 to Vue 3 with Composition API, Pinia, and vue-chartjs — identical visual result, idiomatic Vue code.

**Architecture:** All state lives in a Pinia store (`src/stores/finance.ts`). Components use `<script setup>` with Composition API. Balance forecasting logic extracted to `src/composables/useProjectedBalance.ts`. New files go in `src/`, old React files deleted in the final task.

**Tech Stack:** Vue 3.5, Pinia 2.3, Chart.js + vue-chartjs, Vite 6, TypeScript 5, Tailwind CSS (CDN)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modify | Replace react/recharts with vue/pinia/chart.js/vue-chartjs |
| `vite.config.ts` | Modify | Replace @vitejs/plugin-react with @vitejs/plugin-vue |
| `tsconfig.json` | Modify | Remove jsx:react-jsx, add vue include |
| `index.html` | Modify | Remove React importmap, point to `src/main.ts` |
| `src/main.ts` | Create | Vue app entry point with Pinia |
| `src/App.vue` | Create | Root component, layout |
| `src/types/index.ts` | Create | Transaction, Account, Category, Budget types |
| `src/utils/helpers.ts` | Create | isSameDay, getMonthName, classNames, calculateProjectedBalanceForDate |
| `src/data/mockData.ts` | Create | Mock accounts, categories, budgets, transactions |
| `src/stores/finance.ts` | Create | Pinia store — all state, actions, getters |
| `src/composables/useProjectedBalance.ts` | Create | Balance forecast composable |
| `src/components/ui/AppCard.vue` | Create | Glassmorphism card wrapper |
| `src/components/ui/ProgressBar.vue` | Create | Budget progress bar |
| `src/components/icons/ChevronLeftIcon.vue` | Create | SVG icon |
| `src/components/icons/ChevronRightIcon.vue` | Create | SVG icon |
| `src/components/icons/PlusIcon.vue` | Create | SVG icon |
| `src/components/icons/UserIcon.vue` | Create | SVG icon |
| `src/components/icons/SettingsIcon.vue` | Create | SVG icon |
| `src/components/icons/TrendingUpIcon.vue` | Create | SVG icon |
| `src/components/AppHeader.vue` | Create | Top navigation |
| `src/components/LeftSidebar.vue` | Create | Accounts, budgets, summary |
| `src/components/MainCalendar.vue` | Create | Calendar grid with drag-and-drop |
| `src/components/RightSidebar.vue` | Create | Day detail panel |
| `src/components/AnalyticsPanel.vue` | Create | Cash flow chart |
| `App.tsx`, `index.tsx`, `types.ts`, `utils/`, `data/`, `components/` (React) | Delete | Cleanup after Vue app works |

---

## Task 1: Project Infrastructure

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `tsconfig.json`
- Modify: `index.html`

- [ ] **Step 1: Update package.json**

Replace the entire file:

```json
{
  "name": "flowfinance",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.5.0",
    "pinia": "^2.3.0",
    "chart.js": "^4.4.0",
    "vue-chartjs": "^5.3.0"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.0",
    "vue-tsc": "^2.0.0"
  }
}
```

- [ ] **Step 2: Update vite.config.ts**

Replace the entire file:

```typescript
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [vue()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
```

- [ ] **Step 3: Update tsconfig.json**

Replace the entire file:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.vue", "vite.config.ts"]
}
```

- [ ] **Step 4: Update index.html**

Replace the entire file (remove React importmap, point to Vue entry):

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FlowFinance</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @import url('https://rsms.me/inter/inter.css');
      html { font-family: 'Inter', sans-serif; }
      @supports (font-variation-settings: normal) {
        html { font-family: 'Inter var', sans-serif; }
      }
      body {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
    </style>
  </head>
  <body class="bg-gray-100 dark:bg-gray-900">
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Install dependencies**

```bash
npm install
```

Expected: installs vue, pinia, chart.js, vue-chartjs, @vitejs/plugin-vue

- [ ] **Step 6: Commit**

```bash
git add package.json vite.config.ts tsconfig.json index.html package-lock.json
git commit -m "chore: replace React deps with Vue 3, Pinia, vue-chartjs"
```

---

## Task 2: Core Shared Code (types, utils, data)

**Files:**
- Create: `src/types/index.ts`
- Create: `src/utils/helpers.ts`
- Create: `src/data/mockData.ts`

- [ ] **Step 1: Create src/types/index.ts**

```typescript
export type TransactionType = 'actual' | 'planned'
export type CategoryType = 'income' | 'expense'

export interface Account {
  id: string
  name: string
  type: 'checking' | 'savings' | 'cash' | 'credit'
  balance: number
}

export interface Category {
  id: string
  name: string
  type: CategoryType
  color: string
}

export interface Transaction {
  id: string
  date: Date
  description: string
  amount: number
  type: TransactionType
  categoryId: string
  accountId: string
}

export interface Budget {
  categoryId: string
  amount: number
}
```

- [ ] **Step 2: Create src/utils/helpers.ts**

```typescript
import type { Transaction, Account } from '@/types'

export const classNames = (...classes: (string | boolean | undefined)[]): string => {
  return classes.filter(Boolean).join(' ')
}

export const getMonthName = (monthIndex: number): string => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  return monthNames[monthIndex]
}

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

export const calculateProjectedBalanceForDate = (
  targetDate: Date,
  accounts: Account[],
  transactions: Transaction[],
): number => {
  const initialBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)
  const relevantAmount = transactions
    .filter(t => t.date <= targetDate)
    .reduce((sum, t) => sum + t.amount, 0)
  return initialBalance + relevantAmount
}
```

- [ ] **Step 3: Create src/data/mockData.ts**

```typescript
import type { Account, Category, Budget, Transaction } from '@/types'

export const ACCOUNTS: Account[] = [
  { id: 'acc1', name: 'Checking', type: 'checking', balance: 15250 },
  { id: 'acc2', name: 'Savings', type: 'savings', balance: 30000 },
  { id: 'acc3', name: 'Credit Card', type: 'credit', balance: -2500 },
]

export const CATEGORIES: Category[] = [
  { id: 'cat1', name: 'Salary', type: 'income', color: 'bg-green-500' },
  { id: 'cat2', name: 'Freelance', type: 'income', color: 'bg-emerald-500' },
  { id: 'cat3', name: 'Food', type: 'expense', color: 'bg-yellow-500' },
  { id: 'cat4', name: 'Transport', type: 'expense', color: 'bg-blue-500' },
  { id: 'cat5', name: 'Entertainment', type: 'expense', color: 'bg-purple-500' },
  { id: 'cat6', name: 'Loans', type: 'expense', color: 'bg-red-500' },
  { id: 'cat7', name: 'Shopping', type: 'expense', color: 'bg-pink-500' },
]

export const BUDGETS: Budget[] = [
  { categoryId: 'cat3', amount: 1200 },
  { categoryId: 'cat4', amount: 400 },
  { categoryId: 'cat5', amount: 800 },
  { categoryId: 'cat7', amount: 1000 },
]

const today = new Date()
const currentMonth = today.getMonth()
const currentYear = today.getFullYear()

export const TRANSACTIONS: Transaction[] = [
  { id: 't1', date: new Date(currentYear, currentMonth, 2), description: 'Groceries', amount: -150, type: 'actual', categoryId: 'cat3', accountId: 'acc1' },
  { id: 't2', date: new Date(currentYear, currentMonth, 3), description: 'Gas', amount: -50, type: 'actual', categoryId: 'cat4', accountId: 'acc1' },
  { id: 't3', date: new Date(currentYear, currentMonth, 5), description: 'Movie Night', amount: -75, type: 'actual', categoryId: 'cat5', accountId: 'acc3' },
  { id: 't4', date: new Date(currentYear, currentMonth, 1), description: 'Salary', amount: 4000, type: 'actual', categoryId: 'cat1', accountId: 'acc1' },
  { id: 't5', date: new Date(currentYear, currentMonth, 15), description: 'Paycheck', amount: 4000, type: 'planned', categoryId: 'cat1', accountId: 'acc1' },
  { id: 't6', date: new Date(currentYear, currentMonth, 20), description: 'Freelance Project', amount: 1500, type: 'planned', categoryId: 'cat2', accountId: 'acc1' },
  { id: 't7', date: new Date(currentYear, currentMonth, 25), description: 'Rent', amount: -2000, type: 'planned', categoryId: 'cat6', accountId: 'acc1' },
  { id: 't8', date: new Date(currentYear, currentMonth, 28), description: 'Car Payment', amount: -450, type: 'planned', categoryId: 'cat6', accountId: 'acc1' },
  { id: 't9', date: new Date(currentYear, currentMonth, 18), description: 'New Gadget', amount: -1200, type: 'planned', categoryId: 'cat7', accountId: 'acc3' },
  { id: 't10', date: new Date(currentYear, currentMonth, 19), description: 'Vacation Deposit', amount: -3500, type: 'planned', categoryId: 'cat5', accountId: 'acc1' },
  { id: 't11', date: new Date(currentYear, currentMonth + 1, 1), description: 'Salary', amount: 4000, type: 'planned', categoryId: 'cat1', accountId: 'acc1' },
]
```

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: add core types, utils, and mock data for Vue migration"
```

---

## Task 3: Pinia Store + Composable

**Files:**
- Create: `src/stores/finance.ts`
- Create: `src/composables/useProjectedBalance.ts`

- [ ] **Step 1: Create src/stores/finance.ts**

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Transaction, Account, Category, Budget } from '@/types'
import { ACCOUNTS, CATEGORIES, BUDGETS, TRANSACTIONS } from '@/data/mockData'
import { isSameDay, calculateProjectedBalanceForDate } from '@/utils/helpers'

export const useFinanceStore = defineStore('finance', () => {
  // State
  const transactions = ref<Transaction[]>(TRANSACTIONS)
  const accounts = ref<Account[]>(ACCOUNTS)
  const categories = ref<Category[]>(CATEGORIES)
  const budgets = ref<Budget[]>(BUDGETS)
  const currentDate = ref(new Date())
  const selectedDate = ref<Date | null>(new Date())

  // Actions
  function prevMonth() {
    currentDate.value = new Date(
      currentDate.value.getFullYear(),
      currentDate.value.getMonth() - 1,
      1,
    )
  }

  function nextMonth() {
    currentDate.value = new Date(
      currentDate.value.getFullYear(),
      currentDate.value.getMonth() + 1,
      1,
    )
  }

  function selectDate(date: Date | null) {
    selectedDate.value = date
  }

  function updateTransaction(id: string, changes: Partial<Transaction>) {
    const idx = transactions.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      transactions.value[idx] = { ...transactions.value[idx], ...changes }
    }
  }

  // Getters
  const totalBalance = computed(() =>
    accounts.value.reduce((sum, acc) => sum + acc.balance, 0),
  )

  const monthTransactions = computed(() =>
    transactions.value.filter(
      t =>
        t.date.getMonth() === currentDate.value.getMonth() &&
        t.date.getFullYear() === currentDate.value.getFullYear(),
    ),
  )

  const monthlyIncome = computed(() =>
    monthTransactions.value
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0),
  )

  const monthlyExpenses = computed(() =>
    monthTransactions.value
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0),
  )

  const transactionsForSelectedDay = computed(() => {
    if (!selectedDate.value) return []
    return transactions.value
      .filter(t => isSameDay(t.date, selectedDate.value!))
      .sort((a, b) => a.amount - b.amount)
  })

  function getProjectedBalanceForDate(date: Date): number {
    return calculateProjectedBalanceForDate(date, accounts.value, transactions.value)
  }

  function getTransactionsForDate(date: Date): Transaction[] {
    return transactions.value.filter(t => isSameDay(t.date, date))
  }

  return {
    transactions,
    accounts,
    categories,
    budgets,
    currentDate,
    selectedDate,
    prevMonth,
    nextMonth,
    selectDate,
    updateTransaction,
    totalBalance,
    monthTransactions,
    monthlyIncome,
    monthlyExpenses,
    transactionsForSelectedDay,
    getProjectedBalanceForDate,
    getTransactionsForDate,
  }
})
```

- [ ] **Step 2: Create src/composables/useProjectedBalance.ts**

```typescript
import { useFinanceStore } from '@/stores/finance'

export function useProjectedBalance() {
  const store = useFinanceStore()

  function balanceClassForDate(date: Date): string {
    const balance = store.getProjectedBalanceForDate(date)
    if (balance < 0) return 'bg-red-500 text-white rounded px-1'
    if (balance < 5000) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  return { balanceClassForDate }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/stores/ src/composables/
git commit -m "feat: add Pinia finance store and useProjectedBalance composable"
```

---

## Task 4: UI Primitives — Card, ProgressBar, Icons

**Files:**
- Create: `src/components/ui/AppCard.vue`
- Create: `src/components/ui/ProgressBar.vue`
- Create: `src/components/icons/ChevronLeftIcon.vue`
- Create: `src/components/icons/ChevronRightIcon.vue`
- Create: `src/components/icons/PlusIcon.vue`
- Create: `src/components/icons/UserIcon.vue`
- Create: `src/components/icons/SettingsIcon.vue`
- Create: `src/components/icons/TrendingUpIcon.vue`

- [ ] **Step 1: Create src/components/ui/AppCard.vue**

```vue
<script setup lang="ts">
defineProps<{ class?: string }>()
</script>

<template>
  <div :class="`bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-xl shadow-sm p-4 ${$props.class ?? ''}`">
    <slot />
  </div>
</template>
```

- [ ] **Step 2: Create src/components/ui/ProgressBar.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ value: number; max: number }>()

const percentage = computed(() => Math.min((props.value / props.max) * 100, 100))

const colorClass = computed(() => {
  if (percentage.value > 95) return 'bg-red-500'
  if (percentage.value > 75) return 'bg-yellow-500'
  return 'bg-green-500'
})
</script>

<template>
  <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
    <div
      :class="`h-2 rounded-full ${colorClass}`"
      :style="{ width: `${percentage}%` }"
    />
  </div>
</template>
```

- [ ] **Step 3: Create src/components/icons/ChevronLeftIcon.vue**

```vue
<template>
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
</template>
```

- [ ] **Step 4: Create src/components/icons/ChevronRightIcon.vue**

```vue
<template>
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
</template>
```

- [ ] **Step 5: Create src/components/icons/PlusIcon.vue**

```vue
<template>
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
</template>
```

- [ ] **Step 6: Create src/components/icons/UserIcon.vue**

```vue
<template>
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
</template>
```

- [ ] **Step 7: Create src/components/icons/SettingsIcon.vue**

```vue
<template>
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
</template>
```

- [ ] **Step 8: Create src/components/icons/TrendingUpIcon.vue**

```vue
<template>
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
</template>
```

- [ ] **Step 9: Commit**

```bash
git add src/components/
git commit -m "feat: add UI primitives (AppCard, ProgressBar) and icon components"
```

---

## Task 5: AppHeader.vue

**Files:**
- Create: `src/components/AppHeader.vue`

- [ ] **Step 1: Create src/components/AppHeader.vue**

```vue
<script setup lang="ts">
import { useFinanceStore } from '@/stores/finance'
import { getMonthName } from '@/utils/helpers'
import ChevronLeftIcon from '@/components/icons/ChevronLeftIcon.vue'
import ChevronRightIcon from '@/components/icons/ChevronRightIcon.vue'
import UserIcon from '@/components/icons/UserIcon.vue'
import SettingsIcon from '@/components/icons/SettingsIcon.vue'

const store = useFinanceStore()
</script>

<template>
  <header class="fixed top-0 left-0 right-0 h-16 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 z-10 flex items-center px-6">
    <div class="flex items-center space-x-3 w-1/4">
      <div class="w-8 h-8 bg-blue-500 rounded-lg" />
      <h1 class="text-xl font-bold text-gray-800 dark:text-white">FlowFinance</h1>
    </div>

    <div class="flex-1 flex items-center justify-center">
      <div class="flex items-center space-x-2 bg-gray-200/50 dark:bg-gray-700/50 p-1 rounded-lg">
        <button
          class="p-1 rounded-md hover:bg-gray-300/50 dark:hover:bg-gray-600/50 transition-colors"
          @click="store.prevMonth()"
        >
          <ChevronLeftIcon class="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <span class="font-semibold text-gray-700 dark:text-gray-200 w-32 text-center">
          {{ getMonthName(store.currentDate.getMonth()) }} {{ store.currentDate.getFullYear() }}
        </span>
        <button
          class="p-1 rounded-md hover:bg-gray-300/50 dark:hover:bg-gray-600/50 transition-colors"
          @click="store.nextMonth()"
        >
          <ChevronRightIcon class="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>
    </div>

    <div class="w-1/4 flex items-center justify-end space-x-4">
      <button class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
        <SettingsIcon class="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
      <button class="flex items-center space-x-2">
        <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          <UserIcon class="w-5 h-5 text-gray-600" />
        </div>
      </button>
    </div>
  </header>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AppHeader.vue
git commit -m "feat: add AppHeader Vue component"
```

---

## Task 6: LeftSidebar.vue

**Files:**
- Create: `src/components/LeftSidebar.vue`

- [ ] **Step 1: Create src/components/LeftSidebar.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import AppCard from '@/components/ui/AppCard.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import TrendingUpIcon from '@/components/icons/TrendingUpIcon.vue'
import PlusIcon from '@/components/icons/PlusIcon.vue'

const store = useFinanceStore()
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const plannedCommitments = computed(() =>
  store.transactions
    .filter(t => t.type === 'planned' && t.date > new Date())
    .reduce((sum, t) => sum + t.amount, 0),
)

const availableFunds = computed(() => store.totalBalance + plannedCommitments.value)

function getBudgetSpent(categoryId: string): number {
  return Math.abs(
    store.monthTransactions
      .filter(t => t.categoryId === categoryId && t.type === 'actual')
      .reduce((sum, t) => sum + t.amount, 0),
  )
}
</script>

<template>
  <aside class="w-[300px] fixed top-16 left-0 h-[calc(100vh-4rem)] p-4 space-y-4 overflow-y-auto">
    <AppCard>
      <h2 class="font-bold text-lg mb-2 text-gray-800 dark:text-gray-100">Summary</h2>
      <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
        <div class="flex justify-between">
          <span>Total Balance:</span>
          <span class="font-mono font-semibold text-gray-800 dark:text-gray-100">
            {{ currency.format(store.totalBalance) }}
          </span>
        </div>
        <div class="flex justify-between">
          <span>Monthly Income:</span>
          <span class="font-mono text-green-500">+{{ currency.format(store.monthlyIncome) }}</span>
        </div>
        <div class="flex justify-between">
          <span>Monthly Expenses:</span>
          <span class="font-mono text-red-500">{{ currency.format(store.monthlyExpenses) }}</span>
        </div>
        <div class="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <span class="font-semibold">Available Funds:</span>
          <span class="font-mono font-bold text-blue-500">{{ currency.format(availableFunds) }}</span>
        </div>
      </div>
      <div class="flex items-center text-xs text-green-600 mt-2">
        <TrendingUpIcon class="w-4 h-4 mr-1" />
        <span>+5.2% vs last month</span>
      </div>
    </AppCard>

    <AppCard>
      <div class="flex justify-between items-center mb-2">
        <h2 class="font-bold text-lg text-gray-800 dark:text-gray-100">Accounts</h2>
        <button class="text-blue-500 hover:text-blue-600">
          <PlusIcon class="w-5 h-5" />
        </button>
      </div>
      <ul class="space-y-2 text-sm">
        <li
          v-for="acc in store.accounts"
          :key="acc.id"
          class="flex justify-between text-gray-600 dark:text-gray-300"
        >
          <span>{{ acc.name }}</span>
          <span class="font-mono">{{ currency.format(acc.balance) }}</span>
        </li>
      </ul>
    </AppCard>

    <AppCard>
      <h2 class="font-bold text-lg mb-2 text-gray-800 dark:text-gray-100">Budget Progress</h2>
      <div class="space-y-4">
        <div
          v-for="budget in store.budgets"
          :key="budget.categoryId"
          class="text-sm"
        >
          <template v-if="store.categories.find(c => c.id === budget.categoryId) as any">
            <div class="flex justify-between mb-1">
              <span class="text-gray-600 dark:text-gray-300">
                {{ store.categories.find(c => c.id === budget.categoryId)!.name }}
              </span>
              <span
                :class="getBudgetSpent(budget.categoryId) > budget.amount
                  ? 'font-mono text-xs text-red-500'
                  : 'font-mono text-xs text-gray-500 dark:text-gray-400'"
              >
                {{ getBudgetSpent(budget.categoryId) > budget.amount ? '⚠️ ' : '' }}{{ currency.format(getBudgetSpent(budget.categoryId)) }} / {{ currency.format(budget.amount) }}
              </span>
            </div>
            <ProgressBar :value="getBudgetSpent(budget.categoryId)" :max="budget.amount" />
          </template>
        </div>
      </div>
    </AppCard>
  </aside>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LeftSidebar.vue
git commit -m "feat: add LeftSidebar Vue component"
```

---

## Task 7: MainCalendar.vue

**Files:**
- Create: `src/components/MainCalendar.vue`

- [ ] **Step 1: Create src/components/MainCalendar.vue**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { isSameDay, classNames } from '@/utils/helpers'
import { useProjectedBalance } from '@/composables/useProjectedBalance'
import PlusIcon from '@/components/icons/PlusIcon.vue'
import type { Transaction } from '@/types'

const store = useFinanceStore()
const { balanceClassForDate } = useProjectedBalance()
const draggedTransactionId = ref<string | null>(null)
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

const year = computed(() => store.currentDate.getFullYear())
const month = computed(() => store.currentDate.getMonth())
const firstDayOfMonth = computed(() => new Date(year.value, month.value, 1).getDay())
const daysInMonth = computed(() => new Date(year.value, month.value + 1, 0).getDate())

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const gridStyle = computed(() => ({
  gridTemplateRows: `auto repeat(${Math.ceil((daysInMonth.value + firstDayOfMonth.value) / 7)}, minmax(120px, 1fr))`,
}))

function getDayDate(day: number): Date {
  return new Date(year.value, month.value, day)
}

function handleDragStart(e: DragEvent, transactionId: string) {
  e.dataTransfer!.setData('transactionId', transactionId)
  draggedTransactionId.value = transactionId
}

function handleDrop(e: DragEvent, date: Date) {
  e.preventDefault()
  const id = e.dataTransfer!.getData('transactionId')
  store.updateTransaction(id, { date })
  draggedTransactionId.value = null
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
}

function getCategoryColor(transaction: Transaction): string {
  return store.categories.find(c => c.id === transaction.categoryId)?.color ?? 'bg-gray-400'
}
</script>

<template>
  <main class="flex-1 overflow-y-auto p-4">
    <!-- Control Bar -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center bg-gray-200/50 dark:bg-gray-700/50 p-1 rounded-lg text-sm font-medium">
        <button class="px-3 py-1 rounded-md text-gray-500 dark:text-gray-400">Actual</button>
        <button class="px-3 py-1 rounded-md text-gray-500 dark:text-gray-400">Plan</button>
        <button class="px-3 py-1 rounded-md bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm">Combined</button>
      </div>
      <button class="flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors">
        <PlusIcon class="w-5 h-5 mr-1" />
        Add Transaction
      </button>
    </div>

    <!-- Calendar Grid -->
    <div
      class="grid grid-cols-7 bg-white dark:bg-gray-800 border-l border-b border-gray-200 dark:border-gray-700 rounded-lg shadow-sm"
      :style="gridStyle"
    >
      <!-- Weekday headers -->
      <div
        v-for="wd in weekdays"
        :key="wd"
        class="text-center font-semibold text-xs text-gray-500 dark:text-gray-400 py-2"
      >
        {{ wd }}
      </div>

      <!-- Blank leading days -->
      <div
        v-for="i in firstDayOfMonth"
        :key="`blank-${i}`"
        class="border-t border-r border-gray-200 dark:border-gray-700"
      />

      <!-- Month days -->
      <div
        v-for="day in daysInMonth"
        :key="day"
        class="relative border-t border-r border-gray-200 dark:border-gray-700 p-2 min-h-[120px] flex flex-col transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
        @click="store.selectDate(getDayDate(day))"
        @drop="handleDrop($event, getDayDate(day))"
        @dragover="handleDragOver"
      >
        <div class="flex justify-between items-center">
          <span
            :class="classNames(
              'text-sm font-medium',
              isSameDay(getDayDate(day), new Date())
                ? 'bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center'
                : 'text-gray-700 dark:text-gray-200',
            )"
          >
            {{ day }}
          </span>
          <span :class="`font-mono text-xs font-bold ${balanceClassForDate(getDayDate(day))}`">
            {{ currency.format(store.getProjectedBalanceForDate(getDayDate(day))) }}
          </span>
        </div>

        <div class="flex-1 mt-1 overflow-hidden">
          <div
            v-for="t in store.getTransactionsForDate(getDayDate(day)).slice(0, 2)"
            :key="t.id"
            :class="classNames(
              'text-xs text-white rounded px-1.5 py-0.5 mb-1 cursor-grab active:cursor-grabbing truncate',
              getCategoryColor(t),
              t.type === 'planned' ? 'opacity-60 border border-dashed border-white/50' : '',
            )"
            draggable="true"
            @dragstart="handleDragStart($event, t.id)"
          >
            {{ t.description }}
          </div>
          <p
            v-if="store.getTransactionsForDate(getDayDate(day)).length > 2"
            class="text-xs text-gray-500 dark:text-gray-400 mt-1"
          >
            +{{ store.getTransactionsForDate(getDayDate(day)).length - 2 }} more
          </p>
        </div>
      </div>
    </div>
  </main>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MainCalendar.vue
git commit -m "feat: add MainCalendar Vue component with drag-and-drop"
```

---

## Task 8: RightSidebar.vue

**Files:**
- Create: `src/components/RightSidebar.vue`

- [ ] **Step 1: Create src/components/RightSidebar.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { getMonthName, classNames } from '@/utils/helpers'
import AppCard from '@/components/ui/AppCard.vue'

const store = useFinanceStore()
const activeTab = ref<'transactions' | 'budget'>('transactions')
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
</script>

<template>
  <aside class="w-[350px] fixed top-16 right-0 h-[calc(100vh-4rem)] p-4 space-y-4 overflow-y-auto">
    <!-- No date selected -->
    <template v-if="!store.selectedDate">
      <AppCard class="text-center text-gray-500 dark:text-gray-400">
        Select a day to see details.
      </AppCard>
    </template>

    <!-- Date selected -->
    <template v-else>
      <AppCard>
        <h2 class="font-bold text-xl mb-4 text-gray-800 dark:text-gray-100">
          {{ getMonthName(store.selectedDate.getMonth()) }}
          {{ store.selectedDate.getDate() }},
          {{ store.selectedDate.getFullYear() }}
        </h2>

        <!-- Tabs -->
        <div class="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            :class="classNames(
              'py-2 px-4 text-sm font-medium',
              activeTab === 'transactions'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
            )"
            @click="activeTab = 'transactions'"
          >
            Transactions
          </button>
          <button
            :class="classNames(
              'py-2 px-4 text-sm font-medium',
              activeTab === 'budget'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
            )"
            @click="activeTab = 'budget'"
          >
            Budget Impact
          </button>
        </div>

        <!-- Transactions tab -->
        <div v-if="activeTab === 'transactions'">
          <p v-if="store.transactionsForSelectedDay.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
            No transactions for this day.
          </p>
          <ul v-else class="space-y-3">
            <li
              v-for="t in store.transactionsForSelectedDay"
              :key="t.id"
              class="flex items-center"
            >
              <div
                :class="`w-2 h-2 rounded-full mr-3 ${store.categories.find(c => c.id === t.categoryId)?.color}`"
              />
              <div class="flex-1">
                <p class="font-medium text-gray-800 dark:text-gray-100">{{ t.description }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ store.categories.find(c => c.id === t.categoryId)?.name }}
                  {{ t.type === 'planned' ? '(Planned)' : '' }}
                </p>
              </div>
              <span :class="`font-mono font-semibold ${t.amount > 0 ? 'text-green-500' : 'text-gray-700 dark:text-gray-200'}`">
                {{ t.amount > 0 ? '+' : '' }}{{ currency.format(t.amount) }}
              </span>
            </li>
          </ul>
        </div>

        <!-- Budget tab -->
        <div v-if="activeTab === 'budget'" class="text-sm text-gray-500 dark:text-gray-400">
          <p>Budget impact analysis for this day will be shown here.</p>
        </div>
      </AppCard>
    </template>
  </aside>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RightSidebar.vue
git commit -m "feat: add RightSidebar Vue component"
```

---

## Task 9: AnalyticsPanel.vue

**Files:**
- Create: `src/components/AnalyticsPanel.vue`

- [ ] **Step 1: Create src/components/AnalyticsPanel.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { useFinanceStore } from '@/stores/finance'
import AppCard from '@/components/ui/AppCard.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const store = useFinanceStore()
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const chartData = computed(() => {
  const labels: string[] = []
  const balances: number[] = []

  const startDate = new Date(store.currentDate.getFullYear(), store.currentDate.getMonth(), 1)
  const endDate = new Date(store.currentDate.getFullYear(), store.currentDate.getMonth() + 2, 0)

  for (const d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    labels.push(new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    balances.push(store.getProjectedBalanceForDate(new Date(d)))
  }

  return {
    labels,
    datasets: [
      {
        label: 'Balance',
        data: balances,
        borderColor: '#3b82f6',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true },
    tooltip: {
      callbacks: {
        label: (ctx: any) => `Balance: ${currency.format(ctx.parsed.y)}`,
      },
    },
  },
  scales: {
    x: {
      ticks: { font: { size: 12 } },
      grid: { color: 'rgba(0,0,0,0.1)' },
    },
    y: {
      ticks: {
        font: { size: 12 },
        callback: (val: number) => `$${(val / 1000).toFixed(0)}k`,
      },
      grid: { color: 'rgba(0,0,0,0.1)' },
    },
  },
}))
</script>

<template>
  <div class="fixed bottom-0 left-[300px] right-[350px] h-64 p-4 z-10">
    <AppCard class="h-full w-full flex flex-col">
      <h2 class="font-bold text-lg mb-2 text-gray-800 dark:text-gray-100">Cash Flow Forecast</h2>
      <div class="flex-1 -mx-4 -mb-4">
        <Line :data="chartData" :options="(chartOptions as any)" />
      </div>
    </AppCard>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AnalyticsPanel.vue
git commit -m "feat: add AnalyticsPanel with vue-chartjs line chart"
```

---

## Task 10: App.vue + main.ts

**Files:**
- Create: `src/App.vue`
- Create: `src/main.ts`

- [ ] **Step 1: Create src/App.vue**

```vue
<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import LeftSidebar from '@/components/LeftSidebar.vue'
import MainCalendar from '@/components/MainCalendar.vue'
import RightSidebar from '@/components/RightSidebar.vue'
import AnalyticsPanel from '@/components/AnalyticsPanel.vue'
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
    <AppHeader />
    <div class="flex flex-1 pt-16">
      <LeftSidebar />
      <div class="flex-1 ml-[300px] mr-[350px] overflow-hidden">
        <MainCalendar />
      </div>
      <RightSidebar />
      <AnalyticsPanel />
    </div>
  </div>
</template>
```

- [ ] **Step 2: Create src/main.ts**

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
```

- [ ] **Step 3: Start dev server and verify**

```bash
npm run dev
```

Expected: server starts at http://localhost:3000, app renders without console errors.

Open http://localhost:3000 and verify:
- Header shows with month navigation
- Left sidebar shows accounts, budgets, summary
- Calendar grid renders with transactions and balance amounts
- Right sidebar shows when clicking a day
- Bottom analytics chart renders
- Drag-and-drop moves transactions between days

- [ ] **Step 4: Commit**

```bash
git add src/App.vue src/main.ts
git commit -m "feat: add App.vue and main.ts — Vue 3 app is live"
```

---

## Task 11: Remove Old React Files

**Run only after Task 10 is verified working.**

- [ ] **Step 1: Delete React source files**

```bash
rm App.tsx index.tsx types.ts
rm -rf components/ utils/ data/
```

- [ ] **Step 2: Verify app still works**

```bash
npm run dev
```

Expected: app still loads at http://localhost:3000 with no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove React source files — migration to Vue 3 complete"
```

---

## Parallelization Guide for Subagents

Tasks 5–9 (AppHeader, LeftSidebar, MainCalendar, RightSidebar, AnalyticsPanel) can run in parallel — they each depend only on the store (Task 3) and UI primitives (Task 4), not on each other.

```
Task 1 (infra) → Task 2 (core) → Task 3 (store) → Task 4 (UI primitives)
                                                  ↓
                              Tasks 5–9 (components, in parallel)
                                                  ↓
                                          Task 10 (App.vue)
                                                  ↓
                                          Task 11 (cleanup)
```
