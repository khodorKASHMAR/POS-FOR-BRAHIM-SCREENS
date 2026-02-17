<template>
  <v-app-bar
    app
    elevation="4"
    density="comfortable"
    color="cyan-darken-3"
    class="text-white"
  >
    <template v-if="ui.dir === 'ltr'" #prepend>
      <v-app-bar-nav-icon @click="toggleDrawer" class="text-white" />
    </template>
    <template v-if="ui.dir === 'rtl'" #append>
      <v-app-bar-nav-icon @click="toggleDrawer" class="text-white" />
    </template>

    <v-app-bar-title 
      :class="ui.dir === 'rtl' ? 'text-right' : 'text-left'"
      class="font-weight-bold text-white"
    >
      {{ $t('posSystem') }}
    </v-app-bar-title>

    <template v-if="ui.dir === 'ltr'" #append>
      <div class="d-flex align-center">
        <!-- Language -->
        <v-btn
          variant="text"
          color="white"
          @click="ui.toggleLang()"
          :class="ui.dir === 'ltr' ? 'mr-2' : 'ml-2'"
        >
          <v-icon start>mdi-earth</v-icon>
          {{ ui.lang.toUpperCase() }}
        </v-btn>

        <!-- Currency -->
        <v-btn
          variant="text"
          color="white"
          @click="ui.toggleCurrency()"
          :class="ui.dir === 'ltr' ? 'mr-2' : 'ml-2'"
        >
          <v-icon start>
            {{ ui.currency === 'USD' ? 'mdi-currency-usd-circle' : 'mdi-cash-multiple' }}
          </v-icon>
          {{ currencyLabel }}
        </v-btn>

        <!-- User -->
        <v-btn
          variant="text"
          color="white"
          :class="ui.dir === 'ltr' ? 'mr-2' : 'ml-2'"
        >
          <v-icon start>mdi-account-circle</v-icon>
          {{ user.firstName }}
        </v-btn>

        <!-- Logout -->
        <v-tooltip :text="$t('logout')" location="bottom">
          <template #activator="{ props }">
            <v-btn icon class="text-white" @click="logoutDialog = true" v-bind="props">
              <v-icon>mdi-power</v-icon>
            </v-btn>
          </template>
        </v-tooltip>
      </div>
    </template>
    <template v-if="ui.dir === 'rtl'" #prepend>
      <div class="d-flex align-center flex-row-reverse">
        <!-- Language -->
        <v-btn
          variant="text"
          color="white"
          @click="ui.toggleLang()"
          class="ml-2"
        >
          <v-icon start>mdi-earth</v-icon>
          {{ ui.lang.toUpperCase() }}
        </v-btn>

        <!-- Currency -->
        <v-btn
          variant="text"
          color="white"
          @click="ui.toggleCurrency()"
          class="ml-2"
        >
          <v-icon start>
            {{ ui.currency === 'USD' ? 'mdi-currency-usd-circle' : 'mdi-cash-multiple' }}
          </v-icon>
          {{ currencyLabel }}
        </v-btn>

        <!-- User -->
        <v-btn
          variant="text"
          color="white"
          class="ml-2"
        >
          <v-icon start>mdi-account-circle</v-icon>
          {{ user.firstName }}
        </v-btn>

        <!-- Logout -->
        <v-tooltip :text="$t('logout')" location="bottom">
          <template #activator="{ props }">
            <v-btn icon class="text-white" @click="logoutDialog = true" v-bind="props">
              <v-icon>mdi-power</v-icon>
            </v-btn>
          </template>
        </v-tooltip>
      </div>
    </template>
  </v-app-bar>

  <v-dialog v-model="logoutDialog" max-width="400" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-red-darken-1 text-white text-h6">
        <v-icon start>mdi-logout</v-icon> {{ $t('confirmLogout') }}
      </v-card-title>
      <v-card-text class="py-4">
        {{ $t('logoutMessage') }}
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn variant="text" color="grey" @click="logoutDialog = false">{{ $t('cancel') }}</v-btn>
        <v-btn variant="elevated" color="red-darken-1" class="text-white" @click="logoutConfirmed">
          {{ $t('logout') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref, getCurrentInstance } from 'vue'
import { useUserStore } from '../store/user'
import { useState } from '../store/state'

const userStore = useUserStore()
const ui = useState()

const user = userStore.user
const logoutDialog = ref(false)

const emit = defineEmits(['toggle-drawer'])

const toggleDrawer = () => {
  emit('toggle-drawer')
}

const logoutConfirmed = () => {
  logoutDialog.value = false
  userStore.logout()
}

const currencyLabel = computed(() => {
  const instance = getCurrentInstance()
  const $t = instance?.appContext.config.globalProperties.$t
  if (!$t) return ''
  // Access ui.lang to make this reactive to language changes
  ui.lang // track language changes for reactivity
  return ui.currency === 'USD' ? $t('usDollar') : $t('lebanesePound')
})
</script>

