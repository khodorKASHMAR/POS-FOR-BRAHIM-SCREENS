<template>
  <v-dialog
    :model-value="modelValue"
    :max-width="dialogMaxWidth"
    persistent
    :dir="state.dir"
    :scrollable="isCompactViewport"
    content-class="pay-receipt-dialog-overlay"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="pay-receipt-dialog elevation-4">
      <div class="pay-dialog-header">
        <div class="pay-dialog-title">{{ $t('payReceipt') }}</div>
        <v-btn
          icon
          variant="text"
          size="small"
          class="pay-dialog-close-btn"
          :aria-label="$t('cancel')"
          @click="closeDialog"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>

      <!-- Total -->
      <div class="order-summary elevation-1">
        <div class="summary-row total-row">
          <span class="summary-label">{{ $t('total') }}</span>
          <span class="summary-value">{{ formatPrice(receipt.total) }}</span>
        </div>
      </div>

      <!-- Total Discount -->
      <div class="total-discount-section elevation-1">
        <div class="total-discount-row">
          <span class="discount-label">{{ $t('totalDiscount') }}</span>
          <v-btn
            variant="text"
            size="x-small"
            class="discount-toggle-btn"
            @click="toggleReceiptDiscountType"
          >
            {{ receipt.isReceiptDiscountPercent ? '%' : getCurrencySymbol() }}
          </v-btn>
        </div>
        <div class="total-discount-controls">
          <input
            type="number"
            class="discount-input"
            :value="getReceiptDiscountDisplayValue()"
            @input="updateReceiptDiscount($event)"
            @focus="onReceiptDiscountFocus($event)"
            @blur="onReceiptDiscountBlur"
            :min="0"
            :max="getReceiptDiscountMax()"
            placeholder="0"
          />
        </div>
      </div>

      <!-- Payment inputs -->
      <div class="wish-payment-row">
        <div class="payment-input-wrap wish-payment-wrap">
          <span class="wish-symbol" aria-hidden="true">W</span>
          <input
            type="number"
            class="payment-input"
            :value="payWishInput"
            @input="onPayWishInput($event)"
            min="0"
            :step="payWishIsDollar ? '0.01' : '1'"
            placeholder="0"
          />
          <v-btn
            variant="text"
            size="x-small"
            class="wish-currency-toggle"
            @click="togglePayWishCurrency"
          >
            {{ payWishIsDollar ? (state.lang === 'ar' ? 'دولار' : 'USD') : lbpSymbol }}
          </v-btn>
        </div>
      </div>

      <div class="payment-fields">
        <div class="payment-field-block">
          <span class="payment-field-label">{{ $t('payDollar') }}</span>
          <div class="payment-input-wrap">
            <v-icon class="payment-symbol-icon dollar-symbol-icon" size="20">mdi-currency-usd</v-icon>
            <input
              type="number"
              class="payment-input"
              :value="payDollarInput"
              @input="onPayDollarInput($event)"
              min="0"
              step="0.01"
              placeholder="0"
            />
          </div>
        </div>

        <div class="payment-field-block">
          <span class="payment-field-label">{{ $t('payLebanese') }}</span>
          <div class="payment-input-wrap">
            <span class="lbp-symbol">{{ lbpSymbol }}</span>
            <input
              type="number"
              class="payment-input"
              :value="payLebaneseInput"
              @input="onPayLebaneseInput($event)"
              min="0"
              step="1"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      <!-- Split hints -->
      <div class="rate-hint">
        <v-icon size="16" class="rate-hint-icon">mdi-information-outline</v-icon>
        <span>{{ formatSplitHint(hintExact) }}</span>
      </div>
      <div class="rate-hint">
        <v-icon size="16" class="rate-hint-icon">mdi-information-outline</v-icon>
        <span>{{ formatSplitHint(hintMultiple5) }}</span>
      </div>
      <div class="rate-hint">
        <v-icon size="16" class="rate-hint-icon">mdi-information-outline</v-icon>
        <span>{{ formatSplitHint(hintMultiple10) }}</span>
      </div>

      <!-- Actions -->
      <div class="pay-dialog-actions">
        <v-btn
          color="primary"
          variant="flat"
          class="pay-dialog-btn save-btn elevation-1"
          @click="handleSave"
        >
          {{ $t('save') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="outlined"
          class="pay-dialog-btn drawer-btn elevation-1"
          @click="$emit('open-drawer')"
        >
          {{ $t('openDrawer') }}
        </v-btn>
      </div>
    </div>
  </v-dialog>
</template>

<script setup>
import { computed, getCurrentInstance, inject, onMounted, onUnmounted, ref, watch } from 'vue'
import { useState } from '../store/state'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  receipt: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'save', 'open-drawer'])

