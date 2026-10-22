<script setup lang="ts">
/** 机器人设备管理：设备列表（含详情 / 遥操作）+ 型号管理 */
import { ref, watch } from 'vue'
import { DashboardOutlined, DatabaseOutlined, AppstoreOutlined } from '@ant-design/icons-vue'
import ModuleShell from '@/components/proto/ModuleShell.vue'
import type { Device, DeviceStatus, DeviceType } from '@/models/device'
import DeviceDash from './device/DeviceDash.vue'
import DeviceList from './device/DeviceList.vue'
import DeviceDetail from './device/DeviceDetail.vue'
import DeviceTeleop from './device/DeviceTeleop.vue'
import DeviceForm from './device/DeviceForm.vue'
import ModelLib from './device/ModelLib.vue'

document.title = '机器人设备管理 · 具身智能训练场'
const MENU = [
  { key: 'dash', label: '设备概览', icon: DashboardOutlined, group: '概览' },
  { key: 'list', label: '设备列表', icon: DatabaseOutlined, group: '设备' },
  { key: 'models', label: '型号管理', icon: AppstoreOutlined, group: '设备' },
]
const tab = ref('dash')
const detailId = ref<string | null>(null)
watch(tab, () => { detailId.value = null })

/* 概览 → 列表（带筛选）/ 详情 */
const preset = ref<{ type?: DeviceType; status?: DeviceStatus; n: number } | null>(null)
const toList = (p: { type?: DeviceType; status?: DeviceStatus }) => { preset.value = { ...p, n: (preset.value?.n ?? 0) + 1 }; tab.value = 'list' }
const openFromDash = (d: Device) => { tab.value = 'list'; setTimeout(() => { detailId.value = d.id }) }

const teleop = ref<Device | null>(null)
const formOpen = ref(false)
const editing = ref<Device | null>(null)
const add = () => { editing.value = null; formOpen.value = true }
const edit = (d: Device) => { editing.value = d; formOpen.value = true }
</script>

<template>
  <ModuleShell v-model:active="tab" title="机器人设备管理" en="Robot Device" :menu="MENU">
    <DeviceDash v-if="tab === 'dash'" @list="toList" @open="openFromDash" />
    <template v-else-if="tab === 'list'">
      <DeviceDetail v-if="detailId" :id="detailId" @back="detailId = null" @teleop="teleop = $event" @edit="edit" />
      <DeviceList v-show="!detailId" :preset="preset" @open="detailId = $event.id" @teleop="teleop = $event" @edit="edit" @add="add" />
    </template>
    <ModelLib v-else-if="tab === 'models'" />

    <DeviceForm v-model:open="formOpen" :device="editing" />
    <DeviceTeleop v-if="teleop" :device="teleop" @exit="teleop = null" />
  </ModuleShell>
</template>
