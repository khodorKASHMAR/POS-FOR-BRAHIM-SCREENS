<template>
  <div class="page-background dashboard-page">
    <div class="page-decor" aria-hidden="true">
      <span class="decor-grid" />
      <span class="decor-orb decor-orb--1" />
      <span class="decor-orb decor-orb--2" />
      <span class="decor-orb decor-orb--3" />
    </div>

    <TopBar />

    <div class="dashboard-content" :dir="lang.dir">
      <div class="hero-panel">
        <div class="dashboard-header">
          <div class="header-main">
            <h1 class="dashboard-title">
              <span class="title-icon-wrap">
                <v-icon size="22">mdi-chart-areaspline</v-icon>
              </span>
              {{ $t('dashboard') }}
            </h1>
            <p class="dashboard-subtitle">{{ $t('dashboardSubtitle') }}</p>
          </div>
          <div v-if="!loading" class="header-stats">
            <div class="stat-pill stat-pill--glow">
              <v-icon size="16">mdi-cash-multiple</v-icon>
              <span class="stat-pill-value" dir="ltr">${{ formatMoney(totalRevenue) }}</span>
              <span class="stat-pill-label">{{ $t('totalRevenue') }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="filters-panel">
        <div class="receipts-filter-card">
          <div class="filter-fields">
            <div class="filter-field-block">
              <label class="filter-label">{{ $t('fromDate') }}</label>
              <PosDateInput v-model="filters.fromDate" :placeholder="$t('selectDatePlaceholder')" />
            </div>
            <div class="filter-field-block">
              <label class="filter-label">{{ $t('toDate') }}</label>
              <PosDateInput v-model="filters.toDate" :placeholder="$t('selectDatePlaceholder')" />
            </div>
            <div class="filter-field-block">
              <label class="filter-label">{{ $t('items') }}</label>
              <v-select
                v-model="filters.itemId"
                :items="itemOptions"
                item-title="label"
                item-value="value"
                variant="outlined"
                density="compact"
                hide-details
                clearable
                class="filter-select"
                :placeholder="$t('allItems')"
              />
            </div>
            <div class="filter-field-block">
              <label class="filter-label">{{ $t('type') }}</label>
              <v-select
                v-model="filters.type"
                :items="typeOptions"
                item-title="label"
                item-value="value"
                variant="outlined"
                density="compact"
                hide-details
                clearable
                class="filter-select"
                :placeholder="$t('allTypes')"
              />
            </div>
          </div>

          <div
            class="filter-actions"
            :class="state.lang === 'ar' ? 'filter-actions--ar' : 'filter-actions--en'"
          >
            <template v-if="state.lang === 'ar'">
              <v-btn
                variant="flat"
                class="apply-btn"
                :loading="loading"
                prepend-icon="mdi-magnify"
                @click="loadDashboard"
              >
                {{ loading ? $t('searching') : $t('search') }}
              </v-btn>
              <v-btn variant="outlined" class="reset-btn" @click="resetFilters">
                {{ $t('reset') }}
              </v-btn>
            </template>
            <template v-else>
              <v-btn variant="outlined" class="reset-btn" @click="resetFilters">
                {{ $t('reset') }}
              </v-btn>
              <v-btn
                variant="flat"
                class="apply-btn"
                :loading="loading"
                prepend-icon="mdi-magnify"
                @click="loadDashboard"
              >
                {{ loading ? $t('searching') : $t('applyFilters') }}
              </v-btn>
            </template>
          </div>
        </div>
      </div>

      <div class="controls-panel">
        <div class="period-toggle">
          <button
            v-for="option in periodOptions"
            :key="option.id"
            type="button"
            class="period-btn"
            :class="{ active: period === option.id }"
            @click="setPeriod(option.id)"
          >
            {{ $t(option.labelKey) }}
          </button>
        </div>

        <div class="view-controls">
          <div class="chart-type-toggle">
            <button
              type="button"
              class="icon-toggle-btn"
              :class="{ active: chartType === 'line' && viewMode === 'revenue' }"
              :title="$t('lineChart')"
              @click="setRevenueLineChart"
            >
              <v-icon size="18">mdi-chart-line</v-icon>
            </button>
            <button
              type="button"
              class="icon-toggle-btn"
              :class="{ active: chartType === 'bar' && viewMode === 'revenue' }"
              :title="$t('barChart')"
              @click="setRevenueBarChart"
            >
              <v-icon size="18">mdi-chart-bar</v-icon>
            </button>
          </div>

          <button
            type="button"
            class="top-items-btn"
            :class="{ active: viewMode === 'topItems' }"
            @click="viewMode = 'topItems'"
          >
            <v-icon size="18">mdi-trophy-outline</v-icon>
            {{ $t('mostSoldItems') }}
          </button>
        </div>
      </div>

      <section class="chart-section">
        <div class="chart-card">
          <div class="chart-card-header">
            <h2 class="chart-title">
              <v-icon size="20" class="chart-title-icon">
                {{ viewMode === 'topItems' ? 'mdi-trophy' : 'mdi-finance' }}
              </v-icon>
              {{ viewMode === 'topItems' ? $t('mostSoldItems') : $t('revenueChart') }}
            </h2>
            <button
              type="button"
              class="refresh-btn"
              :class="{ 'refresh-btn--spinning': loading }"
              :disabled="loading"
              :aria-label="$t('search')"
              @click="loadDashboard"
            >
              <v-icon size="18">mdi-refresh</v-icon>
            </button>
          </div>

          <div v-if="loading" class="chart-loading">
            <v-progress-circular indeterminate color="primary" size="40" />
            <span>{{ $t('loadingDashboard') }}</span>
          </div>

          <div v-else-if="isChartEmpty" class="chart-empty">
            <v-icon size="48" color="primary" class="chart-empty-icon">mdi-chart-box-outline</v-icon>
            <p>{{ $t('noDashboardData') }}</p>
          </div>

          <div v-else class="chart-wrap">
            <Line v-if="showLineChart" :data="chartData" :options="chartOptions" />
            <Bar v-else :data="chartData" :options="chartOptions" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, ref, watch } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Bar } from 'vue-chartjs'
