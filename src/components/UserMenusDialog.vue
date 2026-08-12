<template>
  <v-dialog
    :model-value="modelValue"
    content-class="user-menus-dialog-overlay"
    :dir="dir"
    persistent
    @update:model-value="onToggle"
  >
    <div class="add-items-dialog item-dialog-card user-menus-dialog">
      <div class="item-dialog-title" :class="{ 'text-right': dir === 'rtl' }">
        {{ $t('editUserMenus') }}
      </div>
      <div class="item-dialog-body">
        <p v-if="userName" class="user-menus-subtitle" :class="{ 'text-right': dir === 'rtl' }">
          {{ userName }}
        </p>
        <div class="user-menus-toolbar" :class="{ 'user-menus-toolbar-rtl': dir === 'rtl' }">
          <button type="button" class="user-menus-link" @click="selectAll">
            {{ $t('selectAllMenus') }}
          </button>
          <button type="button" class="user-menus-link" @click="clearAll">
            {{ $t('clearAllMenus') }}
          </button>
        </div>
        <div v-if="loading" class="user-menus-status">{{ $t('loading') }}</div>
        <div v-else class="user-menus-list">
          <label
            v-for="menu in catalog"
            :key="menu.code"
            class="user-menu-row"
            :class="{ 'user-menu-row-rtl': dir === 'rtl' }"
          >
            <input
              v-model="selected"
              type="checkbox"
              class="user-menu-check"
              :value="menu.code"
            />
            <i v-if="menu.icon" class="mdi user-menu-icon" :class="menu.icon" aria-hidden="true"></i>
            <span>{{ menuLabel(menu) }}</span>
          </label>
        </div>
        <div class="dialog-actions" :class="dir === 'rtl' ? 'dialog-actions-rtl' : ''">
          <button type="button" class="dialog-action-btn dialog-cancel-btn" @click="close">
            {{ $t('cancel') }}
          </button>
          <button
            type="button"
            class="dialog-action-btn dialog-save-btn"
            :disabled="loading || saving"
            @click="save"
          >
            {{ $t('save') }}
          </button>
        </div>
      </div>
    </div>
  </v-dialog>
</template>

<script setup>
import { computed, getCurrentInstance, ref, watch } from 'vue'
import UserService from '../services/UserService.js'
import { MENUS } from '../constants/menus'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  user: { type: Object, default: null },
  dir: { type: String, default: 'ltr' }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const instance = getCurrentInstance()
const $t = instance?.appContext?.config?.globalProperties?.$t || ((k) => k)
const $notification = (msg, status, delay) =>
  instance?.appContext?.config?.globalProperties?.$notification?.(msg, status, delay)

const loading = ref(false)
const saving = ref(false)
const catalog = ref([])
const selected = ref([])

const userName = computed(() => {
  const u = props.user
  if (!u) return ''
  const name = [u.firstNameEN, u.lastNameEN].filter(Boolean).join(' ')
  return name ? `${name} (${u.userName})` : u.userName || ''
})

function menuLabel(menu) {
  const meta = MENUS[menu.code]
  if (meta?.labelKey) return $t(meta.labelKey)
  return props.dir === 'rtl' ? (menu.nameAr || menu.nameEn || menu.code) : (menu.nameEn || menu.nameAr || menu.code)
}

function onToggle(open) {
  if (!open) close()
}

function close() {
  emit('update:modelValue', false)
}

function selectAll() {
  selected.value = catalog.value.map((m) => m.code)
}

function clearAll() {
  selected.value = []
}

async function load() {
  if (!props.user?.id) return
  loading.value = true
  try {
    const [allRes, assignedRes] = await Promise.all([
      UserService.listMenus(),
      UserService.getUserMenus(props.user.id)
    ])
    const rows = allRes?.data?.data ?? []
    catalog.value = rows.map((row) => ({
      ...row,
      icon: MENUS[row.code]?.icon
    }))
    selected.value = [...(assignedRes?.data?.data ?? [])]
  } catch (err) {
    $notification?.(err?.response?.data?.message || $t('errorLoadingMenus'), 'error')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!props.user?.id) return
  saving.value = true
  try {
    const res = await UserService.updateUserMenus(props.user.id, selected.value)
    const codes = res?.data?.data ?? selected.value
    $notification?.($t('userMenusUpdated'), 'success')
    emit('saved', { userId: props.user.id, menuCodes: codes })
    close()
  } catch (err) {
    $notification?.(err?.response?.data?.message || $t('errorSavingMenus'), 'error')
  } finally {
    saving.value = false
  }
}

watch(
  () => [props.modelValue, props.user?.id],
  ([open]) => {
    if (open) load()
  }
)
</script>

<style scoped>
.user-menus-dialog {
  --oil-ink: #16363a;
  --oil-muted: #5f7a7e;
  --oil-line: rgba(25, 119, 131, 0.16);
  --oil-teal: #197783;
  background: #ffffff;
  min-height: 50vh;
  max-height: 94vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 20px;
  overflow: hidden;
  box-shadow:
    0 28px 60px -20px rgba(15, 23, 42, 0.35),
    0 12px 24px -12px rgba(25, 119, 131, 0.2);
}

:deep(.user-menus-dialog-overlay) {
  width: 50vw !important;
  max-width: 50vw !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  margin: 0 !important;
}

@media (min-width: 1700px) {
  :deep(.user-menus-dialog-overlay) {
    width: 60vw !important;
    max-width: 60vw !important;
  }
}

.item-dialog-title {
  font-weight: 800;
  font-size: 1.15rem;
  color: var(--oil-ink);
  padding: 1.1rem 1.25rem 0.25rem;
}

.item-dialog-body {
  padding: 0.5rem 1.25rem 1.25rem;
}

.user-menus-subtitle {
  margin: 0 0 0.75rem;
  color: var(--oil-muted);
  font-size: 0.85rem;
}

.user-menus-toolbar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.user-menus-toolbar-rtl {
  flex-direction: row-reverse;
}

.user-menus-link {
  border: none;
  background: none;
  color: var(--oil-teal);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
}

.user-menus-status {
  color: var(--oil-muted);
  padding: 1rem 0;
}

.user-menus-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-height: 360px;
  overflow-y: auto;
}

.user-menu-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.7rem;
  border-radius: 10px;
  cursor: pointer;
  color: var(--oil-ink);
  font-weight: 600;
  font-size: 0.9rem;
}

.user-menu-row:hover {
  background: rgba(25, 119, 131, 0.08);
}

.user-menu-row-rtl {
  flex-direction: row-reverse;
  text-align: right;
}

.user-menu-check {
  width: 16px;
  height: 16px;
  accent-color: var(--oil-teal);
}

.user-menu-icon {
  color: var(--oil-teal);
  font-size: 1.1rem;
}

.dialog-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.dialog-actions-rtl {
  flex-direction: row-reverse;
}

.dialog-action-btn {
  font-weight: 700;
  border-radius: 12px;
  color: #ffffff;
  margin: 0 0.25rem;
  width: 50%;
  height: clamp(30px, 5vw, 37px);
  font-size: 0.75rem;
  border: none;
  cursor: pointer;
  padding: 0 0.5rem;
}

.dialog-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dialog-save-btn {
  background-image: linear-gradient(135deg, #197783, #20b4c6);
  box-shadow: 0 6px 14px rgba(25, 119, 131, 0.22);
}

.dialog-cancel-btn {
  background-image: linear-gradient(135deg, #dc2626, #f87171);
}
</style>
