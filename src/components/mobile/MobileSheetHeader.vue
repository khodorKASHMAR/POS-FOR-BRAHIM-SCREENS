<template>
  <header class="msh" :class="`msh--${tone}`" :dir="state.dir">
    <button type="button" class="msh__back" :aria-label="ariaLabel" @click="$emit('back')">
      <v-icon size="28">{{ arrowIcon }}</v-icon>
    </button>
    <div class="msh__copy">
      <h2>{{ title }}</h2>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>
    <div class="msh__end">
      <slot name="end">
        <span class="msh__spacer" aria-hidden="true" />
      </slot>
    </div>
  </header>
</template>

<script setup>
import { computed, getCurrentInstance } from 'vue'
import { useState } from '../../store/state'
import { useNavArrowIcon } from '../../composables/useMobileBackStack'

defineEmits(['back'])

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  tone: { type: String, default: 'paper' }
})

const instance = getCurrentInstance()
const $t = (key) => instance?.appContext?.config?.globalProperties?.$t?.(key) ?? key
const state = useState()
const arrowIcon = useNavArrowIcon()
const ariaLabel = computed(() => $t('back'))
</script>

<style scoped>
.msh {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-shrink: 0;
  min-height: 3.35rem;
  padding: 0.55rem 0.75rem;
  padding-top: max(0.55rem, env(safe-area-inset-top));
}

.msh--paper {
  background: rgba(255, 255, 255, 0.92);
  border-bottom: 1px solid rgba(25, 119, 131, 0.1);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  color: var(--m-ink, #0d2a2e);
}

.msh--brand {
  background: linear-gradient(120deg, #0f5a63 0%, #197783 48%, #2ad4e8 100%);
  color: #fff;
}

.msh__back {
  width: 2.75rem;
  height: 2.75rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  margin-inline-start: -0.35rem;
}

.msh--paper .msh__back {
  color: var(--m-ink, #0d2a2e);
}

.msh--brand .msh__back {
  color: #fff;
}

.msh__back:active {
  background: rgba(13, 42, 46, 0.08);
}

.msh--brand .msh__back:active {
  background: rgba(255, 255, 255, 0.16);
}

.msh__copy {
  flex: 1;
  min-width: 0;
  text-align: center;
}

.msh__copy h2 {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.msh__copy p {
  margin: 0.12rem 0 0;
  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0.78;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.msh__end {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  flex-shrink: 0;
}

.msh__spacer {
  width: 2.5rem;
  height: 2.5rem;
}
</style>
