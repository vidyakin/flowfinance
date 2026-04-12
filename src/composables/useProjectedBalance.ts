import { useFinanceStore } from '@/stores/finance'

export function useProjectedBalance() {
  const store = useFinanceStore()

  function balanceClassForDate(date: Date): string {
    const balance = store.getProjectedBalanceForDate(date)
    if (balance < 0) return 'bg-red-500 text-white rounded px-1'
    if (balance < 5000) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  return { balanceClassForDate }
}
