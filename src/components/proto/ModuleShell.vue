<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { AppstoreOutlined, LogoutOutlined, BellOutlined, QuestionCircleOutlined } from '@ant-design/icons-vue'
import BrandMark from '@/components/BrandMark.vue'
import { PLATFORM } from '@/constants'
import { useClock } from '@/composables/entry'
import { useSession } from '@/stores/session'
import '@/styles/pages.css'

export interface ShellMenu { key: string; label: string; icon?: unknown; group?: string; badge?: number; soft?: boolean }
const props = withDefaults(defineProps<{ title: string; en: string; menu?: ShellMenu[]; active?: string; flush?: boolean; noBell?: boolean }>(), { menu: () => [], active: '', flush: false, noBell: false })
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
        <a-tooltip title="返回模块导航"><a-button type="text" class="pp-ico" @click="router.push('/portal')"><AppstoreOutlined /></a-button></a-tooltip>
        <a-badge v-if="!noBell" :count="3" size="small" :offset="[-6, 6]"><a-button type="text" class="pp-ico"><BellOutlined /></a-button></a-badge>
        <a-button type="text" class="pp-ico"><QuestionCircleOutlined /></a-button>
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
      <aside v-if="menu.length" class="pp-side">
        <a-menu mode="inline" :selected-keys="selected" class="pp-menu" @click="(e: any) => emit('update:active', String(e.key))">
          <template v-for="(g, gi) in groups" :key="gi">
            <a-menu-item-group v-if="g.g" :title="g.g">
              <a-menu-item v-for="m in g.items" :key="m.key"><template #icon><component :is="m.icon" /></template>{{ m.label }}<span v-if="m.badge" class="pp-mbadge" :class="{ soft: m.soft }">{{ m.badge }}</span></a-menu-item>
            </a-menu-item-group>
            <template v-else>
              <a-menu-item v-for="m in g.items" :key="m.key"><template #icon><component :is="m.icon" /></template>{{ m.label }}<span v-if="m.badge" class="pp-mbadge" :class="{ soft: m.soft }">{{ m.badge }}</span></a-menu-item>
            </template>
          </template>
        </a-menu>
        <div class="pp-side-foot"><i class="dot" /> 系统运行正常</div>
      </aside>
      <main class="pp-main" :class="{ flush }"><slot /></main>
    </div>
  </div>
</template>
