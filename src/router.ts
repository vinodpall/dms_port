import { createRouter, createWebHashHistory } from 'vue-router'
import { useSession } from '@/stores/session'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/portal' },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
    { path: '/portal', name: 'portal', component: () => import('@/views/PortalView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/portal' },
  ],
})
router.beforeEach((to) => {
  const s = useSession()
  if (!s.authed && !to.meta.public) return { name: 'login' }
  if (s.authed && to.name === 'login') return { name: 'portal' }
  return true
})
