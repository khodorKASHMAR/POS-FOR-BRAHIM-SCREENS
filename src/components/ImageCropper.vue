<template>
  <div class="image-cropper-container" :dir="dir">
    <div class="cropper-header" :class="{ 'text-right': dir === 'rtl' }">
      {{ $t('cropImage') }}
    </div>
    
    <div class="cropper-body">
      <div class="cropper-wrapper">
        <vue-cropper
          ref="cropperRef"
          :src="imageSrc"
          :aspect-ratio="aspectRatio"
          :view-mode="1"
          :drag-mode="'move'"
          :auto-crop-area="0.8"
          :background="false"
          :movable="true"
          :rotatable="true"
          :scalable="true"
          :zoomable="true"
          :zoom-on-wheel="true"
          :crop-box-movable="true"
          :crop-box-resizable="true"
          :guides="true"
          :center="true"
          :highlight="true"
          :min-crop-box-width="50"
          :min-crop-box-height="50"
          class="cropper-instance"
        />
      </div>
      
      <div class="cropper-controls">
        <div class="rotate-controls">
          <button type="button" class="control-btn" @click="rotateLeft" :title="$t('rotateLeft')">
            <v-icon size="small">mdi-rotate-left</v-icon>
          </button>
          <button type="button" class="control-btn" @click="rotateRight" :title="$t('rotateRight')">
            <v-icon size="small">mdi-rotate-right</v-icon>
          </button>
        </div>
        <div class="controls-divider"></div>
        <div class="zoom-controls">
          <button type="button" class="control-btn" @click="zoomOut" :title="$t('zoomOut')">
            <v-icon size="small">mdi-minus</v-icon>
          </button>
          <div class="zoom-slider-wrapper">
            <input
              type="range"
              v-model="zoomLevel"
              min="-1"
              max="1"
              step="0.1"
              class="zoom-slider"
              @input="onZoomSliderChange"
            />
          </div>
          <button type="button" class="control-btn" @click="zoomIn" :title="$t('zoomIn')">
            <v-icon size="small">mdi-plus</v-icon>
          </button>
        </div>
      </div>
    </div>
    
    <div class="cropper-actions" :class="dir === 'rtl' ? 'cropper-actions-rtl' : ''">
      <button type="button" class="cropper-action-btn cropper-cancel-btn" @click="onCancel">
        {{ $t('cancel') }}
      </button>
      <button type="button" class="cropper-action-btn cropper-confirm-btn" @click="onConfirm">
        {{ $t('confirm') }}
      </button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue'
import VueCropper from 'vue-cropperjs'
import 'vue-cropperjs/node_modules/cropperjs/dist/cropper.css'

export default {
  name: 'ImageCropper',
  components: {
    VueCropper
  },
  props: {
    imageSrc: {
      type: String,
      required: true
    },
    dir: {
      type: String,
      default: 'ltr'
    },
    outputType: {
      type: String,
      default: 'blob',
      validator: (value) => ['blob', 'base64'].includes(value)
    },
    outputQuality: {
      type: Number,
      default: 0.9
    },
    aspectRatio: {
      type: Number,
      default: 1.5
    },
    outputWidth: {
      type: Number,
      default: 768
    }
  },
  emits: ['confirm', 'cancel'],
  setup(props, { emit }) {
    const cropperRef = ref(null)
    const zoomLevel = ref(1)

    const getCropper = () => {
      return cropperRef.value?.cropper
    }

    const zoomIn = () => {
      const cropper = getCropper()
      if (cropper) {
        cropper.zoom(0.1)
        zoomLevel.value = Math.min(3, zoomLevel.value + 0.1)
      }
    }

    const zoomOut = () => {
      const cropper = getCropper()
      if (cropper) {
        cropper.zoom(-0.1)
        zoomLevel.value = Math.max(0.1, zoomLevel.value - 0.1)
      }
    }

    const rotateLeft = () => {
      const cropper = getCropper()
      if (cropper) {
        cropper.rotate(-90)
      }
    }

    const rotateRight = () => {
      const cropper = getCropper()
      if (cropper) {
        cropper.rotate(90)
      }
    }

    const onZoomSliderChange = () => {
      const cropper = getCropper()
      if (cropper) {
        const imageData = cropper.getImageData()
        const currentZoom = imageData.width / imageData.naturalWidth
        const zoomDiff = zoomLevel.value - currentZoom
        cropper.zoom(zoomDiff)
      }
    }

    const onConfirm = () => {
      const cropper = getCropper()
      if (!cropper) return

      const canvas = cropper.getCroppedCanvas({
        width: props.outputWidth,
        height: Math.round(props.outputWidth / props.aspectRatio),
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      })

      if (!canvas) return

      if (props.outputType === 'base64') {
        const base64 = canvas.toDataURL('image/jpeg', props.outputQuality)
        emit('confirm', base64)
      } else {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              emit('confirm', blob)
            }
          },
          'image/jpeg',
          props.outputQuality
        )
      }
    }

    const onCancel = () => {
      emit('cancel')
    }

    watch(() => props.imageSrc, () => {
      zoomLevel.value = 1
    })

    return {
      cropperRef,
      zoomLevel,
      zoomIn,
      zoomOut,
      rotateLeft,
      rotateRight,
      onZoomSliderChange,
      onConfirm,
      onCancel
    }
  }
}
</script>

