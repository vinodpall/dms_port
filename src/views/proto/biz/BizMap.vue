<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { PlusOutlined, MinusOutlined, CompressOutlined } from '@ant-design/icons-vue'
import PointCloudView from '@/components/viz/PointCloudView.vue'
import SatMap from '@/components/viz/SatMap.vue'
import { loadGridImage } from '@/components/viz/gridmap'
import { MAP_FILES } from '@/config/media'
import { ROUTE_SET, GRID_RECT, routeAt, routeLen, toReal, toLngLat, fromLngLat, yawToReal, SAT_CENTER, type P } from './geo'
/**
 * 巡检地图：栅格（真实 PGM）/ 点云（three.js 三维）/ 卫星（高德在线卫星图）底图 + 功能区 + 路线 + 任务点 + 机器人位姿。
 * 栅格模式支持滚轮缩放、拖拽平移；坐标系 160×100（见 geo.ts）
 */
export interface MapPt { mx: number; my: number; st?: 'done' | 'cur' | 'todo' | 'bad' }
const props = withDefaults(defineProps<{ seed?: number; mode?: 'grid' | 'cloud' | 'sat' | 'blank'; zones?: boolean; shape?: number | null; pts?: MapPt[]; progress?: number; draw?: number | null; robot?: { x: number; y: number; yaw: number } | null; edit?: boolean; sel?: number; labels?: boolean; arrow?: { x: number; y: number; yaw: number } | null; pick?: boolean; ghost?: number[]; live?: boolean; controls?: boolean; center?: [number, number] }>(),
  { seed: 11, mode: 'grid', zones: true, shape: null, pts: () => [], progress: 0, draw: null, robot: null, edit: false, sel: -1, labels: true, arrow: null, pick: false, ghost: () => [], live: false, controls: true, center: undefined })
const emit = defineEmits<{ pick: [x: number, y: number] }>()
const uid = Math.random().toString(36).slice(2, 7)
const AREAS = [{ x: 82, y: 17, t: '中心庭院' }, { x: 97, y: 52, t: '东楼' }, { x: 70, y: 86, t: '南侧连廊' }, { x: 116, y: 80, t: '东侧通道' }]
const path = (r: P[]) => 'M' + r.map((p) => p.join(' ')).join(' L')
const partialPts = (i: number, f: number) => {
  const r = ROUTE_SET[i]; const out: P[] = [r[0]]; let d = f * routeLen(i)
  for (let k = 1; k < r.length; k++) { const l = Math.hypot(r[k][0] - r[k - 1][0], r[k][1] - r[k - 1][1]); if (d >= l) { out.push(r[k]); d -= l } else { const p = routeAt(i, f); out.push([p.x, p.y]); break } }
  return out
}
const partial = (i: number, f: number) => path(partialPts(i, f))
const route = computed(() => (props.shape === null || props.shape === undefined ? null : ROUTE_SET[props.shape]))
const donePath = computed(() => (props.shape !== null && props.progress > 0 ? partial(props.shape, props.progress) : ''))
const drawPath = computed(() => (props.shape !== null && props.draw !== null ? partial(props.shape, Math.max(0.001, props.draw)) : ''))
const ZONE_SHAPES = [
  { k: 'forbid', x: 44, y: 30, w: 10, h: 8, c: '#FF6B6B' }, { k: 'forbid', x: 89, y: 51, w: 9, h: 6, c: '#FF6B6B' },
  { k: 'stair', x: 119, y: 44, w: 8, h: 7, c: '#FFB74D' }, { k: 'slope', x: 103, y: 66, w: 8, h: 9, c: '#B48CFF' },
  { k: 'narrow', x: 109, y: 31, w: 6, h: 7, c: '#4DD0E1' }, { k: 'grass', x: 76, y: 14, w: 11, h: 7, c: '#4DE8B0' },
]
const ptColor = (st?: string) => (st === 'done' ? '#26C6DA' : st === 'bad' ? '#FF6B6B' : '#0B1A28')

/* ---------- 栅格底图 ---------- */
const gridUrl = ref('')
const gridErr = ref('')
onMounted(() => { loadGridImage(MAP_FILES.pgm, true).then((u) => { gridUrl.value = u }).catch((e) => { gridErr.value = (e as Error).message }) })

