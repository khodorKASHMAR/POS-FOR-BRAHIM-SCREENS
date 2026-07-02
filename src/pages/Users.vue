<template>
  <div class="page-background">
    <TopBar />


    <div class="pt-4">
      <div class="users-header" :class="lang.dir === 'rtl' ? 'users-header-rtl' : ''">
        <h1 class="users-title">{{ $t('addUsers') }}</h1>
        <div class="users-actions" :class="lang.dir === 'rtl' ? 'users-actions-rtl' : ''">
          <v-btn
            class="add-items-action-btn"
            color="primary"
            variant="flat"
            :prepend-icon="lang.dir === 'ltr' ? 'mdi-account-plus' : null"
            :append-icon="lang.dir === 'rtl' ? 'mdi-account-plus' : null"
            @click="openAddUser"
          >
            {{ $t('add') }}
          </v-btn>
        </div>
      </div>

      <div class="users-panel">
          <div class="table-responsive-container users-custom-table" :class="{ 'opacity-60': loading }" :dir="lang.dir">
            <!-- Table Controls -->
            <div class="table-controls">
              <div class="rows-per-page-control">
                <span class="control-label">{{ $t('Show') }}</span>
                <div class="dropdown-container">
                  <button
                    class="dropdown-trigger"
                    :class="{ 'dropdown-open': isPageSizeOpen }"
                    @click="isPageSizeOpen = !isPageSizeOpen"
                  >
                    {{ itemsOnCurrentPage }} {{ $t('of') }} {{ pagination.itemsPerPage }}
                    <svg class="dropdown-arrow" :class="{ rotated: isPageSizeOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>
                  <div v-if="isPageSizeOpen" class="dropdown-menu">
                    <div
                      v-for="opt in [5, 10, 25, 50]"
                      :key="opt"
                      class="dropdown-item"
                      :class="{ selected: pagination.itemsPerPage === opt }"
                      @click="selectPageSize(opt)"
                    >
                      {{ opt }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="search-control">
                <div class="search-input-container">
                  <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input
                    v-model="search"
                    type="text"
                    :placeholder="$t('search')"
                    class="search-input"
                  />
                </div>
              </div>
            </div>
            <!-- Table -->
            <div class="table-wrapper">
              <table class="responsive-table">
                <thead>
                  <tr>
                    <th
                      v-for="h in headers"
                      :key="h.key"
                      class="table-header"
                      :style="{ textAlign: lang.dir === 'rtl' ? 'right' : 'left' }"
                    >
                      {{ h.title }}
                    </th>
                  </tr>
                </thead>
                <tbody v-if="filteredUsers.length > 0">
                  <tr v-for="(item, index) in filteredUsers" :key="item.id || index" class="table-row">
                    <td v-for="h in headers" :key="h.key" class="table-cell" :data-label="h.title">
                      <template v-if="h.key === 'actions'">
                        <div class="users-table-actions">
                          <button type="button" class="action-btn edit-btn" :title="$t('editUser')" @click="editUser(item)">
                            <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button type="button" class="action-btn delete-btn" :title="$t('delete')" @click="openDeleteDialog(item)">
                            <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </template>
                      <template v-else>
                        {{ item[h.key] }}
                      </template>
                    </td>
                  </tr>
                </tbody>
                <tbody v-else>
                  <tr>
                    <td :colspan="headers.length" class="no-data-cell">{{ $t('NoItemsToShow') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- Pagination -->
            <div class="pagination-container pagination-right">
              <button
                type="button"
                class="pagination-btn"
                :class="{ disabled: pagination.page <= 1 }"
                :disabled="pagination.page <= 1"
                @click="goPage(pagination.page - 1)"
              >
                <svg class="pagination-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <div class="pagination-pages">
                <template v-for="p in visiblePages" :key="p.value">
                  <button
                    v-if="!p.isEllipsis"
                    type="button"
                    class="pagination-page"
                    :class="{ active: p.value === pagination.page }"
                    @click="goPage(p.value)"
                  >
                    {{ p.label }}
                  </button>
                  <span v-else class="pagination-ellipsis">...</span>
                </template>
              </div>
              <button
                type="button"
                class="pagination-btn"
                :class="{ disabled: pagination.page >= totalPages }"
                :disabled="pagination.page >= totalPages"
                @click="goPage(pagination.page + 1)"
              >
                <svg class="pagination-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>
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
import { ref, reactive, computed, onMounted, onUnmounted, watch, getCurrentInstance } from 'vue'
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

const isPageSizeOpen = ref(false)

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

const itemsOnCurrentPage = computed(() => filteredUsers.value.length)

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = pagination.page
  const pages = []
  const add = (label, value) => pages.push({ label: String(label), value, isEllipsis: false })
  const ellipsis = (id) => pages.push({ label: '...', value: `e-${id}`, isEllipsis: true })
  if (total <= 5) {
    for (let i = 1; i <= total; i++) add(i, i)
    return pages
  }
  if (current <= 3) {
    add(1, 1); add(2, 2); add(3, 3); ellipsis('r'); add(total, total)
    return pages
  }
  if (current >= total - 2) {
    add(1, 1); ellipsis('l'); add(total - 2, total - 2); add(total - 1, total - 1); add(total, total)
    return pages
  }
  add(1, 1); ellipsis('l'); add(current - 1, current - 1); add(current, current); add(current + 1, current + 1); ellipsis('r'); add(total, total)
  return pages
})

function selectPageSize(size) {
  pagination.itemsPerPage = size
  pagination.page = 1
  isPageSizeOpen.value = false
  fetchUsers()
}

function goPage(page) {
  if (page < 1 || page > totalPages.value) return
  pagination.page = page
  fetchUsers()
}

function closePageSizeDropdown(e) {
  if (!e.target.closest('.dropdown-container')) isPageSizeOpen.value = false
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
  document.addEventListener('click', closePageSizeDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closePageSizeDropdown)
})
</script>

