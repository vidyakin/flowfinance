<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { useI18n } from 'vue-i18n'
import { useCurrency } from '@/composables/useCurrency'
import { calculateAnnuityPayment, calculateRemainingTerm, getLoanStateAtDate } from '@/utils/loans'
import type { Loan } from '@/types'

const props = defineProps<{ modelValue: boolean; loan: Loan }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const store = useFinanceStore()
const { t } = useI18n()
const { format } = useCurrency()

const today = new Date().toISOString().slice(0, 10)
const amount = ref(0)
const date = ref(today)
const mode = ref<'reduce_term' | 'reduce_payment'>('reduce_term')

// Loan state at the selected date (before early payment)
const stateAtDate = computed(() => getLoanStateAtDate(props.loan, new Date(date.value)))

const balanceBeforePayment = computed(() => stateAtDate.value.balance)
const currentMonthlyPayment = computed(() => stateAtDate.value.monthlyPayment)
const remainingTermAtDate = computed(() => stateAtDate.value.remainingTerm)

const balanceAfterPayment = computed(() =>
  Math.max(0, balanceBeforePayment.value - amount.value),
)

// reduce_term: same payment, fewer months
const newTerm = computed(() =>
  calculateRemainingTerm(
    balanceAfterPayment.value,
    props.loan.annualRate,
    currentMonthlyPayment.value,
  ),
)

// reduce_payment: same term, lower payment
const newPayment = computed(() =>
  calculateAnnuityPayment(
    balanceAfterPayment.value,
    props.loan.annualRate,
    remainingTermAtDate.value,
  ),
)

const isValid = computed(
  () => amount.value > 0 && amount.value < balanceBeforePayment.value && date.value !== '',
)

function close() {
  emit('update:modelValue', false)
}

function submit() {
  if (!isValid.value) return
  store.addEarlyPayment(props.loan.id, {
    date: new Date(date.value),
    amount: amount.value,
    mode: mode.value,
  })
  close()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      @click.self="close"
    >
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">{{ t('earlyPaymentTitle') }}</h2>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="close">✕</button>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ loan.name }}</p>

        <!-- Amount -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('amount') }}</label>
          <input
            v-model.number="amount"
            type="number"
            min="1"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Date -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('date') }}</label>
          <input
            v-model="date"
            type="date"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Mode -->
        <div>
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('recalculateWhat') }}</p>
          <div class="space-y-2">
            <label class="flex items-start gap-2 cursor-pointer">
              <input
                v-model="mode"
                type="radio"
                value="reduce_term"
                class="mt-0.5 accent-blue-500"
              />
              <div>
                <p class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ t('reduceTerm') }}</p>
                <p class="text-xs text-gray-400">
                  {{ t('reduceTermHint', { payment: format(currentMonthlyPayment) }) }}
                </p>
              </div>
            </label>
            <label class="flex items-start gap-2 cursor-pointer">
              <input
                v-model="mode"
                type="radio"
                value="reduce_payment"
                class="mt-0.5 accent-blue-500"
              />
              <div>
                <p class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ t('reducePayment') }}</p>
                <p class="text-xs text-gray-400">
                  {{ t('reducePaymentHint', { term: remainingTermAtDate }) }}
                </p>
              </div>
            </label>
          </div>
        </div>

        <!-- Preview -->
        <div
          v-if="amount > 0 && balanceBeforePayment > 0"
          class="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 space-y-1.5 text-sm"
        >
          <p class="font-semibold text-blue-700 dark:text-blue-300 mb-2">── {{ t('afterPayment') }} ──</p>
          <div class="flex justify-between text-gray-700 dark:text-gray-300">
            <span>{{ t('remainingBalance') }}:</span>
            <span class="font-mono font-semibold">{{ format(balanceAfterPayment) }}</span>
          </div>
          <div class="flex justify-between text-gray-700 dark:text-gray-300">
            <span>{{ t('monthlyPayment') }}:</span>
            <span class="font-mono">
              <template v-if="mode === 'reduce_term'">
                {{ format(currentMonthlyPayment) }}
              </template>
              <template v-else>
                <span class="line-through text-gray-400 mr-1">{{ format(currentMonthlyPayment) }}</span>
                <span class="text-green-500">{{ format(newPayment) }}</span>
              </template>
            </span>
          </div>
          <div class="flex justify-between text-gray-700 dark:text-gray-300">
            <span>{{ t('newTermMonths') }}:</span>
            <span class="font-mono">
              <template v-if="mode === 'reduce_payment'">
                {{ t('monthsUnit', { n: remainingTermAtDate }) }}
              </template>
              <template v-else>
                <span class="line-through text-gray-400 mr-1">{{ t('monthsUnit', { n: remainingTermAtDate }) }}</span>
                <span class="text-green-500">{{ t('monthsUnit', { n: newTerm }) }}</span>
              </template>
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-2">
          <button
            class="flex-1 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            @click="close"
          >{{ t('cancel') }}</button>
          <button
            :disabled="!isValid"
            class="flex-1 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            @click="submit"
          >{{ t('addEarlyPayment') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
