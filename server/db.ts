import { Database } from 'bun:sqlite'

export function initDb(db: Database): void {
  db.run('PRAGMA journal_mode=WAL')
  db.run('PRAGMA foreign_keys=ON')

  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id      TEXT PRIMARY KEY,
      name    TEXT NOT NULL,
      type    TEXT NOT NULL,
      balance REAL NOT NULL
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id    TEXT PRIMARY KEY,
      name  TEXT NOT NULL,
      type  TEXT NOT NULL,
      color TEXT NOT NULL
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS budgets (
      category_id TEXT PRIMARY KEY,
      amount      REAL NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id          TEXT PRIMARY KEY,
      date        TEXT NOT NULL,
      description TEXT NOT NULL,
      amount      REAL NOT NULL,
      type        TEXT NOT NULL,
      category_id TEXT NOT NULL,
      account_id  TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (account_id)  REFERENCES accounts(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS recurring_rules (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      amount       REAL NOT NULL,
      category_id  TEXT NOT NULL,
      account_id   TEXT NOT NULL,
      frequency    TEXT NOT NULL,
      start_date   TEXT NOT NULL,
      end_date     TEXT,
      day_of_month INTEGER,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (account_id)  REFERENCES accounts(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS loans (
      id                   TEXT PRIMARY KEY,
      name                 TEXT NOT NULL,
      principal            REAL NOT NULL,
      annual_rate          REAL NOT NULL,
      start_date           TEXT NOT NULL,
      term_months          INTEGER NOT NULL,
      account_id           TEXT NOT NULL,
      category_id          TEXT NOT NULL,
      current_balance_date TEXT,
      current_balance      REAL,
      insurance_per_month  REAL,
      payment_day          INTEGER,
      paid_up_to_date      TEXT,
      FOREIGN KEY (account_id)  REFERENCES accounts(id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS early_payments (
      id      TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL,
      date    TEXT NOT NULL,
      amount  REAL NOT NULL,
      mode    TEXT NOT NULL,
      FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
    )
  `)
}
