# Loans Advanced Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add current balance input for existing loans, early payments with recalculation (reduce term or reduce payment), a loan view mode with payment schedule, and "mark as paid up to today" functionality.

**Architecture:** Extend the `Loan` type with `currentBalance` and `earlyPayments` fields, rewrite the `generateLoanTransactions` utility to simulate amortization with early payments in segments, update the store with three new actions, and add two UI components (EarlyPaymentModal, LoanModal view mode).

**Tech Stack:** Vue 3 + Composition API + `<script setup>`, TypeScript, Pinia, Tailwind CSS, vue-i18n v9

---

## File Map

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `EarlyPayment`, update `Loan` |
| `src/utils/loans.ts` | Rewrite — add `calculateRemainingTerm`, `getLoanStateAtDate`, update `generateLoanTransactions` |
| `src/stores/finance.ts` | Update `addLoan`, add `addEarlyPayment`, `setLoanCurrentBalance`, `markLoanPaidUpToDate`, `getLoanTransactions`, `getLoanTotalPayments`, update `getLoanMonthlyPayment` |
| `src/i18n/ru.ts` | Add new keys |
| `src/i18n/en.ts` | Add new keys |
| `src/components/EarlyPaymentModal.vue` | Create |
| `src/components/LoanModal.vue` | Add "already paying" mode + view mode |
| `src/components/LeftSidebar.vue` | Click loan → view modal, add early payment button |

---

## Task 1: Update Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Update `src/types/index.ts`**

Replace the `Loan` interface and add `EarlyPayment`:

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

export interface RecurringRule {
  id: string
  name: string
  amount: number
  categoryId: string
  accountId: string
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'yearly'
  startDate: Date
  endDate: Date | null
  dayOfMonth?: number
}

export interface EarlyPayment {
  id: string
  date: Date
  amount: number
  mode: 'reduce_term' | 'reduce_payment'
}

