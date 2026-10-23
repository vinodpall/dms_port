<script setup lang="ts">
/** 设备概览：按「设备仓库」组织——库里有什么（型号库存）、哪些要处理、最近入库了什么 */
import { computed, ref } from 'vue'
import { RightOutlined } from '@ant-design/icons-vue'
import DeviceGlyph from '@/components/proto/DeviceGlyph.vue'
import { STATUSES, STATUS_META, TYPE_META, isOnline, type Device, type DeviceModel, type DeviceStatus, type DeviceType } from '@/models/device'
import { fleet, modelOf } from './store'

type Go = { type?: DeviceType; status?: DeviceStatus; model?: string; area?: string }
const emit = defineEmits<{ open: [Device]; list: [Go]; models: [] }>()

const all = computed(() => fleet.devices)
const typeLabel = (t: DeviceType) => TYPE_META[t]?.label ?? t
const typeColor = (t: DeviceType) => TYPE_META[t]?.color ?? '#2ED3E6'

/* 总览条 */
const vendors = computed(() => new Set(fleet.models.map((m) => m.vendor)).size)
const typesN = computed(() => new Set(fleet.models.map((m) => m.type)).size)
const SC: Record<DeviceStatus, string> = { working: '#2ED3E6', idle: '#45E3A8', charging: '#FFC15C', fault: '#FF7A7A', offline: '#4A6380' }
const status = computed(() => STATUSES.map((s) => ({ s, n: all.value.filter((d) => d.status === s).length })))

/* 型号库存：类型从数据动态汇总 */
const tf = ref<DeviceType | 'all'>('all')
const typeTabs = computed(() => [...new Set(fleet.models.map((m) => m.type))].map((t) => ({ t, n: all.value.filter((d) => d.type === t).length })))
const stock = computed(() => fleet.models
  .filter((m) => tf.value === 'all' || m.type === tf.value)
  .map((m) => { const ds = all.value.filter((d) => d.modelId === m.id); return { m, total: ds.length, on: ds.filter(isOnline).length, bad: ds.filter((d) => d.status === 'fault').length } })
  .sort((a, b) => b.total - a.total))

/* 待处理：故障 > 离线 > 固件待升级（同型号最高版本为最新） */
const ver = (v: string) => v.replace(/^v/, '').split('.').map(Number)
const cmp = (a: string, b: string) => { const x = ver(a), y = ver(b); for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0); return 0 }
const latest = (m: DeviceModel) => all.value.filter((d) => d.modelId === m.id).reduce((a, d) => (cmp(d.firmware, a) > 0 ? d.firmware : a), 'v0.0.0')
const todo = computed(() => [
  ...all.value.filter((d) => d.status === 'fault').map((d) => ({ d, lv: 'bad', tag: '故障', why: '待维修' })),
  ...all.value.filter((d) => d.status === 'offline').map((d) => ({ d, lv: 'off', tag: '离线', why: d.lastSeen })),
  ...all.value.filter((d) => { const m = modelOf(d); return m && d.firmware !== '—' && cmp(d.firmware, latest(m)) < 0 }).map((d) => ({ d, lv: 'warn', tag: '固件', why: `${d.firmware} → ${latest(modelOf(d)!)}` })),
])

/* 最近入库 */
const recent = computed(() => [...all.value].sort((a, b) => (a.commissioned < b.commissioned ? 1 : -1)).slice(0, 6))
</script>

