<template>
  <div class="order-items-container">
    <header v-if="orderedCart.length > 0" class="oil-top">
      <div class="oil-title-row">
        <span class="oil-title">{{ $t('cart') }}</span>
        <span class="oil-count">{{ orderedCart.length }}</span>
      </div>

      <div class="order-items-list-header">
        <v-btn
          color="primary"
          variant="flat"
          class="order-header-btn add-items-action-btn"
          prepend-icon="mdi-cash-register"
          @click="openPayDialog"
        >
          {{ $t('payReceipt') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          class="order-header-btn add-items-action-btn oil-draft-btn"
          prepend-icon="mdi-file-document-edit-outline"
          @click="handleSaveDraft"
        >
          {{ $t('saveDraft') }}
        </v-btn>
      </div>

      <div class="customer-name-row" :dir="state.dir">
        <v-text-field
          v-model="receipt.customerName"
          variant="outlined"
          density="compact"
          hide-details
          class="customer-name-field"
          :class="{ 'customer-name-field-rtl': state.dir === 'rtl' }"
          :placeholder="$t('customerNamePlaceholder')"
          :prepend-inner-icon="state.dir === 'ltr' ? 'mdi-account-outline' : undefined"
          :append-inner-icon="state.dir === 'rtl' ? 'mdi-account-outline' : undefined"
        />
      </div>
    </header>

    <div class="order-items-list">
      <article
        v-for="item in orderedCart"
        :key="item.id"
        class="order-item-card"
      >
        <div class="order-item-image">
          <v-img
            v-if="getItemImage(item.id)"
            :src="getItemImage(item.id)"
            :alt="getItemName(item)"
            cover
            class="item-thumbnail"
          />
          <div v-else class="item-thumbnail-placeholder">
            <v-icon size="22">mdi-package-variant</v-icon>
          </div>
        </div>

        <div class="order-item-content">
          <div class="order-item-main-row">
            <div class="order-item-details">
              <div class="order-item-header">
                <span class="order-item-name">{{ getItemName(item) }}</span>
              </div>
              <div class="order-item-price">{{ formatPrice(item.unit) }}</div>
              <div class="order-item-discount-row">
                <span class="discount-label">{{ $t('discount') }}</span>
                <v-btn
                  variant="text"
                  size="x-small"
                  class="discount-toggle-btn"
                  @click="toggleDiscountType(item)"
                >
                  {{ item.discountType === 'amount' ? getCurrencySymbol() : '%' }}
                </v-btn>
              </div>
            </div>

            <div class="order-item-quantity">
              <div class="quantity-controls">
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  @click="decreaseQuantity(item)"
                  class="quantity-btn"
                >
                  <v-icon size="18">mdi-minus</v-icon>
                </v-btn>
                <input
                  type="text"
                  inputmode="numeric"
                  class="quantity-value"
                  dir="ltr"
                  :value="item.qty || 1"
                  @input="updateQuantity(item, $event)"
                  @blur="validateQuantity(item)"
                  min="1"
                />
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  @click="increaseQuantity(item)"
                  class="quantity-btn"
                >
                  <v-icon size="18">mdi-plus</v-icon>
                </v-btn>
              </div>
              <div class="discount-controls">
                <input
                  type="text"
                  inputmode="decimal"
                  class="discount-input"
                  dir="ltr"
                  :value="getDiscountValue(item)"
                  @input="updateDiscount(item, $event)"
                  @blur="validateDiscount(item)"
                  :min="0"
                  :max="getDiscountMax(item)"
                  :placeholder="item.discountType === 'amount' ? '0' : '0'"
                />
              </div>
            </div>
          </div>

          <div class="order-item-subtotal-row">
            <span class="subtotal-label">{{ $t('subtotal') }}</span>
            <div class="subtotal-value-container">
              <span class="subtotal-value">{{ formatPrice(item.total) }}</span>
            </div>
          </div>
        </div>
      </article>

      <div v-if="orderedCart.length === 0" class="empty-cart">
        <div class="empty-cart-orb">
          <v-icon size="36">mdi-cart-outline</v-icon>
        </div>
        <p class="empty-cart-title">{{ $t('emptyCart') }}</p>
      </div>
    </div>

    <div class="order-summary">
      <div class="summary-row total-row">
        <span class="summary-label">{{ $t('total') }}</span>
        <span class="summary-value">{{ formatPrice(receipt.total) }}</span>
      </div>
    </div>

    <PayReceiptDialog
      v-model="showPayDialog"
      :receipt="receipt"
      @save="handleSaveFromDialog"
      @open-drawer="handleOpenDrawer"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useState } from '../store/state'
import PayReceiptDialog from './PayReceiptDialog.vue'

// Receipt structure matching backend ReceiptRequestDTO
const receipt = reactive({
  total: 0,
  isReceiptDollar: true,
  isReceiptDiscountPercent: true,
  receiptDiscount: 0, // % or amount per receipt currency
    payWish: 0,
    isPayWishDollar: true,
    payDollar: 0,
  payLebanese: 0,
  returnedToUserValue: 0,
  customerName: '',
  receiptItems: [] // each item: { itemId, quantity, itemDiscount, isDiscountPercent, subTotal }
})

const showPayDialog = ref(false)
const draftReceiptId = ref(null)

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['place-order', 'save-draft'])

