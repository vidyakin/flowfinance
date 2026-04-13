import { Database } from 'bun:sqlite'
import { join } from 'path'
import { serveStatic } from 'hono/bun'
import { initDb } from './db'
import { seedDb } from './seed'
import { createApp } from './app'

const dbPath = join(import.meta.dir, '../data/flowfinance.db')
const db = new Database(dbPath)
initDb(db)
await seedDb(db)

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
