<template>
  <div ref="rootRef" class="pos-time-input">
    <div
      ref="inputWrapRef"
      class="pos-time-field"
      :class="{ 'pos-time-field--open': showPicker }"
      @click.stop="openPicker"
    >
      <input
        type="text"
        class="pos-time-display"
        :value="displayValue"
        :placeholder="placeholder"
        readonly
      />
      <v-icon size="18" class="pos-time-icon">mdi-clock-outline</v-icon>
    </div>

    <Teleport to="body">
      <div
        v-if="showPicker"
        ref="popupRef"
        class="pos-time-popup"
        :style="popupStyle"
        @mousedown.stop
      >
        <div class="pos-time-digital">
          <span class="pos-time-digital-value">{{ digitalDisplay }}</span>
        </div>

        <div class="pos-time-columns">
          <div class="pos-time-col-wrap">
            <div class="pos-time-highlight" aria-hidden="true" />
            <div
              ref="hoursRef"
              class="pos-time-col"
              @scroll.passive="onHoursScroll"
            >
              <div class="pos-time-col-pad" />
              <div class="pos-time-col-pad" />
              <button
                v-for="h in hours"
                :key="`h-${h}`"
                type="button"
                class="pos-time-col-item"
                :class="{ 'is-selected': h === selectedHour }"
                @click="scrollToHour(h)"
              >
                {{ pad(h) }}
              </button>
              <div class="pos-time-col-pad" />
              <div class="pos-time-col-pad" />
            </div>
            <div class="pos-time-fade pos-time-fade--top" aria-hidden="true" />
            <div class="pos-time-fade pos-time-fade--bottom" aria-hidden="true" />
          </div>

          <span class="pos-time-sep">:</span>

          <div class="pos-time-col-wrap">
            <div class="pos-time-highlight" aria-hidden="true" />
            <div
              ref="minutesRef"
              class="pos-time-col"
              @scroll.passive="onMinutesScroll"
            >
              <div class="pos-time-col-pad" />
              <div class="pos-time-col-pad" />
              <button
                v-for="m in minutes"
                :key="`m-${m}`"
                type="button"
                class="pos-time-col-item"
                :class="{ 'is-selected': m === selectedMinute }"
                @click="scrollToMinute(m)"
              >
                {{ pad(m) }}
              </button>
              <div class="pos-time-col-pad" />
              <div class="pos-time-col-pad" />
            </div>
            <div class="pos-time-fade pos-time-fade--top" aria-hidden="true" />
            <div class="pos-time-fade pos-time-fade--bottom" aria-hidden="true" />
          </div>
        </div>

        <div class="pos-time-presets">
          <button
            v-for="preset in presets"
            :key="preset.value"
            type="button"
            class="pos-time-preset"
            @click="applyPreset(preset.value)"
          >
            {{ preset.label }}
          </button>
        </div>

        <div class="pos-time-footer">
          <button type="button" class="pos-time-now" @click="selectNow">
            {{ nowLabel }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useState } from '../store/state'

const ITEM_HEIGHT = 40
// Two 80px spacer pads sit above the list (160px), and the highlight band is
// centered in the 200px column (center at 100px). To center item i, the scroll
// offset must be: paddingTop + ITEM_HEIGHT/2 - columnHeight/2 = 160 + 20 - 100 = 80.
const CENTER_OFFSET = 80

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const state = useState()
const rootRef = ref(null)
const inputWrapRef = ref(null)
const popupRef = ref(null)
const hoursRef = ref(null)
const minutesRef = ref(null)
const showPicker = ref(false)
const popupPosition = ref({ top: 0, left: 0 })
const selectedHour = ref(0)
const selectedMinute = ref(0)

let scrollTimer = null

const isAr = computed(() => state.lang === 'ar')
const nowLabel = computed(() => (isAr.value ? 'الآن' : 'Now'))

const hours = computed(() => Array.from({ length: 24 }, (_, i) => i))
const minutes = computed(() => Array.from({ length: 60 }, (_, i) => i))

const presets = computed(() =>
  isAr.value
    ? [
        { label: 'صباحاً', value: '09:00' },
        { label: 'ظهراً', value: '12:00' },
        { label: 'مساءً', value: '18:00' }
      ]
    : [
        { label: 'Morning', value: '08:00' },
        { label: 'Noon', value: '12:00' },
        { label: 'Evening', value: '18:00' }
      ]
)

