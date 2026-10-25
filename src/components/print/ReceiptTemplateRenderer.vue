<template>
  <div
    class="thermal-receipt"
    :class="{ 'thermal-receipt--rtl': isRtl }"
    :style="{ width: `${paperWidthMm}mm`, fontSize: `${fontSizePx}px` }"
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
          <span>{{ tr('date') }}</span>
          <span>{{ formatDate(details?.receiptDate) }}</span>
        </div>
        <div class="meta-row">
          <span>{{ tr('time') }}</span>
          <span>{{ formatTime(details?.receiptTime) }}</span>
        </div>
        <div class="meta-row">
          <span>{{ tr('customerName') }}</span>
          <span>{{ details?.customerName || tr('walkInCustomer') }}</span>
        </div>
        <div class="meta-row">
          <span>{{ tr('employeeName') }}</span>
          <span>{{ details?.employeeName || '—' }}</span>
        </div>
      </div>

      <!-- ITEMS -->
      <div v-else-if="block.type === 'ITEMS'" class="block block-items">
        <div class="items-grid items-head">
          <span>{{ tr('name') }}</span>
          <span class="col-qty">{{ tr('qty') }}</span>
          <span class="col-amt">{{ tr('subtotal') }}</span>
        </div>
        <div v-for="(row, idx) in items" :key="`${row.itemId}-${idx}`" class="items-grid item-row">
          <div class="item-name-cell">
            <div class="item-name">{{ itemName(row) }}</div>
            <div v-if="itemExtras(block, row).length" class="item-extras">
              <span
                v-for="extra in itemExtras(block, row)"
                :key="extra.key"
                class="item-extra"
                :class="{ 'item-extra--bold': extra.bold }"
              >
                {{ extra.label }}: <span class="amt">{{ extra.value }}</span>
              </span>
            </div>
          </div>
          <span class="col-qty">×{{ row.quantity ?? 0 }}</span>
          <span class="col-amt amt">{{ money(row.subTotal) }}</span>
        </div>
        <div v-if="!items.length" class="empty-items">{{ tr('noReceiptItems') }}</div>
      </div>

      <!-- TOTALS -->
      <div v-else-if="block.type === 'TOTALS'" class="block block-totals">
        <div v-if="hasReceiptDiscount && block.props?.showSubtotal !== false" class="totals-row">
          <span>{{ tr('subtotal') }}</span>
          <span class="amt">{{ money(itemsSubtotal) }}</span>
        </div>
        <div v-if="hasReceiptDiscount && block.props?.showTotalDiscount !== false" class="totals-row">
          <span>{{ tr('discount') }}</span>
          <span class="amt">{{ formatReceiptDiscount(details) }}</span>
        </div>
        <div class="totals-grand">
          <div
            v-for="(currency, idx) in totalCurrencies(block)"
            :key="currency"
            class="totals-row totals-row--grand"
          >
            <span>{{ idx === 0 ? tr('total') : '' }}</span>
            <span class="amt">{{ moneyIn(details?.total, currency) }}</span>
          </div>
        </div>
        <div v-if="block.props?.showCurrencyRate !== false && lbpRate > 1" class="totals-row totals-row--muted">
          <span>{{ tr('dollarRate') }}</span>
          <span class="amt">{{ formatAmount(lbpRate, CurrencyEnum.LBP) }}</span>
        </div>
      </div>

      <!-- PAYMENT -->
      <div v-else-if="block.type === 'PAYMENT'" class="block block-payment">
        <div v-if="Number(details?.payWish)" class="pay-row">
          <span>Whish</span>
          <span class="amt">{{ formatPayWish(details) }}</span>
        </div>
        <div v-if="Number(details?.payDollar)" class="pay-row">
          <span>{{ isRtl ? 'دولار' : 'USD' }}</span>
          <span class="amt">{{ formatAmount(details.payDollar, CurrencyEnum.DOLLAR) }}</span>
        </div>
        <div v-if="Number(details?.payLebanese)" class="pay-row">
          <span>{{ isRtl ? 'ليرة' : 'LBP' }}</span>
          <span class="amt">{{ formatAmount(details.payLebanese, CurrencyEnum.LBP) }}</span>
        </div>
        <div class="pay-row">
          <span>{{ tr('returnedToUser') }}</span>
          <span class="amt">{{ formatAmount(details?.returnedToUserValue || 0, CurrencyEnum.LBP) }}</span>
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
import { computed } from 'vue'
import { useState } from '../../store/state'
import { t } from '../../i18n/translations'
import { CurrencyEnum } from '../../constants/enums'
import {
  isDollarCurrency,
  isDollarReceipt,
  receiptCurrencyRate,
  uiCurrencyToEnum,
  unitPriceInReceiptCurrency
} from '../../constants/currency'
import { normalizeFontSize } from '../../print/blockTypes'