<style scoped>
.image-cropper-container {
  background: #ffffff;
  border-radius: 15px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.cropper-header {
  padding: 12px 20px;
  font-size: 1.1rem;
  font-weight: 600;
  border-bottom: 1px solid #e5e7eb;
}

.cropper-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  overflow: hidden;
}

.cropper-wrapper {
  width: 100%;
  height: 50vh;
  min-height: 300px;
  max-height: 500px;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
}

.cropper-instance {
  width: 100%;
  height: 100%;
}

.cropper-instance :deep(.cropper-container) {
  width: 100% !important;
  height: 100% !important;
}

.cropper-instance :deep(.cropper-crop-box) {
  border: 2px solid #2293a1;
}

.cropper-instance :deep(.cropper-view-box) {
  outline: 1px solid rgba(34, 147, 161, 0.75);
  outline-color: rgba(34, 147, 161, 0.75);
}

.cropper-instance :deep(.cropper-line) {
  background-color: #2293a1;
}

.cropper-instance :deep(.cropper-point) {
  background-color: #2293a1;
  width: 10px;
  height: 10px;
}

.cropper-instance :deep(.cropper-point.point-se) {
  width: 12px;
  height: 12px;
}

.cropper-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 8px 16px;
  background: #f5f5f5;
  border-radius: 8px;
}

.rotate-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.controls-divider {
  width: 1px;
  height: 24px;
  background: #d1d5db;
  margin: 0 4px;
}

.control-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #2293a1;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: #e8f4f5;
  border-color: #2293a1;
}

.control-btn:active {
  transform: scale(0.95);
}

.zoom-slider-wrapper {
  flex: 1;
  max-width: 200px;
  display: flex;
  align-items: center;
}

.zoom-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: linear-gradient(135deg, #2293a1, #32d8ee);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.zoom-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: #fff;
  border: 2px solid #2293a1;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.zoom-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(34, 147, 161, 0.3);
}

.zoom-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: #fff;
  border: 2px solid #2293a1;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.cropper-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 12px 20px;
  border-top: 1px solid #e5e7eb;
}

.cropper-actions-rtl {
  flex-direction: row-reverse;
}

.cropper-action-btn {
  font-weight: 700;
  border-radius: 12px;
  color: #ffffff;
  width: 45%;
  height: 40px;
  font-size: 0.875rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cropper-confirm-btn {
  background-image: linear-gradient(135deg, #2293a1, #32d8ee);
}

.cropper-confirm-btn:hover {
  background-image: linear-gradient(135deg, #1a7a86, #2bc4d8);
  transform: translateY(-1px);
}

.cropper-cancel-btn {
  background-image: linear-gradient(135deg, #dc2626, #f87171);
}

.cropper-cancel-btn:hover {
  background-image: linear-gradient(135deg, #c41e1e, #ef5656);
  transform: translateY(-1px);
}

[dir="rtl"] .cropper-header {
  text-align: right;
}
</style>