<template>
  <div class="pp-head"><div><h2>设备概览</h2><p>设备库存、型号构成与待处理事项</p></div></div>

  <section class="pp-panel ds-hero">
    <div class="nums">
      <button type="button" @click="emit('list', {})"><b class="mono">{{ all.length }}</b><span>设备</span></button>
      <button type="button" @click="emit('models')"><b class="mono">{{ fleet.models.length }}</b><span>型号</span></button>
      <div><b class="mono">{{ typesN }}</b><span>类型</span></div>
      <div><b class="mono">{{ vendors }}</b><span>厂商</span></div>
    </div>
    <div class="mix">
      <div class="cap">设备状态</div>
      <div class="bar"><i v-for="x in status" v-show="x.n" :key="x.s" :style="{ flexGrow: x.n, background: SC[x.s] }" /></div>
      <div class="legend">
        <button v-for="x in status" :key="x.s" type="button" :class="{ bad: x.s === 'fault' && x.n }" @click="emit('list', { status: x.s })">
          <i :style="{ background: SC[x.s] }" />{{ STATUS_META[x.s].label }}<b class="mono">{{ x.n }}</b>
        </button>
      </div>
    </div>
  </section>

  <div class="ds-main">
    <section class="pp-panel ds-stock">
      <div class="pp-panel-h"><h3>型号库存</h3>
        <div class="r ds-seg">
          <button type="button" :class="{ on: tf === 'all' }" @click="tf = 'all'">全部</button>
          <button v-for="x in typeTabs" :key="x.t" type="button" :class="{ on: tf === x.t }" @click="tf = x.t">{{ typeLabel(x.t) }}</button>
        </div>
      </div>
      <div class="ds-cards">
        <button v-for="x in stock" :key="x.m.id" type="button" class="card" @click="emit('list', { model: x.m.id })">
          <div class="ic" :style="{ '--c': typeColor(x.m.type) }"><DeviceGlyph :type="x.m.type" :size="30" :color="typeColor(x.m.type)" /></div>
          <div class="info"><b>{{ x.m.name }}</b><span class="muted">{{ x.m.vendor }} · {{ typeLabel(x.m.type) }}</span></div>
          <div class="cnt"><b class="mono">{{ x.total }}</b><span class="muted">台</span></div>
          <div class="sub muted"><span>在线 {{ x.on }}</span><span v-if="x.bad" class="bad">故障 {{ x.bad }}</span><span>{{ x.m.protocol }}</span></div>
        </button>
      </div>
    </section>

    <div class="ds-col">
      <section class="pp-panel ds-todo-p">
        <div class="pp-panel-h"><h3>待处理</h3><span class="ds-cnt">{{ todo.length }}</span></div>
        <ul v-if="todo.length" class="ds-todo">
          <li v-for="x in todo" :key="x.d.id + x.tag" :class="x.lv" @click="emit('open', x.d)">
            <em class="tag">{{ x.tag }}</em><b>{{ x.d.name }}</b><span class="muted">{{ modelOf(x.d)?.name }}</span><small class="mono">{{ x.why }}</small><RightOutlined class="go" />
          </li>
        </ul>
        <a-empty v-else description="暂无待处理设备" style="margin: auto" />
      </section>
      <section class="pp-panel ds-new">
        <div class="pp-panel-h"><h3>最近入库</h3></div>
        <ul class="ds-todo">
          <li v-for="d in recent" :key="d.id" @click="emit('open', d)">
            <DeviceGlyph :type="d.type" :size="20" :color="typeColor(d.type)" /><b>{{ d.name }}</b><span class="muted">{{ modelOf(d)?.name }} · {{ d.area }}</span><small class="mono muted">{{ d.commissioned }}</small>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* 总览条 */
