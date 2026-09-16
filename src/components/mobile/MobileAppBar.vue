<template>
  <header class="app-top" :dir="state.dir">
    <div class="app-top__brand">
      <button
        v-if="isSecondaryRoute"
        type="button"
        class="app-top__back"
        :aria-label="$t('back')"
        @click="goBack"
      >
        <v-icon size="26">{{ arrowIcon }}</v-icon>
      </button>
      <span v-else class="app-top__mark" aria-hidden="true" />
      <div class="app-top__copy">
        <span class="app-top__eyebrow">{{ $t('pointOfSale') }}</span>
        <span class="app-top__title">{{ headerTitle }}</span>
      </div>
    </div>

    <div class="app-top__actions">
      <button
        type="button"
        class="app-top__pill"
        :class="{ 'app-top__pill--live': canOpenDollarRate }"
        :title="$t('dollarRate')"
        @click="goToDollarRate"
      >
        <span v-if="rateLoading" class="app-top__skel" />
        <template v-else>
          <span dir="ltr">$1</span>
          <v-icon size="13">mdi-swap-horizontal</v-icon>
          <span>{{ formattedRateShort }}</span>
        </template>
      </button>

      <button type="button" class="app-top__icon" @click="state.toggleLang()">
        {{ state.lang === 'ar' ? 'EN' : 'ع' }}
      </button>

      <button type="button" class="app-top__icon" @click="state.toggleCurrency()">
        {{ currencyShort }}
      </button>

      <button
        type="button"
        class="app-top__icon app-top__icon--danger"
        :aria-label="$t('logout')"
        @click="userStore.logout()"
      >
        <v-icon size="18">mdi-power</v-icon>
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useState } from '../../store/state'
import { useUserStore } from '../../store/user'
import { MENUS, MOBILE_PRIMARY_CODES } from '../../constants/menus'
import { useNavArrowIcon } from '../../composables/useMobileBackStack'

const state = useState()
const userStore = useUserStore()
const router = useRouter()
const route = useRoute()
const instance = getCurrentInstance()
const $t = (key) => instance?.appContext?.config?.globalProperties?.$t?.(key) ?? key
const rateLoading = ref(false)
const arrowIcon = useNavArrowIcon()

const canOpenDollarRate = computed(() => userStore.hasMenu('currency-rate'))

const currentMenu = computed(() =>
  Object.values(MENUS).find((menu) => menu.path === route.path) || null
)

const isSecondaryRoute = computed(() => {
  const code = currentMenu.value?.code
  return Boolean(code) && !MOBILE_PRIMARY_CODES.includes(code)
})

const headerTitle = computed(() => {
  if (isSecondaryRoute.value && currentMenu.value) {
    return $t(currentMenu.value.labelKey)
  }
  return $t('brandName')
})

const formattedRateShort = computed(() => {
  const rate = Number(state.exchangeRate) || 0
  if (rate >= 1000) return `${Math.round(rate / 1000)}k`
  return String(rate)
})

const currencyShort = computed(() => (state.currency === 'USD' ? '$' : 'LBP'))

function goToDollarRate() {
  if (!canOpenDollarRate.value) return
  router.push('/currency-rate')
}

function goBack() {
  if (window.history.state?.back != null) {
    router.back()
    return
  }
  router.replace(userStore.firstAllowedPath || '/')
}

onMounted(async () => {
  rateLoading.value = true
  try {
    await state.fetchDollarRate()
  } finally {
    rateLoading.value = false
  }
})
</script>

<style scoped>
.app-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: var(--m-appbar-h, 3.4rem);
  padding: 0.4rem 0.8rem;
  padding-top: max(0.4rem, env(safe-area-inset-top));
  background: rgba(255, 255, 255, 0.72);
  border-bottom: 1px solid rgba(25, 119, 131, 0.08);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.app-top__brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
}

.app-top__back {
  width: 2.35rem;
  height: 2.35rem;
  border: none;
  border-radius: 999px;
  flex-shrink: 0;
  background: transparent;
  color: var(--m-ink, #0d2a2e);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-inline-start: -0.35rem;
}

.app-top__mark {
  width: 2rem;
  height: 2rem;
  border-radius: 11px;
  flex-shrink: 0;
  background: linear-gradient(145deg, #0f5a63, #197783 55%, #2ad4e8);
  box-shadow: 0 6px 14px rgba(25, 119, 131, 0.28);
}

.app-top__back:active {
  background: rgba(25, 119, 131, 0.1);
}

.app-top__copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.app-top__eyebrow {
  font-size: 0.56rem;
  font-weight: 750;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--m-ink-soft, #3d5c61);
}

.app-top__title {
  font-size: 0.86rem;
  font-weight: 800;
  color: var(--m-ink, #0d2a2e);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-top__actions {
  display: flex;
  align-items: center;
  gap: 0.28rem;
  flex-shrink: 0;
}

.app-top__pill,
.app-top__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  min-height: 2rem;
  border: 1px solid rgba(25, 119, 131, 0.1);
  background: rgba(255, 255, 255, 0.9);
  border-radius: 999px;
  color: var(--m-ink, #0d2a2e);
  font-size: 0.68rem;
  font-weight: 700;
}

.app-top__pill {
  padding: 0.2rem 0.5rem;
  max-width: 5.8rem;
  overflow: hidden;
}

.app-top__pill--live {
  cursor: pointer;
}

.app-top__icon {
  width: 2rem;
  padding: 0;
  cursor: pointer;
}

.app-top__icon--danger {
  color: #dc2626;
}

.app-top__skel {
  width: 2.8rem;
  height: 0.55rem;
  border-radius: 999px;
  background: rgba(25, 119, 131, 0.15);
}
</style>
