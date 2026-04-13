import { describe, it, expect } from 'bun:test'
import { Hono } from 'hono'
import { Database } from 'bun:sqlite'
import { createTestDb, insertAccount, insertCategory, insertTransaction } from './setup'
import { transactionsRoutes } from '../routes/transactions'

function makeApp(db: Database) {
  const app = new Hono()
  app.route('/api/transactions', transactionsRoutes(db))
  return app
}

describe('GET /api/transactions', () => {
  it('returns all transactions', async () => {
    const { db } = createTestDb()
    const accId = insertAccount(db)
    const catId = insertCategory(db)
    insertTransaction(db, accId, catId, { id: 'txn1', date: '2026-04-05' })
    const res = await makeApp(db).request('/api/transactions')
    const data = await res.json() as any[]
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe('txn1')
    expect(data[0].date).toBe('2026-04-05')
  })
})

describe('POST /api/transactions', () => {
  it('creates a transaction and returns it with generated id', async () => {
    const { db } = createTestDb()
    const accId = insertAccount(db)
    const catId = insertCategory(db)
    const app = makeApp(db)
    const res = await app.request('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2026-04-10',
        description: 'Groceries',
        amount: -150,
        type: 'actual',
        categoryId: catId,
        accountId: accId,
      }),
    })
    expect(res.status).toBe(201)
    const data = await res.json() as any
    expect(data.id).toBeTruthy()
    expect(data.description).toBe('Groceries')
    expect(data.amount).toBe(-150)
  })
})

describe('PUT /api/transactions/:id', () => {
  it('updates transaction type', async () => {
    const { db } = createTestDb()
    const accId = insertAccount(db)
    const catId = insertCategory(db)
    insertTransaction(db, accId, catId, { id: 'txn1', type: 'planned' })
    const app = makeApp(db)
    const res = await app.request('/api/transactions/txn1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'actual' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json() as any
    expect(data.type).toBe('actual')
  })

  it('returns 404 for unknown transaction', async () => {
    const { db } = createTestDb()
    const app = makeApp(db)
    const res = await app.request('/api/transactions/nope', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'actual' }),
    })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/transactions/:id', () => {
  it('deletes existing transaction', async () => {
    const { db } = createTestDb()
    const accId = insertAccount(db)
    const catId = insertCategory(db)
    insertTransaction(db, accId, catId, { id: 'txn1' })
    const app = makeApp(db)
    const res = await app.request('/api/transactions/txn1', { method: 'DELETE' })
    expect(res.status).toBe(204)
    const count = (db.query('SELECT COUNT(*) as n FROM transactions').get() as any).n
    expect(count).toBe(0)
  })
})
