import type { RecurringRule, Transaction } from '@/types'

export function generateOccurrences(rule: RecurringRule, from: Date, to: Date): Transaction[] {
  const result: Transaction[] = []
  const start = new Date(rule.startDate)
  start.setHours(0, 0, 0, 0)
  const end = rule.endDate ? new Date(rule.endDate) : null
  if (end) end.setHours(23, 59, 59, 999)

  let cursor = new Date(start)

  // Align cursor to first occurrence >= from
  while (cursor < from) {
    cursor = nextOccurrence(cursor, rule)
  }

  while (cursor <= to) {
    if (end && cursor > end) break

    const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`
    result.push({
      id: `recurring-${rule.id}-${dateStr}`,
      date: new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()),
      description: rule.name,
      amount: rule.amount,
      type: 'planned',
      categoryId: rule.categoryId,
      accountId: rule.accountId,
    })

    cursor = nextOccurrence(cursor, rule)
  }

  return result
}

function nextOccurrence(current: Date, rule: RecurringRule): Date {
  const next = new Date(current)

  switch (rule.frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'biweekly':
      next.setDate(next.getDate() + 14)
      break
    case 'monthly': {
      const day = rule.dayOfMonth ?? rule.startDate.getDate()
      next.setMonth(next.getMonth() + 1)
      const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next.setDate(Math.min(day, maxDay))
      break
    }
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1)
      break
  }

  return next
}
