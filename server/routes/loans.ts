import { Hono } from 'hono'
import type { Database } from 'bun:sqlite'
import type { Loan, EarlyPayment, Transaction } from '../../src/types'
import { generateLoanTransactions } from '../../src/utils/loans'

interface LoanRow {
  id: string
  name: string
  principal: number
  annual_rate: number
  start_date: string
  term_months: number
  account_id: string
  category_id: string
  current_balance_date: string | null
  current_balance: number | null
  insurance_per_month: number | null
  payment_day: number | null
  paid_up_to_date: string | null
}

interface EarlyPaymentRow {
  id: string
  loan_id: string
  date: string
  amount: number
  mode: string
}

function rowToLoan(row: LoanRow, earlyPayments: EarlyPaymentRow[]): Loan {
  return {
    id: row.id,
    name: row.name,
    principal: row.principal,
    annualRate: row.annual_rate,
    startDate: new Date(row.start_date),
    termMonths: row.term_months,
    accountId: row.account_id,
    categoryId: row.category_id,
    currentBalance: row.current_balance !== null && row.current_balance_date !== null
      ? { date: new Date(row.current_balance_date), balance: row.current_balance }
      : undefined,
    insurancePerMonth: row.insurance_per_month ?? undefined,
    paymentDay: row.payment_day ?? undefined,
    earlyPayments: earlyPayments.map(ep => ({
      id: ep.id,
      date: new Date(ep.date),
      amount: ep.amount,
      mode: ep.mode as EarlyPayment['mode'],
    })),
  }
}

type TxnWithStringDate = Omit<Transaction, 'date'> & { date: string }

function txnToSerializable(t: Transaction): TxnWithStringDate {
  return { ...t, date: t.date.toISOString().slice(0, 10) }
}

function getLoanWithTransactions(
  db: Database,
  loanId: string,
  paidUpToDate: string | null,
): (Loan & { transactions: TxnWithStringDate[] }) | null {
  const row = db.query('SELECT * FROM loans WHERE id = ?').get(loanId) as LoanRow | null
  if (!row) return null
  const epRows = db.query('SELECT * FROM early_payments WHERE loan_id = ? ORDER BY date').all(loanId) as EarlyPaymentRow[]
  const loan = rowToLoan(row, epRows)
  let transactions = generateLoanTransactions(loan)

  if (paidUpToDate) {
    const cutoff = new Date(paidUpToDate)
    cutoff.setHours(23, 59, 59, 999)
    transactions = transactions.map(t =>
      !t.id.includes('-early-') && t.date <= cutoff && t.type === 'planned'
        ? { ...t, type: 'actual' as const }
        : t,
    )
  }

  return { ...loan, transactions: transactions.map(txnToSerializable) }
}

export function loansRoutes(db: Database): Hono {
  const app = new Hono()

  app.get('/', (c) => {
    const loanRows = db.query('SELECT * FROM loans ORDER BY start_date').all() as LoanRow[]
    const result = loanRows.map(row => getLoanWithTransactions(db, row.id, row.paid_up_to_date))
    return c.json(result)
  })

  app.post('/', async (c) => {
    const body = await c.req.json<{
      name: string
      principal: number
      annualRate: number
      startDate: string
      termMonths: number
      accountId: string
      categoryId: string
      insurancePerMonth?: number | null
      paymentDay?: number | null
    }>()

    const id = crypto.randomUUID()
    db.run(
      `INSERT INTO loans (id, name, principal, annual_rate, start_date, term_months, account_id, category_id, insurance_per_month, payment_day)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.name, body.principal, body.annualRate, body.startDate, body.termMonths,
       body.accountId, body.categoryId, body.insurancePerMonth ?? null, body.paymentDay ?? null],
    )

    return c.json(getLoanWithTransactions(db, id, null), 201)
  })

  app.put('/:id', async (c) => {
    const id = c.req.param('id')
    const existing = db.query('SELECT * FROM loans WHERE id = ?').get(id) as LoanRow | null
    if (!existing) return c.json({ error: 'Loan not found' }, 404)

    const body = await c.req.json<Partial<{
      name: string
      principal: number
      annualRate: number
      startDate: string
      termMonths: number
      accountId: string
      categoryId: string
      insurancePerMonth: number | null
      paymentDay: number | null
      currentBalanceDate: string | null
      currentBalance: number | null
      markPaidUpToDate: boolean
    }>>()

    if (body.name !== undefined) db.run('UPDATE loans SET name = ? WHERE id = ?', [body.name, id])
    if (body.principal !== undefined) db.run('UPDATE loans SET principal = ? WHERE id = ?', [body.principal, id])
    if (body.annualRate !== undefined) db.run('UPDATE loans SET annual_rate = ? WHERE id = ?', [body.annualRate, id])
    if (body.startDate !== undefined) db.run('UPDATE loans SET start_date = ? WHERE id = ?', [body.startDate, id])
    if (body.termMonths !== undefined) db.run('UPDATE loans SET term_months = ? WHERE id = ?', [body.termMonths, id])
    if (body.insurancePerMonth !== undefined) db.run('UPDATE loans SET insurance_per_month = ? WHERE id = ?', [body.insurancePerMonth, id])
    if (body.paymentDay !== undefined) db.run('UPDATE loans SET payment_day = ? WHERE id = ?', [body.paymentDay, id])
    if (body.currentBalanceDate !== undefined) db.run('UPDATE loans SET current_balance_date = ? WHERE id = ?', [body.currentBalanceDate, id])
    if (body.currentBalance !== undefined) db.run('UPDATE loans SET current_balance = ? WHERE id = ?', [body.currentBalance, id])
    if (body.markPaidUpToDate) {
      const today = new Date().toISOString().slice(0, 10)
      db.run('UPDATE loans SET paid_up_to_date = ? WHERE id = ?', [today, id])
    }

    const updatedRow = db.query('SELECT * FROM loans WHERE id = ?').get(id) as LoanRow
    return c.json(getLoanWithTransactions(db, id, updatedRow.paid_up_to_date))
  })

  app.delete('/:id', (c) => {
    const id = c.req.param('id')
    db.run('DELETE FROM loans WHERE id = ?', [id])
    return new Response(null, { status: 204 })
  })

  app.post('/:id/early-payments', async (c) => {
    const loanId = c.req.param('id')
    const existing = db.query('SELECT * FROM loans WHERE id = ?').get(loanId)
    if (!existing) return c.json({ error: 'Loan not found' }, 404)

    const body = await c.req.json<{ date: string; amount: number; mode: 'reduce_term' | 'reduce_payment' }>()
    const epId = crypto.randomUUID()
    db.run(
      'INSERT INTO early_payments (id, loan_id, date, amount, mode) VALUES (?, ?, ?, ?, ?)',
      [epId, loanId, body.date, body.amount, body.mode],
    )

    const loanRow = db.query('SELECT * FROM loans WHERE id = ?').get(loanId) as LoanRow
    return c.json(getLoanWithTransactions(db, loanId, loanRow.paid_up_to_date), 201)
  })

  app.delete('/:id/early-payments/:paymentId', (c) => {
    const loanId = c.req.param('id')
    const paymentId = c.req.param('paymentId')
    db.run('DELETE FROM early_payments WHERE id = ? AND loan_id = ?', [paymentId, loanId])
    const loanRow = db.query('SELECT * FROM loans WHERE id = ?').get(loanId) as LoanRow | null
    if (!loanRow) return c.json({ error: 'Loan not found' }, 404)
    return c.json(getLoanWithTransactions(db, loanId, loanRow.paid_up_to_date))
  })

  return app
}
