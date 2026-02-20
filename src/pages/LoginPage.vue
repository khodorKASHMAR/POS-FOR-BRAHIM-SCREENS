<template>
  <div class="login-page">
    <!-- Full-page animation layer (no split, no scroll) -->
    <div class="aurora-layer">
      <div class="aurora aurora-1"></div>
      <div class="aurora aurora-2"></div>
      <div class="aurora aurora-3"></div>
      <div class="aurora aurora-4"></div>
      <div class="aurora aurora-5"></div>
    </div>
    <div class="particle-layer">
      <span v-for="i in 24" :key="i" class="particle" :style="particleStyle(i)"></span>
    </div>
    <div class="glow-ring"></div>
    <!-- Full-screen fade to primary light blue at center (transition in background) -->
    <div class="bg-center-fade" aria-hidden="true"></div>

    <!-- Login dialog centered on top -->
    <div class="dialog-wrap">
      <div class="login-dialog">
        <div class="form-header">
          <span class="dialog-brand">POS</span><span class="dialog-dot">.</span>
          <h1>Welcome back</h1>
          <p>Sign in to your account to continue</p>
        </div>

        <form @submit.prevent="submitLogin" class="login-form">
          <div v-if="errorMessage" class="error-alert">
            <i class="mdi mdi-alert-circle error-icon"></i>
            <span>{{ errorMessage }}</span>
          </div>

          <div class="form-field">
            <label for="username">Username</label>
            <div class="input-wrapper" :class="{ focused: uFocus, error: errorMessage }">
              <i class="mdi mdi-account-outline input-icon"></i>
              <input
                id="username"
                v-model="login.userName"
                type="text"
                placeholder="Enter your username"
                :disabled="loading"
                autocomplete="username"
                @focus="uFocus = true; errorMessage = ''"
                @blur="uFocus = false"
              />
            </div>
          </div>

          <div class="form-field">
            <label for="password">Password</label>
            <div class="input-wrapper" :class="{ focused: pFocus, error: errorMessage }">
              <i class="mdi mdi-lock-outline input-icon"></i>
              <input
                id="password"
                v-model="login.password"
                :type="showPass ? 'text' : 'password'"
                placeholder="Enter your password"
                :disabled="loading"
                autocomplete="current-password"
                @focus="pFocus = true; errorMessage = ''"
                @blur="pFocus = false"
              />
              <button
                type="button"
                class="toggle-password"
                :aria-label="showPass ? 'Hide password' : 'Show password'"
                @click="showPass = !showPass"
                tabindex="-1"
              >
                <i class="mdi input-icon" :class="showPass ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"></i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            class="submit-btn"
            :disabled="!login.userName || !login.password || loading"
          >
            <span v-if="!loading">Sign in</span>
            <span v-else class="loading-dots"><i></i><i></i><i></i></span>
          </button>
        </form>

        <p class="form-footer">&copy; {{ new Date().getFullYear() }} POS. All rights reserved.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, inject } from 'vue'
import { useRouter } from 'vue-router'
import LoginService from '../services/LoginService.js'

const router = useRouter()
const notify = inject('$notification')

const login = reactive({
  userName: '',
  password: ''
})
const showPass = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const uFocus = ref(false)
const pFocus = ref(false)

