<template>
  <div class="thermal-print-stage" aria-hidden="true">
    <div ref="stageRef">
      <ReceiptTemplateRenderer
        v-if="data"
        :template="data.template"
        :details="data.details"
        :items="data.items"
        :items-subtotal="data.itemsSubtotal"
      />
    </div>
  </div>
</template>

<script setup>
import { nextTick, ref, shallowRef } from 'vue'
import ReceiptTemplateRenderer from './ReceiptTemplateRenderer.vue'
import { loadReceiptPrintData } from '../../print/receiptPrintData'
import { printReceiptElement } from '../../print/thermalReceipt'

const stageRef = ref(null)
const data = shallowRef(null)
let queue = Promise.resolve()

async function render(receiptId) {
  data.value = await loadReceiptPrintData(receiptId)
  await nextTick()
  try {
    await printReceiptElement(stageRef.value?.firstElementChild)
  } finally {
    data.value = null
  }
}

/** Print a saved receipt on the thermal printer without showing it. Jobs run one at a time. */
function printReceipt(receiptId) {
  const job = queue.then(() => render(receiptId))
  queue = job.catch(() => {})
  return job
}

defineExpose({ printReceipt })
</script>

<style scoped>
.thermal-print-stage {
  position: fixed;
  top: 0;
  left: -10000px;
  pointer-events: none;
}
</style>
