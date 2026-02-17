<template>
  <v-list nav class="bg-cyan-darken-3 h-100 text-white py-2">
    <v-list-item
      class="sidebar-item"
      :title="$t('home')"
      :prepend-icon="ui.dir === 'ltr' ? 'mdi-home' : undefined"
      :append-icon="ui.dir === 'rtl' ? 'mdi-home' : undefined"
      @click="$emit('navigate', '/')"
    />
    <v-list-item
      v-if="user.role === 'admin'"
      class="sidebar-item"
      :title="$t('addItems')"
      :prepend-icon="ui.dir === 'ltr' ? 'mdi-shield-account' : undefined"
      :append-icon="ui.dir === 'rtl' ? 'mdi-shield-account' : undefined"
      @click="$emit('navigate', '/add-items')"
    />
  </v-list>
</template>

<script setup>
import { useUserStore } from '../store/user'
import { useState } from '../store/state'

const userStore = useUserStore()
const ui = useState()
const user = userStore.user

const emit = defineEmits(['navigate'])
</script>

<style scoped>
.sidebar-item {
  transition: background-color 0.3s, color 0.3s;
  border-radius: 8px;
  margin: 2px 4px;
  padding: 8px;
}

.sidebar-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  margin: 2px 4px;
}

.sidebar-item.v-list-item--active {
  background-color: #00acc1 !important; /* accent cyan */
  color: white;
  font-weight: 600;
}

.sidebar-item.v-list-item--active .v-icon {
  color: white;
}

/* RTL Support */
[dir="rtl"] .sidebar-item {
  text-align: right;
}
</style>

