<template>
  <div class="m-dash m-page" :dir="lang.dir">
    <header class="m-dash__header">
      <p class="m-dash__subtitle">{{ $t('dashboardSubtitle') }}</p>

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

    <div class="kpi-grid">
      <article class="kpi kpi--income">
        <span class="kpi__label">{{ $t('totalRevenue') }}</span>
        <strong class="kpi__value" dir="ltr">{{ loading ? '—' : formatDisplay(totalIncome) }}</strong>
      </article>
      <article class="kpi kpi--receipts">
        <span class="kpi__label">{{ $t('receiptCount') }}</span>
        <strong class="kpi__value">{{ loading ? '—' : receiptCount }}</strong>
      </article>
      <article class="kpi kpi--peak">
        <span class="kpi__label">{{ $t('peakRevenue') }}</span>
        <strong class="kpi__value" dir="ltr">{{ loading ? '—' : formatDisplay(peakIncome) }}</strong>
      </article>
    </div>

    <div v-if="selectionInsights.length" class="select-strip">
      <article
        v-for="insight in selectionInsights"
        :key="insight.key"
        class="select-card"
      >
        <div class="select-card__head">
          <span class="select-card__badge">
            <v-icon size="14">{{ insight.icon }}</v-icon>
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
        </div>
      </article>
    </div>

    <div class="m-filters" :class="{ 'm-filters--open': !filtersCollapsed }">
      <button
        type="button"
        class="m-filters__toggle"
        @click="filtersCollapsed = !filtersCollapsed"
      >
        <span class="m-filters__toggle-icon">
          <v-icon size="18">mdi-filter-variant</v-icon>
        </span>
        <span class="m-filters__toggle-label">{{ $t('applyFilters') }}</span>
        <v-icon
          size="20"
          class="m-filters__chevron"
          :class="{ rotated: !filtersCollapsed }"
        >
          mdi-chevron-down
        </v-icon>
      </button>

      <v-expand-transition>
        <div v-show="!filtersCollapsed" class="m-filters__panel">
          <div class="m-filters__fields">
            <template v-if="isHourlyMode">
              <div class="m-filters__field">
                <label>{{ $t('date') }}</label>
                <PosDateInput v-model="filters.date" :placeholder="$t('selectDatePlaceholder')" />
              </div>
              <div class="m-filters__field">
                <label>{{ $t('fromTime') }}</label>
                <PosTimeInput v-model="filters.fromTime" :placeholder="$t('selectTimePlaceholder')" />
              </div>
              <div class="m-filters__field">
                <label>{{ $t('toTime') }}</label>
                <PosTimeInput v-model="filters.toTime" :placeholder="$t('selectTimePlaceholder')" />
              </div>
            </template>
            <template v-else>
              <div class="m-filters__field">
                <label>{{ $t('fromDate') }}</label>
                <PosDateInput v-model="filters.fromDate" :placeholder="$t('selectDatePlaceholder')" />
              </div>
              <div class="m-filters__field">
                <label>{{ $t('toDate') }}</label>
                <PosDateInput v-model="filters.toDate" :placeholder="$t('selectDatePlaceholder')" />
              </div>
            </template>

            <div class="m-filters__field m-filters__field--full">
              <label>{{ $t('receiptCurrency') }}</label>
              <div class="currency-rail" role="tablist">
                <button
                  v-for="option in receiptCurrencyOptions"
                  :key="option.id"
                  type="button"
                  class="currency-rail__btn"
                  :class="{ 'currency-rail__btn--on': filters.receiptCurrency === option.id }"
                  @click="filters.receiptCurrency = option.id"
                >
                  {{ $t(option.labelKey) }}
                </button>
              </div>
            </div>

            <div class="m-filters__field m-filters__field--full">
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
            <div class="m-filters__field m-filters__field--full">
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

          <div class="m-filters__actions">
            <button type="button" class="m-filters__reset" @click="resetFilters">
              {{ $t('reset') }}
            </button>
            <button
              type="button"
              class="m-filters__apply"
              :disabled="loading"
              @click="loadDashboard"
            >
              <v-icon size="18">mdi-magnify</v-icon>
              {{ loading ? $t('searching') : $t('search') }}
            </button>
          </div>
        </div>
      </v-expand-transition>
    </div>

    <div class="scenario-tabs" role="tablist">
      <button
        type="button"
        class="scenario-tab"
        :class="{ 'scenario-tab--on': scenario === 'revenue' }"
        @click="scenario = 'revenue'"
      >
        <v-icon size="16">mdi-finance</v-icon>
        {{ $t('scenarioRevenue') }}
      </button>
      <button
        type="button"
        class="scenario-tab"
        :class="{ 'scenario-tab--on': scenario === 'sold' }"
        @click="scenario = 'sold'"
      >
        <v-icon size="16">mdi-trophy-outline</v-icon>
        {{ $t('scenarioTopSold') }}
      </button>
    </div>

    <!-- Revenue chart -->
    <section v-if="scenario === 'revenue'" class="chart-panel">
      <div class="panel-head">
        <h2 class="panel-title">
          <v-icon size="17">mdi-finance</v-icon>
          {{ $t('revenueChart') }}
        </h2>
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

      <div class="chart-panel__body">
        <div v-if="loading" class="state-box">
          <div class="pulse-bars">
            <span v-for="n in 7" :key="n" :style="{ '--h': `${28 + (n % 4) * 16}%` }" />
          </div>
          <span>{{ $t('loadingDashboard') }}</span>
        </div>
        <div v-else-if="isRevenueChartEmpty" class="state-box">
          <v-icon size="36" color="#9db5c0">mdi-chart-box-outline</v-icon>
          <span>{{ $t('noDashboardData') }}</span>
        </div>
        <div v-else class="chart-canvas">
          <Line v-if="chartType === 'line'" :data="chartData" :options="chartOptions" />
          <Bar v-else :data="chartData" :options="chartOptions" />
        </div>
      </div>
    </section>

    <!-- Top sold leaderboards -->
    <section v-else class="board-panel">
      <div class="panel-head">
        <h2 class="panel-title">
          <v-icon size="17">mdi-trophy-outline</v-icon>
          {{ $t('mostSoldItems') }}
        </h2>
        <div class="seg">
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

      <div v-if="loading" class="state-box state-box--board">
        <div class="pulse-bars">
          <span v-for="n in 5" :key="n" :style="{ '--h': `${30 + (n % 3) * 18}%` }" />
        </div>
        <span>{{ $t('loadingDashboard') }}</span>
      </div>
      <div v-else-if="soldRows.length === 0" class="state-box state-box--board">
        <v-icon size="36" color="#9db5c0">mdi-trophy-outline</v-icon>
        <span>{{ $t('noDashboardData') }}</span>
      </div>
      <ol v-else class="board-list">
        <li
          v-for="(row, index) in soldRows"
          :key="row.id ?? index"
          class="board-row"
        >
          <span class="board-row__rank" :class="{ 'board-row__rank--top': index < 3 }">
            {{ index + 1 }}
          </span>
          <div class="board-row__body">
            <strong class="board-row__name">{{ row.name }}</strong>
            <span class="board-row__meta">
              {{ $t('quantitySold') }}: {{ row.qty }}
            </span>
          </div>
          <strong class="board-row__amount" dir="ltr">
            {{ formatDisplay(isUsd ? row.usd : row.lbp) }}
          </strong>
        </li>
      </ol>
    </section>
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
import PosDateInput from '../../components/PosDateInput.vue'
import PosTimeInput from '../../components/PosTimeInput.vue'
import PosAutocomplete from '../../components/PosAutocomplete.vue'
import DashboardService from '../../services/DashboardService'
import CategoryService from '../../services/CategoryService'
import ItemService from '../../services/ItemService'
import { useState } from '../../store/state'

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
const filtersCollapsed = ref(true)
const period = ref('daily')
const scenario = ref('revenue')
const chartType = ref('line')
const soldMode = ref('items')