export interface Loan {
  id: string
  name: string
  principal: number
  annualRate: number
  startDate: Date
  termMonths: number
  accountId: string
  categoryId: string
  currentBalance?: {
    date: Date
    balance: number
  }
  earlyPayments: EarlyPayment[]
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx vue-tsc --noEmit`

Expected: errors only from files that still use old `Loan` shape (will fix in next tasks). Zero errors in `src/types/index.ts` itself.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add EarlyPayment type and extend Loan with currentBalance and earlyPayments"
```

---

## Task 2: Rewrite loans.ts

**Files:**
- Modify: `src/utils/loans.ts`

- [ ] **Step 1: Rewrite `src/utils/loans.ts` completely**

```typescript
import type { Loan, Transaction, EarlyPayment } from '@/types'

export function calculateAnnuityPayment(
  principal: number,
  annualRate: number,
  termMonths: number,
): number {
  if (termMonths <= 0 || principal <= 0) return 0
  const r = annualRate / 100 / 12
  if (r === 0) return Math.round((principal / termMonths) * 100) / 100
  const payment =
    (principal * (r * Math.pow(1 + r, termMonths))) / (Math.pow(1 + r, termMonths) - 1)
  return Math.round(payment * 100) / 100
}

/**
 * Given current balance, rate, and fixed monthly payment — how many months remain?
 */
export function calculateRemainingTerm(
  balance: number,
  annualRate: number,
  monthlyPayment: number,
): number {
  if (balance <= 0) return 0
  const r = annualRate / 100 / 12
  if (r === 0) return Math.ceil(balance / monthlyPayment)
  if (monthlyPayment <= balance * r) return 999 // payment doesn't cover interest
  return Math.ceil(Math.log(monthlyPayment / (monthlyPayment - r * balance)) / Math.log(1 + r))
}

function monthsBetween(start: Date, end: Date): number {
  return (
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  )
}

function addOneMonth(date: Date): Date {
  const next = new Date(date)
  next.setMonth(next.getMonth() + 1)
  return next
}

/**
 * Returns the loan state (balance, monthly payment, remaining term) at a given date,
 * accounting for all early payments that occur before that date.
 * Used by EarlyPaymentModal for live preview.
 */
export function getLoanStateAtDate(
  loan: Loan,
  atDate: Date,
): { balance: number; monthlyPayment: number; remainingTerm: number } {
  const r = loan.annualRate / 100 / 12

  let segmentDate: Date
  let balance: number
  let term: number

  if (loan.currentBalance) {
    segmentDate = new Date(loan.currentBalance.date)
    balance = loan.currentBalance.balance
    const endDate = new Date(loan.startDate)
    endDate.setMonth(endDate.getMonth() + loan.termMonths)
    term = Math.max(1, monthsBetween(segmentDate, endDate))
  } else {
    segmentDate = new Date(loan.startDate)
    balance = loan.principal
    term = loan.termMonths
  }

  const sortedEarlyPayments = [...loan.earlyPayments]
    .filter((ep) => new Date(ep.date) < atDate)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let monthlyPayment = calculateAnnuityPayment(balance, loan.annualRate, term)

  for (const ep of sortedEarlyPayments) {
    const epDate = new Date(ep.date)

    while (segmentDate < epDate && term > 0) {
      const interest = balance * r
      balance = Math.max(0, balance - (monthlyPayment - interest))
      term--
      segmentDate = addOneMonth(segmentDate)
    }

    balance = Math.max(0, balance - ep.amount)
    if (balance <= 0) return { balance: 0, monthlyPayment, remainingTerm: 0 }

    if (ep.mode === 'reduce_term') {
      term = calculateRemainingTerm(balance, loan.annualRate, monthlyPayment)
    } else {
      monthlyPayment = calculateAnnuityPayment(balance, loan.annualRate, term)
    }
  }

  // Advance to atDate
  while (segmentDate < atDate && term > 0) {
    const interest = balance * r
    balance = Math.max(0, balance - (monthlyPayment - interest))
    term--
    segmentDate = addOneMonth(segmentDate)
  }

  return { balance: Math.max(0, balance), monthlyPayment, remainingTerm: term }
}

export function generateLoanTransactions(loan: Loan): Transaction[] {
  const r = loan.annualRate / 100 / 12

  // Determine starting point
  let segmentDate: Date
  let segmentBalance: number
  let segmentTerm: number

  if (loan.currentBalance) {
    segmentDate = new Date(loan.currentBalance.date)
    segmentBalance = loan.currentBalance.balance
    const endDate = new Date(loan.startDate)
    endDate.setMonth(endDate.getMonth() + loan.termMonths)
    segmentTerm = Math.max(1, monthsBetween(segmentDate, endDate))
  } else {
    segmentDate = new Date(loan.startDate)
    segmentBalance = loan.principal
    segmentTerm = loan.termMonths
  }

  const sortedEarlyPayments = [...loan.earlyPayments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )

  const transactions: Transaction[] = []
  let monthlyPayment = calculateAnnuityPayment(segmentBalance, loan.annualRate, segmentTerm)
  let paymentIndex = 0

  for (const ep of sortedEarlyPayments) {
    const epDate = new Date(ep.date)

    // Generate regular payments before the early payment date
    while (segmentDate < epDate && segmentTerm > 0) {
      transactions.push({
        id: `loan-${loan.id}-${paymentIndex}`,
        date: new Date(segmentDate),
        description: loan.name,
        amount: -monthlyPayment,
        type: 'planned',
        categoryId: loan.categoryId,
        accountId: loan.accountId,
      })
      const interest = segmentBalance * r
      segmentBalance = Math.max(0, segmentBalance - (monthlyPayment - interest))
      segmentTerm--
      paymentIndex++
      segmentDate = addOneMonth(segmentDate)
    }

    if (segmentBalance <= 0) break

    // Early payment transaction (type: actual)
    transactions.push({
      id: `loan-${loan.id}-early-${ep.id}`,
      date: new Date(epDate),
      description: `${loan.name} — досрочный платёж`,
      amount: -ep.amount,
      type: 'actual',
      categoryId: loan.categoryId,
      accountId: loan.accountId,
    })

    segmentBalance = Math.max(0, segmentBalance - ep.amount)
    if (segmentBalance <= 0) break

    if (ep.mode === 'reduce_term') {
      segmentTerm = calculateRemainingTerm(segmentBalance, loan.annualRate, monthlyPayment)
    } else {
      // reduce_payment: same term, lower payment
      monthlyPayment = calculateAnnuityPayment(segmentBalance, loan.annualRate, segmentTerm)
    }
  }

  // Generate remaining regular payments
  for (let i = 0; i < segmentTerm && segmentBalance > 0; i++) {
    transactions.push({
      id: `loan-${loan.id}-${paymentIndex}`,
      date: new Date(segmentDate),
      description: loan.name,
      amount: -monthlyPayment,
      type: 'planned',
      categoryId: loan.categoryId,
      accountId: loan.accountId,
    })
    const interest = segmentBalance * r
    segmentBalance = Math.max(0, segmentBalance - (monthlyPayment - interest))
    paymentIndex++
    segmentDate = addOneMonth(segmentDate)
  }

  return transactions
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx vue-tsc --noEmit`

Expected: errors only in `finance.ts` and UI components (not yet updated). Zero errors in `loans.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/utils/loans.ts
git commit -m "feat: rewrite loans.ts with early payments and currentBalance support"
```

---

## Task 3: Update Store

**Files:**
- Modify: `src/stores/finance.ts`

- [ ] **Step 1: Update imports and `addLoan` signature**

At the top of the file, update the import to include `EarlyPayment`:

```typescript
import type { Transaction, Account, Category, Budget, RecurringRule, Loan, EarlyPayment } from '@/types'
```

Update import from loans.ts:

```typescript
import { generateLoanTransactions, calculateAnnuityPayment, getLoanStateAtDate } from '@/utils/loans'
```

- [ ] **Step 2: Update `addLoan` to initialize `earlyPayments: []`**

Replace:
```typescript
function addLoan(loan: Omit<Loan, 'id'>) {
  const id = crypto.randomUUID()
  const newLoan: Loan = { ...loan, id }
  loans.value.push(newLoan)
  const loanTransactions = generateLoanTransactions(newLoan)
  transactions.value.push(...loanTransactions)
}
```

With:
```typescript
function addLoan(loanData: Omit<Loan, 'id' | 'earlyPayments'>): void {
  const id = crypto.randomUUID()
  const newLoan: Loan = { ...loanData, id, earlyPayments: [] }
  loans.value.push(newLoan)
  const loanTransactions = generateLoanTransactions(newLoan)
  transactions.value.push(...loanTransactions)
}
```

- [ ] **Step 3: Add helper to regenerate loan transactions**

Add a private helper function (before the return statement):

```typescript
function _regenerateLoanTransactions(loan: Loan): void {
  transactions.value = transactions.value.filter(t => !t.id.startsWith(`loan-${loan.id}-`))
  transactions.value.push(...generateLoanTransactions(loan))
}
```

- [ ] **Step 4: Add `addEarlyPayment` action**

```typescript
function addEarlyPayment(loanId: string, payment: Omit<EarlyPayment, 'id'>): void {
  const loan = loans.value.find(l => l.id === loanId)
  if (!loan) return
  const newPayment: EarlyPayment = { ...payment, id: crypto.randomUUID() }
  loan.earlyPayments.push(newPayment)
  _regenerateLoanTransactions(loan)
}
```

- [ ] **Step 5: Add `setLoanCurrentBalance` action**

```typescript
function setLoanCurrentBalance(loanId: string, date: Date, balance: number): void {
  const loan = loans.value.find(l => l.id === loanId)
  if (!loan) return
  loan.currentBalance = { date, balance }
  _regenerateLoanTransactions(loan)
}
```

- [ ] **Step 6: Add `markLoanPaidUpToDate` action**

```typescript
function markLoanPaidUpToDate(loanId: string): void {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  transactions.value = transactions.value.map(t => {
    if (
      t.id.startsWith(`loan-${loanId}-`) &&
      !t.id.includes('-early-') &&
      t.date <= today &&
      t.type === 'planned'
    ) {
      return { ...t, type: 'actual' as const }
    }
    return t
  })
}
```

- [ ] **Step 7: Add `getLoanTransactions` and `getLoanTotalPayments` helpers**

```typescript
function getLoanTransactions(loanId: string): Transaction[] {
  return transactions.value
    .filter(t => t.id.startsWith(`loan-${loanId}-`))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}

function getLoanTotalPayments(loan: Loan): number {
  return transactions.value.filter(
    t => t.id.startsWith(`loan-${loan.id}-`) && !t.id.includes('-early-'),
  ).length
}
```

- [ ] **Step 8: Update `getLoanMonthlyPayment` to use currentBalance**

Replace:
```typescript
function getLoanMonthlyPayment(loan: Loan): number {
  return calculateAnnuityPayment(loan.principal, loan.annualRate, loan.termMonths)
}
```

With:
```typescript
function getLoanMonthlyPayment(loan: Loan): number {
  if (loan.currentBalance) {
    const endDate = new Date(loan.startDate)
    endDate.setMonth(endDate.getMonth() + loan.termMonths)
    const remainingTerm = Math.max(
      1,
      (endDate.getFullYear() - loan.currentBalance.date.getFullYear()) * 12 +
        (endDate.getMonth() - loan.currentBalance.date.getMonth()),
    )
    return calculateAnnuityPayment(loan.currentBalance.balance, loan.annualRate, remainingTerm)
  }
  return calculateAnnuityPayment(loan.principal, loan.annualRate, loan.termMonths)
}
```

- [ ] **Step 9: Export new functions in return statement**

In the `return { ... }` block, add:
```typescript
addEarlyPayment,
setLoanCurrentBalance,
markLoanPaidUpToDate,
getLoanTransactions,
getLoanTotalPayments,
```

Also add `getLoanStateAtDate` as a wrapper if needed in components:
```typescript
function getLoanStateAtDate_store(loan: Loan, date: Date) {
  return getLoanStateAtDate(loan, date)
}
```

Actually, components can import `getLoanStateAtDate` directly from `@/utils/loans` — no need to proxy through store. Skip this.

- [ ] **Step 10: Verify TypeScript**

Run: `npx vue-tsc --noEmit`

Expected: errors only in UI components (not yet updated). Zero errors in `finance.ts`.

- [ ] **Step 11: Commit**

```bash
git add src/stores/finance.ts
git commit -m "feat: store actions for early payments, current balance, and mark-paid"
```

---

## Task 4: Add i18n Strings

**Files:**
- Modify: `src/i18n/ru.ts`
- Modify: `src/i18n/en.ts`

- [ ] **Step 1: Add keys to `src/i18n/ru.ts`**

At the end of the `// Loan modal` section (after `deleteLoan`), add:

```typescript
  // Loan modal — advanced
  alreadyPaying: 'Уже выплачиваю',
  newLoanMode: 'Новый кредит',
  currentBalanceAmount: 'Текущий остаток',
  balanceDate: 'По состоянию на',
  viewLoan: 'Кредит',
  paymentSchedule: 'График платежей',
  markPaidUpToToday: 'Отметить оплаченными до сегодня',
  earlyPaymentBtn: 'Досрочный платёж',
  remainingBalance: 'Остаток долга',
  paymentsCount: '{paid} из {total} платежей',

  // Early payment modal
  earlyPaymentTitle: 'Досрочный платёж',
  recalculateWhat: 'Что пересчитать?',
  reduceTerm: 'Сократить срок',
  reduceTermHint: 'платёж останется {payment}/мес',
  reducePayment: 'Уменьшить платёж',
  reducePaymentHint: 'срок останется {term} мес',
  afterPayment: 'После платежа',
  newMonthlyPayment: 'Новый платёж',
  newTermMonths: 'Новый срок',
  monthsUnit: '{n} мес',
  addEarlyPayment: 'Добавить платёж',
  date: 'Дата',
```

- [ ] **Step 2: Add keys to `src/i18n/en.ts`**

At the end of the `// Loan modal` section (after `deleteLoan`), add:

```typescript
  // Loan modal — advanced
  alreadyPaying: 'Already Paying',
  newLoanMode: 'New Loan',
  currentBalanceAmount: 'Current Balance',
  balanceDate: 'Balance Date',
  viewLoan: 'Loan',
  paymentSchedule: 'Payment Schedule',
  markPaidUpToToday: 'Mark as Paid Up to Today',
  earlyPaymentBtn: 'Early Payment',
  remainingBalance: 'Remaining Balance',
  paymentsCount: '{paid} of {total} payments',

  // Early payment modal
  earlyPaymentTitle: 'Early Payment',
  recalculateWhat: 'What to recalculate?',
  reduceTerm: 'Reduce Term',
  reduceTermHint: 'payment stays {payment}/mo',
  reducePayment: 'Reduce Payment',
  reducePaymentHint: 'term stays {term} mo',
  afterPayment: 'After Payment',
  newMonthlyPayment: 'New Payment',
  newTermMonths: 'New Term',
  monthsUnit: '{n} mo',
  addEarlyPayment: 'Add Payment',
  date: 'Date',
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx vue-tsc --noEmit`

Expected: no new errors from i18n files.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/ru.ts src/i18n/en.ts
git commit -m "feat: i18n keys for early payments and loan view mode"
```

---

## Task 5: Create EarlyPaymentModal.vue

**Files:**
- Create: `src/components/EarlyPaymentModal.vue`

- [ ] **Step 1: Create `src/components/EarlyPaymentModal.vue`**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { useI18n } from 'vue-i18n'
import { useCurrency } from '@/composables/useCurrency'
import { calculateAnnuityPayment, calculateRemainingTerm, getLoanStateAtDate } from '@/utils/loans'
import type { Loan } from '@/types'

const props = defineProps<{ modelValue: boolean; loan: Loan }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const store = useFinanceStore()
const { t } = useI18n()
const { format } = useCurrency()

const today = new Date().toISOString().slice(0, 10)
const amount = ref(0)
const date = ref(today)
const mode = ref<'reduce_term' | 'reduce_payment'>('reduce_term')

// Loan state at the selected date (before early payment)
const stateAtDate = computed(() => getLoanStateAtDate(props.loan, new Date(date.value)))

const balanceBeforePayment = computed(() => stateAtDate.value.balance)
const currentMonthlyPayment = computed(() => stateAtDate.value.monthlyPayment)
const remainingTermAtDate = computed(() => stateAtDate.value.remainingTerm)

const balanceAfterPayment = computed(() =>
  Math.max(0, balanceBeforePayment.value - amount.value),
)

// reduce_term: same payment, fewer months
const newTerm = computed(() =>
  calculateRemainingTerm(
    balanceAfterPayment.value,
    props.loan.annualRate,
    currentMonthlyPayment.value,
  ),
)

// reduce_payment: same term, lower payment
const newPayment = computed(() =>
  calculateAnnuityPayment(
    balanceAfterPayment.value,
    props.loan.annualRate,
    remainingTermAtDate.value,
  ),
)

const isValid = computed(
  () => amount.value > 0 && amount.value < balanceBeforePayment.value && date.value !== '',
)

function close() {
  emit('update:modelValue', false)
}

function submit() {
  if (!isValid.value) return
  store.addEarlyPayment(props.loan.id, {
    date: new Date(date.value),
    amount: amount.value,
    mode: mode.value,
  })
  close()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      @click.self="close"
    >
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">{{ t('earlyPaymentTitle') }}</h2>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="close">✕</button>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ loan.name }}</p>

        <!-- Amount -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('amount') }}</label>
          <input
            v-model.number="amount"
            type="number"
            min="1"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Date -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('date') }}</label>
          <input
            v-model="date"
            type="date"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Mode -->
        <div>
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('recalculateWhat') }}</p>
          <div class="space-y-2">
            <label class="flex items-start gap-2 cursor-pointer">
              <input
                v-model="mode"
                type="radio"
                value="reduce_term"
                class="mt-0.5 accent-blue-500"
              />
              <div>
                <p class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ t('reduceTerm') }}</p>
                <p class="text-xs text-gray-400">
                  {{ t('reduceTermHint', { payment: format(currentMonthlyPayment) }) }}
                </p>
              </div>
            </label>
            <label class="flex items-start gap-2 cursor-pointer">
              <input
                v-model="mode"
                type="radio"
                value="reduce_payment"
                class="mt-0.5 accent-blue-500"
              />
              <div>
                <p class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ t('reducePayment') }}</p>
                <p class="text-xs text-gray-400">
                  {{ t('reducePaymentHint', { term: remainingTermAtDate }) }}
                </p>
              </div>
            </label>
          </div>
        </div>

        <!-- Preview -->
        <div
          v-if="amount > 0 && balanceBeforePayment > 0"
          class="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 space-y-1.5 text-sm"
        >
          <p class="font-semibold text-blue-700 dark:text-blue-300 mb-2">── {{ t('afterPayment') }} ──</p>
          <div class="flex justify-between text-gray-700 dark:text-gray-300">
            <span>{{ t('remainingBalance') }}:</span>
            <span class="font-mono font-semibold">{{ format(balanceAfterPayment) }}</span>
          </div>
          <div class="flex justify-between text-gray-700 dark:text-gray-300">
            <span>{{ t('monthlyPayment') }}:</span>
            <span class="font-mono">
              <template v-if="mode === 'reduce_term'">
                {{ format(currentMonthlyPayment) }}
              </template>
              <template v-else>
                <span class="line-through text-gray-400 mr-1">{{ format(currentMonthlyPayment) }}</span>
                <span class="text-green-500">{{ format(newPayment) }}</span>
              </template>
            </span>
          </div>
          <div class="flex justify-between text-gray-700 dark:text-gray-300">
            <span>{{ t('newTermMonths') }}:</span>
            <span class="font-mono">
              <template v-if="mode === 'reduce_payment'">
                {{ t('monthsUnit', { n: remainingTermAtDate }) }}
              </template>
              <template v-else>
                <span class="line-through text-gray-400 mr-1">{{ t('monthsUnit', { n: remainingTermAtDate }) }}</span>
                <span class="text-green-500">{{ t('monthsUnit', { n: newTerm }) }}</span>
              </template>
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-2">
          <button
            class="flex-1 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            @click="close"
          >{{ t('cancel') }}</button>
          <button
            :disabled="!isValid"
            class="flex-1 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            @click="submit"
          >{{ t('addEarlyPayment') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx vue-tsc --noEmit`

Expected: no errors in `EarlyPaymentModal.vue`.

- [ ] **Step 3: Commit**

```bash
git add src/components/EarlyPaymentModal.vue
git commit -m "feat: EarlyPaymentModal with live preview for reduce_term and reduce_payment modes"
```

---

## Task 6: Update LoanModal.vue

**Files:**
- Modify: `src/components/LoanModal.vue`

This modal handles two modes:
- **Create mode** (no `viewLoan` prop): existing form + new "already paying" toggle
- **View mode** (`viewLoan` prop provided): payment schedule, mark-paid, early payment button

- [ ] **Step 1: Rewrite `src/components/LoanModal.vue`**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { useI18n } from 'vue-i18n'
import { useCurrency } from '@/composables/useCurrency'
import { calculateAnnuityPayment } from '@/utils/loans'
import EarlyPaymentModal from '@/components/EarlyPaymentModal.vue'
import type { Loan } from '@/types'

const props = defineProps<{ modelValue: boolean; viewLoan?: Loan }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const store = useFinanceStore()
const { t } = useI18n()
const { format } = useCurrency()

const isViewMode = computed(() => !!props.viewLoan)

// ── Create mode state ────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10)
const alreadyPaying = ref(false)
const name = ref('')
const principal = ref(0)
const annualRate = ref(0)
const termMonths = ref(12)
const startDate = ref(today)
const accountId = ref(store.accounts[0]?.id ?? '')
const currentBalanceAmount = ref(0)
const currentBalanceDate = ref(today)

// ── Create mode computed ─────────────────────────────────────────────
const effectivePrincipal = computed(() =>
  alreadyPaying.value ? currentBalanceAmount.value : principal.value,
)
const effectiveTerm = computed(() => {
  if (!alreadyPaying.value) return termMonths.value
  // Remaining term from balanceDate to loan end
  const start = new Date(startDate.value)
  const balDate = new Date(currentBalanceDate.value)
  const endDate = new Date(start)
  endDate.setMonth(endDate.getMonth() + termMonths.value)
  const remaining =
    (endDate.getFullYear() - balDate.getFullYear()) * 12 +
    (endDate.getMonth() - balDate.getMonth())
  return Math.max(1, remaining)
})

const monthlyPayment = computed(() =>
  calculateAnnuityPayment(effectivePrincipal.value, annualRate.value, effectiveTerm.value),
)
const totalPayments = computed(() => monthlyPayment.value * effectiveTerm.value)
const overpayment = computed(() => totalPayments.value - effectivePrincipal.value)
const lastPaymentDate = computed(() => {
  const baseDate = alreadyPaying.value ? currentBalanceDate.value : startDate.value
  if (!baseDate) return ''
  const d = new Date(baseDate)
  d.setMonth(d.getMonth() + effectiveTerm.value - 1)
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
})

const isValid = computed(() => {
  if (!name.value.trim() || annualRate.value < 0 || termMonths.value <= 0 || !startDate.value) return false
  if (alreadyPaying.value) return currentBalanceAmount.value > 0 && !!currentBalanceDate.value
  return principal.value > 0
})

// ── View mode state ──────────────────────────────────────────────────
const showEarlyPaymentModal = ref(false)

const loanTransactions = computed(() => {
  if (!props.viewLoan) return []
  return store.getLoanTransactions(props.viewLoan.id)
})

const paidCount = computed(() => {
  if (!props.viewLoan) return 0
  return store.getLoanPaidCount(props.viewLoan)
})

const totalCount = computed(() => {
  if (!props.viewLoan) return 0
  return store.getLoanTotalPayments(props.viewLoan)
})

// ── Actions ──────────────────────────────────────────────────────────
function close() {
  emit('update:modelValue', false)
}

function submit() {
  if (!isValid.value) return
  if (alreadyPaying.value) {
    store.addLoan({
      name: name.value.trim(),
      principal: currentBalanceAmount.value,
      annualRate: annualRate.value,
      startDate: new Date(startDate.value),
      termMonths: termMonths.value,
      accountId: accountId.value,
      categoryId: 'cat6',
      currentBalance: {
        date: new Date(currentBalanceDate.value),
        balance: currentBalanceAmount.value,
      },
    })
  } else {
    store.addLoan({
      name: name.value.trim(),
      principal: principal.value,
      annualRate: annualRate.value,
      startDate: new Date(startDate.value),
      termMonths: termMonths.value,
      accountId: accountId.value,
      categoryId: 'cat6',
    })
  }
  close()
}

function deleteLoan() {
  if (!props.viewLoan) return
  store.removeLoan(props.viewLoan.id)
  close()
}

function markPaid() {
  if (!props.viewLoan) return
  store.markLoanPaidUpToDate(props.viewLoan.id)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      @click.self="close"
    >
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto">

        <!-- ── VIEW MODE ─────────────────────────────────────────── -->
        <template v-if="isViewMode && viewLoan">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">{{ viewLoan.name }}</h2>
            <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="close">✕</button>
          </div>

          <!-- Loan info -->
          <div class="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 space-y-1.5 text-sm">
            <div class="flex justify-between text-gray-700 dark:text-gray-300">
              <span>{{ t('monthlyPayment') }}:</span>
              <span class="font-mono font-semibold">{{ format(store.getLoanMonthlyPayment(viewLoan)) }}</span>
            </div>
            <div class="flex justify-between text-gray-700 dark:text-gray-300">
              <span>{{ t('annualRate') }}:</span>
              <span class="font-mono">{{ viewLoan.annualRate }}%</span>
            </div>
            <div class="flex justify-between text-gray-700 dark:text-gray-300">
              <span>{{ t('termMonths') }}:</span>
              <span class="font-mono">{{ viewLoan.termMonths }}</span>
            </div>
            <div class="flex justify-between text-gray-700 dark:text-gray-300 pt-1 border-t border-blue-100 dark:border-blue-800">
              <span>{{ t('paymentsCount', { paid: paidCount, total: totalCount }) }}</span>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex gap-2">
            <button
              class="flex-1 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
              @click="markPaid"
            >{{ t('markPaidUpToToday') }}</button>
            <button
              class="flex-1 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              @click="showEarlyPaymentModal = true"
            >{{ t('earlyPaymentBtn') }}</button>
          </div>

          <!-- Payment schedule -->
          <div>
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">{{ t('paymentSchedule') }}</h3>
            <div class="space-y-1 max-h-64 overflow-y-auto pr-1">
              <div
                v-for="tx in loanTransactions"
                :key="tx.id"
                class="flex justify-between items-center text-xs px-2 py-1.5 rounded-lg"
                :class="tx.type === 'actual'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300'"
              >
                <span>{{ tx.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) }}</span>
                <span class="font-mono">
                  {{ tx.id.includes('-early-') ? '⚡' : '' }}
                  {{ format(Math.abs(tx.amount)) }}
                  <span class="ml-1 opacity-60">{{ tx.type === 'actual' ? '✓' : '' }}</span>
                </span>
              </div>
              <p v-if="loanTransactions.length === 0" class="text-xs text-gray-400 text-center py-4">—</p>
            </div>
          </div>

