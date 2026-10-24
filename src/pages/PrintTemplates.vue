<template>
  <div class="page-background">
    <TopBar />

    <div class="pt-page" :dir="state.dir">
      <header class="pt-hero">
        <div class="pt-hero__icon">
          <v-icon size="26">mdi-receipt-text-outline</v-icon>
        </div>
        <div class="pt-hero__text">
          <h1 class="pt-title">{{ $t('printTemplates') }}</h1>
          <p class="pt-subtitle">{{ $t('printTemplatesSubtitle') }}</p>
        </div>
        <div class="pt-hero__actions">
          <span v-if="!loading" class="save-state" :class="{ 'save-state--dirty': isDirty }">
            <span class="save-state__dot" />
            {{ isDirty ? $t('unsavedChanges') : $t('allChangesSaved') }}
          </span>
          <v-btn
            variant="text"
            color="primary"
            prepend-icon="mdi-restore"
            :disabled="loading || saving"
            @click="resetToDefault"
          >
            {{ $t('resetTemplate') }}
          </v-btn>
          <v-btn
            class="save-btn"
            variant="flat"
            :loading="saving"
            :disabled="loading"
            prepend-icon="mdi-content-save-outline"
            @click="save"
          >
            {{ $t('save') }}
          </v-btn>
        </div>
      </header>

      <v-alert v-if="error" type="error" variant="tonal" class="mb-3" density="compact">
        {{ error }}
      </v-alert>
      <v-alert v-if="successMsg" type="success" variant="tonal" class="mb-3" density="compact">
        {{ successMsg }}
      </v-alert>

      <div class="pt-layout">
        <section class="pt-builder">
          <div class="settings-grid">
            <div class="setting-tile">
              <div class="setting-tile__head">
                <span class="setting-tile__icon"><v-icon size="17">mdi-cash-multiple</v-icon></span>
                {{ $t('printReceiptCurrency') }}
              </div>
              <div class="segmented" role="radiogroup" :aria-label="$t('printReceiptCurrency')">
                <button
                  v-for="opt in RECEIPT_CURRENCY_OPTIONS"
                  :key="opt"
                  type="button"
                  class="segmented-option"
                  :class="{ active: draft.receiptCurrency === opt }"
                  :aria-pressed="draft.receiptCurrency === opt"
                  :disabled="loading"
                  @click="draft.receiptCurrency = opt"
                >
                  {{ currencyOptionLabel(opt) }}
                </button>
              </div>
            </div>
            <div class="setting-tile">
              <div class="setting-tile__head">
                <span class="setting-tile__icon"><v-icon size="17">mdi-translate</v-icon></span>
                {{ $t('printReceiptLanguage') }}
              </div>
              <div class="segmented" role="radiogroup" :aria-label="$t('printReceiptLanguage')">
                <button
                  v-for="opt in RECEIPT_LANGUAGE_OPTIONS"
                  :key="opt"
                  type="button"
                  class="segmented-option"
                  :class="{ active: draft.receiptLanguage === opt }"
                  :aria-pressed="draft.receiptLanguage === opt"
                  :disabled="loading"
                  @click="draft.receiptLanguage = opt"
                >
                  {{ languageOptionLabel(opt) }}
                </button>
              </div>
            </div>
            <div class="setting-tile">
              <div class="setting-tile__head">
                <span class="setting-tile__icon"><v-icon size="17">mdi-format-size</v-icon></span>
                {{ $t('printFontSize') }}
                <span class="setting-tile__value">{{ draft.fontSize }}px</span>
              </div>
              <v-slider
                v-model="draft.fontSize"
                :min="RECEIPT_FONT_SIZE.min"
                :max="RECEIPT_FONT_SIZE.max"
                :step="1"
                :disabled="loading"
                :aria-label="$t('printFontSize')"
                color="primary"
                density="compact"
                hide-details
              />
            </div>
          </div>

          <div class="section-head">
            <span>{{ $t('receiptOrder') }}</span>
            <span class="section-count">{{ visibleBlockCount }} / {{ draft.blocks.length }}</span>
          </div>

          <div v-if="loading" class="pt-loading">
            <v-progress-circular indeterminate size="22" width="2" color="primary" />
          </div>
          <ol v-else class="timeline">
            <li
              v-for="(block, index) in draft.blocks"
              :key="block.id"
              class="tl-item"
              :class="{ 'tl-item--off': !block.enabled, 'tl-item--open': isOpen(block) }"
            >
              <span class="tl-dot">{{ index + 1 }}</span>
              <div class="tl-card">
                <div
                  class="tl-head"
                  :class="{ 'tl-head--clickable': canOpen(block) }"
                  @click="toggleOpen(block)"
                >
                  <span class="tl-icon"><v-icon size="18">{{ blockMeta(block.type).icon }}</v-icon></span>
                  <div class="tl-text">
                    <span class="tl-title">{{ $t(blockMeta(block.type).labelKey) }}</span>
                    <span class="tl-summary">{{ blockSummary(block) }}</span>
                  </div>
                  <div class="tl-actions" @click.stop>
                    <v-switch
                      v-if="blockMeta(block.type).toggleable"
                      v-model="block.enabled"
                      density="compact"
                      color="primary"
                      hide-details
                    />
                    <span v-else class="tl-lock" :title="$t('alwaysPrinted')">
                      <v-icon size="15">mdi-lock-outline</v-icon>
                    </span>
                  </div>
                  <v-icon v-if="canOpen(block)" class="tl-chevron" size="20">mdi-chevron-down</v-icon>
                </div>

                <v-expand-transition>
                  <div v-if="isOpen(block)" class="tl-body">
                    <div v-for="group in booleanGroups(block)" :key="group.key" class="chip-toggles">
                      <span class="chip-toggles__label">{{ $t(group.key) }}</span>
                      <div class="chip-toggles__list">
                        <button
                          v-for="field in group.fields"
                          :key="field.key"
                          type="button"
                          class="chip-toggle"
                          :class="{ active: isFieldOn(block.props, field) }"
                          :aria-pressed="isFieldOn(block.props, field)"
                          :disabled="!canToggleField(block, field)"
                          @click="toggleField(block, field)"
                        >
                          <v-icon size="14">
                            {{ isFieldOn(block.props, field) ? 'mdi-check' : 'mdi-plus' }}
                          </v-icon>
                          {{ $t(field.labelKey) }}
                        </button>
                      </div>
                      <span v-if="group.requireOne" class="chip-toggles__hint">{{ $t('atLeastOneRequired') }}</span>
                    </div>
                    <div v-if="inputFields(block).length" class="field-grid">
                      <div
                        v-for="field in inputFields(block)"
                        :key="field.key"
                        class="field"
                        :class="{ 'field--wide': field.input === 'textarea' || field.key === 'phone' }"
                      >
                        <v-textarea
                          v-if="field.input === 'textarea'"
                          v-model="block.props[field.key]"
                          :label="$t(field.labelKey)"
                          rows="2"
                          auto-grow
                          density="compact"
                          variant="outlined"
                          hide-details
                        />
                        <v-text-field
                          v-else
                          v-model="block.props[field.key]"
                          :label="$t(field.labelKey)"
                          density="compact"
                          variant="outlined"
                          hide-details
                        />
                      </div>
                    </div>
                  </div>
                </v-expand-transition>
              </div>
            </li>
          </ol>
        </section>

        <aside class="pt-preview">
          <div class="preview-head">
            <span class="preview-title">
              <span class="live-dot" />
              {{ $t('livePreview') }}
            </span>
            <span class="paper-chip">{{ draft.paperWidthMm || 80 }}mm</span>
          </div>

          <div ref="previewStageRef" class="preview-stage">
            <div class="printer-slot" />
            <div class="paper">
              <ReceiptTemplateRenderer
                :template="draft"
                :details="sample.details"
                :items="sample.items"
                :items-subtotal="sample.itemsSubtotal"
              />
            </div>
          </div>

          <div class="printer-strip" :class="{ 'printer-strip--on': !!pairedPrinter }">
            <span class="printer-strip__icon">
              <v-icon size="20">mdi-printer-pos-outline</v-icon>
            </span>
            <div class="printer-strip__text">
              <strong>{{ $t('thermalPrinter') }}</strong>
              <small>{{ printerStatusText }}</small>
            </div>
            <div class="printer-strip__actions">
              <v-btn
                size="small"
                color="primary"
                variant="flat"
                prepend-icon="mdi-usb"
                :disabled="!usbSupported || printerBusy"
                @click="pairPrinter"
              >
                {{ $t('connectUsbPrinter') }}
              </v-btn>
              <v-btn
                size="small"
                color="primary"
                variant="outlined"
                prepend-icon="mdi-printer"
                :loading="testPrinting"
                :disabled="!pairedPrinter || printerBusy"
                @click="testPrint"
              >
                {{ $t('testPrint') }}
              </v-btn>
              <v-btn
                size="small"
                color="error"
                variant="text"
                :disabled="!pairedPrinter || printerBusy"
                @click="unpairPrinter"
              >
                {{ $t('forgetPrinter') }}
              </v-btn>
            </div>
          </div>

          <div class="printer-strip" :class="{ 'printer-strip--on': !!pairedLabelPrinter }">
            <span class="printer-strip__icon">
              <v-icon size="20">mdi-tag-outline</v-icon>
            </span>
            <div class="printer-strip__text">
              <strong>{{ $t('labelPrinter') }}</strong>
              <small>{{ labelPrinterStatusText }}</small>
            </div>
            <div class="printer-strip__actions">
              <v-btn
                size="small"
                color="primary"
                variant="flat"
                prepend-icon="mdi-usb"
                :disabled="!usbSupported || labelPrinterBusy"
                @click="pairLabelPrinter"
              >
                {{ $t('connectUsbPrinter') }}
              </v-btn>
              <v-btn
                size="small"
                color="primary"
                variant="outlined"
                prepend-icon="mdi-printer"
                :loading="labelTestPrinting"
                :disabled="!pairedLabelPrinter || labelPrinterBusy"
                @click="testLabelPrint"
              >
                {{ $t('testPrint') }}
              </v-btn>
              <v-btn
                size="small"
                color="primary"
                variant="outlined"
                prepend-icon="mdi-ruler"
                :loading="labelCalibrating"
                :disabled="!pairedLabelPrinter || labelPrinterBusy"
                @click="calibrateLabels"
              >
                {{ $t('labelCalibrate') }}
              </v-btn>
              <v-btn
                size="small"
                color="error"
                variant="text"
                :disabled="!pairedLabelPrinter || labelPrinterBusy"
                @click="unpairLabelPrinter"
              >
                {{ $t('forgetPrinter') }}
              </v-btn>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, reactive, ref } from 'vue'
