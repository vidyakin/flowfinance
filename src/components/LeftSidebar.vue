<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { useCurrency } from '@/composables/useCurrency'
import { useI18n } from 'vue-i18n'
import AppCard from '@/components/ui/AppCard.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import TrendingUpIcon from '@/components/icons/TrendingUpIcon.vue'
import PlusIcon from '@/components/icons/PlusIcon.vue'
import RepeatIcon from '@/components/icons/RepeatIcon.vue'
import RecurringRuleModal from '@/components/RecurringRuleModal.vue'
import LoanModal from '@/components/LoanModal.vue'
import EarlyPaymentModal from '@/components/EarlyPaymentModal.vue'
import AccountModal from '@/components/AccountModal.vue'
import type { RecurringRule, Loan, Account } from '@/types'

const store = useFinanceStore()
const { format } = useCurrency()
const { t } = useI18n()

const showRecurringModal = ref(false)
const showLoanModal = ref(false)
const editingRule = ref<RecurringRule | undefined>(undefined)

const showAccountModal = ref(false)
const editingAccount = ref<Account | undefined>(undefined)

function openNewAccount() {
  editingAccount.value = undefined
  showAccountModal.value = true
}

function openEditAccount(acc: Account) {
  editingAccount.value = acc
  showAccountModal.value = true
}

const plannedCommitments = computed(() =>
  store.allTransactions
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

function openEditRule(rule: RecurringRule) {
  editingRule.value = rule
  showRecurringModal.value = true
}

function openNewRecurring() {
  editingRule.value = undefined
  showRecurringModal.value = true
}

const viewingLoanId = ref<string | undefined>(undefined)
const viewingLoan = computed(() => store.loans.find(l => l.id === viewingLoanId.value))
const showViewLoanModal = ref(false)
const showEarlyPaymentForLoan = ref(false)
const earlyPaymentTargetLoan = ref<Loan | undefined>(undefined)

const showArchived = ref(false)
const archivedLoanIds = ref<Set<string>>(new Set())

function archiveLoan(id: string) {
  archivedLoanIds.value = new Set([...archivedLoanIds.value, id])
}

function unarchiveLoan(id: string) {
  const updated = new Set(archivedLoanIds.value)
  updated.delete(id)
  archivedLoanIds.value = updated
}

const visibleLoans = computed(() => {
  const loans = store.loans
  return showArchived.value
    ? loans
    : loans.filter(l => !archivedLoanIds.value.has(l.id))
})

function openViewLoan(loan: Loan) {
  viewingLoanId.value = loan.id
  showViewLoanModal.value = true
}

function openEarlyPayment(loan: Loan, event: Event) {
  event.stopPropagation()
  earlyPaymentTargetLoan.value = loan
  showEarlyPaymentForLoan.value = true
}

const monthlyRules = computed(() =>
  store.recurringRules
    .filter(r => r.frequency === 'monthly' || r.frequency === 'yearly')
    .sort((a, b) => (a.dayOfMonth ?? a.startDate.getDate()) - (b.dayOfMonth ?? b.startDate.getDate())),
)

const otherRules = computed(() =>
  store.recurringRules.filter(r => r.frequency !== 'monthly' && r.frequency !== 'yearly'),
)

const freqLabels: Record<RecurringRule['frequency'], string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}
</script>

