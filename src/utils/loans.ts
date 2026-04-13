import type { Loan, Transaction } from '@/types'

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

function monthsBetween(start: Date, end: Date): number {
  return (
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  )
}

function addOneMonth(date: Date): Date {
  const next = new Date(date)
  next.setMonth(next.getMonth() + 1)
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
    .filter((ep) => new Date(ep.date) < atDate)
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
      term = calculateRemainingTerm(balance, loan.annualRate, monthlyPayment)
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
  } else {
    segmentDate = new Date(loan.startDate)
    segmentBalance = loan.principal
    segmentTerm = loan.termMonths
  }

  const sortedEarlyPayments = [...loan.earlyPayments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )

  const transactions: Transaction[] = []
  let monthlyPayment = calculateAnnuityPayment(segmentBalance, loan.annualRate, segmentTerm)
  let paymentIndex = 0

  for (const ep of sortedEarlyPayments) {
    const epDate = new Date(ep.date)

    // Generate regular payments before the early payment date
    while (segmentDate < epDate && segmentTerm > 0) {
      transactions.push({
        id: `loan-${loan.id}-${paymentIndex}`,
        date: new Date(segmentDate),
        description: loan.name,
        amount: -monthlyPayment,
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
      segmentTerm = calculateRemainingTerm(segmentBalance, loan.annualRate, monthlyPayment)
    } else {
      // reduce_payment: same term, lower payment
      monthlyPayment = calculateAnnuityPayment(segmentBalance, loan.annualRate, segmentTerm)
    }
  }

  // Generate remaining regular payments
  for (let i = 0; i < segmentTerm && segmentBalance > 0; i++) {
    transactions.push({
      id: `loan-${loan.id}-${paymentIndex}`,
      date: new Date(segmentDate),
      description: loan.name,
      amount: -monthlyPayment,
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
