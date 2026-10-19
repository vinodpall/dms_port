<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  DatabaseOutlined, AppstoreOutlined, ToolOutlined, ApiOutlined, PlusOutlined, ImportOutlined, ExportOutlined,
  UnorderedListOutlined, SearchOutlined, MoreOutlined, ControlOutlined, EyeOutlined, ThunderboltOutlined, WifiOutlined,
  AlertOutlined, ReloadOutlined, CopyOutlined,
} from '@ant-design/icons-vue'
import ModuleShell from '@/components/proto/ModuleShell.vue'
import DeviceGlyph from '@/components/proto/DeviceGlyph.vue'
import { DEVICES } from '@/mock/devices'
import { TYPE_META, STATUS_META, CAP_META, type Device, type DeviceType, type DeviceStatus } from '@/models/device'

document.title = '机器人设备管理 · 具身智能训练场'
const MENU = [
  { key: 'list', label: '设备台账', icon: DatabaseOutlined },
  { key: 'models', label: '型号库', icon: AppstoreOutlined },
  { key: 'maint', label: '维保记录', icon: ToolOutlined },
  { key: 'access', label: '接入配置', icon: ApiOutlined },
]
const tab = ref('list')

/* ---------- 统计 ---------- */
const count = (s: DeviceStatus) => DEVICES.filter((d) => d.status === s).length
const KPIS = computed(() => [
  { label: '设备总数', v: DEVICES.length, unit: '台', k: '#4DD0E1' },
  { label: '作业中', v: count('working'), unit: '台', k: '#26C6DA' },
  { label: '在线空闲', v: count('online'), unit: '台', k: '#4DE8B0' },
  { label: '充电中', v: count('charging'), unit: '台', k: '#FFB74D' },
  { label: '离线', v: count('offline'), unit: '台', k: '#5B7486' },
  { label: '故障告警', v: count('fault'), unit: '台', k: '#FF6B6B' },
])
const TYPES = Object.keys(TYPE_META) as DeviceType[]

/* ---------- 筛选 ---------- */
const f = reactive({ type: 'all' as DeviceType | 'all', status: undefined as DeviceStatus | undefined, scene: undefined as string | undefined, kw: '' })
const view = ref<'table' | 'card'>('table')
const scenes = [...new Set(DEVICES.map((d) => d.scene))]
const rows = computed(() => DEVICES.filter((d) =>
  (f.type === 'all' || d.type === f.type) && (!f.status || d.status === f.status) && (!f.scene || d.scene === f.scene) &&
  (!f.kw || `${d.name}${d.sn}${d.model}${d.id}`.toLowerCase().includes(f.kw.toLowerCase()))))
const reset = () => Object.assign(f, { type: 'all', status: undefined, scene: undefined, kw: '' })

const columns = [
  { title: '设备', key: 'name', width: 230, fixed: 'left' },
  { title: '类型', key: 'type', width: 120 },
  { title: '型号 / 厂商', key: 'model', width: 150 },
  { title: '状态', key: 'status', width: 170 },
  { title: '电量', key: 'battery', width: 140, sorter: (a: Device, b: Device) => a.battery - b.battery },
  { title: '信号', key: 'signal', width: 70 },
  { title: '所在场景', dataIndex: 'scene', width: 130 },
  { title: '能力标签', key: 'caps', width: 250 },
  { title: '最后在线', dataIndex: 'lastSeen', width: 100 },
  { title: '操作', key: 'op', width: 150, fixed: 'right' },
]
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
const USAGE = [
  { mod: '数据采集', item: '楼梯攀爬数据采集 #A12', t: '进行中', c: 'processing' },
  { mod: '机器人仿真', item: '数字孪生体 · USD 模型已同步', t: '已绑定', c: 'success' },
  { mod: '场景管理', item: '楼梯攀爬区 · 评测任务 3 项', t: '已绑定', c: 'success' },
  { mod: '业务管理', item: '夜间巡检路线 R3', t: '已结束', c: 'default' },
]

