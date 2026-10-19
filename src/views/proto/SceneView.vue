<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { AppstoreOutlined, BlockOutlined, AuditOutlined, FundProjectionScreenOutlined, PlusOutlined, SearchOutlined, EditOutlined, CopyOutlined, MoreOutlined, ExperimentOutlined, ClockCircleOutlined, ExpandOutlined, ShareAltOutlined } from '@ant-design/icons-vue'
import ModuleShell from '@/components/proto/ModuleShell.vue'
import SceneThumb from '@/components/proto/SceneThumb.vue'
import DeviceGlyph from '@/components/proto/DeviceGlyph.vue'
import { SCENES, SCENE_STATUS, SCENE_TYPES, devicesOf, type Scene } from '@/mock/scenes'
import { TYPE_META, STATUS_META, type DeviceType } from '@/models/device'

document.title = '场景管理 · 具身智能训练场'
const router = useRouter()
const MENU = [
  { key: 'lib', label: '场景库', icon: AppstoreOutlined },
  { key: 'assets', label: '场景资产', icon: BlockOutlined },
  { key: 'eval', label: '评测配置', icon: AuditOutlined },
  { key: 'screen', label: '大屏展示', icon: FundProjectionScreenOutlined },
]
const tab = ref('lib')
const openScreen = () => window.open(router.resolve('/m/scene/screen').href, '_blank')
const onMenu = (k: string) => { if (k === 'screen') openScreen(); else tab.value = k }

const f = reactive({ type: '全部', status: undefined as string | undefined, kw: '' })
const list = computed(() => SCENES.filter((s) => (f.type === '全部' || s.type === f.type) && (!f.status || s.status === f.status) && (!f.kw || s.name.includes(f.kw))))
const KPIS = [
  { l: '场景总数', v: SCENES.length, u: '个', k: '#4DD0E1' },
  { l: '启用中', v: SCENES.filter((s) => s.status === 'active').length, u: '个', k: '#4DE8B0' },
  { l: '场地总面积', v: SCENES.reduce((a, s) => a + s.area, 0).toLocaleString(), u: 'm²', k: '#5B9BFF' },
  { l: '本月训练时长', v: '1,286', u: '小时', k: '#B48CFF' },
  { l: '已同步仿真', v: SCENES.filter((s) => s.sim).length, u: '个', k: '#FFB74D' },
]

const cur = ref<Scene | null>(null)
const HISTORY = [
  { t: '10-19 09:20', c: '数据采集 · 楼梯攀爬数据采集 #A12 开始', who: '张杰' },
  { t: '10-18 15:02', c: '评测 · H1 攀爬成功率 92.4%（较上次 +3.1%）', who: '林悦' },
  { t: '10-16 10:40', c: '场景变更 · 新增 20 cm 台阶模块', who: '赵工' },
  { t: '10-12 14:15', c: '仿真同步 · 生成 USD 场景 v1.4', who: '林悦' },
]

/* 新建 */
const addOpen = ref(false)
const step = ref(0)
const form = reactive({ name: '', type: '楼梯攀爬', area: 300, difficulty: 3, elements: ['标准台阶'] as string[], sim: true, desc: '' })
const submit = () => { addOpen.value = false; step.value = 0; message.success('场景已创建（原型演示）') }

/* 资产 */
const ASSETS = [
  { n: '标准台阶模块', k: '障碍', spec: '踏步 15–20 cm，可拼接', stock: 12, used: 8, usd: true },
  { n: '坡道模块', k: '障碍', spec: '10° / 15° / 25°', stock: 6, used: 4, usd: true },
  { n: '碎石地块', k: '地形', spec: '2 × 2 m，粒径 2–5 cm', stock: 10, used: 6, usd: true },
  { n: '起伏地形块', k: '地形', spec: '1 × 1 m，高差 ≤ 12 cm', stock: 24, used: 18, usd: true },
  { n: '门框', k: '障碍', spec: '宽 0.7 / 0.9 m', stock: 4, used: 2, usd: true },
  { n: '管道阀门组', k: '设备', spec: 'DN50–DN150', stock: 4, used: 4, usd: false },
  { n: '指针仪表', k: '设备', spec: '压力 / 温度', stock: 20, used: 12, usd: false },
  { n: 'UWB 定位基站', k: '设施', spec: '精度 ±10 cm', stock: 20, used: 12, usd: false },
  { n: 'YCB 标准物体集', k: '物料', spec: '77 类物体', stock: 120, used: 60, usd: true },
  { n: '漂浮假人', k: '物料', spec: '成人 / 儿童', stock: 6, used: 6, usd: false },
]
const EVALS = [
  { n: '足式攀爬评测 v2', scene: '楼梯攀爬区', metrics: ['攀爬成功率', '跌倒次数', '能耗'], rounds: 10, pass: '成功率 ≥ 90%', runs: 46 },
  { n: '地形通过评测', scene: '复杂地形区', metrics: ['通过率', '平均速度', '姿态稳定性'], rounds: 5, pass: '通过率 ≥ 85%', runs: 31 },
  { n: '巡检读表评测', scene: '巡检模拟区', metrics: ['读表准确率', '异常检出率'], rounds: 3, pass: '准确率 ≥ 98%', runs: 22 },
  { n: '桌面抓取评测', scene: '数据采集间', metrics: ['抓取成功率', '单次耗时'], rounds: 20, pass: '成功率 ≥ 80%', runs: 58 },
  { n: '水域搜救评测', scene: '水域救援池', metrics: ['搜索时长', '投放成功率'], rounds: 3, pass: '≤ 5 min', runs: 8 },
]
</script>

