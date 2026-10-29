<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  DashboardOutlined, AppstoreOutlined, FundProjectionScreenOutlined,
  ToolOutlined, CalendarOutlined, PlusOutlined, SearchOutlined,
  EditOutlined, DeleteOutlined, MoreOutlined, ExpandOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined, ArrowRightOutlined,
} from '@ant-design/icons-vue'
import ModuleShell from '@/components/proto/ModuleShell.vue'
import ScenePlan from '@/components/proto/ScenePlan.vue'
import {
  SCENES, SCENE_STATUS, SCENE_TYPES, TYPE_COLOR, PLAN_LEGEND, LC_FLOW,
  FACILITY_CATEGORIES, FACILITY_STATUS,
  type Scene, type SceneStatus, type SceneFacility, type SceneBooking,
} from '@/mock/scenes'

document.title = '场景管理 · 具身智能训练场'
const router = useRouter()

const MENU = [
  { key: 'overview',  label: '场景总览', icon: DashboardOutlined,           group: '概览' },
  { key: 'lib',       label: '场景列表', icon: AppstoreOutlined,            group: '场景' },
  { key: 'facility',  label: '设施管理', icon: ToolOutlined,                group: '场景' },
  { key: 'booking',   label: '预约排程', icon: CalendarOutlined,            group: '场景' },
  { key: 'screen',    label: '大屏展示', icon: FundProjectionScreenOutlined, group: '展示' },
]
const tab = ref('overview')
const openScreen = () => window.open(router.resolve('/m/scene/screen').href, '_blank')
const onTab = (k: string) => { if (k === 'screen') { openScreen(); return } tab.value = k }

// ── 总览 ──────────────────────────────────────────────────
const statusCount = (s: SceneStatus) => SCENES.filter(x => x.status === s).length
const KPIS = computed(() => [
  { l: '场景总数', v: SCENES.length,               u: '个',  k: '#2ED3E6' },
  { l: '正式启用', v: statusCount('active'),        u: '个',  k: '#45E3A8' },
  { l: '试运行',   v: statusCount('trial'),         u: '个',  k: '#FFC15C' },
  { l: '建设中',   v: statusCount('building'),      u: '个',  k: '#5B9BFF' },
  { l: '维护中',   v: statusCount('maint'),         u: '个',  k: '#FFA940' },
  { l: '场地总面积', v: SCENES.filter(s => s.status !== 'retired').reduce((a, s) => a + s.area, 0).toLocaleString('en-US'), u: 'm²', k: '#B48CFF' },
])

const typeStats = computed(() =>
  SCENE_TYPES.map(t => ({
    t, c: TYPE_COLOR[t],
    n: SCENES.filter(s => s.type === t).length,
    area: SCENES.filter(s => s.type === t).reduce((a, s) => a + s.area, 0),
  })).filter(x => x.n)
)

// 设施异常汇总
const damagedFacilities = computed(() =>
  SCENES.flatMap(s => s.facilities
    .filter(f => f.status !== 'normal')
    .map(f => ({ scene: s.name, sceneId: s.id, ...f }))
  )
)

// ── 场景列表 ──────────────────────────────────────────────
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

// 添加/编辑场景
const sceneFormOpen = ref(false)
const editingScene = ref<Scene | null>(null)
const sceneForm = reactive({ name: '', type: '综合', area: 500, capacity: 6, open: '08:00–20:00', owner: '', location: '', difficulty: 3, desc: '' })
const openAddScene = () => { editingScene.value = null; sceneFormOpen.value = true }
const openEditScene = (s: Scene) => {
  editingScene.value = s
  Object.assign(sceneForm, { name: s.name, type: s.type, area: s.area, capacity: s.capacity, open: s.open, owner: s.owner, location: s.location, difficulty: s.difficulty, desc: s.desc })
  sceneFormOpen.value = true
}
const submitScene = () => { sceneFormOpen.value = false; message.success(editingScene.value ? '场景信息已更新（演示）' : '场景已创建（演示）') }

// 生命周期推进
const lcConfirmOpen = ref(false)
const nextStatus = computed(() => {
  const idx = LC_FLOW.indexOf(cur.value.status)
  return idx >= 0 && idx < LC_FLOW.length - 1 ? LC_FLOW[idx + 1] : null
})
const lcRemark = ref('')
const pushStatus = () => {
  lcConfirmOpen.value = false
  message.success(`状态已更新为「${SCENE_STATUS[nextStatus.value!].t}」（演示）`)
}

// ── 设施管理 ──────────────────────────────────────────────
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

// 设施状态变更
const changeStatus = (f: SceneFacility, s: string) => message.success(`${f.name} 状态已更新为「${FACILITY_STATUS[s].t}」（演示）`)

