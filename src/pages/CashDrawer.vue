<template>
  <div class="vault-page">
    <div class="vault-atmosphere" aria-hidden="true">
      <span class="vault-orb vault-orb--a" />
      <span class="vault-orb vault-orb--b" />
      <span class="vault-grid" />
    </div>
    <TopBar />

    <div class="vault-shell" :dir="lang.dir">
      <header class="vault-header">
        <div class="vault-header__copy">
          <span class="vault-kicker">
            <v-icon size="14">mdi-safe-square-outline</v-icon>
            {{ $t('pointOfSale') }}
          </span>
          <h1 class="vault-title">{{ $t('cashDrawer') }}</h1>
          <p class="vault-subtitle">{{ $t('cashDrawerSubtitle') }}</p>
        </div>

        <div v-if="lastUpdatedLabel" class="vault-stamp">
          <v-icon size="15">mdi-history</v-icon>
          <div>
            <span class="vault-stamp__label">{{ $t('lastUpdated') }}</span>
            <strong class="vault-stamp__value">{{ lastUpdatedLabel }}</strong>
          </div>
        </div>
      </header>

      <section class="balance-stage" :class="{ 'is-loading': loading, 'is-editing': editing }">
        <div class="balance-stage__ring" aria-hidden="true" />
        <div class="balance-stage__inner">
          <span class="balance-stage__label">{{ $t('currentDrawerAmount') }}</span>
          <strong class="balance-stage__amount" dir="ltr">
            {{ loading ? '—' : formatLbp(currentAmount) }}
          </strong>
          <span class="balance-stage__formula" dir="ltr">
            {{ $t('initialFloat') }} + {{ $t('paymentsSinceOpen') }}
          </span>
        </div>
      </section>

      <div class="metric-rail">
        <article class="metric-tile metric-tile--float">
          <span class="metric-tile__icon"><v-icon size="18">mdi-cash</v-icon></span>
          <div class="metric-tile__body">
            <span class="metric-tile__label">{{ $t('initialFloat') }}</span>
            <strong class="metric-tile__value" dir="ltr">{{ loading ? '—' : formatLbp(initialTotalLbp) }}</strong>
          </div>
        </article>
        <article class="metric-tile metric-tile--payments">
          <span class="metric-tile__icon"><v-icon size="18">mdi-receipt-text-plus</v-icon></span>
          <div class="metric-tile__body">
            <span class="metric-tile__label">{{ $t('paymentsSinceOpen') }}</span>
            <strong class="metric-tile__value" dir="ltr">{{ loading ? '—' : formatLbp(paymentsTotalLbp) }}</strong>
          </div>
        </article>
        <article class="metric-tile metric-tile--count">
          <span class="metric-tile__icon"><v-icon size="18">mdi-counter</v-icon></span>
          <div class="metric-tile__body">
            <span class="metric-tile__label">{{ $t('receiptCount') }}</span>
            <strong class="metric-tile__value">{{ loading ? '—' : receiptCount }}</strong>
          </div>
        </article>
      </div>

      <section class="session-panel" :class="{ 'is-saving': saving, 'is-editing': editing }">
        <div class="session-panel__top">
          <div class="session-panel__title-wrap">
            <span class="session-panel__badge">
              <v-icon size="16">{{ editing ? 'mdi-pencil-outline' : 'mdi-lock-outline' }}</v-icon>
            </span>
            <div>
              <h2 class="session-panel__title">{{ $t('drawerSession') }}</h2>
              <p class="session-panel__status">
                {{ editing ? $t('cashDrawerEditingHint') : $t('cashDrawerLockedHint') }}
              </p>
            </div>
          </div>
          <span class="session-panel__mode" :class="{ 'session-panel__mode--edit': editing }">
            {{ editing ? $t('editing') : $t('locked') }}
          </span>
        </div>

        <div class="session-panel__body">
          <div class="currency-pair">
            <div class="currency-field" :class="{ 'currency-field--active': editing }">
              <div class="currency-field__head">
                <span class="currency-chip currency-chip--usd">USD</span>
                <span class="currency-field__label">{{ $t('usDollar') }}</span>
              </div>
              <v-text-field
                v-model.number="initialAmountUsd"
                type="number"
                variant="plain"
                density="compact"
                :placeholder="$t('placeholderInitialUsd')"
                hide-details
                class="currency-input price-field-no-arrows"
                :disabled="!editing || loading || saving"
                @keyup.enter="handlePrimaryAction"
              />
            </div>

            <div class="currency-join" aria-hidden="true">
              <span>+</span>
            </div>

            <div class="currency-field" :class="{ 'currency-field--active': editing }">
              <div class="currency-field__head">
                <span class="currency-chip currency-chip--lbp">{{ lbpSymbol }}</span>
                <span class="currency-field__label">{{ $t('lebanesePound') }}</span>
              </div>
              <v-text-field
                v-model.number="initialAmountLbp"
                type="number"
                variant="plain"
                density="compact"
                :placeholder="$t('placeholderInitialLbp')"
                hide-details
                class="currency-input price-field-no-arrows"
                :disabled="!editing || loading || saving"
                @keyup.enter="handlePrimaryAction"
              />
            </div>
          </div>

          <div class="datetime-row">
            <div class="datetime-tile">
              <v-icon size="18" class="datetime-tile__icon">mdi-calendar</v-icon>
              <div>
                <span class="datetime-tile__label">{{ $t('date') }}</span>
                <strong class="datetime-tile__value">{{ displayDate }}</strong>
              </div>
            </div>
            <div class="datetime-tile">
              <v-icon size="18" class="datetime-tile__icon">mdi-clock-outline</v-icon>
              <div>
                <span class="datetime-tile__label">{{ $t('time') }}</span>
                <strong class="datetime-tile__value">{{ displayTime }}</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="session-panel__footer">
          <p class="session-hint">
            <v-icon size="15">mdi-information-outline</v-icon>
            <span>{{ $t('cashDrawerHint') }}</span>
          </p>
          <button
            type="button"
            class="vault-action"
            :class="{ 'vault-action--save': editing }"
            :disabled="loading || saving || (editing && !isValidAmount)"
            @click="handlePrimaryAction"
          >
            <v-progress-circular
              v-if="saving"
              indeterminate
              size="18"
              width="2"
              color="white"
            />
            <v-icon v-else size="18">{{ primaryIcon }}</v-icon>
            <span>{{ editing ? $t('save') : $t('updateDrawer') }}</span>
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
.vault-page {
  --ink: #12363b;
  --muted: #5f7a7e;
  --teal: #197783;
  --teal-bright: #32d8ee;
  --line: rgba(25, 119, 131, 0.16);
  --surface: #ffffff;
  position: relative;
  min-height: 100vh;
  background: #eef5f6;
  overflow: hidden;
}

