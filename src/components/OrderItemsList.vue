<template>
  <div class="order-items-container">
    <!-- Order actions header -->
    <div v-if="orderedCart.length > 0" class="order-items-list-header">
      <v-btn
        color="primary"
        variant="flat"
        class="order-header-btn add-items-action-btn elevation-1"
        prepend-icon="mdi-cash-register"
        @click="openPayDialog"
      >
        {{ $t('payReceipt') }}
      </v-btn>
      <v-btn
        color="primary"
        variant="flat"
        class="order-header-btn add-items-action-btn  elevation-1"
        prepend-icon="mdi-file-document-edit-outline"
        @click="handleSaveDraft"
      >
        {{ $t('saveDraft') }}
      </v-btn>
    </div>

    <div v-if="orderedCart.length > 0" class="customer-name-row" :dir="state.dir">
      <v-text-field
        v-model="receipt.customerName"
        variant="outlined"
        density="compact"
        hide-details
        class="customer-name-field"
        :class="{ 'customer-name-field-rtl': state.dir === 'rtl' }"
        :placeholder="$t('customerNamePlaceholder')"
        :prepend-inner-icon="state.dir === 'ltr' ? 'mdi-account' : undefined"
        :append-inner-icon="state.dir === 'rtl' ? 'mdi-account' : undefined"
      />
    </div>

    <div class="order-items-list">
      
      <div
        v-for="item in orderedCart"
        :key="item.id"
        class="order-item-card"
      >
        <!-- Item Image -->
        <div class="order-item-image">
          <v-img
            v-if="getItemImage(item.id)"
            :src="getItemImage(item.id)"
            :alt="getItemName(item)"
            cover
            class="item-thumbnail"
          />
          <div v-else class="item-thumbnail-placeholder">
            <v-icon color="grey-lighten-1">mdi-image-off</v-icon>
          </div>
        </div>

        <div class="order-item-content">
          <div class="order-item-main-row">
            <!-- Item Details -->
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

            <!-- Quantity Controls -->
            <div class="order-item-quantity">
              <div class="quantity-controls">
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  @click="decreaseQuantity(item)"
                  class="quantity-btn"
                >
                  <v-icon>mdi-minus</v-icon>
                </v-btn>
                <input 
                  type="number" 
                  class="quantity-value" 
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
                  <v-icon>mdi-plus</v-icon>
                </v-btn>
              </div>
              <!-- Discount Controls -->
              <div class="discount-controls">
                <input 
                  type="number" 
                  class="discount-input" 
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
          <div class="order-item-divider"></div>
          <div class="order-item-subtotal-row">
            <span class="subtotal-label">{{ $t('subtotal') }}</span>
            <div class="subtotal-value-container">
              <span class="subtotal-value">{{ formatPrice(item.total) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="orderedCart.length === 0" class="empty-cart">
        <v-icon size="large" color="grey-lighten-1">mdi-cart-off</v-icon>
        <p>{{ $t('emptyCart') }}</p>
      </div>
    </div>

    <div class="order-summary elevation-1">
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
    },
    receiptItems: [...receipt.receiptItems],
    subtotal: subtotal.value,
    discount: totalDiscount.value,
    total: receipt.total
  })
}

const handleSaveDraft = () => {
  if (orderedCart.value.length === 0) return
  emit('save-draft', {
    receipt: {
      ...receipt,
      id: draftReceiptId.value
    },
    receiptItems: [...receipt.receiptItems],
    subtotal: subtotal.value,
    discount: totalDiscount.value,
    total: receipt.total
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
    receipt.receiptItems = items.map(item => ({
      itemId: item.itemId,
      quantity: item.quantity,
      itemDiscount: Number(item.itemDiscount) || 0,
      isDiscountPercent: item.isDiscountPercent !== false,
      subTotal: Number(item.subTotal) || 0
    }))
    recalcReceiptTotal()
  }
}
</script>

<style scoped>
.order-items-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem;
  padding-top: 0;
  margin-top: 0;
}

.order-items-list-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.3rem;
  margin-top: 0.2rem;
  height: 45px;
  flex-shrink: 0;
}

.customer-name-row {
  margin-bottom: 0.5rem;
  flex-shrink: 0;
}

.customer-name-field :deep(.v-field) {
  border-radius: 12px;
  background: #ffffff;
}

.customer-name-field :deep(.v-field__outline) {
  opacity: 1;
  color: rgba(25, 119, 131, 0.25);
}

.customer-name-field :deep(.v-field__prepend-inner .v-icon),
.customer-name-field :deep(.v-field__append-inner .v-icon) {
  color: #197783;
  opacity: 0.85;
}

.customer-name-field-rtl :deep(.v-field__input) {
  text-align: right;
}

.customer-name-field-rtl :deep(.v-field__input input) {
  text-align: right;
}

.customer-name-field-rtl :deep(.v-field__input input::placeholder) {
  text-align: right;
}

.order-header-btn {
  flex: 1;
  height: 40px;
  min-height: 40px;
}

.order-items-list {
  flex: 1;
  overflow-y: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.order-items-list::-webkit-scrollbar {
  display: none;
}

.order-item-card {
  background: white;
  border-radius: 0.5rem;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.order-item-card {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 0.75rem;
}

.order-item-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 0;
}

.order-item-main-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
}

.order-item-divider {
  margin-top: 0.5rem;
  position: relative;
}

.order-item-divider::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: repeating-linear-gradient(
    to right,
    #00bcd4 0,
    #00bcd4 7px,
    transparent 8px,
    transparent 22px
  );
}

