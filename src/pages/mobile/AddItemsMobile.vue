<template>
  <div class="m-items m-page" :dir="lang.dir">
    <header class="m-items__header">
      <div class="m-items__actions">
        <v-btn
          class="m-items__action-btn"
          variant="flat"
          size="large"
          :prepend-icon="lang.dir === 'ltr' ? 'mdi-plus' : undefined"
          :append-icon="lang.dir === 'rtl' ? 'mdi-plus' : undefined"
          @click="openCategoryDialog(null)"
        >
          {{ $t('addCategory') }}
        </v-btn>
        <v-btn
          class="m-items__action-btn"
          variant="flat"
          size="large"
          :prepend-icon="lang.dir === 'ltr' ? 'mdi-plus' : undefined"
          :append-icon="lang.dir === 'rtl' ? 'mdi-plus' : undefined"
          @click="openItemDialog()"
        >
          {{ $t('addItem') }}
        </v-btn>
      </div>
    </header>

    <!-- Category blocks -->
    <div class="m-items__cats" ref="categoriesContainerRef" :dir="lang.dir">
      <button
        type="button"
        class="m-cat"
        :class="{ 'm-cat--active': cat === 'all' }"
        @click="cat = 'all'"
      >
        <span class="m-cat__icon">
          <v-icon size="20">mdi-view-grid-outline</v-icon>
        </span>
        <span class="m-cat__name">{{ $t('allMenu') }}</span>
        <span class="m-cat__count">{{ totalItemCount }} {{ $t('items') }}</span>
      </button>

      <div
        v-for="category in categories"
        :key="category.id"
        class="m-cat m-cat--editable"
        :class="{ 'm-cat--active': String(cat) === String(category.id) }"
        role="button"
        tabindex="0"
        @click="cat = category.id"
        @keydown.enter.prevent="cat = category.id"
      >
        <span class="m-cat__icon">
          <v-icon size="20">mdi-folder-outline</v-icon>
        </span>
        <span class="m-cat__name">{{ lang.lang === 'ar' ? category.nameAr : category.nameEn }}</span>
        <span class="m-cat__count">{{ category.itemCount || 0 }} {{ $t('items') }}</span>
        <div class="m-cat__actions" @click.stop>
          <button
            type="button"
            class="m-cat__btn m-cat__btn--edit"
            :aria-label="$t('editCategory')"
            @click="handleEditCategory(category)"
          >
            <v-icon size="16">mdi-pencil</v-icon>
          </button>
          <button
            type="button"
            class="m-cat__btn m-cat__btn--delete"
            :aria-label="$t('delete')"
            @click="handleDeleteCategory(category)"
          >
            <v-icon size="16">mdi-delete-outline</v-icon>
          </button>
        </div>
      </div>
    </div>

    <div class="m-items__search">
      <v-text-field
        v-model="search"
        :placeholder="$t('searchPlaceholder')"
        :prepend-inner-icon="lang.dir === 'ltr' ? 'mdi-magnify' : undefined"
        :append-inner-icon="lang.dir === 'rtl' ? 'mdi-magnify' : undefined"
        density="comfortable"
        hide-details
        variant="outlined"
        clearable
        class="m-items__search-field"
      />
    </div>

    <div class="m-items__grid-wrap" :dir="lang.dir">
      <div class="m-items__grid" :class="{ 'm-items__grid--rtl': lang.dir === 'rtl' }">
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
      <div ref="scrollSentinelRef" class="m-items__scroll-sentinel" aria-hidden="true" />
      <div v-if="itemsLoading" class="m-items__loading">{{ $t('loading') }}</div>
      <div v-else-if="filtered.length === 0" class="m-items__empty">
        {{ $t('NoItemsToShow') }}
      </div>
    </div>

    <!-- Category Dialog — fullscreen on mobile -->
    <v-dialog
      v-model="categoryDialog"
      fullscreen
      transition="dialog-bottom-transition"
      :dir="lang.dir"
      content-class="m-form-overlay"
      persistent
      @update:model-value="(v) => { if (v === false) closeCategoryDialog() }"
    >
      <v-form
        ref="categoryFormRef"
        class="m-form"
        :dir="lang.dir"
        :class="{ 'm-form--rtl': lang.dir === 'rtl' }"
        @submit.prevent="saveCategory"
      >
        <MobileSheetHeader
          tone="brand"
          :title="editingCategory ? $t('editCategory') : $t('addCategory')"
          :subtitle="$t('category')"
          @back="closeCategoryDialog"
        />

        <div class="m-form__body">
          <section class="m-form__card">
            <div class="m-form__field">
              <label class="m-form__label">
                {{ $t('nameAr') }} <span class="req">*</span>
              </label>
              <v-text-field
                v-model="categoryForm.nameAr"
                persistent-placeholder
                :placeholder="$t('placeholderNameAr')"
                variant="outlined"
                density="comfortable"
                :rules="[requiredRule]"
                class="m-form__input"
                dir="rtl"
              />
            </div>
            <div class="m-form__field">
              <label class="m-form__label">
                {{ $t('nameEn') }}
              </label>
              <v-text-field
                v-model="categoryForm.nameEn"
                persistent-placeholder
                :placeholder="$t('placeholderNameEn')"
                variant="outlined"
                density="comfortable"
                class="m-form__input"
                dir="ltr"
              />
            </div>
          </section>
        </div>

        <footer class="m-form__footer">
          <button type="button" class="m-form__btn m-form__btn--save" @click="saveCategory">
            {{ editingCategory ? $t('update') : $t('save') }}
          </button>
        </footer>
      </v-form>
    </v-dialog>

    <!-- Item Dialog — fullscreen on mobile -->
    <v-dialog
      v-model="itemDialog"
      fullscreen
      transition="dialog-bottom-transition"
      :dir="lang.dir"
      content-class="m-form-overlay"
      persistent
      @update:model-value="(v) => { if (v === false) closeItemDialog() }"
    >
      <v-form
        ref="itemFormRef"
        class="m-form"
        :dir="lang.dir"
        :class="{ 'm-form--rtl': lang.dir === 'rtl' }"
        @submit.prevent="saveItem"
      >
        <MobileSheetHeader
          tone="brand"
          :title="editingItem ? $t('editItem') : $t('addItem')"
          :subtitle="$t('addItems')"
          @back="closeItemDialog"
        />

        <div class="m-form__body">
          <section class="m-form__card">
          <div class="m-form__field">
            <label class="m-form__label">
              {{ $t('nameAr') }} <span class="req">*</span>
            </label>
            <v-text-field
              v-model="itemForm.nameAr"
              persistent-placeholder
              :placeholder="$t('placeholderNameAr')"
              variant="outlined"
              density="comfortable"
              :rules="[requiredRule]"
              class="m-form__input"
              dir="rtl"
            />
          </div>
          <div class="m-form__field">
            <label class="m-form__label">
              {{ $t('nameEn') }}
            </label>
            <v-text-field
              v-model="itemForm.nameEn"
              persistent-placeholder
              :placeholder="$t('placeholderNameEn')"
              variant="outlined"
              density="comfortable"
              class="m-form__input"
              dir="ltr"
            />
          </div>

          <div class="m-form__field">
            <label class="m-form__label">
              {{ $t('category') }} <span class="req">*</span>
            </label>
            <PosAutocomplete
              v-model="itemForm.categoryId"
              :placeholder="$t('searchCategory')"
              :items="categorySelectOptions"
              item-title="name"
              item-value="id"
              :required="true"
              :hide-details="false"
              :error-message="categorySelectError"
              :no-data-text="$t('noAutocompleteResults')"
              clearable
              class="m-form__input"
              @update:search="onCategorySelectSearch"
            />
          </div>

          <div class="m-form__field">
            <label class="m-form__label">
              {{ $t('barcode') }} <span class="req">*</span>
            </label>
            <div class="m-barcode">
              <v-text-field
                v-model="itemForm.barcode"
                persistent-placeholder
                :placeholder="$t('placeholderBarcode')"
                variant="outlined"
                density="comfortable"
                :rules="[requiredRule]"
                :disabled="barcodeFieldDisabled"
                class="m-form__input m-barcode__field"
                dir="ltr"
              />
              <div class="m-barcode__icons">
                <button type="button" class="m-barcode__btn" :aria-label="$t('scanBarcode')" @click="openBarcodeCaptureDialog">
                  <v-icon size="20">mdi-barcode-scan</v-icon>
                </button>
                <button type="button" class="m-barcode__btn" :aria-label="$t('generateBarcode')" @click="handleGenerateBarcode">
                  <v-icon size="20">mdi-barcode</v-icon>
                </button>
              </div>
            </div>
          </div>
          </section>

          <section class="m-form__card">
          <div class="m-form__field">
            <label class="m-form__label">
              {{ $t('buyingRate') }} <span class="req">*</span>
            </label>
            <v-text-field
              v-model.number="itemForm.buyingRate"
              type="number"
              persistent-placeholder
              :placeholder="$t('placeholderBuyingRate')"
              variant="outlined"
              density="comfortable"
              :rules="[requiredRule]"
              class="m-form__input price-field-no-arrows"
            />
          </div>

          <div class="m-form__field">
            <label class="m-form__label">
              {{ $t('buyingPrice') }} <span class="req">*</span>
            </label>
            <div class="m-price">
              <div class="m-price__input-wrap">
                <input
                  :value="getBuyingPriceDisplayValue()"
                  type="number"
                  :step="isBuyingDollar ? 0.01 : 1"
                  :placeholder="$t('placeholderBuyingPrice')"
                  :class="['m-price__input', { 'm-price__input--error': buyingPriceError }]"
                  @input="onBuyingPriceInput($event.target.value)"
                  @blur="validateBuyingPrice"
                  min="0"
                />
                <div v-if="buyingPriceError" class="m-price__error">
                  {{ $t('priceMustBeGreaterThanZero') }}
                </div>
              </div>
              <button type="button" class="m-price__unit" @click="toggleBuyingCurrency">
                {{ isBuyingDollar ? '$' : 'LBP' }}
              </button>
            </div>
          </div>

          <div class="m-form__field">
            <label class="m-form__label">
              {{ $t('sellingPrice') }} <span class="req">*</span>
            </label>
            <div class="m-price">
              <div class="m-price__input-wrap">
                <input
                  :value="getSellingPriceDisplayValue()"
                  type="number"
                  :step="isSellingDollar ? 0.01 : 1"
                  :placeholder="$t('placeholderSellingPrice')"
                  :class="['m-price__input', { 'm-price__input--error': sellingPriceError }]"
                  @input="onSellingPriceInput($event.target.value)"
                  @blur="validateSellingPrice"
                  min="0"
                />
                <div v-if="sellingPriceError" class="m-price__error">
                  {{ $t('priceMustBeGreaterThanZero') }}
                </div>
              </div>
              <button type="button" class="m-price__unit" @click="toggleSellingCurrency">
                {{ isSellingDollar ? '$' : 'LBP' }}
              </button>
            </div>
          </div>
          </section>

          <section class="m-form__card">
          <div class="m-form__field m-form__field--last">
            <label class="m-form__label">
              {{ $t('image') }} <span class="req">*</span>
            </label>
            <input
              ref="itemImageInputRef"
              type="file"
              accept="image/*"
              class="hidden-file-input"
              @change="onItemImageFileChange"
            />
            <input
              ref="itemImageCaptureRef"
              type="file"
              accept="image/*"
              capture="environment"
              class="hidden-file-input"
              @change="onItemImageFileChange"
            />
            <div
              class="m-image-zone"
              :class="{ 'has-image': !!itemImagePreview, 'image-error': imageError }"
            >
              <template v-if="itemImagePreview">
                <v-img
                  :src="itemImagePreview"
                  cover
                  class="m-image-zone__preview"
                  @click.stop="openImagePreview"
                />
                <div class="m-image-zone__actions">
                  <button type="button" class="m-image-zone__btn" :aria-label="$t('takeProductPhoto')" @click.stop="triggerItemImageCapture">
                    <v-icon size="18">mdi-camera</v-icon>
                  </button>
                  <button type="button" class="m-image-zone__btn" :aria-label="$t('chooseFromGallery')" @click.stop="triggerItemImagePick">
                    <v-icon size="18">mdi-image-edit</v-icon>
                  </button>
                  <button type="button" class="m-image-zone__btn m-image-zone__btn--delete" :aria-label="$t('remove')" @click.stop="removeItemImage">
                    <v-icon size="18">mdi-delete-outline</v-icon>
                  </button>
                </div>
              </template>
              <template v-else>
                <v-icon size="36" :color="imageError ? 'error' : 'primary'">mdi-camera</v-icon>
                <span class="m-image-zone__text">
                  {{ imageError ? $t('fieldRequired') : $t('placeholderChoosePhoto') }}
                </span>
                <div class="m-image-zone__pickers">
                  <button type="button" class="m-image-zone__picker" @click.stop="triggerItemImageCapture">
                    <v-icon size="18">mdi-camera</v-icon>
                    <span>{{ $t('takeProductPhoto') }}</span>
                  </button>
                  <button type="button" class="m-image-zone__picker m-image-zone__picker--ghost" @click.stop="triggerItemImagePick">
                    <v-icon size="18">mdi-image-outline</v-icon>
                    <span>{{ $t('chooseFromGallery') }}</span>
                  </button>
                </div>
              </template>
            </div>
          </div>
          </section>
        </div>

        <footer class="m-form__footer">
          <button type="button" class="m-form__btn m-form__btn--save" @click="saveItem">
            {{ editingItem ? $t('update') : $t('save') }}
          </button>
        </footer>
      </v-form>
    </v-dialog>

    <BarcodeCaptureDialog
      ref="barcodeCaptureRef"
      v-model="barcodeCaptureDialog"
      @scanned="applyScannedBarcode"
    />

    <!-- Image Preview Modal -->
    <v-dialog v-model="imagePreviewDialog" max-width="96vw" content-class="m-image-preview-modal">
      <div class="m-image-preview">
        <button type="button" class="m-image-preview__close" @click="imagePreviewDialog = false">
          <v-icon>mdi-close</v-icon>
        </button>
        <v-img
          v-if="itemImagePreview"
          :src="itemImagePreview"
          contain
          max-height="90vh"
        />
      </div>
    </v-dialog>

    <!-- Image Cropper Dialog -->
    <v-dialog
      v-model="cropperDialog"
      :max-width="cropperDialogMaxWidth"
      persistent
      content-class="m-cropper-dialog"
      :dir="lang.dir"
    >
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
</template>