/* ---------- 缩放 / 平移 ---------- */
const vb = reactive({ x: 0, y: 0, w: 160, h: 100 })
const viewBox = computed(() => `${vb.x} ${vb.y} ${vb.w} ${vb.h}`)
const zoomed = computed(() => vb.w < 159.9)
const svgEl = ref<SVGSVGElement>()
const toSvg = (cx: number, cy: number) => { const s = svgEl.value!; const pt = s.createSVGPoint(); pt.x = cx; pt.y = cy; const m = s.getScreenCTM(); return m ? pt.matrixTransform(m.inverse()) : { x: 80, y: 50 } }
const clampVb = () => { vb.x = Math.min(160 - vb.w * 0.3, Math.max(-vb.w * 0.7, vb.x)); vb.y = Math.min(100 - vb.h * 0.3, Math.max(-vb.h * 0.7, vb.y)) }
function zoomAt(f: number, cx = 80, cy = 50) {
  const w = Math.min(160, Math.max(12, vb.w * f)); const k = w / vb.w
  vb.x = cx - (cx - vb.x) * k; vb.y = cy - (cy - vb.y) * k; vb.w = w; vb.h = w / 1.6
  if (w >= 160) Object.assign(vb, { x: 0, y: 0, w: 160, h: 100 }); else clampVb()
}
const onWheel = (e: WheelEvent) => { if (!props.controls) return; e.preventDefault(); const p = toSvg(e.clientX, e.clientY); zoomAt(e.deltaY > 0 ? 1.18 : 1 / 1.18, p.x, p.y) }
const zoomBtn = (f: number) => zoomAt(f, vb.x + vb.w / 2, vb.y + vb.h / 2)
const reset = () => Object.assign(vb, { x: 0, y: 0, w: 160, h: 100 })
let drag: { x: number; y: number; vx: number; vy: number; moved: boolean } | null = null
const onDown = (e: PointerEvent) => { if (!props.controls || e.button !== 0) return; drag = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y, moved: false } }
const onMove = (e: PointerEvent) => {
  if (!drag) return
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y
  if (!drag.moved && Math.hypot(dx, dy) < 4) return
  if (!drag.moved) { drag.moved = true; (e.currentTarget as Element).setPointerCapture?.(e.pointerId) }
  const m = svgEl.value?.getScreenCTM(); const k = m ? 1 / m.a : 0.2
  vb.x = drag.vx - dx * k; vb.y = drag.vy - dy * k; clampVb()
}
let suppress = false
const onUp = () => { suppress = !!drag?.moved; drag = null }
const onClick = (e: MouseEvent) => {
  if (suppress) { suppress = false; return }
  if (!props.pick) return
  const p = toSvg(e.clientX, e.clientY); emit('pick', +p.x.toFixed(1), +p.y.toFixed(1))
}

/* ---------- 点云 / 卫星叠加 ---------- */
const real = (p: P): [number, number] => { const r = toReal(p[0], p[1]); return [r.x, r.y] }
const cloudRoute = computed(() => (route.value ? route.value.map(real) : props.shape !== null && props.draw !== null ? partialPts(props.shape, Math.max(0.001, props.draw)).map(real) : null))
const cloudPts = computed(() => props.pts.map((p) => { const r = toReal(p.mx, p.my); return { x: r.x, y: r.y, st: p.st } }))
const cloudRobot = computed(() => (props.robot ? { ...toReal(props.robot.x, props.robot.y), yaw: yawToReal(props.robot.yaw) } : null))
const ll = (p: P) => toLngLat(p[0], p[1], satC.value)
const satCenter = computed<[number, number]>(() => [satC.value.lng, satC.value.lat])
const satC = computed(() => (props.center ? { lng: props.center[0], lat: props.center[1] } : SAT_CENTER))
const satRoute = computed(() => (route.value && props.draw === null ? route.value.map(ll) : null))
const satDone = computed(() => (props.shape !== null && (props.draw !== null || props.progress > 0) ? partialPts(props.shape, props.draw !== null ? Math.max(0.001, props.draw) : props.progress).map(ll) : null))
const satPts = computed(() => props.pts.map((p) => ({ lnglat: ll([p.mx, p.my]), st: p.st })))
const satRobot = computed(() => (props.robot ? { lnglat: ll([props.robot.x, props.robot.y]), yaw: props.robot.yaw } : null))
const satArrow = computed(() => (props.arrow ? { lnglat: ll([props.arrow.x, props.arrow.y]), yaw: props.arrow.yaw } : null))
const satGhost = computed(() => props.ghost.map((g) => ROUTE_SET[g].map(ll)))
const onSatPick = (lng: number, lat: number) => { const p = fromLngLat(lng, lat, satC.value); emit('pick', +p.x.toFixed(1), +p.y.toFixed(1)) }
</script>