// Stagger particle positions/delays for organic feel (deterministic from index)
function particleStyle(i) {
  const seed = (i * 17) % 100
  const left = 5 + (seed * 0.9)
  const delay = (i * 0.4) % 8
  const duration = 12 + (i % 5)
  const size = 2 + (i % 3)
  return {
    '--p-left': `${left}%`,
    '--p-delay': `-${delay}s`,
    '--p-duration': `${duration}s`,
    '--p-size': `${size}px`
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
    notify('Login successful!', 'success', 1000)
    router.push('/')
  } catch (error) {
    const message = error.response?.data?.message || 'Login failed. Please check your credentials and try again.'
    errorMessage.value = message
    notify(message, 'error', 1500)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.login-page {
  position: relative;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  font-family: 'DM Sans', sans-serif;
  background: #0f172a;
}

/* ========== FULL-PAGE AURORA (mesh gradient style) ========== */
.aurora-layer {
  position: absolute;
  inset: -50%;
  width: 200%;
  height: 200%;
  top: -50%;
  left: -50%;
  pointer-events: none;
}

.aurora {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.55;
  mix-blend-mode: screen;
  animation: auroraDrift 20s ease-in-out infinite;
}

.aurora-1 {
  width: 90vmax;
  height: 90vmax;
  top: -30vmax;
  left: -20vmax;
  background: radial-gradient(
    circle at 30% 30%,
    rgba(44, 140, 242, 0.5) 0%,
    rgba(26, 115, 232, 0.35) 40%,
    transparent 70%
  );
  animation-duration: 22s;
  animation-delay: 0s;
}

.aurora-2 {
  width: 70vmax;
  height: 70vmax;
  top: 10vmax;
  right: -25vmax;
  background: radial-gradient(
    circle at 70% 50%,
    rgba(91, 163, 246, 0.45) 0%,
    rgba(44, 140, 242, 0.25) 50%,
    transparent 75%
  );
  animation-duration: 25s;
  animation-delay: -5s;
}

.aurora-3 {
  width: 60vmax;
  height: 60vmax;
  bottom: -20vmax;
  left: -15vmax;
  background: radial-gradient(
    circle at 40% 60%,
    rgba(26, 115, 232, 0.4) 0%,
    rgba(44, 140, 242, 0.2) 45%,
    transparent 70%
  );
  animation-duration: 18s;
  animation-delay: -10s;
}

.aurora-4 {
  width: 50vmax;
  height: 50vmax;
  top: 30vmax;
  left: 20vmax;
  background: radial-gradient(
    circle at 50% 50%,
    rgba(59, 130, 246, 0.35) 0%,
    rgba(26, 115, 232, 0.2) 50%,
    transparent 70%
  );
  animation-duration: 28s;
  animation-delay: -7s;
}

.aurora-5 {
  width: 55vmax;
  height: 55vmax;
  bottom: 10vmax;
  right: 10vmax;
  background: radial-gradient(
    circle at 60% 40%,
    rgba(96, 165, 250, 0.3) 0%,
    rgba(44, 140, 242, 0.15) 55%,
    transparent 75%
  );
  animation-duration: 24s;
  animation-delay: -14s;
}

@keyframes auroraDrift {
  0%, 100% {
    transform: translate(0, 0) scale(1) rotate(0deg);
    opacity: 0.5;
  }
  25% {
    transform: translate(5vw, -8vh) scale(1.1) rotate(3deg);
    opacity: 0.65;
  }
  50% {
    transform: translate(-6vw, 5vh) scale(0.95) rotate(-2deg);
    opacity: 0.55;
  }
  75% {
    transform: translate(4vw, 6vh) scale(1.05) rotate(4deg);
    opacity: 0.6;
  }
}

/* Floating particles across the whole page */
.particle-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  left: var(--p-left, 10%);
  top: 100%;
  width: var(--p-size, 3px);
  height: var(--p-size, 3px);
  background: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  animation: particleFloat var(--p-duration, 15s) linear var(--p-delay, 0s) infinite;
  box-shadow: 0 0 6px rgba(44, 140, 242, 0.4);
}

@keyframes particleFloat {
  0% {
    transform: translateY(0) translateX(0) scale(1);
    opacity: 0;
  }
  5% {
    opacity: 0.6;
  }
  50% {
    transform: translateY(-50vh) translateX(10px) scale(1.2);
    opacity: 0.8;
  }
  95% {
    opacity: 0.4;
  }
  100% {
    transform: translateY(-100vh) translateX(-5px) scale(0.8);
    opacity: 0;
  }
}

/* Subtle pulsing ring behind dialog */
.glow-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(90vw, 480px);
  height: min(90vw, 480px);
  max-width: 520px;
  max-height: 520px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(44, 140, 242, 0.08) 0%,
    rgba(26, 115, 232, 0.03) 50%,
    transparent 70%
  );
  animation: glowPulse 6s ease-in-out infinite;
  pointer-events: none;
}

