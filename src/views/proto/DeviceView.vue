<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  DashboardOutlined, DatabaseOutlined, AppstoreOutlined, ToolOutlined, RightOutlined, PlusOutlined, ImportOutlined, ExportOutlined,
  UnorderedListOutlined, SearchOutlined, MoreOutlined, ControlOutlined, EyeOutlined, ThunderboltOutlined, WifiOutlined,
  AlertOutlined, ReloadOutlined, CopyOutlined,
} from '@ant-design/icons-vue'
import ModuleShell from '@/components/proto/ModuleShell.vue'
import DeviceGlyph from '@/components/proto/DeviceGlyph.vue'
import DonutChart from '@/components/proto/DonutChart.vue'
import LineChart from '@/components/proto/LineChart.vue'
import { pad } from '@/utils'
import { DEVICES } from '@/mock/devices'
import { TYPE_META, STATUS_META, CAP_META, type Device, type DeviceType, type DeviceStatus, type Capability } from '@/models/device'

document.title = '机器人设备管理 · 具身智能训练场'
const MENU = [
  { key: 'dash', label: '设备概览', icon: DashboardOutlined, group: '概览' },
  { key: 'list', label: '设备台账', icon: DatabaseOutlined, group: '设备资产' },
  { key: 'models', label: '型号库', icon: AppstoreOutlined, group: '设备资产' },
  { key: 'maint', label: '维保记录', icon: ToolOutlined, group: '运维保障' },
]
const tab = ref('dash')

/* ---------- 统计 ---------- */
const count = (s: DeviceStatus) => DEVICES.filter((d) => d.status === s).length
const KPIS = computed(() => [
  { label: '设备总数', v: DEVICES.length, unit: '台', k: '#4DD0E1' },
  { label: '运行中', v: count('working'), unit: '台', k: '#26C6DA' },
  { label: '在线空闲', v: count('online'), unit: '台', k: '#4DE8B0' },
  { label: '充电中', v: count('charging'), unit: '台', k: '#FFB74D' },
  { label: '离线', v: count('offline'), unit: '台', k: '#5B7486' },
  { label: '故障告警', v: count('fault'), unit: '台', k: '#FF6B6B' },
])
const TYPES = Object.keys(TYPE_META) as DeviceType[]

/* ---------- 概览 ---------- */
const STATUSES = Object.keys(STATUS_META) as DeviceStatus[]
const isOn = (d: Device) => d.status !== 'offline' && d.status !== 'fault'
const onlineN = DEVICES.filter(isOn).length
const statusDonut = STATUSES.map((s) => ({ label: STATUS_META[s].label, color: STATUS_META[s].color, value: count(s) }))
const typeStats = TYPES.map((t) => {
  const ds = DEVICES.filter((d) => d.type === t)
  const on = ds.filter(isOn)
  return { t, n: ds.length, on: on.length, rate: Math.round((on.length / ds.length) * 100), bat: Math.round(on.reduce((a, d) => a + d.battery, 0) / (on.length || 1)),
    hours: ds.reduce((a, d) => a + d.hours, 0), seg: STATUSES.map((s) => ({ s, n: ds.filter((d) => d.status === s).length })).filter((x) => x.n) }
})
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const trendOn = HOURS.map((h) => Math.round(22 + 6 * Math.sin(((h - 4) / 24) * Math.PI * 2 - 1) + (h % 5) * 0.6))
const trendRun = HOURS.map((h, i) => Math.max(2, Math.round(trendOn[i] * (h >= 8 && h <= 20 ? 0.62 : 0.2))))
const trendLabels = HOURS.map((h) => (h % 4 === 0 ? pad(h) + ':00' : ''))
const ALERTS = [
  ...DEVICES.filter((d) => d.status === 'fault').map((d, i) => ({ lv: 'error', d, m: ['关节电机过流（E-2031）', '激光雷达通信超时', '电池温度过高 61℃', '主控板看门狗复位', '螺旋桨转速异常'][i % 5], t: `${pad(9 - i)}:${pad(42 - i * 7)}` })),
  ...DEVICES.filter((d) => isOn(d) && d.battery < 45).slice(0, 3).map((d, i) => ({ lv: 'warning', d, m: `电量偏低 ${d.battery}%`, t: `${pad(8 - i)}:${pad(15 + i * 9)}` })),
]
const TOP_HOURS = [...DEVICES].sort((a, b) => b.hours - a.hours).slice(0, 5)
const gotoType = (t: DeviceType | 'all') => { f.type = t; tab.value = 'list' }

const WEEK_ALERTS = ['10-14', '10-15', '10-16', '10-17', '10-18', '10-19', '10-20'].map((d, i) => ({ d, e: [2, 1, 3, 0, 2, 1, 5][i], w: [4, 6, 3, 5, 2, 3, 3][i] }))
const WEEK_MAX = Math.max(...WEEK_ALERTS.map((w) => w.e + w.w))

/* ---------- 筛选 ---------- */
const f = reactive({ type: 'all' as DeviceType | 'all', status: undefined as DeviceStatus | undefined, group: undefined as string | undefined, kw: '' })
const view = ref<'table' | 'card'>('table')
const groups = [...new Set(DEVICES.map((d) => d.group))]
const rows = computed(() => DEVICES.filter((d) =>
  (f.type === 'all' || d.type === f.type) && (!f.status || d.status === f.status) && (!f.group || d.group === f.group) &&
  (!f.kw || `${d.name}${d.sn}${d.model}${d.id}`.toLowerCase().includes(f.kw.toLowerCase()))))
