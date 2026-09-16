<template>
  <v-dialog
    :model-value="modelValue"
    max-width="440"
    :dir="state.dir"
    content-class="receipt-print-preview-overlay"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="preview-shell" :class="{ 'preview-shell--visible': modelValue }">
      <div class="preview-toolbar no-print">
        <div class="preview-toolbar-title">
          <v-icon size="20">mdi-receipt-text-outline</v-icon>
          <span>{{ $t('receiptPreview') }}</span>
        </div>
        <div class="preview-toolbar-actions">
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            prepend-icon="mdi-printer"
            :disabled="loading || !template"
            @click="print"
          >
            {{ $t('printReceipt') }}
          </v-btn>
          <v-btn icon variant="text" size="small" :aria-label="$t('back')" @click="close">
            <v-icon>{{ closeIcon }}</v-icon>
          </v-btn>
        </div>
      </div>

      <div v-if="loading" class="preview-loading no-print">{{ $t('loading') }}…</div>
      <div v-else-if="error" class="preview-error no-print">{{ error }}</div>
      <div v-else class="preview-body" ref="printRoot">
        <ReceiptTemplateRenderer
          :template="template"
          :details="details"
          :items="items"
          :items-subtotal="itemsSubtotal"
        />
      </div>
    </div>
  </v-dialog>
</template>

<script setup>
import { computed, getCurrentInstance, nextTick, ref, watch } from 'vue'
import ReceiptTemplateRenderer from './print/ReceiptTemplateRenderer.vue'
import PrintTemplateService from '../services/PrintTemplateService'
import ReceiptService from '../services/ReceiptService'
import { createDefaultReceiptTemplate } from '../print/defaultReceiptTemplate'
import { useState } from '../store/state'
import { useIsMobile } from '../composables/useIsMobile'
import { useMobileOverlayBack, useNavArrowIcon } from '../composables/useMobileBackStack'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  receiptId: { type: [String, Number], default: null }
})

const emit = defineEmits(['update:modelValue'])

const instance = getCurrentInstance()
const $t = (key) => instance?.appContext?.config?.globalProperties?.$t?.(key) ?? key
const state = useState()

const loading = ref(false)
const error = ref('')
const template = ref(null)
const details = ref(null)
const items = ref([])
const itemsSubtotal = ref(0)
const printRoot = ref(null)

function close() {
  emit('update:modelValue', false)
}

const isMobile = useIsMobile()
const navArrowIcon = useNavArrowIcon()
const closeIcon = computed(() => (isMobile.value ? navArrowIcon.value : 'mdi-close'))
useMobileOverlayBack(() => props.modelValue, close)

function normalizeItemRow(raw) {
  const nested = raw?.item || {}
  return {
    itemId: nested.id ?? raw.itemId,
    itemNameAr: nested.nameAr ?? raw.itemNameAr,
    itemNameEn: nested.nameEn ?? raw.itemNameEn,
    sellingPrice: nested.sellingPrice ?? nested.sellingPriceDollar ?? raw.sellingPrice ?? raw.sellingPriceDollar,
    sellingCurrency: nested.sellingCurrency ?? raw.sellingCurrency ?? 0,
    quantity: raw.quantity,
    itemDiscount: raw.itemDiscount,
    isDiscountPercent: raw.isDiscountPercent,
    subTotal: raw.subTotal
  }
}

async function load() {
  if (!props.receiptId) return
  loading.value = true
  error.value = ''
  details.value = null
  items.value = []
  itemsSubtotal.value = 0
  try {
    const [tplRes, detailsRes, itemsRes] = await Promise.all([
      PrintTemplateService.getPrintTemplate('RECEIPT_80').catch(() => null),
      ReceiptService.getReceiptDetails(props.receiptId),
      ReceiptService.getReceiptItems(props.receiptId)
    ])

    const tpl = tplRes?.data?.data
    template.value = tpl
      ? {
          code: tpl.code,
          paperWidthMm: tpl.paperWidthMm || 80,
          blocks: tpl.blocks || []
        }
      : createDefaultReceiptTemplate()

    details.value = detailsRes?.data?.data || null
    const itemsData = itemsRes?.data?.data || {}
    items.value = (itemsData.items || []).map(normalizeItemRow)
    const subtotalFromApi = Number(itemsData.itemsSubtotal)
    itemsSubtotal.value = Number.isFinite(subtotalFromApi) && subtotalFromApi > 0
      ? subtotalFromApi
      : items.value.reduce((sum, row) => sum + (Number(row.subTotal) || 0), 0)
  } catch (e) {
    console.error(e)
    error.value = $t('printTemplateLoadFailed')
    template.value = createDefaultReceiptTemplate()
  } finally {
    loading.value = false
  }
}

