<script setup lang="ts">
/** 设备列表：左侧「类型 → 型号」树，右侧状态筛选 + 表格；只展示关键信息，其余进详情查看 */
import { computed, reactive, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, MoreOutlined, DownOutlined, ImportOutlined, ExportOutlined } from '@ant-design/icons-vue'
import DeviceGlyph from '@/components/proto/DeviceGlyph.vue'
import { AREAS, STATUSES, STATUS_META, TYPES, TYPE_META, canTeleop, isOnline, type Device, type DeviceStatus, type DeviceType } from '@/models/device'
import { fleet, modelOf, removeDevice } from './store'

const props = defineProps<{ preset?: { type?: DeviceType; status?: DeviceStatus; model?: string; area?: string; n: number } | null }>()
const emit = defineEmits<{ open: [Device]; teleop: [Device]; edit: [Device]; add: [] }>()

const f = reactive({ type: undefined as DeviceType | undefined, model: undefined as string | undefined, status: undefined as DeviceStatus | undefined, area: undefined as string | undefined, kw: '' })
/* 从概览跳转过来时带入筛选 */
watch(() => props.preset?.n, () => { if (props.preset) Object.assign(f, { type: props.preset.type, status: props.preset.status, model: props.preset.model, area: props.preset.area, kw: '' }) }, { immediate: true })

const typeTabs = computed(() => [{ k: 'all', l: '全部', n: fleet.devices.length }, ...TYPES.map((t) => ({ k: t, l: TYPE_META[t].label, n: fleet.devices.filter((d) => d.type === t).length }))])
const tabKey = computed({ get: () => f.type ?? 'all', set: (v: string) => { f.type = v === 'all' ? undefined : (v as DeviceType); f.model = undefined } })
const modelOpts = computed(() => fleet.models.filter((m) => !f.type || m.type === f.type).map((m) => ({ value: m.id, label: m.name })))

/** 先按类型 / 型号 / 区域 / 关键字过滤，再统计状态（状态条既是统计也是筛选） */
const scoped = computed(() => {
  const kw = f.kw.trim().toLowerCase()
  return fleet.devices.filter((d) => (!f.type || d.type === f.type) && (!f.model || d.modelId === f.model) && (!f.area || d.area === f.area) &&
    (!kw || [d.name, d.sn, d.ip].some((s) => s.toLowerCase().includes(kw))))
})
const rows = computed(() => scoped.value.filter((d) => !f.status || d.status === f.status))
const stat = (s: DeviceStatus) => scoped.value.filter((d) => d.status === s).length

const columns = [
  { title: '设备', key: 'name' },
  { title: '型号', key: 'model', width: 150 },
  { title: '状态', key: 'status', width: 110 },
  { title: '电量', key: 'battery', width: 90, sorter: (a: Device, b: Device) => a.battery - b.battery },
  { title: 'IP 地址', dataIndex: 'ip', width: 130 },
  { title: '所属区域', dataIndex: 'area', width: 160 },
  { title: '操作', key: 'op', width: 120, align: 'right' as const },
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
      <a-dropdown><a-button>批量 <DownOutlined /></a-button>
        <template #overlay><a-menu><a-menu-item key="i"><ImportOutlined /> 批量导入</a-menu-item><a-menu-item key="e"><ExportOutlined /> 导出列表</a-menu-item></a-menu></template>
      </a-dropdown>
      <a-button type="primary" @click="emit('add')"><PlusOutlined />新增设备</a-button>
    </div>
  </div>

  <section class="pp-panel dl-main">
      <a-tabs v-model:active-key="tabKey" class="dl-tabs">
        <a-tab-pane v-for="t in typeTabs" :key="t.k"><template #tab>{{ t.l }} <span class="dl-n">{{ t.n }}</span></template></a-tab-pane>
      </a-tabs>
      <div class="dl-bar">
        <div class="dl-stat">
          <button type="button" :class="{ on: !f.status }" @click="f.status = undefined">全部 <b>{{ scoped.length }}</b></button>
          <button v-for="s in STATUSES" :key="s" type="button" :class="{ on: f.status === s }" @click="f.status = f.status === s ? undefined : s"><a-badge :status="STATUS_META[s].badge" />{{ STATUS_META[s].label }} <b>{{ stat(s) }}</b></button>
        </div>
        <div class="dl-q">
          <a-select v-model:value="f.model" allow-clear placeholder="型号" style="width: 130px" :options="modelOpts" />
          <a-select v-model:value="f.area" allow-clear placeholder="所属区域" style="width: 150px" :options="AREAS.map((v) => ({ value: v, label: v }))" />
          <a-input v-model:value="f.kw" allow-clear placeholder="名称 / 序列号 / IP" style="width: 190px"><template #prefix><SearchOutlined class="muted" /></template></a-input>
        </div>
      </div>

      <a-table :data-source="rows" :columns="columns" row-key="id" size="middle" :pagination="{ pageSize: 12, showSizeChanger: false, size: 'small' }"
        :custom-row="(r: Device) => ({ onClick: () => emit('open', r), style: 'cursor:pointer' })">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="dl-dev"><DeviceGlyph :type="record.type" :size="26" :color="TYPE_META[record.type as DeviceType].color" /><div><b>{{ record.name }}</b><small class="mono muted">{{ record.sn }}</small></div></div>
          </template>
          <template v-else-if="column.key === 'model'">{{ modelOf(record)?.name }}</template>
          <template v-else-if="column.key === 'status'">
            <a-tooltip v-if="record.status === 'offline'" :title="`最后在线：${record.lastSeen}`"><a-badge status="default" text="离线" /></a-tooltip>
            <a-badge v-else :status="STATUS_META[record.status as DeviceStatus].badge" :text="STATUS_META[record.status as DeviceStatus].label" />
          </template>
          <template v-else-if="column.key === 'battery'"><span class="mono" :style="{ color: batColor(record.battery) }">{{ isOnline(record) ? record.battery + '%' : '—' }}</span></template>
          <template v-else-if="column.dataIndex === 'ip'"><span class="mono">{{ record.ip }}</span></template>
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
  </div>
</template>

<style scoped>
.dl-main { min-width: 0; }
.dl-tabs { padding: 0 16px; }
.dl-tabs :deep(.ant-tabs-nav) { margin: 0; }
.dl-n { margin-left: 4px; font-size: 12px; color: var(--muted); font-family: var(--mono); }
.dl-main :deep(.ant-table-tbody > tr > td) { padding-top: 10px; padding-bottom: 10px; }
.dl-bar { display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
.dl-stat { display: flex; gap: 4px; }
.dl-stat button { display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 12px; border: 1px solid transparent; border-radius: 4px; background: none; color: var(--muted); font: inherit; font-size: 13px; cursor: pointer; }
.dl-stat button b { color: var(--text); font-weight: 600; font-family: var(--mono); margin-left: 2px; }
.dl-stat button:hover { color: var(--text); }
.dl-stat button.on { border-color: rgba(46,211,230,.35); background: rgba(46,211,230,.08); color: var(--title); }
.dl-stat :deep(.ant-badge-status-dot) { top: -1px; }
.dl-q { margin-left: auto; display: flex; gap: 8px; }
.dl-dev { display: flex; align-items: center; gap: 10px; }
.dl-dev b { display: block; font-weight: 500; }
.dl-dev small { display: block; font-size: 11.5px; line-height: 1.4; }
.dl-op { display: flex; justify-content: flex-end; align-items: center; }
</style>
