<template>
  <div class="m-receipts m-page" :dir="lang.dir">
    <header class="m-receipts__header">
      <div class="m-receipts__title-row">
        <h1>
          <v-icon size="22" class="m-receipts__title-icon">
            {{ isDraftsMode ? 'mdi-file-document-edit-outline' : 'mdi-receipt-text' }}
          </v-icon>
          {{ isDraftsMode ? $t('drafts') : $t('receipts') }}
        </h1>
        <button
          type="button"
          class="m-receipts__refresh"
          :class="{ 'is-spinning': loading }"
          :disabled="loading"
          :aria-label="$t('search')"
          @click="loadReceipts()"
        >
          <v-icon size="20">mdi-refresh</v-icon>
        </button>
      </div>
      <p v-if="!loading && pagination.totalItems > 0" class="m-receipts__count">
        {{ pagination.totalItems }}
        {{ isDraftsMode ? $t('drafts') : $t('receiptsFoundLabel') }}
      </p>
    </header>

    <div class="m-receipts__search">
      <v-icon size="18" class="m-receipts__search-icon">mdi-magnify</v-icon>
      <input
        v-model="quickSearch"
        type="search"
        enterkeyhint="search"
        class="m-receipts__search-input"
        :placeholder="$t('searchCustomer')"
        @input="onQuickSearchInput"
      />
      <button
        v-if="quickSearch"
        type="button"
        class="m-receipts__search-clear"
        :aria-label="$t('reset')"
        @click="clearQuickSearch"
      >
        <v-icon size="16">mdi-close</v-icon>
      </button>
    </div>

    <div
      class="m-filters"
      :class="{ 'm-filters--open': !filtersCollapsed }"
    >
      <button
        type="button"
        class="m-filters__toggle"
        @click="filtersCollapsed = !filtersCollapsed"
      >
        <span class="m-filters__toggle-icon">
          <v-icon size="18">mdi-filter-variant</v-icon>
        </span>
        <span class="m-filters__toggle-label">{{ $t('applyFilters') }}</span>
        <span v-if="activeFilterEntries.length" class="m-filters__badge">
          {{ activeFilterEntries.length }}
        </span>
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
          <div v-if="activeFilterEntries.length" class="m-filters__chips">
            <span
              v-for="entry in activeFilterEntries"
              :key="entry.key"
              class="m-filters__chip"
            >
              <span>
                <strong>{{ entry.label }}</strong>: {{ entry.value }}
              </span>
              <button type="button" class="m-filters__chip-remove" @click.stop="removeFilter(entry.key)">
                <v-icon size="14">mdi-close</v-icon>
              </button>
            </span>
          </div>

          <div class="m-filters__fields">
            <div class="m-filters__field">
              <label>{{ $t('fromDate') }}</label>
              <PosDateInput v-model="filters.fromDate" :placeholder="$t('selectDatePlaceholder')" />
            </div>
            <div class="m-filters__field">
              <label>{{ $t('toDate') }}</label>
              <PosDateInput v-model="filters.toDate" :placeholder="$t('selectDatePlaceholder')" />
            </div>
            <div class="m-filters__field">
              <label>{{ $t('fromTime') }}</label>
              <PosTimeInput v-model="filters.fromTime" :placeholder="$t('selectTimePlaceholder')" />
            </div>
            <div class="m-filters__field">
              <label>{{ $t('toTime') }}</label>
              <PosTimeInput v-model="filters.toTime" :placeholder="$t('selectTimePlaceholder')" />
            </div>
            <div class="m-filters__field m-filters__field--full">
              <label>{{ $t('customerName') }}</label>
              <v-text-field
                v-model="filters.customerName"
                variant="outlined"
                density="comfortable"
                hide-details
                class="m-filters__customer"
                :placeholder="$t('customerNamePlaceholder')"
                prepend-inner-icon="mdi-account"
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
              @click="loadReceipts(true)"
            >
              <v-icon size="18">mdi-magnify</v-icon>
              {{ loading ? $t('searching') : $t('applyFilters') }}
            </button>
          </div>
        </div>
      </v-expand-transition>
    </div>

    <section class="m-results">
      <div v-if="loading" class="m-results__skeleton">
        <div v-for="n in 4" :key="n" class="m-skeleton-card">
          <div class="m-skeleton-line m-skeleton-line--wide" />
          <div class="m-skeleton-line m-skeleton-line--medium" />
          <div class="m-skeleton-line m-skeleton-line--short" />
        </div>
      </div>

      <div v-else-if="receipts.length === 0" class="m-empty">
        <div class="m-empty__icon">
          <v-icon size="48">
            {{ isDraftsMode ? 'mdi-file-document-edit-outline' : 'mdi-receipt-text-remove-outline' }}
          </v-icon>
        </div>
        <span class="m-empty__title">{{ isDraftsMode ? $t('noDraftsFound') : $t('noReceiptsFound') }}</span>
        <span class="m-empty__hint">{{ isDraftsMode ? $t('noDraftsHint') : $t('noReceiptsHint') }}</span>
        <button type="button" class="m-empty__btn" @click="loadReceipts(true)">
          <v-icon size="18">mdi-magnify</v-icon>
          {{ $t('search') }}
        </button>
      </div>

      <div v-else class="m-results__list">
        <div
          v-for="group in groupedReceipts"
          :key="group.dateKey"
          class="m-date-group"
        >
          <div class="m-date-group__heading">
            <v-icon size="15">mdi-calendar-month</v-icon>
            <span>{{ group.dateLabel }}</span>
            <span class="m-date-group__count">{{ group.items.length }}</span>
          </div>

          <article
            v-for="receipt in group.items"
            :key="receipt.receiptId"
            class="m-card"
          >
            <div class="m-card__body">
              <span class="m-card__avatar">{{ customerInitial(receipt.customerName) }}</span>
              <div class="m-card__info">
                <span class="m-card__customer">
                  {{ receipt.customerName || $t('walkInCustomer') }}
                </span>
                <div class="m-card__meta">
                  <span class="m-card__time">
                    <v-icon size="13">mdi-clock-outline</v-icon>
                    {{ formatTime(receipt.receiptTime) }}
                  </span>
                  <span
                    class="m-card__currency"
                    :class="isDollarReceipt(receipt) ? 'is-usd' : 'is-lbp'"
                  >
                    {{ currencyLabel(receipt) }}
                  </span>
                  <span v-if="isDraftsMode" class="m-card__draft">{{ $t('draftBadge') }}</span>
                </div>
              </div>
              <span class="m-card__total">{{ formatTotal(receipt) }}</span>
            </div>

            <div v-if="!isDraftsMode && hasPaymentInfo(receipt)" class="m-card__payments">
              <span v-if="Number(receipt.payWish)" class="m-pay m-pay--wish">
                W {{ formatPayWish(receipt) }}
              </span>
              <span v-if="Number(receipt.payDollar)" class="m-pay m-pay--usd">
                {{ formatUsd(receipt.payDollar) }}
              </span>
              <span v-if="Number(receipt.payLebanese)" class="m-pay m-pay--lbp">
                {{ formatLbp(receipt.payLebanese) }}
              </span>
              <span v-if="Number(receipt.receiptDiscount)" class="m-pay m-pay--discount">
                {{ $t('discount') }}: {{ formatDiscount(receipt) }}
              </span>
            </div>

            <div v-if="isDraftsMode" class="m-card__actions m-card__actions--draft">
              <div class="m-card__secondary">
                <button
                  type="button"
                  class="m-card__btn"
                  @click="openDetails(receipt.receiptId)"
                >
                  <v-icon size="18">mdi-text-box-outline</v-icon>
                  {{ $t('receiptDetails') }}
                </button>
                <button
                  type="button"
                  class="m-card__btn"
                  @click="openItems(receipt.receiptId)"
                >
                  <v-icon size="18">mdi-cart-outline</v-icon>
                  {{ $t('receiptItems') }}
                </button>
              </div>
              <button
                type="button"
                class="m-card__resume"
                @click="continueInPos(receipt.receiptId)"
              >
                <v-icon size="20">mdi-play-circle</v-icon>
                {{ $t('continueInPos') }}
              </button>
            </div>
            <div v-else class="m-card__actions">
              <button
                type="button"
                class="m-card__btn"
                @click="openDetails(receipt.receiptId)"
              >
                <v-icon size="18">mdi-text-box-outline</v-icon>
                {{ $t('receiptDetails') }}
              </button>
              <button
                type="button"
                class="m-card__btn m-card__btn--items"
                @click="openItems(receipt.receiptId)"
              >
                <v-icon size="18">mdi-cart-outline</v-icon>
                {{ $t('receiptItems') }}
              </button>
            </div>
          </article>
        </div>
      </div>

      <div v-if="!loading && pagination.totalItems > 0" class="m-pagination">
        <div class="m-pagination__size">
          <span>{{ $t('Show') }}</span>
          <div class="m-pagination__dropdown">
            <button
              type="button"
              class="m-pagination__trigger"
              :class="{ open: isPageSizeOpen }"
              @click="isPageSizeOpen = !isPageSizeOpen"
            >
              {{ pagination.itemsPerPage }}
              <v-icon size="16" :class="{ rotated: isPageSizeOpen }">mdi-chevron-down</v-icon>
            </button>
            <div v-if="isPageSizeOpen" class="m-pagination__menu">
              <button
                v-for="opt in pageSizeOptions"
                :key="opt"
                type="button"
                class="m-pagination__option"
                :class="{ selected: pagination.itemsPerPage === opt }"
                @click="selectPageSize(opt)"
              >
                {{ opt }}
              </button>
            </div>
          </div>
        </div>

        <div class="m-pagination__nav">
          <button
            type="button"
            class="m-pagination__btn"
            :disabled="pagination.page <= 1"
            @click="goPage(pagination.page - 1)"
          >
            <v-icon size="20">mdi-chevron-left</v-icon>
          </button>
          <span class="m-pagination__page" dir="ltr">
            {{ pagination.page }} / {{ totalPages }}
          </span>
          <button
            type="button"
            class="m-pagination__btn"
            :disabled="pagination.page >= totalPages"
            @click="goPage(pagination.page + 1)"
          >
            <v-icon size="20">mdi-chevron-right</v-icon>
          </button>
        </div>
      </div>
    </section>

    <ReceiptDetailsMobile
      v-model="detailsOpen"
      :receipt-id="selectedReceiptId"
      :is-draft="isDraftsMode"
      @preview="onDetailsPreview"
    />
    <ReceiptItemsMobile v-model="itemsOpen" :receipt-id="selectedReceiptId" />
    <ReceiptPrintPreviewDialog v-model="previewOpen" :receipt-id="selectedReceiptId" />
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PosDateInput from '../../components/PosDateInput.vue'
import PosTimeInput from '../../components/PosTimeInput.vue'
import ReceiptDetailsMobile from '../../components/mobile/ReceiptDetailsMobile.vue'
import ReceiptItemsMobile from '../../components/mobile/ReceiptItemsMobile.vue'
import ReceiptPrintPreviewDialog from '../../components/ReceiptPrintPreviewDialog.vue'
import ReceiptService from '../../services/ReceiptService'
import { useState } from '../../store/state'
import { isDollarReceipt } from '../../constants/currency'

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
const previewOpen = ref(false)
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
  if (isDollarReceipt(receipt)) return formatUsd(num)
  return formatLbp(num)
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
  if (isDollarReceipt(receipt)) return formatUsd(val)
  return formatLbp(val)
}