const state = useState()

// Sync receipt display currency when user changes currency so subtotal/total and buttons re-render in LBP/USD
watch(
  () => state.currency,
  (currency) => {
    const newIsDollar = currency === 'USD'
    if (receipt.isReceiptDollar !== newIsDollar) {
      receipt.receiptItems.forEach(ri => {
        if (!ri.isDiscountPercent) {
          const val = Number(ri.itemDiscount) || 0
          ri.itemDiscount = newIsDollar ? val / state.exchangeRate : val * state.exchangeRate
        }
      })
      if (!receipt.isReceiptDiscountPercent) {
        const val = Number(receipt.receiptDiscount) || 0
        receipt.receiptDiscount = newIsDollar ? val / state.exchangeRate : val * state.exchangeRate
      }
    }
    receipt.isReceiptDollar = newIsDollar
  },
  { immediate: true }
)

// Make formatPrice reactive to currency and language changes
state.currency
state.lang
state.exchangeRate

function getUnitPrice(itemId) {
  const item = props.items.find(i => i.id === itemId)
  return item ? Number(item.sellingPriceDollar ?? 0) : 0
}

/** Round to 2 decimal places for USD amounts */
function roundToTwo(val) {
  return Math.round(Number(val) * 100) / 100
}

/** Round discount for display/storage: USD = 2 decimals, LBP = integer (no decimals) */
function roundDiscountForCurrency(val) {
  return receipt.isReceiptDollar ? roundToTwo(val) : Math.round(Number(val))
}

function recalcReceiptItemSubTotal(ri) {
  const unitPrice = getUnitPrice(ri.itemId) // always USD
  const rawSub = (ri.quantity || 1) * unitPrice // always USD
  let discountAmount
  if (ri.isDiscountPercent) {
    discountAmount = (rawSub * (Number(ri.itemDiscount) || 0)) / 100
  } else {
    const entered = Number(ri.itemDiscount) || 0 // discount per unit in receipt currency
    const perUnitUsd = receipt.isReceiptDollar ? entered : entered / state.exchangeRate
    discountAmount = perUnitUsd * (ri.quantity || 1) // apply discount to all units
    discountAmount = Math.min(discountAmount, rawSub)
  }
  ri.subTotal = roundToTwo(Math.max(0, rawSub - discountAmount)) // always stored in USD; round to 2 decimals
}

