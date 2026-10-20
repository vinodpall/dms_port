<script setup lang="ts">
import { computed } from 'vue'
import { RightOutlined } from '@ant-design/icons-vue'
import DeviceGlyph from '@/components/proto/DeviceGlyph.vue'
import DonutChart from '@/components/proto/DonutChart.vue'
import LineChart from '@/components/proto/LineChart.vue'
import CamShot from './CamShot.vue'
import { ROBOTS, ROBOT_STATE, KIND_META, ALARMS, ALARM_TYPES, ROUNDS, SCHEDULES, TASKS } from '@/mock/biz'
import { rng } from '@/utils'

const emit = defineEmits<{ go: [tab: string, robot?: string] }>()
const online = ROBOTS.filter((r) => r.state !== 'offline').length
const pending = ALARMS.filter((a) => a.state === '待处理').length
const KPIS = [
  { l: '在线机器人', v: `${online}`, u: `/ ${ROBOTS.length} 台`, k: '#4DD0E1' },
  { l: '执行中任务', v: ROBOTS.filter((r) => r.state === 'task').length, u: '个', k: '#26C6DA' },
  { l: '今日巡检轮次', v: 9, u: '轮', k: '#5B9BFF' },
  { l: '今日巡检点位', v: '186', u: '/ 204', k: '#4DE8B0' },
  { l: '今日告警', v: 7, u: '条', k: '#FFB74D' },
  { l: '待处理告警', v: pending, u: '条', k: '#FF6B6B' },
]
/* 今日任务执行（甘特） */
const NOW = 9.6
const gantt = computed(() => ROBOTS.map((r, i) => {
  const g = rng(70 + i); const blocks: { s: number; e: number; t: string; st: string }[] = []
  if (r.state !== 'offline') {
    let t = 0.5 + g() * 2
    while (t < 23) { const len = 0.6 + g() * 1.2; if (g() > 0.35) blocks.push({ s: t, e: Math.min(t + len, 24), t: TASKS[Math.floor(g() * TASKS.length)].name, st: t + len < NOW ? 'done' : t < NOW ? 'run' : 'plan' }); t += len + 1.2 + g() * 3 }
  }
  return { r, blocks }
}))
const DAYS = ['10-14', '10-15', '10-16', '10-17', '10-18', '10-19', '10-20']
const trendAll = [9, 12, 7, 10, 6, 11, 7], trendBad = [3, 5, 2, 4, 2, 4, 5]
const typeDonut = ALARM_TYPES.map((t, i) => ({ label: t.t, color: t.c, value: [6, 9, 5, 2, 4, 3][i] }))
const latest = ALARMS.slice(0, 6)
const color = (t: string) => ALARM_TYPES.find((x) => x.t === t)?.c ?? '#FF6B6B'
const rate = Math.round((ROUNDS.filter((r) => r.state === '已完成').length / ROUNDS.length) * 100)
</script>