const totalRevenueUsd = ref(0)
const totalRevenueLbp = ref(0)
const receiptCount = ref(0)
const revenueSeries = ref([])
const topSoldItems = ref([])
const topSoldCategories = ref([])
const categoryOptions = ref([])
const itemOptions = ref([])

const appliedItemId = ref(null)
const appliedCategoryId = ref(null)

const filters = ref({
  date: '',
  fromTime: '',
  toTime: '',
  fromDate: '',
  toDate: '',
  receiptCurrency: 'ALL',
  categoryId: null,
  itemId: null
})

const lang = computed(() => ({ dir: state.dir, lang: state.lang }))
const isUsd = computed(() => state.currency === 'USD')
const isHourlyMode = computed(() => period.value === 'daily')

const periodOptions = [
  { id: 'daily', labelKey: 'periodDaily' },
  { id: 'monthly', labelKey: 'periodMonthly' },
  { id: 'yearly', labelKey: 'periodYearly' }
]

const receiptCurrencyOptions = [
  { id: 'ALL', labelKey: 'receiptCurrencyAll' },
  { id: 'USD', labelKey: 'receiptCurrencyUsd' },
  { id: 'LBP', labelKey: 'receiptCurrencyLbp' }
]

/**
 * Granularity follows the period tab, or the selected date range for monthly/yearly:
 *   - daily tab           -> hourly buckets (single day + time window)
 *   - up to ~3 months     -> daily buckets
 *   - anything longer     -> monthly buckets
 */
