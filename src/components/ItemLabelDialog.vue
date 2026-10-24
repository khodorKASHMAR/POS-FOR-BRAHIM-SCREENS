<template>
  <v-dialog
    :model-value="modelValue"
    max-width="860"
    :persistent="busy"
    content-class="item-label-overlay"
    @update:model-value="close"
  >
    <div class="ld" :dir="state.dir">
      <header class="ld-head">
        <span class="ld-head__orb">
          <v-icon size="22">mdi-tag-text-outline</v-icon>
        </span>
        <div class="ld-head__titles">
          <h3>{{ $t('itemLabelTitle') }}</h3>
          <small>{{ itemNameFor(state.lang === 'en' ? 'en' : 'ar') }}</small>
        </div>
        <span class="ld-chip">{{ LABEL_WIDTH_MM }} × {{ LABEL_HEIGHT_MM }} mm</span>
        <button type="button" class="ld-head__close" :disabled="busy" @click="close(false)">
          <v-icon size="20">mdi-close</v-icon>
        </button>
      </header>

      <div class="ld-body">
        <section class="ld-preview">
          <div class="ld-preview__caption">
            <span class="live-dot" />
            {{ $t('labelPreview') }}
            <span v-if="barcode" class="ld-preview__code">CODE128 · {{ barcode }}</span>
          </div>

          <div class="ld-bed">
            <div v-if="!barcode" class="no-barcode">
              <span class="no-barcode__icon">
                <v-icon size="28">mdi-barcode-off</v-icon>
              </span>
              <strong>{{ $t('labelNoBarcode') }}</strong>
              <p>{{ $t('labelNoBarcodeHint') }}</p>
              <button type="button" class="ld-btn ld-btn--primary" :disabled="generating" @click="generateBarcode">
                <v-progress-circular v-if="generating" indeterminate size="16" width="2" />
                <v-icon v-else size="18">mdi-barcode</v-icon>
                <span>{{ $t('labelGenerateBarcode') }}</span>
              </button>
            </div>

            <div v-else class="ld-pad" dir="ltr">
              <button
                v-for="move in moves"
                :key="move.key"
                type="button"
                class="ld-arrow"
                :class="`ld-arrow--${move.key}`"
                :title="$t(move.label)"
                :aria-label="$t(move.label)"
                :disabled="!canMove(move)"
                @click="moveLabel(move)"
              >
                <v-icon size="20">{{ move.icon }}</v-icon>
              </button>
              <div class="ld-paper">
                <img v-if="preview.url" :src="preview.url" alt="" />
                <div v-else class="ld-paper__error">
                  <v-icon size="22">mdi-alert-circle-outline</v-icon>
                  <span>{{ $t('labelPreviewFailed') }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="preview.url" class="ld-position">
            <span class="ld-position__icon">
              <v-icon size="18">mdi-arrow-all</v-icon>
            </span>
            <div class="ld-position__text">
              <strong>{{ positionText }}</strong>
              <small>{{ $t('labelPositionHint') }}</small>
            </div>
            <button type="button" class="ld-btn ld-btn--soft" :disabled="isDefaultOffset" @click="resetOffset">
              <v-icon size="16">mdi-restore</v-icon>
              <span>{{ $t('labelPositionReset') }}</span>
            </button>
          </div>

          <div class="ld-printer" :class="{ 'ld-printer--on': !!pairedPrinter }">
            <span class="ld-printer__icon">
              <v-icon size="18">mdi-printer-outline</v-icon>
            </span>
            <div class="ld-printer__text">
              <strong>{{ $t('labelPrinter') }}</strong>
              <small>{{ printerStatusText }}</small>
            </div>
            <button
              v-if="usbSupported"
              type="button"
              class="ld-btn ld-btn--soft"
              :disabled="busy"
              @click="pairPrinter"
            >
              <v-progress-circular v-if="pairing" indeterminate size="14" width="2" />
              <v-icon v-else size="16">mdi-usb</v-icon>
              <span>{{ $t('connectUsbPrinter') }}</span>
            </button>
          </div>
        </section>

        <section class="ld-options">
          <div class="ld-field">
            <span class="ld-label">
              <v-icon size="16">mdi-translate</v-icon>
              {{ $t('labelLanguage') }}
            </span>
            <div class="ld-seg ld-seg--3">
              <button
                v-for="option in languageOptions"
                :key="option.value"
                type="button"
                :class="{ active: language === option.value }"
                @click="language = option.value"
              >
                {{ $t(option.label) }}
              </button>
            </div>
          </div>

          <div class="ld-field">
            <span class="ld-label">
              <v-icon size="16">mdi-format-text</v-icon>
              {{ $t('labelNameOnLabel') }}
            </span>
            <div class="ld-names">
              <v-text-field
                v-if="showArabic"
                v-model="nameAr"
                dir="rtl"
                :label="$t('labelNameAr')"
                density="compact"
                variant="outlined"
                hide-details
                :append-inner-icon="nameAr !== itemNameFor('ar') ? 'mdi-restore' : undefined"
                @click:append-inner="nameAr = itemNameFor('ar')"
              />
              <v-text-field
                v-if="showEnglish"
                v-model="nameEn"
                dir="ltr"
                :label="$t('labelNameEn')"
                density="compact"
                variant="outlined"
                hide-details
                :append-inner-icon="nameEn !== itemNameFor('en') ? 'mdi-restore' : undefined"
                @click:append-inner="nameEn = itemNameFor('en')"
              />
            </div>
            <small class="ld-hint">
              <v-icon size="14">mdi-information-outline</v-icon>
              {{ $t('labelNameHint') }}
            </small>
          </div>

          <div class="ld-field ld-field--inline">
            <span class="ld-label">
              <v-icon size="16">mdi-format-size</v-icon>
              {{ $t('labelTextSize') }}
            </span>
            <div class="ld-stepper">
              <button
                type="button"
                :disabled="textSize <= LABEL_TEXT_SIZE_MIN"
                :aria-label="$t('labelTextSmaller')"
                :title="$t('labelTextSmaller')"
                @click="changeTextSize(-LABEL_TEXT_SIZE_STEP)"
              >
                <v-icon size="18">mdi-format-font-size-decrease</v-icon>
              </button>
              <button
                type="button"
                class="ld-stepper__value"
                :disabled="textSize === LABEL_TEXT_SIZE_DEFAULT"
                :title="$t('labelTextSizeReset')"
                @click="changeTextSize(LABEL_TEXT_SIZE_DEFAULT - textSize)"
              >
                {{ textSize }}%
              </button>
              <button
                type="button"
                :disabled="!canEnlargeText"
                :aria-label="$t('labelTextLarger')"
                :title="preview.namesShrunk ? $t('labelTextSizeMaxed') : $t('labelTextLarger')"
                @click="changeTextSize(LABEL_TEXT_SIZE_STEP)"
              >
                <v-icon size="18">mdi-format-font-size-increase</v-icon>
              </button>
            </div>
          </div>

          <div class="ld-field-row">
            <div class="ld-field">
              <span class="ld-label">
                <v-icon size="16">mdi-cash-multiple</v-icon>
                {{ $t('labelCurrency') }}
              </span>
              <div class="ld-seg">
                <button
                  v-for="option in currencyOptions"
                  :key="option.value"
                  type="button"
                  :class="{ active: currency === option.value }"
                  @click="currency = option.value"
                >
                  {{ $t(option.label) }}
                </button>
              </div>
            </div>

            <div class="ld-field">
              <span class="ld-label">
                <v-icon size="16">mdi-content-copy</v-icon>
                {{ $t('labelCopies') }}
              </span>
              <div class="ld-stepper">
                <button type="button" :disabled="copies <= 1" @click="copies = clampCopies(copies - 1)">
                  <v-icon size="18">mdi-minus</v-icon>
                </button>
                <input
                  :value="copies"
                  type="number"
                  min="1"
                  :max="MAX_LABEL_COPIES"
                  @change="copies = clampCopies($event.target.value)"
                />
                <button type="button" :disabled="copies >= MAX_LABEL_COPIES" @click="copies = clampCopies(copies + 1)">
                  <v-icon size="18">mdi-plus</v-icon>
                </button>
              </div>
            </div>
          </div>

          <div class="ld-price">
            <span class="ld-price__label">{{ $t('labelPriceOnLabel') }}</span>
            <strong class="ld-price__value">{{ priceText || '—' }}</strong>
            <small v-if="isConverted" class="ld-price__rate">{{ rateHint }}</small>
          </div>
        </section>
      </div>

      <footer class="ld-actions">
        <button type="button" class="ld-btn ld-btn--ghost" :disabled="busy" @click="close(false)">
          {{ $t('cancel') }}
        </button>
        <button type="button" class="ld-btn ld-btn--primary ld-btn--wide" :disabled="!canPrint" @click="print">
          <v-progress-circular v-if="printing" indeterminate size="16" width="2" />
          <v-icon v-else size="18">mdi-printer</v-icon>
          <span>{{ $t('printLabelCount').replace('{n}', copies) }}</span>
        </button>
      </footer>
    </div>
  </v-dialog>
</template>

<script setup>
import { computed, getCurrentInstance, ref, watch } from 'vue'
import { useState } from '../store/state'
import ItemService from '../services/ItemService'
import { CurrencyEnum } from '../constants/enums'
import { unitPriceInReceiptCurrency } from '../constants/currency'
import {
  LABEL_HEIGHT_MM,
  LABEL_OFFSET_STEP_MM,
  LABEL_TEXT_SIZE_DEFAULT,
  LABEL_TEXT_SIZE_MAX,
  LABEL_TEXT_SIZE_MIN,
  LABEL_TEXT_SIZE_STEP,
  LABEL_WIDTH_MM,
  MAX_LABEL_COPIES,
  formatLabelPrice,
  getLabelOffset,
  getLabelTextSize,
  layoutItemLabel,
  printItemLabel,
  saveLabelOffset,
  saveLabelTextSize
} from '../print/itemLabel'
import {
  printerConnectErrorKey,
  printerErrorKey,
  connectLabelPrinter,
  getPairedLabelPrinter,
  isUsbSupported
} from '../print/thermalPrinter'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  item: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'item-updated'])

