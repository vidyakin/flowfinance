<script setup lang="ts">
defineProps<{ class?: string }>()
</script>

<template>
  <div :class="`bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-xl shadow-sm p-4 ${$props.class ?? ''}`">
    <slot />
  </div>
</template>
