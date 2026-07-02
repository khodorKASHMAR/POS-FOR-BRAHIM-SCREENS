<template>
  <div class="page-background">
    <TopBar />

    <div class="pt-4">
      <div class="dollar-rate-header" :class="lang.dir === 'rtl' ? 'dollar-rate-header-rtl' : ''">
        <h1 class="dollar-rate-title">{{ $t('setDollarRate') }}</h1>
      </div>

      <div class="dollar-rate-page" :dir="lang.dir">
      <div class="dollar-rate-card" :class="{ 'is-saving': saving }">
        <div class="rate-converter" :class="lang.dir === 'rtl' ? 'rate-converter-rtl' : ''">
          <div class="rate-field-block">
            <span class="rate-field-label">{{ $t('usDollar') }}</span>
            <v-text-field
              model-value="1"
              type="text"
              variant="outlined"
              density="compact"
              disabled
              readonly
              hide-details
              class="rate-field rate-field-disabled"
            />
          </div>

          <div class="rate-divider" aria-hidden="true">
            <div class="dollar-sign-wrap">
              <v-icon class="dollar-sign-icon">mdi-currency-usd</v-icon>
            </div>
          </div>

          <div class="rate-field-block">
            <span class="rate-field-label">{{ $t('lebanesePound') }}</span>
            <v-text-field
              v-model.number="rateInput"
              type="number"
              variant="outlined"
              density="compact"
              :placeholder="$t('placeholderDollarRate')"
              hide-details
              class="rate-field price-field-no-arrows"
              :disabled="loading || saving"
              @keyup.enter="handleSave"
            />
          </div>
        </div>

        <div class="rate-hint">
          <v-icon size="16" class="rate-hint-icon">mdi-information-outline</v-icon>
          <span>{{ $t('dollarRateHint') }}</span>
        </div>

        <div class="rate-actions">
          <v-btn
            class="save-rate-btn"
            color="primary"
            variant="flat"
            :loading="saving"
            :disabled="loading || !isValidRate"
            :prepend-icon="lang.dir === 'ltr' ? 'mdi-content-save' : null"
            :append-icon="lang.dir === 'rtl' ? 'mdi-content-save' : null"
            @click="handleSave"
          >
            {{ $t('save') }}
          </v-btn>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import TopBar from '../components/TopBar.vue'
import DollarRateService from '../services/DollarRateService'
import { useState } from '../store/state'

const instance = getCurrentInstance()
const state = useState()
const $t = (key) => instance?.appContext?.config?.globalProperties?.$t?.(key) ?? key
const $notification = (msg, status, delay) =>
  instance?.appContext?.config?.globalProperties?.$notification?.(msg, status, delay)

const lang = computed(() => ({ dir: state.dir }))
const rateInput = ref(null)
const loading = ref(true)
const saving = ref(false)

const isValidRate = computed(() => {
  const value = Number(rateInput.value)
  return Number.isFinite(value) && value > 0
})

const loadRate = async () => {
  loading.value = true
  try {
    await state.fetchDollarRate()
    rateInput.value = state.exchangeRate
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  if (!isValidRate.value || saving.value) return

  saving.value = true
  try {
    const response = await DollarRateService.updateDollarRate({
      dollarRate: Number(rateInput.value)
    })
    const savedRate = Number(response?.data?.data?.dollarRate) || Number(rateInput.value)
    state.exchangeRate = savedRate
    rateInput.value = savedRate
    localStorage.setItem('exchangeRate', savedRate.toString())
    $notification($t('dollarRateUpdated'), 'success')
  } catch (error) {
    $notification(error?.response?.data?.message || $t('dollarRateUpdateFailed'), 'error')
  } finally {
    saving.value = false
  }
}

onMounted(loadRate)
</script>

<style scoped>
.page-background {
  background: #fafafa;
  min-height: 100vh;
}

.dollar-rate-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  margin-left: 1rem;
  margin-right: 1rem;
}

.dollar-rate-header-rtl {
  flex-direction: row-reverse;
}

.dollar-rate-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.dollar-rate-page {
  width: 100%;
  padding: 0 1rem 2rem;
  box-sizing: border-box;
}

