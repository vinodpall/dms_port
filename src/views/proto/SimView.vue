<script setup lang="ts">
/** 机器人仿真：Isaac Sim / Isaac Lab 的 Web 外壳 —— 模型资产（URDF→USD）、训练任务、实时视口、训练监控 */
import { ref } from 'vue'
import { AppstoreOutlined, ExperimentOutlined, VideoCameraOutlined, LineChartOutlined } from '@ant-design/icons-vue'
import ModuleShell from '@/components/proto/ModuleShell.vue'
import SimAssets from './sim/SimAssets.vue'
import SimTrain from './sim/SimTrain.vue'
import SimViewport from './sim/SimViewport.vue'
import SimMonitor from './sim/SimMonitor.vue'

document.title = '机器人仿真 · 具身智能训练场'
const MENU = [
  { key: 'assets', label: '模型资产', icon: AppstoreOutlined, group: '资产' },
  { key: 'train', label: '训练任务', icon: ExperimentOutlined, group: '训练' },
  { key: 'view', label: '实时视口', icon: VideoCameraOutlined, group: '训练' },
  { key: 'monitor', label: '训练监控', icon: LineChartOutlined, group: '训练' },
]
const tab = ref('train')
const cur = ref('t1')
const go = (k: string, id?: string) => { if (id) cur.value = id; tab.value = k }
</script>
<template>
  <ModuleShell v-model:active="tab" title="机器人仿真" en="Simulation · Isaac Lab" :menu="MENU">
    <SimAssets v-if="tab === 'assets'" @train="go('train')" />
    <SimTrain v-else-if="tab === 'train'" @view="go('view', $event)" @monitor="go('monitor', $event)" />
    <SimViewport v-else-if="tab === 'view'" v-model:task="cur" />
    <SimMonitor v-else v-model:task="cur" />
  </ModuleShell>
</template>
