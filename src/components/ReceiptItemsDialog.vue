<template>
  <v-dialog
    :model-value="modelValue"
    :max-width="dialogMaxWidth"
    :dir="state.dir"
    :scrollable="isCompactViewport"
    content-class="receipt-items-dialog-overlay"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="receipt-dialog" :class="{ 'receipt-dialog--rtl': state.lang === 'ar', 'receipt-dialog--visible': modelValue }">
      <div class="receipt-dialog-header">
        <div class="header-pattern" aria-hidden="true" />
        <div class="header-shine" aria-hidden="true" />
        <div class="receipt-dialog-title-wrap">
          <span class="header-icon-badge">
            <v-icon size="20">mdi-cart-outline</v-icon>
          </span>
          <div>
            <div class="receipt-dialog-title">{{ $t('receiptItems') }}</div>
            <div v-if="!loading" class="receipt-dialog-subtitle">
              <span>{{ items.length }} {{ $t('items') }}</span>
              <span
                v-if="!loading && items.length"
                class="currency-tag"
                :class="isReceiptDollar !== false ? 'currency-tag--usd' : 'currency-tag--lbp'"
              >
                {{ isReceiptDollar !== false ? (state.lang === 'ar' ? 'دولار' : 'USD') : (state.lang === 'ar' ? 'ل.ل.' : 'LBP') }}
              </span>
            </div>
          </div>
        </div>
        <v-btn
          icon
          variant="text"
          size="small"
          class="receipt-dialog-close"
          :aria-label="$t('cancel')"
          @click="close"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>

      <div v-if="loading" class="receipt-dialog-loading">
        <div v-for="n in 4" :key="n" class="skeleton-item-row">
          <div class="skeleton-thumb" />
          <div class="skeleton-lines">
            <div class="skeleton-line skeleton-line--wide" />
            <div class="skeleton-line skeleton-line--short" />
          </div>
        </div>
      </div>

      <div v-else-if="items.length === 0" class="receipt-dialog-empty">
        <div class="empty-icon-wrap">
          <v-icon size="48">mdi-cart-off</v-icon>
        </div>
        <span class="empty-text">{{ $t('noReceiptItems') }}</span>
      </div>

      <template v-else>
        <div class="items-summary-bar">
          <div class="summary-stat">
            <span class="summary-icon-wrap"><v-icon size="15">mdi-package-variant</v-icon></span>
            <span>{{ items.length }} {{ $t('items') }}</span>
          </div>
        </div>

        <div class="items-table-scroll">
          <div class="items-table-wrap">
            <div class="items-table-header" :class="{ 'items-table--ar': state.lang === 'ar' }">
              <span class="col-photo">{{ $t('image') }}</span>
              <span class="col-item">{{ $t('name') }}</span>
              <span class="col-price">{{ $t('price') }}</span>
              <span class="col-discount">{{ $t('discount') }}</span>
              <span class="col-price-after">{{ $t('priceAfterDiscount') }}</span>
              <span class="col-qty">{{ $t('qty') }}</span>
              <span class="col-subtotal">{{ $t('subtotal') }}</span>
            </div>
            <div
              v-for="(row, index) in items"
              :key="`${row.itemId}-${index}`"
              class="items-table-row"
              :class="{ 'items-table--ar': state.lang === 'ar' }"
              :style="{ '--row-delay': `${index * 35}ms` }"
            >
              <span class="col-photo">
                <button
                  v-if="resolveImage(row.image)"
                  type="button"
                  class="photo-btn"
                  :aria-label="$t('viewImage')"
                  @click.stop="openImage(row)"
                >
                  <img :src="resolveImage(row.image)" alt="" class="photo-thumb" />
                  <span class="photo-zoom-hint"><v-icon size="12">mdi-magnify-plus</v-icon></span>
                </button>
                <span v-else class="photo-placeholder">
                  <v-icon size="18">mdi-image-off-outline</v-icon>
                </span>
              </span>
              <span class="col-item" :class="{ 'col-item--ar': state.lang === 'ar' }">
                <span class="item-name">{{ itemName(row) }}</span>
              </span>
              <span class="col-price numeric">{{ formatUnitPrice(row) }}</span>
              <span class="col-discount numeric" :class="{ 'has-discount': Number(row.itemDiscount) > 0 }">
                {{ formatItemDiscount(row) }}
              </span>
              <span class="col-price-after numeric">{{ formatUnitPriceAfterDiscount(row) }}</span>
              <span class="col-qty numeric">
                <span class="qty-badge">×{{ row.quantity ?? '—' }}</span>
              </span>
              <span class="col-subtotal numeric subtotal-value">{{ formatLineTotal(row) }}</span>
            </div>
          </div>

          <div class="items-footer">
            <span class="footer-notch footer-notch--start" aria-hidden="true" />
            <span class="footer-notch footer-notch--end" aria-hidden="true" />
            <div class="items-footer-left">
              <v-icon size="18">mdi-receipt</v-icon>
              <span>{{ $t('subtotal') }}</span>
            </div>
            <span class="items-footer-total">{{ formatMoney(itemsSubtotal) }}</span>
          </div>
        </div>
      </template>
    </div>
  </v-dialog>

  <v-dialog
    v-model="imageOpen"
    :max-width="imageDialogMaxWidth"
    content-class="image-preview-overlay"
    @click:outside="imageOpen = false"
  >
    <div class="image-preview-dialog">
      <v-btn
        icon
        variant="text"
        size="small"
        class="image-preview-close"
        :aria-label="$t('cancel')"
        @click="imageOpen = false"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>
      <div class="image-preview-frame">
        <img v-if="previewImage" :src="previewImage" :alt="previewName" class="image-preview-img" />
      </div>
      <p class="image-preview-name">{{ previewName }}</p>
    </div>
  </v-dialog>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, onUnmounted, ref, watch } from 'vue'