.dollar-rate-card {
  background: none;
  margin-top: 10vh;
  padding: clamp(1.25rem, 3vw, 2rem) clamp(1rem, 3vw, 1.75rem) clamp(1rem, 2.5vw, 1.5rem);
  transition: opacity 0.2s ease;
}

.dollar-rate-card.is-saving {
  opacity: 0.92;
}

.rate-converter {
  display: flex;
  align-items: flex-end;
  justify-content: stretch;
  gap: clamp(0.5rem, 2.5vw, 1.5rem);
  width: 100%;
}

.rate-converter-rtl {
  flex-direction: row-reverse;
}

.rate-field-block {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-bottom: 1rem;
}

.rate-field-label {
  font-size: clamp(0.72rem, 1.6vw, 0.8rem);
  font-weight: 600;
  color: rgba(0, 0, 0, 0.55);
  text-align: center;
}

.rate-divider {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: flex-end;
  padding-bottom: 0.2rem;
}

.dollar-sign-wrap {
  width: clamp(48px, 10vw, 80px);
  height: clamp(48px, 10vw, 80px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(79, 195, 247, 0.14) 0%, rgba(3, 169, 244, 0.18) 100%);
  box-shadow: 0 8px 24px rgba(44, 140, 242, 0.15);
}

.dollar-sign-icon {
  font-size: clamp(28px, 6vw, 52px) !important;
  width: clamp(28px, 6vw, 52px);
  height: clamp(28px, 6vw, 52px);
  background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 50%, #03a9f4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.rate-field :deep(.v-field__outline) {
  opacity: 0;
}

.rate-field :deep(.v-field) {
  border: 1px solid transparent;
  border-radius: 12px;
  background:
    linear-gradient(#ffffff, #ffffff) padding-box,
    linear-gradient(135deg, #2293a1, #32d8ee) border-box;
  overflow: hidden;
}

.rate-field :deep(.v-field__input) {
  font-size: clamp(0.9rem, 2.2vw, 1.05rem);
  font-weight: 600;
  text-align: center;
  min-height: clamp(38px, 8vw, 48px);
  color: #1a1a1a;
}

.rate-field-disabled :deep(.v-field) {
  background:
    linear-gradient(#f3f6f8, #f3f6f8) padding-box,
    linear-gradient(135deg, rgba(34, 147, 161, 0.45), rgba(50, 216, 238, 0.45)) border-box;
}

.rate-field-disabled :deep(.v-field__input) {
  color: rgba(0, 0, 0, 0.45);
  -webkit-text-fill-color: rgba(0, 0, 0, 0.45);
}

.rate-field :deep(.v-field:hover) {
  box-shadow: 0 0 0 3px rgba(34, 147, 161, 0.2);
}

.rate-field:not(.rate-field-disabled) :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(44, 140, 242, 0.22);
}

.rate-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin-top: 1.5rem;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  background: rgba(44, 140, 242, 0.06);
  color: rgba(0, 0, 0, 0.58);
  font-size: 0.8rem;
  text-align: center;
}

.rate-hint-icon {
  color: #2c8cf2;
  flex-shrink: 0;
}

.rate-actions {
  display: flex;
  justify-content: center;
  margin-top: 2.5rem;
  padding-top: 0.5rem;
  height: 4rem;
}

.save-rate-btn {
  width: 100%;
  border-radius: 12px;
  font-size: 1.2rem;
  font-weight: 700;
  background-image: linear-gradient(135deg, #197783, #32d8ee);
  color: #fff !important;
  height: 2.8rem;
}

.save-rate-btn:hover {
  background-image: linear-gradient(135deg, #08bad1, #26c6da);
}

.save-rate-btn :deep(.v-btn__content) {
  font-weight: 700;
}

.price-field-no-arrows :deep(input[type='number']::-webkit-outer-spin-button),
.price-field-no-arrows :deep(input[type='number']::-webkit-inner-spin-button) {
  -webkit-appearance: none;
  margin: 0;
}

.price-field-no-arrows :deep(input[type='number']) {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
