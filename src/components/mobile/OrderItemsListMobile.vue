<template>
  <div class="moil" :dir="state.dir">
    <header class="moil__top">
      <BarcodeScanDock
        ref="scanDockRef"
        compact
        :hardware-hint="false"
        @decoded="onBarcodeDecoded"
      />

      <div v-if="orderedCart.length > 0" class="moil__actions">
        <v-btn
          color="primary"
          variant="flat"
          class="moil__action-btn"
          :prepend-icon="state.dir === 'ltr' ? 'mdi-cash-register' : undefined"
          :append-icon="state.dir === 'rtl' ? 'mdi-cash-register' : undefined"
          @click="openPayDialog"
        >
          {{ $t('payReceipt') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          class="moil__action-btn moil__action-btn--draft"
          :prepend-icon="state.dir === 'ltr' ? 'mdi-file-document-edit-outline' : undefined"
          :append-icon="state.dir === 'rtl' ? 'mdi-file-document-edit-outline' : undefined"
          @click="handleSaveDraft"
        >
          {{ $t('saveDraft') }}
        </v-btn>
      </div>

      <v-text-field
        v-if="orderedCart.length > 0"
        v-model="receipt.customerName"
        variant="outlined"
        density="comfortable"
        hide-details
        class="moil__customer"
        :placeholder="$t('customerNamePlaceholder')"
        :prepend-inner-icon="state.dir === 'ltr' ? 'mdi-account-outline' : undefined"
        :append-inner-icon="state.dir === 'rtl' ? 'mdi-account-outline' : undefined"
      />
    </header>

    <div class="moil__list">
      <article
        v-for="item in orderedCart"
        :key="item.id"
        class="moil-card"
      >
        <div class="moil-card__media">
          <v-img
            v-if="getItemImage(item.id)"
            :src="getItemImage(item.id)"
            :alt="getItemName(item)"
            cover
            class="moil-card__img"
          />
          <div v-else class="moil-card__thumb-empty">
            <v-icon size="22">mdi-package-variant</v-icon>
          </div>
        </div>

        <div class="moil-card__body">
          <div class="moil-card__head">
            <div class="moil-card__meta">
              <h3 class="moil-card__name">{{ getItemName(item) }}</h3>
              <p class="moil-card__unit">{{ formatPrice(item.unit) }}</p>
            </div>

            <div class="moil-card__qty" dir="ltr">
              <button type="button" class="moil-card__qty-btn" @click="decreaseQuantity(item)">
                <v-icon size="16">mdi-minus</v-icon>
              </button>
              <input
                type="text"
                inputmode="numeric"
                class="moil-card__qty-value"
                dir="ltr"
                :value="item.qty || 1"
                @input="updateQuantity(item, $event)"
                @blur="validateQuantity(item)"
              />
              <button type="button" class="moil-card__qty-btn" @click="increaseQuantity(item)">
                <v-icon size="16">mdi-plus</v-icon>
              </button>
            </div>
          </div>

          <div class="moil-card__bottom">
            <div class="moil-card__disc">
              <span class="moil-card__disc-label">{{ $t('discount') }}</span>
              <button
                type="button"
                class="moil-card__disc-toggle"
                @click="toggleDiscountType(item)"
              >
                {{ item.discountType === 'amount' ? getCurrencySymbol() : '%' }}
              </button>
              <input
                type="text"
                inputmode="decimal"
                class="moil-card__disc-input"
                dir="ltr"
                :value="getDiscountValue(item)"
                @input="updateDiscount(item, $event)"
                @blur="validateDiscount(item)"
                placeholder="0"
              />
            </div>

            <div class="moil-card__sub">
              <span class="moil-card__sub-label">{{ $t('subtotal') }}</span>
              <strong class="moil-card__sub-value">{{ formatPrice(item.total) }}</strong>
            </div>
          </div>
        </div>
      </article>

      <div v-if="orderedCart.length === 0" class="moil__empty">
        <div class="moil__empty-orb">
          <v-icon size="36">mdi-cart-outline</v-icon>
        </div>
        <p>{{ $t('emptyCart') }}</p>
        <span class="moil__empty-hint">{{ $t('emptyCartScanHint') }}</span>
      </div>
    </div>

    <div class="moil__summary">
      <span>{{ $t('total') }}</span>
      <strong>{{ formatPrice(receipt.total) }}</strong>
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
import { useState } from '../../store/state'
import { translations } from '../../i18n/translations'
import PayReceiptDialog from '../PayReceiptDialog.vue'
import BarcodeScanDock from '../BarcodeScanDock.vue'
import { useHardwareBarcode } from '../../composables/useHardwareBarcode'
import { useBarcodeCart } from '../../composables/useBarcodeCart'
import { playScanBeep } from '../../utils/scanBeep'
import { CurrencyEnum } from '../../constants/enums'
import {
  isDollarCurrency,
  roundForCurrency,
  uiCurrencyToEnum,
  enumToUiCurrency,
  unitPriceInReceiptCurrency
} from '../../constants/currency'

// Receipt structure matching backend ReceiptRequestDTO
const receipt = reactive({
  total: 0,
  currency: CurrencyEnum.DOLLAR,
  isReceiptDiscountPercent: true,
  receiptDiscount: 0, // % or amount in receipt currency
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
const scanDockRef = ref(null)

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['place-order', 'save-draft', 'cart-changed'])

const state = useState()
const $t = (key) => translations[state.lang]?.[key] || key

function syncCurrencyFromUi(currency) {
  const newEnum = uiCurrencyToEnum(currency)
  const wasDollar = isDollarCurrency(receipt.currency)
  const newIsDollar = isDollarCurrency(newEnum)
  if (wasDollar !== newIsDollar) {
    const rate = Number(state.exchangeRate) || 1
    receipt.receiptItems.forEach((ri) => {
      if (!ri.isDiscountPercent) {
        const val = Number(ri.itemDiscount) || 0
        ri.itemDiscount = roundForCurrency(
          newIsDollar ? val / rate : val * rate,
          newEnum
        )
      }
    })
    if (!receipt.isReceiptDiscountPercent) {
      const val = Number(receipt.receiptDiscount) || 0
      receipt.receiptDiscount = roundForCurrency(
        newIsDollar ? val / rate : val * rate,
        newEnum
      )
    }
  }
  receipt.currency = newEnum
  receipt.receiptItems.forEach((ri) => recalcReceiptItemSubTotal(ri))
  recalcReceiptTotal()
}

// Sync receipt currency when user toggles USD/LBP
watch(
  () => state.currency,
  (currency) => {
    syncCurrencyFromUi(currency)
  },
  { immediate: true }
)

// Make formatPrice reactive to currency and language changes
state.currency
state.lang
state.exchangeRate

function getCatalogItem(itemId) {
  return state.getItem(itemId) || props.items.find((i) => String(i.id) === String(itemId)) || null
}

function getUnitPrice(itemId) {
  const item = getCatalogItem(itemId)
  if (!item) return 0
  return unitPriceInReceiptCurrency(
    item.sellingPrice ?? item.sellingPriceDollar ?? 0,
    item.sellingCurrency,
    receipt.currency,
    state.exchangeRate
  )
}

/** Round discount for display/storage: USD = 2 decimals, LBP = integer */
function roundDiscountForCurrency(val) {
  return roundForCurrency(val, receipt.currency)
}

function recalcReceiptItemSubTotal(ri) {
  const unitPrice = getUnitPrice(ri.itemId) // receipt currency
  const qty = ri.quantity || 1
  if (ri.isDiscountPercent) {
    const factor = 1 - (Number(ri.itemDiscount) || 0) / 100
    ri.subTotal = roundForCurrency(Math.max(0, qty * unitPrice * factor), receipt.currency)
  } else {
    const discount = Number(ri.itemDiscount) || 0
    const unitAfter = Math.max(0, unitPrice - discount)
    ri.subTotal = roundForCurrency(qty * unitAfter, receipt.currency)
  }
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
  receipt.currency = uiCurrencyToEnum(state.currency)
  const rawTotal = receipt.receiptItems.reduce((sum, item) => sum + (Number(item.subTotal) || 0), 0)
  let result
  if (receipt.isReceiptDiscountPercent) {
    const factor = 1 - (Number(receipt.receiptDiscount) || 0) / 100
    result = rawTotal * factor
  } else {
    const entered = Number(receipt.receiptDiscount) || 0
    result = rawTotal - Math.min(entered, rawTotal)
  }
  receipt.total = roundForCurrency(Math.max(0, result), receipt.currency)
}

/**
 * Add item to cart (receipt). If item already in receiptItems, increment quantity and recalc. Otherwise add new line.
 * @param {Object} item - Catalog item with id, sellingPrice, sellingCurrency, nameAr, nameEn, etc.
 */
function addItemToCart(item) {
  if (!item || item.id == null) return
  if (item.sellingPrice != null || item.sellingPriceDollar != null) {
    state.addItemCache(item)
  }
  const existing = receipt.receiptItems.find(ri => ri.itemId === item.id)
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
      subTotal: getUnitPrice(item.id)
    }
    if (state.dir === 'rtl') {
      receipt.receiptItems.push(newItem)
    } else {
      receipt.receiptItems.unshift(newItem)
    }
  }
  recalcReceiptTotal()
  if (item?.id != null && item.hasImage !== false) {
    state.ensureItemImages([item.id], { limit: 1 })
  }
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
  receipt.currency = uiCurrencyToEnum(state.currency)
  receipt.receiptItems = []
}

const getItemImage = (itemId) => {
  return state.getItemImage(itemId) || null
}

const getItemName = (item) => {
  return state.lang === 'ar' ? (item.nameAr ?? '') : (item.nameEn ?? '')
}

const { ingestBarcode } = useBarcodeCart({
  getItems: () => state.items,
  addItem: addItemToCart,
  getItemName,
  $t,
  findRemote: (code) => state.findItemByBarcodeRemote(code)
})

function onBarcodeDecoded(code) {
  const fromCamera = Boolean(scanDockRef.value?.isOpen)
  Promise.resolve(ingestBarcode(code, { silent: fromCamera })).then((item) => {
    if (!item) return
    scanDockRef.value?.flashHit(getItemName(item))
    emit('cart-changed')
    if (fromCamera) playScanBeep()
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(35)
  })
}

useHardwareBarcode(onBarcodeDecoded, {
  enabled: computed(() => !showPayDialog.value)
})

watch(showPayDialog, (isOpen) => {
  if (isOpen) scanDockRef.value?.close()
})

function openScanner(streamPromise) {
  scanDockRef.value?.open(streamPromise)
}

// Display list: merge receiptItems with cached catalog item
const orderedCart = computed(() => {
  void state.itemCacheVersion
  const list = receipt.receiptItems.map(ri => {
    const catalog = getCatalogItem(ri.itemId) || {}
    const unit = getUnitPrice(ri.itemId)
    return {
      id: ri.itemId,
      nameAr: catalog.nameAr,
      nameEn: catalog.nameEn,
      sellingPrice: catalog.sellingPrice,
      sellingCurrency: catalog.sellingCurrency,
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
    const lineBefore = (ri.quantity || 0) * unitPrice
    const discountAmount = ri.isDiscountPercent
      ? (lineBefore * (Number(ri.itemDiscount) || 0)) / 100
      : Math.min((Number(ri.itemDiscount) || 0) * (ri.quantity || 0), lineBefore)
    return sum + discountAmount
  }, 0)
})


defineExpose({ addItemToCart, clearReceipt, loadDraft, receipt, draftReceiptId, openScanner, closeScanner: () => scanDockRef.value?.close() })

const getCurrencySymbol = () => {
  if (isDollarCurrency(receipt.currency)) {
    return state.lang === 'ar' ? 'دولار' : 'USD'
  }
  return state.lang === 'ar' ? 'ل.ل.' : 'LBP'
}

const formatPrice = (price) => {
  if (!price && price !== 0) return '0'
  const numPrice = typeof price === 'number' ? price : parseFloat(price)
  // Values are already in receipt currency — do not multiply by rate again
  const displayValue = numPrice

  let formattedValue
  let currencySymbol

  if (isDollarCurrency(receipt.currency)) {
    formattedValue = Number(displayValue).toFixed(2)
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
  return Number(item.unit ?? getUnitPrice(item.id) ?? 0) || 0
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
  const maxPerUnit = getUnitPrice(ri.itemId)
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
    const currencyEnum =
      details.currency != null
        ? uiCurrencyToEnum(details.currency)
        : uiCurrencyToEnum(details.isReceiptDollar === false ? 'LBP' : 'USD')
    receipt.currency = currencyEnum
    receipt.isReceiptDiscountPercent = details.isReceiptDiscountPercent !== false
    receipt.receiptDiscount = Number(details.receiptDiscount) || 0
    receipt.payWish = Number(details.payWish) || 0
    receipt.isPayWishDollar = details.isPayWishDollar !== false
    receipt.payDollar = Number(details.payDollar) || 0
    receipt.payLebanese = Number(details.payLebanese) || 0
    receipt.returnedToUserValue = Number(details.returnedToUserValue) || 0
    receipt.total = Number(details.total) || 0
    state.currency = enumToUiCurrency(currencyEnum)
    localStorage.setItem('currency', state.currency)
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
    state.ensureItemImages(receipt.receiptItems.map((ri) => ri.itemId))
  }
}
</script>

<style scoped>
.moil {
  --ink: #0d2a2e;
  --muted: #5f7a7e;
  --line: rgba(25, 119, 131, 0.14);
  --teal: #197783;
  --cyan: #2ad4e8;
  --surface: #fff;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 0.75rem 0.85rem calc(0.75rem + env(safe-area-inset-bottom));
  background: #eef5f6;
  box-sizing: border-box;
}

.moil__top {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-bottom: 0.75rem;
}

.moil__actions {
  display: flex;
  gap: 0.55rem;
}

.moil__action-btn {
  flex: 1;
  min-height: 2.85rem !important;
  border-radius: 14px !important;
  text-transform: none !important;
  font-weight: 750 !important;
  background-image: linear-gradient(135deg, #0f5a63, #197783 50%, #2ad4e8) !important;
  color: #fff !important;
  box-shadow: 0 6px 14px rgba(25, 119, 131, 0.22) !important;
}

.moil__action-btn--draft {
  background-image: linear-gradient(135deg, #2a6f78, #3aa8b4) !important;
}

.moil__customer :deep(.v-field) {
  border-radius: 14px;
  background: #fff;
}

.moil__customer :deep(.v-field__input) {
  min-height: 2.6rem;
  text-align: start;
}

.moil__customer :deep(.v-field__prepend-inner .v-icon),
.moil__customer :deep(.v-field__append-inner .v-icon) {
  color: var(--teal);
}

.moil__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding-bottom: 0.35rem;
  scrollbar-width: none;
}

.moil__list::-webkit-scrollbar {
  display: none;
}

.moil-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 0.55rem;
  box-shadow: 0 4px 14px rgba(13, 42, 46, 0.05);
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0.7rem;
}

.moil-card__media {
  height: 4.75rem;
  aspect-ratio: 3 / 2;
  width: auto;
  flex: 0 0 auto;
  align-self: center;
  border-radius: 12px;
  overflow: hidden;
  background: #e8f2f3;
  box-shadow: inset 0 0 0 1px rgba(25, 119, 131, 0.08);
}

.moil-card__img {
  width: 100%;
  height: 100%;
}

.moil-card__thumb-empty {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: #8aa8ad;
  background: linear-gradient(145deg, #e7f3f5, #f3f8f9);
}

.moil-card__body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.4rem;
}

.moil-card__head {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  min-width: 0;
}

.moil-card__meta {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.moil-card__name {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1.25;
  color: var(--ink);
  text-align: start;
  word-break: break-word;
  overflow-wrap: anywhere;
  white-space: normal;
}

.moil-card__unit {
  margin: 0;
  font-size: 0.74rem;
  font-weight: 650;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  text-align: start;
}

.moil-card__qty {
  flex: 0 0 auto;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.05rem;
  height: 2rem;
  padding: 0.12rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: #f2f7f8;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.moil-card__qty-btn {
  width: 1.65rem;
  height: 1.65rem;
  border: none;
  border-radius: 50%;
  background: #fff;
  color: var(--ink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  box-shadow: 0 1px 3px rgba(13, 42, 46, 0.08);
}

.moil-card__qty-btn:active {
  transform: scale(0.94);
}

.moil-card__qty-value {
  width: 1.55rem;
  border: none;
  background: transparent;
  text-align: center;
  font-weight: 800;
  font-size: 0.82rem;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  outline: none;
  padding: 0;
}

.moil-card__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
  min-width: 0;
}

.moil-card__disc {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
  flex: 1 1 auto;
}

.moil-card__disc-label {
  flex: 0 0 auto;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--muted);
}

.moil-card__disc-toggle {
  flex: 0 0 auto;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #eef6f7;
  color: var(--teal);
  font-size: 0.65rem;
  font-weight: 800;
  min-width: 2.2rem;
  height: 1.55rem;
  padding: 0 0.35rem;
  cursor: pointer;
}

.moil-card__disc-input {
  flex: 0 1 4.5rem;
  width: 4.5rem;
  max-width: 5rem;
  height: 1.55rem;
  box-sizing: border-box;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #f2f7f8;
  text-align: center;
  font-weight: 700;
  font-size: 0.78rem;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  outline: none;
  padding: 0 0.3rem;
}

.moil-card__disc-input:focus {
  border-color: var(--cyan);
  background: #fff;
  box-shadow: 0 0 0 2px rgba(42, 212, 232, 0.16);
}

.moil-card__sub {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: end;
  gap: 0.05rem;
}

.moil-card__sub-label {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--muted);
  text-align: end;
}

.moil-card__sub-value {
  font-size: 0.86rem;
  font-weight: 800;
  color: var(--teal);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.moil__empty {
  flex: 1;
  min-height: 22vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
  color: var(--muted);
  text-align: center;
}

.moil__empty-orb {
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff;
  border: 1px solid var(--line);
  color: var(--teal);
  box-shadow: 0 10px 24px rgba(25, 119, 131, 0.08);
}

.moil__empty p {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 750;
  color: var(--ink);
}

.moil__empty-hint {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--muted);
}

.moil__summary {
  flex-shrink: 0;
  margin-top: 0.55rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.95rem 1.1rem;
  border-radius: 16px;
  background: linear-gradient(135deg, #0f5a63, #197783 48%, #2ad4e8);
  color: #fff;
  box-shadow: 0 10px 28px rgba(25, 119, 131, 0.28);
  font-size: 1.05rem;
  font-weight: 800;
}

.moil__summary strong {
  font-variant-numeric: tabular-nums;
}
</style>