const reset = () => Object.assign(f, { type: 'all', status: undefined, group: undefined, kw: '' })

const columns = [
  { title: '设备', key: 'name', width: 230, fixed: 'left' },
  { title: '类型', key: 'type', width: 120 },
  { title: '型号 / 厂商', key: 'model', width: 150 },
  { title: '状态', key: 'status', width: 170 },
  { title: '电量', key: 'battery', width: 140, sorter: (a: Device, b: Device) => a.battery - b.battery },
  { title: '信号', key: 'signal', width: 70 },
  { title: '存放库位', dataIndex: 'location', width: 140 },
  { title: '分组', dataIndex: 'group', width: 90 },
  { title: '能力标签', key: 'caps', width: 250 },
  { title: '最后在线', dataIndex: 'lastSeen', width: 100 },
  { title: '操作', key: 'op', width: 150, fixed: 'right' },
]
const capsText = (cs: Capability[]) => cs.map((c) => CAP_META[c]).join('、')
const batColor = (b: number) => (b < 20 ? '#FF6B6B' : b < 50 ? '#FFB74D' : '#4DE8B0')
const selectedKeys = ref<string[]>([])

/* ---------- 详情 ---------- */
const cur = ref<Device | null>(null)
const open = (d: Device) => { cur.value = d }
const MAINT = [
  { t: '2026-09-28', c: '例行保养：关节润滑、紧固件检查', who: '赵工', type: '保养' },
  { t: '2026-08-15', c: '更换左膝关节电机编码器', who: '赵工', type: '维修' },
  { t: '2026-07-02', c: '固件升级 v2.3.1 → v2.4.0', who: '周工', type: '升级' },
  { t: '2026-05-20', c: '入场验收，完成标定', who: '周工', type: '验收' },
]
/* ---------- 新增 ---------- */
const addOpen = ref(false)
const form = reactive({ type: 'quadruped' as DeviceType, name: '', sn: '', model: undefined, group: undefined, protocol: 'ROS2', ip: '', caps: ['patrol'] as string[] })
const submitAdd = () => { addOpen.value = false; message.success('设备已创建（原型演示）') }

/* ---------- 型号库 / 维保 ---------- */
const MODEL_LIB = computed(() => {
  const m = new Map<string, { d: Device; n: number }>()
  DEVICES.forEach((d) => { const k = d.model; const e = m.get(k); e ? e.n++ : m.set(k, { d, n: 1 }) })
  return [...m.values()]
})
const MAINT_ROWS = DEVICES.slice(0, 14).map((d, i) => ({ key: i, dev: d, type: ['保养', '维修', '升级', '巡检'][i % 4], content: ['关节润滑与紧固检查', '更换电池模组', '固件升级 v2.4.0', '传感器标定', '螺旋桨更换', '电机过热排查'][i % 6], who: ['赵工', '周工'][i % 2], date: `2026-${String(10 - (i % 9)).padStart(2, '0')}-${String(28 - i).padStart(2, '0')}`, state: i < 3 ? '进行中' : '已完成' }))
</script>

