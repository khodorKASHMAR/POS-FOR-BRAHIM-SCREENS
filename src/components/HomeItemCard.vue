<template>
  <v-card
    class="item-card"
    :class="{ 'cursor-pointer': clickable, 'hoverable': clickable, 'with-actions': showActions }"
    :ripple="clickable"
    @click="handleClick"
    elevation="2"
  >
    <!-- Item Image -->
    <div class="item-image-container">
      <v-img
        v-if="imageSrc"
        :src="imageSrc"
        :alt="itemName"
        cover
        class="item-image"
      />
      <div v-else class="item-image-placeholder">
        <v-icon class="placeholder-icon" color="grey-lighten-1">mdi-image-off</v-icon>
      </div>
    </div>

    <!-- Item Info -->
    <v-card-text class="item-info">
      <!-- Item Name -->
      <div class="item-name" :class="lang.dir === 'rtl' ? 'text-left' : 'text-left'">
        {{ itemName }}
      </div>

      <!-- Price and Category Tag -->
      <div class="d-flex flex-column w-100">
        <!-- Price -->
        <div class="item-price" :class="lang.dir === 'rtl' ? 'align-self-end' : 'align-self-end'">
          {{ formattedPrice }}
        </div>

        <!-- Category Tag -->
        <v-chip
          v-if="displayCategory"
          :color="categoryColor"
          size="small"
          variant="flat"
          class="category-tag"
          :class="lang.dir === 'rtl' ? 'align-self-start' : 'align-self-start'"
        >
          {{ displayCategory }}
        </v-chip>
      </div>
    </v-card-text>

    <div v-if="showActions" class="item-actions">
      <!-- TODO: refactor tooltip -->
      <div class="group action-tooltip-wrapper">
        <button
          class="action-btn edit-btn"
          :title="$t('editItem')"
          @click.stop="handleEdit"
        >
          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
        <!-- <div class="action-tooltip">{{ $t('editItem') }}</div> -->
      </div>
      <!-- TODO: refactor tooltip -->
      <div class="group action-tooltip-wrapper">
        <button
          class="action-btn delete-btn"
          :title="$t('delete')"
          @click.stop="handleDelete"
        >
          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
        <!-- <div class="action-tooltip">{{ $t('delete') }}</div> -->
      </div>
    </div>
  </v-card>
</template>

<script>
import { computed } from 'vue'
import { useState } from '../store/state'

export default {
  name: 'HomeItemCard',
  props: {
    // Item object (contains all item data)
    item: {
      type: Object,
      required: true
    },
    // Category color (optional, defaults to light blue)
    categoryColor: {
      type: String,
      default: 'light-blue-lighten-4'
    },
    // Whether card is clickable
    clickable: {
      type: Boolean,
      default: true
    },
    showActions: {
      type: Boolean,
      default: false
    }
  },
  emits: ['click', 'edit', 'delete'],
  setup(props, { emit }) {
    const state = useState()    
    const lang = computed(() => ({
      lang: state.lang,
      dir: state.dir
    }))

    const itemName = computed(() => {
          if (!props.item) return ''
      return lang.value.lang === 'ar' 
        ? (props.item.nameAr || props.item.nameEn) 
        : (props.item.nameEn || props.item.nameAr)
    })

    // Display category from item's categoryNameAr/categoryNameEn
    const displayCategory = computed(() => {
      if (!props.item) return ''
      return lang.value.lang === 'ar' 
        ? (props.item.categoryNameAr || props.item.categoryNameEn || '')
        : (props.item.categoryNameEn || props.item.categoryNameAr || '')
    })

    const formattedPrice = computed(() => {
      if (!props.item) return '0'
      // Calculate price from UserItemDTO: sellingPriceDollar
      const sellingPriceDollar = Number(props.item.sellingPriceDollar ?? 0)
      const exchangeRate = state.exchangeRate
      const priceValue = state.currency === 'USD' ? sellingPriceDollar : sellingPriceDollar * exchangeRate
      
      if (!priceValue && priceValue !== 0) return '0'
      
      let formattedValue
      let currencySymbol
      
      if (state.currency === 'LBP') {
        formattedValue = Math.round(priceValue).toLocaleString('en-US')
        currencySymbol = state.lang === 'ar' ? 'ل.ل.' : 'LBP'
      } else {
        formattedValue = priceValue.toFixed(2)
        currencySymbol = state.lang === 'ar' ? 'دولار' : 'USD'
      }
      
      return `${formattedValue} ${currencySymbol}`
    })

    const imageSrc = computed(() => {
      if (!props.item?.image) return null
      const image = props.item.image
      // Check if it's already a data URL or base64
      if (image.startsWith('data:image')) {
        return image
      }
      // If it's base64 without data URL prefix, add it
      if (image.startsWith('/9j/') || image.startsWith('iVBORw0KGgo')) {
        // JPEG or PNG base64
        const prefix = image.startsWith('/9j/') ? 'data:image/jpeg;base64,' : 'data:image/png;base64,'
        return prefix + image
      }
      // Assume it's a regular URL
      return image
    })

    const handleClick = () => {
      if (props.clickable) {
        emit('click')
      }
    }

    const handleEdit = () => {
      emit('edit')
    }

    const handleDelete = () => {
      emit('delete')
    }

    return {
      lang,
      itemName,
      displayCategory,
      formattedPrice,
      imageSrc,
      handleClick,
      handleEdit,
      handleDelete
    }
  }
}
</script>

