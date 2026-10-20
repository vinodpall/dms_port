<script setup lang="ts">
import { computed } from 'vue'
import { rng } from '@/utils'
/** 巡检地图（原型）：栅格 / 点云 / 卫星三种底图 + 功能区 + 路线 + 任务点 + 机器人位姿。坐标系 160×100 */
const props = withDefaults(defineProps<{ seed?: number; mode?: 'grid' | 'cloud' | 'sat'; zones?: boolean; route?: number | null; points?: number; robot?: { x: number; y: number; yaw: number } | null; progress?: number; edit?: boolean; selPoint?: number; labels?: boolean; hideRoute?: boolean }>(),
  { seed: 11, mode: 'grid', zones: true, route: 0, points: 0, robot: null, progress: 0, edit: false, selPoint: -1, labels: true, hideRoute: false })
const uid = Math.random().toString(36).slice(2, 7)
/* 墙体（建筑平面） */
const WALLS: [number, number, number, number][] = [
  [6, 6, 154, 6], [154, 6, 154, 94], [154, 94, 6, 94], [6, 94, 6, 6],
  [6, 42, 30, 42], [38, 42, 70, 42], [78, 42, 104, 42], [112, 42, 154, 42],
  [6, 58, 22, 58], [30, 58, 62, 58], [70, 58, 116, 58], [124, 58, 154, 58],
  [46, 6, 46, 42], [92, 6, 92, 42], [124, 6, 124, 42], [40, 58, 40, 94], [82, 58, 82, 94], [118, 58, 118, 94],
]
const ROOMS = [
  { x: 6, y: 6, w: 40, h: 36, t: '配电室' }, { x: 46, y: 6, w: 46, h: 36, t: '机房' }, { x: 92, y: 6, w: 32, h: 36, t: 'UPS 间' }, { x: 124, y: 6, w: 30, h: 36, t: '控制室' },
  { x: 6, y: 58, w: 34, h: 36, t: '充电区' }, { x: 40, y: 58, w: 42, h: 36, t: '变压器室' }, { x: 82, y: 58, w: 36, h: 36, t: '电池室' }, { x: 118, y: 58, w: 36, h: 36, t: '消防泵房' },
]
const ROUTE_SET: [number, number][][] = [
  [[16, 82], [26, 50], [34, 50], [34, 26], [20, 20], [34, 14], [34, 50], [74, 50], [74, 24], [86, 16], [74, 34], [74, 50], [108, 50], [108, 26], [108, 50], [150, 50], [140, 76], [128, 86], [120, 50], [66, 50], [60, 76], [48, 84], [66, 50], [26, 50], [16, 82]],
  [[16, 82], [26, 50], [74, 50], [74, 20], [60, 14], [74, 20], [74, 50], [108, 50], [108, 18], [116, 30], [108, 50]],
  [[26, 50], [150, 50], [140, 26], [134, 14], [128, 50], [100, 50], [100, 80], [90, 86], [100, 50], [26, 50]],
  [[16, 82], [18, 66], [26, 50], [12, 50]],
]
const route = computed(() => (props.route === null || props.route === undefined ? null : ROUTE_SET[((props.route % ROUTE_SET.length) + ROUTE_SET.length) % ROUTE_SET.length]))
const segLen = (a: [number, number], b: [number, number]) => Math.hypot(b[0] - a[0], b[1] - a[1])
const total = computed(() => (route.value ? route.value.slice(1).reduce((s, p, i) => s + segLen(route.value![i], p), 0) : 0))
const at = (f: number): [number, number] => {
  const r = route.value!; let d = f * total.value
  for (let i = 1; i < r.length; i++) { const l = segLen(r[i - 1], r[i]); if (d <= l) { const k = d / (l || 1); return [r[i - 1][0] + (r[i][0] - r[i - 1][0]) * k, r[i - 1][1] + (r[i][1] - r[i - 1][1]) * k] } d -= l }
  return r[r.length - 1]
}
const path = (r: [number, number][]) => 'M' + r.map((p) => p.join(' ')).join(' L')
const donePath = computed(() => {
  if (!route.value || props.progress <= 0) return ''
  const out: [number, number][] = [route.value[0]]; let d = props.progress * total.value
  for (let i = 1; i < route.value.length; i++) { const l = segLen(route.value[i - 1], route.value[i]); if (d >= l) { out.push(route.value[i]); d -= l } else { out.push(at(props.progress)); break } }
  return path(out)
})
const pts = computed(() => (route.value && props.points ? Array.from({ length: props.points }, (_, i) => { const f = (i + 0.6) / (props.points + 0.2); const [x, y] = at(f); return { x, y, done: f <= props.progress, i } }) : []))
const robotPos = computed(() => props.robot ?? (route.value && props.progress > 0 ? { ...pick(at(props.progress)), yaw: 0 } : null))
function pick(p: [number, number]) { return { x: p[0], y: p[1] } }
/* 点云：沿墙体采样 */
const cloud = computed(() => {
  const r = rng(props.seed * 7 + 1); const out: { x: number; y: number; c: string }[] = []
  for (const [x1, y1, x2, y2] of WALLS) { const n = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2.2); for (let i = 0; i < n; i++) { const k = r(); const h = r(); out.push({ x: x1 + (x2 - x1) * k + (r() - 0.5) * 1.6, y: y1 + (y2 - y1) * k + (r() - 0.5) * 1.6, c: h > 0.66 ? '#FF8A50' : h > 0.33 ? '#4DE8B0' : '#4DD0E1' }) } }
  for (let i = 0; i < 260; i++) out.push({ x: 8 + r() * 144, y: 8 + r() * 84, c: 'rgba(91,155,255,.5)' })
  return out
})
const ZONE_SHAPES = [
  { k: 'forbid', x: 10, y: 10, w: 14, h: 8, c: '#FF6B6B' }, { k: 'forbid', x: 50, y: 30, w: 14, h: 8, c: '#FF6B6B' },
  { k: 'stair', x: 134, y: 62, w: 14, h: 10, c: '#FFB74D' }, { k: 'slope', x: 86, y: 62, w: 12, h: 8, c: '#B48CFF' },
  { k: 'narrow', x: 112, y: 44, w: 10, h: 12, c: '#4DD0E1' }, { k: 'grass', x: 44, y: 80, w: 16, h: 10, c: '#4DE8B0' },
]
const sat = computed(() => { const r = rng(props.seed); return Array.from({ length: 30 }, () => ({ x: r() * 160, y: r() * 100, r: 1.5 + r() * 3 })) })
</script>

