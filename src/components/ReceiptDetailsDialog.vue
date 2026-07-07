<template>
  <v-dialog
    :model-value="modelValue"
    :max-width="dialogMaxWidth"
    :dir="state.dir"
    :scrollable="isCompactViewport"
    content-class="receipt-details-dialog-overlay"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="receipt-dialog" :class="{ 'receipt-dialog--rtl': state.lang === 'ar', 'receipt-dialog--visible': modelValue }">
      <div class="receipt-dialog-header">
        <div class="header-pattern" aria-hidden="true" />
        <div class="header-shine" aria-hidden="true" />
        <div class="receipt-dialog-title-wrap">
          <span class="header-icon-badge">
            <v-icon size="20">mdi-receipt-text-outline</v-icon>
          </span>
          <div>
            <div class="receipt-dialog-title">{{ $t('receiptDetails') }}</div>
            <div v-if="details" class="receipt-dialog-subtitle">
              <span>{{ details.customerName || $t('walkInCustomer') }}</span>
              <span v-if="isDraftMode" class="draft-badge">{{ $t('draftBadge') }}</span>
            </div>
            <div v-else-if="!loading" class="receipt-dialog-subtitle">—</div>
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
        <div class="skeleton-block">
          <div v-for="n in 5" :key="n" class="skeleton-row">
            <div class="skeleton-label" />
            <div class="skeleton-value" />
          </div>
        </div>
      </div>

      <div v-else-if="details" class="receipt-dialog-body">

        <div class="details-section details-section--card">
          <div class="section-heading">
            <v-icon size="16">mdi-account-group-outline</v-icon>
            <span>{{ $t('details') }}</span>
          </div>
          <div class="detail-tiles">
            <div class="detail-tile">
              <span class="detail-tile-icon"><v-icon size="18">mdi-account</v-icon></span>
              <span class="detail-tile-label">{{ $t('customerName') }}</span>
              <span class="detail-tile-value">{{ details.customerName || '—' }}</span>
            </div>
            <div class="detail-tile">
              <span class="detail-tile-icon"><v-icon size="18">mdi-badge-account</v-icon></span>
              <span class="detail-tile-label">{{ $t('employeeName') }}</span>
              <span class="detail-tile-value">{{ details.employeeName || '—' }}</span>
            </div>
            <div class="detail-tile detail-tile--rate">
              <span class="detail-tile-icon"><v-icon size="18">mdi-swap-horizontal</v-icon></span>
              <span class="detail-tile-label">{{ $t('dollarRate') }}</span>
              <span class="detail-tile-value numeric">{{ formatDollarRate(details.dollarRate) }}</span>
            </div>
          </div>
        </div>

        <div class="details-section details-section--card">
          <div class="section-heading">
            <v-icon size="16">mdi-cash-multiple</v-icon>
            <span>{{ $t('payment') }}</span>
          </div>
          <div class="discount-row">
            <span class="discount-label">{{ $t('totalDiscount') }}</span>
            <span class="discount-value">{{ formatDiscount(details) }}</span>
          </div>

          <div v-if="paymentBreakdown" class="payment-breakdown">
            <div class="breakdown-bar">
              <span
                v-if="paymentBreakdown.wish > 0"
                class="breakdown-segment breakdown-segment--wish"
                :style="{ width: `${paymentBreakdown.wish}%` }"
              />
              <span
                v-if="paymentBreakdown.usd > 0"
                class="breakdown-segment breakdown-segment--usd"
                :style="{ width: `${paymentBreakdown.usd}%` }"
              />
              <span
                v-if="paymentBreakdown.lbp > 0"
                class="breakdown-segment breakdown-segment--lbp"
                :style="{ width: `${paymentBreakdown.lbp}%` }"
              />
            </div>
          </div>

          <div class="payment-grid">
            <div class="payment-chip wish-chip">
              <span class="payment-chip-icon">W</span>
              <span class="payment-chip-label">Wish</span>
              <span class="payment-chip-value">{{ formatPayWish(details) }}</span>
            </div>
            <div class="payment-chip dollar-chip">
              <v-icon size="16" class="payment-chip-icon">mdi-currency-usd</v-icon>
              <span class="payment-chip-label">USD</span>
              <span class="payment-chip-value">{{ formatUsd(details.payDollar) }}</span>
            </div>
            <div class="payment-chip lbp-chip">
              <span class="payment-chip-icon">{{ state.lang === 'ar' ? 'ل.ل.' : 'LBP' }}</span>
              <span class="payment-chip-label">{{ state.lang === 'ar' ? 'ليرة' : 'Lebanese' }}</span>
              <span class="payment-chip-value">{{ formatLbpShort(details.payLebanese) }}</span>
            </div>
          </div>

          <div v-if="Number(details.returnedToUserValue) > 0" class="return-banner">
            <v-icon size="16">mdi-cash-refund</v-icon>
            <span v-if="state.lang === 'ar'" class="return-banner-text">
              <span class="return-banner-value">{{ formatLbp(details.returnedToUserValue) }}</span>
              <span class="return-banner-label">{{ $t('returnedToUser') }}</span>
            </span>
            <span v-else class="return-banner-text">
              {{ $t('returnedToUser') }}: {{ formatLbp(details.returnedToUserValue) }}
            </span>
          </div>
        </div>

        <div class="total-banner">
          <div class="total-banner-shine" aria-hidden="true" />
          <div class="total-banner-left">
            <span class="total-banner-label">{{ isDraftMode ? $t('estimatedTotal') : $t('total') }}</span>
          </div>
          <span class="total-banner-value">{{ formatTotal(details) }}</span>
        </div>
      </div>
    </div>
  </v-dialog>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, onUnmounted, ref, watch } from 'vue'