import TopBar from '../components/TopBar.vue'
import PosDateInput from '../components/PosDateInput.vue'
import DashboardService from '../services/DashboardService'
import ItemService from '../services/ItemService'
import { useState } from '../store/state'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const instance = getCurrentInstance()
const state = useState()
const $t = (key) => instance?.appContext?.config?.globalProperties?.$t?.(key) ?? key

const loading = ref(false)
const period = ref('daily')
const chartType = ref('line')
const viewMode = ref('revenue')
const totalRevenue = ref(0)
const revenueSeries = ref([])
const topSoldItems = ref([])
const items = ref([])

const filters = ref({
  fromDate: '',
  toDate: '',
  itemId: null,
  type: null
})

const lang = computed(() => ({ dir: state.dir, lang: state.lang }))

const periodOptions = [
  { id: 'daily', labelKey: 'periodDaily', granularity: 'HOURLY' },
  { id: 'monthly', labelKey: 'periodMonthly', granularity: 'DAILY' },
  { id: 'yearly', labelKey: 'periodYearly', granularity: 'MONTHLY' }
]

const typeOptions = computed(() => [
  { label: $t('receipts'), value: 'RECEIPT' },
  { label: $t('drafts'), value: 'DRAFT' }
])

const itemOptions = computed(() =>
  items.value.map((item) => ({
    value: item.id,
    label: state.lang === 'ar' ? item.nameAr : item.nameEn
  }))
)

const granularity = computed(() => {
  const match = periodOptions.find((option) => option.id === period.value)
  return match?.granularity ?? 'HOURLY'
})

const showLineChart = computed(() => viewMode.value === 'revenue' && chartType.value === 'line')

const isChartEmpty = computed(() => {
  if (viewMode.value === 'topItems') {
    return topSoldItems.value.length === 0
  }
  return revenueSeries.value.every((point) => Number(point.revenue) === 0)
})

function toIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function setDefaultDatesForPeriod(periodId) {
  const now = new Date()
  if (periodId === 'daily') {
    const today = toIsoDate(now)
    filters.value.fromDate = today
    filters.value.toDate = today
    return
  }
  if (periodId === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    filters.value.fromDate = toIsoDate(start)
    filters.value.toDate = toIsoDate(end)
    return
  }
  const year = now.getFullYear()
  filters.value.fromDate = `${year}-01-01`
  filters.value.toDate = `${year}-12-31`
}

function setPeriod(periodId) {
  period.value = periodId
  setDefaultDatesForPeriod(periodId)
  loadDashboard()
}

function setRevenueLineChart() {
  viewMode.value = 'revenue'
  chartType.value = 'line'
}

function setRevenueBarChart() {
  viewMode.value = 'revenue'
  chartType.value = 'bar'
}