<template>
  <ModuleShell v-model:active="tab" title="机器人设备管理" en="Robot Device" :menu="MENU">
    <!-- ================= 设备概览 ================= -->
    <template v-if="tab === 'dash'">
      <div class="pp-head">
        <div><h2>设备概览</h2><p>训练场机器人设备总体运行态势</p></div>
      </div>
      <div class="pp-kpis">
        <div v-for="k in KPIS" :key="k.label" class="pp-kpi" :style="{ '--k': k.k }">
          <small><i class="kdot" :style="{ background: k.k }" />{{ k.label }}</small>
          <b>{{ k.v }}<em>{{ k.unit }}</em></b><span class="bar" />
        </div>
      </div>

      <!-- 五类设备 -->
      <div class="db-types">
        <div v-for="x in typeStats" :key="x.t" class="db-type" :style="{ '--c': TYPE_META[x.t].color }" @click="gotoType(x.t)">
          <div class="db-type-h">
            <span class="ic"><DeviceGlyph :type="x.t" :size="44" :color="TYPE_META[x.t].color" /></span>
            <div><b>{{ TYPE_META[x.t].label }}</b><small>{{ x.n }} 台 · 在线 {{ x.on }}</small></div>
            <RightOutlined class="go" />
          </div>
          <div class="db-type-rate"><span>在线率</span><b class="mono">{{ x.rate }}<em>%</em></b></div>
          <div class="db-seg"><i v-for="g in x.seg" :key="g.s" :style="{ flex: g.n, background: STATUS_META[g.s].color }"><a-tooltip :title="`${STATUS_META[g.s].label} ${g.n} 台`"><span /></a-tooltip></i></div>
          <div class="db-type-f"><span>平均电量 <b class="mono">{{ x.bat }}%</b></span><span>累计 <b class="mono">{{ x.hours.toLocaleString('en-US') }}</b> h</span></div>
        </div>
      </div>

      <div class="db-row">
        <div class="pp-panel db-p">
          <div class="pp-panel-h"><h3>设备状态分布</h3></div>
          <div class="db-donut">
            <DonutChart :data="statusDonut" :size="180" :title="`${onlineN}`" sub="在线设备" />
            <ul>
              <li v-for="s in statusDonut" :key="s.label"><i :style="{ background: s.color }" />{{ s.label }}<b class="mono">{{ s.value }}</b><span class="mono muted">{{ Math.round((s.value / DEVICES.length) * 100) }}%</span></li>
            </ul>
          </div>
        </div>
        <div class="pp-panel db-p">
          <div class="pp-panel-h"><h3>24 小时在线趋势</h3><span class="db-lg"><i style="background:#4DD0E1" />在线<i style="background:#4DE8B0" />运行中</span></div>
          <div style="padding: 10px 14px 6px"><LineChart :series="[{ name: '在线', color: '#4DD0E1', data: trendOn }, { name: '运行中', color: '#4DE8B0', data: trendRun }]" :labels="trendLabels" :height="206" :min="0" :max="36" /></div>
        </div>
        <div class="pp-panel db-p">
          <div class="pp-panel-h"><h3>实时告警</h3><a-tag color="error" style="margin-left:6px">{{ ALERTS.length }}</a-tag><a class="r" style="font-size:12px">全部</a></div>
          <ul class="db-alerts">
            <li v-for="a in ALERTS" :key="a.d.id + a.m" :class="a.lv" @click="open(a.d)">
              <i class="lv" /><span class="mono muted">{{ a.t }}</span><b>{{ a.d.name }}</b><span class="m">{{ a.m }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="db-row b">
        <div class="pp-panel db-p">
          <div class="pp-panel-h"><h3>累计运行时长 TOP5</h3><span class="muted r" style="font-size:12px">单位：小时</span></div>
          <ul class="db-list">
            <li v-for="(d, i) in TOP_HOURS" :key="d.id"><em class="mono">{{ i + 1 }}</em><b>{{ d.name }}</b><div class="db-bar"><i :style="{ width: (d.hours / TOP_HOURS[0].hours) * 100 + '%', background: TYPE_META[d.type].color }" /></div><span class="mono">{{ d.hours.toLocaleString('en-US') }}</span></li>
          </ul>
        </div>
        <div class="pp-panel db-p">
          <div class="pp-panel-h"><h3>近 7 天告警统计</h3><span class="db-lg r"><i class="sq" style="background:#FF6B6B" />故障<i class="sq" style="background:#FFB74D" />预警</span></div>
          <div class="db-wk">
            <div v-for="w in WEEK_ALERTS" :key="w.d" class="db-wk-c">
              <span class="mono n">{{ w.e + w.w }}</span>
              <div class="bars"><i class="w" :style="{ height: (w.w / WEEK_MAX) * 100 + '%' }" /><i class="e" :style="{ height: (w.e / WEEK_MAX) * 100 + '%' }" /></div>
              <small class="mono">{{ w.d }}</small>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ================= 设备台账 ================= -->
    <template v-else-if="tab === 'list'">
      <div class="pp-head">
        <div><h2>设备台账</h2><p>统一管理训练场全部机器人设备档案、运行状态与接入信息</p></div>
        <div class="r">
          <a-button><ImportOutlined />批量导入</a-button>
          <a-button><ExportOutlined />导出</a-button>
          <a-button type="primary" @click="addOpen = true"><PlusOutlined />新增设备</a-button>
        </div>
      </div>


      <!-- 类型分类卡 -->
      <div class="dv-types">
        <button type="button" class="dv-type" :class="{ on: f.type === 'all' }" @click="f.type = 'all'">
          <span class="ic all"><AppstoreOutlined /></span><span><b>全部设备</b><small>{{ DEVICES.length }} 台</small></span>
        </button>
        <button v-for="t in TYPES" :key="t" type="button" class="dv-type" :class="{ on: f.type === t }" :style="{ '--c': TYPE_META[t].color }" @click="f.type = t">
          <span class="ic"><DeviceGlyph :type="t" :size="34" :color="TYPE_META[t].color" /></span>
          <span><b>{{ TYPE_META[t].label }}</b><small>{{ DEVICES.filter((d) => d.type === t).length }} 台 · 在线 {{ DEVICES.filter((d) => d.type === t && d.status !== 'offline').length }}</small></span>
        </button>
      </div>

      <div class="pp-panel">
        <div class="pp-panel-h">
          <h3>设备列表</h3><span class="muted" style="font-size:12px">共 {{ rows.length }} 台</span>
          <div class="r">
            <a-input v-model:value="f.kw" allow-clear placeholder="搜索名称 / 编号 / 型号" style="width: 220px"><template #prefix><SearchOutlined class="muted" /></template></a-input>
            <a-select v-model:value="f.status" allow-clear placeholder="全部状态" style="width: 120px" :options="Object.entries(STATUS_META).map(([v, m]) => ({ value: v, label: m.label }))" />
            <a-select v-model:value="f.group" allow-clear placeholder="全部分组" style="width: 120px" :options="groups.map((s) => ({ value: s, label: s }))" />
            <a-tooltip title="重置"><a-button @click="reset"><ReloadOutlined /></a-button></a-tooltip>
            <a-radio-group v-model:value="view" button-style="solid">
              <a-radio-button value="table"><UnorderedListOutlined /></a-radio-button>
              <a-radio-button value="card"><AppstoreOutlined /></a-radio-button>
            </a-radio-group>
          </div>
        </div>

        <div v-if="selectedKeys.length" class="dv-batch">已选 {{ selectedKeys.length }} 台<a-button size="small">批量分组</a-button><a-button size="small">批量配置</a-button><a-button size="small" danger>停用</a-button><a @click="selectedKeys = []">取消选择</a></div>

        <a-table v-if="view === 'table'" :columns="columns" :data-source="rows" row-key="id" size="middle" :scroll="{ x: 1500 }"
          :pagination="{ pageSize: 10, showTotal: (t: number) => `共 ${t} 条`, showSizeChanger: false }"
          :row-selection="{ selectedRowKeys: selectedKeys, onChange: (k: any) => (selectedKeys = k) }"
          :custom-row="(r: Device) => ({ class: 'row-click', onDblclick: () => open(r) })">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <div class="dv-cell">
                <div class="cell-main"><a @click="open(record)">{{ record.name }}</a><small class="mono">{{ record.sn }}</small></div>
              </div>
            </template>
            <template v-else-if="column.key === 'type'"><a-tag :color="TYPE_META[record.type as DeviceType].color + '22'" :style="{ color: TYPE_META[record.type as DeviceType].color, borderColor: TYPE_META[record.type as DeviceType].color + '55' }">{{ TYPE_META[record.type as DeviceType].label }}</a-tag></template>
            <template v-else-if="column.key === 'model'"><div class="cell-main">{{ record.model }}<small>{{ record.vendor }}</small></div></template>
            <template v-else-if="column.key === 'status'">
              <div class="cell-main"><a-badge :status="STATUS_META[record.status as DeviceStatus].badge" :text="STATUS_META[record.status as DeviceStatus].label" /></div>
            </template>
            <template v-else-if="column.key === 'battery'">
              <div class="dv-bat"><a-progress :percent="record.battery" :show-info="false" size="small" :stroke-color="batColor(record.battery)" /><span class="mono">{{ record.battery }}%</span></div>
            </template>
            <template v-else-if="column.key === 'signal'"><span class="dv-sig" :data-l="record.signal"><i /><i /><i /><i /></span></template>
            <template v-else-if="column.key === 'caps'"><a-tag v-for="c in record.caps.slice(0, 2)" :key="c" class="dv-cap">{{ CAP_META[c as keyof typeof CAP_META] }}</a-tag><a-tooltip v-if="record.caps.length > 2" :title="capsText(record.caps.slice(2))"><a-tag class="dv-cap">+{{ record.caps.length - 2 }}</a-tag></a-tooltip></template>
            <template v-else-if="column.key === 'op'">
              <a-space :size="2">
                <a-button type="link" size="small" @click="open(record)">详情</a-button>
                <a-button type="link" size="small" :disabled="record.status === 'offline'">远程控制</a-button>
                <a-dropdown><a-button type="text" size="small"><MoreOutlined /></a-button>
                  <template #overlay><a-menu><a-menu-item>编辑</a-menu-item><a-menu-item>维保登记</a-menu-item><a-menu-item>固件升级</a-menu-item><a-menu-item danger>停用</a-menu-item></a-menu></template>
                </a-dropdown>
              </a-space>
            </template>
          </template>
        </a-table>

        <div v-else class="dv-grid">
          <div v-for="d in rows" :key="d.id" class="dv-card" :style="{ '--c': TYPE_META[d.type].color }" @click="open(d)">
            <div class="dv-card-top">
              <a-badge :status="STATUS_META[d.status].badge" :text="STATUS_META[d.status].label" />
              <span class="mono muted">{{ d.id }}</span>
            </div>
            <div class="dv-card-art"><DeviceGlyph :type="d.type" :size="70" :color="TYPE_META[d.type].color" /></div>
            <b>{{ d.name }}</b><small class="muted">{{ TYPE_META[d.type].label }} · {{ d.model }}</small>
            <div class="dv-card-meta">
              <span><ThunderboltOutlined /> <i class="mono" :style="{ color: batColor(d.battery) }">{{ d.battery }}%</i></span>
              <span><WifiOutlined /> <span class="dv-sig" :data-l="d.signal"><i /><i /><i /><i /></span></span>
              <span class="ellipsis">{{ d.location }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ================= 型号库 ================= -->
    <template v-else-if="tab === 'models'">
      <div class="pp-head"><div><h2>型号库</h2><p>维护设备型号的标准规格参数与能力，新增设备时自动带出</p></div><div class="r"><a-button type="primary"><PlusOutlined />新增型号</a-button></div></div>
      <div class="dv-models">
        <div v-for="m in MODEL_LIB" :key="m.d.model" class="pp-panel dv-model">
          <div class="dv-model-art" :style="{ '--c': TYPE_META[m.d.type].color }"><DeviceGlyph :type="m.d.type" :size="76" :color="TYPE_META[m.d.type].color" /></div>
          <div class="dv-model-b">
            <div class="dv-model-t"><b>{{ m.d.model }}</b><a-tag>{{ TYPE_META[m.d.type].label }}</a-tag></div>
            <small class="muted">{{ m.d.vendor }} · 接入协议 {{ m.d.protocol }} · 已入库 {{ m.n }} 台</small>
            <a-descriptions :column="2" size="small" class="dv-desc">
              <a-descriptions-item v-if="m.d.spec.dof" label="自由度">{{ m.d.spec.dof }}</a-descriptions-item>
              <a-descriptions-item label="负载">{{ m.d.spec.payload }}</a-descriptions-item>
              <a-descriptions-item label="最高速度">{{ m.d.spec.speed }}</a-descriptions-item>
              <a-descriptions-item label="续航">{{ m.d.spec.endurance }}</a-descriptions-item>
              <a-descriptions-item label="防护">{{ m.d.spec.ip }}</a-descriptions-item>
              <a-descriptions-item label="重量">{{ m.d.spec.weight }}</a-descriptions-item>
            </a-descriptions>
            <div><a-tag v-for="c in m.d.caps" :key="c" class="dv-cap">{{ CAP_META[c] }}</a-tag></div>
          </div>
        </div>
      </div>
    </template>

    <!-- ================= 维保记录 ================= -->
    <template v-else-if="tab === 'maint'">
      <div class="pp-head"><div><h2>维保记录</h2><p>设备保养、维修、升级与标定记录</p></div><div class="r"><a-button type="primary"><PlusOutlined />维保登记</a-button></div></div>
      <div class="pp-kpis">
        <div class="pp-kpi" style="--k:#26C6DA"><small>本月维保</small><b>18<em>次</em></b><span class="bar" /></div>
        <div class="pp-kpi" style="--k:#FFB74D"><small>进行中</small><b>3<em>项</em></b><span class="bar" /></div>
        <div class="pp-kpi" style="--k:#FF6B6B"><small>即将到期保养</small><b>5<em>台</em></b><span class="bar" /></div>
        <div class="pp-kpi" style="--k:#4DE8B0"><small>平均修复时长</small><b>3.6<em>小时</em></b><span class="bar" /></div>
      </div>
      <div class="pp-panel">
        <a-table :data-source="MAINT_ROWS" size="middle" :pagination="false" :columns="[{ title: '设备', key: 'dev' }, { title: '类型', key: 'type' }, { title: '内容', dataIndex: 'content' }, { title: '负责人', dataIndex: 'who' }, { title: '日期', dataIndex: 'date' }, { title: '状态', key: 'state' }]">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'dev'"><div class="dv-cell"><i class="dv-dot" :style="{ background: TYPE_META[record.dev.type as DeviceType].color }" />{{ record.dev.name }}</div></template>
            <template v-else-if="column.key === 'type'"><a-tag :color="({ 保养: 'cyan', 维修: 'orange', 升级: 'blue', 巡检: 'green' } as any)[record.type]">{{ record.type }}</a-tag></template>
            <template v-else-if="column.key === 'state'"><a-badge :status="record.state === '进行中' ? 'processing' : 'success'" :text="record.state" /></template>
          </template>
        </a-table>
      </div>
    </template>

    <!-- ================= 详情抽屉 ================= -->
    <a-drawer :open="!!cur" :width="760" :title="null" :closable="false" class="dv-drawer" @close="cur = null">
      <template v-if="cur">
        <div class="dv-hero" :style="{ '--c': TYPE_META[cur.type].color }">
          <div class="dv-hero-art"><DeviceGlyph :type="cur.type" :size="88" :color="TYPE_META[cur.type].color" /></div>
          <div class="dv-hero-b">
            <div class="dv-hero-t"><b>{{ cur.name }}</b><a-badge :status="STATUS_META[cur.status].badge" :text="STATUS_META[cur.status].label" /></div>
            <div class="muted mono" style="font-size:12px">{{ cur.sn }} <CopyOutlined style="cursor:pointer" /></div>
            <div style="margin-top:10px"><a-tag>{{ TYPE_META[cur.type].label }}</a-tag><a-tag>{{ cur.model }}</a-tag><a-tag>{{ cur.vendor }}</a-tag><a-tag>{{ cur.group }}</a-tag></div>
          </div>
          <a-space direction="vertical" class="dv-hero-op">
            <a-button type="primary" :disabled="cur.status === 'offline'"><ControlOutlined />远程控制</a-button>
            <a-button><EyeOutlined />实时视频</a-button>
          </a-space>
        </div>
        <a-tabs class="dv-tabs">
          <a-tab-pane key="o" tab="实时状态">
            <div class="dv-gauges">
              <div v-for="g in [{ l: '电量', v: cur.battery, c: batColor(cur.battery), u: '%' }, { l: 'CPU 负载', v: cur.cpu, c: '#4DD0E1', u: '%' }, { l: '主控温度', v: cur.temp, c: cur.temp > 58 ? '#FF6B6B' : '#5B9BFF', u: '℃' }, { l: '信号强度', v: cur.signal * 25, c: '#4DE8B0', u: '%' }]" :key="g.l" class="dv-gauge">
                <a-progress type="dashboard" :percent="g.v" :size="104" :stroke-color="g.c" :format="() => `${g.v}${g.u}`" />
                <span>{{ g.l }}</span>
              </div>
            </div>
            <a-descriptions :column="2" bordered size="small" class="dv-desc">
              <a-descriptions-item label="存放库位">{{ cur.location }}</a-descriptions-item>
              <a-descriptions-item label="最后在线">{{ cur.lastSeen }}</a-descriptions-item>
              <a-descriptions-item label="累计运行">{{ cur.hours }} 小时</a-descriptions-item>
              <a-descriptions-item label="固件版本">{{ cur.firmware }}</a-descriptions-item>
              <a-descriptions-item label="负责人">{{ cur.owner }}</a-descriptions-item>
              <a-descriptions-item label="入场日期">{{ cur.commissioned }}</a-descriptions-item>
            </a-descriptions>
            <a-alert v-if="cur.status === 'fault'" type="error" show-icon style="margin-top:14px" message="右前腿关节电机过流告警（E-2031）" description="03 分钟前触发，设备已自动进入保护姿态，请安排维护工程师检查。"><template #icon><AlertOutlined /></template></a-alert>
          </a-tab-pane>
          <a-tab-pane key="s" tab="规格参数">
            <a-descriptions :column="2" bordered size="small" class="dv-desc">
              <a-descriptions-item label="设备类型">{{ TYPE_META[cur.type].label }}</a-descriptions-item>
              <a-descriptions-item label="型号">{{ cur.model }}（{{ cur.vendor }}）</a-descriptions-item>
              <a-descriptions-item v-if="cur.spec.dof" label="自由度">{{ cur.spec.dof }} DoF</a-descriptions-item>
              <a-descriptions-item label="额定负载">{{ cur.spec.payload }}</a-descriptions-item>
              <a-descriptions-item label="最高速度">{{ cur.spec.speed }}</a-descriptions-item>
              <a-descriptions-item label="续航">{{ cur.spec.endurance }}</a-descriptions-item>
              <a-descriptions-item label="防护等级">{{ cur.spec.ip }}</a-descriptions-item>
              <a-descriptions-item label="重量">{{ cur.spec.weight }}</a-descriptions-item>
              <a-descriptions-item label="外形尺寸" :span="2">{{ cur.spec.size }}</a-descriptions-item>
              <a-descriptions-item label="能力标签" :span="2"><a-tag v-for="c in cur.caps" :key="c" class="dv-cap">{{ CAP_META[c] }}</a-tag></a-descriptions-item>
            </a-descriptions>
          </a-tab-pane>
          <a-tab-pane key="n" tab="传感器">
            <a-list :data-source="cur.sensors" size="small" class="dv-list">
              <template #renderItem="{ item, index }"><a-list-item><span class="mono muted" style="width:28px">{{ String(index + 1).padStart(2, '0') }}</span>{{ item }}<template #actions><a-badge :status="cur!.status === 'offline' ? 'default' : 'success'" :text="cur!.status === 'offline' ? '无数据' : '正常'" /><a>标定</a></template></a-list-item></template>
            </a-list>
          </a-tab-pane>
          <a-tab-pane key="a" tab="接入信息">
            <a-descriptions :column="1" bordered size="small" class="dv-desc">
              <a-descriptions-item label="通信协议">{{ cur.protocol }}</a-descriptions-item>
              <a-descriptions-item label="IP 地址"><span class="mono">{{ cur.ipAddr }}</span></a-descriptions-item>
              <a-descriptions-item label="设备 ID"><span class="mono">{{ cur.id }}</span></a-descriptions-item>
              <a-descriptions-item label="接入密钥"><span class="mono">sk-••••••••••••3f9a</span> <a style="margin-left:8px">重置</a></a-descriptions-item>
              <a-descriptions-item label="视频流"><span class="mono">webrtc://10.20.0.5/live/{{ cur.id }}</span></a-descriptions-item>
            </a-descriptions>
          </a-tab-pane>
          <a-tab-pane key="m" tab="维保记录">
            <a-timeline style="margin-top:8px">
              <a-timeline-item v-for="m in MAINT" :key="m.t" color="cyan"><b>{{ m.t }}</b> <a-tag style="margin-left:6px">{{ m.type }}</a-tag><div class="muted" style="margin-top:4px">{{ m.c }} · {{ m.who }}</div></a-timeline-item>
            </a-timeline>
          </a-tab-pane>
        </a-tabs>
      </template>
    </a-drawer>

    <!-- ================= 新增设备 ================= -->
    <a-modal v-model:open="addOpen" title="新增设备" :width="680" ok-text="创建" @ok="submitAdd">
      <a-form layout="vertical" style="margin-top:12px">
        <a-form-item label="设备类型" required>
          <div class="dv-pick">
            <button v-for="t in TYPES" :key="t" type="button" :class="{ on: form.type === t }" @click="form.type = t"><DeviceGlyph :type="t" :size="34" :color="form.type === t ? TYPE_META[t].color : '#5B7486'" /><span>{{ TYPE_META[t].label }}</span></button>
          </div>
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="设备名称" required><a-input v-model:value="form.name" placeholder="如：机器狗-011" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="序列号 SN" required><a-input v-model:value="form.sn" placeholder="设备铭牌序列号" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="型号" required><a-select v-model:value="form.model" placeholder="从型号库选择" :options="MODEL_LIB.filter((m) => m.d.type === form.type).map((m) => ({ value: m.d.model, label: `${m.d.model}（${m.d.vendor}）` }))" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="所属分组"><a-select v-model:value="form.group" placeholder="请选择" :options="['一组', '二组', '三组', '应急组'].map((v) => ({ value: v, label: v }))" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="接入协议"><a-select v-model:value="form.protocol" :options="['ROS2', 'MAVLink', 'SDK', 'NMEA2000'].map((v) => ({ value: v, label: v }))" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="IP 地址"><a-input v-model:value="form.ip" placeholder="10.20.x.x" /></a-form-item></a-col>
        </a-row>
        <a-form-item label="能力标签"><a-checkbox-group v-model:value="form.caps" :options="Object.entries(CAP_META).map(([v, l]) => ({ value: v, label: l }))" /></a-form-item>
      </a-form>
    </a-modal>
  </ModuleShell>
</template>

<style scoped>
.dv-dot { width: 7px; height: 7px; flex: none; border-radius: 50%; }
.kdot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.dv-types { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 16px; }
.dv-type { display: flex; align-items: center; gap: 12px; padding: 12px 14px; text-align: left; cursor: pointer; color: var(--text); font: inherit;
  background: rgba(12,30,48,.7); border: 1px solid rgba(77,208,225,.12); border-radius: 6px; transition: all .2s; }
.dv-type:hover { border-color: rgba(77,208,225,.4); }
.dv-type.on { border-color: var(--c, #4DD0E1); background: linear-gradient(135deg, rgba(38,198,218,.16), rgba(12,30,48,.7)); box-shadow: inset 0 -2px 0 var(--c, #4DD0E1); }
.dv-type .ic { width: 46px; height: 46px; display: grid; place-items: center; flex: none; background: rgba(77,208,225,.06); clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%); }
.dv-type .ic.all { font-size: 22px; color: var(--cyan); }
.dv-type b { display: block; font-size: 14px; font-weight: 600; }
.dv-type small { color: var(--muted); font-size: 12px; }
.dv-batch { display: flex; align-items: center; gap: 10px; padding: 8px 16px; font-size: 13px; background: rgba(38,198,218,.08); border-bottom: 1px solid var(--line); }
.dv-cell { display: flex; align-items: center; gap: 10px; }
.dv-av { width: 36px; height: 36px; flex: none; display: grid; place-items: center; background: rgba(77,208,225,.07); border: 1px solid color-mix(in srgb, var(--c) 35%, transparent); border-radius: 4px; }
.dv-bat { display: flex; align-items: center; gap: 8px; } .dv-bat :deep(.ant-progress) { margin: 0; flex: 1; } .dv-bat span { font-size: 12px; width: 34px; text-align: right; }
.dv-sig { display: inline-flex; align-items: flex-end; gap: 2px; height: 14px; vertical-align: middle; }
.dv-sig i { width: 3px; background: #28465C; border-radius: 1px; } .dv-sig i:nth-child(1) { height: 25%; } .dv-sig i:nth-child(2) { height: 50%; } .dv-sig i:nth-child(3) { height: 75%; } .dv-sig i:nth-child(4) { height: 100%; }
.dv-sig[data-l="1"] i:nth-child(-n+1), .dv-sig[data-l="2"] i:nth-child(-n+2), .dv-sig[data-l="3"] i:nth-child(-n+3), .dv-sig[data-l="4"] i { background: #4DE8B0; }
.dv-cap { background: rgba(77,208,225,.08) !important; border-color: rgba(77,208,225,.25) !important; color: #9FE6EF !important; }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; display: inline-block; }
.dv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; padding: 16px; }
.dv-card { position: relative; padding: 14px; cursor: pointer; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 2px;
  background: linear-gradient(180deg, rgba(20,48,74,.6), rgba(10,27,43,.8)); border: 1px solid rgba(77,208,225,.12); border-radius: 6px; transition: all .2s; }
.dv-card:hover { border-color: var(--c); transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,.35), 0 0 0 1px var(--c); }
.dv-card-top { width: 100%; display: flex; justify-content: space-between; font-size: 12px; }
.dv-card-art { margin: 8px 0 6px; width: 110px; height: 96px; display: grid; place-items: center; background: radial-gradient(closest-side, color-mix(in srgb, var(--c) 18%, transparent), transparent); }
.dv-card b { font-size: 15px; }
.dv-card-meta { width: 100%; margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--line); display: flex; justify-content: space-between; gap: 6px; font-size: 12px; color: var(--muted); }
.dv-card-meta i { font-style: normal; }
.dv-models { display: grid; grid-template-columns: repeat(auto-fill, minmax(440px, 1fr)); gap: 16px; }
.dv-model { display: flex; gap: 16px; padding: 18px; }
.dv-model-art { width: 120px; flex: none; display: grid; place-items: center; background: radial-gradient(closest-side, color-mix(in srgb, var(--c) 16%, transparent), transparent); }
.dv-model-b { flex: 1; min-width: 0; }
.dv-model-t { display: flex; align-items: center; gap: 8px; } .dv-model-t b { font-size: 17px; }
.dv-desc { margin: 10px 0; }

/* 概览 */
.db-types { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 16px; }
.db-type { position: relative; padding: 14px 16px; cursor: pointer; background: linear-gradient(160deg, color-mix(in srgb, var(--c) 13%, rgba(12,30,48,.9)), rgba(10,27,43,.85) 60%); border: 1px solid rgba(77,208,225,.14); border-radius: 6px; transition: all .2s; overflow: hidden; }
.db-type::before { content: ''; position: absolute; left: 0; top: 0; width: 100%; height: 2px; background: linear-gradient(90deg, var(--c), transparent); }
.db-type:hover { border-color: var(--c); transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,.35); }
.db-type-h { display: flex; align-items: center; gap: 12px; }
.db-type-h .ic { width: 56px; height: 56px; flex: none; display: grid; place-items: center; background: rgba(6,18,30,.6); border: 1px solid color-mix(in srgb, var(--c) 40%, transparent); clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%); }
.db-type-h b { display: block; font-size: 15px; } .db-type-h small { color: var(--muted); font-size: 12px; }
.db-type-h .go { margin-left: auto; color: var(--faint); } .db-type:hover .go { color: var(--c); }
.db-type-rate { display: flex; align-items: baseline; justify-content: space-between; margin: 12px 0 6px; font-size: 12px; color: var(--muted); }
.db-type-rate b { font-size: 24px; color: #fff; } .db-type-rate em { font-style: normal; font-size: 12px; color: var(--muted); margin-left: 2px; }
.db-seg { display: flex; gap: 2px; height: 6px; } .db-seg i { display: block; border-radius: 1px; } .db-seg i span { display: block; height: 6px; }
.db-type-f { display: flex; justify-content: space-between; margin-top: 10px; font-size: 12px; color: var(--muted); } .db-type-f b { color: var(--text); font-weight: 500; }
.db-row { display: grid; grid-template-columns: 1fr 1.35fr 1fr; gap: 16px; margin-bottom: 16px; }
.db-row.b { grid-template-columns: 1fr 1.35fr; }
.db-p { display: flex; flex-direction: column; min-width: 0; }
.db-p .r { margin-left: auto; }
.db-donut { display: flex; align-items: center; gap: 18px; padding: 14px 18px; }
.db-donut ul { flex: 1; list-style: none; margin: 0; padding: 0; }
.db-donut li { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 13px; border-bottom: 1px dashed var(--line); }
.db-donut li i { width: 8px; height: 8px; border-radius: 4px; } .db-donut li b { margin-left: auto; font-weight: 600; } .db-donut li span { width: 36px; text-align: right; font-size: 12px; }
.db-lg { margin-left: auto; display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }
.db-lg i { width: 12px; height: 3px; margin-left: 8px; } .db-lg i.sq { width: 8px; height: 8px; border-radius: 4px; }
.db-alerts { list-style: none; margin: 0; padding: 4px 0; overflow: auto; max-height: 238px; }
.db-alerts li { display: grid; grid-template-columns: 8px 44px 74px 1fr; align-items: center; gap: 10px; padding: 9px 16px; font-size: 13px; cursor: pointer; border-bottom: 1px dashed var(--line); }
.db-alerts li:hover { background: rgba(77,208,225,.05); }
.db-alerts .lv { width: 8px; height: 8px; border-radius: 50%; } .db-alerts li.error .lv { background: #FF6B6B; box-shadow: 0 0 8px #FF6B6B; } .db-alerts li.warning .lv { background: #FFB74D; }
.db-alerts li .m { color: var(--muted); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; } .db-alerts li.error .m { color: #FF9C9C; }
.db-list { list-style: none; margin: 0; padding: 6px 16px 10px; }
.db-list li { display: flex; align-items: center; gap: 10px; padding: 7px 0; font-size: 13px; border-bottom: 1px dashed var(--line); }
.db-list li:last-child { border-bottom: 0; } .db-list li b { font-weight: 500; white-space: nowrap; } .db-list .r { margin-left: auto; margin-inline-end: 0; }
.db-list em { width: 18px; font-style: normal; color: var(--cyan); }
.db-bar { flex: 1; height: 6px; background: rgba(77,208,225,.08); } .db-bar i { display: block; height: 100%; }
.db-wk { flex: 1; display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; padding: 14px 20px 12px; min-height: 190px; }
.db-wk-c { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.db-wk-c .n { font-size: 12px; color: var(--text); }
.db-wk-c .bars { flex: 1; width: 22px; display: flex; flex-direction: column-reverse; gap: 2px; background: rgba(77,208,225,.05); }
.db-wk-c .bars i { display: block; } .db-wk-c .bars .e { background: #FF6B6B; } .db-wk-c .bars .w { background: #FFB74D; }
.db-wk-c small { font-size: 11px; color: var(--faint); }
</style>
<style>
/* 抽屉、弹窗挂载在 body 下 */
.dv-drawer .ant-drawer-content { background: linear-gradient(180deg, #0E2438, #0A1B2B) !important; border-left: 1px solid rgba(77,208,225,.25); }
.dv-drawer .ant-drawer-body { padding: 0 24px 24px; }
.dv-hero { --c: #4DD0E1; display: flex; gap: 18px; align-items: flex-start; margin: 0 -24px; padding: 24px; background: linear-gradient(135deg, color-mix(in srgb, var(--c) 14%, transparent), transparent 60%); border-bottom: 1px solid rgba(77,208,225,.14); }
.dv-hero-art { width: 120px; height: 120px; flex: none; display: grid; place-items: center; background: rgba(6,18,30,.6); border: 1px solid color-mix(in srgb, var(--c) 40%, transparent); clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%); }
.dv-hero-b { flex: 1; min-width: 0; }
.dv-hero-t { display: flex; align-items: center; gap: 12px; } .dv-hero-t b { font-size: 22px; color: #fff; }
.dv-hero-task { margin-top: 10px; font-size: 13px; color: #9FE6EF; display: flex; align-items: center; gap: 8px; }
.dv-hero-task .dot { width: 6px; height: 6px; border-radius: 50%; background: #26C6DA; box-shadow: 0 0 8px #26C6DA; }
.dv-tabs { margin-top: 6px; }
.dv-gauges { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.dv-gauge { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 0; background: rgba(16,38,59,.6); border: 1px solid rgba(77,208,225,.1); border-radius: 6px; font-size: 13px; color: #8FB3C7; }
.dv-gauge .ant-progress-text { color: #fff !important; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 18px !important; }
.dv-list .ant-list-item { padding: 10px 4px; }
.dv-pick { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.dv-pick button { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 0; cursor: pointer; font: inherit; font-size: 13px; color: #8FB3C7; background: rgba(16,38,59,.6); border: 1px solid #1B3A52; border-radius: 6px; transition: all .2s; }
.dv-pick button.on { color: #fff; border-color: #26C6DA; background: rgba(38,198,218,.12); }
.cell-main .ellipsis { max-width: 150px; }
</style>
