<script setup lang="ts">
import { computed } from 'vue'
import { rng } from '@/utils'
/** 摄像头画面占位（原型）：可见光 / 红外两种风格 + AI 识别框 */
const props = withDefaults(defineProps<{ seed?: number; ir?: boolean; box?: string; boxColor?: string; hud?: boolean; fit?: boolean }>(), { fit: false, seed: 1, ir: false, box: '', boxColor: '#FF7A7A', hud: false })
const uid = Math.random().toString(36).slice(2, 7)
const s = computed(() => {
  const r = rng(props.seed * 13 + 5)
  const cabs = Array.from({ length: 4 }, (_, i) => ({ x: 8 + i * 30 + r() * 4, w: 24, h: 46 + r() * 10, lights: Array.from({ length: 3 }, () => (r() > 0.25 ? (r() > 0.5 ? '#45E3A8' : '#FFC15C') : '#FF5A5A')) }))
  const hot = { x: 30 + r() * 100, y: 30 + r() * 30, r: 10 + r() * 10 }
  const bx = { x: 14 + r() * 90, y: 18 + r() * 28, w: 30 + r() * 16, h: 26 + r() * 14 }
  return { cabs, hot, bx }
})
</script>
<template>
  <svg class="cs" viewBox="0 0 160 90" :preserveAspectRatio="fit ? 'xMidYMid meet' : 'xMidYMid slice'">
    <defs>
      <linearGradient :id="`bg-${uid}`" x1="0" y1="0" x2="0" y2="1"><stop offset="0" :stop-color="ir ? '#1B0B3A' : '#353F52'" /><stop offset="1" :stop-color="ir ? '#0A0420' : '#192331'" /></linearGradient>
      <radialGradient :id="`hot-${uid}`"><stop offset="0" stop-color="#FFF6A0" /><stop offset=".35" stop-color="#FF9A2E" /><stop offset=".7" stop-color="#C2185B" stop-opacity=".6" /><stop offset="1" stop-color="#4A148C" stop-opacity="0" /></radialGradient>
    </defs>
    <rect width="160" height="90" :fill="`url(#bg-${uid})`" />
    <!-- 地面透视 -->
    <path d="M0 72 L160 72 L160 90 L0 90 Z" :fill="ir ? '#12062A' : '#292F3C'" />
    <g :stroke="ir ? 'rgba(160,90,255,.25)' : 'rgba(180,200,210,.12)'" stroke-width=".4"><line v-for="i in 9" :key="i" :x1="i * 18 - 10" y1="72" :x2="(i * 18 - 10 - 80) * 2.2 + 80" y2="90" /></g>
    <!-- 配电柜 -->
    <g v-for="(c, i) in s.cabs" :key="i">
      <rect :x="c.x" :y="72 - c.h" :width="c.w" :height="c.h" :fill="ir ? '#2A0E52' : '#89869B'" :stroke="ir ? '#5B2A9A' : '#8597A2'" stroke-width=".5" />
      <rect :x="c.x + 3" :y="72 - c.h + 4" :width="c.w - 6" :height="c.h * 0.42" :fill="ir ? '#230A46' : '#6D6C81'" />
      <circle v-for="(l, j) in c.lights" :key="j" :cx="c.x + 6 + j * 6" :cy="72 - c.h * 0.4" r="1.4" :fill="ir ? '#7B3FC4' : l" />
      <line :x1="c.x + c.w - 4" :y1="72 - c.h * 0.3" :x2="c.x + c.w - 4" :y2="72 - c.h * 0.15" :stroke="ir ? '#5B2A9A' : '#AFC0C9'" stroke-width=".8" />
    </g>
    <!-- 管线 -->
    <rect x="0" y="10" width="160" height="3" :fill="ir ? '#3A1670' : '#6C7B84'" /><rect x="0" y="15" width="160" height="1.6" :fill="ir ? '#2E1160' : '#7D7B8F'" />
    <circle v-if="ir" :cx="s.hot.x" :cy="s.hot.y" :r="s.hot.r" :fill="`url(#hot-${uid})`" />
    <!-- AI 识别框 -->
    <g v-if="box">
      <rect :x="s.bx.x" :y="s.bx.y" :width="s.bx.w" :height="s.bx.h" fill="none" :stroke="boxColor" stroke-width=".7" />
      <rect :x="s.bx.x" :y="s.bx.y - 5.4" :width="box.length * 3.4 + 4" height="5.4" :fill="boxColor" />
      <text :x="s.bx.x + 2" :y="s.bx.y - 1.5" class="cs-t">{{ box }}</text>
    </g>
    <g v-if="hud" class="cs-hud"><text x="4" y="7">{{ ir ? 'IR · 640×512' : 'RGB · 1920×1080' }}</text><text x="156" y="7" text-anchor="end">● REC</text></g>
  </svg>
</template>
<style scoped>
.cs { display: block; width: 100%; height: 100%; }
.cs-t { font: 600 3.4px 'Noto Sans SC', sans-serif; fill: #fff; }
.cs-hud text { font: 3px var(--mono); fill: rgba(230,247,251,.75); }
.cs-hud text:last-child { fill: #FF7A7A; }
</style>
