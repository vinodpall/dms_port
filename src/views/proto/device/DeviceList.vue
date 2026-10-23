<script setup lang="ts">
/** 设备列表：下拉筛选 + 表格（每页行数按屏幕高度计算，一屏显示完整）；只展示关键信息，其余进详情查看 */
import { computed, reactive, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, MoreOutlined, DownOutlined, ImportOutlined, ExportOutlined, EnvironmentOutlined } from '@ant-design/icons-vue'
import AreaManager from './AreaManager.vue'
import { useFitRows } from '@/components/proto/fitRows'
import { AREAS, STATUSES, STATUS_META, TYPES, TYPE_META, canTeleop, isOnline, type Device, type DeviceStatus, type DeviceType } from '@/models/device'
import { fleet, modelOf, removeDevice } from './store'

const areasOpen = ref(false)
const props = defineProps<{ preset?: { type?: DeviceType; status?: DeviceStatus; model?: string; area?: string; n: number } | null }>()
const emit = defineEmits<{ open: [Device]; teleop: [Device]; edit: [Device]; add: [] }>()

const f = reactive({ type: undefined as DeviceType | undefined, model: undefined as string | undefined, status: undefined as DeviceStatus | undefined, area: undefined as string | undefined, kw: '' })
/* 从概览跳转过来时带入筛选 */
watch(() => props.preset?.n, () => { if (props.preset) Object.assign(f, { type: props.preset.type, status: props.preset.status, model: props.preset.model, area: props.preset.area, kw: '' }) }, { immediate: true })

const typeOpts = computed(() => TYPES.map((t) => ({ value: t, label: TYPE_META[t].label })))
const statusOpts = STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }))
watch(() => f.type, (t) => { if (f.model && fleet.models.find((m) => m.id === f.model)?.type !== t && t) f.model = undefined })
const dirty = computed(() => !!(f.type || f.model || f.status || f.area || f.kw))
const reset = () => Object.assign(f, { type: undefined, model: undefined, status: undefined, area: undefined, kw: '' })
const host = ref<HTMLElement>()
const { size: pageSize } = useFitRows(host, 64)
const modelOpts = computed(() => fleet.models.filter((m) => !f.type || m.type === f.type).map((m) => ({ value: m.id, label: m.name })))

/** 先按类型 / 型号 / 区域 / 关键字过滤，再统计状态（状态条既是统计也是筛选） */
const scoped = computed(() => {
  const kw = f.kw.trim().toLowerCase()
  return fleet.devices.filter((d) => (!f.type || d.type === f.type) && (!f.model || d.modelId === f.model) && (!f.area || d.area === f.area) &&
    (!kw || [d.name, d.sn, d.ip].some((s) => s.toLowerCase().includes(kw))))
})
const rows = computed(() => scoped.value.filter((d) => !f.status || d.status === f.status))

const columns = [
  { title: '设备', key: 'name', width: '17%' },
  { title: '型号', key: 'model', width: '17%' },
  { title: '状态', key: 'status', width: '14%' },
  { title: '电量', key: 'battery', width: '9%', sorter: (a: Device, b: Device) => a.battery - b.battery },
  { title: '网络地址', key: 'ip', width: '17%' },
  { title: '所属区域', dataIndex: 'area', width: '15%' },
  { title: '操作', key: 'op', align: 'right' as const },
]
const batColor = (b: number) => (b < 20 ? 'var(--bad)' : b < 40 ? 'var(--warn)' : 'var(--text)')

function del(d: Device) {
  Modal.confirm({ title: `删除设备「${d.name}」？`, content: '删除后该设备的档案与接入信息将一并移除，且不可恢复。', okText: '删除', okType: 'danger', cancelText: '取消',
    onOk: () => { removeDevice(d.id); message.success('已删除') } })
}
const onMenu = (key: string, d: Device) => (key === 'edit' ? emit('edit', d) : del(d))
</script>

