<template>
  <section class="bsd" :class="{ 'bsd--open': open, 'bsd--compact': compact }">
    <button
      v-if="!open"
      type="button"
      class="bsd__trigger"
      :aria-label="$t('openScanner')"
      @click="openScanner"
    >
      <span class="bsd__lens" aria-hidden="true">
        <span class="bsd__ring"></span>
        <span class="bsd__ring bsd__ring--delayed"></span>
        <v-icon size="22">mdi-barcode-scan</v-icon>
      </span>
      <span class="bsd__copy">
        <strong>{{ $t('scanItems') }}</strong>
        <small>{{ hardwareHint ? $t('scanItemsHint') : $t('scanItemsHintCamera') }}</small>
      </span>
      <v-icon class="bsd__chevron" size="18">mdi-chevron-down</v-icon>
    </button>

    <div v-else class="bsd__stage">
      <div class="bsd__viewport">
        <video
          ref="videoRef"
          class="bsd__video"
          autoplay
          muted
          playsinline
        />
        <div class="bsd__shade" aria-hidden="true"></div>
        <div class="bsd__reticle" aria-hidden="true">
          <span class="bsd__corner bsd__corner--tl"></span>
          <span class="bsd__corner bsd__corner--tr"></span>
          <span class="bsd__corner bsd__corner--bl"></span>
          <span class="bsd__corner bsd__corner--br"></span>
          <span class="bsd__laser"></span>
        </div>

        <div v-if="hitName" class="bsd__hit">
          <v-icon size="18">mdi-check-circle</v-icon>
          <span>{{ hitName }}</span>
        </div>

        <p class="bsd__status">{{ statusText }}</p>
        <button type="button" class="bsd__photo" @click="pickPhoto">
          <v-icon size="16">mdi-camera</v-icon>
          <span>{{ $t('takeBarcodePhoto') }}</span>
        </button>
        <input
          ref="photoInput"
          class="bsd__file"
          type="file"
          accept="image/*"
          capture="environment"
          @change="onPhotoPicked"
        />
      </div>

      <div class="bsd__toolbar">
        <button
          v-if="torchAvailable"
          type="button"
          class="bsd__tool"
          :class="{ 'bsd__tool--on': torchOn }"
          :aria-label="torchOn ? $t('torchOff') : $t('torchOn')"
          @click="toggleTorch"
        >
          <v-icon size="18">{{ torchOn ? 'mdi-flashlight' : 'mdi-flashlight-off' }}</v-icon>
        </button>
        <button
          type="button"
          class="bsd__tool bsd__tool--close"
          :aria-label="$t('closeScanner')"
          @click="closeScanner"
        >
          <v-icon size="18">mdi-close</v-icon>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useState } from '../store/state'
import { translations } from '../i18n/translations'
import { useCameraBarcode, requestCameraStream } from '../composables/useCameraBarcode'
import { decodeBarcodeFromFile } from '../utils/barcode'
import { unlockScanBeep } from '../utils/scanBeep'

const SCAN_COOLDOWN_MS = 2000

defineProps({
  compact: { type: Boolean, default: false },
  hardwareHint: { type: Boolean, default: false }
})

const emit = defineEmits(['decoded'])

const state = useState()
const $t = (key) => translations[state.lang]?.[key] || key

const open = ref(false)
const hitName = ref('')
const photoInput = ref(null)
let hitTimer = null
let lastEmittedAt = 0

const {
  videoRef,
  starting,
  errorKey,
  torchAvailable,
  torchOn,
  startCamera,
  stopCamera,
  toggleTorch
} = useCameraBarcode((text) => {
  const now = Date.now()
  if (now - lastEmittedAt < SCAN_COOLDOWN_MS) return
  lastEmittedAt = now
  emit('decoded', text)
})

const statusText = computed(() => {
  if (errorKey.value) return $t(errorKey.value)
  if (starting.value) return $t('cameraStarting')
  return $t('pointAtBarcode')
})

function flashHit(name) {
  hitName.value = name || $t('itemScanned')
  if (hitTimer) clearTimeout(hitTimer)
  hitTimer = setTimeout(() => {
    hitName.value = ''
  }, 1400)
}

async function openScanner(streamPromise) {
  if (open.value && !streamPromise) return
  const pending = streamPromise || requestCameraStream()
  open.value = true
  errorKey.value = ''
  lastEmittedAt = 0
  unlockScanBeep()
  await startCamera(pending)
}

function pickPhoto() {
  photoInput.value?.click()
}

async function onPhotoPicked(event) {
  const file = event.target?.files?.[0]
  event.target.value = ''
  if (!file) return
  const code = await decodeBarcodeFromFile(file)
  if (!code) {
    errorKey.value = 'noBarcodeInImage'
    return
  }
  emit('decoded', code)
}

async function closeScanner() {
  open.value = false
  lastEmittedAt = 0
  await stopCamera()
}

async function toggleScanner() {
  if (open.value) await closeScanner()
  else await openScanner()
}

watch(open, async (isOpen) => {
  if (isOpen) return
  await stopCamera()
})

onUnmounted(async () => {
  if (hitTimer) clearTimeout(hitTimer)
  await closeScanner()
})

defineExpose({ open: openScanner, close: closeScanner, toggle: toggleScanner, flashHit, isOpen: open })
</script>

