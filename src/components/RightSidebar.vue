<script setup lang="ts">
import { ref } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { useI18n } from 'vue-i18n'
import { useCurrency } from '@/composables/useCurrency'
import { classNames } from '@/utils/helpers'
import AppCard from '@/components/ui/AppCard.vue'
import BalanceInputModal from '@/components/BalanceInputModal.vue'

const store = useFinanceStore()
const { t, locale } = useI18n()
const { format } = useCurrency()
const activeTab = ref<'transactions' | 'budget'>('transactions')
const showBalanceModal = ref(false)

function dateLabel(date: Date): string {
  return date.toLocaleDateString(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>

<template>
  <aside class="w-[350px] fixed top-16 right-0 h-[calc(100vh-4rem)] p-4 space-y-4 overflow-y-auto">
    <!-- No date selected -->
    <template v-if="!store.selectedDate">
      <AppCard class="text-center text-gray-500 dark:text-gray-400">
        {{ t('selectDayPrompt') }}
      </AppCard>
    </template>

    <!-- Date selected -->
    <template v-else>
      <AppCard>
        <h2 class="font-bold text-xl mb-4 text-gray-800 dark:text-gray-100">
          {{ dateLabel(store.selectedDate) }}
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
            {{ t('transactions') }}
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
            {{ t('budgetImpact') }}
          </button>
        </div>

        <!-- Transactions tab -->
        <div v-if="activeTab === 'transactions'">
          <p v-if="store.transactionsForSelectedDay.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('noTransactions') }}
          </p>
          <ul v-else class="space-y-3">
            <li
              v-for="tx in store.transactionsForSelectedDay"
              :key="tx.id"
              class="flex items-center"
            >
              <div
                :class="`w-2 h-2 rounded-full mr-3 ${store.categories.find(c => c.id === tx.categoryId)?.color}`"
              />
              <div class="flex-1">
                <p class="font-medium text-gray-800 dark:text-gray-100">{{ tx.description }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ store.categories.find(c => c.id === tx.categoryId)?.name }}
                  {{ tx.type === 'planned' ? `(${t('plannedLabel')})` : '' }}
                </p>
              </div>
              <span :class="`font-mono font-semibold ${tx.amount > 0 ? 'text-green-500' : 'text-gray-700 dark:text-gray-200'}`">
                {{ tx.amount > 0 ? '+' : '' }}{{ format(tx.amount) }}
              </span>
            </li>
          </ul>

          <!-- Set Actual Balance button -->
          <button
            class="mt-4 w-full py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            @click="showBalanceModal = true"
          >
            {{ t('setActualBalance') }}
          </button>
        </div>

        <!-- Budget tab -->
        <div v-if="activeTab === 'budget'" class="text-sm text-gray-500 dark:text-gray-400">
          <p>{{ t('budgetImpactPlaceholder') }}</p>
        </div>
      </AppCard>
    </template>
  </aside>

  <BalanceInputModal
    v-if="store.selectedDate"
    v-model="showBalanceModal"
    :date="store.selectedDate"
  />
</template>