function hasPaymentInfo(receipt) {
  return Number(receipt.payWish) > 0
    || Number(receipt.payDollar) > 0
    || Number(receipt.payLebanese) > 0
    || Number(receipt.receiptDiscount) > 0
}

function currencyLabel(receipt) {
  if (isDollarReceipt(receipt)) return state.lang === 'ar' ? 'دولار' : 'USD'
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
  if (!e.target.closest('.m-pagination__dropdown')) isPageSizeOpen.value = false
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

function openPreview(receiptId) {
  selectedReceiptId.value = receiptId
  previewOpen.value = true
}

function onDetailsPreview(receiptId) {
  openPreview(receiptId)
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
.m-receipts {
  color: #16363a;
}

.m-receipts__header {
  margin-bottom: 0.85rem;
}

.m-receipts__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.m-receipts__header h1 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
  color: #16363a;
  letter-spacing: -0.02em;
}

.m-receipts__title-icon {
  color: #197783;
}

.m-receipts__count {
  margin: 0.3rem 0 0;
  font-size: 0.82rem;
  color: #5f7a7e;
}

.m-receipts__refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(25, 119, 131, 0.18);
  border-radius: 12px;
  background: #fff;
  color: #197783;
  cursor: pointer;
  flex-shrink: 0;
}

