<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { useI18n } from 'vue-i18n'
import { useCurrency } from '@/composables/useCurrency'
import { classNames } from '@/utils/helpers'
import AppCard from '@/components/ui/AppCard.vue'
import BalanceInputModal from '@/components/BalanceInputModal.vue'
import TransactionModal from '@/components/TransactionModal.vue'
import ConfirmPaymentModal from '@/components/ConfirmPaymentModal.vue'
import type { Transaction } from '@/types'

const store = useFinanceStore()
const { t, locale } = useI18n()
const { format } = useCurrency()
const activeTab = ref<'transactions' | 'budget'>('transactions')
const showBalanceModal = ref(false)
const showTransactionModal = ref(false)
const editingTransaction = ref<Transaction | undefined>(undefined)
const searchQuery = ref('')
const showConfirmModal = ref(false)
const confirmingTransaction = ref<Transaction | null>(null)

const filteredTransactions = computed(() => {
  const txns = store.transactionsForSelectedDay
  if (!searchQuery.value.trim()) return txns
  const q = searchQuery.value.toLowerCase()
  return txns.filter(t =>
    t.description?.toLowerCase().includes(q) ||
    String(Math.abs(t.amount)).includes(q),
  )
})

function dateLabel(date: Date): string {
  return date.toLocaleDateString(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function editTransaction(tx: Transaction) {
  if (tx.id.startsWith('recurring-') || tx.id.startsWith('loan-')) {
    confirmingTransaction.value = tx
    showConfirmModal.value = true
  } else {
    editingTransaction.value = tx
    showTransactionModal.value = true
  }
}
</script>

<template>
  <aside class="w-full lg:w-[350px] lg:fixed lg:top-16 lg:right-0 lg:h-[calc(100vh-4rem)] p-4 space-y-4 overflow-y-auto">
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
          <input
            v-if="store.transactionsForSelectedDay.length > 0"
            v-model="searchQuery"
            type="text"
            placeholder="Поиск..."
            class="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 mb-2"
          />
          <p v-if="filteredTransactions.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
            {{ store.transactionsForSelectedDay.length === 0 ? t('noTransactions') : 'Ничего не найдено' }}
          </p>
          <ul v-else class="space-y-3">
            <li
              v-for="tx in filteredTransactions"
              :key="tx.id"
              class="flex items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg px-2 py-1 -mx-2"
              @click="editTransaction(tx)"
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
  <TransactionModal v-model="showTransactionModal" :transaction="editingTransaction" />
  <ConfirmPaymentModal
    v-model="showConfirmModal"
    :transaction="confirmingTransaction"
  />
</template>