/** Move receipt item so it appears first in the list (top). LTR: move to front; RTL: move to end (before reverse) */
function moveReceiptItemToFront(ri) {
  const idx = receipt.receiptItems.indexOf(ri)
  if (idx === -1) return
  receipt.receiptItems.splice(idx, 1)
  if (state.dir === 'rtl') {
    receipt.receiptItems.push(ri)
  } else {
    receipt.receiptItems.unshift(ri)
  }
}

function recalcReceiptTotal() {
  const rawTotal = receipt.receiptItems.reduce((sum, item) => sum + (Number(item.subTotal) || 0), 0)
  let receiptDiscountAmount
  if (receipt.isReceiptDiscountPercent) {
    receiptDiscountAmount = (rawTotal * (Number(receipt.receiptDiscount) || 0)) / 100
  } else {
    const entered = Number(receipt.receiptDiscount) || 0
    receiptDiscountAmount = receipt.isReceiptDollar ? entered : entered / state.exchangeRate
    receiptDiscountAmount = Math.min(receiptDiscountAmount, rawTotal)
  }
  receipt.total = roundToTwo(Math.max(0, rawTotal - receiptDiscountAmount)) // always USD; round to 2 decimals
  receipt.isReceiptDollar = state.currency === 'USD'
}

/**
 * Add item to cart (receipt). If item already in receiptItems, increment quantity and recalc. Otherwise add new line.
 * @param {Object} item - Catalog item with id, sellingPriceDollar, nameAr, nameEn, etc.
 */
function addItemToCart(item) {
  if (!item || item.id == null) return
  const existing = receipt.receiptItems.find(ri => ri.itemId === item.id)
  const unitPrice = Number(item.sellingPriceDollar ?? 0)
  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1
    recalcReceiptItemSubTotal(existing)
    moveReceiptItemToFront(existing)
  } else {
    const newItem = {
      itemId: item.id,
      quantity: 1,
      itemDiscount: 0,
      isDiscountPercent: true,
      subTotal: unitPrice
    }
    if (state.dir === 'rtl') {
      receipt.receiptItems.push(newItem)
    } else {
      receipt.receiptItems.unshift(newItem)
    }
  }
  recalcReceiptTotal()
}

function clearReceipt() {
  draftReceiptId.value = null
  receipt.total = 0
  receipt.isReceiptDiscountPercent = true
  receipt.receiptDiscount = 0
  receipt.payWish = 0
  receipt.isPayWishDollar = true
  receipt.payDollar = 0
  receipt.payLebanese = 0
  receipt.returnedToUserValue = 0
  receipt.customerName = ''
  receipt.isReceiptDollar = state.currency === 'USD'
  receipt.receiptItems = []
}

const getItemImage = (itemId) => {
  const item = props.items.find(i => i.id === itemId)
  if (!item || !item.image) return null
  
  if (item.image.startsWith('data:image')) {
    return item.image
  }
  if (item.image.startsWith('/9j/') || item.image.startsWith('iVBORw0KGgo')) {
    const prefix = item.image.startsWith('/9j/') ? 'data:image/jpeg;base64,' : 'data:image/png;base64,'
    return prefix + item.image
  }
  return item.image
}

const getItemName = (item) => {
  return state.lang === 'ar' ? (item.nameAr ?? '') : (item.nameEn ?? '')
}

// Display list: merge receiptItems with item (props.items) for template
const orderedCart = computed(() => {
  const list = receipt.receiptItems.map(ri => {
    const catalog = props.items.find(i => i.id === ri.itemId) || {}
    const unit = getUnitPrice(ri.itemId)
    return {
      id: ri.itemId,
      nameAr: catalog.nameAr,
      nameEn: catalog.nameEn,
      sellingPriceDollar: catalog.sellingPriceDollar,
      qty: ri.quantity,
      unit,
      discountType: ri.isDiscountPercent ? 'percentage' : 'amount',
      discountPercent: ri.isDiscountPercent ? (Number(ri.itemDiscount) || 0) : 0,
      discountAmount: ri.isDiscountPercent ? 0 : (Number(ri.itemDiscount) || 0),
      total: Number(ri.subTotal) || 0
    }
  })
  return state.dir === 'rtl' ? [...list].reverse() : list
})

