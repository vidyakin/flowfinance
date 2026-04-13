import { Hono } from 'hono'
import type { Database } from 'bun:sqlite'
import type { RecurringRule } from '../../src/types'

interface RecurringRow {
  id: string
  name: string
  amount: number
  category_id: string
  account_id: string
  frequency: string
  start_date: string
  end_date: string | null
  day_of_month: number | null
}

function rowToRule(row: RecurringRow): Omit<RecurringRule, 'startDate' | 'endDate'> & { startDate: string; endDate: string | null } {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    categoryId: row.category_id,
    accountId: row.account_id,
    frequency: row.frequency as RecurringRule['frequency'],
    startDate: row.start_date,
    endDate: row.end_date,
    dayOfMonth: row.day_of_month ?? undefined,
  }
}

export function recurringRoutes(db: Database): Hono {
  const app = new Hono()

  app.get('/', (c) => {
    const rows = db.query('SELECT * FROM recurring_rules ORDER BY name').all() as RecurringRow[]
    return c.json(rows.map(rowToRule))
  })

  app.post('/', async (c) => {
    const body = await c.req.json<{
      name: string
      amount: number
      categoryId: string
      accountId: string
      frequency: string
      startDate: string
      endDate: string | null
      dayOfMonth?: number
    }>()

    const id = crypto.randomUUID()
    db.run(
      `INSERT INTO recurring_rules (id, name, amount, category_id, account_id, frequency, start_date, end_date, day_of_month)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.name, body.amount, body.categoryId, body.accountId, body.frequency, body.startDate, body.endDate ?? null, body.dayOfMonth ?? null],
    )

    const created = db.query('SELECT * FROM recurring_rules WHERE id = ?').get(id) as RecurringRow
    return c.json(rowToRule(created), 201)
  })

  app.put('/:id', async (c) => {
    const id = c.req.param('id')
    const existing = db.query('SELECT * FROM recurring_rules WHERE id = ?').get(id)
    if (!existing) return c.json({ error: 'Rule not found' }, 404)

    const body = await c.req.json<Partial<{
      name: string
      amount: number
      categoryId: string
      accountId: string
      frequency: string
      startDate: string
      endDate: string | null
      dayOfMonth: number
    }>>()

    if (body.name !== undefined) db.run('UPDATE recurring_rules SET name = ? WHERE id = ?', [body.name, id])
    if (body.amount !== undefined) db.run('UPDATE recurring_rules SET amount = ? WHERE id = ?', [body.amount, id])
    if (body.frequency !== undefined) db.run('UPDATE recurring_rules SET frequency = ? WHERE id = ?', [body.frequency, id])
    if (body.startDate !== undefined) db.run('UPDATE recurring_rules SET start_date = ? WHERE id = ?', [body.startDate, id])
    if (body.endDate !== undefined) db.run('UPDATE recurring_rules SET end_date = ? WHERE id = ?', [body.endDate, id])
    if (body.dayOfMonth !== undefined) db.run('UPDATE recurring_rules SET day_of_month = ? WHERE id = ?', [body.dayOfMonth, id])
    if (body.categoryId !== undefined) db.run('UPDATE recurring_rules SET category_id = ? WHERE id = ?', [body.categoryId, id])
    if (body.accountId !== undefined) db.run('UPDATE recurring_rules SET account_id = ? WHERE id = ?', [body.accountId, id])

    const updated = db.query('SELECT * FROM recurring_rules WHERE id = ?').get(id) as RecurringRow
    return c.json(rowToRule(updated))
  })

  app.delete('/:id', (c) => {
    const id = c.req.param('id')
    db.run('DELETE FROM recurring_rules WHERE id = ?', [id])
    return new Response(null, { status: 204 })
  })

  return app
}