import ReceiptService from '../services/ReceiptService'
import { useState } from '../store/state'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  receiptId: { type: Number, default: null },
  isDraft: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const instance = getCurrentInstance()
const $t = (key) => instance?.appContext?.config?.globalProperties?.$t?.(key) ?? key
const state = useState()

const loading = ref(false)
const details = ref(null)
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
const viewportHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 768)

const isCompactViewport = computed(() =>
  viewportWidth.value < 768 || viewportHeight.value < 720
)

const isDraftMode = computed(() =>
  props.isDraft || details.value?.type === 'DRAFT'
)

const paymentBreakdown = computed(() => {
  const d = details.value
  if (!d) return null
  const rate = Number(d.dollarRate) || state.exchangeRate || 1
  const wish = Number(d.payWish) || 0
  const usd = Number(d.payDollar) || 0
  const lbp = Number(d.payLebanese) || 0
  const wishUsd = d.isPayWishDollar !== false ? wish : wish / rate
  const lbpUsd = lbp / rate
  const total = wishUsd + usd + lbpUsd
  if (!total) return { wish: 0, usd: 0, lbp: 0 }
  return {
    wish: (wishUsd / total) * 100,
    usd: (usd / total) * 100,
    lbp: (lbpUsd / total) * 100
  }
})

function onResize() {
  viewportWidth.value = window.innerWidth
  viewportHeight.value = window.innerHeight
}

onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const dialogMaxWidth = computed(() => {
  const w = viewportWidth.value
  if (w >= 1600) return 760
  if (w >= 1200) return 700
  if (w >= 1024) return 660
  if (w >= 768) return Math.min(w - 40, 600)
  return Math.min(w - 32, 560)
})