import ReceiptService from '../services/ReceiptService'
import { useState } from '../store/state'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  receiptId: { type: [String, Number], default: null }
})

const emit = defineEmits(['update:modelValue'])

const instance = getCurrentInstance()
const $t = (key) => instance?.appContext?.config?.globalProperties?.$t?.(key) ?? key
const state = useState()

const loading = ref(false)
const items = ref([])
const isReceiptDollar = ref(true)
const dollarRate = ref(0)
const itemsSubtotal = ref(0)
const imageOpen = ref(false)
const previewImage = ref('')
const previewName = ref('')
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
const viewportHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 768)

const isCompactViewport = computed(() =>
  viewportWidth.value < 768 || viewportHeight.value < 720
)

function onResize() {
  viewportWidth.value = window.innerWidth
  viewportHeight.value = window.innerHeight
}

onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const dialogMaxWidth = computed(() => {
  const w = viewportWidth.value
  if (w >= 1600) return Math.min(1240, Math.round(w * 0.88))
  if (w >= 1400) return Math.min(1140, Math.round(w * 0.86))
  if (w >= 1024) return Math.min(1040, Math.round(w * 0.84))
  if (w >= 768) return Math.min(w - 36, 820)
  return Math.min(w - 28, 680)
})

const imageDialogMaxWidth = computed(() => {
  if (viewportWidth.value >= 1024) return 680
  return Math.min(520, viewportWidth.value - 24)
})

function close() {
  emit('update:modelValue', false)
}

const itemName = (row) => {
  if (state.lang === 'ar') return row.itemNameAr || row.itemNameEn || '—'
  return row.itemNameEn || row.itemNameAr || '—'
}

function normalizeItemRow(raw) {
  const nested = raw?.item || {}
  return {
    itemId: nested.id ?? raw.itemId,
    itemNameAr: nested.nameAr ?? raw.itemNameAr,
    itemNameEn: nested.nameEn ?? raw.itemNameEn,
    image: nested.image ?? raw.image,
    sellingPrice: nested.sellingPriceDollar ?? raw.sellingPrice ?? raw.sellingPriceDollar,
    quantity: raw.quantity,
    itemDiscount: raw.itemDiscount,
    isDiscountPercent: raw.isDiscountPercent,
    subTotal: raw.subTotal
  }
}

function resolveImage(image) {
  if (!image || typeof image !== 'string') return null
  if (image.startsWith('data:image')) return image
  if (image.startsWith('/9j/') || image.startsWith('iVBORw0KGgo')) {
    const prefix = image.startsWith('/9j/') ? 'data:image/jpeg;base64,' : 'data:image/png;base64,'
    return prefix + image
  }
  if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('blob:')) {
    return image
  }
  return null
}

function openImage(row) {
  const src = resolveImage(row.image)
  if (!src) return
  previewImage.value = src
  previewName.value = itemName(row)
  imageOpen.value = true
}