const subtotal = computed(() => {
  return receipt.receiptItems.reduce((sum, ri) => {
    const unitPrice = getUnitPrice(ri.itemId)
    return sum + (ri.quantity || 0) * unitPrice
  }, 0)
})

const totalDiscount = computed(() => {
  return receipt.receiptItems.reduce((sum, ri) => {
    const unitPrice = getUnitPrice(ri.itemId)
    const itemSubtotalUsd = (ri.quantity || 0) * unitPrice
    const discountAmountUsd = ri.isDiscountPercent
      ? (itemSubtotalUsd * (Number(ri.itemDiscount) || 0)) / 100
      : Math.min((receipt.isReceiptDollar ? (Number(ri.itemDiscount) || 0) : (Number(ri.itemDiscount) || 0) / state.exchangeRate) * (ri.quantity || 0), itemSubtotalUsd)
    return sum + discountAmountUsd
  }, 0)
})


defineExpose({ addItemToCart, clearReceipt, loadDraft, receipt, draftReceiptId })

const getCurrencySymbol = () => {
  if (receipt.isReceiptDollar) {
    return state.lang === 'ar' ? 'دولار' : 'USD'
  }
  return state.lang === 'ar' ? 'ل.ل.' : 'LBP'
}

const formatPrice = (price) => {
  if (!price && price !== 0) return '0'
  const numPrice = typeof price === 'number' ? price : parseFloat(price)
  // Stored values are always in USD; multiply by rate only when receipt is not dollar (show LBP)
  const displayValue = receipt.isReceiptDollar ? numPrice : numPrice * state.exchangeRate

  let formattedValue
  let currencySymbol

  if (receipt.isReceiptDollar) {
    formattedValue = displayValue.toFixed(2)
    currencySymbol = state.lang === 'ar' ? 'دولار' : 'USD'
  } else {
    formattedValue = Math.round(displayValue).toLocaleString('en-US')
    currencySymbol = state.lang === 'ar' ? 'ل.ل.' : 'LBP'
  }

  // In Arabic (RTL), use left-to-right mark to keep currency on the right
  if (state.lang === 'ar') {
    return `${currencySymbol}\u200E ${formattedValue}`
  }

  return `${formattedValue} ${currencySymbol}`
}

function getReceiptItem(itemId) {
  return receipt.receiptItems.find(ri => ri.itemId === itemId)
}

const increaseQuantity = (item) => {
  const ri = getReceiptItem(item.id)
  if (!ri) return
  ri.quantity = (ri.quantity || 1) + 1
  recalcReceiptItemSubTotal(ri)
  recalcReceiptTotal()
}

const decreaseQuantity = (item) => {
  const ri = getReceiptItem(item.id)
  if (!ri) return
  if (ri.quantity > 1) {
    ri.quantity -= 1
    recalcReceiptItemSubTotal(ri)
    recalcReceiptTotal()
  } else {
    receipt.receiptItems = receipt.receiptItems.filter(r => r.itemId !== item.id)
    recalcReceiptTotal()
  }
}

const updateQuantity = (item, event) => {
  const value = parseInt(event.target.value, 10)
  if (value > 0) {
    const ri = getReceiptItem(item.id)
    if (ri) {
      ri.quantity = value
      recalcReceiptItemSubTotal(ri)
      recalcReceiptTotal()
    }
  }
}

const validateQuantity = (item) => {
  const ri = getReceiptItem(item.id)
  if (!ri || ri.quantity >= 1) return
  ri.quantity = 1
  recalcReceiptItemSubTotal(ri)
  recalcReceiptTotal()
}


const getDiscountValue = (item) => {
  if (!item.discountType || item.discountType === 'percentage') {
    return roundDiscountForCurrency(item.discountPercent || 0)
  }
  return roundDiscountForCurrency(item.discountAmount || 0)
}

