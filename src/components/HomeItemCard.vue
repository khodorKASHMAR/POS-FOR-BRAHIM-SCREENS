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
    <v-card-text class="item-info pt-0 px-2">
      <!-- Item Name -->
      <div class="item-name" :class="lang.dir === 'rtl' ? 'text-left' : 'text-left'">
        {{ itemName }}
      </div>

      <!-- Category Tag and Price -->
      <div class="d-flex align-center" :class="lang.dir === 'rtl' ? 'flex-row-reverse justify-space-between' : 'justify-space-between'">
        <!-- Category Tag -->
        <v-chip
          v-if="displayCategory"
          :color="categoryColor"
          size="small"
          variant="flat"
          class="category-tag"
        >
          {{ displayCategory }}
        </v-chip>
        <div v-else></div>

        <!-- Price -->
        <div class="item-price">
          {{ formattedPrice }}
        </div>
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
    // Category color (optional, defaults to pink)
    categoryColor: {
      type: String,
      default: 'pink-lighten-4'
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
  height: 14rem;
  min-height: 14rem;
  border-radius: 0.75rem;
  overflow: visible;
  transition: all 0.3s ease;
  background: white;
  display: flex;
  flex-direction: column;
  margin: 0 auto;
}

.item-card.with-actions {
  height: 16rem;
  min-height: 16rem;
}

.item-card.hoverable:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.item-image-container {
  width: calc(100% - 1.5rem);
  height: calc(100% - 1rem);
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
  width: calc(100% - 2rem);
  height: calc(100% - 2rem);
  border-radius: 0.75rem;
  margin: 1rem;
  margin-right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  box-sizing: border-box;
}

.item-image {
  width: 100%;
  object-fit: cover;
}

.placeholder-icon {
  font-size: 4rem;
  width: 4rem;
  height: 4rem;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.item-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.4;
  min-height: 2rem;
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
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
}

.item-price {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a1a;
}

.item-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0 0.8rem 0.5rem;
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
  width: 32px;
  height: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 0 2px;
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
  width: 16px;
  height: 16px;
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

