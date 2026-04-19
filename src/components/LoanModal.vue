<script setup lang="ts">
import { ref, computed, watch, watchEffect, onMounted, onUnmounted } from 'vue'
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
watchEffect(() => {
  if (!accountId.value && store.accounts.length > 0) {
    accountId.value = store.accounts[0].id
  }
})
const loanCategoryId = computed(() => {
  const cats = store.categories
  return (
    cats.find(c => /кредит|loan/i.test(c.name))?.id ??
    cats.find(c => c.type === 'expense')?.id ??
    ''
  )
})
const currentBalanceAmount = ref(0)
const currentBalanceDate = ref(today)
const insurancePerMonth = ref(0)
const paymentDay = ref(new Date().getDate())

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
const totalMonthlyWithInsurance = computed(() => monthlyPayment.value + (insurancePerMonth.value || 0))
const totalPayments = computed(() => totalMonthlyWithInsurance.value * effectiveTerm.value)
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

// ── Escape key ───────────────────────────────────────────────────────
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

// ── Delete confirmation ───────────────────────────────────────────────
const showDeleteConfirm = ref(false)

async function handleDelete() {
  if (!props.viewLoan) return
  showDeleteConfirm.value = false
  await store.removeLoan(props.viewLoan.id)
  close()
}

// ── View mode state ──────────────────────────────────────────────────
const showEarlyPaymentModal = ref(false)
const markingPaymentId = ref<string | null>(null)

const loanPayments = computed(() => {
  if (!props.viewLoan) return []
  return store.loanPayments[props.viewLoan.id] ?? []
})

const paidCount = computed(() => {
  if (!props.viewLoan) return 0
  return store.getLoanPaidCount(props.viewLoan)
})

const totalCount = computed(() => {
  if (!props.viewLoan) return 0
  return store.getLoanTotalPayments(props.viewLoan)
})

const remainingBalance = computed(() => {
  if (!props.viewLoan) return null
  return store.getLoanRemainingBalance(props.viewLoan.id)
})

// ── Watchers ─────────────────────────────────────────────────────────
watch(() => props.modelValue, async (newVal) => {
  if (newVal && props.viewLoan) {
    await store.loadLoanPayments(props.viewLoan.id)
  }
})

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
    insurancePerMonth.value = 0
    paymentDay.value = new Date().getDate()
  }
})

// ── Actions ──────────────────────────────────────────────────────────
function close() {
  emit('update:modelValue', false)
}

function toLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function submit() {
  if (!isValid.value) return
  if (alreadyPaying.value) {
    store.addLoan({
      name: name.value.trim(),
      principal: currentBalanceAmount.value,
      annualRate: annualRate.value,
      startDate: toLocalDate(startDate.value),
      termMonths: termMonths.value,
      accountId: accountId.value,
      categoryId: loanCategoryId.value,
      currentBalance: {
        date: toLocalDate(currentBalanceDate.value),
        balance: currentBalanceAmount.value,
      },
      paymentDay: paymentDay.value,
      ...(insurancePerMonth.value > 0 && { insurancePerMonth: insurancePerMonth.value }),
    })
  } else {
    store.addLoan({
      name: name.value.trim(),
      principal: principal.value,
      annualRate: annualRate.value,
      startDate: toLocalDate(startDate.value),
      termMonths: termMonths.value,
      accountId: accountId.value,
      categoryId: loanCategoryId.value,
      paymentDay: paymentDay.value,
      ...(insurancePerMonth.value > 0 && { insurancePerMonth: insurancePerMonth.value }),
    })
  }
  close()
}


async function markPaid() {
  if (!props.viewLoan) return
  try {
    await store.markLoanPaidUpToDate(props.viewLoan.id)
    await store.loadLoanPayments(props.viewLoan.id)
  } catch (e) {
    console.error('markLoanPaidUpToDate failed:', e)
  }
}

