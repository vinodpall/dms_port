<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  DashboardOutlined, AppstoreOutlined, FundProjectionScreenOutlined,
  ToolOutlined, CalendarOutlined, PlusOutlined, SearchOutlined,
  EditOutlined, MoreOutlined, ExpandOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined,
  VideoCameraOutlined, SettingOutlined, DownOutlined,
  LeftOutlined, RightOutlined,
} from '@ant-design/icons-vue'
import ModuleShell from '@/components/proto/ModuleShell.vue'
import ScenePlan from '@/components/proto/ScenePlan.vue'
import {
  SCENES, SCENE_STATUS, SCENE_TYPES, TYPE_COLOR, PLAN_LEGEND, LC_FLOW,
  FACILITY_CATEGORIES, FACILITY_STATUS,
  type Scene, type SceneStatus, type SceneFacility,
} from '@/mock/scenes'

document.title = '场景管理 · 具身智能训练场'
const router = useRouter()

const MENU = [
  { key: 'overview', label: '场景总览', icon: DashboardOutlined,            group: '概览' },
  { key: 'lib',      label: '场景列表', icon: AppstoreOutlined,             group: '场景' },
  { key: 'facility', label: '设施管理', icon: ToolOutlined,                 group: '场景' },
  { key: 'booking',  label: '预约排程', icon: CalendarOutlined,             group: '场景' },
  { key: 'screen',   label: '大屏展示', icon: FundProjectionScreenOutlined,  group: '展示' },
]
const tab = ref('overview')
const openScreen = () => window.open(router.resolve('/m/scene/screen').href, '_blank')
const onTab = (k: string) => { if (k === 'screen') { openScreen(); return } tab.value = k }

// ── 通用 ─────────────────────────────────────────────────
const BOOK_STATUS: Record<string, { t: string; c: string }> = {
  confirmed: { t: '已确认', c: '#45E3A8' },
  pending:   { t: '待审核', c: '#FFC15C' },
  cancelled: { t: '已取消', c: '#8EA6BE' },
}

// ── 总览 ─────────────────────────────────────────────────
const statusCount = (s: SceneStatus) => SCENES.filter(x => x.status === s).length
const KPIS = computed(() => [
  { l: '场景总数',   v: SCENES.length,               u: '个',  k: '#2ED3E6' },
  { l: '正式启用',   v: statusCount('active'),        u: '个',  k: '#45E3A8' },
  { l: '试运行',     v: statusCount('trial'),         u: '个',  k: '#FFC15C' },
  { l: '建设中',     v: statusCount('building'),      u: '个',  k: '#5B9BFF' },
  { l: '维护中',     v: statusCount('maint'),         u: '个',  k: '#FFA940' },
  { l: '场地总面积', v: SCENES.filter(s => s.status !== 'retired').reduce((a, s) => a + s.area, 0).toLocaleString('en-US'), u: 'm²', k: '#B48CFF' },
])
const typeStats = computed(() =>
  SCENE_TYPES.map(t => ({ t, c: TYPE_COLOR[t], n: SCENES.filter(s => s.type === t).length, area: SCENES.filter(s => s.type === t).reduce((a, s) => a + s.area, 0) })).filter(x => x.n)
)
const damagedFacilities = computed(() =>
  SCENES.flatMap(s => s.facilities.filter(f => f.status !== 'normal').map(f => ({ scene: s.name, sceneId: s.id, ...f })))
)
const allUpcomingBookings = computed(() =>
  SCENES.flatMap(s => s.bookings.map(b => ({ ...b, sceneName: s.name }))).sort((a, b) => (a.date + a.timeStart) < (b.date + b.timeStart) ? -1 : 1).slice(0, 6)
)

// ── 场景列表 ─────────────────────────────────────────────
const f = reactive({ type: '全部', status: '全部', kw: '' })
const list = computed(() =>
  SCENES.filter(s =>
    (f.type === '全部' || s.type === f.type) &&
    (f.status === '全部' || SCENE_STATUS[s.status].t === f.status) &&
    (!f.kw || s.name.includes(f.kw) || s.id.includes(f.kw))
  )
)
const cur = ref<Scene>(SCENES[0])
const detailTab = ref<'base' | 'lc' | 'facility'>('base')
const planOpen = ref(false)

const sceneFormOpen = ref(false)
const editingScene = ref<Scene | null>(null)
const sceneForm = reactive({ name: '', type: '综合', area: 500, capacity: 6, open: '08:00–20:00', owner: '', location: '', difficulty: 3, desc: '' })
const openAddScene  = () => { editingScene.value = null; sceneFormOpen.value = true }
const openEditScene = (s: Scene) => { editingScene.value = s; Object.assign(sceneForm, { name: s.name, type: s.type, area: s.area, capacity: s.capacity, open: s.open, owner: s.owner, location: s.location, difficulty: s.difficulty, desc: s.desc }); sceneFormOpen.value = true }
const submitScene   = () => { sceneFormOpen.value = false; message.success(editingScene.value ? '场景信息已更新（演示）' : '场景已创建（演示）') }

const lcConfirmOpen = ref(false)
const lcRemark = ref('')
const lcTargetStatus = ref<string | null>(null)
const cameraOpen = ref(false)
const openChangeStatus = (s: string) => { lcTargetStatus.value = s; lcRemark.value = ''; lcConfirmOpen.value = true }
const pushStatus = () => {
  if (!lcTargetStatus.value) return
  cur.value.status = lcTargetStatus.value as any
  cur.value.lifecycle.push({ date: new Date().toISOString().slice(0, 10), status: lcTargetStatus.value as any, by: '当前用户', note: lcRemark.value || '手动变更状态' })
  lcConfirmOpen.value = false
  message.success(`状态已更新为「${SCENE_STATUS[lcTargetStatus.value].t}」`)
}

// ── 设施管理 ─────────────────────────────────────────────
const fScene = ref<Scene>(SCENES[0])
const fFilter = reactive({ category: '全部', status: '全部', kw: '' })
const facilityList = computed(() =>
  fScene.value.facilities.filter(f =>
    (fFilter.category === '全部' || f.category === fFilter.category) &&
    (fFilter.status === '全部' || FACILITY_STATUS[f.status].t === fFilter.status) &&
    (!fFilter.kw || f.name.includes(fFilter.kw))
  )
)
const facilityFormOpen = ref(false)
const editingFacility = ref<SceneFacility | null>(null)
const facilityForm = reactive({ name: '', category: '障碍设施', qty: 1, spec: '', installedAt: '', remark: '' })
const openAddFacility  = () => { editingFacility.value = null; Object.assign(facilityForm, { name: '', category: '障碍设施', qty: 1, spec: '', installedAt: '', remark: '' }); facilityFormOpen.value = true }
const openEditFacility = (f: SceneFacility) => { editingFacility.value = f; Object.assign(facilityForm, f); facilityFormOpen.value = true }
const submitFacility   = () => { facilityFormOpen.value = false; message.success(editingFacility.value ? '设施已更新（演示）' : '设施已添加（演示）') }
const changeStatus     = (f: SceneFacility, s: string) => message.success(`${f.name} 状态已更新为「${FACILITY_STATUS[s].t}」（演示）`)

// ── 预约排程 ─────────────────────────────────────────────
// 日历
const today = new Date()
const calYear  = ref(today.getFullYear())
const calMonth = ref(today.getMonth()) // 0-indexed
const calSceneId = ref<string | null>(null)

const calTitle = computed(() => `${calYear.value} 年 ${calMonth.value + 1} 月`)
const prevMonth = () => { if (calMonth.value === 0) { calYear.value--; calMonth.value = 11 } else calMonth.value-- }
const nextMonth = () => { if (calMonth.value === 11) { calYear.value++; calMonth.value = 0  } else calMonth.value++ }

