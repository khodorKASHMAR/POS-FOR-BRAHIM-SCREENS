<template>
  <!-- Sidebar -->
  <v-navigation-drawer 
    v-model="ui.sidebar" 
    color="cyan-darken-3" 
    width="200"
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
import { useRouter } from 'vue-router'
import Sidebar from '../components/Sidebar.vue'
import { useUserStore } from '../store/user'
import { useState } from '../store/state'

const router = useRouter()
const userStore = useUserStore()
const ui = useState()

const user = userStore.user

const handleNavigate = (path) => {
  router.push(path)
}
</script>

<style scoped>
.main-background {
  background-color: #ffffff !important;
}
</style>
