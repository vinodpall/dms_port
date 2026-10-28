<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { AppstoreOutlined, LogoutOutlined, BellOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons-vue'
import BrandMark from '@/components/BrandMark.vue'
import AppIcon from '@/components/AppIcon.vue'
import { PLATFORM } from '@/constants'
import { useClock } from '@/composables/entry'
import { useSession } from '@/stores/session'
import '@/styles/pages.css'

export interface ShellNotice { id: string | number; level: 'crit' | 'warn' | 'info'; title: string; desc: string; time: string; read?: boolean }
export interface ShellMenu { key: string; label: string; icon?: unknown; group?: string; badge?: number; soft?: boolean }
const props = withDefaults(defineProps<{ title: string; en: string; menu?: ShellMenu[]; active?: string; flush?: boolean; noBell?: boolean; notices?: ShellNotice[] }>(), { menu: () => [], active: '', flush: false, noBell: false, notices: undefined })
const emit = defineEmits<{ 'update:active': [string] }>()
const router = useRouter()
const session = useSession()
const { time } = useClock()
const selected = computed(() => [props.active])
const groups = computed(() => {
  const out: { g: string; items: ShellMenu[] }[] = []
  for (const m of props.menu) {
    const g = m.group ?? ''
    let last = out[out.length - 1]
    if (!last || last.g !== g) { last = { g, items: [] }; out.push(last) }
    last.items.push(m)
  }
  return out
})
/** 侧栏收缩（仅图标 + 悬浮提示），记忆在本地 */
const collapsed = ref(localStorage.getItem('pp-side-collapsed') === '1')
watch(collapsed, (v) => { localStorage.setItem('pp-side-collapsed', v ? '1' : '0'); setTimeout(() => window.dispatchEvent(new Event('resize')), 220) })
/** 通知（交互对齐数据采集模块：点击铃铛弹出列表，可单条 / 全部标为已读） */
const DEFAULT_NOTICES: ShellNotice[] = [
  { id: 1, level: 'crit', title: '巡检狗 01 检测到温度超限', desc: '配电室 · 电缆接头温度 65.2℃', time: '2 分钟前' },
  { id: 2, level: 'warn', title: '巡检车 02 设备离线', desc: '最后心跳 10-20 18:42', time: '18 分钟前' },
  { id: 3, level: 'info', title: '定时任务「夜间重点」已完成', desc: '共 9 个任务点，1 个异常', time: '1 小时前' },
]
const list = ref<ShellNotice[]>((props.notices ?? DEFAULT_NOTICES).map((n) => ({ ...n })))
watch(() => props.notices, (v) => { if (v) list.value = v.map((n) => ({ ...n })) })
const unread = computed(() => list.value.filter((n) => !n.read).length)
const bellOpen = ref(false)
const readAll = () => list.value.forEach((n) => (n.read = true))
const logout = () => { session.logout(); router.replace({ name: 'login' }) }
</script>

<template>
  <div class="pp">
    <header class="pp-top">
      <div class="pp-brand" role="link" tabindex="0" @click="router.push('/portal')" @keydown.enter="router.push('/portal')">
        <BrandMark />
        <div><b>{{ PLATFORM.name }}</b><small>{{ PLATFORM.en }}</small></div>
      </div>
      <i class="pp-sep" />
      <div class="pp-mod"><b>{{ title }}</b><small>{{ en }}</small></div>
      <div class="pp-top-r">
        <slot name="extra" />
        <a-popover v-if="!noBell" v-model:open="bellOpen" trigger="click" placement="bottomRight" :arrow="false" overlay-class-name="plain-pop">
          <template #content>
            <div style="width:360px;max-width:92vw">
              <div class="pop-head"><span>通知</span><button type="button" class="btn ghost sm" @click="readAll">全部标为已读</button></div>
              <div style="max-height:380px;overflow:auto">
                <button v-for="a in list" :key="a.id" type="button" class="notif menu-item" :class="{ unread: !a.read }" style="align-items:flex-start" @click="a.read = true">
                  <span class="alert-ico" :class="a.level"><AppIcon :name="a.level === 'info' ? 'info' : 'alert'" size="sm" /></span>
                  <span style="flex:1;min-width:0"><p>{{ a.title }}</p><small>{{ a.desc }} · {{ a.time }}</small></span>
                </button>
                <div v-if="!list.length" class="notif" style="justify-content:center;color:var(--faint)">暂无通知</div>
              </div>
            </div>
          </template>
          <a-badge :count="unread" size="small" :offset="[-6, 6]"><a-button type="text" class="pp-ico" :aria-label="`通知，${unread} 条未读`"><BellOutlined /></a-button></a-badge>
        </a-popover>
        <span class="pp-clock">{{ time }}</span>
        <a-dropdown placement="bottomRight">
          <div class="pp-user"><span class="av">{{ session.info.init }}</span><span>{{ session.info.user }}<small>{{ session.info.name }}</small></span></div>
          <template #overlay>
            <a-menu><a-menu-item key="portal" @click="router.push('/portal')"><AppstoreOutlined /> 模块导航</a-menu-item><a-menu-item key="out" danger @click="logout"><LogoutOutlined /> 退出登录</a-menu-item></a-menu>
          </template>
        </a-dropdown>
      </div>
    </header>
    <div class="pp-body">
      <aside v-if="menu.length" class="pp-side" :class="{ folded: collapsed }">
        <a-menu mode="inline" :inline-collapsed="collapsed" :selected-keys="selected" class="pp-menu" @click="(e: any) => emit('update:active', String(e.key))">
          <template v-for="(g, gi) in groups" :key="gi">
            <a-menu-item-group v-if="g.g" :title="g.g">
              <a-menu-item v-for="m in g.items" :key="m.key"><template #icon><component :is="m.icon" /></template>{{ m.label }}<span v-if="m.badge" class="pp-mbadge" :class="{ soft: m.soft }">{{ m.badge }}</span></a-menu-item>
            </a-menu-item-group>
            <template v-else>
              <a-menu-item v-for="m in g.items" :key="m.key"><template #icon><component :is="m.icon" /></template>{{ m.label }}<span v-if="m.badge" class="pp-mbadge" :class="{ soft: m.soft }">{{ m.badge }}</span></a-menu-item>
            </template>
          </template>
        </a-menu>
        <a-tooltip :title="collapsed ? '展开菜单' : ''" placement="right"><button type="button" class="pp-side-foot pp-fold" @click="collapsed = !collapsed"><MenuUnfoldOutlined v-if="collapsed" /><template v-else><MenuFoldOutlined /><span>收起菜单</span></template></button></a-tooltip>
      </aside>
      <main class="pp-main" :class="{ flush }"><slot /></main>
    </div>
  </div>
</template>
