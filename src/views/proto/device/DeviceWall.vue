<script setup lang="ts">
/**
 * 监控大屏：多机器人云台 / 相机画面同屏查看（最多 32 路）
 * - 自适应：按路数与容器尺寸计算最优行列，保持 16:9，1 路占满、2 路左右分屏……
 * - 固定分屏：1 / 4 / 9 / 16 / 25 / 32，已选超出时自动扩展，所有画面同屏不分页
 * - 主次画面：主画面占左侧一半，其余在右侧自适应排布；双击任一画面单路放大
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined, ExpandOutlined, CompressOutlined, CloseOutlined, StarOutlined, StarFilled } from '@ant-design/icons-vue'
import CamShot from '../biz/CamShot.vue'
import { fleet, modelOf } from './store'
import { TYPE_META } from '@/models/device'

const MAX = 32
interface Ch { key: string; dev: string; name: string; cam: string; status: string; area: string; seed: number; ir: boolean }
const channels = computed<Ch[]>(() => fleet.devices.flatMap((d, di) => (modelOf(d)?.cameras ?? ['前视']).map((c, ci) => ({ key: `${d.id}/${ci}`, dev: d.id, name: d.name, cam: c, status: d.status, area: d.area, seed: di * 7 + ci * 3 + 1, ir: c === '红外' }))))

/* ---------- 左侧通道树 ---------- */
const kw = ref('')
const onlyOn = ref(false)
const open = ref<Record<string, boolean>>({})
const devs = computed(() => fleet.devices.filter((d) => (!onlyOn.value || d.status === 'online') && (!kw.value || `${d.name}${d.id}${d.area}`.includes(kw.value.trim()))))
const chOf = (id: string) => channels.value.filter((c) => c.dev === id)
const sel = ref<string[]>([])
// 默认：在线设备的云台（无云台取第一路），9 路
sel.value = fleet.devices.filter((d) => d.status === 'online').slice(0, 9).map((d) => { const cs = modelOf(d)?.cameras ?? []; const i = Math.max(0, cs.indexOf('云台')); return `${d.id}/${i}` })
const toggle = (k: string) => {
  const i = sel.value.indexOf(k)
  if (i >= 0) sel.value.splice(i, 1)
  else { if (sel.value.length >= MAX) return message.warning(`最多同时显示 ${MAX} 路画面`); sel.value.push(k) }
}
const devState = (id: string) => { const n = chOf(id).filter((c) => sel.value.includes(c.key)).length; return n === 0 ? 0 : n === chOf(id).length ? 2 : 1 }
const toggleDev = (id: string) => {
  const cs = chOf(id).map((c) => c.key)
  if (devState(id) === 2) sel.value = sel.value.filter((k) => !cs.includes(k))
  else { const add = cs.filter((k) => !sel.value.includes(k)); if (sel.value.length + add.length > MAX) return message.warning(`最多同时显示 ${MAX} 路画面`); sel.value.push(...add) }
}
const STATUS: Record<string, { t: string; c: string }> = { online: { t: '在线', c: '#45E3A8' }, offline: { t: '离线', c: '#8EA6BE' }, fault: { t: '故障', c: '#FF7A7A' } }

/* ---------- 布局 ---------- */
const layout = ref<'auto' | 1 | 4 | 9 | 16 | 25 | 32>('auto')
const LAYOUTS = [{ v: 'auto', t: '自适应' }, { v: 1, t: '1' }, { v: 4, t: '4' }, { v: 9, t: '9' }, { v: 16, t: '16' }, { v: 25, t: '25' }, { v: 32, t: '32' }] as const
const featured = ref(false)
const mainKey = ref('')
const maxKey = ref('') // 双击单路放大
/* 所有已选画面同屏显示，不分页；主次画面时主画面置首 */
const shown = computed(() => {
  let list = [...sel.value]
  if (featured.value && mainKey.value && list.includes(mainKey.value)) list = [mainKey.value, ...list.filter((k) => k !== mainKey.value)]
  return list.map((k) => channels.value.find((c) => c.key === k)!).filter(Boolean)
})
watch(sel, (v) => { if (!v.includes(mainKey.value)) mainKey.value = v[0] ?? ''; if (!v.includes(maxKey.value)) maxKey.value = '' }, { deep: true, immediate: true })

