<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { HomeOutlined, EnvironmentOutlined, ScheduleOutlined, ProfileOutlined, StopOutlined } from '@ant-design/icons-vue'
import ModuleShell from '@/components/proto/ModuleShell.vue'
import './biz/biz.css'
import BizHome from './biz/BizHome.vue'
import BizNav from './biz/BizNav.vue'
import BizRoutes from './biz/BizRoutes.vue'
import BizTasks from './biz/BizTasks.vue'
import BizRecords from './biz/BizRecords.vue'
import BizLogs from './biz/BizLogs.vue'
import TaskLaunch from './biz/TaskLaunch.vue'
import BizMap from './biz/BizMap.vue'
import { activeSlot } from './biz/mapHost'
import { ROBOTS, LOC_META } from '@/mock/biz'
import { robot, rts, switching, curId, isIns, selectRobot } from './biz/store'

document.title = '机器人业务管理 · 具身智能训练场'
const MENU = [
  { key: 'home', label: '首页', icon: HomeOutlined, group: '概览' },
  { key: 'nav', label: '导航管理', icon: EnvironmentOutlined, group: '巡检作业' },
  { key: 'task', label: '任务管理', icon: ScheduleOutlined, group: '巡检作业' },
  { key: 'log', label: '日志管理', icon: ProfileOutlined, group: '记录' },
]
const PAGES = computed<Record<string, { t: string; d: string; tabs: { k: string; t: string }[] }>>(() => ({
  nav: {
    t: '导航管理', d: isIns.value ? 'INS 机器人使用 GPS 坐标，完成 INS 初始化并开启定位后即可录制路线' : '录包建图 → 生成栅格地图 → 开启导航定位，为录制路线做准备',
    tabs: isIns.value ? [{ k: 'build', t: '录包建图' }, { k: 'loc', t: '导航定位' }, { k: 'file', t: '文件管理' }] : [{ k: 'build', t: '录包建图' }, { k: 'loc', t: '导航定位' }, { k: 'edit', t: '地图编辑' }, { k: 'file', t: '文件管理' }],
  },
  task: { t: '任务管理', d: '录制循迹路线、在路线上配置任务点，并编排多任务组与定时任务；任务从首页「任务下发」或路线列表下发', tabs: [{ k: 'route', t: '循迹路线' }, { k: 'pub', t: '发布点任务' }, { k: 'multi', t: '多任务组' }, { k: 'sched', t: '定时任务' }] },
  log: { t: '日志管理', d: '巡检结果、告警处置与业务操作记录', tabs: [{ k: 'rec', t: '警情记录' }, { k: 'op', t: '操作日志' }] },
}))
const tab = ref('home')
const sub = ref('')
let next = ''
const go = (t: string, s?: string) => { if (t === tab.value) sub.value = s ?? ''; else { next = s ?? ''; tab.value = t } }
watch(tab, () => { sub.value = next; next = '' })
const page = computed(() => PAGES.value[tab.value])
const cur = computed({ get: () => (page.value?.tabs.some((x) => x.k === sub.value) ? sub.value : page.value?.tabs[0].k ?? ''), set: (v) => { sub.value = v } })
watch(curId, () => { if (!page.value?.tabs.some((x) => x.k === sub.value)) sub.value = '' })

const state = (id: string) => { const r = ROBOTS.find((x) => x.id === id)!; return !r.online ? { t: '离线', c: '#8EA6BE' } : rts[id].run ? { t: '任务中', c: '#26C6DA' } : { t: '在线', c: '#45E3A8' } }
const estop = () => message.error(`${robot.value.name} 已触发软件急停`)
</script>

