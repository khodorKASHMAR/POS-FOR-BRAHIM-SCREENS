<template>
  <div
    class="thermal-receipt"
    :class="{ 'thermal-receipt--rtl': isRtl }"
    :style="{ width: `${paperWidthMm}mm` }"
    :dir="isRtl ? 'rtl' : 'ltr'"
  >
    <template v-for="block in enabledBlocks" :key="block.id">
      <!-- HEADER -->
      <div v-if="block.type === 'HEADER'" class="block block-header">
        <div class="shop-name">{{ headerName(block) }}</div>
        <div v-if="headerAddress(block)" class="shop-line">{{ headerAddress(block) }}</div>
        <div v-if="block.props?.phone" class="shop-line">{{ block.props.phone }}</div>
      </div>

      <!-- META -->
      <div v-else-if="block.type === 'META'" class="block block-meta">
        <div class="meta-row">
          <span>{{ $t('date') }}</span>
          <span>{{ formatDate(details?.receiptDate) }}</span>
        </div>
        <div class="meta-row">
          <span>{{ $t('time') }}</span>
          <span>{{ formatTime(details?.receiptTime) }}</span>
        </div>
        <div class="meta-row">
          <span>{{ $t('customerName') }}</span>
          <span>{{ details?.customerName || $t('walkInCustomer') }}</span>
        </div>
        <div class="meta-row">
          <span>{{ $t('employeeName') }}</span>
          <span>{{ details?.employeeName || '—' }}</span>
        </div>
      </div>

      <!-- ITEMS -->
      <div v-else-if="block.type === 'ITEMS'" class="block block-items">
        <div class="items-head">
          <span class="col-name">{{ $t('name') }}</span>
          <span class="col-qty">{{ $t('qty') }}</span>
          <span class="col-amt">{{ $t('subtotal') }}</span>
        </div>
        <div v-for="(row, idx) in items" :key="`${row.itemId}-${idx}`" class="item-row">
          <div class="item-main">
            <span class="col-name">{{ itemName(row) }}</span>
            <span class="col-qty">×{{ row.quantity ?? 0 }}</span>
            <span class="col-amt">{{ formatMoney(row.subTotal) }}</span>
          </div>
          <div v-if="block.props?.showDiscount !== false && Number(row.itemDiscount) > 0" class="item-disc">
            {{ $t('discount') }}: {{ formatItemDiscount(row) }}
          </div>
        </div>
        <div v-if="!items.length" class="empty-items">{{ $t('noReceiptItems') }}</div>
      </div>

      <!-- TOTALS -->
      <div v-else-if="block.type === 'TOTALS'" class="block block-totals">
        <div class="totals-row">
          <span>{{ $t('subtotal') }}</span>
          <span>{{ formatMoney(itemsSubtotal) }}</span>
        </div>
        <div v-if="Number(details?.receiptDiscount) > 0" class="totals-row">
          <span>{{ $t('discount') }}</span>
          <span>{{ formatReceiptDiscount(details) }}</span>
        </div>
        <div class="totals-row totals-row--grand">
          <span>{{ $t('total') }}</span>
          <span>{{ formatTotal(details) }}</span>
        </div>
      </div>

      <!-- PAYMENT -->
      <div v-else-if="block.type === 'PAYMENT'" class="block block-payment">
        <div v-if="Number(details?.payWish)" class="pay-row">
          <span>Wish</span>
          <span>{{ formatPayWish(details) }}</span>
        </div>
        <div v-if="Number(details?.payDollar)" class="pay-row">
          <span>USD</span>
          <span>{{ formatUsd(details.payDollar) }}</span>
        </div>
        <div v-if="Number(details?.payLebanese)" class="pay-row">
          <span>LBP</span>
          <span>{{ formatLbp(details.payLebanese) }}</span>
        </div>
        <div v-if="Number(details?.returnedToUserValue) > 0" class="pay-row">
          <span>{{ $t('returnedToUser') }}</span>
          <span>{{ formatLbp(details.returnedToUserValue) }}</span>
        </div>
        <div v-if="Number(details?.currencyRate ?? details?.dollarRate)" class="pay-row pay-row--muted">
          <span>{{ $t('dollarRate') }}</span>
          <span>{{ formatLbp(details.currencyRate ?? details.dollarRate) }}</span>
        </div>
      </div>

      <!-- CUSTOM_TEXT -->
      <div v-else-if="block.type === 'CUSTOM_TEXT'" class="block block-custom">
        <p v-if="customText(block)" class="custom-text">{{ customText(block) }}</p>
      </div>

      <!-- FOOTER -->
      <div v-else-if="block.type === 'FOOTER'" class="block block-footer">
        <div class="dashed" />
        <p class="footer-text">{{ footerText(block) }}</p>
      </div>

      <!-- BARCODE placeholder (future ITEM_LABEL) -->
      <div v-else-if="block.type === 'BARCODE'" class="block block-barcode">
        <div class="barcode-placeholder">||||| {{ block.props?.valueField || 'barcode' }} |||||</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance } from 'vue'
import { useState } from '../../store/state'
import { isDollarReceipt } from '../../constants/currency'

const props = defineProps({
  template: { type: Object, default: null },
  details: { type: Object, default: null },
  items: { type: Array, default: () => [] },
  itemsSubtotal: { type: Number, default: 0 },
  lang: { type: String, default: null }
})

