<template>
  <v-card
    class="item-card"
    :class="{ 'cursor-pointer': clickable, 'hoverable': clickable, 'with-actions': showActions }"
    :ripple="clickable"
    @click="handleClick"
    elevation="0"
  >
    <div class="item-media">
      <v-img
        v-if="imageSrc"
        :src="imageSrc"
        :alt="itemName"
        cover
        class="item-image"
      />
      <div v-else class="item-image-placeholder">
        <v-icon class="placeholder-icon">mdi-package-variant</v-icon>
      </div>

      <div class="item-media-fade" aria-hidden="true"></div>

      <v-chip
        v-if="displayCategory"
        :color="categoryColor"
        size="x-small"
        variant="flat"
        class="category-tag"
        :class="lang.dir === 'rtl' ? 'category-tag-rtl' : 'category-tag-ltr'"
      >
        {{ displayCategory }}
      </v-chip>
    </div>

    <v-card-text class="item-info" :class="{ 'item-info-with-actions': showActions }">
      <div class="item-text">
        <div
          class="item-name"
          :class="lang.dir === 'rtl' ? 'text-right' : 'text-left'"
        >
          {{ itemName }}
        </div>
        <div
          class="item-price"
          :class="lang.dir === 'rtl' ? 'text-right' : 'text-left'"
        >
          {{ formattedPrice }}
        </div>
      </div>

      <div v-if="showActions" class="item-actions" @click.stop>
        <div class="group action-tooltip-wrapper">
          <button
            type="button"
            class="action-btn edit-btn"
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
          <div class="action-tooltip">{{ $t('editItem') }}</div>
        </div>
        <div class="group action-tooltip-wrapper">
          <button
            type="button"
            class="action-btn delete-btn"
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
          <div class="action-tooltip">{{ $t('delete') }}</div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { computed } from 'vue'
import { useState } from '../store/state'

export default {
  name: 'HomeItemCard',
  props: {
    item: {
      type: Object,
      required: true
    },
    categoryColor: {
      type: String,
      default: 'light-blue-lighten-4'
    },
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

    const displayCategory = computed(() => {
      if (!props.item) return ''
      return lang.value.lang === 'ar'
        ? (props.item.categoryNameAr || props.item.categoryNameEn || '')
        : (props.item.categoryNameEn || props.item.categoryNameAr || '')
    })

    const formattedPrice = computed(() => {
      if (!props.item) return '0'
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
      if (image.startsWith('data:image')) {
        return image
      }
      if (image.startsWith('/9j/') || image.startsWith('iVBORw0KGgo')) {
        const prefix = image.startsWith('/9j/') ? 'data:image/jpeg;base64,' : 'data:image/png;base64,'
        return prefix + image
      }
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
  --oil-ink: #16363a;
  --oil-muted: #5f7a7e;
  --oil-line: rgba(25, 119, 131, 0.16);
  --oil-teal: #197783;
  --oil-teal-bright: #20b4c6;
  width: 100%;
  height: auto;
  border-radius: 14px;
  overflow: hidden;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  margin: 0;
  border: 1px solid rgba(25, 119, 131, 0.1);
  box-shadow: 0 4px 12px rgba(22, 54, 58, 0.05);
}

.item-card.with-actions {
  overflow: visible;
  position: relative;
  z-index: 1;
}

.item-card.with-actions:hover,
.item-card.with-actions:focus-within {
  z-index: 80;
}

.item-card.with-actions .item-media {
  border-radius: 14px 14px 0 0;
}

.item-card.hoverable:hover {
  transform: translateY(-3px) scale(1.01);
  box-shadow: 0 14px 28px rgba(22, 54, 58, 0.12);
  border-color: rgba(32, 180, 198, 0.4);
}

.item-card.hoverable:hover .item-image {
  transform: scale(1.04);
}

.item-media {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  flex-shrink: 0;
  overflow: hidden;
  background: linear-gradient(145deg, #f6fafb, #fcfefe);
}

.item-media-fade {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 42%;
  pointer-events: none;
  background: linear-gradient(180deg, transparent 0%, rgba(22, 54, 58, 0.1) 100%);
}

.item-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b7c9cd;
}

.item-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
}

.placeholder-icon {
  font-size: clamp(1.4rem, 28%, 2.5rem);
  width: clamp(1.4rem, 28%, 2.5rem);
  height: clamp(1.4rem, 28%, 2.5rem);
  color: #b7c9cd !important;
}

.category-tag {
  position: absolute;
  bottom: 0.4rem;
  z-index: 2;
  font-size: 0.62rem !important;
  font-weight: 700 !important;
  letter-spacing: 0.02em;
  max-width: calc(100% - 0.8rem);
  margin: 0 !important;
}

.category-tag-ltr {
  left: 0.4rem;
}

.category-tag-rtl {
  right: 0.4rem;
}

.category-tag.v-chip {
  background: rgba(255, 255, 255, 0.92) !important;
  color: var(--oil-teal) !important;
  box-shadow: 0 2px 8px rgba(22, 54, 58, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.7);
  height: auto !important;
  min-height: 1.05rem !important;
  padding: 0 0.4rem !important;
  backdrop-filter: blur(6px);
}

.category-tag.v-chip :deep(.v-chip__underlay) {
  display: none !important;
}

.category-tag.v-chip :deep(.v-chip__content) {
  color: var(--oil-teal) !important;
  text-shadow: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.62rem;
  line-height: 1.05rem;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.4rem 0.55rem 0.5rem !important;
  overflow: visible;
  position: relative;
  z-index: 2;
}

.item-info-with-actions {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
}

.item-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.item-name {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--oil-ink);
  line-height: 1.2;
  margin: 0;
  display: -webkit-box;
  line-clamp: 1;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-name.text-left {
  text-align: left;
}

.item-name.text-right {
  text-align: right;
}

.item-price {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--oil-teal);
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
}

.item-price.text-left {
  text-align: left;
}

.item-price.text-right {
  text-align: right;
}

.item-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
  flex-shrink: 0;
  padding: 0;
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
  margin-top: 0.4rem;
  padding: 0.35rem 0.55rem;
  background: #0f172a;
  border-radius: 8px;
  font-size: 0.7rem;
  color: #ffffff;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.15s ease;
  z-index: 200;
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
  border: 1px solid var(--oil-line);
  border-radius: 9px;
  background: #fff;
  color: var(--oil-muted);
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 0;
}

.action-btn:hover {
  background: #f2f9fa;
  border-color: rgba(32, 180, 198, 0.4);
  color: var(--oil-ink);
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
  box-shadow: 0 0 0 3px rgba(32, 180, 198, 0.15);
}

[dir="rtl"] .item-card {
  direction: rtl;
}

[dir="rtl"] .item-actions {
  justify-content: flex-start;
}
</style>
