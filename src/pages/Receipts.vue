<template>
  <div class="page-background receipts-page">
    <div class="page-decor" aria-hidden="true">
      <span class="decor-grid" />
      <span class="decor-orb decor-orb--1" />
      <span class="decor-orb decor-orb--2" />
      <span class="decor-orb decor-orb--3" />
    </div>

    <TopBar />

    <div class="receipts-content" :dir="lang.dir">
      <div class="hero-panel">
        <div class="receipts-page-header">
          <div class="header-main">
            <h1 class="receipts-page-title">
              <span class="title-icon-wrap">
                <v-icon size="22">{{ isDraftsMode ? 'mdi-file-document-edit-outline' : 'mdi-receipt-text' }}</v-icon>
              </span>
              {{ isDraftsMode ? $t('drafts') : $t('receipts') }}
            </h1>
            <p class="receipts-page-subtitle">{{ isDraftsMode ? $t('draftsSubtitle') : $t('receiptsSubtitle') }}</p>
          </div>
          <div v-if="!loading && pagination.totalItems > 0" class="header-stats">
            <div class="stat-pill stat-pill--glow">
              <v-icon size="16">mdi-receipt</v-icon>
              <span class="stat-pill-value">{{ pagination.totalItems }}</span>
              <span class="stat-pill-label">{{ isDraftsMode ? $t('drafts') : $t('receiptsFoundLabel') }}</span>
            </div>
            <div v-if="totalPages > 1" class="stat-pill stat-pill--muted">
              <v-icon size="16">mdi-book-open-page-variant</v-icon>
              <span class="stat-pill-value" dir="ltr">{{ pagination.page }} / {{ totalPages }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top filters (collapsible) + results below -->
      <div
        class="filters-top-panel"
        :class="{ 'filters-top-panel--expanded': !filtersCollapsed }"
      >
        <button
          type="button"
          class="filters-toggle-bar"
          :class="{ 'filters-toggle-bar--expanded': !filtersCollapsed }"
          @click="filtersCollapsed = !filtersCollapsed"
        >
          <span class="filters-icon-badge">
            <v-icon size="18">mdi-filter-variant</v-icon>
          </span>
          <span class="filters-toggle-label">{{ $t('applyFilters') }}</span>
          <span v-if="activeFilterEntries.length" class="filters-active-count">
            {{ activeFilterEntries.length }}
          </span>
          <v-icon
            size="20"
            class="filters-toggle-chevron"
            :class="{ rotated: !filtersCollapsed }"
          >
            mdi-chevron-down
          </v-icon>
        </button>

        <v-expand-transition>
          <div v-show="!filtersCollapsed" class="receipts-filter-card">
            <div v-if="activeFilterEntries.length" class="active-filters-wrap">
              <span
                v-for="entry in activeFilterEntries"
                :key="entry.key"
                class="active-filter-chip"
              >
                <span class="chip-text">
                  <strong>{{ entry.label }}</strong>: {{ entry.value }}
                </span>
                <button type="button" class="chip-remove" @click.stop="removeFilter(entry.key)">
                  <v-icon size="14">mdi-close</v-icon>
                </button>
              </span>
            </div>

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
                <label class="filter-label">{{ $t('fromTime') }}</label>
                <PosTimeInput v-model="filters.fromTime" :placeholder="$t('selectTimePlaceholder')" />
              </div>
              <div class="filter-field-block">
                <label class="filter-label">{{ $t('toTime') }}</label>
                <PosTimeInput v-model="filters.toTime" :placeholder="$t('selectTimePlaceholder')" />
              </div>
              <div class="filter-field-block filter-field-customer">
                <label class="filter-label">{{ $t('customerName') }}</label>
                <v-text-field
                  v-model="filters.customerName"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="filter-field"
                  :class="{ 'filter-field--ar': state.lang === 'ar' }"
                  :placeholder="$t('customerNamePlaceholder')"
                  :prepend-inner-icon="state.lang === 'ar' ? undefined : 'mdi-account'"
                  :append-inner-icon="state.lang === 'ar' ? 'mdi-account' : undefined"
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
                  @click="loadReceipts(true)"
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
                  @click="loadReceipts(true)"
                >
                  {{ loading ? $t('searching') : $t('applyFilters') }}
                </v-btn>
              </template>
            </div>
          </div>
        </v-expand-transition>
      </div>

      <section class="results-section">
          <div class="results-header">
            <div class="results-header-text">
              <h2 class="results-title">
                <v-icon size="20" class="results-title-icon">mdi-format-list-bulleted</v-icon>
                {{ isDraftsMode ? $t('drafts') : $t('receiptsList') }}
              </h2>
              <p class="results-subtitle">
                <span class="results-total-hint">
                  {{ pagination.totalItems }} {{ isDraftsMode ? $t('drafts') : $t('receiptsFoundLabel') }}
                </span>
              </p>
            </div>
            <div class="results-header-actions">
              <button
                type="button"
                class="refresh-btn"
                :class="{ 'refresh-btn--spinning': loading }"
                :disabled="loading"
                :aria-label="$t('search')"
                @click="loadReceipts()"
              >
                <v-icon size="18">mdi-refresh</v-icon>
              </button>
              <div class="search-control">
                <v-icon size="16" class="search-icon">mdi-magnify</v-icon>
                <input
                  v-model="quickSearch"
                  type="text"
                  class="search-input"
                  :placeholder="$t('searchCustomer')"
                  @input="onQuickSearchInput"
                />
                <button
                  v-if="quickSearch"
                  type="button"
                  class="search-clear"
                  :aria-label="$t('reset')"
                  @click="clearQuickSearch"
                >
                  <v-icon size="14">mdi-close</v-icon>
                </button>
              </div>
            </div>
          </div>

          <div class="results-body">
            <div v-if="loading" class="results-skeleton">
              <div v-for="n in 4" :key="n" class="skeleton-card">
                <div class="skeleton-line skeleton-line--wide" />
                <div class="skeleton-line skeleton-line--medium" />
                <div class="skeleton-line skeleton-line--short" />
              </div>
            </div>

            <div v-else-if="receipts.length === 0" class="receipts-state receipts-empty">
              <div class="empty-illustration">
                <v-icon size="52">{{ isDraftsMode ? 'mdi-file-document-edit-outline' : 'mdi-receipt-text-remove-outline' }}</v-icon>
              </div>
              <span class="empty-title">{{ isDraftsMode ? $t('noDraftsFound') : $t('noReceiptsFound') }}</span>
              <span class="empty-hint">{{ isDraftsMode ? $t('noDraftsHint') : $t('noReceiptsHint') }}</span>
              <button
                type="button"
                class="empty-action-btn"
                :class="{ 'empty-action-btn--ar': state.lang === 'ar' }"
                @click="loadReceipts(true)"
              >
                <v-icon size="16">mdi-magnify</v-icon>
                {{ $t('search') }}
              </button>
            </div>

            <div v-else class="results-scroll">
              <div
                v-for="group in groupedReceipts"
                :key="group.dateKey"
                class="receipt-date-group"
              >
                <div class="date-timeline">
                  <span class="timeline-line" aria-hidden="true" />
                  <div class="receipt-date-heading">
                    <span class="date-heading-dot" />
                    <v-icon size="15" class="date-heading-icon">mdi-calendar-month</v-icon>
                    <span class="date-heading-text">{{ group.dateLabel }}</span>
                    <span class="date-count-badge">{{ group.items.length }}</span>
                  </div>
                </div>

                <div
                  class="date-group-cards"
                  :class="{ 'date-group-cards--solo': group.items.length === 1 }"
                >
                  <div
                    v-for="(receipt, index) in group.items"
                    :key="receipt.receiptId"
                    class="result-card"
                    :class="{ 'result-card--solo': group.items.length === 1 }"
                    :style="{ '--stagger': `${index * 40}ms` }"
                  >
                    <div class="result-card-body">
                      <div class="result-main">
                        <span class="customer-avatar">
                          {{ customerInitial(receipt.customerName) }}
                        </span>
                        <div class="result-info">
                          <span class="customer-name">
                            {{ receipt.customerName || $t('walkInCustomer') }}
                          </span>
                          <div class="result-meta-row">
                            <span class="time-meta">
                              <v-icon size="13">mdi-clock-outline</v-icon>
                              {{ formatTime(receipt.receiptTime) }}
                            </span>
                            <span
                              class="currency-chip"
                              :class="receipt.isReceiptDollar !== false ? 'currency-chip--usd' : 'currency-chip--lbp'"
                            >
                              {{ currencyLabel(receipt) }}
                            </span>
                            <span v-if="isDraftsMode" class="draft-chip">{{ $t('draftBadge') }}</span>
                          </div>
                        </div>
                      </div>
                      <span class="total-badge">{{ formatTotal(receipt) }}</span>
                    </div>
                    <div v-if="!isDraftsMode && hasPaymentInfo(receipt)" class="result-payment-row">
                      <span v-if="Number(receipt.payWish)" class="pay-pill pay-pill--wish">
                        W {{ formatPayWish(receipt) }}
                      </span>
                      <span v-if="Number(receipt.payDollar)" class="pay-pill pay-pill--usd">
                        {{ formatUsd(receipt.payDollar) }}
                      </span>
                      <span v-if="Number(receipt.payLebanese)" class="pay-pill pay-pill--lbp">
                        {{ formatLbp(receipt.payLebanese) }}
                      </span>
                      <span v-if="Number(receipt.receiptDiscount)" class="pay-pill pay-pill--discount">
                        {{ $t('discount') }}: {{ formatDiscount(receipt) }}
                      </span>
                    </div>
                    <div v-if="isDraftsMode" class="result-card-footer result-card-footer--draft">
                      <div class="draft-secondary-actions">
                        <button
                          type="button"
                          class="footer-action-btn"
                          @click="openDetails(receipt.receiptId)"
                        >
                          <v-icon size="16">mdi-text-box-outline</v-icon>
                          {{ $t('receiptDetails') }}
                        </button>
                        <button
                          type="button"
                          class="footer-action-btn footer-action-btn--items"
                          @click="openItems(receipt.receiptId)"
                        >
                          <v-icon size="16">mdi-cart-outline</v-icon>
                          {{ $t('receiptItems') }}
                        </button>
                      </div>
                      <button
                        type="button"
                        class="resume-draft-btn"
                        @click="continueInPos(receipt.receiptId)"
                      >
                        <v-icon size="17" class="resume-draft-btn__lead">mdi-play-circle</v-icon>
                        <span class="resume-draft-btn__label">{{ $t('continueInPos') }}</span>
                      </button>
                    </div>
                    <div v-else class="result-card-footer">
                      <button
                        type="button"
                        class="footer-action-btn"
                        @click="openDetails(receipt.receiptId)"
                      >
                        <v-icon size="16">mdi-text-box-outline</v-icon>
                        {{ $t('receiptDetails') }}
                      </button>
                      <button
                        type="button"
                        class="footer-action-btn footer-action-btn--items"
                        @click="openItems(receipt.receiptId)"
                      >
                        <v-icon size="16">mdi-cart-outline</v-icon>
                        {{ $t('receiptItems') }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="!loading && pagination.totalItems > 0" class="pagination-bar">
              <div class="rows-per-page-control">
                <span class="control-label">{{ $t('Show') }}</span>
                <div class="dropdown-container">
                  <button
                    type="button"
                    class="dropdown-trigger"
                    :class="{ 'dropdown-open': isPageSizeOpen }"
                    @click="isPageSizeOpen = !isPageSizeOpen"
                  >
                    {{ pagination.itemsPerPage }}
                    <v-icon size="16" class="dropdown-arrow" :class="{ rotated: isPageSizeOpen }">
                      mdi-chevron-down
                    </v-icon>
                  </button>
                  <div v-if="isPageSizeOpen" class="dropdown-menu">
                    <button
                      v-for="opt in pageSizeOptions"
                      :key="opt"
                      type="button"
                      class="dropdown-item"
                      :class="{ selected: pagination.itemsPerPage === opt }"
                      @click="selectPageSize(opt)"
                    >
                      {{ opt }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="pagination-container">
                <button
                  type="button"
                  class="pagination-btn"
                  :class="{ disabled: pagination.page <= 1 }"
                  :disabled="pagination.page <= 1"
                  @click="goPage(pagination.page - 1)"
                >
                  <v-icon size="18">mdi-chevron-left</v-icon>
                </button>
                <div class="pagination-pages">
                  <template v-for="p in visiblePages" :key="p.value">
                    <button
                      v-if="!p.isEllipsis"
                      type="button"
                      class="pagination-page"
                      :class="{ active: p.value === pagination.page }"
                      @click="goPage(p.value)"
                    >
                      {{ p.label }}
                    </button>
                    <span v-else class="pagination-ellipsis">...</span>
                  </template>
                </div>
                <button
                  type="button"
                  class="pagination-btn"
                  :class="{ disabled: pagination.page >= totalPages }"
                  :disabled="pagination.page >= totalPages"
                  @click="goPage(pagination.page + 1)"
                >
                  <v-icon size="18">mdi-chevron-right</v-icon>
                </button>
              </div>
            </div>
          </div>
      </section>
    </div>

    <ReceiptDetailsDialog
      v-model="detailsOpen"
      :receipt-id="selectedReceiptId"
      :is-draft="isDraftsMode"
    />
    <ReceiptItemsDialog v-model="itemsOpen" :receipt-id="selectedReceiptId" />
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import PosDateInput from '../components/PosDateInput.vue'
import PosTimeInput from '../components/PosTimeInput.vue'
import ReceiptDetailsDialog from '../components/ReceiptDetailsDialog.vue'
import ReceiptItemsDialog from '../components/ReceiptItemsDialog.vue'
import ReceiptService from '../services/ReceiptService'
import { useState } from '../store/state'

const props = defineProps({
  mode: {
    type: String,
    default: 'receipts',
    validator: (value) => ['receipts', 'drafts'].includes(value)
  }
})

const router = useRouter()
const instance = getCurrentInstance()
const $t = (key) => instance?.appContext?.config?.globalProperties?.$t?.(key) ?? key

const state = useState()
const lang = computed(() => ({ dir: state.dir }))
const isDraftsMode = computed(() => props.mode === 'drafts')

const loading = ref(false)
const receipts = ref([])
const detailsOpen = ref(false)
const itemsOpen = ref(false)
const selectedReceiptId = ref(null)
const filtersCollapsed = ref(true)
const quickSearch = ref('')
const isPageSizeOpen = ref(false)
const pageSizeOptions = [5, 10, 25, 50]

const pagination = reactive({
  page: 1,
  itemsPerPage: 5,
  totalItems: 0
})

const filters = reactive({
  fromDate: '',
  toDate: '',
  fromTime: '',
  toTime: '',
  customerName: ''
})

const activeFilterEntries = computed(() => {
  const entries = []
  if (filters.fromDate) entries.push({ key: 'fromDate', label: $t('fromDate'), value: filters.fromDate })
  if (filters.toDate) entries.push({ key: 'toDate', label: $t('toDate'), value: filters.toDate })
  if (filters.fromTime) entries.push({ key: 'fromTime', label: $t('fromTime'), value: filters.fromTime })
  if (filters.toTime) entries.push({ key: 'toTime', label: $t('toTime'), value: filters.toTime })
  if (filters.customerName?.trim()) {
    entries.push({ key: 'customerName', label: $t('customerName'), value: filters.customerName.trim() })
  }
  return entries
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(pagination.totalItems / pagination.itemsPerPage))
)

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = pagination.page
  const pages = []
  const add = (label, value) => pages.push({ label: String(label), value, isEllipsis: false })
  const ellipsis = (id) => pages.push({ label: '...', value: `e-${id}`, isEllipsis: true })
  if (total <= 5) {
    for (let i = 1; i <= total; i++) add(i, i)
    return pages
  }
  if (current <= 3) {
    add(1, 1); add(2, 2); add(3, 3); ellipsis('r'); add(total, total)
    return pages
  }
  if (current >= total - 2) {
    add(1, 1); ellipsis('l'); add(total - 2, total - 2); add(total - 1, total - 1); add(total, total)
    return pages
  }
  add(1, 1); ellipsis('l'); add(current - 1, current - 1); add(current, current); add(current + 1, current + 1); ellipsis('r'); add(total, total)
  return pages
})

const groupedReceipts = computed(() => {
  const groups = new Map()
  for (const receipt of receipts.value) {
    const dateKey = getDateKey(receipt.receiptDate)
    if (!groups.has(dateKey)) groups.set(dateKey, [])
    groups.get(dateKey).push(receipt)
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, items]) => ({
      dateKey,
      dateLabel: formatDateLabel(dateKey),
      items: [...items].sort((a, b) => compareReceiptTime(b, a))
    }))
})

