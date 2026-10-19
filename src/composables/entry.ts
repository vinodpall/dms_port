/** 登录页 / 模块选择页的共用逻辑，各风格只负责外观 */
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { DEMO_PASSWORD, MODULES, ROLES, type ModuleDef } from '@/constants'
import { useSession } from '@/stores/session'
import { toast } from '@/composables/toast'
import { pad } from '@/utils'

export function useLoginForm() {
  const session = useSession()
  const router = useRouter()
  const f = reactive({ u: '', p: '', remember: true })
  const touched = reactive({ u: false, p: false })
  const err = ref('')
  const shake = ref(false)
  const loading = ref(false)
  const showPwd = ref(false)
  const uErr = computed(() => (touched.u && !f.u.trim() ? '请输入账号' : ''))
  const pErr = computed(() => (touched.p && !f.p ? '请输入密码' : ''))
  async function submit() {
    touched.u = touched.p = true
    err.value = ''
    if (!f.u.trim() || !f.p) return
    loading.value = true
    const e = await session.login(f.u, f.p, f.remember)
    loading.value = false
    if (e) { err.value = e; shake.value = false; requestAnimationFrame(() => { shake.value = true }); return }
    router.replace({ name: 'portal' })
  }
  function fill(u: string) { f.u = u; f.p = DEMO_PASSWORD; err.value = ''; touched.u = touched.p = false }
  return { session, f, touched, err, shake, loading, showPwd, uErr, pErr, submit, fill }
}

export function usePortal() {
  const session = useSession()
  const router = useRouter()
  const hour = new Date().getHours()
  const greet = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'
  const ok = (m: ModuleDef) => m.roles.includes(session.role)
  const available = computed(() => MODULES.filter(ok).length)
  function enter(m: ModuleDef) {
    if (!ok(m)) { toast('当前角色（' + ROLES[session.role].name + '）无权访问「' + m.title + '」', { type: 'warn' }); return }
    if (!m.url) { toast('「' + m.title + '」站点地址待配置（.env → VITE_URL_*）'); return }
    // sso：携带当前角色，目标站点免二次登录（演示用；正式环境请改为后端签发的 token）
    window.open(m.sso ? m.url.replace(/\/$/, '') + '/#/login?sso=' + session.role : m.url, '_blank', 'noopener')
  }
  function logout() { session.logout(); router.replace({ name: 'login' }) }
  return { session, greet, ok, available, enter, logout }
}

/** 轻量下拉：点击外部或 Esc 关闭 */
export function usePop() {
  const open = ref(false)
  const root = ref<HTMLElement>()
  const onDoc = (e: MouseEvent) => { if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false }
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') open.value = false }
  onMounted(() => { document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey) })
  onBeforeUnmount(() => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) })
  return { open, root }
}

/** 每秒刷新的时钟 */
export function useClock() {
  const now = ref(new Date())
  let t = 0
  onMounted(() => { t = window.setInterval(() => { now.value = new Date() }, 1000) })
  onBeforeUnmount(() => clearInterval(t))
  const time = computed(() => [now.value.getHours(), now.value.getMinutes(), now.value.getSeconds()].map(pad).join(':'))
  const date = computed(() => now.value.getFullYear() + '-' + pad(now.value.getMonth() + 1) + '-' + pad(now.value.getDate()))
  return { now, time, date }
}
