<script setup lang="ts">
/** 设备概览：只回答三个问题——设备总体情况、各类设备在线情况、哪些设备需要处理 */
import { computed } from 'vue'
import { RightOutlined } from '@ant-design/icons-vue'
import DeviceGlyph from '@/components/proto/DeviceGlyph.vue'
import { AREAS, STATUSES, STATUS_META, TYPES, TYPE_META, isOnline, type Device, type DeviceStatus, type DeviceType } from '@/models/device'
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

/* 状态色：仅用于概览的状态条 */
const SC: Record<DeviceStatus, string> = { working: '#26C6DA', idle: '#45E3A8', charging: '#FFC15C', fault: '#FF7A7A', offline: '#4A6380' }
const types = computed(() => TYPES.map((t) => {
  const ds = all.value.filter((d) => d.type === t)
  return { t, total: ds.length, on: ds.filter(isOnline).length, seg: STATUSES.map((s) => ({ s, n: ds.filter((d) => d.status === s).length })).filter((x) => x.n) }
}))

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

  <div class="ds-types">
    <button v-for="x in types" :key="x.t" type="button" class="pp-panel ds-type" @click="emit('list', { type: x.t })">
      <div class="h"><DeviceGlyph :type="x.t" :size="30" :color="TYPE_META[x.t].color" /><b>{{ TYPE_META[x.t].label }}</b><RightOutlined class="go" /></div>
      <div class="v"><b class="mono">{{ x.on }}</b><span class="muted">/ {{ x.total }} 在线</span></div>
      <div class="seg"><i v-for="g in x.seg" :key="g.s" :title="`${STATUS_META[g.s].label} ${g.n} 台`" :style="{ flexGrow: g.n, background: SC[g.s] }" /></div>
    </button>
  </div>
  <div class="ds-legend"><span v-for="s in STATUSES" :key="s"><i :style="{ background: SC[s] }" />{{ STATUS_META[s].label }}</span></div>

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
    <section class="pp-panel">
      <div class="pp-panel-h"><h3>区域分布</h3><span class="r muted" style="font-size:12px">在线 / 总数</span></div>
      <ul class="ds-area">
        <li v-for="x in areas" :key="x.a"><span>{{ x.a }}</span><div class="bar"><i class="t" :style="{ width: (x.total / areaMax) * 100 + '%' }" /><i class="o" :style="{ width: (x.on / areaMax) * 100 + '%' }" /></div><b class="mono">{{ x.on }}<em>/{{ x.total }}</em></b></li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.ds-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
.ds-kpi { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 16px 20px; text-align: left; font: inherit; color: var(--text); cursor: pointer; }
.ds-kpi small { font-size: 13px; color: var(--muted); }
.ds-kpi b { font-size: 30px; font-weight: 600; line-height: 1.2; color: var(--title); }
.ds-kpi span { font-size: 12px; }
.ds-kpi.bad b { color: var(--bad); }
.ds-kpi:hover, .ds-type:hover { border-color: rgba(46,211,230,.4); }
.ds-types { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.ds-type { padding: 14px 18px 16px; text-align: left; font: inherit; color: var(--text); cursor: pointer; }
.ds-type .h { display: flex; align-items: center; gap: 10px; } .ds-type .h b { font-size: 14.5px; font-weight: 600; }
.ds-type .go { margin-left: auto; font-size: 11px; color: var(--faint, #5d7690); }
.ds-type .v { margin: 12px 0 10px; display: flex; align-items: baseline; gap: 6px; }
.ds-type .v b { font-size: 24px; font-weight: 600; color: var(--title); } .ds-type .v span { font-size: 12.5px; }
.ds-type .seg { display: flex; align-items: stretch; gap: 2px; height: 6px; border-radius: 3px; overflow: hidden; } .ds-type .seg i { display: block; flex-basis: 0; min-width: 4px; height: 6px; }
.ds-legend { display: flex; justify-content: flex-end; gap: 16px; margin: 10px 2px 16px; font-size: 12px; color: var(--muted); }
.ds-legend i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 6px; }
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
.ds-area { list-style: none; margin: 0; padding: 10px 16px 14px; }
.ds-area li { display: grid; grid-template-columns: 120px 1fr 52px; align-items: center; gap: 12px; height: 42px; font-size: 13px; }
.ds-area .bar { position: relative; height: 8px; border-radius: 4px; background: rgba(46,211,230,.06); }
.ds-area .bar i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px; }
.ds-area .bar .t { background: rgba(46,211,230,.18); } .ds-area .bar .o { background: #2ED3E6; }
.ds-area b { text-align: right; font-weight: 600; } .ds-area em { font-style: normal; color: var(--muted); font-weight: 400; }
</style>
