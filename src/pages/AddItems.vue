<template>
  <div class="page-background">
    <TopBar />
    <div class="p-4">
      <div class="add-items-header" :class="lang.dir === 'rtl' ? 'add-items-header-rtl' : ''">
        <h1 class="add-items-title">{{ $t('addItems') }}</h1>
        <div class="add-items-actions" :class="lang.dir === 'rtl' ? 'add-items-actions-rtl' : ''">
          <v-btn
            class="add-items-action-btn"
            variant="flat"
            :prepend-icon="lang.dir === 'ltr' ? 'mdi-plus' : null"
            :append-icon="lang.dir === 'rtl' ? 'mdi-plus' : null"
            @click="openCategoryDialog(null)"
          >
            {{ $t('addCategory') }}
          </v-btn>
          <v-btn
            class="add-items-action-btn"
            variant="flat"
            :prepend-icon="lang.dir === 'ltr' ? 'mdi-plus' : null"
            :append-icon="lang.dir === 'rtl' ? 'mdi-plus' : null"
            @click="openItemDialog()"
          >
            {{ $t('addItem') }}
          </v-btn>
        </div>
      </div>

      <div class="panel-content">
      <!-- Categories Selector: dir sets flow so "All" is first (left in LTR, right in RTL) -->
      <div class="categories-container" ref="categoriesContainerRef">
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
        <div
          v-for="category in otherCategories"
          :key="category.value"
          class="category-item category-item-with-actions"
          :class="[
            { 'active': cat === category.value },
            lang.dir === 'rtl' ? 'category-card-rtl' : 'category-card-ltr'
          ]"
          @click="cat = category.value"
        >
          <div class="category-card-grid">
            <div class="category-name-cell">
              <span class="category-name">{{ lang.lang === 'ar' ? category.nameAr : category.nameEn }}</span>
            </div>
            <div class="category-edit-cell" @click.stop>
              <!-- TODO: refactor tooltip -->
              <div class="group action-tooltip-wrapper">
                <button
                  type="button"
                  class="action-btn edit-btn category-action-btn"
                  :title="$t('editCategory')"
                  @click="handleEditCategory(category)"
                >
                  <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <!-- <div class="action-tooltip">{{ $t('editCategory') }}</div> -->
              </div>
            </div>
            <div class="category-count-cell">
              <span class="category-count">{{ getCategoryItemCount(category.value) }} {{ $t('items') }}</span>
            </div>
            <div class="category-delete-cell" @click.stop>
              <!-- TODO: refactor tooltip -->
              <div class="group action-tooltip-wrapper action-tooltip-above">
                <button
                  type="button"
                  class="action-btn delete-btn category-action-btn"
                  :title="$t('delete')"
                  @click="handleDeleteCategory(category)"
                >
                  <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <!-- <div class="action-tooltip">{{ $t('delete') }}</div> -->
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="search-wrapper">
        <v-text-field
          v-model="search"
          :placeholder="$t('searchPlaceholder')"
          :prepend-inner-icon="lang.dir === 'ltr' ? 'mdi-magnify' : null"
          :append-inner-icon="lang.dir === 'rtl' ? 'mdi-magnify' : null"
          density="compact"
          hide-details
          variant="outlined"
          class="search-field"
        />
      </div>

      <!-- Items Grid -->
      <div class="items-wrapper" :dir="lang.dir">
        <div class="items-grid" :class="{ 'sidebar-on': lang.sidebar, 'sidebar-off': !lang.sidebar, 'items-grid-rtl': lang.dir === 'rtl' }">
          <HomeItemCard
            v-for="i in filtered"
            :key="i.id"
            :item="i"
            :clickable="false"
            :show-actions="true"
            @edit="handleEditItem(i)"
            @delete="handleDeleteItem(i)"
          />
        </div>
      </div>
    </div>

    <!-- Category Dialog -->
    <v-dialog v-model="categoryDialog" content-class="add-items-dialog-responsive add-items-dialog-category" :dir="lang.dir">
      <v-form ref="categoryFormRef" @submit.prevent="saveCategory">
      <div class="add-items-dialog category-dialog-card">
        <div class="category-dialog-title" :class="{ 'text-right': lang.dir === 'rtl' }">
          {{ editingCategory ? $t('editCategory') : $t('addCategory') }}
        </div>
        <div class="category-dialog-body">
          <div class="dialog-field-group">
            <div class="dialog-label" :class="{ 'dialog-label-rtl': lang.dir === 'rtl' }">
              <span>{{ $t('nameAr') }}</span>
              <span class="dialog-label-required">*</span>
            </div>
            <v-text-field
              v-model="categoryForm.nameAr"
              persistent-placeholder
              :placeholder="$t('placeholderNameAr')"
              variant="outlined"
              density="compact"
              :rules="[requiredRule]"
              class="mb-1 dialog-field"
            />
          </div>
          <div class="dialog-field-group">
            <div class="dialog-label" :class="{ 'dialog-label-rtl': lang.dir === 'rtl' }">
              <span>{{ $t('nameEn') }}</span>
              <span class="dialog-label-required">*</span>
            </div>
            <v-text-field
              v-model="categoryForm.nameEn"
              persistent-placeholder
              :placeholder="$t('placeholderNameEn')"
              variant="outlined"
              density="compact"
              :rules="[requiredRule]" 
              class="mb-1 dialog-field"
            />
          </div>
        </div>
        <div class="dialog-actions mt-0" :class="lang.dir === 'rtl' ? 'dialog-actions-rtl' : ''">
          <button type="button" class="dialog-action-btn dialog-cancel-btn mb-1" @click.stop="closeCategoryDialog">
            {{ $t('cancel') }}
          </button>
          <button type="button" class="dialog-action-btn dialog-save-btn mb-1" @click.stop="saveCategory">
            {{ editingCategory ? $t('update') : $t('save') }}
          </button>
        </div>
      </div>
      </v-form>
    </v-dialog>

    <!-- Item Dialog -->
    <v-dialog v-model="itemDialog" content-class="add-items-dialog-responsive add-items-dialog-item" :dir="lang.dir">
      <v-form ref="itemFormRef" @submit.prevent="saveItem">
      <div class="add-items-dialog item-dialog-card">
        <div class="item-dialog-title" :class="{ 'text-right': lang.dir === 'rtl' }">
          {{ editingItem ? $t('editItem') : $t('addItem') }}
        </div>
        <div class="item-dialog-body">
          <!-- Row 1: Names -->
          <v-row class="item-dialog-row" :class="lang.dir === 'rtl' ? 'flex-row-reverse' : ''">
            <v-col cols="12" sm="6">
              <div class="dialog-field-group">
                <div class="dialog-label" :class="{ 'dialog-label-rtl': lang.dir === 'rtl' }">
                  <span>{{ $t('nameAr') }}</span>
                  <span class="dialog-label-required">*</span>
                </div>
                <v-text-field
                  v-model="itemForm.nameAr"
                  persistent-placeholder
                  :placeholder="$t('placeholderNameAr')"
                  variant="outlined"
                  density="compact"
                  :rules="[requiredRule]"
                  class="dialog-field"
                />
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="dialog-field-group">
                <div class="dialog-label" :class="{ 'dialog-label-rtl': lang.dir === 'rtl' }">
                  <span>{{ $t('nameEn') }}</span>
                  <span class="dialog-label-required">*</span>
                </div>
                <v-text-field
                  v-model="itemForm.nameEn"
                  persistent-placeholder
                  :placeholder="$t('placeholderNameEn')"
                  variant="outlined"
                  density="compact"
                  :rules="[requiredRule]"
                  class="dialog-field"
                />
              </div>
            </v-col>
          </v-row>
          <!-- Row 2: Category + Buying dollar rate -->
          <v-row class="item-dialog-row" :class="lang.dir === 'rtl' ? 'flex-row-reverse' : ''">
            <v-col cols="12" sm="6">
              <div class="dialog-field-group">
                <div class="dialog-label" :class="{ 'dialog-label-rtl': lang.dir === 'rtl' }">
                  <span>{{ $t('category') }}</span>
                  <span class="dialog-label-required">*</span>
                </div>
                <PosAutocomplete
                  v-model="itemForm.categoryId"
                  :placeholder="$t('searchCategory')"
                  :items="categorySelectOptions"
                  item-title="name"
                  item-value="id"
                  :loading="categorySelectLoading"
                  :disabled="!!selectedCategory"
                  :required="true"
                  :hide-details="false"
                  :error-message="categorySelectError"
                  :no-data-text="$t('noAutocompleteResults')"
                  clearable
                  class="dialog-field"
                  @update:search="onCategorySelectSearch"
                />
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="dialog-field-group">
                <div class="dialog-label" :class="{ 'dialog-label-rtl': lang.dir === 'rtl' }">
                  <span>{{ $t('buyingDollarRate') }}</span>
                  <span class="dialog-label-required">*</span>
                </div>
                <v-text-field
                  v-model.number="itemForm.buyingDollarRate"
                  type="number"
                  persistent-placeholder
                  :placeholder="$t('placeholderBuyingDollarRate')"
                  variant="outlined"
                  density="compact"
                  :rules="[requiredRule]"
                  class="dialog-field price-field-no-arrows"
                />
              </div>
            </v-col>
          </v-row>
          <!-- Row 3: Barcode -->
          <v-row class="item-dialog-row" :class="lang.dir === 'rtl' ? 'flex-row-reverse' : ''">
            <v-col cols="12" sm="10">
              <div class="dialog-field-group">
                <div class="dialog-label" :class="{ 'dialog-label-rtl': lang.dir === 'rtl' }">
                  <span>{{ $t('barcode') }}</span>
                </div>
                <v-text-field
                  v-model="itemForm.barcode"
                  persistent-placeholder
                  :placeholder="$t('placeholderBarcode')"
                  variant="outlined"
                  density="compact"
                  :rules="[requiredRule]"
                  :disabled="barcodeFieldDisabled"
                  class="dialog-field"
                />
              </div>
            </v-col>
            <v-col cols="12" sm="2" class="d-flex align-center barcode-icons-container" :class="lang.dir === 'rtl' ? 'barcode-icons-rtl' : 'barcode-icons-ltr'">
              <div class="group action-tooltip-wrapper">
                <button type="button" class="action-btn">
                  <v-icon size="small" class="action-icon">mdi-qrcode</v-icon>
                </button>
                <div class="action-tooltip">{{ $t('scanQr') }}</div>
              </div>
              <div class="group action-tooltip-wrapper">
                <button type="button" class="action-btn">
                  <v-icon size="small" class="action-icon">mdi-barcode-scan</v-icon>
                </button>
                <div class="action-tooltip">{{ $t('scanBarcode') }}</div>
              </div>
              <div class="group action-tooltip-wrapper">
                <button type="button" class="action-btn" @click="handleGenerateBarcode">
                  <v-icon size="small" class="action-icon">mdi-barcode</v-icon>
                </button>
                <div class="action-tooltip">{{ $t('generateBarcode') }}</div>
              </div>
            </v-col>
          </v-row>
          <!-- Row 4: Prices (Buying + $/LBP, Selling + $/LBP) -->
          <v-row class="item-dialog-row price-row" align="center" :class="lang.dir === 'rtl' ? 'flex-row-reverse' : ''">
            <v-col cols="12" sm="5" class="price-field-col">
              <div class="dialog-field-group price-field-group">
                <div class="dialog-label" :class="{ 'dialog-label-rtl': lang.dir === 'rtl' }">
                  <span>{{ $t('buyingPrice') }}</span>
                  <span class="dialog-label-required">*</span>
                </div>
                <div class="price-input-wrapper">
                  <input
                    :value="getBuyingPriceDisplayValue()"
                    type="number"
                    :step="itemForm.buyingPriceUnit === 'USD' ? 0.01 : 1"
                    :placeholder="$t('placeholderBuyingPrice')"
                    :class="['price-input-field', { 'price-input-error': buyingPriceError }]"
                    @input="onBuyingPriceInput($event.target.value)"
                    @blur="validateBuyingPrice"
                    min="0"
                  />
                  <div v-if="buyingPriceError" class="price-input-error-message">
                    {{ $t('priceMustBeGreaterThanZero') }}
                  </div>
                </div>
              </div>
            </v-col>
            <v-col cols="12" sm="1" class="price-btn-col d-flex align-end">
              <button type="button" class="price-unit-btn" @click="toggleBuyingPriceUnit">
                {{ itemForm.buyingPriceUnit === 'USD' ? '$' : 'LBP' }}
              </button>
            </v-col>
            <v-col cols="12" sm="5" class="price-field-col">
              <div class="dialog-field-group price-field-group">
                <div class="dialog-label" :class="{ 'dialog-label-rtl': lang.dir === 'rtl' }">
                  <span>{{ $t('sellingPrice') }}</span>
                  <span class="dialog-label-required">*</span>
                </div>
                <div class="price-input-wrapper">
                  <input
                    :value="getSellingPriceDisplayValue()"
                    type="number"
                    :step="itemForm.sellingPriceUnit === 'USD' ? 0.01 : 1"
                    :placeholder="$t('placeholderSellingPrice')"
                    :class="['price-input-field', { 'price-input-error': sellingPriceError }]"
                    @input="onSellingPriceInput($event.target.value)"
                    @blur="validateSellingPrice"
                    min="0"
                  />
                  <div v-if="sellingPriceError" class="price-input-error-message">
                    {{ $t('priceMustBeGreaterThanZero') }}
                  </div>
                </div>
              </div>
            </v-col>
            <v-col cols="12" sm="1" class="price-btn-col d-flex align-end">
              <button type="button" class="price-unit-btn" @click="toggleSellingPriceUnit">
                {{ itemForm.sellingPriceUnit === 'USD' ? '$' : 'LBP' }}
              </button>
            </v-col>
          </v-row>
          <!-- Image section -->
          <div class="dialog-field-group image-section">
            <div class="dialog-label" :class="{ 'dialog-label-rtl': lang.dir === 'rtl' }">
              <span>{{ $t('image') }}</span>
              <span class="dialog-label-required">*</span>
            </div>
            <v-row class="image-upload-row">
              <v-col cols="3"></v-col>
              <v-col cols="6" class="d-flex justify-center">
                <input
                  ref="itemImageInputRef"
                  type="file"
                  accept="image/*"
                  class="hidden-file-input"
                  @change="onItemImageFileChange"
                />
                <div
                  class="image-upload-zone"
                  :class="{ 'has-image': !!itemImagePreview, 'image-error': imageError }"
                  @click="triggerItemImagePick"
                >
                  <template v-if="itemImagePreview">
                    <v-img
                      :src="itemImagePreview"
                      cover
                      class="image-upload-preview"
                      @click.stop="openImagePreview"
                    />
                    <div class="image-zone-actions">
                      <div class="group action-tooltip-wrapper">
                        <button
                          type="button"
                          class="action-btn edit-btn"
                          @click.stop="triggerItemImagePick"
                        >
                          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <div class="action-tooltip">{{ $t('replace') }}</div>
                      </div>
                      <div class="group action-tooltip-wrapper">
                        <button
                          type="button"
                          class="action-btn delete-btn"
                          @click.stop="removeItemImage"
                        >
                          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <div class="action-tooltip">{{ $t('remove') }}</div>
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <div class="image-upload-icon">
                      <v-icon size="large" :color="imageError ? 'error' : 'primary'">mdi-camera</v-icon>
                    </div>
                    <span class="image-upload-text">{{ imageError ? $t('fieldRequired') : $t('placeholderChoosePhoto') }}</span>
                  </template>
                </div>
              </v-col>
              <v-col cols="3"></v-col>
            </v-row>
          </div>
          <div class="dialog-actions" :class="lang.dir === 'rtl' ? 'dialog-actions-rtl' : ''">
            <button type="button" class="dialog-action-btn dialog-cancel-btn" @click.stop="closeItemDialog">
              {{ $t('cancel') }}
            </button>
            <button type="button" class="dialog-action-btn dialog-save-btn" @click.stop="saveItem">
              {{ editingItem ? $t('update') : $t('save') }}
            </button>
          </div>
        </div>
      </div>
      </v-form>
    </v-dialog>

    <!-- Image Preview Modal -->
    <v-dialog v-model="imagePreviewDialog" max-width="90vw" content-class="image-preview-modal">
      <div class="image-preview-wrapper">
        <button type="button" class="image-preview-close" @click="imagePreviewDialog = false">
          <v-icon>mdi-close</v-icon>
        </button>
        <v-img
          v-if="itemImagePreview"
          :src="itemImagePreview"
          contain
          max-height="90vh"
          class="image-preview-full"
        />
      </div>
    </v-dialog>

    <!-- Image Cropper Dialog -->
    <v-dialog v-model="cropperDialog" :max-width="cropperDialogMaxWidth" persistent content-class="cropper-dialog-content" :dir="lang.dir">
      <ImageCropper
        v-if="imageToCrop"
        :image-src="imageToCrop"
        :dir="lang.dir"
        output-type="blob"
        :output-quality="0.9"
        @confirm="onCropComplete"
        @cancel="onCropCancel"
      />
    </v-dialog>
    </div>
  </div>