import TopBar from '../components/TopBar.vue'
import ReceiptTemplateRenderer from '../components/print/ReceiptTemplateRenderer.vue'
import PrintTemplateService from '../services/PrintTemplateService'
import {
  blockMeta,
  isFieldOn,
  normalizeFontSize,
  normalizeReceiptBlocks,
  RECEIPT_CURRENCY_OPTIONS,
  RECEIPT_FONT_SIZE,
  RECEIPT_LANGUAGE_OPTIONS
} from '../print/blockTypes'
import {
  createDefaultReceiptBlocks,
  createDefaultReceiptTemplate,
  createSampleReceiptData
} from '../print/defaultReceiptTemplate'
import { useState } from '../store/state'
import {
  connectLabelPrinter,
  connectPrinter,
  forgetLabelPrinter,
  forgetPrinter,
  getPairedLabelPrinter,
  getPairedPrinter,
  isUsbSupported,
  printerConnectErrorKey,
  printerErrorKey
} from '../print/thermalPrinter'
import { printReceiptElement } from '../print/thermalReceipt'
import { calibrateLabelPrinter, formatLabelPrice, printItemLabel } from '../print/itemLabel'
import { CurrencyEnum } from '../constants/enums'

const TEMPLATE_CODE = 'RECEIPT_80'