const popupStyle = computed(() => ({
  position: 'fixed',
  top: `${popupPosition.value.top}px`,
  left: `${popupPosition.value.left}px`,
  zIndex: 9999
}))

const displayValue = computed(() => {
  if (!props.modelValue) return ''
  const [h, m] = props.modelValue.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return props.modelValue
  const date = new Date()
  date.setHours(h, m, 0, 0)
  return date.toLocaleTimeString(isAr.value ? 'ar-LB' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: !isAr.value
  })
})

const digitalDisplay = computed(() => {
  if (isAr.value) return `${pad(selectedHour.value)}:${pad(selectedMinute.value)}`
  const date = new Date()
  date.setHours(selectedHour.value, selectedMinute.value, 0, 0)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
})

function pad(n) {
  return String(n).padStart(2, '0')
}

function parseModel() {
  if (!props.modelValue) {
    const now = new Date()
    selectedHour.value = now.getHours()
    selectedMinute.value = now.getMinutes()
    return
  }
  const [h, m] = props.modelValue.split(':').map(Number)
  selectedHour.value = Number.isNaN(h) ? 0 : h
  selectedMinute.value = Number.isNaN(m) ? 0 : m
}

function emitValue() {
  emit('update:modelValue', `${pad(selectedHour.value)}:${pad(selectedMinute.value)}`)
}

function scrollColToIndex(colRef, index) {
  if (!colRef) return
  colRef.scrollTop = index * ITEM_HEIGHT + CENTER_OFFSET
}

function syncScrollPositions() {
  nextTick(() => {
    scrollColToIndex(hoursRef.value, selectedHour.value)
    scrollColToIndex(minutesRef.value, selectedMinute.value)
  })
}

function indexFromScroll(scrollTop) {
  return Math.max(0, Math.min(Math.round((scrollTop - CENTER_OFFSET) / ITEM_HEIGHT), 23))
}

function minuteIndexFromScroll(scrollTop) {
  return Math.max(0, Math.min(Math.round((scrollTop - CENTER_OFFSET) / ITEM_HEIGHT), 59))
}

function onHoursScroll() {
  if (!hoursRef.value) return
  clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    const idx = indexFromScroll(hoursRef.value.scrollTop)
    if (selectedHour.value !== idx) {
      selectedHour.value = idx
      emitValue()
    }
    scrollColToIndex(hoursRef.value, idx)
  }, 80)
}

function onMinutesScroll() {
  if (!minutesRef.value) return
  clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    const idx = minuteIndexFromScroll(minutesRef.value.scrollTop)
    if (selectedMinute.value !== idx) {
      selectedMinute.value = idx
      emitValue()
    }
    scrollColToIndex(minutesRef.value, idx)
  }, 80)
}

function scrollToHour(h) {
  selectedHour.value = h
  scrollColToIndex(hoursRef.value, h)
  emitValue()
}

function scrollToMinute(m) {
  selectedMinute.value = m
  scrollColToIndex(minutesRef.value, m)
  emitValue()
}

function applyPreset(value) {
  const [h, m] = value.split(':').map(Number)
  selectedHour.value = h
  selectedMinute.value = m
  syncScrollPositions()
  emitValue()
}

function selectNow() {
  const now = new Date()
  selectedHour.value = now.getHours()
  selectedMinute.value = now.getMinutes()
  emitValue()
  closePicker()
}

function calculatePopupPosition() {
  if (!inputWrapRef.value) return
  const rect = inputWrapRef.value.getBoundingClientRect()
  const popupHeight = 340
  const popupWidth = 260
  let top = rect.bottom + 4
  let left = rect.left
  if (top + popupHeight > window.innerHeight) top = Math.max(8, rect.top - popupHeight - 4)
  if (left + popupWidth > window.innerWidth) left = window.innerWidth - popupWidth - 8
  if (left < 8) left = 8
  popupPosition.value = { top, left }
}

function openPicker() {
  if (showPicker.value) return
  parseModel()
  showPicker.value = true
  nextTick(() => {
    calculatePopupPosition()
    syncScrollPositions()
    document.addEventListener('mousedown', onClickOutside)
    window.addEventListener('scroll', calculatePopupPosition, true)
    window.addEventListener('resize', calculatePopupPosition)
  })
}

function closePicker() {
  showPicker.value = false
  removeListeners()
}

function removeListeners() {
  document.removeEventListener('mousedown', onClickOutside)
  window.removeEventListener('scroll', calculatePopupPosition, true)
  window.removeEventListener('resize', calculatePopupPosition)
  clearTimeout(scrollTimer)
}

