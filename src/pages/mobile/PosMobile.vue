<template>
  <div class="m-pos m-page" :dir="state.dir">
    <!-- Category chips -->
    <div class="m-pos__chips" ref="categoriesContainerRef" :dir="state.dir">
      <button
        type="button"
        class="m-pos__chip"
        :class="{ 'm-pos__chip--active': cat === 'all' }"
        @click="selectCategory('all')"
      >
        <span class="m-pos__chip-name">{{ $t('allMenu') }}</span>
        <span class="m-pos__chip-count">{{ state.totalItemCount }}</span>
      </button>

      <button
        v-for="category in state.categories"
        :key="category.id"
        type="button"
        class="m-pos__chip"
        :class="{ 'm-pos__chip--active': cat === String(category.id) }"
        @click="selectCategory(String(category.id))"
      >
        <span class="m-pos__chip-name">{{ state.lang === 'ar' ? category.nameAr : category.nameEn }}</span>
        <span class="m-pos__chip-count">{{ category.itemCount }}</span>
      </button>
    </div>

    <!-- Search -->
    <div class="m-pos__search">
      <v-text-field
        v-model="search"
        :placeholder="$t('searchPlaceholder')"
        :prepend-inner-icon="state.dir === 'ltr' ? 'mdi-magnify' : undefined"
        :append-inner-icon="state.dir === 'rtl' ? 'mdi-magnify' : undefined"
        density="comfortable"
        hide-details
        variant="outlined"
        clearable
        class="m-pos__search-field"
      />
    </div>

    <!-- 2-col item grid -->
    <div class="m-pos__grid-wrap" :dir="state.dir">
      <div class="m-pos__grid" :class="{ 'm-pos__grid--rtl': state.dir === 'rtl' }">
        <HomeItemCard
          v-for="i in gridItems"
          :key="i.id"
          :item="i"
          @click="addItemToCart(i)"
        />
      </div>
      <div v-if="!search.trim()" ref="sentinelRef" class="m-pos__sentinel" aria-hidden="true" />
      <div v-if="gridItems.length === 0" class="m-pos__empty">
        {{ $t('NoItemsToShow') }}
      </div>
    </div>

    <!-- Scan + cart FABs -->
    <div v-show="!cartOpen" class="m-pos__fabs">
      <button
        type="button"
        class="m-pos__scan-fab"
        :aria-label="$t('openScanner')"
        @click="openScannerFromFab"
      >
        <span class="m-pos__scan-fab-ring" aria-hidden="true"></span>
        <v-icon size="22">mdi-barcode-scan</v-icon>
      </button>
      <button
        type="button"
        class="m-pos__fab"
        :class="{ 'm-pos__fab--empty': cartCount === 0 }"
        :aria-label="$t('cart')"
        @click="cartOpen = true"
      >
        <span class="m-pos__fab-icon-wrap">
          <v-icon size="22">mdi-cart-outline</v-icon>
          <span v-if="cartCount > 0" class="m-pos__fab-badge">{{ cartCount }}</span>
        </span>
        <span class="m-pos__fab-meta">
          <span class="m-pos__fab-label">{{ $t('cart') }}</span>
          <span class="m-pos__fab-total">{{ cartTotalLabel }}</span>
        </span>
      </button>
    </div>

    <!-- Fullscreen cart sheet -->
    <v-dialog
      v-model="cartOpen"
      fullscreen
      eager
      transition="dialog-bottom-transition"
      :dir="state.dir"
      content-class="m-pos-cart-dialog"
    >
      <div class="m-pos__cart" :dir="state.dir">
        <MobileSheetHeader
          :title="$t('cart')"
          @back="cartOpen = false"
        >
          <template #end>
            <span v-if="cartCount > 0" class="m-pos__cart-count">{{ cartCount }}</span>
            <span v-else class="m-pos__cart-end-spacer" aria-hidden="true" />
          </template>
        </MobileSheetHeader>
        <div class="m-pos__cart-body">
          <OrderItemsListMobile
            ref="orderListRef"
            :items="state.items"
            @place-order="handlePlaceOrder"
            @save-draft="handleSaveDraft"
            @cart-changed="bumpCart"
          />
        </div>
      </div>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, onActivated, inject, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useState } from '../../store/state'