async function print() {
  await nextTick()
  const node = printRoot.value
  if (!node) {
    window.print()
    return
  }

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    window.print()
    return
  }

  const widthMm = template.value?.paperWidthMm || 80
  doc.open()
  doc.write(`<!DOCTYPE html><html><head><title>Receipt</title>
    <style>
      @page { size: ${widthMm}mm auto; margin: 0; }
      html, body { margin: 0; padding: 0; background: #fff; }
      body { display: flex; justify-content: center; }
      .thermal-receipt { border: none !important; }
    </style>
  </head><body></body></html>`)
  doc.close()

  const clone = node.cloneNode(true)
  doc.body.appendChild(clone)

  // Copy computed styles from scoped Vue CSS by inlining link to current stylesheets is hard;
  // duplicate essential thermal styles for the iframe print.
  const style = doc.createElement('style')
  style.textContent = `
    .thermal-receipt {
      box-sizing: border-box;
      width: ${widthMm}mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 10px 8px 14px;
      background: #fff;
      color: #111;
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.35;
    }
    .block { margin-bottom: 8px; }
    .block-header { text-align: center; padding-bottom: 6px; border-bottom: 1px dashed #333; }
    .shop-name { font-size: 15px; font-weight: 700; text-transform: uppercase; }
    .shop-line { margin-top: 2px; font-size: 11px; word-break: break-word; }
    .meta-row, .totals-row, .pay-row { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 2px; }
    .pay-row--muted { opacity: 0.75; font-size: 11px; }
    .items-head, .item-main { display: grid; grid-template-columns: 1fr 36px 72px; gap: 4px; }
    .items-head { border-bottom: 1px solid #333; padding-bottom: 3px; margin-bottom: 4px; font-weight: 700; font-size: 11px; }
    .col-qty, .col-amt { text-align: end; }
    .item-row { margin-bottom: 5px; }
    .item-disc { font-size: 10px; opacity: 0.8; }
    .totals-row--grand { margin-top: 4px; padding-top: 4px; border-top: 1px dashed #333; font-weight: 700; font-size: 13px; }
    .block-payment { border-top: 1px dashed #999; padding-top: 6px; }
    .custom-text, .footer-text { text-align: center; margin: 0; white-space: pre-wrap; }
    .dashed { border-top: 1px dashed #333; margin-bottom: 6px; }
  `
  doc.head.appendChild(style)

  const win = iframe.contentWindow
  setTimeout(() => {
    win?.focus()
    win?.print()
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 500)
  }, 50)
}

watch(
  () => [props.modelValue, props.receiptId],
  ([open]) => {
    if (open) load()
  }
)
</script>

<style scoped>
.preview-shell {
  background: #eef2f3;
  border-radius: 16px;
  overflow: hidden;
  transform: scale(0.97);
  opacity: 0;
  transition: transform 0.28s ease, opacity 0.22s ease;
}

.preview-shell--visible {
  transform: scale(1);
  opacity: 1;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  background: linear-gradient(135deg, #0f4f58, #197783 60%, #32d8ee);
  color: #fff;
}

.preview-toolbar-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 700;
}

.preview-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.preview-loading,
.preview-error {
  padding: 2rem 1rem;
  text-align: center;
  color: #4d6066;
}

.preview-error {
  color: #b42318;
}

.preview-body {
  padding: 1rem;
  display: flex;
  justify-content: center;
  max-height: min(78vh, 820px);
  overflow: auto;
}
</style>
