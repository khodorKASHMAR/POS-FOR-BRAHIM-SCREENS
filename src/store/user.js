
import { defineStore } from 'pinia'
import { firstAllowedPath, MENU_LIST } from '../constants/menus'
import { PRINTER_STORAGE_KEY } from '../print/thermalPrinter'

function emptyUser() {
  return {
    id: null,
    userName: '',
    firstName: '',
    lastName: '',
    menus: []
  }
}

function normalizeUser(raw) {
  if (!raw || typeof raw !== 'object') return emptyUser()
  const menus = Array.isArray(raw.menus)
    ? raw.menus
    : raw.role === 'admin'
      ? MENU_LIST.map((m) => m.code)
      : []
  return {
    id: raw.id ?? null,
    userName: raw.userName || '',
    firstName: raw.firstName || raw.firstNameEN || '',
    lastName: raw.lastName || raw.lastNameEN || '',
    menus
  }
}

function readStoredUser() {
  try {
    return normalizeUser(JSON.parse(localStorage.getItem('user')))
  } catch {
    return emptyUser()
  }
}

export const useUserStore = defineStore('user', {
  state: () => ({
    user: readStoredUser()
  }),
  getters: {
    hasMenu: (state) => (code) => Array.isArray(state.user?.menus) && state.user.menus.includes(code),
    firstAllowedPath: (state) => firstAllowedPath(state.user?.menus)
  },
  actions: {
    setUser(payload) {
      this.user = normalizeUser(payload)
      localStorage.setItem('user', JSON.stringify(this.user))
    },
    logout() {
      const printer = localStorage.getItem(PRINTER_STORAGE_KEY)
      localStorage.clear()
      if (printer) localStorage.setItem(PRINTER_STORAGE_KEY, printer)
      location.reload()
    }
  }
})
