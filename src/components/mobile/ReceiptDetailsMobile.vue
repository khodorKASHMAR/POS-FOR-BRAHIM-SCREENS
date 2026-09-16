<template>
  <v-dialog
    :model-value="modelValue"
    fullscreen
    transition="dialog-bottom-transition"
    :dir="state.dir"
    content-class="rdm-overlay"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="rdm" :dir="state.dir" :class="{ 'rdm--rtl': state.dir === 'rtl' }">
      <MobileSheetHeader
        :title="$t('receiptDetails')"
        :subtitle="detailsHeaderSubtitle"
        @back="close"
      />

      <div v-if="loading" class="rdm__scroll">
        <div v-for="n in 6" :key="n" class="rdm__skel" />
      </div>

      <template v-else-if="details">
        <div class="rdm__scroll">
          <section class="rdm__hero">
            <span class="rdm__hero-label">{{ isDraftMode ? $t('estimatedTotal') : $t('total') }}</span>
            <strong class="rdm__hero-value" dir="ltr">{{ formatTotal(details) }}</strong>
          </section>

          <section class="rdm__group">
            <h3 class="rdm__group-title">{{ $t('details') }}</h3>
            <div class="rdm__list">
              <div class="rdm__row">
                <span>{{ $t('customerName') }}</span>
                <strong>{{ details.customerName || '—' }}</strong>
              </div>
              <div class="rdm__row">
                <span>{{ $t('employeeName') }}</span>
                <strong>{{ details.employeeName || '—' }}</strong>
              </div>
              <div class="rdm__row">
                <span>{{ $t('dollarRate') }}</span>
                <strong dir="ltr">{{ formatDollarRate(details.currencyRate ?? details.dollarRate) }}</strong>
              </div>
              <div class="rdm__row">
                <span>{{ $t('totalDiscount') }}</span>
                <strong dir="ltr">{{ formatDiscount(details) }}</strong>
              </div>
            </div>
          </section>

          <section v-if="!isDraftMode" class="rdm__group">
            <h3 class="rdm__group-title">{{ $t('payment') }}</h3>
            <div class="rdm__list">
              <div class="rdm__row">
                <span class="rdm__pay-label">
                  <span class="rdm__dot rdm__dot--wish">W</span>
                  Wish
                </span>
                <strong dir="ltr">{{ formatPayWish(details) }}</strong>
              </div>
              <div class="rdm__row">
                <span class="rdm__pay-label">
                  <span class="rdm__dot rdm__dot--usd">$</span>
                  USD
                </span>
                <strong dir="ltr">{{ formatUsd(details.payDollar) }}</strong>
              </div>
              <div class="rdm__row">
                <span class="rdm__pay-label">
                  <span class="rdm__dot rdm__dot--lbp">{{ state.lang === 'ar' ? 'ل.ل.' : 'L' }}</span>
                  {{ state.lang === 'ar' ? 'ليرة' : 'LBP' }}
                </span>
                <strong dir="ltr">{{ formatLbpShort(details.payLebanese) }}</strong>
              </div>
              <div v-if="Number(details.returnedToUserValue) > 0" class="rdm__row rdm__row--return">
                <span>{{ $t('returnedToUser') }}</span>
                <strong dir="ltr">{{ formatLbp(details.returnedToUserValue) }}</strong>
              </div>
            </div>
          </section>
        </div>

        <footer v-if="!isDraftMode" class="rdm__footer">
          <button type="button" class="rdm__preview" @click="emit('preview', props.receiptId)">
            <v-icon size="20">mdi-printer-outline</v-icon>
            {{ $t('previewReceipt') }}
          </button>
        </footer>
      </template>

      <div v-else class="rdm__empty">—</div>
    </div>
  </v-dialog>
</template>

<script setup>
import { computed, getCurrentInstance, ref, watch } from 'vue'
import ReceiptService from '../../services/ReceiptService'
import { useState } from '../../store/state'
import { isDollarReceipt } from '../../constants/currency'
import MobileSheetHeader from './MobileSheetHeader.vue'
import { useMobileOverlayBack } from '../../composables/useMobileBackStack'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  receiptId: { type: [String, Number], default: null },
  isDraft: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'preview'])

const instance = getCurrentInstance()
const $t = (key) => instance?.appContext?.config?.globalProperties?.$t?.(key) ?? key
const state = useState()

const loading = ref(false)
const details = ref(null)

const isDraftMode = computed(() =>
  props.isDraft || details.value?.type === 'DRAFT'
)

function close() {
  emit('update:modelValue', false)
}

useMobileOverlayBack(() => props.modelValue, close)

const detailsHeaderSubtitle = computed(() => {
  if (!details.value) return ''
  const name = details.value.customerName || $t('walkInCustomer')
  return isDraftMode.value ? `${name} · ${$t('draftBadge')}` : name
})

