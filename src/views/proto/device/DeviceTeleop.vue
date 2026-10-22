<script setup lang="ts">
/** 遥操作控制台：全屏，画面为主；摇杆 / WASD 控制，急停常驻 */
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import CamShot from '@/views/proto/biz/CamShot.vue'
import { TYPE_META, type Device } from '@/models/device'
import { modelOf } from './store'

const props = defineProps<{ device: Device }>()
const emit = defineEmits<{ exit: [] }>()
const d = computed(() => props.device)
const m = computed(() => modelOf(d.value)!)
const cam = ref(0)

/* 速度档：按型号最高速度的比例 */
const GEARS = [{ k: 0, l: '低速', r: 0.25 }, { k: 1, l: '中速', r: 0.5 }, { k: 2, l: '高速', r: 1 }]
const gear = ref(0)
const vmax = computed(() => parseFloat(m.value.spec.speed) || 1)

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
const estop = () => { stopped.value = true; v.x = 0; v.y = 0; keys.clear(); message.error(`${d.value.name} 已急停`) }
const resume = () => { stopped.value = false; message.success('已解除急停') }

/* 类型相关动作（只放最常用的） */
const standing = ref(true)
const gait = ref('行走')
const flying = ref(false)
const act = (t: string) => message.success(`已发送：${t}`)

const onKey = (e: KeyboardEvent, on: boolean) => {
  if ((e.target as HTMLElement)?.closest('input, textarea')) return
  const k = e.key.toLowerCase()
  if (k === ' ' && on) { e.preventDefault(); estop(); return }
  if (!'wasd'.includes(k) || k.length !== 1 || stopped.value) return
  on ? keys.add(k) : keys.delete(k); fromKeys()
}
const kd = (e: KeyboardEvent) => onKey(e, true), ku = (e: KeyboardEvent) => onKey(e, false)
onMounted(() => { window.addEventListener('keydown', kd); window.addEventListener('keyup', ku) })
onBeforeUnmount(() => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku) })

const exit = () => Modal.confirm({ title: '退出遥操作？', content: '退出后设备将停止运动并释放控制权。', okText: '退出', cancelText: '继续操作', onOk: () => emit('exit') })
</script>