<template>
  <svg class="bm" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid meet">
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
    <template v-if="mode === 'sat'">
      <rect width="160" height="100" fill="#14261C" />
      <rect x="0" y="44" width="160" height="12" fill="#2A3334" /><rect x="70" y="0" width="12" height="100" fill="#2A3334" />
      <line x1="0" y1="50" x2="160" y2="50" stroke="#D8C46A" stroke-width=".3" stroke-dasharray="2 2" /><line x1="76" y1="0" x2="76" y2="100" stroke="#D8C46A" stroke-width=".3" stroke-dasharray="2 2" />
      <rect v-for="(b, i) in [[8, 8, 54, 30], [90, 8, 60, 28], [8, 62, 50, 30], [92, 62, 26, 30], [124, 62, 28, 30]]" :key="i" :x="b[0]" :y="b[1]" :width="b[2]" :height="b[3]" fill="#3B4650" stroke="#566370" stroke-width=".4" />
      <circle v-for="(t, i) in sat" :key="`t${i}`" :cx="t.x" :cy="t.y" :r="t.r" fill="#1F4A2C" opacity=".85" />
    </template>
    <template v-else>
      <rect width="160" height="100" :fill="mode === 'cloud' ? '#050E18' : '#0B1A28'" />
      <rect width="160" height="100" :fill="`url(#g-${uid})`" />
      <template v-if="mode === 'grid'">
        <rect x="6" y="6" width="148" height="88" fill="#12293C" />
        <line v-for="(w, i) in WALLS" :key="i" :x1="w[0]" :y1="w[1]" :x2="w[2]" :y2="w[3]" stroke="#9EC3D6" stroke-width="1.1" stroke-linecap="square" />
        <template v-if="labels"><text v-for="r in ROOMS" :key="r.t" :x="r.x + r.w / 2" :y="r.y + r.h / 2" class="bm-room">{{ r.t }}</text></template>
      </template>
      <circle v-for="(p, i) in cloud" v-else :key="i" :cx="p.x" :cy="p.y" r=".35" :fill="p.c" />
    </template>

    <!-- 功能区 -->
    <g v-if="zones && mode !== 'sat'">
      <rect v-for="(z, i) in ZONE_SHAPES" :key="i" :x="z.x" :y="z.y" :width="z.w" :height="z.h" :fill="`url(#z-${z.k}-${uid})`" :stroke="z.c" stroke-width=".35" :stroke-dasharray="edit ? '1 .8' : ''" />
    </g>

    <!-- 路线 -->
    <g v-if="route && !hideRoute">
      <path :d="path(route)" fill="none" stroke="rgba(77,232,176,.25)" stroke-width="2.4" stroke-linejoin="round" />
      <path :d="path(route)" fill="none" stroke="#4DE8B0" stroke-width=".6" stroke-dasharray="1.6 1.2" stroke-linejoin="round" />
      <path v-if="donePath" :d="donePath" fill="none" stroke="#26C6DA" stroke-width="1.1" stroke-linejoin="round" />
      <template v-if="edit"><circle v-for="(p, i) in route" :key="`e${i}`" :cx="p[0]" :cy="p[1]" r=".9" fill="#0B1A28" stroke="#4DE8B0" stroke-width=".35" /></template>
      <circle :cx="route[0][0]" :cy="route[0][1]" r="1.6" fill="none" stroke="#FFB74D" stroke-width=".5" />
    </g>
    <!-- 任务点 -->
    <g v-for="p in pts" :key="`p${p.i}`" :transform="`translate(${p.x} ${p.y})`">
      <circle v-if="p.i === selPoint" r="3.4" fill="none" stroke="#FFB74D" stroke-width=".4" />
      <circle r="2" :fill="p.done ? '#26C6DA' : '#0B1A28'" :stroke="p.done ? '#7FF3FF' : '#FFB74D'" stroke-width=".4" />
      <text y=".9" class="bm-pt" :fill="p.done ? '#04121D' : '#FFD08A'">{{ p.i + 1 }}</text>
    </g>
    <!-- 机器人 -->
    <g v-if="robotPos" :transform="`translate(${robotPos.x} ${robotPos.y})`">
      <circle r="7" :fill="`url(#rb-${uid})`" class="bm-pulse" />
      <g :transform="`rotate(${robotPos.yaw})`"><path d="M3.2 0 L-1.8 2.2 L-0.8 0 L-1.8 -2.2 Z" fill="#7FF3FF" stroke="#04121D" stroke-width=".25" /></g>
    </g>
  </svg>
</template>

<style scoped>
.bm { display: block; width: 100%; height: 100%; }
.bm-room { font-size: 3px; fill: rgba(158,195,214,.45); text-anchor: middle; dominant-baseline: middle; letter-spacing: .2px; }
.bm-pt { font: 600 2.2px var(--mono); text-anchor: middle; }
.bm-pulse { transform-box: fill-box; transform-origin: center; animation: bm-pulse 2.8s ease-in-out infinite; }
@keyframes bm-pulse { 0%, 100% { opacity: .9; transform: scale(.85); } 50% { opacity: .35; transform: scale(1.15); } }
</style>