const instance = getCurrentInstance()
const $t = (key) => instance?.appContext?.config?.globalProperties?.$t?.(key) ?? key
const state = useState()

const activeLang = computed(() => props.lang || state.lang || 'en')
const isRtl = computed(() => activeLang.value === 'ar')

const paperWidthMm = computed(() => Number(props.template?.paperWidthMm) || 80)

const enabledBlocks = computed(() =>
  (props.template?.blocks || []).filter((b) => b && b.enabled !== false)
)

function headerName(block) {
  if (activeLang.value === 'ar') return block.props?.shopNameAr || block.props?.shopName || ''
  return block.props?.shopName || block.props?.shopNameAr || ''
}

function headerAddress(block) {
  if (activeLang.value === 'ar') return block.props?.addressAr || block.props?.address || ''
  return block.props?.address || block.props?.addressAr || ''
}

function customText(block) {
  if (activeLang.value === 'ar') return block.props?.textAr || block.props?.textEn || ''
  return block.props?.textEn || block.props?.textAr || ''
}

function footerText(block) {
  if (activeLang.value === 'ar') return block.props?.footerAr || block.props?.footerEn || ''
  return block.props?.footerEn || block.props?.footerAr || ''
}

function itemName(row) {
  if (activeLang.value === 'ar') return row.itemNameAr || row.itemNameEn || '—'
  return row.itemNameEn || row.itemNameAr || '—'
}

function formatDate(value) {
  if (!value) return '—'
  const d = typeof value === 'string' ? value.slice(0, 10) : value
  return String(d)
}

function formatTime(value) {
  if (!value) return '—'
  const s = String(value)
  return s.length >= 5 ? s.slice(0, 5) : s
}

function formatUsd(value) {
  const num = Number(value)
  if (!num && num !== 0) return '—'
  const formatted = Number(num).toFixed(2)
  if (activeLang.value === 'ar') return `دولار\u200E ${formatted}`
  return `${formatted} USD`
}

function formatLbp(value) {
  const num = Number(value)
  if (!num && num !== 0) return '—'
  const formatted = Math.round(num).toLocaleString('en-US')
  if (activeLang.value === 'ar') return `ل.ل.\u200E ${formatted}`
  return `${formatted} LBP`
}

function formatMoney(amountInReceiptCurrency) {
  const num = Number(amountInReceiptCurrency)
  if (!num && num !== 0) return '—'
  if (isDollarReceipt(props.details)) return formatUsd(num)
  return formatLbp(num)
}

function formatTotal(receipt) {
  if (!receipt) return '—'
  const num = Number(receipt.total) || 0
  if (isDollarReceipt(receipt)) return formatUsd(num)
  return formatLbp(num)
}

function formatReceiptDiscount(receipt) {
  const val = Number(receipt?.receiptDiscount) || 0
  if (!val) return '—'
  if (receipt.isReceiptDiscountPercent) return `${val}%`
  if (isDollarReceipt(receipt)) return formatUsd(val)
  return formatLbp(val)
}

function formatPayWish(receipt) {
  const num = Number(receipt?.payWish) || 0
  if (!num) return '—'
  if (receipt.isPayWishDollar !== false) return formatUsd(num)
  return formatLbp(num)
}

function formatItemDiscount(row) {
  const val = Number(row.itemDiscount) || 0
  if (!val) return '—'
  if (row.isDiscountPercent) return `${val}%`
  if (isDollarReceipt(props.details)) return formatUsd(val)
  return formatLbp(val)
}
</script>

<style scoped>
.thermal-receipt {
  box-sizing: border-box;
  max-width: 100%;
  margin: 0 auto;
  padding: 10px 8px 14px;
  background: #fff;
  color: #111;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  line-height: 1.35;
  border: 1px dashed #c5c5c5;
}

.thermal-receipt--rtl {
  font-family: 'Courier New', Courier, monospace;
}

.block {
  margin-bottom: 8px;
}

.block-header {
  text-align: center;
  padding-bottom: 6px;
  border-bottom: 1px dashed #333;
}

.shop-name {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.shop-line {
  margin-top: 2px;
  font-size: 11px;
  word-break: break-word;
}

.meta-row,
.totals-row,
.pay-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}

.pay-row--muted {
  opacity: 0.75;
  font-size: 11px;
}

.items-head,
.item-main {
  display: grid;
  grid-template-columns: 1fr 36px 72px;
  gap: 4px;
  align-items: start;
}

.items-head {
  border-bottom: 1px solid #333;
  padding-bottom: 3px;
  margin-bottom: 4px;
  font-weight: 700;
  font-size: 11px;
}

.col-qty,
.col-amt {
  text-align: end;
}

.item-row {
  margin-bottom: 5px;
}

.item-disc {
  font-size: 10px;
  opacity: 0.8;
  padding-inline-start: 2px;
}

.empty-items {
  text-align: center;
  opacity: 0.7;
  padding: 8px 0;
}

.totals-row--grand {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed #333;
  font-weight: 700;
  font-size: 13px;
}

.block-payment {
  border-top: 1px dashed #999;
  padding-top: 6px;
}

.custom-text,
.footer-text {
  text-align: center;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.dashed {
  border-top: 1px dashed #333;
  margin-bottom: 6px;
}

.barcode-placeholder {
  text-align: center;
  letter-spacing: 1px;
  font-size: 11px;
  padding: 6px 0;
}
</style>
