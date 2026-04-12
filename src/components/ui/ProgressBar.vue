<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ value: number; max: number }>()

const percentage = computed(() => Math.min((props.value / props.max) * 100, 100))

const colorClass = computed(() => {
  if (percentage.value > 95) return 'bg-red-500'
  if (percentage.value > 75) return 'bg-yellow-500'
  return 'bg-green-500'
})
</script>

<template>
  <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
    <div
      :class="`h-2 rounded-full ${colorClass}`"
      :style="{ width: `${percentage}%` }"
    />
  </div>
</template>
