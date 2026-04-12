<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import LeftSidebar from '@/components/LeftSidebar.vue'
import MainCalendar from '@/components/MainCalendar.vue'
import RightSidebar from '@/components/RightSidebar.vue'
import AnalyticsPanel from '@/components/AnalyticsPanel.vue'
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
    <AppHeader />
    <div class="flex flex-1 pt-16">
      <LeftSidebar />
      <div class="flex-1 ml-[300px] mr-[350px] overflow-hidden">
        <MainCalendar />
      </div>
      <RightSidebar />
      <AnalyticsPanel />
    </div>
  </div>
</template>