@keyframes glowPulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.08);
    opacity: 0.7;
  }
}

/* ========== LOGIN DIALOG (centered, on top) ========== */
.dialog-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  padding: 24px;
}

/* Full-screen background transition: fade to primary light blue at center */
.bg-center-fade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background: radial-gradient(
    circle 42% at 50% 45%,
    rgba(232, 244, 253, 0.5) 0%,
    rgba(240, 247, 255, 0.2) 45%,
    transparent 65%
  );
}

.dialog-wrap {
  z-index: 2;
}

.login-dialog {
  position: relative;
  width: 100%;
  max-width: 400px;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 40px 36px;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.2),
    0 25px 50px -12px rgba(0, 0, 0, 0.2),
    0 0 80px -20px rgba(44, 140, 242, 0.35);
}

.form-header {
  margin-bottom: 28px;
  text-align: center;
}

.dialog-brand {
  font-size: 28px;
  font-weight: 700;
  color: #1a73e8;
  letter-spacing: -0.03em;
}

.dialog-dot {
  font-size: 28px;
  font-weight: 700;
  color: #2c8cf2;
}

.form-header h1 {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a2e;
  margin-top: 16px;
  margin-bottom: 6px;
  letter-spacing: -0.02em;
}

.form-header p {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.error-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  color: #dc2626;
  font-size: 14px;
  font-weight: 500;
}

.error-icon {
  flex-shrink: 0;
  font-size: 20px;
  color: #dc2626;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-field label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 2px solid #e5e7eb;
  border-radius: 14px;
  transition: all 0.2s ease;
}

.input-wrapper:hover {
  border-color: #d1d5db;
}

.input-wrapper.focused {
  background: #fff;
  border-color: #2c8cf2;
  box-shadow: 0 0 0 4px rgba(44, 140, 242, 0.12);
}

.input-wrapper.error {
  border-color: #f87171;
}

.input-wrapper > .input-icon:first-of-type {
  position: absolute;
  left: 16px;
  font-size: 20px;
  color: #9ca3af;
  pointer-events: none;
  transition: color 0.2s;
}

.input-wrapper.focused > .input-icon:first-of-type {
  color: #2c8cf2;
}

.toggle-password .input-icon {
  position: static;
  font-size: 20px;
}

.input-wrapper input {
  width: 100%;
  padding: 14px 16px 14px 48px;
  font-family: inherit;
  font-size: 15px;
  color: #1a1a2e;
  background: transparent;
  border: none;
  outline: none;
}

.input-wrapper:has(.toggle-password) input {
  padding-right: 48px;
}

.input-wrapper input::placeholder {
  color: #9ca3af;
}

.toggle-password {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  color: #9ca3af;
  display: flex;
  transition: color 0.2s;
}

.toggle-password:hover {
  color: #6b7280;
}

.submit-btn {
  width: 100%;
  padding: 16px;
  font-family: inherit;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #1a73e8 0%, #2c8cf2 50%, #1a73e8 100%);
  background-size: 200% 200%;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 14px rgba(44, 140, 242, 0.4);
  margin-top: 4px;
}

.submit-btn:hover:not(:disabled) {
  background-position: 100% 50%;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(44, 140, 242, 0.45);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  background: linear-gradient(135deg, #d1d5db 0%, #e5e7eb 100%);
  background-size: 100% 100%;
  box-shadow: none;
  cursor: not-allowed;
}

.loading-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
}

.loading-dots i {
  width: 8px;
  height: 8px;
  background: #fff;
  border-radius: 50%;
  animation: dot-bounce 1.4s infinite ease-in-out;
}

.loading-dots i:nth-child(1) { animation-delay: 0s; }
.loading-dots i:nth-child(2) { animation-delay: 0.2s; }
.loading-dots i:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.form-footer {
  margin-top: 28px;
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
}

@media (max-width: 480px) {
  .login-dialog {
    padding: 32px 24px;
  }

  .form-header h1 {
    font-size: 20px;
  }
}
</style>
