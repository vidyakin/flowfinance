<script setup lang="ts">
import { useFinanceStore } from '@/stores/finance'
import { getMonthName } from '@/utils/helpers'
import ChevronLeftIcon from '@/components/icons/ChevronLeftIcon.vue'
import ChevronRightIcon from '@/components/icons/ChevronRightIcon.vue'
import UserIcon from '@/components/icons/UserIcon.vue'
import SettingsIcon from '@/components/icons/SettingsIcon.vue'

const store = useFinanceStore()
</script>

<template>
  <header class="fixed top-0 left-0 right-0 h-16 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 z-10 flex items-center px-6">
    <div class="flex items-center space-x-3 w-1/4">
      <div class="w-8 h-8 bg-blue-500 rounded-lg" />
      <h1 class="text-xl font-bold text-gray-800 dark:text-white">FlowFinance</h1>
    </div>

    <div class="flex-1 flex items-center justify-center">
      <div class="flex items-center space-x-2 bg-gray-200/50 dark:bg-gray-700/50 p-1 rounded-lg">
        <button
          class="p-1 rounded-md hover:bg-gray-300/50 dark:hover:bg-gray-600/50 transition-colors"
          @click="store.prevMonth()"
        >
          <ChevronLeftIcon class="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <span class="font-semibold text-gray-700 dark:text-gray-200 w-32 text-center">
          {{ getMonthName(store.currentDate.getMonth()) }} {{ store.currentDate.getFullYear() }}
        </span>
        <button
          class="p-1 rounded-md hover:bg-gray-300/50 dark:hover:bg-gray-600/50 transition-colors"
          @click="store.nextMonth()"
        >
          <ChevronRightIcon class="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>
    </div>

    <div class="w-1/4 flex items-center justify-end space-x-4">
      <button class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
        <SettingsIcon class="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
      <button class="flex items-center space-x-2">
        <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          <UserIcon class="w-5 h-5 text-gray-600" />
        </div>
      </button>
    </div>
  </header>
</template>
