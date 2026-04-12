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
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const relevantAmount = transactions
    .filter(t => t.date > today && t.date <= targetDate)
    .reduce((sum, t) => sum + t.amount, 0)
  return initialBalance + relevantAmount
}
