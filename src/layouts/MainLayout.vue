<template>
  <!-- Sidebar: hidden on login page -->
  <v-navigation-drawer
    v-if="!isLoginRoute"
    v-model="ui.sidebar"
    class="app-drawer"
    width="220"
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
}
</script>

<style scoped>
.main-background {
  background-color: #ffffff !important;
}

/* Light sidebar drawer to match Sidebar.vue */
:deep(.app-drawer) {
  background: #fafafa !important;
  border-inline-end: 1px solid rgba(0, 0, 0, 0.06);
}
</style>
