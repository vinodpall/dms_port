<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import BrandMark from '@/components/BrandMark.vue'
import { MODULES, PLATFORM, type ModuleDef } from '@/constants'
import { usePop, usePortal } from '@/composables/entry'
import './cyber.css'

const { session, greet, ok, enter, logout } = usePortal()
const { open, root } = usePop()

/* ---------- 舞台几何：优化尺寸避免遮挡 ---------- */
const STAGE_W = 1600
const STAGE_H = 1000

/** 五边形中心（居中并下移，留出更多顶部空间） */
const CX = STAGE_W / 2
const CY = 550

/** 五边形外接圆半径 - 放大确保对称和清晰 */
const R = 380

/** 五个顶点（六边形插画的中心）：从正上方开始逆时针每 72° 一个 */
const POINTS = Array.from({ length: 5 }, (_, i) => {
  const a = ((-90 + i * 72) * Math.PI) / 180
  return { x: +(CX + R * Math.cos(a)).toFixed(1), y: +(CY + R * Math.sin(a)).toFixed(1) }
})

/** 节点盒定位：以插画中心为锚点 */
const slots = POINTS.map(p => ({ left: `${p.x}px`, top: `${p.y}px` }))

/** 连接五个顶点的五边形路径 */
const linkPath = `M ${POINTS.map(p => `${p.x} ${p.y}`).join(' L ')} Z`

/** 中心枢纽射向五个顶点的连线 */
const SPOKES = POINTS.map(p => `M ${CX} ${CY} L ${p.x} ${p.y}`)

const HEADS = ['ROBOT DEVICE', 'ROBOT BUSINESS', 'DATA COLLECTION', 'SIMULATION', 'TRAINING GROUND']

