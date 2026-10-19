<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import BrandMark from '@/components/BrandMark.vue'
import { MODULES, PLATFORM, type ModuleDef } from '@/constants'
import { useClock, usePop, usePortal } from '@/composables/entry'
import { ICONS } from './art'
import './cyber.css'

const { session, ok, enter, logout } = usePortal()
const { open, root } = usePop()
const { time, now } = useClock()

/* ---------- 舞台几何 ---------- */
const STAGE_W = 1600
const STAGE_H = 1000
const CX = STAGE_W / 2
const CY = 505
/** 五边形外接圆半径 */
const R = 345
/** 六边形底板尺寸（节点以底板中心对齐五边形顶点） */
const PLATE_H = 208

const POINTS = Array.from({ length: 5 }, (_, i) => {
  const a = ((-90 + i * 72) * Math.PI) / 180
  return { x: +(CX + R * Math.cos(a)).toFixed(1), y: +(CY + R * Math.sin(a)).toFixed(1) }
})
const slots = POINTS.map((p) => ({ left: `${p.x}px`, top: `${p.y}px` }))
const linkPath = `M ${POINTS.map((p) => `${p.x} ${p.y}`).join(' L ')} Z`
const SPOKES = POINTS.map((p) => `M ${CX} ${CY} L ${p.x} ${p.y}`)

/** 中心仪表盘刻度 */
const TICKS = Array.from({ length: 72 }, (_, i) => {
  const a = (i * 5 * Math.PI) / 180
  const r1 = i % 6 === 0 ? 128 : 134
  const r2 = 140
  return { x1: CX + r1 * Math.cos(a), y1: CY + r1 * Math.sin(a), x2: CX + r2 * Math.cos(a), y2: CY + r2 * Math.sin(a), major: i % 6 === 0 }
})
const hexPts = (r: number) => Array.from({ length: 6 }, (_, i) => {
  const a = ((-90 + i * 60) * Math.PI) / 180
  return `${(CX + r * Math.cos(a)).toFixed(1)},${(CY + r * Math.sin(a)).toFixed(1)}`
}).join(' ')

