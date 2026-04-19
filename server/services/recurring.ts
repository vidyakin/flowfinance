import type { RecurringRow } from '../types'

export function nextOccurrence(current: Date, rule: RecurringRow): Date {
  const next = new Date(current)
  switch (rule.frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'biweekly':
      next.setDate(next.getDate() + 14)
      break
    case 'monthly': {
      const day = rule.day_of_month ?? new Date(rule.start_date).getDate()
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

export function getOccurrences(rule: RecurringRow, from: Date, to: Date): { date: string; amount: number }[] {
  const result: { date: string; amount: number }[] = []
  const start = new Date(rule.start_date)
  start.setHours(0, 0, 0, 0)
  const end = rule.end_date ? new Date(rule.end_date) : null
  if (end) end.setHours(23, 59, 59, 999)

  let cursor = new Date(start)
  while (cursor < from) {
    cursor = nextOccurrence(cursor, rule)
  }

  while (cursor <= to) {
    if (end && cursor > end) break
    const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`
    result.push({ date: dateStr, amount: rule.amount })
    cursor = nextOccurrence(cursor, rule)
  }

  return result
}
