<script setup lang="ts">
/** 型号管理：列表只显示关键信息，点击型号名称查看详情；规格在编辑弹窗中维护 */
import { computed, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined, AppstoreOutlined, SearchOutlined } from '@ant-design/icons-vue'
import TypeManager from './TypeManager.vue'
import ImagePick from '@/components/proto/ImagePick.vue'
import ModelDetail from './ModelDetail.vue'
import { TYPES, TYPE_META, type DeviceModel, type DeviceType } from '@/models/device'
import { countOf, fleet, removeModel, saveModel } from './store'

const TYPE_OPTS = computed(() => TYPES.map((t) => ({ value: t, label: TYPE_META[t].label })))
const typesOpen = ref(false)
const type = ref<DeviceType | 'all'>('all')
const kw = ref('')
const rows = computed(() => { const k = kw.value.trim().toLowerCase(); return fleet.models.filter((m) => (type.value === 'all' || m.type === type.value) && (!k || [m.name, m.vendor].some((x) => x.toLowerCase().includes(k)))) })
const onlineOf = (id: string) => fleet.devices.filter((d) => d.modelId === id && d.status === 'online').length
/* 详情 */
const view = ref<DeviceModel | null>(null)
const viewOpen = ref(false)
const show = (m: DeviceModel) => { view.value = m; viewOpen.value = true }
const editFromView = (m: DeviceModel) => { viewOpen.value = false; edit(m) }
const columns = [
  { title: '型号', key: 'name', width: 200 },
  { title: '厂商', dataIndex: 'vendor', width: 170 },
  { title: '类型', key: 'type', width: 140 },
  { title: '通信协议', dataIndex: 'protocol', width: 120 },
  { title: '摄像头', key: 'cams' },
  { title: '设备', key: 'n', width: 120 },
  { title: '操作', key: 'op', width: 120, align: 'right' as const },
]

/* 编辑 */
const open = ref(false)
const editId = ref<string | null>(null)
const blank = (): DeviceModel => ({ id: '', type: TYPES[0], name: '', vendor: '', protocol: 'ROS2', cameras: ['前视'], spec: { speed: '', endurance: '', payload: '', weight: '' }, voltMin: undefined, voltMax: undefined, size: undefined, image: undefined })
const f = reactive<DeviceModel>(blank())
const formRef = ref()
const edit = (m?: DeviceModel) => {
  editId.value = m?.id ?? null
  Object.assign(f, m ? { ...m, cameras: [...m.cameras], spec: { ...m.spec } } : blank())
  open.value = true; formRef.value?.clearValidate()
}
const rules = {
  voltMax: [{ validator: async (_: unknown, v?: number) => { if (v != null && f.voltMin != null && v < f.voltMin) throw new Error('最大电压不能小于最小电压') } }],
  name: [{ required: true, message: '请输入型号名称' }], vendor: [{ required: true, message: '请输入厂商' }], cameras: [{ required: true, type: 'array', min: 1, message: '至少配置一路摄像头' }] }
async function submit() {
  await formRef.value.validate()
  saveModel({ ...f, size: f.size || undefined, id: editId.value ?? `m-${Date.now().toString(36)}`, cameras: [...f.cameras], spec: { ...f.spec } })
  message.success(editId.value ? '已保存' : '型号已添加'); open.value = false
}
const del = (m: DeviceModel) => Modal.confirm({ title: `删除型号「${m.name}」？`, okText: '删除', okType: 'danger', cancelText: '取消', onOk: () => { removeModel(m.id); message.success('已删除') } })
</script>