.vault-atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.vault-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(2px);
}

.vault-orb--a {
  width: 28rem;
  height: 28rem;
  top: -8rem;
  inset-inline-start: -6rem;
  background: radial-gradient(circle, rgba(50, 216, 238, 0.22), transparent 68%);
  animation: orb-drift 12s ease-in-out infinite;
}

.vault-orb--b {
  width: 22rem;
  height: 22rem;
  bottom: -4rem;
  inset-inline-end: -5rem;
  background: radial-gradient(circle, rgba(25, 119, 131, 0.18), transparent 70%);
  animation: orb-drift 14s ease-in-out infinite reverse;
}

.vault-grid {
  position: absolute;
  inset: 0;
  opacity: 0.35;
  background-image:
    linear-gradient(rgba(25, 119, 131, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(25, 119, 131, 0.05) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(ellipse at center, black 20%, transparent 75%);
}

@keyframes orb-drift {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(18px, -12px); }
}

.vault-shell {
  position: relative;
  z-index: 1;
  max-width: 880px;
  margin: 0 auto;
  padding: 1rem 1rem 2.5rem;
}

.vault-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.35rem;
}

.vault-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.45rem;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  background: rgba(25, 119, 131, 0.08);
  color: var(--teal);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.vault-title {
  margin: 0;
  font-size: clamp(1.55rem, 3vw, 2rem);
  font-weight: 900;
  color: var(--ink);
  letter-spacing: -0.03em;
  line-height: 1.15;
}