function close() {
  emit('update:modelValue', false)
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

function formatLbpShort(value) {
  const num = Number(value)
  if (!num) return '—'
  return Math.round(num).toLocaleString('en-US')
}

function formatDollarRate(rate) {
  const num = Number(rate)
  if (!num) return '—'
  const formatted = Math.round(num).toLocaleString('en-US')
  if (state.lang === 'ar') return `ل.ل.\u200E ${formatted}`
  return `${formatted} LBP`
}

function formatPayWish(receipt) {
  const num = Number(receipt.payWish) || 0
  if (!num) return '—'
  if (receipt.isPayWishDollar !== false) return formatUsd(num)
  return formatLbp(num)
}

function formatTotal(receipt) {
  const num = Number(receipt.total) || 0
  const rate = Number(receipt.dollarRate) || state.exchangeRate
  if (receipt.isReceiptDollar !== false) return formatUsd(num)
  return formatLbp(num * rate)
}

function formatDiscount(receipt) {
  const val = Number(receipt.receiptDiscount) || 0
  if (!val) return '—'
  if (receipt.isReceiptDiscountPercent) return `${val}%`
  if (receipt.isReceiptDollar) return formatUsd(val)
  return formatLbp(val)
}

async function loadDetails() {
  if (!props.receiptId) return
  loading.value = true
  details.value = null
  try {
    const response = await ReceiptService.getReceiptDetails(props.receiptId)
    details.value = response?.data?.data || null
  } catch (error) {
    console.error('Failed to load receipt details:', error)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.modelValue, props.receiptId],
  ([open]) => {
    if (open) loadDetails()
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
    max-height: none;
    overflow: visible;
  }
}

@media (max-width: 767px), (max-height: 719px) {
  .receipt-dialog {
    max-height: min(90vh, 720px);
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
  overflow: hidden;
}

.header-pattern {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.14) 0%, transparent 50%),
    radial-gradient(circle at 85% 15%, rgba(255, 255, 255, 0.1) 0%, transparent 40%);
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
  backdrop-filter: blur(6px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.receipt-dialog-title {
  font-size: 1.12rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.02em;
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

.draft-badge {
  font-size: 0.65rem;
  font-weight: 800;
  padding: 0.1rem 0.45rem;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.25);
  color: #fef3c7;
  border: 1px solid rgba(245, 158, 11, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.receipt-id-tag {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 0.12rem 0.45rem;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.22);
  direction: ltr;
  font-variant-numeric: tabular-nums;
  border: 1px solid rgba(255, 255, 255, 0.2);
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
  padding: 1.35rem;
  background: #fff;
}

.skeleton-block {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.skeleton-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.skeleton-label,
.skeleton-value {
  height: 14px;
  border-radius: 7px;
  background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%);
  background-size: 200% 100%;
  animation: shimmer 1.3s ease-in-out infinite;
}

.skeleton-label { width: 38%; }
.skeleton-value { width: 28%; }

@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.receipt-dialog-body {
  position: relative;
  padding: 1.1rem 1.2rem 1.3rem;
  background: #fff;
}

@media (min-width: 768px) and (min-height: 720px) {
  .receipt-dialog-body {
    overflow: visible;
  }
}

@media (max-width: 767px), (max-height: 719px) {
  .receipt-dialog-body {
    overflow-y: auto;
    max-height: calc(90vh - 5.5rem);
  }
}

.details-section {
  position: relative;
  margin-bottom: 0.95rem;
}

.details-section--card {
  padding: 0.85rem 0.95rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #eef2f7;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
  backdrop-filter: blur(8px);
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.68rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #197783;
  margin-bottom: 0.6rem;
  padding-bottom: 0.45rem;
  border-bottom: 1px dashed rgba(25, 119, 131, 0.22);
}

.detail-tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
}

.detail-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.25rem;
  padding: 0.7rem 0.45rem;
  border-radius: 12px;
  background: linear-gradient(180deg, #f8fafc, #fff);
  border: 1px solid #eef2f7;
  transition: transform 0.2s, box-shadow 0.2s;
}

.detail-tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(25, 119, 131, 0.08);
}

.detail-tile--rate {
  background: linear-gradient(180deg, rgba(25, 119, 131, 0.06), #fff);
  border-color: rgba(25, 119, 131, 0.15);
}

.detail-tile-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(25, 119, 131, 0.1);
  color: #197783;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-tile-label {
  font-size: 0.62rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.detail-tile-value {
  font-size: 0.8rem;
  font-weight: 800;
  color: #0f172a;
  word-break: break-word;
  line-height: 1.3;
}

.numeric {
  font-variant-numeric: tabular-nums;
  direction: ltr;
}

.discount-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45rem 0.55rem;
  margin-bottom: 0.55rem;
  border-radius: 10px;
  background: rgba(217, 119, 6, 0.06);
  border: 1px solid rgba(217, 119, 6, 0.12);
}

.discount-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #64748b;
}

.discount-value {
  font-size: 0.88rem;
  font-weight: 800;
  color: #b45309;
}

.payment-breakdown {
  margin-bottom: 0.65rem;
}

.breakdown-bar {
  display: flex;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: #f1f5f9;
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.06);
}

.breakdown-segment {
  height: 100%;
  transition: width 0.6s cubic-bezier(0.34, 1.2, 0.64, 1);
}

