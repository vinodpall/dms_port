<script setup lang="ts">
/** 设备概览：按「设备仓库」组织——库里有什么（型号库存）、哪些要处理、最近入库了什么 */
import { computed, onMounted, ref } from 'vue'
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
const SC: Record<DeviceStatus, string> = { online: '#2ED3E6', fault: '#FF7A7A', offline: '#4A6380' }
const status = computed(() => STATUSES.map((s) => ({ s, n: all.value.filter((d) => d.status === s).length })))

/* 型号库存：类型从数据动态汇总 */
const tf = ref<DeviceType | 'all'>('all')
const typeTabs = computed(() => [...new Set(fleet.models.map((m) => m.type))].map((t) => ({ t, n: all.value.filter((d) => d.type === t).length })))
/** 柱状图：按类型分组，组内按数量降序 */
const groups = computed(() => {
  const order = [...new Set(fleet.models.map((m) => m.type))].filter((t) => tf.value === 'all' || t === tf.value)
  return order.map((t) => ({ t, items: fleet.models.filter((m) => m.type === t)
    .map((m) => ({ m, n: all.value.filter((d) => d.modelId === m.id).length })).sort((a, b) => b.n - a.n) }))
})
const yMax = computed(() => { const mx = Math.max(1, ...groups.value.flatMap((g) => g.items.map((x) => x.n))); const st = mx <= 5 ? 1 : mx <= 10 ? 2 : 5; return Math.ceil((mx + 0.5) / st) * st })
const ticks = computed(() => { const st = yMax.value <= 6 ? 1 : yMax.value <= 12 ? 2 : 5; const r = []; for (let v = 0; v <= yMax.value; v += st) r.push(v); return r })
const grown = ref(false)
onMounted(() => requestAnimationFrame(() => requestAnimationFrame(() => (grown.value = true))))

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
      <div class="ds-chart" :class="{ tight: groups.reduce((a, g) => a + g.items.length, 0) > 10 }">
        <div class="y"><span v-for="v in ticks" :key="v" class="mono" :style="{ bottom: `calc(var(--xb) + (100% - var(--xb) - var(--pt)) * ${v / yMax})` }">{{ v }}</span></div>
        <div class="plot">
          <i v-for="v in ticks" :key="v" class="grid" :class="{ base: v === 0 }" :style="{ bottom: `calc(var(--xb) + (100% - var(--xb) - var(--pt)) * ${v / yMax})` }" />
          <div v-for="g in groups" :key="g.t" class="grp" :style="{ flexGrow: g.items.length, '--c': typeColor(g.t) }">
            <div class="cols">
              <a-tooltip v-for="x in g.items" :key="x.m.id" :title="`${x.m.name} · ${x.m.vendor}：${x.n} 台`" :mouse-enter-delay="0.15">
                <button type="button" class="col" @click="emit('list', { model: x.m.id })">
                  <div class="track"><div class="bar" :style="{ height: grown ? `${(x.n / yMax) * 100}%` : '0%' }"><b class="mono">{{ x.n }}</b></div></div>
                  <span class="lb"><em>{{ x.m.name }}</em></span>
                </button>
              </a-tooltip>
            </div>
            <div class="gl"><span>{{ typeLabel(g.t) }}</span></div>
          </div>
        </div>
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
.ds-chart { --xb: 64px; --pt: 26px; flex: 1; min-height: 0; display: flex; gap: 10px; padding: 12px 20px 14px 14px; }
.ds-chart .y { position: relative; width: 22px; flex: none; }
.ds-chart .y span { position: absolute; right: 0; transform: translateY(50%); font-size: 11px; color: var(--muted); line-height: 1; }
.ds-chart .plot { position: relative; flex: 1; min-width: 0; display: flex; gap: 18px; }
.ds-chart .grid { position: absolute; left: 0; right: 0; height: 0; border-top: 1px dashed rgba(120,160,210,.13); pointer-events: none; }
.ds-chart .grid.base { border-top: 1px solid rgba(120,160,210,.28); }
.ds-chart .grp { flex-basis: 0; min-width: 0; display: flex; flex-direction: column; }
.ds-chart .cols { flex: 1; min-height: 0; display: flex; gap: 6px; }
.ds-chart .col { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 0; border: 0; background: none; font: inherit; color: inherit; cursor: pointer; }
.ds-chart .track { flex: 1; min-height: 0; display: flex; align-items: flex-end; justify-content: center; padding-top: var(--pt); }
.ds-chart .bar { position: relative; width: 100%; max-width: 34px; border-radius: 5px 5px 1px 1px; transition: height .7s cubic-bezier(.2,.8,.2,1), filter .15s, opacity .15s;
  background: linear-gradient(180deg, color-mix(in srgb, var(--c) 92%, #fff 8%) 0%, color-mix(in srgb, var(--c) 55%, transparent) 55%, color-mix(in srgb, var(--c) 16%, transparent) 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.35); }
.ds-chart .bar b { position: absolute; left: 50%; bottom: 100%; transform: translate(-50%, -5px); font-size: 12.5px; font-weight: 600; color: var(--title); }
.ds-chart .lb { height: 40px; flex: none; padding: 8px 0 0; font-size: 11.5px; line-height: 1.3; color: var(--muted); text-align: center; overflow-wrap: anywhere;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ds-chart .lb em { font-style: normal; }
.ds-chart.tight { --xb: 84px; }
.ds-chart.tight .lb { position: relative; height: 60px; display: block; overflow: visible; }
.ds-chart.tight .lb em { position: absolute; right: 50%; top: 6px; white-space: nowrap; transform-origin: right center; transform: rotate(-38deg); }
.ds-chart .plot:has(.col:hover) .col:not(:hover) .bar { opacity: .45; }
.ds-chart .col:hover .bar { filter: brightness(1.15); }
.ds-chart .col:hover .lb { color: var(--title); }
.ds-chart .gl { height: 24px; flex: none; display: flex; justify-content: center; align-items: flex-end; border-top: 1px solid color-mix(in srgb, var(--c) 45%, transparent); }
.ds-chart .gl span { font-size: 12px; color: var(--c); }
</style>