<template>
  <ModuleShell :active="tab" title="场景管理（训练场）" en="Training Ground" :menu="MENU" @update:active="onMenu">
    <template v-if="tab === 'lib'">
      <div class="pp-head">
        <div><h2>场景库</h2><p>管理训练场物理场景及其仿真孪生，为数据采集、训练评测提供标准场景</p></div>
        <div class="r"><a-button @click="openScreen"><FundProjectionScreenOutlined />大屏展示</a-button><a-button type="primary" @click="addOpen = true"><PlusOutlined />新建场景</a-button></div>
      </div>
      <div class="pp-kpis">
        <div v-for="k in KPIS" :key="k.l" class="pp-kpi" :style="{ '--k': k.k }"><small>{{ k.l }}</small><b>{{ k.v }}<em>{{ k.u }}</em></b><span class="bar" /></div>
      </div>
      <div class="sc-filter">
        <a-segmented v-model:value="f.type" :options="['全部', ...SCENE_TYPES]" />
        <div class="r">
          <a-input v-model:value="f.kw" allow-clear placeholder="搜索场景" style="width:200px"><template #prefix><SearchOutlined class="muted" /></template></a-input>
          <a-select v-model:value="f.status" allow-clear placeholder="全部状态" style="width:120px" :options="Object.entries(SCENE_STATUS).map(([v, m]) => ({ value: v, label: m.t }))" />
        </div>
      </div>
      <div class="sc-grid">
        <div v-for="s in list" :key="s.id" class="sc-card" @click="cur = s">
          <SceneThumb :scene="s">
            <span class="sc-badge"><a-badge :status="SCENE_STATUS[s.status].b" :text="SCENE_STATUS[s.status].t" /></span>
            <span v-if="s.sim" class="sc-sim">仿真孪生</span>
            <span class="sc-id mono">{{ s.id }}</span>
          </SceneThumb>
          <div class="sc-b">
            <div class="sc-t"><b>{{ s.name }}</b><a-tag>{{ s.type }}</a-tag></div>
            <p>{{ s.desc }}</p>
            <div class="sc-meta">
              <span><small>面积</small><b class="mono">{{ s.area }}</b> m²</span>
              <span><small>难度</small><a-rate :value="s.difficulty" disabled :count="5" class="sc-rate" /></span>
              <span><small>设备</small><b class="mono">{{ devicesOf(s).length }}</b> 台</span>
              <span><small>任务</small><b class="mono">{{ s.tasks }}</b></span>
            </div>
          </div>
          <div class="sc-foot" @click.stop>
            <span class="muted"><ClockCircleOutlined /> {{ s.updated }} · {{ s.owner }}</span>
            <a-space :size="0"><a-button type="text" size="small"><EditOutlined /></a-button><a-button type="text" size="small"><CopyOutlined /></a-button>
              <a-dropdown><a-button type="text" size="small"><MoreOutlined /></a-button><template #overlay><a-menu><a-menu-item>同步到仿真</a-menu-item><a-menu-item>发起评测</a-menu-item><a-menu-item danger>停用</a-menu-item></a-menu></template></a-dropdown>
            </a-space>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="tab === 'assets'">
      <div class="pp-head"><div><h2>场景资产</h2><p>可复用的障碍、地形、设备与物料模块，支持一键生成仿真 USD 资产</p></div><div class="r"><a-button type="primary"><PlusOutlined />新增资产</a-button></div></div>
      <div class="pp-panel">
        <a-table :data-source="ASSETS" row-key="n" size="middle" :pagination="false" :columns="[{ title: '资产名称', dataIndex: 'n' }, { title: '分类', key: 'k' }, { title: '规格', dataIndex: 'spec' }, { title: '库存 / 在用', key: 'stock', width: 220 }, { title: '仿真资产', key: 'usd' }, { title: '操作', key: 'op' }]">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'k'"><a-tag :color="({ 障碍: 'orange', 地形: 'green', 设备: 'blue', 设施: 'cyan', 物料: 'purple' } as any)[record.k]">{{ record.k }}</a-tag></template>
            <template v-else-if="column.key === 'stock'"><div style="display:flex;align-items:center;gap:8px"><a-progress :percent="Math.round((record.used / record.stock) * 100)" size="small" :show-info="false" style="flex:1;margin:0" /><span class="mono" style="font-size:12px">{{ record.used }}/{{ record.stock }}</span></div></template>
            <template v-else-if="column.key === 'usd'"><a-tag v-if="record.usd" color="green">USD 已生成</a-tag><a v-else>生成</a></template>
            <template v-else-if="column.key === 'op'"><a-space :size="0"><a-button type="link" size="small">编辑</a-button><a-button type="link" size="small">出入库</a-button></a-space></template>
          </template>
        </a-table>
      </div>
    </template>

    <template v-else-if="tab === 'eval'">
      <div class="pp-head"><div><h2>评测配置</h2><p>为场景配置评测指标、轮次与通过标准，评测结果回流至大屏与设备档案</p></div><div class="r"><a-button type="primary"><PlusOutlined />新建评测</a-button></div></div>
      <a-row :gutter="[16, 16]">
        <a-col v-for="e in EVALS" :key="e.n" :xs="24" :lg="12" :xl="8">
          <div class="pp-panel sc-eval">
            <div class="sc-eval-h"><ExperimentOutlined /><b>{{ e.n }}</b><a-tag style="margin-left:auto">{{ e.scene }}</a-tag></div>
            <div class="sc-eval-m"><a-tag v-for="m in e.metrics" :key="m" color="cyan">{{ m }}</a-tag></div>
            <a-descriptions :column="3" size="small" layout="vertical" class="sc-eval-d">
              <a-descriptions-item label="评测轮次">{{ e.rounds }} 轮</a-descriptions-item>
              <a-descriptions-item label="通过标准">{{ e.pass }}</a-descriptions-item>
              <a-descriptions-item label="累计执行">{{ e.runs }} 次</a-descriptions-item>
            </a-descriptions>
            <div class="sc-eval-f"><a-button size="small">编辑</a-button><a-button size="small" type="primary">发起评测</a-button></div>
          </div>
        </a-col>
      </a-row>
    </template>

    <!-- 场景详情 -->
    <a-drawer :open="!!cur" :width="820" :closable="false" class="sc-drawer" @close="cur = null">
      <template v-if="cur">
        <SceneThumb :scene="cur" class="sc-dhero">
          <div class="sc-dhero-mask" />
          <div class="sc-dhero-b">
            <div><a-badge :status="SCENE_STATUS[cur.status].b" :text="SCENE_STATUS[cur.status].t" /><span class="mono muted" style="margin-left:10px">{{ cur.id }}</span></div>
            <h2>{{ cur.name }}</h2>
            <div><a-tag>{{ cur.type }}</a-tag><a-tag v-for="t in cur.tags" :key="t" color="cyan">{{ t }}</a-tag></div>
          </div>
          <a-space class="sc-dhero-op"><a-button><ShareAltOutlined />同步到仿真</a-button><a-button type="primary"><ExpandOutlined />进入大屏</a-button></a-space>
        </SceneThumb>
        <div class="sc-dstats">
          <div><small>面积</small><b class="mono">{{ cur.area }}<em>m²</em></b></div>
          <div><small>难度</small><b><a-rate :value="cur.difficulty" disabled class="sc-rate" /></b></div>
          <div><small>累计训练</small><b class="mono">{{ cur.hours }}<em>h</em></b></div>
          <div><small>关联任务</small><b class="mono">{{ cur.tasks }}</b></div>
          <div><small>在场设备</small><b class="mono">{{ devicesOf(cur).length }}<em>台</em></b></div>
        </div>
        <a-tabs>
          <a-tab-pane key="e" tab="场景元素">
            <a-table :data-source="cur.elements" row-key="name" size="small" :pagination="false" :columns="[{ title: '名称', dataIndex: 'name' }, { title: '分类', dataIndex: 'kind' }, { title: '数量', dataIndex: 'qty' }, { title: '规格', dataIndex: 'spec' }]" />
            <p class="muted" style="margin:14px 0 0;font-size:13px">{{ cur.desc }}</p>
          </a-tab-pane>
          <a-tab-pane key="d" tab="在场设备">
            <a-empty v-if="!devicesOf(cur).length" description="暂无设备" />
            <div class="sc-devs">
              <div v-for="d in devicesOf(cur)" :key="d.id" class="sc-dev"><DeviceGlyph :type="d.type" :size="32" :color="TYPE_META[d.type as DeviceType].color" /><div><b>{{ d.name }}</b><small>{{ d.model }}</small></div><a-badge :status="STATUS_META[d.status].badge" :text="STATUS_META[d.status].label" /></div>
            </div>
          </a-tab-pane>
          <a-tab-pane key="m" tab="评测指标"><a-tag v-for="m in cur.metrics" :key="m" color="cyan" style="padding:4px 10px;font-size:13px">{{ m }}</a-tag></a-tab-pane>
          <a-tab-pane key="h" tab="使用记录"><a-timeline style="margin-top:8px"><a-timeline-item v-for="h in HISTORY" :key="h.t" color="cyan"><b class="mono">{{ h.t }}</b><div class="muted">{{ h.c }} · {{ h.who }}</div></a-timeline-item></a-timeline></a-tab-pane>
        </a-tabs>
      </template>
    </a-drawer>

    <!-- 新建场景 -->
    <a-modal v-model:open="addOpen" title="新建场景" :width="720" :footer="null" @cancel="step = 0">
      <a-steps :current="step" size="small" style="margin:16px 0 22px" :items="[{ title: '基本信息' }, { title: '场景元素' }, { title: '评测与仿真' }]" />
      <a-form layout="vertical">
        <template v-if="step === 0">
          <a-row :gutter="16">
            <a-col :span="12"><a-form-item label="场景名称" required><a-input v-model:value="form.name" placeholder="如：楼梯攀爬区 B" /></a-form-item></a-col>
            <a-col :span="12"><a-form-item label="场景类型" required><a-select v-model:value="form.type" :options="SCENE_TYPES.map((v) => ({ value: v, label: v }))" /></a-form-item></a-col>
            <a-col :span="12"><a-form-item label="面积（m²）"><a-input-number v-model:value="form.area" style="width:100%" /></a-form-item></a-col>
            <a-col :span="12"><a-form-item label="难度"><a-rate v-model:value="form.difficulty" /></a-form-item></a-col>
          </a-row>
          <a-form-item label="场景描述"><a-textarea v-model:value="form.desc" :rows="3" placeholder="场景用途、布置说明" /></a-form-item>
        </template>
        <template v-else-if="step === 1">
          <a-form-item label="从资产库选择"><a-select v-model:value="form.elements" mode="multiple" :options="ASSETS.map((a) => ({ value: a.n.replace('模块', ''), label: `${a.n}（${a.k}）` }))" /></a-form-item>
          <a-form-item label="场景平面图"><a-upload-dragger :before-upload="() => false"><p style="margin:8px 0">上传 CAD / 图片平面图，或从仿真场景导入</p></a-upload-dragger></a-form-item>
        </template>
        <template v-else>
          <a-form-item label="评测模板"><a-checkbox-group :options="EVALS.map((e) => e.n)" /></a-form-item>
          <a-form-item label="同步生成仿真场景（USD）"><a-switch v-model:checked="form.sim" /> <span class="muted" style="margin-left:8px">创建后自动在仿真模块生成数字孪生场景</span></a-form-item>
        </template>
      </a-form>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px">
        <a-button v-if="step > 0" @click="step--">上一步</a-button>
        <a-button v-if="step < 2" type="primary" @click="step++">下一步</a-button>
        <a-button v-else type="primary" @click="submit">创建场景</a-button>
      </div>
    </a-modal>
  </ModuleShell>
