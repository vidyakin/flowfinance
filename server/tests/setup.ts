import { Database } from 'bun:sqlite'
import { initDb } from '../db'

export interface TestCtx {
  db: Database
}

export function createTestDb(): TestCtx {
  const db = new Database(':memory:')
  initDb(db)
  return { db }
}

export function insertAccount(
  db: Database,
  overrides: Partial<{ id: string; name: string; type: string; balance: number }> = {},
): string {
  const row = { id: 'acc-test', name: 'Test Account', type: 'checking', balance: 1000, ...overrides }
  db.run(
    'INSERT INTO accounts (id, name, type, balance) VALUES (?, ?, ?, ?)',
    [row.id, row.name, row.type, row.balance],
  )
  return row.id
}

export function insertCategory(
  db: Database,
  overrides: Partial<{ id: string; name: string; type: string; color: string }> = {},
): string {
  const row = { id: 'cat-test', name: 'Test Category', type: 'expense', color: 'bg-red-500', ...overrides }
  db.run(
    'INSERT INTO categories (id, name, type, color) VALUES (?, ?, ?, ?)',
    [row.id, row.name, row.type, row.color],
  )
  return row.id
}

export function insertTransaction(
  db: Database,
  accountId: string,
  categoryId: string,
  overrides: Partial<{ id: string; date: string; description: string; amount: number; type: string }> = {},
): string {
  const row = {
    id: 'txn-test',
    date: '2026-04-01',
    description: 'Test',
    amount: -100,
    type: 'actual',
    ...overrides,
  }
  db.run(
    'INSERT INTO transactions (id, date, description, amount, type, category_id, account_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [row.id, row.date, row.description, row.amount, row.type, categoryId, accountId],
  )
  return row.id
}