const instance = getCurrentInstance()
const $t = (key) => instance?.appContext?.config?.globalProperties?.$t?.(key) ?? key
const $notification = (msg, status, delay) =>
  instance?.appContext?.config?.globalProperties?.$notification?.(msg, status, delay)
const state = useState()

const languageOptions = [
  { value: 'ar', label: 'labelArabic' },
  { value: 'en', label: 'labelEnglish' },
  { value: 'both', label: 'labelBoth' }
]

const currencyOptions = [
  { value: CurrencyEnum.DOLLAR, label: 'labelDollar' },
  { value: CurrencyEnum.LBP, label: 'labelLira' }
]

const moves = [
  { key: 'up', icon: 'mdi-chevron-up', dx: 0, dy: -1, label: 'labelMoveUp' },
  { key: 'left', icon: 'mdi-chevron-left', dx: -1, dy: 0, label: 'labelMoveLeft' },
  { key: 'right', icon: 'mdi-chevron-right', dx: 1, dy: 0, label: 'labelMoveRight' },
  { key: 'down', icon: 'mdi-chevron-down', dx: 0, dy: 1, label: 'labelMoveDown' }
]

const usbSupported = isUsbSupported()
const currentItem = ref(null)
const language = ref('ar')
const nameAr = ref('')
const nameEn = ref('')
const currency = ref(CurrencyEnum.DOLLAR)
const copies = ref(1)
const generating = ref(false)
const printing = ref(false)
const pairing = ref(false)
const pairedPrinter = ref(getPairedLabelPrinter())
const offset = ref(getLabelOffset())
const textSize = ref(getLabelTextSize())

