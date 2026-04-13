import { Hono } from 'hono'
import type { Database } from 'bun:sqlite'
import type { Budget } from '../../src/types/index'

function rowToBudget(row: Record<string, unknown>): Budget {
  return {
    categoryId: row.category_id as string,
    amount: row.amount as number,
  }
}

export function budgetsRoutes(db: Database): Hono {
  const app = new Hono()

  app.get('/', (c) => {
    const rows = db.query('SELECT * FROM budgets').all() as Record<string, unknown>[]
    return c.json(rows.map(rowToBudget))
  })

  app.put('/:categoryId', async (c) => {
    const categoryId = c.req.param('categoryId')
    const { amount } = await c.req.json<{ amount: number }>()

    db.run(
      'INSERT INTO budgets (category_id, amount) VALUES (?, ?) ON CONFLICT(category_id) DO UPDATE SET amount = excluded.amount',
      [categoryId, amount],
    )

    const updated = db.query('SELECT * FROM budgets WHERE category_id = ?').get(categoryId) as Record<string, unknown>
    return c.json(rowToBudget(updated))
  })

  return app
}