async function markSinglePaid(paymentId: string) {
  if (!props.viewLoan || markingPaymentId.value) return
  markingPaymentId.value = paymentId
  try {
    await store.markPaymentPaid(props.viewLoan.id, paymentId)
  } finally {
    markingPaymentId.value = null
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      @click.self="close"
    >
      <div class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-[540px] p-6 space-y-4 max-h-[90vh] overflow-y-auto">

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
            <div v-if="viewLoan.insurancePerMonth" class="flex justify-between text-gray-700 dark:text-gray-300">
              <span>{{ t('insurancePerMonth') }}:</span>
              <span class="font-mono text-orange-500">{{ format(viewLoan.insurancePerMonth) }}</span>
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

          <!-- Remaining balance -->
          <div v-if="remainingBalance !== null" class="flex justify-between text-sm text-gray-700 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg px-3 py-2">
            <span>{{ t('remainingDebt') }}:</span>
            <span class="font-mono font-semibold text-yellow-700 dark:text-yellow-300">{{ format(remainingBalance) }}</span>
          </div>

          <!-- Payment schedule table -->
          <div>
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">{{ t('paymentSchedule') }}</h3>
            <div class="max-h-72 overflow-y-auto">
              <table class="w-full text-xs">
                <thead class="sticky top-0 bg-white dark:bg-gray-800">
                  <tr class="text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700">
                    <th class="text-left py-1 font-medium">{{ t('date') }}</th>
                    <th class="text-right py-1 font-medium">{{ t('planned') }}</th>
                    <th class="text-right py-1 font-medium">{{ t('actual') }}</th>
                    <th class="text-right py-1 font-medium">{{ t('balance') }}</th>
                    <th class="w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="p in loanPayments"
                    :key="p.id"
                    :class="[
                      'border-b border-gray-50 dark:border-gray-700/50',
                      p.actualAmount !== null
                        ? 'text-green-700 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-300',
                      p.plannedAmount === null ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    ]"
                  >
                    <td class="py-1 pr-2 whitespace-nowrap">
                      <span v-if="p.plannedAmount === null" class="mr-1 text-blue-400">⚡</span>
                      {{ p.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' }) }}
                    </td>
                    <td class="text-right py-1 pr-2 font-mono">
                      <template v-if="p.plannedAmount !== null">
                        {{ format((p.plannedAmount) + (viewLoan.insurancePerMonth ?? 0)) }}
                        <div v-if="viewLoan.insurancePerMonth" class="text-gray-400 dark:text-gray-500 text-[10px]">
                          {{ format(p.plannedAmount) }}+{{ format(viewLoan.insurancePerMonth) }}
                        </div>
                      </template>
                      <template v-else>—</template>
                    </td>
                    <td class="text-right py-1 pr-2 font-mono">
                      <template v-if="p.actualAmount !== null">
                        {{ format(p.actualAmount + (p.plannedAmount !== null ? (viewLoan.insurancePerMonth ?? 0) : 0)) }} ✓
                      </template>
                      <template v-else>—</template>
                    </td>
                    <td class="text-right py-1 font-mono">
                      <template v-if="p.remainingBalance !== null">
                        {{ format(p.remainingBalance) }}
                      </template>
                      <template v-else>—</template>
                    </td>
                    <td class="pl-1">
                      <button
                        v-if="p.actualAmount === null && p.plannedAmount !== null"
                        class="text-gray-300 hover:text-green-500 dark:text-gray-600 dark:hover:text-green-400 transition-colors"
                        :disabled="markingPaymentId === p.id"
                        title="Отметить оплаченным"
                        @click="markSinglePaid(p.id)"
                      >✓</button>
                    </td>
                  </tr>
                  <tr v-if="loanPayments.length === 0">
                    <td colspan="5" class="text-center py-4 text-gray-400">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Delete -->
          <button
            class="w-full py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            @click="showDeleteConfirm = true"
          >{{ t('deleteLoan') }}</button>

          <!-- Delete confirmation overlay -->
          <div v-if="showDeleteConfirm" class="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-xl">
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4 shadow-xl">
              <p class="text-sm text-gray-700 dark:text-gray-300 mb-4">Удалить кредит и все связанные транзакции?</p>
              <div class="flex gap-3 justify-end">
                <button @click="showDeleteConfirm = false" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Отмена</button>
                <button @click="handleDelete" class="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">Удалить</button>
              </div>
            </div>
          </div>
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

          <!-- Annual Rate / Term / Start Date / Payment Day — one row -->
          <div class="grid grid-cols-4 gap-2">
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('annualRate') }}</label>
              <input
                v-model.number="annualRate"
                type="number"
                min="0"
                step="0.1"
                class="w-full px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('termMonths') }}</label>
              <input
                v-model.number="termMonths"
                type="number"
                min="1"
                class="w-full px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ alreadyPaying ? t('startDate') : t('firstPayment') }}
              </label>
              <input
                v-model="startDate"
                type="date"
                class="w-full px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('paymentDay') }}</label>
              <input
                v-model.number="paymentDay"
                type="number"
                min="1"
                max="31"
                class="w-full px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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

          <!-- Insurance -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('insurancePerMonth') }}</label>
            <input
              v-model.number="insurancePerMonth"
              type="number"
              min="0"
              class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Preview -->
          <div
            v-if="effectivePrincipal > 0 && termMonths > 0"
            class="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 space-y-1.5 text-sm"
          >
            <p class="font-semibold text-blue-700 dark:text-blue-300 mb-2">── {{ t('preview') }} ──</p>
            <div class="flex justify-between text-gray-700 dark:text-gray-300">
              <span>{{ t('monthlyPayment') }}:</span>
              <span class="font-mono font-semibold">{{ format(totalMonthlyWithInsurance) }}</span>
            </div>
            <div v-if="insurancePerMonth > 0" class="flex justify-between text-gray-500 dark:text-gray-400 text-xs">
              <span>{{ t('insurancePerMonth') }}:</span>
              <span class="font-mono">{{ format(monthlyPayment) }} + {{ format(insurancePerMonth) }}</span>
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
