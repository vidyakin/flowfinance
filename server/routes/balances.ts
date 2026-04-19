import { Hono } from 'hono'
import type { Database } from 'bun:sqlite'
import type { RecurringRow, TransactionRow as TxnRow, AccountRow } from '../types'
import { getOccurrences } from '../services/recurring'

export function balancesRoutes(db: Database): Hono {
  const app = new Hono()

  app.get('/', (c) => {
    const rows = db.query('SELECT * FROM daily_balances ORDER BY date').all() as { date: string; balance: number }[]
    return c.json(rows)
  })

  app.post('/recalculate', async (c) => {
    db.run('DELETE FROM daily_balances')

    const accounts = db.query('SELECT * FROM accounts').all() as AccountRow[]
    const initialBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)

    const allTxns = db.query('SELECT * FROM transactions ORDER BY date').all() as TxnRow[]
    const rules = db.query('SELECT * FROM recurring_rules').all() as RecurringRow[]

    let startDate = new Date('2020-01-01')
    let endDate = new Date('2030-12-31')

    for (const t of allTxns) {
      const d = new Date(t.date)
      if (d < startDate) startDate = d
      if (d > endDate) endDate = d
    }
    for (const r of rules) {
      const d = new Date(r.start_date)
      if (d < startDate) startDate = d
    }

    const dailyAmounts = new Map<string, number>()

    for (const acc of accounts) {
      dailyAmounts.set('1970-01-01', (dailyAmounts.get('1970-01-01') ?? 0) + acc.balance)
    }

    for (const t of allTxns) {
      const current = dailyAmounts.get(t.date) ?? 0
      dailyAmounts.set(t.date, current + t.amount)
    }

    for (const r of rules) {
      const occurrences = getOccurrences(r, startDate, endDate)
      for (const occ of occurrences) {
        const current = dailyAmounts.get(occ.date) ?? 0
        dailyAmounts.set(occ.date, current + occ.amount)
      }
    }

    const sortedDates = Array.from(dailyAmounts.keys()).sort()
    const insertStmt = db.prepare('INSERT OR REPLACE INTO daily_balances (date, balance) VALUES (?, ?)')

    let runningBalance = 0
    const firstDate = sortedDates[0]
    if (firstDate === '1970-01-01') {
      runningBalance = dailyAmounts.get('1970-01-01') ?? 0
      dailyAmounts.delete('1970-01-01')
    } else {
      runningBalance = initialBalance
    }

    for (const date of sortedDates) {
      if (date === '1970-01-01') continue
      runningBalance += dailyAmounts.get(date) ?? 0
      insertStmt.run(date, runningBalance)
    }

    const updated = db.query('SELECT * FROM daily_balances ORDER BY date').all()
    return c.json(updated)
  })

  app.get('/:date', (c) => {
    const date = c.req.param('date')
    const row = db.query('SELECT * FROM daily_balances WHERE date = ?').get(date) as { date: string; balance: number } | null
    if (!row) return c.json({ date, balance: null }, 404)
    return c.json(row)
  })

  return app
}
