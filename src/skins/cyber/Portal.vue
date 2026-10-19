<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import BrandMark from '@/components/BrandMark.vue'
import { MODULES, PLATFORM, type ModuleDef } from '@/constants'
import { useClock, usePop, usePortal } from '@/composables/entry'
import { ICONS } from './art'
import './cyber.css'

const { session, greet, ok, available, enter, logout } = usePortal()
const { open, root } = usePop()
const { time, now } = useClock()

/** 有权限的模块排在前面，保持原有相对顺序 */
const list = computed(() => {
  const idx = (m: ModuleDef) => MODULES.indexOf(m)
  return [...MODULES].sort((a, b) => Number(ok(b)) - Number(ok(a)) || idx(a) - idx(b))
})
const online = computed(() => MODULES.filter((m) => ok(m) && m.url).length)
const dateLabel = computed(() => {
  const d = now.value
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} 星期${'日一二三四五六'[d.getDay()]}`
})

const iconOf = (m: ModuleDef) => ICONS[m.key] ?? ICONS.device
const statusText = (m: ModuleDef) => (!ok(m) ? '无权限' : m.url ? '在线' : '待接入')
const statusClass = (m: ModuleDef) => (!ok(m) ? 'off' : m.url ? 'on' : 'wait')
const no = (m: ModuleDef) => String(MODULES.indexOf(m) + 1).padStart(2, '0')
</script>

<template>
  <div class="cy cy-portal">
    <div class="cy-glow" aria-hidden="true" />
    <div class="cy-floor" aria-hidden="true" />
    <div class="cy-scan" aria-hidden="true" />

    <header class="cy-top">
      <div class="cy-brand"><BrandMark /><div><b>{{ PLATFORM.name }}</b><small>{{ PLATFORM.en }}</small></div></div>
      <div class="cy-top-mid" aria-hidden="true"><span>MODULE HUB</span></div>
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

    <main class="cy-main">
      <section class="cy-hero">
        <div>
          <span class="cy-kicker">// WELCOME BACK, OPERATOR</span>
          <h1>{{ greet }}，<em>{{ session.info.user }}</em></h1>
          <p>当前身份 <b>{{ session.info.name }}</b>，请选择要进入的业务模块。模块将在新标签页中打开。</p>
        </div>
        <dl class="cy-stats">
          <div><dt>可用模块</dt><dd>{{ available }}<small>/ {{ MODULES.length }}</small></dd></div>
          <div><dt>已接入站点</dt><dd>{{ online }}<small>/ {{ available }}</small></dd></div>
          <div><dt>系统状态</dt><dd class="ok"><i class="dot" />正常</dd></div>
        </dl>
      </section>

      <section class="cy-grid" aria-label="业务模块">
        <button
          v-for="(m, i) in list"
          :key="m.key"
          type="button"
          class="mod"
          :class="[{ off: !ok(m), big: i < 2 }]"
          :style="{ '--c': m.hue, '--d': `${i * 70}ms` }"
          :aria-disabled="!ok(m)"
          @click="enter(m)"
        >
          <span class="cy-corner tl" /><span class="cy-corner br" />
          <span class="mod-top">
            <span class="mod-no">{{ no(m) }}<i />{{ m.en.toUpperCase() }}</span>
            <span class="mod-st" :class="statusClass(m)"><i />{{ statusText(m) }}</span>
          </span>
          <span class="mod-body">
            <span class="mod-art" v-html="iconOf(m)" />
            <span class="mod-txt">
              <span class="mod-title">{{ m.title }}</span>
              <span class="mod-desc">{{ m.desc }}</span>
              <span class="mod-tags"><span v-for="t in m.tags" :key="t">{{ t }}</span></span>
            </span>
          </span>
          <span class="mod-foot">
            <template v-if="ok(m)"><span>进入模块</span><AppIcon name="arrow" size="sm" /></template>
            <span v-else class="lk"><AppIcon name="lock" size="sm" />当前角色无访问权限</span>
          </span>
        </button>
      </section>
    </main>

    <footer class="cy-bar" aria-hidden="true">
      <span><i class="dot" />LINK ESTABLISHED</span>
      <span>ROLE · {{ session.role.toUpperCase() }}</span>
      <span>{{ PLATFORM.en }} · v0.1.0</span>
    </footer>
  </div>
</template>

<style scoped>
.cy-portal { display: flex; flex-direction: column; min-height: 100vh; overflow-x: hidden; }
.cy-glow { position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background:
    radial-gradient(900px 480px at 18% 0%, rgba(47,107,255,.16), transparent 60%),
    radial-gradient(800px 520px at 90% 20%, rgba(38,198,218,.12), transparent 60%),
    radial-gradient(circle, rgba(77,208,225,.12) 1px, transparent 1.4px) 0 0 / 28px 28px; 
  mask-image: linear-gradient(#000 40%, transparent); }
.cy-portal .cy-floor { height: 38vh; opacity: .55; }

/* 顶栏 */
.cy-top { position: sticky; top: 0; z-index: 10; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; height: 68px; padding: 0 40px;
  background: rgba(5,13,24,.72); backdrop-filter: blur(14px); border-bottom: 1px solid var(--line); }
.cy-top::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 1px; background: linear-gradient(90deg, transparent, var(--cyan) 50%, transparent); opacity: .7; }
.cy-top-mid span { font: 11px var(--mono); letter-spacing: 4px; color: var(--cyan); padding: 5px 18px; border: 1px solid var(--line); clip-path: polygon(10px 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0 50%); background: rgba(77,208,225,.06); }
.cy-top-right { display: flex; align-items: center; justify-content: flex-end; gap: 20px; }
.cy-clock { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.2; font-family: var(--mono); }
.cy-clock b { font-size: 16px; font-weight: 500; color: var(--ink); letter-spacing: 1px; }
.cy-clock small { font-size: 11px; color: var(--muted); font-family: var(--sans); }
.cy-user { position: relative; }
.cy-ubtn { display: flex; align-items: center; gap: 10px; height: 42px; padding: 0 12px 0 5px; border: 1px solid var(--line); border-radius: 4px; background: rgba(77,208,225,.06); cursor: pointer; transition: all .2s; }
.cy-ubtn:hover, .cy-ubtn[aria-expanded="true"] { border-color: var(--line-hi); background: rgba(77,208,225,.12); }
.cy-ubtn .who { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.25; font-size: 13.5px; }
.cy-ubtn small { color: var(--muted); font-size: 11.5px; }
.av { width: 32px; height: 32px; border-radius: 3px; display: grid; place-items: center; background: linear-gradient(135deg, var(--cyan-br), var(--blue)); color: #fff; font-weight: 600; font-size: 13px; box-shadow: 0 0 12px rgba(77,208,225,.4); }
.cy-menu { position: absolute; right: 0; top: 50px; min-width: 150px; padding: 5px; border-radius: 4px; background: rgba(10,26,42,.95); backdrop-filter: blur(12px); border: 1px solid var(--line-hi); box-shadow: 0 16px 40px rgba(0,0,0,.6); }
.cy-menu button { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border: 0; border-radius: 3px; background: none; font-size: 13.5px; cursor: pointer; }
.cy-menu button:hover { background: rgba(255,107,107,.12); color: #FFD0D0; }

/* 主区 */
.cy-main { position: relative; z-index: 2; flex: 1; width: 100%; max-width: 1360px; margin: 0 auto; padding: 32px 40px 24px; display: flex; flex-direction: column; gap: 26px; }
.cy-hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; }
.cy-kicker { font: 12px var(--mono); color: var(--cyan); letter-spacing: 2px; }
.cy-hero h1 { margin: 8px 0 6px; font-size: 32px; font-weight: 600; letter-spacing: 1px; color: #fff; }
.cy-hero h1 em { font-style: normal; background: linear-gradient(90deg, #7FF3FF, #2F9BFF); -webkit-background-clip: text; background-clip: text; color: transparent; }
.cy-hero p { margin: 0; color: var(--muted); font-size: 14px; }
.cy-hero p b { color: var(--ink); font-weight: 500; }
.cy-stats { display: flex; gap: 12px; margin: 0; }
.cy-stats > div { min-width: 132px; padding: 10px 16px; background: var(--glass); border: 1px solid var(--line); border-left: 2px solid var(--cyan); border-radius: 2px; backdrop-filter: blur(8px); }
.cy-stats dt { font-size: 12px; color: var(--muted); }
.cy-stats dd { margin: 2px 0 0; font: 500 24px/1.2 var(--mono); color: #fff; display: flex; align-items: baseline; gap: 6px; }
.cy-stats dd small { font-size: 13px; color: var(--dim); }
.cy-stats dd.ok { font: 500 18px/1.6 var(--sans); color: var(--ok); align-items: center; gap: 8px; }

/* 模块卡片：首行两张大卡，第二行三张 */
.cy-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 16px; }
.mod { --c: var(--cyan); grid-column: span 2; position: relative; display: flex; flex-direction: column; text-align: left; padding: 18px 20px 16px; cursor: pointer; overflow: hidden;
  background: linear-gradient(160deg, rgba(16,38,60,.78), rgba(6,16,28,.88)); border: 1px solid var(--line); border-radius: 4px; backdrop-filter: blur(10px);
  transition: transform .25s, border-color .25s, box-shadow .25s; animation: mod-in .6s both var(--d); }
.mod.big { grid-column: span 3; }
@keyframes mod-in { from { opacity: 0; transform: translateY(14px); } }
.mod::before { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(420px 220px at 85% 0%, color-mix(in srgb, var(--c) 22%, transparent), transparent 70%); opacity: .7; transition: opacity .25s; }
.mod::after { content: ''; position: absolute; left: 0; right: 0; top: -40%; height: 40%; pointer-events: none; background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--c) 12%, transparent)); opacity: 0; }
.mod .cy-corner { width: 12px; height: 12px; border-color: var(--c); opacity: .5; transition: opacity .25s; filter: drop-shadow(0 0 4px var(--c)); }
.mod:not(.off):hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--c) 60%, transparent); box-shadow: 0 18px 40px rgba(0,0,0,.45), 0 0 28px color-mix(in srgb, var(--c) 22%, transparent); }
.mod:not(.off):hover::before, .mod:not(.off):hover .cy-corner { opacity: 1; }
.mod:not(.off):hover::after { opacity: 1; animation: mod-scan 1.4s ease-out; }
@keyframes mod-scan { from { top: -40%; } to { top: 100%; } }
.mod > *:not(.cy-corner) { position: relative; }

.mod-top { display: flex; justify-content: space-between; align-items: center; font: 11px var(--mono); letter-spacing: 1.5px; color: var(--muted); }
.mod-no { display: inline-flex; align-items: center; gap: 8px; }
.mod-no i { width: 14px; height: 1px; background: var(--c); }
.mod-st { display: inline-flex; align-items: center; gap: 6px; padding: 2px 9px; border-radius: 2px; font: 12px var(--sans); letter-spacing: 0; }
.mod-st i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.mod-st.on { color: var(--ok); background: rgba(77,232,176,.1); border: 1px solid rgba(77,232,176,.35); }
.mod-st.on i { box-shadow: 0 0 8px currentColor; animation: cy-blink 2s infinite; }
.mod-st.wait { color: var(--warn); background: rgba(255,183,77,.08); border: 1px solid rgba(255,183,77,.3); }
.mod-st.off { color: var(--dim); background: rgba(91,116,134,.1); border: 1px solid rgba(91,116,134,.3); }

.mod-body { flex: 1; display: flex; flex-direction: column; gap: 8px; margin-top: 8px; min-height: 0; }
.mod-art { width: 72px; height: 72px; flex: none; margin: -4px 0 0 -8px; filter: drop-shadow(0 0 12px rgba(77,208,225,.35)); }
.mod-art :deep(svg) { width: 100%; height: 100%; }
.mod.big .mod-body { flex-direction: row; align-items: center; gap: 22px; }
.mod.big .mod-art { width: 120px; height: 120px; margin: 0 -4px; }
.mod-txt { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.mod-title { font-size: 19px; font-weight: 600; color: #fff; letter-spacing: 1px; }
.mod.big .mod-title { font-size: 22px; }
.mod-desc { color: var(--muted); font-size: 13px; line-height: 1.65; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.mod-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
.mod-tags span { padding: 1px 8px; font-size: 12px; color: color-mix(in srgb, var(--c) 55%, #fff); border: 1px solid color-mix(in srgb, var(--c) 35%, transparent); background: color-mix(in srgb, var(--c) 10%, transparent); border-radius: 2px; }
.mod-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--line); font-size: 13px; color: var(--c); font-weight: 500; }
.mod-foot .ic { transition: transform .25s; }
.mod:not(.off):hover .mod-foot .ic { transform: translateX(4px); }

.mod.off { cursor: not-allowed; background: rgba(8,18,30,.6); }
.mod.off .mod-art, .mod.off .mod-title, .mod.off .mod-desc, .mod.off .mod-tags { filter: grayscale(1); opacity: .45; }
.mod.off .mod-foot { color: var(--dim); font-weight: 400; }
.lk { display: inline-flex; align-items: center; gap: 6px; }
.mod.off .cy-corner { border-color: var(--dim); filter: none; opacity: .3; }

/* 底栏 */
.cy-bar { position: relative; z-index: 2; display: flex; justify-content: space-between; gap: 16px; padding: 10px 40px; font: 11px var(--mono); letter-spacing: 1.5px; color: var(--dim); border-top: 1px solid var(--line); background: rgba(5,13,24,.6); }
.cy-bar span:first-child { display: inline-flex; align-items: center; gap: 8px; color: var(--muted); }

@media (max-width: 1100px) {
  .cy-hero { flex-direction: column; align-items: flex-start; }
  .cy-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: auto; }
  .mod, .mod.big { grid-column: span 1; }
  .mod.big .mod-body { flex-direction: column; align-items: flex-start; gap: 10px; }
  .mod.big .mod-art { width: 84px; height: 84px; }
}
@media (max-width: 720px) {
  .cy-top { grid-template-columns: 1fr auto; padding: 0 16px; }
  .cy-top-mid, .cy-clock, .cy-brand small, .cy-ubtn .who { display: none; }
  .cy-main { padding: 22px 16px; gap: 20px; }
  .cy-hero h1 { font-size: 26px; }
  .cy-stats { width: 100%; }
  .cy-stats > div { flex: 1; min-width: 0; padding: 8px 10px; }
  .cy-stats dd { font-size: 20px; }
  .cy-grid { grid-template-columns: 1fr; }
  .cy-bar { padding: 10px 16px; } .cy-bar span:last-child { display: none; }
}
</style>