function formatUsd(value) {
  const num = Number(value)
  if (!num) return '—'
  const formatted = num.toFixed(2)
  if (state.lang === 'ar') return `دولار\u200E ${formatted}`
  return `${formatted} USD`
}

function formatLbp(value) {
  const num = Number(value)
  if (!num) return '—'
  const formatted = Math.round(num).toLocaleString('en-US')
  if (state.lang === 'ar') return `ل.ل.\u200E ${formatted}`
  return `${formatted} LBP`
}

function toDisplayAmount(usdAmount) {
  const num = Number(usdAmount) || 0
  if (!num) return 0
  if (isReceiptDollar.value !== false) return num
  const rate = Number(dollarRate.value) || state.exchangeRate
  return num * rate
}

function formatMoney(usdAmount) {
  const display = toDisplayAmount(usdAmount)
  if (!display) return '—'
  if (isReceiptDollar.value !== false) return formatUsd(display)
  return formatLbp(display)
}

function unitPriceAfterDiscountUsd(row) {
  const unitPrice = Number(row.sellingPrice) || 0
  const discount = Number(row.itemDiscount) || 0
  if (!discount) return unitPrice
  if (row.isDiscountPercent) {
    return Math.max(0, unitPrice * (1 - discount / 100))
  }
  if (isReceiptDollar.value !== false) {
    return Math.max(0, unitPrice - discount)
  }
  const rate = Number(dollarRate.value) || state.exchangeRate
  return Math.max(0, unitPrice - discount / rate)
}

function formatUnitPrice(row) {
  return formatMoney(row.sellingPrice)
}

function formatUnitPriceAfterDiscount(row) {
  return formatMoney(unitPriceAfterDiscountUsd(row))
}

function formatLineTotal(row) {
  return formatMoney(row.subTotal)
}

function formatItemDiscount(row) {
  const val = Number(row.itemDiscount) || 0
  if (!val) return '—'
  if (row.isDiscountPercent) return `${val}%`
  if (isReceiptDollar.value !== false) return formatUsd(val)
  return formatLbp(val)
}

async function loadItems() {
  if (!props.receiptId) return
  loading.value = true
  items.value = []
  try {
    const response = await ReceiptService.getReceiptItems(props.receiptId)
    const data = response?.data?.data || {}
    items.value = (data.items || []).map(normalizeItemRow)
    isReceiptDollar.value = data.isReceiptDollar !== false
    dollarRate.value = Number(data.dollarRate) || 0
    const subtotalFromApi = Number(data.itemsSubtotal)
    itemsSubtotal.value = Number.isFinite(subtotalFromApi) && subtotalFromApi > 0
      ? subtotalFromApi
      : items.value.reduce((sum, row) => sum + (Number(row.subTotal) || 0), 0)
  } catch (error) {
    console.error('Failed to load receipt items:', error)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.modelValue, props.receiptId],
  ([open]) => {
    if (open) loadItems()
    else imageOpen.value = false
  }
)
</script>

<style scoped>
.receipt-dialog {
  background: #ffffff;
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.18);
  transform: scale(0.96) translateY(8px);
  opacity: 0;
  transition: transform 0.35s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.3s ease;
  width: 100%;
}

.receipt-dialog--visible {
  transform: scale(1) translateY(0);
  opacity: 1;
}

@media (min-width: 768px) and (min-height: 720px) {
  .receipt-dialog {
    max-height: min(88vh, 920px);
    overflow: hidden;
  }
}

@media (max-width: 767px), (max-height: 719px) {
  .receipt-dialog {
    max-height: min(90vh, 820px);
  }
}

.receipt-dialog-header {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.2rem 1.25rem;
  background: linear-gradient(135deg, #0f4f58, #156570 35%, #197783 65%, #32d8ee);
  color: #fff;
  flex-shrink: 0;
  overflow: hidden;
}

.header-pattern {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 15% 75%, rgba(255, 255, 255, 0.14) 0%, transparent 50%),
    radial-gradient(circle at 90% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 40%);
  pointer-events: none;
}

.header-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.12) 50%, transparent 60%);
  animation: header-shine 6s ease-in-out infinite;
  pointer-events: none;
}

@keyframes header-shine {
  0%, 100% { transform: translateX(-100%); }
  50% { transform: translateX(100%); }
}

.receipt-dialog-title-wrap {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  z-index: 1;
}