/* 容器尺寸 → 行列（按 16:9 选择最优行列，画面保持原比例、上下留黑边） */
const wall = ref<HTMLDivElement>()
const size = ref({ w: 1200, h: 680 })
let ro: ResizeObserver | null = null
onMounted(() => { ro = new ResizeObserver(([e]) => { size.value = { w: e.contentRect.width, h: e.contentRect.height } }); if (wall.value) ro.observe(wall.value) })
onBeforeUnmount(() => ro?.disconnect())
const GAP = 6
const FIXED: Record<number, [number, number]> = { 1: [1, 1], 4: [2, 2], 9: [3, 3], 16: [4, 4], 25: [5, 5], 32: [8, 4] }
const best = (n: number, W: number, H: number) => {
  let b = { c: 1, r: 1, w: 0 }
  for (let c = 1; c <= n; c++) { const r = Math.ceil(n / c); const w = Math.min((W - GAP * (c - 1)) / c, ((H - GAP * (r - 1)) / r) * 16 / 9); if (w > b.w + 0.5) b = { c, r, w } }
  return b
}
const isFeat = computed(() => featured.value && !maxKey.value && shown.value.length > 1)
/* 主次画面：主画面在左侧按 16:9 撑满高度（不超过宽度的 60%、不少于 45%），其余在右侧区域自适应排布 */
const mainW = computed(() => Math.round(Math.max(size.value.w * 0.45, Math.min(size.value.h * 16 / 9, size.value.w * 0.6))))
const subW = computed(() => size.value.w - mainW.value - GAP)
const grid = computed(() => {
  const n = maxKey.value ? 1 : Math.max(1, shown.value.length)
  if (isFeat.value) return best(n - 1, subW.value, size.value.h)
  if (layout.value !== 'auto' && !maxKey.value) {
    const L = FIXED[layout.value]
    if (n <= L[0] * L[1]) return { c: L[0], r: L[1], w: 0 }
    const k = [4, 9, 16, 25, 32].find((x) => x >= n) ?? 32 // 超出所选分屏时自动扩展，保证同屏
    return { c: FIXED[k][0], r: FIXED[k][1], w: 0 }
  }
  return best(n, size.value.w, size.value.h)
})
const gridStyle = computed(() => ({ gridTemplateColumns: `repeat(${grid.value.c}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${grid.value.r}, minmax(0, 1fr))`, gap: `${GAP}px` }))
const cells = computed(() => (maxKey.value ? channels.value.filter((c) => c.key === maxKey.value) : shown.value))
const subs = computed(() => (isFeat.value ? cells.value.slice(1) : cells.value))
const empties = computed(() => (maxKey.value ? 0 : Math.max(0, grid.value.c * grid.value.r - subs.value.length)))

const active = ref('')
const setMain = (k: string) => { mainKey.value = k; featured.value = true; maxKey.value = '' }
const close = (k: string) => { sel.value = sel.value.filter((x) => x !== k) }
const dbl = (k: string) => { maxKey.value = maxKey.value === k ? '' : k }

/* 全屏 */
const root = ref<HTMLDivElement>()
const isFs = ref(false)
const fs = () => { document.fullscreenElement ? document.exitFullscreen() : root.value?.requestFullscreen?.() }
const onFs = () => { isFs.value = !!document.fullscreenElement }
document.addEventListener('fullscreenchange', onFs); onBeforeUnmount(() => document.removeEventListener('fullscreenchange', onFs))
</script>

