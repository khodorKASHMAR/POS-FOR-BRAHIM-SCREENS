<template>
  <div class="split-container page-background">
    <!-- Left Panel: Items Selection -->
    <div class="left-panel">
      <!-- Top Bar -->
      <TopBar />
      
      <div class="panel-content">
        <!-- Categories Selector: dir sets flow so "All" is first (left in LTR, right in RTL) -->
        <div class="categories-container" ref="categoriesContainerRef">
          <!-- Static "All" category -->
          <div 
            class="category-item"
            :class="{ 'active': cat === 'All' }"
            @click="cat = 'All'"
          >
            <div class="category-content">
              <div class="category-name">{{ $t('allMenu') }}</div>
              <div class="category-count">{{ getCategoryItemCount('All') }} {{ $t('items') }}</div>
            </div>
          </div>
          <!-- Other categories -->
          <div 
            v-for="category in otherCategories" 
            :key="category.value"
            class="category-item"
            :class="{ 'active': cat === category.value }"
            @click="cat = category.value"
          >
            <div class="category-content">
              <div class="category-name">{{ state.lang === 'ar' ? category.nameAr : category.nameEn }}</div>
              <div class="category-count">{{ getCategoryItemCount(category.value) }} {{ $t('items') }}</div>
            </div>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="search-wrapper">
          <v-text-field
            v-model="search"
            :placeholder="$t('searchPlaceholder')"
            :prepend-inner-icon="state.dir === 'ltr' ? 'mdi-magnify' : null"
            :append-inner-icon="state.dir === 'rtl' ? 'mdi-magnify' : null"
            density="compact"
            hide-details
            variant="outlined"
            class="search-field"
          />
        </div>

        <!-- Items Grid -->
        <div class="items-wrapper">
          <div class="items-grid" :class="{ 'items-grid-rtl': state.dir === 'rtl' }">
            <HomeItemCard
              v-for="i in filtered"
              :key="i.id"
              :item="i"
              @click="addItemToCart(i)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Right Panel: Order Items -->
    <div class="right-panel">
      <OrderItemsList
        ref="orderListRef"
        :items="items"
        @place-order="handlePlaceOrder"
        @save-draft="handleSaveDraft"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, onActivated, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useState } from '../store/state'
import { translations } from '../i18n/translations'
import CategoryService from '../services/CategoryService'
import ReceiptService from '../services/ReceiptService'
import HomeItemCard from '../components/HomeItemCard.vue'
import OrderItemsList from '../components/OrderItemsList.vue'
import TopBar from '../components/TopBar.vue'

const state = useState()
const route = useRoute()
const router = useRouter()
const $t = (key) => translations[state.lang]?.[key] || key
const orderListRef = ref(null)
const cat = ref('All')
const search = ref('')
const categoriesContainerRef = ref(null)
const categories = ref([])
const categoriesLoading = ref(false)

const items = computed(() => state.items)

const getCategoryKey = (item) => {
  if (state.lang === 'ar') {
    return item.categoryNameAr
  }
  return item.categoryNameEn
}

const loadCategories = async () => {
  if (categoriesLoading.value) return
  categoriesLoading.value = true
  try {
    const response = await CategoryService.getAllCategories()
    const data = response?.data?.data || []
    categories.value = data.map(cat => ({
      id: cat.id,
      value: state.lang === 'ar' ? cat.nameAr : cat.nameEn,
      nameAr: cat.nameAr || '',
      nameEn: cat.nameEn || ''
    }))
    // Same order in both directions; "All" stays first via container dir (row-reverse in RTL)
  } catch (error) {
    console.error('Error loading categories:', error)
  } finally {
    categoriesLoading.value = false
  }
}

const otherCategories = computed(() => {
  return categories.value
})

const name = i => state.lang==='ar'?i.nameAr:i.nameEn
const price = i => state.currency==='USD'?i.usd:i.lb

const getCategoryItemCount = (categoryValue) => {
  if (categoryValue === 'All') return items.value.length
  return items.value.filter(i => getCategoryKey(i) === categoryValue).length
}

const filtered = computed(()=> items.value.filter(i=>{
  const n = name(i).toLowerCase()
  return (cat.value==='All'||getCategoryKey(i)===cat.value) && n.includes(search.value.toLowerCase())
}))

function addItemToCart(item) {
  orderListRef.value?.addItemToCart(item)
}

const $notification = inject('$notification')

