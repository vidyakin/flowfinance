import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import type { Transaction, Account, Category, Budget, RecurringRule, Loan, EarlyPayment, LoanPayment } from '@/types'
import { isSameDay, calculateProjectedBalanceForDate } from '@/utils/helpers'
import { generateOccurrences } from '@/utils/recurring'
import { getLoanStateAtDate } from '@/utils/loans'
import { api } from '@/api/client'
import { useSettingsStore } from '@/stores/settings'

function dateToString(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD')
}

function deserializeTransaction(t: Record<string, unknown>): Transaction {
  return {
    ...t,
    date: new Date(t.date as string),
    ...(t.recurringRuleId ? { recurringRuleId: t.recurringRuleId as string } : {}),
  } as Transaction
}

function deserializeRecurringRule(r: Record<string, unknown>): RecurringRule {
  return {
    ...r,
    startDate: new Date(r.startDate as string),
    endDate: r.endDate ? new Date(r.endDate as string) : null,
  } as RecurringRule
}

function deserializeLoanPayment(p: Record<string, unknown>): LoanPayment {
  return {
    ...p,
    date: new Date(p.date as string),
  } as LoanPayment
}

function deserializeLoan(l: Record<string, unknown>): Loan {
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
  } as Loan
}

let recalcTimer: ReturnType<typeof setTimeout> | null = null

