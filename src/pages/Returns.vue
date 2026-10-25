<template>
  <div class="returns-page">
    <div class="returns-atmosphere" aria-hidden="true" />
    <TopBar />

    <div class="returns-shell" :dir="state.dir">
      <header class="desk-header">
        <div class="desk-header__brand">
          <span class="desk-header__icon">
            <v-icon size="26">mdi-cash-refund</v-icon>
          </span>
          <div>
            <h1 class="desk-header__title">{{ $t('returns') }}</h1>
            <p class="desk-header__subtitle">{{ $t('returnsSubtitle') }}</p>
          </div>
        </div>

        <div class="desk-header__ribbon">
          <div class="ribbon-stat">
            <span class="ribbon-stat__value">{{ todayCount }}</span>
            <span class="ribbon-stat__label">{{ $t('returnTodayCount') }}</span>
          </div>
          <span class="ribbon-divider" />
          <span class="scanner-pill" :class="{ 'scanner-pill--off': scanDialog || saving }">
            <span class="scanner-pill__dot" />
            {{ $t('returnScannerReady') }}
          </span>
        </div>
      </header>

      <div class="desk-grid">
        <!-- Workspace -->
        <section class="desk-col workspace">
          <div ref="searchWrap" class="scan-bar">
            <div class="scan-bar__field">
              <v-icon class="scan-bar__lead" size="22">mdi-magnify</v-icon>
              <PosAutocomplete
                :key="searchKey"
                v-model="selectedItem"
                :placeholder="$t('returnSearchItem')"
                :items="itemOptions"
                :item-title="itemName"
                item-value="id"
                return-object
                :loading="itemLoading"
                :no-data-text="$t('noAutocompleteResults')"
                :disabled="saving"
                class="scan-bar__ac"
                @update:search="onItemSearch"
              >
                <template #item="{ item }">
                  <span class="option">
                    <span class="thumb thumb--sm">
                      <img v-if="imageSrc(item)" :src="imageSrc(item)" alt="" />
                      <span v-else>{{ initials(item) }}</span>
                    </span>
                    <span class="option__text">
                      <strong>{{ itemName(item) }}</strong>
                      <small v-if="item.barcode" dir="ltr">{{ item.barcode }}</small>
                    </span>
                  </span>
                </template>
              </PosAutocomplete>
              <kbd class="kbd scan-bar__kbd">F2</kbd>
            </div>
            <button type="button" class="scan-bar__btn" :disabled="saving" @click="scanDialog = true">
              <v-icon size="22">mdi-barcode-scan</v-icon>
              <span>{{ $t('scanBarcode') }}</span>
            </button>
          </div>

          <div class="workspace__head">
            <h2 class="section-title">
              <v-icon size="18">mdi-package-variant-closed</v-icon>
              {{ $t('returnItems') }}
              <span class="count-pill">{{ lines.length }}</span>
            </h2>
            <button v-if="lines.length" type="button" class="link-btn" :disabled="saving" @click="clearForm">
              <v-icon size="16">mdi-broom</v-icon>
              {{ $t('returnClear') }}
            </button>
          </div>

          <div class="workspace__body">
            <div v-if="!lines.length" class="empty-stage">
              <div class="empty-stage__art">
                <span class="empty-stage__ring" />
                <span class="empty-stage__ring empty-stage__ring--2" />
                <span class="empty-stage__core">
                  <v-icon size="40">mdi-barcode-scan</v-icon>
                </span>
                <span class="empty-stage__laser" />
              </div>
              <strong>{{ $t('returnScanOrSearch') }}</strong>
              <span>{{ $t('returnScanHint') }}</span>
            </div>

            <transition-group v-else name="tile" tag="div" class="tiles">
              <article
                v-for="line in lines"
                :key="line.key"
                class="tile"
                :class="{ 'tile--flash': flashKey === line.key }"
              >
                <div class="tile__top">
                  <span class="thumb">
                    <img v-if="imageSrc(line)" :src="imageSrc(line)" alt="" />
                    <span v-else>{{ initials(line) }}</span>
                  </span>
                  <div class="tile__info">
                    <strong class="tile__name" :title="itemName(line)">{{ itemName(line) }}</strong>
                    <small v-if="line.barcode" class="tile__code" dir="ltr">
                      <v-icon size="12">mdi-barcode</v-icon>
                      {{ line.barcode }}
                    </small>
                  </div>
                </div>

                <div class="tile__bottom">
                  <div class="tile__field">
                    <span class="mini-label">{{ $t('returnQuantity') }}</span>
                    <div class="stepper" dir="ltr">
                      <button
                        type="button"
                        class="stepper__btn"
                        :disabled="saving || line.quantity <= 1"
                        aria-label="-"
                        @click="changeQuantity(line, -1)"
                      >
                        <v-icon size="18">mdi-minus</v-icon>
                      </button>
                      <input
                        v-model.number="line.quantity"
                        type="number"
                        min="1"
                        class="stepper__input"
                        :class="{ 'is-invalid': !isValidQuantity(line.quantity) }"
                        :disabled="saving"
                        @blur="normalizeQuantity(line)"
                      />
                      <button
                        type="button"
                        class="stepper__btn"
                        :disabled="saving"
                        aria-label="+"
                        @click="changeQuantity(line, 1)"
                      >
                        <v-icon size="18">mdi-plus</v-icon>
                      </button>
                    </div>
                  </div>

                  <div class="tile__field tile__field--grow">
                    <span class="mini-label">{{ $t('returnRefundPrice') }}</span>
                    <v-text-field
                      v-model.number="line.price"
                      type="number"
                      min="0"
                      variant="outlined"
                      density="compact"
                      hide-details
                      dir="ltr"
                      color="#197783"
                      :prefix="isDollar ? '$' : undefined"
                      :suffix="isDollar ? undefined : lbpSymbol"
                      class="price-input price-field-no-arrows"
                      :error="!isValidPrice(line.price)"
                      :disabled="saving"
                    >
                      <template v-if="isPriceEdited(line)" #append-inner>
                        <button
                          type="button"
                          class="reset-price"
                          :title="$t('returnResetPrice')"
                          :aria-label="$t('returnResetPrice')"
                          @click="resetPrice(line)"
                        >
                          <v-icon size="16">mdi-restore</v-icon>
                        </button>
                      </template>
                    </v-text-field>
                  </div>

                  <div class="tile__field tile__total">
                    <span class="mini-label">{{ $t('returnTotal') }}</span>
                    <strong class="tile__amount" dir="ltr">{{ formatMoney(lineTotal(line), currency) }}</strong>
                  </div>

                  <button
                    type="button"
                    class="tile__remove"
                    :aria-label="$t('remove')"
                    :disabled="saving"
                    @click="removeLine(line.key)"
                  >
                    <v-icon size="18">mdi-trash-can-outline</v-icon>
                  </button>
                </div>
              </article>
            </transition-group>
          </div>
        </section>

        <!-- Refund slip -->
        <section class="desk-col slip-col">
          <div class="slip">
            <div class="slip__head">
              <span class="slip__badge">
                <v-icon size="20">mdi-cash-refund</v-icon>
              </span>
              <div class="slip__head-text">
                <strong>{{ $t('returnSlip') }}</strong>
                <small dir="ltr">{{ clockDate }} · {{ clockTime }}</small>
              </div>
            </div>

            <div class="segmented" role="tablist" :aria-label="$t('returnRefundCurrency')">
              <button
                v-for="option in currencyOptions"
                :key="option.value"
                type="button"
                class="segmented__btn"
                :class="{ 'segmented__btn--on': currency === option.value }"
                :disabled="saving"
                @click="setCurrency(option.value)"
              >
                <v-icon size="17">{{ option.icon }}</v-icon>
                {{ option.label }}
              </button>
            </div>

            <label class="slip__customer">
              <v-icon size="18">mdi-account-outline</v-icon>
              <input
                v-model="customerName"
                type="text"
                :placeholder="$t('returnCustomerOptional')"
                :disabled="saving"
              />
            </label>

            <div class="slip__rule" />

            <ul class="slip__lines">
              <li v-if="!lines.length" class="slip__placeholder">— {{ $t('returnNoItems') }} —</li>
              <li v-for="line in lines" :key="`slip-${line.key}`" class="slip__line">
                <span class="slip__line-name">{{ itemName(line) }}</span>
                <span class="slip__line-qty" dir="ltr">×{{ isValidQuantity(line.quantity) ? line.quantity : 0 }}</span>
                <span class="slip__line-amount" dir="ltr">{{ formatMoney(lineTotal(line), currency) }}</span>
              </li>
            </ul>

            <div class="slip__rule" />

            <div class="slip__counts">
              <span>{{ $t('returnLines') }} <strong>{{ lines.length }}</strong></span>
              <span>{{ $t('returnUnits') }} <strong>{{ unitCount }}</strong></span>
            </div>

            <div class="slip__total">
              <span>{{ $t('returnTotal') }}</span>
              <strong dir="ltr">{{ formatMoney(total, currency) }}</strong>
            </div>

            <p class="slip__note">
              <v-icon size="14">mdi-information-outline</v-icon>
              {{ $t('returnDeductionNote') }}
            </p>
          </div>

          <button type="button" class="save-btn" :disabled="!canSave" @click="saveReturn">
            <v-progress-circular v-if="saving" indeterminate size="20" width="2" color="white" />
            <v-icon v-else size="22">mdi-check-circle-outline</v-icon>
            {{ $t('saveReturn') }}
            <kbd class="kbd kbd--light">F9</kbd>
          </button>
        </section>

        <!-- Timeline -->
        <section class="desk-col timeline-col">
          <div class="timeline-head">
            <h2 class="section-title">
              <v-icon size="18">mdi-timeline-clock-outline</v-icon>
              {{ $t('returnsHistory') }}
              <span class="count-pill">{{ pagination.totalItems }}</span>
            </h2>
            <div class="timeline-head__actions">
              <button
                type="button"
                class="icon-btn"
                :class="{ 'icon-btn--on': filtersOpen || hasActiveFilters }"
                :aria-label="$t('applyFilters')"
                @click="filtersOpen = !filtersOpen"
              >
                <v-icon size="18">mdi-filter-variant</v-icon>
              </button>
              <button
                type="button"
                class="icon-btn"
                :class="{ 'icon-btn--spin': listLoading }"
                :disabled="listLoading"
                :aria-label="$t('search')"
                @click="loadReturns()"
              >
                <v-icon size="18">mdi-refresh</v-icon>
              </button>
            </div>
          </div>

          <v-expand-transition>
            <div v-show="filtersOpen" class="timeline-filters">
              <PosDateInput v-model="filters.fromDate" :placeholder="$t('fromDate')" />
              <PosDateInput v-model="filters.toDate" :placeholder="$t('toDate')" />
              <v-text-field
                v-model="filters.customerName"
                variant="outlined"
                density="compact"
                hide-details
                color="#197783"
                :placeholder="$t('customerName')"
                prepend-inner-icon="mdi-account-search-outline"
                class="soft-input timeline-filters__wide"
                @keyup.enter="loadReturns(true)"
              />
              <div class="timeline-filters__actions">
                <button type="button" class="btn-ghost" :disabled="listLoading" @click="resetFilters">
                  {{ $t('reset') }}
                </button>
                <button type="button" class="btn-solid" :disabled="listLoading" @click="loadReturns(true)">
                  <v-icon size="16">mdi-magnify</v-icon>
                  {{ listLoading ? $t('searching') : $t('search') }}
                </button>
              </div>
            </div>
          </v-expand-transition>

          <div class="timeline">
            <div v-if="listLoading && !returns.length" class="timeline-empty">
              <v-progress-circular indeterminate size="26" width="3" color="#197783" />
            </div>
            <div v-else-if="!returns.length" class="timeline-empty">
              <v-icon size="34">mdi-inbox-outline</v-icon>
              <span>{{ $t('noReturnsFound') }}</span>
            </div>

            <section v-for="group in groupedReturns" :key="group.key" class="tl-group">
              <h3 class="tl-day">{{ group.label }}</h3>
              <article
                v-for="entry in group.entries"
                :key="entry.id"
                class="tl-item"
                :class="{ 'tl-item--open': expanded[entry.id] }"
              >
                <span class="tl-dot" />
                <div class="tl-card">
                  <button type="button" class="tl-card__head" @click="toggleExpanded(entry.id)">
                    <span class="tl-card__time" dir="ltr">{{ formatTime(entry.returnDate) }}</span>
                    <span class="tl-card__main">
                      <strong>{{ entry.customerName || $t('returnWalkIn') }}</strong>
                      <small>{{ entryUnits(entry) }} {{ $t('returnUnits') }}</small>
                    </span>
                    <strong class="tl-card__total" dir="ltr">−{{ formatMoney(entry.total, entry.currency) }}</strong>
                    <v-icon size="18" class="tl-card__chevron">mdi-chevron-down</v-icon>
                  </button>
                  <v-expand-transition>
                    <ul v-show="expanded[entry.id]" class="tl-card__items">
                      <li v-for="(item, index) in entry.items" :key="`${entry.id}-${index}`">
                        <span class="tl-card__item-name">{{ itemName(item) || $t('returnUnknownItem') }}</span>
                        <span class="tl-card__item-qty" dir="ltr">×{{ item.quantity || 1 }}</span>
                        <span dir="ltr">{{ formatMoney((item.quantity || 1) * (Number(item.price) || 0), entry.currency) }}</span>
                      </li>
                    </ul>
                  </v-expand-transition>
                </div>
              </article>
            </section>
          </div>

          <div v-if="pagination.totalPages > 1" class="pager">
            <button
              type="button"
              class="icon-btn"
              :disabled="listLoading || pagination.page <= 0"
              :aria-label="$t('previousPage')"
              @click="goToPage(pagination.page - 1)"
            >
              <v-icon size="18">{{ state.dir === 'rtl' ? 'mdi-chevron-right' : 'mdi-chevron-left' }}</v-icon>
            </button>
            <span class="pager__label" dir="ltr">{{ pagination.page + 1 }} / {{ pagination.totalPages }}</span>
            <button
              type="button"
              class="icon-btn"
              :disabled="listLoading || pagination.page >= pagination.totalPages - 1"
              :aria-label="$t('nextPage')"
              @click="goToPage(pagination.page + 1)"
            >
              <v-icon size="18">{{ state.dir === 'rtl' ? 'mdi-chevron-left' : 'mdi-chevron-right' }}</v-icon>
            </button>
          </div>
        </section>
      </div>
    </div>

    <transition name="saved">
      <div v-if="savedFlash" class="saved-overlay" :dir="state.dir">
        <div class="saved-card">
          <span class="saved-card__check">
            <v-icon size="40">mdi-check-bold</v-icon>
          </span>
          <strong>{{ $t('returnSaved') }}</strong>
          <span class="saved-card__amount" dir="ltr">−{{ formatMoney(savedFlash.total, savedFlash.currency) }}</span>
          <small>{{ $t('returnRefunded') }}</small>
        </div>
      </div>
    </transition>

    <HardwareBarcodeListenDialog v-model="scanDialog" @scanned="ingestBarcode" />
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import TopBar from '../components/TopBar.vue'
import PosAutocomplete from '../components/PosAutocomplete.vue'
import PosDateInput from '../components/PosDateInput.vue'
import HardwareBarcodeListenDialog from '../components/HardwareBarcodeListenDialog.vue'
import ItemService from '../services/ItemService'
import ReturnedObjectService from '../services/ReturnedObjectService'
import { useState } from '../store/state'
import { useHardwareBarcode } from '../composables/useHardwareBarcode'
import { useBarcodeCart } from '../composables/useBarcodeCart'
import { CurrencyEnum } from '../constants/enums'
import {
  isDollarCurrency,
  roundForCurrency,
  uiCurrencyToEnum,
  unitPriceInReceiptCurrency
} from '../constants/currency'