.order-item-subtotal-row {
  display: flex;
  align-items: center;
  width: 100%;
  margin-top: 0.25rem;
}

.subtotal-label {
  flex: 1;
  text-align: left;
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
}

.subtotal-value-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0;
}

.subtotal-value {
  background-color: white;
  color: #4caf50;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 0.5rem;
  margin-right: 1.2rem;
}

.order-item-image {
  width: auto;
  height: 6.5rem;
  aspect-ratio: 3 / 2;
  border-radius: 0.5rem;
  overflow: hidden;
  flex-shrink: 0;
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
  background: #f5f5f5;
}

.order-item-details {
  flex: 1;
  min-width: 0;
}

.order-item-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.order-item-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: #1a1a1a;
}

.item-link-icon {
  font-size: 1rem;
}

.order-item-price {
  font-size: 0.875rem;
  color: #666;
  font-weight: 600;
  margin-left: 1rem;

}

.order-item-quantity {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.quantity-controls {
  display: flex;
  align-items: center;
  background-color: #fafafa;
  border-radius: 1rem;
  gap: 0.5rem;
}

.discount-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.discount-toggle-btn {
  width: 4rem ;
  height: 1.75rem ;
  background-color: #fafafa;
  border-radius: 1rem;
  color: #666;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0 !important;
  margin-right: 0.5rem;
  align-items: right;
}

.discount-toggle-btn:hover {
  border-color: #00bcd4;
  background-color: #f0f9fa !important;
}

.discount-input {
  width: 7.5rem;
  text-align: center;
  font-weight: 500;
  font-size: 0.75rem;
  border-radius: 1rem;
  background: #fafafa;
  outline: none;
  padding: 0.3rem 0rem;
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

.order-item-discount-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.discount-label {
  flex: 1;
  text-align: left;
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
}

.order-item-total {
  width: 100%;
  padding-top: 0.75rem;
  margin-top: 0.5rem;
  position: relative;
  font-size: 1rem;
  color: #1a1a1a;
  font-weight: 700;
  text-align: right;
}

.order-item-total::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: repeating-linear-gradient(
    to right,
    #00bcd4 0,
    #00bcd4 8px,
    transparent 8px,
    transparent 20px
  );
}

.order-item-total::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: repeating-linear-gradient(
    to right,
    #00bcd4 0,
    #00bcd4 8px,
    transparent 8px,
    transparent 25px
  );
}

.quantity-btn {
  min-width: 1.8rem;
  width: 1.8rem;
  height: 1.8rem;
  margin: 0.25rem;
  background-color: #ffffff;
  border: 1px solid transparent;
  border-radius: 1rem;
  transition: border-color 0.2s, background-color 0.2s;
}

.quantity-btn:hover {
  border-color: #00bcd4;
  background-color: #f0f9fa;
}

.quantity-btn :deep(.v-icon) {
  color: #1a1a1a;
}

.quantity-value {
  min-width: 2rem;
  width: 2rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.875rem;
  border: none;
  background: transparent;
  outline: none;
  padding: 0;
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
  padding: 4rem 1rem;
  color: #999;
  text-align: center;
  width: 100%;
  min-height: 60vh;
}

.empty-cart .v-icon {
  font-size: 2.75rem ;
  width: 2.75rem ;
  height: 2.75rem ;
}

.empty-cart p {
  margin-top: 2rem;
  font-size: 1.25rem;
  font-weight: 500;
}

.total-discount-section {
  width: 100%;
  background-color: #ffffff;
  border-radius: 12px;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
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

.total-discount-section .discount-label {
  font-size: 1.125rem;
  color: #1a1a1a;
  font-weight: 700;
}

.total-discount-section .discount-toggle-btn {
  width: 4rem;
  height: 1.75rem;
  background-color: #fafafa;
  border-radius: 1rem;
  color: #666;
  font-size: 0.75rem;
  font-weight: 600;
}

.total-discount-section .discount-input {
  width: 7.5rem;
  text-align: center;
  font-weight: 500;
  font-size: 0.75rem;
  border-radius: 1rem;
  background: #fafafa;
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

.summary-row:last-child {
  border-bottom: none;
}

.summary-row.total-row {
  padding-top: 0.5rem;
  font-weight: 700;
  font-size: 1.125rem;
}

.summary-label {
  font-size: 1.5rem;
  color: #666;
  font-weight: 600;
  margin-left: 1.5rem;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 600;
  margin-right: 1.5rem;
}

.total-row .summary-label,
.total-row .summary-value {
  font-size: 1.125rem;
  color: #ffffff;
}

.order-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.promo-btn,
.gris-btn {
  width: 100%;
}

.add-items-action-btn {
  border-radius: 12px;
  background-image: linear-gradient(135deg, #197783, #32d8ee);
  color: #ffffff;
}

.add-items-action-btn:hover {
  background-image: linear-gradient(135deg, #08bad1, #26c6da);
}

.add-items-action-btn :deep(.v-btn__content) {
  font-weight: 700;
  color: #ffffff;
}

.add-items-action-btn :deep(.v-btn__prepend) {
  color: #ffffff;
}

/* RTL Support */
[dir="rtl"] .order-items-list-header {
  flex-direction: row-reverse;
}

[dir="rtl"] .total-discount-section {
  flex-direction: row-reverse;
}

[dir="rtl"] .total-discount-row {
  flex-direction: row-reverse;
}



[dir="rtl"] .order-item-card {
  flex-direction: row-reverse;
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
  margin-right: 1rem;
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
  margin-right: 1.5rem;
}

[dir="rtl"] .summary-value {
  margin-right: 0;
  margin-left: 1.5rem;
}
</style>