<template>
  <div class="dw">
    <!-- 通道列表 -->
    <div class="pp-panel dw-side">
      <div class="pp-panel-h"><h3>视频通道</h3><span class="muted dw-cnt"><b>{{ sel.length }}</b> / {{ MAX }}</span></div>
      <div class="dw-search">
        <a-input v-model:value="kw" size="small" placeholder="搜索设备 / 区域" allow-clear><template #prefix><SearchOutlined /></template></a-input>
        <label class="dw-on"><a-switch v-model:checked="onlyOn" size="small" />仅在线</label>
      </div>
      <div class="dw-tree">
        <div v-for="d in devs" :key="d.id" class="dw-dev">
          <div class="dw-dh" @click="open[d.id] = !open[d.id]">
            <span class="ar" :class="{ o: open[d.id] }">▸</span>
            <a-checkbox :checked="devState(d.id) === 2" :indeterminate="devState(d.id) === 1" @click.stop @change="toggleDev(d.id)" />
            <i class="st" :style="{ background: STATUS[d.status].c }" />
            <span class="nm"><b>{{ d.name }}</b><small>{{ TYPE_META[d.type]?.label ?? '' }} · {{ d.area }}</small></span>
            <em>{{ chOf(d.id).length }}</em>
          </div>
          <div v-if="open[d.id]" class="dw-chs">
            <label v-for="c in chOf(d.id)" :key="c.key" class="dw-ch" :class="{ on: sel.includes(c.key) }"><a-checkbox :checked="sel.includes(c.key)" @change="toggle(c.key)" />{{ c.cam }}</label>
          </div>
        </div>
      </div>
      <div class="dw-foot"><a-button size="small" block :disabled="!sel.length" @click="sel = []">清空画面</a-button></div>
    </div>

    <!-- 画面墙 -->
    <div ref="root" class="pp-panel dw-main" :class="{ fs: isFs }">
      <div class="dw-bar">
        <span class="lb">分屏</span>
        <a-radio-group v-model:value="layout" size="small" @change="maxKey = ''"><a-radio-button v-for="l in LAYOUTS" :key="l.v" :value="l.v">{{ l.t }}</a-radio-button></a-radio-group>
        <label class="sw"><a-switch v-model:checked="featured" size="small" @change="maxKey = ''" />主次画面</label>
        <span class="sp" />
        <a-tooltip :title="isFs ? '退出全屏' : '全屏'"><button type="button" class="dw-fs" @click="fs">
          <svg v-if="!isFs" viewBox="0 0 16 16"><path d="M1.5 5.5v-4h4M10.5 1.5h4v4M14.5 10.5v4h-4M5.5 14.5h-4v-4" /></svg>
          <svg v-else viewBox="0 0 16 16"><path d="M5.5 1.5v4h-4M14.5 5.5h-4v-4M10.5 14.5v-4h4M1.5 10.5h4v4" /></svg>
        </button></a-tooltip>
      </div>
      <div ref="wall" class="dw-wall">
        <div v-if="!sel.length" class="dw-none">在左侧勾选设备通道，最多同时显示 {{ MAX }} 路画面</div>
        <div v-else class="dw-body" :class="{ feat: isFeat }" :style="isFeat ? { gridTemplateColumns: `${mainW}px minmax(0, 1fr)` } : undefined">
          <div v-if="isFeat" class="dw-mainw">
            <div v-for="(c, i) in cells.slice(0, 1)" :key="c.key" class="dw-cell" :class="{ act: active === c.key, main: true }" @click="active = c.key" @dblclick="dbl(c.key)">
            <CamShot v-if="c.status === 'online'" :seed="c.seed" :ir="c.ir" fit />
            <div v-else class="dw-off">{{ c.status === 'fault' ? '设备故障' : '设备离线' }}<small>无视频信号</small></div>
            <div class="dw-hud"><span><i :style="{ background: STATUS[c.status].c }" />{{ c.name }} · {{ c.cam }}</span><em class="mono">{{ String(i + 1).padStart(2, '0') }}</em></div>
            <div class="dw-act" @click.stop @dblclick.stop>
              <a-tooltip title="设为主画面"><button type="button" @click="setMain(c.key)"><StarFilled v-if="featured && mainKey === c.key" /><StarOutlined v-else /></button></a-tooltip>
              <a-tooltip :title="maxKey ? '还原' : '单路放大'"><button type="button" @click="dbl(c.key)"><CompressOutlined v-if="maxKey" /><ExpandOutlined v-else /></button></a-tooltip>
              <a-tooltip title="关闭画面"><button type="button" @click="close(c.key)"><CloseOutlined /></button></a-tooltip>
            </div>
          </div>
          </div>
          <div class="dw-grid" :style="gridStyle">
            <div v-for="(c, i) in subs" :key="c.key" class="dw-cell" :class="{ act: active === c.key, main: false }" @click="active = c.key" @dblclick="dbl(c.key)">
            <CamShot v-if="c.status === 'online'" :seed="c.seed" :ir="c.ir" fit />
            <div v-else class="dw-off">{{ c.status === 'fault' ? '设备故障' : '设备离线' }}<small>无视频信号</small></div>
            <div class="dw-hud"><span><i :style="{ background: STATUS[c.status].c }" />{{ c.name }} · {{ c.cam }}</span><em class="mono">{{ String(i + (isFeat ? 2 : 1)).padStart(2, '0') }}</em></div>
            <div class="dw-act" @click.stop @dblclick.stop>
              <a-tooltip title="设为主画面"><button type="button" @click="setMain(c.key)"><StarFilled v-if="featured && mainKey === c.key" /><StarOutlined v-else /></button></a-tooltip>
              <a-tooltip :title="maxKey ? '还原' : '单路放大'"><button type="button" @click="dbl(c.key)"><CompressOutlined v-if="maxKey" /><ExpandOutlined v-else /></button></a-tooltip>
              <a-tooltip title="关闭画面"><button type="button" @click="close(c.key)"><CloseOutlined /></button></a-tooltip>
            </div>
          </div>
            <div v-for="n in empties" :key="'e' + n" class="dw-cell empty">无信号</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dw { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 14px; height: calc(100vh - 108px); min-height: 600px; }