function compareReceiptTime(a, b) {
  const ta = String(a.receiptTime || '00:00:00')
  const tb = String(b.receiptTime || '00:00:00')
  return ta.localeCompare(tb)
}

function getDateKey(receiptDate) {
  if (!receiptDate) return 'unknown'
  return String(receiptDate).slice(0, 10)
}

function formatDateLabel(dateKey) {
  if (dateKey === 'unknown') return '—'
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(state.lang === 'ar' ? 'ar-LB' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function formatTime(receiptTime) {
  if (!receiptTime) return '—'
  const value = String(receiptTime)
  return value.length >= 5 ? value.slice(0, 5) : value
}

function formatUsd(value) {
  const num = Number(value)
  if (!num) return '0'
  const formatted = num.toFixed(2)
  if (state.lang === 'ar') return `دولار\u200E ${formatted}`
  return `${formatted} USD`
}

function formatLbp(value) {
  const num = Number(value)
  if (!num) return '0'
  const formatted = Math.round(num).toLocaleString('en-US')
  if (state.lang === 'ar') return `ل.ل.\u200E ${formatted}`
  return `${formatted} LBP`
}

function formatTotal(receipt) {
  const num = Number(receipt.total) || 0
  const rate = Number(receipt.dollarRate) || state.exchangeRate
  if (receipt.isReceiptDollar !== false) return formatUsd(num)
  return formatLbp(num * rate)
}

function formatPayWish(receipt) {
  const num = Number(receipt.payWish) || 0
  if (!num) return '—'
  if (receipt.isPayWishDollar !== false) return formatUsd(num)
  return formatLbp(num)
}

function formatDiscount(receipt) {
  const val = Number(receipt.receiptDiscount) || 0
  if (!val) return '—'
  if (receipt.isReceiptDiscountPercent) return `${val}%`
  if (receipt.isReceiptDollar !== false) return formatUsd(val)
  return formatLbp(val)
}

function hasPaymentInfo(receipt) {
  return Number(receipt.payWish) > 0
    || Number(receipt.payDollar) > 0
    || Number(receipt.payLebanese) > 0
    || Number(receipt.receiptDiscount) > 0
}

function currencyLabel(receipt) {
  if (receipt.isReceiptDollar !== false) return state.lang === 'ar' ? 'دولار' : 'USD'
  return state.lang === 'ar' ? 'ل.ل.' : 'LBP'
}

function customerInitial(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return '?'
  return trimmed.charAt(0).toUpperCase()
}

function clearQuickSearch() {
  quickSearch.value = ''
  loadReceipts(true)
}

function buildFilterPayload() {
  const quick = quickSearch.value.trim()
  const customer = quick || filters.customerName?.trim() || undefined
  return {
    fromDate: filters.fromDate || undefined,
    toDate: filters.toDate || undefined,
    fromTime: filters.fromTime ? `${filters.fromTime}:00`.slice(0, 8) : undefined,
    toTime: filters.toTime ? `${filters.toTime}:59`.slice(0, 8) : undefined,
    customerName: customer
  }
}

function continueInPos(draftId) {
  router.push({ path: '/', query: { draftId } })
}

function selectPageSize(size) {
  pagination.itemsPerPage = size
  pagination.page = 1
  isPageSizeOpen.value = false
  loadReceipts()
}

function goPage(page) {
  if (page < 1 || page > totalPages.value) return
  pagination.page = page
  loadReceipts()
}

function closePageSizeDropdown(e) {
  if (!e.target.closest('.dropdown-container')) isPageSizeOpen.value = false
}

let quickSearchTimer = null
function onQuickSearchInput() {
  clearTimeout(quickSearchTimer)
  quickSearchTimer = setTimeout(() => loadReceipts(true), 350)
}

async function loadReceipts(resetPage = false) {
  if (resetPage) pagination.page = 1
  loading.value = true
  try {
    const searchFn = isDraftsMode.value ? ReceiptService.searchUserDrafts : ReceiptService.searchUserReceipts
    const response = await searchFn(buildFilterPayload(), {
      page: (pagination.page || 1) - 1,
      size: pagination.itemsPerPage || 5
    })
    const data = response?.data
    receipts.value = data?.data || []
    const pag = data?.pagination
    if (pag) {
      pagination.totalItems = pag.totalItems ?? 0
      if (pag.currentPage != null) pagination.page = pag.currentPage + 1
      if (pag.pageSize != null) pagination.itemsPerPage = pag.pageSize
    } else {
      pagination.totalItems = receipts.value.length
    }
  } catch (error) {
    console.error('Failed to load receipts:', error)
    receipts.value = []
    pagination.totalItems = 0
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  clearTimeout(quickSearchTimer)
  filters.fromDate = ''
  filters.toDate = ''
  filters.fromTime = ''
  filters.toTime = ''
  filters.customerName = ''
  quickSearch.value = ''
  receipts.value = []
  pagination.page = 1
  pagination.totalItems = 0
}

function removeFilter(key) {
  if (key === 'customerName') filters.customerName = ''
  else filters[key] = ''
  loadReceipts(true)
}

function openDetails(receiptId) {
  selectedReceiptId.value = receiptId
  detailsOpen.value = true
}

function openItems(receiptId) {
  selectedReceiptId.value = receiptId
  itemsOpen.value = true
}

watch(() => props.mode, () => {
  resetFilters()
  loadReceipts(true)
})

onMounted(() => {
  document.addEventListener('click', closePageSizeDropdown)
  loadReceipts()
})

onUnmounted(() => {
  document.removeEventListener('click', closePageSizeDropdown)
  clearTimeout(quickSearchTimer)
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

.hero-panel {
  margin-bottom: 1rem;
  padding: 1.1rem 1.15rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 8px 32px rgba(25, 119, 131, 0.08);
  backdrop-filter: blur(16px);
}

.receipts-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-shrink: 0;
  flex-wrap: wrap;
  margin-bottom: 0;
}

.header-main {
  min-width: 0;
}

.receipts-page-title {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-size: 1.45rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.02em;
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
  position: relative;
  overflow: hidden;
}

.title-icon-wrap::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.35) 50%, transparent 60%);
  animation: icon-shine 4s ease-in-out infinite;
}

@keyframes icon-shine {
  0%, 100% { transform: translateX(-120%); }
  50% { transform: translateX(120%); }
}

.receipts-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 45px);
  padding: 1rem 1.25rem;
  box-sizing: border-box;
  max-width: min(1100px, 100%);
  margin: 0 auto;
  width: 100%;
}

