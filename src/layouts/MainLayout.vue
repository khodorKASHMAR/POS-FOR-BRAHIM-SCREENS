<template>
  <!-- Sidebar: hidden on login page; temporary overlay disables content behind -->
  <v-navigation-drawer
    v-if="!isLoginRoute"
    v-model="ui.sidebar"
    class="app-drawer"
    width="240"
    temporary
    :scrim="'rgba(22, 54, 58, 0.45)'"
    :location="ui.dir === 'rtl' ? 'end' : 'start'"
  >
    <Sidebar @navigate="handleNavigate" />
  </v-navigation-drawer>

  <!-- Main Content -->
  <v-main class="main-background">
    <router-view />
  </v-main>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Sidebar from '../components/Sidebar.vue'
import { useUserStore } from '../store/user'
import { useState } from '../store/state'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const ui = useState()

const user = userStore.user

const isLoginRoute = computed(() => route.path === '/login')

const handleNavigate = (path) => {
  router.push(path)
  ui.sidebar = false
}
</script>

<style scoped>
.main-background {
  background-color: #ffffff !important;
}
</style>

<style>
/* Global: drawer above page content, below dialogs (~2400) */
.app-drawer.v-navigation-drawer {
  z-index: 2200 !important;
  background: transparent !important;
  border: none !important;
  box-shadow: 8px 0 28px rgba(22, 54, 58, 0.18) !important;
}

.app-drawer.v-navigation-drawer--right,
[dir="rtl"] .app-drawer.v-navigation-drawer {
  box-shadow: -8px 0 28px rgba(22, 54, 58, 0.18) !important;
}

/* Scrim dims and blocks interaction with screens behind */
.v-overlay.v-navigation-drawer__scrim,
.v-navigation-drawer__scrim {
  z-index: 2190 !important;
}
</style>