const props = defineProps({
  template: { type: Object, default: null },
  details: { type: Object, default: null },
  items: { type: Array, default: () => [] },
  itemsSubtotal: { type: Number, default: 0 },
  lang: { type: String, default: null }
})

const state = useState()

const activeLang = computed(() => {
  if (props.lang) return props.lang
  const setting = props.template?.receiptLanguage
  if (setting === 'AR') return 'ar'
  if (setting === 'EN') return 'en'
  return state.lang || 'en'
})
const isRtl = computed(() => activeLang.value === 'ar')
const tr = (key) => t(key, activeLang.value)

const receiptCurrency = computed(() =>
  isDollarReceipt(props.details) ? CurrencyEnum.DOLLAR : CurrencyEnum.LBP
)

/** Currency the receipt amounts are printed in (payments always print as paid). */
const displayCurrency = computed(() => {
  const setting = props.template?.receiptCurrency
  if (setting === 'USD') return CurrencyEnum.DOLLAR
  if (setting === 'LBP') return CurrencyEnum.LBP
  return uiCurrencyToEnum(state.currency)
})

/** LBP per 1 USD frozen on the receipt; dollar receipts store currencyRate = 1. */
const lbpRate = computed(() => {
  const d = props.details
  if (!isDollarReceipt(d)) return receiptCurrencyRate(d, Number(state.exchangeRate) || 1)
  const stored = Number(d?.returnValueCurrencyRate)
  return stored > 0 ? stored : Number(state.exchangeRate) || 1
})

const hasReceiptDiscount = computed(() => Number(props.details?.receiptDiscount) > 0)

const paperWidthMm = computed(() => Number(props.template?.paperWidthMm) || 80)
const fontSizePx = computed(() => normalizeFontSize(props.template?.fontSize))

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

/**
 * Amount with its currency word. Rendered inside `.amt` (an LTR isolate), so in Arabic the
 * currency word stays to the left of the number and the two never wrap apart.
 */
function formatAmount(value, currency) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  const dollar = isDollarCurrency(currency)
  const formatted = dollar ? num.toFixed(2) : Math.round(num).toLocaleString('en-US')
  if (isRtl.value) return `${dollar ? 'دولار' : 'ل.ل.'}\u200E ${formatted}`
  return `${formatted} ${dollar ? 'USD' : 'LBP'}`
}

/** Amount stored in the receipt currency, printed in `currency`. */
function moneyIn(amountInReceiptCurrency, currency) {
  const converted = unitPriceInReceiptCurrency(
    Number(amountInReceiptCurrency) || 0,
    receiptCurrency.value,
    currency,
    lbpRate.value
  )
  return formatAmount(converted, currency)
}

/** Amount stored in the receipt currency, printed in the chosen receipt currency. */
function money(amountInReceiptCurrency) {
  return moneyIn(amountInReceiptCurrency, displayCurrency.value)
}

/** Currencies the grand total prints in; falls back to the receipt currency if both are off. */
function totalCurrencies(block) {
  const p = block.props || {}
  const list = []
  if (p.showTotalLbp !== false) list.push(CurrencyEnum.LBP)
  if (p.showTotalUsd !== false) list.push(CurrencyEnum.DOLLAR)
  return list.length ? list : [displayCurrency.value]
}

