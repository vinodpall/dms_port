<script setup lang="ts">
import { ref } from 'vue'
import {
  DashboardOutlined, VideoCameraOutlined, ScheduleOutlined, EnvironmentOutlined, FileSearchOutlined, AlertOutlined, ProfileOutlined,
} from '@ant-design/icons-vue'
import ModuleShell from '@/components/proto/ModuleShell.vue'
import BizDash from './biz/BizDash.vue'
import BizMonitor from './biz/BizMonitor.vue'
import BizTasks from './biz/BizTasks.vue'
import BizMaps from './biz/BizMaps.vue'
import BizRecords from './biz/BizRecords.vue'
import BizAlarms from './biz/BizAlarms.vue'
import BizLogs from './biz/BizLogs.vue'

document.title = '机器人业务管理 · 具身智能训练场'
const MENU = [
  { key: 'dash', label: '业务总览', icon: DashboardOutlined },
  { key: 'monitor', label: '实时监控', icon: VideoCameraOutlined },
  { key: 'task', label: '任务管理', icon: ScheduleOutlined },
  { key: 'map', label: '地图与路线', icon: EnvironmentOutlined },
  { key: 'record', label: '巡检记录', icon: FileSearchOutlined },
  { key: 'alarm', label: '告警中心', icon: AlertOutlined },
  { key: 'log', label: '操作日志', icon: ProfileOutlined },
]
const tab = ref('dash')
const robot = ref('DOG-001')
const go = (t: string, r?: string) => { if (r) robot.value = r; tab.value = t }
</script>

<template>
  <ModuleShell v-model:active="tab" title="机器人业务管理" en="Robot Business" :menu="MENU">
    <BizDash v-if="tab === 'dash'" @go="go" />
    <BizMonitor v-else-if="tab === 'monitor'" v-model:robot="robot" @go="go" />
    <BizTasks v-else-if="tab === 'task'" />
    <BizMaps v-else-if="tab === 'map'" />
    <BizRecords v-else-if="tab === 'record'" />
    <BizAlarms v-else-if="tab === 'alarm'" />
    <BizLogs v-else-if="tab === 'log'" />
  </ModuleShell>
</template>
