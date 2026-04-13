import { describe, it, expect } from 'bun:test'
import { Hono } from 'hono'
import { Database } from 'bun:sqlite'
import { createTestDb, insertAccount } from './setup'
import { accountsRoutes } from '../routes/accounts'

function makeApp(db: Database) {
  const app = new Hono()
  app.route('/api/accounts', accountsRoutes(db))
  return app
}

describe('GET /api/accounts', () => {
  it('returns empty array when no accounts', async () => {
    const { db } = createTestDb()
    const app = makeApp(db)
    const res = await app.request('/api/accounts')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('returns all accounts', async () => {
    const { db } = createTestDb()
    insertAccount(db, { id: 'acc1', name: 'Checking', type: 'checking', balance: 1500 })
    const app = makeApp(db)
    const res = await app.request('/api/accounts')
    const data = await res.json() as any[]
    expect(data).toHaveLength(1)
    expect(data[0]).toMatchObject({ id: 'acc1', name: 'Checking', balance: 1500 })
  })
})

describe('PUT /api/accounts/:id', () => {
  it('updates account balance', async () => {
    const { db } = createTestDb()
    insertAccount(db, { id: 'acc1', balance: 1000 })
    const app = makeApp(db)
    const res = await app.request('/api/accounts/acc1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ balance: 2500 }),
    })
    expect(res.status).toBe(200)
    const data = await res.json() as any
    expect(data.balance).toBe(2500)
  })

  it('returns 404 for unknown account', async () => {
    const { db } = createTestDb()
    const app = makeApp(db)
    const res = await app.request('/api/accounts/nope', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ balance: 100 }),
    })
    expect(res.status).toBe(404)
  })
})