<script setup lang="ts">
import { computed } from 'vue'
import { CheckOutlined, RightOutlined, ArrowRightOutlined, InfoCircleOutlined } from '@ant-design/icons-vue'
import BizMap from './BizMap.vue'
import { LOC_META, alarmColor } from '@/mock/biz'
import { robot, rt, steps, curStep, isIns, myRoutes, myGroups, myMaps, db, curId, routeById, groupById, shortName } from './store'

const emit = defineEmits<{ go: [tab: string, sub?: string] }>()
const run = computed(() => rt.value.run)
const runRoute = computed(() => routeById(run.value?.route))
const runGroup = computed(() => groupById(run.value?.group))
const runPts = computed(() => (runGroup.value?.points ?? []).map((p, i, a) => ({ mx: p.mx, my: p.my, st: (runRoute.value ? p.f <= run.value!.progress : i < Math.floor(run.value!.progress * a.length)) ? 'done' as const : 'todo' as const })))
const doneN = computed(() => runPts.value.filter((p) => p.st === 'done').length)
const rounds = computed(() => db.rounds.filter((r) => r.robot === curId.value))
const today = computed(() => rounds.value.filter((r) => r.start.startsWith('10-20') || !r.start.includes('-')))
const alarms = computed(() => db.alarms.filter((a) => a.robot === curId.value))
const pending = computed(() => alarms.value.filter((a) => a.state === '待处理').length)
const KPI = computed(() => [
  { l: '今日巡检轮次', v: today.value.length, u: '轮', k: '#4DD0E1' },
  { l: '今日巡检点位', v: today.value.reduce((a, r) => a + r.total, 0), u: '个', k: '#5B9BFF' },
  { l: '今日异常点位', v: today.value.reduce((a, r) => a + r.bad, 0), u: '个', k: '#FFB74D' },
  { l: '待处理告警', v: pending.value, u: '条', k: '#FF6B6B' },
])
const tree = computed(() => myRoutes.value.map((r) => ({ r, groups: myGroups.value.filter((g) => g.route === r.id) })))
const pubGroups = computed(() => myGroups.value.filter((g) => g.kind === '发布点'))
const mapMode = computed(() => (isIns.value ? 'sat' : 'grid'))
</script>

