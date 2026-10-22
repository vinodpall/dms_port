<script setup lang="ts">
/** 设备概览：只展示设备自身的通用信息——状态构成、需处理设备、电量、分布 */
import { computed, ref } from 'vue'
import { RightOutlined } from '@ant-design/icons-vue'
import { AREAS, OWNERS, STATUSES, STATUS_META, TYPE_META, isOnline, type Device, type DeviceStatus, type DeviceType } from '@/models/device'
import { fleet, modelOf } from './store'

type Go = { type?: DeviceType; status?: DeviceStatus; model?: string; area?: string }
const emit = defineEmits<{ open: [Device]; list: [Go] }>()

const all = computed(() => fleet.devices)
const total = computed(() => all.value.length)
const onlineN = computed(() => all.value.filter(isOnline).length)
const rate = computed(() => Math.round((onlineN.value / (total.value || 1)) * 100))

/* 状态构成 */
const SC: Record<DeviceStatus, string> = { working: '#2ED3E6', idle: '#45E3A8', charging: '#FFC15C', fault: '#FF7A7A', offline: '#4A6380' }
const status = computed(() => STATUSES.map((s) => ({ s, n: all.value.filter((d) => d.status === s).length })))

/* 需处理：故障 > 低电量 > 离线 */
const todo = computed(() => [
  ...all.value.filter((d) => d.status === 'fault').map((d) => ({ d, lv: 'bad', why: '设备故障' })),
  ...all.value.filter((d) => isOnline(d) && d.status !== 'charging' && d.status !== 'fault' && d.battery < 30).map((d) => ({ d, lv: 'warn', why: `电量 ${d.battery}%` })),
  ...all.value.filter((d) => d.status === 'offline').map((d) => ({ d, lv: 'off', why: `离线 · ${d.lastSeen}` })),
])

/* 电量分布（在线设备） */
const BUCKETS = [
  { l: '< 20%', min: 0, max: 20, c: '#FF7A7A' }, { l: '20–40%', min: 20, max: 40, c: '#FFC15C' },
  { l: '40–60%', min: 40, max: 60, c: '#9BD96A' }, { l: '60–80%', min: 60, max: 80, c: '#45E3A8' }, { l: '≥ 80%', min: 80, max: 101, c: '#2ED3E6' },
]
const battery = computed(() => {
  const on = all.value.filter(isOnline)
  return BUCKETS.map((b) => ({ ...b, n: on.filter((d) => d.battery >= b.min && d.battery < b.max).length }))
})
const batMax = computed(() => Math.max(1, ...battery.value.map((b) => b.n)))
const avgBat = computed(() => { const on = all.value.filter(isOnline); return on.length ? Math.round(on.reduce((a, d) => a + d.battery, 0) / on.length) : 0 })

/* 设备分布：维度切换，分组从数据动态汇总 */
const DIMS = [{ k: 'type', l: '类型' }, { k: 'model', l: '型号' }, { k: 'area', l: '区域' }, { k: 'owner', l: '负责人' }] as const
type Dim = (typeof DIMS)[number]['k']
const dim = ref<Dim>('type')
const groups = computed(() => {
  const key = (d: Device) => (dim.value === 'type' ? d.type : dim.value === 'model' ? d.modelId : dim.value === 'area' ? d.area : d.owner)
  const label = (k: string) => (dim.value === 'type' ? TYPE_META[k as DeviceType]?.label ?? k : dim.value === 'model' ? fleet.models.find((m) => m.id === k)?.name ?? k : k)
  const m = new Map<string, { k: string; l: string; total: number; on: number }>()
  for (const d of all.value) { const k = key(d); const x = m.get(k) ?? { k, l: label(k), total: 0, on: 0 }; x.total++; if (isOnline(d)) x.on++; m.set(k, x) }
  const order = dim.value === 'area' ? AREAS : dim.value === 'owner' ? OWNERS : null
  const out = [...m.values()]
  return order ? out.sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k)) : out.sort((a, b) => b.total - a.total)
})
const gMax = computed(() => Math.max(1, ...groups.value.map((g) => g.total)))
const goGroup = (k: string) => {
  if (dim.value === 'type') emit('list', { type: k as DeviceType })
  else if (dim.value === 'model') emit('list', { model: k })
  else if (dim.value === 'area') emit('list', { area: k })
}

