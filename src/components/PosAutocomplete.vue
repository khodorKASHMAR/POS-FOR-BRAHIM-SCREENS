<template>
  <div ref="container" class="pos-ac" :dir="textDir">
    <label v-if="label" class="pos-ac__label">
      {{ label }}
      <span v-if="required" class="pos-ac__required">*</span>
    </label>

    <div
      ref="trigger"
      class="pos-ac__field"
      :class="{
        'pos-ac__field--open': showDropdown,
        'pos-ac__field--locked': isLocked,
        'pos-ac__field--disabled': disabled,
        'pos-ac__field--error': !!errorMessage
      }"
      @click="onFieldClick"
    >
      <input
        ref="input"
        v-model="searchQuery"
        type="text"
        class="pos-ac__input"
        :dir="textDir"
        :placeholder="displayPlaceholder"
        :disabled="disabled"
        :readonly="isLocked"
        autocomplete="off"
        @input="onInput"
        @focus="onFocus"
        @keydown="onKeydown"
      />

      <div class="pos-ac__icons">
        <button
          v-if="showClear"
          type="button"
          class="pos-ac__clear"
          :aria-label="'Clear'"
          @click.stop="clearValue"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.25">
            <path stroke-linecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <span v-if="loading" class="pos-ac__spinner" />
      </div>
    </div>

    <p v-if="errorMessage && !hideDetails" class="pos-ac__error">{{ errorMessage }}</p>

    <Teleport to="body">
      <div
        v-if="showDropdown"
        ref="dropdown"
        class="pos-ac__dropdown"
        :dir="textDir"
        :style="dropdownStyle"
      >
        <div v-if="!items.length && !loading" class="pos-ac__empty">
          {{ noDataText }}
        </div>
        <button
          v-for="(item, index) in items"
          :key="getItemValue(item)"
          type="button"
          class="pos-ac__option"
          :class="{
            'pos-ac__option--active': index === highlightedIndex,
            'pos-ac__option--selected': isSelected(item)
          }"
          @mousedown.prevent="selectItem(item)"
          @mouseenter="highlightedIndex = index"
        >
          <slot name="item" :item="item">
            {{ getItemTitle(item) }}
          </slot>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useState } from '../store/state'

const props = defineProps({
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  items: { type: Array, default: () => [] },
  itemTitle: { type: [String, Function], default: 'title' },
  itemValue: { type: [String, Function], default: 'value' },
  returnObject: { type: Boolean, default: false },
  clearable: { type: Boolean, default: true },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  hideDetails: { type: Boolean, default: true },
  errorMessage: { type: String, default: '' },
  noDataText: { type: String, default: 'No results' },
  /** When true, keep input locked after selection (like IAutocomplete). */
  lockOnSelect: { type: Boolean, default: true }
})

const emit = defineEmits(['update:search'])
const modelValue = defineModel({ default: null })

const state = useState()
const textDir = computed(() => (state.dir === 'rtl' ? 'rtl' : 'ltr'))

const container = ref(null)
const trigger = ref(null)
const input = ref(null)
const dropdown = ref(null)
const searchQuery = ref('')
const showDropdown = ref(false)
const highlightedIndex = ref(-1)
const dropdownPos = ref({ top: 0, left: 0, width: 0 })

const isLocked = computed(() => {
  if (!props.lockOnSelect || props.disabled) return false
  return modelValue.value !== null && modelValue.value !== undefined && modelValue.value !== ''
})

const showClear = computed(() => {
  if (!props.clearable || props.disabled) return false
  return modelValue.value !== null && modelValue.value !== undefined && modelValue.value !== ''
})

const displayPlaceholder = computed(() => {
  if (isLocked.value) return ''
  return props.placeholder || ''
})

const dropdownStyle = computed(() => ({
  position: 'fixed',
  top: `${dropdownPos.value.top}px`,
  left: `${dropdownPos.value.left}px`,
  width: `${dropdownPos.value.width}px`,
  zIndex: 4000
}))

function getItemTitle(item) {
  if (item == null) return ''
  if (typeof props.itemTitle === 'function') return props.itemTitle(item) || ''
  return item?.[props.itemTitle] ?? ''
}

