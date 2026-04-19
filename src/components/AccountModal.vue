<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import type { Account } from '@/types'

const props = defineProps<{
  modelValue: boolean
  editAccount?: Account
}>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const store = useFinanceStore()

const name = ref('')
const type = ref<Account['type']>('checking')
const saving = ref(false)
const confirmDelete = ref(false)

watch(() => props.modelValue, (open) => {
  if (!open) return
  confirmDelete.value = false
  if (props.editAccount) {
    name.value = props.editAccount.name
    type.value = props.editAccount.type
  } else {
    name.value = ''
    type.value = 'checking'
  }
})

const typeLabels: Record<Account['type'], string> = {
  checking: 'Расчётный',
  savings: 'Накопительный',
  cash: 'Наличные',
  credit: 'Кредитный',
}

function close() {
  emit('update:modelValue', false)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

async function save() {
  if (!name.value.trim()) return
  saving.value = true
  try {
    if (props.editAccount) {
      await store.updateAccount(props.editAccount.id, {
        name: name.value.trim(),
        type: type.value,
      })
    } else {
      await store.addAccount(name.value.trim(), type.value, 0)
    }
    close()
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!props.editAccount) return
  saving.value = true
  try {
    await store.removeAccount(props.editAccount.id)
    close()
  } finally {
    saving.value = false
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
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">
            {{ editAccount ? 'Редактировать счёт' : 'Новый счёт' }}
          </h2>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="close">✕</button>
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название</label>
            <input
              v-model="name"
              type="text"
              placeholder="Например: Карта Сбербанк"
              class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Тип</label>
            <select
              v-model="type"
              class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option v-for="(label, val) in typeLabels" :key="val" :value="val">{{ label }}</option>
            </select>
          </div>


        </div>

        <div class="flex gap-2 pt-2">
          <button
            v-if="editAccount && !confirmDelete"
            class="py-2 px-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            @click="confirmDelete = true"
          >Удалить</button>
          <button
            v-if="confirmDelete"
            class="py-2 px-3 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
            :disabled="saving"
            @click="remove"
          >Точно удалить?</button>

          <div class="flex-1" />

          <button
            class="py-2 px-4 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            @click="close"
          >Отмена</button>
          <button
            :disabled="!name.trim() || saving"
            class="py-2 px-4 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            @click="save"
          >{{ saving ? '...' : 'Сохранить' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