function onClickOutside(e) {
  if (rootRef.value?.contains(e.target)) return
  if (popupRef.value?.contains(e.target)) return
  closePicker()
}

watch(() => props.modelValue, parseModel)

onBeforeUnmount(removeListeners)
</script>

<style scoped>
.pos-time-field {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 40px;
  padding: 0 0.65rem;
  border: 1px solid transparent;
  border-radius: 10px;
  background:
    linear-gradient(#ffffff, #ffffff) padding-box,
    linear-gradient(135deg, rgba(34, 147, 161, 0.55), rgba(50, 216, 238, 0.55)) border-box;
  cursor: pointer;
  transition: box-shadow 0.2s ease;
}

.pos-time-field--open,
.pos-time-field:hover {
  box-shadow: 0 0 0 3px rgba(25, 119, 131, 0.14);
}

.pos-time-display {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a1a1a;
  cursor: pointer;
  min-width: 0;
}

.pos-time-display::placeholder {
  color: rgba(0, 0, 0, 0.38);
  font-weight: 500;
}

.pos-time-icon {
  color: #197783;
  flex-shrink: 0;
}
</style>

<style>
.pos-time-popup {
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(25, 119, 131, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 0.75rem;
  min-width: 260px;
  width: 260px;
  animation: pos-time-popup-in 0.18s ease-out;
}

@keyframes pos-time-popup-in {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.pos-time-digital {
  text-align: center;
  padding: 0.5rem 0 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 0.5rem;
}

.pos-time-digital-value {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: linear-gradient(135deg, #197783, #32d8ee);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.pos-time-columns {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  height: 200px;
  position: relative;
}

.pos-time-col-wrap {
  position: relative;
  flex: 1;
  height: 100%;
  max-width: 72px;
}

.pos-time-highlight {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 40px;
  transform: translateY(-50%);
  background: linear-gradient(135deg, rgba(25, 119, 131, 0.1), rgba(50, 216, 238, 0.08));
  border-radius: 8px;
  border: 1px solid rgba(25, 119, 131, 0.2);
  pointer-events: none;
  z-index: 1;
}

.pos-time-col {
  height: 100%;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
  overscroll-behavior: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;
  position: relative;
  z-index: 2;
}

.pos-time-col::-webkit-scrollbar {
  display: none;
}

.pos-time-col-pad {
  height: 80px;
  flex-shrink: 0;
  scroll-snap-align: none;
}

.pos-time-col-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 40px;
  border: none;
  background: none;
  font-size: 1rem;
  font-weight: 500;
  color: #94a3b8;
  cursor: pointer;
  scroll-snap-align: center;
  transition: color 0.15s ease, font-weight 0.15s ease, transform 0.15s ease;
  flex-shrink: 0;
}

.pos-time-col-item.is-selected {
  color: #197783;
  font-weight: 700;
  font-size: 1.125rem;
}

.pos-time-col-item:hover {
  color: #197783;
}

.pos-time-fade {
  position: absolute;
  left: 0;
  right: 0;
  height: 60px;
  pointer-events: none;
  z-index: 3;
}

.pos-time-fade--top {
  top: 0;
  background: linear-gradient(to bottom, #fff 20%, transparent);
}

.pos-time-fade--bottom {
  bottom: 0;
  background: linear-gradient(to top, #fff 20%, transparent);
}

.pos-time-sep {
  font-size: 1.25rem;
  font-weight: 700;
  color: #197783;
  padding-bottom: 2px;
  user-select: none;
}

.pos-time-presets {
  display: flex;
  gap: 0.35rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
}

.pos-time-preset {
  flex: 1;
  padding: 0.35rem 0.25rem;
  border: 1px solid rgba(25, 119, 131, 0.25);
  border-radius: 6px;
  background: rgba(25, 119, 131, 0.04);
  color: #197783;
  font-size: 0.6875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
  white-space: nowrap;
}

.pos-time-preset:hover {
  background: rgba(25, 119, 131, 0.12);
  border-color: rgba(25, 119, 131, 0.45);
}

.pos-time-footer {
  padding-top: 0.5rem;
  margin-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
}

.pos-time-now {
  width: 100%;
  padding: 0.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 600;
  background: linear-gradient(135deg, #197783, #32d8ee);
  color: #fff;
  transition: opacity 0.15s ease, transform 0.1s ease;
}

.pos-time-now:hover {
  opacity: 0.92;
}

.pos-time-now:active {
  transform: scale(0.98);
}
</style>
