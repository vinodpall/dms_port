<script setup lang="ts">
/** 配色方案预览：用「机器人设备管理 · 设备概览」页实景对比 */
import { computed, onBeforeUnmount, provide, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DeviceView from '@/views/proto/DeviceView.vue'
import { buildTheme } from '@/theme'
import { PALETTES, paletteTheme, contrast, type Palette } from './palettes'

const route = useRoute()
const router = useRouter()
const cur = computed(() => PALETTES.find((p) => p.key === route.params.p) ?? PALETTES[0])
const pick = (k: string) => router.replace({ name: 'palette', params: { p: k } })
const theme = computed(() => paletteTheme(cur.value, buildTheme(true)))
provide('pal-chart', computed(() => cur.value.chart))

const BASE: Record<string, string> = { '--surface': '#0C1E30', '--bg': '#071523', '--text': '#E6F7FB', '--muted': '#8FB3C7', '--faint': '#5B7486', '--accent': '#26C6DA', '--accent2': '#2F6BFF', '--ok': '#4DE8B0', '--warn': '#FFB74D', '--bad': '#FF6B6B' }
const val = (p: Palette, k: string) => p.vars[k] ?? BASE[k]
const swatches = (p: Palette) => ['--bg', '--surface', '--accent', '--accent2', '--ok', '--warn', '--bad'].map((k) => val(p, k))
const checks = computed(() => {
  const p = cur.value, s = val(p, '--surface')
  return [
    { l: '正文', r: contrast(val(p, '--text'), s), need: 4.5 },
    { l: '次要文字', r: contrast(val(p, '--muted'), s), need: 4.5 },
    { l: '弱提示', r: contrast(val(p, '--faint'), s), need: 3 },
  ]
})

const el = document.createElement('style')
document.head.appendChild(el)
watchEffect(() => {
  const v = cur.value.vars
  el.textContent = `.pal-stage .pp{${Object.entries(v).map(([k, x]) => `${k}:${x}`).join(';')}}`
})
onBeforeUnmount(() => el.remove())
</script>

<template>
  <div class="pal">
    <header class="pal-bar">
      <div class="pal-t"><b>配色方案预览</b><small>机器人设备管理 · 设备概览</small></div>
      <div class="pal-opts">
        <button v-for="p in PALETTES" :key="p.key" type="button" :class="{ on: p.key === cur.key }" @click="pick(p.key)">
          <span class="sw"><i v-for="(c, i) in swatches(p)" :key="i" :style="{ background: c }" /></span>
          <span class="nm">{{ p.name }}</span>
        </button>
      </div>
      <div class="pal-chk">
        <span v-for="c in checks" :key="c.l" :class="{ bad: c.r < c.need }" :title="`WCAG AA 要求 ≥ ${c.need}:1`">{{ c.l }} <b>{{ c.r.toFixed(1) }}:1</b></span>
      </div>
    </header>
    <p class="pal-desc">{{ cur.desc }}</p>
    <a-config-provider :theme="theme">
      <div class="pal-stage" :data-p="cur.key"><DeviceView :key="cur.key" /></div>
    </a-config-provider>
  </div>
</template>

<style scoped>
.pal { height: 100vh; display: flex; flex-direction: column; background: #0B0F14; color: #E8EDF2; font-size: 13px; }
.pal-bar { flex: none; display: flex; align-items: center; gap: 20px; padding: 10px 20px 6px; }
.pal-t { display: flex; flex-direction: column; line-height: 1.3; }
.pal-t b { font-size: 15px; } .pal-t small { color: #9AA6B2; }
.pal-opts { display: flex; gap: 8px; }
.pal-opts button { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 6px; border: 1px solid #2A333D; background: #141A21; color: #C9D2DB; cursor: pointer; font: inherit; }
.pal-opts button:hover { border-color: #4A5866; }
.pal-opts button.on { border-color: #5AB8FF; background: #16263A; color: #fff; }
.sw { display: flex; } .sw i { width: 12px; height: 18px; } .sw i:first-child { border-radius: 3px 0 0 3px; } .sw i:last-child { border-radius: 0 3px 3px 0; }
.pal-chk { margin-left: auto; display: flex; gap: 8px; }
.pal-chk span { padding: 3px 8px; border-radius: 4px; background: rgba(46,204,113,.12); color: #8BE3AE; }
.pal-chk span.bad { background: rgba(255,107,107,.14); color: #FF9C9C; }
.pal-desc { margin: 0; padding: 0 20px 10px; color: #9AA6B2; }
.pal-stage { flex: 1; min-height: 0; border-top: 1px solid #222A33; }
.pal-stage :deep(.pp) { height: 100%; }
</style>