import { translations } from '../../i18n/translations'
import { isDollarCurrency } from '../../constants/currency'
import ReceiptService from '../../services/ReceiptService'
import HomeItemCard from '../../components/HomeItemCard.vue'
import OrderItemsListMobile from '../../components/mobile/OrderItemsListMobile.vue'
import MobileSheetHeader from '../../components/mobile/MobileSheetHeader.vue'
import { requestCameraStream } from '../../composables/useCameraBarcode'
import { useMobileOverlayBack } from '../../composables/useMobileBackStack'
import { useInfiniteScroll } from '../../composables/useInfiniteScroll'

const state = useState()
const route = useRoute()
const router = useRouter()
const $t = (key) => translations[state.lang]?.[key] || key
const $notification = inject('$notification')

const orderListRef = ref(null)
const categoriesContainerRef = ref(null)
const sentinelRef = ref(null)
const cat = ref('all')
const search = ref('')
let searchTimer = null
const cartOpen = ref(false)
useMobileOverlayBack(cartOpen, () => {
  cartOpen.value = false
})
/** Bumps when cart mutates so FAB totals stay reactive across child expose. */
const cartTick = ref(0)

const gridItems = computed(() => {
  if (search.value.trim()) return state.searchResults
  return state.getCategoryItemsPageItems(cat.value)
})

watch(
  gridItems,
  (list) => {
    state.ensureItemImages(list)
  },
  { immediate: true }
)

useInfiniteScroll(
  sentinelRef,
  () => state.loadItemsPage({ categoryId: cat.value }),
  () => {
    const p = state.getCategoryItemsPageState(cat.value)
    return p && !p.loading && p.page + 1 < p.totalPages && !search.value.trim()
  }
)

function selectCategory(categoryId) {
  cat.value = categoryId
  search.value = ''
  state.loadItemsPage({ categoryId: cat.value, reset: true })
}

watch(search, (q) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    const query = (q || '').trim()
    if (!query) {
      state.searchItems({ query: '', categoryId: cat.value })
      return
    }
    state.searchItems({ query, categoryId: cat.value })
  }, 300)
})

const receiptProxy = computed(() => {
  cartTick.value
  return orderListRef.value?.receipt || null
})

const cartCount = computed(() => receiptProxy.value?.receiptItems?.length || 0)

const cartTotalLabel = computed(() => {
  const receipt = receiptProxy.value
  if (!receipt) return formatCartTotal(0, true)
  return formatCartTotal(Number(receipt.total) || 0, isDollarCurrency(receipt.currency))
})