function getItemValue(item) {
  if (item == null) return null
  if (typeof props.itemValue === 'function') return props.itemValue(item)
  return item?.[props.itemValue]
}

function isSelected(item) {
  const val = props.returnObject ? item : getItemValue(item)
  return JSON.stringify(val) === JSON.stringify(modelValue.value)
}

function findSelectedItem() {
  if (modelValue.value == null || modelValue.value === '') return null
  return props.items.find((item) => {
    const val = props.returnObject ? item : getItemValue(item)
    return JSON.stringify(val) === JSON.stringify(modelValue.value)
  }) || null
}

function syncSearchFromModel() {
  // While typing, parent refreshes `items` on every keystroke. Do not overwrite
  // the in-progress query (that was clearing each typed letter).
  if (input.value && document.activeElement === input.value && !isLocked.value) {
    return
  }
  const selected = findSelectedItem()
  if (selected) {
    searchQuery.value = getItemTitle(selected)
  } else if (modelValue.value == null || modelValue.value === '') {
    searchQuery.value = ''
  }
}

function calcPosition() {
  if (!trigger.value) return
  const rect = trigger.value.getBoundingClientRect()
  dropdownPos.value = {
    top: rect.bottom + 4,
    left: rect.left,
    width: rect.width
  }
}

function openDropdown() {
  if (props.disabled || isLocked.value) return
  calcPosition()
  showDropdown.value = true
}

function onFieldClick() {
  if (props.disabled) return
  if (isLocked.value) {
    input.value?.focus()
    return
  }
  openDropdown()
  input.value?.focus()
  emit('update:search', searchQuery.value || '')
}

function onFocus() {
  if (props.disabled || isLocked.value) return
  openDropdown()
  emit('update:search', searchQuery.value || '')
}

function onInput() {
  if (isLocked.value) return
  highlightedIndex.value = 0
  openDropdown()
  emit('update:search', searchQuery.value || '')
}

function selectItem(item) {
  modelValue.value = props.returnObject ? item : getItemValue(item)
  searchQuery.value = getItemTitle(item)
  showDropdown.value = false
  highlightedIndex.value = -1
}

function clearValue() {
  modelValue.value = null
  searchQuery.value = ''
  showDropdown.value = false
  nextTick(() => {
    emit('update:search', '')
    input.value?.focus()
  })
}

function onKeydown(e) {
  if (props.disabled || isLocked.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    openDropdown()
    highlightedIndex.value = Math.min(highlightedIndex.value + 1, props.items.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const item = props.items[highlightedIndex.value]
    if (item) selectItem(item)
  } else if (e.key === 'Escape') {
    showDropdown.value = false
  } else if (e.key === 'Backspace' && isLocked.value) {
    clearValue()
  }
}

function onDocPointer(e) {
  const target = e.target
  if (container.value?.contains(target) || dropdown.value?.contains(target)) return
  showDropdown.value = false
}

function onScrollOrResize() {
  if (showDropdown.value) calcPosition()
}

watch(modelValue, () => syncSearchFromModel(), { immediate: true })

watch(() => props.items, () => {
  syncSearchFromModel()
  if (showDropdown.value && props.items.length && document.activeElement === input.value) {
    calcPosition()
  }
})

onMounted(() => {
  document.addEventListener('mousedown', onDocPointer)
  window.addEventListener('scroll', onScrollOrResize, true)
  window.addEventListener('resize', onScrollOrResize)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onDocPointer)
  window.removeEventListener('scroll', onScrollOrResize, true)
  window.removeEventListener('resize', onScrollOrResize)
})
</script>

<style scoped>
.pos-ac {
  width: 100%;
  min-width: 0;
}

.pos-ac__label {
  display: block;
  margin-bottom: 0.3rem;
  font-size: 0.68rem;
  font-weight: 700;
  color: #7a8fa3;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.pos-ac[dir='rtl'] .pos-ac__label {
  text-align: right;
}

.pos-ac__required {
  color: #e57373;
  margin-inline-start: 0.15rem;
}

