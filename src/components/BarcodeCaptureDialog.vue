<template>
  <v-dialog
    :model-value="modelValue"
    fullscreen
    eager
    :scrim="false"
    :z-index="2600"
    transition="dialog-bottom-transition"
    content-class="bcd-dialog"
    @update:model-value="onModelChange"
  >
    <div class="bcd" :dir="state.dir">
      <header class="bcd__bar">
        <button type="button" class="bcd__icon-btn" :aria-label="$t('back')" @click="close">
          <v-icon size="22">{{ closeIcon }}</v-icon>
        </button>
        <div class="bcd__titles">
          <h3>{{ $t('scanBarcode') }}</h3>
          <p>{{ $t('scanBarcodeImageHint') }}</p>
        </div>
        <button
          v-if="torchAvailable"
          type="button"
          class="bcd__icon-btn"
          :class="{ 'bcd__icon-btn--on': torchOn }"
          :aria-label="torchOn ? $t('torchOff') : $t('torchOn')"
          @click="toggleTorch"
        >
          <v-icon size="20">{{ torchOn ? 'mdi-flashlight' : 'mdi-flashlight-off' }}</v-icon>
        </button>
        <span v-else class="bcd__bar-spacer"></span>
      </header>

      <div class="bcd__stage">
        <video
          ref="videoRef"
          class="bcd__video"
          autoplay
          muted
          playsinline
        />
        <div class="bcd__shade"></div>
        <div class="bcd__reticle" aria-hidden="true">
          <span class="bcd__corner bcd__corner--tl"></span>
          <span class="bcd__corner bcd__corner--tr"></span>
          <span class="bcd__corner bcd__corner--bl"></span>
          <span class="bcd__corner bcd__corner--br"></span>
          <span class="bcd__laser"></span>
        </div>
        <p class="bcd__status">{{ statusText }}</p>
      </div>

      <div class="bcd__actions">
        <button type="button" class="bcd__gallery" @click="takePhoto">
          <v-icon size="20">mdi-camera</v-icon>
          <span>{{ $t('takeBarcodePhoto') }}</span>
        </button>
        <button type="button" class="bcd__gallery bcd__gallery--ghost" @click="pickImage">
          <v-icon size="20">mdi-image-outline</v-icon>
          <span>{{ $t('pickBarcodeImage') }}</span>
        </button>
        <input
          ref="fileInput"
          class="bcd__file"
          type="file"
          accept="image/*"
          @change="onImagePicked"
        />
        <input
          ref="captureInput"
          class="bcd__file"
          type="file"
          accept="image/*"
          capture="environment"
          @change="onImagePicked"
        />
      </div>
    </div>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useState } from '../store/state'
import { translations } from '../i18n/translations'
import { useCameraBarcode, requestCameraStream } from '../composables/useCameraBarcode'
import { decodeBarcodeFromFile, normalizeBarcode } from '../utils/barcode'
import { playScanBeep, unlockScanBeep } from '../utils/scanBeep'
import { useIsMobile } from '../composables/useIsMobile'
import { useMobileOverlayBack, useNavArrowIcon } from '../composables/useMobileBackStack'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'scanned'])

const state = useState()
const $t = (key) => translations[state.lang]?.[key] || key
const fileInput = ref(null)
const captureInput = ref(null)
const decodingImage = ref(false)
let accepted = false

function accept(raw) {
  const code = normalizeBarcode(raw)
  if (!code || accepted) return
  accepted = true
  playScanBeep()
  stopCamera()
  emit('scanned', code)
  close()
}

const {
  videoRef,
  starting,
  errorKey,
  torchAvailable,
  torchOn,
  startCamera,
  stopCamera,
  toggleTorch
} = useCameraBarcode((text) => accept(text))

const statusText = computed(() => {
  if (decodingImage.value) return $t('readingBarcodeImage')
  if (errorKey.value) return $t(errorKey.value)
  if (starting.value) return $t('cameraStarting')
  return $t('pointAtBarcode')
})

function close() {
  emit('update:modelValue', false)
}

