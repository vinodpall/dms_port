<script setup lang="ts">
/** 新增 / 编辑设备 */
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { AREAS, OWNERS, TYPES, TYPE_META, type Device } from '@/models/device'
import { fleet, ipTaken, saveDevice } from './store'

const props = defineProps<{ open: boolean; device?: Device | null }>()
const emit = defineEmits<{ 'update:open': [boolean]; saved: [Device] }>()

const blank = () => ({ modelId: undefined as string | undefined, name: '', sn: '', ip: '', area: AREAS[0], owner: OWNERS[0], remark: '' })
const f = reactive(blank())
const formRef = ref()
const editing = computed(() => !!props.device)

watch(() => props.open, (v) => {
  if (!v) return
  const d = props.device
  Object.assign(f, d ? { modelId: d.modelId, name: d.name, sn: d.sn, ip: d.ip, area: d.area, owner: d.owner, remark: d.remark ?? '' } : blank())
  formRef.value?.clearValidate()
})

/** 型号按类型分组 */
const modelOptions = computed(() => TYPES.map((t) => ({ label: TYPE_META[t].label, options: fleet.models.filter((m) => m.type === t).map((m) => ({ value: m.id, label: `${m.name}（${m.vendor}）` })) })))

const IP_RE = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/
const rules = {
  modelId: [{ required: true, message: '请选择型号' }],
  name: [{ required: true, message: '请输入设备名称' }],
  sn: [{ required: true, message: '请输入序列号' }],
  ip: [{ required: true, validator: async (_: unknown, v: string) => {
    if (!v) throw new Error('请输入 IP 地址')
    if (!IP_RE.test(v)) throw new Error('IP 格式不正确')
    if (ipTaken(v, props.device?.id)) throw new Error('该 IP 已被其他设备占用')
  } }],
}

async function submit() {
  await formRef.value.validate()
  const m = fleet.models.find((x) => x.id === f.modelId)!
  const base = props.device
  const d: Device = base
    ? { ...base, ...f, modelId: m.id, type: m.type, remark: f.remark || undefined }
    : { id: `D-${Date.now().toString(36).toUpperCase()}`, ...f, modelId: m.id, type: m.type, remark: f.remark || undefined,
        status: 'offline', battery: 0, firmware: '—', commissioned: new Date().toISOString().slice(0, 10), lastSeen: '未接入',
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
        <a-col :span="12"><a-form-item label="IP 地址" name="ip"><a-input v-model:value="f.ip" placeholder="10.20.x.x" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="所属区域"><a-select v-model:value="f.area" :options="AREAS.map((v) => ({ value: v, label: v }))" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="负责人"><a-select v-model:value="f.owner" :options="OWNERS.map((v) => ({ value: v, label: v }))" /></a-form-item></a-col>
      </a-row>
      <a-form-item label="备注" style="margin-bottom: 0"><a-textarea v-model:value="f.remark" :rows="2" placeholder="选填" /></a-form-item>
    </a-form>
  </a-modal>
</template>