<style scoped>
.bsd {
  --bsd-teal: #197783;
  --bsd-cyan: #20b4c6;
  --bsd-ink: #16363a;
  --bsd-muted: #5f7a7e;
  flex-shrink: 0;
  margin-bottom: 0.65rem;
}

.bsd__trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.7rem;
  border: 1px solid rgba(25, 119, 131, 0.16);
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(236, 247, 248, 0.92));
  box-shadow: 0 6px 16px rgba(22, 54, 58, 0.06);
  cursor: pointer;
  text-align: start;
  color: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.18s ease;
}

.bsd__trigger:hover {
  border-color: rgba(32, 180, 198, 0.45);
  box-shadow: 0 10px 22px rgba(25, 119, 131, 0.12);
  transform: translateY(-1px);
}

.bsd__lens {
  position: relative;
  width: 2.55rem;
  height: 2.55rem;
  flex-shrink: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(145deg, #156974, #28c4d6);
  box-shadow: 0 6px 14px rgba(25, 119, 131, 0.28);
}

.bsd__ring,
.bsd__ring--delayed {
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  border: 2px dashed rgba(32, 180, 198, 0.55);
  animation: bsd-spin 8s linear infinite;
  pointer-events: none;
}

.bsd__ring--delayed {
  inset: -9px;
  border-style: dotted;
  opacity: 0.45;
  animation-duration: 12s;
  animation-direction: reverse;
}

.bsd__copy {
  display: flex;
  flex-direction: column;
  gap: 0.08rem;
  min-width: 0;
  flex: 1;
}

.bsd__copy strong {
  font-size: 0.86rem;
  font-weight: 800;
  color: var(--bsd-ink);
  letter-spacing: 0.01em;
}

.bsd__copy small {
  font-size: 0.72rem;
  color: var(--bsd-muted);
  font-weight: 600;
}

.bsd__chevron {
  color: var(--bsd-teal);
  opacity: 0.8;
}

.bsd__stage {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(25, 119, 131, 0.22);
  background: #07181b;
  box-shadow: 0 14px 32px rgba(13, 42, 46, 0.22);
}

.bsd__viewport {
  position: relative;
  height: 13.5rem;
  overflow: hidden;
}

.bsd--compact .bsd__viewport {
  height: 11.5rem;
}

.bsd__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bsd__shade {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 55% 48% at 50% 50%, transparent 42%, rgba(4, 16, 18, 0.55) 100%);
  pointer-events: none;
}

.bsd__reticle {
  position: absolute;
  inset: 18% 16%;
  pointer-events: none;
}

.bsd__corner {
  position: absolute;
  width: 1.35rem;
  height: 1.35rem;
  border-color: #5ce8f4;
  border-style: solid;
  filter: drop-shadow(0 0 6px rgba(44, 216, 232, 0.55));
}

.bsd__corner--tl { top: 0; left: 0; border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
.bsd__corner--tr { top: 0; right: 0; border-width: 3px 3px 0 0; border-radius: 0 4px 0 0; }
.bsd__corner--bl { bottom: 0; left: 0; border-width: 0 0 3px 3px; border-radius: 0 0 0 4px; }
.bsd__corner--br { bottom: 0; right: 0; border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }

.bsd__laser {
  position: absolute;
  left: 8%;
  right: 8%;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, #7ff3ff, transparent);
  box-shadow: 0 0 12px 2px rgba(92, 232, 244, 0.55);
  animation: bsd-laser 2.1s ease-in-out infinite;
}

.bsd__status {
  position: absolute;
  left: 50%;
  bottom: 2.55rem;
  transform: translateX(-50%);
  margin: 0;
  padding: 0.28rem 0.7rem;
  border-radius: 999px;
  background: rgba(7, 24, 27, 0.72);
  color: #e7fbff;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
  backdrop-filter: blur(8px);
  max-width: calc(100% - 1rem);
  overflow: hidden;
  text-overflow: ellipsis;
}

.bsd__photo {
  position: absolute;
  left: 50%;
  bottom: 0.55rem;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: none;
  border-radius: 999px;
  padding: 0.28rem 0.7rem;
  background: rgba(25, 119, 131, 0.92);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
}

.bsd__file {
  display: none;
}

.bsd__hit {
  position: absolute;
  left: 50%;
  top: 0.7rem;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  max-width: calc(100% - 5.5rem);
  padding: 0.28rem 0.65rem;
  border-radius: 999px;
  background: rgba(25, 119, 131, 0.92);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 800;
  animation: bsd-pop 0.28s ease;
}

.bsd__hit span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bsd__toolbar {
  position: absolute;
  top: 0.55rem;
  inset-inline-end: 0.55rem;
  display: flex;
  gap: 0.35rem;
  z-index: 2;
}

.bsd__tool {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(7, 24, 27, 0.62);
  color: #fff;
  cursor: pointer;
  backdrop-filter: blur(8px);
}

.bsd__tool--on {
  background: rgba(32, 180, 198, 0.92);
}

.bsd__tool--close {
  background: rgba(7, 24, 27, 0.78);
}

@keyframes bsd-spin {
  to { transform: rotate(360deg); }
}

@keyframes bsd-laser {
  0%, 100% { top: 12%; opacity: 0.35; }
  50% { top: 82%; opacity: 1; }
}

@keyframes bsd-pop {
  from { transform: translateX(-50%) translateY(-6px); opacity: 0; }
  to { transform: translateX(-50%) translateY(0); opacity: 1; }
}

</style>