const isMobile = useIsMobile()
const navArrowIcon = useNavArrowIcon()
const closeIcon = computed(() => (isMobile.value ? navArrowIcon.value : 'mdi-close'))
useMobileOverlayBack(() => props.modelValue, close)

function onModelChange(value) {
  emit('update:modelValue', value)
}

function pickImage() {
  fileInput.value?.click()
}

function takePhoto() {
  captureInput.value?.click()
}

async function onImagePicked(event) {
  const file = event.target?.files?.[0]
  event.target.value = ''
  if (!file) return
  decodingImage.value = true
  try {
    const code = await decodeBarcodeFromFile(file)
    if (code) {
      accept(code)
      return
    }
    errorKey.value = 'noBarcodeInImage'
  } finally {
    decodingImage.value = false
  }
}

function startFromGesture() {
  accepted = false
  errorKey.value = ''
  unlockScanBeep()
  const pending = requestCameraStream()
  startCamera(pending)
}

watch(
  () => props.modelValue,
  async (open) => {
    if (open) return
    await stopCamera()
  }
)

defineExpose({ startFromGesture })
</script>

<style scoped>
.bcd {
  --ink: #e7fbff;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #07181b;
  color: var(--ink);
}

.bcd__bar {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: calc(0.75rem + env(safe-area-inset-top)) 0.9rem 0.75rem;
}

.bcd__titles {
  flex: 1;
  min-width: 0;
}

.bcd__titles h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
}

.bcd__titles p {
  margin: 0.12rem 0 0;
  font-size: 0.78rem;
  font-weight: 600;
  opacity: 0.78;
}

.bcd__icon-btn {
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
}

.bcd__icon-btn--on {
  background: rgba(32, 180, 198, 0.92);
}

.bcd__bar-spacer {
  width: 2.5rem;
  flex-shrink: 0;
}

.bcd__stage {
  position: relative;
  flex: 1;
  min-height: 0;
  margin: 0 0.9rem;
  border-radius: 22px;
  overflow: hidden;
  background: #041011;
}

.bcd__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bcd__shade {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 55% 48% at 50% 50%, transparent 42%, rgba(4, 16, 18, 0.55) 100%);
  pointer-events: none;
}

.bcd__reticle {
  position: absolute;
  inset: 22% 12%;
  pointer-events: none;
}

.bcd__corner {
  position: absolute;
  width: 1.5rem;
  height: 1.5rem;
  border-color: #5ce8f4;
  border-style: solid;
  filter: drop-shadow(0 0 6px rgba(44, 216, 232, 0.55));
}

.bcd__corner--tl { top: 0; left: 0; border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
.bcd__corner--tr { top: 0; right: 0; border-width: 3px 3px 0 0; border-radius: 0 4px 0 0; }
.bcd__corner--bl { bottom: 0; left: 0; border-width: 0 0 3px 3px; border-radius: 0 0 0 4px; }
.bcd__corner--br { bottom: 0; right: 0; border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }

.bcd__laser {
  position: absolute;
  left: 8%;
  right: 8%;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, #7ff3ff, transparent);
  box-shadow: 0 0 12px 2px rgba(92, 232, 244, 0.55);
  animation: bcd-laser 2.1s ease-in-out infinite;
}

.bcd__status {
  position: absolute;
  left: 50%;
  bottom: 0.9rem;
  transform: translateX(-50%);
  margin: 0;
  padding: 0.32rem 0.8rem;
  border-radius: 999px;
  background: rgba(7, 24, 27, 0.72);
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.bcd__actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.9rem 0.9rem calc(1.1rem + env(safe-area-inset-bottom));
}

.bcd__gallery {
  width: 100%;
  min-height: 3.1rem;
  border: none;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  background: linear-gradient(135deg, #0f5a63, #197783 50%, #2ad4e8);
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}

.bcd__gallery--ghost {
  background: rgba(255, 255, 255, 0.12);
  box-shadow: none;
}

.bcd__file {
  display: none;
}

@keyframes bcd-laser {
  0%, 100% { top: 12%; opacity: 0.35; }
  50% { top: 82%; opacity: 1; }
}
</style>

<style>
.bcd-dialog {
  padding: 0 !important;
}
</style>
