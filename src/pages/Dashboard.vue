<template>
  <div class="dashboard-page">
    <div class="dash-atmosphere" aria-hidden="true" />
    <TopBar />

    <div class="dashboard-shell" :dir="lang.dir">
      <header class="dash-header">
        <div class="dash-header__copy">
          <h1 class="dash-header__title">
            <span class="dash-header__icon">
              <v-icon size="22">mdi-chart-timeline-variant</v-icon>
            </span>
            {{ $t('dashboard') }}
          </h1>
          <p class="dash-header__subtitle">{{ $t('dashboardSubtitle') }}</p>
          <span class="dash-header__badge">{{ $t('closedReceiptsOnly') }}</span>
        </div>

        <div class="period-rail" role="tablist">
          <button
            v-for="option in periodOptions"
            :key="option.id"
            type="button"
            class="period-rail__btn"
            :class="{ 'period-rail__btn--on': period === option.id }"
            @click="setPeriod(option.id)"
          >
            {{ $t(option.labelKey) }}
          </button>
        </div>
      </header>

      <div class="kpi-row">
        <article class="kpi kpi--income">
          <span class="kpi__label">{{ $t('totalRevenue') }}</span>
          <strong class="kpi__value" dir="ltr">{{ loading ? '—' : formatDisplay(totalIncome) }}</strong>
        </article>
        <article class="kpi kpi--peak">
          <span class="kpi__label">{{ $t('peakRevenue') }}</span>
          <strong class="kpi__value" dir="ltr">{{ loading ? '—' : formatDisplay(peakIncome) }}</strong>
        </article>
        <article class="kpi kpi--units">
          <span class="kpi__label">{{ $t('unitsSoldShort') }}</span>
          <strong class="kpi__value">{{ loading ? '—' : totalUnitsSold }}</strong>
        </article>
        <article class="kpi kpi--items">
          <span class="kpi__label">{{ $t('items') }}</span>
          <strong class="kpi__value">{{ loading ? '—' : topSoldItems.length }}</strong>
        </article>
        <article class="kpi kpi--cats">
          <span class="kpi__label">{{ $t('mostSoldCategories') }}</span>
          <strong class="kpi__value">{{ loading ? '—' : topSoldCategories.length }}</strong>
        </article>
      </div>

      <section class="filter-strip">
        <div class="filter-strip__grid">
          <div class="filter-strip__field">
            <label class="filter-strip__label">{{ $t('fromDate') }}</label>
            <PosDateInput v-model="filters.fromDate" :placeholder="$t('selectDatePlaceholder')" />
          </div>
          <div class="filter-strip__field">
            <label class="filter-strip__label">{{ $t('toDate') }}</label>
            <PosDateInput v-model="filters.toDate" :placeholder="$t('selectDatePlaceholder')" />
          </div>
          <div class="filter-strip__field">
            <PosAutocomplete
              v-model="filters.categoryId"
              :label="$t('category')"
              :placeholder="$t('searchCategory')"
              :items="categoryOptions"
              item-title="label"
              item-value="value"
              :loading="categoryLoading"
              :no-data-text="$t('noAutocompleteResults')"
              clearable
              @update:search="onCategorySearch"
            />
          </div>
          <div class="filter-strip__field">
            <PosAutocomplete
              v-model="filters.itemId"
              :label="$t('items')"
              :placeholder="$t('searchItem')"
              :items="itemOptions"
              item-title="label"
              item-value="value"
              :loading="itemLoading"
              :no-data-text="$t('noAutocompleteResults')"
              clearable
              @update:search="onItemSearch"
            />
          </div>
        </div>
        <div class="filter-strip__actions" :class="state.lang === 'ar' ? 'is-ar' : 'is-en'">
          <button type="button" class="btn-ghost" @click="resetFilters">{{ $t('reset') }}</button>
          <button type="button" class="btn-solid" :disabled="loading" @click="loadDashboard">
            <v-icon size="16">mdi-magnify</v-icon>
            {{ loading ? $t('searching') : $t('applyFilters') }}
          </button>
        </div>
      </section>

      <div class="workspace">
        <section class="chart-panel">
          <div class="panel-head">
            <h2 class="panel-title">
              <v-icon size="18">mdi-finance</v-icon>
              {{ $t('revenueChart') }}
            </h2>
            <div class="panel-tools">
              <div class="seg">
                <button
                  type="button"
                  class="seg__btn"
                  :class="{ 'seg__btn--on': chartType === 'line' }"
                  :title="$t('lineChart')"
                  @click="chartType = 'line'"
                >
                  <v-icon size="16">mdi-chart-line</v-icon>
                </button>
                <button
                  type="button"
                  class="seg__btn"
                  :class="{ 'seg__btn--on': chartType === 'bar' }"
                  :title="$t('barChart')"
                  @click="chartType = 'bar'"
                >
                  <v-icon size="16">mdi-chart-bar</v-icon>
                </button>
              </div>
              <button
                type="button"
                class="icon-btn"
                :class="{ 'icon-btn--spin': loading }"
                :disabled="loading"
                @click="loadDashboard"
              >
                <v-icon size="17">mdi-refresh</v-icon>
              </button>
            </div>
          </div>

          <div class="chart-panel__body">
            <div v-if="loading" class="state-box">
              <div class="pulse-bars">
                <span v-for="n in 7" :key="n" :style="{ '--h': `${28 + (n % 4) * 16}%` }" />
              </div>
              <span>{{ $t('loadingDashboard') }}</span>
            </div>
            <div v-else-if="isChartEmpty" class="state-box">
              <v-icon size="40" color="#9db5c0">mdi-chart-box-outline</v-icon>
              <span>{{ $t('noDashboardData') }}</span>
            </div>
            <div v-else class="chart-canvas">
              <Line v-if="chartType === 'line'" :data="chartData" :options="chartOptions" />
              <Bar v-else :data="chartData" :options="chartOptions" />
            </div>
          </div>
        </section>

        <aside class="sold-panel">
          <div class="panel-head panel-head--sold">
            <h2 class="panel-title">
              <v-icon size="18">mdi-trophy-outline</v-icon>
              {{ $t('mostSoldItems') }}
            </h2>
          </div>

          <div class="sold-toggle">
            <span class="sold-toggle__hint">{{ $t('topSoldBy') }}</span>
            <div class="seg seg--wide">
              <button
                type="button"
                class="seg__btn"
                :class="{ 'seg__btn--on': soldMode === 'items' }"
                @click="soldMode = 'items'"
              >
                <v-icon size="15">mdi-package-variant</v-icon>
                {{ $t('mostSoldItemsTab') }}
              </button>
              <button
                type="button"
                class="seg__btn"
                :class="{ 'seg__btn--on': soldMode === 'categories' }"
                @click="soldMode = 'categories'"
              >
                <v-icon size="15">mdi-shape-outline</v-icon>
                {{ $t('mostSoldCategories') }}
              </button>
            </div>
          </div>

          <div v-if="loading" class="state-box state-box--sm">
            <span>{{ $t('loadingDashboard') }}</span>
          </div>
          <div v-else-if="leaderboardRows.length === 0" class="state-box state-box--sm">
            <v-icon size="28" color="#9db5c0">mdi-inbox-outline</v-icon>
            <span>{{ $t('noDashboardData') }}</span>
          </div>
          <ul v-else class="sold-list">
            <li
              v-for="(row, index) in leaderboardRows"
              :key="row.id ?? index"
              class="sold-card"
              :class="`sold-card--${index + 1}`"
            >
              <span class="sold-card__rank">{{ index + 1 }}</span>
              <div class="sold-card__body">
                <span class="sold-card__name">{{ row.name }}</span>
                <span class="sold-card__meta">{{ row.qty }}× · {{ formatDisplay(row.amount) }}</span>
              </div>
              <div class="sold-card__dual" dir="ltr">
                <span>${{ formatUsd(row.usd) }}</span>
                <span>{{ formatLbp(row.lbp) }}</span>
              </div>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
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
import PosAutocomplete from '../components/PosAutocomplete.vue'
import DashboardService from '../services/DashboardService'
import CategoryService from '../services/CategoryService'
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
const categoryLoading = ref(false)
const itemLoading = ref(false)
const period = ref('daily')
const chartType = ref('line')
const soldMode = ref('items')