<template>
  <div class="pp-head">
    <div><h2>作业总览</h2><p>{{ robot.name }} 的巡检作业准备进度、执行情况与告警</p></div>
  </div>

  <!-- 主流程 -->
  <div class="pp-panel bf-flow">
    <div class="pp-panel-h">
      <h3>巡检作业流程</h3><a-tag :color="isIns ? 'green' : 'blue'" style="margin-left:8px">{{ LOC_META[robot.loc].t }}</a-tag>
      <span class="muted" style="font-size:12px;margin-left:4px">{{ isIns ? 'INS 使用 GPS 坐标定位，无需录包建图；不重新初始化可直接执行任务' : '激光雷达需先录包建图，生成栅格地图后开启导航定位' }}</span>
      <span class="r muted" style="font-size:12px">已完成 {{ steps.filter((s) => s.done).length }} / {{ steps.length }}</span>
    </div>
    <div class="bf-steps">
      <template v-for="(s, i) in steps" :key="s.k">
        <div class="bf-step" :class="{ done: s.done, cur: i === curStep }" @click="emit('go', s.tab, s.sub)">
          <div class="no"><CheckOutlined v-if="s.done" /><template v-else>{{ i + 1 }}</template></div>
          <b>{{ s.t }}</b>
          <small>{{ s.d }}</small>
          <span class="st">{{ s.done ? '已完成' : i === curStep ? '待处理' : '未开始' }}</span>
        </div>
        <ArrowRightOutlined v-if="i < steps.length - 1" class="bf-arrow" :class="{ on: s.done }" />
      </template>
    </div>
    <div v-if="curStep >= 0" class="bf-tip">
      <InfoCircleOutlined /><span>下一步：<b>{{ steps[curStep].t }}</b> —— {{ steps[curStep].tip }}</span>
      <a-button type="primary" size="small" :disabled="!robot.online" @click="emit('go', steps[curStep].tab, steps[curStep].sub)">去处理 <RightOutlined /></a-button>
    </div>
    <div v-else class="bf-tip ok"><CheckOutlined /><span>巡检作业已全部就绪，任务执行中</span><a-button size="small" @click="emit('go', 'monitor')">实时监控 <RightOutlined /></a-button></div>
  </div>

  <div class="pp-kpis" style="grid-template-columns:repeat(4,1fr)">
    <div v-for="k in KPI" :key="k.l" class="pp-kpi" :style="{ '--k': k.k }"><small>{{ k.l }}</small><b>{{ k.v }}<em>{{ k.u }}</em></b><span class="bar" /></div>
  </div>

  <div class="bf-row">
    <!-- 当前任务 -->
    <div class="pp-panel bf-run">
      <div class="pp-panel-h"><h3>当前任务</h3><a class="r" style="font-size:12px" @click="emit('go', 'task')">任务执行 <RightOutlined /></a></div>
      <template v-if="run">
        <div class="bf-run-h"><b>{{ run.name }}</b><a-tag color="cyan">{{ run.kind }}</a-tag><a-badge :status="rt.pause ? 'warning' : 'processing'" :text="rt.pause ? '已暂停' : '执行中'" /></div>
        <div class="bf-run-b">
          <div class="map"><BizMap :mode="mapMode" :zones="!isIns" :shape="runRoute?.shape ?? null" :pts="runPts" :progress="run.progress" :robot="rt.pose" :labels="false" /></div>
          <div class="kv">
            <span>开始时间</span><b class="mono">{{ run.start }}</b>
            <span>任务进度</span><b class="mono">{{ Math.round(run.progress * 100) }}%</b>
            <span>任务点</span><b class="mono">{{ doneN }} / {{ runPts.length }}</b>
            <span>圈数</span><b class="mono">{{ run.laps }} / {{ run.circle }}</b>
            <span>避障模式</span><b>{{ run.obs }}</b>
            <span>步态</span><b>{{ run.gait }}</b>
          </div>
        </div>
      </template>
      <div v-else class="bf-empty">{{ robot.online ? '当前无执行任务' : '设备离线' }}<a-button v-if="robot.online" size="small" type="primary" ghost @click="emit('go', 'task')">去启动任务</a-button></div>
    </div>

    <!-- 最近巡检 -->
    <div class="pp-panel">
      <div class="pp-panel-h"><h3>最近巡检轮次</h3><a class="r" style="font-size:12px" @click="emit('go', 'record')">巡检记录 <RightOutlined /></a></div>
      <ul class="bf-list">
        <li v-for="r in rounds.slice(0, 6)" :key="r.id">
          <span class="mono t">{{ r.start }}</span><span class="n ellipsis">{{ r.route }} / {{ r.group }}</span>
          <span class="mono">{{ r.total }} 点</span><span class="mono" :style="{ color: r.bad ? '#FF6B6B' : '#4DE8B0', width: '44px', textAlign: 'right' }">{{ r.bad ? r.bad + ' 异常' : '正常' }}</span>
        </li>
        <li v-if="!rounds.length" class="empty">暂无巡检记录</li>
      </ul>
    </div>

    <!-- 最新告警 -->
    <div class="pp-panel">
      <div class="pp-panel-h"><h3>最新告警</h3><a-tag v-if="pending" color="error" style="margin-left:6px">{{ pending }} 待处理</a-tag><a class="r" style="font-size:12px" @click="emit('go', 'alarm')">告警中心 <RightOutlined /></a></div>
      <ul class="bf-list">
        <li v-for="a in alarms.slice(0, 6)" :key="a.id">
          <span class="mono t">{{ a.time.slice(5, 16) }}</span><span class="ty" :style="{ color: alarmColor(a.type) }">{{ a.type }}</span><span class="n ellipsis">{{ a.content }}</span>
          <a-badge :status="a.state === '待处理' ? 'error' : 'default'" :text="a.state" />
        </li>
        <li v-if="!alarms.length" class="empty">暂无告警</li>
      </ul>
    </div>
  </div>

  <!-- 巡检资源 -->
  <div class="pp-panel">
    <div class="pp-panel-h"><h3>巡检资源</h3><span class="muted" style="font-size:12px;margin-left:6px">{{ isIns ? 'INS 坐标系' : myMaps.length + ' 张地图' }} · {{ myRoutes.length }} 条路线 · {{ myGroups.length }} 个任务组</span><a class="r" style="font-size:12px" @click="emit('go', 'route')">路线与任务点 <RightOutlined /></a></div>
    <table class="bf-tree">
      <thead><tr><th>{{ isIns ? '坐标系' : '地图' }}</th><th>路线</th><th>任务组</th><th>任务点</th><th>创建时间</th></tr></thead>
      <tbody>
        <template v-for="t in tree" :key="t.r.id">
          <tr v-for="(g, i) in t.groups.length ? t.groups : [null]" :key="g?.id ?? t.r.id">
            <td v-if="i === 0" :rowspan="t.groups.length || 1">{{ t.r.map || 'INS 原点' }}</td>
            <td v-if="i === 0" :rowspan="t.groups.length || 1"><b>{{ shortName(t.r) }}</b></td>
            <td>{{ g?.name ?? '—' }}</td>
            <td class="mono" :style="{ color: g && !g.points.length ? '#FFB74D' : undefined }">{{ g ? (g.points.length || '未添加') : '—' }}</td>
            <td v-if="i === 0" :rowspan="t.groups.length || 1" class="mono muted">{{ t.r.created }}</td>
          </tr>
        </template>
        <tr v-for="g in pubGroups" :key="g.id"><td>{{ g.map }}</td><td class="muted">发布点任务（无路线）</td><td>{{ g.name }}</td><td class="mono">{{ g.points.length }}</td><td class="muted">—</td></tr>
        <tr v-if="!tree.length && !pubGroups.length"><td colspan="5" class="empty">暂无路线，请先完成{{ isIns ? ' INS 初始化并' : '建图与导航定位后' }}录制路线</td></tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.bf-flow { margin-bottom: 16px; }
