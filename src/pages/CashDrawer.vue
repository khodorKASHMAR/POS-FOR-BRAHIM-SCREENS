<template>
  <div class="drawer-page">
    <div class="drawer-atmosphere" aria-hidden="true" />
    <TopBar />

    <div class="drawer-shell" :dir="lang.dir">
      <header class="drawer-header">
        <div class="drawer-header__copy">
          <h1 class="drawer-header__title">
            <span class="drawer-header__icon">
              <v-icon size="22">mdi-cash-register</v-icon>
            </span>
            {{ $t('cashDrawer') }}
          </h1>
          <p class="drawer-header__subtitle">{{ $t('cashDrawerSubtitle') }}</p>
        </div>

        <div class="drawer-header__meta">
          <span v-if="lastUpdatedLabel" class="meta-chip">
            <v-icon size="15">mdi-history</v-icon>
            <span class="meta-chip__label">{{ $t('lastUpdated') }}</span>
            <strong class="meta-chip__value">{{ lastUpdatedLabel }}</strong>
          </span>
          <span class="status-pill" :class="{ 'status-pill--edit': editing }">
            <v-icon size="14">{{ editing ? 'mdi-pencil-outline' : 'mdi-lock-outline' }}</v-icon>
            {{ editing ? $t('editing') : $t('locked') }}
          </span>
        </div>
      </header>

      <div class="kpi-row">
        <article class="kpi kpi--current" :class="{ 'is-loading': loading }">
          <span class="kpi__icon"><v-icon>mdi-cash-multiple</v-icon></span>
          <div class="kpi__body">
            <span class="kpi__label">{{ $t('currentDrawerAmount') }}</span>
            <strong class="kpi__value" dir="ltr">{{ loading ? '—' : formatLbp(currentAmount) }}</strong>
          </div>
        </article>
        <article class="kpi kpi--float">
          <span class="kpi__icon"><v-icon>mdi-cash</v-icon></span>
          <div class="kpi__body">
            <span class="kpi__label">{{ $t('initialFloat') }}</span>
            <strong class="kpi__value" dir="ltr">{{ loading ? '—' : formatLbp(initialTotalLbp) }}</strong>
          </div>
        </article>
        <article class="kpi kpi--payments">
          <span class="kpi__icon"><v-icon>mdi-receipt-text-plus-outline</v-icon></span>
          <div class="kpi__body">
            <span class="kpi__label">{{ $t('paymentsSinceOpen') }}</span>
            <strong class="kpi__value" dir="ltr">{{ loading ? '—' : formatLbp(paymentsTotalLbp) }}</strong>
          </div>
        </article>
        <article class="kpi kpi--returns">
          <span class="kpi__icon"><v-icon>mdi-cash-refund</v-icon></span>
          <div class="kpi__body">
            <span class="kpi__label">{{ $t('returnsSinceOpen') }} ({{ loading ? '—' : returnCount }})</span>
            <strong class="kpi__value" dir="ltr">{{ loading ? '—' : `−${formatLbp(returnsTotalLbp)}` }}</strong>
          </div>
        </article>
        <article class="kpi kpi--count">
          <span class="kpi__icon"><v-icon>mdi-counter</v-icon></span>
          <div class="kpi__body">
            <span class="kpi__label">{{ $t('receiptCount') }}</span>
            <strong class="kpi__value">{{ loading ? '—' : receiptCount }}</strong>
          </div>
        </article>
      </div>

      <section class="panel session-panel" :class="{ 'is-editing': editing }">
        <div class="panel-head">
          <h2 class="panel-title">
            <v-icon size="18">mdi-safe-square-outline</v-icon>
            {{ $t('drawerSession') }}
          </h2>
          <p class="panel-note">
            <v-icon size="15">{{ editing ? 'mdi-pencil-outline' : 'mdi-lock-outline' }}</v-icon>
            {{ editing ? $t('cashDrawerEditingHint') : $t('cashDrawerLockedHint') }}
          </p>
        </div>

        <div class="panel-body">
          <div class="field-grid">
            <div class="field">
              <label class="field__label">
                <span class="currency-chip currency-chip--usd">USD</span>
                {{ $t('usDollar') }}
              </label>
              <v-text-field
                v-model.number="initialAmountUsd"
                type="number"
                variant="outlined"
                density="comfortable"
                color="#197783"
                prefix="$"
                dir="ltr"
                :placeholder="$t('placeholderInitialUsd')"
                hide-details
                class="amount-input price-field-no-arrows"
                :disabled="!editing || loading || saving"
                @keyup.enter="handlePrimaryAction"
              />
            </div>

            <div class="field">
              <label class="field__label">
                <span class="currency-chip currency-chip--lbp">{{ lbpSymbol }}</span>
                {{ $t('lebanesePound') }}
              </label>
              <v-text-field
                v-model.number="initialAmountLbp"
                type="number"
                variant="outlined"
                density="comfortable"
                color="#197783"
                :suffix="lbpSymbol"
                dir="ltr"
                :placeholder="$t('placeholderInitialLbp')"
                hide-details
                class="amount-input price-field-no-arrows"
                :disabled="!editing || loading || saving"
                @keyup.enter="handlePrimaryAction"
              />
            </div>
          </div>

          <div class="info-grid">
            <div class="info-tile">
              <v-icon class="info-tile__icon">mdi-calendar</v-icon>
              <div>
                <span class="info-tile__label">{{ $t('date') }}</span>
                <strong class="info-tile__value">{{ displayDate }}</strong>
              </div>
            </div>
            <div class="info-tile">
              <v-icon class="info-tile__icon">mdi-clock-outline</v-icon>
              <div>
                <span class="info-tile__label">{{ $t('time') }}</span>
                <strong class="info-tile__value">{{ displayTime }}</strong>
              </div>
            </div>
          </div>

          <p class="formula-hint">
            <v-icon size="15">mdi-information-outline</v-icon>
            <span>{{ $t('cashDrawerHint') }}</span>
          </p>
        </div>

        <div class="panel-foot">
          <button
            v-if="editing"
            type="button"
            class="btn-ghost"
            :disabled="saving"
            @click="loadDrawer"
          >
            {{ $t('cancel') }}
          </button>
          <button
            type="button"
            class="btn-solid"
            :disabled="loading || saving || (editing && !isValidAmount)"
            @click="handlePrimaryAction"
          >
            <v-progress-circular
              v-if="saving"
              indeterminate
              size="16"
              width="2"
              color="white"
            />
            <v-icon v-else size="17">{{ primaryIcon }}</v-icon>
            {{ editing ? $t('save') : $t('updateDrawer') }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import TopBar from '../components/TopBar.vue'
import CashDrawerService from '../services/CashDrawerService'
import { useState } from '../store/state'

const instance = getCurrentInstance()
const state = useState()
const $t = (key) => instance?.appContext?.config?.globalProperties?.$t?.(key) ?? key
const $notification = (msg, status, delay) =>
  instance?.appContext?.config?.globalProperties?.$notification?.(msg, status, delay)

const lang = computed(() => ({ dir: state.dir }))
const lbpSymbol = computed(() => (state.lang === 'ar' ? 'ل.ل.' : 'LBP'))

const loading = ref(true)
const saving = ref(false)
const editing = ref(false)
const initialAmountUsd = ref(0)
const initialAmountLbp = ref(0)
const initialTotalLbp = ref(0)
const initDate = ref('')
const initTime = ref('')
const lastUpdatedAt = ref('')
const currentAmount = ref(0)
const paymentsTotalLbp = ref(0)
const receiptCount = ref(0)
const returnsTotalLbp = ref(0)
const returnCount = ref(0)

const isValidAmount = computed(() => {
  const usd = Number(initialAmountUsd.value)
  const lbp = Number(initialAmountLbp.value)
  return Number.isFinite(usd) && usd >= 0 && Number.isFinite(lbp) && lbp >= 0
})

const primaryIcon = computed(() => (editing.value ? 'mdi-content-save' : 'mdi-cash-sync'))

const displayDate = computed(() => formatDisplayDate(initDate.value))
const displayTime = computed(() => formatDisplayTime(initTime.value))

const lastUpdatedLabel = computed(() => {
  if (!lastUpdatedAt.value) return ''
  const raw = String(lastUpdatedAt.value)
  const [datePart, timePart = ''] = raw.split('T')
  const date = formatDisplayDate(datePart)
  const time = timePart ? timePart.slice(0, 5) : ''
  return time ? `${date} · ${formatDisplayTime(time)}` : date
})

function pad(n) {
  return String(n).padStart(2, '0')
}

function nowDate() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function nowTime() {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDisplayDate(value) {
  if (!value) return '—'
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return value
  return new Date(y, m - 1, d).toLocaleDateString(state.lang === 'ar' ? 'ar-LB' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function formatDisplayTime(value) {
  if (!value) return '—'
  const [h, m] = value.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return value
  const date = new Date()
  date.setHours(h, m, 0, 0)
  return date.toLocaleTimeString(state.lang === 'ar' ? 'ar-LB' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: state.lang !== 'ar'
  })
}

function applyLastUpdated(rawValue) {
  if (!rawValue) {
    initDate.value = ''
    initTime.value = ''
    lastUpdatedAt.value = ''
    return
  }
  lastUpdatedAt.value = rawValue
  const raw = String(rawValue)
  const [datePart, timePart = ''] = raw.split('T')
  initDate.value = datePart || ''
  initTime.value = timePart ? timePart.slice(0, 5) : ''
}

function applyPayload(data) {
  if (!data) return
  currentAmount.value = Number(data.currentAmount) || 0
  paymentsTotalLbp.value = Number(data.paymentsTotalLbp) || 0
  receiptCount.value = Number(data.receiptCount) || 0
  returnsTotalLbp.value = Number(data.returnsTotalLbp) || 0
  returnCount.value = Number(data.returnCount) || 0
  initialAmountUsd.value = Number(data.initialAmountUsd) || 0
  initialAmountLbp.value = Number(data.initialAmountLbp) || 0
  initialTotalLbp.value = Number(data.initialAmount) || 0

  if (data.initialized && data.lastUpdatedAt) {
    applyLastUpdated(data.lastUpdatedAt)
  } else {
    applyLastUpdated('')
  }
}

function formatLbp(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return `0 ${lbpSymbol.value}`
  return `${Math.round(num).toLocaleString()} ${lbpSymbol.value}`
}

async function loadDrawer() {
  loading.value = true
  editing.value = false
  try {
    const response = await CashDrawerService.getCashDrawer()
    applyPayload(response?.data?.data)
  } catch (error) {
    applyLastUpdated('')
    $notification(error?.response?.data?.message || $t('cashDrawerLoadFailed'), 'error')
  } finally {
    loading.value = false
  }
}

function startUpdate() {
  editing.value = true
  initialAmountUsd.value = 0
  initialAmountLbp.value = 0
  initialTotalLbp.value = 0
  currentAmount.value = 0
  paymentsTotalLbp.value = 0
  receiptCount.value = 0
  returnsTotalLbp.value = 0
  returnCount.value = 0
  lastUpdatedAt.value = ''
  initDate.value = nowDate()
  initTime.value = nowTime()
}

async function handleSave() {
  if (!isValidAmount.value || saving.value) return

  saving.value = true
  try {
    const response = await CashDrawerService.saveCashDrawer({
      initialAmountUsd: Number(initialAmountUsd.value) || 0,
      initialAmountLbp: Number(initialAmountLbp.value) || 0
    })
    applyPayload(response?.data?.data)
    editing.value = false
    $notification($t('cashDrawerUpdated'), 'success')
  } catch (error) {
    $notification(error?.response?.data?.message || $t('cashDrawerUpdateFailed'), 'error')
  } finally {
    saving.value = false
  }
}

function handlePrimaryAction() {
  if (editing.value) handleSave()
  else startUpdate()
}

onMounted(loadDrawer)
</script>

<style scoped>
.drawer-page {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background: #f3f6f9;
  overflow-x: hidden;
}

.drawer-atmosphere {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(ellipse 70% 45% at 12% -5%, rgba(74, 158, 171, 0.09), transparent 55%),
    radial-gradient(ellipse 50% 40% at 90% 0%, rgba(44, 140, 242, 0.05), transparent 50%);
}

/* Spacing and sizes grow with the viewport height so tall monitors are filled, not left empty. */
.drawer-shell {
  --space: clamp(0.85rem, 1.8vh, 1.5rem);
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space);
  width: 100%;
  padding: var(--space) 1.25rem calc(var(--space) * 1.4);
  box-sizing: border-box;
}

/* Header */
.drawer-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.5rem 0.15rem 0;
}

.drawer-header__title {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0;
  font-size: clamp(1.35rem, 2.4vh, 1.75rem);
  font-weight: 750;
  color: #2c3e50;
  letter-spacing: -0.02em;
}

.drawer-header__icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(25, 119, 131, 0.14), rgba(50, 216, 238, 0.14));
  color: #197783;
}

