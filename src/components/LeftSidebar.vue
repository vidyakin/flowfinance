<script setup lang="ts">
import { computed } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import AppCard from '@/components/ui/AppCard.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import TrendingUpIcon from '@/components/icons/TrendingUpIcon.vue'
import PlusIcon from '@/components/icons/PlusIcon.vue'

const store = useFinanceStore()
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const plannedCommitments = computed(() =>
  store.transactions
    .filter(t => t.type === 'planned' && t.date > new Date())
    .reduce((sum, t) => sum + t.amount, 0),
)

const availableFunds = computed(() => store.totalBalance + plannedCommitments.value)

function getBudgetSpent(categoryId: string): number {
  return Math.abs(
    store.monthTransactions
      .filter(t => t.categoryId === categoryId && t.type === 'actual')
      .reduce((sum, t) => sum + t.amount, 0),
  )
}
</script>

<template>
  <aside class="w-[300px] fixed top-16 left-0 h-[calc(100vh-4rem)] p-4 space-y-4 overflow-y-auto">
    <AppCard>
      <h2 class="font-bold text-lg mb-2 text-gray-800 dark:text-gray-100">Summary</h2>
      <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
        <div class="flex justify-between">
          <span>Total Balance:</span>
          <span class="font-mono font-semibold text-gray-800 dark:text-gray-100">
            {{ currency.format(store.totalBalance) }}
          </span>
        </div>
        <div class="flex justify-between">
          <span>Monthly Income:</span>
          <span class="font-mono text-green-500">+{{ currency.format(store.monthlyIncome) }}</span>
        </div>
        <div class="flex justify-between">
          <span>Monthly Expenses:</span>
          <span class="font-mono text-red-500">{{ currency.format(store.monthlyExpenses) }}</span>
        </div>
        <div class="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <span class="font-semibold">Available Funds:</span>
          <span class="font-mono font-bold text-blue-500">{{ currency.format(availableFunds) }}</span>
        </div>
      </div>
      <div class="flex items-center text-xs text-green-600 mt-2">
        <TrendingUpIcon class="w-4 h-4 mr-1" />
        <span>+5.2% vs last month</span>
      </div>
    </AppCard>

    <AppCard>
      <div class="flex justify-between items-center mb-2">
        <h2 class="font-bold text-lg text-gray-800 dark:text-gray-100">Accounts</h2>
        <button class="text-blue-500 hover:text-blue-600">
          <PlusIcon class="w-5 h-5" />
        </button>
      </div>
      <ul class="space-y-2 text-sm">
        <li
          v-for="acc in store.accounts"
          :key="acc.id"
          class="flex justify-between text-gray-600 dark:text-gray-300"
        >
          <span>{{ acc.name }}</span>
          <span class="font-mono">{{ currency.format(acc.balance) }}</span>
        </li>
      </ul>
    </AppCard>

    <AppCard>
      <h2 class="font-bold text-lg mb-2 text-gray-800 dark:text-gray-100">Budget Progress</h2>
      <div class="space-y-4">
        <div
          v-for="budget in store.budgets"
          :key="budget.categoryId"
          class="text-sm"
        >
          <template v-if="store.categories.find(c => c.id === budget.categoryId)">
            <div class="flex justify-between mb-1">
              <span class="text-gray-600 dark:text-gray-300">
                {{ store.categories.find(c => c.id === budget.categoryId)!.name }}
              </span>
              <span
                :class="getBudgetSpent(budget.categoryId) > budget.amount
                  ? 'font-mono text-xs text-red-500'
                  : 'font-mono text-xs text-gray-500 dark:text-gray-400'"
              >
                {{ getBudgetSpent(budget.categoryId) > budget.amount ? '⚠️ ' : '' }}{{ currency.format(getBudgetSpent(budget.categoryId)) }} / {{ currency.format(budget.amount) }}
              </span>
            </div>
            <ProgressBar :value="getBudgetSpent(budget.categoryId)" :max="budget.amount" />
          </template>
        </div>
      </div>
    </AppCard>
  </aside>
</template>
