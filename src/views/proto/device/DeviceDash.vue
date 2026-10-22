<script setup lang="ts">
/** 设备概览：只回答三个问题——设备总体情况、哪些设备需要处理、设备分布 */
import { computed } from 'vue'
import { RightOutlined } from '@ant-design/icons-vue'
import { AREAS, TYPE_META, isOnline, type Device, type DeviceStatus, type DeviceType } from '@/models/device'
import { fleet, modelOf } from './store'

const emit = defineEmits<{ open: [Device]; list: [{ type?: DeviceType; status?: DeviceStatus }] }>()

const all = computed(() => fleet.devices)
const n = (s: DeviceStatus) => all.value.filter((d) => d.status === s).length
const onlineN = computed(() => all.value.filter(isOnline).length)
const KPIS = computed(() => [
  { l: '设备总数', v: all.value.length, sub: `${fleet.models.length} 个型号`, go: {} },
  { l: '在线', v: onlineN.value, sub: `在线率 ${Math.round((onlineN.value / (all.value.length || 1)) * 100)}%`, go: {} },
  { l: '运行中', v: n('working'), sub: `空闲 ${n('idle')} · 充电 ${n('charging')}`, go: { status: 'working' as const } },
  { l: '故障', v: n('fault'), sub: `离线 ${n('offline')}`, go: { status: 'fault' as const }, bad: true },
])

/* 类型分布：类型从设备数据中动态汇总，新增类型无需改页面 */
const types = computed(() => {
  const m = new Map<DeviceType, { t: DeviceType; total: number; on: number }>()
  for (const d of all.value) {
    const x = m.get(d.type) ?? { t: d.type, total: 0, on: 0 }
    x.total++; if (isOnline(d)) x.on++; m.set(d.type, x)
  }
  return [...m.values()].sort((p, q) => q.total - p.total)
})
const typeMax = computed(() => Math.max(1, ...types.value.map((x) => x.total)))
const typeLabel = (t: DeviceType) => TYPE_META[t]?.label ?? t

/* 需关注：故障 > 低电量 > 离线 */
const todo = computed(() => [
  ...all.value.filter((d) => d.status === 'fault').map((d) => ({ d, lv: 'bad', why: '设备故障' })),
  ...all.value.filter((d) => isOnline(d) && d.status !== 'charging' && d.status !== 'fault' && d.battery < 30).map((d) => ({ d, lv: 'warn', why: `电量 ${d.battery}%` })),
  ...all.value.filter((d) => d.status === 'offline').map((d) => ({ d, lv: 'off', why: `离线 · ${d.lastSeen}` })),
])

const areas = computed(() => AREAS.map((a) => { const ds = all.value.filter((d) => d.area === a); return { a, total: ds.length, on: ds.filter(isOnline).length } }))
const areaMax = computed(() => Math.max(1, ...areas.value.map((x) => x.total)))
</script>

<template>
  <div class="pp-head"><div><h2>设备概览</h2><p>设备在线情况与待处理事项</p></div></div>

  <div class="ds-kpis">
    <button v-for="k in KPIS" :key="k.l" type="button" class="pp-panel ds-kpi" :class="{ bad: k.bad && k.v }" @click="emit('list', k.go)">
      <small>{{ k.l }}</small><b class="mono">{{ k.v }}</b><span class="muted">{{ k.sub }}</span>
    </button>
  </div>

  <div class="ds-row">
    <section class="pp-panel">
      <div class="pp-panel-h"><h3>需关注</h3><span class="ds-cnt">{{ todo.length }}</span></div>
      <ul v-if="todo.length" class="ds-todo">
        <li v-for="x in todo.slice(0, 8)" :key="x.d.id" :class="x.lv" @click="emit('open', x.d)">
          <i class="dot" /><b>{{ x.d.name }}</b><span class="muted">{{ modelOf(x.d)?.name }} · {{ x.d.area }}</span><em>{{ x.why }}</em><RightOutlined class="go" />
        </li>
      </ul>
      <a-empty v-else description="暂无需要处理的设备" style="padding: 32px 0" />
    </section>
    <div class="ds-side">
      <section class="pp-panel">
      <div class="pp-panel-h"><h3>区域分布</h3><span class="r muted" style="font-size:12px">在线 / 总数</span></div>
      <ul class="ds-area">
        <li v-for="x in areas" :key="x.a"><span>{{ x.a }}</span><div class="bar"><i class="t" :style="{ width: (x.total / areaMax) * 100 + '%' }" /><i class="o" :style="{ width: (x.on / areaMax) * 100 + '%' }" /></div><b class="mono">{{ x.on }}<em>/{{ x.total }}</em></b></li>
      </ul>
    </section>
      <section class="pp-panel">
        <div class="pp-panel-h"><h3>类型分布</h3><span class="r ds-lg"><i class="o" />在线<i class="t" />离线</span></div>
        <div class="ds-cols">
          <button v-for="x in types" :key="x.t" type="button" class="col" :title="`${typeLabel(x.t)}：在线 ${x.on} / 共 ${x.total} 台`" @click="emit('list', { type: x.t })">
            <div class="plot"><b class="mono">{{ x.on }}<em>/{{ x.total }}</em></b><div class="bar" :style="{ height: `calc((100% - 22px) * ${x.total / typeMax})` }"><i :style="{ height: (x.on / (x.total || 1)) * 100 + '%' }" /></div></div>
            <span>{{ typeLabel(x.t) }}</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.ds-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
