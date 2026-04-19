import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Database } from 'bun:sqlite'
import { accountsRoutes } from './routes/accounts'
import { categoriesRoutes } from './routes/categories'
import { budgetsRoutes } from './routes/budgets'
import { transactionsRoutes } from './routes/transactions'
import { recurringRoutes } from './routes/recurring'
import { loansRoutes } from './routes/loans'
import { balancesRoutes } from './routes/balances'
import { exportRoutes } from './routes/export'

export function createApp(db: Database): Hono {
  const app = new Hono()

  app.use('*', cors())

  app.route('/api/accounts', accountsRoutes(db))
  app.route('/api/categories', categoriesRoutes(db))
  app.route('/api/budgets', budgetsRoutes(db))
  app.route('/api/transactions', transactionsRoutes(db))
  app.route('/api/recurring', recurringRoutes(db))
  app.route('/api/loans', loansRoutes(db))
  app.route('/api/balances', balancesRoutes(db))
  app.route('/api/export', exportRoutes(db))

  return app
}
