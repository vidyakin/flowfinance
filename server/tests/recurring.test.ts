import { describe, it, expect } from 'bun:test'
import { Hono } from 'hono'
import { Database } from 'bun:sqlite'
import { createTestDb, insertAccount, insertCategory } from './setup'
import { recurringRoutes } from '../routes/recurring'

function makeApp(db: Database) {
  const app = new Hono()
  app.route('/api/recurring', recurringRoutes(db))
  return app
}

const validRule = (accountId: string, categoryId: string) => ({
  name: 'Netflix',
  amount: -15,
  categoryId,
  accountId,
  frequency: 'monthly',
  startDate: '2026-01-01',
  endDate: null,
  dayOfMonth: 15,
})

describe('POST /api/recurring', () => {
  it('creates a recurring rule', async () => {
    const { db } = createTestDb()
    const accId = insertAccount(db)
    const catId = insertCategory(db)
    const app = makeApp(db)
    const res = await app.request('/api/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validRule(accId, catId)),
    })
    expect(res.status).toBe(201)
    const data = await res.json() as any
    expect(data.id).toBeTruthy()
    expect(data.name).toBe('Netflix')
    expect(data.frequency).toBe('monthly')
    expect(data.dayOfMonth).toBe(15)
  })
})

describe('GET /api/recurring', () => {
  it('returns all rules', async () => {
    const { db } = createTestDb()
    const accId = insertAccount(db)
    const catId = insertCategory(db)
    const app = makeApp(db)
    await app.request('/api/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validRule(accId, catId)),
    })
    const res = await app.request('/api/recurring')
    const data = await res.json() as any[]
    expect(data).toHaveLength(1)
  })
})

describe('DELETE /api/recurring/:id', () => {
  it('deletes a rule', async () => {
    const { db } = createTestDb()
    const accId = insertAccount(db)
    const catId = insertCategory(db)
    const app = makeApp(db)
    const createRes = await app.request('/api/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validRule(accId, catId)),
    })
    const created = await createRes.json() as any
    const res = await app.request(`/api/recurring/${created.id}`, { method: 'DELETE' })
    expect(res.status).toBe(204)
    const listRes = await app.request('/api/recurring')
    const data = await listRes.json() as any[]
    expect(data).toHaveLength(0)
  })
})

describe('PUT /api/recurring/:id', () => {
  it('updates a rule', async () => {
    const { db } = createTestDb()
    const accId = insertAccount(db)
    const catId = insertCategory(db)
    const app = makeApp(db)
    const created = await app.request('/api/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validRule(accId, catId)),
    }).then(r => r.json()) as any
    const res = await app.request(`/api/recurring/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Spotify', amount: -10 }),
    })
    expect(res.status).toBe(200)
    const data = await res.json() as any
    expect(data.name).toBe('Spotify')
    expect(data.amount).toBe(-10)
  })

  it('returns 404 for unknown rule', async () => {
    const { db } = createTestDb()
    const app = makeApp(db)
    const res = await app.request('/api/recurring/nope', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    })
    expect(res.status).toBe(404)
  })
})
