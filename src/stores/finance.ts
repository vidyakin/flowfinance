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
