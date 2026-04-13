<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { useFinanceStore } from '@/stores/finance'
import { useI18n } from 'vue-i18n'
import { useCurrency } from '@/composables/useCurrency'
import AppCard from '@/components/ui/AppCard.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const store = useFinanceStore()
const { t, locale } = useI18n()
const { format } = useCurrency()

const chartData = computed(() => {
  const labels: string[] = []
  const balances: number[] = []

  const startDate = new Date(store.currentDate.getFullYear(), store.currentDate.getMonth(), 1)
  const endDate = new Date(store.currentDate.getFullYear(), store.currentDate.getMonth() + 2, 0)
  const fmt = new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
    month: 'short',
    day: 'numeric',
  })

  for (const d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    labels.push(fmt.format(new Date(d)))
    balances.push(store.getProjectedBalanceForDate(new Date(d)))
  }

  return {
    labels,
    datasets: [
      {
        label: t('balanceLabel'),
        data: balances,
        borderColor: '#3b82f6',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true },
    tooltip: {
      callbacks: {
        label: (ctx: any) => `${t('balanceLabel')}: ${format(ctx.parsed.y)}`,
      },
    },
  },
  scales: {
    x: {
      ticks: { font: { size: 12 } },
      grid: { color: 'rgba(0,0,0,0.1)' },
    },
    y: {
      ticks: {
        font: { size: 12 },
        callback: (val: number) => format(val),
      },
      grid: { color: 'rgba(0,0,0,0.1)' },
    },
  },
}))
</script>

<template>
  <div class="fixed bottom-0 left-[300px] right-[350px] h-64 p-4 z-10">
    <AppCard class="h-full w-full flex flex-col">
      <h2 class="font-bold text-lg mb-2 text-gray-800 dark:text-gray-100">{{ t('cashFlowForecast') }}</h2>
      <div class="flex-1 -mx-4 -mb-4">
        <Line :data="chartData" :options="(chartOptions as any)" />
      </div>
    </AppCard>
  </div>
</template>
