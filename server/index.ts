import { Database } from 'bun:sqlite'
import { join } from 'path'
import { serveStatic } from 'hono/bun'
import { initDb } from './db'
import { seedDb } from './seed'
import { createApp } from './app'
import { saveLoanSchedule } from './routes/loans'

const dbPath = join(import.meta.dir, '../data/flowfinance.db')
const db = new Database(dbPath)
initDb(db)
await seedDb(db)

// Миграция: строим loan_payments для кредитов, у которых ещё нет записей
const loanIds = db.query('SELECT id FROM loans').all() as { id: string }[]
for (const { id } of loanIds) {
  const hasPayments = db.query(
    'SELECT 1 FROM loan_payments WHERE loan_id = ? LIMIT 1',
  ).get(id)
  if (!hasPayments) {
    // Очищаем старые транзакции и строим с нуля через новую логику
    db.run('DELETE FROM transactions WHERE id LIKE ?', [`loan-${id}-%`])
    saveLoanSchedule(db, id)
  }
}

const app = createApp(db)

if (process.env.NODE_ENV === 'production') {
  const distPath = join(import.meta.dir, '../dist')
  app.use('*', serveStatic({ root: distPath }))
  app.get('*', (c) => {
    return c.html(Bun.file(join(distPath, 'index.html')))
  })
}

const port = Number(process.env.PORT ?? 3001)
console.log(`Server running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
