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
      <div class="sidebar-section">
        <button
          class="nav-item"
          :class="{ active: isActive('/') }"
          @click="$emit('navigate', '/')"
        >
          <i class="mdi mdi-home nav-icon" aria-hidden="true"></i>
          <span class="nav-label">{{ $t('home') }}</span>
        </button>
        <button
          class="nav-item"
          :class="{ active: isActive('/drafts') }"
          @click="$emit('navigate', '/drafts')"
        >
          <i class="mdi mdi-file-document-edit-outline nav-icon" aria-hidden="true"></i>
          <span class="nav-label">{{ $t('drafts') }}</span>
        </button>
        <button
          class="nav-item"
          :class="{ active: isActive('/receipts') }"
          @click="$emit('navigate', '/receipts')"
        >
          <i class="mdi mdi-receipt nav-icon" aria-hidden="true"></i>
          <span class="nav-label">{{ $t('receipts') }}</span>
        </button>
      </div>

      <template v-if="user.role === 'admin'">
        <div class="sidebar-section">
          <button
            class="nav-item"
            :class="{ active: isActive('/dashboard') }"
            @click="$emit('navigate', '/dashboard')"
          >
            <i class="mdi mdi-chart-areaspline nav-icon" aria-hidden="true"></i>
            <span class="nav-label">{{ $t('dashboard') }}</span>
          </button>
          <button
            class="nav-item"
            :class="{ active: isActive('/add-items') }"
            @click="$emit('navigate', '/add-items')"
          >
            <i class="mdi mdi-shield-account nav-icon" aria-hidden="true"></i>
            <span class="nav-label">{{ $t('addItems') }}</span>
          </button>
          <button
            class="nav-item"
            :class="{ active: isActive('/users') }"
            @click="$emit('navigate', '/users')"
          >
            <i class="mdi mdi-account-group nav-icon" aria-hidden="true"></i>
            <span class="nav-label">{{ $t('users') }}</span>
          </button>
          <button
            class="nav-item"
            :class="{ active: isActive('/dollar-rate') }"
            @click="$emit('navigate', '/dollar-rate')"
          >
            <i class="mdi mdi-currency-usd nav-icon" aria-hidden="true"></i>
            <span class="nav-label">{{ $t('dollarRate') }}</span>
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
import { useRoute } from 'vue-router'
import { useUserStore } from '../store/user'
import { useState } from '../store/state'

const route = useRoute()
const userStore = useUserStore()
const ui = useState()
const user = userStore.user

defineEmits(['navigate'])

function isActive(path) {
  return route.path === path
}
</script>

<style scoped>
.sidebar-nav {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px 12px;
  min-height: 0;
  background: #fafafa;
  border-inline-end: 1px solid rgba(0, 0, 0, 0.06);
}

.sidebar-brand {
  flex-shrink: 0;

  margin-bottom: 8px;
  text-align: start;
}



.sidebar-brand-text {
  padding-left: 4px !important;
  padding-right: 4px !important;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: -0.03em;
  font-style: italic;
  text-decoration: none;
}

.sidebar-brand-text.brand-en {
  font-family: 'Georgia', 'Cormorant Garamond', 'Times New Roman', serif;
  font-size: 0.9375rem;
  white-space: nowrap;
}

.sidebar-brand-text.brand-ar {
  font-family: 'Amiri', 'Noto Naskh Arabic', 'Traditional Arabic', serif;
}

.sidebar-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
  overflow-y: auto;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: rgba(0, 0, 0, 0.72);
  font-size: 0.9375rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
  text-align: start;
  position: relative;
  justify-content: flex-start;
  border-inline-start: 3px solid transparent;
}

.nav-item:hover {
  background: rgba(44, 140, 242, 0.08);
  color: #1a1a1a;
}

.nav-item:active {
  transform: scale(0.99);
}

.nav-item.active {
  background: rgba(44, 140, 242, 0.12);
  color: #2c8cf2;
  font-weight: 600;
  border-inline-start-color: #2c8cf2;
}

.nav-icon {
  font-size: 1.25rem;
  opacity: 0.9;
  flex-shrink: 0;
}

.nav-item.active .nav-icon {
  opacity: 1;
}

.nav-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-footer {
  flex-shrink: 0;
  padding: 16px 12px 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.nav-hint {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.4);
  text-align: center;
}

/* RTL: icon before text; labels + icons aligned to the right; active border on the right */
.sidebar-nav[dir='rtl'] .sidebar-brand {
  text-align: end;
}

.sidebar-nav[dir='rtl'] .nav-item {
  flex-direction: row;
  direction: rtl;
  justify-content: flex-start;
  text-align: right;
  border-inline-start: none;
  border-inline-end: none;
  border-left: none;
  border-right: 3px solid transparent;
}

.sidebar-nav[dir='rtl'] .nav-item.active {
  border-right-color: #2c8cf2;
}

.sidebar-nav[dir='rtl'] .nav-label {
  text-align: right;
}

.sidebar-nav[dir='rtl'] .nav-hint {
  text-align: center;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.sidebar-toggle-btn {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  min-width: 2rem;
  padding: 0;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

/* .sidebar-toggle-btn:hover {
  background: rgba(44, 140, 242, 0.25);
} */

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
  background-color: #2c8cf2;
  border-radius: 1px;
}
</style>