.receipts-page-subtitle {
  font-size: 0.88rem;
  color: #64748b;
  margin: 0.4rem 0 0;
  padding-inline-start: 3.05rem;
  line-height: 1.45;
}

.header-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(25, 119, 131, 0.18);
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
  color: #197783;
  font-size: 0.78rem;
  backdrop-filter: blur(8px);
}

.stat-pill--muted {
  color: #64748b;
  border-color: #e2e8f0;
}

.stat-pill-value {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.stat-pill-label {
  font-weight: 600;
  color: #64748b;
}

.stat-pill:not(.stat-pill--muted) .stat-pill-label {
  color: #197783;
}

/* Top filters panel */
.filters-top-panel {
  flex-shrink: 0;
  margin-bottom: 0.75rem;
  border: 1px solid rgba(25, 119, 131, 0.14);
  border-radius: 14px;
  transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
}

.filters-top-panel:hover {
  border-color: rgba(25, 119, 131, 0.35);
  box-shadow: 0 8px 28px rgba(25, 119, 131, 0.1);
}

.filters-top-panel--expanded {
  border-color: rgba(25, 119, 131, 0.3);
  box-shadow: 0 10px 32px rgba(25, 119, 131, 0.12);
}

.filters-top-panel--expanded:hover .receipts-filter-card {
  border-top-color: rgba(25, 119, 131, 0.2);
}

.filters-toggle-bar {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.72rem 0.95rem;
  border: none;
  border-radius: 0;
  background: linear-gradient(135deg, rgba(25, 119, 131, 0.06), rgba(50, 216, 238, 0.1));
  cursor: pointer;
  transition: background 0.2s ease;
}

.filters-toggle-bar:hover {
  background: linear-gradient(135deg, rgba(25, 119, 131, 0.1), rgba(50, 216, 238, 0.14));
}

.filters-toggle-bar--expanded {
  border-radius: 0;
}

.filters-toggle-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
  flex: 1;
  text-align: start;
}