</template>

<script>
import { useState } from '../store/state'
import { computed, ref, onMounted, onUnmounted, onActivated, watch, getCurrentInstance } from 'vue'
import CategoryService from '../services/CategoryService'
import ItemService from '../services/ItemService'
import HomeItemCard from '../components/HomeItemCard.vue'
import TopBar from '../components/TopBar.vue'
import ImageCropper from '../components/ImageCropper.vue'
import PosAutocomplete from '../components/PosAutocomplete.vue'

export default {
  name: 'AddItems',
  components: {
    HomeItemCard,
    TopBar,
    ImageCropper,
    PosAutocomplete
  },
  setup() {
    const instance = getCurrentInstance()
    const $t = instance?.appContext?.config?.globalProperties?.$t || ((k) => k)
    const $notification = (msg, status, delay) => instance?.appContext?.config?.globalProperties?.$notification?.(msg, status, delay)
    const state = useState()
    const lang = computed(() => ({
      lang: state.lang,
      dir: state.dir,
      sidebar: state.sidebar
    }))

    // Data
    const cat = ref('All')
    const search = ref('')
    const categoriesContainerRef = ref(null)
    const categoryDialog = ref(false)
    const itemDialog = ref(false)
    const barcodeFieldDisabled = ref(false)
    const editingCategory = ref(null)
    const editingItem = ref(null)
    const selectedCategory = ref(null)
    const items = computed(() => state.items)
    const categories = ref([])
    const categoriesLoading = ref(false)

    const loadCategories = async () => {
      if (categoriesLoading.value) return
      categoriesLoading.value = true
      try {
        const response = await CategoryService.getAllCategories()
        const data = response?.data?.data || []
        const mapped = data.map(cat => ({
          id: cat.id,
          value: lang.value.lang === 'ar' ? cat.nameAr : cat.nameEn,
          nameAr: cat.nameAr || '',
          nameEn: cat.nameEn || ''
        }))
        // Same order in both directions; "All" stays first via container dir (row-reverse in RTL)
        categories.value = mapped
      } catch (error) {
        console.error('Error loading categories:', error)
      } finally {
        categoriesLoading.value = false
      }
    }

    const otherCategories = computed(() => categories.value)

    const getCategoryKey = (item) => {
      if (lang.value.lang === 'ar') {
        return item.categoryNameAr || item.categoryNameEn || ''
      }
      return item.categoryNameEn || item.categoryNameAr || ''
    }

    const categoryForm = ref({
      nameAr: '',
      nameEn: ''
    })

    const itemForm = ref({
      nameAr: '',
      nameEn: '',
      buyingPriceDollar: 0,
      sellingPriceDollar: 0,
      buyingDollarRate: null,
      buyingPriceUnit: 'USD',
      sellingPriceUnit: 'USD',
      barcode: '',
      categoryId: null,
      image: null
    })
    const categoryFormRef = ref(null)
    const itemFormRef = ref(null)

    const itemImagePreview = ref(null)
    const itemImageFile = ref(null)
    const itemImageInputRef = ref(null)
    const imageError = ref(false)
    const imagePreviewDialog = ref(false)
    const buyingPriceError = ref(false)
    const sellingPriceError = ref(false)
    
    // Image cropper refs
    const cropperDialog = ref(false)
    const imageToCrop = ref(null)
    const viewportWidth = ref(0)
    const updateViewportWidth = () => {
      if (typeof window === 'undefined') return
      viewportWidth.value = window.innerWidth
    }
    const cropperDialogMaxWidth = computed(() => (
      viewportWidth.value >= 1700 ? '900px' : '600px'
    ))

    // Computed
    const categoriesForSelect = computed(() => {
      return categories.value.map(category => ({
        id: category.id,
        name: lang.value.lang === 'ar' ? category.nameAr : category.nameEn
      }))
    })

    const categorySelectOptions = ref([])
    const categorySelectLoading = ref(false)
    const categorySelectError = ref('')
    let categorySelectTimer = null

    const syncCategorySelectOptions = (list = categoriesForSelect.value) => {
      categorySelectOptions.value = list
    }

    const fetchCategorySelectOptions = async (query = '') => {
      categorySelectLoading.value = true
      try {
        const res = await CategoryService.searchCategories(query)
        const data = res?.data?.data || []
        categorySelectOptions.value = data.map((category) => ({
          id: category.id,
          name: lang.value.lang === 'ar' ? category.nameAr : category.nameEn
        }))
      } catch {
        categorySelectOptions.value = []
      } finally {
        categorySelectLoading.value = false
      }
    }

    const onCategorySelectSearch = (query) => {
      clearTimeout(categorySelectTimer)
      categorySelectTimer = setTimeout(() => fetchCategorySelectOptions(query), 220)
    }

    watch(categoriesForSelect, (list) => {
      if (!categorySelectOptions.value.length) syncCategorySelectOptions(list)
    }, { immediate: true })

    // Methods
    const name = i => lang.value.lang === 'ar' ? i.nameAr : i.nameEn
    const price = i => {
      const sellingPriceDollar = Number(i.sellingPriceDollar ?? 0)
      const rate = state.exchangeRate || 15000
      return state.currency === 'USD' ? sellingPriceDollar : sellingPriceDollar * rate
    }

    const getCategoryName = (item) => {
      if (!item) return ''
      return lang.value.lang === 'ar'
        ? (item.categoryNameAr || item.categoryNameEn || '')
        : (item.categoryNameEn || item.categoryNameAr || '')
    }

    const getCategoryItemCount = (categoryValue) => {
      if (categoryValue === 'All') return items.value.length
      return items.value.filter(i => getCategoryKey(i) === categoryValue).length
    }

    const filtered = computed(() => items.value.filter(i => {
      const query = search.value.toLowerCase()
      const n = name(i).toLowerCase()
      const cAr = (i.categoryNameAr || '').toLowerCase()
      const cEn = (i.categoryNameEn || '').toLowerCase()
      const matchesSearch = !query || n.includes(query) || cAr.includes(query) || cEn.includes(query)
      return (cat.value === 'All' || getCategoryKey(i) === cat.value) && matchesSearch
    }))

    const requiredRule = (value) => {
      if (value === null || value === undefined) return 'This field is required'
      if (typeof value === 'string' && value.trim() === '') return 'This field is required'
      if (typeof value === 'number' && (isNaN(value) || value < 0)) return 'Invalid value'
      return true
    }

    const pricePositiveRule = (value) => {
      if (value === null || value === undefined || value === '') return $t('priceMustBeGreaterThanZero')
      const num = Number(value)
      if (isNaN(num) || num <= 0) return $t('priceMustBeGreaterThanZero')
      return true
    }

    /** Round to 2 decimal places for USD amounts */
    const roundToTwo = (val) => {
      return Math.round(Number(val) * 100) / 100
    }

    /** Round price for display/storage: USD = 2 decimals, LBP = integer (no decimals) */
    const roundPriceForCurrency = (val, isDollar) => {
      return isDollar ? roundToTwo(val) : Math.round(Number(val))
    }

    function getBuyingPriceDisplayValue() {
      const rate = itemForm.value.buyingDollarRate || 1
      const value = itemForm.value.buyingPriceUnit === 'USD'
        ? itemForm.value.buyingPriceDollar
        : itemForm.value.buyingPriceDollar * rate
      // Format: USD = 2 decimals (always rounded), LBP = no decimals (integer)
      if (value == null || value === '') return value
      return roundPriceForCurrency(value, itemForm.value.buyingPriceUnit === 'USD')
    }

    function getSellingPriceDisplayValue() {
      const rate = itemForm.value.buyingDollarRate || 1
      const value = itemForm.value.sellingPriceUnit === 'USD'
        ? itemForm.value.sellingPriceDollar
        : itemForm.value.sellingPriceDollar * rate
      // Format: USD = 2 decimals (always rounded), LBP = no decimals (integer)
      if (value == null || value === '') return value
      return roundPriceForCurrency(value, itemForm.value.sellingPriceUnit === 'USD')
    }

    const onBuyingPriceInput = (val) => {
      // Clear error when user starts typing
      buyingPriceError.value = false
      
      const value = parseFloat(val)
      if (isNaN(value)) {
        itemForm.value.buyingPriceDollar = 0
        return
      }
      const rate = itemForm.value.buyingDollarRate || 1
      itemForm.value.buyingPriceDollar = itemForm.value.buyingPriceUnit === 'USD' ? value : value / rate
    }

    const validateBuyingPrice = () => {
      const displayValue = getBuyingPriceDisplayValue()
      const validationResult = pricePositiveRule(displayValue)
      
      if (validationResult !== true) {
        buyingPriceError.value = true
        return false
      }
      
      buyingPriceError.value = false
      
      if (itemForm.value.buyingPriceDollar == null || isNaN(itemForm.value.buyingPriceDollar)) {
        itemForm.value.buyingPriceDollar = 0
        return true
      }
      const rate = itemForm.value.buyingDollarRate || 1
      const currentDisplayValue = itemForm.value.buyingPriceUnit === 'USD'
        ? itemForm.value.buyingPriceDollar
        : itemForm.value.buyingPriceDollar * rate
      const roundedDisplay = roundPriceForCurrency(currentDisplayValue, itemForm.value.buyingPriceUnit === 'USD')
      itemForm.value.buyingPriceDollar = itemForm.value.buyingPriceUnit === 'USD' ? roundedDisplay : roundedDisplay / rate
      return true
    }

    const onSellingPriceInput = (val) => {
      // Clear error when user starts typing
      sellingPriceError.value = false
      
      const value = parseFloat(val)
      if (isNaN(value)) {
        itemForm.value.sellingPriceDollar = 0
        return
      }
      const rate = itemForm.value.buyingDollarRate || 1
      itemForm.value.sellingPriceDollar = itemForm.value.sellingPriceUnit === 'USD' ? value : value / rate
    }

    const validateSellingPrice = () => {
      const displayValue = getSellingPriceDisplayValue()
      const validationResult = pricePositiveRule(displayValue)
      
      if (validationResult !== true) {
        sellingPriceError.value = true
        return false
      }
      
      sellingPriceError.value = false
      
      if (itemForm.value.sellingPriceDollar == null || isNaN(itemForm.value.sellingPriceDollar)) {
        itemForm.value.sellingPriceDollar = 0
        return true
      }
      const rate = itemForm.value.buyingDollarRate || 1
      const currentDisplayValue = itemForm.value.sellingPriceUnit === 'USD'
        ? itemForm.value.sellingPriceDollar
        : itemForm.value.sellingPriceDollar * rate
      const roundedDisplay = roundPriceForCurrency(currentDisplayValue, itemForm.value.sellingPriceUnit === 'USD')
      itemForm.value.sellingPriceDollar = itemForm.value.sellingPriceUnit === 'USD' ? roundedDisplay : roundedDisplay / rate
      return true
    }

    const toggleBuyingPriceUnit = () => {
      itemForm.value.buyingPriceUnit = itemForm.value.buyingPriceUnit === 'USD' ? 'LBP' : 'USD'
    }

    const toggleSellingPriceUnit = () => {
      itemForm.value.sellingPriceUnit = itemForm.value.sellingPriceUnit === 'USD' ? 'LBP' : 'USD'
    }

    const handleEditItem = async (item) => {
      try {
        const response = await ItemService.getItemById(item.id)
        const fullItem = response?.data?.data
        if (fullItem) {
          openItemDialog(null, fullItem)
        } else {
          openItemDialog(null, item)
        }
      } catch (err) {
        $notification(err?.response?.data?.message || $t('errorLoadingItem'), 'error')
      }
    }

    const handleEditCategory = (category) => {
      openCategoryDialog(category)
    }

    const handleDeleteCategory = (category) => {
      const catId = category.id ?? category.value
      deleteCategory(catId)
    }

    const handleDeleteItem = (item) => {
      deleteItem(item.id)
    }



    const triggerItemImagePick = () => {
      itemImageInputRef.value?.click()
    }

    const onItemImageFileChange = async (e) => {
      const input = e?.target
      const file = input?.files?.[0]
      if (!file) return
      
      // Clean up previous blob URL if exists
      if (imageToCrop.value?.startsWith?.('blob:')) {
        URL.revokeObjectURL(imageToCrop.value)
      }
      
      try {
        // Open cropper dialog with the selected image
        imageToCrop.value = URL.createObjectURL(file)
        cropperDialog.value = true
      } catch (err) {
        console.error('Error loading image for cropping:', err)
      }
      
      // Reset file input
      if (input) input.value = ''
    }

    const onCropComplete = (croppedBlob) => {
      // Clean up previous preview URL if exists
      if (itemImagePreview.value?.startsWith?.('blob:')) {
        URL.revokeObjectURL(itemImagePreview.value)
      }
      
      // Store the cropped blob and create preview
      itemImageFile.value = croppedBlob
      itemImagePreview.value = URL.createObjectURL(croppedBlob)
      imageError.value = false
      
      // Clean up cropper state
      if (imageToCrop.value?.startsWith?.('blob:')) {
        URL.revokeObjectURL(imageToCrop.value)
      }
      imageToCrop.value = null
      cropperDialog.value = false
    }

    const onCropCancel = () => {
      // Clean up cropper state
      if (imageToCrop.value?.startsWith?.('blob:')) {
        URL.revokeObjectURL(imageToCrop.value)
      }
      imageToCrop.value = null
      cropperDialog.value = false
    }

    const removeItemImage = () => {
      if (itemImagePreview.value?.startsWith?.('blob:')) {
        URL.revokeObjectURL(itemImagePreview.value)
      }
      itemForm.value.image = null
      itemImagePreview.value = null
      itemImageFile.value = null
      imageError.value = true
      const input = itemImageInputRef.value
      if (input) input.value = ''
    }

    const handleGenerateBarcode = async () => {
      try {
        const response = await ItemService.generateBarcode()
        const barcode = response?.data?.data?.barcode
        if (barcode) {
          itemForm.value.barcode = barcode
          barcodeFieldDisabled.value = true
          $notification($t('barcodeGeneratedSuccessfully'), 'success')
        }
      } catch (err) {
        $notification(err?.response?.data?.message || $t('errorGeneratingBarcode'), 'error')
      }
    }

    const openImagePreview = () => {
      if (itemImagePreview.value) {
        imagePreviewDialog.value = true
      }
    }

    const openCategoryDialog = (category = null) => {
      editingCategory.value = category
      if (category) {
        categoryForm.value = {
          nameAr: category.nameAr,
          nameEn: category.nameEn
        }
      } else {
        categoryForm.value = {
          nameAr: '',
          nameEn: ''
        }
      }
      categoryDialog.value = true
    }

    const closeCategoryDialog = () => {
      categoryDialog.value = false
      editingCategory.value = null
      categoryForm.value = {
        nameAr: '',
        nameEn: ''
      }
    }

    const saveCategory = async () => {
      const { valid } = await categoryFormRef.value?.validate() ?? { valid: false }
      if (!valid) return
      try {
        const payload = {
          nameAr: categoryForm.value.nameAr,
          nameEn: categoryForm.value.nameEn
        }

        let response
        if (editingCategory.value) {
          const catId = Number(editingCategory.value.id ?? editingCategory.value.value)
          if (!Number.isFinite(catId)) {
            $notification($t('errorSavingCategory'), 'error')
            return
          }
          response = await CategoryService.updateCategory(catId, payload)
        } else {
          response = await CategoryService.createCategory(payload)
        }

        if (response?.data?.success) {
          const wasEdit = !!editingCategory.value
          await state.fetchUserItems({ force: true })
          await loadCategories()
          closeCategoryDialog()
          $notification(wasEdit ? $t('categoryUpdated') : $t('categoryCreated'), 'success')
        } else {
          $notification($t('categorySaveFailed'), 'error')
        }
      } catch (error) {
        $notification(error?.response?.data?.message || $t('errorSavingCategory'), 'error')
      }
    }

    const deleteCategory = async (categoryId) => {
      if (confirm('Are you sure you want to delete this category?')) {
        try {
          const response = await CategoryService.deleteCategory(categoryId)
          if (response?.data?.success) {
            await state.fetchUserItems({ force: true })
            await loadCategories()
            $notification($t('categoryDeleted'), 'success')
          } else {
            $notification($t('categoryDeleteFailed'), 'error')
          }
        } catch (error) {
          $notification(error?.response?.data?.message || $t('errorDeletingCategory'), 'error')
        }
      }
    }

    const openItemDialog = (category = null, item = null) => {
      barcodeFieldDisabled.value = false
      selectedCategory.value = category
      editingItem.value = item
      if (item) {
        const rate = state.exchangeRate ?? 15000
          itemForm.value = {
            nameAr: item.nameAr ?? '',
            nameEn: item.nameEn ?? '',
            buyingPriceDollar: Number(item.buyingPrice ?? 0),
            sellingPriceDollar: Number(item.sellingPrice ?? 0),
            buyingDollarRate: Number(item.buyingDollarRate ?? rate),
            buyingPriceUnit: item.isBuyingPriceDollar ? 'USD' : 'LBP',
            sellingPriceUnit: item.isSellingPriceDollar ? 'USD' : 'LBP',
            barcode: item.barcode ?? '',
            categoryId: item.categoryId ?? null,
            image: item.image ?? null
          }
          const categoryKey = getCategoryKey(item)
          const foundCategory = categories.value.find(c => c.value === categoryKey)
          if (foundCategory) itemForm.value.categoryId = foundCategory.id
        
        itemImagePreview.value = item.image
          ? (item.image.startsWith('data:') ? item.image : `data:image/jpeg;base64,${item.image}`)
          : null
        itemImageFile.value = null
        imageError.value = false
        if (itemImageInputRef.value) itemImageInputRef.value.value = ''
      } else {
        const rate = state.exchangeRate ?? 15000
        const unit = state.currency === 'USD' ? 'USD' : 'LBP'
        itemForm.value = {
          nameAr: '',
          nameEn: '',
          buyingPriceDollar: 0,
          sellingPriceDollar: 0,
          buyingDollarRate: rate,
          buyingPriceUnit: unit,
          sellingPriceUnit: unit,
          barcode: '',
          categoryId: category ? category.id : null,
          image: null
        }
        itemImagePreview.value = null
        itemImageFile.value = null
        imageError.value = false
        buyingPriceError.value = false
        sellingPriceError.value = false
        if (itemImageInputRef.value) itemImageInputRef.value.value = ''
      }
      buyingPriceError.value = false
      sellingPriceError.value = false
      categorySelectError.value = ''
      itemDialog.value = true
      fetchCategorySelectOptions('')
    }

    const closeItemDialog = () => {
      itemDialog.value = false
      editingItem.value = null
      selectedCategory.value = null
      categorySelectError.value = ''
      itemForm.value = {
        nameAr: '',
        nameEn: '',
        buyingPriceDollar: 0,
        sellingPriceDollar: 0,
        buyingDollarRate: null,
        buyingPriceUnit: 'USD',
        sellingPriceUnit: 'USD',
        barcode: '',
        categoryId: null,
        image: null
      }
      itemImagePreview.value = null
      itemImageFile.value = null
      imageError.value = false
      buyingPriceError.value = false
      sellingPriceError.value = false
      if (itemImageInputRef.value) itemImageInputRef.value.value = ''
    }

    const saveItem = async () => {
      const hasImage = !!itemImageFile.value || !!itemImagePreview.value
      imageError.value = !editingItem.value && !hasImage

      categorySelectError.value = itemForm.value.categoryId ? '' : ($t('category') + ' *')

      // Validate price fields
      const buyingPriceValid = validateBuyingPrice()
      const sellingPriceValid = validateSellingPrice()

      const { valid } = await itemFormRef.value?.validate() ?? { valid: false }
      if (!valid || imageError.value || !buyingPriceValid || !sellingPriceValid || categorySelectError.value) return

      try {
        const payload = {
          nameAr: itemForm.value.nameAr,
          nameEn: itemForm.value.nameEn,
          buyingPrice: itemForm.value.buyingPriceDollar,
          sellingPrice: itemForm.value.sellingPriceDollar,
          isBuyingPriceDollar: itemForm.value.buyingPriceUnit === 'USD',
          isSellingPriceDollar: itemForm.value.sellingPriceUnit === 'USD',
          buyingDollarRate: itemForm.value.buyingDollarRate,
          barcode: itemForm.value.barcode,
          categoryId: itemForm.value.categoryId
        }

        const imageFile = itemImageFile.value || null
        let response
        if (editingItem.value) {
          response = await ItemService.updateItem(editingItem.value.id, payload, imageFile)
        } else {
          response = await ItemService.createItem(payload, imageFile)
        }

        if (response?.data?.success) {
          const wasEdit = !!editingItem.value
          await state.fetchUserItems({ force: true })
          await loadCategories()
          closeItemDialog()
          $notification(wasEdit ? $t('itemUpdated') : $t('itemCreated'), 'success')
        } else {
          $notification($t('itemSaveFailed'), 'error')
        }
      } catch (error) {
        $notification(error?.response?.data?.message || $t('errorSavingItem'), 'error')
      }
    }

    const deleteItem = async (itemId) => {
      if (confirm('Are you sure you want to delete this item?')) {
        try {
          const response = await ItemService.deleteItem(itemId)
          if (response?.data?.success) {
            await state.fetchUserItems({ force: true })
            await loadCategories()
            $notification($t('itemDeleted'), 'success')
          } else {
            $notification($t('itemDeleteFailed'), 'error')
          }
        } catch (error) {
          $notification(error?.response?.data?.message || $t('errorDeletingItem'), 'error')
        }
      }
    }

    // Load data on mount
    onMounted(async () => {
      await state.fetchDollarRate()
      await state.fetchUserItems()
      await loadCategories()
      document.documentElement.setAttribute('dir', lang.value.dir)
      updateViewportWidth()
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', updateViewportWidth)
      }
      if (categoriesContainerRef.value) {
        const handleWheel = (e) => {
          if (categoriesContainerRef.value.scrollWidth > categoriesContainerRef.value.clientWidth) {
            e.preventDefault()
            categoriesContainerRef.value.scrollLeft += e.deltaY
          }
        }
        categoriesContainerRef.value.addEventListener('wheel', handleWheel, { passive: false })
        categoriesContainerRef.value._wheelHandler = handleWheel
      }
    })

    watch(() => lang.value.lang, async () => {
      document.documentElement.setAttribute('dir', lang.value.dir)
      await loadCategories()
    })

    onActivated(async () => {
      await state.fetchDollarRate()
      await state.fetchUserItems()
      await loadCategories()
    })

    onUnmounted(() => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateViewportWidth)
      }
      if (categoriesContainerRef.value && categoriesContainerRef.value._wheelHandler) {
        categoriesContainerRef.value.removeEventListener('wheel', categoriesContainerRef.value._wheelHandler)
      }
    })

    return {
      lang,
      categoriesForSelect,
      categorySelectOptions,
      categorySelectLoading,
      categorySelectError,
      onCategorySelectSearch,
      items,
      cat,
      search,
      categoriesContainerRef,
      otherCategories,
      filtered,
      categoryDialog,
      itemDialog,
      barcodeFieldDisabled,
      editingCategory,
      editingItem,
      selectedCategory,
      categoryForm,
      itemForm,
      categoryFormRef,
      itemFormRef,
      requiredRule,
      pricePositiveRule,
      getBuyingPriceDisplayValue,
      getSellingPriceDisplayValue,
      onBuyingPriceInput,
      validateBuyingPrice,
      onSellingPriceInput,
      validateSellingPrice,
      buyingPriceError,
      sellingPriceError,
      toggleBuyingPriceUnit,
      toggleSellingPriceUnit,
      handleEditItem,
      handleDeleteItem,
      handleEditCategory,
      handleDeleteCategory,
      getCategoryItemCount,
      getCategoryName,
      price,
      openCategoryDialog,
      closeCategoryDialog,
      saveCategory,
      deleteCategory,
      openItemDialog,
      closeItemDialog,
      saveItem,
      deleteItem,
      itemImagePreview,
      itemImageInputRef,
      triggerItemImagePick,
      onItemImageFileChange,
      removeItemImage,
      handleGenerateBarcode,
      imageError,
      imagePreviewDialog,
      openImagePreview,
      cropperDialog,
      cropperDialogMaxWidth,
      imageToCrop,
      onCropComplete,
      onCropCancel
    }
  }
}
</script>