.drawer-header__subtitle {
  margin: 0.3rem 0 0;
  padding-inline-start: 2.85rem;
  font-size: 0.84rem;
  color: #8a9aab;
  line-height: 1.4;
}

.drawer-header__meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.42rem 0.75rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e4ebf1;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  color: #5a9aa3;
  font-size: 0.8rem;
}

.meta-chip__label {
  color: #8a9aab;
  font-weight: 600;
}

.meta-chip__value {
  color: #334155;
  font-weight: 700;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.42rem 0.8rem;
  border-radius: 10px;
  font-size: 0.78rem;
  font-weight: 700;
  background: #eef2f6;
  border: 1px solid #e4ebf1;
  color: #64748b;
}

.status-pill--edit {
  background: rgba(50, 216, 238, 0.12);
  border-color: rgba(25, 119, 131, 0.3);
  color: #197783;
}

/* KPI cards */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: clamp(0.6rem, 1.2vh, 1rem);
}

.kpi {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
  padding: clamp(0.85rem, 2.2vh, 1.6rem) clamp(0.95rem, 1.4vw, 1.4rem);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e6edf3;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.kpi__icon {
  width: clamp(40px, 5vh, 56px);
  height: clamp(40px, 5vh, 56px);
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(25, 119, 131, 0.1);
  color: #197783;
}

.kpi__icon .v-icon {
  font-size: clamp(20px, 2.6vh, 28px);
}

.kpi__body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.kpi__label {
  font-size: clamp(0.68rem, 1.3vh, 0.8rem);
  font-weight: 700;
  color: #9aabba;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.kpi__value {
  font-size: clamp(1.1rem, 2.6vh, 1.6rem);
  font-weight: 750;
  color: #334155;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kpi--current {
  background-image: linear-gradient(135deg, #197783, #32d8ee);
  border-color: transparent;
  box-shadow: 0 6px 16px rgba(25, 119, 131, 0.25);
}

.kpi--current .kpi__icon {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.kpi--current .kpi__label {
  color: rgba(255, 255, 255, 0.85);
}

.kpi--current .kpi__value {
  color: #fff;
  font-size: clamp(1.25rem, 3vh, 1.9rem);
}

.kpi--current.is-loading {
  opacity: 0.8;
}

.kpi--float { border-inline-start: 3px solid rgba(25, 119, 131, 0.55); }
.kpi--payments { border-inline-start: 3px solid rgba(44, 140, 242, 0.5); }
.kpi--count { border-inline-start: 3px solid rgba(100, 180, 190, 0.55); }
.kpi--returns { border-inline-start: 3px solid rgba(229, 115, 115, 0.6); }

.kpi--returns .kpi__icon {
  background: rgba(229, 115, 115, 0.12);
  color: #c0504d;
}

.kpi--returns .kpi__value {
  color: #c0504d;
}

.kpi--payments .kpi__icon {
  background: rgba(44, 140, 242, 0.1);
  color: #2c8cf2;
}

.kpi--count .kpi__icon {
  background: rgba(100, 180, 190, 0.14);
  color: #3f8f99;
}

/* Session panel */
.panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e6edf3;
  border-radius: 16px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.session-panel {
  flex: 1;
}

.session-panel.is-editing {
  border-color: rgba(25, 119, 131, 0.35);
  box-shadow: 0 6px 18px rgba(25, 119, 131, 0.12);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem 1rem;
  flex-wrap: wrap;
  padding: clamp(0.75rem, 1.6vh, 1.1rem) clamp(0.95rem, 1.4vw, 1.4rem);
  border-bottom: 1px solid #eef2f6;
  background: #fafcfd;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  font-size: clamp(0.9rem, 1.7vh, 1.1rem);
  font-weight: 700;
  color: #3d4f5f;
}

.panel-title .v-icon {
  color: #5a9aa3;
}

.panel-note {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  font-size: 0.8rem;
  color: #8a9aab;
}

.panel-note .v-icon {
  color: #5a9aa3;
  flex-shrink: 0;
}

.panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(0.9rem, 3vh, 2.25rem);
  padding: clamp(0.95rem, 3vh, 2.25rem) clamp(0.95rem, 1.4vw, 1.4rem);
}

.panel-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: clamp(0.75rem, 1.6vh, 1.1rem) clamp(0.95rem, 1.4vw, 1.4rem);
  border-top: 1px solid #eef2f6;
  background: #fafcfd;
}

/* Form */
.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(0.75rem, 1.4vw, 1.5rem);
}

