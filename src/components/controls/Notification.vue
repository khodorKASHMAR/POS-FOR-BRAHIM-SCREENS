<template>
  <teleport :to="teleportTo" :disabled="disableTeleport">
    <div :style="{ zIndex }" class="notification-root">
      <div
        v-if="snackbar"
        :class="['notification-toast', 'notification-' + status]"
        class="notification-toast-inner"
      >
        <div v-html="sanitizedText" class="notification-text"></div>
        <button type="button" @click="closeNotification" class="notification-close" :aria-label="$t('Close') || 'Close'">
          <v-icon size="small">mdi-close</v-icon>
        </button>
      </div>
    </div>
  </teleport>
</template>

<script>
export default {
  name: 'Notification',
  props: {
    disableTeleport: {
      type: Boolean,
      default: false
    },
    zIndex: {
      type: Number,
      default: 9999
    }
  },
  data() {
    return {
      snackbar: false,
      status: 'success',
      text: '',
      timeoutId: null,
      autoCloseDelay: 5000
    }
  },
  computed: {
    teleportTo() {
      return this.disableTeleport ? null : 'body'
    },
    sanitizedText() {
      if (!this.text || this.text == null) return ''
      return this.text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/on\w+='[^']*'/gi, '')
        .replace(/<(?!\/?(?:ul|li|strong|b|br|p)\b)[^>]*>/gi, '')
    }
  },
  methods: {
    open(message, status, autoCloseDelay = null) {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId)
        this.timeoutId = null
      }
      this.text = message
      this.status = status || 'success'
      this.snackbar = true
      const delay = autoCloseDelay !== null ? autoCloseDelay : this.autoCloseDelay
      if (delay > 0) {
        this.timeoutId = setTimeout(() => {
          this.closeNotification()
        }, delay)
      }
    },
    closeNotification() {
      this.snackbar = false
      if (this.timeoutId) {
        clearTimeout(this.timeoutId)
        this.timeoutId = null
      }
    }
  },
  beforeUnmount() {
    if (this.timeoutId) clearTimeout(this.timeoutId)
  }
}
</script>

<style scoped>
.notification-root {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
}

.notification-toast-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 24rem;
  padding: 0.4rem 0.6rem;
  border-radius: 0.375rem;
  box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.25);
  transition: transform 0.3s ease;
}

.notification-text {
  flex: 1;
  margin-right: 0.4rem;
  font-weight: 500;
  font-size: 0.8125rem;
}

.notification-close {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.15rem;
  margin: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 2px;
  transition: opacity 0.2s;
}

.notification-close :deep(.v-icon) {
  font-size: 1rem;
}

.notification-close:hover {
  opacity: 0.85;
}

.notification-success {
  background-image: linear-gradient(135deg, #08bad1, #26c6da);
  color: #fff;
}

.notification-error {
  background-image: linear-gradient(135deg, #dc2626, #f87171);
  color: #fff;
}

.notification-info {
  background: #3b82f6;
  color: #fff;
}

.notification-warning {
  background: #eab308;
  color: #000;
}

.notification-toast:not(.notification-success):not(.notification-error):not(.notification-info):not(.notification-warning) {
  background: #4b5563;
  color: #fff;
}
</style>
