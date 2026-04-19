import type { Loan } from '@/types'
import dayjs from 'dayjs'

const MAX_LOAN_MONTHS = 600 // 50 years safety cap

export function calculateAnnuityPayment(
  principal: number,
  annualRate: number,
  termMonths: number,
): number {
  if (termMonths <= 0 || principal <= 0) return 0
  const r = annualRate / 100 / 12
  if (r === 0) return Math.round((principal / termMonths) * 100) / 100
  const payment =
    (principal * (r * Math.pow(1 + r, termMonths))) / (Math.pow(1 + r, termMonths) - 1)
  return Math.round(payment * 100) / 100
}

/**
 * Given current balance, rate, and fixed monthly payment — how many months remain?
 */
export function calculateRemainingTerm(
  balance: number,
  annualRate: number,
  monthlyPayment: number,
): number {
  if (balance <= 0) return 0
  const r = annualRate / 100 / 12
  if (r === 0) return Math.ceil(balance / monthlyPayment)
  if (monthlyPayment <= balance * r) return 999 // payment doesn't cover interest
  return Math.ceil(Math.log(monthlyPayment / (monthlyPayment - r * balance)) / Math.log(1 + r))
}

/**
 * Adjusts segmentDate to the nearest future occurrence of paymentDay.
 * If that day has already passed in the current month, moves to next month.
 */
function applyPaymentDay(from: Date, paymentDay: number): Date {
  const clampDay = (year: number, month: number) =>
    Math.min(paymentDay, new Date(year, month + 1, 0).getDate())
  const candidate = new Date(from.getFullYear(), from.getMonth(), clampDay(from.getFullYear(), from.getMonth()))
  if (candidate <= from) {
    const nm = new Date(from.getFullYear(), from.getMonth() + 1, 1)
    return new Date(nm.getFullYear(), nm.getMonth(), clampDay(nm.getFullYear(), nm.getMonth()))
  }
  return candidate
}

function monthsBetween(start: Date, end: Date): number {
  return (
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  )
}

function addOneMonth(date: Date): Date {
  const day = date.getDate()
  const next = new Date(date)
  next.setMonth(next.getMonth() + 1)
  // Clamp to last valid day if month overflow (e.g., Jan 31 → Feb 28)
  const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(day, maxDay))
  return next
}

/**
 * Returns the loan state (balance, monthly payment, remaining term) at a given date,
 * accounting for all early payments that occur before that date.
 * Used by EarlyPaymentModal for live preview.
 */
export function getLoanStateAtDate(
  loan: Loan,
  atDate: Date,
): { balance: number; monthlyPayment: number; remainingTerm: number } {
  const r = loan.annualRate / 100 / 12

  let segmentDate: Date
  let balance: number
  let term: number

  if (loan.currentBalance) {
    segmentDate = new Date(loan.currentBalance.date)
    balance = loan.currentBalance.balance
    const endDate = new Date(loan.startDate)
    endDate.setMonth(endDate.getMonth() + loan.termMonths)
    term = Math.max(1, monthsBetween(segmentDate, endDate))
  } else {
    segmentDate = new Date(loan.startDate)
    balance = loan.principal
    term = loan.termMonths
  }

  const sortedEarlyPayments = [...loan.earlyPayments]
    .filter((ep) => new Date(ep.date) < atDate && new Date(ep.date) >= segmentDate)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let monthlyPayment = calculateAnnuityPayment(balance, loan.annualRate, term)

  for (const ep of sortedEarlyPayments) {
    const epDate = new Date(ep.date)

    while (segmentDate < epDate && term > 0) {
      const interest = balance * r
      balance = Math.max(0, balance - (monthlyPayment - interest))
      term--
      segmentDate = addOneMonth(segmentDate)
    }

    balance = Math.max(0, balance - ep.amount)
    if (balance <= 0) return { balance: 0, monthlyPayment, remainingTerm: 0 }

    if (ep.mode === 'reduce_term') {
      term = Math.min(
        calculateRemainingTerm(balance, loan.annualRate, monthlyPayment),
        MAX_LOAN_MONTHS,
      )
    } else {
      monthlyPayment = calculateAnnuityPayment(balance, loan.annualRate, term)
    }
  }

  // Advance to atDate
  while (segmentDate < atDate && term > 0) {
    const interest = balance * r
    balance = Math.max(0, balance - (monthlyPayment - interest))
    term--
    segmentDate = addOneMonth(segmentDate)
  }

  return { balance: Math.max(0, balance), monthlyPayment, remainingTerm: term }
}

export interface AmortizationRow {
  id: string
  date: Date
  plannedAmount: number  // principal + interest, без страховки
  principal: number
  interest: number
  balanceBefore: number
  balanceAfter: number
}

/**
 * Генерирует строки графика платежей с разбивкой на тело/проценты и остатки.
 * Досрочные погашения влияют на последующий график, но сами строками не включаются.
 *
 * Если задан currentBalance — генерирует полный график начиная с первого платежа
 * (paymentDay после startDate), включая исторические строки (до currentBalance.date),
 * рассчитанные через обратную амортизацию от известного текущего остатка.
 */
