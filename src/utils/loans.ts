import type { Loan, Transaction } from '@/types'

export function calculateAnnuityPayment(
  principal: number,
  annualRate: number,
  termMonths: number,
): number {
  if (termMonths <= 0) return 0
  const r = annualRate / 100 / 12
  if (r === 0) return Math.round((principal / termMonths) * 100) / 100
  const payment =
    (principal * (r * Math.pow(1 + r, termMonths))) / (Math.pow(1 + r, termMonths) - 1)
  return Math.round(payment * 100) / 100
}

export function generateLoanTransactions(loan: Loan): Transaction[] {
  const monthlyPayment = calculateAnnuityPayment(loan.principal, loan.annualRate, loan.termMonths)
  const transactions: Transaction[] = []

  for (let n = 0; n < loan.termMonths; n++) {
    const date = new Date(loan.startDate)
    date.setMonth(date.getMonth() + n)

    const isLast = n === loan.termMonths - 1
    const amount = isLast
      ? -Math.round((monthlyPayment * loan.termMonths - monthlyPayment * (loan.termMonths - 1)) * 100) / 100
      : -monthlyPayment

    transactions.push({
      id: `loan-${loan.id}-${n}`,
      date,
      description: loan.name,
      amount,
      type: 'planned',
      categoryId: loan.categoryId,
      accountId: loan.accountId,
    })
  }

  return transactions
}
