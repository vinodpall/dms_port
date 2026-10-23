<script setup lang="ts">
/** 新增 / 编辑设备 */
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { SettingOutlined } from '@ant-design/icons-vue'
import AreaManager from './AreaManager.vue'
import { AREAS, STATUSES, STATUS_META, type Device, type DeviceStatus } from '@/models/device'
import { fleet, ipTaken, saveDevice } from './store'

const props = defineProps<{ open: boolean; device?: Device | null }>()
const emit = defineEmits<{ 'update:open': [boolean]; saved: [Device] }>()

const blank = () => ({
  modelId: undefined as string | undefined, name: '', sn: '', ip: '', publicIp: '', cams: '',
  area: AREAS[0], status: 'offline' as DeviceStatus, remark: '',
})
const f = reactive(blank())
const formRef = ref()
const areasOpen = ref(false)
const editing = computed(() => !!props.device)

watch(() => props.open, (v) => {
  if (!v) return
  const d = props.device
  Object.assign(f, d ? {
    modelId: d.modelId, name: d.name, sn: d.sn, ip: d.ip, publicIp: d.publicIp ?? '', cams: (d.cameraIps ?? []).join('; '),
    area: d.area, status: d.status, remark: d.remark ?? '',
  } : blank())
  formRef.value?.clearValidate()
})

const modelOptions = computed(() => fleet.models.map((m) => ({ value: m.id, label: `${m.name}（${m.vendor}）` })))

const IP_RE = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/
/** 相机地址：IP 或 rtsp 等流地址，支持中英文分号分隔 */
const splitCams = (v: string) => v.split(/[;；]/).map((x) => x.trim()).filter(Boolean)
const rules = {
  modelId: [{ required: true, message: '请选择型号' }],
  name: [{ required: true, message: '请输入设备名称' }],
  sn: [{ required: true, message: '请输入序列号' }],
  ip: [{ required: true, validator: async (_: unknown, v: string) => {
    if (!v) throw new Error('请输入内网 IP')
    if (!IP_RE.test(v)) throw new Error('IP 格式不正确')
    if (ipTaken(v, props.device?.id)) throw new Error('该 IP 已被其他设备占用')
  } }],
  publicIp: [{ validator: async (_: unknown, v: string) => { if (v && !IP_RE.test(v)) throw new Error('IP 格式不正确') } }],
}

async function submit() {
  await formRef.value.validate()
  const m = fleet.models.find((x) => x.id === f.modelId)!
  const base = props.device
  const { cams, ...rest } = f
  const v = { ...rest, modelId: m.id, type: m.type, publicIp: f.publicIp || undefined, cameraIps: splitCams(cams), remark: f.remark || undefined }
  const d: Device = base
    ? { ...base, ...v }
    : { id: `D-${Date.now().toString(36).toUpperCase()}`, ...v,
        battery: f.status === 'offline' ? 0 : 100, firmware: '—', commissioned: new Date().toISOString().slice(0, 10), lastSeen: f.status === 'offline' ? '未接入' : '刚刚',
        tm: { speed: 0, latency: 0, x: 0, y: 0, yaw: 0 } }
  saveDevice(d)
  message.success(base ? '已保存' : '设备已添加')
  emit('saved', d)
  emit('update:open', false)
}
</script>

<template>
  <a-modal :open="open" :title="editing ? '编辑设备' : '新增设备'" :width="560" :ok-text="editing ? '保存' : '添加'" @ok="submit" @cancel="emit('update:open', false)">
    <a-form ref="formRef" :model="f" :rules="rules" layout="vertical" style="margin-top: 12px">
      <a-form-item label="型号" name="modelId"><a-select v-model:value="f.modelId" placeholder="选择设备型号" :options="modelOptions" show-search option-filter-prop="label" /></a-form-item>
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="设备名称" name="name"><a-input v-model:value="f.name" placeholder="如：机器狗-15" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="序列号" name="sn"><a-input v-model:value="f.sn" placeholder="设备铭牌序列号" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="内网 IP" name="ip"><a-input v-model:value="f.ip" placeholder="如：10.20.1.15" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="外网 IP" name="publicIp"><a-input v-model:value="f.publicIp" placeholder="选填" /></a-form-item></a-col>
      </a-row>
      <a-form-item label="相机地址" name="cams" extra="填写 IP 或 rtsp 流地址，多个用分号 ; 分隔">
        <a-input v-model:value="f.cams" placeholder="如：10.20.1.101; rtsp://10.20.1.102/live" />
      </a-form-item>
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="所属区域">
          <div class="df-area"><a-select v-model:value="f.area" placeholder="选择区域" :options="AREAS.map((v) => ({ value: v, label: v }))" /><a-tooltip title="管理区域"><a-button @click="areasOpen = true"><SettingOutlined /></a-button></a-tooltip></div>
        </a-form-item></a-col>
        <a-col :span="12"><a-form-item label="状态">
          <a-radio-group v-model:value="f.status" button-style="solid" class="df-st"><a-radio-button v-for="s in STATUSES" :key="s" :value="s">{{ STATUS_META[s].label }}</a-radio-button></a-radio-group>
        </a-form-item></a-col>
      </a-row>
      <a-form-item label="备注" style="margin-bottom: 0"><a-textarea v-model:value="f.remark" :rows="2" placeholder="选填" /></a-form-item>
    </a-form>
  </a-modal>
  <AreaManager v-model:open="areasOpen" />
</template>

<style scoped>
.df-area { display: flex; gap: 8px; } .df-area > :first-child { flex: 1; min-width: 0; }
.df-st { display: flex; } .df-st :deep(.ant-radio-button-wrapper) { flex: 1; text-align: center; }
</style>