const instance = getCurrentInstance()
const state = useState()
const $t = (key) => instance?.appContext?.config?.globalProperties?.$t?.(key) ?? key
const $notification = (msg, status, delay) =>
  instance?.appContext?.config?.globalProperties?.$notification?.(msg, status, delay)

const locale = computed(() => (state.lang === 'ar' ? 'ar-LB' : 'en-US'))
const lbpSymbol = computed(() => (state.lang === 'ar' ? 'ل.ل.' : 'LBP'))
const currencyOptions = computed(() => [
  { value: CurrencyEnum.DOLLAR, label: 'USD', icon: 'mdi-currency-usd' },
  { value: CurrencyEnum.LBP, label: lbpSymbol.value, icon: 'mdi-cash' }
])

// Live clock: the server stamps the real return time on save
const now = ref(new Date())
let clockTimer = null
const clockDate = computed(() =>
  now.value.toLocaleDateString(locale.value, { day: 'numeric', month: 'short', year: 'numeric' })
)
const clockTime = computed(() =>
  now.value.toLocaleTimeString(locale.value, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: state.lang !== 'ar'
  })
)

// New return form
const currency = ref(uiCurrencyToEnum(state.currency))
const isDollar = computed(() => isDollarCurrency(currency.value))
const lines = ref([])
const customerName = ref('')
const saving = ref(false)
const scanDialog = ref(false)
const searchWrap = ref(null)
const flashKey = ref(null)
const savedFlash = ref(null)
let lineSeq = 0
let flashTimer = null
let savedTimer = null