<template>
  <div class="to">
    <header class="to-top">
      <a-button type="text" class="to-back" @click="exit"><ArrowLeftOutlined />退出遥操作</a-button>
      <b>{{ d.name }}</b><span class="muted">{{ TYPE_META[d.type].label }} · {{ m.name }}</span>
      <div class="to-st mono"><span>电量 <b :class="{ low: d.battery < 30 }">{{ d.battery }}%</b></span><span>延迟 <b>{{ d.tm.latency }} ms</b></span></div>
      <span class="to-own">控制权：你</span>
    </header>

    <main class="to-view">
      <CamShot :seed="cam + 3" :ir="m.cameras[cam] === '红外'" />
      <div class="to-cams"><button v-for="(c, i) in m.cameras" :key="c" type="button" :class="{ on: cam === i }" @click="cam = i">{{ c }}</button></div>
      <div class="to-hud mono"><b>{{ speed.toFixed(1) }}</b><em>m/s</em><template v-if="d.type === 'uav'"><b class="s">{{ (d.tm.alt ?? 0).toFixed(1) }}</b><em>m 高度</em></template></div>
      <div v-if="stopped" class="to-stopped"><b>已急停</b><a-button size="small" @click="resume">解除急停</a-button></div>
    </main>

    <footer class="to-ctl">
      <div class="to-stick">
        <div ref="pad" class="pad" :class="{ dis: stopped }" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up">
          <i :style="{ transform: `translate(${v.x * 38}px, ${-v.y * 38}px)` }" />
        </div>
        <small class="muted">拖动摇杆，或使用键盘 W A S D</small>
      </div>

      <div class="to-mid">
        <div class="to-row"><span class="muted">速度档</span><a-radio-group v-model:value="gear" button-style="solid"><a-radio-button v-for="g in GEARS" :key="g.k" :value="g.k">{{ g.l }}</a-radio-button></a-radio-group></div>
        <div v-if="d.type === 'quadruped'" class="to-row">
          <a-button @click="standing = !standing; act(standing ? '起立' : '趴下')">{{ standing ? '趴下' : '起立' }}</a-button>
          <a-select v-model:value="gait" style="width: 110px" :options="['行走', '小跑', '爬楼'].map((v) => ({ value: v, label: v }))" @change="act(`步态 ${gait}`)" />
        </div>
        <div v-else-if="d.type === 'uav'" class="to-row">
          <a-button @click="flying = !flying; act(flying ? '起飞' : '降落')">{{ flying ? '降落' : '起飞' }}</a-button>
          <a-button @click="act('一键返航')">返航</a-button>
        </div>
      </div>

      <div class="to-stop">
        <button type="button" @click="estop">急停</button>
        <small class="muted">空格键</small>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.to { position: fixed; inset: 0; z-index: 1000; display: grid; grid-template-rows: 52px minmax(0, 1fr) 170px; background: #0a1524; color: var(--text); }
.to-top { display: flex; align-items: center; gap: 12px; padding: 0 16px; border-bottom: 1px solid var(--line); }
.to-top > b { font-size: 15px; color: var(--title); }
.to-back { color: var(--muted); }
.to-st { margin-left: auto; display: flex; gap: 18px; font-size: 12.5px; color: var(--muted); }
.to-st b { color: var(--text); font-weight: 500; } .to-st b.low { color: var(--warn); }
.to-own { padding: 3px 10px; border-radius: 3px; font-size: 12px; color: #9FE6EF; background: rgba(46,211,230,.1); border: 1px solid rgba(46,211,230,.25); }
.to-view { position: relative; overflow: hidden; background: #000; }
.to-view > :deep(svg) { width: 100%; height: 100%; display: block; }
.to-cams { position: absolute; left: 16px; top: 16px; display: flex; gap: 6px; }
.to-cams button { height: 28px; padding: 0 12px; border: 1px solid rgba(255,255,255,.2); border-radius: 4px; background: rgba(0,0,0,.45); color: #dfe8f0; font: inherit; font-size: 12.5px; cursor: pointer; }
.to-cams button.on { border-color: var(--cyan); color: #fff; background: rgba(46,211,230,.25); }
.to-hud { position: absolute; left: 50%; bottom: 18px; translate: -50% 0; display: flex; align-items: baseline; gap: 4px; padding: 6px 16px; border-radius: 4px; background: rgba(0,0,0,.45); color: #fff; }
.to-hud b { font-size: 26px; font-weight: 600; } .to-hud b.s { margin-left: 16px; }
.to-hud em { font-style: normal; font-size: 12px; color: rgba(255,255,255,.7); }
.to-stopped { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 12px; background: rgba(120,0,0,.25); }
.to-stopped b { font-size: 28px; color: #FF8A8A; letter-spacing: 6px; }
.to-ctl { display: grid; grid-template-columns: 260px 1fr 200px; align-items: center; gap: 24px; padding: 0 32px; border-top: 1px solid var(--line); }
.to-stick { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.pad { position: relative; width: 116px; height: 116px; border-radius: 50%; border: 1px solid rgba(46,211,230,.35); background: radial-gradient(circle, rgba(46,211,230,.08), rgba(46,211,230,.02)); touch-action: none; cursor: grab; display: grid; place-items: center; }
.pad.dis { opacity: .4; cursor: not-allowed; }
.pad i { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(180deg, #3fd9ea, #1d9fc0); box-shadow: 0 4px 12px rgba(0,0,0,.4); pointer-events: none; }
.to-stick small { font-size: 12px; }
.to-mid { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.to-row { display: flex; align-items: center; gap: 10px; }
.to-stop { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.to-stop button { width: 96px; height: 96px; border-radius: 50%; border: 4px solid rgba(255,122,122,.35); background: #D93B3B; color: #fff; font: inherit; font-size: 18px; font-weight: 600; letter-spacing: 2px; cursor: pointer; }
.to-stop button:hover { background: #E84848; }
.to-stop small { font-size: 12px; }
</style>
