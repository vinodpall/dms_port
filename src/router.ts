import { createRouter, createWebHashHistory } from 'vue-router'
import { useSession } from '@/stores/session'
import type { PageKey } from '@/collect/constants'

/** 数据采集模块各页（移植自 dms_collect），路由 name 与页面 key 一致 */
const COLLECT_VIEWS: Record<PageKey, () => Promise<unknown>> = {
  dashboard: () => import('@/collect/views/DashboardView.vue'),
  tasks: () => import('@/collect/views/TasksView.vue'),
  monitor: () => import('@/collect/views/MonitorView.vue'),
  pipeline: () => import('@/collect/views/PipelineView.vue'),
  annotate: () => import('@/collect/views/AnnotateView.vue'),
  review: () => import('@/collect/views/ReviewView.vue'),
  datasets: () => import('@/collect/views/DatasetsView.vue'),
  storage: () => import('@/collect/views/StorageView.vue'),
  devices: () => import('@/collect/views/DevicesView.vue'),
  logs: () => import('@/collect/views/LogsView.vue'),
  system: () => import('@/collect/views/SystemView.vue'),
}

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/portal' },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
    { path: '/portal', name: 'portal', component: () => import('@/views/PortalView.vue') },
    { path: '/m/device', name: 'device', component: () => import('@/views/proto/DeviceView.vue') },
    { path: '/m/biz', name: 'biz', component: () => import('@/views/proto/BizView.vue') },
    {
      path: '/m/collect', component: () => import('@/views/proto/CollectView.vue'), redirect: '/m/collect/dashboard',
      children: (Object.keys(COLLECT_VIEWS) as PageKey[]).map((k) => ({ path: k, name: k, component: COLLECT_VIEWS[k] as never, meta: { page: k } })),
    },
    { path: '/m/sim', name: 'sim', component: () => import('@/views/proto/SimView.vue') },
    { path: '/m/scene', name: 'scene', component: () => import('@/views/proto/SceneView.vue') },
    { path: '/m/scene/screen', name: 'scene-screen', component: () => import('@/views/proto/SceneScreen.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/portal' },
  ],
})
router.beforeEach((to) => {
  const s = useSession()
  if (!s.authed && !to.meta.public) return { name: 'login' }
  if (s.authed && to.name === 'login') return { name: 'portal' }
  return true
})
