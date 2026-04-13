import { Hono } from 'hono'
import type { Database } from 'bun:sqlite'
import type { Account } from '../../src/types/index'

function rowToAccount(row: Record<string, unknown>): Account {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as Account['type'],
    balance: row.balance as number,
  }
}

export function accountsRoutes(db: Database): Hono {
  const app = new Hono()

  app.get('/', (c) => {
    const rows = db.query('SELECT * FROM accounts ORDER BY name').all() as Record<string, unknown>[]
    return c.json(rows.map(rowToAccount))
  })

  app.put('/:id', async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json<Partial<Account>>()

    const existing = db.query('SELECT * FROM accounts WHERE id = ?').get(id)
    if (!existing) return c.json({ error: 'Account not found' }, 404)

    if (body.name !== undefined)
      db.run('UPDATE accounts SET name = ? WHERE id = ?', [body.name, id])
    if (body.balance !== undefined)
      db.run('UPDATE accounts SET balance = ? WHERE id = ?', [body.balance, id])
    if (body.type !== undefined)
      db.run('UPDATE accounts SET type = ? WHERE id = ?', [body.type, id])

    const updated = db.query('SELECT * FROM accounts WHERE id = ?').get(id) as Record<string, unknown>
    return c.json(rowToAccount(updated))
  })

  return app
}