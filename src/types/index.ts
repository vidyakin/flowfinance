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