.field__label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.45rem;
  font-size: clamp(0.72rem, 1.3vh, 0.82rem);
  font-weight: 700;
  color: #9aabba;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.currency-chip {
  font-size: 0.62rem;
  font-weight: 800;
  padding: 0.12rem 0.38rem;
  border-radius: 6px;
  letter-spacing: 0.03em;
  text-transform: none;
}

.currency-chip--usd {
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
}

.currency-chip--lbp {
  background: rgba(25, 119, 131, 0.12);
  color: #197783;
}

.amount-input :deep(.v-field) {
  border-radius: 12px;
  background: #fff;
}

.amount-input :deep(.v-field__input) {
  min-height: clamp(48px, 7vh, 76px);
  font-size: clamp(1.15rem, 2.8vh, 1.75rem);
  font-weight: 750;
  color: #334155;
  font-variant-numeric: tabular-nums;
}

.amount-input :deep(.v-text-field__prefix),
.amount-input :deep(.v-text-field__suffix) {
  min-height: clamp(48px, 7vh, 76px);
  font-size: clamp(1rem, 2.2vh, 1.35rem);
  font-weight: 700;
  color: #8a9aab;
}

.amount-input :deep(.v-field--disabled) {
  opacity: 1;
  background: #f5f8fa;
}

.amount-input :deep(input:disabled) {
  -webkit-text-fill-color: #64748b;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(0.75rem, 1.4vw, 1.5rem);
}