/* ---------- 新增 ---------- */
const addOpen = ref(false)
const form = reactive({ type: 'quadruped' as DeviceType, name: '', sn: '', model: undefined, group: undefined, scene: undefined, protocol: 'ROS2', ip: '', caps: ['patrol'] as string[] })
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
    <!-- ================= 设备台账 ================= -->
    <template v-if="tab === 'list'">
      <div class="pp-head">
        <div><h2>设备台账</h2><p>统一管理训练场全部机器人设备，设备信息供业务、采集、仿真、场景等模块共用</p></div>
        <div class="r">
          <a-button><ImportOutlined />批量导入</a-button>
          <a-button><ExportOutlined />导出</a-button>
          <a-button type="primary" @click="addOpen = true"><PlusOutlined />新增设备</a-button>
        </div>
      </div>

      <div class="pp-kpis">
        <div v-for="k in KPIS" :key="k.label" class="pp-kpi" :style="{ '--k': k.k }">
          <small><i class="kdot" :style="{ background: k.k }" />{{ k.label }}</small>
          <b>{{ k.v }}<em>{{ k.unit }}</em></b><span class="bar" />
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
            <a-select v-model:value="f.scene" allow-clear placeholder="全部场景" style="width: 140px" :options="scenes.map((s) => ({ value: s, label: s }))" />
            <a-tooltip title="重置"><a-button @click="reset"><ReloadOutlined /></a-button></a-tooltip>
            <a-radio-group v-model:value="view" button-style="solid">
              <a-radio-button value="table"><UnorderedListOutlined /></a-radio-button>
              <a-radio-button value="card"><AppstoreOutlined /></a-radio-button>
            </a-radio-group>
          </div>
        </div>

        <div v-if="selectedKeys.length" class="dv-batch">已选 {{ selectedKeys.length }} 台<a-button size="small">批量分组</a-button><a-button size="small">下发任务</a-button><a-button size="small" danger>停用</a-button><a @click="selectedKeys = []">取消选择</a></div>

        <a-table v-if="view === 'table'" :columns="columns" :data-source="rows" row-key="id" size="middle" :scroll="{ x: 1500 }"
          :pagination="{ pageSize: 10, showTotal: (t: number) => `共 ${t} 条`, showSizeChanger: false }"
          :row-selection="{ selectedRowKeys: selectedKeys, onChange: (k: any) => (selectedKeys = k) }"
          :custom-row="(r: Device) => ({ class: 'row-click', onDblclick: () => open(r) })">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <div class="dv-cell">
                <span class="dv-av" :style="{ '--c': TYPE_META[record.type as DeviceType].color }"><DeviceGlyph :type="record.type" :size="26" :color="TYPE_META[record.type as DeviceType].color" /></span>
                <div class="cell-main"><a @click="open(record)">{{ record.name }}</a><small class="mono">{{ record.sn }}</small></div>
              </div>
            </template>
            <template v-else-if="column.key === 'type'"><a-tag :color="TYPE_META[record.type as DeviceType].color + '22'" :style="{ color: TYPE_META[record.type as DeviceType].color, borderColor: TYPE_META[record.type as DeviceType].color + '55' }">{{ TYPE_META[record.type as DeviceType].label }}</a-tag></template>
            <template v-else-if="column.key === 'model'"><div class="cell-main">{{ record.model }}<small>{{ record.vendor }}</small></div></template>
            <template v-else-if="column.key === 'status'">
              <div class="cell-main"><a-badge :status="STATUS_META[record.status as DeviceStatus].badge" :text="STATUS_META[record.status as DeviceStatus].label" /><small v-if="record.task" class="ellipsis">{{ record.task }}</small></div>
            </template>
            <template v-else-if="column.key === 'battery'">
              <div class="dv-bat"><a-progress :percent="record.battery" :show-info="false" size="small" :stroke-color="batColor(record.battery)" /><span class="mono">{{ record.battery }}%</span></div>
            </template>
            <template v-else-if="column.key === 'signal'"><span class="dv-sig" :data-l="record.signal"><i /><i /><i /><i /></span></template>
            <template v-else-if="column.key === 'caps'"><a-tag v-for="c in record.caps.slice(0, 2)" :key="c" class="dv-cap">{{ CAP_META[c as keyof typeof CAP_META] }}</a-tag><a-tooltip v-if="record.caps.length > 2" :title="record.caps.slice(2).map((c: string) => CAP_META[c as keyof typeof CAP_META]).join('、')"><a-tag class="dv-cap">+{{ record.caps.length - 2 }}</a-tag></a-tooltip></template>
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
              <span class="ellipsis">{{ d.scene }}</span>
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
            <template v-if="column.key === 'dev'"><div class="dv-cell"><span class="dv-av" :style="{ '--c': TYPE_META[record.dev.type as DeviceType].color }"><DeviceGlyph :type="record.dev.type" :size="22" :color="TYPE_META[record.dev.type as DeviceType].color" /></span>{{ record.dev.name }}</div></template>
            <template v-else-if="column.key === 'type'"><a-tag :color="({ 保养: 'cyan', 维修: 'orange', 升级: 'blue', 巡检: 'green' } as any)[record.type]">{{ record.type }}</a-tag></template>
            <template v-else-if="column.key === 'state'"><a-badge :status="record.state === '进行中' ? 'processing' : 'success'" :text="record.state" /></template>
          </template>
        </a-table>
      </div>
    </template>

    <!-- ================= 接入配置 ================= -->
    <template v-else>
      <div class="pp-head"><div><h2>接入配置</h2><p>设备接入网关与通信协议配置</p></div></div>
      <a-row :gutter="16">
        <a-col v-for="p in [{ n: 'ROS 2 网关', d: 'DDS Domain 42 · Fast DDS', c: 24, s: '运行中' }, { n: 'MAVLink 网关', d: 'UDP 14550 · 无人机', c: 6, s: '运行中' }, { n: '厂商 SDK 适配', d: '宇树 / 优必选 SDK', c: 4, s: '运行中' }, { n: 'NMEA 2000', d: '船载 CAN 总线 · 救生船', c: 4, s: '运行中' }]" :key="p.n" :span="6">
          <div class="pp-panel" style="padding:18px">
            <div style="display:flex;align-items:center;gap:8px"><ApiOutlined style="color:#4DD0E1;font-size:18px" /><b>{{ p.n }}</b><a-badge status="processing" :text="p.s" style="margin-left:auto" /></div>
            <p class="muted" style="margin:10px 0 6px;font-size:13px">{{ p.d }}</p>
            <div class="mono" style="font-size:22px">{{ p.c }} <small class="muted" style="font-size:12px">台设备已接入</small></div>
          </div>
        </a-col>
      </a-row>
      <div class="pp-panel" style="margin-top:16px">
        <div class="pp-panel-h"><h3>网关参数</h3></div>
        <div class="pp-panel-b">
          <a-form layout="vertical" style="max-width: 720px">
            <a-row :gutter="16">
              <a-col :span="12"><a-form-item label="心跳间隔（秒）"><a-input-number :value="5" style="width:100%" /></a-form-item></a-col>
              <a-col :span="12"><a-form-item label="离线判定（秒）"><a-input-number :value="30" style="width:100%" /></a-form-item></a-col>
              <a-col :span="12"><a-form-item label="遥测上报频率"><a-select value="10" :options="[{ value: '1', label: '1 Hz' }, { value: '10', label: '10 Hz' }, { value: '50', label: '50 Hz' }]" /></a-form-item></a-col>
              <a-col :span="12"><a-form-item label="视频流协议"><a-select value="webrtc" :options="[{ value: 'webrtc', label: 'WebRTC' }, { value: 'rtsp', label: 'RTSP' }]" /></a-form-item></a-col>
            </a-row>
            <a-form-item label="低电量告警阈值"><a-slider :value="20" :marks="{ 10: '10%', 20: '20%', 30: '30%', 50: '50%' }" :max="50" /></a-form-item>
            <a-button type="primary">保存配置</a-button>
          </a-form>
        </div>
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
            <div v-if="cur.task" class="dv-hero-task"><i class="dot" />当前任务：{{ cur.task }}</div>
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
              <a-descriptions-item label="所在场景">{{ cur.scene }}</a-descriptions-item>
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
          <a-tab-pane key="u" tab="模块引用">
            <p class="muted" style="font-size:13px;margin-top:0">该设备在其他模块中的使用情况</p>
            <a-list :data-source="USAGE" size="small" class="dv-list">
              <template #renderItem="{ item }"><a-list-item><a-tag color="cyan">{{ item.mod }}</a-tag>{{ item.item }}<template #actions><a-badge :status="item.c" :text="item.t" /></template></a-list-item></template>
            </a-list>
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
          <a-col :span="12"><a-form-item label="所属分组"><a-select v-model:value="form.group" placeholder="请选择" :options="['训练一组', '训练二组', '巡检班', '采集班', '应急组'].map((v) => ({ value: v, label: v }))" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="接入协议"><a-select v-model:value="form.protocol" :options="['ROS2', 'MAVLink', 'SDK', 'NMEA2000'].map((v) => ({ value: v, label: v }))" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="IP 地址"><a-input v-model:value="form.ip" placeholder="10.20.x.x" /></a-form-item></a-col>
        </a-row>
        <a-form-item label="能力标签"><a-checkbox-group v-model:value="form.caps" :options="Object.entries(CAP_META).map(([v, l]) => ({ value: v, label: l }))" /></a-form-item>
      </a-form>
    </a-modal>
  </ModuleShell>