const selectedItem = ref(null)
const searchKey = ref(0)
const itemOptions = ref([])
const itemLoading = ref(false)
let itemSearchTimer = null

const unitCount = computed(() =>
  lines.value.reduce((sum, line) => sum + (isValidQuantity(line.quantity) ? Number(line.quantity) : 0), 0)
)

const total = computed(() =>
  roundForCurrency(
    lines.value.reduce((sum, line) => sum + lineTotal(line), 0),
    currency.value
  )
)

const canSave = computed(
  () =>
    !saving.value &&
    lines.value.length > 0 &&
    lines.value.every((line) => isValidPrice(line.price) && isValidQuantity(line.quantity))
)

function itemName(item) {
  if (!item) return ''
  return state.lang === 'ar' ? item.nameAr || item.nameEn || '' : item.nameEn || item.nameAr || ''
}

function initials(item) {
  const name = itemName(item).trim()
  return name ? name.slice(0, 2).toUpperCase() : '?'
}

function imageSrc(item) {
  const image = item?.image
  if (!image) return null
  if (image.startsWith('data:image')) return image
  if (image.startsWith('/9j/')) return `data:image/jpeg;base64,${image}`
  if (image.startsWith('iVBORw0KGgo')) return `data:image/png;base64,${image}`
  return image
}