.filters-active-count {
  font-size: 0.72rem;
  font-weight: 700;
  min-width: 22px;
  height: 22px;
  padding: 0 0.4rem;
  border-radius: 999px;
  background: #197783;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.filters-toggle-chevron {
  color: #64748b;
  transition: transform 0.25s ease;
}

.filters-toggle-chevron.rotated {
  transform: rotate(180deg);
}

.receipts-filter-card {
  background: #fff;
  border: none;
  border-top: 1px solid #e2e8f0;
  border-radius: 0;
  margin-top: 0;
  padding-top: 0.5rem;
  box-shadow: none;
  max-height: min(42vh, 320px);
  overflow-y: auto;
}

.filters-icon-badge {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #197783;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.active-filters-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0 1rem 0.65rem;
  border-bottom: 1px solid #f1f5f9;
}

.active-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.35rem 0.25rem 0.65rem;
  border-radius: 999px;
  border: 1px dashed #197783;
  background: #fff;
  font-size: 0.72rem;
  color: #197783;
}

.chip-text strong {
  font-weight: 700;
}

.chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: #197783;
  color: #fff;
  cursor: pointer;
}

.filter-fields {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.75rem;
  padding: 0.85rem 1rem 0.5rem;
}

.filter-field-block {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}

.filter-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.filter-field :deep(.v-field) {
  border: 1px solid transparent;
  border-radius: 10px;
  background:
    linear-gradient(#ffffff, #ffffff) padding-box,
    linear-gradient(135deg, rgba(34, 147, 161, 0.45), rgba(50, 216, 238, 0.45)) border-box;
}

.filter-field :deep(.v-field__outline) {
  opacity: 0;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem 0.85rem;
  border-top: 1px solid #f1f5f9;
}

.filter-actions--en {
  justify-content: flex-end;
}

.filter-actions--ar {
  direction: rtl;
  justify-content: flex-start;
}

.apply-btn {
  border-radius: 10px;
  font-weight: 700;
  text-transform: none;
  background-image: linear-gradient(135deg, #197783, #32d8ee) !important;
  color: #fff !important;
}

.reset-btn {
  border-radius: 10px;
  font-weight: 600;
  text-transform: none;
  color: #197783 !important;
  border: 1px solid rgba(25, 119, 131, 0.4) !important;
  background: rgba(25, 119, 131, 0.08) !important;
  letter-spacing: 0;
}

.reset-btn:hover {
  background: rgba(25, 119, 131, 0.14) !important;
  border-color: #197783 !important;
}

/* Results */
.results-section {
  flex: 1 1 auto;
  min-height: calc(3 * (1.7rem + 38px) + 4.5rem);
  max-height: 31.5rem;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 18px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.95) inset,
    0 16px 48px rgba(15, 23, 42, 0.08);
  overflow: hidden;
  backdrop-filter: blur(20px);
}

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.95rem 1.1rem;
  border-bottom: 1px solid #eef2f7;
  flex-shrink: 0;
  flex-wrap: wrap;
  background: linear-gradient(180deg, #ffffff, #fafcfe);
}

.results-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.results-title-icon {
  color: #197783;
}

.results-subtitle {
  font-size: 0.8rem;
  color: #64748b;
  margin: 0.2rem 0 0;
}

.results-total-hint {
  color: #197783;
  font-weight: 600;
}

.stat-pill--glow {
  box-shadow:
    0 2px 10px rgba(15, 23, 42, 0.05),
    0 0 0 1px rgba(25, 119, 131, 0.08),
    0 0 20px rgba(50, 216, 238, 0.15);
}

.results-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  max-width: 340px;
  min-width: 200px;
}

