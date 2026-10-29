<script setup lang="ts">
/** 实时视口：左侧 Isaac Sim WebRTC 串流（--livestream 2），右侧单台机器人关节角度与姿态 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import SimScene from './SimScene.vue'
import { fwOf, sceneOf, sim, taskId } from './data'

const task = defineModel<string>('task', { required: true })
const running = computed(() => sim.trains.filter((t) => t.status === 'running'))
const cur = computed(() => running.value.find((t) => t.id === task.value) ?? running.value[0])
const env = ref(0)
const fps = ref(59.6); const tick = ref(0)
let tm = 0
onMounted(() => { tm = window.setInterval(() => { tick.value++; fps.value = 58 + Math.random() * 3 }, 500) })
onBeforeUnmount(() => clearInterval(tm))
const JOINTS = ['FL_hip', 'FL_thigh', 'FL_calf', 'FR_hip', 'FR_thigh', 'FR_calf', 'RL_hip', 'RL_thigh', 'RL_calf', 'RR_hip', 'RR_thigh', 'RR_calf']
const joints = computed(() => JOINTS.map((n, i) => { const base = i % 3 === 0 ? 0 : i % 3 === 1 ? 0.8 : -1.5; return { n, v: +(base + Math.sin(tick.value * 0.6 + i) * 0.35).toFixed(2), lo: i % 3 === 2 ? -2.7 : -1.5, hi: i % 3 === 2 ? -0.9 : 3.4 } }))
const pose = computed(() => [
  { k: 'Roll', v: (Math.sin(tick.value * 0.4) * 2.1).toFixed(1) + '°' }, { k: 'Pitch', v: (Math.cos(tick.value * 0.3) * 3.4).toFixed(1) + '°' },
  { k: 'Yaw', v: ((tick.value * 3) % 360).toFixed(0) + '°' }, { k: '基座高度', v: (0.32 + Math.sin(tick.value) * 0.01).toFixed(3) + ' m' },
  { k: '线速度', v: (1.2 + Math.sin(tick.value * 0.5) * 0.1).toFixed(2) + ' m/s' }, { k: '指令速度', v: '1.20 m/s' },
])
const pctOf = (j: { v: number; lo: number; hi: number }) => ((j.v - j.lo) / (j.hi - j.lo)) * 100
</script>
<template>
  <div class="pp-head">
    <div><h2>实时视口</h2><p>Isaac Sim 以 WebRTC 推流到浏览器，查看并行环境训练画面与单台机器人状态</p></div>
    <div class="r" style="margin-left:auto; display:flex; gap:8px">
      <a-select :value="cur?.id" style="width: 240px" placeholder="选择训练中的任务" :options="running.map((t) => ({ value: t.id, label: t.name }))" @change="(v: any) => (task = v)" />
    </div>
  </div>
  <div v-if="cur" class="sv">
    <section class="pp-panel sv-stream">
      <SimScene />
      <div class="sv-top"><span class="sv-live"><i />LIVE · WebRTC</span><span class="mono">{{ taskId(cur) }}</span></div>
      <div class="sv-hud mono"><span>{{ sceneOf(cur.scene).t }}</span><span>{{ cur.envs }} envs</span><span>{{ fwOf(cur.fw).t }}</span><span>FPS {{ fps.toFixed(1) }}</span><span>1920×1080</span></div>
    </section>
    <section class="pp-panel sv-side">
      <div class="pp-panel-h"><h3>机器人状态</h3><a-select v-model:value="env" size="small" style="width: 110px; margin-left:auto" :options="[0, 1, 2, 3].map((v) => ({ value: v, label: `env_${v}` }))" /></div>
      <div class="sv-pose">
        <div v-for="p in pose" :key="p.k"><small>{{ p.k }}</small><b class="mono">{{ p.v }}</b></div>
      </div>
      <div class="sv-sub">关节角度 <small>rad</small></div>
      <div class="sv-joints">
        <div v-for="j in joints" :key="j.n" class="sv-j"><span class="mono">{{ j.n }}</span><div class="bar"><i :style="{ width: pctOf(j) + '%' }" /></div><b class="mono">{{ j.v.toFixed(2) }}</b></div>
      </div>
    </section>
  </div>
  <section v-else class="pp-panel sv-empty">暂无训练中的任务，请先在「训练任务」中启动训练</section>
</template>
<style scoped>
.sv { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; height: calc(100vh - 190px); min-height: 520px; }
.sv-stream { position: relative; overflow: hidden; padding: 0; background: #0f1f35; }
.sv-top { position: absolute; left: 12px; right: 12px; top: 12px; display: flex; align-items: center; gap: 12px; font-size: 12px; color: #9FE6EF; }
.sv-live { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 6px; background: rgba(255,90,90,.18); color: #FFB3B3; font-weight: 500; }
.sv-live i { width: 7px; height: 7px; border-radius: 50%; background: #FF5A5A; animation: sv-b 1.4s infinite; } @keyframes sv-b { 50% { opacity: .3; } }
.sv-hud { position: absolute; left: 12px; bottom: 10px; display: flex; gap: 16px; font-size: 11.5px; color: var(--muted); padding: 4px 10px; background: rgba(8,18,32,.7); border-radius: 6px; }
.sv-side { display: flex; flex-direction: column; min-height: 0; padding-bottom: 14px; }
.sv-side > :not(.pp-panel-h) { margin-left: 14px; margin-right: 14px; }
.sv-pose { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px 0; }
.sv-pose > div { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border-radius: 8px; background: rgba(46,211,230,.05); border: 1px solid rgba(46,211,230,.12); }
.sv-pose small { font-size: 11.5px; color: var(--muted); } .sv-pose b { font-size: 15px; color: var(--title); font-weight: 500; }
.sv-sub { padding: 4px 0 8px; font-weight: 500; color: var(--title); } .sv-sub small { color: var(--muted); font-weight: 400; }
.sv-joints { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 8px; }
.sv-j { display: grid; grid-template-columns: 76px 1fr 44px; align-items: center; gap: 10px; font-size: 12px; }
.sv-j span { color: var(--muted); } .sv-j b { text-align: right; font-weight: 500; }
.sv-j .bar { height: 6px; border-radius: 3px; background: rgba(46,211,230,.1); overflow: hidden; } .sv-j .bar i { display: block; height: 100%; background: linear-gradient(90deg, #1E88E5, #2ED3E6); transition: width .4s; }
.sv-empty { height: 300px; display: grid; place-items: center; color: var(--muted); }
</style>