.breakdown-segment--wish { background: linear-gradient(90deg, #dc2626, #f87171); }
.breakdown-segment--usd { background: linear-gradient(90deg, #2563eb, #60a5fa); }
.breakdown-segment--lbp { background: linear-gradient(90deg, #156570, #32d8ee); }

.payment-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
}

.payment-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.22rem;
  padding: 0.7rem 0.45rem;
  border-radius: 14px;
  border: 1px solid #e8edf3;
  transition: transform 0.2s, box-shadow 0.2s;
}

.payment-chip:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}

.wish-chip {
  background: linear-gradient(180deg, rgba(220, 38, 38, 0.08), #fff);
  border-color: rgba(220, 38, 38, 0.18);
}

.dollar-chip {
  background: linear-gradient(180deg, rgba(44, 140, 242, 0.08), #fff);
  border-color: rgba(44, 140, 242, 0.18);
}

.lbp-chip {
  background: linear-gradient(180deg, rgba(25, 119, 131, 0.08), #fff);
  border-color: rgba(25, 119, 131, 0.18);
}

.payment-chip-icon {
  font-size: 0.8rem;
  font-weight: 900;
  color: #64748b;
}

.wish-chip .payment-chip-icon { color: #dc2626; }
.dollar-chip .payment-chip-icon { color: #2563eb; }
.lbp-chip .payment-chip-icon { color: #197783; font-size: 0.72rem; }

.payment-chip-label {
  font-size: 0.6rem;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.payment-chip-value {
  font-size: 0.8rem;
  font-weight: 900;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
  direction: ltr;
  text-align: center;
}

.return-banner {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.7rem;
  padding: 0.6rem 0.75rem;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.12), rgba(251, 191, 36, 0.08));
  border: 1px solid rgba(217, 119, 6, 0.25);
  font-size: 0.82rem;
  font-weight: 700;
  color: #b45309;
}

.return-banner-text {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.return-banner-value {
  font-variant-numeric: tabular-nums;
  direction: ltr;
}

.total-banner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.35rem;
  padding: 1rem 1.15rem;
  border-radius: 16px;
  background: linear-gradient(135deg, #0f4f58, #156570 40%, #197783 70%, #2c8cf2);
  color: #fff;
  box-shadow: 0 8px 28px rgba(25, 119, 131, 0.38);
  overflow: hidden;
}

.total-banner-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, 0.15) 50%, transparent 65%);
  animation: header-shine 5s ease-in-out infinite;
  pointer-events: none;
}

.total-banner-left {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-inline-start: 0.5rem;
  z-index: 1;
}

.total-banner-icon { opacity: 0.9; }

.total-banner-label {
  font-size: 0.92rem;
  font-weight: 800;
  opacity: 0.95;
}

.total-banner-value {
  position: relative;
  z-index: 1;
  font-size: 1.12rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  direction: ltr;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.receipt-dialog--rtl .receipt-dialog-header { flex-direction: row-reverse; }
.receipt-dialog--rtl .receipt-dialog-title-wrap { flex-direction: row-reverse; text-align: right; }
.receipt-dialog--rtl .receipt-dialog-subtitle { flex-direction: row-reverse; text-align: right; }
.receipt-dialog--rtl .section-heading { flex-direction: row-reverse; }
.receipt-dialog--rtl .discount-row { flex-direction: row-reverse; }
.receipt-dialog--rtl .total-banner { flex-direction: row-reverse; }
.receipt-dialog--rtl .total-banner-left { flex-direction: row-reverse; }
.receipt-dialog--rtl .return-banner { flex-direction: row-reverse; }
.receipt-dialog--rtl .return-banner-text { flex-direction: row-reverse; }

@media (max-width: 520px) {
  .detail-tiles {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1024px) {
  .receipt-dialog-header { padding: 1.35rem 1.55rem; }
  .receipt-dialog-body { padding: 1.2rem 1.55rem 1.45rem; }
  .payment-grid { gap: 0.75rem; }
  .total-banner { padding: 1.1rem 1.35rem; }
}
</style>

<style>
.receipt-details-dialog-overlay {
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.receipt-details-dialog-overlay .v-overlay__content {
  background: transparent !important;
  box-shadow: none !important;
  overflow: visible !important;
}
</style>