const dateLabel = computed(() => {
  const d = now.value
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} 星期${'日一二三四五六'[d.getDay()]}`
})

/* ---------- 自适应缩放 ---------- */
const scale = ref(1)
const wrapEl = ref<HTMLElement | null>(null)
let ro: ResizeObserver | null = null
const fit = () => {
  const w = wrapEl.value?.clientWidth ?? 0
  const h = wrapEl.value?.clientHeight ?? 0
  if (w < 40 || h < 40) return
  scale.value = Math.min(w / STAGE_W, h / STAGE_H) * 0.96
}
onMounted(() => {
  fit()
  if (wrapEl.value) { ro = new ResizeObserver(fit); ro.observe(wrapEl.value) }
})
onBeforeUnmount(() => ro?.disconnect())

const iconOf = (m: ModuleDef) => ICONS[m.key] ?? ICONS.device
const statusText = (m: ModuleDef) => (!ok(m) ? '无权限' : m.url ? '在线' : '待接入')
const statusClass = (m: ModuleDef) => (!ok(m) ? 'off' : m.url ? 'on' : 'wait')

const stageStyle = computed(() => ({
  width: `${STAGE_W}px`,
  height: `${STAGE_H}px`,
  transform: `translate(-50%, -50%) scale(${scale.value})`,
}))
</script>

<template>
  <div class="cy cy-portal">
    <div class="cy-bgfx" aria-hidden="true" />
    <div class="cy-floor" aria-hidden="true" />
    <div class="cy-glow" aria-hidden="true" />

    <header class="cy-top">
      <div class="cy-brand"><BrandMark /><div><b>{{ PLATFORM.name }}</b><small>{{ PLATFORM.en }}</small></div></div>
      <div class="cy-top-right">
        <span class="cy-clock"><b>{{ time }}</b><small>{{ dateLabel }}</small></span>
        <div ref="root" class="cy-user">
          <button type="button" class="cy-ubtn" aria-haspopup="menu" :aria-expanded="open" @click="open = !open">
            <span class="av">{{ session.info.init }}</span>
            <span class="who">{{ session.info.user }}<small>{{ session.info.name }}</small></span>
            <AppIcon name="down" size="sm" />
          </button>
          <div v-if="open" class="cy-menu" role="menu"><button type="button" role="menuitem" @click="logout"><AppIcon name="logout" size="sm" />退出登录</button></div>
        </div>
      </div>
    </header>

    <main ref="wrapEl" class="cy-wrap">
      <div class="cy-frame" aria-hidden="true"><span class="cy-corner tl" /><span class="cy-corner tr" /><span class="cy-corner bl" /><span class="cy-corner br" /></div>
      <div class="cy-stage" :style="stageStyle">
        <!-- 连线与中心仪表 -->
        <svg class="cy-link" :viewBox="`0 0 ${STAGE_W} ${STAGE_H}`" aria-hidden="true">
          <defs>
            <radialGradient id="pt-halo"><stop offset="0" stop-color="#4DD0E1" stop-opacity=".22" /><stop offset="1" stop-color="#4DD0E1" stop-opacity="0" /></radialGradient>
            <linearGradient id="pt-spoke" gradientUnits="userSpaceOnUse" :x1="CX" :y1="CY" :x2="CX" :y2="CY - R">
              <stop offset="0" stop-color="#4DD0E1" stop-opacity=".7" /><stop offset="1" stop-color="#4DD0E1" stop-opacity=".08" />
            </linearGradient>
          </defs>
          <circle :cx="CX" :cy="CY" r="420" fill="url(#pt-halo)" />
          <circle :cx="CX" :cy="CY" :r="R" fill="none" stroke="#4DD0E1" stroke-width="1" opacity=".07" />
          <circle :cx="CX" :cy="CY" :r="R + 60" fill="none" stroke="#4DD0E1" stroke-width="1" stroke-dasharray="2 10" opacity=".14" />

          <!-- 五边形外框 -->
          <path :d="linkPath" fill="rgba(77,208,225,.025)" stroke="#4DD0E1" stroke-width="1" opacity=".22" />
          <path class="flow" :d="linkPath" fill="none" stroke="#4DD0E1" stroke-width="1.6" stroke-dasharray="40 260" opacity=".7" />

          <!-- 中心辐射线 + 数据脉冲 -->
          <g v-for="(d, i) in SPOKES" :key="`s-${i}`">
            <path :d="d" stroke="#4DD0E1" stroke-width="1" stroke-dasharray="3 6" opacity=".35" />
            <circle r="3" fill="#7FF3FF" opacity="0">
              <animateMotion :path="d" dur="3.2s" :begin="`${i * 0.64}s`" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;1;1;0" dur="3.2s" :begin="`${i * 0.64}s`" repeatCount="indefinite" />
            </circle>
          </g>

          <!-- 中心仪表盘 -->
          <g class="gauge">
            <line v-for="(t, i) in TICKS" :key="`t-${i}`" :x1="t.x1" :y1="t.y1" :x2="t.x2" :y2="t.y2" stroke="#4DD0E1" :stroke-width="t.major ? 1.6 : .8" :opacity="t.major ? .7 : .3" />
          </g>
          <circle class="spin-r" :cx="CX" :cy="CY" r="112" fill="none" stroke="#4DD0E1" stroke-width="2" stroke-dasharray="120 232" opacity=".55" />
          <circle :cx="CX" :cy="CY" r="96" fill="rgba(6,18,30,.85)" stroke="#4DD0E1" stroke-width="1" opacity=".9" />
          <polygon :points="hexPts(70)" fill="none" stroke="#4DD0E1" stroke-width="1.2" opacity=".5" />
          <polygon :points="hexPts(54)" fill="rgba(77,208,225,.08)" stroke="#4DD0E1" stroke-width="1" opacity=".35" />
          <circle class="beat" :cx="CX" :cy="CY" r="8" fill="#4DD0E1" />
        </svg>

        <!-- 五大模块 -->
        <button
          v-for="(m, i) in MODULES"
          :key="m.key"
          type="button"
          class="mod-node"
          :class="{ disabled: !ok(m) }"
          :style="{ ...slots[i], '--ph': `${PLATE_H}px`, '--d': `${i * 90}ms` }"
          :aria-disabled="!ok(m)"
          @click="enter(m)"
        >
          <span class="node-plate">
            <span class="node-ring" />
            <span class="node-art" v-html="iconOf(m)" />
          </span>
          <span class="node-meta">
            <span class="node-title">{{ m.title }}</span>
            <span class="node-en">{{ m.en }}</span>
            <span class="node-status" :class="statusClass(m)">
              <AppIcon v-if="!ok(m)" name="lock" size="sm" /><i v-else />{{ statusText(m) }}
            </span>
          </span>
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.cy-portal { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
.cy-portal { --bg: #06111D; }
/* 背景：中心提亮的深海军蓝 + 双层网格（细格 + 主格），边缘渐隐 */
.cy-bgfx { position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background:
    linear-gradient(rgba(77,208,225,.11) 1px, transparent 1px) -1px -1px / 200px 200px,
    linear-gradient(90deg, rgba(77,208,225,.11) 1px, transparent 1px) -1px -1px / 200px 200px,
    linear-gradient(rgba(77,208,225,.05) 1px, transparent 1px) -1px -1px / 40px 40px,
    linear-gradient(90deg, rgba(77,208,225,.05) 1px, transparent 1px) -1px -1px / 40px 40px,
    radial-gradient(ellipse 75% 70% at 50% 50%, #0F2C45 0%, #0A1E31 45%, #06111D 100%);
  -webkit-mask-image: radial-gradient(ellipse 85% 80% at 50% 50%, #000 55%, rgba(0,0,0,.55) 100%);
          mask-image: radial-gradient(ellipse 85% 80% at 50% 50%, #000 55%, rgba(0,0,0,.55) 100%); }
/* 中心光晕 + 底部地平线辉光 */
.cy-glow { position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background:
    radial-gradient(900px 600px at 50% 55%, rgba(38,170,220,.16), transparent 70%),
    radial-gradient(1400px 260px at 50% 100%, rgba(38,170,220,.18), transparent 70%); }
.cy-portal .cy-floor { height: 36vh; opacity: .55; }

/* 视口 HUD 边框 */
.cy-frame { position: absolute; inset: 18px 24px; pointer-events: none; z-index: 0; border: 1px solid rgba(77,208,225,.08); }
.cy-frame .cy-corner { width: 22px; height: 22px; border-width: 2px; opacity: .7; }
.cy-frame::before, .cy-frame::after { content: ''; position: absolute; top: 50%; width: 3px; height: 120px; transform: translateY(-50%); background: linear-gradient(180deg, transparent, var(--cyan), transparent); opacity: .5; }
.cy-frame::before { left: -2px; } .cy-frame::after { right: -2px; }

/* 顶栏 */
.cy-top { position: relative; z-index: 10; flex: none; display: flex; align-items: center; justify-content: space-between; height: 68px; padding: 0 40px;
  background: linear-gradient(180deg, rgba(6,17,29,.9), rgba(8,22,36,.7)); backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); }
.cy-top::after { content: ''; position: absolute; left: 50%; bottom: -1px; width: 360px; height: 1px; transform: translateX(-50%); background: linear-gradient(90deg, transparent, var(--cyan), transparent); }
.cy-top-right { display: flex; align-items: center; gap: 22px; }
.cy-clock { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.25; }
.cy-clock b { font: 500 16px var(--mono); color: var(--ink); letter-spacing: 1px; }
.cy-clock small { font-size: 11px; color: var(--dim); }
.cy-user { position: relative; }
.cy-ubtn { display: flex; align-items: center; gap: 10px; height: 42px; padding: 0 12px 0 5px; border: 1px solid var(--line); border-radius: 2px; background: rgba(77,208,225,.05); cursor: pointer; transition: all .2s; }
.cy-ubtn:hover, .cy-ubtn[aria-expanded="true"] { border-color: var(--line-hi); background: rgba(77,208,225,.1); }
.cy-ubtn .who { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.25; font-size: 13.5px; }
.cy-ubtn small { color: var(--muted); font-size: 11.5px; }
.av { width: 32px; height: 32px; display: grid; place-items: center; background: linear-gradient(135deg, #12B5CB, #1E88E5); color: #fff; font-weight: 600; font-size: 13px; clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 7px 100%, 0 calc(100% - 7px)); }
.cy-menu { position: absolute; right: 0; top: 50px; min-width: 150px; padding: 5px; background: rgba(10,24,38,.96); backdrop-filter: blur(12px); border: 1px solid var(--line-hi); box-shadow: 0 16px 40px rgba(0,0,0,.6); }
.cy-menu button { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border: 0; background: none; font-size: 13.5px; cursor: pointer; }
.cy-menu button:hover { background: rgba(255,107,107,.12); color: #FFD0D0; }

/* 舞台 */
.cy-wrap { flex: 1; min-height: 0; position: relative; z-index: 2; overflow: hidden; }
.cy-stage { position: absolute; left: 50%; top: 50%; transform-origin: center center; }
.cy-link { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
.flow { animation: pt-flow 10s linear infinite; }
@keyframes pt-flow { to { stroke-dashoffset: -1500; } }
.gauge, .spin-r { transform-origin: 800px 505px; transform-box: view-box; }
.gauge { animation: pt-spin 60s linear infinite; }
.spin-r { animation: pt-spin 9s linear infinite reverse; }
@keyframes pt-spin { to { transform: rotate(360deg); } }
.beat { filter: drop-shadow(0 0 10px #4DD0E1); animation: pt-beat 2.6s ease-in-out infinite; transform-origin: 800px 505px; transform-box: view-box; }
@keyframes pt-beat { 50% { opacity: .55; transform: scale(.8); } }
.core-t { font: 11px var(--mono); letter-spacing: 3px; fill: rgba(77,208,225,.6); }

/* 模块节点：六边形底板中心 = 五边形顶点 */
.mod-node { position: absolute; width: 300px; transform: translate(-50%, calc(var(--ph) / -2)); display: flex; flex-direction: column; align-items: center; padding: 0; border: 0; background: none; text-align: center; cursor: pointer; animation: node-in .7s both var(--d); }
@keyframes node-in { from { opacity: 0; } }
.node-plate { position: relative; width: 180px; height: var(--ph); display: grid; place-items: center; transition: transform .4s cubic-bezier(.34,1.4,.64,1); }
.node-plate::before, .node-plate::after { content: ''; position: absolute; clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%); transition: background .35s, opacity .35s; }
.node-plate::before { inset: 0; background: linear-gradient(180deg, rgba(77,208,225,.75), rgba(77,208,225,.12) 60%, rgba(77,208,225,.4)); }
.node-plate::after { inset: 2px;
  background:
    radial-gradient(120px 90px at 50% 35%, rgba(77,208,225,.14), transparent 70%),
    repeating-linear-gradient(0deg, rgba(77,208,225,.04) 0 1px, transparent 1px 6px),
    linear-gradient(180deg, #123350, #0A1C2E); }
/* 内层细边六边形 */
.node-ring { position: absolute; inset: 14px; z-index: 1; clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%); background: rgba(77,208,225,.22); transition: background .35s; }
.node-ring::after { content: ''; position: absolute; inset: 1px; clip-path: inherit; background: linear-gradient(180deg, #0F2B44, #0A1D30); }
.node-art { position: relative; z-index: 2; width: 132px; height: 132px; }
.node-art :deep(svg) { width: 100%; height: 100%; display: block; filter: drop-shadow(0 6px 16px rgba(77,208,225,.45)); transition: filter .35s; }

.node-meta { position: relative; display: flex; flex-direction: column; align-items: center; margin-top: 14px; padding: 10px 26px 10px; min-width: 210px;
  background: linear-gradient(180deg, rgba(12,34,54,.92), rgba(8,24,40,.92)); border: 1px solid rgba(77,208,225,.16); backdrop-filter: blur(6px);
  clip-path: polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px);
  transition: border-color .3s, background .3s; }
.mod-node:not(.disabled):hover .node-meta { border-color: rgba(77,208,225,.45); }
.node-title { font-size: 21px; font-weight: 600; line-height: 1.3; color: var(--ink); letter-spacing: 2px; transition: color .3s, text-shadow .3s; }
.node-en { margin-top: 4px; font: 11px var(--mono); letter-spacing: 2.5px; text-transform: uppercase; color: var(--dim); }
.node-status { margin-top: 12px; display: inline-flex; align-items: center; gap: 6px; padding: 3px 12px; font-size: 12px; letter-spacing: 1px; white-space: nowrap;
  clip-path: polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%); }
.node-status i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.node-status.on { color: var(--ok); background: rgba(77,232,176,.12); }
.node-status.on i { box-shadow: 0 0 8px currentColor; animation: cy-blink 2s infinite; }
.node-status.wait { color: var(--warn); background: rgba(255,183,77,.1); }
.node-status.off { color: var(--dim); background: rgba(91,116,134,.14); }

.mod-node:not(.disabled):hover .node-plate { transform: translateY(-6px) scale(1.05); filter: drop-shadow(0 0 22px rgba(77,208,225,.55)); }
.mod-node:not(.disabled):hover .node-plate::before { background: linear-gradient(180deg, #7FF3FF, #26C6DA 60%, #1E88E5); }
.mod-node:not(.disabled):hover .node-ring { background: rgba(77,208,225,.5); }
.mod-node:not(.disabled):hover .node-art :deep(svg) { filter: drop-shadow(0 0 18px rgba(77,208,225,.95)); }
.mod-node:not(.disabled):hover .node-title { color: #7FF3FF; text-shadow: 0 0 18px rgba(77,208,225,.7); }
.mod-node:focus-visible { outline: none; }
.mod-node:focus-visible .node-plate { filter: drop-shadow(0 0 20px rgba(77,208,225,.95)); }
.mod-node.disabled { cursor: not-allowed; }
.mod-node.disabled .node-art, .mod-node.disabled .node-title, .mod-node.disabled .node-en { filter: grayscale(1); opacity: .35; }
.mod-node.disabled .node-plate::before { background: linear-gradient(180deg, rgba(120,140,155,.35), rgba(120,140,155,.08) 60%, rgba(120,140,155,.2)); }
.mod-node.disabled .node-ring { background: rgba(120,140,155,.12); }
.mod-node { isolation: isolate; }

/* 窄屏：回落为纵向列表 */
@media (max-width: 900px) {
  .cy-portal { height: auto; min-height: 100vh; overflow: visible; }
  .cy-top { padding: 0 16px; }
  .cy-brand small, .cy-clock, .cy-ubtn .who { display: none; }
  .cy-wrap { overflow: visible; }
  .cy-stage { position: static; transform: none !important; width: auto !important; height: auto !important; padding: 24px 16px 40px; display: flex; flex-direction: column; gap: 12px; }
  .cy-link, .cy-frame { display: none; }
  .mod-node { position: static; transform: none; width: 100%; max-width: 420px; margin: 0 auto; display: grid; grid-template-columns: 78px 1fr auto; grid-template-rows: auto auto; align-items: center; column-gap: 16px; text-align: left;
    padding: 14px 16px; border: 1px solid var(--line); background: var(--glass); }
  .node-plate { width: 78px; height: 90px; grid-row: 1 / span 2; }
  .node-ring { inset: 7px; }
  .node-art { width: 60px; height: 60px; }
  .node-meta { display: contents; }
  .node-meta::before { display: none; }
  .node-meta { min-width: 0; padding: 0; background: none; border: 0; clip-path: none; backdrop-filter: none; }
  .node-title { margin: 0; font-size: 17px; letter-spacing: 1px; align-self: end; }
  .node-en { margin: 0; align-self: start; grid-column: 2; }
  .node-status { margin: 0; grid-column: 3; grid-row: 1 / span 2; }
}
@media (prefers-reduced-motion: reduce) { .flow, .gauge, .spin-r, .beat, .mod-node { animation: none; } }
</style>
