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
      </div>

      <!-- Selection insight cards (visible when an item/category filter is applied) -->
      <div v-if="selectionInsights.length" class="select-strip">
        <article
          v-for="insight in selectionInsights"
          :key="insight.key"
          class="select-card"
        >
          <div class="select-card__head">
            <span class="select-card__badge">
              <v-icon size="15">{{ insight.icon }}</v-icon>
              {{ insight.typeLabel }}
            </span>
            <strong class="select-card__name">{{ insight.name }}</strong>
          </div>
          <div class="select-card__stats">
            <div class="select-card__stat">
              <span>{{ $t('unitsSoldOfSelection') }}</span>
              <strong>{{ insight.qty }}</strong>
            </div>
            <div class="select-card__stat">
              <span>{{ $t('revenueOfSelection') }}</span>
              <strong dir="ltr">{{ formatDisplay(insight.amount) }}</strong>
            </div>
            <div class="select-card__dual" dir="ltr">
              <span>${{ formatUsd(insight.usd) }}</span>
              <span>{{ formatLbp(insight.lbp) }}</span>
            </div>
          </div>
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
          <template v-if="state.lang === 'ar'">
            <button type="button" class="btn-solid" :disabled="loading" @click="loadDashboard">
              <v-icon size="16">mdi-magnify</v-icon>
              {{ loading ? $t('searching') : $t('search') }}
            </button>
            <button type="button" class="btn-ghost" @click="resetFilters">{{ $t('reset') }}</button>
          </template>
          <template v-else>
            <button type="button" class="btn-ghost" @click="resetFilters">{{ $t('reset') }}</button>
            <button type="button" class="btn-solid" :disabled="loading" @click="loadDashboard">
              <v-icon size="16">mdi-magnify</v-icon>
              {{ loading ? $t('searching') : $t('search') }}
            </button>
          </template>
        </div>
      </section>

      <!-- Scenario switcher -->
      <div class="scenario-tabs" role="tablist">
        <button
          type="button"
          class="scenario-tab"
          :class="{ 'scenario-tab--on': scenario === 'revenue' }"
          @click="scenario = 'revenue'"
        >
          <v-icon size="17">mdi-finance</v-icon>
          {{ $t('scenarioRevenue') }}
        </button>
        <button
          type="button"
          class="scenario-tab"
          :class="{ 'scenario-tab--on': scenario === 'sold' }"
          @click="scenario = 'sold'"
        >
          <v-icon size="17">mdi-trophy-outline</v-icon>
          {{ $t('scenarioTopSold') }}
        </button>
      </div>

      <section class="chart-panel">
        <div class="panel-head">
          <h2 class="panel-title">
            <v-icon size="18">{{ scenario === 'revenue' ? 'mdi-finance' : 'mdi-trophy-outline' }}</v-icon>
            {{ scenario === 'revenue' ? $t('revenueChart') : $t('mostSoldItems') }}
          </h2>
          <div class="panel-tools">
            <div v-if="scenario === 'sold'" class="seg">
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
          </div>
        </div>

        <div class="chart-panel__body">
          <div v-if="loading" class="state-box">
            <div class="pulse-bars">
              <span v-for="n in 7" :key="n" :style="{ '--h': `${28 + (n % 4) * 16}%` }" />
            </div>
            <span>{{ $t('loadingDashboard') }}</span>
          </div>
          <div v-else-if="isCurrentChartEmpty" class="state-box">
            <v-icon size="40" color="#9db5c0">mdi-chart-box-outline</v-icon>
            <span>{{ $t('noDashboardData') }}</span>
          </div>
          <div v-else class="chart-canvas">
            <template v-if="scenario === 'revenue'">
              <Line v-if="chartType === 'line'" :data="chartData" :options="chartOptions" />
              <Bar v-else :data="chartData" :options="chartOptions" />
            </template>
            <template v-else>
              <Line v-if="chartType === 'line'" :data="soldChartData" :options="soldChartOptions" />
              <Bar v-else :data="soldChartData" :options="soldChartOptions" />
            </template>
          </div>
        </div>
      </section>
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
const scenario = ref('revenue')
const chartType = ref('line')
const soldMode = ref('items')

const totalRevenueUsd = ref(0)
const totalRevenueLbp = ref(0)
const revenueSeries = ref([])
const topSoldItems = ref([])
const topSoldCategories = ref([])
const categoryOptions = ref([])
const itemOptions = ref([])

