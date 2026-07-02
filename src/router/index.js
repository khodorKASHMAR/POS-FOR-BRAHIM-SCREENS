import { createRouter, createWebHistory } from 'vue-router'
import Pos from '../pages/Pos.vue'
import AddItems from '../pages/AddItems.vue'
import Users from '../pages/Users.vue'
import DollarRate from '../pages/DollarRate.vue'
import LoginPage from '../pages/LoginPage.vue'
import { useUserStore } from '../store/user'

const routes = [
  { path: '/login', name: 'Login', component: LoginPage, meta: { requiresAuth: false } },
  { path: '/', name: 'Pos', component: Pos, meta: { requiresAuth: true, admin: false } },
  { path: '/add-items', name: 'AddItems', component: AddItems, meta: { requiresAuth: true, admin: true } },
  { path: '/users', name: 'Users', component: Users, meta: { requiresAuth: true, admin: true } },
  { path: '/dollar-rate', name: 'DollarRate', component: DollarRate, meta: { requiresAuth: true, admin: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const isAuthenticated = !!localStorage.getItem('token')
  const u = useUserStore()

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.path === '/login' && isAuthenticated) {
    next('/')
  } else if (to.meta.admin && u.user.role !== 'admin') {
    next('/')
  } else {
    next()
  }
})

export default router