const instance = getCurrentInstance()
const $t = (key) => instance?.appContext?.config?.globalProperties?.$t?.(key) ?? key
const state = useState()

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const successMsg = ref('')
const sample = createSampleReceiptData()

const draft = reactive(createDefaultReceiptTemplate())
const savedSnapshot = ref('')
const openType = ref('HEADER')

function snapshot() {
  return JSON.stringify({
    receiptCurrency: draft.receiptCurrency,
    receiptLanguage: draft.receiptLanguage,
    fontSize: draft.fontSize,
    blocks: draft.blocks
  })
}

const isDirty = computed(() => !loading.value && snapshot() !== savedSnapshot.value)
const visibleBlockCount = computed(() => draft.blocks.filter((b) => b.enabled).length)

function applyTemplate(data) {
  draft.code = data.code || TEMPLATE_CODE
  draft.nameEn = data.nameEn || draft.nameEn
  draft.nameAr = data.nameAr || draft.nameAr
  draft.templateType = data.templateType || 'RECEIPT_80'
  draft.paperWidthMm = data.paperWidthMm || 80
  draft.receiptCurrency = RECEIPT_CURRENCY_OPTIONS.includes(data.receiptCurrency) ? data.receiptCurrency : 'SYSTEM'
  draft.receiptLanguage = RECEIPT_LANGUAGE_OPTIONS.includes(data.receiptLanguage) ? data.receiptLanguage : 'SYSTEM'
  draft.fontSize = normalizeFontSize(data.fontSize)
  draft.blocks = normalizeReceiptBlocks(data.blocks, createDefaultReceiptBlocks())
}