// Filters actually applied on the last successful load (so insight cards
// never show a selection that has not been searched yet).
const appliedItemId = ref(null)
const appliedCategoryId = ref(null)

const filters = ref({
  fromDate: '',
  toDate: '',
  categoryId: null,
  itemId: null
})

const lang = computed(() => ({ dir: state.dir, lang: state.lang }))
const isUsd = computed(() => state.currency === 'USD')

const periodOptions = [
  { id: 'daily', labelKey: 'periodDaily' },
  { id: 'monthly', labelKey: 'periodMonthly' },
  { id: 'yearly', labelKey: 'periodYearly' }
]

/**
 * Granularity is derived from the selected date range instead of the period
 * button, so any custom gap always produces a renderable series:
 *   - single day        -> hourly buckets
 *   - up to ~3 months   -> daily buckets (covers 2-3 day gaps too)
 *   - anything longer   -> monthly buckets
 */
const granularity = computed(() => {
  const from = filters.value.fromDate ? new Date(filters.value.fromDate) : null
  const to = filters.value.toDate ? new Date(filters.value.toDate) : null
  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return 'HOURLY'
  }
  const dayMs = 24 * 60 * 60 * 1000
  const days = Math.round(Math.abs(to - from) / dayMs) + 1
  if (days <= 1) return 'HOURLY'
  if (days <= 92) return 'DAILY'
  return 'MONTHLY'
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

const isRevenueChartEmpty = computed(() =>
  revenueSeries.value.every((p) => Number(p.revenueUsd ?? p.revenue) === 0)
)

const soldRows = computed(() => {
  if (soldMode.value === 'categories') {
    return topSoldCategories.value.slice(0, 10).map((c) => ({
      id: c.categoryId,
      name: state.lang === 'ar'
        ? (c.categoryNameAr || c.categoryNameEn)
        : (c.categoryNameEn || c.categoryNameAr),
      qty: c.quantitySold ?? 0,
      usd: Number(c.revenueUsd) || 0,
      lbp: Number(c.revenueLbp) || 0
    }))
  }
  return topSoldItems.value.slice(0, 10).map((item) => ({
    id: item.itemId,
    name: state.lang === 'ar'
      ? (item.itemNameAr || item.itemNameEn)
      : (item.itemNameEn || item.itemNameAr),
    qty: item.quantitySold ?? 0,
    usd: Number(item.revenueUsd ?? item.revenue) || 0,
    lbp: Number(item.revenueLbp) || 0
  }))
})

const isCurrentChartEmpty = computed(() =>
  scenario.value === 'revenue' ? isRevenueChartEmpty.value : soldRows.value.length === 0
)

const selectionInsights = computed(() => {
  const insights = []
  if (appliedItemId.value != null) {
    const row = topSoldItems.value.find((i) => Number(i.itemId) === Number(appliedItemId.value))
    insights.push({
      key: `item-${appliedItemId.value}`,
      icon: 'mdi-package-variant',
      typeLabel: $t('selectedItem'),
      name: row
        ? (state.lang === 'ar' ? (row.itemNameAr || row.itemNameEn) : (row.itemNameEn || row.itemNameAr))
        : (itemOptions.value.find((o) => o.value === appliedItemId.value)?.label ?? '—'),
      qty: row?.quantitySold ?? 0,
      usd: Number(row?.revenueUsd) || 0,
      lbp: Number(row?.revenueLbp) || 0,
      amount: isUsd.value ? (Number(row?.revenueUsd) || 0) : (Number(row?.revenueLbp) || 0)
    })
  }
  if (appliedCategoryId.value != null) {
    const row = topSoldCategories.value.find((c) => Number(c.categoryId) === Number(appliedCategoryId.value))
    insights.push({
      key: `cat-${appliedCategoryId.value}`,
      icon: 'mdi-shape-outline',
      typeLabel: $t('selectedCategory'),
      name: row
        ? (state.lang === 'ar' ? (row.categoryNameAr || row.categoryNameEn) : (row.categoryNameEn || row.categoryNameAr))
        : (categoryOptions.value.find((o) => o.value === appliedCategoryId.value)?.label ?? '—'),
      qty: row?.quantitySold ?? 0,
      usd: Number(row?.revenueUsd) || 0,
      lbp: Number(row?.revenueLbp) || 0,
      amount: isUsd.value ? (Number(row?.revenueUsd) || 0) : (Number(row?.revenueLbp) || 0)
    })
  }
  return insights
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

const tealGradient = (ctx) => {
  const { chart } = ctx
  const { ctx: c, chartArea } = chart
  if (!chartArea) return 'rgba(74, 158, 171, 0.12)'
  const g = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
  g.addColorStop(0, 'rgba(74, 158, 171, 0.02)')
  g.addColorStop(1, 'rgba(74, 158, 171, 0.18)')
  return g
}

/* --------------------------- Custom HTML tooltip -------------------------- */

const andWord = computed(() => (state.lang === 'ar' ? 'و' : 'and'))

/**
 * Combined total expressed in the active currency: the USD revenue plus the
 * LBP revenue converted back to USD at the current dollar rate.
 */
function combinedAtRate(usd, lbp) {
  const rate = Number(state.exchangeRate) || 0
  const totalUsd = (Number(usd) || 0) + (rate > 0 ? (Number(lbp) || 0) / rate : 0)
  return isUsd.value ? totalUsd : totalUsd * rate
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]))
}