.refresh-btn {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #197783;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(25, 119, 131, 0.08);
  border-color: rgba(25, 119, 131, 0.35);
  box-shadow: 0 4px 12px rgba(25, 119, 131, 0.12);
  transform: rotate(-20deg);
}

.refresh-btn--spinning .v-icon {
  animation: spin 0.8s linear infinite;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.search-control {
  position: relative;
  flex: 1;
  min-width: 0;
}

.search-icon {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  inset-inline-start: 12px;
  color: #94a3b8;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.52rem 2.1rem 0.52rem 2.25rem;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  font-size: 0.85rem;
  color: #374151;
  background: #f8fafc;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  box-sizing: border-box;
}

[dir="rtl"] .search-input {
  padding: 0.52rem 2.25rem 0.52rem 2.1rem;
}

.search-input:focus {
  outline: none;
  border-color: #197783;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(25, 119, 131, 0.12);
}

.search-clear {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  inset-inline-end: 8px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: #e2e8f0;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.search-clear:hover {
  background: #197783;
  color: #fff;
}

.results-body {
  flex: 1;
  min-height: calc(3 * (1.7rem + 38px));
  display: flex;
  flex-direction: column;
}

.results-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0.85rem 1rem 1rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(25, 119, 131, 0.35) transparent;
}