function markSaved() {
  savedSnapshot.value = snapshot()
}

function currencyOptionLabel(opt) {
  if (opt === 'USD') return $t('receiptCurrencyUsd')
  if (opt === 'LBP') return $t('receiptCurrencyLbp')
  return $t('optionSystem')
}

function languageOptionLabel(opt) {
  if (opt === 'AR') return $t('langArabic')
  if (opt === 'EN') return $t('langEnglish')
  return $t('optionSystem')
}

function booleanFields(block) {
  return blockMeta(block.type).fields.filter((f) => f.input === 'boolean')
}

function booleanGroups(block) {
  const groups = []
  for (const field of booleanFields(block)) {
    let group = groups.find((g) => g.key === field.group)
    if (!group) {
      group = { key: field.group, requireOne: false, fields: [] }
      groups.push(group)
    }
    group.fields.push(field)
    if (field.requireOne) group.requireOne = true
  }
  return groups
}

function canToggleField(block, field) {
  const fields = booleanFields(block)
  if (field.dependsOn) {
    const parent = fields.find((f) => f.key === field.dependsOn)
    if (parent && !isFieldOn(block.props, parent)) return false
  }
  if (field.requireOne && isFieldOn(block.props, field)) {
    return fields.some(
      (f) => f !== field && f.requireOne && f.group === field.group && isFieldOn(block.props, f)
    )
  }
  return true
}

function toggleField(block, field) {
  if (!canToggleField(block, field)) return
  block.props[field.key] = !isFieldOn(block.props, field)
}

function inputFields(block) {
  return blockMeta(block.type).fields.filter((f) => f.input !== 'boolean')
}

function canOpen(block) {
  return block.enabled && blockMeta(block.type).fields.length > 0
}

function isOpen(block) {
  return openType.value === block.type && canOpen(block)
}

function toggleOpen(block) {
  if (!canOpen(block)) return
  openType.value = isOpen(block) ? null : block.type
}

function localized(en, ar) {
  return state.lang === 'ar' ? ar || en : en || ar
}

function blockSummary(block) {
  if (!block.enabled) return $t('blockHidden')
  const p = block.props || {}
  switch (block.type) {
    case 'HEADER':
      return [localized(p.shopName, p.shopNameAr), p.phone].filter(Boolean).join(' · ') || $t('blockNotSet')
    case 'META':
      return $t('printBlockMetaHint')
    case 'ITEMS': {
      const shown = booleanFields(block)
        .filter((f) => f.group === 'itemLineDetails' && isFieldOn(p, f))
        .map((f) => $t(f.labelKey))
      return shown.length ? shown.join(' · ') : $t('noItemDetails')
    }
    case 'TOTALS':
      return booleanFields(block).filter((f) => isFieldOn(p, f)).map((f) => $t(f.labelKey)).join(' · ')
    case 'PAYMENT':
      return $t('printBlockPaymentHint')
    case 'CUSTOM_TEXT':
      return localized(p.textEn, p.textAr) || $t('blockNotSet')
    case 'FOOTER':
      return localized(p.footerEn, p.footerAr) || $t('blockNotSet')
    default:
      return ''
  }
}

function resetToDefault() {
  applyTemplate(createDefaultReceiptTemplate())
  successMsg.value = ''
  error.value = ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await PrintTemplateService.getPrintTemplate(TEMPLATE_CODE)
    const data = response?.data?.data
    if (data) applyTemplate(data)
  } catch (e) {
    console.error(e)
    applyTemplate(createDefaultReceiptTemplate())
    error.value = $t('printTemplateLoadFailed')
  } finally {
    markSaved()
    loading.value = false
  }
}