<template>
  <div>
  <div class="pp-head">
    <div><h2>设备列表</h2><p>共 {{ fleet.devices.length }} 台设备，在线 {{ fleet.devices.filter(isOnline).length }} 台</p></div>
    <div class="r" style="margin-left:auto; display:flex; gap:8px">
      <a-button @click="areasOpen = true"><EnvironmentOutlined />所属区域</a-button>
      <a-dropdown><a-button>批量 <DownOutlined /></a-button>
        <template #overlay><a-menu><a-menu-item key="i"><ImportOutlined /> 批量导入</a-menu-item><a-menu-item key="e"><ExportOutlined /> 导出列表</a-menu-item></a-menu></template>
      </a-dropdown>
      <a-button type="primary" @click="emit('add')"><PlusOutlined />新增设备</a-button>
    </div>
  </div>

  <section ref="host" class="pp-panel dl-main">
      <div class="pp-filter">
        <a-input v-model:value="f.kw" allow-clear placeholder="名称 / 序列号 / IP" style="width: 220px"><template #prefix><SearchOutlined /></template></a-input>
        <a-select v-model:value="f.type" allow-clear placeholder="设备类型" style="width: 130px" :options="typeOpts" />
        <a-select v-model:value="f.model" allow-clear placeholder="型号" style="width: 140px" :options="modelOpts" show-search option-filter-prop="label" />
        <a-select v-model:value="f.status" allow-clear placeholder="状态" style="width: 110px" :options="statusOpts" />
        <a-select v-model:value="f.area" allow-clear placeholder="所属区域" style="width: 160px" :options="AREAS.map((v) => ({ value: v, label: v }))" />
        <a v-if="dirty" class="reset" @click="reset">重置</a>
        <span class="sum">共<b>{{ rows.length }}</b>台</span>
      </div>

      <a-table :data-source="rows" :columns="columns" row-key="id" size="middle" :pagination="{ pageSize, showSizeChanger: false, size: 'small', hideOnSinglePage: false }" class="pp-table"
        :custom-row="(r: Device) => ({ onClick: () => emit('open', r), style: 'cursor:pointer' })">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'"><div class="dl-2"><b>{{ record.name }}</b><small class="mono">{{ record.sn }}</small></div></template>
          <template v-else-if="column.key === 'model'"><div class="dl-2"><span>{{ modelOf(record)?.name ?? '—' }}</span><small>{{ TYPE_META[record.type as DeviceType]?.label }}<template v-if="modelOf(record)"> · {{ modelOf(record)?.vendor }}</template></small></div></template>
          <template v-else-if="column.key === 'status'">
            <div class="dl-2"><a-badge :status="STATUS_META[record.status as DeviceStatus].badge" :text="STATUS_META[record.status as DeviceStatus].label" /><small v-if="record.status === 'offline'">最后在线 {{ record.lastSeen }}</small></div>
          </template>
          <template v-else-if="column.key === 'battery'"><span class="mono" :style="{ color: isOnline(record) ? batColor(record.battery) : 'var(--muted)' }">{{ isOnline(record) ? record.battery + '%' : '—' }}</span></template>
          <template v-else-if="column.key === 'ip'"><div class="dl-2"><span class="mono">{{ record.ip }}</span><small v-if="record.publicIp" class="mono">外网 {{ record.publicIp }}</small></div></template>
          <template v-else-if="column.dataIndex === 'area'"><span class="dl-area">{{ record.area }}</span></template>
          <template v-else-if="column.key === 'op'">
            <div class="dl-op" @click.stop>
              <a-tooltip v-if="TYPE_META[record.type as DeviceType].teleop" :title="canTeleop(record) ? '' : '设备离线或故障，暂不可遥操作'">
                <a-button type="link" size="small" :disabled="!canTeleop(record)" @click="emit('teleop', record)">遥操作</a-button>
              </a-tooltip>
              <a-dropdown :trigger="['click']"><a-button type="text" size="small"><MoreOutlined /></a-button>
                <template #overlay><a-menu @click="({ key }: { key: string }) => onMenu(key, record)"><a-menu-item key="edit">编辑</a-menu-item><a-menu-item key="del" danger>删除</a-menu-item></a-menu></template>
              </a-dropdown>
            </div>
          </template>
        </template>
      </a-table>
  </section>
  <AreaManager v-model:open="areasOpen" />
  </div>
</template>

<style scoped>
.dl-main { min-width: 0; }
.dl-main :deep(.ant-table-tbody > tr > td) { height: 64px; padding-top: 0; padding-bottom: 0; }
.dl-main :deep(.ant-table-tbody > tr:hover b) { color: #2ED3E6; }
.dl-2 { display: flex; flex-direction: column; gap: 1px; line-height: 1.45; }
.dl-2 b { font-weight: 500; color: var(--title); transition: color .15s; }
.dl-2 small { font-size: 12px; color: var(--muted); white-space: nowrap; }
.dl-2 :deep(.ant-badge-status-text) { margin-inline-start: 6px; }
.dl-area { color: var(--text); }
.dl-op { display: flex; justify-content: flex-end; align-items: center; }
</style>
