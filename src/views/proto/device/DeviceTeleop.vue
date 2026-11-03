<script setup lang="ts">
/** 遥操作控制台：全屏，画面为主；摇杆 / WASD 控制，急停常驻 */
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import CamShot from '@/views/proto/biz/CamShot.vue'
import { TYPE_META, type Device } from '@/models/device'
import ControlPanel from '@/components/plugin/ControlPanel.vue'
import { stateOf } from '@/plugins/runtime'
import { descriptorOf } from '@/plugins/catalog'
import { execute, fieldsBy, fmtField, teleopOwner } from '@/plugins/runtime'
import { modelOf, rtOf } from './store'

const props = defineProps<{ device: Device }>()
const emit = defineEmits<{ exit: [] }>()
const d = computed(() => props.device)
const m = computed(() => modelOf(d.value)!)
const cam = ref(0)

/* 速度档：按型号最高速度的比例 */
const GEARS = [{ k: 0, l: '低速', r: 0.25 }, { k: 1, l: '中速', r: 0.5 }, { k: 2, l: '高速', r: 1 }]
const gear = ref(0)
const desc = computed(() => descriptorOf(d.value.modelId))
const rt = computed(() => rtOf(d.value))
const joy = computed(() => desc.value.controls.find((c) => c.kind === 'joystick'))
/** 最高速度取插件声明的摇杆上限，未声明时回退型号规格 */
const vmax = computed(() => joy.value?.maxSpeed ?? (parseFloat(m.value.spec.speed) || 1))
const cams = computed(() => desc.value.video?.map((x) => ({ label: x.label, ir: !!x.ir })) ?? m.value.cameras.map((c) => ({ label: c, ir: c === '红外' })))
/** HUD：插件声明 display 含 hud 的字段（速度由摇杆实时计算，单独显示） */
const hud = computed(() => fieldsBy(desc.value, 'hud').filter((f) => f.key !== 'speed' && f.type !== 'pose2d').map((f) => ({ f, ...fmtField(f, rt.value.values[f.key]) })))
const estopCtl = computed(() => desc.value.controls.find((c) => c.key === 'estop'))
const ME = '你'
const st = computed(() => stateOf(d.value.id))
const side = computed(() => desc.value.telemetry.filter((f) => f.type !== 'pose2d' && f.type !== 'gps' && f.display.some((x) => x === 'detail' || x === 'card')).slice(0, 9).map((f) => ({ f, ...(st.value?.online ? fmtField(f, st.value.values[f.key]) : { text: '--', unit: f.unit, warn: false }) })))
/** 侧栏控制分组：按插件声明自动出现（机器狗姿态/步态/动作、无人机飞行、服务机器人技能…） */
const ctlN = computed(() => desc.value.controls.filter((c) => c.kind !== 'joystick' && !['safety', 'teleop', 'navigation', 'task'].includes(c.group)).length)

/* 摇杆向量（-1~1），来自拖拽或键盘 */
const v = reactive({ x: 0, y: 0 })
const keys = new Set<string>()
const fromKeys = () => { v.x = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0); v.y = (keys.has('w') ? 1 : 0) - (keys.has('s') ? 1 : 0) }
const speed = computed(() => (stopped.value ? 0 : Math.min(1, Math.hypot(v.x, v.y)) * vmax.value * GEARS[gear.value].r))

const pad = ref<HTMLDivElement>()
let drag = false
const move = (e: PointerEvent) => {
  if (!drag || !pad.value) return
  const r = pad.value.getBoundingClientRect(), R = r.width / 2
  let x = (e.clientX - r.left - R) / R, y = -(e.clientY - r.top - R) / R
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l }
  v.x = x; v.y = y
}
const down = (e: PointerEvent) => { if (stopped.value) return; drag = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); move(e) }
const up = () => { drag = false; v.x = 0; v.y = 0 }

/* 急停 */
const stopped = ref(false)
const estop = () => { if (estopCtl.value) execute(d.value.id, estopCtl.value, undefined, { operator: ME, silent: true }); stopped.value = true; v.x = 0; v.y = 0; keys.clear(); message.error(`${d.value.name} 已急停`) }
const resume = () => { stopped.value = false; message.success('已解除急停') }


const onKey = (e: KeyboardEvent, on: boolean) => {
  if ((e.target as HTMLElement)?.closest('input, textarea')) return
  const k = e.key.toLowerCase()
  if (k === ' ' && on) { e.preventDefault(); estop(); return }
  if (!'wasd'.includes(k) || k.length !== 1 || stopped.value) return
  on ? keys.add(k) : keys.delete(k); fromKeys()
}
const kd = (e: KeyboardEvent) => onKey(e, true), ku = (e: KeyboardEvent) => onKey(e, false)
onMounted(() => { teleopOwner[d.value.id] = ME; window.addEventListener('keydown', kd); window.addEventListener('keyup', ku) })
onBeforeUnmount(() => { delete teleopOwner[d.value.id]; window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku) })