/** Max value for discount input: 100 for %, or unit price in receipt currency for amount (per-unit discount) */
function getDiscountMax(item) {
  if (!item) return 100
  if (!item.discountType || item.discountType === 'percentage') {
    return 100
  }
  const unit = Number(item.unit ?? item.sellingPriceDollar ?? 0) || 0
  return receipt.isReceiptDollar ? unit : unit * state.exchangeRate
}

const toggleDiscountType = (item) => {
  const ri = getReceiptItem(item.id)
  if (!ri) return
  if (ri.isDiscountPercent) {
    ri.isDiscountPercent = false
    ri.itemDiscount = 0
  } else {
    ri.isDiscountPercent = true
    ri.itemDiscount = 0
  }
  recalcReceiptItemSubTotal(ri)
  recalcReceiptTotal()
}

const updateDiscount = (item, event) => {
  const value = parseFloat(event.target.value)
  const ri = getReceiptItem(item.id)
  if (!ri) return
  ri.itemDiscount = isNaN(value) ? 0 : value
  recalcReceiptItemSubTotal(ri)
  recalcReceiptTotal()
}

const validateDiscount = (item) => {
  const ri = getReceiptItem(item.id)
  if (!ri) return
  const unitPrice = getUnitPrice(ri.itemId)
  const maxPerUnit = receipt.isReceiptDollar ? unitPrice : unitPrice * state.exchangeRate
  if (ri.isDiscountPercent) {
    if (ri.itemDiscount < 0) ri.itemDiscount = 0
    if (ri.itemDiscount > 100) ri.itemDiscount = 100
  } else {
    if (ri.itemDiscount < 0) ri.itemDiscount = 0
    if (ri.itemDiscount > maxPerUnit) ri.itemDiscount = maxPerUnit
  }
  ri.itemDiscount = roundDiscountForCurrency(ri.itemDiscount)
  recalcReceiptItemSubTotal(ri)
  recalcReceiptTotal()
}

const openPayDialog = () => {
  if (orderedCart.value.length === 0) return
  showPayDialog.value = true
}

const handleSaveFromDialog = () => {
  showPayDialog.value = false
  handlePlaceOrder()
}

/** Placeholder for future drawer implementation */
const handleOpenDrawer = () => {
  // TODO: open cash drawer
}

const handlePlaceOrder = () => {
  emit('place-order', {
    receipt: {
      ...receipt,
      id: draftReceiptId.value
    }
  })
}

const handleSaveDraft = () => {
  if (orderedCart.value.length === 0) return
  emit('save-draft', {
    receipt: {
      ...receipt,
      id: draftReceiptId.value
    }
  })
}

function loadDraft({ id, details, items }) {
  clearReceipt()
  draftReceiptId.value = id

  if (details) {
    receipt.customerName = details.customerName || ''
    receipt.isReceiptDollar = details.isReceiptDollar !== false
    receipt.isReceiptDiscountPercent = details.isReceiptDiscountPercent !== false
    receipt.receiptDiscount = Number(details.receiptDiscount) || 0
    receipt.payWish = Number(details.payWish) || 0
    receipt.isPayWishDollar = details.isPayWishDollar !== false
    receipt.payDollar = Number(details.payDollar) || 0
    receipt.payLebanese = Number(details.payLebanese) || 0
    receipt.returnedToUserValue = Number(details.returnedToUserValue) || 0
    receipt.total = Number(details.total) || 0
    if (details.isReceiptDollar !== false) {
      state.currency = 'USD'
    } else {
      state.currency = 'LBP'
    }
  }

  if (items?.length) {
    receipt.receiptItems = items.map((row) => ({
      itemId: row.item?.id ?? row.itemId,
      quantity: row.quantity,
      itemDiscount: Number(row.itemDiscount) || 0,
      isDiscountPercent: row.isDiscountPercent !== false,
      subTotal: Number(row.subTotal) || 0
    }))
    recalcReceiptTotal()
  }
}
</script>

