<template>
  <v-app :dir="ui.dir" class="app-background">
    <MainLayout />
    <Notification ref="notificationRef" />
  </v-app>
</template>
<script setup>
import { onMounted, ref, provide } from 'vue'
import { getCurrentInstance } from 'vue'
import MainLayout from './layouts/MainLayout.vue'
import Notification from './components/controls/Notification.vue'
import { useState } from './store/state'

const ui = useState()
const notificationRef = ref(null)

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
})
</script>

<style>
.app-background {
  background-color: #ffffff !important;
}

.v-application {
  background-color: #ffffff !important;
}

/* V-Snackbar styling (aligned with icts-screens) */
.v-snackbar__wrapper {
  border-radius: 0.875rem !important;
  box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.3) !important;
}

.v-snackbar__content {
  padding: 0.875rem 1.25rem !important;
  font-weight: 500 !important;
}
</style>