function isValidPrice(value) {
  if (value === '' || value === null || value === undefined) return false
  const n = Number(value)
  return Number.isFinite(n) && n >= 0
}

function isValidQuantity(value) {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1
}

function lineTotal(line) {
  const qty = isValidQuantity(line.quantity) ? Number(line.quantity) : 0
  return (Number(line.price) || 0) * qty
}

function systemPrice(line) {
  return unitPriceInReceiptCurrency(line.sellingPrice, line.sellingCurrency, currency.value, state.exchangeRate)
}

function isPriceEdited(line) {
  return Number(line.price) !== systemPrice(line)
}

function resetPrice(line) {
  line.price = systemPrice(line)
}

function flash(key) {
  clearTimeout(flashTimer)
  flashKey.value = key
  flashTimer = setTimeout(() => {
    flashKey.value = null
  }, 900)
}

function addLine(item) {
  if (!item || item.id == null) return
  const existing = lines.value.find((line) => line.itemId === item.id)
  if (existing) {
    existing.quantity = (isValidQuantity(existing.quantity) ? Number(existing.quantity) : 0) + 1
    lines.value = [existing, ...lines.value.filter((line) => line !== existing)]
    flash(existing.key)
    return
  }
  const line = {
    key: ++lineSeq,
    itemId: item.id,
    nameAr: item.nameAr,
    nameEn: item.nameEn,
    barcode: item.barcode,
    image: item.image,
    sellingPrice: item.sellingPrice,
    sellingCurrency: item.sellingCurrency,
    quantity: 1,
    price: 0
  }
  line.price = systemPrice(line)
  lines.value = [line, ...lines.value]
  flash(line.key)
}

function changeQuantity(line, delta) {
  const current = isValidQuantity(line.quantity) ? Number(line.quantity) : 1
  line.quantity = Math.max(1, current + delta)
}

function normalizeQuantity(line) {
  if (!isValidQuantity(line.quantity)) {
    const n = Math.floor(Number(line.quantity))
    line.quantity = Number.isFinite(n) && n >= 1 ? n : 1
  }
}

function removeLine(key) {
  lines.value = lines.value.filter((line) => line.key !== key)
}

function setCurrency(next) {
  if (next === currency.value) return
  const rate = Number(state.exchangeRate) > 0 ? Number(state.exchangeRate) : 1
  const toDollar = isDollarCurrency(next)
  lines.value.forEach((line) => {
    const value = Number(line.price) || 0
    line.price = roundForCurrency(toDollar ? value / rate : value * rate, next)
  })
  currency.value = next
}

function clearForm() {
  lines.value = []
  customerName.value = ''
  selectedItem.value = null
  searchKey.value++
}

function focusSearch() {
  searchWrap.value?.querySelector('input')?.focus()
}

async function fetchItems(query) {
  itemLoading.value = true
  try {
    const response = await ItemService.getUserItems({ query, size: 20 })
    itemOptions.value = response?.data?.data ?? []
  } catch {
    itemOptions.value = []
  } finally {
    itemLoading.value = false
  }
}

function onItemSearch(query) {
  clearTimeout(itemSearchTimer)
  itemSearchTimer = setTimeout(() => fetchItems(query), 220)
}

watch(selectedItem, (item) => {
  if (!item) return
  addLine(item)
  selectedItem.value = null
  // Remount the autocomplete so it is empty and ready for the next item.
  searchKey.value++
})

const { ingestBarcode } = useBarcodeCart({
  addItem: addLine,
  getItemName: itemName,
  $t: (key) => $t(key === 'itemScanned' ? 'returnItemAdded' : key)
})

useHardwareBarcode((code) => ingestBarcode(code), {
  enabled: () => !scanDialog.value && !saving.value
})

function onShortcut(event) {
  if (scanDialog.value) return
  if (event.key === 'F2') {
    event.preventDefault()
    focusSearch()
  } else if (event.key === 'F9' || (event.key === 'Enter' && (event.ctrlKey || event.metaKey))) {
    event.preventDefault()
    saveReturn()
  }
}

async function saveReturn() {
  if (!canSave.value) {
    if (lines.value.some((line) => !isValidPrice(line.price))) {
      $notification($t('returnInvalidPrice'), 'error')
    }
    return
  }
  saving.value = true
  const savedTotal = total.value
  const savedCurrency = currency.value
  try {
    await ReturnedObjectService.createReturn({
      customerName: customerName.value?.trim() || null,
      currency: currency.value,
      items: [...lines.value].reverse().map((line) => ({
        itemId: line.itemId,
        quantity: Number(line.quantity),
        price: roundForCurrency(line.price, currency.value)
      }))
    })
    clearTimeout(savedTimer)
    savedFlash.value = { total: savedTotal, currency: savedCurrency }
    savedTimer = setTimeout(() => {
      savedFlash.value = null
    }, 1600)
    clearForm()
    loadReturns(true)
    loadTodayCount()
  } catch (error) {
    $notification(error?.response?.data?.message || $t('returnSaveFailed'), 'error')
  } finally {
    saving.value = false
  }
}

// Timeline
const returns = ref([])
const listLoading = ref(false)
const filtersOpen = ref(false)
const expanded = reactive({})
const filters = reactive({ fromDate: '', toDate: '', customerName: '' })
const pagination = reactive({ page: 0, size: 15, totalPages: 0, totalItems: 0 })
const todayCount = ref(0)