<style scoped>
.order-items-container {
  --oil-ink: #16363a;
  --oil-muted: #5f7a7e;
  --oil-line: rgba(25, 119, 131, 0.16);
  --oil-teal: #197783;
  --oil-teal-bright: #20b4c6;
  --oil-surface: #ffffff;
  --oil-panel: linear-gradient(180deg, #eaf5f6 0%, #f5f9fa 45%, #eef4f5 100%);
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0.85rem 0.85rem 0.75rem;
  background: var(--oil-panel);
  position: relative;
}

.order-items-container::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 65% 36% at 100% 0%, rgba(50, 216, 238, 0.1), transparent 55%),
    radial-gradient(ellipse 48% 28% at 0% 100%, rgba(25, 119, 131, 0.07), transparent 50%);
}

.oil-top,
.order-items-list,
.order-summary {
  position: relative;
  z-index: 1;
}

.oil-top {
  flex-shrink: 0;
  margin-bottom: 0.7rem;
  animation: oil-fade-in 0.35s ease both;
}

.oil-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.55rem;
  padding: 0 0.2rem;
}

.oil-title {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--oil-muted);
}

.oil-count {
  min-width: 1.55rem;
  height: 1.55rem;
  padding: 0 0.42rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, var(--oil-teal), var(--oil-teal-bright));
  box-shadow: 0 4px 10px rgba(25, 119, 131, 0.22);
}

.order-items-list-header {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.55rem;
  flex-shrink: 0;
}

.customer-name-row {
  margin-bottom: 0.15rem;
  flex-shrink: 0;
}

.customer-name-field :deep(.v-field) {
  border-radius: 14px;
  background: #ffffff;
  transition: box-shadow 0.2s ease, background 0.2s ease;
}

.customer-name-field :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(32, 180, 198, 0.18);
}

.customer-name-field :deep(.v-field__outline) {
  opacity: 1;
  color: var(--oil-line);
}

.customer-name-field :deep(.v-field__prepend-inner .v-icon),
.customer-name-field :deep(.v-field__append-inner .v-icon) {
  color: var(--oil-teal);
  opacity: 0.9;
}

.customer-name-field-rtl :deep(.v-field__input),
.customer-name-field-rtl :deep(.v-field__input input),
.customer-name-field-rtl :deep(.v-field__input input::placeholder) {
  text-align: right;
}

.order-header-btn {
  flex: 1;
  height: 42px;
  min-height: 42px;
}

.order-items-list {
  flex: 1;
  overflow-y: auto;
  padding-inline: 0.1rem;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.order-items-list::-webkit-scrollbar {
  display: none;
}

.order-item-card {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0.75rem;
  background: var(--oil-surface);
  border: 1px solid rgba(25, 119, 131, 0.1);
  border-left: 3px solid var(--oil-teal);
  border-radius: 16px;
  padding: 0.7rem 0.75rem;
  margin-bottom: 0.6rem;
  box-shadow: 0 6px 16px rgba(22, 54, 58, 0.05);
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  animation: oil-rise 0.3s ease both;
}

.order-item-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(22, 54, 58, 0.08);
  border-color: rgba(32, 180, 198, 0.38);
  border-left-color: var(--oil-teal-bright);
}

.order-item-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 0.5rem;
}

.order-item-main-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 0.65rem;
}

.order-item-subtotal-row {
  display: flex;
  align-items: center;
  width: 100%;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--oil-line);
}

.subtotal-label {
  flex: 1;
  text-align: left;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--oil-muted);
  font-weight: 600;
}

.subtotal-value-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0;
}

.subtotal-value {
  color: var(--oil-teal);
  font-size: 0.9rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  margin-right: 1.2rem;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  background: rgba(25, 119, 131, 0.08);
}