const exit = () => Modal.confirm({ title: '退出遥操作？', content: '退出后设备将停止运动并释放控制权。', okText: '退出', cancelText: '继续操作', onOk: () => emit('exit') })
</script>

<template>
  <div class="to">
    <header class="to-top">
      <a-button type="text" class="to-back" @click="exit"><ArrowLeftOutlined />退出遥操作</a-button>
      <i class="to-sep" />
      <b>{{ d.name }}</b><span class="to-tag">{{ TYPE_META[d.type].label }}</span><span class="muted">{{ m.name }}</span>
      <span class="to-own"><i />控制权：你</span>
    </header>

    <div class="to-body" :class="{ solo: !ctlN }">
      <main class="to-view">
        <CamShot :seed="cam + 3" :ir="cams[cam]?.ir" />
        <div v-if="cams.length > 1" class="to-cams"><button v-for="(c, i) in cams" :key="c.label" type="button" :class="{ on: cam === i }" @click="cam = i">{{ c.label }}</button></div>
        <div v-if="hud.length" class="to-st mono"><span v-for="h in hud" :key="h.f.key"><small>{{ h.f.label }}</small><b :class="{ low: h.warn }">{{ h.text }}<em>{{ h.unit ?? '' }}</em></b></span></div>
        <div v-if="joy" class="to-hud mono"><b>{{ speed.toFixed(1) }}</b><em>m/s</em><template v-if="rt.values.alt != null && d.type === 'uav'"><b class="s">{{ Number(rt.values.alt).toFixed(1) }}</b><em>m 高度</em></template></div>

        <div v-if="joy" class="to-stick glass">
          <div ref="pad" class="pad" :class="{ dis: stopped }" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up">
            <span class="ax n">W</span><span class="ax s">S</span><span class="ax w">A</span><span class="ax e">D</span>
            <i :style="{ transform: `translate(${v.x * 40}px, ${-v.y * 40}px)` }" />
          </div>
          <div class="to-gear"><button v-for="g in GEARS" :key="g.k" type="button" :class="{ on: gear === g.k }" @click="gear = g.k">{{ g.l }}</button></div>
        </div>
        <div class="to-stop">
          <button type="button" :class="{ long: (estopCtl?.label ?? '').length > 2 }" @click="estop">{{ estopCtl?.label ?? '急停' }}</button>
          <small>空格键</small>
        </div>
        <div v-if="stopped" class="to-stopped"><b>已急停</b><a-button size="small" @click="resume">解除急停</a-button></div>
      </main>

      <aside v-if="ctlN" class="to-side">
        <section class="to-card">
          <h4><i />实时状态<small>{{ side.length }} 项</small></h4>
          <div class="to-kv">
            <div v-for="x in side" :key="x.f.key" :class="{ warn: x.warn }"><small>{{ x.f.label }}</small><b class="mono">{{ x.text }}<em>{{ x.unit ?? '' }}</em></b></div>
          </div>
        </section>
        <section class="to-card grow">
          <h4><i />设备控制<small>{{ ctlN }} 项</small></h4>
          <div class="to-cp"><ControlPanel :device-id="d.id" :desc="desc" :exclude="['safety']" variant="panel" :cols="2" /></div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.to { position: fixed; inset: 0; z-index: 1000; display: grid; grid-template-rows: 52px minmax(0, 1fr); background: #08121F; color: var(--text); }
.to-top { display: flex; align-items: center; gap: 10px; padding: 0 16px; background: #0B1828; border-bottom: 1px solid var(--line); }
.to-top > b { font-size: 15px; color: var(--title); }
.to-back { color: var(--muted); } .to-sep { width: 1px; height: 18px; background: var(--line-strong); }
.to-tag { padding: 1px 8px; font-size: 11.5px; color: #9FE6EF; border: 1px solid rgba(46,211,230,.3); border-radius: 4px; }
.to-own { margin-left: auto; display: flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 4px; font-size: 12px; color: #9FE6EF; background: rgba(46,211,230,.1); border: 1px solid rgba(46,211,230,.25); }
.to-own i { width: 6px; height: 6px; border-radius: 50%; background: #45E3A8; box-shadow: 0 0 6px #45E3A8; }
.to-body { display: grid; grid-template-columns: minmax(0, 1fr) 360px; min-height: 0; } .to-body.solo { grid-template-columns: 1fr; }
.to-view { position: relative; overflow: hidden; background: #000; }
.to-view > :deep(svg) { width: 100%; height: 100%; display: block; }
.glass { background: rgba(6,14,26,.55); border: 1px solid rgba(46,211,230,.22); border-radius: 12px; backdrop-filter: blur(6px); }
.to-cams { position: absolute; left: 16px; top: 16px; display: flex; gap: 6px; }
.to-cams button { height: 28px; padding: 0 12px; border: 1px solid rgba(255,255,255,.2); border-radius: 6px; background: rgba(0,0,0,.45); color: #dfe8f0; font: inherit; font-size: 12.5px; cursor: pointer; }
.to-cams button.on { border-color: var(--cyan); color: #fff; background: rgba(46,211,230,.25); }
.to-st { position: absolute; right: 16px; top: 16px; display: flex; gap: 6px; }
.to-st span { display: flex; flex-direction: column; padding: 4px 10px; background: rgba(0,0,0,.45); border: 1px solid rgba(255,255,255,.12); border-radius: 6px; }
.to-st small { font-size: 10.5px; color: rgba(255,255,255,.6); } .to-st b { font-size: 13px; font-weight: 600; color: #fff; } .to-st b.low { color: #FF8A8A; } .to-st em { font-style: normal; font-size: 10.5px; margin-left: 2px; color: rgba(255,255,255,.6); }
.to-hud { position: absolute; left: 50%; bottom: 24px; translate: -50% 0; display: flex; align-items: baseline; gap: 4px; padding: 6px 18px; border-radius: 8px; background: rgba(0,0,0,.5); color: #fff; }
.to-hud b { font-size: 28px; font-weight: 600; } .to-hud b.s { margin-left: 16px; } .to-hud em { font-style: normal; font-size: 12px; color: rgba(255,255,255,.7); }
.to-stick { position: absolute; left: 20px; bottom: 20px; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 14px; }
.pad { position: relative; width: 132px; height: 132px; border-radius: 50%; border: 1px solid rgba(46,211,230,.4); background: radial-gradient(circle, rgba(46,211,230,.14), rgba(46,211,230,.03)); touch-action: none; cursor: grab; display: grid; place-items: center; }
.pad.dis { opacity: .4; cursor: not-allowed; }
.pad i { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(180deg, #3fd9ea, #1d9fc0); box-shadow: 0 4px 12px rgba(0,0,0,.4); pointer-events: none; }
.pad .ax { position: absolute; font: 600 10px var(--mono); color: rgba(255,255,255,.45); pointer-events: none; }
.ax.n { top: 6px; } .ax.s { bottom: 6px; } .ax.w { left: 8px; } .ax.e { right: 8px; }
.to-gear { display: flex; } .to-gear button { height: 24px; padding: 0 10px; font: inherit; font-size: 12px; color: var(--muted); cursor: pointer; background: rgba(46,211,230,.06); border: 1px solid var(--line-strong); margin-left: -1px; }
.to-gear button:first-child { border-radius: 6px 0 0 6px; } .to-gear button:last-child { border-radius: 0 6px 6px 0; } .to-gear button.on { color: #0B1C2E; font-weight: 600; background: var(--cyan); border-color: var(--cyan); }
.to-stop { position: absolute; right: 24px; bottom: 24px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.to-stop button { width: 92px; height: 92px; border-radius: 50%; border: 4px solid rgba(255,122,122,.4); background: #D93B3B; color: #fff; font: inherit; font-size: 17px; font-weight: 600; letter-spacing: 2px; cursor: pointer; box-shadow: 0 6px 18px rgba(0,0,0,.5); }
.to-stop button.long { font-size: 14px; letter-spacing: 0; line-height: 1.25; padding: 0 14px; } .to-stop button:hover { background: #E84848; } .to-stop small { font-size: 12px; color: rgba(255,255,255,.7); }
.to-stopped { position: absolute; inset: 0; z-index: 3; display: grid; place-content: center; justify-items: center; gap: 12px; background: rgba(120,0,0,.3); }
.to-stopped b { font-size: 28px; color: #FF8A8A; letter-spacing: 6px; }
.to-side { display: flex; flex-direction: column; gap: 12px; min-height: 0; padding: 12px; background: #0B1828; border-left: 1px solid var(--line); }
.to-card { flex: none; padding: 12px 14px 14px; background: linear-gradient(180deg, rgba(46,211,230,.05), rgba(46,211,230,.015)); border: 1px solid var(--line); border-radius: 10px; }
.to-card.grow { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.to-card h4 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 13.5px; font-weight: 600; color: var(--title); }
.to-card h4 i { width: 3px; height: 13px; border-radius: 2px; background: var(--cyan); }
.to-card h4 small { margin-left: auto; font-size: 11.5px; font-weight: 400; color: var(--faint); }
.to-kv { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.to-kv > div { min-width: 0; padding: 7px 9px; background: rgba(8,18,32,.55); border: 1px solid rgba(46,211,230,.1); border-radius: 7px; }
.to-kv small { display: block; font-size: 11px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.to-kv b { display: block; margin-top: 2px; font-size: 14px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.to-kv em { font-style: normal; font-size: 10.5px; font-weight: 400; color: var(--muted); margin-left: 2px; }
.to-kv .warn b { color: #FF8A8A; }
.to-cp { flex: 1; min-height: 0; overflow: auto; margin-right: -6px; padding-right: 6px; }
.to-cp :deep(.cp-btn) { height: 36px; }
</style>