const totalRevenueUsd = ref(0)
const totalRevenueLbp = ref(0)
const revenueSeries = ref([])
const topSoldItems = ref([])
const topSoldCategories = ref([])
const categoryOptions = ref([])
const itemOptions = ref([])

const filters = ref({
  fromDate: '',
  toDate: '',
  categoryId: null,
  itemId: null
})

const lang = computed(() => ({ dir: state.dir, lang: state.lang }))
const isUsd = computed(() => state.currency === 'USD')

const periodOptions = [
  { id: 'daily', labelKey: 'periodDaily', granularity: 'HOURLY' },
  { id: 'monthly', labelKey: 'periodMonthly', granularity: 'DAILY' },
  { id: 'yearly', labelKey: 'periodYearly', granularity: 'MONTHLY' }
]

const granularity = computed(() => {
  const match = periodOptions.find((option) => option.id === period.value)
  return match?.granularity ?? 'HOURLY'
})

const totalIncome = computed(() =>
  isUsd.value ? totalRevenueUsd.value : totalRevenueLbp.value
)

const peakIncome = computed(() => {
  const values = revenueSeries.value.map((p) =>
    Number(isUsd.value ? p.revenueUsd ?? p.revenue : p.revenueLbp) || 0
  )
  return values.length ? Math.max(...values) : 0
})

