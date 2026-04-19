<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{ (e: 'close'): void }>()

const settings = useSettingsStore()
const { t } = useI18n()

const currencies = ['USD', 'EUR', 'RUB', 'AED', 'GBP'] as const

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="settings.settingsModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      @click.self="settings.settingsModalOpen = false"
    >
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">{{ t('settings') }}</h2>
          <button
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            @click="settings.settingsModalOpen = false"
          >✕</button>
        </div>

        <!-- Appearance -->
        <div>
          <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {{ t('appearance') }}
          </h3>
          <div class="flex gap-2">
            <button
              :class="[
                'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                settings.theme === 'light'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600',
              ]"
              @click="settings.setTheme('light')"
            >☀ {{ t('light') }}</button>
            <button
              :class="[
                'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                settings.theme === 'dark'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600',
              ]"
              @click="settings.setTheme('dark')"
            >🌙 {{ t('dark') }}</button>
          </div>
        </div>

        <!-- Language -->
        <div>
          <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {{ t('language') }}
          </h3>
          <div class="flex gap-2">
            <button
              v-for="lang in ['en', 'ru'] as const"
              :key="lang"
              :class="[
                'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                settings.locale === lang
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600',
              ]"
              @click="settings.setLocale(lang)"
            >{{ lang.toUpperCase() }}</button>
          </div>
        </div>

        <!-- Currency -->
        <div>
          <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {{ t('currency') }}
          </h3>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="cur in currencies"
              :key="cur"
              :class="[
                'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                settings.currency === cur
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600',
              ]"
              @click="settings.setCurrency(cur)"
            >{{ cur }}</button>
          </div>
        </div>

        <!-- Min Balance -->
        <div>
          <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {{ t('settings.minBalance') || 'Мин. баланс' }}
          </h3>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('settings.minBalance') || 'Мин. баланс (₽)' }}</span>
            <input
              type="number"
              min="0"
              :value="settings.minBalance"
              @change="settings.setMinBalance(Number(($event.target as HTMLInputElement).value))"
              class="w-32 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
