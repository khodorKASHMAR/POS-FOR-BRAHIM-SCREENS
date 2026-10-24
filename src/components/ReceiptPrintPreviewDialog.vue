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
            :loading="printing"
            :disabled="loading || !template"
            @click="print"
          >
            {{ $t('printReceipt') }}
          </v-btn>
          <v-btn icon variant="text" size="small" :aria-label="$t('back')" @click="close">
            <v-icon>mdi-close</v-icon>
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
import { getCurrentInstance, nextTick, ref, watch } from 'vue'
import ReceiptTemplateRenderer from './print/ReceiptTemplateRenderer.vue'
import { createDefaultReceiptTemplate } from '../print/defaultReceiptTemplate'
import { loadReceiptPrintData } from '../print/receiptPrintData'
import { printReceiptElement } from '../print/thermalReceipt'
import { connectPrinter, getPairedPrinter, PRINTER_NOT_CONNECTED } from '../print/thermalPrinter'
import { useState } from '../store/state'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  receiptId: { type: [String, Number], default: null }
})

const emit = defineEmits(['update:modelValue'])

const instance = getCurrentInstance()
const $t = (key) => instance?.appContext?.config?.globalProperties?.$t?.(key) ?? key
const $notification = (msg, status, delay) =>
  instance?.appContext?.config?.globalProperties?.$notification?.(msg, status, delay)
const state = useState()

const loading = ref(false)
const printing = ref(false)
const error = ref('')
const template = ref(null)
const details = ref(null)
const items = ref([])
const itemsSubtotal = ref(0)
const printRoot = ref(null)

function close() {
  emit('update:modelValue', false)
}

async function load() {
  if (!props.receiptId) return
  loading.value = true
  error.value = ''
  details.value = null
  items.value = []
  itemsSubtotal.value = 0
  try {
    const data = await loadReceiptPrintData(props.receiptId)
    template.value = data.template
    details.value = data.details
    items.value = data.items
    itemsSubtotal.value = data.itemsSubtotal
  } catch (e) {
    console.error(e)
    error.value = $t('printTemplateLoadFailed')
    template.value = createDefaultReceiptTemplate()
  } finally {
    loading.value = false
  }
}

async function print() {
  printing.value = true
  try {
    // Pairing needs this click, so connect here when no printer was paired in this browser yet.
    if (!getPairedPrinter()) await connectPrinter()
    await nextTick()
    await printReceiptElement(printRoot.value?.firstElementChild)
  } catch (e) {
    console.error('Failed to print receipt:', e)
    if (e?.name !== 'NotFoundError') {
      $notification($t(e?.code === PRINTER_NOT_CONNECTED ? 'printerNotConnected' : 'receiptPrintFailed'), 'error', 5000)
    }
  } finally {
    printing.value = false
  }
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