</template>

<style scoped>
.sc-filter { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; } .sc-filter .r { margin-left: auto; display: flex; gap: 8px; }
.sc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.sc-card { position: relative; cursor: pointer; display: flex; flex-direction: column; background: linear-gradient(180deg, rgba(14,36,56,.9), rgba(10,27,43,.9)); border: 1px solid rgba(77,208,225,.14); border-radius: 4px; overflow: hidden; transition: all .25s; }
.sc-card:hover { border-color: rgba(77,208,225,.55); transform: translateY(-3px); box-shadow: 0 14px 30px rgba(0,0,0,.4), 0 0 24px rgba(38,198,218,.12); }
.sc-card :deep(.st) { border-bottom: 1px solid rgba(77,208,225,.12); }
.sc-card :deep(.st)::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 55%, rgba(10,27,43,.9)); }
.sc-badge { position: absolute; z-index: 1; left: 10px; top: 8px; padding: 1px 8px; background: rgba(6,17,29,.75); border-radius: 2px; font-size: 12px; }
.sc-badge :deep(.ant-badge-status-text) { font-size: 12px; }
.sc-sim { position: absolute; z-index: 1; right: 10px; top: 8px; padding: 1px 8px; font-size: 11.5px; color: #B48CFF; background: rgba(180,140,255,.14); border: 1px solid rgba(180,140,255,.35); border-radius: 2px; }
.sc-id { position: absolute; z-index: 1; left: 12px; bottom: 6px; font-size: 11px; color: #7FA6BA; }
.sc-b { padding: 12px 16px 6px; flex: 1; }
.sc-t { display: flex; align-items: center; gap: 8px; } .sc-t b { font-size: 16px; color: #fff; } .sc-t :deep(.ant-tag) { margin-left: auto; margin-right: 0; }
.sc-b p { margin: 6px 0 12px; font-size: 12.5px; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 38px; }
.sc-meta { display: grid; grid-template-columns: 1fr 1.4fr 1fr 1fr; gap: 6px; padding: 10px 0; border-top: 1px dashed var(--line); font-size: 12px; color: var(--muted); }
.sc-meta span { display: block; white-space: nowrap; } .sc-meta small { display: block; margin-bottom: 3px; font-size: 11px; color: var(--faint); } .sc-meta b { color: #fff; font-size: 15px; font-weight: 500; }
.sc-rate { font-size: 11px !important; color: #FFB74D; } .sc-rate :deep(.ant-rate-star:not(:last-child)) { margin-inline-end: 2px; }
.sc-foot { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px 6px 16px; border-top: 1px solid rgba(27,58,82,.7); font-size: 12px; background: rgba(6,17,29,.35); }
.sc-eval { padding: 16px 18px; } .sc-eval-h { display: flex; align-items: center; gap: 8px; color: #4DD0E1; } .sc-eval-h b { color: #fff; font-size: 15px; }
.sc-eval-m { margin: 12px 0; } .sc-eval-d { margin-bottom: 10px; } .sc-eval-f { display: flex; justify-content: flex-end; gap: 8px; }
</style>
<style>
.sc-drawer .ant-drawer-content { background: linear-gradient(180deg, #0E2438, #0A1B2B) !important; border-left: 1px solid rgba(77,208,225,.25); }
.sc-drawer .ant-drawer-body { padding: 0 24px 24px; }
.sc-dhero { margin: 0 -24px; width: calc(100% + 48px) !important; aspect-ratio: 21 / 8 !important; }
.sc-dhero-mask { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(10,27,43,.92) 20%, rgba(10,27,43,.2) 70%), linear-gradient(0deg, #0D2236, transparent 50%); }
.sc-dhero-b { position: absolute; left: 24px; bottom: 20px; }
.sc-dhero-b h2 { margin: 6px 0 8px; font-size: 26px; color: #fff; letter-spacing: 1px; }
.sc-dhero-op { position: absolute; right: 24px; bottom: 22px; }
.sc-dstats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 16px 0 6px; }
.sc-dstats div { padding: 10px 12px; background: rgba(16,38,59,.6); border: 1px solid rgba(77,208,225,.12); border-radius: 4px; }
.sc-dstats small { display: block; color: #8FB3C7; font-size: 12px; } .sc-dstats b { font-size: 20px; font-weight: 500; color: #fff; } .sc-dstats em { font-style: normal; font-size: 12px; color: #8FB3C7; margin-left: 3px; }
.sc-dstats .sc-rate { font-size: 12px !important; color: #FFB74D; }
.sc-devs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.sc-dev { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: rgba(16,38,59,.6); border: 1px solid rgba(77,208,225,.12); border-radius: 4px; }
.sc-dev div { flex: 1; display: flex; flex-direction: column; line-height: 1.3; } .sc-dev small { color: #8FB3C7; font-size: 12px; }
</style>
