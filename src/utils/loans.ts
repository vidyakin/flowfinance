import type { Loan, Transaction } from '@/types'

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

export function generateLoanTransactions(loan: Loan): Transaction[] {
  const r = loan.annualRate / 100 / 12

  // Determine starting point
  let segmentDate: Date
  let segmentBalance: number
  let segmentTerm: number

  if (loan.currentBalance) {
    segmentDate = new Date(loan.currentBalance.date)
    segmentBalance = loan.currentBalance.balance
    const endDate = new Date(loan.startDate)
    endDate.setMonth(endDate.getMonth() + loan.termMonths)
    segmentTerm = Math.max(1, monthsBetween(segmentDate, endDate))
    if (loan.paymentDay) segmentDate = applyPaymentDay(segmentDate, loan.paymentDay)
  } else {
    segmentDate = new Date(loan.startDate)
    segmentBalance = loan.principal
    segmentTerm = loan.termMonths
    if (loan.paymentDay) {
      const d = Math.min(loan.paymentDay, new Date(segmentDate.getFullYear(), segmentDate.getMonth() + 1, 0).getDate())
      segmentDate = new Date(segmentDate.getFullYear(), segmentDate.getMonth(), d)
    }
  }

  const sortedEarlyPayments = [...loan.earlyPayments]
    .filter((ep) => new Date(ep.date) >= segmentDate)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const transactions: Transaction[] = []
  let monthlyPayment = calculateAnnuityPayment(segmentBalance, loan.annualRate, segmentTerm)
  let paymentIndex = 0

  for (const ep of sortedEarlyPayments) {
    const epDate = new Date(ep.date)

    // Generate regular payments before the early payment date
    while (segmentDate < epDate && segmentTerm > 0) {
      const insurance = loan.insurancePerMonth ?? 0
      transactions.push({
        id: `loan-${loan.id}-${paymentIndex}`,
        date: new Date(segmentDate),
        description: loan.name,
        amount: -(monthlyPayment + insurance),
        type: 'planned',
        categoryId: loan.categoryId,
        accountId: loan.accountId,
      })
      const interest = segmentBalance * r
      segmentBalance = Math.max(0, segmentBalance - (monthlyPayment - interest))
      segmentTerm--
      paymentIndex++
      segmentDate = addOneMonth(segmentDate)
    }

    if (segmentBalance <= 0) break

    // Early payment transaction (type: actual)
    transactions.push({
      id: `loan-${loan.id}-early-${ep.id}`,
      date: new Date(epDate),
      description: `${loan.name} — досрочный платёж`,
      amount: -ep.amount,
      type: 'actual',
      categoryId: loan.categoryId,
      accountId: loan.accountId,
    })

    segmentBalance = Math.max(0, segmentBalance - ep.amount)
    if (segmentBalance <= 0) break

    if (ep.mode === 'reduce_term') {
      segmentTerm = Math.min(
        calculateRemainingTerm(segmentBalance, loan.annualRate, monthlyPayment),
        MAX_LOAN_MONTHS,
      )
    } else {
      // reduce_payment: same term, lower payment
      monthlyPayment = calculateAnnuityPayment(segmentBalance, loan.annualRate, segmentTerm)
    }
  }

  // Generate remaining regular payments
  for (let i = 0; i < segmentTerm && segmentBalance > 0; i++) {
    const insurance = loan.insurancePerMonth ?? 0
    transactions.push({
      id: `loan-${loan.id}-${paymentIndex}`,
      date: new Date(segmentDate),
      description: loan.name,
      amount: -(monthlyPayment + insurance),
      type: 'planned',
      categoryId: loan.categoryId,
      accountId: loan.accountId,
    })
    const interest = segmentBalance * r
    segmentBalance = Math.max(0, segmentBalance - (monthlyPayment - interest))
    paymentIndex++
    segmentDate = addOneMonth(segmentDate)
  }

  return transactions
}