.m-receipts__refresh:disabled {
  opacity: 0.6;
  cursor: default;
}

.m-receipts__refresh.is-spinning .v-icon {
  animation: m-spin 0.8s linear infinite;
}

@keyframes m-spin {
  to { transform: rotate(360deg); }
}

.m-receipts__search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 48px;
  padding: 0 0.85rem;
  margin-bottom: 0.75rem;
  border-radius: 14px;
  background: #fff;
  border: 1px solid rgba(25, 119, 131, 0.14);
  box-shadow: 0 4px 14px rgba(22, 54, 58, 0.04);
}

.m-receipts__search-icon {
  color: #197783;
  flex-shrink: 0;
}

.m-receipts__search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.95rem;
  color: #16363a;
  height: 44px;
}

.m-receipts__search-input::placeholder {
  color: #8aa0a4;
}

.m-receipts__search-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: #eef5f6;
  color: #5f7a7e;
  cursor: pointer;
}

.m-filters {
  margin-bottom: 1rem;
  border-radius: 16px;
  background: #fff;
  border: 1px solid rgba(25, 119, 131, 0.12);
  box-shadow: 0 6px 18px rgba(22, 54, 58, 0.05);
  overflow: hidden;
}

.m-filters__toggle {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  min-height: 48px;
  padding: 0.65rem 0.9rem;
  border: none;
  background: transparent;
  color: #16363a;
  cursor: pointer;
  text-align: start;
}