function formatMoney(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0.00'
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function itemLabel(item) {
  return state.lang === 'ar' ? item.itemNameAr || item.itemNameEn : item.itemNameEn || item.itemNameAr
}

const chartData = computed(() => {
  if (viewMode.value === 'topItems') {
    return {
      labels: topSoldItems.value.map((item) => itemLabel(item)),
      datasets: [
        {
          label: $t('quantitySold'),
          data: topSoldItems.value.map((item) => item.quantitySold ?? 0),
          backgroundColor: 'rgba(44, 140, 242, 0.75)',
          borderColor: '#2c8cf2',
          borderWidth: 1.5,
          borderRadius: 8,
          maxBarThickness: 48
        }
      ]
    }
  }

  return {
    labels: revenueSeries.value.map((point) => point.label),
    datasets: [
      {
        label: $t('revenue'),
        data: revenueSeries.value.map((point) => Number(point.revenue) || 0),
        borderColor: '#2c8cf2',
        backgroundColor: chartType.value === 'line' ? 'rgba(44, 140, 242, 0.15)' : 'rgba(44, 140, 242, 0.72)',
        pointBackgroundColor: '#197783',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: chartType.value === 'line' ? 4 : 0,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: chartType.value === 'line',
        borderWidth: 2.5,
        borderRadius: chartType.value === 'bar' ? 8 : 0,
        maxBarThickness: 42
      }
    ]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false
  },
  plugins: {
    legend: {
      display: true,
      labels: {
        color: '#334155',
        font: { family: 'inherit', size: 12, weight: '600' },
        usePointStyle: true
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      titleFont: { family: 'inherit', size: 13, weight: '700' },
      bodyFont: { family: 'inherit', size: 12 },
      padding: 12,
      cornerRadius: 10,
      callbacks: {
        label(context) {
          if (viewMode.value === 'topItems') {
            return `${$t('quantitySold')}: ${context.parsed.y}`
          }
          return `${$t('revenue')}: $${formatMoney(context.parsed.y)}`
        }
      }
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(25, 119, 131, 0.08)' },
      ticks: {
        color: '#64748b',
        font: { family: 'inherit', size: 11 },
        maxRotation: viewMode.value === 'topItems' ? 35 : 0,
        autoSkip: true,
        maxTicksLimit: viewMode.value === 'topItems' ? 12 : 24
      }
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(25, 119, 131, 0.1)' },
      ticks: {
        color: '#64748b',
        font: { family: 'inherit', size: 11 },
        callback(value) {
          if (viewMode.value === 'topItems') return value
          return `$${formatMoney(value)}`
        }
      }
    }
  }
}))

async function loadItems() {
  try {
    const response = await ItemService.getUserItems()
    items.value = response?.data?.data ?? []
  } catch {
    items.value = []
  }
}

async function loadDashboard() {
  loading.value = true
  try {
    const response = await DashboardService.getDashboardData({
      fromDate: filters.value.fromDate || undefined,
      toDate: filters.value.toDate || undefined,
      itemId: filters.value.itemId || undefined,
      type: filters.value.type || undefined,
      granularity: granularity.value
    })
    const data = response?.data?.data ?? {}
    revenueSeries.value = data.revenueSeries ?? []
    topSoldItems.value = data.topSoldItems ?? []
    totalRevenue.value = Number(data.totalRevenue) || 0
  } catch {
    revenueSeries.value = []
    topSoldItems.value = []
    totalRevenue.value = 0
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.value.itemId = null
  filters.value.type = null
  setDefaultDatesForPeriod(period.value)
  loadDashboard()
}

watch(viewMode, (mode) => {
  if (mode === 'topItems') {
    chartType.value = 'bar'
  }
})

onMounted(async () => {
  setDefaultDatesForPeriod(period.value)
  await loadItems()
  await loadDashboard()
})
</script>

<style scoped>
.page-background {
  position: relative;
  background:
    radial-gradient(ellipse 80% 50% at 10% -10%, rgba(50, 216, 238, 0.14), transparent 55%),
    radial-gradient(ellipse 60% 40% at 95% 5%, rgba(44, 140, 242, 0.1), transparent 50%),
    linear-gradient(180deg, #eef4f8 0%, #f4f7fb 45%, #f0f4f8 100%);
  min-height: 100vh;
  overflow-x: hidden;
}

.page-decor {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.decor-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.45;
}

.decor-orb--1 {
  width: 280px;
  height: 280px;
  top: 8%;
  inset-inline-start: -4%;
  background: rgba(25, 119, 131, 0.18);
}

.decor-orb--2 {
  width: 220px;
  height: 220px;
  top: 22%;
  inset-inline-end: -2%;
  background: rgba(44, 140, 242, 0.14);
}

.decor-orb--3 {
  width: 180px;
  height: 180px;
  bottom: 12%;
  inset-inline-start: 35%;
  background: rgba(50, 216, 238, 0.12);
  animation: float-orb 12s ease-in-out infinite;
}

.decor-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(25, 119, 131, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(25, 119, 131, 0.04) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 30%, #000 20%, transparent 75%);
}

@keyframes float-orb {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-18px) scale(1.05); }
}

.dashboard-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 45px);
  padding: 1rem 1.25rem 1.5rem;
  box-sizing: border-box;
  gap: 1rem;
}