async function save() {
  saving.value = true
  error.value = ''
  successMsg.value = ''
  try {
    const payload = {
      nameEn: draft.nameEn,
      nameAr: draft.nameAr,
      templateType: draft.templateType,
      paperWidthMm: draft.paperWidthMm,
      receiptCurrency: draft.receiptCurrency,
      receiptLanguage: draft.receiptLanguage,
      fontSize: draft.fontSize,
      blocks: draft.blocks
    }
    const response = await PrintTemplateService.savePrintTemplate(TEMPLATE_CODE, payload)
    const data = response?.data?.data
    if (data) applyTemplate(data)
    markSaved()
    successMsg.value = $t('printTemplateSaved')
  } catch (e) {
    console.error(e)
    error.value = $t('printTemplateSaveFailed')
  } finally {
    saving.value = false
  }
}

const previewStageRef = ref(null)
const usbSupported = isUsbSupported()
const pairedPrinter = ref(getPairedPrinter())
const pairing = ref(false)
const testPrinting = ref(false)
const printerBusy = computed(() => pairing.value || testPrinting.value)

const printerStatusText = computed(() => {
  if (!usbSupported) return $t('printerUnsupportedBrowser')
  if (pairedPrinter.value) return `${$t('printerPaired')}: ${pairedPrinter.value.label}`
  return $t('printerNotPaired')
})

async function pairPrinter() {
  pairing.value = true
  error.value = ''
  successMsg.value = ''
  try {
    pairedPrinter.value = await connectPrinter()
  } catch (e) {
    console.error(e)
    // NotFoundError means the user closed the device picker without choosing.
    if (e?.name !== 'NotFoundError') error.value = $t(printerConnectErrorKey(e))
  } finally {
    pairing.value = false
  }
}

async function testPrint() {
  testPrinting.value = true
  error.value = ''
  successMsg.value = ''
  try {
    await printReceiptElement(previewStageRef.value?.querySelector('.thermal-receipt'))
    successMsg.value = $t('testPrintSent')
  } catch (e) {
    console.error(e)
    error.value = $t(printerErrorKey(e))
    pairedPrinter.value = getPairedPrinter()
  } finally {
    testPrinting.value = false
  }
}

async function unpairPrinter() {
  await forgetPrinter()
  pairedPrinter.value = null
}

const pairedLabelPrinter = ref(getPairedLabelPrinter())
const labelPairing = ref(false)
const labelTestPrinting = ref(false)
const labelCalibrating = ref(false)
const labelPrinterBusy = computed(() => labelPairing.value || labelTestPrinting.value || labelCalibrating.value)

const labelPrinterStatusText = computed(() => {
  if (!usbSupported) return $t('printerUnsupportedBrowser')
  if (pairedLabelPrinter.value) return `${$t('printerPaired')}: ${pairedLabelPrinter.value.label}`
  return $t('labelPrinterHint')
})

async function pairLabelPrinter() {
  labelPairing.value = true
  error.value = ''
  successMsg.value = ''
  try {
    pairedLabelPrinter.value = await connectLabelPrinter()
  } catch (e) {
    console.error(e)
    if (e?.name !== 'NotFoundError') error.value = $t(printerConnectErrorKey(e, 'label'))
  } finally {
    labelPairing.value = false
  }
}

async function testLabelPrint() {
  labelTestPrinting.value = true
  error.value = ''
  successMsg.value = ''
  try {
    const rtl = state.lang !== 'en'
    await printItemLabel(
      {
        names: [{ text: $t('labelTestName'), rtl }],
        barcode: '1234567890128',
        price: formatLabelPrice(10, CurrencyEnum.DOLLAR, rtl)
      },
      1
    )
    successMsg.value = $t('labelTestSent')
  } catch (e) {
    console.error(e)
    error.value = $t(printerErrorKey(e, 'label'))
    pairedLabelPrinter.value = getPairedLabelPrinter()
  } finally {
    labelTestPrinting.value = false
  }
}

async function calibrateLabels() {
  labelCalibrating.value = true
  error.value = ''
  successMsg.value = ''
  try {
    await calibrateLabelPrinter()
    successMsg.value = $t('labelCalibrateSent')
  } catch (e) {
    console.error(e)
    error.value = $t(printerErrorKey(e, 'label'))
  } finally {
    labelCalibrating.value = false
  }
}

