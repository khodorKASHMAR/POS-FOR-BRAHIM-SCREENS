<template>
  <v-dialog
    :model-value="modelValue"
    fullscreen
    transition="dialog-bottom-transition"
    :dir="dir"
    content-class="umm-overlay"
    persistent
    @update:model-value="onToggle"
  >
    <div class="umm" :dir="dir">
      <MobileSheetHeader
        tone="brand"
        :title="$t('editUserMenus')"
        :subtitle="userName"
        @back="close"
      />

      <div class="umm__toolbar">
        <span class="umm__count">
          {{ selected.length }} / {{ catalog.length }}
        </span>
        <div class="umm__toolbar-actions">
          <button type="button" class="umm__link" @click="selectAll">
            {{ $t('selectAllMenus') }}
          </button>
          <button type="button" class="umm__link umm__link--muted" @click="clearAll">
            {{ $t('clearAllMenus') }}
          </button>
        </div>
      </div>

      <div class="umm__scroll">
        <div v-if="loading" class="umm__loading">
          <div v-for="n in 6" :key="n" class="umm__skel" />
        </div>

        <div v-else class="umm__list">
          <button
            v-for="menu in catalog"
            :key="menu.code"
            type="button"
            class="umm-row"
            :class="{ 'umm-row--on': isSelected(menu.code) }"
            @click="toggleMenu(menu.code)"
          >
            <span class="umm-row__icon" :class="{ 'umm-row__icon--on': isSelected(menu.code) }">
              <v-icon size="20">{{ menu.icon || 'mdi-menu' }}</v-icon>
            </span>
            <span class="umm-row__label">{{ menuLabel(menu) }}</span>
            <span class="umm-row__check" :class="{ 'umm-row__check--on': isSelected(menu.code) }">
              <v-icon size="18">
                {{ isSelected(menu.code) ? 'mdi-check-circle' : 'mdi-checkbox-blank-circle-outline' }}
              </v-icon>
            </span>
          </button>
        </div>
      </div>

      <footer class="umm__footer">
        <button
          type="button"
          class="umm__btn umm__btn--save"
          :disabled="loading || saving"
          @click="save"
        >
          {{ $t('save') }}
        </button>
      </footer>
    </div>
  </v-dialog>
</template>

<script setup>
import { computed, getCurrentInstance, ref, watch } from 'vue'
import UserService from '../../services/UserService.js'
import { MENUS } from '../../constants/menus'
import MobileSheetHeader from './MobileSheetHeader.vue'
import { useMobileOverlayBack } from '../../composables/useMobileBackStack'

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
  if (props.dir === 'rtl') {
    return menu.nameAr || menu.nameEn || $t(MENUS[menu.code]?.labelKey) || menu.code
  }
  return menu.nameEn || menu.nameAr || $t(MENUS[menu.code]?.labelKey) || menu.code
}

function isSelected(code) {
  return selected.value.includes(code)
}

function toggleMenu(code) {
  if (isSelected(code)) {
    selected.value = selected.value.filter((c) => c !== code)
  } else {
    selected.value = [...selected.value, code]
  }
}

function onToggle(open) {
  if (!open) close()
}

function close() {
  emit('update:modelValue', false)
}

useMobileOverlayBack(() => props.modelValue, close)

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
.umm {
  --ink: #0d2a2e;
  --muted: #5f7a7e;
  --line: rgba(25, 119, 131, 0.14);
  --teal: #197783;
  --cyan: #2ad4e8;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #eef5f6;
  color: var(--ink);
}

.umm__toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  padding: 0.7rem 0.95rem;
  background: #fff;
  border-bottom: 1px solid var(--line);
}

.umm__count {
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--teal);
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  background: rgba(25, 119, 131, 0.1);
  font-variant-numeric: tabular-nums;
}

.umm__toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.umm__link {
  border: none;
  background: none;
  color: var(--teal);
  font-weight: 750;
  font-size: 0.78rem;
  cursor: pointer;
  padding: 0;
}

.umm__link--muted {
  color: var(--muted);
}

.umm__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0.85rem;
}

.umm__loading {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.umm__skel {
  height: 3.4rem;
  border-radius: 14px;
  background: linear-gradient(90deg, #e2eef0, #f5f9fa, #e2eef0);
  background-size: 200% 100%;
  animation: umm-shimmer 1.2s ease-in-out infinite;
}

.umm__list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.umm-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  min-height: 3.4rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
  color: var(--ink);
  cursor: pointer;
  text-align: start;
  box-shadow: 0 3px 10px rgba(13, 42, 46, 0.04);
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}

.umm-row--on {
  border-color: rgba(25, 119, 131, 0.4);
  background: linear-gradient(135deg, rgba(25, 119, 131, 0.08), rgba(42, 212, 232, 0.1));
  box-shadow: 0 6px 14px rgba(25, 119, 131, 0.12);
}

.umm-row__icon {
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  border-radius: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(25, 119, 131, 0.1);
  color: var(--teal);
}

.umm-row__icon--on {
  background: linear-gradient(135deg, #197783, #2ad4e8);
  color: #fff;
}

.umm-row__label {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.95rem;
  font-weight: 750;
  line-height: 1.25;
}

.umm-row__check {
  flex-shrink: 0;
  color: #94a3b8;
  display: inline-flex;
}

.umm-row__check--on {
  color: var(--teal);
}

.umm__footer {
  flex: 0 0 auto;
  display: flex;
  gap: 0.7rem;
  padding: 0.85rem 1rem calc(0.85rem + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid var(--line);
}

.umm__btn {
  flex: 1;
  min-height: 3.1rem;
  border: none;
  border-radius: 14px;
  font-weight: 750;
  font-size: 0.98rem;
  cursor: pointer;
  color: #fff;
}

.umm__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.umm__btn--save {
  background-image: linear-gradient(135deg, #0f5a63, #197783 50%, #2ad4e8);
  box-shadow: 0 8px 18px rgba(25, 119, 131, 0.24);
}

@keyframes umm-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>

<style>
.umm-overlay.v-overlay__content,
.v-overlay__content.umm-overlay {
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
}
</style>