const calDays = computed(() => {
  const y = calYear.value, m = calMonth.value
  const first = new Date(y, m, 1).getDay() // 0=Sun
  const days = new Date(y, m + 1, 0).getDate()
  const cells: { date: string | null; day: number }[] = []
  // pad with Mon start
  const pad = (first + 6) % 7
  for (let i = 0; i < pad; i++) cells.push({ date: null, day: 0 })
  for (let d = 1; d <= days; d++) {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ date: ds, day: d })
  }
  return cells
})

const allBookings = computed(() => {
  const src = calSceneId.value ? SCENES.filter(s => s.id === calSceneId.value) : SCENES
  return src.flatMap(s => s.bookings.map(b => ({ ...b, sceneName: s.name, sceneColor: TYPE_COLOR[s.type] })))
})

const bookingsOnDay = (date: string) => allBookings.value.filter(b => b.date === date && b.status !== 'cancelled')

// 冲突检测
const hasConflict = (sceneId: string, date: string, start: string, end: string, excludeId = '') => {
  const scene = SCENES.find(s => s.id === sceneId)
  if (!scene) return false
  return scene.bookings.some(b =>
    b.id !== excludeId &&
    b.date === date &&
    b.status !== 'cancelled' &&
    !(end <= b.timeStart || start >= b.timeEnd)
  )
}