.m-filters__toggle-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, #197783, #32d8ee);
  color: #fff;
  flex-shrink: 0;
}

.m-filters__toggle-label {
  flex: 1;
  font-weight: 700;
  font-size: 0.92rem;
}

.m-filters__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: rgba(25, 119, 131, 0.12);
  color: #197783;
  font-size: 0.75rem;
  font-weight: 700;
}

.m-filters__chevron {
  color: #5f7a7e;
  transition: transform 0.2s ease;
}

.m-filters__chevron.rotated {
  transform: rotate(180deg);
}

.m-filters__panel {
  padding: 0 0.9rem 0.95rem;
  border-top: 1px solid rgba(25, 119, 131, 0.08);
}

.m-filters__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding-top: 0.75rem;
}

.m-filters__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  max-width: 100%;
  padding: 0.35rem 0.45rem 0.35rem 0.6rem;
  border-radius: 999px;
  background: #eef5f6;
  color: #16363a;
  font-size: 0.78rem;
}

.m-filters__chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #5f7a7e;
  cursor: pointer;
}

.m-filters__fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  padding-top: 0.85rem;
}

.m-filters__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.m-filters__field--full {
  grid-column: 1 / -1;
}

.m-filters__field label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #5f7a7e;
}

.m-filters__actions {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.9rem;
}

.m-filters__reset,
.m-filters__apply {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 48px;
  padding: 0 1rem;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
}

.m-filters__reset {
  flex: 0 0 auto;
  border: 1px solid rgba(25, 119, 131, 0.28);
  background: #fff;
  color: #197783;
}

.m-filters__apply {
  flex: 1;
  border: none;
  background: linear-gradient(135deg, #197783, #32d8ee);
  color: #fff;
}

.m-filters__apply:disabled {
  opacity: 0.7;
  cursor: default;
}

.m-results__skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.m-skeleton-card {
  padding: 1rem;
  border-radius: 16px;
  background: #fff;
  border: 1px solid rgba(25, 119, 131, 0.08);
}

.m-skeleton-line {
  height: 12px;
  border-radius: 8px;
  background: linear-gradient(90deg, #eef5f6 25%, #f7fbfc 50%, #eef5f6 75%);
  background-size: 200% 100%;
  animation: m-shimmer 1.2s ease-in-out infinite;
  margin-bottom: 0.55rem;
}

.m-skeleton-line--wide { width: 72%; }
.m-skeleton-line--medium { width: 48%; }
.m-skeleton-line--short { width: 28%; margin-bottom: 0; }

@keyframes m-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.m-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2.25rem 1rem;
  border-radius: 18px;
  background: #fff;
  border: 1px solid rgba(25, 119, 131, 0.1);
}

.m-empty__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  margin-bottom: 0.75rem;
  border-radius: 50%;
  background: #eef5f6;
  color: #197783;
}

.m-empty__title {
  font-size: 1.05rem;
  font-weight: 800;
  color: #16363a;
}

.m-empty__hint {
  margin-top: 0.35rem;
  font-size: 0.85rem;
  color: #5f7a7e;
}

.m-empty__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 44px;
  margin-top: 1rem;
  padding: 0 1.1rem;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #197783, #32d8ee);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.m-results__list {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.m-date-group__heading {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.55rem;
  color: #5f7a7e;
  font-size: 0.8rem;
  font-weight: 700;
}

