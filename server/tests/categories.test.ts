import { describe, it, expect } from 'bun:test'
import { Hono } from 'hono'
import { Database } from 'bun:sqlite'
import { createTestDb, insertCategory } from './setup'
import { categoriesRoutes } from '../routes/categories'

function makeApp(db: Database) {
  const app = new Hono()
  app.route('/api/categories', categoriesRoutes(db))
  return app
}

describe('GET /api/categories', () => {
  it('returns empty array when no categories', async () => {
    const { db } = createTestDb()
    const res = await makeApp(db).request('/api/categories')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('returns all categories', async () => {
    const { db } = createTestDb()
    insertCategory(db, { id: 'cat1', name: 'Food', type: 'expense', color: 'bg-yellow-500' })
    const res = await makeApp(db).request('/api/categories')
    const data = await res.json() as any[]
    expect(data).toHaveLength(1)
    expect(data[0]).toMatchObject({ id: 'cat1', name: 'Food', type: 'expense' })
  })
})