function formatCartTotal(total, isDollar) {
  // total is already in receipt currency
  const displayValue = total
  let formattedValue
  let currencySymbol
  if (isDollar) {
    formattedValue = Number(displayValue).toFixed(2)
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

function bumpCart() {
  cartTick.value += 1
}

function addItemToCart(item) {
  orderListRef.value?.addItemToCart(item)
  bumpCart()
}

function openScannerFromFab() {
  const pending = requestCameraStream()
  cartOpen.value = true
  nextTick().then(() => {
    window.setTimeout(() => {
      orderListRef.value?.openScanner(pending)
    }, 280)
  })
}

const handlePlaceOrder = async (orderData) => {
  if (!orderData?.receipt) return
  const receipt = orderData.receipt
  try {
    await ReceiptService.saveReceipt(receipt)
    orderListRef.value?.clearReceipt()
    bumpCart()
    cartOpen.value = false
    if (typeof $notification === 'function') {
      $notification(isDollarCurrency(receipt.currency) ? $t('receiptSavedUsd') : $t('receiptSavedLbp'), 'success', 3000)
    }
    if (route.query.draftId) {
      router.replace({ path: '/', query: {} })
    }
  } catch (err) {
    console.error('Failed to save receipt:', err)
    if (typeof $notification === 'function') {
      $notification(err?.response?.data?.message || $t('receiptSaveFailed'), 'error', 5000)
    }
  }
}

const handleSaveDraft = async (orderData) => {
  if (!orderData?.receipt) return
  const receipt = orderData.receipt
  try {
    if (receipt.id) {
      await ReceiptService.updateDraft(receipt.id, receipt)
    } else {
      await ReceiptService.saveDraft(receipt)
    }
    orderListRef.value?.clearReceipt()
    bumpCart()
    cartOpen.value = false
    if (typeof $notification === 'function') {
      $notification($t('draftSaved'), 'success', 3000)
    }
  } catch (err) {
    console.error('Failed to save draft:', err)
    if (typeof $notification === 'function') {
      $notification(err?.response?.data?.message || $t('draftSaveFailed'), 'error', 5000)
    }
  }
}

async function loadDraftFromQuery() {
  const draftId = route.query.draftId
  if (!draftId || typeof draftId !== 'string') return
  try {
    const [detailsRes, itemsRes] = await Promise.all([
      ReceiptService.getReceiptDetails(draftId),
      ReceiptService.getReceiptItems(draftId)
    ])
    const details = detailsRes?.data?.data
    const itemsView = itemsRes?.data?.data
    if (!details || details.type === 'RECEIPT') return
    await nextTick()
    orderListRef.value?.loadDraft({
      id: draftId,
      details,
      items: itemsView?.items || []
    })
    bumpCart()
    cartOpen.value = true
  } catch (err) {
    console.error('Failed to load draft:', err)
    if (typeof $notification === 'function') {
      $notification($t('draftSaveFailed'), 'error', 5000)
    }
  }
}

async function initPosPage() {
  cat.value = 'all'
  search.value = ''
  await state.fetchDollarRate()
  if (!state.itemsCacheBootstrapped) {
    await state.bootstrapItemsCache()
  }
  const pageState = state.getCategoryItemsPageState('all')
  if (!pageState?.ids?.length) {
    await state.loadItemsPage({ categoryId: 'all', reset: true })
  }
}

function attachCategoryWheel() {
  if (!categoriesContainerRef.value) return
  const handleWheel = (e) => {
    if (categoriesContainerRef.value.scrollWidth > categoriesContainerRef.value.clientWidth) {
      e.preventDefault()
      categoriesContainerRef.value.scrollLeft += e.deltaY
    }
  }
  categoriesContainerRef.value.addEventListener('wheel', handleWheel, { passive: false })
  categoriesContainerRef.value._wheelHandler = handleWheel
}

onMounted(async () => {
  await initPosPage()
  await nextTick()
  await loadDraftFromQuery()
  attachCategoryWheel()
})

onActivated(async () => {
  await state.fetchDollarRate()
  await loadDraftFromQuery()
})

watch(
  () => route.query.draftId,
  async () => {
    await loadDraftFromQuery()
  }
)

watch(cartOpen, (open) => {
  if (!open) {
    orderListRef.value?.closeScanner()
    bumpCart()
  }
})

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
  if (categoriesContainerRef.value?._wheelHandler) {
    categoriesContainerRef.value.removeEventListener('wheel', categoriesContainerRef.value._wheelHandler)
  }
})
</script>