<template>
  <div class="pp-head">
    <div><h2>型号管理</h2><p>维护设备型号的规格与摄像头配置，新增设备时选择型号即可带出</p></div>
    <div class="r" style="margin-left:auto; display:flex; gap:8px"><a-button @click="typesOpen = true"><AppstoreOutlined />设备类型</a-button><a-button type="primary" @click="edit()"><PlusOutlined />新增型号</a-button></div>
  </div>

  <section class="pp-panel">
    <div class="ml-bar">
      <a-input v-model:value="kw" allow-clear placeholder="型号 / 厂商" class="ml-q"><template #prefix><SearchOutlined class="muted" /></template></a-input>
      <a-radio-group v-model:value="type" button-style="solid">
        <a-radio-button value="all">全部</a-radio-button>
        <a-radio-button v-for="t in TYPES" :key="t" :value="t">{{ TYPE_META[t].label }}</a-radio-button>
      </a-radio-group>
    </div>
    <a-table :data-source="rows" :columns="columns" row-key="id" size="middle" :pagination="false">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'"><a class="ml-name" @click="show(record as DeviceModel)">{{ record.name }}</a></template>
        <template v-else-if="column.key === 'type'"><span class="ml-t"><i :style="{ background: TYPE_META[record.type as DeviceType]?.color }" />{{ TYPE_META[record.type as DeviceType]?.label }}</span></template>
        <template v-else-if="column.key === 'cams'"><span class="ml-cams"><b class="mono">{{ record.cameras.length }}</b> 路<span class="muted">{{ record.cameras.join(' / ') }}</span></span></template>
        <template v-else-if="column.key === 'n'"><span class="ml-cnt"><b class="mono">{{ countOf(record.id) }}</b> 台<small v-if="countOf(record.id)" class="muted">在线 {{ onlineOf(record.id) }}</small></span></template>
        <template v-else-if="column.key === 'op'">
          <a-button type="link" size="small" @click="edit(record as DeviceModel)">编辑</a-button>
          <a-tooltip :title="countOf(record.id) ? '该型号下还有设备，不能删除' : ''"><a-button type="link" size="small" danger :disabled="!!countOf(record.id)" @click="del(record as DeviceModel)">删除</a-button></a-tooltip>
        </template>
      </template>
    </a-table>
  </section>

  <a-modal v-model:open="open" :title="editId ? '编辑型号' : '新增型号'" :width="680" :ok-text="editId ? '保存' : '添加'" @ok="submit">
    <a-form ref="formRef" :model="f" :rules="rules" layout="vertical" class="mf">
      <div class="mf-top">
        <a-form-item label="型号图片" class="mf-pic"><ImagePick v-model:value="f.image" :width="176" :height="194" hint="建议透明底 PNG" /></a-form-item>
        <div class="mf-base">
          <a-form-item label="型号名称" name="name"><a-input v-model:value="f.name" placeholder="如：B2" /></a-form-item>
          <a-form-item label="厂商" name="vendor"><a-input v-model:value="f.vendor" placeholder="如：宇树科技" /></a-form-item>
          <a-form-item label="设备类型"><a-select v-model:value="f.type" :disabled="!!editId && !!countOf(editId)" :options="TYPE_OPTS" /></a-form-item>
          <a-form-item label="通信协议"><a-select v-model:value="f.protocol" :options="['ROS2', 'SDK', 'MAVLink'].map((v) => ({ value: v, label: v }))" /></a-form-item>
          <a-form-item label="摄像头" name="cameras" class="mf-span"><a-select v-model:value="f.cameras" mode="tags" placeholder="输入摄像头名称后回车，如：前视" /></a-form-item>
        </div>
      </div>
      <div class="mf-sec"><span>规格参数</span><small class="muted">选填，用于型号详情展示</small></div>
      <div class="mf-spec">
        <a-form-item label="最高速度"><a-input v-model:value="f.spec.speed" placeholder="如：3.7 m/s" /></a-form-item>
        <a-form-item label="续航"><a-input v-model:value="f.spec.endurance" placeholder="如：2 h" /></a-form-item>
        <a-form-item label="负载"><a-input v-model:value="f.spec.payload" placeholder="如：8 kg" /></a-form-item>
        <a-form-item label="重量"><a-input v-model:value="f.spec.weight" placeholder="如：15 kg" /></a-form-item>
        <a-form-item label="工作电压" name="voltMax">
          <a-form-item-rest><div class="mf-volt"><a-input-number v-model:value="f.voltMin" :min="0" :step="0.1" placeholder="最小" :controls="false" /><span>~</span><a-input-number v-model:value="f.voltMax" :min="0" :step="0.1" placeholder="最大" :controls="false" /><em>V</em></div></a-form-item-rest>
        </a-form-item>
        <a-form-item label="尺寸（长×宽×高）"><a-input v-model:value="f.size" placeholder="如：1098×450×645" suffix="mm" /></a-form-item>
      </div>
    </a-form>
  </a-modal>
  <ModelDetail v-model:open="viewOpen" :model="view" @edit="editFromView" />
  <TypeManager v-model:open="typesOpen" />
</template>

<style scoped>
.ml-bar { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--line); }
.ml-q { order: 2; margin-left: auto; width: 220px; }
.ml-name { color: var(--title); font-weight: 500; } .ml-name:hover { color: #2ED3E6; text-decoration: underline; text-underline-offset: 3px; }
.ml-t { display: inline-flex; align-items: center; gap: 8px; } .ml-t i { width: 6px; height: 6px; border-radius: 50%; }
.ml-cams { display: inline-flex; align-items: baseline; gap: 4px; min-width: 0; max-width: 100%; white-space: nowrap; }
.ml-cams b, .ml-cnt b { font-weight: 500; color: var(--title); }
.ml-cams .muted { margin-left: 8px; font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; }
.ml-cnt { display: inline-flex; align-items: baseline; gap: 4px; } .ml-cnt small { margin-left: 8px; font-size: 12px; }
.mf { margin-top: 16px; }
.mf-top { display: flex; gap: 20px; }
.mf-pic { flex: none; margin-bottom: 0; }
.mf-base { flex: 1; min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: 16px; }
.mf-span { grid-column: 1 / -1; }
.mf-sec { display: flex; align-items: baseline; gap: 10px; margin: 14px 0 14px; padding-top: 16px; border-top: 1px dashed var(--line); }
.mf-sec span { font-weight: 500; color: var(--title); } .mf-sec small { font-size: 12px; }
.mf-spec { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 16px; }
.mf-spec :deep(.ant-form-item) { margin-bottom: 16px; }
.mf-volt { display: flex; align-items: center; height: 32px; border: 1px solid var(--ant-color-border, rgba(120,150,190,.35)); border-radius: 6px; padding-right: 10px; }
.mf-volt :deep(.ant-input-number) { flex: 1; min-width: 0; border: 0; box-shadow: none; background: transparent; }
.mf-volt span, .mf-volt em { color: var(--muted); font-style: normal; }
</style>