.results-scroll::-webkit-scrollbar {
  width: 6px;
}

.results-scroll::-webkit-scrollbar-thumb {
  background: rgba(25, 119, 131, 0.3);
  border-radius: 999px;
}

.date-timeline {
  position: relative;
  margin-bottom: 0.65rem;
}

.timeline-line {
  position: absolute;
  inset-inline-start: 11px;
  top: 28px;
  bottom: -12px;
  width: 2px;
  background: linear-gradient(180deg, rgba(25, 119, 131, 0.35), rgba(50, 216, 238, 0.1));
  border-radius: 2px;
}

.receipt-date-group:last-child .timeline-line {
  display: none;
}

.date-group-cards {
  padding-inline-start: 0.15rem;
}

.results-skeleton {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.85rem 1rem 1rem;
}

.skeleton-card {
  padding: 1rem;
  border-radius: 14px;
  border: 1px solid #eef2f7;
  background: linear-gradient(90deg, #f8fafc 0%, #f1f5f9 50%, #f8fafc 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

.skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: #e2e8f0;
  margin-bottom: 0.55rem;
}

.skeleton-line--wide { width: 72%; }
.skeleton-line--medium { width: 48%; }
.skeleton-line--short { width: 28%; margin-bottom: 0; }

@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.receipt-date-group {
  margin-bottom: 1.35rem;
}

.receipt-date-group:last-child {
  margin-bottom: 0;
}

.receipt-date-heading {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.76rem;
  font-weight: 700;
  color: #197783;
  margin-bottom: 0.6rem;
  padding: 0.35rem 0.55rem;
  border-radius: 999px;
  background: rgba(25, 119, 131, 0.07);
  width: fit-content;
  max-width: 100%;
}

.date-heading-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #32d8ee;
  box-shadow: 0 0 0 3px rgba(50, 216, 238, 0.25);
  flex-shrink: 0;
}

