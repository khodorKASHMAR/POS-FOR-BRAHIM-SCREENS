<template>
  <v-dialog
    :model-value="modelValue"
    fullscreen
    transition="dialog-bottom-transition"
    :dir="state.dir"
    content-class="rim-overlay"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="rim" :dir="state.dir" :class="{ 'rim--rtl': state.dir === 'rtl' }">
      <MobileSheetHeader
        :title="$t('receiptItems')"
        :subtitle="itemsHeaderSubtitle"
        @back="close"
      />

      <div v-if="loading" class="rim__scroll">
        <div v-for="n in 4" :key="n" class="rim__skel-card" />
      </div>

      <div v-else-if="items.length === 0" class="rim__empty">
        <v-icon size="48" color="#94a3b8">mdi-cart-off</v-icon>
        <span>{{ $t('noReceiptItems') }}</span>
      </div>

      <template v-else>
        <div class="rim__scroll">
          <article
            v-for="(row, index) in items"
            :key="`${row.itemId}-${index}`"
            class="rim__card"
          >
            <button
              v-if="resolveRowImage(row)"
              type="button"
              class="rim__photo"
              :aria-label="$t('viewImage')"
              @click="openImage(row)"
            >
              <img :src="resolveRowImage(row)" alt="" />
            </button>
            <div v-else class="rim__photo rim__photo--empty">
              <v-icon size="22">mdi-image-off-outline</v-icon>
            </div>

            <div class="rim__body">
              <div class="rim__title-row">
                <h3>{{ itemName(row) }}</h3>
                <span class="rim__qty">×{{ row.quantity ?? '—' }}</span>
              </div>

              <div class="rim__meta">
                <div class="rim__meta-row">
                  <span>{{ $t('price') }}</span>
                  <strong dir="ltr">{{ formatUnitPrice(row) }}</strong>
                </div>
                <div v-if="Number(row.itemDiscount) > 0" class="rim__meta-row rim__meta-row--disc">
                  <span>{{ $t('discount') }}</span>
                  <strong dir="ltr">{{ formatItemDiscount(row) }}</strong>
                </div>
                <div v-if="Number(row.itemDiscount) > 0" class="rim__meta-row">
                  <span>{{ $t('priceAfterDiscount') }}</span>
                  <strong dir="ltr">{{ formatUnitPriceAfterDiscount(row) }}</strong>
                </div>
              </div>

              <div class="rim__line-total">
                <span>{{ $t('subtotal') }}</span>
                <strong dir="ltr">{{ formatLineTotal(row) }}</strong>
              </div>
            </div>
          </article>
        </div>

        <footer class="rim__footer">
          <span>{{ $t('subtotal') }}</span>
          <strong dir="ltr">{{ formatMoney(itemsSubtotal) }}</strong>
        </footer>
      </template>
    </div>

    <v-dialog v-model="imageOpen" max-width="92vw" content-class="rim-image-overlay">
      <div class="rim-image">
        <button type="button" class="rim-image__close" @click="imageOpen = false">
          <v-icon>mdi-close</v-icon>
        </button>
        <img v-if="previewImage" :src="previewImage" alt="" />
        <p v-if="previewName">{{ previewName }}</p>
      </div>
    </v-dialog>
  </v-dialog>
</template>

<script setup>
import { computed, getCurrentInstance, ref, watch } from 'vue'
import ReceiptService from '../../services/ReceiptService'
import { useState } from '../../store/state'
import MobileSheetHeader from './MobileSheetHeader.vue'
import { useMobileOverlayBack } from '../../composables/useMobileBackStack'
import { CurrencyEnum } from '../../constants/enums'
import {
  isDollarCurrency,
  uiCurrencyToEnum,
  unitPriceInReceiptCurrency
} from '../../constants/currency'

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
const receiptCurrency = ref(CurrencyEnum.DOLLAR)
const currencyRate = ref(0)
const itemsSubtotal = ref(0)
const imageOpen = ref(false)
const previewImage = ref('')
const previewName = ref('')

const isUsdReceipt = computed(() => isDollarCurrency(receiptCurrency.value))

function close() {
  emit('update:modelValue', false)
}

useMobileOverlayBack(() => props.modelValue, close)
useMobileOverlayBack(imageOpen, () => {
  imageOpen.value = false
})

const itemsHeaderSubtitle = computed(() => {
  if (loading.value) return ''
  const currency = isUsdReceipt.value
    ? (state.lang === 'ar' ? 'دولار' : 'USD')
    : (state.lang === 'ar' ? 'ل.ل.' : 'LBP')
  return `${items.value.length} ${$t('items')} · ${currency}`
})