const totalUnitsSold = computed(() =>
  topSoldItems.value.reduce((sum, item) => sum + (item.quantitySold ?? 0), 0)
)

const isChartEmpty = computed(() =>
  revenueSeries.value.every((p) => Number(p.revenueUsd ?? p.revenue) === 0)
)

const leaderboardRows = computed(() => {
  if (soldMode.value === 'categories') {
    return topSoldCategories.value.slice(0, 8).map((c) => ({
      id: c.categoryId,
      name: state.lang === 'ar'
        ? (c.categoryNameAr || c.categoryNameEn)
        : (c.categoryNameEn || c.categoryNameAr),
      qty: c.quantitySold ?? 0,
      usd: Number(c.revenueUsd) || 0,
      lbp: Number(c.revenueLbp) || 0,
      amount: isUsd.value ? Number(c.revenueUsd) || 0 : Number(c.revenueLbp) || 0
    }))
  }
  return topSoldItems.value.slice(0, 8).map((item) => ({
    id: item.itemId,
    name: state.lang === 'ar'
      ? (item.itemNameAr || item.itemNameEn)
      : (item.itemNameEn || item.itemNameAr),
    qty: item.quantitySold ?? 0,
    usd: Number(item.revenueUsd ?? item.revenue) || 0,
    lbp: Number(item.revenueLbp) || 0,
    amount: isUsd.value
      ? Number(item.revenueUsd ?? item.revenue) || 0
      : Number(item.revenueLbp) || 0
  }))
})

function formatUsd(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0.00'
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatLbp(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0 LBP'
  return `${Math.round(num).toLocaleString('en-US')} LBP`
}

function formatDisplay(value) {
  if (isUsd.value) return `$${formatUsd(value)}`
  return formatLbp(value)
}

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
    filters.value.fromDate = toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1))
    filters.value.toDate = toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0))
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

function mapCategoryOptions(list) {
  return (list || []).map((c) => ({
    value: c.id,
    label: state.lang === 'ar' ? c.nameAr : c.nameEn
  }))
}

function mapItemOptions(list) {
  return (list || []).map((item) => ({
    value: item.id,
    label: state.lang === 'ar' ? item.nameAr : item.nameEn
  }))
}

let categorySearchTimer = null
let itemSearchTimer = null

async function fetchCategories(query = '') {
  categoryLoading.value = true
  try {
    const res = await CategoryService.searchCategories(query)
    categoryOptions.value = mapCategoryOptions(res?.data?.data)
  } catch {
    categoryOptions.value = []
  } finally {
    categoryLoading.value = false
  }
}

