<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { EnvironmentOutlined, FundProjectionScreenOutlined, PlusOutlined, SearchOutlined, EditOutlined, CalendarOutlined, MoreOutlined, ExpandOutlined } from '@ant-design/icons-vue'
import ModuleShell from '@/components/proto/ModuleShell.vue'
import ScenePlan from '@/components/proto/ScenePlan.vue'
import LineChart from '@/components/proto/LineChart.vue'
import { SCENES, SCENE_STATUS, SCENE_TYPES, TYPE_COLOR, PLAN_LEGEND, type Scene } from '@/mock/scenes'
import { rng } from '@/utils'

document.title = '场景管理 · 具身智能训练场'
const router = useRouter()
const MENU = [
  { key: 'lib', label: '训练场景', icon: EnvironmentOutlined },
  { key: 'screen', label: '大屏展示', icon: FundProjectionScreenOutlined },
]
const openScreen = () => window.open(router.resolve('/m/scene/screen').href, '_blank')
const onMenu = (k: string) => { if (k === 'screen') openScreen() }

const f = reactive({ type: '全部', kw: '' })
const list = computed(() => SCENES.filter((s) => (f.type === '全部' || s.type === f.type) && (!f.kw || s.name.includes(f.kw))))
const cur = ref<Scene>(SCENES[0])
const KPIS = [
  { l: '场景总数', v: SCENES.length, u: '个', k: '#4DD0E1' },
  { l: '启用中', v: SCENES.filter((s) => s.status === 'active').length, u: '个', k: '#4DE8B0' },
  { l: '维护中', v: SCENES.filter((s) => s.status === 'maint').length, u: '个', k: '#FFB74D' },
  { l: '场地总面积', v: SCENES.reduce((a, s) => a + s.area, 0).toLocaleString('en-US'), u: 'm²', k: '#5B9BFF' },
  { l: '本月使用时长', v: '1,286', u: '小时', k: '#B48CFF' },
  { l: '今日预约', v: 14, u: '场', k: '#3FA9F5' },
]

/* 本周排期（示例） */
const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const TEAMS = ['一组', '二组', '三组', '应急组', '外部单位']
const schedule = computed(() => {
  const r = rng(cur.value.id.charCodeAt(4) * 13 + 7)
  return DAYS.map((d, i) => {
    const slots: { s: number; e: number; team: string }[] = []
    let t = 8 + Math.floor(r() * 2)
    while (t < 20 && cur.value.status !== 'draft') {
      const len = 1 + Math.floor(r() * 3)
      if (r() > 0.35 && t + len <= 21) slots.push({ s: t, e: t + len, team: TEAMS[Math.floor(r() * TEAMS.length)] })
      t += len + Math.floor(r() * 2)
    }
    return { d, today: i === 0, slots }
  })
})
const usage = computed(() => { const r = rng(cur.value.area); return Array.from({ length: 30 }, (_, i) => (cur.value.status === 'draft' ? 0 : Math.round((cur.value.hours / 30) * (0.6 + r() * 0.8) * (i % 7 > 4 ? 0.5 : 1)))) })
const usageLabels = Array.from({ length: 30 }, (_, i) => (i % 5 === 0 ? `10-${String(i + 1).padStart(2, '0')}` : ''))
const ENV = computed(() => [
  { l: '温度', v: cur.value.env.temp, u: '℃', ok: cur.value.env.temp < 28 }, { l: '湿度', v: cur.value.env.hum, u: '%', ok: cur.value.env.hum < 75 },
  { l: '照度', v: cur.value.env.lux, u: 'lx', ok: true }, { l: '噪声', v: cur.value.env.noise, u: 'dB', ok: cur.value.env.noise < 60 },
])

const addOpen = ref(false)
const form = reactive({ name: '', type: '楼梯攀爬', area: 300, difficulty: 3, open: '08:00–20:00', capacity: 4, desc: '' })
const submit = () => { addOpen.value = false; message.success('场景已创建（原型演示）') }
const planOpen = ref(false)
</script>