export const useFinanceStore = defineStore('finance', () => {
  const transactions = ref<Transaction[]>([])
  const accounts = ref<Account[]>([])
  const categories = ref<Category[]>([])
  const budgets = ref<Budget[]>([])
  const currentDate = ref(new Date())
  const selectedDate = ref<Date | null>(new Date())
  const recurringRules = ref<RecurringRule[]>([])
  const loans = ref<Loan[]>([])
  const loanPayments = ref<Record<string, LoanPayment[]>>({})  // keyed by loanId
  const loading = ref(false)
  const isLoading = ref(false)
  const dailyBalances = ref<Record<string, number>>({})

  async function loadInitialData(): Promise<void> {
    loading.value = true
    try {
      const [accs, cats, buds, txns, rules, lns, bals] = await Promise.all([
        api.get<Account[]>('/accounts'),
        api.get<Category[]>('/categories'),
        api.get<Budget[]>('/budgets'),
        api.get<Record<string, unknown>[]>('/transactions'),
        api.get<Record<string, unknown>[]>('/recurring'),
        api.get<Record<string, unknown>[]>('/loans'),
        api.get<{ date: string; balance: number }[]>('/balances'),
      ])
      accounts.value = accs ?? []
      categories.value = cats ?? []
      budgets.value = buds ?? []
      transactions.value = (txns ?? []).map(deserializeTransaction)
      recurringRules.value = (rules ?? []).map(deserializeRecurringRule)
      loans.value = (lns ?? []).map(deserializeLoan)
      dailyBalances.value = Object.fromEntries((bals ?? []).map(b => [b.date, b.balance]))
      // Загружаем платежи для всех кредитов сразу, чтобы прогресс-бар в списке работал без открытия модалки
      const paymentsList = await Promise.all(
        loans.value.map(l => api.get<Record<string, unknown>[]>(`/loans/${l.id}/payments`)),
      )
      loans.value.forEach((l, i) => {
        loanPayments.value[l.id] = (paymentsList[i] ?? []).map(deserializeLoanPayment)
      })
    } finally {
      loading.value = false
    }
  }

  async function recalculateBalances(): Promise<void> {
    isLoading.value = true
    try {
      const bals = await api.post<{ date: string; balance: number }[]>('/balances/recalculate', {})
      dailyBalances.value = Object.fromEntries((bals ?? []).map(b => [b.date, b.balance]))
    } finally {
      isLoading.value = false
    }
  }

  function scheduleRecalculate() {
    if (recalcTimer) clearTimeout(recalcTimer)
    recalcTimer = setTimeout(() => recalculateBalances(), 300)
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
      date: changes.date instanceof Date ? dateToString(changes.date) : changes.date,
    }
    const updated = await api.put<Record<string, unknown>>(`/transactions/${id}`, payload)
    const idx = transactions.value.findIndex(t => t.id === id)
    if (idx !== -1) transactions.value[idx] = deserializeTransaction(updated)
    scheduleRecalculate()
  }

  async function addTransaction(data: Omit<Transaction, 'id'>): Promise<void> {
    const payload = { ...data, date: dateToString(data.date) }
    const created = await api.post<Record<string, unknown>>('/transactions', payload)
    transactions.value.push(deserializeTransaction(created))
    scheduleRecalculate()
  }

  async function deleteTransaction(id: string): Promise<void> {
    await api.delete(`/transactions/${id}`)
    transactions.value = transactions.value.filter(t => t.id !== id)
    scheduleRecalculate()
  }

  async function confirmPayment(tx: Transaction, actualAmount: number): Promise<void> {
    if (tx.id.startsWith('recurring-')) {
      // Виртуальный recurring: создаём фактическую транзакцию
      const ruleId = tx.id.slice('recurring-'.length, -11)
      const dateStr = tx.id.slice(-10) // 'YYYY-MM-DD'
      const payload = {
        date: dateStr,
        description: tx.description,
        amount: actualAmount,
        type: 'actual' as const,
        categoryId: tx.categoryId,
        accountId: tx.accountId,
        recurringRuleId: ruleId,
      }
      const created = await api.post<Record<string, unknown>>('/transactions', payload)
      transactions.value.push(deserializeTransaction(created))
    } else if (tx.id.startsWith('loan-')) {
      // Кредитный платёж: ищем loanId через список кредитов
      const loan = loans.value.find(l => tx.id.startsWith(`loan-${l.id}-`))
      if (!loan) throw new Error(`Loan not found for transaction ${tx.id}`)
      await markPaymentPaid(loan.id, tx.id)
      return
    } else {
      // Одноразовый плановый: обновляем type→actual и сумму
      const updated = await api.put<Record<string, unknown>>(`/transactions/${tx.id}`, {
        type: 'actual',
        amount: actualAmount,
      })
      const idx = transactions.value.findIndex(t => t.id === tx.id)
      if (idx !== -1) transactions.value[idx] = deserializeTransaction(updated)
    }
    scheduleRecalculate()
  }

  async function addRecurringRule(rule: Omit<RecurringRule, 'id'>): Promise<void> {
    const payload = {
      ...rule,
      startDate: dateToString(rule.startDate),
      endDate: rule.endDate ? dateToString(rule.endDate) : null,
    }
    const created = await api.post<Record<string, unknown>>('/recurring', payload)
    recurringRules.value.push(deserializeRecurringRule(created))
    scheduleRecalculate()
  }

  async function removeRecurringRule(id: string): Promise<void> {
    await api.delete(`/recurring/${id}`)
    recurringRules.value = recurringRules.value.filter(r => r.id !== id)
    scheduleRecalculate()
  }

  async function updateRecurringRule(id: string, changes: Partial<RecurringRule>): Promise<void> {
    const payload = {
      ...changes,
      startDate: changes.startDate instanceof Date ? dateToString(changes.startDate) : changes.startDate,
      endDate: changes.endDate instanceof Date ? dateToString(changes.endDate) : (changes.endDate ?? null),
    }
    const updated = await api.put<Record<string, unknown>>(`/recurring/${id}`, payload)
    const idx = recurringRules.value.findIndex(r => r.id === id)
    if (idx !== -1) recurringRules.value[idx] = deserializeRecurringRule(updated)
    scheduleRecalculate()
  }

  async function addLoan(loanData: Omit<Loan, 'id' | 'earlyPayments'>): Promise<void> {
  const payload = {
    ...loanData,
    startDate: dateToString(loanData.startDate),
    currentBalance: loanData.currentBalance
      ? { date: dateToString(loanData.currentBalance.date), balance: loanData.currentBalance.balance }
      : undefined,
  }
  const created = await api.post<Record<string, unknown>>('/loans', payload)
    const loan = deserializeLoan(created)
    loans.value.push(loan)
    await loadLoanPayments(loan.id)
    await refreshTransactions()
    scheduleRecalculate()
  }

  async function removeLoan(id: string): Promise<void> {
    await api.delete(`/loans/${id}`)
    loans.value = loans.value.filter(l => l.id !== id)
    transactions.value = transactions.value.filter(t => !t.id.startsWith(`loan-${id}-`))
    delete loanPayments.value[id]
    scheduleRecalculate()
  }

  async function addEarlyPayment(loanId: string, payment: Omit<EarlyPayment, 'id'>): Promise<void> {
    const payload = {
      ...payment,
      date: dateToString(payment.date),
    }
    const updated = await api.post<Record<string, unknown>>(`/loans/${loanId}/early-payments`, payload)
    const idx = loans.value.findIndex(l => l.id === loanId)
    if (idx !== -1) loans.value[idx] = deserializeLoan(updated)
    await loadLoanPayments(loanId)
    await refreshTransactions()
    scheduleRecalculate()
  }

  async function setLoanCurrentBalance(loanId: string, date: Date, balance: number): Promise<void> {
    const updated = await api.put<Record<string, unknown>>(`/loans/${loanId}`, {
      currentBalanceDate: dateToString(date),
      currentBalance: balance,
    })
    const idx = loans.value.findIndex(l => l.id === loanId)
    if (idx !== -1) loans.value[idx] = deserializeLoan(updated)
    await refreshTransactions()
  }

  async function markLoanPaidUpToDate(loanId: string): Promise<void> {
    await api.put<Record<string, unknown>>(`/loans/${loanId}`, { markPaidUpToDate: true })
    await loadLoanPayments(loanId)
    await refreshTransactions()
    scheduleRecalculate()
  }

  async function addAccount(name: string, type: Account['type'], balance: number): Promise<void> {
    const created = await api.post<Account>('/accounts', { name, type, balance })
    accounts.value.push(created)
    scheduleRecalculate()
  }

  async function updateAccount(id: string, data: { name?: string; type?: Account['type']; balance?: number }): Promise<void> {
    const updated = await api.put<Account>(`/accounts/${id}`, data)
    const idx = accounts.value.findIndex(a => a.id === id)
    if (idx !== -1) accounts.value[idx] = updated
    scheduleRecalculate()
  }

  async function removeAccount(id: string): Promise<void> {
    await api.delete(`/accounts/${id}`)
    accounts.value = accounts.value.filter(a => a.id !== id)
    scheduleRecalculate()
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

    const confirmedRecurring = new Set(
      transactions.value
        .filter(t => t.recurringRuleId)
        .map(t => `${t.recurringRuleId}-${dateToString(t.date)}`),
    )

    const virtual = recurringRules.value
      .flatMap(r => generateOccurrences(r, start, end))
      .filter(v => {
        const ruleId = v.id.slice('recurring-'.length, -11)
        return !confirmedRecurring.has(`${ruleId}-${dateToString(v.date)}`)
      })

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
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'actual' ? -1 : 1
        return Math.abs(b.amount) - Math.abs(a.amount)
      })
  })

  function getProjectedBalanceForDate(date: Date): number {
    const dateKey = dateToString(date)
    if (dailyBalances.value[dateKey] !== undefined) {
      return dailyBalances.value[dateKey]
    }
    const dates = Object.keys(dailyBalances.value).sort()
    if (dates.length === 0) return 0
    let lastBalance = 0
    for (const d of dates) {
      if (d > dateKey) break
      lastBalance = dailyBalances.value[d]
    }
    return lastBalance
  }

  function getTransactionsForDate(date: Date): Transaction[] {
    return allTransactions.value.filter(t => isSameDay(t.date, date))
  }

  async function refreshTransactions(): Promise<void> {
    const txns = await api.get<Record<string, unknown>[]>('/transactions')
    transactions.value = (txns ?? []).map(deserializeTransaction)
  }

  async function loadLoanPayments(loanId: string): Promise<void> {
    const payments = await api.get<Record<string, unknown>[]>(`/loans/${loanId}/payments`)
    loanPayments.value[loanId] = (payments ?? []).map(deserializeLoanPayment)
  }

  async function markPaymentPaid(loanId: string, paymentId: string, actualAmount?: number): Promise<void> {
    const updated = await api.put<Record<string, unknown>[]>(
      `/loans/${loanId}/payments/${paymentId}`,
      actualAmount !== undefined ? { actualAmount } : {},
    )
    loanPayments.value[loanId] = (updated ?? []).map(deserializeLoanPayment)
    await refreshTransactions()
    scheduleRecalculate()
  }

  function getLoanTransactions(loanId: string): Transaction[] {
    return transactions.value
      .filter(t => t.id.startsWith(`loan-${loanId}-`))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  function getLoanTotalPayments(loan: Loan): number {
    const payments = loanPayments.value[loan.id]
    if (payments) return payments.filter(p => p.plannedAmount !== null).length
    return transactions.value.filter(
      t => t.id.startsWith(`loan-${loan.id}-`) && !t.id.includes('-early-'),
    ).length
  }

  function getLoanMonthlyPayment(loan: Loan): number {
    return getLoanStateAtDate(loan, new Date()).monthlyPayment + (loan.insurancePerMonth ?? 0)
  }

  function getLoanPaidCount(loan: Loan): number {
    const payments = loanPayments.value[loan.id]
    if (payments) return payments.filter(p => p.actualAmount !== null && p.plannedAmount !== null).length
    return transactions.value.filter(
      t => t.id.startsWith(`loan-${loan.id}-`) && t.type === 'actual',
    ).length
  }

  async function archiveLoan(loanId: string) {
    await api.put(`/loans/${loanId}`, { archived: true })
    loans.value = loans.value.map(l =>
      l.id === loanId ? { ...l, archived: true } : l
    )
  }

  function getLoanRemainingBalance(loanId: string): number | null {
    const payments = loanPayments.value[loanId]
    if (!payments) return null
    // Находим последний платёж с фактическим остатком
    const lastActual = [...payments]
      .filter(p => p.remainingBalance !== null)
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0]
    return lastActual?.remainingBalance ?? null
  }

  const cashGapDate = computed<string | null>(() => {
    const settingsStore = useSettingsStore()
    const threshold = settingsStore.minBalance ?? 0
    const entries = Object.entries(dailyBalances.value ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
    const today = new Date().toISOString().split('T')[0]
    for (const [date, balance] of entries) {
      if (date >= today && (balance as number) < threshold) return date
    }
    return null
  })

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
    isLoading,
    dailyBalances,
    loadInitialData,
    prevMonth,
    nextMonth,
    selectDate,
    updateTransaction,
    addTransaction,
    deleteTransaction,
    confirmPayment,
    addRecurringRule,
    removeRecurringRule,
    updateRecurringRule,
    loanPayments,
    addLoan,
    removeLoan,
    archiveLoan,
    refreshTransactions,
    loadLoanPayments,
    markPaymentPaid,
    addAccount,
    updateAccount,
    removeAccount,
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
    getLoanRemainingBalance,
    cashGapDate,
  }
})