.vault-subtitle {
  margin: 0.35rem 0 0;
  color: var(--muted);
  font-size: 0.9rem;
  max-width: 34rem;
}

.vault-stamp {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.7rem 0.9rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--line);
  box-shadow: 0 8px 24px rgba(18, 54, 59, 0.06);
  color: var(--teal);
  flex-shrink: 0;
}

.vault-stamp__label {
  display: block;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.vault-stamp__value {
  display: block;
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--ink);
}

.balance-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  margin-bottom: 1rem;
  border-radius: 28px;
  overflow: hidden;
  background:
    linear-gradient(145deg, #0d454c 0%, #156570 42%, #1a8f9c 78%, #2bb8c9 100%);
  box-shadow:
    0 18px 48px rgba(15, 79, 88, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  transition: transform 0.35s ease, box-shadow 0.35s ease;
}

.balance-stage.is-loading {
  opacity: 0.78;
}

.balance-stage.is-editing {
  box-shadow:
    0 18px 48px rgba(15, 79, 88, 0.34),
    0 0 0 3px rgba(50, 216, 238, 0.28);
}

.balance-stage__ring {
  position: absolute;
  width: min(78%, 420px);
  aspect-ratio: 1;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow:
    inset 0 0 0 18px rgba(255, 255, 255, 0.03),
    0 0 60px rgba(50, 216, 238, 0.18);
  animation: ring-pulse 5.5s ease-in-out infinite;
}

@keyframes ring-pulse {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.04); opacity: 1; }
}

.balance-stage__inner {
  position: relative;
  z-index: 1;
  text-align: center;
  color: #fff;
  padding: 1.5rem 1rem;
}

.balance-stage__label {
  display: block;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.82;
  margin-bottom: 0.55rem;
}

.balance-stage__amount {
  display: block;
  font-size: clamp(2rem, 6vw, 3rem);
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -0.03em;
  text-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
  animation: amount-in 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes amount-in {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.balance-stage__formula {
  display: inline-block;
  margin-top: 0.85rem;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.16);
  font-size: 0.72rem;
  font-weight: 700;
  opacity: 0.9;
}

.metric-rail {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.metric-tile {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.9rem 0.95rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 24px rgba(18, 54, 59, 0.05);
  backdrop-filter: blur(10px);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.metric-tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(18, 54, 59, 0.08);
}

.metric-tile__icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.metric-tile--float .metric-tile__icon {
  background: rgba(25, 119, 131, 0.12);
  color: var(--teal);
}

.metric-tile--payments .metric-tile__icon {
  background: rgba(44, 140, 242, 0.12);
  color: #2c8cf2;
}

.metric-tile--count .metric-tile__icon {
  background: rgba(15, 118, 110, 0.12);
  color: #0f766e;
}

.metric-tile__label {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.15rem;
}

.metric-tile__value {
  display: block;
  font-size: 0.98rem;
  font-weight: 900;
  color: var(--ink);
  line-height: 1.15;
}

.session-panel {
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 14px 40px rgba(18, 54, 59, 0.08);
  backdrop-filter: blur(14px);
  overflow: hidden;
  transition: opacity 0.2s ease, box-shadow 0.25s ease;
}

.session-panel.is-saving {
  opacity: 0.9;
}

.session-panel.is-editing {
  box-shadow:
    0 14px 40px rgba(18, 54, 59, 0.1),
    0 0 0 2px rgba(50, 216, 238, 0.25);
}

.session-panel__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  padding: 1rem 1.15rem;
  border-bottom: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(234, 245, 246, 0.9), rgba(255, 255, 255, 0.4));
}