export function generateAmortizationRows(loan: Loan): AmortizationRow[] {
  const r = loan.annualRate / 100 / 12

  // Параметры будущего сегмента (после currentBalance.date или с firstPaymentDate)
  let firstPaymentDate: Date  // первый платёж с даты startDate (для исторического раздела)
  let segmentDate: Date
  let segmentBalance: number
  let segmentTerm: number

  if (loan.currentBalance) {
    const cbDate = new Date(loan.currentBalance.date)
    segmentBalance = loan.currentBalance.balance
    const endDate = new Date(loan.startDate)
    endDate.setMonth(endDate.getMonth() + loan.termMonths)
    segmentTerm = Math.max(1, monthsBetween(cbDate, endDate))
    segmentDate = loan.paymentDay ? applyPaymentDay(cbDate, loan.paymentDay) : addOneMonth(cbDate)

    // Первый платёж от startDate (для генерации исторических строк)
    firstPaymentDate = loan.paymentDay
      ? applyPaymentDay(new Date(loan.startDate), loan.paymentDay)
      : addOneMonth(new Date(loan.startDate))
  } else {
    // Без currentBalance: поведение не меняем — первый платёж в том же месяце, что startDate
    const sd = new Date(loan.startDate)
    if (loan.paymentDay) {
      const d = Math.min(loan.paymentDay, new Date(sd.getFullYear(), sd.getMonth() + 1, 0).getDate())
      segmentDate = new Date(sd.getFullYear(), sd.getMonth(), d)
    } else {
      segmentDate = sd
    }
    firstPaymentDate = segmentDate
    segmentBalance = loan.principal
    segmentTerm = loan.termMonths
  }

  // Ранние погашения: учитываем только те, что после начала будущего сегмента
  const futureSegmentStart = loan.currentBalance ? new Date(loan.currentBalance.date) : firstPaymentDate
  const sortedEarlyPayments = [...loan.earlyPayments]
    .filter(ep => new Date(ep.date) >= futureSegmentStart)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const rows: AmortizationRow[] = []
  let monthlyPayment = calculateAnnuityPayment(segmentBalance, loan.annualRate, segmentTerm)

  // ── Исторические строки (только при наличии currentBalance) ──────────────
  // Используют неймспейс "hist-N" чтобы не конфликтовать с существующими
  // оплаченными будущими платежами (у которых IDs = loan-{id}-0, loan-{id}-1, …).
  if (loan.currentBalance) {
    const cbDate = new Date(loan.currentBalance.date)

    if (firstPaymentDate < cbDate) {
      // Собираем даты исторических платежей
      const historicalDates: Date[] = []
      let d = new Date(firstPaymentDate)
      while (d < cbDate) {
        historicalDates.push(new Date(d))
        d = addOneMonth(d)
      }

      // Восстанавливаем исторические балансы через обратную амортизацию.
      // Знаем баланс на cbDate = segmentBalance; движемся назад:
      //   balance_prev = (balance + monthlyPayment) / (1 + r)
      const balancesBeforePayment: number[] = []
      let bal = segmentBalance
      for (let i = historicalDates.length - 1; i >= 0; i--) {
        const balBefore = (bal + monthlyPayment) / (1 + r)
        balancesBeforePayment[i] = balBefore
        bal = balBefore
      }

      for (let i = 0; i < historicalDates.length; i++) {
        const balanceBefore = balancesBeforePayment[i]
        const interest = Math.round(balanceBefore * r * 100) / 100
        const principal = Math.round((monthlyPayment - interest) * 100) / 100
        const balanceAfter = Math.max(0, balanceBefore - principal)
        rows.push({
          id: `loan-${loan.id}-hist-${i}`,  // отдельный неймспейс для историческия строк
          date: historicalDates[i],
          plannedAmount: Math.round(monthlyPayment * 100) / 100,
          principal,
          interest,
          balanceBefore,
          balanceAfter,
        })
      }
    }
  }

  // ── Будущие строки (стандартная амортизация) ──────────────────────────────
  // Индексация с 0 — совпадает со старой схемой, поэтому уже оплаченные
  // платежи (actual_amount IS NOT NULL) корректно пропускаются по paidIds.
  let futureIndex = 0
  const pushRow = () => {
    const balanceBefore = segmentBalance
    const interest = Math.round(balanceBefore * r * 100) / 100
    const principal = Math.round((monthlyPayment - interest) * 100) / 100
    const balanceAfter = Math.max(0, balanceBefore - principal)
    rows.push({
      id: `loan-${loan.id}-${futureIndex}`,
      date: new Date(segmentDate),
      plannedAmount: Math.round(monthlyPayment * 100) / 100,
      principal,
      interest,
      balanceBefore,
      balanceAfter,
    })
    segmentBalance = balanceAfter
    segmentTerm--
    futureIndex++
    segmentDate = addOneMonth(segmentDate)
  }

  for (const ep of sortedEarlyPayments) {
    const epDate = new Date(ep.date)
    while (segmentDate < epDate && segmentTerm > 0) pushRow()
    if (segmentBalance <= 0) break

    segmentBalance = Math.max(0, segmentBalance - ep.amount)
    if (segmentBalance <= 0) break

    if (ep.mode === 'reduce_term') {
      segmentTerm = Math.min(
        calculateRemainingTerm(segmentBalance, loan.annualRate, monthlyPayment),
        MAX_LOAN_MONTHS,
      )
    } else {
      monthlyPayment = calculateAnnuityPayment(segmentBalance, loan.annualRate, segmentTerm)
    }
  }

  for (let i = 0; segmentTerm > 0 && segmentBalance > 0; i++) pushRow()

  return rows
}

