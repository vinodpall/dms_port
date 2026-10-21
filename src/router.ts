import { ref } from 'vue'
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
  dict: () => import('@/collect/views/DictView.vue'),
  datasets: () => import('@/collect/views/DatasetsView.vue'),
  storage: () => import('@/collect/views/StorageView.vue'),
  devices: () => import('@/collect/views/DevicesView.vue'),
  logs: () => import('@/collect/views/LogsView.vue'),
  system: () => import('@/collect/views/SystemView.vue'),
}

const DeviceView = () => import('@/views/proto/DeviceView.vue')
const BizView = () => import('@/views/proto/BizView.vue')
const CollectView = () => import('@/views/proto/CollectView.vue')
const SimView = () => import('@/views/proto/SimView.vue')
const SceneView = () => import('@/views/proto/SceneView.vue')

/** 路由切换中（懒加载模块首次进入时，开发模式下需要编译较多文件，耗时可达数秒） */
export const routeLoading = ref(false)

let prefetched = false
/** 在模块选择页空闲时预取各模块代码，避免首次点击时长时间无反馈 */
export function prefetchModules() {
  if (prefetched) return
  prefetched = true
  const run = () => {
    const jobs = [BizView, CollectView, COLLECT_VIEWS.dashboard, DeviceView, SimView, SceneView]
    jobs.reduce((p, f) => p.then(() => f().catch(() => undefined)), Promise.resolve<unknown>(undefined))
  }
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback
  ric ? ric(run) : setTimeout(run, 300)
}

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/portal' },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
    { path: '/portal', name: 'portal', component: () => import('@/views/PortalView.vue') },
    { path: '/m/device', name: 'device', component: DeviceView },
    { path: '/palette/:p?', name: 'palette', component: () => import('@/views/palette/PaletteView.vue') },
    { path: '/m/biz', name: 'biz', component: BizView },
    {
      path: '/m/collect', component: CollectView, redirect: '/m/collect/dashboard',
      children: (Object.keys(COLLECT_VIEWS) as PageKey[]).map((k) => ({ path: k, name: k, component: COLLECT_VIEWS[k] as never, meta: { page: k } })),
    },
    { path: '/m/sim', name: 'sim', component: SimView },
    { path: '/m/scene', name: 'scene', component: SceneView },
    { path: '/m/scene/screen', name: 'scene-screen', component: () => import('@/views/proto/SceneScreen.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/portal' },
  ],
})
router.beforeEach((to) => {
  const s = useSession()
  if (!s.authed && !to.meta.public) return { name: 'login' }
  if (s.authed && to.name === 'login') return { name: 'portal' }
  routeLoading.value = true
  return true
})
router.afterEach(() => { routeLoading.value = false })
/** 懒加载模块失败（如开发服务器重新预构建依赖、发布后旧 chunk 失效）时，直接整页跳转到目标地址重试 */
router.onError((err, to) => {
  routeLoading.value = false
  const msg = String((err as Error)?.message ?? err)
  if (/dynamically imported module|Importing a module script failed|Failed to fetch|error loading dynamically/i.test(msg)) {
    // 同一地址 10 秒内只自动重试一次，避免依赖缺失等持续性错误导致反复刷新
    const key = 'route-reload:' + to.fullPath
    const last = Number(sessionStorage.getItem(key) || 0)
    if (Date.now() - last < 10000) { console.error(err); return }
    sessionStorage.setItem(key, String(Date.now()))
    window.location.hash = to.fullPath
    window.location.reload()
  } else console.error(err)
})