const hasActiveFilters = computed(
  () => !!(filters.fromDate || filters.toDate || filters.customerName?.trim())
)

function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function todayIso() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const groupedReturns = computed(() => {
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  const groups = []
  const byKey = new Map()
  returns.value.forEach((entry) => {
    const date = new Date(entry.returnDate)
    const valid = !Number.isNaN(date.getTime())
    const key = valid ? dayKey(date) : 'unknown'
    if (!byKey.has(key)) {
      let label = '—'
      if (valid) {
        if (key === dayKey(today)) label = $t('returnToday')
        else if (key === dayKey(yesterday)) label = $t('returnYesterday')
        else {
          label = date.toLocaleDateString(locale.value, {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })
        }
      }
      const group = { key, label, entries: [] }
      byKey.set(key, group)
      groups.push(group)
    }
    byKey.get(key).entries.push(entry)
  })
  return groups
})

function entryUnits(entry) {
  return (entry.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)
}

async function loadReturns(resetPage = false) {
  if (resetPage) pagination.page = 0
  listLoading.value = true
  try {
    const response = await ReturnedObjectService.searchUserReturns(filters, {
      page: pagination.page,
      size: pagination.size
    })
    returns.value = response?.data?.data ?? []
    const meta = response?.data?.pagination ?? {}
    pagination.totalPages = Number(meta.totalPages) || 0
    pagination.totalItems = Number(meta.totalItems) || 0
  } catch (error) {
    returns.value = []
    pagination.totalPages = 0
    pagination.totalItems = 0
    $notification(error?.response?.data?.message || $t('returnsLoadFailed'), 'error')
  } finally {
    listLoading.value = false
  }
}

async function loadTodayCount() {
  try {
    const today = todayIso()
    const response = await ReturnedObjectService.searchUserReturns(
      { fromDate: today, toDate: today },
      { page: 0, size: 1 }
    )
    todayCount.value = Number(response?.data?.pagination?.totalItems) || 0
  } catch {
    todayCount.value = 0
  }
}

function resetFilters() {
  filters.fromDate = ''
  filters.toDate = ''
  filters.customerName = ''
  loadReturns(true)
}

function goToPage(page) {
  pagination.page = page
  loadReturns()
}

function toggleExpanded(id) {
  expanded[id] = !expanded[id]
}

function formatMoney(value, currencyCode) {
  const n = Number(value) || 0
  if (isDollarCurrency(currencyCode)) {
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `${Math.round(n).toLocaleString('en-US')} ${lbpSymbol.value}`
}

function formatTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString(locale.value, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: state.lang !== 'ar'
  })
}

onMounted(() => {
  clockTimer = setInterval(() => {
    now.value = new Date()
  }, 1000)
  window.addEventListener('keydown', onShortcut)
  if (!(Number(state.exchangeRate) > 0)) state.fetchDollarRate()
  fetchItems('')
  loadReturns(true)
  loadTodayCount()
})

onUnmounted(() => {
  clearInterval(clockTimer)
  clearTimeout(itemSearchTimer)
  clearTimeout(flashTimer)
  clearTimeout(savedTimer)
  window.removeEventListener('keydown', onShortcut)
})
</script>

<style scoped>
.returns-page {
  --teal: #197783;
  --teal-dark: #12555e;
  --teal-soft: rgba(25, 119, 131, 0.1);
  --cyan: #32d8ee;
  --ink: #1f3346;
  --muted: #8a9aab;
  --line: #e4ebf1;
  --refund: #cf4f48;
  --paper: #fffdf8;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: #eef3f6;
  overflow: hidden;
}

.returns-atmosphere {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(ellipse 55% 50% at 0% 0%, rgba(25, 119, 131, 0.14), transparent 60%),
    radial-gradient(ellipse 40% 45% at 100% 100%, rgba(207, 79, 72, 0.08), transparent 60%),
    radial-gradient(circle at 1px 1px, rgba(31, 51, 70, 0.05) 1px, transparent 0) 0 0 / 22px 22px;
}

.returns-shell {
  --gap: clamp(0.75rem, 1.3vh, 1.35rem);
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  padding: calc(var(--gap) * 0.6) clamp(0.9rem, 1.5vw, 2.25rem) var(--gap);
  box-sizing: border-box;
}

/* Header */
.desk-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1.25rem;
  flex-wrap: wrap;
}

.desk-header__brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.desk-header__icon {
  width: clamp(44px, 5.4vh, 56px);
  height: clamp(44px, 5.4vh, 56px);
  border-radius: 16px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: #fff;
  background: linear-gradient(140deg, var(--teal-dark), var(--teal) 45%, var(--cyan));
  box-shadow: 0 8px 20px rgba(25, 119, 131, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.desk-header__title {
  margin: 0;
  font-size: clamp(1.35rem, 2.6vh, 2rem);
  font-weight: 850;
  color: var(--ink);
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.desk-header__subtitle {
  margin: 0.2rem 0 0;
  font-size: clamp(0.8rem, 1.4vh, 0.92rem);
  color: var(--muted);
}

.desk-header__ribbon {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.45rem 0.6rem 0.45rem 1rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid var(--line);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
}

.ribbon-stat {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.ribbon-stat__value {
  font-size: 1.35rem;
  font-weight: 850;
  color: var(--refund);
  font-variant-numeric: tabular-nums;
}

.ribbon-stat__label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ribbon-divider {
  width: 1px;
  height: 26px;
  background: var(--line);
}

.scanner-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.85rem;
  border-radius: 12px;
  background: #ecfdf3;
  color: #15803d;
  font-size: 0.8rem;
  font-weight: 700;
}

.scanner-pill__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  animation: pulse 1.8s infinite;
}

.scanner-pill--off {
  background: #f1f5f9;
  color: #64748b;
}

.scanner-pill--off .scanner-pill__dot {
  background: #94a3b8;
  animation: none;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.55); }
  70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
  100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}