.hero-panel {
  padding: 1.1rem 1.15rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 8px 32px rgba(25, 119, 131, 0.08);
  backdrop-filter: blur(16px);
}

.dashboard-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.dashboard-title {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-size: 1.45rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.02em;
}

.dashboard-subtitle {
  margin: 0.35rem 0 0;
  color: #64748b;
  font-size: 0.92rem;
}

.title-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #156570, #197783 45%, #32d8ee);
  color: #fff;
  box-shadow:
    0 6px 20px rgba(25, 119, 131, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.2) inset;
}

.header-stats {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(44, 140, 242, 0.15);
  color: #334155;
  font-size: 0.82rem;
}

.stat-pill--glow {
  box-shadow: 0 4px 16px rgba(44, 140, 242, 0.12);
}

.stat-pill-value {
  font-weight: 800;
  color: #0f172a;
}

.stat-pill-label {
  color: #64748b;
}

.filters-panel,
.controls-panel,
.chart-section {
  width: 100%;
}

.receipts-filter-card {
  padding: 1rem 1.1rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 8px 28px rgba(25, 119, 131, 0.07);
  backdrop-filter: blur(12px);
}

.filter-fields {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.85rem;
}

.filter-field-block {
  min-width: 0;
}

.filter-label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: #475569;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.filter-select :deep(.v-field) {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
}

.filter-actions {
  display: flex;
  gap: 0.65rem;
  margin-top: 1rem;
}

.filter-actions--en {
  justify-content: flex-end;
}

.filter-actions--ar {
  justify-content: flex-start;
  flex-direction: row-reverse;
}

.apply-btn {
  background: linear-gradient(135deg, #2c8cf2, #197783) !important;
  color: #fff !important;
  border-radius: 12px !important;
  text-transform: none;
  font-weight: 700;
  letter-spacing: 0;
}

.reset-btn {
  border-radius: 12px !important;
  text-transform: none;
  font-weight: 600;
  color: #475569 !important;
}

.controls-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.period-toggle {
  display: inline-flex;
  padding: 0.25rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(44, 140, 242, 0.12);
  box-shadow: 0 4px 16px rgba(25, 119, 131, 0.06);
}

.period-btn {
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 0.88rem;
  font-weight: 600;
  padding: 0.55rem 1rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.period-btn.active {
  background: linear-gradient(135deg, #2c8cf2, #197783);
  color: #fff;
  box-shadow: 0 4px 14px rgba(44, 140, 242, 0.28);
}

.view-controls {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.chart-type-toggle {
  display: inline-flex;
  padding: 0.2rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(44, 140, 242, 0.12);
}

.icon-toggle-btn,
.top-items-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: none;
  background: transparent;
  color: #64748b;
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.86rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.icon-toggle-btn.active,
.top-items-btn.active {
  background: rgba(44, 140, 242, 0.12);
  color: #2c8cf2;
}

.top-items-btn {
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(44, 140, 242, 0.12);
}

.top-items-btn.active {
  background: linear-gradient(135deg, rgba(44, 140, 242, 0.14), rgba(25, 119, 131, 0.12));
  border-color: rgba(44, 140, 242, 0.25);
}

.chart-card {
  padding: 1.1rem 1.15rem 1.25rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 10px 36px rgba(25, 119, 131, 0.08);
  backdrop-filter: blur(14px);
  min-height: 420px;
  display: flex;
  flex-direction: column;
}

.chart-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.chart-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
}

.chart-title-icon {
  color: #2c8cf2;
}

.refresh-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(44, 140, 242, 0.15);
  background: rgba(255, 255, 255, 0.85);
  color: #2c8cf2;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, background 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(44, 140, 242, 0.08);
}

.refresh-btn--spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.chart-wrap {
  flex: 1;
  min-height: 340px;
  position: relative;
}

.chart-loading,
.chart-empty {
  flex: 1;
  min-height: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: #64748b;
}

.chart-empty-icon {
  opacity: 0.55;
}

@media (max-width: 960px) {
  .filter-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .filter-fields {
    grid-template-columns: 1fr;
  }

  .controls-panel {
    flex-direction: column;
    align-items: stretch;
  }

  .period-toggle,
  .view-controls {
    width: 100%;
    justify-content: center;
  }
}
</style>