<template>
  <div class="bm-wrap">
  <PointCloudView v-if="mode === 'cloud'" :route="cloudRoute" :done="draw === null ? progress : 1" :pts="cloudPts" :robot="cloudRobot" :live="live" />
  <SatMap v-else-if="mode === 'sat'" :center="satCenter" :route="satRoute" :done="satDone" :ghost="satGhost" :pts="satPts" :robot="satRobot" :arrow="satArrow" :pick="pick" @pick="onSatPick" />
  <template v-else>
  <svg ref="svgEl" class="bm" :class="{ pick, pan: controls && zoomed }" :viewBox="viewBox" preserveAspectRatio="xMidYMid meet" @click="onClick" @wheel="onWheel" @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp">
    <defs>
      <pattern :id="`g-${uid}`" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M4 0H0V4" fill="none" stroke="rgba(77,208,225,.07)" stroke-width=".2" /></pattern>
      <pattern :id="`z-forbid-${uid}`" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="2" fill="rgba(255,107,107,.12)" /><line x1="0" y1="0" x2="0" y2="2" stroke="#FF6B6B" stroke-width=".5" /></pattern>
      <pattern :id="`z-stair-${uid}`" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="rgba(255,183,77,.12)" /><line x1="0" y1="1" x2="2" y2="1" stroke="#FFB74D" stroke-width=".4" /></pattern>
      <pattern :id="`z-slope-${uid}`" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="rgba(180,140,255,.12)" /><line x1="1" y1="0" x2="1" y2="2" stroke="#B48CFF" stroke-width=".4" /></pattern>
      <pattern :id="`z-narrow-${uid}`" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="rgba(77,208,225,.1)" /><path d="M2 0H0V2" fill="none" stroke="#4DD0E1" stroke-width=".3" /></pattern>
      <pattern :id="`z-grass-${uid}`" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="rgba(77,232,176,.1)" /><path d="M0 0L2 2M2 0L0 2" stroke="#4DE8B0" stroke-width=".25" /></pattern>
      <radialGradient :id="`rb-${uid}`"><stop offset="0" stop-color="#7FF3FF" stop-opacity=".55" /><stop offset="1" stop-color="#7FF3FF" stop-opacity="0" /></radialGradient>
    </defs>

    <!-- 底图 -->
    <rect x="-200" y="-200" width="560" height="500" fill="#081521" />
    <rect x="-200" y="-200" width="560" height="500" :fill="`url(#g-${uid})`" />
    <template v-if="mode === 'grid'">
      <image v-if="gridUrl" :href="gridUrl" :x="GRID_RECT.x" :y="GRID_RECT.y" :width="GRID_RECT.w" :height="GRID_RECT.h" preserveAspectRatio="none" class="bm-img" />
      <text v-else x="80" y="50" class="bm-room">{{ gridErr ? '栅格地图加载失败' : '栅格地图加载中…' }}</text>
      <template v-if="labels && gridUrl"><text v-for="r in AREAS" :key="r.t" :x="r.x" :y="r.y" class="bm-room">{{ r.t }}</text></template>
    </template>

    <!-- 功能区 -->
    <g v-if="zones && mode === 'grid'">
      <rect v-for="(z, i) in ZONE_SHAPES" :key="i" :x="z.x" :y="z.y" :width="z.w" :height="z.h" :fill="`url(#z-${z.k}-${uid})`" :stroke="z.c" stroke-width=".35" :stroke-dasharray="edit ? '1 .8' : ''" />
    </g>

    <!-- 其他路线（淡显） -->
    <path v-for="g in ghost" :key="`gh${g}`" :d="path(ROUTE_SET[g])" fill="none" stroke="rgba(143,179,199,.28)" stroke-width=".5" stroke-dasharray="1 1" />
    <!-- 路线 -->
    <g v-if="route && draw === null">
      <path :d="path(route)" fill="none" stroke="rgba(77,232,176,.25)" stroke-width="2.4" stroke-linejoin="round" />
      <path :d="path(route)" fill="none" stroke="#4DE8B0" stroke-width=".6" stroke-dasharray="1.6 1.2" stroke-linejoin="round" />
      <path v-if="donePath" :d="donePath" fill="none" stroke="#26C6DA" stroke-width="1.1" stroke-linejoin="round" />
      <template v-if="edit"><circle v-for="(p, i) in route" :key="`e${i}`" :cx="p[0]" :cy="p[1]" r=".9" fill="#0B1A28" stroke="#4DE8B0" stroke-width=".35" /></template>
      <g :transform="`translate(${route[0][0]} ${route[0][1]})`"><circle r="1.8" fill="rgba(255,183,77,.2)" stroke="#FFB74D" stroke-width=".5" /><text y="-2.8" class="bm-tag">起点</text></g>
    </g>
    <!-- 录制中 -->
    <g v-if="drawPath"><path :d="drawPath" fill="none" stroke="#FF6B6B" stroke-width="1" stroke-linejoin="round" /><circle :cx="route![0][0]" :cy="route![0][1]" r="1.4" fill="#FF6B6B" /></g>
    <!-- 任务点 -->
    <g v-for="(p, i) in pts" :key="`p${i}`" :transform="`translate(${p.mx} ${p.my})`">
      <circle v-if="i === sel" r="3.6" fill="none" stroke="#FFB74D" stroke-width=".45" />
      <circle r="2" :fill="ptColor(p.st)" :stroke="p.st === 'done' ? '#7FF3FF' : p.st === 'bad' ? '#FF9C9C' : p.st === 'cur' ? '#FFFFFF' : '#FFB74D'" stroke-width=".4" />
      <text y=".9" class="bm-pt" :fill="p.st === 'done' ? '#04121D' : p.st === 'bad' ? '#fff' : '#FFD08A'">{{ i + 1 }}</text>
    </g>
    <!-- 重定位箭头 -->
    <g v-if="arrow" :transform="`translate(${arrow.x} ${arrow.y}) rotate(${arrow.yaw})`"><line x1="0" y1="0" x2="9" y2="0" stroke="#FF6B6B" stroke-width=".8" /><path d="M9 -2 L12 0 L9 2 Z" fill="#FF6B6B" /><circle r="1.2" fill="#FF6B6B" /></g>
    <!-- 机器人 -->
    <g v-if="robot" :transform="`translate(${robot.x} ${robot.y})`">
      <circle r="7" :fill="`url(#rb-${uid})`" class="bm-pulse" />
      <g :transform="`rotate(${robot.yaw})`"><path d="M3.2 0 L-1.8 2.2 L-0.8 0 L-1.8 -2.2 Z" fill="#7FF3FF" stroke="#04121D" stroke-width=".25" /></g>
    </g>
  </svg>
  <div v-if="controls" class="bm-ctl" @click.stop>
    <button type="button" title="放大" @click="zoomBtn(1 / 1.4)"><PlusOutlined /></button>
    <button type="button" title="缩小" :disabled="!zoomed" @click="zoomBtn(1.4)"><MinusOutlined /></button>
    <button type="button" title="还原" :disabled="!zoomed" @click="reset"><CompressOutlined /></button>
  </div>
  </template>
  </div>