<template>
  <ModuleShell active="lib" title="场景管理" en="Training Ground" :menu="MENU" @update:active="onMenu">
    <div class="pp-head">
      <div><h2>训练场景</h2><p>管理训练场物理场景的布局、场景要素、环境状态与使用排期</p></div>
      <div class="r"><a-button @click="openScreen"><FundProjectionScreenOutlined />大屏展示</a-button><a-button type="primary" @click="addOpen = true"><PlusOutlined />新建场景</a-button></div>
    </div>
    <div class="pp-kpis">
      <div v-for="k in KPIS" :key="k.l" class="pp-kpi" :style="{ '--k': k.k }"><small>{{ k.l }}</small><b>{{ k.v }}<em>{{ k.u }}</em></b><span class="bar" /></div>
    </div>

    <div class="sc">
      <!-- 场景列表 -->
      <div class="pp-panel sc-list">
        <div class="pp-panel-h"><h3>场景列表</h3><span class="muted" style="font-size:12px">{{ list.length }} 个</span></div>
        <div class="sc-filter">
          <a-input v-model:value="f.kw" allow-clear placeholder="搜索场景名称"><template #prefix><SearchOutlined class="muted" /></template></a-input>
          <div class="sc-types"><button v-for="t in ['全部', ...SCENE_TYPES]" :key="t" type="button" :class="{ on: f.type === t }" @click="f.type = t">{{ t }}</button></div>
        </div>
        <div class="sc-items">
          <button v-for="s in list" :key="s.id" type="button" class="sc-item" :class="{ on: cur.id === s.id }" :style="{ '--c': TYPE_COLOR[s.type] }" @click="cur = s">
            <span class="mini"><ScenePlan :items="s.plan" :labels="false" :anim="false" :dim="s.status === 'draft'" /></span>
            <span class="b">
              <span class="t"><b>{{ s.name }}</b><a-badge :status="SCENE_STATUS[s.status].b" :text="SCENE_STATUS[s.status].t" /></span>
              <small><i :style="{ background: TYPE_COLOR[s.type] }" />{{ s.type }} · {{ s.area }} m² · <span class="mono">{{ s.id }}</span></small>
            </span>
          </button>
        </div>
      </div>

      <!-- 场景详情 -->
      <div class="sc-detail">
        <div class="pp-panel sc-hd" :style="{ '--c': TYPE_COLOR[cur.type] }">
          <div class="sc-hd-t">
            <div><span class="mono muted">{{ cur.id }}</span><h3>{{ cur.name }}</h3></div>
            <a-tag :style="{ color: TYPE_COLOR[cur.type], borderColor: TYPE_COLOR[cur.type] + '66', background: TYPE_COLOR[cur.type] + '1A' }">{{ cur.type }}</a-tag>
            <a-badge :status="SCENE_STATUS[cur.status].b" :text="SCENE_STATUS[cur.status].t" />
            <a-tag v-for="t in cur.tags" :key="t">{{ t }}</a-tag>
            <a-space class="r">
              <a-button><EditOutlined />编辑布局</a-button><a-button type="primary" :disabled="cur.status !== 'active'"><CalendarOutlined />预约使用</a-button>
              <a-dropdown><a-button><MoreOutlined /></a-button><template #overlay><a-menu><a-menu-item>{{ cur.status === 'maint' ? '结束维护' : '设为维护' }}</a-menu-item><a-menu-item>复制场景</a-menu-item><a-menu-item danger>停用</a-menu-item></a-menu></template></a-dropdown>
            </a-space>
          </div>
          <p class="muted">{{ cur.desc }}</p>
        </div>

        <div class="sc-row">
          <div class="pp-panel sc-plan">
            <div class="pp-panel-h"><h3>场景布局</h3>
              <span class="sc-lg"><span v-for="l in PLAN_LEGEND" :key="l.k"><i :style="{ background: l.c }" />{{ l.t }}</span></span>
              <a-tooltip title="放大查看"><a-button type="text" size="small" class="r" @click="planOpen = true"><ExpandOutlined /></a-button></a-tooltip>
            </div>
            <div class="sc-plan-b"><ScenePlan :key="cur.id" :items="cur.plan" :dim="cur.status === 'draft'" /></div>
          </div>
          <div class="sc-info">
            <div class="pp-panel">
              <div class="pp-panel-h"><h3>基本信息</h3></div>
              <a-descriptions :column="2" size="small" class="sc-desc">
                <a-descriptions-item label="面积">{{ cur.area }} m²</a-descriptions-item>
                <a-descriptions-item label="难度"><a-rate :value="cur.difficulty" disabled class="sc-rate" /></a-descriptions-item>
                <a-descriptions-item label="开放时间">{{ cur.open }}</a-descriptions-item>
                <a-descriptions-item label="同时容纳">{{ cur.capacity }} 台</a-descriptions-item>
                <a-descriptions-item label="负责人">{{ cur.owner }}</a-descriptions-item>
                <a-descriptions-item label="更新">{{ cur.updated }}</a-descriptions-item>
                <a-descriptions-item label="累计使用" :span="2">{{ cur.hours.toLocaleString('en-US') }} 小时</a-descriptions-item>
              </a-descriptions>
            </div>
            <div class="pp-panel">
              <div class="pp-panel-h"><h3>环境监测</h3><span class="muted r" style="font-size:12px">{{ cur.status === 'draft' ? '未接入' : '实时 · 1 分钟前' }}</span></div>
              <div class="sc-env">
                <div v-for="e in ENV" :key="e.l" :class="{ warn: !e.ok }"><small>{{ e.l }}</small><b class="mono">{{ cur.status === 'draft' ? '--' : e.v }}<em>{{ e.u }}</em></b></div>
              </div>
            </div>
          </div>
        </div>

        <div class="sc-row b">
          <div class="pp-panel">
            <div class="pp-panel-h"><h3>场景要素</h3><a-button size="small" class="r"><PlusOutlined />添加</a-button></div>
            <a-table :data-source="cur.elements" row-key="name" size="small" :pagination="false" :columns="[{ title: '名称', dataIndex: 'name' }, { title: '类别', key: 'kind', width: 80 }, { title: '数量', dataIndex: 'qty', width: 70 }, { title: '规格', dataIndex: 'spec' }]">
              <template #bodyCell="{ column, record }"><template v-if="column.key === 'kind'"><a-tag>{{ record.kind }}</a-tag></template></template>
            </a-table>
          </div>
          <div class="pp-panel">
            <div class="pp-panel-h"><h3>本周使用排期</h3><span class="muted r" style="font-size:12px">08:00 – 21:00</span></div>
            <div class="sc-sch">
              <div class="sc-sch-h"><span /><div><i v-for="h in [8, 10, 12, 14, 16, 18, 20]" :key="h" :style="{ left: ((h - 8) / 13) * 100 + '%' }">{{ h }}</i></div></div>
              <div v-for="d in schedule" :key="d.d" class="sc-sch-r" :class="{ today: d.today }">
                <span>{{ d.d }}</span>
                <div><a-tooltip v-for="(s, i) in d.slots" :key="i" :title="`${s.s}:00–${s.e}:00 · ${s.team}`"><i :style="{ left: ((s.s - 8) / 13) * 100 + '%', width: `calc(${((s.e - s.s) / 13) * 100}% - 3px)`, '--c': TYPE_COLOR[cur.type] }">{{ s.team }}</i></a-tooltip></div>
              </div>
            </div>
          </div>
        </div>

        <div class="pp-panel">
          <div class="pp-panel-h"><h3>近 30 天使用时长</h3><span class="muted r" style="font-size:12px">单位：小时 / 天</span></div>
          <div style="padding: 8px 14px 4px"><LineChart :key="cur.id" :series="[{ name: '使用时长', color: TYPE_COLOR[cur.type], data: usage }]" :labels="usageLabels" :height="150" :min="0" /></div>
        </div>
      </div>
    </div>

    <a-modal v-model:open="planOpen" :title="`${cur.name} · 场景布局`" :width="1100" :footer="null">
      <div style="aspect-ratio: 16 / 10; margin-top: 12px"><ScenePlan :items="cur.plan" /></div>
    </a-modal>

    <a-modal v-model:open="addOpen" title="新建场景" :width="680" ok-text="创建" @ok="submit">
      <a-form layout="vertical" style="margin-top:12px">
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="场景名称" required><a-input v-model:value="form.name" placeholder="如：楼梯攀爬区 B" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="场景类型" required><a-select v-model:value="form.type" :options="SCENE_TYPES.map((v) => ({ value: v, label: v }))" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="面积（m²）"><a-input-number v-model:value="form.area" style="width:100%" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="同时容纳（台）"><a-input-number v-model:value="form.capacity" style="width:100%" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="开放时间"><a-input v-model:value="form.open" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="难度"><a-rate v-model:value="form.difficulty" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="负责人"><a-select placeholder="请选择" :options="['周工', '赵工', '张杰'].map((v) => ({ value: v, label: v }))" /></a-form-item></a-col>
        </a-row>
        <a-form-item label="场景平面图"><a-upload-dragger :before-upload="() => false"><p style="margin:8px 0">上传 CAD / 图片平面图，或稍后在线绘制布局</p></a-upload-dragger></a-form-item>
        <a-form-item label="场景描述"><a-textarea v-model:value="form.desc" :rows="3" placeholder="场景用途、布置说明" /></a-form-item>
      </a-form>
    </a-modal>
  </ModuleShell>
