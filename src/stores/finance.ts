import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Transaction, Account, Category, Budget, RecurringRule, Loan, EarlyPayment } from '@/types'
import { isSameDay, calculateProjectedBalanceForDate } from '@/utils/helpers'
import { generateOccurrences } from '@/utils/recurring'
import { getLoanStateAtDate } from '@/utils/loans'
import { api } from '@/api/client'

type LoanWithTransactions = Loan & { transactions: Transaction[] }

function deserializeTransaction(t: Record<string, unknown>): Transaction {
  return { ...t, date: new Date(t.date as string) } as Transaction
}

function deserializeRecurringRule(r: Record<string, unknown>): RecurringRule {
  return {
    ...r,
    startDate: new Date(r.startDate as string),
    endDate: r.endDate ? new Date(r.endDate as string) : null,
  } as RecurringRule
}

function deserializeLoan(l: Record<string, unknown>): LoanWithTransactions {
  return {
    ...l,
    startDate: new Date(l.startDate as string),
    currentBalance: l.currentBalance
      ? {
          date: new Date((l.currentBalance as { date: string }).date),
          balance: (l.currentBalance as { balance: number }).balance,
        }
      : undefined,
    earlyPayments: ((l.earlyPayments as Record<string, unknown>[]) ?? []).map(ep => ({
      ...ep,
      date: new Date(ep.date as string),
    })) as EarlyPayment[],
    transactions: ((l.transactions as Record<string, unknown>[]) ?? []).map(deserializeTransaction),
  } as LoanWithTransactions
}

