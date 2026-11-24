import { createRouter, createWebHashHistory } from 'vue-router'
import { useGradeStore } from '../stores/grade'
import { startNav, endNav } from '../composables/navLoading'

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
// 同时开启跳转 loading（懒加载分块 + 数据加载期间显示遮罩）
router.beforeEach((to, from) => {
  const store = useGradeStore()
  if (to.meta.auth && !store.authed) return { name: 'login' }
  if (to.name === 'login' && store.authed) return { name: 'dash' }
  if (to.fullPath !== from.fullPath) startNav()
  return true
})

router.afterEach(() => { endNav() })
// 导航出错/中断也要收起 loading，避免遮罩卡住
router.onError(() => { endNav() })

export default router