.ds-hero { display: flex; align-items: center; gap: 40px; padding: 20px 28px; margin-bottom: 16px; background: linear-gradient(100deg, rgba(46,211,230,.08), rgba(46,211,230,0) 55%), var(--panel, rgba(22,40,64,.7)); }
.ds-hero .nums { display: flex; gap: 8px; padding-right: 40px; border-right: 1px solid var(--line); }
.ds-hero .nums > * { display: flex; flex-direction: column; gap: 2px; min-width: 72px; padding: 4px 10px; border: 0; border-radius: 6px; background: none; font: inherit; text-align: left; color: inherit; }
.ds-hero .nums button { cursor: pointer; } .ds-hero .nums button:hover { background: rgba(46,211,230,.06); }
.ds-hero .nums b { font-size: 30px; font-weight: 600; color: var(--title); line-height: 1.15; } .ds-hero .nums span { font-size: 12.5px; color: var(--muted); }
.ds-hero .mix { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.ds-hero .cap { font-size: 12.5px; color: var(--muted); }
.ds-hero .mix .bar { display: flex; gap: 3px; height: 8px; border-radius: 4px; overflow: hidden; }
.ds-hero .mix .bar i { display: block; height: 8px; flex-basis: 0; }
.ds-hero .legend { display: flex; flex-wrap: wrap; gap: 6px 22px; }
.ds-hero .legend button { display: inline-flex; align-items: center; gap: 7px; padding: 2px 0; border: 0; background: none; font: inherit; font-size: 13px; color: var(--muted); cursor: pointer; }
.ds-hero .legend button:hover { color: var(--text); }
.ds-hero .legend i { width: 8px; height: 8px; border-radius: 2px; }
.ds-hero .legend b { font-size: 15px; font-weight: 600; color: var(--title); } .ds-hero .legend .bad b { color: var(--bad); }

/* 主区 */
.ds-main { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 16px; height: max(560px, calc(100vh - 306px)); }
.ds-col { display: flex; flex-direction: column; gap: 16px; min-height: 0; }
.ds-stock, .ds-col > .pp-panel { display: flex; flex-direction: column; min-height: 0; }
.ds-todo-p { flex: 1; } .ds-new { flex: none; }
.ds-seg { display: flex; padding: 2px; border-radius: 6px; background: rgba(46,211,230,.06); border: 1px solid var(--line); }
.ds-seg button { padding: 2px 12px; border: 0; border-radius: 4px; background: none; font: inherit; font-size: 12.5px; color: var(--muted); cursor: pointer; }
.ds-seg button.on { background: rgba(46,211,230,.18); color: #2ED3E6; }

/* 型号卡片 */
.ds-cards { flex: 1; min-height: 0; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); align-content: start; gap: 12px; padding: 16px; }
.ds-cards .card { display: grid; grid-template-columns: 44px 1fr auto; grid-template-rows: auto auto; gap: 10px 12px; align-items: center; padding: 14px 16px; border: 1px solid var(--line); border-radius: 8px; background: rgba(10,24,42,.35); font: inherit; color: var(--text); text-align: left; cursor: pointer; transition: border-color .15s, background .15s; }
.ds-cards .card:hover { border-color: rgba(46,211,230,.45); background: rgba(46,211,230,.05); }
.ds-cards .ic { width: 44px; height: 44px; border-radius: 10px; display: grid; place-items: center; background: color-mix(in srgb, var(--c) 12%, transparent); }
.ds-cards .info { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ds-cards .info b { font-size: 14px; font-weight: 600; color: var(--title); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ds-cards .info span { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ds-cards .cnt { display: flex; align-items: baseline; gap: 3px; } .ds-cards .cnt b { font-size: 24px; font-weight: 600; color: var(--title); } .ds-cards .cnt span { font-size: 12px; }
.ds-cards .sub { grid-column: 1 / -1; display: flex; gap: 14px; padding-top: 10px; border-top: 1px dashed var(--line); font-size: 12px; }
.ds-cards .sub span:last-child { margin-left: auto; } .ds-cards .sub .bad { color: var(--bad); }

/* 列表 */
.ds-cnt { min-width: 22px; height: 20px; padding: 0 6px; margin-left: 8px; border-radius: 10px; background: rgba(255,122,122,.15); color: var(--bad); font-size: 12px; display: grid; place-items: center; }
.ds-todo { list-style: none; margin: 0; padding: 4px 0; flex: 1; min-height: 0; overflow-y: auto; }
.ds-todo li { display: flex; align-items: center; gap: 10px; height: 42px; padding: 0 18px; cursor: pointer; font-size: 13px; }
.ds-todo li + li { border-top: 1px dashed var(--line); }
.ds-todo li:hover { background: rgba(46,211,230,.05); }
.ds-todo .tag { flex: none; padding: 0 6px; line-height: 18px; border-radius: 3px; font-style: normal; font-size: 11.5px; background: rgba(106,132,160,.18); color: var(--muted); }
.ds-todo .bad .tag { background: rgba(255,122,122,.14); color: var(--bad); } .ds-todo .warn .tag { background: rgba(255,193,92,.14); color: var(--warn); }
.ds-todo b { font-weight: 500; width: 78px; flex: none; }
.ds-todo span { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; }
.ds-todo small { margin-left: auto; flex: none; font-size: 12px; color: var(--muted); }
.ds-todo .go { font-size: 10px; color: var(--faint, #5d7690); }
</style>
