<script setup lang="ts">
/** 型号管理：列表只显示关键信息，点击型号名称查看详情；规格在编辑弹窗中维护 */
import { computed, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined, AppstoreOutlined, SearchOutlined, MoreOutlined } from '@ant-design/icons-vue'
import TypeManager from './TypeManager.vue'
import ImagePick from '@/components/proto/ImagePick.vue'
import ModelDetail from './ModelDetail.vue'
import { useFitRows } from '@/components/proto/fitRows'
import { TYPES, TYPE_META, type DeviceModel, type DeviceType } from '@/models/device'
import { countOf, fleet, removeModel, saveModel } from './store'

const TYPE_OPTS = computed(() => TYPES.map((t) => ({ value: t, label: TYPE_META[t].label })))
const typesOpen = ref(false)
const type = ref<DeviceType>()
const host = ref<HTMLElement>()
const { size: pageSize } = useFitRows(host, 64)
const kw = ref('')
const rows = computed(() => { const k = kw.value.trim().toLowerCase(); return fleet.models.filter((m) => (!type.value || m.type === type.value) && (!k || [m.name, m.vendor].some((x) => x.toLowerCase().includes(k)))) })
const onlineOf = (id: string) => fleet.devices.filter((d) => d.modelId === id && d.status === 'online').length
/* 详情 */
const view = ref<DeviceModel | null>(null)
const viewOpen = ref(false)
const show = (m: DeviceModel) => { view.value = m; viewOpen.value = true }
const editFromView = (m: DeviceModel) => { viewOpen.value = false; edit(m) }
const columns = [
  { title: '型号', key: 'name', width: '24%' },
  { title: '类型', key: 'type', width: '18%' },
  { title: '摄像头', key: 'cams', width: '26%' },
  { title: '设备数量', key: 'n', width: '18%' },
  { title: '操作', key: 'op', align: 'right' as const },
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

  <section ref="host" class="pp-panel">
    <div class="pp-filter">
      <a-input v-model:value="kw" allow-clear placeholder="型号 / 厂商" style="width: 220px"><template #prefix><SearchOutlined /></template></a-input>
      <a-select v-model:value="type" allow-clear placeholder="设备类型" style="width: 130px" :options="TYPE_OPTS" />
      <a v-if="kw || type" class="reset" @click="kw = ''; type = undefined">重置</a>
      <span class="sum">共<b>{{ rows.length }}</b>个型号</span>
    </div>
    <a-table :data-source="rows" :columns="columns" row-key="id" size="middle" class="pp-table" :custom-row="(r: DeviceModel) => ({ onClick: () => show(r), style: 'cursor:pointer' })" :pagination="{ pageSize, showSizeChanger: false, size: 'small' }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'"><div class="pp-cell"><b class="ml-name" @click.stop="show(record as DeviceModel)">{{ record.name }}</b><small>{{ record.vendor }}</small></div></template>
        <template v-else-if="column.key === 'type'"><span class="ml-t"><i :style="{ background: TYPE_META[record.type as DeviceType]?.color }" />{{ TYPE_META[record.type as DeviceType]?.label }}</span></template>
        <template v-else-if="column.key === 'cams'"><div class="pp-cell"><span>{{ record.cameras.length }} 路</span><small>{{ record.cameras.join(' / ') }}</small></div></template>
        <template v-else-if="column.key === 'n'"><div class="pp-cell"><span>{{ countOf(record.id) }} 台</span><small>在线 {{ onlineOf(record.id) }}</small></div></template>
        <template v-else-if="column.key === 'op'">
          <div class="pp-op" @click.stop>
            <a-button type="link" size="small" @click="edit(record as DeviceModel)">编辑</a-button>
            <a-dropdown :trigger="['click']"><a-button type="text" size="small"><MoreOutlined /></a-button>
              <template #overlay><a-menu><a-menu-item key="del" danger :disabled="!!countOf(record.id)" @click="del(record as DeviceModel)">{{ countOf(record.id) ? '删除（该型号下还有设备）' : '删除' }}</a-menu-item></a-menu></template>
            </a-dropdown>
          </div>
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
          <a-form-item label="设备类型" class="mf-span"><a-select v-model:value="f.type" :disabled="!!editId && !!countOf(editId)" :options="TYPE_OPTS" /></a-form-item>
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
.ml-name { cursor: pointer; }
.ml-t { display: inline-flex; align-items: center; gap: 8px; } .ml-t i { width: 6px; height: 6px; border-radius: 50%; }
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
