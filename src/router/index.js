import { createRouter, createWebHistory } from 'vue-router'
import Pos from '../pages/Pos.vue'
import AddItems from '../pages/AddItems.vue'
import Users from '../pages/Users.vue'
import DollarRate from '../pages/DollarRate.vue'
import CashDrawer from '../pages/CashDrawer.vue'
import Receipts from '../pages/Receipts.vue'
import Dashboard from '../pages/Dashboard.vue'
import LoginPage from '../pages/LoginPage.vue'
import { useUserStore } from '../store/user'

const routes = [
  { path: '/login', name: 'Login', component: LoginPage, meta: { requiresAuth: false } },
  { path: '/', name: 'Pos', component: Pos, meta: { requiresAuth: true, menuCode: 'home' } },
  { path: '/drafts', name: 'Drafts', component: Receipts, props: { mode: 'drafts' }, meta: { requiresAuth: true, menuCode: 'drafts' } },
  { path: '/receipts', name: 'Receipts', component: Receipts, meta: { requiresAuth: true, menuCode: 'receipts' } },
  { path: '/cash-drawer', name: 'CashDrawer', component: CashDrawer, meta: { requiresAuth: true, menuCode: 'cash-drawer' } },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard, meta: { requiresAuth: true, menuCode: 'dashboard' } },
  { path: '/add-items', name: 'AddItems', component: AddItems, meta: { requiresAuth: true, menuCode: 'add-items' } },
  { path: '/users', name: 'Users', component: Users, meta: { requiresAuth: true, menuCode: 'users' } },
  { path: '/dollar-rate', name: 'DollarRate', component: DollarRate, meta: { requiresAuth: true, menuCode: 'dollar-rate' } }
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