<style scoped>
.item-card {
  width: calc(100% - 0.5rem);
  height: auto;
  border-radius: 0.75rem;
  overflow: visible;
  transition: all 0.3s ease;
  background: white;
  display: flex;
  flex-direction: column;
  margin: 0 auto;
}

.item-card.hoverable:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.item-image-container {
  width: calc(100% - 1.5rem);
  aspect-ratio: 3 / 2;
  flex-shrink: 0;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  margin-right: auto;
  margin-top: 0.5rem;
  margin-bottom: 0.2rem;
  background: #f5f5f5;
  overflow: hidden;
  box-sizing: border-box;
}

.item-image-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  box-sizing: border-box;
}

.item-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-icon {
  font-size: clamp(2rem, 35%, 4rem);
  width: clamp(2rem, 35%, 4rem);
  height: clamp(2rem, 35%, 4rem);
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 0.125rem;
  padding: 0.25rem 0.5rem 0.375rem !important;
}

.item-info :deep(.d-flex.flex-column) {
  gap: 0.125rem;
}

.item-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.1;
  min-height: unset;
  margin-bottom: 0;
  display: flex;
  align-items: center;
}

.item-name.text-left {
  justify-content: flex-start;
}

.item-name.text-right {
  justify-content: flex-end;
}

.category-tag {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.0625rem 0.35rem;
  border-radius: 1rem;
  margin-top: 0;
  margin-bottom: 0;
}

.category-tag.v-chip {
  background: linear-gradient(90deg, #b3e5fc 0%, #e1f5fe 50%, #e3f2fd 100%) !important;
  color: #0277bd !important;
  box-shadow: 0 2px 6px rgba(79, 195, 247, 0.25), inset 0 1px 2px rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.6);
  height: auto !important;
  min-height: 1.25rem;
}

.category-tag.v-chip :deep(.v-chip__underlay) {
  display: none !important;
}

.category-tag.v-chip :deep(.v-chip__content) {
  color: #050d1b !important;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.6);
}

.item-price {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.1;
}

.item-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.375rem;
  padding: 0.125rem 0.5rem 0.375rem;
}

.action-tooltip-wrapper {
  position: relative;
  display: inline-flex;
}

.action-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 0.5rem;
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

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 0;
}

.action-btn:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #374151;
}

.edit-btn:hover {
  background: #d1fae5;
  border-color: #00ae8b;
  color: #065f46;
}

.delete-btn:hover {
  background: #fee2e2;
  border-color: #ef4444;
  color: #dc2626;
}

.action-icon {
  width: 14px;
  height: 14px;
}

.action-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 174, 139, 0.1);
}

/* RTL Support */
[dir="rtl"] .item-card {
  direction: rtl;
}

[dir="rtl"] .item-info {
  text-align: right;
}

[dir="rtl"] .category-tag {
  order: 2;
}

[dir="rtl"] .item-price {
  order: 1;
  text-align: left;
}

[dir="ltr"] .item-info {
  text-align: left;
}
</style>