// ── 预约排程 ──────────────────────────────────────────────
const bScene = ref<Scene | null>(null)
const allBookings = computed(() => {
  const src = bScene.value ? [bScene.value] : SCENES
  return src.flatMap(s => s.bookings.map(b => ({ ...b, sceneName: s.name, sceneId: s.id })))
    .sort((a, b) => (a.date + a.timeStart) < (b.date + b.timeStart) ? -1 : 1)
})
const BOOK_STATUS: Record<string, { t: string; c: string }> = {
  confirmed: { t: '已确认', c: '#45E3A8' },
  pending:   { t: '待审核', c: '#FFC15C' },
  cancelled: { t: '已取消', c: '#8EA6BE' },
}
const bookingFormOpen = ref(false)
const bookingForm = reactive({ sceneId: '', date: '', timeStart: '', timeEnd: '', team: '', purpose: '' })
const submitBooking = () => { bookingFormOpen.value = false; message.success('预约已提交，等待确认（演示）') }
const approveBooking = (b: any) => message.success(`已确认 ${b.sceneName} ${b.date} 的预约（演示）`)
const cancelBooking  = (b: any) => message.warning(`已取消 ${b.sceneName} 的预约（演示）`)
</script>

<template>
  <ModuleShell :active="tab" title="场景管理" en="Scene Management" :menu="MENU" @update:active="onTab">

    <!-- ═══════════════ 场景总览 ═══════════════ -->
    <template v-if="tab === 'overview'">
      <div class="pp-head">
        <div><h2>场景总览</h2><p>全部训练场景的状态概况与设施异常提示</p></div>
        <div class="r"><a-button type="primary" @click="tab = 'lib'; openAddScene()"><PlusOutlined />新建场景</a-button></div>
      </div>

      <div class="ov-kpis">
        <div v-for="k in KPIS" :key="k.l" class="ov-kpi" :style="{ '--k': k.k }">
          <small>{{ k.l }}</small><b>{{ k.v }}<em>{{ k.u }}</em></b>
          <span class="kpi-line" />
        </div>
      </div>

      <div class="ov-body">
        <!-- 左：类型分布 + 场景卡片 -->
        <div class="ov-left">
          <div class="pp-panel">
            <div class="pp-panel-h"><h3>场景类型分布</h3></div>
            <div class="ov-typelist">
              <div v-for="x in typeStats" :key="x.t" class="ov-typerow" :style="{ '--c': x.c }">
                <div class="ov-typerow-label">
                  <i :style="{ background: x.c }" />
                  <span>{{ x.t }}</span>
                </div>
                <div class="ov-typerow-bar">
                  <div class="fill" :style="{ width: (x.n / SCENES.length * 100) + '%' }" />
                </div>
                <div class="ov-typerow-val">{{ x.n }} 个 · {{ x.area.toLocaleString() }} m²</div>
              </div>
            </div>
          </div>

          <div class="pp-panel">
            <div class="pp-panel-h"><h3>场景列表</h3><a class="r" style="font-size:12px;cursor:pointer" @click="tab = 'lib'">查看全部 →</a></div>
            <div class="ov-cards">
              <button v-for="s in SCENES.slice(0, 6)" :key="s.id"
                type="button" class="ov-card" :style="{ '--c': TYPE_COLOR[s.type] }"
                @click="tab = 'lib'; cur = s">
                <div class="ov-card-plan">
                  <ScenePlan :items="s.plan" :labels="false" :anim="false" :dim="s.status === 'building' || s.status === 'planning'" />
                </div>
                <div class="ov-card-body">
                  <div class="ov-card-row">
                    <b>{{ s.name }}</b>
                    <a-badge :status="SCENE_STATUS[s.status].b" :text="SCENE_STATUS[s.status].t" />
                  </div>
                  <small><i :style="{ background: TYPE_COLOR[s.type] }" />{{ s.type }} · {{ s.area }} m²</small>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- 右：设施异常 + 近期预约 -->
        <div class="ov-right">
          <div class="pp-panel">
            <div class="pp-panel-h">
              <h3>设施异常</h3>
              <span v-if="damagedFacilities.length" style="margin-left:8px">
                <a-badge :count="damagedFacilities.length" color="#FFA940" />
              </span>
              <a class="r" style="font-size:12px;cursor:pointer" @click="tab = 'facility'">进入管理 →</a>
            </div>
            <div v-if="damagedFacilities.length" class="ov-alerts">
              <div v-for="f in damagedFacilities" :key="f.id"
                class="ov-alert" :class="f.status === 'damaged' ? 'bad' : 'warn'">
                <component :is="f.status === 'damaged' ? ExclamationCircleOutlined : ExclamationCircleOutlined" />
                <div>
                  <b>{{ f.scene }} · {{ f.name }}</b>
                  <span>{{ FACILITY_STATUS[f.status].t }}{{ f.remark ? ' — ' + f.remark : '' }}</span>
                </div>
              </div>
            </div>
            <div v-else class="ov-empty">
              <CheckCircleOutlined style="color:#45E3A8;font-size:22px" />
              <span>所有设施状态正常</span>
            </div>
          </div>

          <div class="pp-panel">
            <div class="pp-panel-h">
              <h3>近期预约</h3>
              <a class="r" style="font-size:12px;cursor:pointer" @click="tab = 'booking'">查看全部 →</a>
            </div>
            <div class="ov-bookings">
              <div v-for="b in SCENES.flatMap(s => s.bookings.map(bk => ({ ...bk, sn: s.name }))).sort((a,b) => a.date < b.date ? -1 : 1).slice(0, 6)"
                :key="b.id" class="ov-booking-row">
                <span class="mono muted" style="font-size:12px;flex:none;width:56px">{{ b.date.slice(5) }}</span>
                <span class="mono"       style="font-size:12px;flex:none;width:110px">{{ b.timeStart }}–{{ b.timeEnd }}</span>
                <span class="ov-bk-scene" :title="b.sn">{{ b.sn }}</span>
                <b style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ b.purpose }}</b>
                <em :style="{ color: BOOK_STATUS[b.status].c, fontSize: '12px' }">{{ BOOK_STATUS[b.status].t }}</em>
              </div>
              <div v-if="!SCENES.flatMap(s => s.bookings).length" class="ov-empty" style="padding:16px 0">暂无预约</div>
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
        <!-- 左侧列表 -->
        <div class="pp-panel sc-list">
          <div class="pp-panel-h"><h3>场景</h3><span class="muted" style="font-size:12px">{{ list.length }}/{{ SCENES.length }}</span></div>
          <div class="sc-filter">
            <a-input v-model:value="f.kw" allow-clear placeholder="搜索名称 / 编号">
              <template #prefix><SearchOutlined class="muted" /></template>
            </a-input>
            <div class="sc-tags">
              <button v-for="t in ['全部', ...SCENE_TYPES]" :key="t" type="button"
                :class="{ on: f.type === t }" @click="f.type = t">{{ t }}</button>
            </div>
            <div class="sc-tags">
              <button v-for="s in ['全部', '正式启用', '试运行', '建设中', '规划中', '维护中', '已停用']"
                :key="s" type="button" :class="{ on: f.status === s }" @click="f.status = s">{{ s }}</button>
            </div>
          </div>
          <div class="sc-items">
            <button v-for="s in list" :key="s.id" type="button"
              class="sc-item" :class="{ on: cur.id === s.id }"
              :style="{ '--c': TYPE_COLOR[s.type] }"
              @click="cur = s; detailTab = 'base'">
              <span class="sc-mini">
                <ScenePlan :items="s.plan" :labels="false" :anim="false" :dim="['planning','building'].includes(s.status)" />
              </span>
              <span class="sc-item-b">
                <span class="sc-item-t">
                  <b>{{ s.name }}</b>
                  <a-badge :status="SCENE_STATUS[s.status].b" :text="SCENE_STATUS[s.status].t" />
                </span>
                <small><i :style="{ background: TYPE_COLOR[s.type] }" />{{ s.type }} · {{ s.area }} m² · {{ s.location }}</small>
              </span>
            </button>
          </div>
        </div>

        <!-- 右侧详情 -->
        <div class="sc-detail">
          <!-- 场景标题卡 -->
          <div class="pp-panel sc-hd" :style="{ '--c': TYPE_COLOR[cur.type] }">
            <div class="sc-hd-top">
              <div class="sc-hd-info">
                <div class="sc-hd-id mono muted">{{ cur.id }} · {{ cur.location }}</div>
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
              <a-button size="small" @click="planOpen = true"><ExpandOutlined />查看布局</a-button>
              <a-button size="small" @click="openEditScene(cur)"><EditOutlined />编辑</a-button>
              <a-button v-if="nextStatus" size="small" type="primary" @click="lcConfirmOpen = true">
                推进至「{{ SCENE_STATUS[nextStatus].t }}」<ArrowRightOutlined />
              </a-button>
              <a-dropdown>
                <a-button size="small"><MoreOutlined /></a-button>
                <template #overlay>
                  <a-menu>
                    <a-menu-item @click="tab = 'facility'; fScene = cur">管理设施</a-menu-item>
                    <a-menu-item @click="tab = 'booking'; bScene = cur">查看预约</a-menu-item>
                    <a-menu-item danger>停用场景</a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </div>

          <!-- 详情 Tab -->
          <div class="pp-panel sc-body">
            <div class="sc-tabs">
              <button v-for="t in [{ k:'base', l:'基本档案' }, { k:'lc', l:'生命周期' }, { k:'facility', l:'设施清单' }]"
                :key="t.k" type="button" :class="{ on: detailTab === t.k }"
                @click="detailTab = t.k as any">{{ t.l }}</button>
            </div>

            <!-- 基本档案 -->
            <div v-if="detailTab === 'base'" class="sc-base-pane">
              <div class="sc-base-left">
                <div class="sc-sub-h">
                  <span>场景平面图</span>
                  <div class="sc-legend">
                    <span v-for="l in PLAN_LEGEND" :key="l.k"><i :style="{ background: l.c }" />{{ l.t }}</span>
                  </div>
                </div>
                <div class="sc-plan-b">
                  <ScenePlan :key="cur.id" :items="cur.plan" :dim="['planning','building'].includes(cur.status)" />
                </div>
              </div>
              <div class="sc-base-right">
                <div class="sc-sub-h">设施概况
                  <a style="margin-left:auto;font-size:12px;font-weight:400;cursor:pointer" @click="tab = 'facility'; fScene = cur">
                    进入设施管理 →
                  </a>
                </div>
                <div class="sc-facility-summary">
                  <div v-for="f in cur.facilities.slice(0, 6)" :key="f.id" class="sc-fac-row">
                    <span class="sc-fac-name">{{ f.name }}</span>
                    <span class="muted" style="font-size:12px">{{ f.category }}</span>
                    <span class="muted mono" style="font-size:12px">×{{ f.qty }}</span>
                    <span class="sc-fac-status" :style="{ color: FACILITY_STATUS[f.status].c }">
                      {{ FACILITY_STATUS[f.status].t }}
                    </span>
                  </div>
                  <div v-if="cur.facilities.length > 6" class="muted" style="font-size:12px;padding:6px 0">
                    另有 {{ cur.facilities.length - 6 }} 项设施，点击「进入设施管理」查看
                  </div>
                  <div v-if="!cur.facilities.length" class="muted" style="font-size:12px;padding:12px 0">暂无设施记录</div>
                </div>

                <div class="sc-sub-h" style="margin-top:16px">近期预约
                  <a style="margin-left:auto;font-size:12px;font-weight:400;cursor:pointer" @click="tab = 'booking'; bScene = cur">
                    进入排程 →
                  </a>
                </div>
                <div class="sc-book-summary">
                  <div v-for="b in cur.bookings.slice(0, 4)" :key="b.id" class="sc-book-row">
                    <span class="mono muted" style="font-size:12px;width:46px;flex:none">{{ b.date.slice(5) }}</span>
                    <span class="mono" style="font-size:12px;flex:none">{{ b.timeStart }}–{{ b.timeEnd }}</span>
                    <b style="flex:1;min-width:0">{{ b.purpose }}</b>
                    <em :style="{ color: BOOK_STATUS[b.status].c, fontSize: '12px', fontStyle: 'normal' }">{{ BOOK_STATUS[b.status].t }}</em>
                  </div>
                  <div v-if="!cur.bookings.length" class="muted" style="font-size:12px;padding:10px 0">暂无预约记录</div>
                </div>
              </div>
            </div>

            <!-- 生命周期 -->
            <div v-else-if="detailTab === 'lc'" class="sc-lc-pane">
              <!-- 进度条 -->
              <div class="lc-track">
                <div v-for="(s, i) in LC_FLOW" :key="s" class="lc-node"
                  :class="{ done: LC_FLOW.indexOf(cur.status) > i, active: cur.status === s }">
                  <div class="lc-dot"><span>{{ i + 1 }}</span></div>
                  <div class="lc-conn" v-if="i < LC_FLOW.length - 1" />
                  <div class="lc-label">{{ SCENE_STATUS[s].t }}</div>
                </div>
              </div>

              <!-- 变更历史 -->
              <div class="sc-sub-h" style="margin-top:20px">状态变更记录</div>
              <a-timeline style="margin-top:12px;padding:0 8px">
                <a-timeline-item v-for="r in [...cur.lifecycle].reverse()" :key="r.date + r.status"
                  :color="SCENE_STATUS[r.status].c">
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

            <!-- 设施清单（简版，完整版在设施管理页） -->
            <div v-else-if="detailTab === 'facility'" class="sc-tab-pane">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <span class="muted" style="font-size:13px">共 {{ cur.facilities.length }} 项设施</span>
                <a-space>
                  <a-button size="small" @click="tab = 'facility'; fScene = cur">进入设施管理</a-button>
                </a-space>
              </div>
              <a-table :data-source="cur.facilities" row-key="id" size="small" :pagination="false"
                :columns="[
                  { title:'编号', dataIndex:'id', width:110 },
                  { title:'设施名称', dataIndex:'name', ellipsis:true },
                  { title:'分类', dataIndex:'category', width:90 },
                  { title:'数量', dataIndex:'qty', width:60, align:'right' },
                  { title:'规格', dataIndex:'spec', ellipsis:true },
                  { title:'安装日期', dataIndex:'installedAt', width:100 },
                  { title:'状态', key:'status', width:80 },
                ]">
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'status'">
                    <span :style="{ color: FACILITY_STATUS[record.status].c }">{{ FACILITY_STATUS[record.status].t }}</span>
                  </template>
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
          <a-select v-model:value="fScene" :options="SCENES.map(s => ({ value: s, label: s.name }))"
            :field-names="{ label: 'label', value: 'value' }"
            style="width:180px;margin-right:12px"
            placeholder="选择场景">
            <template #option="{ label, value: s }">
              <div style="display:flex;align-items:center;gap:8px">
                <i :style="{ width:'7px', height:'7px', borderRadius:'1px', background: TYPE_COLOR[s.type], display:'inline-block' }" />{{ label }}
              </div>
            </template>
          </a-select>
          <a-button type="primary" @click="openAddFacility"><PlusOutlined />添加设施</a-button>
        </div>
      </div>

      <!-- 当前场景概要 -->
      <div class="pp-panel fac-scene-bar">
        <div class="fac-scene-info">
          <span class="mono muted" style="font-size:12px">{{ fScene.id }}</span>
          <b style="font-size:16px;margin-left:10px">{{ fScene.name }}</b>
          <a-tag :style="{ marginLeft:'10px', color: TYPE_COLOR[fScene.type], borderColor: TYPE_COLOR[fScene.type]+'55', background: TYPE_COLOR[fScene.type]+'15' }">{{ fScene.type }}</a-tag>
          <a-badge :status="SCENE_STATUS[fScene.status].b" :text="SCENE_STATUS[fScene.status].t" style="margin-left:10px" />
        </div>
        <div class="fac-scene-kpis">
          <div v-for="item in [
            { l:'设施总数', v: fScene.facilities.length, c:'#2ED3E6' },
            { l:'正常', v: fScene.facilities.filter(f=>f.status==='normal').length, c:'#45E3A8' },
            { l:'异常', v: fScene.facilities.filter(f=>f.status!=='normal').length, c:'#FF7A7A' },
          ]" :key="item.l" class="fac-kpi">
            <small>{{ item.l }}</small>
            <b :style="{ color: item.c }">{{ item.v }}</b>
          </div>
        </div>
      </div>

      <!-- 筛选栏 -->
      <div class="pp-panel" style="padding:12px 16px;margin-bottom:0">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <a-input v-model:value="fFilter.kw" allow-clear placeholder="搜索设施名称" style="width:200px">
            <template #prefix><SearchOutlined class="muted" /></template>
          </a-input>
          <div class="sc-tags">
            <button v-for="c in ['全部', ...FACILITY_CATEGORIES]" :key="c" type="button"
              :class="{ on: fFilter.category === c }" @click="fFilter.category = c">{{ c }}</button>
          </div>
          <div class="sc-tags">
            <button v-for="s in ['全部', '正常', '损坏', '维修中', '已报废']" :key="s" type="button"
              :class="{ on: fFilter.status === s }" @click="fFilter.status = s">{{ s }}</button>
          </div>
        </div>
      </div>

      <!-- 设施表格 -->
      <div class="pp-panel" style="padding:0;overflow:hidden">
        <a-table :data-source="facilityList" row-key="id" :pagination="{ pageSize: 12, showSizeChanger: false }"
          :locale="{ emptyText: '该场景暂无设施记录' }"
          :columns="[
            { title:'编号',     dataIndex:'id',          width:110 },
            { title:'设施名称', dataIndex:'name',         ellipsis:true },
            { title:'分类',     dataIndex:'category',     width:90  },
            { title:'数量',     dataIndex:'qty',          width:60,  align:'right' },
            { title:'规格说明', dataIndex:'spec',         ellipsis:true },
            { title:'安装日期', dataIndex:'installedAt',  width:100 },
            { title:'状态',     key:'status',             width:90  },
            { title:'备注',     dataIndex:'remark',       ellipsis:true },
            { title:'操作',     key:'action',             width:140, fixed:'right' },
          ]">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <a-dropdown trigger="click">
                <span :style="{ color: FACILITY_STATUS[record.status].c, cursor:'pointer' }">
                  {{ FACILITY_STATUS[record.status].t }} ▾
                </span>
                <template #overlay>
                  <a-menu>
                    <a-menu-item v-for="(meta, key) in FACILITY_STATUS" :key="key"
                      :disabled="key === record.status"
                      @click="changeStatus(record, key)">
                      <span :style="{ color: meta.c }">{{ meta.t }}</span>
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space>
                <a-button type="link" size="small" style="padding:0" @click="openEditFacility(record)">编辑</a-button>
                <a-button type="link" size="small" danger style="padding:0" @click="message.warning('删除功能演示中')">删除</a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </div>
    </template>

    <!-- ═══════════════ 预约排程 ═══════════════ -->
    <template v-else-if="tab === 'booking'">
      <div class="pp-head">
        <div><h2>预约排程</h2><p>管理各场景的使用预约与时段安排</p></div>
        <div class="r">
          <a-select :value="bScene?.id ?? null" allow-clear placeholder="筛选场景（全部）"
            :options="SCENES.map(s => ({ value: s.id, label: s.name }))"
            style="width:180px;margin-right:12px"
            @change="(v: any) => bScene = v ? SCENES.find(s => s.id === v) ?? null : null" />
          <a-button type="primary" @click="bookingFormOpen = true"><PlusOutlined />新建预约</a-button>
        </div>
      </div>

      <!-- 预约统计 -->
      <div class="bk-kpis">
        <div v-for="item in [
          { l:'全部预约', v: allBookings.length, c:'#2ED3E6' },
          { l:'已确认',   v: allBookings.filter(b=>b.status==='confirmed').length, c:'#45E3A8' },
          { l:'待审核',   v: allBookings.filter(b=>b.status==='pending').length,   c:'#FFC15C' },
          { l:'已取消',   v: allBookings.filter(b=>b.status==='cancelled').length, c:'#8EA6BE' },
        ]" :key="item.l" class="bk-kpi" :style="{ '--c': item.c }">
          <small>{{ item.l }}</small><b :style="{ color: item.c }">{{ item.v }}</b>
        </div>
      </div>

      <div class="pp-panel" style="padding:0;overflow:hidden">
        <a-table :data-source="allBookings" row-key="id" :pagination="{ pageSize: 12, showSizeChanger: false }"
          :locale="{ emptyText: '暂无预约记录' }"
          :columns="[
            { title:'场景',     dataIndex:'sceneName', width:140 },
            { title:'日期',     dataIndex:'date',      width:100 },
            { title:'时段',     key:'time',            width:130 },
            { title:'使用单位', dataIndex:'team',      width:100 },
            { title:'用途',     dataIndex:'purpose',   ellipsis:true },
            { title:'状态',     key:'status',          width:90  },
            { title:'创建人',   dataIndex:'createdBy', width:80  },
            { title:'创建时间', dataIndex:'createdAt', width:100 },
            { title:'操作',     key:'action',          width:140, fixed:'right' },
          ]">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'time'">
              <span class="mono">{{ record.timeStart }} – {{ record.timeEnd }}</span>
            </template>
            <template v-else-if="column.key === 'status'">
              <span :style="{ color: BOOK_STATUS[record.status].c }">{{ BOOK_STATUS[record.status].t }}</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space>
                <a-button v-if="record.status === 'pending'" type="link" size="small" style="padding:0" @click="approveBooking(record)">确认</a-button>
                <a-button v-if="record.status !== 'cancelled'" type="link" size="small" danger style="padding:0" @click="cancelBooking(record)">取消</a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </div>
    </template>

    <!-- ══ 弹窗：场景编辑 ══ -->
    <a-modal v-model:open="sceneFormOpen" :title="editingScene ? '编辑场景' : '新建场景'" :width="700" ok-text="保存" @ok="submitScene">
      <a-form layout="vertical" style="margin-top:12px">
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="场景名称" required><a-input v-model:value="sceneForm.name" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="场景类型" required><a-select v-model:value="sceneForm.type" :options="SCENE_TYPES.map(v => ({ value:v, label:v }))" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="面积（m²）"><a-input-number v-model:value="sceneForm.area" style="width:100%" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="同时容纳（台）"><a-input-number v-model:value="sceneForm.capacity" style="width:100%" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="难度"><a-rate v-model:value="sceneForm.difficulty" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="开放时间"><a-input v-model:value="sceneForm.open" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="负责人"><a-select v-model:value="sceneForm.owner" :options="['周工','赵工','张杰'].map(v=>({value:v,label:v}))" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="场地位置"><a-input v-model:value="sceneForm.location" placeholder="如：A 栋 1 层" /></a-form-item></a-col>
        </a-row>
        <a-form-item label="场景描述"><a-textarea v-model:value="sceneForm.desc" :rows="3" /></a-form-item>
        <a-form-item v-if="!editingScene" label="平面图"><a-upload-dragger :before-upload="()=>false"><p style="margin:8px 0">上传 CAD / 图片，或稍后绘制</p></a-upload-dragger></a-form-item>
      </a-form>
    </a-modal>

    <!-- 弹窗：生命周期推进确认 -->
    <a-modal v-model:open="lcConfirmOpen" title="推进生命周期" ok-text="确认推进" @ok="pushStatus">
      <div style="margin:12px 0 8px">
        将「{{ cur.name }}」状态从
        <span :style="{ color: SCENE_STATUS[cur.status].c }">{{ SCENE_STATUS[cur.status].t }}</span>
        推进至
        <span v-if="nextStatus" :style="{ color: SCENE_STATUS[nextStatus].c }">{{ SCENE_STATUS[nextStatus].t }}</span>
      </div>
      <a-form-item label="备注说明"><a-textarea v-model:value="lcRemark" :rows="3" placeholder="说明推进原因或验收情况（选填）" /></a-form-item>
    </a-modal>

    <!-- 弹窗：设施编辑 -->
    <a-modal v-model:open="facilityFormOpen" :title="editingFacility ? '编辑设施' : '添加设施'" ok-text="保存" @ok="submitFacility">
      <a-form layout="vertical" style="margin-top:12px">
        <a-row :gutter="16">
          <a-col :span="14"><a-form-item label="设施名称" required><a-input v-model:value="facilityForm.name" /></a-form-item></a-col>
          <a-col :span="10"><a-form-item label="分类"><a-select v-model:value="facilityForm.category" :options="FACILITY_CATEGORIES.map(v=>({value:v,label:v}))" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="数量"><a-input-number v-model:value="facilityForm.qty" :min="1" style="width:100%" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="安装日期"><a-input v-model:value="facilityForm.installedAt" placeholder="YYYY-MM-DD" /></a-form-item></a-col>
        </a-row>
        <a-form-item label="规格说明"><a-input v-model:value="facilityForm.spec" /></a-form-item>
        <a-form-item label="备注"><a-textarea v-model:value="facilityForm.remark" :rows="2" /></a-form-item>
      </a-form>
    </a-modal>

    <!-- 弹窗：新建预约 -->
    <a-modal v-model:open="bookingFormOpen" title="新建预约" ok-text="提交预约" @ok="submitBooking">
      <a-form layout="vertical" style="margin-top:12px">
        <a-form-item label="选择场景" required>
          <a-select v-model:value="bookingForm.sceneId" :options="SCENES.filter(s=>s.status==='active'||s.status==='trial').map(s=>({value:s.id,label:s.name}))" placeholder="仅显示已启用/试运行场景" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="日期" required><a-input v-model:value="bookingForm.date" placeholder="YYYY-MM-DD" /></a-form-item></a-col>
          <a-col :span="6"><a-form-item label="开始时间"><a-input v-model:value="bookingForm.timeStart" placeholder="09:00" /></a-form-item></a-col>
          <a-col :span="6"><a-form-item label="结束时间"><a-input v-model:value="bookingForm.timeEnd" placeholder="11:00" /></a-form-item></a-col>
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
.ov-kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 20px; }
.ov-kpi { position: relative; padding: 14px 18px 10px; background: rgba(22,40,64,.7); border: 1px solid var(--line); border-top: 2px solid var(--k); border-radius: 4px; overflow: hidden; }
.ov-kpi small { display: block; font-size: 12px; color: var(--muted); margin-bottom: 6px; }
.ov-kpi b { font-size: 26px; font-weight: 600; color: var(--title); }
.ov-kpi em { font-style: normal; font-size: 12px; color: var(--muted); margin-left: 3px; }
.kpi-line { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--k), transparent); opacity: .35; }