.header-icon-badge {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.receipt-dialog-title {
  font-size: 1.12rem;
  font-weight: 900;
  color: #fff;
}

.receipt-dialog-subtitle {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 0.18rem;
}

.receipt-id-tag,
.currency-tag {
  font-size: 0.66rem;
  font-weight: 800;
  padding: 0.1rem 0.42rem;
  border-radius: 7px;
  direction: ltr;
}

.receipt-id-tag {
  background: rgba(255, 255, 255, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.currency-tag {
  margin-inline-start: 0.35rem;
}

.currency-tag--usd {
  background: rgba(44, 140, 242, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.currency-tag--lbp {
  background: rgba(25, 119, 131, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.receipt-dialog-close {
  position: relative;
  z-index: 1;
  color: rgba(255, 255, 255, 0.9);
}

.receipt-dialog-close:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
}

.receipt-dialog-loading {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding: 1.15rem;
  background: #fff;
}

.skeleton-item-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.7rem;
  border-radius: 14px;
  border: 1px solid #eef2f7;
  background: #fff;
}

.skeleton-thumb {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%);
  background-size: 200% 100%;
  animation: shimmer 1.3s ease-in-out infinite;
  flex-shrink: 0;
}

.skeleton-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.42rem;
}

.skeleton-line {
  height: 11px;
  border-radius: 6px;
  background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%);
  background-size: 200% 100%;
  animation: shimmer 1.3s ease-in-out infinite;
}

.skeleton-line--wide { width: 72%; }
.skeleton-line--short { width: 42%; }

@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.receipt-dialog-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  padding: 3rem 1rem;
  background: linear-gradient(180deg, #f8fafc, #fff);
}

.empty-icon-wrap {
  width: 88px;
  height: 88px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(25, 119, 131, 0.1), rgba(50, 216, 238, 0.16));
  border: 1px dashed rgba(25, 119, 131, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(25, 119, 131, 0.5);
}

.empty-text {
  font-weight: 700;
  color: #64748b;
}

.items-summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 1.15rem;
  background: linear-gradient(90deg, rgba(25, 119, 131, 0.08), rgba(50, 216, 238, 0.1));
  border-bottom: 1px solid rgba(25, 119, 131, 0.12);
  flex-shrink: 0;
}

.summary-stat {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 800;
  color: #197783;
}

.summary-icon-wrap {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(25, 119, 131, 0.12);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.summary-stat--total { gap: 0.55rem; }

.summary-label {
  color: #64748b;
  font-weight: 600;
}

.summary-value {
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  direction: ltr;
  color: #0f172a;
  font-size: 0.9rem;
}

.items-table-scroll {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #fff;
}

.items-table-wrap {
  overflow-x: auto;
  overflow-y: auto;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: rgba(25, 119, 131, 0.3) transparent;
}

.items-table-header,
.items-table-row {
  display: grid;
  grid-template-columns:
    58px
    minmax(140px, 1.6fr)
    minmax(88px, 1fr)
    minmax(72px, 0.9fr)
    minmax(96px, 1.05fr)
    54px
    minmax(88px, 1fr);
  gap: 0.55rem;
  padding: 0.68rem 1.05rem;
  align-items: center;
  min-width: 700px;
}

.items-table--ar { direction: rtl; }
.items-table--ar > span { text-align: right; }
.items-table--ar .col-qty,
.items-table--ar .col-discount,
.items-table--ar .col-subtotal,
.items-table--ar .col-price,
.items-table--ar .col-price-after,
.items-table--ar .col-photo { text-align: left; }
.items-table--ar .col-item--ar { direction: rtl; justify-content: flex-start; flex-direction: row; }

.items-table-header {
  font-size: 0.64rem;
  font-weight: 900;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 2px solid #e2e8f0;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 2;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.items-table-row {
  font-size: 0.85rem;
  font-weight: 500;
  color: #1e293b;
  background: #fff;
  margin: 0 0.5rem 0.45rem;
  border-radius: 12px;
  border: 1px solid #eef2f7;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.03);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  animation: row-enter 0.4s ease both;
  animation-delay: var(--row-delay, 0ms);
}

@keyframes row-enter {
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
}

.items-table-row:hover {
  border-color: rgba(25, 119, 131, 0.3);
  box-shadow: 0 6px 20px rgba(25, 119, 131, 0.1);
  transform: translateY(-1px);
}

.col-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  overflow: hidden;
  min-width: 0;
  font-weight: 700;
}

.item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.item-index {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(25, 119, 131, 0.14), rgba(50, 216, 238, 0.18));
  color: #197783;
  font-size: 0.68rem;
  font-weight: 900;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(25, 119, 131, 0.14);
}

