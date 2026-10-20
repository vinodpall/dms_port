<script setup lang="ts">
import { computed, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ModuleShell, { type ShellMenu } from '@/components/proto/ModuleShell.vue'
import AppIcon from '@/components/AppIcon.vue'
import PageSkeleton from '@/collect/components/PageSkeleton.vue'
import CommandPalette from '@/collect/layouts/CommandPalette.vue'
import { NAV_GROUPS, PAGE_META, type PageKey } from '@/collect/constants'
import { useAlerts } from '@/collect/stores/alerts'
import { usePipeline } from '@/collect/stores/pipeline'
import { useAnnotate } from '@/collect/stores/annotate'
import { useTasks } from '@/collect/stores/tasks'
import { useUi } from '@/collect/stores/ui'
import '@/collect/collect.css'

const route = useRoute()
const router = useRouter()
const alerts = useAlerts()
const pipeline = usePipeline()
const annotate = useAnnotate()
const tasks = useTasks()
const ui = useUi()

const current = computed(() => (route.meta.page as PageKey) ?? 'dashboard')

function badge(id: PageKey): { n: number; soft: boolean } | null {
  let n = 0, soft = false
  if (id === 'monitor') n = alerts.openCount('monitor')
  else if (id === 'pipeline') n = pipeline.failedCount()
  else if (id === 'annotate') { n = annotate.labelTodo(); soft = true }
  else if (id === 'review') { n = annotate.reviewTodo(); soft = true }
  else if (id === 'tasks') { n = tasks.list.filter((t) => t.status === 'running').length; soft = true }
  else if (id === 'devices') n = alerts.openCount('devices')
  return n ? { n, soft } : null
}
const icons = Object.fromEntries((Object.keys(PAGE_META) as PageKey[]).map((k) => [k, () => h(AppIcon, { name: PAGE_META[k].icon })]))
const menu = computed<ShellMenu[]>(() => NAV_GROUPS.flatMap((g) => g.items.map((id) => {
  const b = badge(id)
  return { key: id, label: PAGE_META[id].title, icon: icons[id], group: g.g, badge: b?.n, soft: b?.soft }
})))
const active = computed({ get: () => current.value, set: (k: string) => { if (k !== current.value) router.push({ name: k }) } })

/** 切换页面时先显示骨架屏，和原型一致 */
const loading = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
watch(() => route.name, () => {
  loading.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { loading.value = false }, 240)
}, { immediate: true })
const content = ref<HTMLElement>()
watch(loading, (v) => { if (!v && content.value) content.value.scrollTop = 0 })

const isMac = /Mac|iPhone|iPad/.test(navigator.platform || '')
const bellOpen = ref(false)
function openAlert(id: string) {
  const a = alerts.list.find((x) => x.id === id)
  if (!a) return
  a.read = true
  bellOpen.value = false
  router.push({ name: a.route })
}

function onKey(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ui.paletteOpen = true }
}
const prevTitle = document.title
onMounted(() => { document.addEventListener('keydown', onKey); document.documentElement.classList.add('cl-theme') })
onBeforeUnmount(() => {
  clearTimeout(timer)
  document.removeEventListener('keydown', onKey)
  document.documentElement.classList.remove('cl-theme')
  document.title = prevTitle
})
watch(current, (p) => { document.title = PAGE_META[p].title + ' · 数据采集' }, { immediate: true })
</script>

<template>
  <ModuleShell v-model:active="active" class="cl" title="数据采集" en="Data Collection" :menu="menu" flush no-bell>
    <template #extra>
      <button type="button" class="search-btn cl-search" aria-label="打开全局搜索" @click="ui.paletteOpen = true">
        <AppIcon name="search" /><span>搜索页面、任务、数据集</span><kbd>{{ isMac ? '⌘ K' : 'Ctrl K' }}</kbd>
      </button>
      <a-popover v-model:open="bellOpen" trigger="click" placement="bottomRight" :arrow="false" overlay-class-name="plain-pop">
        <template #content>
          <div style="width:360px;max-width:92vw">
            <div class="pop-head"><span>通知</span><button type="button" class="btn ghost sm" @click="alerts.readAll()">全部标为已读</button></div>
            <div style="max-height:380px;overflow:auto">
              <button v-for="a in alerts.list" :key="a.id" type="button" class="notif menu-item" :class="{ unread: !a.read }" style="align-items:flex-start" @click="openAlert(a.id)">
                <span class="alert-ico" :class="a.level"><AppIcon :name="a.level === 'info' ? 'info' : 'alert'" size="sm" /></span>
                <span style="flex:1;min-width:0"><p>{{ a.title }}</p><small>{{ a.desc }} · {{ a.time }}</small></span>
              </button>
            </div>
          </div>
        </template>
        <button type="button" class="icon-btn cl-bell" :aria-label="`通知，${alerts.unread} 条未读`" aria-haspopup="true">
          <AppIcon name="bell" /><span v-if="alerts.unread" class="dot">{{ alerts.unread }}</span>
        </button>
      </a-popover>
    </template>
    <div ref="content" class="content cl-content" tabindex="-1">
      <PageSkeleton v-if="loading" />
      <router-view v-else v-slot="{ Component }">
        <div :key="String(route.name)" class="page">
          <component :is="Component" />
        </div>
      </router-view>
    </div>
    <CommandPalette />
  </ModuleShell>
</template>