.info-tile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  padding: clamp(0.7rem, 1.8vh, 1.25rem) clamp(0.85rem, 1.2vw, 1.25rem);
  border-radius: 12px;
  background: #f7fafc;
  border: 1px solid #eef2f6;
}

.info-tile__icon {
  color: #5a9aa3;
  flex-shrink: 0;
  font-size: clamp(18px, 2.4vh, 26px);
}

.info-tile__label {
  display: block;
  font-size: clamp(0.66rem, 1.2vh, 0.78rem);
  font-weight: 700;
  color: #9aabba;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.info-tile__value {
  display: block;
  margin-top: 0.1rem;
  font-size: clamp(0.92rem, 2vh, 1.2rem);
  font-weight: 700;
  color: #334155;
}

.formula-hint {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  margin: 0;
  padding: 0.7rem 0.85rem;
  border-radius: 11px;
  background: rgba(44, 140, 242, 0.06);
  font-size: clamp(0.76rem, 1.3vh, 0.85rem);
  line-height: 1.5;
  color: #64748b;
}

.formula-hint .v-icon {
  color: #2c8cf2;
  margin-top: 2px;
  flex-shrink: 0;
}

/* Buttons */
.btn-ghost,
.btn-solid {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: clamp(40px, 5vh, 52px);
  padding: 0 clamp(1.1rem, 1.6vw, 1.6rem);
  border-radius: 11px;
  font-size: clamp(0.86rem, 1.6vh, 1rem);
  font-weight: 650;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s;
}

