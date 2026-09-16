<template>
  <div class="page-background">
    <TopBar />

    <div class="pt-page" :dir="state.dir">
      <div class="pt-header">
        <div>
          <h1 class="pt-title">{{ $t('printTemplates') }}</h1>
          <p class="pt-subtitle">{{ $t('printTemplatesSubtitle') }}</p>
        </div>
        <div class="pt-header-actions">
          <v-btn
            variant="outlined"
            color="primary"
            :disabled="loading || saving"
            @click="resetToDefault"
          >
            {{ $t('resetTemplate') }}
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="saving"
            :disabled="loading"
            prepend-icon="mdi-content-save"
            @click="save"
          >
            {{ $t('save') }}
          </v-btn>
        </div>
      </div>

      <v-alert v-if="error" type="error" variant="tonal" class="mb-3" density="compact">
        {{ error }}
      </v-alert>
      <v-alert v-if="successMsg" type="success" variant="tonal" class="mb-3" density="compact">
        {{ successMsg }}
      </v-alert>

      <div class="pt-layout">
        <section class="pt-builder">
          <div class="panel-title">{{ $t('templateBlocks') }}</div>
          <div v-if="loading" class="pt-loading">{{ $t('loading') }}…</div>
          <div v-else class="block-list">
            <div
              v-for="(block, index) in draft.blocks"
              :key="block.id"
              class="block-card"
              :class="{ 'block-card--off': !block.enabled }"
            >
              <div class="block-card-top">
                <div class="block-card-title">
                  <v-icon size="18">{{ blockMeta(block.type).icon }}</v-icon>
                  <span>{{ $t(blockMeta(block.type).labelKey) }}</span>
                </div>
                <div class="block-card-actions">
                  <v-btn
                    icon
                    variant="text"
                    size="x-small"
                    :disabled="index === 0"
                    :aria-label="$t('moveUp')"
                    @click="moveBlock(index, -1)"
                  >
                    <v-icon size="18">mdi-arrow-up</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    variant="text"
                    size="x-small"
                    :disabled="index === draft.blocks.length - 1"
                    :aria-label="$t('moveDown')"
                    @click="moveBlock(index, 1)"
                  >
                    <v-icon size="18">mdi-arrow-down</v-icon>
                  </v-btn>
                  <v-switch
                    v-model="block.enabled"
                    density="compact"
                    color="primary"
                    hide-details
                    class="block-switch"
                  />
                </div>
              </div>

              <div
                v-if="block.enabled && blockMeta(block.type).fields.length"
                class="block-fields"
              >
                <div
                  v-for="field in blockMeta(block.type).fields"
                  :key="field.key"
                  class="field-row"
                >
                  <label class="field-label">{{ $t(field.labelKey) }}</label>
                  <v-switch
                    v-if="field.input === 'boolean'"
                    v-model="block.props[field.key]"
                    density="compact"
                    color="primary"
                    hide-details
                  />
                  <v-textarea
                    v-else-if="field.input === 'textarea'"
                    v-model="block.props[field.key]"
                    rows="2"
                    density="compact"
                    variant="outlined"
                    hide-details
                  />
                  <v-text-field
                    v-else
                    v-model="block.props[field.key]"
                    density="compact"
                    variant="outlined"
                    hide-details
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="pt-preview-panel">
          <div class="panel-title">{{ $t('livePreview') }}</div>
          <div class="preview-stage">
            <ReceiptTemplateRenderer
              :template="draft"
              :details="sample.details"
              :items="sample.items"
              :items-subtotal="sample.itemsSubtotal"
            />
          </div>
          <p class="preview-hint">{{ $t('printPreviewHint') }}</p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { getCurrentInstance, onMounted, reactive, ref } from 'vue'
import TopBar from '../components/TopBar.vue'
import ReceiptTemplateRenderer from '../components/print/ReceiptTemplateRenderer.vue'
import PrintTemplateService from '../services/PrintTemplateService'
import { blockMeta } from '../print/blockTypes'
import {
  createDefaultReceiptTemplate,
  createSampleReceiptData
} from '../print/defaultReceiptTemplate'
import { useState } from '../store/state'

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

function applyTemplate(data) {
  draft.code = data.code || TEMPLATE_CODE
  draft.nameEn = data.nameEn || draft.nameEn
  draft.nameAr = data.nameAr || draft.nameAr
  draft.templateType = data.templateType || 'RECEIPT_80'
  draft.paperWidthMm = data.paperWidthMm || 80
  draft.blocks = Array.isArray(data.blocks)
    ? data.blocks.map((b) => ({
        id: b.id,
        type: b.type,
        enabled: b.enabled !== false,
        props: { ...(b.props || {}) }
      }))
    : createDefaultReceiptTemplate().blocks
}

function moveBlock(index, delta) {
  const next = index + delta
  if (next < 0 || next >= draft.blocks.length) return
  const copy = [...draft.blocks]
  const [item] = copy.splice(index, 1)
  copy.splice(next, 0, item)
  draft.blocks = copy
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
      blocks: draft.blocks
    }
    const response = await PrintTemplateService.savePrintTemplate(TEMPLATE_CODE, payload)
    const data = response?.data?.data
    if (data) applyTemplate(data)
    successMsg.value = $t('printTemplateSaved')
  } catch (e) {
    console.error(e)
    error.value = $t('printTemplateSaveFailed')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page-background {
  min-height: 100vh;
  background: linear-gradient(180deg, #f3f7f8 0%, #eef4f5 100%);
}

.pt-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 1.25rem 2.5rem;
}

.pt-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.pt-title {
  margin: 0;
  font-size: 1.5rem;
  color: #0f4f58;
}

.pt-subtitle {
  margin: 0.25rem 0 0;
  color: #5a6b70;
  font-size: 0.9rem;
}

.pt-header-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.pt-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
  gap: 1rem;
  align-items: start;
}

@media (max-width: 960px) {
  .pt-layout {
    grid-template-columns: 1fr;
  }
}

.pt-builder,
.pt-preview-panel {
  background: #fff;
  border-radius: 16px;
  border: 1px solid rgba(15, 79, 88, 0.1);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
  padding: 1rem;
}

.panel-title {
  font-weight: 700;
  color: #0f4f58;
  margin-bottom: 0.75rem;
}

.pt-loading {
  color: #678086;
  padding: 1rem 0;
}

.block-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.block-card {
  border: 1px solid rgba(15, 79, 88, 0.12);
  border-radius: 12px;
  padding: 0.7rem 0.8rem;
  background: #fbfdfe;
}

.block-card--off {
  opacity: 0.55;
}

.block-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.block-card-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  color: #163e45;
}

.block-card-actions {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}

.block-switch {
  margin-inline-start: 0.25rem;
}

.block-fields {
  margin-top: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.field-row {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 0.5rem;
  align-items: center;
}

@media (max-width: 600px) {
  .field-row {
    grid-template-columns: 1fr;
  }
}

.field-label {
  font-size: 0.82rem;
  color: #4d6066;
}

.preview-stage {
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 11px,
      rgba(15, 79, 88, 0.04) 11px,
      rgba(15, 79, 88, 0.04) 12px
    );
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  justify-content: center;
  overflow: auto;
  max-height: min(78vh, 860px);
}

.preview-hint {
  margin: 0.75rem 0 0;
  font-size: 0.8rem;
  color: #678086;
  text-align: center;
}
</style>
