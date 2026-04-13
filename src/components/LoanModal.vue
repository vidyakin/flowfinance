<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { useI18n } from 'vue-i18n'
import { useCurrency } from '@/composables/useCurrency'
import { calculateAnnuityPayment } from '@/utils/loans'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const store = useFinanceStore()
const { t } = useI18n()
const { format } = useCurrency()

const today = new Date().toISOString().slice(0, 10)

const name = ref('')
const principal = ref(0)
const annualRate = ref(0)
const termMonths = ref(12)
const startDate = ref(today)
const accountId = ref(store.accounts[0]?.id ?? '')

const monthlyPayment = computed(() =>
  calculateAnnuityPayment(principal.value, annualRate.value, termMonths.value),
)
const totalPayments = computed(() => monthlyPayment.value * termMonths.value)
const overpayment = computed(() => totalPayments.value - principal.value)
const lastPaymentDate = computed(() => {
  if (!startDate.value) return ''
  const d = new Date(startDate.value)
  d.setMonth(d.getMonth() + termMonths.value - 1)
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
})

const isValid = computed(
  () =>
    name.value.trim() !== '' &&
    principal.value > 0 &&
    annualRate.value >= 0 &&
    termMonths.value > 0 &&
    startDate.value !== '',
)

function close() {
  emit('update:modelValue', false)
}

function submit() {
  if (!isValid.value) return
  store.addLoan({
    name: name.value.trim(),
    principal: principal.value,
    annualRate: annualRate.value,
    startDate: new Date(startDate.value),
    termMonths: termMonths.value,
    accountId: accountId.value,
    categoryId: 'cat6',
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
          <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">{{ t('newLoan') }}</h2>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="close">✕</button>
        </div>

        <!-- Name -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('name') }}</label>
          <input
            v-model="name"
            type="text"
            placeholder="Mortgage, Car loan…"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Principal -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('principal') }}</label>
          <input
            v-model.number="principal"
            type="number"
            min="0"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Annual Rate -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('annualRate') }}</label>
          <input
            v-model.number="annualRate"
            type="number"
            min="0"
            step="0.1"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Term -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('termMonths') }}</label>
          <input
            v-model.number="termMonths"
            type="number"
            min="1"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- First Payment Date -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('firstPayment') }}</label>
          <input
            v-model="startDate"
            type="date"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Account -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('account') }}</label>
          <select
            v-model="accountId"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option v-for="acc in store.accounts" :key="acc.id" :value="acc.id">{{ acc.name }}</option>
          </select>
        </div>

        <!-- Preview -->
        <div
          v-if="principal > 0 && termMonths > 0"
          class="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 space-y-1.5 text-sm"
        >
          <p class="font-semibold text-blue-700 dark:text-blue-300 mb-2">── {{ t('preview') }} ──</p>
          <div class="flex justify-between text-gray-700 dark:text-gray-300">
            <span>{{ t('monthlyPayment') }}:</span>
            <span class="font-mono font-semibold">{{ format(monthlyPayment) }}</span>
          </div>
          <div class="flex justify-between text-gray-700 dark:text-gray-300">
            <span>{{ t('totalPayments') }}:</span>
            <span class="font-mono">{{ format(totalPayments) }}</span>
          </div>
          <div class="flex justify-between text-gray-700 dark:text-gray-300">
            <span>{{ t('overpayment') }}:</span>
            <span class="font-mono text-red-500">{{ format(overpayment) }}</span>
          </div>
          <div class="flex justify-between text-gray-700 dark:text-gray-300">
            <span>{{ t('lastPayment') }}:</span>
            <span class="font-mono">{{ lastPaymentDate }}</span>
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
          >{{ t('createLoan') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