.ds-kpi { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 16px 20px; text-align: left; font: inherit; color: var(--text); cursor: pointer; }
.ds-kpi small { font-size: 13px; color: var(--muted); }
.ds-kpi b { font-size: 30px; font-weight: 600; line-height: 1.2; color: var(--title); }
.ds-kpi span { font-size: 12px; }
.ds-kpi.bad b { color: var(--bad); }
.ds-kpi:hover { border-color: rgba(46,211,230,.4); }
.ds-row { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 16px; align-items: start; }
.ds-cnt { min-width: 22px; height: 20px; padding: 0 6px; border-radius: 10px; background: rgba(255,122,122,.15); color: var(--bad); font-size: 12px; display: grid; place-items: center; }
.ds-todo { list-style: none; margin: 0; padding: 4px 0; }
.ds-todo li { display: flex; align-items: center; gap: 12px; height: 46px; padding: 0 16px; cursor: pointer; font-size: 13px; border-bottom: 1px dashed var(--line); }
.ds-todo li:last-child { border-bottom: 0; }
.ds-todo li:hover { background: rgba(46,211,230,.05); }
.ds-todo .dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.ds-todo .bad .dot { background: var(--bad); } .ds-todo .warn .dot { background: var(--warn); } .ds-todo .off .dot { background: #6A84A0; }
.ds-todo b { font-weight: 500; width: 90px; flex: none; }
.ds-todo span { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; }
.ds-todo em { margin-left: auto; font-style: normal; font-size: 12.5px; }
.ds-todo .bad em { color: var(--bad); } .ds-todo .warn em { color: var(--warn); } .ds-todo .off em { color: var(--muted); }
.ds-todo .go { font-size: 10px; color: var(--faint, #5d7690); }
.ds-side { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.ds-lg { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }
.ds-lg i { width: 8px; height: 8px; border-radius: 2px; margin-left: 6px; } .ds-lg .o { background: #2ED3E6; } .ds-lg .t { background: rgba(46,211,230,.18); }
.ds-cols { display: flex; align-items: stretch; gap: 10px; height: 210px; padding: 14px 16px 12px; overflow-x: auto; }
.ds-cols .col { flex: 1 0 56px; max-width: 96px; min-height: 0; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px; padding: 0; border: 0; background: none; font: inherit; color: var(--text); cursor: pointer; }
.ds-cols .plot { flex: 1 1 0; min-height: 0; border-bottom: 1px solid var(--line); width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 4px; }
.ds-cols .col b { font-size: 12.5px; font-weight: 600; color: var(--title); } .ds-cols .col em { font-style: normal; font-weight: 400; color: var(--muted); }
.ds-cols .bar { position: relative; width: 28px; min-height: 4px; border-radius: 4px 4px 0 0; background: rgba(46,211,230,.18); display: flex; align-items: flex-end; overflow: hidden; transition: filter .15s; }
.ds-cols .bar i { display: block; width: 100%; background: linear-gradient(180deg, #2ED3E6, #1a9fb8); }
.ds-cols .col:hover .bar { filter: brightness(1.25); }
.ds-cols .col span { flex: none; line-height: 18px; font-size: 12.5px; color: var(--muted); white-space: nowrap; }
.ds-area { list-style: none; margin: 0; padding: 10px 16px 14px; }
.ds-area li { display: grid; grid-template-columns: 120px 1fr 52px; align-items: center; gap: 12px; height: 42px; font-size: 13px; }
.ds-area .bar { position: relative; height: 8px; border-radius: 4px; background: rgba(46,211,230,.06); }
.ds-area .bar i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px; }
.ds-area .bar .t { background: rgba(46,211,230,.18); } .ds-area .bar .o { background: #2ED3E6; }
.ds-area b { text-align: right; font-weight: 600; } .ds-area em { font-style: normal; color: var(--muted); font-weight: 400; }
</style>
