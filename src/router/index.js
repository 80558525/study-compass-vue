import { createRouter, createWebHashHistory } from 'vue-router'
import { useGradeStore } from '../stores/grade'

const routes = [
  { path: '/', redirect: '/dash' },
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
  { path: '/dash', name: 'dash', component: () => import('../views/DashboardView.vue'), meta: { auth: true } },
  { path: '/table', name: 'table', component: () => import('../views/DetailView.vue'), meta: { auth: true } },
  { path: '/person', name: 'person', component: () => import('../views/PersonView.vue'), meta: { auth: true } },
  { path: '/compare', name: 'compare', component: () => import('../views/CompareView.vue'), meta: { auth: true } },
  { path: '/editor', name: 'editor', component: () => import('../views/EditorView.vue'), meta: { auth: true } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 登录守卫：未登录访问受保护页 → 跳登录页；已登录访问登录页 → 跳看板
router.beforeEach((to) => {
  const store = useGradeStore()
  if (to.meta.auth && !store.authed) return { name: 'login' }
  if (to.name === 'login' && store.authed) return { name: 'dash' }
  return true
})

export default router