const busy = computed(() => generating.value || printing.value || pairing.value)
const barcode = computed(() => (currentItem.value?.barcode || '').trim())
const showArabic = computed(() => language.value !== 'en')
const showEnglish = computed(() => language.value !== 'ar')

const printerStatusText = computed(() => {
  if (!usbSupported) return $t('printerUnsupportedBrowser')
  if (pairedPrinter.value) return `${$t('printerPaired')}: ${pairedPrinter.value.label}`
  return $t('labelPrinterHint')
})

function itemNameFor(lang) {
  const item = currentItem.value
  if (!item) return ''
  return lang === 'ar' ? item.nameAr || item.nameEn || '' : item.nameEn || item.nameAr || ''
}

const itemCurrency = computed(() => {
  const value = currentItem.value?.sellingCurrency
  return value != null && value !== '' ? Number(value) : CurrencyEnum.DOLLAR
})

const isConverted = computed(() => itemCurrency.value !== currency.value)

const priceText = computed(() => {
  const item = currentItem.value
  if (!item) return ''
  const amount = unitPriceInReceiptCurrency(item.sellingPrice, itemCurrency.value, currency.value, state.exchangeRate)
  return formatLabelPrice(amount, currency.value, language.value !== 'en')
})

const rateHint = computed(() =>
  $t('labelRateHint').replace('{rate}', Number(state.exchangeRate || 0).toLocaleString('en-US'))
)

