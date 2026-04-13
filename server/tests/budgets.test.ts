import { describe, it, expect } from 'bun:test'
import { Hono } from 'hono'
import { Database } from 'bun:sqlite'
import { createTestDb, insertCategory } from './setup'
import { budgetsRoutes } from '../routes/budgets'

function makeApp(db: Database) {
  const app = new Hono()
  app.route('/api/budgets', budgetsRoutes(db))
  return app
}

describe('GET /api/budgets', () => {
  it('returns empty array when no budgets', async () => {
    const { db } = createTestDb()
    const res = await makeApp(db).request('/api/budgets')
    expect(await res.json()).toEqual([])
  })

  it('returns all budgets', async () => {
    const { db } = createTestDb()
    insertCategory(db, { id: 'cat1' })
    db.run('INSERT INTO budgets (category_id, amount) VALUES (?, ?)', ['cat1', 500])
    const res = await makeApp(db).request('/api/budgets')
    const data = await res.json() as any[]
    expect(data).toHaveLength(1)
    expect(data[0]).toMatchObject({ categoryId: 'cat1', amount: 500 })
  })
})

describe('PUT /api/budgets/:categoryId', () => {
  it('creates budget if not exists', async () => {
    const { db } = createTestDb()
    insertCategory(db, { id: 'cat1' })
    const app = makeApp(db)
    const res = await app.request('/api/budgets/cat1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1200 }),
    })
    expect(res.status).toBe(200)
    const data = await res.json() as any
    expect(data.amount).toBe(1200)
  })

  it('updates existing budget', async () => {
    const { db } = createTestDb()
    insertCategory(db, { id: 'cat1' })
    db.run('INSERT INTO budgets (category_id, amount) VALUES (?, ?)', ['cat1', 500])
    const app = makeApp(db)
    const res = await app.request('/api/budgets/cat1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 900 }),
    })
    const data = await res.json() as any
    expect(data.amount).toBe(900)
  })
})