<script>
import { useState } from '../../store/state'
import { computed, ref, onMounted, onUnmounted, watch, getCurrentInstance } from 'vue'
import CategoryService from '../../services/CategoryService'
import ItemService from '../../services/ItemService'
import HomeItemCard from '../../components/HomeItemCard.vue'
import ImageCropper from '../../components/ImageCropper.vue'
import PosAutocomplete from '../../components/PosAutocomplete.vue'
import BarcodeCaptureDialog from '../../components/BarcodeCaptureDialog.vue'
import MobileSheetHeader from '../../components/mobile/MobileSheetHeader.vue'
import { useMobileOverlayBack } from '../../composables/useMobileBackStack'
import { useInfiniteScroll } from '../../composables/useInfiniteScroll'
import { CurrencyEnum } from '../../constants/enums'
import { displayCatalogPrice, isDollarCurrency, roundForCurrency } from '../../constants/currency'

export default {
  name: 'AddItemsMobile',
  components: {
    HomeItemCard,
    ImageCropper,
    PosAutocomplete,
    BarcodeCaptureDialog,
    MobileSheetHeader
  },
  setup() {
    const instance = getCurrentInstance()
    const $t = instance?.appContext?.config?.globalProperties?.$t || ((k) => k)
    const $notification = (msg, status, delay) => instance?.appContext?.config?.globalProperties?.$notification?.(msg, status, delay)
    const state = useState()
    const lang = computed(() => ({
      lang: state.lang,
      dir: state.dir
    }))

    const cat = ref('all')
    const search = ref('')
    const categoriesContainerRef = ref(null)
    const scrollSentinelRef = ref(null)
    const categoryDialog = ref(false)
    const itemDialog = ref(false)
    const barcodeCaptureDialog = ref(false)
    const barcodeCaptureRef = ref(null)
    const barcodeFieldDisabled = ref(false)
    const editingCategory = ref(null)
    const editingItem = ref(null)
    const categories = computed(() => state.categories)
    const totalItemCount = computed(() => state.totalItemCount)
    const categorySearch = ref('')

    const emptyItemForm = () => ({
      nameAr: '',
      nameEn: '',
      buyingPrice: 0,
      buyingCurrency: CurrencyEnum.DOLLAR,
      buyingRate: null,
      sellingPrice: 0,
      sellingCurrency: CurrencyEnum.DOLLAR,
      barcode: '',
      categoryId: null,
      image: null
    })

    const categoryForm = ref({
      nameAr: '',
      nameEn: ''
    })

    const itemForm = ref(emptyItemForm())
    const categoryFormRef = ref(null)
    const itemFormRef = ref(null)

    const itemImagePreview = ref(null)
    const itemImageFile = ref(null)
    const itemImageInputRef = ref(null)
    const itemImageCaptureRef = ref(null)
    const imageError = ref(false)
    const imagePreviewDialog = ref(false)
    const buyingPriceError = ref(false)
    const sellingPriceError = ref(false)
    const categorySelectError = ref('')

    const cropperDialog = ref(false)

    useMobileOverlayBack(categoryDialog, () => closeCategoryDialog())
    useMobileOverlayBack(itemDialog, () => closeItemDialog())
    useMobileOverlayBack(imagePreviewDialog, () => {
      imagePreviewDialog.value = false
    })
    useMobileOverlayBack(cropperDialog, () => onCropCancel())
    const imageToCrop = ref(null)
    const viewportWidth = ref(0)
    const updateViewportWidth = () => {
      if (typeof window === 'undefined') return
      viewportWidth.value = window.innerWidth
    }
    const cropperDialogMaxWidth = computed(() => (
      viewportWidth.value >= 1700 ? '900px' : '96vw'
    ))

    const categorySelectOptions = computed(() => {
      const q = (categorySearch.value || '').trim().toLowerCase()
      return (state.categories || [])
        .map((category) => ({
          id: category.id,
          name: lang.value.lang === 'ar' ? category.nameAr : category.nameEn
        }))
        .filter((c) => !q || (c.name || '').toLowerCase().includes(q))
    })

    const onCategorySelectSearch = (query) => {
      categorySearch.value = query || ''
    }

    const isSearching = computed(() => !!(search.value || '').trim())
    const pageState = computed(() => state.getCategoryItemsPageState(cat.value))
    const itemsLoading = computed(() => {
      if (isSearching.value) return !!state.searchLoading
      return !!pageState.value?.loading
    })

    const RENDER_PAGE = 50
    const visibleCount = ref(RENDER_PAGE)

    const loadedItems = computed(() => {
      void state.itemCacheVersion
      if (isSearching.value) return state.searchResults || []
      return state.getCategoryItemsPageItems(cat.value)
    })

    const filtered = computed(() => {
      if (isSearching.value) return loadedItems.value
      return loadedItems.value.slice(0, visibleCount.value)
    })

    const canLoadMore = computed(() => {
      if (isSearching.value) return false
      if (visibleCount.value < loadedItems.value.length) return true
      const p = pageState.value
      if (!p || p.loading) return false
      if (p.page < 0) return true
      return p.page + 1 < p.totalPages
    })

    const loadMoreItems = async () => {
      if (!canLoadMore.value) return
      if (visibleCount.value < loadedItems.value.length) {
        visibleCount.value = Math.min(visibleCount.value + RENDER_PAGE, loadedItems.value.length)
        return
      }
      const before = loadedItems.value.length
      await state.loadItemsPageFromDb({ categoryId: cat.value, reset: false })
      if (loadedItems.value.length > before) {
        visibleCount.value = Math.min(visibleCount.value + RENDER_PAGE, loadedItems.value.length)
      }
    }

    useInfiniteScroll(scrollSentinelRef, loadMoreItems, canLoadMore)

    let searchTimer = null
    watch(search, (q) => {
      clearTimeout(searchTimer)
      searchTimer = setTimeout(() => {
        const trimmed = (q || '').trim()
        if (!trimmed) {
          state.searchResults = []
          return
        }
        state.searchItems({ query: trimmed, categoryId: cat.value })
      }, 300)
    })

    watch(cat, async (categoryId) => {
      visibleCount.value = RENDER_PAGE
      search.value = ''
      state.searchResults = []
      await state.loadItemsPageFromDb({ categoryId, reset: true })
    })

    const isBuyingDollar = computed(() => isDollarCurrency(itemForm.value.buyingCurrency))
    const isSellingDollar = computed(() => isDollarCurrency(itemForm.value.sellingCurrency))

    const price = (i) => displayCatalogPrice(
      i?.sellingPrice,
      i?.sellingCurrency,
      state.currency,
      state.exchangeRate
    )

    const requiredRule = (value) => {
      if (value === null || value === undefined) return $t('fieldRequired')
      if (typeof value === 'string' && value.trim() === '') return $t('fieldRequired')
      if (typeof value === 'number' && (isNaN(value) || value < 0)) return $t('invalidValue')
      return true
    }

    const pricePositiveRule = (value) => {
      if (value === null || value === undefined || value === '') return $t('priceMustBeGreaterThanZero')
      const num = Number(value)
      if (isNaN(num) || num <= 0) return $t('priceMustBeGreaterThanZero')
      return true
    }

    function getBuyingPriceDisplayValue() {
      const value = itemForm.value.buyingPrice
      if (value == null || value === '') return value
      return roundForCurrency(value, itemForm.value.buyingCurrency)
    }

    function getSellingPriceDisplayValue() {
      const value = itemForm.value.sellingPrice
      if (value == null || value === '') return value
      return roundForCurrency(value, itemForm.value.sellingCurrency)
    }

    const onBuyingPriceInput = (val) => {
      buyingPriceError.value = false
      const value = parseFloat(val)
      if (isNaN(value)) {
        itemForm.value.buyingPrice = 0
        return
      }
      itemForm.value.buyingPrice = value
    }

    const validateBuyingPrice = () => {
      const displayValue = getBuyingPriceDisplayValue()
      if (pricePositiveRule(displayValue) !== true) {
        buyingPriceError.value = true
        return false
      }
      buyingPriceError.value = false
      if (itemForm.value.buyingPrice == null || isNaN(itemForm.value.buyingPrice)) {
        itemForm.value.buyingPrice = 0
        return true
      }
      itemForm.value.buyingPrice = roundForCurrency(itemForm.value.buyingPrice, itemForm.value.buyingCurrency)
      return true
    }

    const onSellingPriceInput = (val) => {
      sellingPriceError.value = false
      const value = parseFloat(val)
      if (isNaN(value)) {
        itemForm.value.sellingPrice = 0
        return
      }
      itemForm.value.sellingPrice = value
    }

    const validateSellingPrice = () => {
      const displayValue = getSellingPriceDisplayValue()
      if (pricePositiveRule(displayValue) !== true) {
        sellingPriceError.value = true
        return false
      }
      sellingPriceError.value = false
      if (itemForm.value.sellingPrice == null || isNaN(itemForm.value.sellingPrice)) {
        itemForm.value.sellingPrice = 0
        return true
      }
      itemForm.value.sellingPrice = roundForCurrency(itemForm.value.sellingPrice, itemForm.value.sellingCurrency)
      return true
    }

    const convertAmountCurrency = (amount, from, to, rate) => {
      const n = Number(amount) || 0
      const r = Number(rate) > 0 ? Number(rate) : 1
      if (from === to) return roundForCurrency(n, to)
      if (from === CurrencyEnum.DOLLAR && to === CurrencyEnum.LBP) {
        return roundForCurrency(n * r, CurrencyEnum.LBP)
      }
      if (from === CurrencyEnum.LBP && to === CurrencyEnum.DOLLAR) {
        return roundForCurrency(n / r, CurrencyEnum.DOLLAR)
      }
      return roundForCurrency(n, to)
    }

    const toggleBuyingCurrency = () => {
      const rate = itemForm.value.buyingRate || state.exchangeRate || 1
      const from = itemForm.value.buyingCurrency
      const to = from === CurrencyEnum.DOLLAR ? CurrencyEnum.LBP : CurrencyEnum.DOLLAR
      itemForm.value.buyingPrice = convertAmountCurrency(itemForm.value.buyingPrice, from, to, rate)
      itemForm.value.buyingCurrency = to
    }

    const toggleSellingCurrency = () => {
      const rate = itemForm.value.buyingRate || state.exchangeRate || 1
      const from = itemForm.value.sellingCurrency
      const to = from === CurrencyEnum.DOLLAR ? CurrencyEnum.LBP : CurrencyEnum.DOLLAR
      itemForm.value.sellingPrice = convertAmountCurrency(itemForm.value.sellingPrice, from, to, rate)
      itemForm.value.sellingCurrency = to
    }

    const resolveCurrency = (value, legacyIsDollar) => {
      if (value != null && value !== '') return Number(value)
      if (legacyIsDollar === false) return CurrencyEnum.LBP
      return CurrencyEnum.DOLLAR
    }

    const handleEditItem = async (item) => {
      try {
        const response = await ItemService.getItemById(item.id)
        const fullItem = response?.data?.data
        if (fullItem) {
          openItemDialog(fullItem)
        } else {
          openItemDialog(item)
        }
      } catch (err) {
        $notification(err?.response?.data?.message || $t('errorLoadingItem'), 'error')
      }
    }

    const handleEditCategory = (category) => {
      openCategoryDialog(category)
    }

    const handleDeleteCategory = (category) => {
      deleteCategory(category.id)
    }

    const handleDeleteItem = (item) => {
      deleteItem(item.id)
    }

    const clearItemImageInputs = () => {
      if (itemImageInputRef.value) itemImageInputRef.value.value = ''
      if (itemImageCaptureRef.value) itemImageCaptureRef.value.value = ''
    }

    const triggerItemImagePick = () => {
      itemImageInputRef.value?.click()
    }

    const triggerItemImageCapture = () => {
      itemImageCaptureRef.value?.click()
    }

    const onItemImageFileChange = async (e) => {
      const input = e?.target
      const file = input?.files?.[0]
      if (!file) return

      if (imageToCrop.value?.startsWith?.('blob:')) {
        URL.revokeObjectURL(imageToCrop.value)
      }

      try {
        imageToCrop.value = URL.createObjectURL(file)
        cropperDialog.value = true
      } catch (err) {
        console.error('Error loading image for cropping:', err)
      }

      if (input) input.value = ''
    }

    const onCropComplete = (croppedBlob) => {
      if (itemImagePreview.value?.startsWith?.('blob:')) {
        URL.revokeObjectURL(itemImagePreview.value)
      }

      itemImageFile.value = croppedBlob
      itemImagePreview.value = URL.createObjectURL(croppedBlob)
      imageError.value = false

      if (imageToCrop.value?.startsWith?.('blob:')) {
        URL.revokeObjectURL(imageToCrop.value)
      }
      imageToCrop.value = null
      cropperDialog.value = false
    }

    const onCropCancel = () => {
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
      clearItemImageInputs()
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

    const openBarcodeCaptureDialog = () => {
      barcodeCaptureDialog.value = true
      barcodeCaptureRef.value?.startFromGesture()
    }

    const applyScannedBarcode = (code) => {
      if (!code) return
      itemForm.value.barcode = code
      barcodeFieldDisabled.value = true
      $notification($t('barcodeCaptured'), 'success')
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
          const catId = editingCategory.value.id
          if (catId == null) {
            $notification($t('errorSavingCategory'), 'error')
            return
          }
          response = await CategoryService.updateCategory(catId, payload)
        } else {
          response = await CategoryService.createCategory(payload)
        }

        if (response?.data?.success) {
          const wasEdit = !!editingCategory.value
          await state.loadCategories({ force: true })
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
            await state.loadCategories({ force: true })
            if (String(cat.value) === String(categoryId)) {
              cat.value = 'all'
            }
            $notification($t('categoryDeleted'), 'success')
          } else {
            $notification($t('categoryDeleteFailed'), 'error')
          }
        } catch (error) {
          $notification(error?.response?.data?.message || $t('errorDeletingCategory'), 'error')
        }
      }
    }

    const openItemDialog = (item = null) => {
      barcodeFieldDisabled.value = false
      editingItem.value = item
      categorySearch.value = ''
      const rate = state.exchangeRate ?? 15000
      if (item) {
        itemForm.value = {
          nameAr: item.nameAr ?? '',
          nameEn: item.nameEn ?? '',
          buyingPrice: Number(item.buyingPrice ?? 0),
          buyingCurrency: resolveCurrency(item.buyingCurrency, item.isBuyingPriceDollar),
          buyingRate: Number(item.buyingRate ?? item.buyingDollarRate ?? rate),
          sellingPrice: Number(item.sellingPrice ?? 0),
          sellingCurrency: resolveCurrency(item.sellingCurrency, item.isSellingPriceDollar),
          barcode: item.barcode ?? '',
          categoryId: item.categoryId ?? null,
          image: item.image ?? null
        }
        itemImagePreview.value = item.image
          ? (item.image.startsWith('data:') ? item.image : `data:image/jpeg;base64,${item.image}`)
          : null
        itemImageFile.value = null
        imageError.value = false
        clearItemImageInputs()
      } else {
        const currency = state.currency === 'LBP' ? CurrencyEnum.LBP : CurrencyEnum.DOLLAR
        itemForm.value = {
          ...emptyItemForm(),
          buyingRate: rate,
          buyingCurrency: currency,
          sellingCurrency: currency
        }
        itemImagePreview.value = null
        itemImageFile.value = null
        imageError.value = false
        clearItemImageInputs()
      }
      buyingPriceError.value = false
      sellingPriceError.value = false
      categorySelectError.value = ''
      itemDialog.value = true
    }

    const closeItemDialog = () => {
      itemDialog.value = false
      barcodeCaptureDialog.value = false
      editingItem.value = null
      categorySelectError.value = ''
      categorySearch.value = ''
      itemForm.value = emptyItemForm()
      itemImagePreview.value = null
      itemImageFile.value = null
      imageError.value = false
      buyingPriceError.value = false
      sellingPriceError.value = false
      clearItemImageInputs()
    }

    const saveItem = async () => {
      const hasImage = !!itemImageFile.value || !!itemImagePreview.value
      imageError.value = !editingItem.value && !hasImage

      categorySelectError.value = itemForm.value.categoryId ? '' : ($t('category') + ' *')

      const buyingPriceValid = validateBuyingPrice()
      const sellingPriceValid = validateSellingPrice()

      const { valid } = await itemFormRef.value?.validate() ?? { valid: false }
      if (!valid || imageError.value || !buyingPriceValid || !sellingPriceValid || categorySelectError.value) return

      try {
        const payload = {
          nameAr: itemForm.value.nameAr,
          nameEn: itemForm.value.nameEn,
          barcode: itemForm.value.barcode,
          categoryId: itemForm.value.categoryId,
          buyingPrice: itemForm.value.buyingPrice,
          buyingCurrency: itemForm.value.buyingCurrency,
          buyingRate: itemForm.value.buyingRate,
          sellingPrice: itemForm.value.sellingPrice,
          sellingCurrency: itemForm.value.sellingCurrency
        }

        const imageFile = itemImageFile.value || null
        const previousId = editingItem.value?.id
        const previousCategoryId = editingItem.value?.categoryId
        let response
        if (editingItem.value) {
          response = await ItemService.updateItem(editingItem.value.id, payload, imageFile)
        } else {
          response = await ItemService.createItem(payload, imageFile)
        }

        if (response?.data?.success) {
          const wasEdit = !!editingItem.value
          const data = response.data.data
          if (wasEdit && previousId && data?.id && String(previousId) !== String(data.id)) {
            state.removeItemFromCache(previousId)
          }
          state.addItemCache(data)
          if (data?.id && data?.image) state.addItemImageCache(data.id, data.image)
          else if (data?.id && imageFile) state.invalidateItemImageCache(data.id)

          const newCategoryId = data?.categoryId ?? itemForm.value.categoryId
          if (!wasEdit) {
            state.adjustCategoryCount(newCategoryId, +1)
          } else if (String(previousCategoryId ?? '') !== String(newCategoryId ?? '')) {
            state.adjustCategoryCount(previousCategoryId, -1)
            state.adjustCategoryCount(newCategoryId, +1)
          }

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
          const cached = state.getItem(itemId)
          const categoryId = cached?.categoryId
          const response = await ItemService.deleteItem(itemId)
          if (response?.data?.success) {
            state.removeItemFromCache(itemId)
            state.adjustCategoryCount(categoryId, -1)
            $notification($t('itemDeleted'), 'success')
          } else {
            $notification($t('itemDeleteFailed'), 'error')
          }
        } catch (error) {
          $notification(error?.response?.data?.message || $t('errorDeletingItem'), 'error')
        }
      }
    }

    const initAddItemsPage = async () => {
      if (!state.itemsCacheBootstrapped) {
        await state.bootstrapItemsCache()
      }
      await state.loadItemsPageFromDb({ categoryId: cat.value || 'all', reset: true })
    }

    onMounted(() => {
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
      void initAddItemsPage()
    })

    onUnmounted(() => {
      clearTimeout(searchTimer)
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateViewportWidth)
      }
      if (categoriesContainerRef.value && categoriesContainerRef.value._wheelHandler) {
        categoriesContainerRef.value.removeEventListener('wheel', categoriesContainerRef.value._wheelHandler)
      }
    })

    return {
      lang,
      categorySelectOptions,
      categorySelectError,
      onCategorySelectSearch,
      cat,
      search,
      categoriesContainerRef,
      scrollSentinelRef,
      categories,
      totalItemCount,
      filtered,
      itemsLoading,
      categoryDialog,
      itemDialog,
      barcodeCaptureDialog,
      barcodeCaptureRef,
      barcodeFieldDisabled,
      editingCategory,
      editingItem,
      categoryForm,
      itemForm,
      categoryFormRef,
      itemFormRef,
      requiredRule,
      getBuyingPriceDisplayValue,
      getSellingPriceDisplayValue,
      onBuyingPriceInput,
      validateBuyingPrice,
      onSellingPriceInput,
      validateSellingPrice,
      buyingPriceError,
      sellingPriceError,
      isBuyingDollar,
      isSellingDollar,
      toggleBuyingCurrency,
      toggleSellingCurrency,
      handleEditItem,
      handleDeleteItem,
      handleEditCategory,
      handleDeleteCategory,
      price,
      openCategoryDialog,
      closeCategoryDialog,
      saveCategory,
      openItemDialog,
      closeItemDialog,
      saveItem,
      itemImagePreview,
      itemImageInputRef,
      itemImageCaptureRef,
      triggerItemImagePick,
      triggerItemImageCapture,
      onItemImageFileChange,
      removeItemImage,
      handleGenerateBarcode,
      openBarcodeCaptureDialog,
      applyScannedBarcode,
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
.m-items {
  --oil-ink: #16363a;
  --oil-muted: #5f7a7e;
  --oil-line: rgba(25, 119, 131, 0.16);
  --oil-teal: #197783;
  --oil-teal-bright: #20b4c6;
  background: transparent;
}

.m-items__header {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.85rem;
  margin-bottom: 1rem;
}

.m-items__title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--oil-ink);
  letter-spacing: -0.02em;
  text-align: start;
}