// 选中日期
const selectedDate = ref<string | null>(null)
const selectedDayBookings = computed(() => selectedDate.value ? bookingsOnDay(selectedDate.value) : [])
const isToday = (date: string) => date === `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

// 新建预约
const bookingFormOpen = ref(false)
const bookingForm = reactive({ sceneId: '', date: '', timeStart: '', timeEnd: '', team: '', purpose: '' })
const bookingConflict = computed(() =>
  bookingForm.sceneId && bookingForm.date && bookingForm.timeStart && bookingForm.timeEnd
    ? hasConflict(bookingForm.sceneId, bookingForm.date, bookingForm.timeStart, bookingForm.timeEnd)
    : false
)
const openNewBooking = (date?: string) => {
  Object.assign(bookingForm, { sceneId: calSceneId.value ?? '', date: date ?? '', timeStart: '', timeEnd: '', team: '', purpose: '' })
  bookingFormOpen.value = true
}
const submitBooking = () => {
  if (!bookingForm.sceneId || !bookingForm.date || !bookingForm.timeStart || !bookingForm.timeEnd) { message.warning('请完整选择场景、日期和时间段'); return }
  if (bookingForm.timeEnd <= bookingForm.timeStart) { message.warning('结束时间需晚于开始时间'); return }
  if (bookingConflict.value) { message.error('该时段已有预约，存在冲突，请调整时间'); return }
  bookingFormOpen.value = false
  message.success('预约已提交，等待确认（演示）')
}

// 列表视图
const bkView = ref<'cal' | 'list'>('cal')
const bkFilter = reactive({ sceneId: '', status: '全部', date: '' })
const bkList = computed(() =>
  SCENES.flatMap(s => s.bookings.map(b => ({ ...b, sceneName: s.name, sceneColor: TYPE_COLOR[s.type] })))
    .filter(b =>
      (!bkFilter.sceneId || b.sceneId === bkFilter.sceneId) &&
      (bkFilter.status === '全部' || BOOK_STATUS[b.status].t === bkFilter.status) &&
      (!bkFilter.date || b.date === bkFilter.date)
    )
    .sort((a, b) => (a.date + a.timeStart) < (b.date + b.timeStart) ? -1 : 1)
)
const approveBooking = (b: any) => message.success(`已确认「${b.sceneName}」${b.date} 的预约（演示）`)
const cancelBooking  = (b: any) => message.warning(`已取消预约（演示）`)
</script>

<template>
  <ModuleShell :active="tab" title="场景管理" en="Scene Management" :menu="MENU" @update:active="onTab">

    <!-- ═══════════════ 场景总览 ═══════════════ -->
    <template v-if="tab === 'overview'">
      <div class="ov-page">

        <!-- 顶部标题 + KPI 行 -->
        <div class="ov-top">
          <div class="ov-title-row">
            <div><h2 style="margin:0;font-size:18px">场景总览</h2><p style="margin:2px 0 0;font-size:12px;color:var(--muted)">全部训练场景的状态概况与设施异常提示</p></div>
            <a-button type="primary" size="small" @click="tab = 'lib'; openAddScene()"><PlusOutlined />新建场景</a-button>
          </div>
          <div class="ov-kpis">
            <div v-for="k in KPIS" :key="k.l" class="ov-kpi" :style="{ '--k': k.k }">
              <small>{{ k.l }}</small><b>{{ k.v }}<em>{{ k.u }}</em></b><span class="kpi-line" />
            </div>
          </div>
        </div>

        <!-- 主体三列网格 -->
        <div class="ov-grid">

          <!-- 左列：场景类型分布 -->
          <div class="pp-panel ov-col">
            <div class="pp-panel-h"><h3>场景类型分布</h3></div>
            <div class="ov-typelist">
              <div v-for="x in typeStats" :key="x.t" class="ov-typerow" :style="{ '--c': x.c }">
                <div class="ov-typerow-label"><i :style="{ background: x.c }" />{{ x.t }}</div>
                <div class="ov-typerow-bar"><div class="fill" :style="{ width: (x.n / SCENES.length * 100) + '%' }" /></div>
                <div class="ov-typerow-val">{{ x.n }}个 · {{ x.area.toLocaleString() }}m²</div>
              </div>
            </div>
            <div class="pp-panel-h" style="margin-top:auto;padding-top:10px;border-top:1px solid var(--line)"><h3>生命周期分布</h3><a class="r" style="font-size:12px;cursor:pointer" @click="tab='lib'">查看全部 →</a></div>
            <div class="ov-stages">
              <button v-for="st in LC_FLOW" :key="st" type="button" class="ov-stage" :style="{ '--c': SCENE_STATUS[st].c }" @click="tab='lib'; f.status = st">
                <small>{{ SCENE_STATUS[st].t }}</small>
                <b>{{ SCENES.filter(x => x.status === st).length }}<em>个</em></b>
              </button>
            </div>
          </div>

          <!-- 中列：设施异常 -->
          <div class="pp-panel ov-col">
            <div class="pp-panel-h">
              <h3>设施异常</h3>
              <a-badge v-if="damagedFacilities.length" :count="damagedFacilities.length" color="#FFA940" style="margin-left:6px" />
              <a class="r" style="font-size:12px;cursor:pointer" @click="tab='facility'">进入管理 →</a>
            </div>
            <div v-if="damagedFacilities.length" class="ov-alerts">
              <div v-for="f in damagedFacilities" :key="f.id" class="ov-alert" :class="f.status==='damaged'?'bad':'warn'">
                <ExclamationCircleOutlined style="flex:none;margin-top:2px" />
                <div><b>{{ f.scene }} · {{ f.name }}</b><span>{{ FACILITY_STATUS[f.status].t }}{{ f.remark ? ' — '+f.remark : '' }}</span></div>
              </div>
            </div>
            <div v-else class="ov-empty"><CheckCircleOutlined style="color:#45E3A8;font-size:20px" /><span>所有设施状态正常</span></div>
          </div>

          <!-- 右列：近期预约 -->
          <div class="pp-panel ov-col">
            <div class="pp-panel-h"><h3>近期预约</h3><a class="r" style="font-size:12px;cursor:pointer" @click="tab='booking'">查看全部 →</a></div>
            <div class="ov-bks">
              <div v-for="b in allUpcomingBookings.slice(0,6)" :key="b.id" class="ov-bk" :style="{ '--c': BOOK_STATUS[b.status].c }">
                <div class="ov-bk-date"><b>{{ b.date.slice(8) }}</b><small>{{ +b.date.slice(5,7) }}月</small></div>
                <div class="ov-bk-main">
                  <div class="ov-bk-t"><b>{{ b.purpose }}</b><em>{{ BOOK_STATUS[b.status].t }}</em></div>
                  <small class="muted"><span class="mono">{{ b.timeStart }}–{{ b.timeEnd }}</span> · {{ b.sceneName }}</small>
                </div>
              </div>
              <div v-if="!allUpcomingBookings.length" class="bz-empty">暂无预约记录</div>
            </div>
          </div>

        </div>
      </div>
    </template>

    <!-- ═══════════════ 场景列表 ═══════════════ -->
    <template v-else-if="tab === 'lib'">
      <div class="pp-head">
        <div><h2>场景列表</h2><p>管理全部训练场景档案与生命周期</p></div>
        <div class="r"><a-button type="primary" @click="openAddScene"><PlusOutlined />新建场景</a-button></div>
      </div>
      <div class="sc">
        <div class="pp-panel sc-list">
          <div class="pp-panel-h"><h3>场景</h3><span class="muted" style="font-size:12px">{{ list.length }}/{{ SCENES.length }}</span></div>
          <div class="sc-filter">
            <a-input v-model:value="f.kw" allow-clear placeholder="搜索名称 / 编号"><template #prefix><SearchOutlined class="muted" /></template></a-input>
            <div class="sc-tags">
              <button v-for="t in ['全部',...SCENE_TYPES]" :key="t" type="button" :class="{ on: f.type===t }" @click="f.type=t">{{ t }}</button>
            </div>
            <div class="sc-tags">
              <button v-for="s in ['全部','正式启用','试运行','建设中','规划中','维护中','已停用']" :key="s" type="button" :class="{ on: f.status===s }" @click="f.status=s">{{ s }}</button>
            </div>
          </div>
          <div class="sc-items">
            <button v-for="s in list" :key="s.id" type="button" class="sc-item" :class="{ on: cur.id===s.id }" :style="{ '--c': TYPE_COLOR[s.type] }" @click="cur=s; detailTab='base'">
              <span class="sc-mini"><ScenePlan :items="s.plan" :labels="false" :anim="false" :dim="['planning','building'].includes(s.status)" /></span>
              <span class="sc-item-b">
                <span class="sc-item-t"><b>{{ s.name }}</b><a-badge :status="SCENE_STATUS[s.status].b" :text="SCENE_STATUS[s.status].t" /></span>
                <small><i :style="{ background: TYPE_COLOR[s.type] }" />{{ s.type }} · {{ s.area }} m² · {{ s.location }}</small>
              </span>
            </button>
          </div>
        </div>

        <div class="sc-detail">
          <div class="pp-panel sc-hd" :style="{ '--c': TYPE_COLOR[cur.type] }">
            <div class="sc-hd-top">
              <div class="sc-hd-info">
                <div class="mono muted" style="font-size:12px">{{ cur.id }} · {{ cur.location }}</div>
                <h3>{{ cur.name }}</h3>
                <div class="sc-hd-tags">
                  <a-tag :style="{ color: TYPE_COLOR[cur.type], borderColor: TYPE_COLOR[cur.type]+'55', background: TYPE_COLOR[cur.type]+'15' }">{{ cur.type }}</a-tag>
                  <a-badge :status="SCENE_STATUS[cur.status].b" :text="SCENE_STATUS[cur.status].t" />
                  <a-tag v-for="t in cur.tags" :key="t" style="font-size:11px">{{ t }}</a-tag>
                </div>
                <p class="muted" style="margin:8px 0 0;font-size:13px">{{ cur.desc }}</p>
              </div>
              <div class="sc-hd-meta">
                <div><small>面积</small><b>{{ cur.area }} m²</b></div>
                <div><small>同时容纳</small><b>{{ cur.capacity }} 台</b></div>
                <div><small>开放时间</small><b>{{ cur.open }}</b></div>
                <div><small>负责人</small><b>{{ cur.owner || '—' }}</b></div>
                <div><small>难度等级</small><b><a-rate :value="cur.difficulty" disabled style="font-size:11px;color:#FFC15C" /></b></div>
                <div><small>创建日期</small><b class="mono">{{ cur.createdAt }}</b></div>
              </div>
            </div>
            <div class="sc-hd-actions">
              <a-button size="small" @click="planOpen=true"><ExpandOutlined />查看布局</a-button>
              <a-button size="small" @click="cameraOpen=true"><VideoCameraOutlined />监控视频</a-button>
              <a-button size="small" @click="openEditScene(cur)"><EditOutlined />编辑</a-button>
              <a-dropdown>
                <template #overlay>
                  <a-menu>
                    <a-menu-item-group title="切换状态">
                      <a-menu-item v-for="st in LC_FLOW" :key="st" :disabled="st===cur.status" @click="openChangeStatus(st)">
                        <a-badge :color="SCENE_STATUS[st].c" :text="SCENE_STATUS[st].t" />
                        <CheckCircleOutlined v-if="st===cur.status" style="margin-left:6px;color:#52c41a" />
                      </a-menu-item>
                    </a-menu-item-group>
                    <a-menu-divider />
                    <a-menu-item @click="tab='facility'; fScene=cur">管理设施</a-menu-item>
                    <a-menu-item @click="tab='booking'; calSceneId=cur.id">查看预约</a-menu-item>
                  </a-menu>
                </template>
                <a-button size="small"><SettingOutlined />状态管理<DownOutlined /></a-button>
              </a-dropdown>
            </div>
          </div>

          <div class="pp-panel sc-body">
            <div class="sc-tabs">
              <button v-for="t in [{ k:'base',l:'基本档案' },{ k:'lc',l:'生命周期' },{ k:'facility',l:'设施清单' }]"
                :key="t.k" type="button" :class="{ on: detailTab===t.k }" @click="detailTab=t.k as any">{{ t.l }}</button>
            </div>

            <!-- 基本档案 -->
            <div v-if="detailTab==='base'" class="sc-base-pane">
              <div class="sc-base-left">
                <div class="sc-sub-h">
                  场景平面图
                  <div class="sc-legend">
                    <span v-for="l in PLAN_LEGEND" :key="l.k"><i :style="{ background: l.c }" />{{ l.t }}</span>
                  </div>
                </div>
                <div class="sc-plan-b"><ScenePlan :key="cur.id" :items="cur.plan" :dim="['planning','building'].includes(cur.status)" /></div>
              </div>
              <div class="sc-base-right">
                <div class="sc-sub-h">设施概况<a style="margin-left:auto;font-size:12px;font-weight:400;cursor:pointer" @click="tab='facility'; fScene=cur">进入设施管理 →</a></div>
                <div class="lg-rows">
                  <div v-for="f in cur.facilities.slice(0,6)" :key="f.id" class="lg-row">
                    <b class="lg-col-name">{{ f.name }}</b>
                    <span class="muted" style="font-size:12px;flex:none">{{ f.category }}</span>
                    <span class="mono muted" style="font-size:12px;flex:none">×{{ f.qty }}</span>
                    <span :style="{ color: FACILITY_STATUS[f.status].c, fontSize:'12px', flex:'none' }">{{ FACILITY_STATUS[f.status].t }}</span>
                  </div>
                  <div v-if="!cur.facilities.length" class="bz-empty" style="padding:12px">暂无设施记录</div>
                </div>

                <div class="sc-sub-h" style="margin-top:16px">近期预约<a style="margin-left:auto;font-size:12px;font-weight:400;cursor:pointer" @click="tab='booking'; calSceneId=cur.id">进入排程 →</a></div>
                <div class="lg-rows">
                  <div v-for="b in cur.bookings.slice(0,4)" :key="b.id" class="lg-row">
                    <span class="mono muted lg-col-date">{{ b.date.slice(5) }}</span>
                    <span class="mono lg-col-time">{{ b.timeStart }}–{{ b.timeEnd }}</span>
                    <b class="lg-col-purpose">{{ b.purpose }}</b>
                    <em :style="{ color: BOOK_STATUS[b.status].c, fontSize:'12px', fontStyle:'normal', flex:'none' }">{{ BOOK_STATUS[b.status].t }}</em>
                  </div>
                  <div v-if="!cur.bookings.length" class="bz-empty" style="padding:12px">暂无预约记录</div>
                </div>
              </div>
            </div>

            <!-- 生命周期 -->
            <div v-else-if="detailTab==='lc'" class="sc-lc-pane">
              <div class="lc-track">
                <div v-for="(s,i) in LC_FLOW" :key="s" class="lc-node"
                  :class="{ done: LC_FLOW.indexOf(cur.status)>i, active: cur.status===s }">
                  <div class="lc-dot"><span>{{ i+1 }}</span></div>
                  <div v-if="i<LC_FLOW.length-1" class="lc-conn" />
                  <div class="lc-label">{{ SCENE_STATUS[s].t }}</div>
                </div>
              </div>
              <div class="sc-sub-h" style="margin-top:20px">状态变更记录</div>
              <a-timeline style="margin-top:14px;padding:0 4px">
                <a-timeline-item v-for="r in [...cur.lifecycle].reverse()" :key="r.date+r.status" :color="SCENE_STATUS[r.status].c">
                  <div class="lc-rec">
                    <div class="lc-rec-head">
                      <span class="lc-rec-status" :style="{ color: SCENE_STATUS[r.status].c }">{{ SCENE_STATUS[r.status].t }}</span>
                      <span class="mono muted" style="font-size:12px">{{ r.date }}</span>
                      <span class="muted" style="font-size:12px">{{ r.operator }}</span>
                    </div>
                    <p v-if="r.remark" class="lc-rec-remark">{{ r.remark }}</p>
                  </div>
                </a-timeline-item>
              </a-timeline>
            </div>

            <!-- 设施清单 -->
            <div v-else-if="detailTab==='facility'" class="sc-tab-pane">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <span class="muted" style="font-size:13px">共 {{ cur.facilities.length }} 项设施</span>
                <a-button size="small" @click="tab='facility'; fScene=cur">进入设施管理</a-button>
              </div>
              <a-table :data-source="cur.facilities" row-key="id" size="small" :pagination="false"
                :columns="[{title:'名称',dataIndex:'name',ellipsis:true},{title:'分类',dataIndex:'category',width:90},{title:'数量',dataIndex:'qty',width:60,align:'right'},{title:'规格',dataIndex:'spec',ellipsis:true},{title:'安装日期',dataIndex:'installedAt',width:100},{title:'状态',key:'status',width:80}]">
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key==='status'"><span :style="{ color: FACILITY_STATUS[record.status].c }">{{ FACILITY_STATUS[record.status].t }}</span></template>
                </template>
              </a-table>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ═══════════════ 设施管理 ═══════════════ -->
    <template v-else-if="tab === 'facility'">
      <div class="pp-head">
        <div><h2>设施管理</h2><p>管理各场景内的固定设施档案与状态</p></div>
        <div class="r">
          <a-select :value="fScene.id" style="width:180px;margin-right:12px"
            :options="SCENES.map(s=>({value:s.id,label:s.name}))"
            @change="(v:any)=>{ fScene=SCENES.find(s=>s.id===v)??SCENES[0] }">
            <template #option="{ label, value: sid }">
              <div style="display:flex;align-items:center;gap:8px">
                <i :style="{ width:'7px',height:'7px',borderRadius:'1px',background:TYPE_COLOR[SCENES.find(s=>s.id===sid)?.type??'综合'],display:'inline-block' }" />{{ label }}
              </div>
            </template>
          </a-select>
          <a-button type="primary" @click="openAddFacility"><PlusOutlined />添加设施</a-button>
        </div>
      </div>

      <div class="pp-panel fac-scene-bar">
        <div class="fac-scene-info">
          <span class="mono muted" style="font-size:12px">{{ fScene.id }}</span>
          <b style="font-size:16px;margin-left:10px">{{ fScene.name }}</b>
          <a-tag :style="{ marginLeft:'10px', color:TYPE_COLOR[fScene.type], borderColor:TYPE_COLOR[fScene.type]+'55', background:TYPE_COLOR[fScene.type]+'15' }">{{ fScene.type }}</a-tag>
          <a-badge :status="SCENE_STATUS[fScene.status].b" :text="SCENE_STATUS[fScene.status].t" style="margin-left:10px" />
        </div>
        <div class="fac-scene-kpis">
          <div v-for="item in [{l:'设施总数',v:fScene.facilities.length,c:'#2ED3E6'},{l:'正常',v:fScene.facilities.filter(f=>f.status==='normal').length,c:'#45E3A8'},{l:'异常',v:fScene.facilities.filter(f=>f.status!=='normal').length,c:'#FF7A7A'}]" :key="item.l" class="fac-kpi">
            <small>{{ item.l }}</small><b :style="{ color:item.c }">{{ item.v }}</b>
          </div>
        </div>
      </div>

      <!-- 筛选栏（对齐 BizRecords rc-filter 样式） -->
      <div class="pp-panel" style="padding:0;margin-bottom:0">
        <div class="rc-filter">
          <div class="rc-f"><span>设施分类</span>
            <a-select v-model:value="fFilter.category" :options="['全部',...FACILITY_CATEGORIES].map(v=>({value:v,label:v}))" />
          </div>
          <div class="rc-f"><span>状态</span>
            <a-select v-model:value="fFilter.status" :options="['全部','正常','损坏','维修中','已报废'].map(v=>({value:v,label:v}))" />
          </div>
          <div class="rc-f"><span>关键词</span>
            <a-input v-model:value="fFilter.kw" allow-clear placeholder="搜索设施名称" />
          </div>
          <div class="rc-btns" style="grid-column:span 3">
            <a-button @click="Object.assign(fFilter,{category:'全部',status:'全部',kw:''})">重置</a-button>
          </div>
        </div>
      </div>

      <div class="pp-panel" style="padding:0;overflow:hidden">
        <a-table :data-source="facilityList" row-key="id" size="middle" :pagination="{ pageSize:12, showSizeChanger:false, showTotal:(t:number)=>`共 ${t} 项` }"
          :locale="{ emptyText:'该场景暂无设施记录' }"
          :columns="[{title:'编号',dataIndex:'id',width:110},{title:'设施名称',dataIndex:'name',ellipsis:true},{title:'分类',dataIndex:'category',width:90},{title:'数量',dataIndex:'qty',width:60,align:'right'},{title:'规格说明',dataIndex:'spec',ellipsis:true},{title:'安装日期',dataIndex:'installedAt',width:100},{title:'状态',key:'status',width:90},{title:'备注',dataIndex:'remark',ellipsis:true},{title:'操作',key:'action',width:110,fixed:'right'}]">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key==='status'">
              <a-dropdown trigger="click">
                <span :style="{ color:FACILITY_STATUS[record.status].c, cursor:'pointer' }">{{ FACILITY_STATUS[record.status].t }} ▾</span>
                <template #overlay>
                  <a-menu>
                    <a-menu-item v-for="(meta,key) in FACILITY_STATUS" :key="key" :disabled="key===record.status" @click="changeStatus(record,key)">
                      <span :style="{ color:meta.c }">{{ meta.t }}</span>
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </template>
            <template v-else-if="column.key==='action'">
              <span class="bz-ops">
                <a @click="openEditFacility(record)">编辑</a>
                <a class="d" @click="message.warning('删除功能演示中')">删除</a>
              </span>
            </template>
          </template>
        </a-table>
      </div>
    </template>

    <!-- ═══════════════ 预约排程 ═══════════════ -->
    <template v-else-if="tab === 'booking'">
      <div class="pp-head">
        <div><h2>预约排程</h2><p>管理各场景的使用预约与时段安排，系统自动检测时段冲突</p></div>
        <div class="r" style="gap:10px;display:flex;align-items:center">
          <!-- 视图切换 -->
          <div class="bk-view-switch">
            <button :class="{ on: bkView==='cal' }" @click="bkView='cal'"><CalendarOutlined />日历</button>
            <button :class="{ on: bkView==='list'}" @click="bkView='list'">列表</button>
          </div>
          <a-button type="primary" @click="openNewBooking()"><PlusOutlined />新建预约</a-button>
        </div>
      </div>

      <!-- 统计条 -->
      <div class="bk-kpis">
        <div v-for="item in [
          { l:'全部预约', v:SCENES.flatMap(s=>s.bookings).length,                              c:'#2ED3E6' },
          { l:'已确认',   v:SCENES.flatMap(s=>s.bookings).filter(b=>b.status==='confirmed').length, c:'#45E3A8' },
          { l:'待审核',   v:SCENES.flatMap(s=>s.bookings).filter(b=>b.status==='pending').length,   c:'#FFC15C' },
          { l:'已取消',   v:SCENES.flatMap(s=>s.bookings).filter(b=>b.status==='cancelled').length, c:'#8EA6BE' },
        ]" :key="item.l" class="bk-kpi" :style="{ '--c':item.c }">
          <small>{{ item.l }}</small><b :style="{ color:item.c }">{{ item.v }}</b>
        </div>
      </div>

      <!-- ── 日历视图 ── -->
      <template v-if="bkView==='cal'">
        <div class="bk-cal-wrap">
          <!-- 日历主体 -->
          <div class="pp-panel bk-cal-panel">
            <div class="bk-cal-head">
              <a-button type="text" size="small" @click="prevMonth"><LeftOutlined /></a-button>
              <span class="bk-cal-title">{{ calTitle }}</span>
              <a-button type="text" size="small" @click="nextMonth"><RightOutlined /></a-button>
              <div style="flex:1" />
              <a-select :value="calSceneId" allow-clear placeholder="全部场景" style="width:150px"
                :options="SCENES.map(s=>({value:s.id,label:s.name}))"
                @change="(v:any)=>calSceneId=v??null" />
            </div>
            <!-- 星期头 -->
            <div class="bk-cal-dow">
              <span v-for="d in ['一','二','三','四','五','六','日']" :key="d">{{ d }}</span>
            </div>
            <!-- 日期格 -->
            <div class="bk-cal-grid">
              <div v-for="(cell,i) in calDays" :key="i"
                class="bk-cell"
                :class="{ empty: !cell.date, today: cell.date && isToday(cell.date), selected: !!cell.date && cell.date===selectedDate, weekend: (i%7)>=5 }"
                @click="cell.date && (selectedDate = selectedDate===cell.date ? null : cell.date)">
                <span class="bk-cell-day">{{ cell.day || '' }}</span>
                <div class="bk-cell-events">
                  <div v-for="b in bookingsOnDay(cell.date??'').slice(0,3)" :key="b.id"
                    class="bk-event" :style="{ '--ec': b.sceneColor }"
                    :title="`${b.timeStart}–${b.timeEnd} ${b.sceneName} · ${b.purpose}`">
                    <span class="bk-event-time">{{ b.timeStart }}</span>
                    <span class="bk-event-name">{{ b.purpose }}</span>
                  </div>
                  <div v-if="bookingsOnDay(cell.date??'').length>3" class="bk-event-more">
                    +{{ bookingsOnDay(cell.date??'').length-3 }} 条
                  </div>
                </div>
                <button v-if="cell.date" class="bk-cell-add" @click.stop="openNewBooking(cell.date)" title="新建预约">+</button>
              </div>
            </div>
          </div>

          <!-- 右侧：选中日期详情 -->
          <div class="pp-panel bk-day-panel">
            <div class="pp-panel-h">
              <h3>{{ selectedDate ? selectedDate + ' 预约详情' : '选择日期查看' }}</h3>
            </div>
            <template v-if="selectedDate && selectedDayBookings.length">
              <div class="bk-day-list">
                <div v-for="b in selectedDayBookings" :key="b.id" class="bk-day-item" :style="{ '--bc': b.sceneColor }">
                  <div class="bk-day-time mono">{{ b.timeStart }}–{{ b.timeEnd }}</div>
                  <div class="bk-day-info">
                    <div class="bk-day-scene">{{ b.sceneName }}</div>
                    <div class="bk-day-purpose">{{ b.purpose }}</div>
                    <div class="bk-day-meta">
                      <span>{{ b.team }}</span>
                      <em :style="{ color:BOOK_STATUS[b.status].c }">{{ BOOK_STATUS[b.status].t }}</em>
                    </div>
                  </div>
                  <div class="bk-day-actions">
                    <a v-if="b.status==='pending'" @click="approveBooking(b)">确认</a>
                    <a v-if="b.status!=='cancelled'" class="d" @click="cancelBooking(b)">取消</a>
                  </div>
                </div>
              </div>
            </template>
            <template v-else-if="selectedDate">
              <div class="bz-empty">
                <div>当日暂无预约</div>
                <a-button size="small" style="margin-top:8px" @click="openNewBooking(selectedDate)"><PlusOutlined />新建预约</a-button>
              </div>
            </template>
            <template v-else>
              <div class="bz-empty">点击日历中的日期<br/>查看当天预约详情</div>
            </template>
          </div>
        </div>
      </template>

      <!-- ── 列表视图 ── -->
      <template v-else>
        <div class="pp-panel" style="padding:0;margin-bottom:0">
          <div class="rc-filter">
            <div class="rc-f"><span>场景</span>
              <a-select v-model:value="bkFilter.sceneId" allow-clear placeholder="全部场景"
                :options="SCENES.map(s=>({value:s.id,label:s.name}))" />
            </div>
            <div class="rc-f"><span>状态</span>
              <a-select v-model:value="bkFilter.status" :options="['全部','已确认','待审核','已取消'].map(v=>({value:v,label:v}))" />
            </div>
            <div class="rc-f"><span>日期</span>
              <a-date-picker v-model:value="bkFilter.date" value-format="YYYY-MM-DD" allow-clear style="width:100%" placeholder="选择日期" />
            </div>
            <div class="rc-btns" style="grid-column:span 3">
              <a-button @click="Object.assign(bkFilter,{sceneId:'',status:'全部',date:''})">重置</a-button>
            </div>
          </div>
        </div>
        <div class="pp-panel" style="padding:0;overflow:hidden">
          <a-table :data-source="bkList" row-key="id" size="middle"
            :pagination="{ pageSize:12, showSizeChanger:false, showTotal:(t:number)=>`共 ${t} 条` }"
            :locale="{ emptyText:'暂无预约记录' }"
            :columns="[{title:'场景',dataIndex:'sceneName',width:130,ellipsis:true},{title:'日期',dataIndex:'date',width:100},{title:'时段',key:'time',width:130},{title:'使用单位',dataIndex:'team',width:100},{title:'用途',dataIndex:'purpose',ellipsis:true},{title:'状态',key:'status',width:90},{title:'创建人',dataIndex:'createdBy',width:80},{title:'创建时间',dataIndex:'createdAt',width:100},{title:'操作',key:'action',width:110,fixed:'right'}]">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key==='time'"><span class="mono">{{ record.timeStart }} – {{ record.timeEnd }}</span></template>
              <template v-else-if="column.key==='status'"><span :style="{ color:BOOK_STATUS[record.status].c }">{{ BOOK_STATUS[record.status].t }}</span></template>
              <template v-else-if="column.key==='action'">
                <span class="bz-ops">
                  <a v-if="record.status==='pending'" @click="approveBooking(record)">确认</a>
                  <a v-if="record.status!=='cancelled'" class="d" @click="cancelBooking(record)">取消</a>
                </span>
              </template>
            </template>
          </a-table>
        </div>
      </template>
    </template>

    <!-- ══ 弹窗：场景编辑 ══ -->
    <a-modal v-model:open="sceneFormOpen" :title="editingScene?'编辑场景':'新建场景'" :width="700" ok-text="保存" @ok="submitScene">
      <a-form layout="vertical" style="margin-top:12px">
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="场景名称" required><a-input v-model:value="sceneForm.name" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="场景类型" required><a-select v-model:value="sceneForm.type" :options="SCENE_TYPES.map(v=>({value:v,label:v}))" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="面积（m²）"><a-input-number v-model:value="sceneForm.area" style="width:100%" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="同时容纳（台）"><a-input-number v-model:value="sceneForm.capacity" style="width:100%" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="难度"><a-rate v-model:value="sceneForm.difficulty" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="开放时间"><a-input v-model:value="sceneForm.open" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="负责人"><a-select v-model:value="sceneForm.owner" :options="['周工','赵工','张杰'].map(v=>({value:v,label:v}))" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="场地位置"><a-input v-model:value="sceneForm.location" placeholder="如：A 栋 1 层" /></a-form-item></a-col>
        </a-row>
        <a-form-item label="场景描述"><a-textarea v-model:value="sceneForm.desc" :rows="3" /></a-form-item>
      </a-form>
    </a-modal>

    <!-- 弹窗：变更状态 -->
    <a-modal v-model:open="lcConfirmOpen" title="变更场景状态" ok-text="确认变更" @ok="pushStatus">
      <div style="margin:12px 0 8px">
        将「{{ cur.name }}」的状态从
        <span :style="{ color:SCENE_STATUS[cur.status].c }">{{ SCENE_STATUS[cur.status].t }}</span>
        变更为
        <span v-if="lcTargetStatus" :style="{ color:SCENE_STATUS[lcTargetStatus].c }">{{ SCENE_STATUS[lcTargetStatus].t }}</span>
      </div>
      <a-form-item label="备注说明" style="margin-top:12px">
        <a-textarea v-model:value="lcRemark" :rows="3" placeholder="说明变更原因（选填）" />
      </a-form-item>
    </a-modal>

    <!-- 弹窗：监控视频 -->
    <a-modal v-model:open="cameraOpen" :title="`${cur.name} — 监控视频`" width="760px" :footer="null">
      <div class="cam-wrap">
        <div class="cam-tip"><VideoCameraOutlined /> 当前场景暂未接入实时监控流，以下为监控通道示意</div>
        <div class="cam-grid">
          <div v-for="i in 4" :key="i" class="cam-cell">
            <div class="cam-placeholder">
              <VideoCameraOutlined style="font-size:28px;opacity:.35" />
              <span>通道 {{ i }} · {{ cur.name }}</span>
              <small class="mono muted">无信号 / 未接入</small>
            </div>
            <div class="cam-label">CAM-{{ String(i).padStart(2,'0') }} &nbsp;·&nbsp; {{ ['正门入口','内部全景','充电区','出口通道'][i-1] }}</div>
          </div>
        </div>
        <div class="cam-footer">
          <a-tag color="orange">接入真实监控后此处将显示实时视频流</a-tag>
        </div>
      </div>
    </a-modal>

    <!-- 弹窗：设施编辑 -->
    <a-modal v-model:open="facilityFormOpen" :title="editingFacility?'编辑设施':'添加设施'" ok-text="保存" @ok="submitFacility">
      <a-form layout="vertical" style="margin-top:12px">
        <a-row :gutter="16">
          <a-col :span="14"><a-form-item label="设施名称" required><a-input v-model:value="facilityForm.name" /></a-form-item></a-col>
          <a-col :span="10"><a-form-item label="分类"><a-select v-model:value="facilityForm.category" :options="FACILITY_CATEGORIES.map(v=>({value:v,label:v}))" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="数量"><a-input-number v-model:value="facilityForm.qty" :min="1" style="width:100%" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="安装日期"><a-date-picker v-model:value="facilityForm.installedAt" value-format="YYYY-MM-DD" style="width:100%" /></a-form-item></a-col>
        </a-row>
        <a-form-item label="规格说明"><a-input v-model:value="facilityForm.spec" /></a-form-item>
        <a-form-item label="备注"><a-textarea v-model:value="facilityForm.remark" :rows="2" /></a-form-item>
      </a-form>
    </a-modal>

    <!-- 弹窗：新建预约（含冲突检测） -->
    <a-modal v-model:open="bookingFormOpen" title="新建预约" ok-text="提交预约" @ok="submitBooking">
      <a-alert v-if="bookingConflict" type="error" show-icon style="margin-bottom:12px"
        message="时段冲突" description="所选场景在该时段已有预约，请调整时间或更换场景。" />
      <a-form layout="vertical" style="margin-top:12px">
        <a-form-item label="选择场景" required>
          <a-select v-model:value="bookingForm.sceneId" placeholder="仅显示已启用/试运行场景"
            :options="SCENES.filter(s=>['active','trial'].includes(s.status)).map(s=>({value:s.id,label:s.name}))" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="日期" required><a-date-picker v-model:value="bookingForm.date" value-format="YYYY-MM-DD" style="width:100%" placeholder="选择日期" /></a-form-item></a-col>
          <a-col :span="6"><a-form-item label="开始时间"><a-time-picker v-model:value="bookingForm.timeStart" value-format="HH:mm" format="HH:mm" :minute-step="15" style="width:100%" placeholder="开始" /></a-form-item></a-col>
          <a-col :span="6"><a-form-item label="结束时间"><a-time-picker v-model:value="bookingForm.timeEnd" value-format="HH:mm" format="HH:mm" :minute-step="15" style="width:100%" placeholder="结束" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="使用单位" required><a-input v-model:value="bookingForm.team" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="用途" required><a-input v-model:value="bookingForm.purpose" /></a-form-item></a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 弹窗：平面图放大 -->
    <a-modal v-model:open="planOpen" :title="`${cur.name} · 场景平面图`" :width="1100" :footer="null">
      <div style="aspect-ratio:16/10;margin-top:12px"><ScenePlan :items="cur.plan" /></div>
    </a-modal>
  </ModuleShell>
</template>

<style scoped>
/* ── KPI ── */
/* ── 总览一屏布局 ── */
.ov-page { display: flex; flex-direction: column; gap: 12px; height: calc(100vh - 108px); }
.ov-top { flex: none; display: flex; flex-direction: column; gap: 10px; }
.ov-title-row { display: flex; align-items: flex-start; justify-content: space-between; }
.ov-kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
.ov-kpi { position: relative; padding: 10px 14px 8px; background: rgba(22,40,64,.7); border: 1px solid var(--line); border-top: 2px solid var(--k); border-radius: 4px; overflow: hidden; }
.ov-kpi small { display: block; font-size: 11px; color: var(--muted); margin-bottom: 4px; }
.ov-kpi b { font-size: 22px; font-weight: 600; color: var(--title); line-height: 1.2; }
.ov-kpi em { font-style: normal; font-size: 11px; color: var(--muted); margin-left: 3px; }
.kpi-line { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--k), transparent); opacity: .35; }

.ov-grid { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.ov-col { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }

/* 类型分布 */
.ov-typelist { padding: 4px 16px 10px; display: flex; flex-direction: column; gap: 10px; }
.ov-typerow { display: grid; grid-template-columns: 90px 1fr 110px; align-items: center; gap: 10px; }
.ov-typerow-label { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--text); }
.ov-typerow-label i { width: 6px; height: 6px; border-radius: 1px; flex: none; }
.ov-typerow-bar { height: 5px; background: rgba(46,211,230,.08); border-radius: 3px; overflow: hidden; }
.ov-typerow-bar .fill { height: 100%; background: var(--c); border-radius: 3px; transition: width .6s; }
.ov-typerow-val { font-size: 11.5px; color: var(--muted); text-align: right; }

/* 生命周期分布 */
.ov-stages { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 8px 16px 14px; }
.ov-stage { display: flex; flex-direction: column; gap: 3px; padding: 9px 12px; font: inherit; text-align: left; color: var(--text); cursor: pointer; background: rgba(46,211,230,.04); border: 1px solid rgba(46,211,230,.12); border-left: 3px solid var(--c); border-radius: 4px; transition: all .2s; }
.ov-stage:hover { background: rgba(46,211,230,.08); }
.ov-stage small { font-size: 11px; color: var(--muted); }
.ov-stage b { font-size: 18px; color: var(--c); font-family: var(--mono, monospace); line-height: 1.2; }
.ov-stage b em { font-style: normal; font-size: 11px; color: var(--muted); margin-left: 2px; }

/* 设施异常 */
.ov-alerts { padding: 0 16px 12px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; flex: 1; }
.ov-alert { display: flex; align-items: flex-start; gap: 10px; padding: 9px 12px; border-radius: 4px; font-size: 13px; }
.ov-alert.bad  { background: rgba(255,122,122,.07); border: 1px solid rgba(255,122,122,.3); color: #FF7A7A; }
.ov-alert.warn { background: rgba(255,193,92,.07);  border: 1px solid rgba(255,193,92,.3);  color: #FFA940; }
.ov-alert > div { flex: 1; } .ov-alert b { display: block; margin-bottom: 2px; font-size: 13px; } .ov-alert span { font-size: 12px; opacity: .85; }
.ov-empty { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 20px; color: var(--muted); font-size: 13px; }

/* 近期预约 */
.ov-bks { padding: 0 14px 12px; display: flex; flex-direction: column; gap: 7px; overflow-y: auto; flex: 1; }
.ov-bk { display: flex; gap: 10px; align-items: center; padding: 8px 10px; background: rgba(46,211,230,.04); border: 1px solid rgba(46,211,230,.12); border-radius: 4px; }
.ov-bk-date { flex: none; width: 40px; display: flex; flex-direction: column; align-items: center; padding: 3px 0; background: rgba(46,211,230,.1); border-radius: 4px; }
.ov-bk-date b { font-size: 16px; line-height: 1.1; color: var(--title); }
.ov-bk-date small { font-size: 10px; color: var(--muted); }
.ov-bk-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ov-bk-main small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11.5px; }
.ov-bk-t { display: flex; align-items: center; gap: 8px; }
.ov-bk-t b { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 500; }
.ov-bk-t em { flex: none; font-style: normal; font-size: 11px; color: var(--c); }

/* 已废弃旧布局（保留空规则防止引用报错） */
.ov-body {} .ov-left {} .ov-right {}
.ov-cards {} .ov-card {} .ov-card-plan {} .ov-card-body {} .ov-card-row {} .ov-stage-names {}

/* ── 通用列表行（对齐业务模块风格） ── */
.lg-rows { display: flex; flex-direction: column; }
.lg-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px dashed rgba(46,211,230,.1); font-size: 13px; }
.lg-row:last-child { border-bottom: none; }
.lg-col-date { flex: none; width: 44px; font-size: 12px; }
.lg-col-time { flex: none; width: 100px; }
.lg-col-scene { flex: none; width: 80px; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lg-col-purpose { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lg-col-name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── 场景列表 ── */
.sc { display: grid; grid-template-columns: 290px 1fr; gap: 16px; align-items: start; }
.sc-list { position: sticky; top: 0; }
.sc-filter { padding: 10px 12px 6px; display: flex; flex-direction: column; gap: 2px; }
.sc-tags { display: flex; flex-wrap: wrap; gap: 5px; margin: 6px 0 2px; }
.sc-tags button { padding: 2px 9px; font: inherit; font-size: 12px; color: var(--muted); cursor: pointer; background: rgba(46,211,230,.05); border: 1px solid var(--line); border-radius: 4px; transition: all .15s; }
.sc-tags button.on { color: #fff; border-color: var(--accent); background: var(--accent-soft); }
.sc-items { padding: 4px 8px 10px; max-height: calc(100vh - 300px); overflow-y: auto; }
.sc-item { width: 100%; display: flex; gap: 10px; align-items: center; padding: 9px 10px; margin-top: 4px; font: inherit; color: var(--text); text-align: left; cursor: pointer; background: transparent; border: 1px solid transparent; border-radius: 6px; transition: all .18s; }
.sc-item:hover { background: rgba(46,211,230,.05); }
.sc-item.on { background: linear-gradient(90deg, color-mix(in srgb, var(--c) 15%, transparent), rgba(27,51,82,.4)); border-color: color-mix(in srgb, var(--c) 50%, transparent); }
.sc-mini { width: 68px; height: 42px; flex: none; border: 1px solid rgba(46,211,230,.18); border-radius: 3px; overflow: hidden; }
.sc-item-b { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.sc-item-t { display: flex; align-items: center; gap: 6px; }
.sc-item-t b { font-size: 13px; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sc-item-t :deep(.ant-badge-status-text) { font-size: 11px; color: var(--muted); }
.sc-item small { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sc-item small i { width: 6px; height: 6px; border-radius: 1px; flex: none; }
.sc-detail { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.sc-hd { padding: 16px 20px; background: linear-gradient(120deg, color-mix(in srgb, var(--c) 14%, rgba(22,42,69,.9)), rgba(19,38,63,.85) 55%) !important; }
.sc-hd-top { display: flex; gap: 20px; align-items: flex-start; }
.sc-hd-info { flex: 1; }
.sc-hd-info h3 { margin: 3px 0 6px; font-size: 20px; color: #fff; letter-spacing: .5px; }
.sc-hd-tags { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.sc-hd-meta { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; min-width: 280px; }
.sc-hd-meta > div { padding: 7px 10px; background: rgba(0,0,0,.2); border-radius: 4px; }
.sc-hd-meta small { display: block; font-size: 11px; color: rgba(255,255,255,.5); margin-bottom: 2px; }
.sc-hd-meta b { font-size: 13px; color: #fff; font-weight: 500; }
.sc-hd-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.sc-body { padding: 0; overflow: hidden; }
.sc-tabs { display: flex; border-bottom: 1px solid rgba(46,211,230,.15); padding: 0 16px; }
.sc-tabs button { padding: 11px 14px; font: inherit; font-size: 13px; color: var(--muted); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: all .18s; margin-bottom: -1px; }
.sc-tabs button.on { color: var(--accent); border-bottom-color: var(--accent); }
.sc-tabs button:hover:not(.on) { color: var(--title); }
.sc-tab-pane { padding: 16px; }
.sc-base-pane { display: grid; grid-template-columns: 1.3fr 1fr; gap: 20px; padding: 16px; }
.sc-base-left, .sc-base-right { display: flex; flex-direction: column; gap: 14px; }
.sc-sub-h { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--title); padding-bottom: 6px; border-bottom: 1px solid rgba(46,211,230,.12); }
.sc-plan-b { aspect-ratio: 16/10; border: 1px solid rgba(46,211,230,.18); border-radius: 4px; overflow: hidden; }
.sc-legend { display: flex; flex-wrap: wrap; gap: 8px; margin-left: auto; }
.sc-legend span { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--muted); font-weight: 400; }
.sc-legend i { display: inline-block; width: 7px; height: 7px; border-radius: 2px; }
.sc-lc-pane { padding: 20px 24px; }
.lc-track { display: flex; align-items: flex-start; }
.lc-node { display: flex; flex-direction: column; align-items: center; position: relative; flex: 1; }
.lc-dot { width: 28px; height: 28px; border-radius: 50%; background: rgba(46,211,230,.08); border: 2px solid rgba(46,211,230,.2); display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--muted); z-index: 1; transition: all .3s; }
.lc-node.done   .lc-dot { background: rgba(69,227,168,.15); border-color: #45E3A8; color: #45E3A8; }
.lc-node.active .lc-dot { background: rgba(46,211,230,.2); border-color: var(--accent); color: #fff; box-shadow: 0 0 12px rgba(46,211,230,.4); }
.lc-conn { position: absolute; top: 13px; left: 50%; right: -50%; height: 2px; background: rgba(46,211,230,.12); z-index: 0; }
.lc-node.done .lc-conn { background: rgba(69,227,168,.45); }
.lc-label { margin-top: 8px; font-size: 12px; color: var(--muted); text-align: center; white-space: nowrap; }
.lc-node.done .lc-label, .lc-node.active .lc-label { color: var(--title); }
.lc-rec { display: flex; flex-direction: column; gap: 4px; }
.lc-rec-head { display: flex; align-items: center; gap: 10px; }
.lc-rec-status { font-size: 13px; font-weight: 600; }
.lc-rec-remark { margin: 0; font-size: 13px; color: var(--muted); }

/* ── 设施管理 ── */
.fac-scene-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; margin-bottom: 0; }
.fac-scene-info { display: flex; align-items: center; }
.fac-scene-kpis { display: flex; gap: 24px; }
.fac-kpi { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.fac-kpi small { font-size: 11px; color: var(--muted); }
.fac-kpi b { font-size: 22px; font-weight: 600; }

/* 对齐业务模块 rc-filter 样式 */
.rc-filter { display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 10px 16px; padding: 14px 16px; border-bottom: 1px solid rgba(46,211,230,.1); font-size: 13px; color: var(--muted); }
.rc-f { display: flex; align-items: center; gap: 8px; min-width: 0; }
.rc-f > span { flex: none; }
.rc-f > :deep(.ant-select), .rc-f > :deep(.ant-input-affix-wrapper), .rc-f > :deep(.ant-input) { flex: 1; min-width: 0; }
.rc-btns { display: flex; justify-content: flex-end; gap: 8px; }
.bz-ops a { margin-right: 12px; font-size: 12.5px; cursor: pointer; color: var(--accent); }
.bz-ops a.d { color: #FF7A7A; }
.bz-empty { padding: 40px 16px; text-align: center; color: var(--muted); font-size: 13px; }

/* ── 预约排程 ── */
.bk-view-switch { display: flex; border: 1px solid rgba(46,211,230,.3); border-radius: 4px; overflow: hidden; }
.bk-view-switch button { padding: 4px 12px; font: inherit; font-size: 13px; color: var(--muted); background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all .15s; }
.bk-view-switch button.on { background: rgba(46,211,230,.15); color: var(--accent); }
.bk-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.bk-kpi { padding: 14px 20px 12px; background: rgba(22,40,64,.7); border: 1px solid var(--line); border-left: 3px solid var(--c); border-radius: 4px; }
.bk-kpi small { display: block; font-size: 12px; color: var(--muted); margin-bottom: 4px; }
.bk-kpi b { font-size: 26px; font-weight: 600; }

/* 日历 */
.bk-cal-wrap { display: grid; grid-template-columns: 1fr 280px; gap: 16px; align-items: start; }
.bk-cal-panel { padding: 0; overflow: hidden; }
.bk-cal-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid rgba(46,211,230,.1); }
.bk-cal-title { font-size: 15px; font-weight: 600; color: var(--title); min-width: 120px; text-align: center; }
.bk-cal-dow { display: grid; grid-template-columns: repeat(7, 1fr); padding: 8px 12px 4px; }
.bk-cal-dow span { text-align: center; font-size: 12px; color: var(--muted); padding: 4px 0; }
.bk-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; padding: 0 12px 12px; }
.bk-cell { position: relative; min-height: 90px; padding: 6px; border: 1px solid rgba(46,211,230,.08); border-radius: 4px; cursor: pointer; transition: all .15s; display: flex; flex-direction: column; gap: 2px; }
.bk-cell:hover:not(.empty) { border-color: rgba(46,211,230,.3); background: rgba(46,211,230,.04); }
.bk-cell.empty { background: transparent; border-color: transparent; cursor: default; }
.bk-cell.today { border-color: var(--accent); background: rgba(46,211,230,.06); }
.bk-cell.selected { border-color: var(--accent); background: rgba(46,211,230,.1); }
.bk-cell.weekend .bk-cell-day { color: rgba(46,211,230,.6); }
.bk-cell-day { font-size: 12px; font-weight: 500; color: var(--title); line-height: 1; }
.bk-cell.today .bk-cell-day { color: var(--accent); font-weight: 700; }
.bk-cell-events { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.bk-event { display: flex; align-items: center; gap: 4px; padding: 2px 5px; background: color-mix(in srgb, var(--ec) 15%, rgba(22,40,64,.8)); border-left: 2px solid var(--ec); border-radius: 2px; font-size: 11px; overflow: hidden; cursor: pointer; }
.bk-event:hover { background: color-mix(in srgb, var(--ec) 25%, rgba(22,40,64,.8)); }
.bk-event-time { color: var(--ec); flex: none; font-family: var(--mono, monospace); }
.bk-event-name { color: var(--title); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
.bk-event-more { font-size: 11px; color: var(--muted); padding: 1px 4px; }
.bk-cell-add { position: absolute; right: 4px; top: 4px; width: 18px; height: 18px; border-radius: 3px; background: rgba(46,211,230,.15); border: none; color: var(--accent); font-size: 14px; line-height: 1; cursor: pointer; display: none; align-items: center; justify-content: center; }
.bk-cell:hover .bk-cell-add { display: flex; }

/* 日期详情侧栏 */
.bk-day-panel { display: flex; flex-direction: column; }
.bk-day-list { display: flex; flex-direction: column; gap: 10px; padding: 12px 16px; }
.bk-day-item { display: flex; gap: 12px; padding: 12px; background: rgba(46,211,230,.04); border: 1px solid rgba(46,211,230,.12); border-left: 3px solid var(--bc); border-radius: 4px; }
.bk-day-time { flex: none; font-size: 12px; color: var(--bc); width: 88px; }
.bk-day-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.bk-day-scene { font-size: 11px; color: var(--muted); }
.bk-day-purpose { font-size: 13px; color: var(--title); font-weight: 500; }
.bk-day-meta { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--muted); }
.bk-day-meta em { font-style: normal; }
.bk-day-actions { flex: none; display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
.bk-day-actions a { font-size: 12px; cursor: pointer; color: var(--accent); }
.bk-day-actions a.d { color: #FF7A7A; }

/* 监控视频弹窗 */
.cam-wrap { display: flex; flex-direction: column; gap: 12px; padding: 4px 0; }
.cam-tip { font-size: 12px; color: var(--muted, #8899aa); display: flex; align-items: center; gap: 6px; }
.cam-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.cam-cell { display: flex; flex-direction: column; gap: 4px; }
.cam-placeholder { height: 150px; background: rgba(0,0,0,.35); border: 1px solid rgba(46,211,230,.15); border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--muted, #8899aa); font-size: 12px; }
.cam-label { font-size: 11px; color: var(--muted, #8899aa); padding: 0 2px; font-family: var(--mono, monospace); }
.cam-footer { display: flex; justify-content: center; padding-top: 4px; }
</style>
