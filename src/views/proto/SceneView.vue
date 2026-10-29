<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  DashboardOutlined, AppstoreOutlined, FundProjectionScreenOutlined,
  PlusOutlined, SearchOutlined, EditOutlined, MoreOutlined,
  ExpandOutlined, EnvironmentOutlined, CalendarOutlined,
  ToolOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons-vue'
import ModuleShell from '@/components/proto/ModuleShell.vue'
import ScenePlan from '@/components/proto/ScenePlan.vue'
import LineChart from '@/components/proto/LineChart.vue'
import { SCENES, SCENE_STATUS, SCENE_TYPES, TYPE_COLOR, PLAN_LEGEND, type Scene } from '@/mock/scenes'
import { rng } from '@/utils'

document.title = '场景管理 · 具身智能训练场'
const router = useRouter()

const MENU = [
  { key: 'overview', label: '场景总览', icon: DashboardOutlined, group: '概览' },
  { key: 'lib',      label: '场景列表', icon: AppstoreOutlined, group: '场景' },
  { key: 'screen',   label: '大屏展示', icon: FundProjectionScreenOutlined, group: '展示' },
]
const tab = ref('overview')
const openScreen = () => window.open(router.resolve('/m/scene/screen').href, '_blank')
const onTab = (k: string) => { if (k === 'screen') { openScreen(); return } tab.value = k }

/* ── 总览 KPI ── */
const KPIS = [
  { l: '场景总数',   v: SCENES.length,                                                           u: '个',  k: '#2ED3E6' },
  { l: '启用中',     v: SCENES.filter(s => s.status === 'active').length,                        u: '个',  k: '#45E3A8' },
  { l: '维护中',     v: SCENES.filter(s => s.status === 'maint').length,                         u: '个',  k: '#FFC15C' },
  { l: '规划中',     v: SCENES.filter(s => s.status === 'draft').length,                         u: '个',  k: '#8EA6BE' },
  { l: '场地总面积', v: SCENES.reduce((a, s) => a + s.area, 0).toLocaleString('en-US'),          u: 'm²',  k: '#5B9BFF' },
  { l: '本月使用',   v: '1,286',                                                                  u: '小时', k: '#B48CFF' },
]

/* 类型分布 */
const typeStats = SCENE_TYPES.map(t => ({
  t,
  n: SCENES.filter(s => s.type === t).length,
  area: SCENES.filter(s => s.type === t).reduce((a, s) => a + s.area, 0),
  c: TYPE_COLOR[t],
})).filter(x => x.n)

/* 近 30 天汇总使用时长 */
const usageTotal = computed(() => {
  const r = rng(42)
  return Array.from({ length: 30 }, (_, i) => Math.round(8 + r() * 10 + (i % 7 > 4 ? -4 : 0)))
})
const usageLabels = Array.from({ length: 30 }, (_, i) => (i % 5 === 0 ? `10-${String(i + 1).padStart(2, '0')}` : ''))

/* ── 场景列表 ── */
const f = reactive({ type: '全部', kw: '', status: '全部' })
const list = computed(() =>
  SCENES.filter(s =>
    (f.type === '全部' || s.type === f.type) &&
    (f.status === '全部' || SCENE_STATUS[s.status].t === f.status) &&
    (!f.kw || s.name.includes(f.kw))
  )
)
const cur = ref<Scene>(SCENES[0])