.order-item-image {
  /* Match HomeItemCard / cropper: landscape 3:2 rectangle */
  width: auto;
  height: 6.5rem;
  aspect-ratio: 3 / 2;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  background: #e8f2f3;
  box-shadow: inset 0 0 0 1px rgba(25, 119, 131, 0.08);
}

.item-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-thumbnail-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #e7f3f5, #f3f8f9);
  color: #8aa8ad;
}

.order-item-details {
  flex: 1;
  min-width: 0;
}

.order-item-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.15rem;
}

.order-item-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--oil-ink);
  line-height: 1.25;
  text-align: left;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.order-item-price {
  font-size: 0.8rem;
  color: var(--oil-muted);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: left;
  margin-left: 0;
  margin-bottom: 0.35rem;
}

.order-item-quantity {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
  width: 7.4rem;
}

.quantity-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: #f2f7f8;
  border: 1px solid var(--oil-line);
  border-radius: 999px;
  padding: 0.12rem;
  gap: 0.15rem;
}

.discount-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.order-item-discount-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.discount-label {
  flex: 1;
  text-align: left;
  font-size: 0.75rem;
  color: var(--oil-muted);
  font-weight: 500;
}

.discount-toggle-btn {
  width: auto !important;
  min-width: 2.6rem !important;
  height: 1.55rem !important;
  background-color: #eef6f7 !important;
  border: 1px solid var(--oil-line) !important;
  border-radius: 999px !important;
  color: var(--oil-teal) !important;
  font-size: 0.7rem !important;
  font-weight: 700 !important;
  padding: 0 0.45rem !important;
  margin-right: 0.5rem;
  letter-spacing: 0.02em;
}

.discount-toggle-btn:hover {
  background-color: #e2f4f7 !important;
  border-color: rgba(32, 180, 198, 0.45) !important;
}

.discount-input {
  width: 100%;
  height: 1.85rem;
  box-sizing: border-box;
  text-align: center;
  text-align-last: center;
  direction: ltr;
  font-weight: 600;
  font-size: 0.8rem;
  line-height: normal;
  border: 1px solid var(--oil-line);
  border-radius: 999px;
  background: #f2f7f8;
  outline: none;
  padding: 0;
  color: var(--oil-ink);
  font-variant-numeric: tabular-nums;
  appearance: textfield;
  -moz-appearance: textfield;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.discount-input::-webkit-outer-spin-button,
.discount-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.discount-input:focus {
  border-color: var(--oil-teal-bright);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(32, 180, 198, 0.15);
}

.quantity-btn {
  min-width: 1.7rem !important;
  width: 1.7rem !important;
  height: 1.7rem !important;
  margin: 0 !important;
  background-color: #ffffff !important;
  border: 1px solid transparent;
  border-radius: 999px !important;
  transition: border-color 0.2s, background-color 0.2s, transform 0.15s;
}

.quantity-btn:hover {
  border-color: rgba(32, 180, 198, 0.45);
  background-color: #eefafc !important;
  transform: scale(1.04);
}

.quantity-btn :deep(.v-icon) {
  color: var(--oil-ink);
}

.quantity-value {
  flex: 1;
  min-width: 1.8rem;
  width: 2rem;
  height: 1.7rem;
  box-sizing: border-box;
  text-align: center;
  text-align-last: center;
  direction: ltr;
  font-weight: 700;
  font-size: 0.85rem;
  line-height: normal;
  color: var(--oil-ink);
  border: none;
  background: transparent;
  outline: none;
  padding: 0;
  margin: 0;
  font-variant-numeric: tabular-nums;
  appearance: textfield;
  -moz-appearance: textfield;
}

.quantity-value::-webkit-outer-spin-button,
.quantity-value::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3.5rem 1rem;
  color: var(--oil-muted);
  text-align: center;
  width: 100%;
  min-height: 58vh;
  animation: oil-fade-in 0.4s ease both;
}

.empty-cart-orb {
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(232, 244, 246, 0.9));
  border: 1px solid var(--oil-line);
  color: var(--oil-teal);
  box-shadow: 0 10px 24px rgba(25, 119, 131, 0.08);
  animation: oil-pulse 2.8s ease-in-out infinite;
}