const clampCopies = (value) => Math.min(MAX_LABEL_COPIES, Math.max(1, Math.floor(Number(value) || 1)))

const labelNames = computed(() => {
  const names = []
  if (showArabic.value) names.push({ text: nameAr.value, rtl: true })
  if (showEnglish.value) names.push({ text: nameEn.value, rtl: false })
  return names
})

const labelContent = computed(() => ({
  names: labelNames.value,
  barcode: barcode.value,
  price: priceText.value,
  textSize: textSize.value
}))

const preview = computed(() => {
  if (!props.modelValue || !barcode.value) return { url: '' }
  try {
    const label = layoutItemLabel(labelContent.value, offset.value)
    return {
      url: label.canvas.toDataURL('image/png'),
      offset: label.offset,
      range: label.range,
      namesShrunk: label.namesShrunk
    }
  } catch (e) {
    console.warn('Label preview failed:', e)
    return { url: '' }
  }
})

const isDefaultOffset = computed(() => !offset.value.x && !offset.value.y)

const positionText = computed(() => {
  const applied = preview.value.offset
  if (!applied || (!applied.x && !applied.y)) return $t('labelPositionDefault')
  const part = (value, negativeKey, positiveKey) =>
    value ? $t(value < 0 ? negativeKey : positiveKey).replace('{n}', Math.abs(value)) : ''
  return [part(applied.x, 'labelOffsetLeft', 'labelOffsetRight'), part(applied.y, 'labelOffsetUp', 'labelOffsetDown')]
    .filter(Boolean)
    .join(' · ')
})

function movedOffset(move) {
  const { x, y } = preview.value.offset
  return { x: x + move.dx * LABEL_OFFSET_STEP_MM, y: y + move.dy * LABEL_OFFSET_STEP_MM }
}

function canMove(move) {
  const { range } = preview.value
  if (!range || busy.value) return false
  const next = movedOffset(move)
  return next.x >= range.minX && next.x <= range.maxX && next.y >= range.minY && next.y <= range.maxY
}

function moveLabel(move) {
  if (!canMove(move)) return
  offset.value = movedOffset(move)
  saveLabelOffset(offset.value)
}

function resetOffset() {
  offset.value = { x: 0, y: 0 }
  saveLabelOffset(offset.value)
}

const canEnlargeText = computed(() => textSize.value < LABEL_TEXT_SIZE_MAX && !preview.value.namesShrunk)

function changeTextSize(delta) {
  textSize.value = Math.min(LABEL_TEXT_SIZE_MAX, Math.max(LABEL_TEXT_SIZE_MIN, textSize.value + delta))
  saveLabelTextSize(textSize.value)
}

