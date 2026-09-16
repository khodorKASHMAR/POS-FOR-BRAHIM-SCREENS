<template>
  <div class="login-app">
    <div class="login-app__bg" aria-hidden="true">
      <span class="blob blob-1" />
      <span class="blob blob-2" />
      <span class="blob blob-3" />
      <span class="grid" />
      <span
        v-for="i in 16"
        :key="i"
        class="spark"
        :style="sparkStyle(i)"
      />
    </div>

    <div class="login-app__stage">
      <div class="login-app__hero">
        <div class="login-app__logo" aria-hidden="true">
          <span class="login-app__logo-ring" />
          <span class="login-app__logo-core">POS</span>
        </div>
        <p class="login-app__kicker">{{ $t('pointOfSale') }}</p>
        <h1>{{ $t('brandName') }}</h1>
        <p class="login-app__lead">Secure. Fast. Built for the counter.</p>
      </div>

      <form class="login-app__form" @submit.prevent="submitLogin">
        <div v-if="errorMessage" class="login-app__error">
          <v-icon size="18">mdi-alert-circle</v-icon>
          <span>{{ errorMessage }}</span>
        </div>

        <label class="login-app__field">
          <span>Username</span>
          <div class="login-app__control" :class="{ on: uFocus, bad: !!errorMessage }">
            <v-icon size="20" class="login-app__field-icon">mdi-account-outline</v-icon>
            <input
              v-model="login.userName"
              type="text"
              autocomplete="username"
              placeholder="Enter your username"
              :disabled="loading"
              @focus="uFocus = true; errorMessage = ''"
              @blur="uFocus = false"
            />
          </div>
        </label>

        <label class="login-app__field">
          <span>Password</span>
          <div class="login-app__control" :class="{ on: pFocus, bad: !!errorMessage }">
            <v-icon size="20" class="login-app__field-icon">mdi-lock-outline</v-icon>
            <input
              v-model="login.password"
              :type="showPass ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="Enter your password"
              :disabled="loading"
              @focus="pFocus = true; errorMessage = ''"
              @blur="pFocus = false"
            />
            <button
              type="button"
              class="login-app__eye"
              tabindex="-1"
              :aria-label="showPass ? 'Hide password' : 'Show password'"
              @click="showPass = !showPass"
            >
              <v-icon size="20">{{ showPass ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>
            </button>
          </div>
        </label>

        <button
          type="submit"
          class="login-app__submit"
          :disabled="!login.userName || !login.password || loading"
        >
          <span v-if="!loading">Sign in</span>
          <span v-else class="login-app__dots"><i /><i /><i /></span>
        </button>
      </form>

      <p class="login-app__foot">&copy; {{ year }} POS</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, inject, computed, getCurrentInstance } from 'vue'
import { useRouter } from 'vue-router'
import LoginService from '../../services/LoginService.js'
import { useUserStore } from '../../store/user'
import { useState } from '../../store/state'

const router = useRouter()
const userStore = useUserStore()
const state = useState()
const notify = inject('$notification')
const instance = getCurrentInstance()
const $t = (key) => instance?.appContext?.config?.globalProperties?.$t?.(key) ?? key

const login = reactive({ userName: '', password: '' })
const showPass = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const uFocus = ref(false)
const pFocus = ref(false)
const year = computed(() => new Date().getFullYear())

function sparkStyle(i) {
  const left = 4 + ((i * 19) % 92)
  const delay = (i * 0.35) % 7
  const duration = 10 + (i % 6)
  const size = 2 + (i % 3)
  return {
    left: `${left}%`,
    '--d': `-${delay}s`,
    '--dur': `${duration}s`,
    width: `${size}px`,
    height: `${size}px`
  }
}

async function submitLogin() {
  if (!login.userName?.trim() || !login.password) {
    errorMessage.value = 'Please enter username and password.'
    return
  }
  errorMessage.value = ''
  loading.value = true
  try {
    await LoginService.login(login.userName, login.password)
    await state.bootstrapItemsCache()
    notify?.('Login successful!', 'success', 1000)
    router.push(userStore.firstAllowedPath || '/')
  } catch (error) {
    const message =
      error.response?.data?.message ||
      'Login failed. Please check your credentials and try again.'
    errorMessage.value = message
    notify?.(message, 'error', 1500)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-app {
  position: relative;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: visible;
  background: #072226;
  color: #e8f4f6;
}

.login-app__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.7;
  animation: drift 16s ease-in-out infinite;
}

.blob-1 {
  width: 70vmax;
  height: 70vmax;
  top: -25vmax;
  left: -20vmax;
  background: radial-gradient(circle, rgba(42, 212, 232, 0.45), transparent 70%);
}

.blob-2 {
  width: 55vmax;
  height: 55vmax;
  bottom: -18vmax;
  right: -15vmax;
  background: radial-gradient(circle, rgba(25, 119, 131, 0.55), transparent 70%);
  animation-delay: -5s;
}

.blob-3 {
  width: 40vmax;
  height: 40vmax;
  top: 40%;
  left: 30%;
  background: radial-gradient(circle, rgba(14, 116, 144, 0.35), transparent 70%);
  animation-delay: -9s;
}

.grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, #000 20%, transparent 75%);
  opacity: 0.5;
}

.spark {
  position: absolute;
  bottom: -4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.65);
  box-shadow: 0 0 8px rgba(42, 212, 232, 0.55);
  animation: rise var(--dur, 12s) linear var(--d, 0s) infinite;
}

