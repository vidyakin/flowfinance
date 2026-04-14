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
    CREATE TABLE IF NOT EXISTS loan_payments (
      id                TEXT PRIMARY KEY,
      loan_id           TEXT NOT NULL,
      date              TEXT NOT NULL,
      planned_amount    REAL,
      actual_amount     REAL,
      principal         REAL NOT NULL,
      interest          REAL NOT NULL,
      remaining_balance REAL,
      FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
    )
  `)

  try { db.run('ALTER TABLE loans ADD COLUMN archived INTEGER NOT NULL DEFAULT 0') } catch (e: unknown) {
    // Ошибка ожидаема если колонка уже существует
    if (!(e instanceof Error) || !e.message.includes('duplicate column name')) {
      console.error('Migration error (ALTER TABLE loans):', e)
    }
  }

  try { db.run('ALTER TABLE loans ADD COLUMN paid_up_to_date TEXT') } catch (e: unknown) {
    if (!(e instanceof Error) || !e.message.includes('duplicate column name')) {
      console.error('Migration error (ALTER TABLE loans paid_up_to_date):', e)
    }
  }

  try {
    db.run('ALTER TABLE transactions ADD COLUMN recurring_rule_id TEXT')
  } catch (e: unknown) {
    if (!(e instanceof Error) || !e.message.includes('duplicate column name')) {
      console.error('Migration error (ALTER TABLE transactions recurring_rule_id):', e)
    }
  }

  db.run(`CREATE INDEX IF NOT EXISTS idx_tx_recurring_rule ON transactions(recurring_rule_id, date)`)

  db.run(`CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_date ON loan_payments(loan_id, date)`)

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

  db.run(`
    CREATE TABLE IF NOT EXISTS daily_balances (
      date      TEXT PRIMARY KEY,
      balance   REAL NOT NULL
    )
  `)

  db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_recurring_rules_dates ON recurring_rules(start_date, end_date)`)
}