const instance = getCurrentInstance()
const $t = (key) => instance?.appContext?.config?.globalProperties?.$t?.(key) ?? key
const $notification = inject('$notification')

const state = useState()

const payWishInput = ref('')
const payDollarInput = ref('')
const payLebaneseInput = ref('')
const payWishIsDollar = ref(true)
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)

function onResize() {
  viewportWidth.value = window.innerWidth
}

onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const isCompactViewport = computed(() => viewportWidth.value < 1024)

const dialogMaxWidth = computed(() => {
  if (viewportWidth.value >= 1400) return 640
  if (viewportWidth.value >= 1024) return 580
  return Math.min(520, viewportWidth.value - 24)
})

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    payWishIsDollar.value = props.receipt.isPayWishDollar !== false
    payWishInput.value = props.receipt.payWish ? String(props.receipt.payWish) : ''
    payDollarInput.value = props.receipt.payDollar ? String(props.receipt.payDollar) : ''
    payLebaneseInput.value = props.receipt.payLebanese ? String(props.receipt.payLebanese) : ''
    syncPaymentToReceipt()
  }
)

const lbpSymbol = computed(() => (state.lang === 'ar' ? 'ل.ل.' : 'LBP'))

state.currency
state.lang
state.exchangeRate

function roundToTwo(val) {
  return Math.round(Number(val) * 100) / 100
}

function roundDiscountForCurrency(val) {
  return props.receipt.isReceiptDollar ? roundToTwo(val) : Math.round(Number(val))
}

function recalcReceiptTotal() {
  const rawTotal = props.receipt.receiptItems.reduce(
    (sum, item) => sum + (Number(item.subTotal) || 0),
    0
  )
  let receiptDiscountAmount
  if (props.receipt.isReceiptDiscountPercent) {
    receiptDiscountAmount = (rawTotal * (Number(props.receipt.receiptDiscount) || 0)) / 100
  } else {
    const entered = Number(props.receipt.receiptDiscount) || 0
    receiptDiscountAmount = props.receipt.isReceiptDollar
      ? entered
      : entered / state.exchangeRate
    receiptDiscountAmount = Math.min(receiptDiscountAmount, rawTotal)
  }
  props.receipt.total = roundToTwo(Math.max(0, rawTotal - receiptDiscountAmount))
  props.receipt.isReceiptDollar = state.currency === 'USD'
  syncPaymentToReceipt()
}

const totalLbp = computed(() =>
  Math.round((Number(props.receipt.total) || 0) * state.exchangeRate)
)

function payWishToLbp() {
  const val = Number(payWishInput.value) || 0
  return payWishIsDollar.value ? val * state.exchangeRate : val
}

const paidLbp = computed(() => {
  const wish = payWishToLbp()
  const dollar = (Number(payDollarInput.value) || 0) * state.exchangeRate
  const lebanese = Number(payLebaneseInput.value) || 0
  return wish + dollar + lebanese
})

const overpaidLbp = computed(() => Math.max(0, Math.round(paidLbp.value - totalLbp.value)))
const underpaidLbp = computed(() => Math.max(0, Math.round(totalLbp.value - paidLbp.value)))
const isOverpaid = computed(() => overpaidLbp.value > 0)

const hintBaseLbp = computed(() => (isOverpaid.value ? overpaidLbp.value : underpaidLbp.value))

function splitRemainingLbp(remaining, dollarMultiple = 1) {
  const rate = state.exchangeRate
  if (remaining <= 0 || rate <= 0) {
    return { dollars: 0, lbp: Math.max(0, Math.round(remaining)) }
  }
  const maxDollars = Math.floor(remaining / rate / dollarMultiple) * dollarMultiple
  const lbp = Math.round(remaining - maxDollars * rate)
  return { dollars: maxDollars, lbp }
}