function tipRow(label, value) {
  return `<div class="dash-tip__row"><span>${escapeHtml(label)}</span><strong dir="ltr">${escapeHtml(value)}</strong></div>`
}

function buildRevenueTipHtml(index) {
  const point = revenueSeries.value[index] || {}
  const usd = Number(point.revenueUsd ?? point.revenue) || 0
  const lbp = Number(point.revenueLbp) || 0
  return (
    `<div class="dash-tip__head">${escapeHtml(point.label || '')}</div>` +
    `<div class="dash-tip__body">` +
    tipRow($t('incomeUsd'), `$${formatUsd(usd)}`) +
    tipRow($t('incomeLbp'), formatLbp(lbp)) +
    `<div class="dash-tip__total">${tipRow($t('totalRevenueAtRate'), formatDisplay(combinedAtRate(usd, lbp)))}</div>` +
    `</div>`
  )
}

function buildSoldTipHtml(index) {
  const row = soldRows.value[index]
  if (!row) return ''
  const perUnit = row.qty > 0 ? (isUsd.value ? row.usd : row.lbp) / row.qty : 0
  const dualTotal = `$${formatUsd(row.usd)} ${andWord.value} ${formatLbp(row.lbp)}`
  return (
    `<div class="dash-tip__head">${escapeHtml(row.name || '')}</div>` +
    `<div class="dash-tip__body">` +
    tipRow($t('quantitySold'), row.qty) +
    (row.qty > 0 ? tipRow($t('revenuePerUnit'), formatDisplay(perUnit)) : '') +
    tipRow($t('totalRevenue'), dualTotal) +
    `<div class="dash-tip__total">${tipRow($t('totalRevenueAtRate'), formatDisplay(combinedAtRate(row.usd, row.lbp)))}</div>` +
    `</div>`
  )
}

function externalTooltipHandler(context) {
  const { chart, tooltip } = context
  const parent = chart.canvas?.parentNode
  if (!parent) return

  let el = parent.querySelector('.dash-tip')
  if (!el) {
    el = document.createElement('div')
    el.className = 'dash-tip'
    parent.appendChild(el)
  }

  if (tooltip.opacity === 0) {
    el.classList.remove('dash-tip--show')
    return
  }

  const index = tooltip.dataPoints?.[0]?.dataIndex
  if (index == null) return

  el.setAttribute('dir', state.dir)
  el.innerHTML = scenario.value === 'revenue' ? buildRevenueTipHtml(index) : buildSoldTipHtml(index)

  // Clamp horizontally inside the chart and keep the caret on the data point.
  const half = el.offsetWidth / 2
  const parentWidth = parent.clientWidth
  const clampedX = Math.min(Math.max(tooltip.caretX, half + 6), Math.max(parentWidth - half - 6, half + 6))
  const showBelow = tooltip.caretY < el.offsetHeight + 26

  el.classList.toggle('dash-tip--below', showBelow)
  el.style.left = `${clampedX}px`
  el.style.top = `${tooltip.caretY}px`
  el.style.setProperty('--caret-shift', `${tooltip.caretX - clampedX}px`)
  el.classList.add('dash-tip--show')
}

/* ------------------------- Revenue trend scenario ------------------------- */

