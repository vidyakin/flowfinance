<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { useI18n } from 'vue-i18n'
import type { Transaction } from '@/types'

const props = defineProps<{ modelValue: boolean; date?: Date; transaction?: Transaction }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const store = useFinanceStore()
const { t } = useI18n()

const today = new Date().toISOString().slice(0, 10)
const selectedDate = ref('')
const description = ref('')
const amount = ref(0)
const categoryId = ref('')
const accountId = ref('')
const type = ref<'actual' | 'planned'>('actual')

function dateToString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const categoryOptions = computed(() => store.categories.filter(c => c.type === flowType.value))
const accountOptions = computed(() => store.accounts)

const flowType = ref<'income' | 'expense'>('expense')
const isEditing = computed(() => !!props.transaction)
const isValid = computed(
  () => description.value.trim() !== '' && amount.value !== 0 && selectedDate.value !== '' && !!categoryId.value && !!accountId.value,
)

function ensureDefaults() {
  const cats = categoryOptions.value
  const accs = store.accounts
  if (!categoryId.value && cats[0]) categoryId.value = cats[0].id
  if (!accountId.value && accs[0]) accountId.value = accs[0].id
}

watch(() => props.modelValue, (open) => {
  if (open) {
    if (props.transaction) {
      const cat = store.categories.find(c => c.id === props.transaction!.categoryId)
      description.value = props.transaction.description
      amount.value = Math.abs(props.transaction.amount)
      selectedDate.value = dateToString(props.transaction.date)
      categoryId.value = props.transaction.categoryId
      accountId.value = props.transaction.accountId
      type.value = props.transaction.type
      flowType.value = cat?.type === 'income' ? 'income' : 'expense'
    } else {
      description.value = ''
      amount.value = 0
      selectedDate.value = props.date ? dateToString(props.date) : today
      type.value = 'actual'
      flowType.value = 'expense'
      ensureDefaults()
    }
  }
})

watch(flowType, () => {
  categoryId.value = ''
  ensureDefaults()
})

function close() {
  emit('update:modelValue', false)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

async function submit() {
  if (!isValid.value) return
  const data = {
    date: new Date(selectedDate.value),
    description: description.value.trim(),
    amount: flowType.value === 'expense' ? -Math.abs(amount.value) : Math.abs(amount.value),
    categoryId: categoryId.value,
    accountId: accountId.value,
    type: type.value,
  }
  if (isEditing.value && props.transaction) {
    await store.updateTransaction(props.transaction.id, data)
  } else {
    await store.addTransaction(data)
  }
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
            {{ isEditing ? t('editTransaction') : t('newTransaction') }}
          </h2>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="close">✕</button>
        </div>

        <!-- Income / Expense toggle -->
        <div class="flex gap-2">
          <button
            :class="[
              'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
              flowType === 'expense'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
            ]"
            @click="flowType = 'expense'"
          >
            {{ t('expense') }}
          </button>
          <button
            :class="[
              'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
              flowType === 'income'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
            ]"
            @click="flowType = 'income'"
          >
            {{ t('income') }}
          </button>
        </div>

        <!-- Plan / Actual toggle -->
        <div class="flex gap-2">
          <button
            :class="[
              'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
              type === 'planned'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
            ]"
            @click="type = 'planned'"
          >
            {{ t('plan') }}
          </button>
          <button
            :class="[
              'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
              type === 'actual'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
            ]"
            @click="type = 'actual'"
          >
            {{ t('actual') }}
          </button>
        </div>

        <!-- Date -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('date') }}</label>
          <input
            v-model="selectedDate"
            type="date"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('description') }}</label>
          <input
            v-model="description"
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
            placeholder="0"
          />
        </div>

        <!-- Category -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('category') }}</label>
          <select
            v-model="categoryId"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option v-if="!categoryOptions.length" value="" disabled>—</option>
            <option v-for="cat in categoryOptions" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </div>

        <!-- Account -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('account') }}</label>
          <select
            v-model="accountId"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option v-if="!accountOptions.length" value="" disabled>—</option>
            <option v-for="acc in accountOptions" :key="acc.id" :value="acc.id">{{ acc.name }}</option>
          </select>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-2">
          <button
            v-if="isEditing"
            class="px-4 py-2 rounded-lg text-sm font-medium text-red-500 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            @click="async () => { await store.deleteTransaction(props.transaction!.id); close() }"
          >{{ t('delete') }}</button>
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
