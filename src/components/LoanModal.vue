<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { useI18n } from 'vue-i18n'
import { useCurrency } from '@/composables/useCurrency'
import { calculateAnnuityPayment } from '@/utils/loans'
import EarlyPaymentModal from '@/components/EarlyPaymentModal.vue'
import type { Loan } from '@/types'

const props = defineProps<{ modelValue: boolean; viewLoan?: Loan }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const store = useFinanceStore()
const { t } = useI18n()
const { format } = useCurrency()

const isViewMode = computed(() => !!props.viewLoan)

// ── Create mode state ────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10)
const alreadyPaying = ref(false)
const name = ref('')
const principal = ref(0)
const annualRate = ref(0)
const termMonths = ref(12)
const startDate = ref(today)
const accountId = ref(store.accounts[0]?.id ?? '')
const currentBalanceAmount = ref(0)
const currentBalanceDate = ref(today)

// ── Create mode computed ─────────────────────────────────────────────
const effectivePrincipal = computed(() =>
  alreadyPaying.value ? currentBalanceAmount.value : principal.value,
)
const effectiveTerm = computed(() => {
  if (!alreadyPaying.value) return termMonths.value
  const start = new Date(startDate.value)
  const balDate = new Date(currentBalanceDate.value)
  const endDate = new Date(start)
  endDate.setMonth(endDate.getMonth() + termMonths.value)
  const remaining =
    (endDate.getFullYear() - balDate.getFullYear()) * 12 +
    (endDate.getMonth() - balDate.getMonth())
  return Math.max(1, remaining)
})

const monthlyPayment = computed(() =>
  calculateAnnuityPayment(effectivePrincipal.value, annualRate.value, effectiveTerm.value),
)
const totalPayments = computed(() => monthlyPayment.value * effectiveTerm.value)
const overpayment = computed(() => totalPayments.value - effectivePrincipal.value)
const lastPaymentDate = computed(() => {
  const baseDate = alreadyPaying.value ? currentBalanceDate.value : startDate.value
  if (!baseDate) return ''
  const d = new Date(baseDate)
  d.setMonth(d.getMonth() + effectiveTerm.value - 1)
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
})

const isValid = computed(() => {
  if (!name.value.trim() || annualRate.value < 0 || termMonths.value <= 0 || !startDate.value) return false
  if (alreadyPaying.value) return currentBalanceAmount.value > 0 && !!currentBalanceDate.value
  return principal.value > 0
})

// ── View mode state ──────────────────────────────────────────────────
const showEarlyPaymentModal = ref(false)

const loanTransactions = computed(() => {
  if (!props.viewLoan) return []
  return store.getLoanTransactions(props.viewLoan.id)
})

const paidCount = computed(() => {
  if (!props.viewLoan) return 0
  return store.getLoanPaidCount(props.viewLoan)
})

const totalCount = computed(() => {
  if (!props.viewLoan) return 0
  return store.getLoanTotalPayments(props.viewLoan)
})

// ── Watchers ─────────────────────────────────────────────────────────
// Reset create mode state when modal closes
watch(() => props.modelValue, (newVal) => {
  if (!newVal && !isViewMode.value) {
    alreadyPaying.value = false
    name.value = ''
    principal.value = 0
    annualRate.value = 0
    termMonths.value = 12
    startDate.value = today
    accountId.value = store.accounts[0]?.id ?? ''
    currentBalanceAmount.value = 0
    currentBalanceDate.value = today
  }
})

// ── Actions ──────────────────────────────────────────────────────────
function close() {
  emit('update:modelValue', false)
}

function submit() {
  if (!isValid.value) return
  if (alreadyPaying.value) {
    store.addLoan({
      name: name.value.trim(),
      principal: currentBalanceAmount.value,
      annualRate: annualRate.value,
      startDate: new Date(startDate.value),
      termMonths: termMonths.value,
      accountId: accountId.value,
      categoryId: 'cat6',
      currentBalance: {
        date: new Date(currentBalanceDate.value),
        balance: currentBalanceAmount.value,
      },
    })
  } else {
    store.addLoan({
      name: name.value.trim(),
      principal: principal.value,
      annualRate: annualRate.value,
      startDate: new Date(startDate.value),
      termMonths: termMonths.value,
      accountId: accountId.value,
      categoryId: 'cat6',
    })
  }
  close()
}

function deleteLoan() {
  if (!props.viewLoan) return
  store.removeLoan(props.viewLoan.id)
  close()
}