/* ── 总览布局 ── */
.ov-body { display: grid; grid-template-columns: 1fr 380px; gap: 16px; align-items: start; }
.ov-left, .ov-right { display: flex; flex-direction: column; gap: 16px; }

/* 类型分布 */
.ov-typelist { padding: 4px 16px 14px; display: flex; flex-direction: column; gap: 12px; }
.ov-typerow { display: grid; grid-template-columns: 110px 1fr 160px; align-items: center; gap: 12px; }
.ov-typerow-label { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--text); }
.ov-typerow-label i { width: 7px; height: 7px; border-radius: 1px; flex: none; }
.ov-typerow-bar { height: 6px; background: rgba(46,211,230,.08); border-radius: 3px; overflow: hidden; }
.ov-typerow-bar .fill { height: 100%; background: var(--c); border-radius: 3px; transition: width .6s; }
.ov-typerow-val { font-size: 12px; color: var(--muted); text-align: right; }

/* 场景卡片 */
.ov-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 4px 16px 14px; }
.ov-card { display: flex; flex-direction: column; padding: 0; font: inherit; text-align: left; cursor: pointer; background: rgba(46,211,230,.04); border: 1px solid rgba(46,211,230,.15); border-radius: 6px; overflow: hidden; transition: all .2s; }
.ov-card:hover { border-color: var(--c); background: linear-gradient(180deg, color-mix(in srgb, var(--c) 8%, transparent), rgba(22,40,64,.6)); }
.ov-card-plan { aspect-ratio: 16/9; overflow: hidden; border-bottom: 1px solid rgba(46,211,230,.1); }
.ov-card-body { padding: 8px 10px; }
.ov-card-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.ov-card-row b { flex: 1; font-size: 13px; color: var(--title); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ov-card-row :deep(.ant-badge-status-text) { font-size: 11px; color: var(--muted); }
.ov-card small { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 4px; }
.ov-card small i { width: 6px; height: 6px; border-radius: 1px; }

/* 设施预警 */
.ov-alerts { padding: 0 16px 12px; display: flex; flex-direction: column; gap: 8px; }
.ov-alert { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 4px; font-size: 13px; }
.ov-alert.bad  { background: rgba(255,122,122,.07); border: 1px solid rgba(255,122,122,.3); color: #FF7A7A; }
.ov-alert.warn { background: rgba(255,193,92,.07);  border: 1px solid rgba(255,193,92,.3);  color: #FFA940; }
.ov-alert > div { flex: 1; } .ov-alert b { display: block; margin-bottom: 2px; } .ov-alert span { font-size: 12px; opacity: .85; }
.ov-empty { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 20px; color: var(--muted); font-size: 13px; }

/* 预约概览 */
.ov-bookings { padding: 0 16px 12px; display: flex; flex-direction: column; gap: 0; }
.ov-booking-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px dashed rgba(46,211,230,.1); font-size: 13px; }
.ov-bk-scene { flex: none; width: 90px; font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── 场景列表 ── */
.sc { display: grid; grid-template-columns: 290px 1fr; gap: 16px; align-items: start; }
.sc-list { position: sticky; top: 0; }
.sc-filter { padding: 10px 12px 4px; display: flex; flex-direction: column; gap: 2px; }
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

/* 详情区 */
.sc-detail { display: flex; flex-direction: column; gap: 12px; min-width: 0; }

/* 标题卡 */
.sc-hd { padding: 16px 20px; background: linear-gradient(120deg, color-mix(in srgb, var(--c) 14%, rgba(22,42,69,.9)), rgba(19,38,63,.85) 55%) !important; }
.sc-hd-top { display: flex; gap: 20px; align-items: flex-start; }
.sc-hd-info { flex: 1; }
.sc-hd-id { font-size: 12px; }
.sc-hd-info h3 { margin: 3px 0 6px; font-size: 20px; color: #fff; letter-spacing: .5px; }
.sc-hd-tags { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.sc-hd-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; min-width: 280px; }
.sc-hd-meta > div { padding: 7px 10px; background: rgba(0,0,0,.2); border-radius: 4px; }
.sc-hd-meta small { display: block; font-size: 11px; color: rgba(255,255,255,.5); margin-bottom: 2px; }
.sc-hd-meta b { font-size: 13px; color: #fff; font-weight: 500; }
.sc-hd-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }

/* Tab */
.sc-body { padding: 0; overflow: hidden; }
.sc-tabs { display: flex; border-bottom: 1px solid rgba(46,211,230,.15); padding: 0 16px; }
.sc-tabs button { padding: 11px 14px; font: inherit; font-size: 13px; color: var(--muted); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: all .18s; margin-bottom: -1px; }
.sc-tabs button.on { color: var(--accent); border-bottom-color: var(--accent); }
.sc-tabs button:hover:not(.on) { color: var(--title); }
.sc-tab-pane { padding: 16px; }

/* 基本档案面板 */
.sc-base-pane { display: grid; grid-template-columns: 1.3fr 1fr; gap: 20px; padding: 16px; }
.sc-base-left, .sc-base-right { display: flex; flex-direction: column; gap: 14px; }
.sc-sub-h { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--title); padding-bottom: 6px; border-bottom: 1px solid rgba(46,211,230,.12); }
.sc-plan-b { aspect-ratio: 16/10; border: 1px solid rgba(46,211,230,.18); border-radius: 4px; overflow: hidden; }
.sc-legend { display: flex; flex-wrap: wrap; gap: 8px; margin-left: auto; }
.sc-legend span { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--muted); font-weight: 400; }
.sc-legend i { display: inline-block; width: 7px; height: 7px; border-radius: 2px; }

/* 设施概况 */
.sc-facility-summary { display: flex; flex-direction: column; gap: 0; }
.sc-fac-row { display: flex; align-items: center; gap: 8px; padding: 7px 0; border-bottom: 1px dashed rgba(46,211,230,.1); font-size: 13px; }
.sc-fac-name { flex: 1; color: var(--title); }
.sc-fac-status { font-size: 12px; }

/* 预约概况 */
.sc-book-summary { display: flex; flex-direction: column; gap: 0; }
.sc-book-row { display: flex; align-items: center; gap: 8px; padding: 7px 0; border-bottom: 1px dashed rgba(46,211,230,.1); font-size: 13px; }

/* 生命周期面板 */
.sc-lc-pane { padding: 20px 24px; }
.lc-track { display: flex; align-items: flex-start; }
.lc-node { display: flex; flex-direction: column; align-items: center; position: relative; flex: 1; }
.lc-dot { width: 28px; height: 28px; border-radius: 50%; background: rgba(46,211,230,.08); border: 2px solid rgba(46,211,230,.2); display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--muted); z-index: 1; transition: all .3s; }
.lc-node.done   .lc-dot { background: rgba(69,227,168,.15); border-color: #45E3A8; color: #45E3A8; }
.lc-node.active .lc-dot { background: rgba(46,211,230,.2);  border-color: var(--accent); color: #fff; box-shadow: 0 0 12px rgba(46,211,230,.4); }
.lc-conn { position: absolute; top: 13px; left: 50%; right: -50%; height: 2px; background: rgba(46,211,230,.12); z-index: 0; }
.lc-node.done .lc-conn { background: rgba(69,227,168,.45); }
.lc-label { margin-top: 8px; font-size: 12px; color: var(--muted); text-align: center; white-space: nowrap; }
.lc-node.done .lc-label, .lc-node.active .lc-label { color: var(--title); }

/* 变更记录 */
.lc-rec { display: flex; flex-direction: column; gap: 4px; padding: 2px 0; }
.lc-rec-head { display: flex; align-items: center; gap: 10px; }
.lc-rec-status { font-size: 13px; font-weight: 600; }
.lc-rec-remark { margin: 0; font-size: 13px; color: var(--muted); }

/* ── 设施管理 ── */
.fac-scene-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; margin-bottom: 0; }
.fac-scene-info { display: flex; align-items: center; }
.fac-scene-kpis { display: flex; gap: 20px; }
.fac-kpi { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.fac-kpi small { font-size: 11px; color: var(--muted); }
.fac-kpi b { font-size: 22px; font-weight: 600; }

/* ── 预约排程 ── */
.bk-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.bk-kpi { padding: 14px 20px 12px; background: rgba(22,40,64,.7); border: 1px solid var(--line); border-left: 3px solid var(--c); border-radius: 4px; }
.bk-kpi small { display: block; font-size: 12px; color: var(--muted); margin-bottom: 4px; }
.bk-kpi b { font-size: 26px; font-weight: 600; }
</style>
