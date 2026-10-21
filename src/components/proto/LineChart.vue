<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
/** 轻量 SVG 折线/面积图（原型用，接入真实数据时可替换为 ECharts）。按容器实际宽度绘制，文字不会被拉伸 */
const props = withDefaults(defineProps<{ series: { name: string; color: string; data: number[] }[]; labels?: string[]; height?: number; min?: number; max?: number; area?: boolean }>(), { height: 180, area: true })
const el = ref<HTMLDivElement>()
const W = ref(600)
let ro: ResizeObserver | undefined
onMounted(() => {
  if (!el.value) return
  W.value = el.value.clientWidth || 600
  ro = new ResizeObserver(([e]) => { const w = Math.round(e.contentRect.width); if (w > 0) W.value = w })
  ro.observe(el.value)
})
onBeforeUnmount(() => ro?.disconnect())
const P = { l: 36, r: 12, t: 12, b: 22 }
const all = computed(() => props.series.flatMap((s) => s.data))
const lo = computed(() => props.min ?? Math.floor(Math.min(...all.value)))
const hi = computed(() => props.max ?? Math.ceil(Math.max(...all.value)))
const n = computed(() => Math.max(...props.series.map((s) => s.data.length)))
const x = (i: number) => P.l + (i / Math.max(1, n.value - 1)) * (W.value - P.l - P.r)
const y = (v: number) => P.t + (1 - (v - lo.value) / (hi.value - lo.value || 1)) * (props.height - P.t - P.b)
const paths = computed(() => props.series.map((s) => {
  const pts = s.data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
  return { ...s, line: 'M' + pts.join(' L'), fill: `M${x(0)},${y(lo.value)} L${pts.join(' L')} L${x(s.data.length - 1)},${y(lo.value)} Z` }
}))
const ticks = computed(() => Array.from({ length: 4 }, (_, i) => lo.value + ((hi.value - lo.value) * i) / 3))
const uid = Math.random().toString(36).slice(2, 7)
</script>
<template>
  <div ref="el" class="lc-w" :style="{ height: height + 'px' }">
    <svg :width="W" :height="height" :viewBox="`0 0 ${W} ${height}`" class="lc">
      <defs><linearGradient v-for="(s, i) in series" :id="`lc-${uid}-${i}`" :key="i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" :stop-color="s.color" stop-opacity=".35" /><stop offset="1" :stop-color="s.color" stop-opacity="0" /></linearGradient></defs>
      <g v-for="t in ticks" :key="t"><line :x1="P.l" :x2="W - P.r" :y1="y(t)" :y2="y(t)" style="stroke: rgba(var(--glow, 77,208,225),.1)" stroke-dasharray="3 4" /><text :x="P.l - 6" :y="y(t) + 4" text-anchor="end" class="lc-t">{{ Math.abs(t) >= 100 ? Math.round(t) : +t.toFixed(1) }}</text></g>
      <template v-if="labels"><text v-for="(l, i) in labels" :key="l + i" :x="x(i)" :y="height - 6" text-anchor="middle" class="lc-t">{{ l }}</text></template>
      <g v-for="(p, i) in paths" :key="p.name">
        <path v-if="area" :d="p.fill" :fill="`url(#lc-${uid}-${i})`" />
        <path :d="p.line" fill="none" :stroke="p.color" stroke-width="2" stroke-linejoin="round" />
      </g>
    </svg>
  </div>
</template>
<style scoped>
.lc-w { width: 100%; min-width: 0; overflow: hidden; }
.lc { display: block; overflow: visible; }
.lc-t { font: 10px 'JetBrains Mono', Consolas, monospace; fill: var(--axis, #6F92A8); }
</style>