/* 使用记录 */
const TEAMS = ['一组', '二组', '三组', '应急组', '外部单位']
const USES: Record<string, string[]> = {
  综合: ['综合科目训练', '多场景联合演练', '设备验收测试'],
  楼梯攀爬: ['台阶攀爬训练', '坡道通行测试', '负重攀爬训练'],
  复杂地形: ['碎石路面通行', '越障能力测试', '地形适应训练'],
  巡检模拟: ['仪表识读训练', '巡检路线演练', '异常识别测试'],
  室内操作: ['抓取放置训练', '开门操作训练', '精细操作测试'],
  水域救援: ['水面搜救演练', '落水目标识别', '编队巡航测试'],
}
const records = computed(() => {
  if (cur.value.status === 'draft') return []
  const r = rng(cur.value.id.charCodeAt(4) * 31 + 3)
  const uses = USES[cur.value.type] ?? USES['综合']
  const out: { k: number; date: string; s: string; e: string; team: string; use: string; dur: number; live: boolean }[] = []
  for (let d = 0; d < 7 && out.length < 6; d++) {
    const n = cur.value.status === 'maint' && d === 0 ? 0 : 1 + Math.floor(r() * 2)
    let t = 8 + Math.floor(r() * 3)
    for (let j = 0; j < n && out.length < 6; j++) {
      const len = 1 + Math.floor(r() * 3) + (r() > 0.5 ? 0.5 : 0)
      const end = t + len
      const fmt = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? '30' : '00'}`
      out.push({ k: out.length, date: `10-${String(20 - d).padStart(2, '0')}`, s: fmt(t), e: fmt(end), team: TEAMS[Math.floor(r() * TEAMS.length)], use: uses[Math.floor(r() * uses.length)], dur: len, live: d === 0 && j === 0 && cur.value.status === 'active' })
      t = end + 1 + Math.floor(r() * 2)
    }
  }
  return out
})

const usage = computed(() => {
  const r = rng(cur.value.area)
  return Array.from({ length: 30 }, (_, i) =>
    cur.value.status === 'draft' ? 0 : Math.round((cur.value.hours / 30) * (0.6 + r() * 0.8) * (i % 7 > 4 ? 0.5 : 1))
  )
})

const ENV = computed(() => [
  { l: '温度', v: cur.value.env.temp, u: '℃',  ok: cur.value.env.temp < 28 },
  { l: '湿度', v: cur.value.env.hum,  u: '%',   ok: cur.value.env.hum < 75  },
  { l: '照度', v: cur.value.env.lux,  u: 'lx',  ok: true },
  { l: '噪声', v: cur.value.env.noise, u: 'dB', ok: cur.value.env.noise < 60 },
])

/* 维护记录（静态示例） */
const MAINT = [
  { k: 1, date: '2026-10-19', type: '例行检查', desc: '地面标识补漆、设备紧固', dur: '2 h', by: '赵工', done: true },
  { k: 2, date: '2026-09-28', type: '设备维修', desc: '台阶承重结构修复',       dur: '4 h', by: '周工', done: true },
  { k: 3, date: '2026-09-10', type: '环境校验', desc: '照度计、噪声计校准',     dur: '1 h', by: '张杰', done: true },
]

/* 预约排程（静态示例） */
const BOOKS = [
  { k: 1, date: '2026-10-21', t: '09:00–11:00', team: '二组',   use: '台阶攀爬训练', st: 'confirmed' },
  { k: 2, date: '2026-10-21', t: '14:00–16:30', team: '一组',   use: '综合科目演练', st: 'confirmed' },
  { k: 3, date: '2026-10-22', t: '09:30–12:00', team: '三组',   use: '巡检演练',     st: 'pending'   },
  { k: 4, date: '2026-10-23', t: '10:00–12:00', team: '外部单位', use: '验收测试',   st: 'pending'   },
]
const BOOK_ST: Record<string, { t: string; c: string }> = {
  confirmed: { t: '已确认', c: '#45E3A8' },
  pending:   { t: '待审核', c: '#FFC15C' },
}

/* 生命周期阶段 */
const LC_STEPS = ['场景规划', '建设施工', '试运行', '正式启用'] as const
const lcStep = computed(() => cur.value.status === 'draft' ? 1 : cur.value.status === 'maint' ? 2 : 3)

/* 弹窗 */
const planOpen = ref(false)
const addOpen  = ref(false)
const form = reactive({ name: '', type: '楼梯攀爬', area: 300, capacity: 4, open: '08:00–20:00', difficulty: 3, desc: '' })
const submit = () => { addOpen.value = false; message.success('场景已创建（原型演示）') }

/* 详情面板 Tab */
const detailTab = ref<'info' | 'record' | 'book' | 'maint'>('info')
</script>

<template>
  <ModuleShell :active="tab" title="场景管理" en="Scene Management" :menu="MENU" @update:active="onTab">

    <!-- ══════════ 总览 ══════════ -->
    <template v-if="tab === 'overview'">
      <div class="pp-head">
        <div><h2>场景总览</h2><p>训练场各物理场景概况与使用趋势</p></div>
        <div class="r"><a-button type="primary" @click="tab = 'lib'; addOpen = true"><PlusOutlined />新建场景</a-button></div>
      </div>

      <!-- KPI 条 -->
      <div class="ov-kpis">
        <div v-for="k in KPIS" :key="k.l" class="ov-kpi" :style="{ '--k': k.k }">
          <small>{{ k.l }}</small>
          <b>{{ k.v }}<em>{{ k.u }}</em></b>
          <span class="kpi-bar" />
        </div>
      </div>

      <!-- 主体两列 -->
      <div class="ov-body">
        <!-- 左：类型分布 + 场景卡片 -->
        <div class="ov-left">
          <div class="pp-panel">
            <div class="pp-panel-h"><h3>场景类型分布</h3></div>
            <div class="ov-types">
              <div v-for="x in typeStats" :key="x.t" class="ov-type" :style="{ '--c': x.c }">
                <div class="ov-type-bar">
                  <div class="fill" :style="{ width: (x.n / SCENES.length * 100) + '%' }" />
                </div>
                <div class="ov-type-info">
                  <span><i :style="{ background: x.c }" />{{ x.t }}</span>
                  <b>{{ x.n }} 个 · {{ x.area.toLocaleString() }} m²</b>
                </div>
              </div>
            </div>
          </div>

          <div class="pp-panel">
            <div class="pp-panel-h"><h3>场景列表</h3><a class="r" style="font-size:12px" @click="tab = 'lib'">全部场景 →</a></div>
            <div class="ov-cards">
              <button v-for="s in SCENES.filter(x => x.status !== 'draft').slice(0, 6)" :key="s.id"
                type="button" class="ov-card" :style="{ '--c': TYPE_COLOR[s.type] }"
                @click="tab = 'lib'; cur = s">
                <div class="ov-card-plan">
                  <ScenePlan :items="s.plan" :labels="false" :anim="false" />
                </div>
                <div class="ov-card-body">
                  <div class="ov-card-t">
                    <b>{{ s.name }}</b>
                    <a-badge :status="SCENE_STATUS[s.status].b" :text="SCENE_STATUS[s.status].t" />
                  </div>
                  <small><i :style="{ background: TYPE_COLOR[s.type] }" />{{ s.type }} · {{ s.area }} m²</small>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- 右：使用趋势 + 环境告警 -->
        <div class="ov-right">
          <div class="pp-panel ov-chart-p">
            <div class="pp-panel-h"><h3>近 30 天使用时长</h3><span class="muted r" style="font-size:12px">单位：小时 / 天</span></div>
            <div class="ov-chart-stats">
              <div><small>累计</small><b class="mono">{{ usageTotal.reduce((a,b)=>a+b,0) }}<em>h</em></b></div>
              <div><small>日均</small><b class="mono">{{ (usageTotal.reduce((a,b)=>a+b,0)/30).toFixed(1) }}<em>h</em></b></div>
              <div><small>峰值</small><b class="mono">{{ Math.max(...usageTotal) }}<em>h</em></b></div>
            </div>
            <LineChart :series="[{ name:'使用时长', color:'#2ED3E6', data: usageTotal }]" :labels="usageLabels" :height="200" :min="0" />
          </div>

          <div class="pp-panel">
            <div class="pp-panel-h"><h3>环境预警</h3><ExclamationCircleOutlined style="color:#FFC15C;margin-left:6px" /></div>
            <div class="ov-alerts">
              <div class="ov-alert warn">
                <ExclamationCircleOutlined />
                <div><b>巡检模拟区</b><span>噪声 63 dB 超过预警阈值（≤60 dB）</span></div>
                <small class="mono">10-20 09:42</small>
              </div>
              <div class="ov-alert warn">
                <ExclamationCircleOutlined />
                <div><b>水域救援池</b><span>环境湿度 78% 偏高</span></div>
                <small class="mono">10-20 09:28</small>
              </div>
              <div class="ov-alert ok">
                <CheckCircleOutlined />
                <div><b>综合训练场 A</b><span>今日巡检完成，状态正常</span></div>
                <small class="mono">10-20 08:10</small>
              </div>
            </div>
          </div>

          <div class="pp-panel">
            <div class="pp-panel-h"><h3>今日预约</h3><span class="muted r" style="font-size:12px">共 14 场</span></div>
            <div class="ov-book-list">
              <div v-for="b in BOOKS.slice(0,4)" :key="b.k" class="ov-book-row">
                <span class="mono" style="color:var(--muted);font-size:12px;flex:none">{{ b.date }}</span>
                <span class="mono" style="font-size:12px;flex:none">{{ b.t }}</span>
                <b>{{ b.use }}</b>
                <em :style="{ color: BOOK_ST[b.st].c }">{{ BOOK_ST[b.st].t }}</em>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ══════════ 场景列表 ══════════ -->
    <template v-else-if="tab === 'lib'">
      <div class="pp-head">
        <div><h2>场景列表</h2><p>全部训练场景的详情、布局与运营数据</p></div>
        <div class="r"><a-button type="primary" @click="addOpen = true"><PlusOutlined />新建场景</a-button></div>
      </div>

      <div class="sc">
        <!-- 左侧列表 -->
        <div class="pp-panel sc-list">
          <div class="pp-panel-h"><h3>场景列表</h3><span class="muted" style="font-size:12px">{{ list.length }} 个</span></div>
          <div class="sc-filter">
            <a-input v-model:value="f.kw" allow-clear placeholder="搜索场景名称">
              <template #prefix><SearchOutlined class="muted" /></template>
            </a-input>
            <div class="sc-tags">
              <button v-for="t in ['全部', ...SCENE_TYPES]" :key="t" type="button"
                :class="{ on: f.type === t }" @click="f.type = t">{{ t }}</button>
            </div>
            <div class="sc-tags" style="margin-top:4px">
              <button v-for="s in ['全部', '启用中', '维护中', '规划中']" :key="s" type="button"
                :class="{ on: f.status === s }" @click="f.status = s">{{ s }}</button>
            </div>
          </div>
          <div class="sc-items">
            <button v-for="s in list" :key="s.id" type="button"
              class="sc-item" :class="{ on: cur.id === s.id }"
              :style="{ '--c': TYPE_COLOR[s.type] }" @click="cur = s; detailTab = 'info'">
              <span class="mini">
                <ScenePlan :items="s.plan" :labels="false" :anim="false" :dim="s.status === 'draft'" />
              </span>
              <span class="sc-item-b">
                <span class="sc-item-t">
                  <b>{{ s.name }}</b>
                  <a-badge :status="SCENE_STATUS[s.status].b" :text="SCENE_STATUS[s.status].t" />
                </span>
                <small>
                  <i :style="{ background: TYPE_COLOR[s.type] }" />
                  {{ s.type }} · {{ s.area }} m²
                </small>
              </span>
            </button>
          </div>
        </div>

        <!-- 右侧详情 -->
        <div class="sc-detail">
          <!-- 标题栏 -->
          <div class="pp-panel sc-hd" :style="{ '--c': TYPE_COLOR[cur.type] }">
            <div class="sc-hd-main">
              <div class="sc-hd-info">
                <span class="mono muted" style="font-size:12px">{{ cur.id }}</span>
                <h3>{{ cur.name }}</h3>
                <div class="sc-hd-tags">
                  <a-tag :style="{ color: TYPE_COLOR[cur.type], borderColor: TYPE_COLOR[cur.type]+'66', background: TYPE_COLOR[cur.type]+'1A' }">{{ cur.type }}</a-tag>
                  <a-badge :status="SCENE_STATUS[cur.status].b" :text="SCENE_STATUS[cur.status].t" />
                  <a-tag v-for="t in cur.tags" :key="t" style="font-size:11px">{{ t }}</a-tag>
                </div>
                <p class="muted sc-desc-text">{{ cur.desc }}</p>
              </div>
              <div class="sc-hd-meta">
                <div><small>面积</small><b>{{ cur.area }} m²</b></div>
                <div><small>容量</small><b>{{ cur.capacity }} 台</b></div>
                <div><small>开放时间</small><b>{{ cur.open }}</b></div>
                <div><small>累计使用</small><b>{{ cur.hours.toLocaleString() }} h</b></div>
              </div>
            </div>
            <div class="sc-hd-actions">
              <a-button size="small" @click="planOpen = true"><ExpandOutlined />查看布局</a-button>
              <a-button size="small"><EditOutlined />编辑</a-button>
              <a-dropdown>
                <a-button size="small"><MoreOutlined /></a-button>
                <template #overlay>
                  <a-menu>
                    <a-menu-item>{{ cur.status === 'maint' ? '结束维护' : '设为维护' }}</a-menu-item>
                    <a-menu-item>复制场景</a-menu-item>
                    <a-menu-item danger>停用</a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </div>

          <!-- 生命周期进度 -->
          <div class="pp-panel sc-lc">
            <div class="pp-panel-h" style="margin-bottom:12px"><h3>生命周期</h3></div>
            <div class="lc-steps">
              <div v-for="(step, i) in LC_STEPS" :key="step"
                class="lc-step" :class="{ done: i < lcStep, active: i === lcStep }">
                <div class="lc-dot"><span>{{ i + 1 }}</span></div>
                <div class="lc-line" v-if="i < LC_STEPS.length - 1" />
                <div class="lc-label">{{ step }}</div>
              </div>
            </div>
          </div>

          <!-- 详情 Tab -->
          <div class="pp-panel sc-body">
            <div class="sc-tabs">
              <button v-for="t in [{ k:'info', l:'基本信息', icon: EnvironmentOutlined }, { k:'record', l:'使用记录', icon: CalendarOutlined }, { k:'book', l:'预约排程', icon: CalendarOutlined }, { k:'maint', l:'维护记录', icon: ToolOutlined }]"
                :key="t.k" type="button" :class="{ on: detailTab === t.k }"
                @click="detailTab = t.k as any">
                <component :is="t.icon" />{{ t.l }}
              </button>
            </div>

            <!-- 基本信息 -->
            <div v-if="detailTab === 'info'" class="sc-info-pane">
              <div class="sc-info-left">
                <!-- 平面图 -->
                <div class="sc-plan-wrap">
                  <div class="pp-panel-h" style="padding:0 0 10px">
                    <span class="sc-lg">
                      <span v-for="l in PLAN_LEGEND" :key="l.k"><i :style="{ background: l.c }" />{{ l.t }}</span>
                    </span>
                  </div>
                  <div class="sc-plan-b">
                    <ScenePlan :key="cur.id" :items="cur.plan" :dim="cur.status === 'draft'" />
                  </div>
                </div>
                <!-- 设备清单 -->
                <div>
                  <div class="sc-sub-h">场地设备清单</div>
                  <a-table :data-source="cur.elements" row-key="name" size="small" :pagination="false"
                    :columns="[{title:'名称',dataIndex:'name'},{title:'类型',dataIndex:'kind',width:70},{title:'数量',dataIndex:'qty',width:60,align:'right'},{title:'规格',dataIndex:'spec',ellipsis:true}]" />
                </div>
              </div>
              <div class="sc-info-right">
                <!-- 环境监测 -->
                <div>
                  <div class="sc-sub-h">
                    环境监测
                    <span class="muted" style="font-size:12px;margin-left:auto">{{ cur.status === 'draft' ? '未接入' : '实时 · 1 分钟前' }}</span>
                  </div>
                  <div class="sc-env">
                    <div v-for="e in ENV" :key="e.l" :class="{ warn: !e.ok }">
                      <small>{{ e.l }}</small>
                      <b class="mono">{{ cur.status === 'draft' ? '--' : e.v }}<em>{{ e.u }}</em></b>
                    </div>
                  </div>
                </div>
                <!-- 使用趋势 -->
                <div>
                  <div class="sc-sub-h">
                    近 30 天使用时长
                    <div class="sc-use-s">
                      <span><small>累计</small><b class="mono">{{ usage.reduce((a,b)=>a+b,0) }}h</b></span>
                      <span><small>日均</small><b class="mono">{{ (usage.reduce((a,b)=>a+b,0)/30).toFixed(1) }}h</b></span>
                      <span><small>峰值</small><b class="mono">{{ Math.max(...usage) }}h</b></span>
                    </div>
                  </div>
                  <LineChart :key="cur.id" :series="[{ name:'使用时长', color: TYPE_COLOR[cur.type], data: usage }]" :labels="usageLabels" :height="160" :min="0" />
                </div>
              </div>
            </div>

            <!-- 使用记录 -->
            <div v-else-if="detailTab === 'record'" class="sc-tab-pane">
              <a-table :data-source="records" row-key="k" size="small" :pagination="false"
                :locale="{ emptyText: '暂无使用记录' }"
                :columns="[
                  { title:'日期', key:'date', width:72 },
                  { title:'时段', key:'time', width:120 },
                  { title:'使用单位', dataIndex:'team', width:90 },
                  { title:'用途', dataIndex:'use', ellipsis:true },
                  { title:'时长', key:'dur', width:70, align:'right' },
                  { title:'状态', key:'st', width:90 },
                ]">
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'date'"><span class="mono">{{ record.date }}</span></template>
                  <template v-else-if="column.key === 'time'"><span class="mono">{{ record.s }} – {{ record.e }}</span></template>
                  <template v-else-if="column.key === 'dur'"><span class="mono">{{ record.dur }} h</span></template>
                  <template v-else-if="column.key === 'st'">
                    <a-badge :status="record.live ? 'processing' : 'success'" :text="record.live ? '使用中' : '已完成'" />
                  </template>
                </template>
              </a-table>
            </div>

            <!-- 预约排程 -->
            <div v-else-if="detailTab === 'book'" class="sc-tab-pane">
              <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
                <a-button type="primary" size="small"><PlusOutlined />新建预约</a-button>
              </div>
              <a-table :data-source="BOOKS" row-key="k" size="small" :pagination="false"
                :columns="[
                  { title:'日期', dataIndex:'date', width:100 },
                  { title:'时段', dataIndex:'t', width:130 },
                  { title:'使用单位', dataIndex:'team', width:100 },
                  { title:'用途', dataIndex:'use', ellipsis:true },
                  { title:'状态', key:'st', width:90 },
                ]">
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'st'">
                    <span :style="{ color: BOOK_ST[record.st].c }">{{ BOOK_ST[record.st].t }}</span>
                  </template>
                </template>
              </a-table>
            </div>

            <!-- 维护记录 -->
            <div v-else-if="detailTab === 'maint'" class="sc-tab-pane">
              <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
                <a-button type="primary" size="small"><PlusOutlined />新建工单</a-button>
              </div>
              <a-table :data-source="MAINT" row-key="k" size="small" :pagination="false"
                :columns="[
                  { title:'日期', dataIndex:'date', width:110 },
                  { title:'类型', dataIndex:'type', width:90 },
                  { title:'内容', dataIndex:'desc', ellipsis:true },
                  { title:'时长', dataIndex:'dur', width:70 },
                  { title:'负责人', dataIndex:'by', width:80 },
                  { title:'状态', key:'done', width:80 },
                ]">
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'done'">
                    <a-badge status="success" text="已完成" />
                  </template>
                </template>
              </a-table>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ── 新建场景弹窗 ── -->
    <a-modal v-model:open="addOpen" title="新建场景" :width="680" ok-text="创建" @ok="submit">
      <a-form layout="vertical" style="margin-top:12px">
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="场景名称" required><a-input v-model:value="form.name" placeholder="如：楼梯攀爬区 B" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="场景类型" required><a-select v-model:value="form.type" :options="SCENE_TYPES.map(v => ({ value: v, label: v }))" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="面积（m²）"><a-input-number v-model:value="form.area" style="width:100%" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="同时容纳（台）"><a-input-number v-model:value="form.capacity" style="width:100%" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="开放时间"><a-input v-model:value="form.open" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="难度"><a-rate v-model:value="form.difficulty" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="负责人"><a-select placeholder="请选择" :options="['周工','赵工','张杰'].map(v => ({ value: v, label: v }))" /></a-form-item></a-col>
        </a-row>
        <a-form-item label="场景平面图">
          <a-upload-dragger :before-upload="() => false"><p style="margin:8px 0">上传 CAD / 图片平面图，或稍后在线绘制布局</p></a-upload-dragger>
        </a-form-item>
        <a-form-item label="场景描述"><a-textarea v-model:value="form.desc" :rows="3" placeholder="场景用途、布置说明" /></a-form-item>
      </a-form>
    </a-modal>

    <!-- ── 布局放大弹窗 ── -->
    <a-modal v-model:open="planOpen" :title="`${cur.name} · 场景布局`" :width="1100" :footer="null">
      <div style="aspect-ratio:16/10;margin-top:12px"><ScenePlan :items="cur.plan" /></div>
    </a-modal>
  </ModuleShell>
</template>

<style scoped>
/* ── KPI 条 ── */
.ov-kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 20px; }
.ov-kpi { position: relative; padding: 14px 18px 12px; background: rgba(22,40,64,.7); border: 1px solid var(--line); border-top: 2px solid var(--k); border-radius: 4px; overflow: hidden; }
.ov-kpi small { display: block; font-size: 12px; color: var(--muted); margin-bottom: 6px; }
.ov-kpi b { font-size: 26px; font-weight: 600; color: var(--title); }
.ov-kpi em { font-style: normal; font-size: 12px; color: var(--muted); margin-left: 3px; }
.kpi-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--k), transparent); opacity: .4; }

/* ── 总览主体 ── */
.ov-body { display: grid; grid-template-columns: 1fr 420px; gap: 16px; align-items: start; }
.ov-left, .ov-right { display: flex; flex-direction: column; gap: 16px; }

/* 类型分布 */
.ov-types { padding: 4px 16px 16px; display: flex; flex-direction: column; gap: 10px; }
.ov-type-bar { height: 6px; background: rgba(46,211,230,.08); border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
.ov-type-bar .fill { height: 100%; background: var(--c); border-radius: 3px; transition: width .6s ease; }
.ov-type-info { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--muted); }
.ov-type-info i { display: inline-block; width: 7px; height: 7px; border-radius: 1px; margin-right: 6px; vertical-align: -1px; }
.ov-type-info b { color: var(--title); font-weight: 500; font-size: 13px; }

/* 场景卡片 */
.ov-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 4px 16px 16px; }
.ov-card { display: flex; flex-direction: column; gap: 0; padding: 0; font: inherit; text-align: left; cursor: pointer; background: rgba(46,211,230,.04); border: 1px solid rgba(46,211,230,.15); border-radius: 6px; overflow: hidden; transition: all .2s; }
.ov-card:hover { border-color: var(--c); background: linear-gradient(180deg, color-mix(in srgb, var(--c) 8%, transparent), rgba(22,40,64,.6)); }
.ov-card-plan { aspect-ratio: 16/9; overflow: hidden; border-bottom: 1px solid rgba(46,211,230,.12); }
.ov-card-body { padding: 8px 10px; }
.ov-card-t { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.ov-card-t b { flex: 1; font-size: 13px; color: var(--title); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ov-card-t :deep(.ant-badge-status-text) { font-size: 11px; color: var(--muted); }
.ov-card small { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 4px; }
.ov-card small i { width: 6px; height: 6px; border-radius: 1px; }

/* 使用趋势面板 */
.ov-chart-p { display: flex; flex-direction: column; }
.ov-chart-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 4px 16px 12px; }
.ov-chart-stats > div { padding: 8px 10px; background: rgba(46,211,230,.05); border: 1px solid rgba(46,211,230,.12); border-radius: 4px; }
.ov-chart-stats small { display: block; font-size: 11px; color: var(--muted); }
.ov-chart-stats b { font-size: 18px; font-weight: 600; color: var(--title); }
.ov-chart-stats em { font-style: normal; font-size: 11px; color: var(--muted); margin-left: 2px; }

/* 环境预警 */
.ov-alerts { padding: 0 16px 12px; display: flex; flex-direction: column; gap: 8px; }
.ov-alert { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 4px; font-size: 13px; }
.ov-alert.warn { background: rgba(255,193,92,.07); border: 1px solid rgba(255,193,92,.3); color: #FFC15C; }
.ov-alert.ok   { background: rgba(69,227,168,.06); border: 1px solid rgba(69,227,168,.25); color: #45E3A8; }
.ov-alert > div { flex: 1; } .ov-alert b { display: block; margin-bottom: 2px; } .ov-alert span { font-size: 12px; opacity: .8; }
.ov-alert small { flex: none; font-size: 11px; opacity: .65; align-self: center; }

/* 预约列表 */
.ov-book-list { padding: 0 16px 12px; display: flex; flex-direction: column; gap: 6px; }
.ov-book-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px dashed rgba(46,211,230,.1); font-size: 13px; }
.ov-book-row b { flex: 1; color: var(--title); } .ov-book-row em { font-style: normal; font-size: 12px; }

/* ── 场景列表布局 ── */
.sc { display: grid; grid-template-columns: 300px 1fr; gap: 16px; align-items: start; }
.sc-list { position: sticky; top: 0; }
.sc-filter { padding: 10px 12px 4px; }
.sc-tags { display: flex; flex-wrap: wrap; gap: 5px; margin: 8px 0 4px; }
.sc-tags button { padding: 2px 9px; font: inherit; font-size: 12px; color: var(--muted); cursor: pointer; background: rgba(46,211,230,.05); border: 1px solid var(--line); border-radius: 4px; transition: all .15s; }
.sc-tags button.on { color: #fff; border-color: var(--accent); background: var(--accent-soft); }
.sc-items { padding: 4px 8px 10px; max-height: calc(100vh - 320px); overflow-y: auto; }
.sc-item { width: 100%; display: flex; gap: 10px; align-items: center; padding: 9px 10px; margin-top: 4px; font: inherit; color: var(--text); text-align: left; cursor: pointer; background: transparent; border: 1px solid transparent; border-radius: 6px; transition: all .18s; }
.sc-item:hover { background: rgba(46,211,230,.05); }
.sc-item.on { background: linear-gradient(90deg, color-mix(in srgb, var(--c) 15%, transparent), rgba(27,51,82,.4)); border-color: color-mix(in srgb, var(--c) 50%, transparent); }
.sc-item .mini { width: 72px; height: 45px; flex: none; border: 1px solid rgba(46,211,230,.18); border-radius: 3px; overflow: hidden; }
.sc-item-b { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.sc-item-t { display: flex; align-items: center; gap: 6px; }
.sc-item-t b { font-size: 13px; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sc-item-t :deep(.ant-badge-status-text) { font-size: 11px; color: var(--muted); }
.sc-item small { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 4px; }
.sc-item small i { width: 6px; height: 6px; border-radius: 1px; }

/* ── 详情区 ── */
.sc-detail { display: flex; flex-direction: column; gap: 12px; min-width: 0; }

/* 标题栏 */
.sc-hd { padding: 16px 20px; background: linear-gradient(120deg, color-mix(in srgb, var(--c) 14%, rgba(22,42,69,.9)), rgba(19,38,63,.85) 55%) !important; }
.sc-hd-main { display: flex; gap: 20px; align-items: flex-start; }
.sc-hd-info { flex: 1; }
.sc-hd-info h3 { margin: 2px 0 6px; font-size: 20px; color: #fff; letter-spacing: 1px; }
.sc-hd-tags { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.sc-desc-text { margin: 8px 0 0; font-size: 13px; }
.sc-hd-meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; min-width: 200px; }
.sc-hd-meta > div { padding: 8px 12px; background: rgba(0,0,0,.2); border-radius: 4px; }
.sc-hd-meta small { display: block; font-size: 11px; color: rgba(255,255,255,.5); margin-bottom: 2px; }
.sc-hd-meta b { font-size: 14px; color: #fff; font-weight: 500; }
.sc-hd-actions { display: flex; gap: 8px; margin-top: 12px; }

/* 生命周期 */
.sc-lc { padding: 14px 20px; }
.lc-steps { display: flex; align-items: center; gap: 0; }
.lc-step { display: flex; flex-direction: column; align-items: center; position: relative; flex: 1; }
.lc-dot { width: 28px; height: 28px; border-radius: 50%; background: rgba(46,211,230,.1); border: 2px solid rgba(46,211,230,.25); display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--muted); z-index: 1; transition: all .3s; }
.lc-step.done .lc-dot { background: rgba(69,227,168,.2); border-color: #45E3A8; color: #45E3A8; }
.lc-step.active .lc-dot { background: rgba(46,211,230,.25); border-color: var(--accent); color: #fff; box-shadow: 0 0 12px rgba(46,211,230,.4); }
.lc-line { position: absolute; top: 13px; left: 50%; right: -50%; height: 2px; background: rgba(46,211,230,.15); z-index: 0; }
.lc-step.done .lc-line { background: rgba(69,227,168,.5); }
.lc-label { margin-top: 6px; font-size: 12px; color: var(--muted); text-align: center; white-space: nowrap; }
.lc-step.done .lc-label, .lc-step.active .lc-label { color: var(--title); }

/* 详情 Tab */
.sc-body { padding: 0; overflow: hidden; }
.sc-tabs { display: flex; border-bottom: 1px solid rgba(46,211,230,.15); padding: 0 16px; }
.sc-tabs button { display: flex; align-items: center; gap: 6px; padding: 12px 14px; font: inherit; font-size: 13px; color: var(--muted); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: all .18s; margin-bottom: -1px; }
.sc-tabs button.on { color: var(--accent); border-bottom-color: var(--accent); }
.sc-tabs button:hover:not(.on) { color: var(--title); }

.sc-info-pane { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; padding: 16px; }
.sc-info-left, .sc-info-right { display: flex; flex-direction: column; gap: 16px; }
.sc-tab-pane { padding: 16px; }
.sc-sub-h { display: flex; align-items: center; font-size: 13px; font-weight: 600; color: var(--title); margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid rgba(46,211,230,.12); }

/* 平面图 */
.sc-plan-wrap { display: flex; flex-direction: column; }
.sc-plan-b { aspect-ratio: 16/10; border: 1px solid rgba(46,211,230,.18); border-radius: 4px; overflow: hidden; }
.sc-plan-b :deep(.plan) { border-radius: 4px; }
.sc-lg { display: flex; flex-wrap: wrap; gap: 10px; font-size: 11px; color: var(--muted); }
.sc-lg i { display: inline-block; width: 7px; height: 7px; margin-right: 4px; border-radius: 3px; }

/* 环境监测 */
.sc-env { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.sc-env > div { display: flex; flex-direction: column; justify-content: center; padding: 10px 12px; background: rgba(46,211,230,.05); border: 1px solid rgba(46,211,230,.12); border-left: 2px solid #45E3A8; border-radius: 4px; }
.sc-env > div.warn { border-left-color: #FFC15C; } .sc-env > div.warn b { color: #FFC15C; }
.sc-env small { display: block; font-size: 11px; color: var(--muted); } .sc-env b { font-size: 20px; font-weight: 600; }
.sc-env em { font-style: normal; font-size: 11px; color: var(--muted); margin-left: 2px; }

/* 使用趋势 */
.sc-use-s { display: flex; gap: 12px; margin-left: auto; }
.sc-use-s span { font-size: 12px; font-weight: 400; color: var(--muted); }
.sc-use-s b { font-size: 13px; color: var(--title); margin-left: 4px; font-weight: 600; }
</style>