function markPaid() {
  if (!props.viewLoan) return
  store.markLoanPaidUpToDate(props.viewLoan.id)
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

        <!-- ── VIEW MODE ─────────────────────────────────────────── -->
        <template v-if="isViewMode && viewLoan">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">{{ viewLoan.name }}</h2>
            <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="close">✕</button>
          </div>

          <!-- Loan info -->
          <div class="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 space-y-1.5 text-sm">
            <div class="flex justify-between text-gray-700 dark:text-gray-300">
              <span>{{ t('monthlyPayment') }}:</span>
              <span class="font-mono font-semibold">{{ format(store.getLoanMonthlyPayment(viewLoan)) }}</span>
            </div>
            <div class="flex justify-between text-gray-700 dark:text-gray-300">
              <span>{{ t('annualRate') }}:</span>
              <span class="font-mono">{{ viewLoan.annualRate }}%</span>
            </div>
            <div class="flex justify-between text-gray-700 dark:text-gray-300">
              <span>{{ t('termMonths') }}:</span>
              <span class="font-mono">{{ viewLoan.termMonths }}</span>
            </div>
            <div class="flex justify-between text-gray-700 dark:text-gray-300 pt-1 border-t border-blue-100 dark:border-blue-800">
              <span>{{ paidCount }} / {{ totalCount }}</span>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex gap-2">
            <button
              class="flex-1 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
              @click="markPaid"
            >{{ t('markPaidUpToToday') }}</button>
            <button
              class="flex-1 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              @click="showEarlyPaymentModal = true"
            >{{ t('earlyPaymentBtn') }}</button>
          </div>

          <!-- Payment schedule -->
          <div>
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">{{ t('paymentSchedule') }}</h3>
            <div class="space-y-1 max-h-64 overflow-y-auto pr-1">
              <div
                v-for="tx in loanTransactions"
                :key="tx.id"
                class="flex justify-between items-center text-xs px-2 py-1.5 rounded-lg"
                :class="tx.type === 'actual'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300'"
              >
                <span>{{ tx.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) }}</span>
                <span class="font-mono">
                  <template v-if="tx.id.includes('-early-')">⚡ </template>
                  {{ format(Math.abs(tx.amount)) }}
                  <span v-if="tx.type === 'actual'" class="ml-1 opacity-60">✓</span>
                </span>
              </div>
              <p v-if="loanTransactions.length === 0" class="text-xs text-gray-400 text-center py-4">—</p>
            </div>
          </div>

          <!-- Delete -->
          <button
            class="w-full py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            @click="deleteLoan"
          >{{ t('deleteLoan') }}</button>
        </template>

        <!-- ── CREATE MODE ───────────────────────────────────────── -->
        <template v-else>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">{{ t('newLoan') }}</h2>
            <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="close">✕</button>
          </div>

          <!-- Mode toggle -->
          <div class="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <button
              :class="['flex-1 py-1.5 rounded-md text-sm font-medium transition-colors', !alreadyPaying ? 'bg-white dark:bg-gray-600 shadow text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400']"
              @click="alreadyPaying = false"
            >{{ t('newLoanMode') }}</button>
            <button
              :class="['flex-1 py-1.5 rounded-md text-sm font-medium transition-colors', alreadyPaying ? 'bg-white dark:bg-gray-600 shadow text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400']"
              @click="alreadyPaying = true"
            >{{ t('alreadyPaying') }}</button>
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

          <!-- Principal (new loan only) -->
          <div v-if="!alreadyPaying">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('principal') }}</label>
            <input
              v-model.number="principal"
              type="number"
              min="0"
              class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Current balance (already paying) -->
          <template v-if="alreadyPaying">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('currentBalanceAmount') }}</label>
              <input
                v-model.number="currentBalanceAmount"
                type="number"
                min="0"
                class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('balanceDate') }}</label>
              <input
                v-model="currentBalanceDate"
                type="date"
                class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </template>

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

          <!-- Start/First Payment Date -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ alreadyPaying ? t('startDate') : t('firstPayment') }}
            </label>
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
            v-if="effectivePrincipal > 0 && termMonths > 0"
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
        </template>
      </div>
    </div>
  </Teleport>

  <!-- Early Payment Modal (view mode only) -->
  <EarlyPaymentModal
    v-if="viewLoan"
    v-model="showEarlyPaymentModal"
    :loan="viewLoan"
  />
</template>