async function unpairLabelPrinter() {
  await forgetLabelPrinter()
  pairedLabelPrinter.value = null
}

onMounted(load)
</script>

<style scoped>
.page-background {
  min-height: 100vh;
  background:
    radial-gradient(900px 420px at 100% -10%, rgba(50, 216, 238, 0.12), transparent 60%),
    radial-gradient(700px 380px at -10% 110%, rgba(25, 119, 131, 0.1), transparent 60%),
    linear-gradient(180deg, #f3f7f8 0%, #eef4f5 100%);
}

.pt-page {
  max-width: 1240px;
  margin: 0 auto;
  padding: 1rem 1.25rem 2.5rem;
}

/* Hero */
.pt-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.9rem 1rem;
  margin-bottom: 1rem;
}

.pt-hero__icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(135deg, #197783, #32d8ee);
  box-shadow: 0 10px 22px rgba(25, 119, 131, 0.28);
}

.pt-hero__text {
  flex: 1 1 240px;
  min-width: 0;
}

.pt-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f4f58;
  letter-spacing: -0.01em;
}

.pt-subtitle {
  margin: 0.15rem 0 0;
  color: #5a6b70;
  font-size: 0.9rem;
}

.pt-hero__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.save-state {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #0f766e;
  background: rgba(15, 118, 110, 0.08);
}

.save-state__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.save-state--dirty {
  color: #b45309;
  background: rgba(217, 119, 6, 0.12);
}

.save-state--dirty .save-state__dot {
  animation: pulse 1.4s ease-in-out infinite;
}

.save-btn {
  color: #fff !important;
  background: linear-gradient(135deg, #197783, #23a9bb) !important;
  box-shadow: 0 6px 16px rgba(25, 119, 131, 0.28);
  border-radius: 10px;
  font-weight: 700;
}

/* Layout */
.pt-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: 1.1rem;
  align-items: start;
}

@media (max-width: 1000px) {
  .pt-layout {
    grid-template-columns: 1fr;
  }
}

.pt-builder,
.pt-preview {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(15, 79, 88, 0.08);
  border-radius: 20px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
  padding: 1rem;
}

.pt-preview {
  position: sticky;
  top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

@media (max-width: 1000px) {
  .pt-preview {
    position: static;
  }
}

.pt-loading {
  display: grid;
  place-items: center;
  padding: 2rem 0;
}

/* Settings */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.setting-tile {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.8rem;
  border-radius: 14px;
  background: linear-gradient(180deg, #f8fcfd, #f1f8f9);
  border: 1px solid rgba(25, 119, 131, 0.12);
}

.setting-tile__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 0.88rem;
  color: #163e45;
}

.setting-tile__value {
  margin-inline-start: auto;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  color: #197783;
  background: rgba(25, 119, 131, 0.1);
}

.setting-tile__icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  color: #197783;
  background: rgba(25, 119, 131, 0.1);
}

.segmented {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 0.2rem;
  padding: 0.2rem;
  border-radius: 999px;
  background: #e8f1f3;
}

.segmented-option {
  height: 32px;
  padding: 0 0.6rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #475569;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.segmented-option:not(.active):not(:disabled):hover {
  color: #197783;
  background: rgba(255, 255, 255, 0.7);
}

.segmented-option.active {
  color: #fff;
  background: linear-gradient(135deg, #197783, #32d8ee);
  box-shadow: 0 4px 10px rgba(25, 119, 131, 0.25);
}

.segmented-option:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Timeline */
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.65rem;
  font-weight: 800;
  color: #0f4f58;
}

.section-count {
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  color: #197783;
  background: rgba(25, 119, 131, 0.1);
}

