import { Hono } from 'hono'
import type { Database } from 'bun:sqlite'
import type { Category } from '../../src/types'

function rowToCategory(row: Record<string, unknown>): Category {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as Category['type'],
    color: row.color as string,
  }
}

export function categoriesRoutes(db: Database): Hono {
  const app = new Hono()

  app.get('/', (c) => {
    const rows = db.query('SELECT * FROM categories ORDER BY name').all() as Record<string, unknown>[]
    return c.json(rows.map(rowToCategory))
  })

  return app
}