.dw-side { display: flex; flex-direction: column; min-height: 0; }
.dw-cnt { margin-left: auto; font: 12px var(--mono); } .dw-cnt b { color: var(--cyan); font-weight: 500; }
.dw-search { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 1px solid rgba(46,211,230,.1); } .dw-search .ant-input-affix-wrapper { flex: 1; }
.dw-on { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); white-space: nowrap; }
.dw-tree { flex: 1; min-height: 0; overflow: auto; padding: 6px 8px; }
.dw-dh { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 8px; cursor: pointer; } .dw-dh:hover { background: rgba(46,211,230,.06); }
.dw-dh .ar { width: 10px; font-size: 10px; color: var(--faint); transition: transform .15s; } .dw-dh .ar.o { transform: rotate(90deg); }
.dw-dh .st { width: 7px; height: 7px; flex: none; border-radius: 50%; }
.dw-dh .nm { flex: 1; min-width: 0; display: flex; flex-direction: column; } .dw-dh .nm b { font-size: 13px; font-weight: 500; } .dw-dh .nm small { font-size: 11px; color: var(--faint); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.dw-dh em { font-style: normal; font: 11px/18px var(--mono); min-width: 20px; text-align: center; color: var(--muted); padding: 0 6px; border-radius: 8px; background: rgba(46,211,230,.08); }
.dw-chs { display: flex; flex-direction: column; gap: 2px; padding: 2px 0 6px 44px; }
.dw-ch { display: flex; align-items: center; gap: 8px; padding: 4px 8px; font-size: 12.5px; color: var(--muted); border-radius: 6px; cursor: pointer; } .dw-ch:hover { background: rgba(46,211,230,.06); } .dw-ch.on { color: #fff; }
.dw-foot { padding: 10px 12px; border-top: 1px solid rgba(46,211,230,.1); }
.dw-main { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.dw-main.fs { border-radius: 0; background: #07111F; }
.dw-bar { display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 0 14px; border-bottom: 1px solid rgba(46,211,230,.1); }
.dw-bar .lb { font-size: 12.5px; color: var(--muted); } .dw-bar .sp { flex: 1; }
.dw-bar .sw { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--muted); }
.dw-bar .pg { display: flex; align-items: center; gap: 2px; } .dw-bar .pg b { font-size: 12px; min-width: 40px; text-align: center; }
.dw-wall { position: relative; flex: 1; min-height: 0; margin: 10px; padding: 6px; box-sizing: border-box; background: #081220; border-radius: 10px; overflow: hidden; }
.dw-none { height: 100%; display: grid; place-items: center; color: var(--faint); font-size: 13px; }
.dw-body { width: 100%; height: 100%; display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; }
.dw-mainw { display: grid; min-height: 0; }
.dw-fs { width: 30px; height: 30px; display: grid; place-items: center; padding: 0; cursor: pointer; background: rgba(46,211,230,.06); border: 1px solid rgba(46,211,230,.35); border-radius: 6px; color: #BFEFF6; transition: all .2s; }
.dw-fs:hover { color: #fff; border-color: #2ED3E6; background: rgba(46,211,230,.16); }
.dw-fs svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.dw-grid { width: 100%; height: 100%; min-height: 0; display: grid; }
.dw-cell { position: relative; overflow: hidden; background: #0A1424; border: 1px solid rgba(46,211,230,.14); border-radius: 8px; cursor: pointer; }
.dw-cell :deep(svg.cs) { display: block; width: 100%; height: 100%; background: #000; }
.dw-cell.act { border-color: #2ED3E6; box-shadow: 0 0 0 1px #2ED3E6; }
.dw-cell.main { border-color: rgba(255,193,92,.6); }
.dw-cell.empty { display: grid; place-items: center; font-size: 12px; color: rgba(142,166,190,.5); cursor: default; border-style: dashed; }
.dw-off { position: absolute; inset: 22px 0 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: var(--muted); font-size: 13px; } .dw-off small { font-size: 11px; color: var(--faint); }
.dw-hud { position: absolute; left: 0; right: 0; top: 0; display: flex; justify-content: space-between; align-items: center; padding: 5px 8px; font-size: 11.5px; color: #E6F7FB; background: linear-gradient(rgba(0,0,0,.55), transparent); pointer-events: none; }
.dw-hud span { flex: 1; min-width: 0; display: block; align-items: center; gap: 6px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; } .dw-hud i { display: inline-block; vertical-align: middle; margin: -2px 6px 0 0; width: 6px; height: 6px; border-radius: 50%; } .dw-hud em { flex: none; margin-left: 6px; font-style: normal; font-size: 11px; opacity: .7; }
.dw-act { position: absolute; right: 6px; bottom: 6px; display: flex; gap: 4px; opacity: 0; transition: opacity .15s; }
.dw-cell:hover .dw-act { opacity: 1; }
.dw-act button { width: 24px; height: 24px; display: grid; place-items: center; padding: 0; font-size: 12px; color: #E6F7FB; cursor: pointer; background: rgba(8,18,32,.72); border: 1px solid rgba(46,211,230,.3); border-radius: 6px; }
.dw-act button:hover { color: #fff; border-color: #2ED3E6; }
</style>
