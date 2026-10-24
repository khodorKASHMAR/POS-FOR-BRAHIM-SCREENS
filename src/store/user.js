
import { defineStore } from 'pinia'
import { firstAllowedPath, MENU_LIST } from '../constants/menus'
import { PRINTER_STORAGE_KEYS } from '../print/thermalPrinter'
import { readTokenClaims } from '../utils/tokenClaims'

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
    user: readStoredUser(),
    claims: readTokenClaims()
  }),
  getters: {
    hasMenu: (state) => (code) => Array.isArray(state.user?.menus) && state.user.menus.includes(code),
    firstAllowedPath: (state) => firstAllowedPath(state.user?.menus),
    role: (state) => (state.claims?.role === 'ADMIN' ? 'ADMIN' : 'USER'),
    isAdmin() {
      return this.role === 'ADMIN'
    }
  },
  actions: {
    setUser(payload) {
      this.user = normalizeUser(payload)
      localStorage.setItem('user', JSON.stringify(this.user))
      this.loadClaims()
    },
    loadClaims() {
      this.claims = readTokenClaims()
    },
    logout() {
      const printers = PRINTER_STORAGE_KEYS.map((key) => [key, localStorage.getItem(key)])
      localStorage.clear()
      printers.forEach(([key, value]) => value && localStorage.setItem(key, value))
      location.reload()
    }
  }
})