const granularity = computed(() => {
  if (isHourlyMode.value) return 'HOURLY'
  const from = filters.value.fromDate ? new Date(filters.value.fromDate) : null
  const to = filters.value.toDate ? new Date(filters.value.toDate) : null
  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return 'DAILY'
  }
  const dayMs = 24 * 60 * 60 * 1000
  const days = Math.round(Math.abs(to - from) / dayMs) + 1
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
    filters.value.date = toIsoDate(now)
    filters.value.fromTime = '00:00'
    filters.value.toTime = '23:59'
    filters.value.fromDate = ''
    filters.value.toDate = ''
    return
  }
  filters.value.date = ''
  filters.value.fromTime = ''
  filters.value.toTime = ''
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

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]))
}

function buildRevenueTipHtml(index) {
  const point = revenueSeries.value[index] || {}
  const amount = isUsd.value
    ? Number(point.revenueUsd ?? point.revenue) || 0
    : Number(point.revenueLbp) || 0
  return (
    `<div class="m-dash-tip__head">` +
    `<span class="m-dash-tip__eyebrow">${escapeHtml($t('revenue'))}</span>` +
    `<strong class="m-dash-tip__title">${escapeHtml(point.label || '')}</strong>` +
    `</div>` +
    `<div class="m-dash-tip__body">` +
    `<span class="m-dash-tip__metric-label">${escapeHtml($t('totalRevenue'))}</span>` +
    `<strong class="m-dash-tip__metric-value" dir="ltr">${escapeHtml(formatDisplay(amount))}</strong>` +
    `</div>`
  )
}