<style scoped>
.m-pos {
  --oil-ink: #0d2a2e;
  --oil-muted: #5f7a7e;
  --oil-line: rgba(25, 119, 131, 0.16);
  --oil-teal: #197783;
  --oil-teal-bright: #2ad4e8;
  --oil-surface: #ffffff;
  position: relative;
  min-height: 100%;
  padding-bottom: calc(5.5rem + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.m-pos__chips {
  display: flex;
  gap: 0.55rem;
  padding: 0.15rem 0 0.85rem;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x proximity;
}

.m-pos__chips::-webkit-scrollbar {
  display: none;
}

.m-pos__chip {
  flex-shrink: 0;
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.48rem 0.7rem 0.48rem 0.85rem;
  border: 1px solid var(--oil-line);
  border-radius: 999px;
  background: var(--oil-surface);
  color: var(--oil-ink);
  cursor: pointer;
  scroll-snap-align: start;
  box-shadow: 0 4px 12px rgba(13, 42, 46, 0.04);
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
  min-height: 2.45rem;
}

.m-pos__chip--active {
  border-color: rgba(25, 119, 131, 0.4);
  background: linear-gradient(135deg, rgba(25, 119, 131, 0.12), rgba(42, 212, 232, 0.14));
  box-shadow: 0 6px 14px rgba(25, 119, 131, 0.14);
}

.m-pos__chip-name {
  font-size: 0.86rem;
  font-weight: 750;
  white-space: nowrap;
  color: inherit;
}

.m-pos__chip--active .m-pos__chip-name {
  color: var(--oil-teal);
}

.m-pos__chip-count {
  font-size: 0.64rem;
  font-weight: 800;
  color: var(--oil-muted);
  white-space: nowrap;
  min-width: 1.35rem;
  height: 1.35rem;
  padding: 0 0.4rem;
  border-radius: 999px;
  background: rgba(25, 119, 131, 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.m-pos__chip--active .m-pos__chip-count {
  color: #fff;
  background: var(--oil-teal);
  opacity: 1;
}

.m-pos__search {
  margin-bottom: 0.85rem;
}

.m-pos__search-field :deep(.v-field) {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
}

.m-pos__search-field :deep(.v-field__outline) {
  --v-field-border-opacity: 0.35;
}

.m-pos__search-field :deep(.v-field__input) {
  min-height: 2.6rem;
  font-size: 0.95rem;
  color: var(--oil-ink);
}

.m-pos__search-field :deep(.v-field__prepend-inner .v-icon),
.m-pos__search-field :deep(.v-field__append-inner .v-icon) {
  color: var(--oil-teal);
}

.m-pos__grid-wrap {
  min-height: 40vh;
}

.m-pos__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  align-content: start;
}

.m-pos__grid--rtl {
  direction: rtl;
}

.m-pos__sentinel {
  height: 1px;
  width: 100%;
  pointer-events: none;
}

.m-pos__empty {
  margin-top: 2rem;
  text-align: center;
  color: var(--oil-muted);
  font-weight: 600;
}

/* FAB — fixed above tab bar; layout already pads main scroll */
.m-pos__fabs {
  position: fixed;
  z-index: 20;
  inset-inline-end: 1rem;
  bottom: calc(5.1rem + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.m-pos[dir="rtl"] .m-pos__fabs {
  flex-direction: row-reverse;
}

.m-pos__scan-fab {
  position: relative;
  width: 3.25rem;
  height: 3.25rem;
  flex-shrink: 0;
  border: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(145deg, #0f5a63, #197783 40%, #2ad4e8);
  box-shadow: 0 10px 24px rgba(25, 119, 131, 0.32);
  cursor: pointer;
}

.m-pos__scan-fab-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px dashed rgba(255, 255, 255, 0.45);
  animation: m-pos-scan-spin 9s linear infinite;
  pointer-events: none;
}

.m-pos__fab {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  min-height: 3.25rem;
  padding-block: 0.55rem;
  padding-inline: 0.75rem 1rem;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #0f5a63, #197783 45%, #2ad4e8);
  color: #fff;
  box-shadow: 0 10px 28px rgba(25, 119, 131, 0.35);
  cursor: pointer;
  max-width: calc(100vw - 2rem);
}

.m-pos__fab--empty {
  opacity: 0.92;
}

.m-pos__fab-icon-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  flex-shrink: 0;
}

.m-pos__fab-badge {
  position: absolute;
  top: -0.25rem;
  inset-inline-end: -0.3rem;
  min-width: 1.15rem;
  height: 1.15rem;
  padding: 0 0.28rem;
  border-radius: 999px;
  background: #fff;
  color: #197783;
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 1.15rem;
  text-align: center;
  box-shadow: 0 2px 6px rgba(13, 42, 46, 0.18);
}

.m-pos__fab-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.05rem;
  min-width: 0;
  text-align: start;
}

.m-pos__fab-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.9;
  line-height: 1;
}

.m-pos__fab-total {
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 9.5rem;
}

.m-pos__cart {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, #eaf5f6 0%, #f5f9fa 45%, #eef4f5 100%);
  color: var(--oil-ink);
}

.m-pos__cart-count {
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.4rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #197783, #2ad4e8);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.m-pos__cart-end-spacer {
  width: 1.5rem;
  height: 1.5rem;
}

.m-pos__cart-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.m-pos__cart-body :deep(.moil) {
  height: 100%;
  max-height: none;
}

@keyframes m-pos-scan-spin {
  to { transform: rotate(360deg); }
}
</style>

<style>
.m-pos-cart-dialog.v-overlay__content,
.v-overlay__content.m-pos-cart-dialog {
  padding: 0 !important;
}
</style>
