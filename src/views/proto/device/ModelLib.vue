<script setup lang="ts">
/** 型号管理：列表只显示型号、类型、摄像头数、设备数；规格在编辑弹窗中维护 */
import { computed, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined, AppstoreOutlined } from '@ant-design/icons-vue'
import TypeManager from './TypeManager.vue'
import ImagePick from '@/components/proto/ImagePick.vue'
import DeviceGlyph from '@/components/proto/DeviceGlyph.vue'
import { TYPES, TYPE_META, type DeviceModel, type DeviceType } from '@/models/device'
import { countOf, fleet, removeModel, saveModel } from './store'

const TYPE_OPTS = computed(() => TYPES.map((t) => ({ value: t, label: TYPE_META[t].label })))
const typesOpen = ref(false)
const type = ref<DeviceType | 'all'>('all')
const rows = computed(() => fleet.models.filter((m) => type.value === 'all' || m.type === type.value))
const columns = [
  { title: '型号', key: 'name' },
  { title: '类型', key: 'type', width: 140 },
  { title: '通信协议', dataIndex: 'protocol', width: 120 },
  { title: '摄像头', key: 'cams', width: 100 },
  { title: '设备数', key: 'n', width: 90 },
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
      <a-radio-group v-model:value="type" button-style="solid">
        <a-radio-button value="all">全部</a-radio-button>
        <a-radio-button v-for="t in TYPES" :key="t" :value="t">{{ TYPE_META[t].label }}</a-radio-button>
      </a-radio-group>
    </div>
    <a-table :data-source="rows" :columns="columns" row-key="id" size="middle" :pagination="false">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'"><div class="ml-row"><span class="ml-img"><img v-if="record.image" :src="record.image" alt="" /><DeviceGlyph v-else :type="record.type" :size="26" :color="TYPE_META[record.type].color" /></span><div class="ml-n"><b>{{ record.name }}</b><small class="muted">{{ record.vendor }}</small></div></div></template>
        <template v-else-if="column.key === 'type'"><span class="ml-t"><DeviceGlyph :type="record.type" :size="20" :color="TYPE_META[record.type as DeviceType].color" />{{ TYPE_META[record.type as DeviceType].label }}</span></template>
        <template v-else-if="column.key === 'cams'"><a-tooltip :title="record.cameras.join('、')"><span class="mono">{{ record.cameras.length }} 路</span></a-tooltip></template>
        <template v-else-if="column.key === 'n'"><span class="mono">{{ countOf(record.id) }}</span></template>
        <template v-else-if="column.key === 'op'">
          <a-button type="link" size="small" @click="edit(record as DeviceModel)">编辑</a-button>
          <a-tooltip :title="countOf(record.id) ? '该型号下还有设备，不能删除' : ''"><a-button type="link" size="small" danger :disabled="!!countOf(record.id)" @click="del(record as DeviceModel)">删除</a-button></a-tooltip>
        </template>
      </template>
    </a-table>
  </section>

  <a-modal v-model:open="open" :title="editId ? '编辑型号' : '新增型号'" :width="560" :ok-text="editId ? '保存' : '添加'" @ok="submit">
    <a-form ref="formRef" :model="f" :rules="rules" layout="vertical" style="margin-top: 12px">
      <a-form-item label="型号图片">
        <ImagePick v-model:value="f.image" :size="120" hint="用于设备详情展示，建议透明底 PNG；上传后自动裁掉多余留白" />
      </a-form-item>
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="设备类型"><a-select v-model:value="f.type" :disabled="!!editId && !!countOf(editId)" :options="TYPE_OPTS" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="通信协议"><a-select v-model:value="f.protocol" :options="['ROS2', 'SDK', 'MAVLink'].map((v) => ({ value: v, label: v }))" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="型号名称" name="name"><a-input v-model:value="f.name" placeholder="如：B2" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="厂商" name="vendor"><a-input v-model:value="f.vendor" placeholder="如：宇树科技" /></a-form-item></a-col>
      </a-row>
      <a-form-item label="摄像头" name="cameras"><a-select v-model:value="f.cameras" mode="tags" placeholder="输入摄像头名称后回车，如：前视" /></a-form-item>
      <a-row :gutter="16">
        <a-col :span="6"><a-form-item label="最高速度"><a-input v-model:value="f.spec.speed" placeholder="m/s" /></a-form-item></a-col>
        <a-col :span="6"><a-form-item label="续航"><a-input v-model:value="f.spec.endurance" /></a-form-item></a-col>
        <a-col :span="6"><a-form-item label="负载"><a-input v-model:value="f.spec.payload" /></a-form-item></a-col>
        <a-col :span="6"><a-form-item label="重量"><a-input v-model:value="f.spec.weight" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="最小电压"><a-input-number v-model:value="f.voltMin" :min="0" :step="0.1" addon-after="V" placeholder="如：42" style="width: 100%" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="最大电压" name="voltMax"><a-input-number v-model:value="f.voltMax" :min="0" :step="0.1" addon-after="V" placeholder="如：58.8" style="width: 100%" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="尺寸（长×宽×高）"><a-input v-model:value="f.size" placeholder="如：1098×450×645" suffix="mm" /></a-form-item></a-col>
      </a-row>
    </a-form>
  </a-modal>
  <TypeManager v-model:open="typesOpen" />
</template>

<style scoped>
.ml-bar { padding: 12px 16px; border-bottom: 1px solid var(--line); }
.ml-row { display: flex; align-items: center; gap: 12px; }
.ml-img { width: 48px; height: 40px; flex: none; display: grid; place-items: center; border-radius: 6px; background: rgba(46,211,230,.06); overflow: hidden; }
.ml-img img { max-width: 44px; max-height: 36px; object-fit: contain; }
.ml-n b { display: block; font-weight: 500; } .ml-n small { font-size: 12px; }
.ml-t { display: inline-flex; align-items: center; gap: 8px; }
</style>
