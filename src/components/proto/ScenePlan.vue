<script setup lang="ts">
import { computed } from 'vue'
import type { PlanItem, PlanKind } from '@/mock/scenes'
/** 场景平面布局图（俯视彩色区块），viewBox 160 × 100；可嵌套在其他 SVG 中（传 x/y/width/height） */
const props = withDefaults(defineProps<{ items: PlanItem[]; labels?: boolean; anim?: boolean; dim?: boolean; nested?: boolean }>(), { labels: true, anim: true, dim: false, nested: false })
const uid = Math.random().toString(36).slice(2, 7)
const C: Record<PlanKind, string> = { zone: '#4DD0E1', facility: '#4DD0E1', equip: '#B48CFF', stairs: '#FFB74D', slope: '#FFB74D', terrain: '#4DE8B0', water: '#3FA9F5', point: '#7FF3FF', path: '#7FF3FF', wall: '#8FB3C7' }
const fill = (k: PlanKind) => ({ stairs: `url(#st-${uid})`, slope: `url(#sl-${uid})`, terrain: `url(#tr-${uid})`, water: `url(#wa-${uid})` } as Record<string, string>)[k] ?? C[k]
const blocks = computed(() => props.items.filter((i) => i.k !== 'path' && i.k !== 'point' && i.k !== 'wall' && i.k !== 'zone'))
const zones = computed(() => props.items.filter((i) => i.k === 'zone'))
const pts = (p: [number, number][]) => p.map((q) => q.join(',')).join(' ')
</script>
<template>
  <svg viewBox="0 0 160 100" :class="{ plan: !nested, dim }" :preserveAspectRatio="nested ? 'none' : undefined">
    <defs>
      <pattern :id="`g-${uid}`" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0H0V5" fill="none" stroke="#4DD0E1" stroke-opacity=".07" stroke-width=".3" /></pattern>
      <pattern :id="`st-${uid}`" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#FFB74D" fill-opacity=".14" /><rect width="4" height="1.4" fill="#FFB74D" fill-opacity=".45" /></pattern>
      <linearGradient :id="`sl-${uid}`" x1="0" x2="1"><stop offset="0" stop-color="#FFB74D" stop-opacity=".05" /><stop offset="1" stop-color="#FFB74D" stop-opacity=".45" /></linearGradient>
      <pattern :id="`tr-${uid}`" width="3.2" height="3.2" patternUnits="userSpaceOnUse"><rect width="3.2" height="3.2" fill="#4DE8B0" fill-opacity=".12" /><circle cx="1" cy="1" r=".55" fill="#4DE8B0" fill-opacity=".55" /><circle cx="2.6" cy="2.4" r=".35" fill="#4DE8B0" fill-opacity=".4" /></pattern>
      <pattern :id="`wa-${uid}`" width="10" height="5" patternUnits="userSpaceOnUse"><rect width="10" height="5" fill="#1C6FB0" fill-opacity=".38" /><path d="M0 2.5q2.5-1.6 5 0t5 0" fill="none" stroke="#7CC8FF" stroke-opacity=".5" stroke-width=".35" /></pattern>
    </defs>
    <rect width="160" height="100" fill="#081A2A" /><rect width="160" height="100" :fill="`url(#g-${uid})`" />
    <g v-for="(z, i) in zones" :key="'z' + i">
      <rect :x="z.x" :y="z.y" :width="z.w" :height="z.h" rx="1" fill="#4DD0E1" fill-opacity=".045" stroke="#4DD0E1" stroke-opacity=".45" stroke-width=".35" stroke-dasharray="1.6 1" />
      <text v-if="labels" :x="z.x! + 1.8" :y="z.y! + 4" class="zl">{{ z.t }}</text>
    </g>
    <g v-for="(b, i) in blocks" :key="'b' + i">
      <rect :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx=".8" :fill="fill(b.k)" :fill-opacity="b.k === 'facility' || b.k === 'equip' ? .2 : 1" :stroke="C[b.k]" stroke-opacity=".85" stroke-width=".4" />
      <text v-if="labels && b.t && b.w! > 9" :x="b.x! + b.w! / 2" :y="b.y! + b.h! / 2 + 1.2" text-anchor="middle" class="bl">{{ b.t }}</text>
    </g>
    <template v-for="(w, i) in items.filter((x) => x.k === 'wall')" :key="'w' + i"><polyline :points="pts(w.pts!)" fill="none" stroke="#8FB3C7" stroke-width="1.1" stroke-linecap="round" /></template>
    <template v-for="(p, i) in items.filter((x) => x.k === 'path')" :key="'p' + i">
      <polyline :points="pts(p.pts!)" fill="none" stroke="#7FF3FF" stroke-opacity=".75" stroke-width=".6" stroke-dasharray="2 1.4"><animate v-if="anim" attributeName="stroke-dashoffset" from="0" to="-6.8" dur="1.4s" repeatCount="indefinite" /></polyline>
    </template>
    <g v-for="(p, i) in items.filter((x) => x.k === 'point')" :key="'pt' + i">
      <circle :cx="p.x" :cy="p.y" r="1.3" fill="#7FF3FF" />
      <circle v-if="anim" :cx="p.x" :cy="p.y" r="1.3" fill="none" stroke="#7FF3FF" stroke-width=".4"><animate attributeName="r" values="1.3;4" dur="2.4s" :begin="`${i * 0.4}s`" repeatCount="indefinite" /><animate attributeName="opacity" values="1;0" dur="2.4s" :begin="`${i * 0.4}s`" repeatCount="indefinite" /></circle>
    </g>
  </svg>
</template>
<style scoped>
.plan { display: block; width: 100%; height: 100%; }
.dim { filter: saturate(.3) brightness(.7); }
.zl { font-size: 3.2px; fill: #7FF3FF; fill-opacity: .8; letter-spacing: .2px; }
.bl { font-size: 2.9px; fill: #E6F7FB; fill-opacity: .9; }
</style>