.col-photo {
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  padding: 0;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.photo-btn:hover {
  transform: scale(1.06);
  border-color: rgba(25, 119, 131, 0.4);
  box-shadow: 0 6px 16px rgba(25, 119, 131, 0.18);
}

.photo-btn:hover .photo-zoom-hint {
  opacity: 1;
}

.photo-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-zoom-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.45);
  color: #fff;
  opacity: 0;
  transition: opacity 0.2s;
}

.photo-placeholder {
  color: #cbd5e1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px dashed #e2e8f0;
}

.qty-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  padding: 0.2rem 0.5rem;
  border-radius: 9px;
  background: linear-gradient(180deg, #f1f5f9, #e8edf3);
  font-weight: 900;
  color: #475569;
  border: 1px solid #e2e8f0;
  font-size: 0.8rem;
}

.col-qty,
.col-discount,
.col-subtotal,
.col-price,
.col-price-after { text-align: end; }

.col-discount.has-discount {
  color: #b45309;
  font-weight: 700;
}

.col-price-after {
  font-weight: 700;
  color: #0f766e;
}

.subtotal-value {
  font-weight: 900;
  color: #197783;
}

.numeric {
  font-variant-numeric: tabular-nums;
  direction: ltr;
}

.items-footer {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.2rem;
  background: linear-gradient(135deg, #0f4f58, #156570 45%, #197783 75%, #2c8cf2);
  font-size: 0.92rem;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 -6px 24px rgba(25, 119, 131, 0.2);
}

.footer-notch {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fafbfc;
  transform: translateY(-50%);
}

.footer-notch--start { inset-inline-start: -9px; }
.footer-notch--end { inset-inline-end: -9px; }

.items-footer-left {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  opacity: 0.95;
}

.items-footer-total {
  font-size: 1.08rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  direction: ltr;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}

.image-preview-dialog {
  position: relative;
  display: inline-block;
  max-width: 100%;
  background: #fff;
  border-radius: 16px;
  padding: 1.1rem;
  text-align: center;
  box-shadow: 0 20px 56px rgba(15, 23, 42, 0.2);
}

.image-preview-frame {
  display: inline-block;
  max-width: 100%;
  line-height: 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #eef2f7;
}

.image-preview-close {
  position: absolute;
  top: 0.6rem;
  inset-inline-end: 0.6rem;
  color: #fff;
  background: rgba(15, 23, 42, 0.55);
  z-index: 5;
}

.image-preview-close:hover {
  color: #fff;
  background: rgba(15, 23, 42, 0.78);
}

.image-preview-img {
  max-width: 100%;
  max-height: min(70vh, 580px);
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
}

.image-preview-name {
  margin: 0.85rem 0 0;
  font-size: 0.94rem;
  font-weight: 800;
  color: #1e293b;
}

.receipt-dialog--rtl .receipt-dialog-header { flex-direction: row-reverse; }
.receipt-dialog--rtl .receipt-dialog-title-wrap { flex-direction: row-reverse; text-align: right; }
.receipt-dialog--rtl .receipt-dialog-subtitle { flex-direction: row-reverse; }
.receipt-dialog--rtl .items-summary-bar { flex-direction: row-reverse; }
.receipt-dialog--rtl .items-footer { flex-direction: row-reverse; }
.receipt-dialog--rtl .items-footer-left { flex-direction: row-reverse; }

@media (min-width: 1024px) {
  .items-table-header,
  .items-table-row {
    min-width: 800px;
    gap: 0.68rem;
    padding: 0.75rem 1.3rem;
  }

  .photo-btn,
  .photo-placeholder { width: 50px; height: 50px; }
}
</style>

<style>
.receipt-items-dialog-overlay,
.image-preview-overlay {
  align-items: center;
  justify-content: center;
}

.receipt-items-dialog-overlay {
  backdrop-filter: blur(4px);
}

.receipt-items-dialog-overlay .v-overlay__content {
  background: transparent !important;
  box-shadow: none !important;
  overflow: visible !important;
  border-radius: 20px !important;
}

.image-preview-overlay {
  backdrop-filter: blur(4px);
  background: rgba(15, 23, 42, 0.5) !important;
}

.image-preview-overlay .v-overlay__content {
  background: transparent !important;
  box-shadow: none !important;
}
</style>