async function fetchItems(query = '') {
  itemLoading.value = true
  try {
    const res = await ItemService.searchItems(query)
    itemOptions.value = mapItemOptions(res?.data?.data)
  } catch {
    itemOptions.value = []
  } finally {
    itemLoading.value = false
  }
}

function onCategorySearch(query) {
  clearTimeout(categorySearchTimer)
  categorySearchTimer = setTimeout(() => fetchCategories(query), 220)
}

function onItemSearch(query) {
  clearTimeout(itemSearchTimer)
  itemSearchTimer = setTimeout(() => fetchItems(query), 220)
}

const chartData = computed(() => ({
  labels: revenueSeries.value.map((p) => p.label),
  datasets: [
    {
      label: $t('revenue'),
      data: revenueSeries.value.map((p) =>
        Number(isUsd.value ? (p.revenueUsd ?? p.revenue) : p.revenueLbp) || 0
      ),
      borderColor: '#4a9eab',
      backgroundColor: chartType.value === 'line'
        ? (ctx) => {
            const { chart } = ctx
            const { ctx: c, chartArea } = chart
            if (!chartArea) return 'rgba(74, 158, 171, 0.12)'
            const g = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
            g.addColorStop(0, 'rgba(74, 158, 171, 0.02)')
            g.addColorStop(1, 'rgba(74, 158, 171, 0.18)')
            return g
          }
        : 'rgba(74, 158, 171, 0.55)',
      pointBackgroundColor: '#197783',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: chartType.value === 'line' ? 3.5 : 0,
      pointHoverRadius: 6,
      tension: 0.4,
      fill: chartType.value === 'line',
      borderWidth: 2.2,
      borderRadius: 6,
      maxBarThickness: 36
    }
  ]
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      displayColors: false,
      backgroundColor: 'rgba(255, 255, 255, 0.97)',
      titleColor: '#334155',
      bodyColor: '#475569',
      borderColor: 'rgba(25, 119, 131, 0.18)',
      borderWidth: 1,
      padding: { top: 14, bottom: 14, left: 16, right: 16 },
      cornerRadius: 12,
      titleFont: { size: 15, weight: '700', family: 'inherit' },
      bodyFont: { size: 14, weight: '600', family: 'inherit' },
      bodySpacing: 8,
      caretPadding: 8,
      boxPadding: 0,
      callbacks: {
        title(items) {
          return items[0]?.label || ''
        },
        label(context) {
          const point = revenueSeries.value[context.dataIndex] || {}
          const usd = Number(point.revenueUsd ?? point.revenue) || 0
          const lbp = Number(point.revenueLbp) || 0
          return [
            `${$t('incomeUsd')}: $${formatUsd(usd)}`,
            `${$t('incomeLbp')}: ${formatLbp(lbp)}`
          ]
        }
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: '#94a3b8', font: { size: 11, family: 'inherit' }, maxTicksLimit: 24 }
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(148, 163, 184, 0.15)' },
      border: { display: false },
      ticks: {
        color: '#94a3b8',
        font: { size: 11, family: 'inherit' },
        callback(value) {
          return isUsd.value ? `$${formatUsd(value)}` : formatLbp(value)
        }
      }
    }
  }
}))