.session-panel__title-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.session-panel__badge {
  width: 40px;
  height: 40px;
  border-radius: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(25, 119, 131, 0.14), rgba(50, 216, 238, 0.18));
  color: var(--teal);
  flex-shrink: 0;
}

.session-panel__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 900;
  color: var(--ink);
}

.session-panel__status {
  margin: 0.15rem 0 0;
  font-size: 0.78rem;
  color: var(--muted);
}

.session-panel__mode {
  flex-shrink: 0;
  padding: 0.28rem 0.65rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: rgba(100, 116, 139, 0.1);
  color: #64748b;
}

.session-panel__mode--edit {
  background: rgba(50, 216, 238, 0.16);
  color: #0f766e;
}

.session-panel__body {
  padding: 1.15rem;
}

.currency-pair {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0.7rem;
  align-items: stretch;
  margin-bottom: 0.9rem;
}

.currency-field {
  padding: 0.85rem 0.9rem 0.55rem;
  border-radius: 18px;
  background: #f4f8f9;
  border: 1px solid transparent;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.currency-field--active {
  background: #fff;
  border-color: rgba(25, 119, 131, 0.28);
  box-shadow: 0 0 0 3px rgba(50, 216, 238, 0.12);
}

.currency-field__head {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.25rem;
}

.currency-chip {
  font-size: 0.62rem;
  font-weight: 900;
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  letter-spacing: 0.03em;
}

.currency-chip--usd {
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
}

.currency-chip--lbp {
  background: rgba(25, 119, 131, 0.12);
  color: var(--teal);
}

.currency-field__label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--muted);
}

.currency-input :deep(.v-field) {
  background: transparent;
}

.currency-input :deep(.v-field__input) {
  font-size: 1.35rem;
  font-weight: 900;
  color: var(--ink);
  min-height: 42px;
  padding-inline: 0 !important;
}

.currency-input :deep(input:disabled) {
  opacity: 0.7;
  -webkit-text-fill-color: var(--ink);
}

.currency-join {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  margin-top: 2.4rem;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(25, 119, 131, 0.12), rgba(50, 216, 238, 0.18));
  color: var(--teal);
  font-weight: 900;
  font-size: 1rem;
}

.datetime-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.7rem;
}

.datetime-tile {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.85rem 0.95rem;
  border-radius: 16px;
  background: linear-gradient(180deg, #f7fbfc, #eef5f6);
  border: 1px solid var(--line);
}

.datetime-tile__icon {
  color: var(--teal);
  flex-shrink: 0;
}

.datetime-tile__label {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.datetime-tile__value {
  display: block;
  margin-top: 0.1rem;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--ink);
}

.session-panel__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.95rem 1.15rem 1.15rem;
  border-top: 1px solid var(--line);
}

.session-hint {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  margin: 0;
  max-width: 28rem;
  font-size: 0.74rem;
  line-height: 1.45;
  color: var(--muted);
}

.session-hint .v-icon {
  color: #2c8cf2;
  margin-top: 1px;
  flex-shrink: 0;
}

.vault-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-width: 11.5rem;
  height: 2.85rem;
  padding: 0 1.2rem;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #0f4f58, #197783 55%, #32d8ee);
  box-shadow: 0 10px 24px rgba(25, 119, 131, 0.28);
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
  flex-shrink: 0;
}

.vault-action:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(25, 119, 131, 0.34);
}

.vault-action:active:not(:disabled) {
  transform: translateY(0);
}

.vault-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.vault-action--save {
  background: linear-gradient(135deg, #0f766e, #14b8a6 55%, #2dd4bf);
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

@media (max-width: 760px) {
  .vault-header {
    flex-direction: column;
  }

  .metric-rail,
  .datetime-row,
  .currency-pair {
    grid-template-columns: 1fr;
  }

  .currency-join {
    margin: 0 auto;
  }

  .session-panel__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .vault-action {
    width: 100%;
  }
}
</style>
