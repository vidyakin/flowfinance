<script setup lang="ts">
import { onMounted } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import AppHeader from '@/components/AppHeader.vue'
import LeftSidebar from '@/components/LeftSidebar.vue'
import MainCalendar from '@/components/MainCalendar.vue'
import RightSidebar from '@/components/RightSidebar.vue'
import AnalyticsPanel from '@/components/AnalyticsPanel.vue'
import SettingsModal from '@/components/SettingsModal.vue'

const store = useFinanceStore()
onMounted(() => store.loadInitialData())
</script>

<template>
  <div class="min-h-screen w-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
    <AppHeader />
    <div class="flex flex-col lg:flex-row flex-1 pt-16 overflow-hidden">
      <LeftSidebar />
      <div class="flex-1 min-w-0 lg:ml-[300px] lg:mr-[350px] flex flex-col overflow-hidden">
        <MainCalendar />
        <AnalyticsPanel />
      </div>
      <RightSidebar />
    </div>
    <SettingsModal />
  </div>
</template>