.btn-ghost {
  background: rgba(25, 119, 131, 0.08);
  border-color: rgba(25, 119, 131, 0.4);
  color: #197783;
}

.btn-ghost:hover:not(:disabled) {
  background: rgba(25, 119, 131, 0.14);
  border-color: #197783;
}

.btn-solid {
  background-image: linear-gradient(135deg, #197783, #32d8ee);
  color: #fff;
  font-weight: 700;
}

.btn-solid:hover:not(:disabled) {
  background-image: linear-gradient(135deg, #14606a, #26c6da);
}

.btn-ghost:disabled,
.btn-solid:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

/* Responsive */
@media (min-width: 1600px) {
  .drawer-shell {
    padding-inline: 2rem;
  }
}

@media (max-width: 1400px) {
  .kpi-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .kpi-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .drawer-header {
    flex-direction: column;
    align-items: stretch;
  }

  .drawer-header__meta {
    justify-content: space-between;
  }

  .field-grid {
    grid-template-columns: 1fr;
  }

  .panel-body {
    justify-content: flex-start;
  }

  .panel-foot {
    flex-direction: column-reverse;
    align-items: stretch;
  }
}

@media (max-width: 520px) {
  .drawer-shell {
    padding: 0.75rem 0.75rem 1.25rem;
  }

  .drawer-header__subtitle {
    padding-inline-start: 0;
  }

  .kpi-row,
  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