.date-heading-icon {
  color: #197783;
  flex-shrink: 0;
}

.date-heading-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date-count-badge {
  margin-inline-start: 0.15rem;
  font-size: 0.62rem;
  font-weight: 800;
  padding: 0.14rem 0.5rem;
  border-radius: 999px;
  background: #197783;
  color: #fff;
}

/* Result cards — softer, lower contrast */
.result-card {
  position: relative;
  background: #fff;
  border: 1px solid #e8edf3;
  border-radius: 12px;
  margin-bottom: 0.55rem;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
  overflow: hidden;
  animation: card-enter 0.35s ease both;
  animation-delay: var(--stagger, 0ms);
}

.result-card:hover {
  border-color: rgba(25, 119, 131, 0.28);
  box-shadow: 0 6px 18px rgba(25, 119, 131, 0.08);
  transform: translateY(-1px);
}

.result-card-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
}

.customer-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: #197783;
  text-transform: uppercase;
  background: linear-gradient(135deg, rgba(25, 119, 131, 0.1), rgba(50, 216, 238, 0.14));
  border: 1px solid rgba(25, 119, 131, 0.12);
}

.total-badge {
  flex-shrink: 0;
  padding: 0.38rem 0.72rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #197783, #2c8cf2);
  font-variant-numeric: tabular-nums;
  direction: ltr;
  box-shadow: 0 2px 6px rgba(25, 119, 131, 0.2);
}

.result-payment-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0 1rem 0.65rem;
}

.pay-pill {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  direction: ltr;
  font-variant-numeric: tabular-nums;
}

.pay-pill--wish {
  background: rgba(220, 38, 38, 0.1);
  color: #b91c1c;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.pay-pill--usd {
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  border: 1px solid rgba(37, 99, 235, 0.2);
}

.pay-pill--lbp {
  background: rgba(25, 119, 131, 0.1);
  color: #0f4f58;
  border: 1px solid rgba(25, 119, 131, 0.2);
}

.pay-pill--discount {
  background: rgba(217, 119, 6, 0.1);
  color: #b45309;
  border: 1px solid rgba(217, 119, 6, 0.2);
}

.result-card-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem;
  border-top: 1px solid #f1f5f9;
  background: #fafbfc;
}

.footer-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.65rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.footer-action-btn:hover {
  background: rgba(25, 119, 131, 0.08);
  color: #197783;
}

.footer-action-btn--items:hover {
  background: rgba(44, 140, 242, 0.08);
  color: #2c8cf2;
}

.result-card-footer--draft {
  justify-content: space-between;
  gap: 0.5rem;
}

.draft-secondary-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.resume-draft-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 1.05rem;
  border: none;
  border-radius: 10px;
  background: #197783;
  color: #fff;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(25, 119, 131, 0.22);
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.resume-draft-btn:hover {
  background: #15616b;
  transform: translateY(-1px);
  box-shadow: 0 7px 18px rgba(25, 119, 131, 0.32);
}

.resume-draft-btn:active {
  transform: translateY(0);
}

.resume-draft-btn__lead {
  flex-shrink: 0;
}

.resume-draft-btn__label {
  white-space: nowrap;
}

.result-info {
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
  min-width: 0;
  flex: 1;
}

.customer-name {
  font-size: 0.92rem;
  font-weight: 700;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-meta-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  flex-wrap: wrap;
}

.time-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.76rem;
  font-weight: 600;
  color: #64748b;
  font-variant-numeric: tabular-nums;
}

.currency-chip {
  font-size: 0.62rem;
  font-weight: 800;
  padding: 0.1rem 0.38rem;
  border-radius: 5px;
  letter-spacing: 0.02em;
}

.currency-chip--usd {
  background: rgba(44, 140, 242, 0.12);
  color: #1d4ed8;
}

.currency-chip--lbp {
  background: rgba(25, 119, 131, 0.12);
  color: #197783;
}

.draft-chip {
  font-size: 0.62rem;
  font-weight: 800;
  padding: 0.1rem 0.38rem;
  border-radius: 5px;
  letter-spacing: 0.02em;
  background: rgba(245, 158, 11, 0.15);
  color: #b45309;
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.result-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  flex: 1;
}

.receipts-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex: 1;
  min-height: 200px;
  color: rgba(0, 0, 0, 0.5);
  font-weight: 500;
  padding: 2rem;
}

