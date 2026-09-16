<template>
  <div class="app-shell" :class="{ 'app-shell--login': isLoginRoute }" :dir="ui.dir">
    <header v-if="!isLoginRoute" class="app-shell__header">
      <MobileAppBar />
    </header>

    <main
      ref="mainRef"
      class="app-shell__scroll"
      :class="{ 'app-shell__scroll--dock': showBottomNav }"
    >
      <router-view />
    </main>

    <nav v-if="showBottomNav" class="app-shell__dock" aria-label="Main">
      <button
        v-for="item in primaryTabs"
        :key="item.code"
        type="button"
        class="app-shell__tab"
        :class="{ 'app-shell__tab--on': isActive(item.path) }"
        @click="go(item.path)"
      >
        <v-icon size="22">{{ item.icon }}</v-icon>
        <span>{{ $t(item.labelKey) }}</span>
      </button>

      <button
        v-if="moreMenus.length"
        type="button"
        class="app-shell__tab"
        :class="{ 'app-shell__tab--on': moreOpen || isMoreRouteActive }"
        @click="moreOpen = !moreOpen"
      >
        <v-icon size="22">mdi-view-grid-plus-outline</v-icon>
        <span>{{ $t('more') }}</span>
      </button>
    </nav>

    <v-bottom-sheet v-model="moreOpen" content-class="app-more-sheet" scrim="rgba(7, 34, 38, 0.46)">
      <div class="app-more" :dir="ui.dir">
        <div class="app-more__handle" />
        <header class="app-more__head">
          <div class="app-more__head-copy">
            <h2>{{ $t('more') }}</h2>
            <p>{{ $t('pointOfSale') }}</p>
          </div>
        </header>

        <div class="app-more__list">
          <button
            v-for="item in moreMenus"
            :key="item.code"
            type="button"
            class="app-more__row"
            :class="[`app-more__row--${item.code}`, { 'app-more__row--on': isActive(item.path) }]"
            @click="go(item.path)"
          >
            <span class="app-more__icon">
              <v-icon size="22">{{ item.icon }}</v-icon>
            </span>
            <span class="app-more__label">{{ $t(item.labelKey) }}</span>
            <v-icon class="app-more__chevron" size="20">
              {{ ui.dir === 'rtl' ? 'mdi-chevron-left' : 'mdi-chevron-right' }}
            </v-icon>
          </button>
        </div>
      </div>
    </v-bottom-sheet>
  </div>
</template>

<script setup>
import { computed, nextTick, onUnmounted, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileAppBar from '../components/mobile/MobileAppBar.vue'
import { useState } from '../store/state'
import { useUserStore } from '../store/user'
import { MOBILE_PRIMARY_CODES, menusForCodes } from '../constants/menus'
import {
  MOBILE_BACK_KEY,
  createMobileBackStack
} from '../composables/useMobileBackStack'

const route = useRoute()
const router = useRouter()
const ui = useState()
const userStore = useUserStore()
const moreOpen = ref(false)
const mainRef = ref(null)
const backStack = createMobileBackStack()

provide(MOBILE_BACK_KEY, backStack)

let unregisterMore = null
watch(moreOpen, (open) => {
  if (open) {
    if (!unregisterMore) {
      unregisterMore = backStack.register(() => {
        moreOpen.value = false
      })
    }
    return
  }
  if (unregisterMore) {
    unregisterMore()
    unregisterMore = null
  }
})

const isLoginRoute = computed(() => route.path === '/login')
const showBottomNav = computed(() => !isLoginRoute.value)

const allowedMenus = computed(() => menusForCodes(userStore.user?.menus))

const primaryTabs = computed(() =>
  allowedMenus.value.filter((m) => MOBILE_PRIMARY_CODES.includes(m.code))
)

const moreMenus = computed(() =>
  allowedMenus.value.filter((m) => !MOBILE_PRIMARY_CODES.includes(m.code))
)

const isMoreRouteActive = computed(() =>
  moreMenus.value.some((m) => m.path === route.path)
)

function isActive(path) {
  return route.path === path
}

async function go(path) {
  if (moreOpen.value) {
    moreOpen.value = false
    await nextTick()
    await backStack.waitForPendingBack()
  }
  if (route.path !== path) router.push(path)
}

watch(
  () => route.fullPath,
  async () => {
    if (moreOpen.value) moreOpen.value = false
    await nextTick()
    if (mainRef.value) mainRef.value.scrollTop = 0
  }
)

onUnmounted(() => {
  backStack.dispose()
})
</script>

<style scoped>
/* One phone-height shell: header + scroll + dock. Only .app-shell__scroll scrolls. */
.app-shell {
  --shell-bg: #e8f1f2;
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: var(--m-frame-max, 430px);
  height: 100%;
  max-height: 100dvh;
  margin-inline: auto;
  overflow: hidden;
  background:
    radial-gradient(120% 60% at 100% 0%, rgba(42, 212, 232, 0.16), transparent 55%),
    radial-gradient(90% 40% at 0% 100%, rgba(25, 119, 131, 0.1), transparent 50%),
    var(--shell-bg);
}

.app-shell--login {
  max-width: none;
  background: #072226;
}

.app-shell__header {
  flex: 0 0 auto;
  z-index: 20;
}

.app-shell__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
  touch-action: pan-y;
}

