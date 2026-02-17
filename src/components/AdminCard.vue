<template>
  <v-card
    class="item-card"
    :class="{ 'cursor-pointer': clickable }"
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
    <v-card-text class="item-info pt-1 px-2">
      <!-- Item Name -->
      <div class="item-name" :class="lang.dir === 'rtl' ? 'text-right' : 'text-left'">
        {{ itemName }}
      </div>

      <!-- Category Tag and Price -->
      <div class="d-flex align-center" :class="lang.dir === 'rtl' ? 'flex-row-reverse justify-space-between' : 'justify-space-between'">
        <!-- Category Tag -->
        <v-chip
          v-if="category"
          :color="categoryColor"
          size="small"
          variant="flat"
          class="category-tag"
        >
          {{ category }}
        </v-chip>
        <div v-else></div>

        <!-- Price -->
        <div class="item-price">
          {{ formattedPrice }}
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { computed } from 'vue'
import { useState } from '../store/state'

export default {
  name: 'AdminCard',
  props: {
    // Item data
    nameAr: {
      type: String,
      default: ''
    },
    nameEn: {
      type: String,
      default: ''
    },
    price: {
      type: [Number, String],
      required: true
    },
    category: {
      type: String,
      default: ''
    },
    image: {
      type: String,
      default: null
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
    }
  },
  emits: ['click'],
  setup(props, { emit }) {
    const state = useState()
    const lang = computed(() => ({
      lang: state.lang,
      dir: state.dir
    }))

    const itemName = computed(() => {
      return lang.value.lang === 'ar' 
        ? (props.nameAr || props.nameEn) 
        : (props.nameEn || props.nameAr)
    })

    const formattedPrice = computed(() => {
      const priceValue = typeof props.price === 'string' ? parseFloat(props.price) : props.price
      const currency = state.currency === 'USD' ? 'USD' : 'LBP'
      
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: currency === 'USD' ? 2 : 0,
        maximumFractionDigits: currency === 'USD' ? 2 : 0
      }).format(priceValue)
    })

    const imageSrc = computed(() => {
      if (!props.image) return null
      // Check if it's already a data URL or base64
      if (props.image.startsWith('data:image')) {
        return props.image
      }
      // If it's base64 without data URL prefix, add it
      if (props.image.startsWith('/9j/') || props.image.startsWith('iVBORw0KGgo')) {
        // JPEG or PNG base64
        const prefix = props.image.startsWith('/9j/') ? 'data:image/jpeg;base64,' : 'data:image/png;base64,'
        return prefix + props.image
      }
      // Assume it's a regular URL
      return props.image
    })

    const handleClick = () => {
      if (props.clickable) {
        emit('click')
      }
    }

    return {
      lang,
      itemName,
      formattedPrice,
      imageSrc,
      handleClick
    }
  }
}
</script>

<style scoped>
.item-card {
  width: 100%;
  height: 20rem;
  min-height: 20rem;
  border-radius: 0.75rem;
  overflow: hidden;
  transition: all 0.3s ease;
  background: white;
  display: flex;
  flex-direction: column;
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.item-image-container {
  width: calc(100% - 0.5rem);
  height: 100%;
  border-radius: 0.75rem;
  margin-left: 0.25rem;
  margin-right: 0.25rem;
  margin-top: 0.25rem;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
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
  min-height: 2.5rem;
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

/* RTL Support */
[dir="rtl"] .item-card {
  direction: rtl;
}

[dir="rtl"] .item-info {
  text-align: right;
}

[dir="ltr"] .item-info {
  text-align: left;
}
</style>