<template>
  <ModuleShell v-model:active="tab" title="机器人业务管理" en="Robot Business" :menu="MENU">
    <template #extra>
      <div class="bv-rb">
        <i :style="{ background: state(curId).c }" />
        <a-select :value="curId" :bordered="false" :dropdown-match-select-width="300" :options="ROBOTS.map((r) => ({ value: r.id, label: `${r.id} · ${r.name}`, r }))" @change="(v: any) => selectRobot(String(v))">
          <template #option="{ r }"><div class="bv-opt"><i :style="{ background: state(r.id).c }" /><b class="mono">{{ r.id }}</b><span>{{ r.name }}</span><em>{{ LOC_META[r.loc as 'lidar' | 'ins'].s }}</em><small>{{ state(r.id).t }}</small></div></template>
        </a-select>
      </div>
      <a-button danger size="small" class="bv-stop" :disabled="!robot.online" @click="estop"><StopOutlined />急停</a-button>
    </template>

    <div :style="{ '--off': !robot.online && tab !== 'log' ? '52px' : '0px' }"><a-spin :spinning="switching" tip="机器人切换中...">
      <a-alert v-if="!robot.online && tab !== 'log'" class="bv-off" type="warning" show-icon banner :message="`${robot.name}（${robot.id}）当前离线，无法下发控制指令与任务，仅可查看数据`" />
      <BizHome v-if="tab === 'home'" :key="curId" @go="go" />
      <template v-else-if="page">
        <a-tabs v-model:activeKey="cur" class="bv-tabs"><a-tab-pane v-for="x in page.tabs" :key="x.k" :tab="x.t" /></a-tabs>
        <BizNav v-if="tab === 'nav'" v-model:sub="cur" @go="go" />
        <BizRoutes v-else-if="tab === 'task' && (cur === 'route' || cur === 'pub')" v-model:sub="cur" @go="go" />
        <BizTasks v-else-if="tab === 'task'" :sub="cur" />
        <BizRecords v-else-if="cur === 'rec'" :key="curId" />
        <BizLogs v-else :key="curId" />
      </template>
    </a-spin></div>
    <TaskLaunch @go="go" />
    <!-- 模块内唯一地图实例：挂到当前激活的 MapSlot -->
    <div class="bv-park"><Teleport :to="activeSlot?.el ?? 'body'" :disabled="!activeSlot"><BizMap v-bind="activeSlot?.attrs ?? {}" /></Teleport></div>
  </ModuleShell>
</template>

<style scoped>
.bv-off { margin-bottom: 14px; }
.bv-park { display: none; }
.bv-rb { display: flex; align-items: center; height: 30px; padding-left: 10px; margin-right: 8px; background: rgba(46,211,230,.06); border: 1px solid var(--line-strong); border-radius: 7px; }
.bv-rb > i { width: 7px; height: 7px; border-radius: 50%; }
.bv-rb :deep(.ant-select) { width: 196px; } .bv-rb :deep(.ant-select-selection-item) { font-weight: 500; color: #fff; }
.bv-stop { margin-right: 10px; }
.bv-opt { display: flex; align-items: center; gap: 8px; } .bv-opt i { width: 7px; height: 7px; border-radius: 50%; } .bv-opt b { font-size: 12.5px; } .bv-opt span { flex: 1; } .bv-opt em { font-style: normal; font-size: 11px; color: var(--muted); } .bv-opt small { font-size: 11px; color: var(--faint); }
.bv-flow { display: flex; align-items: center; gap: 6px; margin: -4px 0 12px; }
.bv-flow button { display: flex; align-items: center; gap: 7px; padding: 4px 8px; font: inherit; font-size: 12.5px; color: var(--muted); white-space: nowrap; cursor: pointer; background: none; border: 1px solid transparent; border-radius: 7px; }
.bv-flow button:hover { background: rgba(46,211,230,.06); }
.bv-flow i { width: 18px; height: 18px; display: grid; place-items: center; font: 600 10.5px var(--mono); font-style: normal; border: 1px solid var(--line-strong); border-radius: 50%; }
.bv-flow small { font-size: 11px; color: var(--faint); }
.bv-flow button.done { color: var(--text); } .bv-flow button.done i { color: #0B1C2E; background: #26C6DA; border-color: #26C6DA; }
.bv-flow button.now { color: #fff; border-color: rgba(255,183,77,.45); background: rgba(255,183,77,.06); } .bv-flow button.now i { color: #FFC15C; border-color: #FFC15C; }
.bv-flow em { flex: 1; min-width: 12px; max-width: 40px; height: 1px; background: var(--line-strong); }
.bv-tabs :deep(.ant-tabs-nav) { margin-bottom: 14px; }
</style>