@keyframes drift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(4vw, -3vh) scale(1.08); }
}

@keyframes rise {
  0% { transform: translateY(0); opacity: 0; }
  10% { opacity: 0.7; }
  100% { transform: translateY(-110vh); opacity: 0; }
}

.login-app__stage {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: max(1.5rem, env(safe-area-inset-top)) 1.35rem calc(1.5rem + env(safe-area-inset-bottom));
  max-width: var(--m-frame-max, 430px);
  width: 100%;
  margin-inline: auto;
}

.login-app__hero {
  text-align: center;
  margin-bottom: 2rem;
}

.login-app__logo {
  position: relative;
  width: 5.5rem;
  height: 5.5rem;
  margin: 0 auto 1.1rem;
  display: grid;
  place-items: center;
}

.login-app__logo-ring {
  position: absolute;
  inset: 0;
  border-radius: 28%;
  background: linear-gradient(145deg, rgba(42, 212, 232, 0.35), rgba(25, 119, 131, 0.15));
  border: 1px solid rgba(255, 255, 255, 0.18);
  animation: pulse 3.5s ease-in-out infinite;
}

.login-app__logo-core {
  position: relative;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: #fff;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.85; }
}

.login-app__kicker {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(42, 212, 232, 0.9);
}

.login-app__hero h1 {
  margin: 0.45rem 0 0.35rem;
  font-size: 1.7rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #fff;
  line-height: 1.2;
}

.login-app__lead {
  margin: 0;
  font-size: 0.98rem;
  color: rgba(226, 240, 242, 0.72);
}

.login-app__form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.login-app__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.login-app__field > span {
  font-size: 0.92rem;
  font-weight: 650;
  color: rgba(232, 244, 246, 0.88);
}

.login-app__control {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-height: var(--m-touch-lg, 3.75rem);
  padding: 0 0.85rem;
  border-radius: 18px;
  background: #ffffff;
  border: 2px solid transparent;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.login-app__control.on {
  border-color: #2ad4e8;
  box-shadow: 0 0 0 4px rgba(42, 212, 232, 0.22), 0 10px 28px rgba(0, 0, 0, 0.18);
}

.login-app__control.bad {
  border-color: #f87171;
}

.login-app__field-icon {
  color: #64748b;
  flex-shrink: 0;
}

.login-app__control input {
  flex: 1;
  min-width: 0;
  height: 100%;
  min-height: 3.4rem;
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 1.08rem;
  color: #0f172a;
}

.login-app__control input::placeholder {
  color: #94a3b8;
}

.login-app__eye {
  border: none;
  background: transparent;
  color: #64748b;
  padding: 0.45rem;
  display: inline-flex;
  cursor: pointer;
}

.login-app__submit {
  margin-top: 0.35rem;
  min-height: var(--m-touch-lg, 3.75rem);
  border: none;
  border-radius: 18px;
  background: #ffffff;
  color: #0f5a63;
  font-size: 1.12rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.22);
  cursor: pointer;
}

.login-app__submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.login-app__error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 0.95rem;
  border-radius: 14px;
  background: rgba(254, 242, 242, 0.95);
  color: #dc2626;
  font-size: 0.92rem;
  font-weight: 600;
}

.login-app__dots {
  display: inline-flex;
  gap: 6px;
}

.login-app__dots i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #0f5a63;
  animation: bounce 1.2s infinite ease-in-out;
}

.login-app__dots i:nth-child(2) { animation-delay: 0.15s; }
.login-app__dots i:nth-child(3) { animation-delay: 0.3s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.login-app__foot {
  margin-top: 1.75rem;
  text-align: center;
  font-size: 0.85rem;
  color: rgba(226, 240, 242, 0.45);
}
</style>
