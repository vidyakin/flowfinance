<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { useI18n } from 'vue-i18n'
import { useCurrency } from '@/composables/useCurrency'
import { isSameDay, classNames } from '@/utils/helpers'
import { useProjectedBalance } from '@/composables/useProjectedBalance'
import PlusIcon from '@/components/icons/PlusIcon.vue'
import RepeatIcon from '@/components/icons/RepeatIcon.vue'
import RecurringRuleModal from '@/components/RecurringRuleModal.vue'
import TransactionModal from '@/components/TransactionModal.vue'
import type { Transaction } from '@/types'

const store = useFinanceStore()
const { balanceClassForDate } = useProjectedBalance()
const { t, locale } = useI18n()
const { format } = useCurrency()

const draggedTransactionId = ref<string | null>(null)
const showRecurringModal = ref(false)
const showTransactionModal = ref(false)
const transactionDate = ref<Date | undefined>(undefined)

const year = computed(() => store.currentDate.getFullYear())
const month = computed(() => store.currentDate.getMonth())
const firstDayOfMonth = computed(() => {
  const day = new Date(year.value, month.value, 1).getDay()
  return (day + 6) % 7
})
const daysInMonth = computed(() => new Date(year.value, month.value + 1, 0).getDate())

const weekdays = computed(() => {
  const fmt = new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short' })
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 1 + i)
    return fmt.format(d)
  })
})

const gridStyle = computed(() => ({
  gridTemplateRows: `auto repeat(${Math.ceil((daysInMonth.value + firstDayOfMonth.value) / 7)}, minmax(100px, 1fr))`,
}))

function getDayDate(day: number): Date {
  return new Date(year.value, month.value, day)
}

function handleDayClick(day: number, event: MouseEvent) {
  if (event.detail === 2) {
    transactionDate.value = getDayDate(day)
    showTransactionModal.value = true
  } else {
    store.selectDate(getDayDate(day))
  }
}

function handleDragStart(e: DragEvent, transactionId: string) {
  e.dataTransfer!.setData('transactionId', transactionId)
  draggedTransactionId.value = transactionId
}

function handleDrop(e: DragEvent, date: Date) {
  e.preventDefault()
  const id = e.dataTransfer!.getData('transactionId')
  store.updateTransaction(id, { date })
  draggedTransactionId.value = null
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
}

function getCategoryColor(transaction: Transaction): string {
  return store.categories.find(c => c.id === transaction.categoryId)?.color ?? 'bg-gray-400'
}

function isConfirmed(tx: Transaction): boolean {
  return tx.type === 'actual' && (!!tx.recurringRuleId || tx.id.startsWith('loan-'))
}
</script>

<template>
  <main class="flex-shrink-0 p-4">
    <!-- Control Bar -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center bg-gray-200/50 dark:bg-gray-700/50 p-1 rounded-lg text-sm font-medium">
        <button class="px-3 py-1 rounded-md text-gray-500 dark:text-gray-400">{{ t('actual') }}</button>
        <button class="px-3 py-1 rounded-md text-gray-500 dark:text-gray-400">{{ t('plan') }}</button>
        <button class="px-3 py-1 rounded-md bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm">{{ t('combined') }}</button>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="flex items-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
          @click="showRecurringModal = true"
        >
          <RepeatIcon class="w-4 h-4 mr-1" />
          {{ t('addRecurring') }}
        </button>
        <button
          class="flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
          @click="showTransactionModal = true"
        >
          <PlusIcon class="w-5 h-5 mr-1" />
          {{ t('addTransaction') }}
        </button>
      </div>
    </div>

    <!-- Calendar Grid -->
    <div
      class="grid grid-cols-7 bg-white dark:bg-gray-800 border-l border-b border-gray-200 dark:border-gray-700 rounded-lg shadow-sm"
      :style="gridStyle"
    >
      <!-- Weekday headers -->
      <div
        v-for="wd in weekdays"
        :key="wd"
        class="text-center font-semibold text-xs text-gray-500 dark:text-gray-400 py-2"
      >
        {{ wd }}
      </div>

      <!-- Blank leading days -->
      <div
        v-for="i in firstDayOfMonth"
        :key="`blank-${i}`"
        class="border-t border-r border-gray-200 dark:border-gray-700"
      />

      <!-- Month days -->
      <div
        v-for="day in daysInMonth"
        :key="day"
        class="relative border-t border-r border-gray-200 dark:border-gray-700 p-2 flex flex-col transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
        @click="handleDayClick(day, $event)"
        @drop="handleDrop($event, getDayDate(day))"
        @dragover="handleDragOver"
      >
        <div class="flex items-center">
          <span
            :class="classNames(
              'text-sm font-medium',
              isSameDay(getDayDate(day), new Date())
                ? 'bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center'
                : 'text-gray-700 dark:text-gray-200',
            )"
          >
            {{ day }}
          </span>
        </div>

        <div class="flex-1 mt-1 overflow-hidden">
          <div
            v-for="tx in store.getTransactionsForDate(getDayDate(day)).slice(0, 3)"
            :key="tx.id"
            :class="classNames(
              'text-xs text-white rounded px-1.5 py-0.5 mb-1 cursor-grab active:cursor-grabbing truncate flex items-center gap-1',
              getCategoryColor(tx),
              tx.type === 'planned' ? 'opacity-60 border border-dashed border-white/50' : '',
            )"
            :draggable="!tx.id.startsWith('recurring-')"
            @dragstart="!tx.id.startsWith('recurring-') && handleDragStart($event, tx.id)"
          >
            <span v-if="isConfirmed(tx)" class="flex-shrink-0">✓</span>
            <span class="truncate">{{ tx.description }}</span>
          </div>
          <p
            v-if="store.getTransactionsForDate(getDayDate(day)).length > 3"
            class="text-xs text-gray-500 dark:text-gray-400 mt-1"
          >
            +{{ store.getTransactionsForDate(getDayDate(day)).length - 3 }} more
          </p>
        </div>

        <div class="mt-auto pt-0.5">
          <span :class="`font-mono text-xs font-bold ${balanceClassForDate(getDayDate(day))}`">
            {{ format(store.getProjectedBalanceForDate(getDayDate(day))) }}
          </span>
        </div>
      </div>
    </div>
  </main>

  <RecurringRuleModal v-model="showRecurringModal" />
  <TransactionModal v-model="showTransactionModal" :date="transactionDate" />
</template>
