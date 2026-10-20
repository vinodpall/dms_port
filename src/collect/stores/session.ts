import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ROLES, type PageKey, type RoleKey } from '@/collect/constants'
import { useSession as usePortalSession } from '@/stores/session'

/**
 * 数据采集模块会话：已并入训练场平台，沿用平台登录，不再单独登录 / 区分角色权限。
 * 保留 can / allowed 等接口以兼容原页面逻辑，均视为有权限。
 */
export const useSession = defineStore('cl-session', () => {
  const portal = usePortalSession()
  const role = ref<RoleKey>('admin')
  const dark = computed(() => true)
  const collapsed = ref(false)
  const info = computed(() => ({ ...ROLES.admin, user: portal.info.user, init: portal.info.init, name: portal.info.name }))
  const isAdmin = computed(() => true)
  const can = (_k: string) => true
  const allowed = (_p: PageKey) => true
  function toggleTheme() { /* 统一赛博深色主题 */ }
  return { role, dark, collapsed, info, isAdmin, can, allowed, toggleTheme }
})