function formatUsd(value) {
  const num = Number(value)
  if (!num) return '—'
  const formatted = num.toFixed(2)
  return state.lang === 'ar' ? `دولار\u200E ${formatted}` : `${formatted} USD`
}

function formatLbp(value) {
  const num = Number(value)
  if (!num) return '—'
  const formatted = Math.round(num).toLocaleString('en-US')
  return state.lang === 'ar' ? `ل.ل.\u200E ${formatted}` : `${formatted} LBP`
}

function formatLbpShort(value) {
  const num = Number(value)
  if (!num) return '—'
  return Math.round(num).toLocaleString('en-US')
}

function formatDollarRate(rate) {
  const num = Number(rate)
  if (!num) return '—'
  const formatted = Math.round(num).toLocaleString('en-US')
  return state.lang === 'ar' ? `ل.ل.\u200E ${formatted}` : `${formatted} LBP`
}

function formatPayWish(receipt) {
  const num = Number(receipt.payWish) || 0
  if (!num) return '—'
  return receipt.isPayWishDollar !== false ? formatUsd(num) : formatLbp(num)
}

function formatTotal(receipt) {
  const num = Number(receipt.total) || 0
  if (isDollarReceipt(receipt)) return formatUsd(num)
  return formatLbp(num)
}

function formatDiscount(receipt) {
  const val = Number(receipt.receiptDiscount) || 0
  if (!val) return '—'
  if (receipt.isReceiptDiscountPercent) return `${val}%`
  if (isDollarReceipt(receipt)) return formatUsd(val)
  return formatLbp(val)
}

async function loadDetails() {
  if (!props.receiptId) return
  loading.value = true
  details.value = null
  try {
    const response = await ReceiptService.getReceiptDetails(props.receiptId)
    details.value = response?.data?.data || null
  } catch (error) {
    console.error('Failed to load receipt details:', error)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.modelValue, props.receiptId],
  ([open]) => {
    if (open) loadDetails()
  }
)
</script>

<style scoped>
.rdm {
  --ink: #0d2a2e;
  --muted: #5f7a7e;
  --teal: #197783;
  --line: rgba(25, 119, 131, 0.12);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #eef5f6;
  color: var(--ink);
}

.rdm--rtl {
  direction: rtl;
}

.rdm__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0.9rem 0.9rem 1.25rem;
}

.rdm__hero {
  padding: 1.15rem 1rem;
  border-radius: 18px;
  background: linear-gradient(145deg, #0f5a63, #197783 55%, #2ad4e8);
  color: #fff;
  text-align: center;
  margin-bottom: 1rem;
  box-shadow: 0 12px 28px rgba(25, 119, 131, 0.28);
}

.rdm__hero-label {
  display: block;
  font-size: 0.78rem;
  font-weight: 700;
  opacity: 0.85;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.rdm__hero-value {
  display: block;
  margin-top: 0.35rem;
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.rdm__group {
  margin-bottom: 1rem;
}

.rdm__group-title {
  margin: 0 0 0.45rem;
  margin-inline-start: 0.35rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  text-align: start;
}

.rdm__list {
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--line);
  overflow: hidden;
}

.rdm__row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 3.25rem;
  padding: 0.75rem 0.95rem;
  border-bottom: 1px solid rgba(25, 119, 131, 0.08);
  font-size: 0.92rem;
}

.rdm__row:last-child {
  border-bottom: none;
}

.rdm__row > span {
  color: var(--muted);
  font-weight: 600;
  text-align: start;
  flex: 1 1 auto;
  min-width: 0;
}

.rdm__row > strong {
  color: var(--ink);
  font-weight: 750;
  text-align: end;
  word-break: break-word;
  flex: 0 1 auto;
  max-width: 58%;
}

.rdm__row--return strong {
  color: #059669;
}

.rdm__pay-label {
  display: inline-flex !important;
  align-items: center;
  gap: 0.45rem;
  color: var(--ink) !important;
}

.rdm__dot {
  width: 1.45rem;
  height: 1.45rem;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 800;
  color: #fff;
}

.rdm__dot--wish { background: #7c3aed; }
.rdm__dot--usd { background: #2563eb; }
.rdm__dot--lbp { background: #0f766e; }

.rdm__footer {
  flex: 0 0 auto;
  padding: 0.75rem 0.9rem calc(0.75rem + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid var(--line);
}

.rdm__preview {
  width: 100%;
  min-height: 3.25rem;
  border: none;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  background: linear-gradient(135deg, #0f5a63, #197783 50%, #2ad4e8);
  color: #fff;
  font-size: 1rem;
  font-weight: 750;
}

.rdm__skel {
  height: 3.2rem;
  border-radius: 12px;
  margin-bottom: 0.65rem;
  background: linear-gradient(90deg, #e2eef0, #f5f9fa, #e2eef0);
  background-size: 200% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}

.rdm__empty {
  flex: 1;
  display: grid;
  place-items: center;
  color: var(--muted);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>

<style>
.rdm-overlay.v-overlay__content {
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
}
</style>