async function loadDashboard() {
  loading.value = true
  try {
    const response = await DashboardService.getDashboardData({
      fromDate: filters.value.fromDate || undefined,
      toDate: filters.value.toDate || undefined,
      itemId: filters.value.itemId || undefined,
      categoryId: filters.value.categoryId || undefined,
      granularity: granularity.value
    })
    const data = response?.data?.data ?? {}
    revenueSeries.value = data.revenueSeries ?? []
    topSoldItems.value = data.topSoldItems ?? []
    topSoldCategories.value = data.topSoldCategories ?? []
    totalRevenueUsd.value = Number(data.totalRevenueUsd ?? data.totalRevenue) || 0
    totalRevenueLbp.value = Number(data.totalRevenueLbp) || 0
  } catch {
    revenueSeries.value = []
    topSoldItems.value = []
    topSoldCategories.value = []
    totalRevenueUsd.value = 0
    totalRevenueLbp.value = 0
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.value.categoryId = null
  filters.value.itemId = null
  setDefaultDatesForPeriod(period.value)
  fetchCategories('')
  fetchItems('')
  loadDashboard()
}

onMounted(async () => {
  setDefaultDatesForPeriod(period.value)
  if (!state.exchangeRate) await state.fetchDollarRate()
  await Promise.all([fetchCategories(''), fetchItems('')])
  await loadDashboard()
})
</script>

<style scoped>
.dashboard-page {
  position: relative;
  min-height: 100vh;
  background: #f3f6f9;
  overflow-x: hidden;
}

.dash-atmosphere {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(ellipse 70% 45% at 12% -5%, rgba(74, 158, 171, 0.09), transparent 55%),
    radial-gradient(ellipse 50% 40% at 90% 0%, rgba(44, 140, 242, 0.05), transparent 50%);
}

.dashboard-shell {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-height: calc(100vh - 45px);
  padding: 1rem 1.25rem 1.5rem;
  max-width: min(1280px, 100%);
  margin: 0 auto;
  box-sizing: border-box;
}

.dash-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.85rem 0.15rem 0.25rem;
}

.dash-header__title {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0;
  font-size: 1.35rem;
  font-weight: 750;
  color: #2c3e50;
  letter-spacing: -0.02em;
}

.dash-header__icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(25, 119, 131, 0.1);
  color: #197783;
}

.dash-header__subtitle {
  margin: 0.3rem 0 0;
  padding-inline-start: 2.85rem;
  font-size: 0.84rem;
  color: #8a9aab;
  line-height: 1.4;
}

.dash-header__badge {
  display: inline-block;
  margin-top: 0.45rem;
  margin-inline-start: 2.85rem;
  padding: 0.18rem 0.55rem;
  border-radius: 6px;
  font-size: 0.68rem;
  font-weight: 650;
  color: #5a8f97;
  background: rgba(25, 119, 131, 0.07);
  border: 1px solid rgba(25, 119, 131, 0.12);
}

.period-rail {
  display: inline-flex;
  gap: 0.2rem;
  padding: 0.22rem;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e4ebf1;
}