.app-shell__scroll--dock {
  padding-bottom: 0.35rem;
}

/* Floating island tab bar — still in document flow so scroll math stays simple */
.app-shell__dock {
  flex: 0 0 auto;
  display: flex;
  align-items: stretch;
  gap: 0.2rem;
  margin: 0 0.7rem calc(0.45rem + env(safe-area-inset-bottom));
  padding: 0.32rem;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(25, 119, 131, 0.12);
  border-radius: 22px;
  box-shadow: 0 12px 32px rgba(13, 42, 46, 0.12);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  z-index: 20;
}

.app-shell__tab {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
  min-height: 3.05rem;
  padding: 0.22rem 0.1rem;
  border: none;
  border-radius: 16px;
  background: transparent;
  color: #6b8488;
  font-size: 0.6rem;
  font-weight: 750;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: background 0.18s var(--m-ease, cubic-bezier(0.22, 1, 0.36, 1)), color 0.18s;
}

.app-shell__tab span {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-shell__tab--on {
  color: var(--m-teal, #197783);
  background: linear-gradient(180deg, rgba(42, 212, 232, 0.16), rgba(25, 119, 131, 0.1));
}

.app-more {
  background:
    radial-gradient(120% 80% at 100% 0%, rgba(42, 212, 232, 0.16), transparent 55%),
    linear-gradient(180deg, #f4fbfc 0%, #eaf4f6 100%);
  border-radius: 28px 28px 0 0;
  padding: 0.7rem 0.9rem calc(1.15rem + env(safe-area-inset-bottom));
  box-shadow: 0 -18px 40px rgba(13, 42, 46, 0.16);
}

.app-more__handle {
  width: 36px;
  height: 4px;
  border-radius: 999px;
  background: rgba(25, 119, 131, 0.28);
  margin: 0 auto 0.85rem;
}

.app-more__head {
  display: flex;
  align-items: center;
  margin: 0 0.2rem 0.95rem;
}

.app-more__head-copy h2 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--m-ink, #0d2a2e);
  line-height: 1.15;
}

.app-more__head-copy p {
  margin: 0.18rem 0 0;
  font-size: 0.78rem;
  font-weight: 650;
  color: var(--m-ink-soft, #3d5c61);
}

.app-more__list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.app-more__row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-height: 3.7rem;
  padding: 0.7rem 0.8rem;
  border: 1px solid rgba(25, 119, 131, 0.1);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--m-ink, #0d2a2e);
  box-shadow: 0 8px 18px rgba(13, 42, 46, 0.05);
  cursor: pointer;
  text-align: start;
}

.app-more__row:active {
  transform: scale(0.985);
}

.app-more__row--on {
  border-color: rgba(25, 119, 131, 0.28);
  background: linear-gradient(135deg, rgba(25, 119, 131, 0.1), rgba(42, 212, 232, 0.12));
  box-shadow: 0 10px 22px rgba(25, 119, 131, 0.12);
}

.app-more__icon {
  width: 2.55rem;
  height: 2.55rem;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #fff;
  background: linear-gradient(145deg, #0f5a63, #197783 55%, #2ad4e8);
  box-shadow: 0 8px 16px rgba(25, 119, 131, 0.22);
}

.app-more__row--dashboard .app-more__icon {
  background: linear-gradient(145deg, #0f5a63, #197783 50%, #32d8ee);
}

.app-more__row--add-items .app-more__icon {
  background: linear-gradient(145deg, #125f68, #1d8d9a 55%, #5ce1ee);
}

.app-more__row--users .app-more__icon {
  background: linear-gradient(145deg, #0f4f58, #2a7f9a 55%, #7ed6f0);
}

.app-more__row--currency-rate .app-more__icon {
  background: linear-gradient(145deg, #8a6a12, #c4a028 55%, #f0d56a);
}

.app-more__row--print-templates .app-more__icon {
  background: linear-gradient(145deg, #35555a, #4f7378 55%, #8eb8bd);
}

.app-more__label {
  flex: 1;
  min-width: 0;
  font-size: 0.98rem;
  font-weight: 750;
  line-height: 1.25;
}

.app-more__chevron {
  flex-shrink: 0;
  color: #8aa3a7;
}

.app-more__row--on .app-more__chevron {
  color: var(--m-teal, #197783);
}
</style>

<style>
.app-more-sheet.v-bottom-sheet .v-overlay__content {
  border-radius: 28px 28px 0 0 !important;
  max-width: var(--m-frame-max, 430px) !important;
  margin-inline: auto !important;
  overflow: hidden !important;
  background: transparent !important;
}
</style>
