
import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import AddItems from '../pages/AddItems.vue'
import { useUserStore } from '../store/user'

const routes = [
  { path: '/', component: Home },
  { path: '/add-items', component: AddItems, meta:{admin:true} }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to)=>{
  const u = useUserStore()
  if(to.meta.admin && u.user.role!=='admin') return '/'
})

export default router