const hintExact = computed(() => splitRemainingLbp(hintBaseLbp.value, 1))
const hintMultiple5 = computed(() => splitRemainingLbp(hintBaseLbp.value, 5))
const hintMultiple10 = computed(() => splitRemainingLbp(hintBaseLbp.value, 10))

function syncPaymentToReceipt() {
  const wishVal = Number(payWishInput.value) || 0
  props.receipt.payWish = payWishIsDollar.value ? roundToTwo(wishVal) : Math.round(wishVal)
  props.receipt.isPayWishDollar = payWishIsDollar.value
  props.receipt.payDollar = roundToTwo(Number(payDollarInput.value) || 0)
  props.receipt.payLebanese = Math.round(Number(payLebaneseInput.value) || 0)
  props.receipt.returnedToUserValue = overpaidLbp.value
  props.receipt.dollarRate = state.exchangeRate
}

function togglePayWishCurrency() {
  const current = Number(payWishInput.value) || 0
  if (current > 0) {
    if (payWishIsDollar.value) {
      payWishInput.value = String(Math.round(current * state.exchangeRate))
    } else {
      payWishInput.value = String(roundToTwo(current / state.exchangeRate))
    }
  }
  payWishIsDollar.value = !payWishIsDollar.value
  syncPaymentToReceipt()
}

function onPayWishInput(event) {
  payWishInput.value = event.target.value
  syncPaymentToReceipt()
}

function onPayDollarInput(event) {
  payDollarInput.value = event.target.value
  syncPaymentToReceipt()
}

function onPayLebaneseInput(event) {
  payLebaneseInput.value = event.target.value
  syncPaymentToReceipt()
}

function formatSplitHint({ dollars, lbp }) {
  const dollarLabel = state.lang === 'ar' ? 'دولار' : 'USD'
  const lbpFormatted = Math.round(lbp).toLocaleString('en-US')
  const lbpLabel = state.lang === 'ar' ? 'ل.ل.' : 'LBP'
  const prefix = isOverpaid.value ? $t('youShouldReturn') : $t('remainingIs')
  if (state.lang === 'ar') {
    return `${prefix} ${dollars} ${dollarLabel} و ${lbpFormatted} ${lbpLabel}`
  }
  return `${prefix} ${dollars} ${dollarLabel} and ${lbpFormatted} ${lbpLabel}`
}

const getCurrencySymbol = () => {
  if (props.receipt.isReceiptDollar) {
    return state.lang === 'ar' ? 'دولار' : 'USD'
  }
  return state.lang === 'ar' ? 'ل.ل.' : 'LBP'
}

const formatPrice = (price) => {
  if (!price && price !== 0) return '0'
  const numPrice = typeof price === 'number' ? price : parseFloat(price)
  const displayValue = props.receipt.isReceiptDollar ? numPrice : numPrice * state.exchangeRate

  let formattedValue
  let currencySymbol

  if (props.receipt.isReceiptDollar) {
    formattedValue = displayValue.toFixed(2)
    currencySymbol = state.lang === 'ar' ? 'دولار' : 'USD'
  } else {
    formattedValue = Math.round(displayValue).toLocaleString('en-US')
    currencySymbol = state.lang === 'ar' ? 'ل.ل.' : 'LBP'
  }

  if (state.lang === 'ar') {
    return `${currencySymbol}\u200E ${formattedValue}`
  }
  return `${formattedValue} ${currencySymbol}`
}

function getUserIdFromToken() {
  const token = localStorage.getItem('token')
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const id = Number(payload.sub)
    return Number.isFinite(id) ? id : null
  } catch {
    return null
  }
}

function validatePayment() {
  const total = totalLbp.value
  const paid = Math.round(paidLbp.value)
  const returned = overpaidLbp.value

  if (paid < total) {
    return $t('receiptPaymentInvalid')
  }

  if (Math.abs(paid - returned - total) > 1) {
    return $t('receiptPaymentInvalid')
  }

  return null
}

function handleSave() {
  syncPaymentToReceipt()
  props.receipt.returnedToUserValue = overpaidLbp.value
  props.receipt.dollarRate = state.exchangeRate
  props.receipt.userId = getUserIdFromToken()

  const error = validatePayment()
  if (error) {
    if (typeof $notification === 'function') {
      $notification(error, 'error', 5000)
    }
    return
  }
  syncPaymentToReceipt()
  emit('save')
}