const handlePlaceOrder = async (orderData) => {
  if (!orderData?.receipt) return
  const receipt = orderData.receipt
  try {
    await ReceiptService.saveReceipt(receipt)
    orderListRef.value?.clearReceipt()
    await state.fetchUserItems({ force: true })
    if (typeof $notification === 'function') {
      $notification(receipt.isReceiptDollar ? $t('receiptSavedUsd') : $t('receiptSavedLbp'), 'success', 3000)
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
    orderListRef.value?.loadDraft({
      id: draftId,
      details,
      items: itemsView?.items || []
    })
  } catch (err) {
    console.error('Failed to load draft:', err)
    if (typeof $notification === 'function') {
      $notification($t('draftSaveFailed'), 'error', 5000)
    }
  }
}

// Enable horizontal scrolling with mouse wheel on categories container
onMounted(async () => {
  await state.fetchDollarRate()
  await state.fetchUserItems({ force: true })
  await loadCategories()
  await loadDraftFromQuery()
  // Set initial document direction
  document.documentElement.setAttribute('dir', state.dir)
  
  if (categoriesContainerRef.value) {
    const handleWheel = (e) => {
      // Only scroll horizontally if there's horizontal overflow
      if (categoriesContainerRef.value.scrollWidth > categoriesContainerRef.value.clientWidth) {
        e.preventDefault()
        categoriesContainerRef.value.scrollLeft += e.deltaY
      }
    }
    
    categoriesContainerRef.value.addEventListener('wheel', handleWheel, { passive: false })
    
    // Store the handler for cleanup
    categoriesContainerRef.value._wheelHandler = handleWheel
  }
})

onActivated(async () => {
  await state.fetchDollarRate()
  await state.fetchUserItems({ force: true })
  await loadCategories()
  await loadDraftFromQuery()
})

watch(() => route.query.draftId, async () => {
  await loadDraftFromQuery()
})

// Watch for language changes to update document direction and reload categories
watch(() => state.lang, async () => {
  document.documentElement.setAttribute('dir', state.dir)
  await loadCategories()
})

onUnmounted(() => {
  if (categoriesContainerRef.value && categoriesContainerRef.value._wheelHandler) {
    categoriesContainerRef.value.removeEventListener('wheel', categoriesContainerRef.value._wheelHandler)
  }
})
</script>

<style scoped>
.split-container {
  --oil-ink: #16363a;
  --oil-muted: #5f7a7e;
  --oil-line: rgba(25, 119, 131, 0.16);
  --oil-teal: #197783;
  --oil-teal-bright: #20b4c6;
  --oil-surface: #ffffff;
  --oil-panel: linear-gradient(180deg, #eaf5f6 0%, #f5f9fa 45%, #eef4f5 100%);
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

.left-panel {
  width: 60%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--oil-line);
  background: var(--oil-panel);
  position: relative;
}

.left-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 60% 34% at 0% 0%, rgba(50, 216, 238, 0.1), transparent 55%),
    radial-gradient(ellipse 45% 28% at 100% 100%, rgba(25, 119, 131, 0.07), transparent 50%);
  z-index: 0;
}

.left-panel > * {
  position: relative;
  z-index: 1;
}

.right-panel {
  width: 40%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
}

.panel-content {
  padding: 0.35rem 0.55rem 0.55rem;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.categories-container {
  display: flex;
  gap: 0.65rem;
  padding: 0.45rem 0.15rem;
  margin-bottom: 0.45rem;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-behavior: smooth;
  position: relative;
  flex-wrap: nowrap;
  align-items: flex-start;
  flex-shrink: 0;
}

.categories-container::-webkit-scrollbar {
  display: none;
}

.category-item {
  flex-shrink: 0;
  padding: 0.55rem 1.25rem;
  border: 1px solid rgba(25, 119, 131, 0.1);
  border-radius: 14px;
  background: var(--oil-surface);
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.18s ease;
  min-width: fit-content;
  box-sizing: border-box;
  height: fit-content;
  align-self: flex-start;
  box-shadow: 0 4px 12px rgba(22, 54, 58, 0.04);
}

.category-item:hover:not(.active) {
  background: #f2f9fa;
  border-color: rgba(32, 180, 198, 0.4);
  transform: translateY(-1px);
}

.category-item.active {
  border-color: rgba(25, 119, 131, 0.35);
  background: linear-gradient(135deg, rgba(25, 119, 131, 0.1), rgba(32, 180, 198, 0.12));
  box-shadow: 0 6px 14px rgba(25, 119, 131, 0.12);
}

.category-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  width: 100%;
}

