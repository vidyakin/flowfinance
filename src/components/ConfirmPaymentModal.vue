<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { useI18n } from 'vue-i18n'
import { useCurrency } from '@/composables/useCurrency'
import type { Transaction } from '@/types'

const props = defineProps<{
  modelValue: boolean
  transaction: Transaction | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const store = useFinanceStore()
const { locale } = useI18n()
const { format } = useCurrency()

const actualAmount = ref<number>(0)
const error = ref<string | null>(null)

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// Синхронизировать actualAmount при открытии модала
watch(() => props.modelValue, (val) => {
  if (val && props.transaction) {
    actualAmount.value = Math.abs(props.transaction.amount)
    error.value = null
  }
})

const isLoan = computed(() => props.transaction?.id.startsWith('loan-') ?? false)

const plannedAmount = computed(() =>
  props.transaction ? Math.abs(props.transaction.amount) : 0,
)

const amountChanged = computed(() =>
  actualAmount.value !== plannedAmount.value,
)

const isAmountValid = computed(() =>
  !isNaN(actualAmount.value) && actualAmount.value > 0,
)

const category = computed(() =>
  store.categories.find(c => c.id === props.transaction?.categoryId),
)

const account = computed(() =>
  store.accounts.find(a => a.id === props.transaction?.accountId),
)

function dateLabel(date: Date): string {
  return date.toLocaleDateString(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const loading = ref(false)

async function confirm() {
  if (!props.transaction) return
  loading.value = true
  error.value = null
  try {
    const sign = props.transaction.amount < 0 ? -1 : 1
    await store.confirmPayment(props.transaction, sign * actualAmount.value)
    isOpen.value = false
  } catch (e) {
    error.value = 'Ошибка при подтверждении платежа'
  } finally {
    loading.value = false
  }
}

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) isOpen.value = false
}

onMounted(() => window.addEventListener('keydown', handleEscape))
onUnmounted(() => window.removeEventListener('keydown', handleEscape))
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen && transaction"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="isOpen = false"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="isOpen = false" />
        <div class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
          <!-- Header -->
          <div class="flex items-start justify-between">
            <h2 class="font-bold text-lg text-gray-900 dark:text-white pr-4">
              {{ transaction.description }}
            </h2>
            <button
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0"
              @click="isOpen = false"
            >
              ✕
            </button>
          </div>

          <!-- Details -->
          <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <div class="flex justify-between">
              <span class="text-gray-400">Дата</span>
              <span>{{ dateLabel(transaction.date) }}</span>
            </div>
            <div v-if="category" class="flex justify-between">
              <span class="text-gray-400">Категория</span>
              <span>{{ category.name }}</span>
            </div>
            <div v-if="account" class="flex justify-between">
              <span class="text-gray-400">Счёт</span>
              <span>{{ account.name }}</span>
            </div>
          </div>

          <!-- Amount -->
          <div class="space-y-1">
            <label for="confirm-amount" class="text-sm text-gray-400">Сумма</label>
            <div v-if="isLoan" class="text-lg font-mono font-bold text-gray-900 dark:text-white">
              {{ format(Math.abs(transaction.amount)) }}
            </div>
            <div v-else>
              <input
                id="confirm-amount"
                v-model.number="actualAmount"
                type="number"
                min="0"
                step="0.01"
                class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p v-if="amountChanged" class="text-xs text-gray-400 mt-1">
                план: {{ format(plannedAmount) }}
              </p>
            </div>
          </div>

          <!-- Error -->
          <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

          <!-- Actions -->
          <div class="flex gap-3 pt-2">
            <button
              class="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
              @click="isOpen = false"
            >
              Отмена
            </button>
            <button
              :disabled="loading || (!isLoan && !isAmountValid)"
              class="flex-1 py-2 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-1"
              @click="confirm"
            >
              <span>✓</span>
              <span>Оплачено</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