function closeDialog() {
  emit('update:modelValue', false)
}

const rawTotalBeforeReceiptDiscount = computed(() =>
  props.receipt.receiptItems.reduce((sum, item) => sum + (Number(item.subTotal) || 0), 0)
)

function getReceiptDiscountMax() {
  if (props.receipt.isReceiptDiscountPercent) return 100
  const raw = rawTotalBeforeReceiptDiscount.value
  return props.receipt.isReceiptDollar ? raw : raw * state.exchangeRate
}

function clampReceiptDiscountValue(value) {
  const max = getReceiptDiscountMax()
  const clamped = Math.max(0, Math.min(max, value))
  return roundDiscountForCurrency(clamped)
}

function getReceiptDiscountDisplayValue() {
  return roundDiscountForCurrency(props.receipt.receiptDiscount ?? 0)
}

const toggleReceiptDiscountType = () => {
  props.receipt.isReceiptDiscountPercent = !props.receipt.isReceiptDiscountPercent
  props.receipt.receiptDiscount = 0
  recalcReceiptTotal()
}

const onReceiptDiscountFocus = (event) => {
  event.target.select()
}

const onReceiptDiscountBlur = () => {
  const val = Number(props.receipt.receiptDiscount)
  props.receipt.receiptDiscount = isNaN(val) ? 0 : clampReceiptDiscountValue(val)
  recalcReceiptTotal()
}

const updateReceiptDiscount = (event) => {
  let value = parseFloat(event.target.value)
  if (isNaN(value)) value = 0
  props.receipt.receiptDiscount = clampReceiptDiscountValue(value)
  recalcReceiptTotal()
}
</script>

<style scoped>
.pay-receipt-dialog {
  background: #ffffff;
  border-radius: 0 16px 16px 0;
  padding: 0.5rem 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: min(90vh, 820px);
  overflow-y: auto;
}

.pay-dialog-header {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-top: 0;
  margin-bottom: 0.15rem;
  min-height: 2rem;
}

.pay-dialog-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a1a1a;
  text-align: center;
}

.pay-dialog-close-btn {
  position: absolute;
  top: 0;
  right: 0;
  transform: none;
  color: #666;
}

.pay-dialog-close-btn:hover {
  color: #1a1a1a;
  background-color: rgba(0, 0, 0, 0.05);
}

