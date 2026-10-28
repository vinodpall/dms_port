<script setup lang="ts">
/** 首页：对齐 robot_web Home.vue 三栏结构 —— 左 视频/任务统计 · 中 地图/实时警情 · 右 状态/控制/任务下发 */
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { AimOutlined, ExpandOutlined, CompressOutlined, ReloadOutlined, PauseOutlined, CaretRightOutlined, SendOutlined, AudioOutlined, AudioMutedOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons-vue'
import MapSlot from './MapSlot.vue'
import WebRtcVideo from '@/components/viz/WebRtcVideo.vue'
import CamShot from './CamShot.vue'
import { toReal } from './geo'
import imgCar from '@/assets/models/knight.webp'
import imgX30 from '@/assets/models/x30.webp'
import imgGo2 from '@/assets/models/go2.webp'
import { streamsOf } from '@/config/media'
import { KIND_META, GAITS, ZONES, SENSORS, alarmColor, type BizAlarm } from '@/mock/biz'
import {
  robot, rt, isDog, isIns, hasNav, locText, db, curId, myMaps, myRoutes, myGroups, routeById, groupById,
  togglePause, stopRun, toggleNav, toggleIns, toggleMsf, openLaunch,
} from './store'

const emit = defineEmits<{ go: [tab: string, sub?: string] }>()
const on = computed(() => robot.value.online)
const latency = ref(robot.value.latency)
const tm = setInterval(() => { latency.value = on.value ? Math.round(robot.value.latency + (Math.random() - 0.5) * 8) : 0 }, 1000)
onBeforeUnmount(() => clearInterval(tm))
const speed = computed(() => (rt.value.run && !rt.value.pause ? rt.value.speed : 0))
const pose = computed(() => ({ x: toReal(rt.value.pose.x, rt.value.pose.y).x.toFixed(2), y: toReal(rt.value.pose.x, rt.value.pose.y).y.toFixed(2) }))

/* 任务统计 */
const run = computed(() => rt.value.run)
const runRoute = computed(() => routeById(run.value?.route)); const runGroup = computed(() => groupById(run.value?.group))
const pts = computed(() => runGroup.value?.points ?? [])
const doneN = computed(() => (run.value ? pts.value.filter((p, i) => (runRoute.value ? p.f : i / Math.max(1, pts.value.length - 1)) < run.value!.progress - 0.01).length : 0))
const mapPts = computed(() => pts.value.map((p, i) => ({ mx: p.mx, my: p.my, st: (i < doneN.value ? 'done' : i === doneN.value ? 'cur' : 'todo') as 'done' | 'cur' | 'todo' })))

/* 地图 */
const mapMode = ref<'cloud' | 'grid' | 'sat'>('cloud')

/* 实时警情 */
const alarms = computed(() => db.alarms.filter((a) => a.robot === curId.value).slice(0, 6))
const pic = ref<BizAlarm | null>(null)

/* 机器狗控制（对齐 robot_web robot-control-grid） */
const gait = ref(0); const force = ref(false); const talk = ref(false); const moving = ref(false); const crawl = ref(false); const manual = ref(true)
const act = (t: string) => message.success(`${t}指令已发送`)
const setGait = (i: number) => { if (run.value) return message.error('任务执行中，无法切换步态'); gait.value = i; act(GAITS[i]) }
const ctl = (k: string) => {
  const s = rt.value
  if (k === 'stand') { act(s.standing ? '趴下' : '起立'); s.standing = !s.standing; if (!s.standing) moving.value = false }
  else if (k === 'move') { if (!s.standing) return message.error('请先起立'); act(moving.value ? '停止运动' : '开始运动'); moving.value = !moving.value }
  else if (k === 'crawl') { act(crawl.value ? '正常姿态' : '匍匐姿态'); crawl.value = !crawl.value }
  else if (k === 'auto') { act(manual.value ? '非手动模式' : '手动模式'); manual.value = !manual.value }
  else if (k === 'force') { force.value = !force.value; act(force.value ? '开启力控模式' : '关闭力控模式') }
  else if (k === 'stop') message.error('已触发急停')
}
const robotImg = computed(() => (isIns.value ? imgCar : robot.value.model.startsWith('X30') ? imgX30 : imgGo2))
const charge = (k: string) => act(k)
const posture = computed(() => (!rt.value.standing ? '趴下' : crawl.value ? '匍匐' : '站立'))

/* 无人车传感器数据（对齐 robot_web sensor-data-card：左右切换传感器 + 曲线） */
const si = ref(0)
const sensor = computed(() => SENSORS[si.value])
const stepS = (d: number) => { si.value = (si.value + d + SENSORS.length) % SENSORS.length }
const hist = ref<number[]>([])
const tick = () => { const v = sensor.value.v; const n = hist.value.length ? hist.value[hist.value.length - 1] : v; hist.value = [...hist.value.slice(-29), +(n + (v - n) * 0.3 + (Math.random() - 0.5) * Math.max(0.2, v * 0.04)).toFixed(2)] }
watch(si, () => { hist.value = []; for (let i = 0; i < 30; i++) tick() }, { immediate: true })
const tm2 = setInterval(tick, 1500); onBeforeUnmount(() => clearInterval(tm2))
const chart = computed(() => {
  const l = hist.value; const hi = sensor.value.hi; const lo = sensor.value.lo
  const max = Math.max(...l, hi ?? -Infinity) * 1.08; const min = Math.min(...l, lo ?? Infinity) * 0.92
  const y = (v: number) => 92 - ((v - min) / (max - min || 1)) * 84
  const pts = l.map((v, i) => `${(i / (l.length - 1)) * 300},${y(v).toFixed(1)}`).join(' ')
  return { pts, area: `0,100 ${pts} 300,100`, hi: hi != null ? y(hi) : null, lo: lo != null ? y(lo) : null, cur: l[l.length - 1] }
})
const rtkOpen = ref(false)
const gps = computed(() => rt.value.insOrigin ?? { lat: 30.274612, lng: 120.155391, alt: 12.4 })

/* 任务下发 */
const gridMaps = computed(() => myMaps.value.filter((m) => m.grid))
const navSel = ref<string | undefined>(); const rSel = ref(''); const pSel = ref(''); const mSel = ref('')
const pubGroups = computed(() => myGroups.value.filter((g) => g.kind === '发布点'))
const myMulti = computed(() => db.multi.filter((m) => m.robot === curId.value))
watch(curId, () => {
  navSel.value = rt.value.navMap || gridMaps.value[0]?.name || undefined
  rSel.value = run.value?.route ?? myRoutes.value.find((r) => !rt.value.navMap || r.map === rt.value.navMap)?.id ?? myRoutes.value[0]?.id ?? ''
  pSel.value = pubGroups.value[0]?.id ?? ''; mSel.value = myMulti.value[0]?.id ?? ''
}, { immediate: true })
const seed = computed(() => myMaps.value.find((m) => m.name === (rt.value.navMap || navSel.value))?.seed ?? 11)
const streams = computed(() => streamsOf(robot.value.id))
/* 视频：画面内操作（码流切换 / 重连 / 全屏），对齐 robot_web video-action-group */
const cams = computed(() => [{ k: 'rgb', t: '可见光', url: streams.value.rgb }, { k: 'ir', t: '红外', url: streams.value.ir }])
const camBox: Record<string, HTMLDivElement | null> = {}
const camRef: Record<string, { reconnect: () => void } | null> = {}
const sub = reactive<Record<string, boolean>>({ rgb: false, ir: false })
const toggleSub = (k: string) => { sub[k] = !sub[k]; camRef[k]?.reconnect(); message.success(`已切换到${sub[k] ? '子码流' : '主码流'}`) }
const fs = ref('')
const toggleFull = (k: string) => { if (document.fullscreenElement) document.exitFullscreen(); else camBox[k]?.requestFullscreen?.() }
const onFs = () => { const el = document.fullscreenElement; fs.value = Object.keys(camBox).find((k) => camBox[k] === el) ?? '' }
document.addEventListener('fullscreenchange', onFs); onBeforeUnmount(() => document.removeEventListener('fullscreenchange', onFs))
const mapBox = ref<HTMLDivElement>()
const fullMap = () => { const el = mapBox.value; if (!el) return; document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.() }
const navRoutes = computed(() => myRoutes.value.filter((r) => isIns.value || !rt.value.nav || r.map === rt.value.navMap))
</script>

<template>
  <div class="hm">
    <!-- ============ 左 ============ -->
    <div class="hm-col">
      <div class="pp-panel hm-cam">
        <div class="pp-panel-h"><h3>实时视频</h3></div>
        <div class="hm-vlist">
        <div v-for="c in cams" :key="c.k" :ref="(el) => (camBox[c.k] = el as HTMLDivElement)" class="hm-box hm-vbox">
          <WebRtcVideo v-if="on" :ref="(el) => (camRef[c.k] = el as any)" :url="c.url" :label="`${c.t}${sub[c.k] ? ' · 子码流' : ''}`" />
          <div v-else class="hm-empty">{{ c.t }} · 设备离线</div>
          <div class="hm-vact">
            <a-tooltip :title="`切换到${sub[c.k] ? '主码流' : '子码流'}`"><button type="button" class="tx" :disabled="!on" @click="toggleSub(c.k)">{{ sub[c.k] ? '子' : '主' }}</button></a-tooltip>
            <a-tooltip title="手动重连"><button type="button" :disabled="!on" @click="camRef[c.k]?.reconnect()"><ReloadOutlined /></button></a-tooltip>
            <a-tooltip :title="fs === c.k ? '退出全屏' : '全屏'"><button type="button" @click="toggleFull(c.k)"><CompressOutlined v-if="fs === c.k" /><ExpandOutlined v-else /></button></a-tooltip>
          </div>
        </div>
        </div>
      </div>
      <div class="pp-panel hm-grow">
        <div class="pp-panel-h"><h3>任务统计</h3><a-tag v-if="run" :color="rt.pause ? 'orange' : 'cyan'" class="r">{{ rt.pause ? '已暂停' : run.kind }}</a-tag></div>
        <div class="hm-task" :class="{ idle: !run }">
          <div class="nm" :title="run?.name">{{ run ? run.name : on ? '当前无执行任务' : '设备离线' }}</div>
          <div class="ring">
            <a-progress type="circle" :percent="run ? Math.round(run.progress * 100) : 0" :size="66" stroke-color="#26C6DA" :stroke-width="7" />
            <div class="kv"><span>开始时间</span><b class="mono">{{ run?.start ?? '—' }}</b><span>圈数</span><b class="mono">{{ run ? `${run.laps} / ${run.circle}` : '—' }}</b><span>当前巡检点</span><b>{{ run && pts.length ? pts[Math.min(doneN, pts.length - 1)].desc : '无' }}</b></div>
          </div>
          <div class="st4"><div><b class="mono">{{ doneN }}</b><small>已巡检</small></div><div><b class="mono">{{ run ? pts.length - doneN : 0 }}</b><small>待巡检</small></div><div><b class="mono ok">{{ Math.max(0, doneN - 1) }}</b><small>正常</small></div><div><b class="mono bad">{{ doneN > 0 ? 1 : 0 }}</b><small>异常</small></div></div>
          <div class="ops"><a-button size="small" :disabled="!run" @click="togglePause"><template v-if="rt.pause"><CaretRightOutlined />恢复</template><template v-else><PauseOutlined />暂停</template></a-button><a-button size="small" danger :disabled="!run" @click="stopRun">关闭任务</a-button></div>
        </div>
      </div>
    </div>

    <!-- ============ 中 ============ -->
    <div class="hm-col">
      <div class="pp-panel hm-map">
        <div class="pp-panel-h">
          <h3>巡检地图</h3><span class="muted sub">{{ isIns ? 'INS 坐标系' : rt.navMap || '未开启导航' }}</span>
          <span v-if="mapMode === 'grid'" class="hm-lg"><span v-for="z in ZONES" :key="z.k"><i :style="{ borderColor: z.c, background: z.c + '33' }" />{{ z.t }}</span></span>
          <span class="r">
            <a-radio-group v-model:value="mapMode" size="small"><a-radio-button value="cloud">点云</a-radio-button><a-radio-button value="grid">栅格</a-radio-button><a-radio-button value="sat">卫星</a-radio-button></a-radio-group>
            <a-tooltip title="定位机器人"><a-button type="text" size="small"><AimOutlined /></a-button></a-tooltip>
            <a-tooltip title="全屏"><a-button type="text" size="small" @click="fullMap"><ExpandOutlined /></a-button></a-tooltip>
          </span>
        </div>
        <div ref="mapBox" class="hm-box">
          <MapSlot v-if="on" :seed="seed" :mode="mapMode" :zones="mapMode === 'grid'" :shape="runRoute?.shape ?? null" :pts="mapPts" :progress="runRoute && run ? run.progress : 0" :robot="hasNav ? rt.pose : null" :cloud-bar="false" />
          <div v-else class="hm-empty">设备离线</div>
          <div v-if="on && !hasNav" class="bz-ov">未开启定位 · 可在右侧「任务下发」中开启</div>
        </div>
      </div>
      <div class="pp-panel hm-alarm">
        <div class="pp-panel-h"><h3>实时警情</h3><span class="muted sub">{{ alarms.filter((a) => a.state === '待处理').length }} 条待处理</span><a class="r more" @click="emit('go', 'log', 'rec')">全部警情 →</a></div>
        <a-table size="small" :pagination="false" :data-source="alarms" row-key="id" :scroll="{ y: 'calc(100% - 39px)' }"
          :columns="[{ title: '报警时间', key: 'time', width: 120 }, { title: '警情类型', key: 'type', width: 110 }, { title: '内容', dataIndex: 'content', ellipsis: true }, { title: '来源', dataIndex: 'src', width: 72 }, { title: '状态', key: 'state', width: 84 }, { title: '图片', key: 'pic', width: 60 }]">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'time'"><span class="mono">{{ record.time.slice(5) }}</span></template>
            <template v-else-if="column.key === 'type'"><span class="hm-type"><i :style="{ background: alarmColor(record.type) }" />{{ record.type }}</span></template>
            <template v-else-if="column.key === 'state'"><a-badge :status="record.state === '待处理' ? 'error' : 'default'" :text="record.state" /></template>
            <template v-else-if="column.key === 'pic'"><a v-if="record.src === '可见光' || record.src === '红外'" @click="pic = record">查看</a><span v-else class="muted">—</span></template>
          </template>
          <template #emptyText><div class="hm-empty sm">暂无警情</div></template>
        </a-table>
      </div>
    </div>

    <!-- ============ 右 ============ -->
    <div class="hm-col hm-right">
      <div class="pp-panel hm-st" :class="{ big: isIns }">
        <div class="pp-panel-h"><h3>{{ KIND_META[robot.kind].t }}状态</h3><a-badge :status="!on ? 'default' : run ? 'processing' : 'success'" :text="!on ? '离线' : run ? '任务中' : '在线'" style="margin-left:8px" /></div>
        <div class="hm-hero"><img :src="robotImg" alt="" /><div><b>{{ robot.name }}</b><small class="mono">{{ robot.id }} · {{ robot.model }}</small><small>{{ robot.site }} · 累计 {{ (robot.mileage / 1000).toFixed(1) }} km</small></div></div>
        <div class="hm-big">
          <div><small>当前速度</small><b class="mono">{{ on ? speed.toFixed(2) : '--' }}<em>m/s</em></b></div>
          <div><small>剩余电量</small><b class="mono" :class="{ low: robot.battery < 30 }">{{ on ? robot.battery : '--' }}<em>%</em></b></div>
          <div v-if="isDog"><small>累计里程</small><b class="mono">{{ (robot.mileage / 1000).toFixed(2) }}<em>km</em></b></div>
          <div v-else><small>网络延迟</small><b class="mono">{{ on ? latency : '--' }}<em>ms</em></b></div>
        </div>
        <div class="hm-grid">
          <div><small>X坐标</small><b class="mono">{{ pose.x }}</b></div>
          <div><small>Y坐标</small><b class="mono">{{ pose.y }}</b></div>
          <div><small>高度</small><b class="mono">0.00</b></div>
          <div><small>角度</small><b class="mono">{{ rt.pose.yaw }}°</b></div>
          <a-popover v-if="!isDog" v-model:open="rtkOpen" trigger="click" placement="left">
            <template #content><div class="hm-rtk"><span>经度</span><b class="mono">{{ gps.lng.toFixed(6) }}°</b><span>纬度</span><b class="mono">{{ gps.lat.toFixed(6) }}°</b><span>海拔</span><b class="mono">{{ gps.alt }} m</b><span>航向</span><b class="mono">{{ ((rt.pose.yaw * Math.PI) / 180).toFixed(3) }} rad</b></div></template>
            <div class="lk"><small>RTK</small><b :class="rt.ins || rt.msf ? 'ok' : 'warn'">{{ rt.ins || rt.msf ? '固定解' : '浮点解' }}</b></div>
          </a-popover>
          <div v-else><small>状态</small><b>{{ !on ? '离线' : run ? '任务中' : rt.standing ? (moving ? '运动中' : '站立') : '趴下' }}</b></div>
          <div><small>电压</small><b class="mono">{{ isDog ? '52.4V' : '48.1V' }}</b></div>
          <div><small>电流</small><b class="mono">{{ isDog ? '6.8A' : '9.2A' }}</b></div>
          <template v-if="isDog">
            <div><small>地面</small><b>实心地面</b></div>
            <div><small>步态</small><b :title="GAITS[gait]">{{ GAITS[gait] }}</b></div>
            <div><small>姿态</small><b>{{ posture }}</b></div>
          </template>
          <template v-else>
            <div><small>CPU</small><b class="mono">38%</b></div>
            <div><small>内存</small><b class="mono">46%</b></div>
            <div><small>磁盘</small><b class="mono" style="color:#FFC15C">83%</b></div>
          </template>
        </div>
      </div>

      <!-- 机器狗：机器人控制 -->
      <div v-if="isDog" class="pp-panel">
        <div class="pp-panel-h"><h3>机器人控制</h3><a-tooltip :title="talk ? '关闭语音对讲' : '开启语音对讲'"><a-button type="text" size="small" class="r" :class="{ 'hm-mic': talk }" :disabled="!on" @click="talk = !talk"><AudioOutlined v-if="talk" /><AudioMutedOutlined v-else /></a-button></a-tooltip></div>
        <div class="hm-ctl">
          <button type="button" :disabled="!on" @click="ctl('stand')">{{ rt.standing ? '趴下' : '起立' }}</button>
          <button type="button" :class="{ on: force }" :disabled="!on" @click="ctl('force')">力控模式</button>
          <button type="button" class="stop" :disabled="!on" @click="ctl('stop')">急停</button>
          <button type="button" :class="{ on: moving }" :disabled="!on" @click="ctl('move')">{{ moving ? '停止运动' : '开始运动' }}</button>
          <button type="button" :class="{ on: crawl }" :disabled="!on" @click="ctl('crawl')">{{ crawl ? '正常姿态' : '匍匐姿态' }}</button>
          <button type="button" :class="{ on: !manual }" :disabled="!on" @click="ctl('auto')">{{ manual ? '非手动模式' : '手动模式' }}</button>
          <a-select :value="gait" size="small" class="gsel" :disabled="!on" :options="GAITS.map((g, i) => ({ value: i, label: '步态：' + g }))" @change="(v: any) => setGait(Number(v))" />
          <a-dropdown :trigger="['click']" :disabled="!on">
            <button type="button" :disabled="!on">充电 ▾</button>
            <template #overlay><a-menu @click="({ key }: any) => charge(String(key))"><a-menu-item key="开始充电">开始充电</a-menu-item><a-menu-item key="结束充电">结束充电</a-menu-item><a-menu-item key="重置充电">重置充电</a-menu-item></a-menu></template>
          </a-dropdown>
        </div>
      </div>
      <!-- 无人车：传感器数据 -->
      <div v-else class="pp-panel">
        <div class="pp-panel-h"><h3>传感器数据</h3>
          <span class="r hm-stog"><a-button type="text" size="small" @click="stepS(-1)"><LeftOutlined /></a-button><b>{{ sensor.cn }}</b><a-button type="text" size="small" @click="stepS(1)"><RightOutlined /></a-button></span></div>
        <div v-if="on" class="hm-chart">
          <div class="cv"><b class="mono">{{ chart.cur }}</b><em>{{ sensor.unit }}</em><small>阈值 {{ sensor.lo != null ? sensor.lo + ' ~ ' : '≤ ' }}{{ sensor.hi }}</small></div>
          <svg viewBox="0 0 300 100" preserveAspectRatio="none">
            <defs><linearGradient id="hm-sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#45E3A8" stop-opacity=".35" /><stop offset="1" stop-color="#45E3A8" stop-opacity="0" /></linearGradient></defs>
            <line v-if="chart.hi != null" x1="0" x2="300" :y1="chart.hi" :y2="chart.hi" stroke="#FF7A7A" stroke-dasharray="4 3" stroke-width="1" vector-effect="non-scaling-stroke" />
            <line v-if="chart.lo != null" x1="0" x2="300" :y1="chart.lo" :y2="chart.lo" stroke="#FFC15C" stroke-dasharray="4 3" stroke-width="1" vector-effect="non-scaling-stroke" />
            <polygon :points="chart.area" fill="url(#hm-sg)" />
            <polyline :points="chart.pts" fill="none" stroke="#45E3A8" stroke-width="1.6" vector-effect="non-scaling-stroke" />
          </svg>
        </div>
        <div v-else class="hm-empty sm">设备离线</div>
      </div>

      <div class="pp-panel hm-send-p" :class="{ 'hm-grow': !isIns }">
        <div class="pp-panel-h"><h3>任务下发</h3><span class="muted sub">{{ locText }}</span></div>
        <div class="hm-send">
          <div v-if="!isIns" class="ln loc"><a-select v-model:value="navSel" size="small" :disabled="hasNav" :placeholder="gridMaps.length ? '选择地图' : '暂无地图'" :options="gridMaps.map((m) => ({ value: m.name, label: m.name }))" />
            <span class="tg"><button type="button" :class="{ on: rt.nav }" :disabled="!on || rt.ins || rt.msf" @click="toggleNav(navSel ?? '')">导航</button><button type="button" :class="{ on: rt.ins }" :disabled="!on || rt.nav || rt.msf" @click="toggleIns">INS</button><button type="button" :class="{ on: rt.msf }" :disabled="!on || rt.nav || rt.ins" @click="toggleMsf(navSel ?? '', isIns ? '卫星定位' : '融合定位')">MSF</button></span></div>
          <div v-else class="ln loc ins"><label>定位</label><span class="tg"><button type="button" :class="{ on: rt.ins }" :disabled="!on || rt.msf" @click="toggleIns">INS</button><button type="button" :class="{ on: rt.msf }" :disabled="!on || rt.ins" @click="toggleMsf('', '卫星定位')">MSF</button></span></div>
          <div class="ln"><label>循迹任务</label><a-select v-model:value="rSel" size="small" placeholder="选择路线" :options="navRoutes.map((r) => ({ value: r.id, label: r.name }))" /><a-button size="small" type="primary" :disabled="!on || !!run" @click="openLaunch('循迹任务', { route: rSel })"><SendOutlined />下发</a-button></div>
          <div class="ln"><label>发布点任务</label><a-select v-model:value="pSel" size="small" placeholder="选择任务组" :options="pubGroups.map((g) => ({ value: g.id, label: g.name }))" /><a-button size="small" type="primary" :disabled="!on || !!run" @click="openLaunch('发布点任务', { group: pSel })"><SendOutlined />下发</a-button></div>
          <div class="ln"><label>多任务组</label><a-select v-model:value="mSel" size="small" placeholder="选择多任务组" :options="myMulti.map((m) => ({ value: m.id, label: m.name }))" /><a-button size="small" type="primary" :disabled="!on || !!run" @click="openLaunch('多任务组', { multi: mSel })"><SendOutlined />下发</a-button></div>
        </div>
      </div>
    </div>
  </div>

  <a-modal :open="!!pic" :title="pic ? `${pic.type} · ${pic.time}` : ''" :footer="null" :width="640" @cancel="pic = null">
    <div v-if="pic" class="hm-pic"><CamShot :seed="pic.seed" :ir="pic.src === '红外'" :box="pic.type" :box-color="alarmColor(pic.type)" hud /></div>
    <p v-if="pic" class="muted" style="margin:10px 0 0">{{ pic.content }} · {{ pic.src }} · 置信度 {{ pic.conf }}</p>
  </a-modal>
</template>

<style scoped>
.hm { display: grid; grid-template-columns: clamp(340px, 22vw, 430px) minmax(0, 1fr) 330px; gap: 14px; height: calc(100vh - 108px); min-height: 720px; }
.hm-col { display: flex; flex-direction: column; gap: 14px; min-width: 0; min-height: 0; }
.hm-col .r { margin-left: auto; display: flex; align-items: center; gap: 4px; }
.hm-col .sub { margin-left: 8px; font-size: 12px; }
.hm-grow { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.hm-cam { flex: none; display: flex; flex-direction: column; } .hm-vlist { display: flex; flex-direction: column; gap: 8px; padding: 10px; }
.hm-cam .hm-box { aspect-ratio: 16 / 9; flex: none; margin: 0; }
.hm-cam .hm-box:fullscreen { aspect-ratio: auto; }
.hm-vact { position: absolute; right: 8px; bottom: 8px; z-index: 2; display: flex; gap: 4px; }
.hm-vact button { width: 26px; height: 26px; display: grid; place-items: center; padding: 0; font: inherit; font-size: 13px; color: #E6F7FB; cursor: pointer; background: rgba(8,18,32,.62); border: 1px solid rgba(46,211,230,.28); border-radius: 4px; }
.hm-vact button.tx { font-size: 12px; font-weight: 600; }
.hm-vact button:hover:not(:disabled) { color: #fff; border-color: var(--cyan); background: rgba(8,18,32,.85); } .hm-vact button:disabled { cursor: not-allowed; opacity: .45; }
.hm-box { position: relative; flex: 1; min-height: 0; margin: 10px; overflow: hidden; border: 1px solid rgba(46,211,230,.16); border-radius: 4px; background: #0C1728; }
.hm-empty { position: absolute; inset: 0; display: grid; place-items: center; color: var(--faint); font-size: 13px; } .hm-empty.sm { position: static; flex: 1; padding: 28px 0; }
.hm-task { flex: 1; display: flex; flex-direction: column; gap: 8px; padding: 8px 14px 10px; }
.hm-task .nm { font-size: 13.5px; font-weight: 500; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.hm-task .ring { display: flex; align-items: center; gap: 14px; } .hm-task .ring :deep(.ant-progress-text) { color: #fff; font-size: 17px; }
.hm-task .kv { flex: 1; min-width: 0; display: grid; grid-template-columns: auto 1fr; gap: 6px 8px; font-size: 12px; } .hm-task .kv span { color: var(--muted); } .hm-task .kv b { font-weight: 500; text-align: right; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.hm-task .st4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center; } .hm-task .st4 > div { padding: 3px 0; background: rgba(46,211,230,.05); border-radius: 4px; }
.hm-task .st4 b { display: block; font-size: 16px; color: #fff; } .hm-task .st4 b.ok { color: #45E3A8; } .hm-task .st4 b.bad { color: #FF7A7A; } .hm-task .st4 small { font-size: 11px; color: var(--muted); }
.hm-task .ops { display: flex; gap: 8px; margin-top: auto; } .hm-task .ops > * { flex: 1; }
.hm-task.idle .nm { color: var(--faint); font-weight: 400; } .hm-task.idle .kv b { color: var(--faint); }
.hm-map { flex: 1.7; min-height: 0; display: flex; flex-direction: column; }
.hm-lg { display: flex; gap: 10px; margin-left: 12px; font-size: 11.5px; color: var(--muted); } .hm-lg i { display: inline-block; width: 9px; height: 9px; margin-right: 4px; border: 1px solid; vertical-align: -1px; }
.hm-alarm { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.hm-alarm :deep(.ant-table-wrapper) { flex: 1; min-height: 0; padding: 0 10px 8px; }
.hm-alarm .more { font-size: 12px; }
.hm-type { display: inline-flex; align-items: center; gap: 6px; } .hm-type i { width: 6px; height: 6px; border-radius: 50%; }
.hm-right { overflow: auto; }
.hm-st.big { flex: 1 0 auto; display: flex; flex-direction: column; }
.hm-hero { display: flex; align-items: center; gap: 14px; flex: none; height: 96px; padding: 10px 14px 0; }
.hm-hero img { height: 100%; max-height: 96px; max-width: 52%; object-fit: contain; filter: drop-shadow(0 6px 12px rgba(0,0,0,.45)); }
.hm-hero div { display: flex; flex-direction: column; gap: 4px; min-width: 0; } .hm-hero b { font-size: 15px; color: #fff; } .hm-hero small { font-size: 11.5px; color: var(--muted); }
.hm-send-p { flex: none; } .hm-right:has(.hm-st.big) .hm-chart svg { height: 64px; } .hm-right:has(.hm-st.big) .hm-send { gap: 8px; padding: 10px 14px 12px; } .hm-send-p.hm-grow { flex: 1; }
.hm-send .ln.loc.ins { grid-template-columns: 70px auto; }
.hm-big { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px 14px 4px; }
.hm-big > div { padding: 7px 10px; background: rgba(46,211,230,.05); border: 1px solid rgba(46,211,230,.12); border-radius: 4px; }
.hm-big small { display: block; font-size: 11.5px; color: var(--muted); } .hm-big b { font-size: 18px; font-weight: 600; color: #fff; } .hm-big b.low { color: #FF7A7A; } .hm-big em { font-style: normal; font-size: 11px; color: var(--muted); margin-left: 3px; }
.hm-big { grid-template-columns: repeat(3, 1fr) !important; } .hm-big b { font-size: 16px !important; }
.hm-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; padding: 10px 12px 14px; }
.hm-grid > div { min-width: 0; padding: 5px 1px; text-align: center; background: rgba(46,211,230,.04); border-radius: 4px; }
.hm-grid small { display: block; font-size: 11px; color: var(--muted); } .hm-grid b { display: block; font-size: 12px; font-weight: 500; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.hm-grid b.ok { color: #45E3A8; } .hm-grid b.warn { color: #FFC15C; } .hm-grid .lk { cursor: pointer; border: 1px dashed rgba(77,232,176,.35); }
.hm-rtk { display: grid; grid-template-columns: auto auto; gap: 6px 16px; font-size: 12.5px; } .hm-rtk span { color: var(--muted); } .hm-rtk b { font-weight: 500; text-align: right; }
.hm-mic { color: #45E3A8 !important; }
.hm-ctl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; padding: 10px 14px 10px; }
.hm-ctl button { padding: 5px 0; font: inherit; font-size: 12px; color: var(--muted); cursor: pointer; background: rgba(46,211,230,.05); border: 1px solid var(--line); border-radius: 4px; }
.hm-ctl button:hover:not(:disabled) { color: var(--text); border-color: var(--line-strong); } .hm-ctl button.on { color: #fff; border-color: var(--accent); background: var(--accent-soft); }
.hm-ctl button.stop { color: #fff; background: rgba(255,107,107,.55); border-color: #FF7A7A; } .hm-ctl button:disabled { cursor: not-allowed; opacity: .5; }
.hm-ctl .gsel { grid-column: span 2; } .hm-ctl .gsel :deep(.ant-select-selector) { height: 28px !important; align-items: center; }
.hm-stog { gap: 0 !important; } .hm-stog b { min-width: 64px; text-align: center; font-size: 12.5px; font-weight: 500; }
.hm-chart { padding: 8px 14px 12px; } .hm-chart .cv { display: flex; align-items: baseline; gap: 4px; } .hm-chart .cv b { font-size: 20px; color: #45E3A8; } .hm-chart .cv em { font-style: normal; font-size: 11px; color: var(--muted); } .hm-chart .cv small { margin-left: auto; font-size: 11px; color: var(--faint); }
.hm-chart svg { display: block; width: 100%; height: 110px; margin-top: 6px; border-bottom: 1px solid var(--line); }
.hm-send { display: flex; flex-direction: column; gap: 10px; padding: 12px 14px 14px; }
.hm-send .ln { display: grid; grid-template-columns: 70px minmax(0, 1fr) auto; align-items: center; gap: 8px; font-size: 12.5px; }
.hm-send .ln.loc { grid-template-columns: minmax(0, 1fr) auto; padding-bottom: 10px; border-bottom: 1px dashed var(--line); }
.hm-send .tg { display: flex; } .hm-send .tg button { height: 24px; padding: 0 10px; font: inherit; font-size: 12px; color: var(--muted); cursor: pointer; background: rgba(46,211,230,.05); border: 1px solid var(--line-strong); margin-left: -1px; }
.hm-send .tg button:first-child { border-radius: 4px 0 0 3px; } .hm-send .tg button:last-child { border-radius: 0 3px 3px 0; }
.hm-send .tg button.on { color: #0B1C2E; font-weight: 600; background: var(--cyan); border-color: var(--cyan); } .hm-send .tg button:disabled { cursor: not-allowed; opacity: .4; }
.hm-send label { color: var(--muted); } .hm-send .ins { font-size: 12px; }
.hm-pic { aspect-ratio: 16 / 9; position: relative; overflow: hidden; border-radius: 4px; }
</style>