<template>
  <div class="pp-head"><div><h2>业务总览</h2><p>巡检机器人业务运行态势：机器人状态、任务执行、巡检结果与告警</p></div></div>
  <div class="pp-kpis">
    <div v-for="k in KPIS" :key="k.l" class="pp-kpi" :style="{ '--k': k.k }"><small><i class="kd" :style="{ background: k.k }" />{{ k.l }}</small><b>{{ k.v }}<em>{{ k.u }}</em></b><span class="bar" /></div>
  </div>

  <!-- 机器人 -->
  <div class="bd-robots">
    <div v-for="r in ROBOTS" :key="r.id" class="bd-robot" :class="r.state" :style="{ '--c': ROBOT_STATE[r.state].c }" @click="r.state !== 'offline' && emit('go', 'monitor', r.id)">
      <div class="h">
        <span class="ic"><DeviceGlyph :type="KIND_META[r.kind].glyph" :size="40" :color="r.state === 'offline' ? '#5B7486' : KIND_META[r.kind].c" /></span>
        <div style="min-width:0"><b>{{ r.name }}</b><small class="mono ellipsis" style="display:block">{{ r.id }} · {{ r.model }}</small></div>
        <a-badge :status="ROBOT_STATE[r.state].b" :text="ROBOT_STATE[r.state].t" class="st" />
      </div>
      <div class="task">
        <template v-if="r.task"><span class="ellipsis">{{ r.task }}</span><b class="mono">{{ r.progress }}%</b></template>
        <span v-else class="muted">{{ r.state === 'offline' ? '设备离线' : r.state === 'charging' ? '回桩充电中' : '待命 · 无执行任务' }}</span>
      </div>
      <div class="prog"><i :style="{ width: (r.progress ?? 0) + '%' }" /></div>
      <div class="f">
        <span>电量 <b class="mono" :style="{ color: r.battery < 30 ? '#FF6B6B' : undefined }">{{ r.state === 'offline' ? '--' : r.battery + '%' }}</b></span>
        <span>{{ r.map }}</span>
        <span v-if="r.state !== 'offline'" class="go">监控 <RightOutlined /></span>
      </div>
    </div>
  </div>

  <div class="bd-row">
    <div class="pp-panel bd-p">
      <div class="pp-panel-h"><h3>今日任务执行</h3><span class="bd-lg r"><i style="background:#26C6DA" />已完成<i style="background:#4DE8B0" />执行中<i style="background:rgba(143,179,199,.35)" />计划</span></div>
      <div class="bd-gantt">
        <div class="ax"><span /><div><i v-for="h in [0, 4, 8, 12, 16, 20, 24]" :key="h" :style="{ left: (h / 24) * 100 + '%' }">{{ String(h).padStart(2, '0') }}</i></div></div>
        <div v-for="g in gantt" :key="g.r.id" class="row">
          <span class="mono">{{ g.r.id }}</span>
          <div class="track">
            <a-tooltip v-for="(b, i) in g.blocks" :key="i" :title="`${b.t}`"><i :class="b.st" :style="{ left: (b.s / 24) * 100 + '%', width: ((b.e - b.s) / 24) * 100 + '%' }" /></a-tooltip>
            <em v-if="g.r.state === 'offline'" class="off">离线</em>
          </div>
        </div>
        <div class="now" :style="{ left: `calc(64px + (100% - 64px) * ${NOW / 24})` }"><span class="mono">09:36</span></div>
      </div>
    </div>
    <div class="pp-panel bd-p">
      <div class="pp-panel-h"><h3>近 7 天告警趋势</h3><span class="bd-lg r"><i style="background:#FFB74D" />告警总数<i style="background:#FF6B6B" />确认异常</span></div>
      <div class="bd-chart"><LineChart :series="[{ name: '告警', color: '#FFB74D', data: trendAll }, { name: '异常', color: '#FF6B6B', data: trendBad }]" :labels="DAYS" :height="196" :min="0" :max="14" /></div>
    </div>
    <div class="pp-panel bd-p">
      <div class="pp-panel-h"><h3>告警类型分布</h3><span class="muted r" style="font-size:12px">近 30 天</span></div>
      <div class="bd-donut">
        <DonutChart :data="typeDonut" :size="150" :title="String(typeDonut.reduce((a, b) => a + b.value, 0))" sub="告警总数" />
        <ul><li v-for="t in typeDonut" :key="t.label"><i :style="{ background: t.color }" />{{ t.label }}<b class="mono">{{ t.value }}</b></li></ul>
      </div>
    </div>
  </div>

  <div class="bd-row b">
    <div class="pp-panel bd-p">
      <div class="pp-panel-h"><h3>最新告警</h3><a-tag color="error" style="margin-left:4px">{{ pending }} 待处理</a-tag><a class="r" style="font-size:12px" @click="emit('go', 'alarm')">告警中心 <RightOutlined /></a></div>
      <div class="bd-alarms">
        <div v-for="a in latest" :key="a.id" class="bd-alarm" @click="emit('go', 'alarm')">
          <div class="img"><CamShot :seed="a.seed" :ir="a.cam === '红外'" :box="a.type" :box-color="color(a.type)" /><span class="tag" :style="{ background: color(a.type) }">{{ a.type }}</span></div>
          <b class="ellipsis">{{ a.content }}</b>
          <small class="muted"><span class="mono">{{ a.time.slice(-5) }} · {{ a.robot }}</span><a-badge :status="a.state === '待处理' ? 'error' : 'default'" class="st" /></small>
        </div>
      </div>
    </div>
    <div class="pp-panel bd-p">
      <div class="pp-panel-h"><h3>即将执行</h3><span class="muted" style="font-size:12px;margin-left:6px">定时计划</span><a class="r" style="font-size:12px" @click="emit('go', 'task')">任务管理 <RightOutlined /></a></div>
      <ul class="bd-next">
        <li v-for="s in SCHEDULES.filter((x) => x.on)" :key="s.id"><span class="mono t">{{ s.next }}</span><div><b>{{ s.name }}</b><small class="muted">{{ s.task }} · {{ s.robot }}</small></div><a-tag>{{ s.cycle }}</a-tag></li>
      </ul>
      <div class="bd-rate"><span>近 12 轮巡检完成率</span><a-progress :percent="rate" size="small" stroke-color="#4DE8B0" /></div>
    </div>
  </div>
