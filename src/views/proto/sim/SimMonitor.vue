<script setup lang="ts">
/** 训练监控与评估：解析 TensorBoard 日志（Reward / Episode Length / 速度跟踪误差 / 跌倒次数），框架对比，导出报告 */
import { computed } from 'vue'
import { message } from 'ant-design-vue'
import LineChart from '@/components/proto/LineChart.vue'
import { FRAMEWORKS, curves, fwOf, sceneOf, sim } from './data'

const task = defineModel<string>('task', { required: true })
const list = computed(() => sim.trains.filter((t) => t.status !== 'queued'))
const cur = computed(() => list.value.find((t) => t.id === task.value) ?? list.value[0])
const c = computed(() => curves(cur.value))
const last = (a: number[]) => a[a.length - 1]
const kpis = computed(() => [
  { k: '平均奖励', en: 'Episode Reward', v: last(c.value.reward).toFixed(2), col: '#2ED3E6' },
  { k: '存活时长', en: 'Episode Length', v: last(c.value.len).toFixed(1) + ' s', col: '#B48CFF' },
  { k: '速度跟踪误差', en: 'Track Error', v: last(c.value.err).toFixed(3), col: '#FFC15C' },
  { k: '跌倒次数', en: 'Falls / iter', v: Math.round(last(c.value.fall)).toString(), col: '#FF7A7A' },
])
/* 同一任务（行走类型）下不同框架的最终奖励对比 */
const cmp = computed(() => FRAMEWORKS.map((f, i) => ({ ...f, n: +(cur.value.walk === 'Rough' ? [19.6, 18.1, 17.4, 15.2] : [22.4, 21.0, 20.6, 18.3])[i].toFixed(1) })))
const cmax = computed(() => Math.max(...cmp.value.map((x) => x.n)) * 1.1)
const exp = (t: string) => message.success(`已导出测试验证报告（${t}）`)
</script>
<template>
  <div class="pp-head">
    <div><h2>训练监控</h2><p>实时解析 Isaac Lab 写出的 TensorBoard 日志，评估训练效果并导出测试验证报告</p></div>
    <div class="r" style="margin-left:auto; display:flex; gap:8px">
      <a-select :value="cur?.id" style="width: 220px" :options="list.map((t) => ({ value: t.id, label: t.name }))" @change="(v: any) => (task = v)" />
      <a-button @click="exp('JSON')">导出 JSON</a-button>
      <a-button type="primary" @click="exp('PDF')">导出报告</a-button>
    </div>
  </div>
  <div class="sm2">
    <div class="sm2-kpi">
      <section v-for="k in kpis" :key="k.k" class="pp-panel kpi"><small>{{ k.k }} <em class="mono">{{ k.en }}</em></small><b class="mono" :style="{ color: k.col }">{{ k.v }}</b></section>
      <section class="pp-panel kpi info"><small>{{ sceneOf(cur.scene).t }} · {{ cur.robot }}</small><b class="mono">{{ fwOf(cur.fw).t }}</b><small class="mono">iter {{ cur.it }}/{{ cur.total }} · {{ cur.envs }} envs</small></section>
    </div>
    <div class="sm2-g">
      <section class="pp-panel"><div class="pp-panel-h"><h3>平均奖励</h3><span class="muted">Episode Reward</span></div><LineChart :series="[{ name: 'reward', color: '#2ED3E6', data: c.reward }]" :height="200" /></section>
      <section class="pp-panel"><div class="pp-panel-h"><h3>存活时长</h3><span class="muted">Episode Length (s)</span></div><LineChart :series="[{ name: 'len', color: '#B48CFF', data: c.len }]" :height="200" /></section>
      <section class="pp-panel"><div class="pp-panel-h"><h3>速度跟踪误差 / 跌倒次数</h3></div><LineChart :series="[{ name: 'err', color: '#FFC15C', data: c.err.map((v) => v * 300) }, { name: 'fall', color: '#FF7A7A', data: c.fall }]" :area="false" :height="200" /></section>
      <section class="pp-panel"><div class="pp-panel-h"><h3>框架性能对比</h3><span class="muted">{{ cur.walk }} · 最终平均奖励</span></div>
        <div class="bars">
          <div v-for="x in cmp" :key="x.v" class="bar" :class="{ on: x.v === cur.fw }"><span>{{ x.t }}</span><div><i :style="{ width: (x.n / cmax) * 100 + '%', background: x.c }" /></div><b class="mono">{{ x.n }}</b></div>
        </div>
      </section>
    </div>
  </div>
</template>
<style scoped>
.sm2 { display: flex; flex-direction: column; gap: 16px; }
.sm2-kpi { display: grid; grid-template-columns: repeat(4, 1fr) 1.3fr; gap: 16px; }
.kpi { display: flex; flex-direction: column; gap: 6px; } .kpi small { color: var(--muted); font-size: 12px; } .kpi em { font-style: normal; opacity: .6; margin-left: 4px; }
.kpi b { font-size: 26px; font-weight: 600; } .kpi.info b { font-size: 18px; color: var(--title); }
.sm2-g { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.bars { display: flex; flex-direction: column; gap: 16px; padding: 18px 4px 8px; }
.bar { display: grid; grid-template-columns: 130px 1fr 44px; align-items: center; gap: 12px; font-size: 13px; color: var(--muted); }
.bar > div { height: 14px; border-radius: 4px; background: rgba(46,211,230,.08); overflow: hidden; } .bar i { display: block; height: 100%; border-radius: 4px; opacity: .75; }
.bar.on { color: var(--title); } .bar.on i { opacity: 1; } .bar b { text-align: right; color: var(--title); font-weight: 500; }
</style>
