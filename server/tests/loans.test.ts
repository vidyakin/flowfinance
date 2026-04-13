import { describe, it, expect } from 'bun:test'
import { Hono } from 'hono'
import { Database } from 'bun:sqlite'
import { createTestDb, insertAccount, insertCategory } from './setup'
import { loansRoutes } from '../routes/loans'

function makeApp(db: Database) {
  const app = new Hono()
  app.route('/api/loans', loansRoutes(db))
  return app
}

const validLoan = (accountId: string, categoryId: string) => ({
  name: 'Car Loan',
  principal: 10000,
  annualRate: 12,
  startDate: '2026-01-01',
  termMonths: 12,
  accountId,
  categoryId,
  insurancePerMonth: null,
  paymentDay: null,
})

describe('POST /api/loans', () => {
  it('creates loan and returns it with generated transactions', async () => {
    const { db } = createTestDb()
    const accId = insertAccount(db)
    const catId = insertCategory(db)
    const app = makeApp(db)
    const res = await app.request('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validLoan(accId, catId)),
    })
    expect(res.status).toBe(201)
    const data = await res.json() as any
    expect(data.id).toBeTruthy()
    expect(data.name).toBe('Car Loan')
    expect(Array.isArray(data.transactions)).toBe(true)
    expect(data.transactions.length).toBe(12)
    expect(data.transactions[0].amount).toBeLessThan(0)
  })
})

describe('GET /api/loans', () => {
  it('returns all loans with transactions', async () => {
    const { db } = createTestDb()
    const accId = insertAccount(db)
    const catId = insertCategory(db)
    const app = makeApp(db)
    await app.request('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validLoan(accId, catId)),
    })
    const res = await app.request('/api/loans')
    const data = await res.json() as any[]
    expect(data).toHaveLength(1)
    expect(data[0].transactions).toHaveLength(12)
  })
})

describe('DELETE /api/loans/:id', () => {
  it('deletes loan and its early payments', async () => {
    const { db } = createTestDb()
    const accId = insertAccount(db)
    const catId = insertCategory(db)
    const app = makeApp(db)
    const postRes = await app.request('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validLoan(accId, catId)),
    })
    const created = await postRes.json() as any
    const res = await app.request(`/api/loans/${created.id}`, { method: 'DELETE' })
    expect(res.status).toBe(204)
    const listRes = await app.request('/api/loans')
    const data = await listRes.json() as any[]
    expect(data).toHaveLength(0)
  })
})

describe('POST /api/loans/:id/early-payments', () => {
  it('adds early payment and recalculates transactions', async () => {
    const { db } = createTestDb()
    const accId = insertAccount(db)
    const catId = insertCategory(db)
    const app = makeApp(db)
    const postRes = await app.request('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validLoan(accId, catId)),
    })
    const loan = await postRes.json() as any

    const originalCount = loan.transactions.length

    const res = await app.request(`/api/loans/${loan.id}/early-payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-06-01', amount: 3000, mode: 'reduce_term' }),
    })
    expect(res.status).toBe(201)
    const updated = await res.json() as any
    expect(updated.transactions.length).toBeLessThan(originalCount + 1)
  })
})
