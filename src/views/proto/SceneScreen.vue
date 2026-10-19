<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { RollbackOutlined, FullscreenOutlined, AlertOutlined } from '@ant-design/icons-vue'
import hero from '@/assets/login-hero.webp'
import DonutChart from '@/components/proto/DonutChart.vue'
import LineChart from '@/components/proto/LineChart.vue'
import DeviceGlyph from '@/components/proto/DeviceGlyph.vue'
import { DEVICES } from '@/mock/devices'
import { SCENES } from '@/mock/scenes'
import { TYPE_META, STATUS_META, type DeviceType, type DeviceStatus } from '@/models/device'
import { pad, rng } from '@/utils'

const router = useRouter()
/** 1920×1080 设计稿等比缩放 */
const scale = ref(1)
const fit = () => { scale.value = Math.min(window.innerWidth / 1920, window.innerHeight / 1080) }
const now = ref(new Date())
let t1 = 0, t2 = 0
const alertOff = ref(0)
onMounted(() => {
  fit(); window.addEventListener('resize', fit)
  t1 = window.setInterval(() => (now.value = new Date()), 1000)
  t2 = window.setInterval(() => (alertOff.value = (alertOff.value + 1) % ALERTS.length), 2600)
})
onBeforeUnmount(() => { window.removeEventListener('resize', fit); clearInterval(t1); clearInterval(t2) })
const clock = computed(() => `${pad(now.value.getHours())}:${pad(now.value.getMinutes())}:${pad(now.value.getSeconds())}`)
const dateStr = computed(() => { const d = now.value; return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 星期${'日一二三四五六'[d.getDay()]}` })
const goFull = () => document.documentElement.requestFullscreen?.().catch(() => {})
const back = () => (window.opener ? window.close() : router.push('/m/scene'))

const cnt = (s: DeviceStatus[]) => DEVICES.filter((d) => s.includes(d.status)).length
const online = cnt(['working', 'online', 'charging'])
const KPIS = [
  { l: '设备总数', v: DEVICES.length, u: '台' },
  { l: '在线率', v: Math.round((online / DEVICES.length) * 100), u: '%' },
  { l: '作业中', v: cnt(['working']), u: '台' },
  { l: '启用场景', v: SCENES.filter((s) => s.status === 'active').length, u: '个' },
  { l: '今日训练', v: 128, u: '次' },
  { l: '累计时长', v: SCENES.reduce((a, s) => a + s.hours, 0).toLocaleString('en-US'), u: 'h' },
]
const types = Object.keys(TYPE_META) as DeviceType[]
const byType = types.map((t) => ({ label: TYPE_META[t].label, color: TYPE_META[t].color, value: DEVICES.filter((d) => d.type === t).length, on: DEVICES.filter((d) => d.type === t && d.status !== 'offline' && d.status !== 'fault').length }))
const byStatus = (Object.keys(STATUS_META) as DeviceStatus[]).map((s) => ({ ...STATUS_META[s], n: cnt([s]) }))
const usage = SCENES.filter((s) => s.status !== 'draft').map((s, i) => ({ name: s.name, v: [92, 86, 78, 74, 61, 48, 42][i] ?? 30 }))

const r = rng(7)
const hours = Array.from({ length: 24 }, (_, i) => i)
const trendTrain = hours.map((h) => Math.round(4 + 10 * Math.max(0, Math.sin(((h - 6) / 14) * Math.PI)) + r() * 3))
const trendCollect = hours.map((h) => Math.round(2 + 6 * Math.max(0, Math.sin(((h - 7) / 13) * Math.PI)) + r() * 2))
const trendLabels = hours.map((h) => (h % 3 === 0 ? pad(h) + ':00' : ''))

/** 地图热点（hero 图 1800×1168 坐标） */
const SPOTS = [
  { n: '设备停机坪', x: 300, y: 830, s: '6 台充电中', c: '#FFB74D' },
  { n: '巡检模拟区', x: 560, y: 590, s: '机器狗 ×3 巡检', c: '#5B9BFF' },
  { n: '数据采集间', x: 980, y: 780, s: '遥操作采集中', c: '#4DD0E1' },
  { n: '数字孪生仿真台', x: 1060, y: 270, s: '同步延迟 18 ms', c: '#B48CFF' },
  { n: '楼梯攀爬区', x: 1250, y: 450, s: '人形 ×2 训练', c: '#4DE8B0' },
  { n: '复杂地形区', x: 1420, y: 630, s: '通过率 87%', c: '#4DE8B0' },
]
const ALERTS = [
  { lv: 'bad', t: '09:42:18', d: 'QD-B2-03', m: '左后腿关节温度过高 78℃' },
  { lv: 'warn', t: '09:40:05', d: 'UAV-M30-02', m: '电量低于 20%，已自动返航' },
  { lv: 'warn', t: '09:36:51', d: 'HM-WS1-01', m: '复杂地形区 跌倒检测触发' },
  { lv: 'info', t: '09:31:22', d: 'UGV-SC-04', m: '巡检任务 #2381 完成' },
  { lv: 'bad', t: '09:28:10', d: 'USV-02', m: '通信链路中断 32 s' },
  { lv: 'info', t: '09:22:47', d: 'SC-005', m: '数据采集间 进入维护模式' },
  { lv: 'warn', t: '09:15:03', d: 'QD-X30-01', m: '激光雷达点云丢帧率 3.2%' },
  { lv: 'info', t: '09:08:39', d: 'HM-H1-02', m: '遥操作采集 session 上传完成' },
]
const alerts = computed(() => Array.from({ length: 6 }, (_, i) => ALERTS[(alertOff.value + i) % ALERTS.length]))
const CAMS = [
  { n: 'CAM-01 楼梯攀爬区', x: 1250, y: 450 }, { n: 'CAM-04 巡检模拟区', x: 560, y: 590 },
  { n: 'CAM-07 数据采集间', x: 980, y: 780 }, { n: 'CAM-09 复杂地形区', x: 1420, y: 630 },
]
const camStyle = (c: { x: number; y: number }) => { const z = 3.4, px = ((c.x / 1800) * z - 0.5) / (z - 1) * 100, py = ((c.y / 1168) * z - 0.5) / (z - 1) * 100; return { backgroundImage: `url(${hero})`, backgroundSize: `${z * 100}% auto`, backgroundPosition: `${px}% ${py}%` } }
const RANK = [
  { n: 'HM-WS1-01', t: 'humanoid', task: '楼梯攀爬', s: 96.4 }, { n: 'QD-B2-01', t: 'quadruped', task: '复杂地形', s: 94.8 },
  { n: 'UGV-SC-02', t: 'ugv', task: '巡检读表', s: 92.1 }, { n: 'QD-X30-02', t: 'quadruped', task: '巡检覆盖', s: 90.6 },
  { n: 'UAV-M30-01', t: 'uav', task: '水域搜索', s: 88.3 }, { n: 'HM-H1-02', t: 'humanoid', task: '桌面抓取', s: 86.9 },
] as const
</script>

<template>
  <div class="ss-wrap">
    <div class="ss" :style="{ transform: `translate(-50%, -50%) scale(${scale})` }">
      <!-- 顶部标题 -->
      <header class="ss-top">
        <div class="ss-tl"><span class="ss-date">{{ dateStr }}</span><span class="ss-wea">晴 · 22℃ · 东南风 2 级</span></div>
        <div class="ss-title"><h1>具身智能训练场 · 实时态势</h1><small>EMBODIED AI TRAINING GROUND · REAL-TIME SITUATION</small></div>
        <div class="ss-tr"><span class="ss-clock">{{ clock }}</span><a-button size="small" ghost @click="goFull"><FullscreenOutlined /> 全屏</a-button><a-button size="small" ghost @click="back"><RollbackOutlined /> 返回</a-button></div>
      </header>

      <div class="ss-body">
        <!-- 左栏 -->
        <section class="ss-col">
          <div class="ss-panel">
            <h3>训练场概况</h3>
            <div class="ss-kpis"><div v-for="k in KPIS" :key="k.l" class="ss-kpi"><b>{{ k.v }}<i>{{ k.u }}</i></b><span>{{ k.l }}</span></div></div>
          </div>
          <div class="ss-panel">
            <h3>设备在线状态</h3>
            <div class="ss-dev">
              <DonutChart :data="byType" :size="170" :title="`${online}/${DEVICES.length}`" sub="在线 / 总数" />
              <ul class="ss-legend"><li v-for="t in byType" :key="t.label"><i :style="{ background: t.color }" />{{ t.label }}<b>{{ t.on }}<em>/{{ t.value }}</em></b></li></ul>
            </div>
            <div class="ss-stat"><span v-for="s in byStatus" :key="s.label"><i :style="{ background: s.color }" />{{ s.label }} <b :style="{ color: s.color }">{{ s.n }}</b></span></div>
          </div>
          <div class="ss-panel grow">
            <h3>场景使用率 <small>今日</small></h3>
            <div v-for="u in usage" :key="u.name" class="ss-bar"><span>{{ u.name }}</span><div><i :style="{ width: u.v + '%' }" /></div><b>{{ u.v }}%</b></div>
          </div>
        </section>

        <!-- 中间 -->
        <section class="ss-mid">
          <div class="ss-map">
            <img :src="hero" alt="" />
            <svg viewBox="0 0 1800 1168" preserveAspectRatio="xMidYMid slice">
              <path d="M300 830 L560 590 L980 780 L1250 450 L1420 630" fill="none" stroke="#4DD0E1" stroke-width="4" stroke-dasharray="14 12" opacity=".7"><animate attributeName="stroke-dashoffset" from="0" to="-52" dur="1.6s" repeatCount="indefinite" /></path>
              <g v-for="s in SPOTS" :key="s.n" :transform="`translate(${s.x} ${s.y})`">
                <circle r="16" :fill="s.c" opacity=".9" /><circle r="16" fill="none" :stroke="s.c" stroke-width="3"><animate attributeName="r" values="16;54" dur="2.4s" repeatCount="indefinite" /><animate attributeName="opacity" values=".9;0" dur="2.4s" repeatCount="indefinite" /></circle>
              </g>
            </svg>
            <div v-for="s in SPOTS" :key="s.n" class="ss-tag" :style="{ left: (s.x / 18) + '%', top: (s.y / 11.68) + '%', '--c': s.c }"><b>{{ s.n }}</b><span>{{ s.s }}</span></div>
            <div class="ss-map-hd"><span>训练场地图</span><em>LIVE</em></div>
            <i class="ss-c tl" /><i class="ss-c tr" /><i class="ss-c bl" /><i class="ss-c br" />
          </div>
          <div class="ss-panel ss-trend">
            <h3>24h 训练趋势 <span class="ss-lg"><i style="background:#4DD0E1" />训练任务<i style="background:#B48CFF" />采集任务</span></h3>
            <LineChart :series="[{ name: '训练', color: '#4DD0E1', data: trendTrain }, { name: '采集', color: '#B48CFF', data: trendCollect }]" :labels="trendLabels" :height="170" :min="0" />
          </div>
        </section>

        <!-- 右栏 -->
        <section class="ss-col">
          <div class="ss-panel">
            <h3><AlertOutlined /> 实时告警 <small>今日 23 条</small></h3>
            <TransitionGroup name="ss-al" tag="ul" class="ss-alerts">
              <li v-for="a in alerts" :key="a.t + a.d" :class="a.lv"><i />{{ a.t }}<b>{{ a.d }}</b><span>{{ a.m }}</span></li>
            </TransitionGroup>
          </div>
          <div class="ss-panel">
            <h3>视频监控 <small>4 / 32 路</small></h3>
            <div class="ss-cams"><div v-for="c in CAMS" :key="c.n" class="ss-cam" :style="camStyle(c)"><span class="rec">● REC</span><span class="cn">{{ c.n }}</span></div></div>
          </div>
          <div class="ss-panel grow">
            <h3>评测成绩排行 <small>本周</small></h3>
            <div v-for="(k, i) in RANK" :key="k.n" class="ss-rank"><em :class="'r' + i">{{ i + 1 }}</em><DeviceGlyph :type="k.t" :size="22" :color="TYPE_META[k.t].color" /><b>{{ k.n }}</b><span>{{ k.task }}</span><div><i :style="{ width: k.s + '%' }" /></div><strong>{{ k.s }}</strong></div>
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
.ss-top { position: relative; height: 92px; flex: none; display: flex; align-items: center; justify-content: space-between; padding: 0 28px;
  background: linear-gradient(180deg, rgba(13,40,64,.9), transparent); }
.ss-top::after { content: ''; position: absolute; left: 0; right: 0; bottom: 8px; height: 2px; background: linear-gradient(90deg, transparent, var(--c1) 30%, transparent 38%, transparent 62%, var(--c1) 70%, transparent); opacity: .6; }
.ss-title { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 760px; height: 82px; text-align: center; padding-top: 8px;
  background: linear-gradient(180deg, rgba(38,198,218,.22), rgba(38,198,218,.03)); clip-path: polygon(0 0, 100% 0, 92% 100%, 8% 100%); border-bottom: 2px solid var(--c1); }
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
.ss-panel h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; padding: 4px 0 6px 14px; font-size: 18px; font-weight: 600; letter-spacing: 2px; color: #fff;
  background: linear-gradient(90deg, rgba(38,198,218,.28), transparent 70%); border-left: 3px solid var(--c1); }
.ss-panel h3 small { margin-left: auto; font-size: 12px; font-weight: 400; color: #8FB3C7; letter-spacing: 0; }
.ss-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.ss-kpi { padding: 10px 0; text-align: center; background: rgba(77,208,225,.06); border: 1px solid rgba(77,208,225,.14); }
.ss-kpi b { display: block; font: 700 28px var(--mono); color: #7FF3FF; text-shadow: 0 0 10px rgba(77,208,225,.5); }
.ss-kpi i { font-style: normal; font-size: 13px; color: #8FB3C7; margin-left: 3px; font-weight: 400; }
.ss-kpi span { font-size: 13px; color: #8FB3C7; }
.ss-dev { display: flex; align-items: center; gap: 18px; }
.ss-legend { flex: 1; list-style: none; margin: 0; padding: 0; }
.ss-legend li { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 14px; color: #B9D4E0; border-bottom: 1px dashed rgba(77,208,225,.12); }
.ss-legend li i { width: 9px; height: 9px; transform: rotate(45deg); }
.ss-legend b { margin-left: auto; font: 600 16px var(--mono); color: #fff; } .ss-legend em { font-style: normal; color: #5B7486; font-size: 13px; }
.ss-stat { display: flex; justify-content: space-between; margin-top: 12px; font-size: 13px; color: #8FB3C7; }
.ss-stat i { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 4px; } .ss-stat b { font-family: var(--mono); }
.ss-bar { display: grid; grid-template-columns: 116px 1fr 46px; align-items: center; gap: 10px; margin: 9px 0; font-size: 14px; color: #B9D4E0; }
.ss-bar > div { height: 10px; background: rgba(77,208,225,.08); }
.ss-bar i { display: block; height: 100%; background: linear-gradient(90deg, #12B5CB, #7FF3FF); box-shadow: 0 0 8px rgba(77,208,225,.5); }
.ss-bar b { font: 600 14px var(--mono); color: #7FF3FF; text-align: right; }
.ss-map { position: relative; flex: 1; min-height: 0; overflow: hidden; border: 1px solid rgba(77,208,225,.3); box-shadow: inset 0 0 60px rgba(4,12,22,.8); }
.ss-map img, .ss-map svg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.ss-map img { filter: saturate(1.05) brightness(.9); }
.ss-tag { position: absolute; transform: translate(-50%, calc(-100% - 26px)); padding: 6px 12px; background: rgba(6,20,34,.86); border: 1px solid var(--c); border-left-width: 3px; white-space: nowrap; display: flex; flex-direction: column; line-height: 1.35; box-shadow: 0 0 14px color-mix(in srgb, var(--c) 40%, transparent); }
.ss-tag b { font-size: 15px; color: #fff; } .ss-tag span { font-size: 12px; color: var(--c); }
.ss-map-hd { position: absolute; left: 0; top: 0; display: flex; gap: 10px; align-items: center; padding: 8px 18px; font-size: 16px; letter-spacing: 2px; background: linear-gradient(90deg, rgba(6,20,34,.92), transparent); }
.ss-map-hd em { font: 600 11px var(--mono); font-style: normal; color: #FF6B6B; padding: 1px 6px; border: 1px solid #FF6B6B; animation: ss-blink 1.6s steps(2) infinite; }
.ss-c { position: absolute; width: 26px; height: 26px; border: 3px solid var(--c1); }
.ss-c.tl { left: 6px; top: 6px; border-right: 0; border-bottom: 0; } .ss-c.tr { right: 6px; top: 6px; border-left: 0; border-bottom: 0; }
.ss-c.bl { left: 6px; bottom: 6px; border-right: 0; border-top: 0; } .ss-c.br { right: 6px; bottom: 6px; border-left: 0; border-top: 0; }
.ss-trend { flex: none; height: 240px; } .ss-trend :deep(svg) { width: 100%; }
.ss-lg { margin-left: auto; display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 400; color: #8FB3C7; letter-spacing: 0; }
.ss-lg i { width: 14px; height: 3px; margin-left: 10px; }
.ss-alerts { list-style: none; margin: 0; padding: 0; height: 222px; overflow: hidden; }
.ss-alerts li { display: grid; grid-template-columns: 10px 70px 100px 1fr; align-items: center; gap: 8px; height: 37px; font: 13px var(--mono); color: #8FB3C7; border-bottom: 1px dashed rgba(77,208,225,.12); }
.ss-alerts li i { width: 8px; height: 8px; border-radius: 50%; background: #4DD0E1; }
.ss-alerts li.warn i { background: #FFB74D; box-shadow: 0 0 6px #FFB74D; } .ss-alerts li.bad i { background: #FF6B6B; box-shadow: 0 0 8px #FF6B6B; }
.ss-alerts li b { color: #fff; font-weight: 500; } .ss-alerts li span { font-family: system-ui, sans-serif; color: #B9D4E0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ss-alerts li.bad span { color: #FF9C9C; }
.ss-al-move, .ss-al-enter-active, .ss-al-leave-active { transition: all .5s ease; }
.ss-al-enter-from { opacity: 0; transform: translateY(-10px); } .ss-al-leave-to { opacity: 0; } .ss-al-leave-active { position: absolute; }
.ss-cams { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ss-cam { position: relative; aspect-ratio: 16 / 10; background-repeat: no-repeat; border: 1px solid rgba(77,208,225,.25); }
.ss-cam::after { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,.12) 0 1px, transparent 1px 3px); pointer-events: none; }
.ss-cam .rec { position: absolute; right: 6px; top: 4px; font: 600 10px var(--mono); color: #FF6B6B; animation: ss-blink 1.6s steps(2) infinite; }
.ss-cam .cn { position: absolute; left: 0; right: 0; bottom: 0; padding: 3px 8px; font-size: 12px; background: linear-gradient(0deg, rgba(4,12,22,.9), transparent); }
.ss-rank { display: grid; grid-template-columns: 26px 24px 104px 70px 1fr 44px; align-items: center; gap: 8px; height: 31px; font-size: 13px; color: #8FB3C7; }
.ss-rank em { font: 700 13px var(--mono); font-style: normal; text-align: center; color: #8FB3C7; background: rgba(77,208,225,.1); }
.ss-rank em.r0 { color: #1a1200; background: #FFD54F; } .ss-rank em.r1 { color: #111; background: #CFD8DC; } .ss-rank em.r2 { color: #1a0d00; background: #FFAB70; }
.ss-rank b { font: 500 13px var(--mono); color: #fff; }
.ss-rank > div { height: 6px; background: rgba(77,208,225,.08); } .ss-rank > div i { display: block; height: 100%; background: linear-gradient(90deg, #1E88E5, #4DD0E1); }
.ss-rank strong { font: 600 14px var(--mono); color: #7FF3FF; text-align: right; }
@keyframes ss-blink { 50% { opacity: .25; } }
</style>
