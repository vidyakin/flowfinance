import { Hono } from 'hono'
import type { Database } from 'bun:sqlite'

export function exportRoutes(db: Database): Hono {
  const app = new Hono()

  app.get('/transactions', (c) => {
    const from = c.req.query('from') ?? '2000-01-01'
    const to = c.req.query('to') ?? '2099-12-31'
    const accountId = c.req.query('accountId')

    let query = `SELECT t.*, c.name as category_name, a.name as account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.date >= ? AND t.date <= ?`
    const params: string[] = [from, to]
    if (accountId) {
      query += ' AND t.account_id = ?'
      params.push(accountId)
    }
    query += ' ORDER BY t.date'

    const rows = db.query(query).all(...params) as any[]

    const header = 'date,description,amount,type,category,account\n'
    const csv = rows.map(r =>
      `${r.date},"${(r.description ?? '').replace(/"/g, '""')}",${r.amount},${r.type},"${(r.category_name ?? '').replace(/"/g, '""')}","${(r.account_name ?? '').replace(/"/g, '""')}"`
    ).join('\n')

    return new Response(header + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="transactions-${from}-${to}.csv"`,
      }
    })
  })

  return app
}
