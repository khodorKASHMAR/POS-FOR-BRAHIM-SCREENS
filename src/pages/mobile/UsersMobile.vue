<template>
  <div class="m-users m-page" :dir="lang.dir">
    <header class="m-users__header">
      <v-btn
        class="m-users__add"
        color="primary"
        variant="flat"
        size="large"
        :prepend-icon="lang.dir === 'ltr' ? 'mdi-account-plus' : undefined"
        :append-icon="lang.dir === 'rtl' ? 'mdi-account-plus' : undefined"
        @click="openAddUser"
      >
        {{ $t('add') }}
      </v-btn>
    </header>

    <div class="m-users__search">
      <v-text-field
        v-model="search"
        :placeholder="$t('search')"
        variant="outlined"
        density="comfortable"
        hide-details
        clearable
        :prepend-inner-icon="lang.dir === 'ltr' ? 'mdi-magnify' : undefined"
        :append-inner-icon="lang.dir === 'rtl' ? 'mdi-magnify' : undefined"
        class="m-users__search-field"
      />
    </div>

    <div class="m-users__list" :class="{ 'is-loading': loading }">
      <article
        v-for="item in filteredUsers"
        :key="item.id"
        class="m-users__card"
      >
        <div class="m-users__card-body">
          <span class="m-users__avatar">{{ userInitials(item) }}</span>
          <div class="m-users__copy">
            <h2 class="m-users__name">
            {{ item.firstNameEN }} {{ item.lastNameEN }}
          </h2>
          <p class="m-users__meta">
            <v-icon size="16">mdi-account</v-icon>
            <span>{{ item.userName }}</span>
          </p>
          <p v-if="item.email" class="m-users__meta">
            <v-icon size="16">mdi-email-outline</v-icon>
            <span>{{ item.email }}</span>
          </p>
          <p v-if="item.phoneNumber" class="m-users__meta">
            <v-icon size="16">mdi-phone-outline</v-icon>
            <span>{{ item.phoneNumber }}</span>
          </p>
          </div>
        </div>
        <div class="m-users__actions">
          <button
            type="button"
            class="m-users__action m-users__action--edit"
            :aria-label="$t('editUser')"
            @click="editUser(item)"
          >
            <v-icon size="22">mdi-pencil</v-icon>
          </button>
          <button
            type="button"
            class="m-users__action m-users__action--menus"
            :aria-label="$t('editUserMenus')"
            @click="openUserMenus(item)"
          >
            <v-icon size="22">mdi-shield-key-outline</v-icon>
          </button>
          <button
            type="button"
            class="m-users__action m-users__action--delete"
            :aria-label="$t('delete')"
            @click="openDeleteDialog(item)"
          >
            <v-icon size="22">mdi-delete-outline</v-icon>
          </button>
        </div>
      </article>

      <div v-if="!loading && filteredUsers.length === 0" class="m-users__empty">
        {{ $t('NoItemsToShow') }}
      </div>
    </div>

    <div v-if="totalPages > 1" class="m-users__pager">
      <button
        type="button"
        class="m-users__pager-btn"
        :disabled="pagination.page <= 1"
        @click="goPage(pagination.page - 1)"
      >
        <v-icon size="20">mdi-chevron-left</v-icon>
      </button>
      <span class="m-users__pager-label">{{ pagination.page }} / {{ totalPages }}</span>
      <button
        type="button"
        class="m-users__pager-btn"
        :disabled="pagination.page >= totalPages"
        @click="goPage(pagination.page + 1)"
      >
        <v-icon size="20">mdi-chevron-right</v-icon>
      </button>
    </div>

    <!-- Add / Edit user — fullscreen on mobile -->
    <v-dialog
      v-model="userDialog"
      fullscreen
      transition="dialog-bottom-transition"
      :dir="lang.dir"
      persistent
      @update:model-value="(v) => { if (v === false) closeUserDialog() }"
    >
      <v-form
        ref="formRef"
        class="m-users-dialog"
        :dir="lang.dir"
        autocomplete="off"
        @submit.prevent="submitForm"
      >
        <MobileSheetHeader
          tone="brand"
          :title="isEditing ? $t('editUser') : $t('addUser')"
          @back="closeUserDialog"
        />

        <div class="m-users-dialog__body">
          <div class="m-users-dialog__field">
            <label class="m-users-dialog__label">
              {{ $t('userName') }} <span class="req">*</span>
            </label>
            <v-text-field
              v-model="user.userName"
              persistent-placeholder
              :placeholder="$t('userName')"
              variant="outlined"
              density="comfortable"
              :rules="userNameRules"
              :disabled="!!isEditing"
              autocomplete="off"
              class="m-users-dialog__input"
              @keydown.space.prevent
              @update:model-value="onUserNameInput"
            />
          </div>

          <div class="m-users-dialog__field">
            <label class="m-users-dialog__label">
              {{ $t('password') }} <span class="req">*</span>
            </label>
            <v-text-field
              v-model="user.password"
              :type="showPassword ? 'text' : 'password'"
              persistent-placeholder
              :placeholder="$t('password')"
              variant="outlined"
              density="comfortable"
              :rules="[(v) => !!v || $t('fieldRequired')]"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              autocomplete="off"
              class="m-users-dialog__input"
              @click:append-inner="showPassword = !showPassword"
            />
          </div>

          <div class="m-users-dialog__field">
            <label class="m-users-dialog__label">
              {{ $t('firstName') }} <span class="req">*</span>
            </label>
            <v-text-field
              v-model="user.firstNameEN"
              persistent-placeholder
              :placeholder="$t('firstName')"
              variant="outlined"
              density="comfortable"
              :rules="[(v) => !!v || $t('fieldRequired')]"
              class="m-users-dialog__input"
            />
          </div>

          <div class="m-users-dialog__field">
            <label class="m-users-dialog__label">
              {{ $t('lastName') }} <span class="req">*</span>
            </label>
            <v-text-field
              v-model="user.lastNameEN"
              persistent-placeholder
              :placeholder="$t('lastName')"
              variant="outlined"
              density="comfortable"
              :rules="[(v) => !!v || $t('fieldRequired')]"
              class="m-users-dialog__input"
            />
          </div>

          <div class="m-users-dialog__field">
            <label class="m-users-dialog__label">{{ $t('email') }}</label>
            <v-text-field
              v-model="user.email"
              persistent-placeholder
              :placeholder="$t('email')"
              variant="outlined"
              density="comfortable"
              class="m-users-dialog__input"
            />
          </div>

          <div class="m-users-dialog__field">
            <label class="m-users-dialog__label">
              {{ $t('phoneNumber') }} <span class="req">*</span>
            </label>
            <v-text-field
              v-model="user.phoneNumber"
              persistent-placeholder
              :placeholder="$t('phoneNumber')"
              variant="outlined"
              density="comfortable"
              :rules="[(v) => !!v || $t('fieldRequired')]"
              class="m-users-dialog__input"
            />
          </div>
        </div>

        <div class="m-users-dialog__footer">
          <button type="submit" class="m-users-dialog__btn m-users-dialog__btn--save">
            {{ isEditing ? $t('update') : $t('save') }}
          </button>
        </div>
      </v-form>
    </v-dialog>

    <UserMenusDialogMobile
      v-model="menusDialog"
      :user="menusUser"
      :dir="lang.dir"
      @saved="onUserMenusSaved"
    />

    <v-dialog v-model="confirmDialog" max-width="100%" content-class="m-users-confirm" persistent>
      <v-card class="m-users-confirm__card rounded-lg">
        <v-card-title class="m-users-confirm__title">
          <v-icon start>mdi-alert-octagon</v-icon>
          {{ $t('deleteUser') }}
        </v-card-title>
        <v-card-text class="py-5 px-5 text-center">
          <p class="text-body2 mb-2">{{ $t('deleteUserConfirm') }}</p>
          <p class="text-caption text-grey-darken-1">
            <strong>{{ userToDelete?.firstNameEN }} {{ userToDelete?.lastNameEN }}</strong>
            ({{ userToDelete?.userName }})
          </p>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn size="large" variant="text" @click="confirmDialog = false">{{ $t('cancel') }}</v-btn>
          <v-btn size="large" color="error" variant="elevated" @click="confirmDelete">{{ $t('delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, getCurrentInstance } from 'vue'
import { useState } from '../../store/state'
import UserMenusDialogMobile from '../../components/mobile/UserMenusDialogMobile.vue'
import MobileSheetHeader from '../../components/mobile/MobileSheetHeader.vue'
import UserService from '../../services/UserService.js'
import { useUserStore } from '../../store/user'
import { useMobileOverlayBack } from '../../composables/useMobileBackStack'

const instance = getCurrentInstance()
const $t = instance?.appContext?.config?.globalProperties?.$t || ((k) => k)
const $notification = (msg, status, delay) =>
  instance?.appContext?.config?.globalProperties?.$notification?.(msg, status, delay)

const state = useState()
const userStore = useUserStore()
const lang = computed(() => ({ lang: state.lang, dir: state.dir }))

const userDialog = ref(false)
const menusDialog = ref(false)
const menusUser = ref(null)
const loading = ref(false)
const search = ref('')
const showPassword = ref(false)
const isEditing = ref(false)
const editedUserId = ref(null)
const confirmDialog = ref(false)
const userToDelete = ref(null)
const formRef = ref(null)

useMobileOverlayBack(userDialog, () => closeUserDialog())
useMobileOverlayBack(confirmDialog, () => {
  confirmDialog.value = false
})

const user = reactive({
  userName: '',
  password: '',
  firstNameEN: '',
  lastNameEN: '',
  email: '',
  phoneNumber: ''
})

const userNameRules = [
  (v) => !!String(v || '').trim() || $t('fieldRequired'),
  (v) => !/\s/.test(String(v || '')) || $t('userNameNoSpaces')
]

function userInitials(item) {
  const first = String(item?.firstNameEN || '').trim().charAt(0)
  const last = String(item?.lastNameEN || '').trim().charAt(0)
  const fallback = String(item?.userName || '?').slice(0, 2)
  return (first + last || fallback).toUpperCase()
}

function onUserNameInput(value) {
  user.userName = String(value || '').replace(/\s/g, '')
}

const users = ref([])
const pagination = reactive({
  page: 1,
  itemsPerPage: 10,
  pageCount: 1,
  totalItems: 0
})

const filteredUsers = computed(() => {
  if (!search.value) return users.value
  const s = search.value.toLowerCase()
  return users.value.filter((u) =>
    [u.userName, u.firstNameEN, u.lastNameEN, u.email, u.phoneNumber].some((v) =>
      String(v || '').toLowerCase().includes(s)
    )
  )
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(pagination.totalItems / pagination.itemsPerPage))
)

function goPage(page) {
  if (page < 1 || page > totalPages.value) return
  pagination.page = page
  fetchUsers()
}

async function fetchUsers() {
  loading.value = true
  try {
    const page = (pagination.page || 1) - 1
    const size = pagination.itemsPerPage || 10
    const res = await UserService.searchUsers(
      { page, size, sort: 'id,asc' },
      { criteriaList: [], operator: 'AND' }
    )
    const data = res?.data
    users.value = data?.data ?? []
    const pag = data?.pagination
    if (pag) {
      pagination.pageCount = pag.totalPages ?? 1
      pagination.totalItems = pag.totalItems ?? 0
    }
  } catch (err) {
    $notification?.(err?.response?.data?.message || $t('errorLoadingUsers'), 'error')
  } finally {
    loading.value = false
  }
}

function openAddUser() {
  isEditing.value = false
  resetForm()
  userDialog.value = true
}

function closeUserDialog() {
  userDialog.value = false
  resetForm()
}

function resetForm() {
  user.userName = ''
  user.password = ''
  user.firstNameEN = ''
  user.lastNameEN = ''
  user.email = ''
  user.phoneNumber = ''
  editedUserId.value = null
  isEditing.value = false
  showPassword.value = false
}

async function submitForm() {
  const { valid } = (await formRef.value?.validate()) ?? { valid: false }
  if (!valid) {
    $notification?.($t('pleaseFillRequired'), 'error')
    return
  }
  try {
    const payload = {
      userName: String(user.userName || '').trim(),
      password: user.password,
      firstNameEN: user.firstNameEN,
      lastNameEN: user.lastNameEN,
      email: user.email || null,
      phoneNumber: user.phoneNumber || null
    }

    if (isEditing.value) {
      await UserService.updateUser(editedUserId.value, payload)
      $notification?.($t('userUpdated'), 'success')
    } else {
      await UserService.createUser(payload)
      $notification?.($t('userCreated'), 'success')
    }
    resetForm()
    userDialog.value = false
    fetchUsers()
  } catch (err) {
    $notification?.(err?.response?.data?.message || $t('errorSavingUser'), 'error')
  }
}

function editUser(row) {
  Object.assign(user, {
    userName: row.userName,
    password: row.password ?? '',
    firstNameEN: row.firstNameEN ?? '',
    lastNameEN: row.lastNameEN ?? '',
    email: row.email ?? '',
    phoneNumber: row.phoneNumber ?? ''
  })
  editedUserId.value = row.id
  isEditing.value = true
  showPassword.value = false
  userDialog.value = true
}

function openUserMenus(row) {
  menusUser.value = row
  menusDialog.value = true
}

function onUserMenusSaved({ userId, menuCodes }) {
  if (String(userStore.user?.id || '') === String(userId || '')) {
    userStore.setUser({ ...userStore.user, menus: menuCodes })
  }
}

function openDeleteDialog(row) {
  userToDelete.value = row
  confirmDialog.value = true
}

async function confirmDelete() {
  if (!userToDelete.value) return
  try {
    await UserService.deleteUser(userToDelete.value.id)
    $notification?.($t('userDeleted'), 'success')
    confirmDialog.value = false
    userToDelete.value = null
    fetchUsers()
  } catch (err) {
    $notification?.(err?.response?.data?.message || $t('errorDeletingUser'), 'error')
  }
}

watch(
  () => [pagination.page, pagination.itemsPerPage],
  () => {
    fetchUsers()
  },
  { immediate: false }
)

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.m-users {
  --oil-ink: #16363a;
  --oil-muted: #5f7a7e;
  --oil-line: rgba(25, 119, 131, 0.16);
  --oil-teal: #197783;
  --oil-teal-bright: #20b4c6;
  background: transparent;
}

.m-users__header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.m-users__add {
  width: 100%;
  border-radius: 14px !important;
  font-weight: 700 !important;
  text-transform: none !important;
  background-image: linear-gradient(135deg, #197783, #20b4c6) !important;
  color: #fff !important;
  box-shadow: 0 6px 14px rgba(25, 119, 131, 0.22);
  min-height: 2.85rem;
}

.m-users__search {
  margin-bottom: 1rem;
}

.m-users__search-field :deep(.v-field) {
  border-radius: 14px;
  background: #fff;
}

.m-users__search-field :deep(.v-field__outline) {
  --v-field-border-opacity: 0.12;
}

.m-users__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.m-users__list.is-loading {
  opacity: 0.6;
  pointer-events: none;
}

.m-users__card {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 16px;
  background: #fff;
  border: 1px solid var(--oil-line);
  box-shadow: 0 8px 20px rgba(22, 54, 58, 0.06);
}

.m-users__card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
}

.m-users__avatar {
  width: 2.65rem;
  height: 2.65rem;
  border-radius: 14px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #0f5a63, #197783 55%, #2ad4e8);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.m-users__copy {
  min-width: 0;
  flex: 1;
}

.m-users__name {
  margin: 0 0 0.45rem;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--oil-ink);
  word-break: break-word;
}

.m-users__meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0.2rem 0;
  font-size: 0.85rem;
  color: var(--oil-muted);
  word-break: break-word;
}

.m-users__meta .v-icon {
  color: var(--oil-teal);
  flex-shrink: 0;
}

.m-users__actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.4rem;
}

