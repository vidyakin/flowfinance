<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { useI18n } from 'vue-i18n'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps<{ modelValue: boolean; date: Date }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const store = useFinanceStore()
const { t } = useI18n()
const { format } = useCurrency()

const actualBalanceInput = ref('')

const projectedBalance = computed(() => store.getProjectedBalanceForDate(props.date))

const actualBalance = computed(() => {
  const v = parseFloat(actualBalanceInput.value)
  return isNaN(v) ? null : v
})

const adjustment = computed(() =>
  actualBalance.value !== null ? actualBalance.value - projectedBalance.value : null,
)

const canSave = computed(() => adjustment.value !== null && adjustment.value !== 0)

function close() {
  emit('update:modelValue', false)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

function save() {
  if (!canSave.value || actualBalance.value === null) return
  store.addBalanceAdjustment(props.date, actualBalance.value)
  close()
}

const dateLabel = computed(() =>
  props.date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }),
)
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
          <div>
            <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">{{ t('setActualBalanceTitle') }}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{{ dateLabel }}</p>
          </div>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="close">✕</button>
        </div>

        <!-- Projected balance -->
        <div class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
          <span class="text-sm text-gray-600 dark:text-gray-300">{{ t('projectedBalance') }}:</span>
          <span class="font-mono font-semibold text-gray-800 dark:text-gray-100">{{ format(projectedBalance) }}</span>
        </div>

        <!-- Actual balance input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('actualBalance') }}</label>
          <input
            v-model="actualBalanceInput"
            type="number"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            :placeholder="String(projectedBalance)"
          />
        </div>

        <!-- Adjustment -->
        <div v-if="adjustment !== null" class="flex justify-between items-center">
          <span class="text-sm text-gray-600 dark:text-gray-300">{{ t('adjustment') }}:</span>
          <span
            :class="[
              'font-mono font-semibold text-sm',
              adjustment > 0 ? 'text-green-500' : adjustment < 0 ? 'text-red-500' : 'text-gray-500',
            ]"
          >
            {{ adjustment > 0 ? '+' : '' }}{{ format(adjustment) }}
          </span>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-2">
          <button
            class="flex-1 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            @click="close"
          >{{ t('cancel') }}</button>
          <button
            :disabled="!canSave"
            class="flex-1 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            @click="save"
          >{{ t('save') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