<template>
  <aside class="w-full lg:w-[300px] lg:fixed lg:top-16 lg:left-0 lg:h-[calc(100vh-4rem)] p-4 space-y-4 overflow-y-auto">
    <!-- Summary -->
    <AppCard>
      <h2 class="font-bold text-lg mb-2 text-gray-800 dark:text-gray-100">{{ t('summary') }}</h2>
      <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
        <div class="flex justify-between">
          <span>{{ t('totalBalance') }}:</span>
          <span class="font-mono font-semibold text-gray-800 dark:text-gray-100">{{ format(store.totalBalance) }}</span>
        </div>
        <div class="flex justify-between">
          <span>{{ t('monthlyIncome') }}:</span>
          <span class="font-mono text-green-500">+{{ format(store.monthlyIncome) }}</span>
        </div>
        <div class="flex justify-between">
          <span>{{ t('monthlyExpenses') }}:</span>
          <span class="font-mono text-red-500">{{ format(store.monthlyExpenses) }}</span>
        </div>
        <div class="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <span class="font-semibold">{{ t('availableFunds') }}:</span>
          <span class="font-mono font-bold text-blue-500">{{ format(availableFunds) }}</span>
        </div>
      </div>
      <div class="flex items-center text-xs text-green-600 mt-2">
        <TrendingUpIcon class="w-4 h-4 mr-1" />
        <span>+5.2% vs last month</span>
      </div>
    </AppCard>

    <!-- Accounts -->
    <AppCard>
      <div class="flex justify-between items-center mb-2">
        <h2 class="font-bold text-lg text-gray-800 dark:text-gray-100">{{ t('accounts') }}</h2>
        <button class="text-blue-500 hover:text-blue-600" @click="openNewAccount">
          <PlusIcon class="w-5 h-5" />
        </button>
      </div>
      <ul class="space-y-2 text-sm">
        <li
          v-for="acc in store.accounts"
          :key="acc.id"
          class="flex justify-between text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg px-1 py-0.5 -mx-1 cursor-pointer"
          @click="openEditAccount(acc)"
        >
          <span>{{ acc.name }}</span>
          <span class="font-mono">{{ format(acc.balance) }}</span>
        </li>
      </ul>
    </AppCard>

    <!-- Budget Progress -->
    <AppCard>
      <h2 class="font-bold text-lg mb-2 text-gray-800 dark:text-gray-100">{{ t('budgetProgress') }}</h2>
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
                {{ getBudgetSpent(budget.categoryId) > budget.amount ? '⚠️ ' : '' }}{{ format(getBudgetSpent(budget.categoryId)) }} / {{ format(budget.amount) }}
              </span>
            </div>
            <ProgressBar :value="getBudgetSpent(budget.categoryId)" :max="budget.amount" />
          </template>
        </div>
      </div>
    </AppCard>

    <!-- Recurring -->
    <AppCard>
      <div class="flex justify-between items-center mb-2">
        <h2 class="font-bold text-lg text-gray-800 dark:text-gray-100">{{ t('recurring') }}</h2>
        <button class="text-blue-500 hover:text-blue-600" @click="openNewRecurring">
          <PlusIcon class="w-5 h-5" />
        </button>
      </div>
      <p v-if="store.recurringRules.length === 0" class="text-sm text-gray-400 dark:text-gray-500">
        {{ t('noRecurring') }}
      </p>
      <template v-else>
        <ul class="space-y-2">
          <li
            v-for="rule in monthlyRules"
            :key="rule.id"
            class="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg px-1 py-0.5"
            @click="openEditRule(rule)"
          >
            <div class="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-md bg-blue-50 dark:bg-blue-900/30">
              <span class="text-sm font-bold text-blue-500 dark:text-blue-400 leading-none">{{ rule.dayOfMonth ?? rule.startDate.getDate() }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-700 dark:text-gray-200 truncate">{{ rule.name }}</p>
              <div class="flex items-center justify-between">
                <p class="text-xs text-gray-400">{{ freqLabels[rule.frequency] }}</p>
                <span :class="['font-mono font-semibold text-xs', rule.amount > 0 ? 'text-green-500' : 'text-red-400']">
                  {{ rule.amount > 0 ? '+' : '' }}{{ format(rule.amount) }}
                </span>
              </div>
            </div>
          </li>
        </ul>
        <template v-if="otherRules.length > 0">
          <div class="my-2 border-t border-gray-200 dark:border-gray-700" />
          <ul class="space-y-2">
            <li
              v-for="rule in otherRules"
              :key="rule.id"
              class="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg px-1 py-0.5"
              @click="openEditRule(rule)"
            >
              <div class="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-md bg-purple-50 dark:bg-purple-900/30">
                <RepeatIcon class="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-700 dark:text-gray-200 truncate">{{ rule.name }}</p>
                <div class="flex items-center justify-between">
                  <p class="text-xs text-gray-400">{{ freqLabels[rule.frequency] }}</p>
                  <span :class="['font-mono font-semibold text-xs', rule.amount > 0 ? 'text-green-500' : 'text-red-400']">
                    {{ rule.amount > 0 ? '+' : '' }}{{ format(rule.amount) }}
                  </span>
                </div>
              </div>
            </li>
          </ul>
        </template>
      </template>
    </AppCard>

    <!-- Loans -->
    <AppCard>
      <div class="flex justify-between items-center mb-2">
        <h2 class="font-bold text-lg text-gray-800 dark:text-gray-100">{{ t('loans') }}</h2>
        <div class="flex items-center gap-2">
          <button
            v-if="archivedLoanIds.size > 0 || showArchived"
            class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            @click="showArchived = !showArchived"
          >
            {{ showArchived ? 'Скрыть архив' : 'Показать архив' }}
          </button>
          <button class="text-blue-500 hover:text-blue-600" @click="showLoanModal = true">
            <PlusIcon class="w-5 h-5" />
          </button>
        </div>
      </div>
      <p v-if="visibleLoans.length === 0" class="text-sm text-gray-400 dark:text-gray-500">
        {{ store.loans.length === 0 ? t('noLoans') : 'Все кредиты архивированы' }}
      </p>
      <ul v-else class="space-y-3">
        <li
          v-for="loan in visibleLoans"
          :key="loan.id"
          class="text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg p-1 -mx-1 transition-colors"
          :class="{ 'opacity-50': archivedLoanIds.has(loan.id) }"
          @click="openViewLoan(loan)"
        >
          <div class="flex justify-between items-center mb-1">
            <span class="font-medium text-gray-700 dark:text-gray-200 truncate max-w-[120px]">{{ loan.name }}</span>
            <div class="flex items-center gap-1 flex-shrink-0">
              <span class="font-mono text-red-400 text-xs">
                {{ format(store.getLoanMonthlyPayment(loan)) }}/mo
              </span>
              <button
                class="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                title="Early Payment"
                @click.stop="openEarlyPayment(loan, $event)"
              >⚡</button>
              <button
                v-if="!archivedLoanIds.has(loan.id)"
                class="text-xs text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 px-1"
                title="Архивировать"
                @click.stop="archiveLoan(loan.id)"
              >✕</button>
              <button
                v-else
                class="text-xs text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 px-1"
                title="Восстановить"
                @click.stop="unarchiveLoan(loan.id)"
              >↩</button>
            </div>
          </div>
          <ProgressBar
            :value="store.getLoanPaidCount(loan)"
            :max="store.getLoanTotalPayments(loan)"
          />
          <p class="text-xs text-gray-400 mt-0.5">
            {{ store.getLoanPaidCount(loan) }} / {{ store.getLoanTotalPayments(loan) }}
          </p>
        </li>
      </ul>
    </AppCard>
  </aside>

  <AccountModal v-model="showAccountModal" :edit-account="editingAccount" />
  <RecurringRuleModal v-model="showRecurringModal" :edit-rule="editingRule" />
  <LoanModal v-model="showLoanModal" />
  <LoanModal v-model="showViewLoanModal" :view-loan="viewingLoan" />
  <EarlyPaymentModal
    v-if="earlyPaymentTargetLoan"
    v-model="showEarlyPaymentForLoan"
    :loan="earlyPaymentTargetLoan"
  />
</template>