.m-date-group__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: rgba(25, 119, 131, 0.1);
  color: #197783;
  font-size: 0.72rem;
}

.m-card {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  margin-bottom: 0.7rem;
  padding: 0.9rem 0.95rem;
  border-radius: 18px;
  background: #fff;
  border: 1px solid rgba(25, 119, 131, 0.1);
  box-shadow: 0 8px 22px rgba(22, 54, 58, 0.06);
  position: relative;
  overflow: hidden;
}

.m-card::before {
  content: '';
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 4px;
  background: linear-gradient(180deg, #197783, #2ad4e8);
}

.m-card:last-child {
  margin-bottom: 0;
}

.m-card__body {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
}

.m-card__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(25, 119, 131, 0.16), rgba(50, 216, 238, 0.22));
  color: #197783;
  font-weight: 800;
  font-size: 0.95rem;
  flex-shrink: 0;
}

.m-card__info {
  flex: 1;
  min-width: 0;
}

.m-card__customer {
  display: block;
  font-size: 0.98rem;
  font-weight: 800;
  color: #16363a;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.35rem;
}

.m-card__time {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  color: #5f7a7e;
  font-size: 0.78rem;
}

.m-card__currency,
.m-card__draft {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 0.45rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
}

.m-card__currency.is-usd {
  background: rgba(25, 119, 131, 0.1);
  color: #197783;
}

.m-card__currency.is-lbp {
  background: rgba(44, 140, 242, 0.12);
  color: #1d6fb8;
}

.m-card__draft {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.m-card__total {
  flex-shrink: 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: #197783;
  white-space: nowrap;
}

.m-card__payments {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.m-pay {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
}

.m-pay--wish {
  background: rgba(124, 58, 237, 0.1);
  color: #6d28d9;
}

.m-pay--usd {
  background: rgba(25, 119, 131, 0.1);
  color: #197783;
}

.m-pay--lbp {
  background: rgba(44, 140, 242, 0.12);
  color: #1d6fb8;
}

.m-pay--discount {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.m-card__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.m-card__actions--draft {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.m-card__secondary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.m-card__btn,
.m-card__resume {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 44px;
  padding: 0 0.7rem;
  border-radius: 12px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.m-card__btn {
  border: 1px solid rgba(25, 119, 131, 0.22);
  background: #eef5f6;
  color: #197783;
}

.m-card__btn--items {
  background: rgba(50, 216, 238, 0.12);
  border-color: rgba(50, 216, 238, 0.35);
}

.m-card__resume {
  border: none;
  background: linear-gradient(135deg, #197783, #32d8ee);
  color: #fff;
}

.m-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 0.65rem 0.75rem;
  border-radius: 14px;
  background: #fff;
  border: 1px solid rgba(25, 119, 131, 0.1);
}

.m-pagination__size {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: #5f7a7e;
  font-size: 0.82rem;
  font-weight: 600;
}

.m-pagination__dropdown {
  position: relative;
}

.m-pagination__trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  min-height: 40px;
  min-width: 52px;
  padding: 0 0.55rem;
  border: 1px solid rgba(25, 119, 131, 0.2);
  border-radius: 10px;
  background: #eef5f6;
  color: #16363a;
  font-weight: 700;
  cursor: pointer;
}

.m-pagination__trigger .v-icon,
.m-pagination__trigger .rotated {
  transition: transform 0.2s ease;
}

.m-pagination__trigger .rotated {
  transform: rotate(180deg);
}

.m-pagination__menu {
  position: absolute;
  bottom: calc(100% + 4px);
  inset-inline-start: 0;
  z-index: 5;
  min-width: 100%;
  padding: 0.25rem;
  border-radius: 10px;
  background: #fff;
  border: 1px solid rgba(25, 119, 131, 0.14);
  box-shadow: 0 8px 20px rgba(22, 54, 58, 0.12);
}

.m-pagination__option {
  display: block;
  width: 100%;
  min-height: 40px;
  padding: 0 0.55rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #16363a;
  font-weight: 600;
  text-align: start;
  cursor: pointer;
}

.m-pagination__option.selected,
.m-pagination__option:hover {
  background: #eef5f6;
  color: #197783;
}

.m-pagination__nav {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.m-pagination__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(25, 119, 131, 0.18);
  border-radius: 12px;
  background: #eef5f6;
  color: #197783;
  cursor: pointer;
}

.m-pagination__btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.m-pagination__page {
  min-width: 3.2rem;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: #16363a;
}
</style>