</template>

<style scoped>
.sc { display: grid; grid-template-columns: 330px 1fr; gap: 16px; align-items: start; }
.sc .r { margin-left: auto; }
.sc-list { position: sticky; top: 0; }
.sc-filter { padding: 12px 14px 4px; }
.sc-types { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 6px; }
.sc-types button { padding: 2px 10px; font: inherit; font-size: 12px; color: var(--muted); cursor: pointer; background: rgba(77,208,225,.05); border: 1px solid var(--line); border-radius: 2px; }
.sc-types button.on { color: #fff; border-color: var(--accent); background: var(--accent-soft); }
.sc-items { padding: 4px 8px 10px; }
.sc-item { width: 100%; display: flex; gap: 12px; align-items: center; padding: 10px; margin-top: 4px; font: inherit; color: var(--text); text-align: left; cursor: pointer; background: transparent; border: 1px solid transparent; border-radius: 4px; transition: all .2s; }
.sc-item:hover { background: rgba(77,208,225,.05); }
.sc-item.on { background: linear-gradient(90deg, color-mix(in srgb, var(--c) 15%, transparent), rgba(16,38,59,.4)); border-color: color-mix(in srgb, var(--c) 50%, transparent); }
.sc-item .mini { width: 84px; height: 52px; flex: none; border: 1px solid rgba(77,208,225,.2); border-radius: 3px; overflow: hidden; }
.sc-item .b { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.sc-item .t { display: flex; align-items: center; gap: 6px; } .sc-item .t b { font-size: 14px; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sc-item .t :deep(.ant-badge-status-text) { font-size: 12px; color: var(--muted); }
.sc-item small { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 5px; } .sc-item small i { width: 6px; height: 6px; border-radius: 1px; }
.sc-detail { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.sc-hd { padding: 16px 20px; background: linear-gradient(120deg, color-mix(in srgb, var(--c) 14%, rgba(12,30,48,.9)), rgba(10,27,43,.85) 55%) !important; }
.sc-hd-t { display: flex; align-items: center; gap: 12px; }
.sc-hd-t h3 { margin: 2px 0 0; font-size: 22px; color: #fff; letter-spacing: 1px; } .sc-hd-t .mono { font-size: 12px; }
.sc-hd p { margin: 10px 0 0; font-size: 13px; }
.sc-row { display: grid; grid-template-columns: 1.55fr 1fr; gap: 16px; }
.sc-row.b { grid-template-columns: 1fr 1.2fr; }
.sc-plan { display: flex; flex-direction: column; }
.sc-plan-b { padding: 12px; aspect-ratio: 16 / 10; }
.sc-plan-b :deep(.plan) { border: 1px solid rgba(77,208,225,.18); border-radius: 3px; }
.sc-lg { display: flex; gap: 12px; margin-left: 12px; font-size: 12px; color: var(--muted); } .sc-lg i { display: inline-block; width: 8px; height: 8px; margin-right: 4px; border-radius: 2px; }
.sc-info { display: flex; flex-direction: column; gap: 16px; }
.sc-desc { padding: 12px 16px 4px; } .sc-desc :deep(.ant-descriptions-item-label) { color: var(--muted); }
.sc-rate { font-size: 12px !important; color: #FFB74D; } .sc-rate :deep(.ant-rate-star:not(:last-child)) { margin-inline-end: 2px; }
.sc-env { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 14px 16px 16px; }
.sc-env > div { padding: 10px 12px; background: rgba(77,208,225,.05); border: 1px solid rgba(77,208,225,.12); border-left: 2px solid #4DE8B0; border-radius: 3px; }
.sc-env > div.warn { border-left-color: #FFB74D; } .sc-env > div.warn b { color: #FFB74D; }
.sc-env small { display: block; font-size: 12px; color: var(--muted); } .sc-env b { font-size: 22px; font-weight: 600; } .sc-env em { font-style: normal; font-size: 12px; color: var(--muted); margin-left: 3px; }
.sc-sch { padding: 10px 16px 14px; }
.sc-sch-h, .sc-sch-r { display: grid; grid-template-columns: 40px 1fr; align-items: center; gap: 8px; }
.sc-sch-h > div { position: relative; height: 18px; } .sc-sch-h i { position: absolute; transform: translateX(-50%); font: 11px var(--mono); font-style: normal; color: var(--faint); }
.sc-sch-r { height: 30px; font-size: 12px; color: var(--muted); }
.sc-sch-r > div { position: relative; height: 22px; background: repeating-linear-gradient(90deg, rgba(77,208,225,.06) 0 1px, transparent 1px calc(100% / 13)); border-bottom: 1px dashed var(--line); }
.sc-sch-r.today > span { color: var(--cyan); font-weight: 600; }
.sc-sch-r i { position: absolute; top: 2px; bottom: 2px; padding: 0 6px; font-style: normal; font-size: 11px; line-height: 18px; color: #fff; white-space: nowrap; overflow: hidden; background: color-mix(in srgb, var(--c) 30%, transparent); border-left: 2px solid var(--c); border-radius: 2px; }
</style>
