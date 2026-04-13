<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { useI18n } from 'vue-i18n'
import type { RecurringRule } from '@/types'

const props = defineProps<{ modelValue: boolean; editRule?: RecurringRule }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const store = useFinanceStore()
const { t } = useI18n()

const today = new Date().toISOString().slice(0, 10)

const name = ref(props.editRule?.name ?? '')
const amount = ref(props.editRule?.amount ?? 0)
const categoryId = ref(props.editRule?.categoryId ?? store.categories[0]?.id ?? '')
const accountId = ref(props.editRule?.accountId ?? store.accounts[0]?.id ?? '')
const frequency = ref<RecurringRule['frequency']>(props.editRule?.frequency ?? 'monthly')
const startDate = ref(props.editRule?.startDate.toISOString().slice(0, 10) ?? today)
const hasEndDate = ref(props.editRule?.endDate != null)
const endDate = ref(
  props.editRule?.endDate ? props.editRule.endDate.toISOString().slice(0, 10) : '',
)

const frequencies: RecurringRule['frequency'][] = ['weekly', 'biweekly', 'monthly', 'yearly']
const freqLabels: Record<RecurringRule['frequency'], string> = {
  weekly: t('weekly'),
  biweekly: t('biweekly'),
  monthly: t('monthly'),
  yearly: t('yearly'),
}

const isValid = computed(
  () => name.value.trim() !== '' && amount.value !== 0 && startDate.value !== '',
)

function close() {
  emit('update:modelValue', false)
}

function submit() {
  if (!isValid.value) return
  const rule: Omit<RecurringRule, 'id'> = {
    name: name.value.trim(),
    amount: amount.value,
    categoryId: categoryId.value,
    accountId: accountId.value,
    frequency: frequency.value,
    startDate: new Date(startDate.value),
    endDate: hasEndDate.value && endDate.value ? new Date(endDate.value) : null,
  }
  if (props.editRule) {
    store.updateRecurringRule(props.editRule.id, rule)
  } else {
    store.addRecurringRule(rule)
  }
  close()
}

function deleteRule() {
  if (props.editRule) store.removeRecurringRule(props.editRule.id)
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
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">
            {{ editRule ? t('editRecurring') : t('newRecurring') }}
          </h2>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="close">✕</button>
        </div>

        <!-- Name -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('name') }}</label>
          <input
            v-model="name"
            type="text"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Amount -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('amount') }}</label>
          <input
            v-model.number="amount"
            type="number"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+1000 income / -500 expense"
          />
        </div>

        <!-- Category -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('category') }}</label>
          <select
            v-model="categoryId"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option v-for="cat in store.categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
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

        <!-- Frequency -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('frequency') }}</label>
          <select
            v-model="frequency"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option v-for="f in frequencies" :key="f" :value="f">{{ freqLabels[f] }}</option>
          </select>
        </div>

        <!-- Start Date -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('startDate') }}</label>
          <input
            v-model="startDate"
            type="date"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- End Date -->
        <div>
          <label class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
            <input v-model="hasEndDate" type="checkbox" class="rounded" />
            {{ t('endDate') }}
          </label>
          <input
            v-if="hasEndDate"
            v-model="endDate"
            type="date"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-2">
          <button
            v-if="editRule"
            class="px-4 py-2 rounded-lg text-sm font-medium text-red-500 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            @click="deleteRule"
          >{{ t('deleteRule') }}</button>
          <div class="flex-1" />
          <button
            class="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            @click="close"
          >{{ t('cancel') }}</button>
          <button
            :disabled="!isValid"
            class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            @click="submit"
          >{{ t('save') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
