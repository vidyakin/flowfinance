import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Transaction, Account, Category, Budget, RecurringRule, Loan, EarlyPayment } from '@/types'
import { ACCOUNTS, CATEGORIES, BUDGETS, TRANSACTIONS } from '@/data/mockData'
import { isSameDay, calculateProjectedBalanceForDate } from '@/utils/helpers'
import { generateOccurrences } from '@/utils/recurring'
import { generateLoanTransactions, calculateAnnuityPayment, getLoanStateAtDate } from '@/utils/loans'

export const useFinanceStore = defineStore('finance', () => {
  // State
  const transactions = ref<Transaction[]>(TRANSACTIONS)
  const accounts = ref<Account[]>(ACCOUNTS)
  const categories = ref<Category[]>(CATEGORIES)
  const budgets = ref<Budget[]>(BUDGETS)
  const currentDate = ref(new Date())
  const selectedDate = ref<Date | null>(new Date())
  const recurringRules = ref<RecurringRule[]>([])
  const loans = ref<Loan[]>([])

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

  function addRecurringRule(rule: Omit<RecurringRule, 'id'>) {
    const id = crypto.randomUUID()
    recurringRules.value.push({ ...rule, id })
  }

  function removeRecurringRule(id: string) {
    recurringRules.value = recurringRules.value.filter(r => r.id !== id)
  }

  function updateRecurringRule(id: string, changes: Partial<RecurringRule>) {
    const idx = recurringRules.value.findIndex(r => r.id === id)
    if (idx !== -1) {
      recurringRules.value[idx] = { ...recurringRules.value[idx], ...changes }
    }
  }

  function addLoan(loanData: Omit<Loan, 'id' | 'earlyPayments'>): void {
    const id = crypto.randomUUID()
    const newLoan: Loan = { ...loanData, id, earlyPayments: [] }
    loans.value.push(newLoan)
    const loanTransactions = generateLoanTransactions(newLoan)
    transactions.value.push(...loanTransactions)
  }

  function removeLoan(id: string) {
    loans.value = loans.value.filter(l => l.id !== id)
    transactions.value = transactions.value.filter(t => !t.id.startsWith(`loan-${id}-`))
  }

  function addBalanceAdjustment(date: Date, actualBalance: number) {
    const projected = calculateProjectedBalanceForDate(date, accounts.value, allTransactions.value)
    const adjustment = actualBalance - projected
    if (adjustment === 0) return
    transactions.value.push({
      id: crypto.randomUUID(),
      date,
      description: 'Balance Adjustment',
      amount: adjustment,
      type: 'actual',
      categoryId: 'cat-adjustment',
      accountId: accounts.value[0]?.id ?? '',
    })
  }

  // Getters
  const allTransactions = computed<Transaction[]>(() => {
    const start = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1)
    const end = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 2, 0)
    const virtual = recurringRules.value.flatMap(r => generateOccurrences(r, start, end))
    return [...transactions.value, ...virtual]
  })

  const totalBalance = computed(() =>
    accounts.value.reduce((sum, acc) => sum + acc.balance, 0),
  )

  const monthTransactions = computed(() =>
    allTransactions.value.filter(
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
    return allTransactions.value
      .filter(t => isSameDay(t.date, selectedDate.value!))
      .sort((a, b) => a.amount - b.amount)
  })

  function getProjectedBalanceForDate(date: Date): number {
    return calculateProjectedBalanceForDate(date, accounts.value, allTransactions.value)
  }

  function getTransactionsForDate(date: Date): Transaction[] {
    return allTransactions.value.filter(t => isSameDay(t.date, date))
  }

  function _regenerateLoanTransactions(loan: Loan): void {
    transactions.value = transactions.value.filter(t => !t.id.startsWith(`loan-${loan.id}-`))
    transactions.value.push(...generateLoanTransactions(loan))
  }

  function addEarlyPayment(loanId: string, payment: Omit<EarlyPayment, 'id'>): void {
    const loan = loans.value.find(l => l.id === loanId)
    if (!loan) return
    const newPayment: EarlyPayment = { ...payment, id: crypto.randomUUID() }
    loan.earlyPayments.push(newPayment)
    _regenerateLoanTransactions(loan)
  }

  function setLoanCurrentBalance(loanId: string, date: Date, balance: number): void {
    const loan = loans.value.find(l => l.id === loanId)
    if (!loan) return
    loan.currentBalance = { date, balance }
    _regenerateLoanTransactions(loan)
  }

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

  function getLoanMonthlyPayment(loan: Loan): number {
    return getLoanStateAtDate(loan, new Date()).monthlyPayment + (loan.insurancePerMonth ?? 0)
  }

  function getLoanPaidCount(loan: Loan): number {
    return transactions.value.filter(
      t => t.id.startsWith(`loan-${loan.id}-`) && t.type === 'actual',
    ).length
  }

  return {
    transactions,
    accounts,
    categories,
    budgets,
    currentDate,
    selectedDate,
    recurringRules,
    loans,
    prevMonth,
    nextMonth,
    selectDate,
    updateTransaction,
    addRecurringRule,
    removeRecurringRule,
    updateRecurringRule,
    addLoan,
    removeLoan,
    addBalanceAdjustment,
    addEarlyPayment,
    setLoanCurrentBalance,
    markLoanPaidUpToDate,
    getLoanTransactions,
    getLoanTotalPayments,
    allTransactions,
    totalBalance,
    monthTransactions,
    monthlyIncome,
    monthlyExpenses,
    transactionsForSelectedDay,
    getProjectedBalanceForDate,
    getTransactionsForDate,
    getLoanMonthlyPayment,
    getLoanPaidCount,
  }
})