const canPrint = computed(
  () =>
    !busy.value &&
    !!barcode.value &&
    labelNames.value.every((n) => n.text.trim()) &&
    !!preview.value.url
)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    currentItem.value = props.item ? { ...props.item } : null
    copies.value = 1
    pairedPrinter.value = getPairedLabelPrinter()
    offset.value = getLabelOffset()
    textSize.value = getLabelTextSize()
    language.value = state.lang === 'en' ? 'en' : 'ar'
    nameAr.value = itemNameFor('ar')
    nameEn.value = itemNameFor('en')
    currency.value = itemCurrency.value
  },
  { immediate: true }
)

function close(value = false) {
  if (busy.value) return
  emit('update:modelValue', value)
}

function itemPayload(item, newBarcode) {
  return {
    nameAr: item.nameAr,
    nameEn: item.nameEn,
    barcode: newBarcode,
    categoryId: item.categoryId,
    buyingPrice: item.buyingPrice,
    buyingCurrency: item.buyingCurrency,
    buyingRate: item.buyingRate,
    sellingPrice: item.sellingPrice,
    sellingCurrency: item.sellingCurrency
  }
}

async function generateBarcode() {
  const previousId = currentItem.value?.id
  if (!previousId) return
  generating.value = true
  try {
    const [codeResponse, itemResponse] = await Promise.all([
      ItemService.generateBarcode(),
      ItemService.getItemById(previousId)
    ])
    const newBarcode = codeResponse?.data?.data?.barcode
    const fullItem = itemResponse?.data?.data
    if (!newBarcode || !fullItem) throw new Error('Barcode generation returned no data')
    const response = await ItemService.updateItem(previousId, itemPayload(fullItem, newBarcode))
    const saved = response?.data?.data
    if (!response?.data?.success || !saved) throw new Error('Item update failed')
    currentItem.value = { ...currentItem.value, ...saved, barcode: saved.barcode || newBarcode }
    emit('item-updated', saved, previousId)
    $notification($t('labelBarcodeSaved'), 'success')
  } catch (e) {
    $notification(e?.response?.data?.message || $t('errorGeneratingBarcode'), 'error')
  } finally {
    generating.value = false
  }
}

async function pairPrinter() {
  pairing.value = true
  try {
    pairedPrinter.value = await connectLabelPrinter()
  } catch (e) {
    if (e?.name !== 'NotFoundError') $notification($t(printerConnectErrorKey(e, 'label')), 'error', 5000)
  } finally {
    pairing.value = false
  }
}

async function print() {
  if (!canPrint.value) return
  printing.value = true
  try {
    await printItemLabel(labelContent.value, copies.value, offset.value)
    $notification($t('labelPrintSent'), 'success')
    emit('update:modelValue', false)
  } catch (e) {
    console.error('Label print failed:', e)
    $notification($t(printerErrorKey(e, 'label')), 'error', 6000)
    pairedPrinter.value = getPairedLabelPrinter()
  } finally {
    printing.value = false
  }
}
</script>

<style scoped>
.ld {
  --ink: #16363a;
  --muted: #5f7a7e;
  --line: #e3ecef;
  --soft: #f4f8f9;
  --teal: #197783;
  --teal-bright: #32d8ee;
  --teal-wash: rgba(25, 119, 131, 0.08);

  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 48px);
  border-radius: 22px;
  background: #ffffff;
  border: 1px solid var(--line);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
  overflow: hidden;
  animation: ld-rise 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.15);
}

/* Header */
.ld-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.95rem 1.25rem;
  border-bottom: 1px solid var(--line);
  background:
    radial-gradient(circle at 0% 0%, rgba(50, 216, 238, 0.12), transparent 45%),
    linear-gradient(180deg, #f6fcfd, #ffffff);
}

.ld-head__orb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  color: #ffffff;
  background: linear-gradient(135deg, var(--teal), var(--teal-bright));
  box-shadow: 0 8px 18px rgba(25, 119, 131, 0.25);
  flex-shrink: 0;
}

.ld-head__titles {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.ld-head__titles h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--ink);
}

