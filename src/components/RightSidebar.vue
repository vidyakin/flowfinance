<script setup lang="ts">
import { ref } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { getMonthName, classNames } from '@/utils/helpers'
import AppCard from '@/components/ui/AppCard.vue'

const store = useFinanceStore()
const activeTab = ref<'transactions' | 'budget'>('transactions')
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
</script>

<template>
  <aside class="w-[350px] fixed top-16 right-0 h-[calc(100vh-4rem)] p-4 space-y-4 overflow-y-auto">
    <!-- No date selected -->
    <template v-if="!store.selectedDate">
      <AppCard class="text-center text-gray-500 dark:text-gray-400">
        Select a day to see details.
      </AppCard>
    </template>

    <!-- Date selected -->
    <template v-else>
      <AppCard>
        <h2 class="font-bold text-xl mb-4 text-gray-800 dark:text-gray-100">
          {{ getMonthName(store.selectedDate.getMonth()) }}
          {{ store.selectedDate.getDate() }},
          {{ store.selectedDate.getFullYear() }}
        </h2>

        <!-- Tabs -->
        <div class="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            :class="classNames(
              'py-2 px-4 text-sm font-medium',
              activeTab === 'transactions'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
            )"
            @click="activeTab = 'transactions'"
          >
            Transactions
          </button>
          <button
            :class="classNames(
              'py-2 px-4 text-sm font-medium',
              activeTab === 'budget'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
            )"
            @click="activeTab = 'budget'"
          >
            Budget Impact
          </button>
        </div>

        <!-- Transactions tab -->
        <div v-if="activeTab === 'transactions'">
          <p v-if="store.transactionsForSelectedDay.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
            No transactions for this day.
          </p>
          <ul v-else class="space-y-3">
            <li
              v-for="t in store.transactionsForSelectedDay"
              :key="t.id"
              class="flex items-center"
            >
              <div
                :class="`w-2 h-2 rounded-full mr-3 ${store.categories.find(c => c.id === t.categoryId)?.color}`"
              />
              <div class="flex-1">
                <p class="font-medium text-gray-800 dark:text-gray-100">{{ t.description }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ store.categories.find(c => c.id === t.categoryId)?.name }}
                  {{ t.type === 'planned' ? '(Planned)' : '' }}
                </p>
              </div>
              <span :class="`font-mono font-semibold ${t.amount > 0 ? 'text-green-500' : 'text-gray-700 dark:text-gray-200'}`">
                {{ t.amount > 0 ? '+' : '' }}{{ currency.format(t.amount) }}
              </span>
            </li>
          </ul>
        </div>

        <!-- Budget tab -->
        <div v-if="activeTab === 'budget'" class="text-sm text-gray-500 dark:text-gray-400">
          <p>Budget impact analysis for this day will be shown here.</p>
        </div>
      </AppCard>
    </template>
  </aside>
</template>