export const useFinanceStore = defineStore('finance', () => {
  const transactions = ref<Transaction[]>([])
  const accounts = ref<Account[]>([])
  const categories = ref<Category[]>([])
  const budgets = ref<Budget[]>([])
  const currentDate = ref(new Date())
  const selectedDate = ref<Date | null>(new Date())
  const recurringRules = ref<RecurringRule[]>([])
  const loans = ref<LoanWithTransactions[]>([])
  const loading = ref(false)

  async function loadInitialData(): Promise<void> {
    loading.value = true
    try {
      const [accs, cats, buds, txns, rules, lns] = await Promise.all([
        api.get<Account[]>('/accounts'),
        api.get<Category[]>('/categories'),
        api.get<Budget[]>('/budgets'),
        api.get<Record<string, unknown>[]>('/transactions'),
        api.get<Record<string, unknown>[]>('/recurring'),
        api.get<Record<string, unknown>[]>('/loans'),
      ])
      accounts.value = accs ?? []
      categories.value = cats ?? []
      budgets.value = buds ?? []
      transactions.value = (txns ?? []).map(deserializeTransaction)
      recurringRules.value = (rules ?? []).map(deserializeRecurringRule)
      loans.value = (lns ?? []).map(deserializeLoan)
    } finally {
      loading.value = false
    }
  }

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

  async function updateTransaction(id: string, changes: Partial<Transaction>): Promise<void> {
    const payload = {
      ...changes,
      date: changes.date instanceof Date ? changes.date.toISOString().slice(0, 10) : changes.date,
    }
    const updated = await api.put<Record<string, unknown>>(`/transactions/${id}`, payload)
    const idx = transactions.value.findIndex(t => t.id === id)
    if (idx !== -1) transactions.value[idx] = deserializeTransaction(updated)
  }

  async function addTransaction(data: Omit<Transaction, 'id'>): Promise<void> {
    const payload = { ...data, date: data.date.toISOString().slice(0, 10) }
    const created = await api.post<Record<string, unknown>>('/transactions', payload)
    transactions.value.push(deserializeTransaction(created))
  }

  async function deleteTransaction(id: string): Promise<void> {
    await api.delete(`/transactions/${id}`)
    transactions.value = transactions.value.filter(t => t.id !== id)
  }

  async function addRecurringRule(rule: Omit<RecurringRule, 'id'>): Promise<void> {
    const payload = {
      ...rule,
      startDate: rule.startDate instanceof Date ? rule.startDate.toISOString().slice(0, 10) : rule.startDate,
      endDate: rule.endDate instanceof Date ? rule.endDate.toISOString().slice(0, 10) : rule.endDate,
    }
    const created = await api.post<Record<string, unknown>>('/recurring', payload)
    recurringRules.value.push(deserializeRecurringRule(created))
  }

  async function removeRecurringRule(id: string): Promise<void> {
    await api.delete(`/recurring/${id}`)
    recurringRules.value = recurringRules.value.filter(r => r.id !== id)
  }

  async function updateRecurringRule(id: string, changes: Partial<RecurringRule>): Promise<void> {
    const payload = {
      ...changes,
      startDate: changes.startDate instanceof Date ? changes.startDate.toISOString().slice(0, 10) : changes.startDate,
      endDate: changes.endDate instanceof Date ? changes.endDate.toISOString().slice(0, 10) : (changes.endDate ?? null),
    }
    const updated = await api.put<Record<string, unknown>>(`/recurring/${id}`, payload)
    const idx = recurringRules.value.findIndex(r => r.id === id)
    if (idx !== -1) recurringRules.value[idx] = deserializeRecurringRule(updated)
  }

  async function addLoan(loanData: Omit<Loan, 'id' | 'earlyPayments'>): Promise<void> {
    const payload = {
      ...loanData,
      startDate: loanData.startDate instanceof Date ? loanData.startDate.toISOString().slice(0, 10) : loanData.startDate,
    }
    const created = await api.post<Record<string, unknown>>('/loans', payload)
    loans.value.push(deserializeLoan(created))
  }

  async function removeLoan(id: string): Promise<void> {
    await api.delete(`/loans/${id}`)
    loans.value = loans.value.filter(l => l.id !== id)
  }

  async function addEarlyPayment(loanId: string, payment: Omit<EarlyPayment, 'id'>): Promise<void> {
    const payload = {
      ...payment,
      date: payment.date instanceof Date ? payment.date.toISOString().slice(0, 10) : payment.date,
    }
    const updated = await api.post<Record<string, unknown>>(`/loans/${loanId}/early-payments`, payload)
    const idx = loans.value.findIndex(l => l.id === loanId)
    if (idx !== -1) loans.value[idx] = deserializeLoan(updated)
  }

  async function setLoanCurrentBalance(loanId: string, date: Date, balance: number): Promise<void> {
    const updated = await api.put<Record<string, unknown>>(`/loans/${loanId}`, {
      currentBalanceDate: date.toISOString().slice(0, 10),
      currentBalance: balance,
    })
    const idx = loans.value.findIndex(l => l.id === loanId)
    if (idx !== -1) loans.value[idx] = deserializeLoan(updated)
  }

  async function markLoanPaidUpToDate(loanId: string): Promise<void> {
    const updated = await api.put<Record<string, unknown>>(`/loans/${loanId}`, { markPaidUpToDate: true })
    const idx = loans.value.findIndex(l => l.id === loanId)
    if (idx !== -1) loans.value[idx] = deserializeLoan(updated)
  }

  async function addBalanceAdjustment(date: Date, actualBalance: number): Promise<void> {
    const projected = calculateProjectedBalanceForDate(date, accounts.value, allTransactions.value)
    const adjustment = actualBalance - projected
    if (adjustment === 0) return
    await addTransaction({
      date,
      description: 'Balance Adjustment',
      amount: adjustment,
      type: 'actual',
      categoryId: 'cat-adjustment',
      accountId: accounts.value[0]?.id ?? '',
    })
  }

  const allTransactions = computed<Transaction[]>(() => {
    const start = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1)
    const end = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 2, 0)
    const virtual = recurringRules.value.flatMap(r => generateOccurrences(r, start, end))
    const loanTxns = loans.value.flatMap(l => l.transactions)
    return [...transactions.value, ...loanTxns, ...virtual]
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

  function getLoanTransactions(loanId: string): Transaction[] {
    const loan = loans.value.find(l => l.id === loanId)
    return loan?.transactions.sort((a, b) => a.date.getTime() - b.date.getTime()) ?? []
  }

  function getLoanTotalPayments(loan: Loan): number {
    const found = loans.value.find(l => l.id === loan.id)
    return found?.transactions.filter(t => !t.id.includes('-early-')).length ?? 0
  }

  function getLoanMonthlyPayment(loan: Loan): number {
    return getLoanStateAtDate(loan, new Date()).monthlyPayment + (loan.insurancePerMonth ?? 0)
  }

  function getLoanPaidCount(loan: Loan): number {
    const found = loans.value.find(l => l.id === loan.id)
    return found?.transactions.filter(t => t.type === 'actual').length ?? 0
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
    loading,
    loadInitialData,
    prevMonth,
    nextMonth,
    selectDate,
    updateTransaction,
    addTransaction,
    deleteTransaction,
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