function itemName(row) {
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
    sellingPrice: nested.sellingPrice ?? nested.sellingPriceDollar ?? raw.sellingPrice ?? raw.sellingPriceDollar,
    sellingCurrency: nested.sellingCurrency ?? raw.sellingCurrency ?? 0,
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

function resolveRowImage(row) {
  void state.itemImageVersion
  return resolveImage(row?.image) || resolveImage(state.getItemImage(row?.itemId))
}

function openImage(row) {
  const src = resolveRowImage(row)
  if (!src) return
  previewImage.value = src
  previewName.value = itemName(row)
  imageOpen.value = true
}

function formatUsd(value) {
  const num = Number(value)
  if (!num) return '—'
  const formatted = num.toFixed(2)
  return state.lang === 'ar' ? `دولار\u200E ${formatted}` : `${formatted} USD`
}

function formatLbp(value) {
  const num = Number(value)
  if (!num) return '—'
  const formatted = Math.round(num).toLocaleString('en-US')
  return state.lang === 'ar' ? `ل.ل.\u200E ${formatted}` : `${formatted} LBP`
}

function catalogUnitInReceipt(row) {
  const rate = Number(currencyRate.value) || state.exchangeRate || 1
  return unitPriceInReceiptCurrency(
    row.sellingPrice,
    row.sellingCurrency,
    receiptCurrency.value,
    rate
  )
}

function formatMoney(amountInReceiptCurrency) {
  const num = Number(amountInReceiptCurrency)
  if (!num && num !== 0) return '—'
  return isUsdReceipt.value ? formatUsd(num) : formatLbp(num)
}

function unitPriceAfterDiscount(row) {
  const unitPrice = catalogUnitInReceipt(row)
  const discount = Number(row.itemDiscount) || 0
  if (!discount) return unitPrice
  if (row.isDiscountPercent) return Math.max(0, unitPrice * (1 - discount / 100))
  return Math.max(0, unitPrice - discount)
}

function formatUnitPrice(row) {
  return formatMoney(catalogUnitInReceipt(row))
}

function formatUnitPriceAfterDiscount(row) {
  return formatMoney(unitPriceAfterDiscount(row))
}

function formatLineTotal(row) {
  return formatMoney(row.subTotal)
}

function formatItemDiscount(row) {
  const val = Number(row.itemDiscount) || 0
  if (!val) return '—'
  if (row.isDiscountPercent) return `${val}%`
  return isUsdReceipt.value ? formatUsd(val) : formatLbp(val)
}

async function loadItems() {
  if (!props.receiptId) return
  loading.value = true
  items.value = []
  try {
    const response = await ReceiptService.getReceiptItems(props.receiptId)
    const data = response?.data?.data || {}
    items.value = (data.items || []).map(normalizeItemRow)
    await state.ensureItemImages(items.value.map((row) => row.itemId))
    receiptCurrency.value =
      data.currency != null
        ? uiCurrencyToEnum(data.currency)
        : uiCurrencyToEnum(data.isReceiptDollar === false ? 'LBP' : 'USD')
    currencyRate.value = Number(data.currencyRate ?? data.dollarRate) || 0
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
.rim {
  --ink: #0d2a2e;
  --muted: #5f7a7e;
  --teal: #197783;
  --line: rgba(25, 119, 131, 0.12);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #eef5f6;
  color: var(--ink);
}

.rim--rtl {
  direction: rtl;
}

.rim__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.rim__card {
  display: flex;
  flex-direction: row;
  gap: 0.75rem;
  padding: 0.85rem;
  border-radius: 16px;
  background: #fff;
  border: 1px solid var(--line);
  box-shadow: 0 4px 14px rgba(13, 42, 46, 0.05);
}

.rim__photo {
  height: 4.75rem;
  aspect-ratio: 3 / 2;
  width: auto;
  border-radius: 12px;
  overflow: hidden;
  flex: 0 0 auto;
  align-self: center;
  border: none;
  padding: 0;
  background: #f1f5f9;
  display: grid;
  place-items: center;
  color: #94a3b8;
}

.rim__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.rim__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.rim__title-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.rim__title-row h3 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 800;
  line-height: 1.25;
  word-break: break-word;
  text-align: start;
}

.rim__qty {
  flex-shrink: 0;
  min-width: 2.2rem;
  height: 1.7rem;
  padding: 0 0.45rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(25, 119, 131, 0.1);
  color: var(--teal);
  font-size: 0.78rem;
  font-weight: 800;
}

.rim__meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.rim__meta-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.rim__meta-row span {
  color: var(--muted);
  text-align: start;
}

.rim__meta-row strong {
  font-weight: 700;
  color: var(--ink);
  text-align: end;
}

.rim__meta-row--disc strong {
  color: #dc2626;
}

.rim__line-total {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.15rem;
  padding-top: 0.45rem;
  border-top: 1px dashed rgba(25, 119, 131, 0.18);
  font-size: 0.88rem;
}

.rim__line-total span {
  color: var(--muted);
  font-weight: 650;
  text-align: start;
}

.rim__line-total strong {
  font-size: 1rem;
  font-weight: 800;
  color: var(--teal);
  text-align: end;
}

.rim__footer {
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem calc(0.85rem + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid var(--line);
  font-size: 0.95rem;
}

.rim__footer span {
  color: var(--muted);
  font-weight: 700;
  text-align: start;
}

.rim__footer strong {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--ink);
  text-align: end;
}

.rim__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  color: var(--muted);
}

.rim__skel-card {
  height: 7rem;
  border-radius: 16px;
  background: linear-gradient(90deg, #e2eef0, #f5f9fa, #e2eef0);
  background-size: 200% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}

.rim-image {
  position: relative;
  background: #fff;
  border-radius: 16px;
  padding: 1rem;
  text-align: center;
}

.rim-image__close {
  position: absolute;
  top: 0.45rem;
  inset-inline-end: 0.45rem;
  border: none;
  background: rgba(15, 23, 42, 0.55);
  color: #fff;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
}

.rim-image img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 10px;
}

.rim-image p {
  margin: 0.65rem 0 0;
  font-weight: 700;
  color: var(--ink);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>

<style>
.rim-overlay.v-overlay__content {
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
}
</style>