const chartData = computed(() => ({
  labels: revenueSeries.value.map((p) => p.label),
  datasets: [
    {
      label: $t('revenue'),
      data: revenueSeries.value.map((p) =>
        Number(isUsd.value ? (p.revenueUsd ?? p.revenue) : p.revenueLbp) || 0
      ),
      borderColor: '#4a9eab',
      backgroundColor: chartType.value === 'line' ? tealGradient : 'rgba(74, 158, 171, 0.55)',
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
    tooltip: { enabled: false, external: externalTooltipHandler }
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

/* --------------------------- Top sold scenario ---------------------------- */

const soldChartData = computed(() => ({
  labels: soldRows.value.map((row) => row.name),
  datasets: [
    {
      label: $t('quantitySold'),
      data: soldRows.value.map((row) => row.qty),
      borderColor: '#197783',
      backgroundColor: chartType.value === 'line' ? tealGradient : 'rgba(25, 119, 131, 0.55)',
      pointBackgroundColor: '#197783',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: chartType.value === 'line' ? 4 : 0,
      pointHoverRadius: 6,
      tension: 0.35,
      fill: chartType.value === 'line',
      borderWidth: 2.2,
      borderRadius: 8,
      maxBarThickness: 46
    }
  ]
}))

const soldChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false, external: externalTooltipHandler }
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: {
        color: '#94a3b8',
        font: { size: 11, family: 'inherit' },
        autoSkip: false,
        maxRotation: 40,
        callback(value) {
          const label = this.getLabelForValue(value) ?? ''
          return label.length > 14 ? `${label.slice(0, 13)}…` : label
        }
      }
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(148, 163, 184, 0.15)' },
      border: { display: false },
      ticks: {
        color: '#94a3b8',
        font: { size: 11, family: 'inherit' },
        precision: 0
      }
    }
  }
}))

/* --------------------------------- Data ---------------------------------- */

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
    appliedItemId.value = filters.value.itemId ?? null
    appliedCategoryId.value = filters.value.categoryId ?? null
  } catch {
    revenueSeries.value = []
    topSoldItems.value = []
    topSoldCategories.value = []
    totalRevenueUsd.value = 0
    totalRevenueLbp.value = 0
    appliedItemId.value = null
    appliedCategoryId.value = null
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
  background: linear-gradient(135deg, rgba(25, 119, 131, 0.14), rgba(50, 216, 238, 0.14));
  color: #197783;
}

.dash-header__subtitle {
  margin: 0.3rem 0 0;
  padding-inline-start: 2.85rem;
  font-size: 0.84rem;
  color: #8a9aab;
  line-height: 1.4;
}