.pos-ac__field {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 40px;
  padding: 0.4rem 2rem 0.4rem 0.85rem;
  border-radius: 10px;
  border: 1px solid #d9e2ec;
  background: #f7fafc;
  cursor: text;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.pos-ac[dir='rtl'] .pos-ac__field {
  padding: 0.4rem 0.85rem 0.4rem 2rem;
}

.pos-ac__field:hover:not(.pos-ac__field--disabled) {
  border-color: rgba(25, 119, 131, 0.35);
}

.pos-ac__field--open {
  border-color: #197783 !important;
  background: #fff !important;
  box-shadow: 0 0 0 3px rgba(25, 119, 131, 0.12) !important;
}

.pos-ac__field--locked {
  background: rgba(25, 119, 131, 0.05) !important;
  border-color: rgba(25, 119, 131, 0.22) !important;
  cursor: default;
}

.pos-ac__field--disabled {
  opacity: 0.55;
  cursor: not-allowed;
  background: #eef2f6;
}

.pos-ac__field--error {
  border-color: #e57373 !important;
}

.pos-ac__input {
  flex: 1;
  min-width: 0;
  border: none !important;
  outline: none !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin: 0 !important;
  font-size: 0.9rem;
  line-height: 1.4;
  color: #1e293b;
  font-family: inherit;
  text-align: start;
}

.pos-ac__input[dir='rtl'] {
  direction: rtl;
  text-align: right;
}

.pos-ac__input[dir='ltr'] {
  direction: ltr;
  text-align: left;
}

.pos-ac__input::placeholder {
  color: #94a3b8;
}

.pos-ac__input[dir='rtl']::placeholder {
  text-align: right;
}

.pos-ac__input:read-only {
  color: #197783;
  font-weight: 600;
  cursor: default;
  text-overflow: ellipsis;
}

.pos-ac__icons {
  position: absolute;
  top: 50%;
  inset-inline-end: 8px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
}

.pos-ac__clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: rgba(100, 116, 139, 0.12);
  color: #64748b;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s, background 0.15s;
}

.pos-ac__clear:hover {
  color: #fff;
  background: #ef4444;
}

.pos-ac__clear svg {
  width: 11px;
  height: 11px;
}

.pos-ac__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(25, 119, 131, 0.2);
  border-top-color: #197783;
  border-radius: 50%;
  animation: pos-ac-spin 0.7s linear infinite;
}

@keyframes pos-ac-spin {
  to { transform: rotate(360deg); }
}

.pos-ac__error {
  margin: 0.3rem 0 0;
  font-size: 0.75rem;
  color: #e57373;
}

.pos-ac__dropdown {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, #f8fafc 100%);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow:
    0 16px 28px -6px rgba(15, 23, 42, 0.12),
    0 6px 10px -4px rgba(15, 23, 42, 0.05),
    0 0 0 1px rgba(255, 255, 255, 0.4) inset;
  max-height: 15rem;
  overflow-y: auto;
  padding: 0.3rem 0;
  animation: pos-ac-enter 0.18s ease;
}

/* Keep scrollbar on the right in Arabic; option text stays RTL */
.pos-ac__dropdown[dir='rtl'] {
  direction: ltr;
}

.pos-ac__dropdown[dir='rtl'] > * {
  direction: rtl;
  text-align: right;
}

.pos-ac__dropdown[dir='ltr'] > * {
  direction: ltr;
  text-align: left;
}

@keyframes pos-ac-enter {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.pos-ac__empty {
  padding: 0.75rem 1rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.88rem;
}

.pos-ac__option {
  display: block;
  width: 100%;
  padding: 0.6rem 1rem;
  border: none;
  background: none;
  text-align: inherit;
  font-size: 0.9rem;
  color: #1e293b;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s ease;
}

.pos-ac__option:hover,
.pos-ac__option--active {
  background: rgba(25, 119, 131, 0.08);
}

.pos-ac__option--selected {
  background: rgba(25, 119, 131, 0.12);
  color: #197783;
  font-weight: 600;
}
</style>