function externalTooltipHandler(context) {
  const { chart, tooltip } = context
  const parent = chart.canvas?.parentNode
  if (!parent) return

  let el = parent.querySelector('.m-dash-tip')
  if (!el) {
    el = document.createElement('div')
    el.className = 'm-dash-tip'
    parent.appendChild(el)
  }

  if (tooltip.opacity === 0) {
    el.classList.remove('m-dash-tip--show')
    return
  }

  const index = tooltip.dataPoints?.[0]?.dataIndex
  if (index == null) return

  el.setAttribute('dir', state.dir)
  el.innerHTML = buildRevenueTipHtml(index)

  const half = el.offsetWidth / 2
  const parentWidth = parent.clientWidth
  const clampedX = Math.min(Math.max(tooltip.caretX, half + 6), Math.max(parentWidth - half - 6, half + 6))
  const showBelow = tooltip.caretY < el.offsetHeight + 26

  el.classList.toggle('m-dash-tip--below', showBelow)
  el.style.left = `${clampedX}px`
  el.style.top = `${tooltip.caretY}px`
  el.style.setProperty('--caret-shift', `${tooltip.caretX - clampedX}px`)
  el.classList.add('m-dash-tip--show')
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
      maxBarThickness: 28
    }
  ]
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false, external: externalTooltipHandler }
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: '#94a3b8', font: { size: 10, family: 'inherit' }, maxTicksLimit: 8 }
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(148, 163, 184, 0.15)' },
      border: { display: false },
      ticks: {
        color: '#94a3b8',
        font: { size: 10, family: 'inherit' },
        maxTicksLimit: 5,
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
    const payload = {
      itemId: filters.value.itemId || undefined,
      categoryId: filters.value.categoryId || undefined,
      granularity: granularity.value,
      receiptCurrency: filters.value.receiptCurrency || 'ALL'
    }
    if (isHourlyMode.value) {
      payload.fromDate = filters.value.date || undefined
      payload.fromTime = filters.value.fromTime || undefined
      payload.toTime = filters.value.toTime || undefined
    } else {
      payload.fromDate = filters.value.fromDate || undefined
      payload.toDate = filters.value.toDate || undefined
    }
    const response = await DashboardService.getDashboardData(payload)
    const data = response?.data?.data ?? {}
    revenueSeries.value = data.revenueSeries ?? []
    topSoldItems.value = data.topSoldItems ?? []
    topSoldCategories.value = data.topSoldCategories ?? []
    totalRevenueUsd.value = Number(data.totalRevenueUsd ?? data.totalRevenue) || 0
    totalRevenueLbp.value = Number(data.totalRevenueLbp) || 0
    receiptCount.value = Number(data.receiptCount) || 0
    appliedItemId.value = filters.value.itemId ?? null
    appliedCategoryId.value = filters.value.categoryId ?? null
  } catch {
    revenueSeries.value = []
    topSoldItems.value = []
    topSoldCategories.value = []
    totalRevenueUsd.value = 0
    totalRevenueLbp.value = 0
    receiptCount.value = 0
    appliedItemId.value = null
    appliedCategoryId.value = null
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.value.categoryId = null
  filters.value.itemId = null
  filters.value.receiptCurrency = 'ALL'
  setDefaultDatesForPeriod(period.value)
  fetchCategories('')
  fetchItems('')
  loadDashboard()
}

onMounted(async () => {
  setDefaultDatesForPeriod(period.value)
  await Promise.all([fetchCategories(''), fetchItems('')])
  await loadDashboard()
})
</script>

<style scoped>
.m-dash {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  background: transparent;
}

