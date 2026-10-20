<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  DashboardOutlined, VideoCameraOutlined, ScheduleOutlined, EnvironmentOutlined, FileSearchOutlined, AlertOutlined, ProfileOutlined, NodeIndexOutlined,
} from '@ant-design/icons-vue'
import ModuleShell from '@/components/proto/ModuleShell.vue'
import './biz/biz.css'
import RobotBar from './biz/RobotBar.vue'
import BizFlow from './biz/BizFlow.vue'
import BizMonitor from './biz/BizMonitor.vue'
import BizNav from './biz/BizNav.vue'
import BizRoutes from './biz/BizRoutes.vue'
import BizTasks from './biz/BizTasks.vue'
import BizRecords from './biz/BizRecords.vue'
import BizAlarms from './biz/BizAlarms.vue'
import BizLogs from './biz/BizLogs.vue'
import { robot, switching, curId } from './biz/store'

document.title = '机器人业务管理 · 具身智能训练场'
const MENU = [
  { key: 'dash', label: '作业总览', icon: DashboardOutlined },
  { key: 'monitor', label: '实时监控', icon: VideoCameraOutlined },
  { key: 'nav', label: '建图与定位', icon: EnvironmentOutlined },
  { key: 'route', label: '路线与任务点', icon: NodeIndexOutlined },
  { key: 'task', label: '任务执行', icon: ScheduleOutlined },
  { key: 'record', label: '巡检记录', icon: FileSearchOutlined },
  { key: 'alarm', label: '告警中心', icon: AlertOutlined },
  { key: 'log', label: '操作日志', icon: ProfileOutlined },
]
const tab = ref('dash')
const sub = ref('')
let next = ''
const go = (t: string, s?: string) => { if (t === tab.value) sub.value = s ?? ''; else { next = s ?? ''; tab.value = t } }
watch(tab, () => { sub.value = next; next = '' })
watch(curId, () => { sub.value = '' })
</script>

<template>
  <ModuleShell v-model:active="tab" title="机器人业务管理" en="Robot Business" :menu="MENU">
    <RobotBar @go="go" />
    <a-spin :spinning="switching" tip="机器人切换中...">
      <div v-if="!robot.online && tab !== 'record' && tab !== 'alarm' && tab !== 'log'" class="bz-off">
        <a-alert type="warning" show-icon :message="`${robot.name}（${robot.id}）当前离线`" description="离线状态下无法下发控制指令与任务，仅可查看历史数据。" />
      </div>
      <BizFlow v-if="tab === 'dash'" @go="go" />
      <BizMonitor v-else-if="tab === 'monitor'" :key="curId" @go="go" />
      <BizNav v-else-if="tab === 'nav'" v-model:sub="sub" @go="go" />
      <BizRoutes v-else-if="tab === 'route'" v-model:sub="sub" @go="go" />
      <BizTasks v-else-if="tab === 'task'" v-model:sub="sub" @go="go" />
      <BizRecords v-else-if="tab === 'record'" :key="curId" />
      <BizAlarms v-else-if="tab === 'alarm'" />
      <BizLogs v-else-if="tab === 'log'" :key="curId" />
    </a-spin>
  </ModuleShell>
</template>

<style scoped>
.bz-off { margin-bottom: 14px; }
</style>
