export const MENUS = {
  home: { code: 'home', path: '/', labelKey: 'home', icon: 'mdi-home', section: 'main' },
  drafts: { code: 'drafts', path: '/drafts', labelKey: 'drafts', icon: 'mdi-file-document-edit-outline', section: 'main' },
  receipts: { code: 'receipts', path: '/receipts', labelKey: 'receipts', icon: 'mdi-receipt', section: 'main' },
  'cash-drawer': { code: 'cash-drawer', path: '/cash-drawer', labelKey: 'cashDrawer', icon: 'mdi-cash-register', section: 'main' },
  'add-items': { code: 'add-items', path: '/add-items', labelKey: 'addItems', icon: 'mdi-shield-account', section: 'admin' },
  users: { code: 'users', path: '/users', labelKey: 'users', icon: 'mdi-account-group', section: 'admin' },
  'dollar-rate': { code: 'dollar-rate', path: '/dollar-rate', labelKey: 'dollarRate', icon: 'mdi-currency-usd', section: 'admin' },
  dashboard: { code: 'dashboard', path: '/dashboard', labelKey: 'dashboard', icon: 'mdi-chart-areaspline', section: 'admin' }
}

export const MENU_LIST = Object.values(MENUS)

export function menusForCodes(codes) {
  const allowed = new Set(codes || [])
  return MENU_LIST.filter((menu) => allowed.has(menu.code))
}

export function firstAllowedPath(codes) {
  return menusForCodes(codes)[0]?.path || '/'
}