<style scoped>
.page-background {
  background: #fafafa;
  min-height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.page-background::-webkit-scrollbar {
  display: none;
}

.add-items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  margin-left: 1rem;
  margin-right: 1rem;
}

.add-items-header-rtl {
  flex-direction: row-reverse;
}

.add-items-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.add-items-actions {
  display: flex;
  gap: 0.75rem;
}

.add-items-actions-rtl {
  flex-direction: row-reverse;
}

.add-items-action-btn {
  border-radius: 12px;
  font-weight: 700;
  background-image: linear-gradient(135deg, #197783, #32d8ee);
  color: #ffffff;
}

.add-items-action-btn:hover {
  background-image: linear-gradient(135deg, #08bad1, #26c6da);
}

.add-items-action-btn :deep(.v-btn__content) {
  font-weight: 700;
}

.action-tooltip-wrapper {
  position: relative;
  display: inline-flex;
}

.action-tooltip {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 0.5rem;
  padding: 0.375rem 0.625rem;
  background: #0f172a;
  border-radius: 6px;
  font-size: 0.75rem;
  color: #ffffff;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.15s ease;
  z-index: 9999;
  pointer-events: none;
}

.group:hover .action-tooltip {
  opacity: 1;
  visibility: visible;
}

/* Tooltip above button (for category row so it is not clipped by overflow) */
.action-tooltip-above .action-tooltip {
  top: auto;
  bottom: 100%;
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.add-items-dialog {
  border-radius: 15px !important;
  overflow: hidden;
}

.category-dialog-card {
  background: #ffffff;
}

.category-dialog-title {
  padding: 8px 20px;
  font-size: 1.1rem;
  font-weight: 600;
}

.text-right {
  text-align: right;
}

.category-dialog-body {
  padding: 12px 24px;
}

.item-dialog-card {
  background: #ffffff;
  max-height: 98vh;
  display: flex;
  flex-direction: column;
}

.item-dialog-title {
  padding: 8px 20px;
  font-size: 1.1rem;
  font-weight: 600;
}

.item-dialog-body {
  padding: 10px 20px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.item-dialog-body::-webkit-scrollbar {
  display: none;
}

.item-dialog-row {
  max-height: 75px;
}


.dialog-actions {
  display: flex;
  justify-content: center !important;
  gap: 0.75rem;
  margin: 0.5rem 0;
}


.dialog-divider {
  height: 1px;
  background: #000000;
}

.dialog-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 600;
  color: #6b7280;
  font-size: 0.75rem;
  margin-bottom: 0.1rem;
}

.dialog-label-required {
  color: #ef4444;
}

.dialog-label-rtl {
  justify-content: flex-end;
  text-align: right;
}

.dialog-actions-rtl {
  flex-direction: row-reverse;
}

.dialog-action-btn {
  font-weight: 700;
  border-radius: 12px;
  color: #ffffff;
  margin: 0 0.25rem;
  width: 45%;
  height: clamp(30px, 5vw, 37px);
  font-size: 0.75rem;
  border: none;
  cursor: pointer;
  padding: 0 0.5rem;
}

.dialog-action-btn :deep(.v-btn__content) {
  font-weight: 600;
}

.dialog-save-btn {
  background-image: linear-gradient(135deg, #2293a1, #32d8ee);
}

.dialog-cancel-btn {
  background-image: linear-gradient(135deg, #dc2626, #f87171);
  
}

.dialog-field :deep(.v-field__outline) {
  opacity: 0;
}

.dialog-field {
  margin-bottom: 2px !important;
}

.dialog-field :deep(.v-field__outline__start),
.dialog-field :deep(.v-field__outline__end),
.dialog-field :deep(.v-field__outline__notch) {
  opacity: 0;
}

.dialog-field :deep(.v-field) {
  border: 1px solid transparent;
  border-radius: 10px;
  background:
    linear-gradient(#ffffff, #ffffff) padding-box,
    linear-gradient(135deg, #2293a1, #32d8ee) border-box;
  overflow: hidden;
}

.dialog-field :deep(.v-field__field) {
  border-radius: 10px;
}

.dialog-field :deep(.v-field__overlay) {
  border-radius: 10px;
  overflow: hidden;
}

.dialog-field :deep(.v-field__outline) {
  border-radius: 10px;
}

.dialog-field :deep(.v-field__input) {
  font-size: 0.85rem;
  transition: font-size 0.2s ease;
  min-height: 30px;
  max-height: 30px;
}

.dialog-field :deep(.v-select__placeholder),
.dialog-field :deep(.v-field__input::placeholder) {
  text-align: center !important;
  width: 100%;
}

.dialog-field :deep(.v-field--empty .v-field__input) {
  text-align: center !important;
}

.dialog-field :deep(.v-field:not(.v-field--empty) .v-field__input) {
  text-align: left;
}

[dir="rtl"] .dialog-field :deep(.v-field:not(.v-field--empty) .v-field__input) {
  text-align: right;
}


.dialog-field :deep(.v-field:hover .v-field__input) {
  font-size: 0.9rem;
}

.dialog-field :deep(.v-field:hover) {
  box-shadow: 0 0 0 3px rgba(34, 147, 161, 0.25);
}

.dialog-field :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(34, 147, 161, 0.25);
  border-color: #2293a1;
}

.dialog-field :deep(.v-field--error) {
  border-color: #ef4444;
  animation: error-shadow-fade 1.2s ease-out forwards;
}

.dialog-field :deep(.v-messages__message) {
  color: #ef4444;
}

/* Keep select menu inside rounded bounds */
:deep(.v-overlay__content .v-list) {
  border-radius: 12px;
  overflow: hidden;
}

@keyframes error-shadow-fade {
  0% {
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.35);
  }
  100% {
    box-shadow: none;
  }
}

.panel-content {
  padding: 0.2rem;
  height: 100%;
  position: relative;
}

/* Categories selector styling - z-index so category tooltips stack above search bar */
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
  z-index: 20;
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

.category-item-with-actions {
  display: flex;
  align-items: stretch;
}

.category-card-ltr.category-item-with-actions {
  padding: 0.5rem 0.5rem 0.5rem 1.5rem;
}

.category-card-rtl.category-item-with-actions {
  padding: 0.5rem 1.5rem 0.5rem 0.5rem;
}

.category-card-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 0.2rem 0.25rem;
  align-items: center;
  width: 100%;
}

.category-card-rtl .category-card-grid {
  direction: rtl;
}

.category-name-cell {
  display: flex;
  align-items: center;
}

.category-count-cell {
  display: flex;
  align-items: center;
}

.category-edit-cell,
.category-delete-cell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.category-card-rtl .category-edit-cell,
.category-card-rtl .category-delete-cell {
  justify-content: flex-start;
}

.category-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  min-width: 1.75rem;
  min-height: 1.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background: #fff;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-action-btn.edit-btn:hover {
  background: #d1fae5;
  border-color: #00ae8b;
  color: #065f46;
}

.category-action-btn.delete-btn:hover {
  background: #fee2e2;
  border-color: #ef4444;
  color: #dc2626;
}

.category-action-btn .action-icon {
  width: 0.875rem;
  height: 0.875rem;
}

.category-count {
  font-size: 0.75rem;
  padding: 0;
  color: #666;
  white-space: nowrap;
}

.search-wrapper {
  margin: 0.2rem auto 0.5 rem auto;
  border-radius: 2rem;
  border: 2px solid rgba(0, 0, 0, 0.12);
  background: white;
  padding: 0.25rem 0.5rem;
  transition: border-color 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
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
  width: 100%;
}

.items-wrapper::-webkit-scrollbar {
  display: none;
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
  grid-template-columns: repeat(5, 1fr);
}

.items-grid.sidebar-off {
  grid-template-columns: repeat(6, 1fr);
}

/* Large screens (e.g., ~75" displays) */
@media (min-width: 1700px) {
  .items-grid.sidebar-on {
    grid-template-columns: repeat(7, 1fr);
  }

  .items-grid.sidebar-off {
    grid-template-columns: repeat(8, 1fr);
  }
}

/* Extra large screens (e.g., ~100" displays) */
@media (min-width: 2200px) {
  .items-grid.sidebar-on {
    grid-template-columns: repeat(8, 1fr);
  }

  .items-grid.sidebar-off {
    grid-template-columns: repeat(9, 1fr);
  }
}

/* RTL Support */
[dir="rtl"] .categories-container {
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

/* Dialog responsive sizing (rem-based) */
:deep(.add-items-dialog-responsive.add-items-dialog-category) {
  width: min(90vw, 27rem) !important;
  max-width: 27rem !important;
}

:deep(.add-items-dialog-responsive.add-items-dialog-item) {
  width: 50vw !important;
  max-width: 50vw !important;
  top: 2.5vh !important;
  transform: translateY(0) !important;
  margin-top: 0 !important;
}

@media (min-width: 1700px) {
  :deep(.add-items-dialog-responsive.add-items-dialog-category) {
    max-width: 40rem !important;
    min-width: 40rem !important;
    min-height: 30rem !important;
    max-height: 30rem !important;
  }
}

@media (min-width: 1700px) {
  :deep(.add-items-dialog-responsive.add-items-dialog-item) {
    width: 60vw !important;
    max-width: 60vw !important; 
  }
}

/* Price fields - hide number arrows */
.price-field-no-arrows :deep(input[type="number"])::-webkit-outer-spin-button,
.price-field-no-arrows :deep(input[type="number"])::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.price-field-no-arrows :deep(input[type="number"]) {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* Native price input field styling */
.price-input-field {
  width: 100%;
  min-height: 30px;
  max-height: 30px;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  border: 1px solid transparent;
  border-radius: 10px;
  background: linear-gradient(#ffffff, #ffffff) padding-box,
    linear-gradient(135deg, #2293a1, #32d8ee) border-box;
  outline: none;
  transition: all 0.2s ease;
  appearance: textfield;
  -moz-appearance: textfield;
  text-align: center;
}

.price-input-field::-webkit-outer-spin-button,
.price-input-field::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.price-input-field::placeholder {
  text-align: center;
  color: #999;
}

.price-input-field:hover {
  font-size: 0.9rem;
  box-shadow: 0 0 0 3px rgba(34, 147, 161, 0.25);
}

.price-input-field:focus {
  font-size: 0.9rem;
  box-shadow: 0 0 0 3px rgba(34, 147, 161, 0.25);
  border-color: #2293a1;
}

.price-input-field:not(:placeholder-shown) {
  text-align: left;
}

[dir="rtl"] .price-input-field:not(:placeholder-shown) {
  text-align: right;
}

.price-input-error {
  border-color: #ef4444 !important;
  background: linear-gradient(#ffffff, #ffffff) padding-box,
    linear-gradient(135deg, #ef4444, #f87171) border-box !important;
  animation: error-shadow-fade 1.2s ease-out forwards;
}

.price-input-error:hover,
.price-input-error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.25) !important;
  border-color: #ef4444 !important;
}

.price-input-error-message {
  color: #ef4444;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  margin-left: 0.5rem;
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1;
}

[dir="rtl"] .price-input-error-message {
  margin-left: 0;
  margin-right: 0.5rem;
  left: auto;
  right: 0;
}

.price-field-readonly :deep(.v-field) {
  background-color: #f5f5f5 !important;
}

.price-row {
  align-items: center;
}

.price-row .price-field-col {
  padding-bottom: 0.5rem;
}

.price-row .price-btn-col {
  justify-content: center;
  align-items: flex-end;
  padding-bottom: 0.2rem;
}

.price-field-group {
  position: relative;
  display: flex;
  flex-direction: column;
}

.price-input-wrapper {
  position: relative;
  height: 30px;
  display: flex;
  align-items: center;
}

[dir="rtl"] .price-row .price-btn-col {
  justify-content: flex-end;
}

.price-unit-btn {
  min-width: 2.75rem;
  width: 100%;
  max-width: 3.5rem;
  height: 30px;
  padding: 0 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background: #fff;
  color: #2293a1;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: calc(0.75rem + 0.2rem);
}

.price-unit-btn:hover {
  background: #e8f4f5;
  border-color: #2293a1;
}

/* Barcode row icons - same styling as item card action buttons */
.barcode-icons-container {
  gap: 0.3rem;
  margin-bottom: 0.2rem;
}

.barcode-icons-ltr {
  justify-content: flex-end;
}

.barcode-icons-rtl {
  justify-content: flex-start;
  flex-direction: row-reverse;
}

.barcode-icons-container .action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  min-width: 1.5rem;
  min-height: 1.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background: #fff;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 0;
}

.barcode-icons-container .action-btn:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #374151;
}

.barcode-icons-container .action-icon {
  width: 1rem;
  height: 1rem;
  font-size: 1rem;
}

/* Image section */
.image-section {
  margin-top: 0.5rem;
}

.image-section .dialog-label {
  margin-top: 1.5rem;
}

.image-icons-row {
  margin: 0 !important;
  padding: 0 !important;
}

.image-icons-row :deep(.v-col) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.image-icons-container {
  gap: 0.5rem;
  margin: 0;
  padding: 0;
}

.image-row-icon {
  color: #6b7280;
  cursor: pointer;
  transition: color 0.2s;
}

.image-row-icon:hover {
  color: #2293a1;
}

.image-upload-row {
  margin: 0 !important;
  padding: 0 !important;
  margin-top: 0 !important;
}

.image-upload-row :deep(.v-col) {
  padding-top: 0 !important;
}

/* Hidden file input */
.hidden-file-input {
  display: none;
}

/* Image upload zone - landscape 3:2 aspect ratio (matches item cards) */
.image-upload-zone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  width: 16rem;
  height: auto;
  padding: 1.5rem;
  border: 2px dashed rgba(34, 147, 161, 0.3);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.3s ease;
  margin: 0 auto;
  aspect-ratio: 3 / 2;
}

@media (min-width: 1700px) {
  .image-upload-zone {
    width: 25rem;
  }
}

.image-upload-zone:hover {
  border-color: #2293a1;
  background: rgba(34, 147, 161, 0.03);
}

.image-upload-zone.has-image {
  padding: 0;
  border-style: solid;
  border-color: rgba(34, 147, 161, 0.2);
  background: transparent;
}

@media (min-width: 1700px) {
  .image-upload-zone.has-image {
    width: 25rem;
  }
}

.image-upload-zone.image-error {
  border-color: #dc2626;
  border-style: dashed;
}

.image-upload-zone.image-error:hover {
  border-color: #dc2626;
}

.image-upload-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  background: linear-gradient(135deg, rgba(34, 147, 161, 0.12), rgba(34, 147, 161, 0.04));
  border-radius: 0.75rem;
}

.image-upload-icon :deep(.v-icon) {
  color: #2293a1;
}

.image-upload-zone.image-error .image-upload-icon :deep(.v-icon) {
  background: linear-gradient(135deg, #dc2626, #f87171);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.image-upload-text {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #334155;
  text-align: center;
}

.image-upload-zone.image-error .image-upload-text {
  background: linear-gradient(135deg, #dc2626, #f87171);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.image-upload-preview {
  width: 100%;
  height: 100%;
  border-radius: 0.875rem;
  overflow: hidden;
}

.image-zone-actions {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  z-index: 10;
}

.image-zone-actions .action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 0;
}

.image-zone-actions .action-btn:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #374151;
}

.image-zone-actions .edit-btn:hover {
  background: #d1fae5;
  border-color: #00ae8b;
  color: #065f46;
}

.image-zone-actions .delete-btn:hover {
  background: #fee2e2;
  border-color: #ef4444;
  color: #dc2626;
}

.image-zone-actions .action-icon {
  width: 16px;
  height: 16px;
}

/* Image Preview Modal */
:deep(.image-preview-modal) {
  background: rgba(0, 0, 0, 0.9) !important;
}

.image-preview-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 50vh;
  padding: 2rem;
}

.image-preview-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10;
}

.image-preview-close:hover {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.1);
}

.image-preview-close :deep(.v-icon) {
  color: #334155;
  font-size: 1.5rem;
}

.image-preview-full {
  max-width: 100%;
  max-height: 90vh;
  border-radius: 0.5rem;
  overflow: hidden;
}

/* Image Cropper Dialog */
:deep(.cropper-dialog-content) {
  border-radius: 15px !important;
  overflow: hidden;
}
</style>
