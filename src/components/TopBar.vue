<template>
  <div class="top-bar">
    <!-- Sidebar Toggle Button -->
    <v-btn
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

    <!-- Date Display -->
    <div class="top-bar-btn date-display">
      <v-icon size="small" color="primary">mdi-calendar</v-icon>
      <span class="date-text">{{ formattedDate }}</span>
    </div>

    <!-- Separator -->
    <span class="separator mx-3">-</span>

    <!-- Time Display -->
    <div class="top-bar-btn time-display">
      <v-icon size="small" color="primary">mdi-clock-outline</v-icon>
      <span class="time-text">{{ formattedTime }}</span>
    </div>

    <!-- Spacer -->
    <v-spacer></v-spacer>

    <!-- Language Toggle Button -->
    <div class="top-bar-btn language-toggle-btn" @click="toggleLanguage">
      <v-icon size="small" color="success">mdi-earth</v-icon>
      <span class="language-text">{{ state.lang === 'ar' ? 'ع' : 'EN' }}</span>
    </div>

    <!-- Currency Toggle Button -->
    <div class="top-bar-btn currency-toggle-btn" @click="toggleCurrency">
      <v-icon size="small" color="success">{{ state.currency === 'USD' ? 'mdi-currency-usd' : 'mdi-cash-multiple' }}</v-icon>
      <span class="currency-text">{{ currencyDisplayText }}</span>
    </div>

    <!-- Power Button -->
    <v-btn
      icon
      variant="text"
      size="small"
      class="top-bar-btn power-btn"
      @click="handleLogout"
      color="error"
    >
      <v-icon>mdi-power</v-icon>
    </v-btn>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useState } from '../store/state'
import { useUserStore } from '../store/user'

const state = useState()
const userStore = useUserStore()

const currentDate = ref(new Date())
let timeInterval = null

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

const handleLogout = () => {
  userStore.logout()
}

onMounted(() => {
  // Update time every second for accuracy
  timeInterval = setInterval(() => {
    currentDate.value = new Date()
  }, 1000) // Update every second
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
  background: #fafafa;
  height: 45px;
  flex-shrink: 0;
}

.top-bar-btn {
  background: #ffffff;
  border-radius: 2rem;
  padding: 0.375rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.top-bar-btn:hover {
  background: rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.sidebar-toggle-btn {
  background: #ffffff !important;
  border-radius: 50% !important;
  width: 2rem !important;
  height: 2rem !important;
  min-width: 2rem !important;
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.sidebar-toggle-btn:hover {
  background: rgba(0, 188, 212, 0.1) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
  background-color: #00bcd4;
  border-radius: 1px;
}

.date-display {
    margin-left: 1rem;
}

.date-display,
.time-display {
  cursor: default;
}

.language-toggle-btn,
.currency-toggle-btn {
  cursor: pointer;
}

.date-text,
.time-text,
.language-text {
  font-size: 0.875rem;
  color: #1a1a1a;
  font-weight: 500;
}

.separator {
  color: #666;
  font-size: 0.875rem;
  padding: 0 0.25rem;
}

.power-btn {
  margin-left: auto;
}

/* RTL Support */
[dir="rtl"] .top-bar {
  flex-direction: row-reverse;
}

[dir="rtl"] .power-btn {
  margin-left: 0;
  margin-right: auto;
}

[dir="rtl"] .date-display,
[dir="rtl"] .time-display {
  flex-direction: row-reverse;
}
</style>

