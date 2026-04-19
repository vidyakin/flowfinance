<script setup lang="ts">
import { computed } from 'vue'
import { Line, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  DoughnutController,
  Title,
  Tooltip,
  Legend,
  type Plugin,
} from 'chart.js'
import { useFinanceStore } from '@/stores/finance'
import { useSettingsStore } from '@/stores/settings'
import { useI18n } from 'vue-i18n'
import { useCurrency } from '@/composables/useCurrency'
import AppCard from '@/components/ui/AppCard.vue'

const crosshairPlugin: Plugin<'line'> = {
  id: 'crosshair',
  afterDraw(chart) {
    const { ctx, chartArea, tooltip } = chart
    if (!tooltip || !tooltip.getActiveElements().length) return

    const activeEl = tooltip.getActiveElements()[0]
    const x = activeEl.element.x
    const value = (chart.data.datasets[0].data[activeEl.index] as number) ?? 0

    ctx.save()
    ctx.beginPath()
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = 'rgba(100,120,200,0.6)'
    ctx.lineWidth = 1
    ctx.moveTo(x, chartArea.top)
    ctx.lineTo(x, chartArea.bottom)
    ctx.stroke()
    ctx.setLineDash([])

    const formatted = value.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽'
    ctx.font = '11px system-ui, sans-serif'
    const textWidth = ctx.measureText(formatted).width
    const padding = 5
    const boxW = textWidth + padding * 2
    const boxH = 18
    let labelX = x + 6
    if (labelX + boxW > chartArea.right) labelX = x - boxW - 6

    ctx.fillStyle = 'rgba(59,130,246,0.85)'
    ctx.beginPath()
    ctx.roundRect(labelX, chartArea.top, boxW, boxH, 4)
    ctx.fill()

    ctx.fillStyle = '#fff'
    ctx.textBaseline = 'middle'
    ctx.fillText(formatted, labelX + padding, chartArea.top + boxH / 2)
    ctx.restore()
  },
}

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, DoughnutController, Title, Tooltip, Legend, crosshairPlugin)

const store = useFinanceStore()
const settingsStore = useSettingsStore()
const { t, locale } = useI18n()
const { format } = useCurrency()

const cashGapDate = computed(() => {
  const balances = store.dailyBalances
  if (!balances) return null
  const threshold = settingsStore.minBalance ?? 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  const maxDate = new Date(today)
  maxDate.setMonth(maxDate.getMonth() + 2)
  const maxDateStr = maxDate.toISOString().split('T')[0]
  return (Object.entries(balances) as [string, number][])
    .filter(([date]) => date >= todayStr && date <= maxDateStr)
    .sort(([a], [b]) => a.localeCompare(b))
    .find(([, balance]) => balance < threshold)?.[0] ?? null
})

const daysUntilCashGap = computed(() => {
  if (!cashGapDate.value) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [y, m, d] = cashGapDate.value.split('-').map(Number)
  const gap = new Date(y, m - 1, d)
  return Math.round((gap.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
})

const cashGapDateFormatted = computed(() => {
  if (!cashGapDate.value) return ''
  const [y, m, d] = cashGapDate.value.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric', month: 'long',
  })
})

const categoryStats = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const txns = store.allTransactions ?? []
  const catMap = new Map(store.categories.map(c => [c.id, c]))

  const stats = new Map<string, { name: string; color: string; total: number }>()

  for (const t of txns) {
    const date = t.date instanceof Date ? t.date : new Date(t.date)
    if (date.getFullYear() !== year || date.getMonth() !== month) continue
    if (t.amount >= 0) continue

    const cat = catMap.get(t.categoryId)
    if (!cat) continue

    if (!stats.has(t.categoryId)) {
      stats.set(t.categoryId, { name: cat.name, color: cat.color, total: 0 })
    }
    stats.get(t.categoryId)!.total += Math.abs(t.amount)
  }

  return [...stats.values()].sort((a, b) => b.total - a.total).slice(0, 8)
})