</template>

<style scoped>
.kdot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.dv-types { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 16px; }
.dv-type { display: flex; align-items: center; gap: 12px; padding: 12px 14px; text-align: left; cursor: pointer; color: var(--text); font: inherit;
  background: rgba(12,30,48,.7); border: 1px solid rgba(77,208,225,.12); border-radius: 4px; transition: all .2s; }
.dv-type:hover { border-color: rgba(77,208,225,.4); }
.dv-type.on { border-color: var(--c, #4DD0E1); background: linear-gradient(135deg, rgba(38,198,218,.16), rgba(12,30,48,.7)); box-shadow: inset 0 -2px 0 var(--c, #4DD0E1); }
.dv-type .ic { width: 46px; height: 46px; display: grid; place-items: center; flex: none; background: rgba(77,208,225,.06); clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%); }
.dv-type .ic.all { font-size: 22px; color: var(--cyan); }
.dv-type b { display: block; font-size: 14px; font-weight: 600; }
.dv-type small { color: var(--muted); font-size: 12px; }
.dv-batch { display: flex; align-items: center; gap: 10px; padding: 8px 16px; font-size: 13px; background: rgba(38,198,218,.08); border-bottom: 1px solid var(--line); }
.dv-cell { display: flex; align-items: center; gap: 10px; }
.dv-av { width: 36px; height: 36px; flex: none; display: grid; place-items: center; background: rgba(77,208,225,.07); border: 1px solid color-mix(in srgb, var(--c) 35%, transparent); border-radius: 3px; }
.dv-bat { display: flex; align-items: center; gap: 8px; } .dv-bat :deep(.ant-progress) { margin: 0; flex: 1; } .dv-bat span { font-size: 12px; width: 34px; text-align: right; }
.dv-sig { display: inline-flex; align-items: flex-end; gap: 2px; height: 14px; vertical-align: middle; }
.dv-sig i { width: 3px; background: #28465C; border-radius: 1px; } .dv-sig i:nth-child(1) { height: 25%; } .dv-sig i:nth-child(2) { height: 50%; } .dv-sig i:nth-child(3) { height: 75%; } .dv-sig i:nth-child(4) { height: 100%; }
.dv-sig[data-l="1"] i:nth-child(-n+1), .dv-sig[data-l="2"] i:nth-child(-n+2), .dv-sig[data-l="3"] i:nth-child(-n+3), .dv-sig[data-l="4"] i { background: #4DE8B0; }
.dv-cap { background: rgba(77,208,225,.08) !important; border-color: rgba(77,208,225,.25) !important; color: #9FE6EF !important; }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; display: inline-block; }
.dv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; padding: 16px; }
.dv-card { position: relative; padding: 14px; cursor: pointer; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 2px;
  background: linear-gradient(180deg, rgba(20,48,74,.6), rgba(10,27,43,.8)); border: 1px solid rgba(77,208,225,.12); border-radius: 4px; transition: all .2s; }
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
.dv-gauge { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 0; background: rgba(16,38,59,.6); border: 1px solid rgba(77,208,225,.1); border-radius: 4px; font-size: 13px; color: #8FB3C7; }
.dv-gauge .ant-progress-text { color: #fff !important; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 18px !important; }
.dv-list .ant-list-item { padding: 10px 4px; }
.dv-pick { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.dv-pick button { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 0; cursor: pointer; font: inherit; font-size: 13px; color: #8FB3C7; background: rgba(16,38,59,.6); border: 1px solid #1B3A52; border-radius: 4px; transition: all .2s; }
.dv-pick button.on { color: #fff; border-color: #26C6DA; background: rgba(38,198,218,.12); }
.cell-main .ellipsis { max-width: 150px; }
</style>
