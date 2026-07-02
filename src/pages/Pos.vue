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
          <div class="items-grid" :class="{ 'sidebar-on': state.sidebar, 'sidebar-off': !state.sidebar }">
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
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, onActivated, inject } from 'vue'
import { useState } from '../store/state'
import { translations } from '../i18n/translations'
import CategoryService from '../services/CategoryService'
import ReceiptService from '../services/ReceiptService'
import HomeItemCard from '../components/HomeItemCard.vue'
import OrderItemsList from '../components/OrderItemsList.vue'
import TopBar from '../components/TopBar.vue'

const state = useState()
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
  try {
    await ReceiptService.saveReceipt(orderData.receipt)
    orderListRef.value?.clearReceipt()
    if (typeof $notification === 'function') {
      $notification(orderData.receipt.isReceiptDollar ? $t('receiptSavedUsd') : $t('receiptSavedLbp'), 'success', 3000)
    }
  } catch (err) {
    console.error('Failed to save receipt:', err)
    if (typeof $notification === 'function') {
      $notification(err?.response?.data?.message || $t('receiptSaveFailed'), 'error', 5000)
    }
  }
}

// Enable horizontal scrolling with mouse wheel on categories container
onMounted(async () => {
  await state.fetchDollarRate()
  await state.fetchUserItems()
  await loadCategories()
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
  await state.fetchUserItems()
  await loadCategories()
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
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  background: #fafafa;
}

.right-panel {
  width: 40%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f9f9f9;
}

.panel-content {
  padding: 0.2rem;
  height: 100%;
  position: relative;
}

/* Categories selector styling */
.categories-container {
  display: flex;
  gap: 0.75rem;
  padding: 0.45rem 0;
  margin-bottom: 0.2rem;
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
  padding: 0.5rem 1.5rem;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s, color 0.2s;
  min-width: fit-content;
  box-sizing: border-box;
  height: fit-content;
  align-self: flex-start;
}

.category-item:hover:not(.active) {
  background: #f5f5f5;
  border-color: #80deea;
}

.category-item.active {
  border-color: #00bcd4;
  background: white;
}

.category-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  width: 100%;
}

.category-name {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
}

.category-item.active .category-name {
  color: #00bcd4;
}

.category-count {
  font-size: 0.75rem;
  padding: 0;
  color: #666;
  white-space: nowrap;
}

.search-wrapper {
  margin: 0 auto 0.1rem auto;
  border-radius: 2rem;
  border: 2px solid rgba(0, 0, 0, 0.12);
  background: white;
  padding: 0.25rem 0.5rem;
  transition: border-color 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.search-wrapper:focus-within {
  border-color: #00bcd4;
}

.search-field {
  margin: 0;
}

.search-field :deep(.v-field) {
  border-radius: 0;
  box-shadow: none;
}

.search-field :deep(.v-field__outline) {
  opacity: 0;
}

.search-field :deep(.v-field__outline__start),
.search-field :deep(.v-field__outline__end) {
  opacity: 0;
}

.search-field :deep(.v-field__input) {
  min-height: 34px;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 0.875rem;
}

.search-field :deep(.v-field__prepend-inner) {
  padding-top: 0;
  padding-bottom: 0;
  align-self: center;
}

.search-field :deep(.v-field__append-inner) {
  padding-top: 0;
  padding-bottom: 0;
  align-self: center;
}

.search-field :deep(.v-field__prepend-inner .v-icon) {
  background-color: #f5f5f5;
  border-radius: 50%;
  padding: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-field :deep(.v-field__append-inner .v-icon) {
  background-color: #f5f5f5;
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
}

.items-wrapper {
  height: calc(100% - 8rem);
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.items-wrapper::-webkit-scrollbar {
  display: none; /* Chrome, Safari and Opera */
}

.items-grid {
  display: grid;
  gap: 0.5rem;
  padding: 0.5rem;
  align-content: start;
  margin-bottom: 2.5rem;
}

/* Arabic/RTL: item cards start from right to left */
.items-grid.items-grid-rtl {
  direction: rtl;
}

.items-grid.sidebar-on {
  grid-template-columns: repeat(3, 1fr);
}

.items-grid.sidebar-off {
  grid-template-columns: repeat(4, 1fr);
}

/* Large screens (e.g., ~75" displays) */
@media (min-width: 1700px) {
  .items-grid.sidebar-on {
    grid-template-columns: repeat(4, 1fr);
  }

  .items-grid.sidebar-off {
    grid-template-columns: repeat(5, 1fr);
  }
}

/* Extra large screens (e.g., ~100" displays) */
@media (min-width: 2200px) {
  .items-grid.sidebar-on {
    grid-template-columns: repeat(5, 1fr);
  }

  .items-grid.sidebar-off {
    grid-template-columns: repeat(6, 1fr);
  }
}

.page-background {
  background-color: #f5f5f5;
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

[dir="rtl"] :deep(.v-field__input),
[dir="rtl"] :deep(input),
[dir="rtl"] :deep(textarea) {
  direction: rtl;
  text-align: right;
}

[dir="rtl"] .search-field :deep(input::placeholder) {
  text-align: right;
}

[dir="ltr"] :deep(.v-field__input),
[dir="ltr"] :deep(input),
[dir="ltr"] :deep(textarea) {
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
  border-left: 1px solid rgba(0, 0, 0, 0.12);
}

[dir="rtl"] .right-panel {
  border-left: none;
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}

[dir="rtl"] .split-container {
  flex-direction: row-reverse;
}

[dir="rtl"] .items-grid {
  direction: rtl;
}
</style>