/* 固件版本：同型号以最高版本为最新，低于最新的视为待升级 */
const ver = (v: string) => v.replace(/^v/, '').split('.').map(Number)
const cmp = (a: string, b: string) => { const x = ver(a), y = ver(b); for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0); return 0 }
const fw = computed(() => {
  const rows = fleet.models.map((m) => {
    const ds = all.value.filter((d) => d.modelId === m.id)
    const latest = ds.reduce((a, d) => (cmp(d.firmware, a) > 0 ? d.firmware : a), 'v0.0.0')
    return { m, latest, total: ds.length, old: ds.filter((d) => cmp(d.firmware, latest) < 0).length }
  }).filter((r) => r.total)
  const old = rows.reduce((a, r) => a + r.old, 0)
  return { old, ok: total.value - old, rows: rows.filter((r) => r.old).sort((a, b) => b.old - a.old) }
})
</script>

<template>
  <div class="pp-head"><div><h2>设备概览</h2><p>设备在线情况与待处理事项</p></div></div>

  <!-- 总览条：一块面板讲清规模、在线率与状态构成 -->
  <section class="pp-panel ds-hero">
    <div class="ring" :style="{ '--p': rate }"><div><b class="mono">{{ rate }}<small>%</small></b><span>在线率</span></div></div>
    <div class="nums">
      <div><b class="mono">{{ total }}</b><span>设备总数</span></div>
      <div><b class="mono">{{ onlineN }}</b><span>在线</span></div>
      <div><b class="mono">{{ fleet.models.length }}</b><span>型号</span></div>
    </div>
    <div class="mix">
      <div class="bar"><i v-for="x in status" v-show="x.n" :key="x.s" :style="{ flexGrow: x.n, background: SC[x.s] }" /></div>
      <div class="legend">
        <button v-for="x in status" :key="x.s" type="button" :class="{ bad: x.s === 'fault' && x.n }" @click="emit('list', { status: x.s })">
          <i :style="{ background: SC[x.s] }" />{{ STATUS_META[x.s].label }}<b class="mono">{{ x.n }}</b>
        </button>
      </div>
    </div>
  </section>

  <div class="ds-main">
    <div class="ds-col">
      <section class="pp-panel ds-todo-p">
        <div class="pp-panel-h"><h3>需处理</h3><span class="ds-cnt">{{ todo.length }}</span><span class="r muted" style="font-size:12px">故障 · 低电量 · 离线</span></div>
        <ul v-if="todo.length" class="ds-todo">
          <li v-for="x in todo" :key="x.d.id" :class="x.lv" @click="emit('open', x.d)">
            <i class="dot" /><b>{{ x.d.name }}</b><span class="muted">{{ modelOf(x.d)?.name }} · {{ x.d.area }}</span><em>{{ x.why }}</em><RightOutlined class="go" />
          </li>
        </ul>
        <a-empty v-else description="暂无需要处理的设备" style="margin: auto" />
      </section>
      <section class="pp-panel">
        <div class="pp-panel-h"><h3>电量分布</h3><span class="r muted" style="font-size:12px">在线设备平均 <b class="mono" style="color: var(--title)">{{ avgBat }}%</b></span></div>
        <div class="ds-bat">
          <div v-for="b in battery" :key="b.l" class="c">
            <b class="mono">{{ b.n }}</b>
            <div class="track"><i :style="{ height: (b.n / batMax) * 100 + '%', background: b.c }" /></div>
            <span>{{ b.l }}</span>
          </div>
        </div>
      </section>
    </div>

    <div class="ds-col">
      <section class="pp-panel ds-dist">
        <div class="pp-panel-h"><h3>设备分布</h3>
          <div class="r ds-seg"><button v-for="x in DIMS" :key="x.k" type="button" :class="{ on: dim === x.k }" @click="dim = x.k">{{ x.l }}</button></div>
        </div>
        <ul class="ds-g">
          <li v-for="g in groups" :key="g.k" :class="{ link: dim !== 'owner' }" @click="goGroup(g.k)">
            <div class="h"><span>{{ g.l }}</span><b class="mono">{{ g.on }}<em> / {{ g.total }}</em></b></div>
            <div class="bar"><i class="t" :style="{ width: (g.total / gMax) * 100 + '%' }" /><i class="o" :style="{ width: (g.on / gMax) * 100 + '%' }" /></div>
          </li>
        </ul>
        <div class="ds-lg"><i class="o" />在线<i class="t" />离线</div>
      </section>
      <section class="pp-panel ds-fw">
        <div class="pp-panel-h"><h3>固件版本</h3><span class="r muted" style="font-size:12px">以同型号最高版本为最新</span></div>
        <div class="sum">
          <div><b class="mono">{{ fw.ok }}</b><span>已是最新</span></div>
          <div class="warn"><b class="mono">{{ fw.old }}</b><span>待升级</span></div>
          <div class="bar"><i :style="{ flexGrow: fw.ok }" class="o" /><i :style="{ flexGrow: fw.old }" class="w" /></div>
        </div>
        <ul class="ds-fwl">
          <li v-for="r in fw.rows" :key="r.m.id" @click="emit('list', { model: r.m.id })">
            <span>{{ r.m.name }}</span><em class="mono muted">最新 {{ r.latest }}</em><b>{{ r.old }} 台待升级</b><RightOutlined class="go" />
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* 总览条 */
.ds-hero { display: flex; align-items: center; gap: 36px; padding: 20px 28px; margin-bottom: 16px; background: linear-gradient(100deg, rgba(46,211,230,.08), rgba(46,211,230,0) 55%), var(--panel, rgba(22,40,64,.7)); }
.ds-hero .ring { --p: 0; width: 92px; height: 92px; flex: none; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(#2ED3E6 calc(var(--p) * 1%), rgba(46,211,230,.12) 0); }
.ds-hero .ring > div { width: 76px; height: 76px; border-radius: 50%; background: #13253d; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ds-hero .ring b { font-size: 22px; font-weight: 600; color: var(--title); line-height: 1.1; } .ds-hero .ring small { font-size: 12px; margin-left: 1px; }
.ds-hero .ring span { font-size: 11.5px; color: var(--muted); }
.ds-hero .nums { display: flex; gap: 36px; padding-right: 36px; border-right: 1px solid var(--line); }
.ds-hero .nums div { display: flex; flex-direction: column; gap: 2px; }
.ds-hero .nums b { font-size: 28px; font-weight: 600; color: var(--title); line-height: 1.15; } .ds-hero .nums span { font-size: 12.5px; color: var(--muted); }
.ds-hero .mix { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
.ds-hero .mix .bar { display: flex; gap: 3px; height: 10px; border-radius: 5px; overflow: hidden; }
.ds-hero .mix .bar i { display: block; height: 10px; flex-basis: 0; }
.ds-hero .legend { display: flex; flex-wrap: wrap; gap: 6px 22px; }
.ds-hero .legend button { display: inline-flex; align-items: center; gap: 7px; padding: 2px 0; border: 0; background: none; font: inherit; font-size: 13px; color: var(--muted); cursor: pointer; }
.ds-hero .legend button:hover { color: var(--text); }
.ds-hero .legend i { width: 8px; height: 8px; border-radius: 2px; }
.ds-hero .legend b { font-size: 15px; font-weight: 600; color: var(--title); } .ds-hero .legend .bad b { color: var(--bad); }

/* 主区：左列两块、右列一块，高度各自填满 */
.ds-main { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 16px; height: max(560px, calc(100vh - 318px)); }
.ds-col { display: flex; flex-direction: column; gap: 16px; min-height: 0; }
.ds-col > .pp-panel { display: flex; flex-direction: column; min-height: 0; }
.ds-todo-p, .ds-fw { flex: 1; }
.ds-dist { flex: 0 0 auto; height: 50%; }
.ds-cnt { min-width: 22px; height: 20px; padding: 0 6px; margin-left: 8px; border-radius: 10px; background: rgba(255,122,122,.15); color: var(--bad); font-size: 12px; display: grid; place-items: center; }
.ds-todo { list-style: none; margin: 0; padding: 4px 0; flex: 1; min-height: 0; overflow-y: auto; }
.ds-todo li { display: flex; align-items: center; gap: 12px; height: 44px; padding: 0 18px; cursor: pointer; font-size: 13px; }
.ds-todo li + li { border-top: 1px dashed var(--line); }
.ds-todo li:hover { background: rgba(46,211,230,.05); }
.ds-todo .dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.ds-todo .bad .dot { background: var(--bad); box-shadow: 0 0 0 3px rgba(255,122,122,.15); } .ds-todo .warn .dot { background: var(--warn); } .ds-todo .off .dot { background: #6A84A0; }
.ds-todo b { font-weight: 500; width: 90px; flex: none; }
.ds-todo span { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; }
.ds-todo em { margin-left: auto; font-style: normal; font-size: 12.5px; }
.ds-todo .bad em { color: var(--bad); } .ds-todo .warn em { color: var(--warn); } .ds-todo .off em { color: var(--muted); }
.ds-todo .go { font-size: 10px; color: var(--faint, #5d7690); }

/* 电量分布 */
.ds-bat { display: flex; gap: 18px; height: 150px; padding: 12px 24px 14px; }
.ds-bat .c { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.ds-bat .c b { font-size: 13px; font-weight: 600; color: var(--title); }
.ds-bat .track { flex: 1; width: 100%; max-width: 64px; display: flex; align-items: flex-end; border-radius: 4px; background: rgba(46,211,230,.05); overflow: hidden; }
.ds-bat .track i { display: block; width: 100%; min-height: 2px; border-radius: 4px 4px 0 0; opacity: .85; }
.ds-bat .c span { font-size: 12px; color: var(--muted); white-space: nowrap; }

/* 固件版本 */
.ds-fw .sum { display: flex; align-items: center; gap: 28px; padding: 14px 20px 10px; }
.ds-fw .sum > div:not(.bar) { display: flex; align-items: baseline; gap: 6px; }
.ds-fw .sum b { font-size: 22px; font-weight: 600; color: var(--title); } .ds-fw .sum .warn b { color: var(--warn); }
.ds-fw .sum span { font-size: 12.5px; color: var(--muted); }
.ds-fw .sum .bar { flex: 1; display: flex; gap: 3px; height: 6px; border-radius: 3px; overflow: hidden; }
.ds-fw .sum .bar i { display: block; height: 6px; flex-basis: 0; } .ds-fw .sum .bar .o { background: #45E3A8; } .ds-fw .sum .bar .w { background: var(--warn); }
.ds-fwl { list-style: none; margin: 0; padding: 0 0 6px; flex: 1; min-height: 0; overflow-y: auto; }
.ds-fwl li { display: flex; align-items: center; gap: 12px; height: 38px; padding: 0 20px; font-size: 13px; cursor: pointer; }
.ds-fwl li:hover { background: rgba(46,211,230,.05); }
.ds-fwl span { flex: 0 1 auto; min-width: 0; } .ds-fwl em { margin-left: auto; font-style: normal; font-size: 12px; } .ds-fwl b { flex: none; font-weight: 500; font-size: 12.5px; color: var(--warn); width: 84px; text-align: right; }
.ds-fwl .go { font-size: 10px; color: var(--faint, #5d7690); }

/* 设备分布 */
.ds-seg { display: flex; padding: 2px; border-radius: 6px; background: rgba(46,211,230,.06); border: 1px solid var(--line); }
.ds-seg button { padding: 2px 12px; border: 0; border-radius: 4px; background: none; font: inherit; font-size: 12.5px; color: var(--muted); cursor: pointer; }
.ds-seg button.on { background: rgba(46,211,230,.18); color: #2ED3E6; }
.ds-g { list-style: none; margin: 0; padding: 8px 20px; flex: 1; min-height: 0; overflow-y: auto; }
.ds-g li { padding: 8px 0; }
.ds-g li.link { cursor: pointer; } .ds-g li.link:hover .h span { color: #2ED3E6; }
.ds-g .h { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 7px; font-size: 13px; }
.ds-g .h b { font-weight: 600; font-size: 13px; color: var(--title); } .ds-g .h em { font-style: normal; font-weight: 400; color: var(--muted); }
.ds-g .bar { position: relative; height: 6px; border-radius: 3px; }
.ds-g .bar i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 3px; transition: width .3s; }
.ds-g .bar .t { background: rgba(46,211,230,.16); } .ds-g .bar .o { background: linear-gradient(90deg, #1a9fb8, #2ED3E6); }
.ds-lg { display: flex; align-items: center; justify-content: flex-end; gap: 6px; padding: 8px 20px 12px; font-size: 12px; color: var(--muted); border-top: 1px dashed var(--line); }
.ds-lg i { width: 8px; height: 8px; border-radius: 2px; margin-left: 10px; } .ds-lg .o { background: #2ED3E6; } .ds-lg .t { background: rgba(46,211,230,.22); }
</style>