.period-rail {
  display: inline-flex;
  gap: 0.2rem;
  padding: 0.22rem;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e4ebf1;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
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
  background-image: linear-gradient(135deg, #197783, #32d8ee);
  color: #fff;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
}

.kpi {
  padding: 0.85rem 0.95rem;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e6edf3;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.kpi__label {
  font-size: 0.68rem;
  font-weight: 700;
  color: #9aabba;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.kpi__value {
  font-size: 1.1rem;
  font-weight: 750;
  color: #334155;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kpi--income { border-inline-start: 3px solid rgba(25, 119, 131, 0.55); }
.kpi--peak { border-inline-start: 3px solid rgba(74, 158, 171, 0.55); }
.kpi--units { border-inline-start: 3px solid rgba(100, 180, 190, 0.55); }

/* Selection insight cards */
.select-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0.6rem;
}

.select-card {
  border-radius: 13px;
  padding: 0.8rem 0.95rem;
  background: linear-gradient(135deg, rgba(25, 119, 131, 0.07), rgba(50, 216, 238, 0.08)), #fff;
  border: 1px solid rgba(25, 119, 131, 0.22);
  box-shadow: 0 2px 6px rgba(25, 119, 131, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.select-card__head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.select-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  font-size: 0.66rem;
  font-weight: 750;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: rgba(25, 119, 131, 0.12);
  color: #14606a;
  flex-shrink: 0;
}

.select-card__name {
  font-size: 0.95rem;
  font-weight: 750;
  color: #14606a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-card__stats {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.select-card__stat {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.select-card__stat span {
  font-size: 0.64rem;
  font-weight: 700;
  color: #7a95a0;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.select-card__stat strong {
  font-size: 1.05rem;
  font-weight: 800;
  color: #197783;
  font-variant-numeric: tabular-nums;
}

.select-card__dual {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.08rem;
  font-size: 0.68rem;
  font-weight: 650;
  color: #5a8f97;
}

.filter-strip {
  padding: 0.85rem 1rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e6edf3;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
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
  background: rgba(25, 119, 131, 0.08);
  border-color: rgba(25, 119, 131, 0.4);
  color: #197783;
}

.btn-ghost:hover {
  background: rgba(25, 119, 131, 0.14);
  border-color: #197783;
}

.btn-solid {
  background-image: linear-gradient(135deg, #197783, #32d8ee);
  color: #fff;
  font-weight: 700;
}

.btn-solid:hover:not(:disabled) {
  background-image: linear-gradient(135deg, #14606a, #26c6da);
}

.btn-solid:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Scenario tabs */
.scenario-tabs {
  display: flex;
  gap: 0.55rem;
}

.scenario-tab {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.65rem 1rem;
  border-radius: 12px;
  border: 1px solid #e4ebf1;
  background: rgba(255, 255, 255, 0.92);
  color: #7a8fa3;
  font-size: 0.88rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.scenario-tab:hover {
  border-color: rgba(25, 119, 131, 0.35);
  color: #197783;
}

.scenario-tab--on {
  background-image: linear-gradient(135deg, #197783, #32d8ee);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 6px 16px rgba(25, 119, 131, 0.28);
}

.chart-panel {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e6edf3;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  min-height: 430px;
  overflow: hidden;
  flex: 1;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  padding: 0.75rem 0.95rem;
  border-bottom: 1px solid #eef2f6;
  background: #fafcfd;
  flex-wrap: wrap;
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
  flex-wrap: wrap;
}

.seg {
  display: inline-flex;
  gap: 0.12rem;
  padding: 0.18rem;
  border-radius: 9px;
  background: #f0f4f7;
  border: 1px solid #e4ebf1;
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

@media (max-width: 1100px) {
  .kpi-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .kpi-row {
    grid-template-columns: 1fr;
  }
  .select-strip {
    grid-template-columns: 1fr;
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
  .scenario-tabs {
    flex-direction: column;
  }
}
</style>

<style>
/* Custom chart tooltip (created dynamically, so it cannot be scoped) */
.dash-tip {
  position: absolute;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: translate(-50%, calc(-100% - 16px)) scale(0.97);
  min-width: 230px;
  max-width: 320px;
  background: linear-gradient(180deg, #ffffff 0%, #f7fbfc 100%);
  border: 1px solid rgba(25, 119, 131, 0.18);
  border-radius: 14px;
  box-shadow:
    0 20px 44px -14px rgba(15, 23, 42, 0.28),
    0 6px 14px -6px rgba(25, 119, 131, 0.16);
  overflow: hidden;
  z-index: 30;
  transition: opacity 0.14s ease, transform 0.14s ease, left 0.08s ease-out, top 0.08s ease-out;
  font-family: inherit;
}

.dash-tip--show {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, calc(-100% - 16px)) scale(1);
}

.dash-tip--below {
  transform: translate(-50%, 18px) scale(0.97);
}

.dash-tip--below.dash-tip--show {
  transform: translate(-50%, 18px) scale(1);
}

.dash-tip::after {
  content: '';
  position: absolute;
  left: calc(50% + var(--caret-shift, 0px));
  bottom: -6px;
  width: 12px;
  height: 12px;
  transform: translateX(-50%) rotate(45deg);
  background: #f7fbfc;
  border-right: 1px solid rgba(25, 119, 131, 0.18);
  border-bottom: 1px solid rgba(25, 119, 131, 0.18);
}

.dash-tip--below::after {
  bottom: auto;
  top: -6px;
  background: #197783;
  border: none;
}

.dash-tip__head {
  padding: 0.6rem 0.85rem;
  background: linear-gradient(135deg, #197783, #32d8ee);
  color: #ffffff;
  font-size: 0.84rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dash-tip__body {
  padding: 0.6rem 0.85rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.38rem;
}

.dash-tip__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: #64748b;
}

.dash-tip__row strong {
  color: #0f172a;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.dash-tip__total {
  margin-top: 0.2rem;
  padding-top: 0.5rem;
  border-top: 1px dashed rgba(25, 119, 131, 0.3);
}

.dash-tip__total .dash-tip__row span {
  color: #14606a;
  font-weight: 750;
}

.dash-tip__total .dash-tip__row strong {
  color: #197783;
  font-size: 0.88rem;
}
</style>