.ld-head__titles small {
  font-size: 0.8rem;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ld-chip {
  flex-shrink: 0;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  background: var(--teal-wash);
  color: var(--teal);
  font-size: 0.75rem;
  font-weight: 700;
  direction: ltr;
}

.ld-head__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: #ffffff;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.ld-head__close:hover:not(:disabled) {
  color: var(--ink);
  border-color: rgba(25, 119, 131, 0.4);
}

/* Body */
.ld-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
}

.ld-preview {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.1rem 1.25rem;
  background: var(--soft);
  border-inline-end: 1px solid var(--line);
}

.ld-preview__caption {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--ink);
}

.ld-preview__code {
  margin-inline-start: auto;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--muted);
  direction: ltr;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  animation: ld-live 1.6s ease-out infinite;
}

.ld-bed {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  padding: 1rem;
  border-radius: 16px;
  background:
    radial-gradient(circle at 1px 1px, rgba(25, 119, 131, 0.14) 1px, transparent 0) 0 0 / 14px 14px,
    #eef4f6;
}

.ld-paper {
  width: min(100%, 320px);
  aspect-ratio: 58 / 40;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08), 0 14px 30px rgba(15, 23, 42, 0.12);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ld-paper img {
  display: block;
  width: 100%;
  height: 100%;
}

/* Arrows around the sticker; kept LTR so "left" is always on the left. */
.ld-pad {
  display: grid;
  grid-template-columns: 34px minmax(0, 320px) 34px;
  grid-template-areas:
    '. up .'
    'left paper right'
    '. down .';
  place-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
}

.ld-pad .ld-paper {
  grid-area: paper;
  width: 100%;
}

.ld-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: #ffffff;
  color: var(--teal);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
}

.ld-arrow:hover:not(:disabled) {
  border-color: rgba(25, 119, 131, 0.4);
  background: #f2fafb;
}

.ld-arrow:not(:disabled):active {
  transform: scale(0.9);
}

.ld-arrow:disabled {
  color: #b6c6c9;
  box-shadow: none;
  cursor: not-allowed;
}

.ld-arrow--up { grid-area: up; }
.ld-arrow--down { grid-area: down; }
.ld-arrow--left { grid-area: left; }
.ld-arrow--right { grid-area: right; }

.ld-position {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem 0.7rem;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid var(--line);
}

.ld-position__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: var(--teal);
  background: var(--teal-wash);
  flex-shrink: 0;
}

.ld-position__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.ld-position__text strong {
  font-size: 0.83rem;
  color: var(--ink);
}

.ld-position__text small {
  font-size: 0.74rem;
  color: var(--muted);
}

.ld-paper__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 1rem;
  text-align: center;
  font-size: 0.85rem;
  color: #b91c1c;
}

.no-barcode {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  max-width: 300px;
  text-align: center;
}

.no-barcode__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  color: #c2410c;
  background: #fff1ea;
  box-shadow: 0 0 0 8px rgba(232, 73, 42, 0.08);
  margin-bottom: 0.4rem;
}

.no-barcode strong {
  color: var(--ink);
}

.no-barcode p {
  margin: 0 0 0.5rem;
  font-size: 0.84rem;
  line-height: 1.5;
  color: var(--muted);
}

.ld-printer {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.6rem 0.7rem;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid var(--line);
}

.ld-printer__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: #b45309;
  background: #fef3c7;
  flex-shrink: 0;
}

.ld-printer--on .ld-printer__icon {
  color: #ffffff;
  background: linear-gradient(135deg, #059669, #34d399);
}

.ld-printer__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.ld-printer__text strong {
  font-size: 0.83rem;
  color: var(--ink);
}

.ld-printer__text small {
  font-size: 0.74rem;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Options */
.ld-options {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1rem 1.25rem;
}

.ld-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-width: 0;
}

.ld-field-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.85rem;
}

.ld-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--ink);
}

.ld-label .v-icon {
  color: var(--teal);
}

/* Room for both name fields, so switching language does not resize the dialog. */
.ld-names {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  min-height: 89px;
}

.ld-names > * {
  flex: 0 0 auto;
}

.ld-hint {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.74rem;
  color: var(--muted);
}

.ld-seg {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: var(--soft);
  border: 1px solid var(--line);
}

