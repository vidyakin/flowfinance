export interface AccountRow {
  id: string
  name: string
  type: string
  balance: number
}

export interface CategoryRow {
  id: string
  name: string
  type: string
  color: string
}

export interface TransactionRow {
  id: string
  date: string
  description: string
  amount: number
  type: string
  category_id: string
  account_id: string
}

export interface RecurringRow {
  id: string
  name: string
  amount: number
  category_id: string
  account_id: string
  frequency: string
  start_date: string
  end_date: string | null
  day_of_month: number | null
}

export interface BudgetRow {
  category_id: string
  amount: number
}
