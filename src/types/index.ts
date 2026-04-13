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
  insurancePerMonth?: number
  paymentDay?: number
}
