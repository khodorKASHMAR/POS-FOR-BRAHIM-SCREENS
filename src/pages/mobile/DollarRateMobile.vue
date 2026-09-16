<template>
  <div class="m-rate m-page" :dir="lang.dir">
    <header class="m-rate__header">
      <p>{{ $t('setDollarRateSubtitle') }}</p>
    </header>

    <div class="m-rate__card" :class="{ 'is-saving': saving }">
      <div class="m-rate__row">
        <div class="m-rate__field">
          <span class="m-rate__label">{{ $t('usDollar') }}</span>
          <v-text-field
            model-value="1"
            type="text"
            variant="outlined"
            density="comfortable"
            disabled
            readonly
            hide-details
            class="m-rate__input m-rate__input--disabled"
          />
        </div>

        <div class="m-rate__swap" aria-hidden="true">
          <v-icon size="28">mdi-currency-usd</v-icon>
        </div>

        <div class="m-rate__field">
          <span class="m-rate__label">{{ $t('lebanesePound') }}</span>
          <v-text-field
            v-model.number="rateInput"
            type="number"
            variant="outlined"
            density="comfortable"
            :placeholder="$t('placeholderDollarRate')"
            hide-details
            class="m-rate__input price-field-no-arrows"
            :disabled="loading || saving"
            @keyup.enter="handleSave"
          />
        </div>
      </div>

      <div class="m-rate__hint">
        <v-icon size="16">mdi-information-outline</v-icon>
        <span>{{ $t('dollarRateHint') }}</span>
      </div>

      <v-btn
        class="m-rate__save"
        variant="flat"
        block
        size="large"
        :loading="saving"
        :disabled="loading || !isValidRate"
        prepend-icon="mdi-content-save"
        @click="handleSave"
      >
        {{ $t('save') }}
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import CurrencyRateService from '../../services/CurrencyRateService'
import { useState } from '../../store/state'
import { CurrencyEnum } from '../../constants/enums'

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

async function loadRate() {
  loading.value = true
  try {
    await state.fetchDollarRate()
    rateInput.value = state.exchangeRate
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!isValidRate.value || saving.value) return
  saving.value = true
  try {
    const response = await CurrencyRateService.updateRate({
      currency: CurrencyEnum.LBP,
      rate: Number(rateInput.value)
    })
    const savedRate = Number(response?.data?.data?.rate) || Number(rateInput.value)
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
.m-rate.m-page {
  padding-top: 0.35rem;
}

.m-rate__header p {
  margin: 0;
  font-size: 0.9rem;
  color: #5f7a7e;
  line-height: 1.45;
}

.m-rate__card {
  margin-top: 1.25rem;
  padding: 1.15rem;
  border-radius: 18px;
  background: #fff;
  border: 1px solid rgba(25, 119, 131, 0.12);
  box-shadow: 0 8px 24px rgba(22, 54, 58, 0.06);
}

.m-rate__card.is-saving {
  opacity: 0.92;
}

.m-rate__row {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.m-rate__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.m-rate__label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #5f7a7e;
}

.m-rate__swap {
  align-self: center;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(25, 119, 131, 0.12), rgba(50, 216, 238, 0.2));
  color: #197783;
}

.m-rate__input :deep(.v-field) {
  border-radius: 12px;
  background: #f8fbfc;
}

.m-rate__input :deep(.v-field__input) {
  font-size: 1.15rem;
  font-weight: 700;
  text-align: center;
  min-height: 3rem;
}

.m-rate__input--disabled :deep(.v-field__input) {
  color: rgba(0, 0, 0, 0.45);
  -webkit-text-fill-color: rgba(0, 0, 0, 0.45);
}

.m-rate__hint {
  display: flex;
  gap: 0.45rem;
  align-items: flex-start;
  margin: 1rem 0 1.25rem;
  padding: 0.7rem 0.8rem;
  border-radius: 12px;
  background: rgba(44, 140, 242, 0.06);
  color: #5f7a7e;
  font-size: 0.78rem;
  line-height: 1.4;
}

.m-rate__save {
  border-radius: 12px !important;
  font-weight: 700 !important;
  text-transform: none !important;
  background-image: linear-gradient(135deg, #197783, #32d8ee) !important;
  color: #fff !important;
  min-height: 3rem;
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
