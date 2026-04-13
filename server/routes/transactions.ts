import { Hono } from 'hono'
import type { Database } from 'bun:sqlite'
import type { Transaction } from '../../src/types'

interface TxnRow {
  id: string
  date: string
  description: string
  amount: number
  type: string
  category_id: string
  account_id: string
}

function rowToTransaction(row: TxnRow): Omit<Transaction, 'date'> & { date: string } {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    amount: row.amount,
    type: row.type as Transaction['type'],
    categoryId: row.category_id,
    accountId: row.account_id,
  }
}

export function transactionsRoutes(db: Database): Hono {
  const app = new Hono()

  app.get('/', (c) => {
    const rows = db.query('SELECT * FROM transactions ORDER BY date').all() as TxnRow[]
    return c.json(rows.map(rowToTransaction))
  })

  app.post('/', async (c) => {
    const body = await c.req.json<{
      date: string
      description: string
      amount: number
      type: string
      categoryId: string
      accountId: string
    }>()

    const id = crypto.randomUUID()
    db.run(
      'INSERT INTO transactions (id, date, description, amount, type, category_id, account_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, body.date, body.description, body.amount, body.type, body.categoryId, body.accountId],
    )

    const created = db.query('SELECT * FROM transactions WHERE id = ?').get(id) as TxnRow
    return c.json(rowToTransaction(created), 201)
  })

  app.put('/:id', async (c) => {
    const id = c.req.param('id')
    const existing = db.query('SELECT * FROM transactions WHERE id = ?').get(id)
    if (!existing) return c.json({ error: 'Transaction not found' }, 404)

    const body = await c.req.json<Partial<{
      date: string
      description: string
      amount: number
      type: string
      categoryId: string
      accountId: string
    }>>()

    if (body.date !== undefined)
      db.run('UPDATE transactions SET date = ? WHERE id = ?', [body.date, id])
    if (body.description !== undefined)
      db.run('UPDATE transactions SET description = ? WHERE id = ?', [body.description, id])
    if (body.amount !== undefined)
      db.run('UPDATE transactions SET amount = ? WHERE id = ?', [body.amount, id])
    if (body.type !== undefined)
      db.run('UPDATE transactions SET type = ? WHERE id = ?', [body.type, id])
    if (body.categoryId !== undefined)
      db.run('UPDATE transactions SET category_id = ? WHERE id = ?', [body.categoryId, id])
    if (body.accountId !== undefined)
      db.run('UPDATE transactions SET account_id = ? WHERE id = ?', [body.accountId, id])

    const updated = db.query('SELECT * FROM transactions WHERE id = ?').get(id) as TxnRow
    return c.json(rowToTransaction(updated))
  })

  app.delete('/:id', (c) => {
    const id = c.req.param('id')
    db.run('DELETE FROM transactions WHERE id = ?', [id])
    return new Response(null, { status: 204 })
  })

  return app
}