/* Grid: the single row is pinned to the remaining height so columns scroll instead of overflowing */
.desk-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    clamp(300px, 24vw, 440px)
    clamp(300px, 24vw, 460px);
  grid-template-rows: minmax(0, 1fr);
  gap: var(--gap);
}

.desk-col {
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  font-size: clamp(0.92rem, 1.6vh, 1.05rem);
  font-weight: 800;
  color: var(--ink);
}

.section-title .v-icon {
  color: var(--teal);
}

.count-pill {
  min-width: 1.6rem;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: var(--teal-soft);
  color: var(--teal);
  font-size: 0.75rem;
  font-weight: 800;
  text-align: center;
}

.mini-label {
  display: block;
  margin-bottom: 0.3rem;
  font-size: 0.66rem;
  font-weight: 800;
  color: #9aabba;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 22px;
  padding: 0 0.35rem;
  border-radius: 6px;
  border: 1px solid #d5dee7;
  border-bottom-width: 2px;
  background: #f8fafc;
  color: #64748b;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.68rem;
  font-weight: 700;
}

.kbd--light {
  border-color: rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

/* Workspace */
.workspace {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--line);
  border-radius: 22px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.scan-bar {
  display: flex;
  gap: 0.7rem;
  padding: clamp(0.9rem, 2vh, 1.5rem);
  background:
    linear-gradient(120deg, rgba(25, 119, 131, 0.1), rgba(50, 216, 238, 0.07) 60%, transparent),
    #f8fcfd;
  border-bottom: 1px solid var(--line);
}

.scan-bar__field {
  position: relative;
  flex: 1;
  min-width: 0;
}

.scan-bar__lead {
  position: absolute;
  inset-inline-start: 16px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  color: var(--teal);
  pointer-events: none;
}

.scan-bar__kbd {
  position: absolute;
  inset-inline-end: 44px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.scan-bar__ac :deep(.pos-ac__field) {
  min-height: clamp(52px, 6.6vh, 68px);
  padding-inline-start: 3rem !important;
  padding-inline-end: 5rem !important;
  border-radius: 16px;
  border: 1.5px solid rgba(25, 119, 131, 0.22);
  background: #fff;
  box-shadow: 0 4px 12px rgba(25, 119, 131, 0.06);
}

.scan-bar__ac :deep(.pos-ac__input) {
  font-size: clamp(0.95rem, 1.8vh, 1.15rem);
}

.scan-bar__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 clamp(1rem, 1.6vw, 1.8rem);
  border: none;
  border-radius: 16px;
  background: linear-gradient(140deg, var(--teal-dark), var(--teal) 50%, var(--cyan));
  color: #fff;
  font-family: inherit;
  font-weight: 800;
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(25, 119, 131, 0.28);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.scan-bar__btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(25, 119, 131, 0.32);
}

.scan-bar__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.option {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.option__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.option__text small {
  color: var(--muted);
  font-size: 0.75rem;
}

.workspace__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem clamp(0.9rem, 1.4vw, 1.5rem) 0.35rem;
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: none;
  background: none;
  color: var(--refund);
  font-family: inherit;
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;
}

.workspace__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 0.5rem clamp(0.9rem, 1.4vw, 1.5rem) 1.25rem;
}

/* Empty state */
.empty-stage {
  flex: 1;
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 2px dashed rgba(25, 119, 131, 0.2);
  border-radius: 22px;
  color: var(--muted);
  text-align: center;
  padding: 2rem;
  font-size: 0.9rem;
}

.empty-stage strong {
  font-size: clamp(1.05rem, 2vh, 1.3rem);
  color: var(--ink);
}

.empty-stage__art {
  position: relative;
  width: clamp(120px, 16vh, 170px);
  height: clamp(120px, 16vh, 170px);
  display: grid;
  place-items: center;
  margin-bottom: 0.6rem;
}

.empty-stage__ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px dashed rgba(25, 119, 131, 0.3);
  animation: spin 14s linear infinite;
}

.empty-stage__ring--2 {
  inset: 16%;
  border-style: solid;
  border-color: rgba(50, 216, 238, 0.25);
  animation-duration: 9s;
  animation-direction: reverse;
}

.empty-stage__core {
  position: relative;
  width: 46%;
  height: 46%;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(140deg, var(--teal-dark), var(--teal) 50%, var(--cyan));
  box-shadow: 0 10px 24px rgba(25, 119, 131, 0.3);
}

.empty-stage__laser {
  position: absolute;
  left: 18%;
  right: 18%;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, var(--refund), transparent);
  box-shadow: 0 0 10px rgba(207, 79, 72, 0.6);
  animation: laser 2.2s ease-in-out infinite;
}

@keyframes laser {
  0%, 100% { top: 24%; opacity: 0.3; }
  50% { top: 76%; opacity: 1; }
}

/* Tiles */
.tiles {
  display: flex;
  flex-direction: column;
  gap: clamp(0.5rem, 1vh, 0.8rem);
}

.tile {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
  padding: 0.8rem 1rem;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.03);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.tile::before {
  content: '';
  position: absolute;
  inset-block: 14px;
  inset-inline-start: 0;
  width: 3px;
  border-radius: 3px;
  background: linear-gradient(var(--teal), var(--cyan));
  opacity: 0;
  transition: opacity 0.15s ease;
}

.tile:hover {
  border-color: rgba(25, 119, 131, 0.3);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
}

.tile:hover::before {
  opacity: 1;
}

.tile--flash {
  animation: tile-flash 0.9s ease;
}

