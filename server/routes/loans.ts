import { Hono } from 'hono'
import type { Database } from 'bun:sqlite'
import dayjs from 'dayjs'
import type { Loan, EarlyPayment } from '../../src/types'
import { generateAmortizationRows } from '../../src/utils/loans'

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
  archived: number | null
}

interface EarlyPaymentRow {
  id: string
  loan_id: string
  date: string
  amount: number
  mode: string
}

interface LoanPaymentRow {
  id: string
  loan_id: string
  date: string
  planned_amount: number | null
  actual_amount: number | null
  principal: number
  interest: number
  remaining_balance: number | null
}

function rowToLoan(row: LoanRow, earlyPayments: EarlyPaymentRow[]): Loan {
  return {
    id: row.id,
    name: row.name,
    principal: row.principal,
    annualRate: row.annual_rate,
    startDate: dayjs(row.start_date).toDate(),
    termMonths: row.term_months,
    accountId: row.account_id,
    categoryId: row.category_id,
    currentBalance:
      row.current_balance !== null && row.current_balance_date !== null
        ? { date: dayjs(row.current_balance_date).toDate(), balance: row.current_balance }
        : undefined,
    insurancePerMonth: row.insurance_per_month ?? undefined,
    paymentDay: row.payment_day ?? undefined,
    earlyPayments: earlyPayments.map(ep => ({
      id: ep.id,
      date: dayjs(ep.date).toDate(),
      amount: ep.amount,
      mode: ep.mode as EarlyPayment['mode'],
    })),
    archived: Boolean(row.archived ?? 0),
  }
}

function loanToSerializable(loan: Loan) {
  return {
    ...loan,
    startDate: dayjs(loan.startDate).format('YYYY-MM-DD'),
    currentBalance: loan.currentBalance
      ? { date: dayjs(loan.currentBalance.date).format('YYYY-MM-DD'), balance: loan.currentBalance.balance }
      : undefined,
    earlyPayments: loan.earlyPayments.map(ep => ({
      ...ep,
      date: dayjs(ep.date).format('YYYY-MM-DD'),
    })),
  }
}

function lpRowToSerializable(row: LoanPaymentRow) {
  return {
    id: row.id,
    loanId: row.loan_id,
    date: row.date,
    plannedAmount: row.planned_amount,
    actualAmount: row.actual_amount,
    principal: row.principal,
    interest: row.interest,
    remainingBalance: row.remaining_balance,
  }
}

/**
 * Получает начальный остаток долга для вычисления remaining_balance.
 * Если есть оплаченные платежи — берём remaining_balance последнего.
 * Иначе — initial balance из самого кредита.
 */
function getInitialBalance(db: Database, loanId: string): number {
  const lastPaid = db.query(`
    SELECT remaining_balance FROM loan_payments
    WHERE loan_id = ? AND actual_amount IS NOT NULL AND remaining_balance IS NOT NULL
    ORDER BY date DESC LIMIT 1
  `).get(loanId) as { remaining_balance: number } | null

  if (lastPaid) return lastPaid.remaining_balance

  const loan = db.query('SELECT current_balance, principal FROM loans WHERE id = ?').get(loanId) as
    | { current_balance: number | null; principal: number }
    | null
  return loan?.current_balance ?? loan?.principal ?? 0
}

/**
 * Пересчитывает и сохраняет плановый график платежей для кредита.
 * Оплаченные строки (actual_amount IS NOT NULL) не трогаются.
 * Будущие плановые строки пересоздаются с нуля.
 */
