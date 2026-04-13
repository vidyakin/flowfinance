import type { Database } from 'bun:sqlite'
import { ACCOUNTS, CATEGORIES, BUDGETS, TRANSACTIONS } from '../src/data/mockData'

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

  const insertBudget = db.prepare('INSERT INTO budgets (category_id, amount) VALUES (?, ?)')
  for (const b of BUDGETS) {
    insertBudget.run(b.categoryId, b.amount)
  }

  const insertTxn = db.prepare(
    'INSERT INTO transactions (id, date, description, amount, type, category_id, account_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
  for (const t of TRANSACTIONS) {
    insertTxn.run(
      t.id,
      t.date.toISOString().slice(0, 10),
      t.description,
      t.amount,
      t.type,
      t.categoryId,
      t.accountId,
    )
  }

  console.log('Database seeded successfully.')
}