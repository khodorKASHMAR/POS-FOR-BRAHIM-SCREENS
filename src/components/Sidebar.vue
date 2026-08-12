<template>
  <nav
    class="sidebar-nav"
    :class="{ 'dir-rtl': ui.dir === 'rtl' }"
    :dir="ui.dir === 'rtl' ? 'rtl' : 'ltr'"
  >
    <div
      class="sidebar-brand"
      :class="{ 'sidebar-brand-en': ui.lang === 'en' }"
    >
      <span
        class="sidebar-brand-text"
        :class="ui.lang === 'ar' ? 'brand-ar' : 'brand-en'"
      >
        {{ $t('brandName') }}
      </span>
      <button
        type="button"
        class="sidebar-toggle-btn"
        aria-label="Close menu"
        @click="ui.sidebar = false"
      >
        <div class="two-lines-icon">
          <div class="line"></div>
          <div class="line"></div>
          <div class="line"></div>
        </div>
      </button>
    </div>

    <div class="sidebar-menu">
      <div v-if="mainMenus.length" class="sidebar-section">
        <button
          v-for="item in mainMenus"
          :key="item.code"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
          @click="$emit('navigate', item.path)"
        >
          <i class="mdi nav-icon" :class="item.icon" aria-hidden="true"></i>
          <span class="nav-label">{{ $t(item.labelKey) }}</span>
        </button>
      </div>

      <template v-if="adminMenus.length">
        <div v-if="mainMenus.length" class="sidebar-divider" aria-hidden="true"></div>
        <div class="sidebar-section">
          <button
            v-for="item in adminMenus"
            :key="item.code"
            class="nav-item"
            :class="{ active: isActive(item.path) }"
            @click="$emit('navigate', item.path)"
          >
            <i class="mdi nav-icon" :class="item.icon" aria-hidden="true"></i>
            <span class="nav-label">{{ $t(item.labelKey) }}</span>
          </button>
        </div>
      </template>
    </div>

    <div class="sidebar-footer">
      <div class="nav-hint">{{ $t('pointOfSale') }}</div>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '../store/user'
import { useState } from '../store/state'
import { menusForCodes } from '../constants/menus'

const route = useRoute()
const userStore = useUserStore()
const ui = useState()

const allowedMenus = computed(() => menusForCodes(userStore.user?.menus))
const mainMenus = computed(() => allowedMenus.value.filter((m) => m.section === 'main'))
const adminMenus = computed(() => allowedMenus.value.filter((m) => m.section === 'admin'))

defineEmits(['navigate'])

function isActive(path) {
  return route.path === path
}
</script>

<style scoped>
.sidebar-nav {
  --oil-ink: #16363a;
  --oil-muted: #5f7a7e;
  --oil-line: rgba(25, 119, 131, 0.16);
  --oil-teal: #197783;
  --oil-teal-bright: #20b4c6;
  --oil-surface: #ffffff;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1rem 0.75rem;
  min-height: 0;
  background: linear-gradient(180deg, #eaf5f6 0%, #f5f9fa 45%, #eef4f5 100%);
  position: relative;
}

.sidebar-nav::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 70% 40% at 0% 0%, rgba(50, 216, 238, 0.12), transparent 55%),
    radial-gradient(ellipse 50% 30% at 100% 100%, rgba(25, 119, 131, 0.08), transparent 50%);
}

.sidebar-brand,
.sidebar-menu,
.sidebar-footer {
  position: relative;
  z-index: 1;
}

.sidebar-brand {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.15rem 0.2rem 0.85rem;
  border-bottom: 1px solid var(--oil-line);
  text-align: start;
}

.sidebar-brand-text {
  padding-left: 4px !important;
  padding-right: 4px !important;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  font-style: italic;
  text-decoration: none;
  background: linear-gradient(135deg, #197783 0%, #22a5b5 50%, #32d8ee 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.sidebar-brand-text.brand-en {
  font-family: 'Georgia', 'Cormorant Garamond', 'Times New Roman', serif;
  font-size: 0.9375rem;
  white-space: nowrap;
}

.sidebar-brand-text.brand-ar {
  font-family: var(--app-font-arabic);
  font-style: normal;
  font-weight: 600;
  letter-spacing: 0;
}

.sidebar-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
}

.sidebar-menu::-webkit-scrollbar {
  display: none;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.sidebar-divider {
  height: 1px;
  margin: 0.55rem 0.4rem;
  background: linear-gradient(90deg, transparent, var(--oil-line), transparent);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.7rem 0.9rem;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: var(--oil-muted);
  font-size: 0.9375rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
  text-align: start;
  position: relative;
  justify-content: flex-start;
  border-inline-start: 3px solid transparent;
}

.nav-item:hover {
  background: rgba(25, 119, 131, 0.08);
  color: var(--oil-ink);
  border-color: rgba(25, 119, 131, 0.1);
}

.nav-item:active {
  transform: scale(0.99);
}

.nav-item.active {
  background: linear-gradient(135deg, rgba(25, 119, 131, 0.14), rgba(32, 180, 198, 0.12));
  color: var(--oil-teal);
  font-weight: 700;
  border-color: rgba(25, 119, 131, 0.18);
  border-inline-start-color: var(--oil-teal);
  box-shadow: 0 4px 12px rgba(25, 119, 131, 0.1);
}

.nav-icon {
  font-size: 1.25rem;
  opacity: 0.9;
  flex-shrink: 0;
  color: inherit;
}

.nav-item.active .nav-icon {
  opacity: 1;
  color: var(--oil-teal);
}

.nav-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-footer {
  flex-shrink: 0;
  padding: 0.9rem 0.65rem 0.35rem;
  border-top: 1px solid var(--oil-line);
  margin-top: 0.5rem;
}

.nav-hint {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--oil-muted);
  text-align: center;
  font-weight: 600;
}

.sidebar-toggle-btn {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  min-width: 2rem;
  padding: 0;
  border: 1px solid var(--oil-line);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.sidebar-toggle-btn:hover {
  background: #ffffff;
  border-color: rgba(32, 180, 198, 0.45);
  box-shadow: 0 0 0 3px rgba(32, 180, 198, 0.12);
}

.sidebar-brand .two-lines-icon {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
  justify-content: center;
}

.sidebar-brand .two-lines-icon .line {
  width: 1rem;
  height: 2px;
  background: linear-gradient(90deg, var(--oil-teal), var(--oil-teal-bright));
  border-radius: 1px;
}

/* RTL: active border on the right */
.sidebar-nav[dir='rtl'] .sidebar-brand {
  text-align: end;
}

.sidebar-nav[dir='rtl'] .nav-item {
  flex-direction: row;
  direction: rtl;
  justify-content: flex-start;
  text-align: right;
  border-inline-start: none;
  border-left: 1px solid transparent;
  border-right: 3px solid transparent;
}

.sidebar-nav[dir='rtl'] .nav-item:hover {
  border-left-color: rgba(25, 119, 131, 0.1);
}

.sidebar-nav[dir='rtl'] .nav-item.active {
  border-left-color: rgba(25, 119, 131, 0.18);
  border-right-color: var(--oil-teal);
}

.sidebar-nav[dir='rtl'] .nav-label {
  text-align: right;
}

.sidebar-nav[dir='rtl'] .nav-hint {
  text-align: center;
}
</style>