.receipts-empty .empty-illustration {
  width: 88px;
  height: 88px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(25, 119, 131, 0.1), rgba(50, 216, 238, 0.16));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #197783;
  margin-bottom: 0.5rem;
  border: 1px dashed rgba(25, 119, 131, 0.25);
}

.empty-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: #1e293b;
}

.empty-hint {
  font-size: 0.84rem;
  color: #94a3b8;
  text-align: center;
  max-width: 280px;
}

.empty-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.65rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #197783, #32d8ee);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(25, 119, 131, 0.28);
  transition: transform 0.15s, box-shadow 0.15s;
}

.empty-action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(25, 119, 131, 0.35);
}

.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 1rem;
  border-top: 1px solid #eef2f7;
  background: linear-gradient(180deg, #fafcfe, #f4f8fb);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.rows-per-page-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
}

.dropdown-container {
  position: relative;
}

.dropdown-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  font-size: 0.82rem;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.dropdown-trigger:hover,
.dropdown-trigger.dropdown-open {
  border-color: #197783;
  box-shadow: 0 0 0 3px rgba(25, 119, 131, 0.1);
}

.dropdown-arrow {
  color: #64748b;
  transition: transform 0.2s ease;
}

.dropdown-arrow.rotated {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  bottom: calc(100% + 4px);
  inset-inline-start: 0;
  min-width: 72px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
  z-index: 10;
  overflow: hidden;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 0.45rem 0.75rem;
  border: none;
  background: #fff;
  font-size: 0.82rem;
  font-weight: 500;
  color: #374151;
  text-align: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.dropdown-item:hover,
.dropdown-item.selected {
  background: rgba(25, 119, 131, 0.1);
  color: #197783;
}

.pagination-container {
  display: flex;
  align-items: center;
  gap: 0;
  margin-inline-start: auto;
}

.pagination-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #495057;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-btn:hover:not(.disabled) {
  background: #197783;
  color: #fff;
  border-color: #197783;
}

.pagination-btn.disabled {
  opacity: 0.45;
  cursor: not-allowed;
  background: #f1f5f9;
  color: #94a3b8;
}

.pagination-pages {
  display: flex;
  gap: 4px;
  margin: 0 6px;
}

.pagination-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #495057;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.pagination-page:hover {
  background: #197783;
  color: #fff;
  border-color: #197783;
}

.pagination-page.active {
  background: #197783;
  color: #fff;
  border-color: #197783;
  font-weight: 700;
}

.pagination-ellipsis {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: #94a3b8;
  font-size: 0.82rem;
}

[dir="rtl"] .pagination-btn:first-child .v-icon {
  transform: rotate(180deg);
}

[dir="rtl"] .pagination-btn:last-child .v-icon {
  transform: rotate(180deg);
}

[dir="rtl"] .receipts-page-subtitle {
  padding-inline-start: 3.05rem;
  padding-inline-end: 0;
}

[dir="rtl"] .header-main {
  order: 1;
}

[dir="rtl"] .header-stats {
  order: 2;
  flex-direction: row-reverse;
}

[dir="rtl"] .stat-pill {
  flex-direction: row-reverse;
}

[dir="rtl"] .apply-btn {
  min-width: 150px;
}

[dir="rtl"] .filter-field--ar :deep(input) {
  text-align: right;
}

[dir="rtl"] .filter-field--ar :deep(input)::placeholder {
  text-align: right;
}

.empty-action-btn--ar {
  min-width: 160px;
  justify-content: center;
}

[dir="rtl"] .result-info-top {
  flex-direction: row-reverse;
}

.date-group-cards--solo .result-card {
  width: 100%;
}

[dir="rtl"] .result-meta-row {
  flex-direction: row-reverse;
}

[dir="rtl"] .filter-actions {
  flex-direction: row-reverse;
}

@media (max-width: 900px) {
  .filter-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-field-customer {
    grid-column: span 2;
  }

  .results-header {
    flex-direction: column;
    align-items: stretch;
  }

  .results-header-actions {
    max-width: none;
  }

  .pagination-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .pagination-container {
    margin-inline-start: 0;
    justify-content: center;
  }
}

@media (min-width: 1200px) {
  .receipts-content {
    max-width: min(1400px, 96vw);
    padding: 1.25rem 2rem;
  }

  .receipts-page-title {
    font-size: 1.6rem;
  }

  .results-section {
    max-height: none;
    min-height: calc(100vh - 280px);
  }

  .filter-fields {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 1rem;
    padding: 1rem 1.25rem 0.65rem;
  }

  .results-header {
    padding: 1rem 1.25rem;
  }

  .pagination-bar {
    padding: 0.75rem 1.25rem;
  }

  .search-control {
    max-width: 320px;
  }

  .receipt-date-group {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 0.65rem;
    align-items: start;
  }

  .date-timeline {
    grid-column: 1 / -1;
    margin-bottom: 0.35rem;
  }

  .date-group-cards {
    display: contents;
  }

  .result-card--solo {
    grid-column: 1 / -1;
  }

  .receipt-date-heading {
    margin-bottom: 0;
  }

  .result-card {
    margin-bottom: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .result-card-body {
    flex: 1;
  }
}

@media (min-width: 1600px) {
  .receipts-content {
    max-width: min(1600px, 94vw);
  }

  .receipt-date-group {
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  }
}
</style>