.order-summary {
  border-radius: 12px;
  padding: 0.5rem;
  background-image: linear-gradient(135deg, #197783, #32d8ee);
  color: #ffffff;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.summary-row.total-row {
  font-weight: 700;
  font-size: 1.125rem;
}

.summary-label {
  font-size: 1.125rem;
  font-weight: 600;
  margin-left: 1rem;
}

.summary-value {
  font-size: 1.125rem;
  font-weight: 600;
  margin-right: 1rem;
}

.total-row .summary-label,
.total-row .summary-value {
  color: #ffffff;
}

.total-discount-section {
  width: 100%;
  background-color: #ffffff;
  border-radius: 12px;
  padding: 0.5rem 0.75rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid rgba(25, 119, 131, 0.15);
}

.total-discount-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.total-discount-controls {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.discount-label {
  font-size: 1rem;
  color: #1a1a1a;
  font-weight: 700;
}

.discount-toggle-btn {
  width: 4rem;
  height: 1.75rem;
  background-color: #fafafa;
  border-radius: 1rem;
  color: #666;
  font-size: 0.75rem;
  font-weight: 600;
}

.discount-input {
  width: 7.5rem;
  text-align: center;
  font-weight: 500;
  font-size: 0.75rem;
  border-radius: 1rem;
  background: #fafafa;
  outline: none;
  padding: 0.3rem 0;
  border: 1px solid transparent;
  appearance: textfield;
  -moz-appearance: textfield;
}

.discount-input::-webkit-outer-spin-button,
.discount-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.discount-input:focus {
  border-color: #00bcd4;
}

.payment-fields {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.payment-field-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.payment-field-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.55);
  text-align: center;
}

.payment-input-wrap {
  display: flex;
  align-items: center;
  border-radius: 12px;
  background:
    linear-gradient(#ffffff, #ffffff) padding-box,
    linear-gradient(135deg, #2293a1, #32d8ee) border-box;
  border: 1px solid transparent;
  overflow: hidden;
  padding: 0 0.5rem;
  min-height: 40px;
}

.payment-input-wrap:focus-within {
  box-shadow: 0 0 0 3px rgba(44, 140, 242, 0.22);
}

.wish-symbol {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 800;
  color: #ffffff;
  background: linear-gradient(135deg, #d32f2f, #f44336);
  margin-right: 0.35rem;
}

.wish-payment-row {
  width: 100%;
  margin-top: 0.25rem;
}

.wish-payment-wrap {
  width: 100%;
}

.wish-currency-toggle {
  flex-shrink: 0;
  width: 3.5rem;
  height: 1.75rem;
  background-color: #fafafa;
  border-radius: 1rem;
  color: #666;
  font-size: 0.7rem;
  font-weight: 600;
  margin-left: 0.25rem;
}

.payment-symbol-icon {
  flex-shrink: 0;
  margin-right: 0.35rem;
}

.dollar-symbol-icon {
  color: #29b6f6;
}

.lbp-symbol {
  flex-shrink: 0;
  font-size: 0.65rem;
  font-weight: 700;
  color: #197783;
  margin-right: 0.35rem;
  white-space: nowrap;
}

.payment-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: #1a1a1a;
  appearance: textfield;
  -moz-appearance: textfield;
}

.payment-input::-webkit-outer-spin-button,
.payment-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.rate-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  background: rgba(44, 140, 242, 0.06);
  color: rgba(0, 0, 0, 0.58);
  font-size: 0.78rem;
  text-align: center;
}

.rate-hint-icon {
  color: #2c8cf2;
  flex-shrink: 0;
}

.pay-dialog-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.pay-dialog-btn {
  flex: 1;
  height: 44px;
  border-radius: 12px;
  font-weight: 700;
}

.save-btn {
  background-image: linear-gradient(135deg, #197783, #32d8ee) !important;
  color: #ffffff !important;
}

.drawer-btn {
  border-color: #197783 !important;
  color: #197783 !important;
}

[dir="rtl"] .pay-dialog-close-btn {
  right: auto;
  left: 0;
}

.pay-receipt-dialog {
  border-radius: 16px;
}

[dir="rtl"] .summary-row {
  flex-direction: row-reverse;
}

[dir="rtl"] .summary-label {
  margin-left: 0;
  margin-right: 1rem;
}

[dir="rtl"] .summary-value {
  margin-right: 0;
  margin-left: 1rem;
}

[dir="rtl"] .total-discount-section {
  flex-direction: row-reverse;
}

[dir="rtl"] .total-discount-row {
  flex-direction: row-reverse;
}

[dir="rtl"] .payment-fields {
  flex-direction: row-reverse;
}

[dir="rtl"] .wish-payment-wrap {
  flex-direction: row-reverse;
}

[dir="rtl"] .wish-currency-toggle {
  margin-left: 0;
  margin-right: 0.25rem;
}

[dir="rtl"] .wish-symbol,
[dir="rtl"] .payment-symbol-icon,
[dir="rtl"] .lbp-symbol {
  margin-right: 0;
  margin-left: 0.35rem;
}

[dir="rtl"] .pay-dialog-actions {
  flex-direction: row-reverse;
}

@media (min-width: 768px) {
  .pay-receipt-dialog {
    padding: 0.5rem 1.75rem 1.5rem;
    gap: 0.85rem;
  }

  .pay-dialog-title {
    font-size: 1.35rem;
  }

  .payment-fields {
    gap: 0.75rem;
  }
}

@media (min-width: 1024px) {
  .pay-receipt-dialog {
    padding: 1rem 2rem 1.2rem;
    max-height: none;
    overflow-y: visible;
  }

  .pay-dialog-btn {
    height: 48px;
    font-size: 0.95rem;
  }

  .order-summary,
  .total-discount-section {
    padding: 0.65rem 0.85rem;
  }
}
</style>

<style>
.pay-receipt-dialog-overlay {
  align-items: center;
  justify-content: center;
  border-radius: 0 16px 16px 0 !important;
  overflow: hidden;
}

.pay-receipt-dialog-overlay[dir="rtl"],
[dir="rtl"] .pay-receipt-dialog-overlay {
  border-radius: 16px 0 0 16px !important;
}
</style>
