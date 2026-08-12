<template>
  <div class="top-bar">
    <!-- Sidebar Toggle Button (only when sidebar is closed) -->
    <v-btn
      v-if="!state.sidebar"
      icon
      variant="text"
      size="small"
      class="sidebar-toggle-btn"
      @click="toggleSidebar"
    >
      <div class="two-lines-icon">
        <div class="line"></div>
        <div class="line"></div>
      </div>
    </v-btn>

    <!-- Date & Time Display -->
    <div class="top-bar-btn datetime-display">
      <v-icon size="small" class="gradient-icon">mdi-calendar-clock</v-icon>
      <span class="pill-text">{{ formattedDate }}</span>
      <span class="dot-sep" aria-hidden="true"></span>
      <span class="pill-text pill-text--strong">{{ formattedTime }}</span>
    </div>

    <!-- Spacer -->
    <v-spacer></v-spacer>

    <!-- Dollar Rate Display -->
    <div
      class="top-bar-btn rate-display"
      :class="{ 'rate-display--clickable': canOpenDollarRate }"
      :title="$t('dollarRate')"
      @click="goToDollarRate"
    >
      <span v-if="rateLoading" class="rate-skeleton" aria-hidden="true"></span>
      <template v-else>
        <span class="pill-text pill-text--strong rate-text" dir="ltr">{{ state.lang === 'ar' ? '1$' : '$1' }}</span>
        <v-icon size="small" class="gradient-icon">mdi-swap-horizontal</v-icon>
        <span class="pill-text pill-text--strong rate-text" :dir="state.dir">{{ formattedRate }}</span>
      </template>
    </div>

    <!-- Language Toggle Button -->
    <div class="top-bar-btn language-toggle-btn" @click="toggleLanguage">
      <v-icon size="small" class="gradient-icon">mdi-earth</v-icon>
      <span class="pill-text">{{ state.lang === 'ar' ? 'EN' : 'ع' }}</span>
    </div>

    <!-- Currency Toggle Button -->
    <div class="top-bar-btn currency-toggle-btn" @click="toggleCurrency">
      <v-icon size="small" class="gradient-icon">{{ state.currency === 'USD' ? 'mdi-currency-usd' : 'mdi-cash-multiple' }}</v-icon>
      <span class="pill-text">{{ currencyDisplayText }}</span>
    </div>

    <!-- Power Button -->
    <v-btn
      icon
      variant="text"
      size="small"
      class="power-btn"
      @click="handleLogout"
    >
      <v-icon class="power-icon">mdi-power</v-icon>
    </v-btn>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useState } from '../store/state'
import { useUserStore } from '../store/user'

const state = useState()
const userStore = useUserStore()
const router = useRouter()

const currentDate = ref(new Date())
const rateLoading = ref(false)
let timeInterval = null

const canOpenDollarRate = computed(() => userStore.hasMenu('dollar-rate'))

const formattedDate = computed(() => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const day = days[currentDate.value.getDay()]
  const date = currentDate.value.getDate()
  const month = months[currentDate.value.getMonth()]
  const year = currentDate.value.getFullYear()

  return `${day}. ${date} ${month} ${year}`
})

const formattedTime = computed(() => {
  const hours = currentDate.value.getHours()
  const minutes = currentDate.value.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  const displayMinutes = minutes.toString().padStart(2, '0')

  return `${displayHours}:${displayMinutes} ${ampm}`
})

const formattedRate = computed(() => {
  const rate = Number(state.exchangeRate) || 0
  const unit = state.lang === 'ar' ? 'ل.ل' : 'LBP'
  return `${rate.toLocaleString('en-US')} ${unit}`
})

const toggleSidebar = () => {
  state.sidebar = !state.sidebar
}

const toggleLanguage = () => {
  state.toggleLang()
}

const toggleCurrency = () => {
  state.toggleCurrency()
}

const currencyDisplayText = computed(() => {
  if (state.currency === 'USD') {
    return state.lang === 'ar' ? 'دولار' : 'USD'
  } else {
    return state.lang === 'ar' ? 'ل.ل.' : 'LBP'
  }
})

const goToDollarRate = () => {
  if (!canOpenDollarRate.value) return
  router.push('/dollar-rate')
}

const handleLogout = () => {
  userStore.logout()
}

onMounted(async () => {
  // Update time every second for accuracy
  timeInterval = setInterval(() => {
    currentDate.value = new Date()
  }, 1000)

  // Keep the displayed dollar rate in sync with the backend
  rateLoading.value = true
  try {
    await state.fetchDollarRate()
  } finally {
    rateLoading.value = false
  }
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style scoped>
.top-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 1rem;
  background: transparent;
  height: 45px;
  flex-shrink: 0;
}

.top-bar-btn {
  background: #ffffff;
  border: 1px solid #e6eef1;
  border-radius: 2rem;
  padding: 0.3rem 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  white-space: nowrap;
}

.language-toggle-btn:hover,
.currency-toggle-btn:hover,
.rate-display--clickable:hover {
  border-color: rgba(25, 119, 131, 0.4);
  background: rgba(25, 119, 131, 0.04);
  box-shadow: 0 2px 6px rgba(25, 119, 131, 0.12);
}

.sidebar-toggle-btn {
  background: #ffffff !important;
  border: 1px solid #e6eef1;
  border-radius: 50% !important;
  width: 2rem !important;
  height: 2rem !important;
  min-width: 2rem !important;
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: all 0.2s;
}

.sidebar-toggle-btn:hover {
  background: rgba(25, 119, 131, 0.06) !important;
  box-shadow: 0 2px 6px rgba(25, 119, 131, 0.12);
}

.two-lines-icon {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
  justify-content: center;
}

.two-lines-icon .line {
  width: 1rem;
  height: 2px;
  background-color: #197783;
  border-radius: 1px;
}

.datetime-display {
  margin-left: 0.5rem;
  cursor: default;
}

.dot-sep {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #b9c8ce;
  flex-shrink: 0;
}

.rate-display {
  background: linear-gradient(180deg, rgba(25, 119, 131, 0.06), rgba(50, 216, 238, 0.08));
  border-color: rgba(25, 119, 131, 0.22);
  cursor: default;
}

.rate-display--clickable {
  cursor: pointer;
}

.rate-text {
  color: #14606a;
}

.rate-skeleton {
  width: 5.5rem;
  height: 0.8rem;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(25, 119, 131, 0.1) 25%, rgba(25, 119, 131, 0.22) 50%, rgba(25, 119, 131, 0.1) 75%);
  background-size: 200% 100%;
  animation: rate-shimmer 1.2s ease-in-out infinite;
}

@keyframes rate-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.language-toggle-btn,
.currency-toggle-btn {
  cursor: pointer;
}

.pill-text {
  font-size: 0.875rem;
  color: #334155;
  font-weight: 500;
}

.pill-text--strong {
  font-weight: 700;
  color: #1a1a1a;
}

.power-btn {
  background: #ffffff !important;
  border: 1px solid #e6eef1;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: all 0.2s;
}

.power-btn:hover {
  background: #fef2f2 !important;
  border-color: #fecaca;
}

/* RTL Support */
[dir="rtl"] .top-bar {
  flex-direction: row-reverse;
}

[dir="rtl"] .datetime-display,
[dir="rtl"] .rate-display {
  flex-direction: row-reverse;
}

[dir="rtl"] .datetime-display {
  margin-left: 0;
  margin-right: 0.5rem;
}

.gradient-icon {
  background: linear-gradient(135deg, #197783 0%, #22a5b5 50%, #32d8ee 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.power-icon {
  background: linear-gradient(135deg, #dc2626, #f87171);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>