const todayLabel = computed(() => {
  const d = new Date()
  const w = '日一二三四五六'[d.getDay()]
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} 星期${w}`
})

/* ---------- 自适应缩放 ---------- */
const scale = ref(1)
const wrapEl = ref<HTMLElement | null>(null)
let ro: ResizeObserver | null = null

const fit = () => {
  const w = wrapEl.value?.clientWidth ?? 0
  const h = wrapEl.value?.clientHeight ?? 0
  if (w < 40 || h < 40) return
  scale.value = Math.min(w / STAGE_W, h / STAGE_H) * 0.95
}

onMounted(() => {
  fit()
  if (wrapEl.value) {
    ro = new ResizeObserver(fit)
    ro.observe(wrapEl.value)
  }
  window.addEventListener('resize', fit)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  window.removeEventListener('resize', fit)
})

/* ---------- 每个模块专属的动态插画 ---------- */
const ICONS: Record<string, string> = {
  device: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="d-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A5F7A"/><stop offset="1" stop-color="#14364B"/></linearGradient>
      <radialGradient id="d-g"><stop offset="0" stop-color="#4DD0E1" stop-opacity=".95"/><stop offset="1" stop-color="#26C6DA" stop-opacity="0"/></radialGradient>
    </defs>
    <ellipse cx="60" cy="102" rx="30" ry="5" fill="#4DD0E1" opacity=".18"/>
    <line x1="60" y1="62" x2="60" y2="48" stroke="#4DD0E1" stroke-width="1.6"/>
    <circle cx="60" cy="45" r="4" fill="url(#d-g)"><animate attributeName="r" values="3;6;3" dur="1.8s" repeatCount="indefinite"/></circle>
    <rect x="44" y="62" width="32" height="30" rx="5" fill="url(#d-b)" stroke="#4DD0E1" stroke-width="1.4"/>
    <circle cx="53" cy="74" r="3" fill="#4DD0E1"><animate attributeName="opacity" values="1;.25;1" dur="2s" repeatCount="indefinite"/></circle>
    <circle cx="67" cy="74" r="3" fill="#4DD0E1"><animate attributeName="opacity" values="1;.25;1" dur="2s" begin=".5s" repeatCount="indefinite"/></circle>
    <path d="M52 86 h16" stroke="#4DD0E1" stroke-width="1.2" opacity=".55"/>
    <rect x="33" y="70" width="7" height="16" rx="2.5" fill="url(#d-b)" stroke="#4DD0E1" stroke-width="1.1"/>
    <rect x="80" y="70" width="7" height="16" rx="2.5" fill="url(#d-b)" stroke="#4DD0E1" stroke-width="1.1"/>
    <g opacity=".75">
      <circle cx="26" cy="46" r="2" fill="#26C6DA"><animate attributeName="cy" values="52;36;52" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite"/></circle>
      <circle cx="95" cy="58" r="2" fill="#26C6DA"><animate attributeName="cy" values="64;48;64" dur="3.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur="3.4s" repeatCount="indefinite"/></circle>
    </g>
  </svg>`,

  biz: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="b-p" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#14364B"/><stop offset="1" stop-color="#2A5F7A"/></linearGradient>
    </defs>
    <path d="M22 60 H48 V34 H98" fill="none" stroke="url(#b-p)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M48 60 V86 H98" fill="none" stroke="url(#b-p)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="22" cy="60" r="8" fill="#14364B" stroke="#4DD0E1" stroke-width="1.4"/>
    <circle cx="22" cy="60" r="3" fill="#4DD0E1"/>
    <circle cx="48" cy="34" r="6" fill="#1E4A62" stroke="#4DD0E1" stroke-width="1.4"><animate attributeName="r" values="6;7.5;6" dur="2s" repeatCount="indefinite"/></circle>
    <circle cx="48" cy="86" r="6" fill="#1E4A62" stroke="#4DD0E1" stroke-width="1.4"><animate attributeName="r" values="6;7.5;6" dur="2s" begin=".5s" repeatCount="indefinite"/></circle>
    <circle cx="98" cy="34" r="8" fill="#14364B" stroke="#4DD0E1" stroke-width="1.4"/>
    <circle cx="98" cy="86" r="8" fill="#14364B" stroke="#4DD0E1" stroke-width="1.4"/>
    <circle cx="22" cy="60" r="2.6" fill="#4DD0E1"><animate attributeName="cx" values="22;48;98" dur="3.2s" repeatCount="indefinite"/><animate attributeName="cy" values="60;34;34" dur="3.2s" repeatCount="indefinite"/></circle>
    <circle cx="22" cy="60" r="2.6" fill="#26C6DA"><animate attributeName="cx" values="22;48;98" dur="3.2s" begin="1.6s" repeatCount="indefinite"/><animate attributeName="cy" values="60;86;86" dur="3.2s" begin="1.6s" repeatCount="indefinite"/></circle>
  </svg>`,

  collect: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="c-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A5F7A"/><stop offset="1" stop-color="#14364B"/></linearGradient>
    </defs>
    <ellipse cx="60" cy="86" rx="34" ry="11" fill="#14364B" stroke="#4DD0E1" stroke-width="1.3"/>
    <rect x="26" y="42" width="68" height="44" fill="url(#c-d)"/>
    <ellipse cx="60" cy="42" rx="34" ry="11" fill="#2A5F7A" stroke="#4DD0E1" stroke-width="1.3"/>
    <line x1="26" y1="42" x2="26" y2="86" stroke="#4DD0E1" stroke-width="1.3"/>
    <line x1="94" y1="42" x2="94" y2="86" stroke="#4DD0E1" stroke-width="1.3"/>
    <ellipse cx="60" cy="56" rx="34" ry="11" fill="none" stroke="#4DD0E1" stroke-width=".9" opacity=".4"/>
    <ellipse cx="60" cy="71" rx="34" ry="11" fill="none" stroke="#4DD0E1" stroke-width=".9" opacity=".4"/>
    <circle cx="60" cy="50" r="2" fill="#4DD0E1"><animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite"/></circle>
    <circle cx="60" cy="64" r="2" fill="#4DD0E1"><animate attributeName="opacity" values="0;1;0" dur="2s" begin=".6s" repeatCount="indefinite"/></circle>
    <circle cx="60" cy="78" r="2" fill="#4DD0E1"><animate attributeName="opacity" values="0;1;0" dur="2s" begin="1.2s" repeatCount="indefinite"/></circle>
    <g opacity=".8">
      <path d="M60 26 v-12" stroke="#4DD0E1" stroke-width="1.2" stroke-dasharray="2 3" opacity=".6"/>
      <circle cx="60" cy="12" r="2.4" fill="#4DD0E1"><animate attributeName="opacity" values="1;.2;1" dur="1.6s" repeatCount="indefinite"/></circle>
    </g>
  </svg>`,

  sim: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="s-c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2A5F7A"/><stop offset="1" stop-color="#14364B"/></linearGradient>
    </defs>
    <path d="M60 30 L88 45 L88 75 L60 90 L32 75 L32 45 Z" fill="url(#s-c)" stroke="#4DD0E1" stroke-width="1.4"/>
    <path d="M60 30 V60" stroke="#4DD0E1" stroke-width="1.2" opacity=".5"/>
    <path d="M88 45 L60 60 L32 45" fill="none" stroke="#4DD0E1" stroke-width="1.2" opacity=".5"/>
    <path d="M60 60 L60 90" stroke="#4DD0E1" stroke-width="1.2" opacity=".5"/>
    <g>
      <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="9s" repeatCount="indefinite"/>
      <circle cx="60" cy="42" r="2.6" fill="#4DD0E1"/>
      <circle cx="76" cy="51" r="2.6" fill="#26C6DA"/>
      <circle cx="44" cy="51" r="2.6" fill="#26C6DA"/>
    </g>
    <ellipse cx="60" cy="97" rx="26" ry="5" fill="#4DD0E1" opacity=".16"><animate attributeName="rx" values="26;30;26" dur="3s" repeatCount="indefinite"/></ellipse>
  </svg>`,

  scene: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="m-m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2A5F7A"/><stop offset="1" stop-color="#14364B"/></linearGradient>
    </defs>
    <ellipse cx="60" cy="86" rx="34" ry="7" fill="#4DD0E1" opacity=".12"><animate attributeName="rx" values="34;38;34" dur="4s" repeatCount="indefinite"/></ellipse>
    <path d="M60 32 L100 54 L60 76 L20 54 Z" fill="url(#m-m)" stroke="#4DD0E1" stroke-width="1.4"/>
    <path d="M80 43 L40 65 M40 43 L80 65" fill="none" stroke="#4DD0E1" stroke-width=".7" opacity=".3"/>
    <path d="M34 50 L52 60 L70 50 L86 58" fill="none" stroke="#4DD0E1" stroke-width="1.3" stroke-dasharray="2 3" opacity=".75"/>
    <circle cx="34" cy="50" r="3" fill="#4DD0E1"><animate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite"/></circle>
    <circle cx="52" cy="60" r="3" fill="#4DD0E1"><animate attributeName="opacity" values="1;.3;1" dur="2s" begin=".6s" repeatCount="indefinite"/></circle>
    <circle cx="70" cy="50" r="3" fill="#4DD0E1"><animate attributeName="opacity" values="1;.3;1" dur="2s" begin="1.2s" repeatCount="indefinite"/></circle>
    <line x1="86" y1="58" x2="86" y2="42" stroke="#4DD0E1" stroke-width="1.3"/>
    <path d="M86 42 h13 l-4 4.5 4 4.5 h-13 z" fill="#4DD0E1" opacity=".9">
      <animate attributeName="opacity" values="1;.45;1" dur="2.2s" repeatCount="indefinite"/>
    </path>
    <circle cx="86" cy="58" r="4" fill="none" stroke="#4DD0E1" stroke-width="1.2"><animate attributeName="r" values="3;6.5;3" dur="2.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.25;1" dur="2.2s" repeatCount="indefinite"/></circle>
  </svg>`
}

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
    <div class="cy-vignette" />
    <div class="cy-scan" />
    <div class="cy-halo" />

    <header class="cy-top">
      <div class="cy-brand"><BrandMark /><div><b>{{ PLATFORM.name }}</b><small>{{ PLATFORM.en }}</small></div></div>
      <div class="cy-top-right">
        <span class="cy-date">{{ todayLabel }}</span>
        <div ref="root" class="cy-user">
          <button type="button" class="cy-ubtn" aria-haspopup="menu" :aria-expanded="open" @click="open = !open">
            <span class="av">{{ session.info.init }}</span><span>{{ session.info.user }}<small>{{ session.info.name }}</small></span><AppIcon name="down" size="sm" />
          </button>
          <div v-if="open" class="cy-menu" role="menu"><button type="button" role="menuitem" @click="logout"><AppIcon name="logout" size="sm" />退出登录</button></div>
        </div>
      </div>
    </header>

    <main ref="wrapEl" class="cy-wrap">
      <div class="cy-stage" :style="stageStyle">
        <!-- 舞台连线层 -->
        <svg class="cy-link" :viewBox="`0 0 ${STAGE_W} ${STAGE_H}`" aria-hidden="true">
          <path :d="linkPath" fill="none" stroke="#4DD0E1" stroke-width="1.4" stroke-dasharray="7 9" opacity=".26" />
          <path :d="linkPath" fill="none" stroke="#4DD0E1" stroke-width=".7" opacity=".1" />
          <circle v-for="(p, i) in POINTS" :key="`circle-${i}`" :cx="p.x" :cy="p.y" r="58" fill="none" stroke="#4DD0E1" stroke-width=".9" opacity=".1" />
          <!-- 沿边流动的数据点 -->
          <circle r="3.2" fill="#4DD0E1" opacity=".9">
            <animateMotion dur="7s" repeatCount="indefinite" :path="linkPath" begin="0s" />
          </circle>
          <circle r="2.6" fill="#26C6DA" opacity=".85">
            <animateMotion dur="7s" repeatCount="indefinite" :path="linkPath" begin="-2.4s" />
          </circle>
          <circle r="2.6" fill="#26C6DA" opacity=".85">
            <animateMotion dur="7s" repeatCount="indefinite" :path="linkPath" begin="-4.8s" />
          </circle>
        </svg>

        <!-- 中心枢纽 -->
        <div class="cy-core" :style="{ left: `${CX}px`, top: `${CY}px` }">
          <span class="core-ring r1" />
          <span class="core-ring r2" />
          <span class="core-ring r3" />
          <span class="core-dot" />
        </div>

        <!-- 五大模块 -->
        <button
          v-for="(m, i) in MODULES"
          :key="m.key"
          type="button"
          class="mod-node"
          :class="{ disabled: !ok(m) }"
          :style="slots[i]"
          :aria-disabled="!ok(m)"
          @click="enter(m)"
        >
          <span class="node-plate">
            <span class="node-art" v-html="iconOf(m)" />
            <span class="node-hint">{{ HEADS[i] }}</span>
          </span>
          <span class="node-title">{{ m.title }}</span>
          <span class="node-en">{{ m.en }}</span>
          <span class="node-status" :class="statusClass(m)">{{ statusText(m) }}</span>
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.cy-portal { display: flex; flex-direction: column; height: 100vh; overflow: hidden; position: relative; }