.empty-cart-title {
  margin-top: 1.15rem;
  margin-bottom: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--oil-ink);
}

.order-summary {
  border-radius: 16px;
  padding: 0.9rem 1.15rem;
  margin-top: 0.55rem;
  background: linear-gradient(135deg, #156974 0%, #1a8f9c 48%, #28c4d6 100%);
  color: #ffffff;
  box-shadow: 0 10px 28px rgba(21, 105, 116, 0.28);
  flex-shrink: 0;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-row.total-row {
  font-weight: 700;
}

.summary-label {
  font-size: 1.05rem;
  color: #ffffff;
  font-weight: 700;
  margin-left: 0.35rem;
}

.summary-value {
  font-size: 1.05rem;
  color: #ffffff;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  margin-right: 0.35rem;
}

.add-items-action-btn {
  border-radius: 12px !important;
  background-image: linear-gradient(135deg, #197783, #28c4d6) !important;
  color: #ffffff !important;
  box-shadow: 0 6px 14px rgba(25, 119, 131, 0.22) !important;
  letter-spacing: 0.01em;
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease !important;
}

.add-items-action-btn:hover {
  filter: brightness(1.05);
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(25, 119, 131, 0.28) !important;
}

.oil-draft-btn {
  background-image: linear-gradient(135deg, #2a6f78, #3aa8b4) !important;
}

.add-items-action-btn :deep(.v-btn__content),
.add-items-action-btn :deep(.v-btn__prepend) {
  color: #ffffff;
  font-weight: 700;
}

@keyframes oil-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes oil-rise {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes oil-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
}

/* RTL Support — mirrors original layout via explicit row-reverse */
[dir="rtl"] .order-items-list-header {
  flex-direction: row-reverse;
}

[dir="rtl"] .oil-title-row {
  flex-direction: row-reverse;
}

[dir="rtl"] .order-item-card {
  flex-direction: row-reverse;
  padding: 0.7rem 0.75rem;
  border-left: 1px solid rgba(25, 119, 131, 0.1);
  border-right: 3px solid var(--oil-teal);
}

[dir="rtl"] .order-item-card:hover {
  border-left-color: rgba(32, 180, 198, 0.38);
  border-right-color: var(--oil-teal-bright);
}

[dir="rtl"] .order-item-main-row {
  flex-direction: row-reverse;
}

[dir="rtl"] .order-item-header {
  flex-direction: row-reverse;
}

[dir="rtl"] .order-item-name {
  text-align: right;
}

[dir="rtl"] .order-item-price {
  text-align: right;
  margin-left: 0;
  margin-right: 0;
}

[dir="rtl"] .order-item-discount-row {
  flex-direction: row-reverse;
}

[dir="rtl"] .discount-label {
  text-align: right;
}

[dir="rtl"] .order-item-quantity {
  flex-direction: column;
}

[dir="rtl"] .quantity-controls {
  flex-direction: row-reverse;
}

[dir="rtl"] .discount-controls {
  justify-content: flex-end;
}

[dir="rtl"] .discount-toggle-btn {
  margin-right: 0;
  margin-left: 0.5rem;
}

[dir="rtl"] .order-item-subtotal-row {
  flex-direction: row-reverse;
}

[dir="rtl"] .subtotal-label {
  text-align: right;
}

[dir="rtl"] .subtotal-value-container {
  justify-content: flex-start;
}

[dir="rtl"] .subtotal-value {
  margin-right: 0;
  margin-left: 1.2rem;
}

[dir="rtl"] .summary-row {
  flex-direction: row-reverse;
}

[dir="rtl"] .summary-label {
  margin-left: 0;
  margin-right: 0.35rem;
}

[dir="rtl"] .summary-value {
  margin-right: 0;
  margin-left: 0.35rem;
}
</style>
