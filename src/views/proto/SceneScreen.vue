<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { RollbackOutlined, FullscreenOutlined, BellOutlined } from '@ant-design/icons-vue'
import DonutChart from '@/components/proto/DonutChart.vue'
import LineChart from '@/components/proto/LineChart.vue'
import ScenePlan from '@/components/proto/ScenePlan.vue'
import { SCENES, SCENE_STATUS, SCENE_TYPES, TYPE_COLOR } from '@/mock/scenes'
import { pad, rng } from '@/utils'

document.title = '训练场实时态势 · 具身智能训练场'
const router = useRouter()
/** 1920×1080 设计稿等比缩放 */
const scale = ref(1)
const fit = () => { scale.value = Math.min(window.innerWidth / 1920, window.innerHeight / 1080) }
const now = ref(new Date())
let t1 = 0, t2 = 0
const evOff = ref(0)
onMounted(() => {
  fit(); window.addEventListener('resize', fit)
  t1 = window.setInterval(() => (now.value = new Date()), 1000)
  t2 = window.setInterval(() => (evOff.value = (evOff.value + 1) % EVENTS.length), 2800)
})
onBeforeUnmount(() => { window.removeEventListener('resize', fit); clearInterval(t1); clearInterval(t2) })
const clock = computed(() => `${pad(now.value.getHours())}:${pad(now.value.getMinutes())}:${pad(now.value.getSeconds())}`)
const dateStr = computed(() => { const d = now.value; return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 星期${'日一二三四五六'[d.getDay()]}` })
const goFull = () => document.documentElement.requestFullscreen?.().catch(() => {})
const back = () => (window.opener ? window.close() : router.push('/m/scene'))

/** 当前使用中的场景（示例） */
const INUSE: Record<string, string> = { 'SC-001': '一组 · 综合科目', 'SC-002': '二组 · 攀爬训练', 'SC-004': '三组 · 巡检演练', 'SC-006': '应急组 · 水面搜救' }
const KPIS = [
  { l: '场景总数', v: SCENES.length, u: '个' },
  { l: '启用中', v: SCENES.filter((s) => s.status === 'active').length, u: '个' },
  { l: '使用中', v: Object.keys(INUSE).length, u: '个' },
  { l: '场地面积', v: SCENES.reduce((a, s) => a + s.area, 0).toLocaleString('en-US'), u: 'm²' },
  { l: '今日预约', v: 14, u: '场' },
  { l: '累计使用', v: SCENES.reduce((a, s) => a + s.hours, 0).toLocaleString('en-US'), u: 'h' },
]
const byType = SCENE_TYPES.map((t) => ({ label: t, color: TYPE_COLOR[t], value: SCENES.filter((s) => s.type === t).length, area: SCENES.filter((s) => s.type === t).reduce((a, s) => a + s.area, 0) })).filter((x) => x.value)
const usage = SCENES.filter((s) => s.status !== 'draft').map((s, i) => ({ name: s.name, v: [92, 86, 78, 74, 61, 48, 42][i] ?? 30, c: TYPE_COLOR[s.type] }))

const r = rng(11)
const hours = Array.from({ length: 24 }, (_, i) => i)
const trendUse = hours.map((h) => (h < 7 || h > 21 ? (r() > 0.6 ? 1 : 0) : Math.round(2 + 3 * Math.sin(((h - 7) / 14) * Math.PI) + r())))
const trendPeople = hours.map((h) => (h < 7 || h > 21 ? Math.round(r() * 2) : Math.round(6 + 14 * Math.sin(((h - 7) / 14) * Math.PI) + r() * 4)))
const trendLabels = hours.map((h) => (h % 3 === 0 ? pad(h) + ':00' : ''))

const EVENTS = [
  { lv: 'warn', t: '09:42:18', s: '巡检模拟区', m: '噪声 63 dB 超过预警阈值' },
  { lv: 'info', t: '09:40:05', s: '综合训练场 A', m: '预约开始 · 一组 综合科目' },
  { lv: 'bad', t: '09:36:51', s: '水域救援池', m: '2 号造浪机 电机过热停机' },
  { lv: 'info', t: '09:31:22', s: '楼梯攀爬区', m: '门禁通行 · 二组 3 人' },
  { lv: 'warn', t: '09:28:10', s: '水域救援池', m: '环境湿度 78% 偏高' },
  { lv: 'info', t: '09:22:47', s: '操作训练间', m: '进入维护模式 · 预计 14:00 恢复' },
  { lv: 'info', t: '09:15:03', s: '室外越野道', m: '场地巡查完成 · 状态正常' },
  { lv: 'warn', t: '09:08:39', s: '复杂地形区', m: '起伏地形块 #4 位移待复位' },
]
const events = computed(() => Array.from({ length: 6 }, (_, i) => EVENTS[(evOff.value + i) % EVENTS.length]))
const CAMS = ['SC-002', 'SC-004', 'SC-006', 'SC-003'].map((id, i) => ({ s: SCENES.find((x) => x.id === id)!, n: `CAM-${pad([1, 4, 9, 7][i])}` }))
const BOOK = [
  { t: '08:30–10:00', s: '楼梯攀爬区', team: '二组', st: 'done' }, { t: '09:00–11:30', s: '综合训练场 A', team: '一组', st: 'run' },
  { t: '09:30–11:00', s: '巡检模拟区', team: '三组', st: 'run' }, { t: '09:30–12:00', s: '水域救援池', team: '应急组', st: 'run' },
  { t: '13:00–15:00', s: '复杂地形区', team: '二组', st: 'wait' }, { t: '14:00–16:30', s: '室外越野道', team: '外部单位', st: 'wait' },
  { t: '15:30–17:00', s: '楼梯攀爬区', team: '一组', st: 'wait' },
]
const ST = { done: { t: '已结束', c: '#5B7486' }, run: { t: '进行中', c: '#4DE8B0' }, wait: { t: '待开始', c: '#4DD0E1' } } as const
</script>

<template>
  <div class="ss-wrap">
    <div class="ss" :style="{ transform: `translate(-50%, -50%) scale(${scale})` }">
      <header class="ss-top">
        <div class="ss-tl"><span class="ss-date">{{ dateStr }}</span><span class="ss-wea">晴 · 22℃ · 东南风 2 级</span></div>
        <div class="ss-title"><h1>具身智能训练场 · 实时态势</h1><small>EMBODIED AI TRAINING GROUND · REAL-TIME SITUATION</small></div>
        <div class="ss-tr"><span class="ss-clock">{{ clock }}</span><a-button size="small" ghost @click="goFull"><FullscreenOutlined /> 全屏</a-button><a-button size="small" ghost @click="back"><RollbackOutlined /> 返回</a-button></div>
      </header>

      <div class="ss-body">
        <section class="ss-col">
          <div class="ss-panel">
            <h3>训练场概况</h3>
            <div class="ss-kpis"><div v-for="k in KPIS" :key="k.l" class="ss-kpi"><b>{{ k.v }}<i>{{ k.u }}</i></b><span>{{ k.l }}</span></div></div>
          </div>
          <div class="ss-panel">
            <h3>场景类型分布</h3>
            <div class="ss-dev">
              <DonutChart :data="byType" :size="170" :title="`${SCENES.length}`" sub="场景总数" />
              <ul class="ss-legend"><li v-for="t in byType" :key="t.label"><i :style="{ background: t.color }" />{{ t.label }}<b>{{ t.value }}<em> 个 · {{ t.area }} m²</em></b></li></ul>
            </div>
          </div>
          <div class="ss-panel grow">
            <h3>场景使用率 <small>今日</small></h3>
            <div v-for="u in usage" :key="u.name" class="ss-bar"><span>{{ u.name }}</span><div><i :style="{ width: u.v + '%' }" /></div><b>{{ u.v }}%</b></div>
          </div>
        </section>

        <section class="ss-mid">
          <div class="ss-map">
            <svg class="ss-site" viewBox="0 0 160 90" preserveAspectRatio="none">
              <defs><pattern id="ss-g" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M4 0H0V4" fill="none" stroke="#4DD0E1" stroke-opacity=".06" stroke-width=".2" /></pattern></defs>
              <rect width="160" height="90" fill="#06121F" /><rect width="160" height="90" fill="url(#ss-g)" />
              <path d="M2 50 H158 M64 2 V88 M128 2 V88 M94 2 V50" stroke="#16324A" stroke-width="2.4" fill="none" />
              <path d="M2 50 H158 M64 2 V88 M128 2 V88 M94 2 V50" stroke="#4DD0E1" stroke-opacity=".35" stroke-width=".25" stroke-dasharray="1.6 1.4" fill="none" />
              <g transform="translate(132 54)"><rect width="22" height="18" rx=".6" fill="#4DD0E1" fill-opacity=".08" stroke="#4DD0E1" stroke-opacity=".4" stroke-width=".3" /><rect x="3" y="3" width="7" height="5" fill="#4DD0E1" fill-opacity=".18" /><rect x="12" y="3" width="7" height="5" fill="#4DD0E1" fill-opacity=".18" /><rect x="3" y="10" width="16" height="5" fill="#4DD0E1" fill-opacity=".12" /><text x="11" y="20.6" text-anchor="middle" fill="#8FB3C7" font-size="1.8">综合楼 · 监控中心</text></g>
              <g v-for="s in SCENES" :key="s.id">
                <ScenePlan nested :items="s.plan" :labels="false" :anim="!!INUSE[s.id]" :dim="s.status !== 'active'" :x="s.site[0]" :y="s.site[1]" :width="s.site[2]" :height="s.site[3]" />
                <rect :x="s.site[0]" :y="s.site[1]" :width="s.site[2]" :height="s.site[3]" fill="none" :stroke="INUSE[s.id] ? '#4DE8B0' : SCENE_STATUS[s.status].c" :stroke-width="INUSE[s.id] ? .5 : .3" :stroke-opacity="INUSE[s.id] ? 1 : .6">
                  <animate v-if="INUSE[s.id]" attributeName="stroke-opacity" values="1;.35;1" dur="2.4s" repeatCount="indefinite" />
                </rect>
              </g>
            </svg>
            <div v-for="s in SCENES" :key="s.id" class="ss-tag" :class="{ on: INUSE[s.id], [s.status]: true }" :style="{ left: (s.site[0] / 1.6) + '%', top: (s.site[1] / 0.9) + '%', '--c': TYPE_COLOR[s.type] }">
              <b>{{ s.name }}</b><span>{{ INUSE[s.id] ?? SCENE_STATUS[s.status].t }}</span>
            </div>
            <div class="ss-map-hd"><span>训练场总平面图</span><em>LIVE</em></div>
            <div class="ss-map-lg"><span><i style="background:#4DE8B0" />使用中</span><span><i style="background:#4DD0E1" />空闲</span><span><i style="background:#FFB74D" />维护中</span><span><i style="background:#5B7486" />规划中</span></div>
            <i class="ss-c tl" /><i class="ss-c tr" /><i class="ss-c bl" /><i class="ss-c br" />
          </div>
          <div class="ss-panel ss-trend">
            <h3>24h 场地使用趋势 <span class="ss-lg"><i style="background:#4DD0E1" />在场人次<i style="background:#4DE8B0" />使用中场景</span></h3>
            <LineChart :series="[{ name: '人次', color: '#4DD0E1', data: trendPeople }, { name: '场景', color: '#4DE8B0', data: trendUse }]" :labels="trendLabels" :height="170" :min="0" :max="24" />
          </div>
        </section>

        <section class="ss-col">
          <div class="ss-panel">
            <h3><BellOutlined /> 场地事件 <small>今日 23 条</small></h3>
            <TransitionGroup name="ss-al" tag="ul" class="ss-alerts">
              <li v-for="a in events" :key="a.t + a.s" :class="a.lv"><i />{{ a.t }}<b>{{ a.s }}</b><span>{{ a.m }}</span></li>
            </TransitionGroup>
          </div>
          <div class="ss-panel">
            <h3>视频监控 <small>4 / 32 路</small></h3>
            <div class="ss-cams">
              <div v-for="c in CAMS" :key="c.n" class="ss-cam">
                <div class="view"><ScenePlan :items="c.s.plan" :labels="false" /></div>
                <span class="rec">● REC</span><span class="cn">{{ c.n }} · {{ c.s.name }}</span>
              </div>
            </div>
          </div>
          <div class="ss-panel grow">
            <h3>今日预约排程 <small>14 场</small></h3>
            <div v-for="b in BOOK" :key="b.t + b.s" class="ss-book" :class="b.st"><span class="mono">{{ b.t }}</span><b>{{ b.s }}</b><span>{{ b.team }}</span><em :style="{ color: ST[b.st as keyof typeof ST].c, borderColor: ST[b.st as keyof typeof ST].c }">{{ ST[b.st as keyof typeof ST].t }}</em></div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ss-wrap { position: fixed; inset: 0; overflow: hidden; background: #040C16; }
.ss { --c1: #4DD0E1; --mono: 'JetBrains Mono', Consolas, monospace; position: absolute; left: 50%; top: 50%; width: 1920px; height: 1080px; display: flex; flex-direction: column; color: #E6F7FB;
  background: linear-gradient(rgba(77,208,225,.04) 1px, transparent 1px) 0 0 / 48px 48px, linear-gradient(90deg, rgba(77,208,225,.04) 1px, transparent 1px) 0 0 / 48px 48px, radial-gradient(ellipse 70% 60% at 50% 45%, #0D2840, #050F1B 75%); }
.mono { font-family: var(--mono); }
.ss-top { position: relative; height: 92px; flex: none; display: flex; align-items: center; justify-content: space-between; padding: 0 28px; background: linear-gradient(180deg, rgba(13,40,64,.9), transparent); }
.ss-top::after { content: ''; position: absolute; left: 0; right: 0; bottom: 8px; height: 2px; background: linear-gradient(90deg, transparent, var(--c1) 30%, transparent 38%, transparent 62%, var(--c1) 70%, transparent); opacity: .6; }
.ss-title { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 760px; height: 82px; text-align: center; padding-top: 8px; background: linear-gradient(180deg, rgba(38,198,218,.22), rgba(38,198,218,.03)); clip-path: polygon(0 0, 100% 0, 92% 100%, 8% 100%); border-bottom: 2px solid var(--c1); }
.ss-title h1 { margin: 0; line-height: 1.3; font-size: 34px; font-weight: 700; letter-spacing: 6px; color: #fff; text-shadow: 0 0 18px rgba(77,208,225,.7); }
.ss-title small { display: block; margin-top: 2px; font: 10px var(--mono); letter-spacing: 3px; color: var(--c1); opacity: .75; }
.ss-tl, .ss-tr { display: flex; align-items: center; gap: 18px; font-size: 15px; color: #8FB3C7; }
.ss-clock { font: 600 26px var(--mono); color: #fff; letter-spacing: 2px; margin-right: 8px; }
.ss-tr :deep(.ant-btn) { border-color: rgba(77,208,225,.45); color: var(--c1); }
.ss-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 470px 1fr 470px; gap: 18px; padding: 8px 22px 22px; }
.ss-col, .ss-mid { display: flex; flex-direction: column; gap: 16px; min-height: 0; }
.ss-panel { position: relative; padding: 14px 18px 16px; background: linear-gradient(180deg, rgba(16,38,59,.82), rgba(10,27,43,.7)); border: 1px solid rgba(77,208,225,.2); }
.ss-panel::before { content: ''; position: absolute; left: -1px; top: -1px; width: 14px; height: 14px; border-left: 2px solid var(--c1); border-top: 2px solid var(--c1); }
.ss-panel::after { content: ''; position: absolute; right: -1px; bottom: -1px; width: 14px; height: 14px; border-right: 2px solid var(--c1); border-bottom: 2px solid var(--c1); }
.ss-panel.grow { flex: 1; min-height: 0; overflow: hidden; }
.ss-panel h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; padding: 4px 0 6px 14px; font-size: 18px; font-weight: 600; letter-spacing: 2px; color: #fff; background: linear-gradient(90deg, rgba(38,198,218,.28), transparent 70%); border-left: 3px solid var(--c1); }
.ss-panel h3 small { margin-left: auto; font-size: 12px; font-weight: 400; color: #8FB3C7; letter-spacing: 0; }
.ss-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.ss-kpi { padding: 10px 0; text-align: center; background: rgba(77,208,225,.06); border: 1px solid rgba(77,208,225,.14); }
.ss-kpi b { display: block; font: 700 28px var(--mono); color: #7FF3FF; text-shadow: 0 0 10px rgba(77,208,225,.5); }
.ss-kpi i { font-style: normal; font-size: 13px; color: #8FB3C7; margin-left: 3px; font-weight: 400; }
.ss-kpi span { font-size: 13px; color: #8FB3C7; }
.ss-dev { display: flex; align-items: center; gap: 18px; }
.ss-legend { flex: 1; list-style: none; margin: 0; padding: 0; }
.ss-legend li { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 14px; color: #B9D4E0; border-bottom: 1px dashed rgba(77,208,225,.12); }
.ss-legend li i { width: 9px; height: 9px; transform: rotate(45deg); }
.ss-legend b { margin-left: auto; font: 600 16px var(--mono); color: #fff; } .ss-legend em { font-style: normal; color: #5B7486; font-size: 12px; font-weight: 400; }
.ss-bar { display: grid; grid-template-columns: 116px 1fr 46px; align-items: center; gap: 10px; margin: 10px 0; font-size: 14px; color: #B9D4E0; }
.ss-bar > div { height: 10px; background: rgba(77,208,225,.08); }
.ss-bar i { display: block; height: 100%; background: linear-gradient(90deg, #12B5CB, #7FF3FF); box-shadow: 0 0 8px rgba(77,208,225,.5); }
.ss-bar b { font: 600 14px var(--mono); color: #7FF3FF; text-align: right; }
.ss-map { position: relative; flex: 1; min-height: 0; overflow: hidden; border: 1px solid rgba(77,208,225,.3); }
.ss-site { position: absolute; inset: 0; width: 100%; height: 100%; }
.ss-tag { position: absolute; transform: translate(6px, 6px); padding: 4px 10px; background: rgba(6,20,34,.82); border: 1px solid color-mix(in srgb, var(--c) 60%, transparent); border-left: 3px solid var(--c); display: flex; flex-direction: column; line-height: 1.35; pointer-events: none; }
.ss-tag b { font-size: 15px; color: #fff; } .ss-tag span { font-size: 12px; color: #8FB3C7; }
.ss-tag.on { box-shadow: 0 0 16px rgba(77,232,176,.35); } .ss-tag.on span { color: #4DE8B0; }
.ss-tag.maint span { color: #FFB74D; } .ss-tag.draft { opacity: .75; }
.ss-map-hd { position: absolute; right: 0; top: 0; display: flex; gap: 10px; align-items: center; padding: 8px 18px; font-size: 16px; letter-spacing: 2px; background: linear-gradient(270deg, rgba(6,20,34,.92), transparent); }
.ss-map-hd em { font: 600 11px var(--mono); font-style: normal; color: #FF6B6B; padding: 1px 6px; border: 1px solid #FF6B6B; animation: ss-blink 1.6s steps(2) infinite; }
.ss-map-lg { position: absolute; right: 16px; bottom: 12px; display: flex; gap: 16px; padding: 6px 12px; font-size: 13px; color: #B9D4E0; background: rgba(6,20,34,.82); border: 1px solid rgba(77,208,225,.2); }
.ss-map-lg i { display: inline-block; width: 10px; height: 10px; margin-right: 6px; border-radius: 4px; vertical-align: -1px; }
.ss-c { position: absolute; width: 26px; height: 26px; border: 3px solid var(--c1); pointer-events: none; }
.ss-c.tl { left: 6px; top: 6px; border-right: 0; border-bottom: 0; } .ss-c.tr { right: 6px; top: 6px; border-left: 0; border-bottom: 0; }
.ss-c.bl { left: 6px; bottom: 6px; border-right: 0; border-top: 0; } .ss-c.br { right: 6px; bottom: 6px; border-left: 0; border-top: 0; }
.ss-trend { flex: none; height: 240px; } .ss-trend :deep(svg) { width: 100%; }
.ss-lg { margin-left: auto; display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 400; color: #8FB3C7; letter-spacing: 0; }
.ss-lg i { width: 14px; height: 3px; margin-left: 10px; }
.ss-alerts { list-style: none; margin: 0; padding: 0; height: 222px; overflow: hidden; }
.ss-alerts li { display: grid; grid-template-columns: 10px 70px 104px 1fr; align-items: center; gap: 8px; height: 37px; font: 13px var(--mono); color: #8FB3C7; border-bottom: 1px dashed rgba(77,208,225,.12); }
.ss-alerts li i { width: 8px; height: 8px; border-radius: 50%; background: #4DD0E1; }
.ss-alerts li.warn i { background: #FFB74D; box-shadow: 0 0 6px #FFB74D; } .ss-alerts li.bad i { background: #FF6B6B; box-shadow: 0 0 8px #FF6B6B; }
.ss-alerts li b { color: #fff; font-weight: 500; font-family: system-ui, sans-serif; } .ss-alerts li span { font-family: system-ui, sans-serif; color: #B9D4E0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ss-alerts li.bad span { color: #FF9C9C; }
.ss-al-move, .ss-al-enter-active, .ss-al-leave-active { transition: all .5s ease; }
.ss-al-enter-from { opacity: 0; transform: translateY(-10px); } .ss-al-leave-to { opacity: 0; } .ss-al-leave-active { position: absolute; }
.ss-cams { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ss-cam { position: relative; aspect-ratio: 16 / 10; overflow: hidden; background: #050E18; border: 1px solid rgba(77,208,225,.25); perspective: 300px; }
.ss-cam .view { position: absolute; left: -12%; right: -12%; top: 4%; bottom: -30%; transform: rotateX(48deg) rotateZ(-8deg); transform-origin: 50% 40%; filter: brightness(1.1) contrast(1.1); }
.ss-cam::after { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,.18) 0 1px, transparent 1px 3px), radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,.55)); pointer-events: none; }
.ss-cam .rec { position: absolute; z-index: 1; right: 6px; top: 4px; font: 600 10px var(--mono); color: #FF6B6B; animation: ss-blink 1.6s steps(2) infinite; }
.ss-cam .cn { position: absolute; z-index: 1; left: 0; right: 0; bottom: 0; padding: 3px 8px; font-size: 12px; background: linear-gradient(0deg, rgba(4,12,22,.95), transparent); }
.ss-book { display: grid; grid-template-columns: 104px 1fr 70px 58px; align-items: center; gap: 8px; height: 33px; font-size: 13px; color: #8FB3C7; border-bottom: 1px dashed rgba(77,208,225,.12); }
.ss-book b { color: #fff; font-weight: 500; } .ss-book.done { opacity: .55; }
.ss-book em { font-style: normal; font-size: 12px; text-align: center; border: 1px solid; border-radius: 4px; line-height: 20px; }
@keyframes ss-blink { 50% { opacity: .25; } }
</style>