const chartData = computed(() => {
  const labels: string[] = []
  const balances: number[] = []

  const startDate = new Date(store.currentDate.getFullYear(), store.currentDate.getMonth(), 1)
  const endDate = new Date(store.currentDate.getFullYear(), store.currentDate.getMonth() + 2, 0)

  for (const d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    labels.push(`${dd}.${mm}`)
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

const tailwindColorMap: Record<string, string> = {
  'bg-red-500': '#ef4444',
  'bg-orange-500': '#f97316',
  'bg-amber-500': '#f59e0b',
  'bg-yellow-500': '#eab308',
  'bg-lime-500': '#84cc16',
  'bg-green-500': '#22c55e',
  'bg-emerald-500': '#10b981',
  'bg-teal-500': '#14b8a6',
  'bg-cyan-500': '#06b6d4',
  'bg-sky-500': '#0ea5e9',
  'bg-blue-500': '#3b82f6',
  'bg-indigo-500': '#6366f1',
  'bg-violet-500': '#8b5cf6',
  'bg-purple-500': '#a855f7',
  'bg-fuchsia-500': '#d946ef',
  'bg-pink-500': '#ec4899',
  'bg-rose-500': '#f43f5e',
  'bg-gray-500': '#6b7280',
  'bg-slate-500': '#64748b',
  'bg-zinc-500': '#71717a',
}

const fallbackPalette = [
  '#3b82f6','#ef4444','#f97316','#a855f7','#10b981',
  '#f59e0b','#ec4899','#06b6d4','#84cc16','#6366f1',
]

function resolveColor(color: string, index: number): string {
  if (!color) return fallbackPalette[index % fallbackPalette.length]
  if (color.startsWith('#') || color.startsWith('rgb')) return color
  return tailwindColorMap[color] ?? fallbackPalette[index % fallbackPalette.length]
}

const totalExpenses = computed(() => categoryStats.value.reduce((s, c) => s + c.total, 0))

const pieChartData = computed(() => ({
  labels: categoryStats.value.map(c => c.name),
  datasets: [
    {
      data: categoryStats.value.map(c => c.total),
      backgroundColor: categoryStats.value.map((c, i) => resolveColor(c.color, i)),
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.4)',
      hoverOffset: 4,
    },
  ],
}))

const pieChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '60%',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const val = ctx.parsed as number
          const pct = totalExpenses.value ? Math.round((val / totalExpenses.value) * 100) : 0
          return ` ${val.toLocaleString('ru-RU')} ₽ (${pct}%)`
        },
      },
    },
  },
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: { display: true },
    tooltip: { enabled: false },
  },
  scales: {
    x: {
      ticks: {
        font: { size: 11 },
        maxTicksLimit: 15,
        maxRotation: 0,
      },
      grid: { color: 'rgba(0,0,0,0.07)' },
    },
    y: {
      ticks: {
        font: { size: 11 },
        callback: (val: number) => format(val),
      },
      grid: { color: 'rgba(0,0,0,0.07)' },
    },
  },
}))
</script>

<template>
  <div class="w-full p-4 flex-shrink-0">
    <AppCard class="h-full w-full flex flex-col overflow-y-auto">
      <div v-if="cashGapDate" class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex-shrink-0">
        <div class="flex items-center gap-2">
          <span class="text-red-500 text-lg">⚠️</span>
          <div class="flex-1">
            <p class="text-sm font-medium text-red-700 dark:text-red-400">Кассовый разрыв</p>
            <p class="text-xs text-red-600 dark:text-red-500">
              Баланс опустится ниже {{ settingsStore.minBalance > 0 ? settingsStore.minBalance.toLocaleString() + ' ₽' : 'нуля' }} {{ cashGapDateFormatted }}
            </p>
          </div>
          <div class="text-right flex-shrink-0">
            <p class="text-2xl font-bold text-red-600 dark:text-red-400 leading-none">{{ daysUntilCashGap }}</p>
            <p class="text-[10px] text-red-500 dark:text-red-500 leading-tight">дней</p>
          </div>
        </div>
      </div>

      <div class="flex gap-6 flex-1 min-h-0">
        <!-- Линейный график -->
        <div class="flex flex-col flex-1 min-w-0">
          <h2 class="font-bold text-lg mb-2 text-gray-800 dark:text-gray-100 flex-shrink-0">{{ t('cashFlowForecast') }}</h2>
          <div class="flex-1 min-h-[140px]">
            <Line :data="chartData" :options="(chartOptions as any)" />
          </div>
        </div>

        <!-- Круговая диаграмма расходов -->
        <div v-if="categoryStats.length > 0" class="flex flex-col flex-shrink-0 w-96">
          <h3 class="font-bold text-lg mb-2 text-gray-800 dark:text-gray-100 flex-shrink-0">Расходы</h3>
          <div class="flex items-center gap-3 flex-1">
            <!-- Legend -->
            <div class="flex-1 min-w-0 space-y-1.5">
              <div v-for="(cat, i) in categoryStats" :key="cat.name" class="flex items-center gap-1.5">
                <div class="w-2.5 h-2.5 rounded-sm flex-shrink-0" :style="{ background: resolveColor(cat.color, i) }"></div>
                <span class="text-xs text-gray-600 dark:text-gray-400 flex-1 truncate">{{ cat.name }}</span>
              </div>
            </div>
            <!-- Donut -->
            <div class="relative flex-shrink-0" style="width: 180px; height: 180px;">
              <Doughnut :data="pieChartData" :options="(pieChartOptions as any)" />
              <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span class="text-[9px] text-gray-400 dark:text-gray-500 leading-none">итого</span>
                <span class="text-[11px] font-semibold text-gray-700 dark:text-gray-200 leading-tight">
                  {{ Math.round(totalExpenses / 1000) }}k ₽
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppCard>
  </div>
</template>
