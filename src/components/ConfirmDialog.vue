<template>
  <v-dialog
    :model-value="modelValue"
    max-width="400"
    :persistent="loading"
    content-class="confirm-dialog-overlay"
    @update:model-value="onToggle"
  >
    <div class="confirm-dialog" :class="`confirm-dialog--${tone}`" :dir="state.dir">
      <div class="confirm-dialog__hero">
        <div class="confirm-dialog__orb">
          <v-icon size="30">{{ icon }}</v-icon>
        </div>
      </div>

      <div class="confirm-dialog__inner">
        <h3 class="confirm-dialog__title">{{ title }}</h3>
        <p class="confirm-dialog__message">{{ message }}</p>
        <div v-if="subject" class="confirm-dialog__subject">{{ subject }}</div>

        <div class="confirm-dialog__actions">
          <button
            type="button"
            class="confirm-dialog__btn confirm-dialog__btn--cancel"
            :disabled="loading"
            @click="onToggle(false)"
          >
            {{ cancelText || $t('cancel') }}
          </button>
          <button
            type="button"
            class="confirm-dialog__btn confirm-dialog__btn--confirm"
            :disabled="loading"
            @click="$emit('confirm')"
          >
            <v-progress-circular v-if="loading" indeterminate size="16" width="2" />
            <span>{{ confirmText }}</span>
          </button>
        </div>
      </div>
    </div>
  </v-dialog>
</template>

<script setup>
import { watch, onBeforeUnmount } from 'vue'
import { useState } from '../store/state'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  subject: { type: String, default: '' },
  icon: { type: String, default: 'mdi-alert-circle-outline' },
  confirmText: { type: String, required: true },
  cancelText: { type: String, default: '' },
  tone: { type: String, default: 'danger', validator: (v) => ['danger', 'primary', 'warning'].includes(v) },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const state = useState()

function onToggle(value) {
  if (props.loading) return
  emit('update:modelValue', value)
}

function onKeydown(e) {
  if (e.key !== 'Enter' || props.loading) return
  if (e.target?.closest?.('.confirm-dialog__btn--cancel')) return
  e.preventDefault()
  emit('confirm')
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  }
)

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.confirm-dialog {
  --tone-a: #dc2626;
  --tone-b: #f87171;
  --tone-text: #b91c1c;
  --tone-wash: #fff5f5;
  --tone-ring: rgba(220, 38, 38, 0.14);
  --tone-shadow: rgba(220, 38, 38, 0.22);

  border-radius: 20px;
  background: #ffffff;
  border: 1px solid #e6eef1;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.14);
  overflow: hidden;
  animation: confirm-rise 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.15);
}

.confirm-dialog--primary {
  --tone-a: #197783;
  --tone-b: #32d8ee;
  --tone-text: #14606a;
  --tone-wash: #f0fbfc;
  --tone-ring: rgba(25, 119, 131, 0.14);
  --tone-shadow: rgba(25, 119, 131, 0.24);
}

.confirm-dialog--warning {
  --tone-a: #e8492a;
  --tone-b: #fb8a5c;
  --tone-text: #c2410c;
  --tone-wash: #fff4ef;
  --tone-ring: rgba(232, 73, 42, 0.14);
  --tone-shadow: rgba(232, 73, 42, 0.24);
}

.confirm-dialog__hero {
  display: flex;
  justify-content: center;
  padding: 1.75rem 0 0;
  background: linear-gradient(180deg, var(--tone-wash), #ffffff);
}

.confirm-dialog__orb {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  background: linear-gradient(135deg, var(--tone-a), var(--tone-b));
  box-shadow: 0 0 0 10px var(--tone-ring), 0 10px 24px var(--tone-shadow);
  animation: confirm-pop 0.4s 0.05s cubic-bezier(0.2, 0.9, 0.3, 1.35) both;
}

.confirm-dialog__inner {
  padding: 1.3rem 1.6rem 1.5rem;
  text-align: center;
}

.confirm-dialog__title {
  margin: 0 0 0.4rem;
  font-size: 1.15rem;
  font-weight: 800;
  color: #1a1a1a;
}

.confirm-dialog__message {
  margin: 0 auto;
  max-width: 300px;
  font-size: 0.9rem;
  line-height: 1.6;
  color: #64748b;
}

.confirm-dialog__subject {
  margin-top: 0.95rem;
  padding: 0.6rem 0.9rem;
  border-radius: 12px;
  background: var(--tone-wash);
  border: 1px solid var(--tone-ring);
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.45;
  color: var(--tone-text);
  overflow-wrap: anywhere;
}

.confirm-dialog__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  margin-top: 1.5rem;
}

.confirm-dialog__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  height: 44px;
  border-radius: 999px;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.25s ease, transform 0.15s ease;
}

.confirm-dialog__btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.confirm-dialog__btn:not(:disabled):active {
  transform: scale(0.97);
}

.confirm-dialog__btn--cancel {
  border: 1px solid #e6eef1;
  background: #ffffff;
  color: #334155;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.confirm-dialog__btn--cancel:not(:disabled):hover {
  border-color: rgba(25, 119, 131, 0.4);
  background: rgba(25, 119, 131, 0.04);
  color: #197783;
}

.confirm-dialog__btn--confirm {
  border: none;
  color: #ffffff;
  background: linear-gradient(135deg, var(--tone-a), var(--tone-b));
  box-shadow: 0 6px 16px var(--tone-shadow);
}

.confirm-dialog__btn--confirm:not(:disabled):hover {
  box-shadow: 0 10px 22px var(--tone-shadow);
  transform: translateY(-1px);
}

@keyframes confirm-rise {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: none; }
}

@keyframes confirm-pop {
  from { opacity: 0; transform: scale(0.6); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .confirm-dialog,
  .confirm-dialog__orb {
    animation: none;
  }
}
</style>