.ld-seg--3 {
  grid-template-columns: repeat(3, 1fr);
}

.ld-seg button {
  height: 34px;
  padding: 0 0.5rem;
  border-radius: 9px;
  border: none;
  background: transparent;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--muted);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.ld-seg button:hover:not(.active) {
  color: var(--ink);
}

.ld-seg button.active {
  background: #ffffff;
  color: var(--teal);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(25, 119, 131, 0.18);
}

.ld-stepper {
  display: inline-flex;
  align-items: center;
  height: 44px;
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  direction: ltr;
  background: #ffffff;
}

.ld-stepper button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 100%;
  border: none;
  background: var(--soft);
  color: var(--teal);
  cursor: pointer;
}

.ld-stepper button:disabled {
  color: #b6c6c9;
  cursor: not-allowed;
}

.ld-stepper input {
  width: 52px;
  height: 100%;
  border: none;
  border-inline: 1px solid var(--line);
  text-align: center;
  font-weight: 800;
  font-size: 0.95rem;
  color: var(--ink);
  outline: none;
  -moz-appearance: textfield;
}

.ld-stepper .ld-stepper__value {
  width: 58px;
  border-inline: 1px solid var(--line);
  background: #ffffff;
  color: var(--ink);
  font-weight: 800;
  font-size: 0.9rem;
}

.ld-stepper .ld-stepper__value:disabled {
  color: var(--ink);
  cursor: default;
}

.ld-field--inline {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
}

.ld-stepper input::-webkit-outer-spin-button,
.ld-stepper input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.ld-price {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.6rem;
  margin-top: auto;
  padding: 0.75rem 0.9rem;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(25, 119, 131, 0.07), rgba(50, 216, 238, 0.08));
  border: 1px solid rgba(25, 119, 131, 0.14);
}

.ld-price__label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--muted);
}

.ld-price__value {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--teal);
  direction: ltr;
  unicode-bidi: isolate;
}

.ld-price__rate {
  flex-basis: 100%;
  font-size: 0.72rem;
  color: var(--muted);
}

/* Footer */
.ld-actions {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid var(--line);
  background: #ffffff;
}

.ld-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  height: 42px;
  padding: 0 1.1rem;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: box-shadow 0.25s ease, transform 0.15s ease, background 0.2s ease, border-color 0.2s ease;
}

.ld-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.ld-btn:not(:disabled):active {
  transform: scale(0.97);
}

.ld-btn--wide {
  min-width: 190px;
}

.ld-btn--ghost {
  border: 1px solid var(--line);
  background: #ffffff;
  color: #334155;
}

.ld-btn--ghost:not(:disabled):hover {
  border-color: rgba(25, 119, 131, 0.4);
  color: var(--teal);
}

.ld-btn--primary {
  border: none;
  color: #ffffff;
  background: linear-gradient(135deg, var(--teal), var(--teal-bright));
  box-shadow: 0 6px 16px rgba(25, 119, 131, 0.24);
}

.ld-btn--primary:not(:disabled):hover {
  box-shadow: 0 10px 22px rgba(25, 119, 131, 0.3);
  transform: translateY(-1px);
}

.ld-btn--soft {
  height: 34px;
  padding: 0 0.75rem;
  border: none;
  border-radius: 10px;
  font-size: 0.8rem;
  color: var(--teal);
  background: var(--teal-wash);
}

.ld-btn--soft:not(:disabled):hover {
  background: rgba(25, 119, 131, 0.14);
}

@media (max-width: 760px) {
  .ld-body {
    grid-template-columns: 1fr;
  }

  .ld-preview {
    border-inline-end: none;
    border-bottom: 1px solid var(--line);
  }

  .ld-bed {
    min-height: 0;
  }

  .ld-chip {
    display: none;
  }

  .ld-actions .ld-btn {
    flex: 1;
  }
}

@keyframes ld-rise {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: none; }
}

@keyframes ld-live {
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
  100% { box-shadow: 0 0 0 7px rgba(16, 185, 129, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .ld,
  .live-dot {
    animation: none;
  }
}
</style>