export function saveLoanSchedule(db: Database, loanId: string): void {
  const loanRow = db.query('SELECT * FROM loans WHERE id = ?').get(loanId) as LoanRow | null
  if (!loanRow) return

  const epRows = db.query('SELECT * FROM early_payments WHERE loan_id = ? ORDER BY date').all(loanId) as EarlyPaymentRow[]
  const loan = rowToLoan(loanRow, epRows)

  // Собираем ID уже оплаченных платежей — их не трогаем
  const paidIds = new Set<string>(
    (db.query('SELECT id FROM loan_payments WHERE loan_id = ? AND actual_amount IS NOT NULL')
      .all(loanId) as { id: string }[]).map(r => r.id),
  )

  // Удаляем все плановые (ещё не оплаченные) строки и транзакции.
  // Сначала собираем ID плановых платежей, чтобы удалить транзакции точным IN-запросом
  // (избегаем LIKE с user-controlled loanId, который может содержать wildcards).
  const plannedPaymentIds = (
    db.query('SELECT id FROM loan_payments WHERE loan_id = ? AND actual_amount IS NULL')
      .all(loanId) as { id: string }[]
  ).map(r => r.id)

  db.run("DELETE FROM loan_payments WHERE loan_id = ? AND actual_amount IS NULL", [loanId])

  if (plannedPaymentIds.length > 0) {
    const placeholders = plannedPaymentIds.map(() => '?').join(',')
    db.run(`DELETE FROM transactions WHERE id IN (${placeholders})`, plannedPaymentIds)
  }

  // Генерируем полный теоретический график
  const rows = generateAmortizationRows(loan)

  const insurance = loanRow.insurance_per_month ?? 0

  const lpStmt = db.prepare(`
    INSERT INTO loan_payments (id, loan_id, date, planned_amount, actual_amount, principal, interest, remaining_balance)
    VALUES (?, ?, ?, ?, NULL, ?, ?, ?)
  `)
  const txStmt = db.prepare(`
    INSERT INTO transactions (id, date, description, amount, type, category_id, account_id)
    VALUES (?, ?, ?, ?, 'planned', ?, ?)
  `)

  for (const row of rows) {
    if (paidIds.has(row.id)) continue // пропускаем уже оплаченные

    const dateStr = dayjs(row.date).format('YYYY-MM-DD')
    // Исторические строки имеют ID "loan-{id}-hist-N" — для них сохраняем balanceAfter,
    // чтобы markSinglePaymentPaid мог корректно восстановить цепочку остатков.
    const isHistorical = row.id.includes('-hist-')
    const storedBalance = isHistorical ? row.balanceAfter : null

    lpStmt.run(row.id, loanId, dateStr, row.plannedAmount, row.principal, row.interest, storedBalance)
    // Исторические строки НЕ создают транзакции: баланс счёта уже отражает
    // прошлые платежи, поэтому добавлять их в таблицу транзакций — двойной учёт.
    if (!isHistorical) {
      txStmt.run(row.id, dateStr, loan.name, -(row.plannedAmount + insurance), loan.categoryId, loan.accountId)
    }
  }
}

/**
 * Отмечает один платёж как оплаченный.
 * Вычисляет remaining_balance как снимок на момент оплаты.
 * actualAmount — если не указан, используется planned_amount.
 */
export function markSinglePaymentPaid(
  db: Database,
  loanId: string,
  paymentId: string,
  actualAmount?: number,
): void {
  const lpRow = db.query('SELECT * FROM loan_payments WHERE id = ? AND loan_id = ?')
    .get(paymentId, loanId) as LoanPaymentRow | null
  if (!lpRow || lpRow.actual_amount !== null) return

  const loanRow = db.query('SELECT * FROM loans WHERE id = ?').get(loanId) as LoanRow
  const insurance = loanRow.insurance_per_month ?? 0
  const r = loanRow.annual_rate / 100 / 12

  // Находим остаток от предыдущего оплаченного платежа
  const prevPaid = db.query(`
    SELECT remaining_balance FROM loan_payments
    WHERE loan_id = ? AND actual_amount IS NOT NULL AND remaining_balance IS NOT NULL AND date <= ?
    ORDER BY date DESC LIMIT 1
  `).get(loanId, lpRow.date) as { remaining_balance: number } | null

  // Если предыдущих оплаченных нет, пробуем восстановить balanceBefore из сохранённого
  // remaining_balance плановой строки (= balanceAfter из generate) + principal этой строки.
  // Это позволяет корректно цепочкой отмечать исторические платежи.
  const prevBalance = prevPaid?.remaining_balance
    ?? (lpRow.remaining_balance !== null
      ? lpRow.remaining_balance + lpRow.principal
      : (loanRow.current_balance ?? loanRow.principal))

  const paid = actualAmount ?? lpRow.planned_amount ?? 0
  const interest = Math.round(prevBalance * r * 100) / 100
  const principal = Math.round((paid - interest) * 100) / 100
  const remainingBalance = Math.max(0, prevBalance - principal)

  db.run(`
    UPDATE loan_payments
    SET actual_amount = ?, principal = ?, interest = ?, remaining_balance = ?
    WHERE id = ?
  `, [paid, principal, interest, remainingBalance, paymentId])

  // Исторические строки (hist-N) не имеют транзакций — пропускаем обновление.
  if (!paymentId.includes('-hist-')) {
    db.run(
      "UPDATE transactions SET type = 'actual', amount = ? WHERE id = ?",
      [-(paid + insurance), paymentId],
    )
  }
}