.m-users__action {
  width: 2.75rem;
  height: 2.75rem;
  border: 1px solid transparent;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: #f4fafb;
  color: var(--oil-muted);
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.m-users__action--edit:active,
.m-users__action--menus:active {
  background: rgba(25, 119, 131, 0.14);
  border-color: rgba(25, 119, 131, 0.3);
  color: var(--oil-teal);
}

.m-users__action--delete:active {
  background: rgba(211, 47, 47, 0.12);
  border-color: rgba(211, 47, 47, 0.35);
  color: #d32f2f;
}

.m-users__empty {
  text-align: center;
  padding: 2.5rem 1rem;
  color: var(--oil-muted);
  font-style: italic;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 16px;
  border: 1px dashed var(--oil-line);
}

.m-users__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.25rem;
}

.m-users__pager-btn {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 12px;
  border: 1px solid var(--oil-line);
  background: #fff;
  color: var(--oil-ink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.m-users__pager-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.m-users__pager-label {
  font-weight: 700;
  color: var(--oil-ink);
  font-size: 0.9rem;
}

/* Fullscreen form dialog */
.m-users-dialog {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, #eaf5f6 0%, #f5f9fa 55%, #eef4f5 100%);
}

.m-users-dialog__body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1rem 0.5rem;
  -webkit-overflow-scrolling: touch;
}

.m-users-dialog__field {
  margin-bottom: 0.35rem;
}

.m-users-dialog__label {
  display: block;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--oil-muted);
  margin-bottom: 0.25rem;
}

.m-users-dialog__label .req {
  color: #ef4444;
}

.m-users-dialog__input :deep(.v-field) {
  border-radius: 12px;
  background: #fff;
}

.m-users-dialog__input :deep(.v-field__input) {
  min-height: 2.75rem;
  font-size: 1rem;
}

.m-users-dialog__footer {
  display: flex;
  gap: 0.75rem;
  padding: 0.85rem 1rem calc(0.85rem + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid var(--oil-line);
  flex-shrink: 0;
}

.m-users-dialog__btn {
  flex: 1;
  min-height: 3rem;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  color: #fff;
}

.m-users-dialog__btn--save {
  background-image: linear-gradient(135deg, #197783, #20b4c6);
  box-shadow: 0 6px 14px rgba(25, 119, 131, 0.22);
}

.m-users-confirm__title {
  background: #c62828;
  color: #fff;
}
</style>
