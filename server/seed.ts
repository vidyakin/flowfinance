import type { Database } from 'bun:sqlite'

interface CategoryRow { id: string; name: string; type: string; color: string }

const CATEGORIES: CategoryRow[] = [
  // Income
  { id: 'cat-salary', name: 'Зарплата', type: 'income', color: 'bg-green-500' },
  { id: 'cat-freelance', name: 'Подработка', type: 'income', color: 'bg-emerald-500' },
  { id: 'cat-gifts', name: 'Подарки', type: 'income', color: 'bg-teal-500' },
  { id: 'cat-other-income', name: 'Прочее', type: 'income', color: 'bg-cyan-500' },
  // Expense
  { id: 'cat-food', name: 'Еда', type: 'expense', color: 'bg-red-500' },
  { id: 'cat-travel', name: 'Путешествия', type: 'expense', color: 'bg-orange-500' },
  { id: 'cat-loans', name: 'Кредиты', type: 'expense', color: 'bg-rose-500' },
  { id: 'cat-debts', name: 'Долги', type: 'expense', color: 'bg-pink-500' },
  { id: 'cat-entertainment', name: 'Развлечения', type: 'expense', color: 'bg-purple-500' },
  { id: 'cat-other', name: 'Прочее', type: 'expense', color: 'bg-gray-500' },
]

const ACCOUNTS = [
  { id: 'acc-cash', name: 'Наличные', type: 'cash', balance: 0 },
  { id: 'acc-card', name: 'Карта', type: 'checking', balance: 0 },
]

export async function seedDb(db: Database): Promise<void> {
  const count = (db.query('SELECT COUNT(*) as n FROM accounts').get() as { n: number }).n
  if (count > 0) return

  console.log('Seeding database with initial data...')

  const insertAccount = db.prepare('INSERT INTO accounts (id, name, type, balance) VALUES (?, ?, ?, ?)')
  for (const acc of ACCOUNTS) {
    insertAccount.run(acc.id, acc.name, acc.type, acc.balance)
  }

  const insertCategory = db.prepare('INSERT INTO categories (id, name, type, color) VALUES (?, ?, ?, ?)')
  for (const cat of CATEGORIES) {
    insertCategory.run(cat.id, cat.name, cat.type, cat.color)
  }

  console.log('Database seeded successfully.')
}