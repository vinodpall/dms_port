<script setup lang="ts">
/** 仿真视口画面占位（原型）：Isaac Sim WebRTC 串流画面，并行环境中的机器狗在复杂地形上训练 */
import { computed } from 'vue'
import DeviceGlyph from '@/components/proto/DeviceGlyph.vue'
const ROWS = 5, COLS = 9
const envs = computed(() => {
  const out: { x: number; y: number; s: number; d: number; sel: boolean }[] = []
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const depth = r / (ROWS - 1)            // 0 = 远，1 = 近
    const s = 0.45 + depth * 0.75
    const y = 150 + Math.pow(depth, 1.25) * 300
    const spread = 70 + depth * 75
    const x = 600 + (c - (COLS - 1) / 2) * spread
    out.push({ x, y, s, d: (r * COLS + c) % 7, sel: r === ROWS - 1 && c === 4 })
  }
  return out
})
const floorV = Array.from({ length: 21 }, (_, i) => i - 10)
const floorH = Array.from({ length: 10 }, (_, i) => i)

</script>
<template>
          <svg class="sm-scene" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#142E4C" /><stop offset=".3" stop-color="#193B5E" /><stop offset="1" stop-color="#0f1f35" /></linearGradient>
              <radialGradient id="spot" cx=".5" cy=".55" r=".55"><stop offset="0" stop-color="#26C6DA" stop-opacity=".18" /><stop offset="1" stop-color="#26C6DA" stop-opacity="0" /></radialGradient>
            </defs>
            <rect width="1200" height="520" fill="url(#sky)" />
            <rect width="1200" height="520" fill="url(#spot)" />
            <!-- 透视地面网格 -->
            <g stroke="#2ED3E6" stroke-width="1">
              <line v-for="v in floorV" :key="`v${v}`" :x1="600 + v * 30" y1="120" :x2="600 + v * 160" y2="520" :opacity="v === 0 ? .4 : .14" />
              <line v-for="h in floorH" :key="`h${h}`" x1="0" :y1="120 + Math.pow(h / 9, 1.8) * 400" x2="1200" :y2="120 + Math.pow(h / 9, 1.8) * 400" :opacity=".06 + h * .012" />
            </g>
            <line x1="0" y1="120" x2="1200" y2="120" stroke="#2ED3E6" opacity=".35" />
            <!-- 地形：台阶 + 坡道 -->
            <g fill="rgba(46,211,230,.05)" stroke="#2ED3E6" stroke-opacity=".35">
              <path d="M70 330 L210 330 L210 300 L180 300 L180 270 L150 270 L150 240 L120 240 L120 330" />
              <path d="M1000 330 L1150 330 L1150 250 Z" />
            </g>
            <!-- 并行环境中的机器人 -->
            <g v-for="(e, i) in envs" :key="i" :transform="`translate(${e.x} ${e.y}) scale(${e.s})`" :opacity="0.35 + e.s * 0.55">
              <ellipse cx="0" cy="26" rx="34" ry="7" :fill="e.sel ? 'rgba(38,198,218,.35)' : 'rgba(46,211,230,.1)'" />
              <g class="bob" :style="{ animationDelay: `${e.d * 0.18}s` }"><g transform="translate(-32 -36)"><DeviceGlyph type="quadruped" :size="64" :color="e.sel ? '#7FF3FF' : '#2ED3E6'" /></g></g>
              <template v-if="e.sel">
                <rect x="-44" y="-44" width="88" height="80" fill="none" stroke="#FFC15C" stroke-dasharray="4 3" />
                <g stroke-width="3" stroke-linecap="round"><line x1="0" y1="0" x2="60" y2="0" stroke="#FF5A5A" /><line x1="0" y1="0" x2="0" y2="-62" stroke="#45E3A8" /><line x1="0" y1="0" x2="-34" y2="30" stroke="#5B9BFF" /></g>
                <polygon points="66,0 56,-5 56,5" fill="#FF5A5A" /><polygon points="0,-68 -5,-58 5,-58" fill="#45E3A8" />
                <text x="-44" y="-52" fill="#FFC15C" style="font: 12px 'JetBrains Mono', monospace">/World/envs/env_0/Robot</text>
              </template>
            </g>
          </svg>
</template>
<style scoped>
.sm-scene { position: absolute; inset: 0; width: 100%; height: 100%; }
.bob { animation: sm-bob 3.2s ease-in-out infinite; } @keyframes sm-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
</style>
