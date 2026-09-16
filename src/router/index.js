import { createRouter, createWebHistory } from 'vue-router'
import Pos from '../pages/Pos.vue'
import AddItems from '../pages/AddItems.vue'
import Users from '../pages/Users.vue'
import DollarRate from '../pages/DollarRate.vue'
import CashDrawer from '../pages/CashDrawer.vue'
import Receipts from '../pages/Receipts.vue'
import Dashboard from '../pages/Dashboard.vue'
import LoginPage from '../pages/LoginPage.vue'
import PrintTemplates from '../pages/PrintTemplates.vue'
import DollarRateMobile from '../pages/mobile/DollarRateMobile.vue'
import CashDrawerMobile from '../pages/mobile/CashDrawerMobile.vue'
import ReceiptsMobile from '../pages/mobile/ReceiptsMobile.vue'
import UsersMobile from '../pages/mobile/UsersMobile.vue'
import DashboardMobile from '../pages/mobile/DashboardMobile.vue'
import AddItemsMobile from '../pages/mobile/AddItemsMobile.vue'
import LoginMobile from '../pages/mobile/LoginMobile.vue'
import PosMobile from '../pages/mobile/PosMobile.vue'
import { createDevicePage } from '../utils/devicePage'
import { useUserStore } from '../store/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: createDevicePage(LoginPage, LoginMobile),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Pos',
    component: createDevicePage(Pos, PosMobile),
    meta: { requiresAuth: true, menuCode: 'home' }
  },
  {
    path: '/drafts',
    name: 'Drafts',
    component: createDevicePage(Receipts, ReceiptsMobile),
    props: { mode: 'drafts' },
    meta: { requiresAuth: true, menuCode: 'drafts' }
  },
  {
    path: '/receipts',
    name: 'Receipts',
    component: createDevicePage(Receipts, ReceiptsMobile),
    meta: { requiresAuth: true, menuCode: 'receipts' }
  },
  {
    path: '/cash-drawer',
    name: 'CashDrawer',
    component: createDevicePage(CashDrawer, CashDrawerMobile),
    meta: { requiresAuth: true, menuCode: 'cash-drawer' }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: createDevicePage(Dashboard, DashboardMobile),
    meta: { requiresAuth: true, menuCode: 'dashboard' }
  },
  {
    path: '/add-items',
    name: 'AddItems',
    component: createDevicePage(AddItems, AddItemsMobile),
    meta: { requiresAuth: true, menuCode: 'add-items' }
  },
  {
    path: '/users',
    name: 'Users',
    component: createDevicePage(Users, UsersMobile),
    meta: { requiresAuth: true, menuCode: 'users' }
  },
  {
    path: '/currency-rate',
    name: 'CurrencyRate',
    component: createDevicePage(DollarRate, DollarRateMobile),
    meta: { requiresAuth: true, menuCode: 'currency-rate' }
  },
  {
    path: '/print-templates',
    name: 'PrintTemplates',
    component: PrintTemplates,
    meta: { requiresAuth: true, menuCode: 'print-templates' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const isAuthenticated = !!localStorage.getItem('token')
  const u = useUserStore()
  const fallback = u.firstAllowedPath || '/'

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.path === '/login' && isAuthenticated) {
    next(fallback)
  } else if (to.meta.menuCode && !u.hasMenu(to.meta.menuCode)) {
    if (fallback === to.path) {
      next(false)
    } else {
      next(fallback)
    }
  } else {
    next()
  }
})

export default router