.m-items__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.m-items__action-btn {
  flex: 1 1 auto;
  min-width: calc(50% - 0.3rem);
  border-radius: 12px !important;
  font-weight: 700 !important;
  text-transform: none !important;
  background-image: linear-gradient(135deg, #197783, #20b4c6) !important;
  color: #fff !important;
  box-shadow: 0 6px 14px rgba(25, 119, 131, 0.22);
  min-height: 2.75rem;
}

.m-items__cats {
  display: flex;
  gap: 0.7rem;
  padding: 0.1rem 0 1rem;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x proximity;
}

.m-items__cats::-webkit-scrollbar {
  display: none;
}

.m-cat {
  flex: 0 0 auto;
  width: 8.75rem;
  min-height: 6.4rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  padding: 0.85rem 0.85rem 0.75rem;
  border: 1px solid var(--oil-line);
  border-radius: 18px;
  background: #fff;
  color: var(--oil-ink);
  cursor: pointer;
  scroll-snap-align: start;
  box-shadow: 0 6px 16px rgba(13, 42, 46, 0.06);
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s, transform 0.15s;
  text-align: start;
  position: relative;
}

.m-cat:active {
  transform: scale(0.98);
}

.m-cat--active {
  border-color: rgba(25, 119, 131, 0.45);
  background: linear-gradient(160deg, rgba(25, 119, 131, 0.12), rgba(42, 212, 232, 0.16));
  box-shadow: 0 10px 22px rgba(25, 119, 131, 0.16);
}

.m-cat__icon {
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(25, 119, 131, 0.1);
  color: var(--oil-teal);
  margin-bottom: 0.25rem;
}

.m-cat--active .m-cat__icon {
  background: linear-gradient(135deg, #197783, #2ad4e8);
  color: #fff;
}

.m-cat__name {
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1.25;
  color: var(--oil-ink);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m-cat--active .m-cat__name {
  color: var(--oil-teal);
}

.m-cat__count {
  font-size: 0.72rem;
  font-weight: 650;
  color: var(--oil-muted);
}

.m-cat--active .m-cat__count {
  color: var(--oil-teal);
}

.m-cat--editable {
  padding-bottom: 2.65rem;
}

.m-cat__actions {
  position: absolute;
  inset-inline-start: 0.55rem;
  inset-inline-end: 0.55rem;
  bottom: 0.55rem;
  display: flex;
  gap: 0.35rem;
}

.m-cat__btn {
  flex: 1;
  height: 1.9rem;
  border: 1px solid var(--oil-line);
  border-radius: 9px;
  background: #f7fbfc;
  color: var(--oil-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.m-cat__btn--edit:active {
  background: rgba(25, 119, 131, 0.14);
  color: var(--oil-teal);
  border-color: rgba(25, 119, 131, 0.35);
}

.m-cat__btn--delete:active {
  background: #fee2e2;
  color: #dc2626;
  border-color: #ef4444;
}

.m-items__search {
  margin-bottom: 0.85rem;
}

.m-items__search-field :deep(.v-field) {
  border-radius: 14px;
  background: #fff;
}

.m-items__search-field :deep(.v-field__outline) {
  --v-field-border-opacity: 0.12;
}

.m-items__search-field :deep(.v-field__input) {
  min-height: 2.75rem;
  font-size: 1rem;
}

.m-items__grid-wrap {
  min-height: 12rem;
}

.m-items__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.m-items__grid--rtl {
  direction: rtl;
}

.m-items__empty {
  text-align: center;
  padding: 2.5rem 1rem;
  margin-top: 0.75rem;
  color: var(--oil-muted);
  font-style: italic;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 16px;
  border: 1px dashed var(--oil-line);
}

/* Fullscreen forms */
.m-form {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #eef5f6;
  color: var(--oil-ink);
}

.m-form__body {
  flex: 1;
  overflow-y: auto;
  padding: 0.95rem 0.9rem 1rem;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.m-form__card {
  background: #fff;
  border: 1px solid var(--oil-line);
  border-radius: 18px;
  padding: 0.85rem 0.9rem 0.35rem;
  box-shadow: 0 6px 16px rgba(13, 42, 46, 0.05);
}

.m-form__field {
  margin-bottom: 0.7rem;
}

.m-form__field--last {
  margin-bottom: 0.85rem;
}

.m-form__label {
  display: block;
  font-size: 0.78rem;
  font-weight: 750;
  color: var(--oil-muted);
  margin-bottom: 0.3rem;
  text-align: start;
}

.m-form__label .req {
  color: #ef4444;
}

.m-form__input :deep(.v-field) {
  border-radius: 12px;
  background: #f8fcfd;
}

.m-form__input :deep(.v-field__input) {
  min-height: 2.75rem;
  font-size: 1rem;
}

.m-form__footer {
  display: flex;
  flex-direction: row;
  gap: 0.75rem;
  padding: 0.85rem 1rem calc(0.85rem + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid var(--oil-line);
  flex-shrink: 0;
}

.m-form__btn {
  flex: 1;
  min-height: 3.1rem;
  border: none;
  border-radius: 14px;
  font-weight: 750;
  font-size: 0.98rem;
  cursor: pointer;
  color: #fff;
}

.m-form__btn--save {
  background-image: linear-gradient(135deg, #0f5a63, #197783 50%, #2ad4e8);
  box-shadow: 0 8px 18px rgba(25, 119, 131, 0.24);
}

.m-barcode {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 0.45rem;
}

.m-barcode__field {
  flex: 1;
  min-width: 0;
}

.m-barcode__icons {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding-top: 0.2rem;
}

.m-barcode__btn {
  width: 2.75rem;
  height: 2.75rem;
  border: 1px solid var(--oil-line);
  border-radius: 12px;
  background: #fff;
  color: var(--oil-teal);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.m-price {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 0.45rem;
}

.m-price__input-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}

.m-price__input {
  width: 100%;
  min-height: 2.75rem;
  padding: 0.65rem 0.85rem;
  font-size: 1rem;
  border: 1px solid rgba(25, 119, 131, 0.2);
  border-radius: 12px;
  background: #fff;
  outline: none;
  appearance: textfield;
  -moz-appearance: textfield;
}

.m-price__input::-webkit-outer-spin-button,
.m-price__input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.m-price__input:focus {
  border-color: #197783;
  box-shadow: 0 0 0 3px rgba(32, 180, 198, 0.18);
}

.m-price__input--error {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.18) !important;
}

.m-price__error {
  color: #ef4444;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.m-price__unit {
  flex-shrink: 0;
  min-width: 3.5rem;
  height: 2.75rem;
  padding: 0 0.65rem;
  border: 1px solid rgba(25, 119, 131, 0.25);
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff, #f0fbfc);
  color: #197783;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
}

.hidden-file-input {
  display: none;
}

.m-image-zone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  width: 100%;
  min-height: 12.5rem;
  padding: 1rem;
  border: 2px dashed rgba(25, 119, 131, 0.3);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.65);
  aspect-ratio: 3 / 2;
}

.m-image-zone.has-image {
  padding: 0;
  border-style: solid;
  border-color: rgba(25, 119, 131, 0.2);
  overflow: hidden;
}

.m-image-zone.image-error {
  border-color: #dc2626;
}

.m-image-zone__text {
  font-size: 0.9rem;
  font-weight: 600;
  color: #334155;
  text-align: center;
}

.m-image-zone.image-error .m-image-zone__text {
  color: #dc2626;
}

.m-image-zone__preview {
  width: 100%;
  height: 100%;
}

.m-image-zone__actions {
  position: absolute;
  top: 0.4rem;
  inset-inline-end: 0.4rem;
  display: flex;
  gap: 0.35rem;
  z-index: 2;
}

.m-image-zone__btn {
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  color: #6b7280;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.m-image-zone__btn--delete {
  color: #dc2626;
}

.m-image-zone__pickers {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  width: 100%;
  max-width: 16rem;
}

.m-image-zone__picker {
  width: 100%;
  min-height: 2.6rem;
  border: none;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  background: linear-gradient(135deg, #0f5a63, #197783 50%, #2ad4e8);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 800;
  cursor: pointer;
}

.m-image-zone__picker--ghost {
  background: #fff;
  color: #197783;
  border: 1px solid rgba(25, 119, 131, 0.28);
}

.m-image-preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  padding: 2rem;
  background: rgba(0, 0, 0, 0.92);
}

.m-image-preview__close {
  position: absolute;
  top: 1rem;
  inset-inline-end: 1rem;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  color: #334155;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
}

.price-field-no-arrows :deep(input[type='number'])::-webkit-outer-spin-button,
.price-field-no-arrows :deep(input[type='number'])::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.price-field-no-arrows :deep(input[type='number']) {
  -moz-appearance: textfield;
  appearance: textfield;
}

.m-items__scroll-sentinel {
  width: 100%;
  height: 1px;
}

.m-items__loading {
  text-align: center;
  padding: 0.85rem 0.5rem 1.25rem;
  color: var(--oil-muted);
  font-size: 0.9rem;
}
</style>

<style>
.m-form-overlay.v-overlay__content,
.v-overlay__content.m-form-overlay {
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
}

.m-cropper-dialog.v-overlay__content,
.v-overlay__content.m-cropper-dialog {
  border-radius: 15px !important;
  overflow: hidden;
}

.m-image-preview-modal.v-overlay__content,
.v-overlay__content.m-image-preview-modal {
  background: transparent !important;
  box-shadow: none !important;
}
</style>