export function loansRoutes(db: Database): Hono {
  const app = new Hono()

  // GET /loans
  app.get('/', (c) => {
    const loanRows = db.query('SELECT * FROM loans ORDER BY start_date').all() as LoanRow[]
    const result = loanRows.map(row => {
      const epRows = db.query('SELECT * FROM early_payments WHERE loan_id = ? ORDER BY date').all(row.id) as EarlyPaymentRow[]
      return loanToSerializable(rowToLoan(row, epRows))
    })
    return c.json(result)
  })

  // GET /loans/:id/payments — график платежей с актуальными данными
  app.get('/:id/payments', (c) => {
    const id = c.req.param('id')
    const rows = db.query('SELECT * FROM loan_payments WHERE loan_id = ? ORDER BY date')
      .all(id) as LoanPaymentRow[]
    return c.json(rows.map(lpRowToSerializable))
  })

  // POST /loans
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
      currentBalance?: { date: string; balance: number } | null
    }>()

    const id = crypto.randomUUID()
    const cbDate = body.currentBalance?.date
      ? dayjs(body.currentBalance.date).format('YYYY-MM-DD')
      : null
    const cbBalance = body.currentBalance?.balance ?? null

    db.transaction(() => {
      db.run(
        `INSERT INTO loans (id, name, principal, annual_rate, start_date, term_months, account_id, category_id, insurance_per_month, payment_day, current_balance_date, current_balance)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, body.name, body.principal, body.annualRate, body.startDate, body.termMonths,
         body.accountId, body.categoryId, body.insurancePerMonth ?? null, body.paymentDay ?? null,
         cbDate, cbBalance],
      )
      saveLoanSchedule(db, id)
    })()

    const row = db.query('SELECT * FROM loans WHERE id = ?').get(id) as LoanRow
    return c.json(loanToSerializable(rowToLoan(row, [])), 201)
  })

  // PUT /loans/:id
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
      archived: boolean
    }>>()

    if (body.archived !== undefined) db.run('UPDATE loans SET archived = ? WHERE id = ?', [body.archived ? 1 : 0, id])
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
      const today = dayjs().format('YYYY-MM-DD')
      // Помечаем все неоплаченные платежи до сегодня, по порядку дат
      const unpaid = db.query(`
        SELECT id FROM loan_payments
        WHERE loan_id = ? AND actual_amount IS NULL AND date <= ?
        ORDER BY date ASC
      `).all(id, today) as { id: string }[]

      for (const { id: paymentId } of unpaid) {
        markSinglePaymentPaid(db, id, paymentId)
      }
      // Удаляем транзакции для всех только что помеченных платежей.
      // accounts.balance уже отражает прошлые выплаты по кредиту,
      // поэтому добавление actual-транзакций за прошлые периоды
      // приводит к двойному учёту и отрицательным остаткам.
      for (const { id: paymentId } of unpaid) {
        db.run("DELETE FROM transactions WHERE id = ?", [paymentId])
      }
      // Удаляем исторические транзакции (hist-N) — они не должны участвовать
      // в расчёте баланса, т.к. баланс счёта уже отражает прошлые платежи.
      // Используем подзапрос по loan_payments (там есть loan_id), избегая LIKE.
      const histIds = (
        db.query("SELECT id FROM loan_payments WHERE loan_id = ? AND id LIKE 'loan-%-hist-%'")
          .all(id) as { id: string }[]
      ).map(r => r.id)
      if (histIds.length > 0) {
        const histPlaceholders = histIds.map(() => '?').join(',')
        db.run(`DELETE FROM transactions WHERE id IN (${histPlaceholders})`, histIds)
      }
    } else {
      const structuralChange = body.annualRate !== undefined || body.termMonths !== undefined
        || body.principal !== undefined || body.startDate !== undefined
        || body.paymentDay !== undefined || body.insurancePerMonth !== undefined
        || body.currentBalanceDate !== undefined || body.currentBalance !== undefined

      if (structuralChange) {
        saveLoanSchedule(db, id)
      }
    }

    const updatedRow = db.query('SELECT * FROM loans WHERE id = ?').get(id) as LoanRow
    const epRows = db.query('SELECT * FROM early_payments WHERE loan_id = ? ORDER BY date').all(id) as EarlyPaymentRow[]
    return c.json(loanToSerializable(rowToLoan(updatedRow, epRows)))
  })

  // PUT /loans/:id/payments/:paymentId — отметить конкретный платёж как оплаченный
  app.put('/:id/payments/:paymentId', async (c) => {
    const loanId = c.req.param('id')
    const paymentId = c.req.param('paymentId')
    const body = await c.req.json<{ actualAmount?: number }>()

    const existing = db.query('SELECT 1 FROM loans WHERE id = ?').get(loanId)
    if (!existing) return c.json({ error: 'Loan not found' }, 404)

    markSinglePaymentPaid(db, loanId, paymentId, body.actualAmount)

    const rows = db.query('SELECT * FROM loan_payments WHERE loan_id = ? ORDER BY date')
      .all(loanId) as LoanPaymentRow[]
    return c.json(rows.map(lpRowToSerializable))
  })

  // DELETE /loans/:id
  app.delete('/:id', (c) => {
    const id = c.req.param('id')

    const existing = db.query('SELECT 1 FROM loans WHERE id = ?').get(id)
    if (!existing) return c.json({ error: 'Loan not found' }, 404)

    // Удаляем транзакции через loan_payments (там есть loan_id) — избегаем LIKE с user input.
    const loanTxIds = (
      db.query('SELECT id FROM loan_payments WHERE loan_id = ?').all(id) as { id: string }[]
    ).map(r => r.id)
    if (loanTxIds.length > 0) {
      const placeholders = loanTxIds.map(() => '?').join(',')
      db.run(`DELETE FROM transactions WHERE id IN (${placeholders})`, loanTxIds)
    }

    db.run('DELETE FROM loans WHERE id = ?', [id])
    return new Response(null, { status: 204 })
  })

  // POST /loans/:id/early-payments
  app.post('/:id/early-payments', async (c) => {
    const loanId = c.req.param('id')
    const existing = db.query('SELECT * FROM loans WHERE id = ?').get(loanId) as LoanRow | null
    if (!existing) return c.json({ error: 'Loan not found' }, 404)

    const body = await c.req.json<{ date: string; amount: number; mode: 'reduce_term' | 'reduce_payment' }>()
    const epId = crypto.randomUUID()

    // 1. Сохраняем досрочный платёж в early_payments (нужен для пересчёта графика)
    db.run(
      'INSERT INTO early_payments (id, loan_id, date, amount, mode) VALUES (?, ?, ?, ?, ?)',
      [epId, loanId, body.date, body.amount, body.mode],
    )

    // 2. Находим остаток на дату досрочного платежа
    const prevPaid = db.query(`
      SELECT remaining_balance FROM loan_payments
      WHERE loan_id = ? AND actual_amount IS NOT NULL AND remaining_balance IS NOT NULL AND date <= ?
      ORDER BY date DESC LIMIT 1
    `).get(loanId, body.date) as { remaining_balance: number } | null

    const prevBalance = prevPaid?.remaining_balance
      ?? existing.current_balance
      ?? existing.principal

    const remainingAfterEarly = Math.max(0, prevBalance - body.amount)

    // 3. Создаём строку в loan_payments: план = null, факт = сумма досрочки
    const lpId = `loan-${loanId}-early-${epId}`
    db.run(`
      INSERT INTO loan_payments (id, loan_id, date, planned_amount, actual_amount, principal, interest, remaining_balance)
      VALUES (?, ?, ?, NULL, ?, ?, 0, ?)
    `, [lpId, loanId, body.date, body.amount, body.amount, remainingAfterEarly])

    // 4. Создаём транзакцию (фактическое списание)
    db.run(
      'INSERT INTO transactions (id, date, description, amount, type, category_id, account_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [lpId, body.date, `${existing.name} — досрочный платёж`, -body.amount, 'actual', existing.category_id, existing.account_id],
    )

    // 5. Пересчитываем плановый график (теперь с учётом досрочного погашения)
    saveLoanSchedule(db, loanId)

    const loanRow = db.query('SELECT * FROM loans WHERE id = ?').get(loanId) as LoanRow
    const epRows = db.query('SELECT * FROM early_payments WHERE loan_id = ? ORDER BY date').all(loanId) as EarlyPaymentRow[]
    return c.json(loanToSerializable(rowToLoan(loanRow, epRows)), 201)
  })

  // DELETE /loans/:id/early-payments/:paymentId
  app.delete('/:id/early-payments/:paymentId', (c) => {
    const loanId = c.req.param('id')
    const paymentId = c.req.param('paymentId')

    db.run('DELETE FROM early_payments WHERE id = ? AND loan_id = ?', [paymentId, loanId])

    // Удаляем loan_payments и транзакцию для этой досрочки
    const lpId = `loan-${loanId}-early-${paymentId}`
    db.run('DELETE FROM loan_payments WHERE id = ?', [lpId])
    db.run('DELETE FROM transactions WHERE id = ?', [lpId])

    saveLoanSchedule(db, loanId)

    const loanRow = db.query('SELECT * FROM loans WHERE id = ?').get(loanId) as LoanRow | null
    if (!loanRow) return c.json({ error: 'Loan not found' }, 404)
    const epRows = db.query('SELECT * FROM early_payments WHERE loan_id = ? ORDER BY date').all(loanId) as EarlyPaymentRow[]
    return c.json(loanToSerializable(rowToLoan(loanRow, epRows)))
  })

  return app
}