/* 背景暗角：让点阵向四周淡出 */
.cy-vignette { position: absolute; inset: 0; pointer-events: none; z-index: 1;
  background: radial-gradient(1400px 900px at 50% 46%, transparent 22%, rgba(4,12,21,.55) 62%, rgba(4,12,21,.92) 100%); }

/* 顶栏 */
.cy-top { display: flex; align-items: center; justify-content: space-between; padding: 14px 36px; background: rgba(15,30,46,.9); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(77,208,225,.3); position: relative; z-index: 10; flex: none; }
.cy-top::after { content: ''; position: absolute; bottom: -1px; left: 0; width: 100%; height: 1px; background: linear-gradient(90deg, transparent, var(--cyan) 50%, transparent); }
.cy-top-right { display: flex; align-items: center; gap: 24px; }
.cy-date { font: 13px var(--mono); color: var(--muted); letter-spacing: 0.5px; }
.cy-user { position: relative; }
.cy-ubtn { display: flex; align-items: center; gap: 9px; height: 38px; padding: 0 12px 0 4px; border: 1px solid rgba(77,208,225,.35); border-radius: 7px; background: rgba(77,208,225,.08); transition: all .25s; cursor: pointer; }
.cy-ubtn:hover { border-color: var(--cyan); background: rgba(77,208,225,.16); box-shadow: 0 0 12px rgba(77,208,225,.25); }
.cy-ubtn small { display: block; color: var(--muted); font-size: 11.5px; }
.av { width: 30px; height: 30px; border-radius: 6px; display: grid; place-items: center; background: linear-gradient(135deg, var(--cyan-dk), var(--cyan-br)); color: #0B1929; font-weight: 600; font-size: 12px; box-shadow: 0 0 10px rgba(77,208,225,.5); }
.cy-menu { position: absolute; right: 0; top: 46px; min-width: 145px; padding: 5px; border-radius: 7px; background: var(--glass); backdrop-filter: blur(12px); border: 1px solid rgba(77,208,225,.4); box-shadow: 0 12px 32px rgba(0,0,0,.6); z-index: 5; }
.cy-menu button { display: flex; align-items: center; gap: 7px; width: 100%; padding: 7px 11px; border: 0; border-radius: 5px; background: none; font-size: 13.5px; cursor: pointer; }
.cy-menu button:hover { background: rgba(77,208,225,.22); color: var(--cyan); }

/* 中心光晕 */
.cy-halo { position: absolute; inset: 0; pointer-events: none; z-index: 1;
  background: radial-gradient(760px 520px at 50% 48%, rgba(77,208,225,.13), transparent 68%); }

/* 舞台容器 */
.cy-wrap { flex: 1; min-height: 0; position: relative; z-index: 2; overflow: hidden; }
.cy-stage { position: absolute; left: 50%; top: 50%; transform-origin: center center; }

/* 连线层 */
.cy-link { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.cy-link path { animation: cy-dash 9s linear infinite; }
@keyframes cy-dash { to { stroke-dashoffset: -160; } }

/* 中心枢纽 */
.cy-core { position: absolute; width: 0; height: 0; }
.core-ring { position: absolute; border-radius: 50%; transform: translate(-50%, -50%); }
.core-ring.r1 { width: 300px; height: 300px; border: 1px dashed rgba(77,208,225,.3); animation: cy-spin 26s linear infinite; }
.core-ring.r2 { width: 186px; height: 186px; border: 1px solid rgba(77,208,225,.22); border-top-color: rgba(77,208,225,.7); animation: cy-spin 8s linear infinite reverse; }
.core-ring.r3 { width: 104px; height: 104px; border: 1px solid rgba(77,208,225,.3); animation: cy-pulse-ring 3.4s ease-in-out infinite; }
@keyframes cy-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
@keyframes cy-pulse-ring { 0%, 100% { opacity: .45; transform: translate(-50%, -50%) scale(.94); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.06); } }
.core-dot { position: absolute; left: 50%; top: 50%; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; background: var(--cyan); box-shadow: 0 0 22px 6px rgba(77,208,225,.75); animation: cy-core-beat 2.6s ease-in-out infinite; }
@keyframes cy-core-beat { 0%, 100% { opacity: .6; transform: scale(.85); } 50% { opacity: 1; transform: scale(1.15); } }

/* 模块节点 - 优化尺寸避免遮挡 */
.mod-node { position: absolute; width: 300px; height: 320px; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 0; border: 0; background: none; text-align: center; cursor: pointer; }

.node-plate { position: relative; width: 200px; height: 230px; display: grid; place-items: center; flex: none;
  transition: transform .45s cubic-bezier(.34,1.56,.64,1), filter .45s; }
.node-plate::before,
.node-plate::after { content: ''; position: absolute; clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); }
.node-plate::before { inset: 0; background: linear-gradient(160deg, rgba(77,208,225,.6), rgba(38,198,218,.12)); transition: background .45s; }
.node-plate::after { inset: 2.6px; background: linear-gradient(180deg, rgba(13,30,47,.95), rgba(8,19,31,.95)); }
.node-art { position: relative; z-index: 2; width: 172px; height: 172px; display: block; }
.node-art :deep(svg) { width: 100%; height: 100%; display: block; filter: drop-shadow(0 8px 20px rgba(77,208,225,.5)); transition: filter .45s; }

