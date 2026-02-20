<template>
  <div class="page-background">
    <TopBar />


    <div class="pt-4">
      <div class="users-actions" :class="lang.dir === 'rtl' ? 'users-actions-rtl' : ''">
        <v-btn
          class="add-items-action-btn"
          color="primary"
          variant="flat"
          :prepend-icon="lang.dir === 'ltr' ? 'mdi-account-plus' : null"
          :append-icon="lang.dir === 'rtl' ? 'mdi-account-plus' : null"
          @click="openAddUser"
        >
          {{ $t('addUser') }}
        </v-btn>
      </div>

      <div class="users-panel">
        <v-card class="users-card rounded-lg elevation-3">
          <v-card-title class="users-card-title">
            <v-row class="w-100" align="center">
              <v-col cols="12" md="4">
                <span class="font-weight-bold">{{ $t('users') }}</span>
              </v-col>
              <v-col cols="12" md="8">
                <v-text-field
                  v-model="search"
                  :label="$t('search')"
                  density="compact"
                  hide-details
                  variant="outlined"
                  :prepend-inner-icon="lang.dir === 'ltr' ? 'mdi-magnify' : null"
                  :append-inner-icon="lang.dir === 'rtl' ? 'mdi-magnify' : null"
                  class="users-search"
                />
              </v-col>
            </v-row>
          </v-card-title>
          <v-divider />
          <v-data-table
            :headers="headers"
            :items="users"
            item-value="id"
            v-model:page="pagination.page"
            v-model:items-per-page="pagination.itemsPerPage"
            :loading="loading"
            :search="search"
            :items-length="pagination.totalItems"
            :items-per-page-options="[5, 10, 25, 50]"
            density="compact"
            class="users-table"
          >
            <template #item.actions="{ item }">
              <v-icon size="small" class="mr-2 action-icon edit-icon" @click="editUser(item)">mdi-pencil</v-icon>
              <v-icon size="small" class="action-icon delete-icon" @click="openDeleteDialog(item)">mdi-delete</v-icon>
            </template>
          </v-data-table>
        </v-card>
      </div>

    </div>

    <!-- User Add/Edit Dialog (same style as AddItems item dialog) -->
    <v-dialog
      v-model="userDialog"
      content-class="add-items-dialog-responsive add-items-dialog-user"
      :dir="lang.dir"
      persistent
      @update:model-value="(v) => { if (v === false) closeUserDialog() }"
    >
      <v-form ref="formRef" autocomplete="off" @submit.prevent="submitForm">
        <div class="add-items-dialog item-dialog-card">
          <div class="item-dialog-title" :class="{ 'text-right': lang.dir === 'rtl' }">
            {{ isEditing ? $t('editUser') : $t('addUser') }}
          </div>
          <div class="item-dialog-body">
            <v-row class="item-dialog-row" :class="lang.dir === 'rtl' ? 'flex-row-reverse' : ''">
              <v-col cols="12" sm="6">
                <div class="dialog-field-group">
                  <div class="dialog-label" :class="{ 'dialog-label-rtl': lang.dir === 'rtl' }">
                    <span>{{ $t('userName') }}</span>
                    <span class="dialog-label-required">*</span>
                  </div>
                  <v-text-field
                    v-model="user.userName"
                    persistent-placeholder
                    :placeholder="$t('userName')"
                    variant="outlined"
                    density="compact"
                    :rules="[v => !!v || $t('fieldRequired')]"
                    :disabled="!!isEditing"
                    autocomplete="off"
                    class="dialog-field"
                  />
                </div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="dialog-field-group">
                  <div class="dialog-label" :class="{ 'dialog-label-rtl': lang.dir === 'rtl' }">
                    <span>{{ $t('password') }}</span>
                    <span v-if="!isEditing" class="dialog-label-required">*</span>
                  </div>
                  <v-text-field
                    v-model="user.password"
                    :type="showPassword ? 'text' : 'password'"
                    persistent-placeholder
                    :placeholder="isEditing ? $t('leaveBlankToKeep') : $t('password')"
                    variant="outlined"
                    density="compact"
                    :rules="isEditing ? [] : [v => !!v || $t('fieldRequired')]"
                    :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    @click:append-inner="showPassword = !showPassword"
                    :autocomplete="isEditing ? 'off' : 'new-password'"
                    class="dialog-field"
                  />
                </div>
              </v-col>
            </v-row>
            <v-row class="item-dialog-row" :class="lang.dir === 'rtl' ? 'flex-row-reverse' : ''">
              <v-col cols="12" sm="6">
                <div class="dialog-field-group">
                  <div class="dialog-label" :class="{ 'dialog-label-rtl': lang.dir === 'rtl' }">
                    <span>{{ $t('firstName') }}</span>
                    <span class="dialog-label-required">*</span>
                  </div>
                  <v-text-field
                    v-model="user.firstNameEN"
                    persistent-placeholder
                    :placeholder="$t('firstName')"
                    variant="outlined"
                    density="compact"
                    :rules="[v => !!v || $t('fieldRequired')]"
                    class="dialog-field"
                  />
                </div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="dialog-field-group">
                  <div class="dialog-label" :class="{ 'dialog-label-rtl': lang.dir === 'rtl' }">
                    <span>{{ $t('lastName') }}</span>
                    <span class="dialog-label-required">*</span>
                  </div>
                  <v-text-field
                    v-model="user.lastNameEN"
                    persistent-placeholder
                    :placeholder="$t('lastName')"
                    variant="outlined"
                    density="compact"
                    :rules="[v => !!v || $t('fieldRequired')]"
                    class="dialog-field"
                  />
                </div>
              </v-col>
            </v-row>
            <v-row class="item-dialog-row" :class="lang.dir === 'rtl' ? 'flex-row-reverse' : ''">
              <v-col cols="12" sm="6">
                <div class="dialog-field-group">
                  <div class="dialog-label" :class="{ 'dialog-label-rtl': lang.dir === 'rtl' }">
                    <span>{{ $t('email') }}</span>
                  </div>
                  <v-text-field
                    v-model="user.email"
                    persistent-placeholder
                    :placeholder="$t('email')"
                    variant="outlined"
                    density="compact"
                    class="dialog-field"
                  />
                </div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="dialog-field-group">
                  <div class="dialog-label" :class="{ 'dialog-label-rtl': lang.dir === 'rtl' }">
                    <span>{{ $t('phoneNumber') }}</span>
                    <span class="dialog-label-required">*</span>
                  </div>
                  <v-text-field
                    v-model="user.phoneNumber"
                    persistent-placeholder
                    :placeholder="$t('phoneNumber')"
                    variant="outlined"
                    density="compact"
                    :rules="[v => !!v || $t('fieldRequired')]"
                    class="dialog-field"
                  />
                </div>
              </v-col>
            </v-row>
            <div class="dialog-actions" :class="lang.dir === 'rtl' ? 'dialog-actions-rtl' : ''">
              <button type="button" class="dialog-action-btn dialog-cancel-btn" @click="closeUserDialog">
                {{ $t('cancel') }}
              </button>
              <button type="submit" class="dialog-action-btn dialog-save-btn">
                {{ isEditing ? $t('update') : $t('save') }}
              </button>
            </div>
          </div>
        </div>
      </v-form>
    </v-dialog>

    <v-dialog v-model="confirmDialog" max-width="420" persistent>
      <v-card class="rounded-lg elevation-4">
        <v-card-title class="delete-dialog-title">
          <v-icon start>mdi-alert-octagon</v-icon>
          {{ $t('deleteUser') }}
        </v-card-title>
        <v-card-text class="py-5 px-6 text-center">
          <p class="text-body2 mb-2">{{ $t('deleteUserConfirm') }}</p>
          <p class="text-caption text-grey-darken-1">
            <strong>{{ userToDelete?.firstNameEN }} {{ userToDelete?.lastNameEN }}</strong> ({{ userToDelete?.userName }})
          </p>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="confirmDialog = false">{{ $t('cancel') }}</v-btn>
          <v-btn color="error" variant="elevated" @click="confirmDelete">{{ $t('delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, getCurrentInstance } from 'vue'
import { useState } from '../store/state'
import TopBar from '../components/TopBar.vue'
import UserService from '../services/UserService.js'

const instance = getCurrentInstance()
const $t = instance?.appContext?.config?.globalProperties?.$t || (k => k)
const $notification = (msg, status, delay) => instance?.appContext?.config?.globalProperties?.$notification?.(msg, status, delay)

const state = useState()
const lang = computed(() => ({ lang: state.lang, dir: state.dir }))

const userDialog = ref(false)
const loading = ref(false)
const search = ref('')
const showPassword = ref(false)
const isEditing = ref(false)
const editedUserId = ref(null)
const confirmDialog = ref(false)
const userToDelete = ref(null)
const formRef = ref(null)

const user = reactive({
  userName: '',
  password: '',
  firstNameEN: '',
  lastNameEN: '',
  email: '',
  phoneNumber: ''
})

const users = ref([])
const pagination = reactive({
  page: 1,
  itemsPerPage: 10,
  pageCount: 1,
  totalItems: 0
})

const headers = computed(() => [
  { title: $t('userName'), key: 'userName', sortable: true },
  { title: $t('firstName'), key: 'firstNameEN', sortable: true },
  { title: $t('lastName'), key: 'lastNameEN', sortable: true },
  { title: $t('email'), key: 'email', sortable: false },
  { title: $t('phoneNumber'), key: 'phoneNumber', sortable: false },
  { title: $t('actions'), key: 'actions', sortable: false }
])

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
  const { valid } = await formRef.value?.validate() ?? { valid: false }
  if (!valid) {
    $notification?.($t('pleaseFillRequired'), 'error')
    return
  }
  try {
    const payload = {
      userName: user.userName,
      firstNameEN: user.firstNameEN,
      lastNameEN: user.lastNameEN,
      email: user.email || null,
      phoneNumber: user.phoneNumber || null
    }
    if (user.password?.trim()) payload.password = user.password

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
    password: '',
    firstNameEN: row.firstNameEN ?? '',
    lastNameEN: row.lastNameEN ?? '',
    email: row.email ?? '',
    phoneNumber: row.phoneNumber ?? ''
  })
  editedUserId.value = row.id
  isEditing.value = true
  userDialog.value = true
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
  () => { fetchUsers() },
  { immediate: false }
)

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.page-background {
  background: #fafafa;
  min-height: 100vh;
}

.users-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.users-actions-rtl {
  flex-direction: row-reverse;
}

.add-items-action-btn {
  border-radius: 12px;
  font-weight: 700;
  background-image: linear-gradient(135deg, #197783, #32d8ee);
  color: #ffffff;
}

.add-items-action-btn:hover {
  background-image: linear-gradient(135deg, #08bad1, #26c6da);
}

.add-items-action-btn :deep(.v-btn__content) {
  font-weight: 700;
}

.users-card,
.users-form-card {
  background: #fff;
}

.users-card-title,
.users-form-title {
  background: linear-gradient(135deg, #197783, #32d8ee);
  color: #fff;
}

.users-search :deep(.v-field) {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
}

.users-table :deep(thead) {
  background-color: rgba(0, 188, 212, 0.12);
}

.users-table :deep(tbody tr:nth-child(odd)) {
  background-color: #fafafa;
}

.action-icon {
  cursor: pointer;
}

.edit-icon:hover {
  color: #197783;
}

.delete-icon:hover {
  color: #d32f2f;
}

.delete-dialog-title {
  background: #c62828;
  color: #fff;
}

/* User dialog – same style as AddItems item dialog */
:deep(.add-items-dialog-responsive.add-items-dialog-user) {
  width: 50vw !important;
  max-width: 50vw !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  margin: 0 !important;
}

@media (min-width: 1700px) {
  :deep(.add-items-dialog-responsive.add-items-dialog-user) {
    width: 60vw !important;
    max-width: 60vw !important;
  }
}

.add-items-dialog {
  border-radius: 15px !important;
  overflow: hidden;
}

.item-dialog-card {
  background: #ffffff;
  min-height: 65vh;
  max-height: 94vh;
  display: flex;
  flex-direction: column;
}

.item-dialog-title {
  padding: 8px 20px;
  font-size: 1.1rem;
  font-weight: 600;
}

.text-right {
  text-align: right;
}

.item-dialog-body {
  padding: 10px 20px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.item-dialog-body::-webkit-scrollbar {
  display: none;
}

.item-dialog-row {
  min-height: 56px;
}

.item-dialog-row .v-col {
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
}

.dialog-actions {
  display: flex;
  justify-content: between !important;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.dialog-actions-rtl {
  flex-direction: row-reverse;
}

.dialog-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 600;
  color: #6b7280;
  font-size: 0.75rem;
  margin-bottom: 0.1rem;
}

.dialog-label-required {
  color: #ef4444;
}

.dialog-label-rtl {
  justify-content: flex-end;
  text-align: right;
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

.dialog-save-btn {
  background-image: linear-gradient(135deg, #2293a1, #32d8ee);
}

.dialog-cancel-btn {
  background-image: linear-gradient(135deg, #dc2626, #f87171);
}

.dialog-field-group {
  margin-bottom: 2px;
}

.dialog-field :deep(.v-field__outline) {
  opacity: 0;
}

.dialog-field {
  margin-bottom: 2px !important;
}

.dialog-field :deep(.v-field__outline__start),
.dialog-field :deep(.v-field__outline__end),
.dialog-field :deep(.v-field__outline__notch) {
  opacity: 0;
}

.dialog-field :deep(.v-field) {
  border: 1px solid transparent;
  border-radius: 10px;
  background:
    linear-gradient(#ffffff, #ffffff) padding-box,
    linear-gradient(135deg, #2293a1, #32d8ee) border-box;
  overflow: hidden;
}

.dialog-field :deep(.v-field__field) {
  border-radius: 10px;
}

.dialog-field :deep(.v-field__overlay) {
  border-radius: 10px;
  overflow: hidden;
}

.dialog-field :deep(.v-field__input) {
  font-size: 0.85rem;
  transition: font-size 0.2s ease;
  min-height: 30px;
  max-height: 30px;
}

.dialog-field :deep(.v-field__input::placeholder) {
  text-align: center !important;
}

.dialog-field :deep(.v-field--empty .v-field__input) {
  text-align: center !important;
}

.dialog-field :deep(.v-field:not(.v-field--empty) .v-field__input) {
  text-align: left;
}

[dir="rtl"] .dialog-field :deep(.v-field:not(.v-field--empty) .v-field__input) {
  text-align: right;
}

.dialog-field :deep(.v-field:hover) {
  box-shadow: 0 0 0 3px rgba(34, 147, 161, 0.25);
}

.dialog-field :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(34, 147, 161, 0.25);
  border-color: #2293a1;
}

.dialog-field :deep(.v-field--error) {
  border-color: #ef4444;
}

.dialog-field :deep(.v-messages__message) {
  color: #ef4444;
}


</style>