.m-dash__header {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.m-dash__subtitle {
  margin: 0;
  font-size: 0.88rem;
  color: #5f7a7e;
  line-height: 1.4;
}

.period-rail {
  display: flex;
  gap: 0.2rem;
  margin-top: 0.55rem;
  padding: 0.22rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(25, 119, 131, 0.12);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.period-rail__btn {
  flex: 1;
  border: none;
  background: transparent;
  color: #8a9aab;
  font-size: 0.8rem;
  font-weight: 650;
  padding: 0.55rem 0.35rem;
  border-radius: 9px;
  cursor: pointer;
  font-family: inherit;
  min-height: 40px;
  transition: background 0.15s, color 0.15s;
}

.period-rail__btn--on {
  background-image: linear-gradient(135deg, #197783, #32d8ee);
  color: #fff;
}

.kpi-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
}

.kpi {
  padding: 0.8rem 0.85rem;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e6edf3;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.kpi--peak {
  grid-column: 1 / -1;
}

.kpi__label {
  font-size: 0.65rem;
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

.kpi--income { border-inline-start: 3px solid rgba(25, 119, 131, 0.55); }
.kpi--receipts { border-inline-start: 3px solid rgba(74, 158, 171, 0.55); }
.kpi--peak { border-inline-start: 3px solid rgba(50, 216, 238, 0.55); }

.select-strip {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.select-card {
  border-radius: 13px;
  padding: 0.75rem 0.85rem;
  background: linear-gradient(135deg, rgba(25, 119, 131, 0.07), rgba(50, 216, 238, 0.08)), #fff;
  border: 1px solid rgba(25, 119, 131, 0.22);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.select-card__head {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.select-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 750;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: rgba(25, 119, 131, 0.12);
  color: #14606a;
  flex-shrink: 0;
}

.select-card__name {
  font-size: 0.9rem;
  font-weight: 750;
  color: #14606a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-card__stats {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.select-card__stat {
  display: flex;
  flex-direction: column;
  gap: 0.08rem;
}

.select-card__stat span {
  font-size: 0.62rem;
  font-weight: 700;
  color: #7a95a0;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.select-card__stat strong {
  font-size: 1rem;
  font-weight: 800;
  color: #197783;
  font-variant-numeric: tabular-nums;
}

.m-filters {
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(25, 119, 131, 0.12);
  overflow: hidden;
}

.m-filters__toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.75rem 0.9rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  color: #334155;
  min-height: 48px;
}

.m-filters__toggle-icon {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(25, 119, 131, 0.1);
  color: #197783;
}

.m-filters__toggle-label {
  flex: 1;
  text-align: start;
  font-size: 0.88rem;
  font-weight: 700;
}

.m-filters__chevron {
  color: #8a9aab;
  transition: transform 0.2s ease;
}

.m-filters__chevron.rotated {
  transform: rotate(180deg);
  color: #197783;
}

.m-filters__panel {
  padding: 0 0.9rem 0.9rem;
  border-top: 1px solid #eef2f6;
}

.m-filters__fields {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding-top: 0.75rem;
}

.m-filters__field label {
  display: block;
  margin-bottom: 0.28rem;
  font-size: 0.68rem;
  font-weight: 700;
  color: #9aabba;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.currency-rail {
  display: flex;
  gap: 0.2rem;
  padding: 0.22rem;
  min-height: 42px;
  border-radius: 11px;
  background: #f5f8fa;
  border: 1px solid #e4ebf1;
  box-sizing: border-box;
}

.currency-rail__btn {
  flex: 1;
  border: none;
  background: transparent;
  color: #8a9aab;
  font-size: 0.78rem;
  font-weight: 650;
  padding: 0.45rem 0.3rem;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  min-height: 36px;
}

.currency-rail__btn--on {
  background-image: linear-gradient(135deg, #197783, #32d8ee);
  color: #fff;
}

.m-filters__actions {
  display: flex;
  gap: 0.55rem;
  margin-top: 0.85rem;
}

.m-filters__reset,
.m-filters__apply {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  padding: 0.65rem 0.75rem;
  border-radius: 11px;
  font-size: 0.88rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  min-height: 44px;
  border: 1px solid transparent;
}

.m-filters__reset {
  background: rgba(25, 119, 131, 0.08);
  border-color: rgba(25, 119, 131, 0.35);
  color: #197783;
}

.m-filters__apply {
  background-image: linear-gradient(135deg, #197783, #32d8ee);
  color: #fff;
}

.m-filters__apply:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.scenario-tabs {
  display: flex;
  gap: 0.45rem;
}

.scenario-tab {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.7rem 0.55rem;
  border-radius: 12px;
  border: 1px solid #e4ebf1;
  background: rgba(255, 255, 255, 0.95);
  color: #7a8fa3;
  font-size: 0.82rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  min-height: 46px;
}

.scenario-tab--on {
  background-image: linear-gradient(135deg, #197783, #32d8ee);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 6px 14px rgba(25, 119, 131, 0.25);
}

.chart-panel,
.board-panel {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #e6edf3;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.7rem 0.85rem;
  border-bottom: 1px solid #eef2f6;
  background: #fafcfd;
  flex-wrap: wrap;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin: 0;
  font-size: 0.88rem;
  font-weight: 700;
  color: #3d4f5f;
}

.panel-title .v-icon {
  color: #5a9aa3;
}

.seg {
  display: inline-flex;
  gap: 0.12rem;
  padding: 0.16rem;
  border-radius: 9px;
  background: #f0f4f7;
  border: 1px solid #e4ebf1;
}

.seg__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  border: none;
  background: transparent;
  color: #8a9aab;
  padding: 0.4rem 0.5rem;
  border-radius: 7px;
  cursor: pointer;
  font-size: 0.72rem;
  font-weight: 600;
  font-family: inherit;
  min-height: 34px;
}

.seg__btn--on {
  background: #fff;
  color: #197783;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

.chart-panel__body {
  padding: 0.65rem 0.75rem 0.85rem;
}

.chart-canvas {
  height: 220px;
  width: 100%;
  position: relative;
}

.state-box {
  height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  color: #9aabba;
  font-size: 0.84rem;
}

.state-box--board {
  height: auto;
  min-height: 160px;
  padding: 1.25rem 0.75rem;
}

.pulse-bars {
  display: flex;
  align-items: flex-end;
  gap: 0.35rem;
  height: 64px;
  width: min(100%, 200px);
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

.board-list {
  list-style: none;
  margin: 0;
  padding: 0.35rem 0.55rem 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.board-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.7rem 0.65rem;
  border-radius: 12px;
  background: #f7fafb;
  border: 1px solid #eef2f6;
}

.board-row__rank {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  font-weight: 800;
  color: #7a8fa3;
  background: #e8eef2;
  flex-shrink: 0;
}

.board-row__rank--top {
  background-image: linear-gradient(135deg, #197783, #32d8ee);
  color: #fff;
}

.board-row__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.board-row__name {
  font-size: 0.9rem;
  font-weight: 700;
  color: #2c3e50;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.board-row__meta {
  font-size: 0.72rem;
  color: #8a9aab;
  font-weight: 600;
}

.board-row__amount {
  font-size: 0.88rem;
  font-weight: 800;
  color: #197783;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
</style>

<style>
/* Custom chart tooltip (created dynamically, so it cannot be scoped) */
.m-dash-tip {
  position: absolute;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: translate(-50%, calc(-100% - 14px)) scale(0.97);
  min-width: 180px;
  max-width: 260px;
  background: linear-gradient(180deg, #ffffff 0%, #f7fbfc 100%);
  border: 1px solid rgba(25, 119, 131, 0.18);
  border-radius: 12px;
  box-shadow:
    0 16px 36px -12px rgba(15, 23, 42, 0.28),
    0 4px 12px -4px rgba(25, 119, 131, 0.16);
  overflow: hidden;
  z-index: 30;
  transition: opacity 0.14s ease, transform 0.14s ease;
  font-family: inherit;
}

.m-dash-tip--show {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, calc(-100% - 14px)) scale(1);
}

.m-dash-tip--below {
  transform: translate(-50%, 16px) scale(0.97);
}

.m-dash-tip--below.m-dash-tip--show {
  transform: translate(-50%, 16px) scale(1);
}

.m-dash-tip::after {
  content: '';
  position: absolute;
  left: calc(50% + var(--caret-shift, 0px));
  bottom: -5px;
  width: 10px;
  height: 10px;
  transform: translateX(-50%) rotate(45deg);
  background: #f7fbfc;
  border-right: 1px solid rgba(25, 119, 131, 0.18);
  border-bottom: 1px solid rgba(25, 119, 131, 0.18);
}

.m-dash-tip--below::after {
  bottom: auto;
  top: -5px;
  background: #197783;
  border: none;
}

.m-dash-tip__head {
  padding: 0.55rem 0.75rem 0.6rem;
  background: linear-gradient(135deg, #197783, #32d8ee);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.m-dash-tip__eyebrow {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.85;
}

.m-dash-tip__title {
  font-size: 0.86rem;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.m-dash-tip__body {
  padding: 0.65rem 0.75rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.m-dash-tip__metric-label {
  font-size: 0.64rem;
  font-weight: 700;
  color: #8a9aab;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.m-dash-tip__metric-value {
  font-size: 1.1rem;
  font-weight: 800;
  color: #197783;
  font-variant-numeric: tabular-nums;
}
</style>