/* 六边形底部英文小标 */
.node-hint { position: absolute; z-index: 3; bottom: 14px; left: 0; right: 0; text-align: center; font: 10px/1 var(--mono); letter-spacing: 1.2px; color: rgba(77,208,225,.5); transition: color .35s; }

.node-title { font-size: 21px; font-weight: 600; line-height: 1.3; color: var(--ink); letter-spacing: 0.8px; transition: color .35s, text-shadow .35s; }
.node-en { font-size: 11px; letter-spacing: 1.8px; text-transform: uppercase; color: var(--dim); transition: color .35s; }

.node-status { margin-top: 4px; padding: 5px 15px; border-radius: 15px; font-size: 12px; font-weight: 600; letter-spacing: 0.8px; white-space: nowrap; }
.node-status.on { background: rgba(77,208,225,.16); color: var(--cyan); border: 1px solid rgba(77,208,225,.85); box-shadow: 0 0 12px rgba(77,208,225,.35); }
.node-status.wait { background: rgba(255,193,7,.14); color: #FFD54F; border: 1px solid rgba(255,193,7,.55); }
.node-status.off { background: rgba(239,83,80,.14); color: #FFCDD2; border: 1px solid rgba(239,83,80,.5); }

/* 交互 */
.mod-node:not(.disabled):hover .node-plate { transform: translateY(-7px) scale(1.07); filter: drop-shadow(0 0 24px rgba(77,208,225,.85)); }
.mod-node:not(.disabled):hover .node-plate::before { background: linear-gradient(160deg, var(--cyan), var(--cyan-br)); }
.mod-node:not(.disabled):hover .node-art :deep(svg) { filter: drop-shadow(0 0 20px rgba(77,208,225,1)); }
.mod-node:not(.disabled):hover .node-hint { color: rgba(77,208,225,.95); }
.mod-node:not(.disabled):hover .node-title { color: var(--cyan); text-shadow: 0 0 20px rgba(77,208,225,.9); }
.mod-node:not(.disabled):hover .node-en { color: var(--muted); }
.mod-node:not(.disabled):active .node-plate { transform: translateY(-2px) scale(1.02); }
.mod-node.disabled { cursor: not-allowed; opacity: .45; }
.mod-node:focus-visible .node-plate { filter: drop-shadow(0 0 20px rgba(77,208,225,.95)); }

/* 窄屏：回落为纵向列表 */
@media (max-width: 900px) {
  .cy-portal { height: auto; min-height: 100vh; overflow: visible; }
  .cy-vignette, .cy-halo { position: fixed; }
  .cy-brand small, .cy-ubtn small { display: none; }
  .cy-date { display: none; }
  .cy-wrap { overflow: visible; }
  .cy-stage { position: static; transform: none !important; width: auto !important; height: auto !important; padding: 24px 20px 44px; display: flex; flex-direction: column; gap: 16px; }
  .cy-link, .cy-core { display: none; }
  .mod-node { position: static; transform: none !important; width: 100%; max-width: 340px; height: auto; margin: 0 auto;
    display: grid; grid-template-columns: 84px 1fr; grid-template-rows: auto auto auto; align-items: center; column-gap: 16px; text-align: left;
    padding: 14px 18px; border: 1px solid rgba(77,208,225,.3); border-radius: 10px; background: var(--glass); }
  .node-plate { width: 84px; height: 97px; grid-row: 1 / span 3; }
  .node-art { width: 72px; height: 72px; }
  .node-hint { display: none; }
  .node-title, .node-en, .node-status { justify-self: start; grid-column: 2; }
  .node-title { font-size: 17px; }
  .node-status { margin-top: 4px; }
}

@media (prefers-reduced-motion: reduce) {
  .cy-link path, .core-ring, .core-dot { animation: none; }
}
</style>