.period-rail__btn {
  border: none;
  background: transparent;
  color: #8a9aab;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}

.period-rail__btn--on {
  background: rgba(25, 119, 131, 0.12);
  color: #197783;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.6rem;
}

.kpi {
  padding: 0.8rem 0.9rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid #e6edf3;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.kpi__label {
  font-size: 0.68rem;
  font-weight: 700;
  color: #9aabba;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.kpi__value {
  font-size: 1.05rem;
  font-weight: 750;
  color: #334155;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kpi--income { border-inline-start: 3px solid rgba(25, 119, 131, 0.45); }
.kpi--peak { border-inline-start: 3px solid rgba(74, 158, 171, 0.55); }
.kpi--units { border-inline-start: 3px solid rgba(100, 180, 190, 0.55); }
.kpi--items { border-inline-start: 3px solid rgba(44, 140, 242, 0.35); }
.kpi--cats { border-inline-start: 3px solid rgba(232, 180, 90, 0.55); }

.filter-strip {
  padding: 0.85rem 1rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e6edf3;
}

.filter-strip__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.7rem;
}

.filter-strip__label {
  display: block;
  margin-bottom: 0.3rem;
  font-size: 0.68rem;
  font-weight: 700;
  color: #9aabba;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.filter-strip__actions {
  display: flex;
  gap: 0.55rem;
  margin-top: 0.75rem;
}

.filter-strip__actions.is-en { justify-content: flex-end; }
.filter-strip__actions.is-ar { justify-content: flex-start; flex-direction: row-reverse; }

.btn-ghost,
.btn-solid {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.48rem 0.95rem;
  border-radius: 10px;
  font-size: 0.84rem;
  font-weight: 650;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s;
}

.btn-ghost {
  background: rgba(25, 119, 131, 0.05);
  border-color: rgba(25, 119, 131, 0.2);
  color: #197783;
}

.btn-solid {
  background: #197783;
  color: #fff;
}

.btn-solid:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.workspace {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 0.85rem;
  flex: 1;
  min-height: 0;
}

.chart-panel,
.sold-panel {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e6edf3;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  min-height: 430px;
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  padding: 0.75rem 0.95rem;
  border-bottom: 1px solid #eef2f6;
  background: #fafcfd;
}

.panel-head--sold {
  justify-content: flex-start;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: #3d4f5f;
}

.panel-title .v-icon {
  color: #5a9aa3;
}

.panel-tools {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.seg {
  display: inline-flex;
  gap: 0.12rem;
  padding: 0.18rem;
  border-radius: 9px;
  background: #f0f4f7;
  border: 1px solid #e4ebf1;
}

.seg--wide {
  width: 100%;
}

.seg--wide .seg__btn {
  flex: 1;
  justify-content: center;
}

.seg__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  border: none;
  background: transparent;
  color: #8a9aab;
  padding: 0.35rem 0.55rem;
  border-radius: 7px;
  cursor: pointer;
  font-size: 0.76rem;
  font-weight: 600;
  font-family: inherit;
  white-space: nowrap;
}

.seg__btn--on {
  background: #fff;
  color: #197783;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

.icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid #e4ebf1;
  background: #fff;
  color: #5a9aa3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.icon-btn--spin .v-icon {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.chart-panel__body {
  flex: 1;
  padding: 0.85rem;
  min-height: 340px;
  display: flex;
  flex-direction: column;
}

.chart-canvas {
  flex: 1;
  min-height: 320px;
  position: relative;
}

.state-box {
  flex: 1;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  color: #9aabba;
  font-size: 0.88rem;
}

.state-box--sm {
  min-height: 160px;
}

.pulse-bars {
  display: flex;
  align-items: flex-end;
  gap: 0.4rem;
  height: 90px;
  width: min(100%, 280px);
}

.pulse-bars span {
  flex: 1;
  height: var(--h, 40%);
  border-radius: 5px 5px 2px 2px;
  background: rgba(74, 158, 171, 0.18);
  animation: pulse 1.3s ease-in-out infinite;
}

.pulse-bars span:nth-child(odd) { animation-delay: 0.15s; }

@keyframes pulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 1; }
}

.sold-toggle {
  padding: 0.7rem 0.85rem 0.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.sold-toggle__hint {
  font-size: 0.68rem;
  font-weight: 700;
  color: #9aabba;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.sold-list {
  list-style: none;
  margin: 0;
  padding: 0.5rem 0.7rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  overflow-y: auto;
  flex: 1;
}

.sold-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.65rem;
  border-radius: 11px;
  background: #f7fafc;
  border: 1px solid #eef2f6;
}

.sold-card__rank {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 800;
  background: #e4ebf1;
  color: #7a8fa3;
  flex-shrink: 0;
}

.sold-card--1 .sold-card__rank {
  background: rgba(232, 180, 90, 0.35);
  color: #9a6b14;
}

.sold-card--2 .sold-card__rank {
  background: rgba(148, 163, 184, 0.35);
  color: #64748b;
}

.sold-card--3 .sold-card__rank {
  background: rgba(25, 119, 131, 0.15);
  color: #197783;
}

.sold-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.sold-card__name {
  font-size: 0.8rem;
  font-weight: 700;
  color: #3d4f5f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sold-card__meta {
  font-size: 0.7rem;
  color: #9aabba;
  font-weight: 500;
}

.sold-card__dual {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.08rem;
  font-size: 0.66rem;
  font-weight: 650;
  color: #5a8f97;
  flex-shrink: 0;
}

@media (max-width: 1100px) {
  .kpi-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .workspace {
    grid-template-columns: 1fr;
  }
  .sold-panel {
    min-height: auto;
  }
}

@media (max-width: 720px) {
  .kpi-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .filter-strip__grid {
    grid-template-columns: 1fr;
  }
  .dash-header {
    flex-direction: column;
    align-items: stretch;
  }
  .period-rail {
    width: 100%;
  }
  .period-rail__btn {
    flex: 1;
  }
}
</style>