@keyframes tile-flash {
  0% { box-shadow: 0 0 0 0 rgba(50, 216, 238, 0.7); background: #effcfe; }
  100% { box-shadow: 0 0 0 14px rgba(50, 216, 238, 0); background: #fff; }
}

.tile__top {
  flex: 1 1 240px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.tile__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.tile__name {
  font-size: 0.98rem;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tile__code {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  color: var(--muted);
  font-size: 0.74rem;
}

.tile__remove {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 10px;
  background: rgba(207, 79, 72, 0.08);
  color: var(--refund);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.tile__remove:hover:not(:disabled) {
  background: var(--refund);
  color: #fff;
}

.tile__bottom {
  flex: 1 1 520px;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 0.9rem;
  min-width: 0;
}

.tile__field--grow {
  flex: 0 1 220px;
  min-width: 140px;
}

.tile__total {
  flex: 0 0 auto;
  min-width: 110px;
  text-align: end;
}

.tile__amount {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 40px;
  font-size: 1.05rem;
  font-weight: 850;
  color: var(--refund);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.tile__amount::before {
  content: '−';
  margin-inline-end: 0.15rem;
}

.tile__bottom .tile__remove {
  height: 40px;
  width: 40px;
}

.thumb {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 14px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: linear-gradient(140deg, rgba(25, 119, 131, 0.14), rgba(50, 216, 238, 0.18));
  color: var(--teal);
  font-weight: 850;
  font-size: 0.95rem;
}

.thumb--sm {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  font-size: 0.72rem;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.stepper {
  display: inline-flex;
  align-items: center;
  border: 1px solid #d9e2ec;
  border-radius: 12px;
  background: #f7fafc;
  overflow: hidden;
}

.stepper__btn {
  width: 34px;
  height: 40px;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  color: var(--teal);
  cursor: pointer;
}

.stepper__btn:hover:not(:disabled) {
  background: var(--teal-soft);
}

.stepper__btn:disabled {
  color: #cbd5e1;
  cursor: not-allowed;
}

.stepper__input {
  width: 46px;
  height: 40px;
  border: none;
  border-inline: 1px solid #e2e8f0;
  background: #fff;
  text-align: center;
  font-family: inherit;
  font-weight: 850;
  font-size: 1rem;
  color: var(--ink);
  outline: none;
  -moz-appearance: textfield;
  appearance: textfield;
}

.stepper__input::-webkit-outer-spin-button,
.stepper__input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.stepper__input.is-invalid {
  color: var(--refund);
  background: #fef2f2;
}

.price-input :deep(.v-field) {
  border-radius: 12px;
  background: #fff;
}

.price-input :deep(.v-field__input) {
  min-height: 40px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.price-field-no-arrows :deep(input[type='number']::-webkit-outer-spin-button),
.price-field-no-arrows :deep(input[type='number']::-webkit-inner-spin-button) {
  -webkit-appearance: none;
  margin: 0;
}

.price-field-no-arrows :deep(input[type='number']) {
  -moz-appearance: textfield;
  appearance: textfield;
}

.reset-price {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: var(--teal-soft);
  color: var(--teal);
  cursor: pointer;
}

.tile-enter-active,
.tile-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.tile-enter-from,
.tile-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.tile-move {
  transition: transform 0.25s ease;
}

/* Refund slip */
.slip-col {
  gap: var(--gap);
}

.slip {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(0.65rem, 1.5vh, 1rem);
  padding: clamp(1rem, 2vh, 1.5rem) clamp(1rem, 1.3vw, 1.4rem) clamp(1.1rem, 2.2vh, 1.6rem);
  margin-bottom: 12px;
  background: var(--paper);
  border-radius: 18px 18px 0 0;
  filter: drop-shadow(0 10px 18px rgba(15, 23, 42, 0.1));
}

/* Torn-paper edge */
.slip::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -12px;
  height: 12px;
  background:
    linear-gradient(135deg, var(--paper) 6px, transparent 0) 0 0 / 12px 12px repeat-x,
    linear-gradient(225deg, var(--paper) 6px, transparent 0) 0 0 / 12px 12px repeat-x;
}

.slip__head {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.slip__badge {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(207, 79, 72, 0.1);
  color: var(--refund);
}

.slip__head-text {
  display: flex;
  flex-direction: column;
}

.slip__head-text strong {
  font-size: 0.95rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink);
}

.slip__head-text small {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.76rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  border-radius: 13px;
  background: #f1ede4;
}

.segmented__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 40px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #7a6f5d;
  font-family: inherit;
  font-weight: 800;
  cursor: pointer;
}

.segmented__btn--on {
  background: #fff;
  color: var(--teal);
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.1);
}

.slip__customer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.1rem 0.5rem;
  border-bottom: 1.5px solid #e9e2d3;
  color: #9a8f7c;
  transition: border-color 0.15s ease;
}

.slip__customer:focus-within {
  border-color: var(--teal);
  color: var(--teal);
}

.slip__customer input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ink);
}

.slip__rule {
  height: 0;
  border-top: 2px dashed #e3dccc;
}

.slip__lines {
  flex: 1;
  min-height: 60px;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.slip__placeholder {
  margin: auto 0;
  text-align: center;
  font-size: 0.82rem;
  color: #b3a993;
}

.slip__line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 0.6rem;
  align-items: baseline;
  font-size: 0.86rem;
  color: #4b5563;
}

.slip__line-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slip__line-qty {
  color: var(--muted);
  font-weight: 700;
}

.slip__line-amount {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-weight: 700;
  color: var(--ink);
}

.slip__counts {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--muted);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.slip__counts strong {
  color: var(--ink);
  font-size: 0.95rem;
  margin-inline-start: 0.25rem;
}

.slip__total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  background: linear-gradient(140deg, #b6403a, #e07870);
  color: #fff;
  box-shadow: 0 8px 18px rgba(207, 79, 72, 0.28);
}

.slip__total span {
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.92;
}

.slip__total strong {
  font-size: clamp(1.5rem, 3.6vh, 2.4rem);
  font-weight: 850;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.slip__note {
  display: flex;
  align-items: flex-start;
  gap: 0.3rem;
  margin: 0;
  font-size: 0.74rem;
  color: #9a8f7c;
  line-height: 1.45;
}

.save-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: clamp(54px, 7vh, 68px);
  border: none;
  border-radius: 18px;
  background: linear-gradient(140deg, var(--teal-dark), var(--teal) 50%, var(--cyan));
  color: #fff;
  font-family: inherit;
  font-size: clamp(1rem, 1.9vh, 1.15rem);
  font-weight: 850;
  cursor: pointer;
  box-shadow: 0 12px 26px rgba(25, 119, 131, 0.3);
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 16px 30px rgba(25, 119, 131, 0.34);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

/* Timeline */
.timeline-col {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--line);
  border-radius: 22px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.timeline-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.1rem 0.75rem;
  border-bottom: 1px solid var(--line);
}

.timeline-head__actions {
  display: flex;
  gap: 0.4rem;
}

.icon-btn {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  color: var(--teal);
  cursor: pointer;
}

.icon-btn--on {
  background: var(--teal);
  border-color: var(--teal);
  color: #fff;
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-btn--spin .v-icon {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.timeline-filters {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  padding: 0.85rem 1.1rem;
  border-bottom: 1px solid var(--line);
  background: #f9fbfc;
}

.timeline-filters__wide,
.timeline-filters__actions {
  grid-column: 1 / -1;
}

.timeline-filters__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.soft-input :deep(.v-field) {
  border-radius: 11px;
  background: #fff;
}

.timeline {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.6rem 1.1rem 1rem;
}

.timeline-empty {
  height: 100%;
  min-height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  color: #94a3b8;
  font-size: 0.85rem;
}

.tl-group {
  position: relative;
  padding-bottom: 0.4rem;
}

.tl-day {
  position: sticky;
  top: 0;
  z-index: 1;
  margin: 0;
  padding: 0.55rem 0 0.45rem;
  background: linear-gradient(#fff 75%, rgba(255, 255, 255, 0));
  font-size: 0.72rem;
  font-weight: 850;
  color: var(--teal);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.tl-item {
  position: relative;
  padding-inline-start: 26px;
  padding-bottom: 0.55rem;
}

.tl-item::before {
  content: '';
  position: absolute;
  inset-inline-start: 7px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e5ecf2;
}

.tl-item:last-child::before {
  bottom: calc(100% - 22px);
}

.tl-dot {
  position: absolute;
  inset-inline-start: 2px;
  top: 16px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid var(--refund);
  box-shadow: 0 0 0 3px rgba(207, 79, 72, 0.12);
}

.tl-card {
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
  overflow: hidden;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.tl-item--open .tl-card,
.tl-card:hover {
  border-color: rgba(207, 79, 72, 0.3);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
}

.tl-card__head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 0.75rem;
  border: none;
  background: transparent;
  font-family: inherit;
  text-align: start;
  cursor: pointer;
}

.tl-card__time {
  padding: 0.2rem 0.45rem;
  border-radius: 7px;
  background: #f1f5f9;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.74rem;
  font-weight: 700;
  color: #475569;
  white-space: nowrap;
}

.tl-card__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.tl-card__main strong {
  font-size: 0.86rem;
  color: var(--ink);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.tl-card__main small {
  font-size: 0.74rem;
  color: var(--muted);
}

.tl-card__total {
  color: var(--refund);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  font-size: 0.9rem;
}

.tl-card__chevron {
  color: #94a3b8;
  transition: transform 0.2s ease;
}

.tl-item--open .tl-card__chevron {
  transform: rotate(180deg);
}

.tl-card__items {
  list-style: none;
  margin: 0;
  padding: 0 0.75rem 0.6rem;
}

.tl-card__items li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 0.7rem;
  padding: 0.4rem 0;
  border-top: 1px dashed var(--line);
  font-size: 0.8rem;
  color: #475569;
}

.tl-card__item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tl-card__item-qty {
  color: var(--muted);
  font-weight: 700;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.65rem;
  border-top: 1px solid var(--line);
  background: #fafcfd;
}

.pager__label {
  font-weight: 800;
  color: #475569;
  font-variant-numeric: tabular-nums;
}

/* Buttons */
.btn-ghost,
.btn-solid {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  min-height: 36px;
  padding: 0 0.95rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 750;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn-ghost {
  background: var(--teal-soft);
  border-color: rgba(25, 119, 131, 0.35);
  color: var(--teal);
}

.btn-solid {
  background-image: linear-gradient(135deg, var(--teal), var(--cyan));
  color: #fff;
}

.btn-ghost:disabled,
.btn-solid:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Saved confirmation */
.saved-overlay {
  position: fixed;
  inset: 0;
  z-index: 2500;
  display: grid;
  place-items: center;
  background: rgba(15, 35, 40, 0.28);
  backdrop-filter: blur(3px);
  pointer-events: none;
}

.saved-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 1.75rem 2.5rem;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25);
  color: var(--ink);
  font-size: 1.05rem;
}

.saved-card__check {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin-bottom: 0.4rem;
  color: #fff;
  background: linear-gradient(140deg, #16a34a, #4ade80);
  box-shadow: 0 10px 24px rgba(22, 163, 74, 0.35);
  animation: pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.saved-card__amount {
  font-size: 1.8rem;
  font-weight: 850;
  color: var(--refund);
  font-variant-numeric: tabular-nums;
}

.saved-card small {
  color: var(--muted);
}

@keyframes pop {
  from { transform: scale(0.4); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.saved-enter-active,
.saved-leave-active {
  transition: opacity 0.25s ease;
}

.saved-enter-from,
.saved-leave-to {
  opacity: 0;
}

/* Below this width the page scrolls instead of fitting the viewport */
@media (max-width: 1200px) {
  .returns-page {
    height: auto;
    min-height: 100dvh;
    overflow: visible;
  }

  .desk-grid {
    grid-template-columns: minmax(0, 1fr) minmax(300px, 380px);
    grid-template-rows: none;
  }

  .workspace {
    min-height: 520px;
  }

  .slip-col {
    min-height: 520px;
  }

  .timeline-col {
    grid-column: 1 / -1;
    max-height: 640px;
  }
}

@media (max-width: 860px) {
  .desk-grid {
    grid-template-columns: 1fr;
  }

  .workspace {
    min-height: 420px;
  }

  .scan-bar__kbd {
    display: none;
  }

  .scan-bar__ac :deep(.pos-ac__field) {
    padding-inline-end: 2.2rem !important;
  }
}

@media (max-width: 560px) {
  .desk-header__ribbon {
    width: 100%;
    justify-content: space-between;
  }

  .scan-bar__btn span {
    display: none;
  }
}
</style>