.bf-steps { display: flex; align-items: stretch; gap: 8px; padding: 18px 18px 12px; }
.bf-step { flex: 1; min-width: 0; position: relative; display: flex; flex-direction: column; gap: 4px; padding: 14px 14px 12px; cursor: pointer; background: rgba(16,38,59,.5); border: 1px solid rgba(77,208,225,.12); border-radius: 4px; transition: border-color .2s, background .2s; }
.bf-step:hover { border-color: rgba(77,208,225,.45); }
.bf-step .no { width: 26px; height: 26px; display: grid; place-items: center; margin-bottom: 4px; font: 600 13px var(--mono); color: var(--muted); border: 1px solid var(--line-strong); border-radius: 50%; }
.bf-step b { font-size: 14px; font-weight: 600; } .bf-step small { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bf-step .st { position: absolute; right: 12px; top: 14px; font-size: 11.5px; color: var(--faint); }
.bf-step.done { background: rgba(77,232,176,.06); border-color: rgba(77,232,176,.25); } .bf-step.done .no { background: #4DE8B0; border-color: #4DE8B0; color: #04121D; } .bf-step.done .st { color: #4DE8B0; }
.bf-step.cur { background: rgba(255,183,77,.08); border-color: rgba(255,183,77,.6); box-shadow: 0 0 0 1px rgba(255,183,77,.15) inset; } .bf-step.cur .no { border-color: #FFB74D; color: #FFB74D; } .bf-step.cur .st { color: #FFB74D; }
.bf-arrow { align-self: center; color: var(--faint); font-size: 12px; } .bf-arrow.on { color: #4DE8B0; }
.bf-tip { display: flex; align-items: center; gap: 10px; margin: 0 18px 16px; padding: 9px 12px; font-size: 13px; background: rgba(255,183,77,.07); border: 1px dashed rgba(255,183,77,.35); border-radius: 3px; color: var(--muted); }
.bf-tip > span { flex: 1; } .bf-tip b { color: #FFB74D; } .bf-tip > .anticon { color: #FFB74D; }
.bf-tip.ok { background: rgba(77,232,176,.06); border-color: rgba(77,232,176,.3); } .bf-tip.ok > .anticon { color: #4DE8B0; }
.bf-row { display: grid; grid-template-columns: 1.25fr 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.bf-run-h { display: flex; align-items: center; gap: 8px; padding: 12px 16px 0; } .bf-run-h b { flex: 1; min-width: 0; font-size: 14px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.bf-run-b { display: grid; grid-template-columns: 1.4fr 1fr; gap: 14px; padding: 12px 16px 16px; }
.bf-run-b .map { aspect-ratio: 16 / 10; border: 1px solid rgba(77,208,225,.16); border-radius: 3px; overflow: hidden; }
.bf-run-b .kv { display: grid; grid-template-columns: auto 1fr; gap: 9px 10px; align-content: start; font-size: 12.5px; } .bf-run-b .kv span { color: var(--muted); } .bf-run-b .kv b { font-weight: 500; text-align: right; }
.bf-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 56px 0; color: var(--faint); font-size: 13px; }
.bf-list { list-style: none; margin: 0; padding: 6px 16px 10px; }
.bf-list li { display: flex; align-items: center; gap: 10px; padding: 9px 0; font-size: 12.5px; border-bottom: 1px dashed var(--line); }
.bf-list .t { color: var(--muted); font-size: 12px; flex: none; } .bf-list .n { flex: 1; min-width: 0; } .bf-list .ty { flex: none; font-size: 12px; }
.bf-list li.empty, .bf-tree .empty { justify-content: center; color: var(--faint); border: 0; padding: 30px 0; text-align: center; }
.ellipsis { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.bf-tree { width: calc(100% - 32px); margin: 8px 16px 16px; border-collapse: collapse; font-size: 13px; }
.bf-tree th { padding: 9px 12px; text-align: left; font-weight: 500; color: var(--muted); background: rgba(77,208,225,.06); }
.bf-tree td { padding: 9px 12px; border-bottom: 1px solid var(--line); } .bf-tree td b { font-weight: 500; }
</style>
