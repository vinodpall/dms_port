import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ROLES, type RoleKey } from '@/constants'
import { lsGet, lsSet } from '@/utils'

export const useSession = defineStore('session', () => {
  const savedAuth = lsGet('portal-auth')
  const role = ref<RoleKey>((savedAuth && savedAuth in ROLES ? savedAuth : 'admin') as RoleKey)
  const authed = ref(!!(savedAuth && savedAuth in ROLES))
  
  // 赛博风格固定为深色模式
  const dark = computed(() => true)
  const info = computed(() => ROLES[role.value])
  
  watch(() => role.value, () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    document.documentElement.setAttribute('data-skin', 'cyber')
  }, { immediate: true })

  /** 演示登录：账号见 DEMO_ACCOUNTS，统一密码 DEMO_PASSWORD；接后端时替换为真实接口 */
  async function login(u: string, pwd: string, remember: boolean): Promise<string | null> {
    await new Promise((r) => setTimeout(r, 700))
    const acc = DEMO_ACCOUNTS.find((a) => a.u === u.trim())
    if (!acc || pwd !== DEMO_PASSWORD) return '账号或密码错误'
    role.value = acc.role
    authed.value = true
    lsSet('portal-auth', remember ? acc.role : '')
    return null
  }
  
  function logout() { 
    authed.value = false
    lsSet('portal-auth', '') 
  }
  
  return { role, authed, login, logout, dark, info }
})