.category-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--oil-ink);
  white-space: nowrap;
}

.category-item.active .category-name {
  color: var(--oil-teal);
}

.category-count {
  font-size: 0.72rem;
  padding: 0;
  color: var(--oil-muted);
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.category-item.active .category-count {
  color: var(--oil-teal);
  opacity: 0.85;
}

.search-wrapper {
  margin: 0 0.15rem 0.55rem;
  border-radius: 999px;
  border: 1px solid var(--oil-line);
  background: rgba(255, 255, 255, 0.95);
  padding: 0.2rem 0.55rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 4px 12px rgba(22, 54, 58, 0.05);
  flex-shrink: 0;
}

.search-wrapper:focus-within {
  border-color: var(--oil-teal-bright);
  box-shadow: 0 0 0 3px rgba(32, 180, 198, 0.16);
}

.search-field {
  margin: 0;
}

.search-field :deep(.v-field) {
  border-radius: 0;
  box-shadow: none;
  background: transparent;
}

.search-field :deep(.v-field__outline) {
  opacity: 0;
}

.search-field :deep(.v-field__outline__start),
.search-field :deep(.v-field__outline__end) {
  opacity: 0;
}

.search-field :deep(.v-field__input) {
  min-height: 36px;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 0.875rem;
  color: var(--oil-ink);
}

.search-field :deep(.v-field__prepend-inner),
.search-field :deep(.v-field__append-inner) {
  padding-top: 0;
  padding-bottom: 0;
  align-self: center;
}

.search-field :deep(.v-field__prepend-inner .v-icon),
.search-field :deep(.v-field__append-inner .v-icon) {
  background: linear-gradient(145deg, #eef6f7, #e2f2f4);
  color: var(--oil-teal);
  border-radius: 50%;
  padding: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-field :deep(.v-label) {
  font-size: 0.875rem;
  color: var(--oil-muted);
}

.items-wrapper {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.35);
  border: 1px solid rgba(25, 119, 131, 0.08);
}

.items-wrapper::-webkit-scrollbar {
  display: none;
}

.items-grid {
  display: grid;
  gap: 0.55rem;
  padding: 0.55rem;
  align-content: start;
  margin-bottom: 1.5rem;
  grid-template-columns: repeat(5, 1fr);
}

.items-grid.items-grid-rtl {
  direction: rtl;
}

@media (min-width: 1700px) {
  .items-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

@media (min-width: 2200px) {
  .items-grid {
    grid-template-columns: repeat(7, 1fr);
  }
}

.page-background {
  background: var(--oil-panel);
  min-height: 100vh;
}

/* RTL Support: "All" stays first in reading order (right side in Arabic) */
[dir="rtl"] .categories-container,
.categories-container[dir="rtl"] {
  flex-direction: row-reverse;
}

[dir="rtl"] .category-content {
  align-items: center;
}

[dir="rtl"] .search-field :deep(.v-field__append-inner) {
  padding-right: 12px;
  padding-left: 0;
}

[dir="rtl"] .split-container :deep(.v-field__input),
[dir="rtl"] .split-container :deep(input),
[dir="rtl"] .split-container :deep(textarea) {
  direction: rtl;
  text-align: right;
}

[dir="rtl"] .search-field :deep(input::placeholder) {
  text-align: right;
}

[dir="ltr"] .split-container :deep(.v-field__input),
[dir="ltr"] .split-container :deep(input),
[dir="ltr"] .split-container :deep(textarea) {
  direction: ltr;
  text-align: left;
}

[dir="rtl"] .search-field :deep(.v-label) {
  right: 12px;
  left: auto;
  transform-origin: top right;
}

[dir="ltr"] .search-field :deep(.v-label) {
  left: 12px;
  right: auto;
  transform-origin: top left;
}

[dir="rtl"] .panel-header {
  text-align: right;
}

[dir="rtl"] .panel-content {
  text-align: right;
}

[dir="rtl"] .left-panel {
  border-right: none;
  border-left: 1px solid var(--oil-line);
}

[dir="rtl"] .right-panel {
  border-left: none;
  border-right: 1px solid var(--oil-line);
}

[dir="rtl"] .split-container {
  flex-direction: row-reverse;
}

[dir="rtl"] .items-grid {
  direction: rtl;
}
</style>