</template>

<style scoped>
.kd { width: 6px; height: 6px; border-radius: 50%; }
.ellipsis { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.bd-robots { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 16px; }
.bd-robot { position: relative; padding: 14px 16px; cursor: pointer; overflow: hidden; background: linear-gradient(160deg, color-mix(in srgb, var(--c) 12%, rgba(12,30,48,.9)), rgba(10,27,43,.85) 60%); border: 1px solid rgba(77,208,225,.14); border-radius: 4px; transition: border-color .2s, transform .2s; }
.bd-robot::before { content: ''; position: absolute; left: 0; top: 0; width: 100%; height: 2px; background: linear-gradient(90deg, var(--c), transparent); }
.bd-robot:hover { border-color: var(--c); transform: translateY(-2px); }
.bd-robot.offline { cursor: default; opacity: .7; } .bd-robot.offline:hover { transform: none; border-color: rgba(77,208,225,.14); }
.bd-robot .h { display: flex; align-items: center; gap: 10px; }
.bd-robot .ic { width: 50px; height: 50px; flex: none; display: grid; place-items: center; background: rgba(6,18,30,.6); border: 1px solid color-mix(in srgb, var(--c) 40%, transparent); clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%); }
.bd-robot .h b { display: block; font-size: 15px; } .bd-robot .h small { font-size: 11.5px; color: var(--muted); }
.bd-robot .st { margin-left: auto; align-self: flex-start; white-space: nowrap; flex: none; } .bd-robot .st :deep(.ant-badge-status-text) { font-size: 12px; color: var(--muted); }
.bd-robot .task { display: flex; align-items: baseline; gap: 8px; margin: 14px 0 6px; font-size: 13px; min-height: 20px; } .bd-robot .task b { margin-left: auto; color: #fff; }
.bd-robot .prog { height: 4px; background: rgba(77,208,225,.08); } .bd-robot .prog i { display: block; height: 100%; background: linear-gradient(90deg, #2F6BFF, var(--c)); }
.bd-robot .f { display: flex; gap: 12px; margin-top: 10px; font-size: 12px; color: var(--muted); } .bd-robot .f b { color: var(--text); font-weight: 500; }
.bd-robot .go { margin-left: auto; color: var(--faint); } .bd-robot:hover .go { color: var(--c); }
.bd-row { display: grid; grid-template-columns: 1.5fr 1.1fr 1fr; gap: 16px; margin-bottom: 16px; }
.bd-row.b { grid-template-columns: 2.1fr 1fr; margin-bottom: 0; }
.bd-p { display: flex; flex-direction: column; min-width: 0; } .bd-p .r { margin-left: auto; }
.bd-lg { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); } .bd-lg i { width: 10px; height: 6px; margin-left: 8px; border-radius: 1px; }
.bd-gantt { position: relative; padding: 10px 16px 14px; flex: 1; }
.bd-gantt .ax, .bd-gantt .row { display: grid; grid-template-columns: 56px 1fr; gap: 8px; align-items: center; }
.bd-gantt .ax > div { position: relative; height: 18px; } .bd-gantt .ax i { position: absolute; transform: translateX(-50%); font: 11px var(--mono); font-style: normal; color: var(--faint); }
.bd-gantt .row { height: 34px; font-size: 12px; color: var(--muted); }
.bd-gantt .track { position: relative; height: 18px; background: repeating-linear-gradient(90deg, rgba(77,208,225,.07) 0 1px, transparent 1px calc(100% / 6)); border-bottom: 1px dashed var(--line); }
.bd-gantt .track i { position: absolute; top: 2px; bottom: 2px; border-radius: 2px; cursor: pointer; }
.bd-gantt .track i.done { background: rgba(38,198,218,.7); } .bd-gantt .track i.run { background: #4DE8B0; box-shadow: 0 0 8px rgba(77,232,176,.6); } .bd-gantt .track i.plan { background: rgba(143,179,199,.25); border: 1px dashed rgba(143,179,199,.5); }
.bd-gantt .off { position: absolute; left: 8px; top: 0; font-style: normal; font-size: 11px; color: var(--faint); }
.bd-gantt .now { position: absolute; top: 26px; bottom: 12px; width: 1px; margin-left: -8px; background: #FFB74D; }
.bd-gantt .now span { position: absolute; top: -14px; left: -16px; font-size: 10px; color: #FFB74D; }
.bd-chart { padding: 10px 14px 8px; }
.bd-donut { display: flex; align-items: center; gap: 14px; padding: 14px 16px; }
.bd-donut ul { flex: 1; list-style: none; margin: 0; padding: 0; } .bd-donut li { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 12.5px; border-bottom: 1px dashed var(--line); }
.bd-donut li i { width: 8px; height: 8px; border-radius: 2px; } .bd-donut li b { margin-left: auto; }
.bd-alarms { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; padding: 14px 16px 16px; }
.bd-alarm { min-width: 0; cursor: pointer; display: flex; flex-direction: column; gap: 6px; }
.bd-alarm .img { position: relative; aspect-ratio: 16 / 10; overflow: hidden; border: 1px solid rgba(77,208,225,.18); border-radius: 3px; transition: border-color .2s; }
.bd-alarm:hover .img { border-color: var(--cyan); }
.bd-alarm .tag { position: absolute; left: 0; bottom: 0; padding: 1px 6px; font-size: 11px; color: #fff; }
.bd-alarm b { font-size: 13px; font-weight: 500; } .bd-alarm small { font-size: 11.5px; display: flex; align-items: center; gap: 6px; white-space: nowrap; } .bd-alarm .st { margin-left: auto; } .bd-alarm .st :deep(.ant-badge-status-text) { font-size: 11.5px; color: var(--muted); }
.bd-next { list-style: none; margin: 0; padding: 6px 16px 0; flex: 1; }
.bd-next li { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px dashed var(--line); font-size: 13px; }
.bd-next .t { width: 80px; flex: none; font-size: 12px; color: var(--cyan); } .bd-next li > div { flex: 1; min-width: 0; } .bd-next b { display: block; font-weight: 500; } .bd-next small { font-size: 12px; }
.bd-rate { display: flex; align-items: center; gap: 12px; padding: 10px 16px 14px; font-size: 12px; color: var(--muted); } .bd-rate :deep(.ant-progress) { flex: 1; margin: 0; } .bd-rate :deep(.ant-progress-text) { color: var(--text); }
</style>