          <!-- Delete -->
          <button
            class="w-full py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            @click="deleteLoan"
          >{{ t('deleteLoan') }}</button>
        </template>

        <!-- ── CREATE MODE ───────────────────────────────────────── -->
        <template v-else>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">{{ t('newLoan') }}</h2>
            <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="close">✕</button>
          </div>

          <!-- Mode toggle -->
          <div class="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <button
              :class="['flex-1 py-1.5 rounded-md text-sm font-medium transition-colors', !alreadyPaying ? 'bg-white dark:bg-gray-600 shadow text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400']"
              @click="alreadyPaying = false"
            >{{ t('newLoanMode') }}</button>
            <button
              :class="['flex-1 py-1.5 rounded-md text-sm font-medium transition-colors', alreadyPaying ? 'bg-white dark:bg-gray-600 shadow text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400']"
              @click="alreadyPaying = true"
            >{{ t('alreadyPaying') }}</button>
          </div>

          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('name') }}</label>
            <input
              v-model="name"
              type="text"
              placeholder="Mortgage, Car loan…"
              class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Principal (new loan only) -->
          <div v-if="!alreadyPaying">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('principal') }}</label>
            <input
              v-model.number="principal"
              type="number"
              min="0"
              class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Current balance (already paying) -->
          <template v-if="alreadyPaying">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('currentBalanceAmount') }}</label>
              <input
                v-model.number="currentBalanceAmount"
                type="number"
                min="0"
                class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('balanceDate') }}</label>
              <input
                v-model="currentBalanceDate"
                type="date"
                class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </template>

          <!-- Annual Rate -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('annualRate') }}</label>
            <input
              v-model.number="annualRate"
              type="number"
              min="0"
              step="0.1"
              class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Term -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('termMonths') }}</label>
            <input
              v-model.number="termMonths"
              type="number"
              min="1"
              class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- First Payment Date (shown for both modes) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ alreadyPaying ? t('startDate') : t('firstPayment') }}
            </label>
            <input
              v-model="startDate"
              type="date"
              class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Account -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('account') }}</label>
            <select
              v-model="accountId"
              class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option v-for="acc in store.accounts" :key="acc.id" :value="acc.id">{{ acc.name }}</option>
            </select>
          </div>

          <!-- Preview -->
          <div
            v-if="effectivePrincipal > 0 && termMonths > 0"
            class="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 space-y-1.5 text-sm"
          >
            <p class="font-semibold text-blue-700 dark:text-blue-300 mb-2">── {{ t('preview') }} ──</p>
            <div class="flex justify-between text-gray-700 dark:text-gray-300">
              <span>{{ t('monthlyPayment') }}:</span>
              <span class="font-mono font-semibold">{{ format(monthlyPayment) }}</span>
            </div>
            <div class="flex justify-between text-gray-700 dark:text-gray-300">
              <span>{{ t('totalPayments') }}:</span>
              <span class="font-mono">{{ format(totalPayments) }}</span>
            </div>
            <div class="flex justify-between text-gray-700 dark:text-gray-300">
              <span>{{ t('overpayment') }}:</span>
              <span class="font-mono text-red-500">{{ format(overpayment) }}</span>
            </div>
            <div class="flex justify-between text-gray-700 dark:text-gray-300">
              <span>{{ t('lastPayment') }}:</span>
              <span class="font-mono">{{ lastPaymentDate }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 pt-2">
            <button
              class="flex-1 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              @click="close"
            >{{ t('cancel') }}</button>
            <button
              :disabled="!isValid"
              class="flex-1 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              @click="submit"
            >{{ t('createLoan') }}</button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>

  <!-- Early Payment Modal (view mode) -->
  <EarlyPaymentModal
    v-if="viewLoan"
    v-model="showEarlyPaymentModal"
    :loan="viewLoan"
  />
</template>
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx vue-tsc --noEmit`

Expected: no errors in `LoanModal.vue`.

- [ ] **Step 3: Commit**

```bash
git add src/components/LoanModal.vue
git commit -m "feat: LoanModal view mode with payment schedule and early payment support"
```

---

## Task 7: Update LeftSidebar.vue

**Files:**
- Modify: `src/components/LeftSidebar.vue`

- [ ] **Step 1: Add view modal state and imports**

In the `<script setup>` block, add:

```typescript
import EarlyPaymentModal from '@/components/EarlyPaymentModal.vue'
import type { Loan } from '@/types'

const viewingLoan = ref<Loan | undefined>(undefined)
const showEarlyPaymentModalForLoan = ref<Loan | undefined>(undefined)
```

Also update the existing `showLoanModal` area. The view modal will reuse `LoanModal` with the `viewLoan` prop, so add:

```typescript
const showViewLoanModal = ref(false)

function openViewLoan(loan: Loan) {
  viewingLoan.value = loan
  showViewLoanModal.value = true
}

function openEarlyPayment(loan: Loan, event: Event) {
  event.stopPropagation()
  showEarlyPaymentModalForLoan.value = loan
}
```

- [ ] **Step 2: Update the Loans section template**

Replace the entire `<!-- Loans -->` `<AppCard>` section:

```html
<!-- Loans -->
<AppCard>
  <div class="flex justify-between items-center mb-2">
    <h2 class="font-bold text-lg text-gray-800 dark:text-gray-100">{{ t('loans') }}</h2>
    <button class="text-blue-500 hover:text-blue-600" @click="showLoanModal = true">
      <PlusIcon class="w-5 h-5" />
    </button>
  </div>
  <p v-if="store.loans.length === 0" class="text-sm text-gray-400 dark:text-gray-500">
    {{ t('noLoans') }}
  </p>
  <ul v-else class="space-y-3">
    <li
      v-for="loan in store.loans"
      :key="loan.id"
      class="text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg p-1 -mx-1 transition-colors"
      @click="openViewLoan(loan)"
    >
      <div class="flex justify-between mb-1">
        <span class="font-medium text-gray-700 dark:text-gray-200">{{ loan.name }}</span>
        <div class="flex items-center gap-1">
          <span class="font-mono text-red-400 text-xs">
            {{ format(store.getLoanMonthlyPayment(loan)) }}/mo
          </span>
          <button
            class="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
            @click="openEarlyPayment(loan, $event)"
          >⚡</button>
        </div>
      </div>
      <ProgressBar
        :value="store.getLoanPaidCount(loan)"
        :max="store.getLoanTotalPayments(loan)"
      />
      <p class="text-xs text-gray-400 mt-0.5">
        {{ store.getLoanPaidCount(loan) }} / {{ store.getLoanTotalPayments(loan) }} {{ t('paymentsCount', { paid: '', total: '' }).replace('{paid}', '').replace(' of ', '').replace('{total}', '').trim() || 'payments' }}
      </p>
    </li>
  </ul>
</AppCard>
```

Wait — the `paymentsCount` i18n key is `'{paid} из {total} платежей'`. For the sidebar we just want a simple text. Replace the `<p>` with a simpler approach:

```html
<p class="text-xs text-gray-400 mt-0.5">
  {{ store.getLoanPaidCount(loan) }} / {{ store.getLoanTotalPayments(loan) }}
</p>
```

Full replacement for the Loans `<AppCard>`:

```html
<!-- Loans -->
<AppCard>
  <div class="flex justify-between items-center mb-2">
    <h2 class="font-bold text-lg text-gray-800 dark:text-gray-100">{{ t('loans') }}</h2>
    <button class="text-blue-500 hover:text-blue-600" @click="showLoanModal = true">
      <PlusIcon class="w-5 h-5" />
    </button>
  </div>
  <p v-if="store.loans.length === 0" class="text-sm text-gray-400 dark:text-gray-500">
    {{ t('noLoans') }}
  </p>
  <ul v-else class="space-y-3">
    <li
      v-for="loan in store.loans"
      :key="loan.id"
      class="text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg p-1 -mx-1 transition-colors"
      @click="openViewLoan(loan)"
    >
      <div class="flex justify-between items-center mb-1">
        <span class="font-medium text-gray-700 dark:text-gray-200 truncate max-w-[120px]">{{ loan.name }}</span>
        <div class="flex items-center gap-1 flex-shrink-0">
          <span class="font-mono text-red-400 text-xs">
            {{ format(store.getLoanMonthlyPayment(loan)) }}/mo
          </span>
          <button
            class="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
            title="Early Payment"
            @click.stop="openEarlyPayment(loan, $event)"
          >⚡</button>
        </div>
      </div>
      <ProgressBar
        :value="store.getLoanPaidCount(loan)"
        :max="store.getLoanTotalPayments(loan)"
      />
      <p class="text-xs text-gray-400 mt-0.5">
        {{ store.getLoanPaidCount(loan) }} / {{ store.getLoanTotalPayments(loan) }}
      </p>
    </li>
  </ul>
</AppCard>
```

- [ ] **Step 3: Add modals to template**

At the bottom of the template (after existing `<RecurringRuleModal>` and `<LoanModal>`), add:

```html
<LoanModal v-model="showViewLoanModal" :view-loan="viewingLoan" />
<EarlyPaymentModal
  v-if="showEarlyPaymentModalForLoan"
  v-model:model-value="!!(showEarlyPaymentModalForLoan)"
  :loan="showEarlyPaymentModalForLoan"
  @update:model-value="if (!$event) showEarlyPaymentModalForLoan = undefined"
/>
```

Wait, `v-model` on a `ref` that's `Loan | undefined` is tricky. Let me use a boolean ref instead:

```typescript
const showEarlyPaymentForLoan = ref(false)

function openEarlyPayment(loan: Loan, event: Event) {
  event.stopPropagation()
  showEarlyPaymentModalForLoan.value = loan
  showEarlyPaymentForLoan.value = true
}
```

And in template:
```html
<LoanModal v-model="showViewLoanModal" :view-loan="viewingLoan" />
<EarlyPaymentModal
  v-if="showEarlyPaymentModalForLoan"
  v-model="showEarlyPaymentForLoan"
  :loan="showEarlyPaymentModalForLoan"
/>
```

- [ ] **Step 4: Remove the import of `calculateAnnuityPayment` if no longer used in LeftSidebar**

Since we now call `store.getLoanMonthlyPayment(loan)`, remove this import from `<script setup>`:

```typescript
// Remove this line:
import { calculateAnnuityPayment } from '@/utils/loans'
```

- [ ] **Step 5: Verify TypeScript**

Run: `npx vue-tsc --noEmit`

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/LeftSidebar.vue
git commit -m "feat: loan view modal and early payment button in sidebar"
```

---

## Task 8: Final TypeScript check

- [ ] **Step 1: Full TypeScript check**

Run: `npx vue-tsc --noEmit`

Expected: zero errors.

- [ ] **Step 2: Start dev server and smoke test**

Run: `npm run dev`

Manual checks:
1. Create a "New Loan" (principal 100000, rate 12%, 24 months) → verify payment schedule appears in view modal
2. Open the loan → click "Mark as paid up to today" → verify past payments turn green (✓)
3. Open the loan → click "Early Payment" (from loan view or sidebar ⚡ button) → enter amount 20000, pick a future date, toggle reduce_term vs reduce_payment → verify preview updates live
4. Add the early payment → verify loan payment schedule updates in view modal
5. Create a loan with "Already Paying" mode → verify schedule starts from balance date
6. Delete a loan → verify all transactions removed

- [ ] **Step 3: Final commit if dev check needed any fix**

```bash
git add -p
git commit -m "fix: address issues found during smoke test"
```

---

## Acceptance Criteria

- [ ] При создании кредита с остатком — график стартует с указанной даты и суммы
- [ ] Досрочный платёж с reduce_term: ежемесячный платёж не меняется, срок сокращается
- [ ] Досрочный платёж с reduce_payment: срок не меняется, платёж уменьшается
- [ ] Preview в EarlyPaymentModal обновляется в реальном времени
- [ ] После добавления досрочного платежа транзакции пересчитываются немедленно
- [ ] Несколько досрочных платежей работают корректно
- [ ] Кредит открывается в режиме просмотра с полным графиком платежей
- [ ] Кнопка "Отметить оплаченными до сегодня" переводит прошедшие платежи в actual
- [ ] npx vue-tsc --noEmit без ошибок