<style scoped>
.page-background {
  background: #fafafa;
  min-height: 100vh;
}

.users-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  margin-left: 1rem;
  margin-right: 1rem;
}

.users-header-rtl {
  flex-direction: row-reverse;
}

.users-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.users-actions {
  display: flex;
  gap: 0.75rem;
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

/* Custom table (SimpleCustomTable-style) */
.users-custom-table {
  --table-primary: #00bcd4;
}

.table-responsive-container.users-custom-table {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin: 0;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  margin-left: 0.75rem;
  margin-right: 0.75rem;
}

.table-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: #f8f9fa;
  border-bottom: 1px solid #e2e8f0;
  flex-wrap: wrap;
  gap: 16px;
}

.rows-per-page-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-weight: 500;
  color: #495057;
  font-size: 14px;
}

.dropdown-container {
  position: relative;
  display: inline-block;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #495057;
  transition: all 0.2s ease;
  min-width: 120px;
  justify-content: space-between;
}

.dropdown-trigger:hover,
.dropdown-trigger.dropdown-open {
  border-color: var(--table-primary);
  box-shadow: 0 0 0 3px rgba(0, 188, 212, 0.1);
}

.dropdown-arrow {
  width: 16px;
  height: 16px;
  transition: transform 0.2s ease;
}

.dropdown-arrow.rotated {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  margin-top: 4px;
  overflow: hidden;
}

.dropdown-item {
  padding: 10px 12px;
  font-size: 14px;
  color: #495057;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #f8f9fa;
}

.dropdown-item:hover {
  background-color: #f8f9fa;
}

.dropdown-item.selected {
  background-color: var(--table-primary);
  color: #fff;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.search-control {
  flex: 1;
  max-width: 300px;
}

.search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  width: 16px;
  height: 16px;
  color: #6c757d;
  z-index: 1;
}

[dir="rtl"] .search-icon {
  left: auto;
  right: 12px;
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #495057;
  background: #fff;
  transition: all 0.2s ease;
}

[dir="rtl"] .search-input {
  padding-left: 12px;
  padding-right: 36px;
}

.search-input:focus {
  outline: none;
  border-color: var(--table-primary);
  box-shadow: 0 0 0 3px rgba(0, 188, 212, 0.1);
}

.table-wrapper {
  overflow-x: auto;
  background: #fff;
}

.responsive-table {
  width: 100%;
  border-collapse: collapse;
  margin: 0;
  font-size: 14px;
  min-width: 600px;
}

.table-header {
  background: #f8f9fa;
  color: #374151;
  font-weight: 600;
  text-align: left;
  padding: 12px;
  border-bottom: 2px solid #e2e8f0;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table-row {
  border-bottom: 1px solid #e2e8f0;
  transition: background-color 0.2s ease;
}

.table-row:hover {
  background-color: #f8f9fa;
}

.table-cell {
  padding: 12px;
  color: #495057;
  vertical-align: middle;
  border: none;
}

.no-data-cell {
  text-align: center;
  padding: 40px 20px;
  color: #6c757d;
  font-style: italic;
  background: #f8f9fa;
}

.users-table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.users-table-actions .action-btn {
  padding: 6px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: transparent;
  transition: background 0.2s, color 0.2s;
}

.users-table-actions .action-btn .action-icon {
  width: 20px;
  height: 20px;
  display: block;
}

.users-table-actions .edit-btn:hover {
  background: rgba(0, 188, 212, 0.15);
  color: #197783;
}

.users-table-actions .delete-btn:hover {
  background: rgba(211, 47, 47, 0.1);
  color: #d32f2f;
}

.pagination-container {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 14px;
  background: #f8f9fa;
  border-top: 1px solid #e2e8f0;
  gap: 0;
}

.pagination-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #495057;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-btn:hover:not(.disabled) {
  background: var(--table-primary);
  color: #fff;
  border-color: var(--table-primary);
}

.pagination-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f8f9fa;
  color: #6c757d;
}

.pagination-icon {
  width: 16px;
  height: 16px;
}

.pagination-pages {
  display: flex;
  gap: 4px;
  margin: 0 8px;
}

.pagination-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 30px;
  padding: 0 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #495057;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.pagination-page:hover {
  background: var(--table-primary);
  color: #fff;
  border-color: var(--table-primary);
}

.pagination-page.active {
  background: var(--table-primary);
  color: #fff;
  border-color: var(--table-primary);
  font-weight: 600;
}

.pagination-ellipsis {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  color: #6c757d;
}

[dir="rtl"] .pagination-btn:first-child .pagination-icon {
  transform: rotate(180deg);
}

[dir="rtl"] .pagination-btn:last-child .pagination-icon {
  transform: rotate(180deg);
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
