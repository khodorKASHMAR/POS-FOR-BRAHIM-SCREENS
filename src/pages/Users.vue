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
                          <v-tooltip
                            :text="$t('editUserMenus')"
                            location="bottom"
                            :z-index="10000"
                            content-class="users-action-tooltip"
                          >
                            <template #activator="{ props: tooltipProps }">
                              <button
                                v-bind="tooltipProps"
                                type="button"
                                class="action-btn menus-btn"
                                @click="openUserMenus(item)"
                              >
                                <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              </button>
                            </template>
                          </v-tooltip>
                          <v-tooltip
                            :text="$t('editUser')"
                            location="bottom"
                            :z-index="10000"
                            content-class="users-action-tooltip"
                          >
                            <template #activator="{ props: tooltipProps }">
                              <button
                                v-bind="tooltipProps"
                                type="button"
                                class="action-btn edit-btn"
                                @click="editUser(item)"
                              >
                                <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </template>
                          </v-tooltip>
                          <v-tooltip
                            :text="$t('delete')"
                            location="bottom"
                            :z-index="10000"
                            content-class="users-action-tooltip"
                          >
                            <template #activator="{ props: tooltipProps }">
                              <button
                                v-bind="tooltipProps"
                                type="button"
                                class="action-btn delete-btn"
                                @click="openDeleteDialog(item)"
                              >
                                <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </template>
                          </v-tooltip>
                        </div>
                      </template>
                      <template v-else-if="h.key === 'role'">
                        <span class="role-chip" :class="item.role === ROLE_ADMIN ? 'role-chip--admin' : 'role-chip--user'">
                          <v-icon size="14">{{ item.role === ROLE_ADMIN ? 'mdi-shield-crown-outline' : 'mdi-account-outline' }}</v-icon>
                          {{ roleLabel(item.role) }}
                        </span>
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

    <v-dialog
      v-model="userDialog"
      max-width="760"
      persistent
      @update:model-value="(v) => { if (v === false) closeUserDialog() }"
    >
      <v-form ref="formRef" class="user-dialog" :dir="lang.dir" autocomplete="off" @submit.prevent="submitForm">
        <header class="user-dialog-header">
          <div class="user-dialog-avatar">
            <v-icon size="26">{{ isEditing ? 'mdi-account-edit' : 'mdi-account-plus' }}</v-icon>
          </div>
          <div class="user-dialog-heading">
            <h2 class="user-dialog-title">{{ isEditing ? $t('editUser') : $t('addUser') }}</h2>
            <p class="user-dialog-subtitle">{{ isEditing ? $t('editUserSubtitle') : $t('addUserSubtitle') }}</p>
          </div>
          <button type="button" class="user-dialog-close" :aria-label="$t('close')" @click="closeUserDialog">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </header>

        <div class="user-dialog-body">
          <section class="user-dialog-section">
            <div class="user-dialog-section-title">
              <v-icon size="18">mdi-shield-account-outline</v-icon>
              <span>{{ $t('accountInfo') }}</span>
            </div>
            <div class="user-dialog-grid">
              <div class="user-field">
                <label class="user-field-label">
                  {{ $t('userName') }} <span class="user-field-required">*</span>
                </label>
                <v-text-field
                  v-model="user.userName"
                  :placeholder="$t('userName')"
                  prepend-inner-icon="mdi-account-key-outline"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                  :rules="userNameRules"
                  :disabled="!!isEditing"
                  autocomplete="off"
                  class="user-input"
                  @keydown.space.prevent
                  @update:model-value="onUserNameInput"
                />
              </div>
              <div class="user-field">
                <label class="user-field-label">
                  {{ $t('password') }} <span class="user-field-required">*</span>
                </label>
                <v-text-field
                  v-model="user.password"
                  :type="showPassword ? 'text' : 'password'"
                  :placeholder="$t('password')"
                  prepend-inner-icon="mdi-lock-outline"
                  :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                  :rules="[v => !!v || $t('fieldRequired')]"
                  autocomplete="new-password"
                  class="user-input"
                  @click:append-inner="showPassword = !showPassword"
                />
              </div>
            </div>

            <div class="user-field">
              <label class="user-field-label">
                {{ $t('role') }} <span class="user-field-required">*</span>
              </label>
              <div class="role-options" role="radiogroup" :aria-label="$t('role')">
                <button
                  v-for="opt in roleOptions"
                  :key="opt.value"
                  type="button"
                  role="radio"
                  class="role-option"
                  :class="[`role-option--${opt.value.toLowerCase()}`, { 'role-option--active': user.role === opt.value }]"
                  :aria-checked="user.role === opt.value"
                  @click="user.role = opt.value"
                >
                  <span class="role-option-icon">
                    <v-icon size="22">{{ opt.icon }}</v-icon>
                  </span>
                  <span class="role-option-text">
                    <span class="role-option-name">{{ opt.label }}</span>
                    <span class="role-option-hint">{{ opt.hint }}</span>
                  </span>
                  <v-icon class="role-option-check" size="20">
                    {{ user.role === opt.value ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                  </v-icon>
                </button>
              </div>
            </div>
          </section>

          <section class="user-dialog-section">
            <div class="user-dialog-section-title">
              <v-icon size="18">mdi-card-account-details-outline</v-icon>
              <span>{{ $t('personalInfo') }}</span>
            </div>
            <div class="user-dialog-grid">
              <div class="user-field">
                <label class="user-field-label">
                  {{ $t('firstName') }} <span class="user-field-required">*</span>
                </label>
                <v-text-field
                  v-model="user.firstNameEN"
                  :placeholder="$t('firstName')"
                  prepend-inner-icon="mdi-account-outline"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                  :rules="[v => !!v || $t('fieldRequired')]"
                  class="user-input"
                />
              </div>
              <div class="user-field">
                <label class="user-field-label">
                  {{ $t('lastName') }} <span class="user-field-required">*</span>
                </label>
                <v-text-field
                  v-model="user.lastNameEN"
                  :placeholder="$t('lastName')"
                  prepend-inner-icon="mdi-account-outline"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                  :rules="[v => !!v || $t('fieldRequired')]"
                  class="user-input"
                />
              </div>
            </div>
          </section>

          <section class="user-dialog-section">
            <div class="user-dialog-section-title">
              <v-icon size="18">mdi-card-account-phone-outline</v-icon>
              <span>{{ $t('contactInfo') }}</span>
            </div>
            <div class="user-dialog-grid">
              <div class="user-field">
                <label class="user-field-label">{{ $t('email') }}</label>
                <v-text-field
                  v-model="user.email"
                  type="email"
                  :placeholder="$t('email')"
                  prepend-inner-icon="mdi-email-outline"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                  class="user-input"
                />
              </div>
              <div class="user-field">
                <label class="user-field-label">
                  {{ $t('phoneNumber') }} <span class="user-field-required">*</span>
                </label>
                <v-text-field
                  v-model="user.phoneNumber"
                  type="tel"
                  :placeholder="$t('phoneNumber')"
                  prepend-inner-icon="mdi-phone-outline"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                  :rules="[v => !!v || $t('fieldRequired')]"
                  class="user-input"
                />
              </div>
            </div>
          </section>
        </div>

        <footer class="user-dialog-footer">
          <button type="button" class="user-dialog-btn user-dialog-btn--cancel" @click="closeUserDialog">
            {{ $t('cancel') }}
          </button>
          <button type="submit" class="user-dialog-btn user-dialog-btn--save" :disabled="saving">
            <v-progress-circular v-if="saving" indeterminate size="16" width="2" />
            <v-icon v-else size="18">mdi-content-save-outline</v-icon>
            <span>{{ isEditing ? $t('update') : $t('save') }}</span>
          </button>
        </footer>
      </v-form>
    </v-dialog>

    <UserMenusDialog
      v-model="menusDialog"
      :user="menusUser"
      :dir="lang.dir"
      @saved="onUserMenusSaved"
    />

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
import UserMenusDialog from '../components/UserMenusDialog.vue'
import UserService from '../services/UserService.js'
import { useUserStore } from '../store/user'

const instance = getCurrentInstance()
const $t = instance?.appContext?.config?.globalProperties?.$t || (k => k)
const $notification = (msg, status, delay) => instance?.appContext?.config?.globalProperties?.$notification?.(msg, status, delay)

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
const saving = ref(false)

const ROLE_ADMIN = 'ADMIN'
const ROLE_USER = 'USER'

const roleOptions = computed(() => [
  { value: ROLE_USER, label: $t('roleUser'), hint: $t('roleUserHint'), icon: 'mdi-account-outline' },
  { value: ROLE_ADMIN, label: $t('roleAdmin'), hint: $t('roleAdminHint'), icon: 'mdi-shield-crown-outline' }
])

function roleLabel(role) {
  return role === ROLE_ADMIN ? $t('roleAdmin') : $t('roleUser')
}

const user = reactive({
  userName: '',
  password: '',
  firstNameEN: '',
  lastNameEN: '',
  email: '',
  phoneNumber: '',
  role: ROLE_USER
})

const userNameRules = [
  (v) => !!String(v || '').trim() || $t('fieldRequired'),
  (v) => !/\s/.test(String(v || '')) || $t('userNameNoSpaces')
]

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

const headers = computed(() => [
  { title: $t('userName'), key: 'userName', sortable: true },
  { title: $t('firstName'), key: 'firstNameEN', sortable: true },
  { title: $t('lastName'), key: 'lastNameEN', sortable: true },
  { title: $t('email'), key: 'email', sortable: false },
  { title: $t('phoneNumber'), key: 'phoneNumber', sortable: false },
  { title: $t('role'), key: 'role', sortable: false },
  { title: $t('actions'), key: 'actions', sortable: false }
])

const isPageSizeOpen = ref(false)

const filteredUsers = computed(() => {
  if (!search.value) return users.value
  const s = search.value.toLowerCase()
  return users.value.filter((u) =>
    [u.userName, u.firstNameEN, u.lastNameEN, u.email, u.phoneNumber, roleLabel(u.role)].some((v) =>
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
  user.role = ROLE_USER
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
  saving.value = true
  try {
    const payload = {
      userName: String(user.userName || '').trim(),
      password: user.password,
      firstNameEN: user.firstNameEN,
      lastNameEN: user.lastNameEN,
      email: user.email || null,
      phoneNumber: user.phoneNumber || null,
      role: user.role || ROLE_USER
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
  } finally {
    saving.value = false
  }
}

function editUser(row) {
  Object.assign(user, {
    userName: row.userName,
    password: row.password ?? '',
    firstNameEN: row.firstNameEN ?? '',
    lastNameEN: row.lastNameEN ?? '',
    email: row.email ?? '',
    phoneNumber: row.phoneNumber ?? '',
    role: row.role === ROLE_ADMIN ? ROLE_ADMIN : ROLE_USER
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
  --oil-ink: #16363a;
  --oil-muted: #5f7a7e;
  --oil-line: rgba(25, 119, 131, 0.16);
  --oil-teal: #197783;
  --oil-teal-bright: #20b4c6;
  --oil-surface: #ffffff;
  --oil-panel: linear-gradient(180deg, #eaf5f6 0%, #f5f9fa 45%, #eef4f5 100%);
  background: var(--oil-panel);
  min-height: 100vh;
  position: relative;
}

.page-background::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 60% 34% at 0% 0%, rgba(50, 216, 238, 0.1), transparent 55%),
    radial-gradient(ellipse 45% 28% at 100% 100%, rgba(25, 119, 131, 0.07), transparent 50%);
  z-index: 0;
}

.page-background > * {
  position: relative;
  z-index: 1;
}

.users-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0.35rem 1rem 0.9rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.users-header-rtl {
  flex-direction: row-reverse;
}

.users-title {
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--oil-ink);
  margin: 0;
  letter-spacing: -0.02em;
  padding: 0 0.25rem;
}

.users-actions {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.users-actions-rtl {
  flex-direction: row-reverse;
}

.add-items-action-btn {
  border-radius: 12px !important;
  font-weight: 700 !important;
  letter-spacing: 0.01em;
  background-image: linear-gradient(135deg, #197783, #20b4c6) !important;
  color: #ffffff !important;
  box-shadow: 0 6px 14px rgba(25, 119, 131, 0.22);
  text-transform: none !important;
}

.add-items-action-btn:hover {
  background-image: linear-gradient(135deg, #146873, #1aa3b4) !important;
  box-shadow: 0 8px 18px rgba(25, 119, 131, 0.28);
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
  --table-primary: #197783;
}

.table-responsive-container.users-custom-table {
  background: var(--oil-surface);
  border-radius: 16px;
  box-shadow: 0 10px 26px rgba(22, 54, 58, 0.08);
  overflow: hidden;
  margin: 0 1rem 1.5rem;
  border: 1px solid var(--oil-line);
  display: flex;
  flex-direction: column;
}

.table-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: linear-gradient(180deg, #f1f8f9, #f7fbfc);
  border-bottom: 1px solid var(--oil-line);
  flex-wrap: wrap;
  gap: 16px;
}

.rows-per-page-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-weight: 600;
  color: var(--oil-muted);
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
  border: 1px solid var(--oil-line);
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  color: var(--oil-ink);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  min-width: 120px;
  justify-content: space-between;
}

.dropdown-trigger:hover,
.dropdown-trigger.dropdown-open {
  border-color: var(--oil-teal-bright);
  box-shadow: 0 0 0 3px rgba(32, 180, 198, 0.16);
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
  border: 1px solid var(--oil-line);
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(22, 54, 58, 0.14);
  z-index: 1000;
  margin-top: 4px;
  overflow: hidden;
}

.dropdown-item {
  padding: 10px 12px;
  font-size: 14px;
  color: var(--oil-ink);
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #f1f7f8;
}

.dropdown-item:hover {
  background-color: #f2f9fa;
}

.dropdown-item.selected {
  background: linear-gradient(135deg, #197783, #20b4c6);
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
  color: var(--oil-teal);
  z-index: 1;
}

[dir="rtl"] .search-icon {
  left: auto;
  right: 12px;
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid var(--oil-line);
  border-radius: 999px;
  font-size: 14px;
  color: var(--oil-ink);
  background: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

[dir="rtl"] .search-input {
  padding-left: 12px;
  padding-right: 36px;
}

.search-input:focus {
  outline: none;
  border-color: var(--oil-teal-bright);
  box-shadow: 0 0 0 3px rgba(32, 180, 198, 0.16);
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
  background: #f4fafb;
  color: var(--oil-teal);
  font-weight: 700;
  text-align: left;
  padding: 12px;
  border-bottom: 1px solid rgba(25, 119, 131, 0.22);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.table-row {
  border-bottom: 1px solid rgba(25, 119, 131, 0.1);
  transition: background-color 0.2s ease;
}

.table-row:hover {
  background-color: #f4fafb;
}

.table-cell {
  padding: 12px;
  color: var(--oil-ink);
  vertical-align: middle;
  border: none;
}

.no-data-cell {
  text-align: center;
  padding: 40px 20px;
  color: var(--oil-muted);
  font-style: italic;
  background: #f7fbfc;
}

.users-table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.users-table-actions .action-btn {
  padding: 6px;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  background: transparent;
  color: var(--oil-muted);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.users-table-actions .action-btn .action-icon {
  width: 20px;
  height: 20px;
  display: block;
}

.users-table-actions .edit-btn:hover {
  background: rgba(25, 119, 131, 0.12);
  border-color: rgba(25, 119, 131, 0.3);
  color: var(--oil-teal);
}

.users-table-actions .menus-btn:hover {
  background: rgba(25, 119, 131, 0.12);
  border-color: rgba(25, 119, 131, 0.3);
  color: var(--oil-teal);
}

.users-table-actions .delete-btn:hover {
  background: rgba(211, 47, 47, 0.1);
  border-color: rgba(211, 47, 47, 0.35);
  color: #d32f2f;
}

.pagination-container {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 10px 14px;
  background: linear-gradient(180deg, #f7fbfc, #f1f8f9);
  border-top: 1px solid var(--oil-line);
  gap: 0;
}

.pagination-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--oil-line);
  background: #fff;
  color: var(--oil-muted);
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.pagination-btn:hover:not(.disabled) {
  background: linear-gradient(135deg, #197783, #20b4c6);
  color: #fff;
  border-color: transparent;
}

.pagination-btn.disabled {
  opacity: 0.45;
  cursor: not-allowed;
  background: #f4f8f9;
  color: var(--oil-muted);
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
  border: 1px solid var(--oil-line);
  background: #fff;
  color: var(--oil-ink);
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.pagination-page:hover {
  background: #e9f5f7;
  color: var(--oil-teal);
  border-color: rgba(32, 180, 198, 0.4);
}

.pagination-page.active {
  background: linear-gradient(135deg, #197783, #20b4c6);
  color: #fff;
  border-color: transparent;
  font-weight: 700;
  box-shadow: 0 4px 10px rgba(25, 119, 131, 0.22);
}

.pagination-ellipsis {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  color: var(--oil-muted);
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

.role-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.18rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}

.role-chip--admin {
  background: rgba(124, 58, 237, 0.1);
  color: #6d28d9;
  border: 1px solid rgba(124, 58, 237, 0.25);
}

.role-chip--user {
  background: rgba(25, 119, 131, 0.1);
  color: var(--oil-teal);
  border: 1px solid rgba(25, 119, 131, 0.22);
}

/* Add / edit user dialog */
.user-dialog {
  --ud-ink: #16363a;
  --ud-muted: #5f7a7e;
  --ud-line: rgba(25, 119, 131, 0.16);
  --ud-teal: #197783;
  --ud-teal-bright: #20b4c6;
  display: flex;
  flex-direction: column;
  max-height: 92vh;
  background: #ffffff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow:
    0 28px 60px -20px rgba(15, 23, 42, 0.35),
    0 12px 24px -12px rgba(25, 119, 131, 0.2);
}

.user-dialog-header {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 1.1rem 1.35rem;
  background: linear-gradient(120deg, #125f68 0%, #197783 45%, #22b8c9 100%);
  color: #ffffff;
  flex-shrink: 0;
}

.user-dialog-avatar {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.user-dialog-heading {
  flex: 1;
  min-width: 0;
  text-align: start;
}

.user-dialog-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.user-dialog-subtitle {
  margin: 0.15rem 0 0;
  font-size: 0.8rem;
  opacity: 0.85;
}

.user-dialog-close {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
  cursor: pointer;
  transition: background 0.15s ease;
}

.user-dialog-close:hover {
  background: rgba(255, 255, 255, 0.28);
}

.user-dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.1rem 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  background: linear-gradient(180deg, #f1f8f9 0%, #f7fbfc 100%);
}

.user-dialog-section {
  background: #ffffff;
  border: 1px solid var(--ud-line);
  border-radius: 14px;
  padding: 0.9rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.user-dialog-section-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ud-teal);
}

.user-dialog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem 1rem;
}

.user-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}

.user-field-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ud-muted);
  text-align: start;
}

.user-field-required {
  color: #ef4444;
}

.user-input :deep(.v-field) {
  border-radius: 10px;
  background: #ffffff;
  font-size: 0.9rem;
}

.user-input :deep(.v-field__outline) {
  --v-field-border-opacity: 0.22;
  color: var(--ud-teal);
}

.user-input :deep(.v-field--focused .v-field__outline) {
  --v-field-border-opacity: 1;
}

.user-input :deep(.v-field__prepend-inner .v-icon) {
  color: var(--ud-teal);
  opacity: 0.8;
}

.user-input :deep(.v-messages__message) {
  color: #ef4444;
  text-align: start;
}

.role-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.role-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem 0.9rem;
  border: 1.5px solid var(--ud-line);
  border-radius: 12px;
  background: #ffffff;
  color: var(--ud-ink);
  cursor: pointer;
  text-align: start;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.role-option:hover {
  border-color: rgba(25, 119, 131, 0.45);
}

.role-option:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(32, 180, 198, 0.25);
}

.role-option-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex-shrink: 0;
  background: rgba(25, 119, 131, 0.1);
  color: var(--ud-teal);
}

.role-option--admin .role-option-icon {
  background: rgba(124, 58, 237, 0.1);
  color: #6d28d9;
}

.role-option-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex: 1;
  min-width: 0;
}

.role-option-name {
  font-size: 0.9rem;
  font-weight: 800;
}

.role-option-hint {
  font-size: 0.74rem;
  color: var(--ud-muted);
  line-height: 1.3;
}

.role-option-check {
  color: rgba(95, 122, 126, 0.45);
  flex-shrink: 0;
}

.role-option--active {
  border-color: var(--ud-teal);
  background: rgba(25, 119, 131, 0.05);
  box-shadow: 0 6px 16px rgba(25, 119, 131, 0.14);
}

.role-option--active .role-option-check {
  color: var(--ud-teal);
}

.role-option--admin.role-option--active {
  border-color: #7c3aed;
  background: rgba(124, 58, 237, 0.05);
  box-shadow: 0 6px 16px rgba(124, 58, 237, 0.14);
}

.role-option--admin.role-option--active .role-option-check {
  color: #7c3aed;
}

.user-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  padding: 0.85rem 1.35rem;
  border-top: 1px solid var(--ud-line);
  background: #ffffff;
  flex-shrink: 0;
}

.user-dialog-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-width: 120px;
  height: 40px;
  padding: 0 1.1rem;
  border-radius: 11px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.user-dialog-btn--cancel {
  border: 1px solid var(--ud-line);
  background: #ffffff;
  color: var(--ud-muted);
}

.user-dialog-btn--cancel:hover {
  background: #f4fafb;
  color: var(--ud-ink);
}

.user-dialog-btn--save {
  border: none;
  color: #ffffff;
  background-image: linear-gradient(135deg, #197783, #20b4c6);
  box-shadow: 0 6px 14px rgba(25, 119, 131, 0.22);
}

.user-dialog-btn--save:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(25, 119, 131, 0.3);
}

.user-dialog-btn--save:disabled {
  opacity: 0.7;
  cursor: progress;
}

@media (max-width: 640px) {
  .user-dialog-grid,
  .role-options {
    grid-template-columns: minmax(0, 1fr);
  }

  .user-dialog-footer .user-dialog-btn {
    flex: 1;
  }
}
</style>

<style>
.users-action-tooltip,
.v-overlay__content.users-action-tooltip {
  background: #0f172a !important;
  color: #ffffff !important;
  border-radius: 8px !important;
  padding: 0.35rem 0.55rem !important;
  font-size: 0.7rem !important;
  font-weight: 500 !important;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.28) !important;
  opacity: 1 !important;
}

.users-action-tooltip .v-overlay__content,
.users-action-tooltip .v-tooltip__content {
  background: transparent !important;
  color: #ffffff !important;
  padding: 0 !important;
}
</style>