.timeline {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.timeline::before {
  content: '';
  position: absolute;
  inset-inline-start: 13px;
  top: 14px;
  bottom: 14px;
  width: 2px;
  background: linear-gradient(180deg, rgba(25, 119, 131, 0.35), rgba(50, 216, 238, 0.15));
}

.tl-item {
  position: relative;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 0.6rem;
  align-items: start;
}

.tl-dot {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin-top: 0.7rem;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #197783, #32d8ee);
  box-shadow: 0 0 0 4px #fff;
  transition: background 0.2s ease;
}

.tl-item--off .tl-dot {
  color: #94a3b8;
  background: #e2e8f0;
}

.tl-card {
  border-radius: 14px;
  border: 1px solid rgba(15, 79, 88, 0.1);
  background: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.tl-item--open .tl-card {
  border-color: rgba(25, 119, 131, 0.35);
  box-shadow: 0 10px 24px rgba(25, 119, 131, 0.1);
}

.tl-head {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.6rem 0.75rem;
}

.tl-head--clickable {
  cursor: pointer;
}

.tl-icon {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: #197783;
  background: rgba(25, 119, 131, 0.09);
}

.tl-item--off .tl-icon {
  color: #94a3b8;
  background: #f1f5f9;
}

.tl-text {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.tl-title {
  font-weight: 700;
  color: #163e45;
}

.tl-summary {
  font-size: 0.76rem;
  color: #678086;
  overflow-wrap: anywhere;
}

.tl-item--off .tl-title,
.tl-item--off .tl-summary {
  color: #94a3b8;
}

.tl-actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

.tl-lock {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: #197783;
  background: rgba(25, 119, 131, 0.08);
}

.tl-chevron {
  color: #94a3b8;
  transition: transform 0.2s ease;
}

.tl-item--open .tl-chevron {
  transform: rotate(180deg);
  color: #197783;
}

.tl-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.2rem 0.75rem 0.85rem;
}

.chip-toggles {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.chip-toggles__label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #678086;
}

.chip-toggles__list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.chip-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  border: 1px dashed #cbd5e1;
  background: #fff;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chip-toggles__hint {
  font-size: 0.72rem;
  color: #94a3b8;
}

.chip-toggle:not(:disabled):hover {
  border-color: #197783;
  color: #197783;
}

.chip-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.chip-toggle.active {
  border: 1px solid transparent;
  color: #fff;
  background: linear-gradient(135deg, #197783, #32d8ee);
  box-shadow: 0 4px 10px rgba(25, 119, 131, 0.22);
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}

.field--wide {
  grid-column: 1 / -1;
}

@media (max-width: 600px) {
  .field-grid {
    grid-template-columns: 1fr;
  }
}

/* Preview */
.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 800;
  color: #0f4f58;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5);
  animation: live 1.8s ease-out infinite;
}

.paper-chip {
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  color: #475569;
  background: #f1f5f9;
}

.preview-stage {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 0.75rem 1.25rem;
  border-radius: 16px;
  background:
    radial-gradient(rgba(15, 79, 88, 0.09) 1px, transparent 1px) 0 0 / 14px 14px,
    linear-gradient(180deg, #e9f2f4, #f5f9fa);
  max-height: calc(100vh - 230px);
  min-height: 320px;
  overflow: auto;
}

.printer-slot {
  position: sticky;
  top: 0;
  z-index: 2;
  flex: 0 0 auto;
  width: calc(80mm + 28px);
  max-width: 100%;
  height: 14px;
  border-radius: 0 0 10px 10px;
  background: linear-gradient(180deg, #1e3a40, #2f5a62);
  box-shadow: 0 6px 12px rgba(15, 23, 42, 0.25);
}

.paper {
  position: relative;
  margin-top: -4px;
  padding-bottom: 8px;
  filter: drop-shadow(0 10px 16px rgba(15, 23, 42, 0.14));
  animation: feed 0.6s ease-out;
}

.paper::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 8px;
  background:
    linear-gradient(135deg, #fff 50%, transparent 50%) 0 0 / 12px 8px repeat-x,
    linear-gradient(225deg, #fff 50%, transparent 50%) 0 0 / 12px 8px repeat-x;
}

.paper :deep(.thermal-receipt) {
  border: none;
  padding-top: 16px;
}

.printer-strip {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.6rem 0.7rem;
  align-items: center;
  padding: 0.75rem;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.printer-strip__icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  color: #64748b;
  background: #e2e8f0;
}

.printer-strip--on {
  background: rgba(16, 185, 129, 0.06);
  border-color: rgba(16, 185, 129, 0.25);
}

.printer-strip--on .printer-strip__icon {
  color: #fff;
  background: linear-gradient(135deg, #059669, #34d399);
}

.printer-strip__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.printer-strip__text strong {
  font-size: 0.88rem;
  color: #163e45;
}

.printer-strip__text small {
  font-size: 0.75rem;
  color: #64748b;
  overflow-wrap: anywhere;
}

.printer-strip__actions {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

@keyframes live {
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
  100% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
}

@keyframes feed {
  from { transform: translateY(-18px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
