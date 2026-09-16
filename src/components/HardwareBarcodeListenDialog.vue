<template>
  <v-dialog
    :model-value="modelValue"
    max-width="440"
    eager
    scrim="rgba(7, 24, 27, 0.62)"
    :z-index="2600"
    content-class="hbl-dialog"
    @update:model-value="onModelChange"
  >
    <div class="hbl" :dir="state.dir">
      <header class="hbl__head">
        <span class="hbl__badge">
          <v-icon size="18">mdi-barcode-scan</v-icon>
        </span>
        <div class="hbl__titles">
          <h3>{{ $t('scanBarcode') }}</h3>
          <p>{{ $t('waitingForBarcodeReader') }}</p>
        </div>
        <button type="button" class="hbl__close" :aria-label="$t('back')" @click="close">
          <v-icon size="20">{{ closeIcon }}</v-icon>
        </button>
      </header>

      <div class="hbl__stage">
        <span class="hbl__ring"></span>
        <span class="hbl__ring hbl__ring--delayed"></span>
        <div class="hbl__lens">
          <v-icon size="36">mdi-barcode-scan</v-icon>
        </div>
        <span class="hbl__laser"></span>
      </div>

      <input
        ref="listenInput"
        class="hbl__catch"
        type="text"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        :aria-label="$t('scanBarcode')"
        @keydown.enter.prevent="submitFromInput"
      />

      <p class="hbl__hint">{{ $t('scanBarcodeReaderHint') }}</p>
    </div>
  </v-dialog>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useState } from '../store/state'
import { translations } from '../i18n/translations'
import { useHardwareBarcode } from '../composables/useHardwareBarcode'
import { normalizeBarcode } from '../utils/barcode'
import { useIsMobile } from '../composables/useIsMobile'
import { useMobileOverlayBack, useNavArrowIcon } from '../composables/useMobileBackStack'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'scanned'])

const state = useState()
const $t = (key) => translations[state.lang]?.[key] || key
const listenInput = ref(null)

const isOpen = () => props.modelValue

useHardwareBarcode((code) => accept(code), {
  enabled: () => isOpen()
})

function accept(raw) {
  const code = normalizeBarcode(raw)
  if (!code) return
  emit('scanned', code)
  close()
}

function submitFromInput() {
  const code = normalizeBarcode(listenInput.value?.value)
  if (!code) return
  accept(code)
}

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

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) {
      if (listenInput.value) listenInput.value.value = ''
      return
    }
    await nextTick()
    listenInput.value?.focus()
  }
)
</script>

<style scoped>
.hbl {
  --teal: #197783;
  --cyan: #20b4c6;
  --ink: #16363a;
  position: relative;
  padding: 1.15rem 1.2rem 1.25rem;
  border-radius: 20px;
  background: linear-gradient(180deg, #f4fbfc 0%, #ffffff 55%);
  box-shadow: 0 18px 40px rgba(13, 42, 46, 0.18);
}

.hbl__head {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
}

.hbl__badge {
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(145deg, #156974, #28c4d6);
  flex-shrink: 0;
}

.hbl__titles {
  flex: 1;
  min-width: 0;
}

.hbl__titles h3 {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 800;
  color: var(--ink);
}

.hbl__titles p {
  margin: 0.15rem 0 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #5f7a7e;
}

.hbl__close {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 50%;
  background: #eef5f6;
  color: var(--ink);
  display: grid;
  place-items: center;
  cursor: pointer;
}

.hbl__stage {
  position: relative;
  height: 11rem;
  margin: 1.1rem 0 0.85rem;
  border-radius: 18px;
  overflow: hidden;
  background: #07181b;
  display: grid;
  place-items: center;
}

.hbl__lens {
  position: relative;
  z-index: 1;
  width: 4.2rem;
  height: 4.2rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(145deg, #156974, #28c4d6);
  box-shadow: 0 0 0 10px rgba(32, 180, 198, 0.12);
}

.hbl__ring,
.hbl__ring--delayed {
  position: absolute;
  width: 6.4rem;
  height: 6.4rem;
  border-radius: 50%;
  border: 2px dashed rgba(92, 232, 244, 0.55);
  animation: hbl-spin 8s linear infinite;
}

.hbl__ring--delayed {
  width: 7.6rem;
  height: 7.6rem;
  opacity: 0.4;
  animation-duration: 12s;
  animation-direction: reverse;
}

.hbl__laser {
  position: absolute;
  left: 18%;
  right: 18%;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, #7ff3ff, transparent);
  box-shadow: 0 0 12px 2px rgba(92, 232, 244, 0.5);
  animation: hbl-laser 2.1s ease-in-out infinite;
}

.hbl__catch {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 1px;
  height: 1px;
}

.hbl__hint {
  margin: 0;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: #5f7a7e;
  line-height: 1.45;
}

@keyframes hbl-spin {
  to { transform: rotate(360deg); }
}

@keyframes hbl-laser {
  0%, 100% { top: 22%; opacity: 0.35; }
  50% { top: 78%; opacity: 1; }
}
</style>

<style>
.hbl-dialog {
  padding: 0 !important;
  overflow: visible !important;
}
</style>
