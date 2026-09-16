<template>
  <v-app :dir="ui.dir" class="app-background" :class="{ 'app-background--mobile': isMobile }">
    <MobileLayout v-if="useMobileLayout" />
    <MainLayout v-else />
    <Notification ref="notificationRef" />
  </v-app>
</template>
<script setup>
import { computed, onMounted, ref, provide, getCurrentInstance } from 'vue'
import MainLayout from './layouts/MainLayout.vue'
import MobileLayout from './layouts/MobileLayout.vue'
import Notification from './components/controls/Notification.vue'
import { useState } from './store/state'
import { useIsMobile } from './composables/useIsMobile'

const ui = useState()
const isMobile = useIsMobile()
const notificationRef = ref(null)

const useMobileLayout = computed(() => isMobile.value)

const open = (message, status, autoCloseDelay) => notificationRef.value?.open(message, status, autoCloseDelay)
provide('$notification', open)

onMounted(() => {
  const instance = getCurrentInstance()
  if (instance?.appContext?.config?.globalProperties) {
    instance.appContext.config.globalProperties.$notification = open
  }
  if (instance?.proxy) {
    instance.proxy.$notification = open
  }
  if (localStorage.getItem('token')) {
    ui.bootstrapItemsCache()
  }
})
</script>

<style>
.app-background {
  background-color: #ffffff !important;
}

.app-background--mobile {
  background: #eef5f6 !important;
  height: 100% !important;
  max-height: 100dvh !important;
  overflow: hidden !important;
}

html.is-mobile-app .app-background,
html.is-mobile-app .v-application {
  background: #eef5f6 !important;
}

.v-application {
  background-color: #ffffff !important;
}

.v-snackbar__wrapper {
  border-radius: 0.875rem !important;
  box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.3) !important;
}

.v-snackbar__content {
  padding: 0.875rem 1.25rem !important;
  font-weight: 500 !important;
}
</style>