function formatReceiptDiscount(receipt) {
  const val = Number(receipt?.receiptDiscount) || 0
  if (!val) return '—'
  if (receipt.isReceiptDiscountPercent) return `${val}%`
  return money(val)
}

function formatPayWish(receipt) {
  const num = Number(receipt?.payWish) || 0
  if (!num) return '—'
  return formatAmount(num, receipt.isPayWishDollar !== false ? CurrencyEnum.DOLLAR : CurrencyEnum.LBP)
}

/** Unit prices in the receipt currency, derived from the saved line so they always match it. */
function unitPrices(row) {
  const qty = Number(row.quantity) || 0
  const discount = Number(row.itemDiscount) || 0
  const after = qty > 0 ? (Number(row.subTotal) || 0) / qty : 0
  let base = after
  if (discount > 0 && row.isDiscountPercent) {
    base = discount < 100
      ? after / (1 - discount / 100)
      : unitPriceInReceiptCurrency(row.sellingPrice, row.sellingCurrency, receiptCurrency.value, lbpRate.value)
  } else if (discount > 0) {
    base = after + discount
  }
  return { base, after, discount }
}

function itemExtras(block, row) {
  const p = block.props || {}
  const { base, after, discount } = unitPrices(row)
  const extras = []
  if (p.showBasePrice !== false) {
    extras.push({ key: 'base', label: tr('basePrice'), value: money(base), bold: p.boldBasePrice === true })
  }
  if (discount > 0 && p.showDiscount !== false) {
    extras.push({
      key: 'disc',
      label: tr('discount'),
      value: row.isDiscountPercent ? `${discount}%` : money(discount),
      bold: p.boldDiscount === true
    })
  }
  if (discount > 0 && p.showPriceAfterDiscount !== false) {
    extras.push({
      key: 'after',
      label: tr('priceAfterDiscount'),
      value: money(after),
      bold: p.boldPriceAfterDiscount === true
    })
  }
  return extras
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
  font-size: 1.25em;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.shop-line {
  margin-top: 2px;
  font-size: 0.92em;
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

.totals-row--muted {
  margin-top: 2px;
  opacity: 0.75;
  font-size: 0.92em;
}

.amt {
  direction: ltr;
  unicode-bidi: isolate;
  white-space: nowrap;
}

/* Rows share the parent's columns so qty/amount widths fit the widest value at any font size. */
.block-items {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  column-gap: 1em;
}

.items-grid {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: subgrid;
  align-items: center;
}

.items-head {
  border-bottom: 1px solid #333;
  padding-bottom: 3px;
  margin-bottom: 2px;
  font-weight: 700;
  font-size: 0.92em;
}

.col-qty,
.col-amt {
  text-align: end;
}

.thermal-receipt--rtl .col-amt {
  text-align: left;
}

.item-row {
  padding: 7px 0;
  border-bottom: 1px dotted #bbb;
}

.item-row:last-of-type {
  border-bottom: none;
}

.item-name-cell {
  min-width: 0;
}

.item-name {
  font-weight: 700;
  overflow-wrap: anywhere;
}

.item-extras {
  display: flex;
  flex-wrap: wrap;
  column-gap: 8px;
  row-gap: 1px;
  margin-top: 2px;
  font-size: 0.84em;
}

.item-extra {
  white-space: nowrap;
  opacity: 0.85;
}

.item-extra--bold {
  font-weight: 700;
  opacity: 1;
}

.empty-items {
  grid-column: 1 / -1;
  text-align: center;
  opacity: 0.7;
  padding: 8px 0;
}

.block-totals {
  padding-top: 6px;
  border-top: 1px dashed #333;
}

.totals-grand {
  margin-top: 4px;
}

.totals-row--grand {
  font-weight: 700;
  font-size: 1.08em;
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
  font-size: 0.92em;
  padding: 6px 0;
}
</style>