</template>

<style scoped>
.bm-wrap { position: relative; width: 100%; height: 100%; }
.bm { display: block; width: 100%; height: 100%; touch-action: none; } .bm.pan { cursor: grab; } .bm.pick { cursor: crosshair; }
.bm-img { image-rendering: pixelated; }
.bm-ctl { position: absolute; right: 8px; bottom: 8px; display: flex; flex-direction: column; gap: 2px; padding: 3px; background: rgba(6,18,32,.78); border: 1px solid rgba(77,208,225,.2); border-radius: 6px; }
.bm-ctl button { width: 24px; height: 24px; display: grid; place-items: center; font-size: 12px; color: var(--muted); background: none; border: 0; border-radius: 4px; cursor: pointer; }
.bm-ctl button:hover:not(:disabled) { color: #fff; background: rgba(77,208,225,.12); } .bm-ctl button:disabled { opacity: .35; cursor: default; }
.bm-tag { font-size: 2.4px; fill: #FFB74D; text-anchor: middle; }
.bm-room { font-size: 2.8px; fill: rgba(158,195,214,.5); text-anchor: middle; dominant-baseline: middle; letter-spacing: .2px; }
.bm-pt { font: 600 2.2px var(--mono); text-anchor: middle; }
.bm-pulse { transform-box: fill-box; transform-origin: center; animation: bm-pulse 2.8s ease-in-out infinite; }
@keyframes bm-pulse { 0%, 100% { opacity: .9; transform: scale(.85); } 50% { opacity: .35; transform: scale(1.15); } }
</style>
