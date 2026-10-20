<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  AimOutlined, ExpandOutlined, ReloadOutlined, UpOutlined, DownOutlined, LeftOutlined, RightOutlined, ZoomInOutlined, ZoomOutOutlined,
  PauseOutlined, CaretRightOutlined, StopOutlined, SendOutlined, ThunderboltOutlined, AudioOutlined, SettingOutlined,
} from '@ant-design/icons-vue'
import BizMap from './BizMap.vue'
import CamShot from './CamShot.vue'
import { KIND_META, GAITS, OBS_MODES, ZONES, SENSORS, alarmColor } from '@/mock/biz'
import { robot, rt, isDog, isIns, hasNav, locText, db, curId, myMaps, routeById, groupById, togglePause, stopRun } from './store'

const emit = defineEmits<{ go: [tab: string, sub?: string] }>()
const latency = ref(robot.value.latency)
const tm = setInterval(() => { latency.value = robot.value.online ? Math.round(robot.value.latency + (Math.random() - 0.5) * 8) : 0 }, 1000)
onBeforeUnmount(() => clearInterval(tm))
const speed = computed(() => (rt.value.run && !rt.value.pause ? rt.value.speed : 0))

/* 视频 / 地图 */
const cam = ref<'vis' | 'ir'>('vis')
const stream = ref('主码流')
const aiBox = ref(true)
const mapMode = ref<'grid' | 'cloud'>('grid')
const run = computed(() => rt.value.run)
const runRoute = computed(() => routeById(run.value?.route)); const runGroup = computed(() => groupById(run.value?.group))
const seed = computed(() => myMaps.value.find((m) => m.name === rt.value.navMap)?.seed ?? 11)
const pts = computed(() => runGroup.value?.points ?? [])
const doneN = computed(() => (run.value ? pts.value.filter((p, i) => (runRoute.value ? p.f : i / Math.max(1, pts.value.length - 1)) < run.value!.progress - 0.01).length : 0))
const mapPts = computed(() => pts.value.map((p, i) => ({ mx: p.mx, my: p.my, st: (i < doneN.value ? 'done' : i === doneN.value ? 'cur' : 'todo') as 'done' | 'cur' | 'todo' })))

/* 控制 */
const ctab = ref(isDog.value ? 'move' : 'nav')
const gait = ref(0)
const estop = ref(false)
const ptzSpeed = ref(3)
const force = ref(false), talk = ref(false)
const toggleStop = () => {
  if (!estop.value) { estop.value = true; message.error('已触发急停：机器人停止运动') }
  else Modal.confirm({ title: '解除急停', content: '确认现场安全后再解除急停，是否继续？', okText: '解除', onOk: () => { estop.value = false; message.success('已解除急停') } })
}
const act = (t: string) => message.success(`${t}（原型演示）`)
const setGait = (i: number) => { if (run.value) return message.error('任务执行中，无法切换步态'); gait.value = i; act(`切换为${GAITS[i]}`) }

/* 本体参数 */
const bodyOpen = ref(false)
const JOINTS = ['左前', '右前', '左后', '右后'].flatMap((l, i) => ['髋', '大腿', '小腿'].map((j, k) => ({ n: `${l}${j}`, t: 38 + ((i * 3 + k) * 7) % 19, d: 41 + ((i * 3 + k) * 5) % 16 })))
const MOTORS = ['左前轮', '右前轮', '左后轮', '右后轮'].map((n, i) => ({ n, rpm: 820 + i * 13, a: (3.1 + i * 0.2).toFixed(1), st: '正常', mode: '速度模式', t: 42 + i * 2 }))
const alarms = computed(() => db.alarms.filter((a) => a.robot === curId.value).slice(0, 6))
const pose = computed(() => ({ x: ((rt.value.pose.x - 6) * 0.25).toFixed(2), y: ((94 - rt.value.pose.y) * 0.25).toFixed(2) }))
</script>

<template>
  <div class="mo">
    <!-- 左 -->
    <div class="mo-col">
      <div class="pp-panel">
        <div class="pp-panel-h"><h3>{{ KIND_META[robot.kind].t }}状态</h3><a-badge :status="!robot.online ? 'default' : run ? 'processing' : 'success'" :text="!robot.online ? '离线' : run ? '任务中' : '在线'" /><a-button size="small" class="r" @click="bodyOpen = true">本体参数</a-button></div>
        <div class="mo-big">
          <div><small>速度</small><b class="mono">{{ speed.toFixed(2) }}<em>m/s</em></b></div>
          <div><small>电量</small><b class="mono" :class="{ low: robot.battery < 30 }">{{ robot.battery }}<em>%</em></b></div>
          <div><small>网络延迟</small><b class="mono">{{ latency }}<em>ms</em></b></div>
          <div><small>累计里程</small><b class="mono">{{ robot.mileage.toFixed(1) }}<em>m</em></b></div>
        </div>
        <div class="mo-kv">
          <span>坐标</span><b class="mono">{{ pose.x }}, {{ pose.y }}</b>
          <span>航向</span><b class="mono">{{ rt.pose.yaw }}°</b>
          <span>电压 / 电流</span><b class="mono">{{ isDog ? '52.4 V · 6.8 A' : '48.1 V · 9.2 A' }}</b>
          <span>内存 / 磁盘</span><b class="mono">46% · 63%</b>
          <template v-if="isDog"><span>步态</span><b>{{ GAITS[gait] }}</b><span>姿态</span><b>站立 · 正常</b></template>
          <span>定位</span><b :style="{ color: hasNav ? '#4DE8B0' : '#FFB74D' }">{{ locText }}</b>
          <span>避障模式</span><b>{{ rt.obsMode }}</b>
        </div>
        <div v-if="!isDog" class="mo-sensors">
          <div v-for="s in SENSORS.slice(0, 4)" :key="s.en"><small>{{ s.cn }}</small><b class="mono">{{ s.v }}<em>{{ s.unit }}</em></b></div>
        </div>
      </div>
      <div class="pp-panel mo-grow">
        <div class="pp-panel-h"><h3>实时警情</h3><a class="r" style="font-size:12px" @click="emit('go', 'alarm')">全部</a></div>
        <ul class="mo-alarms">
          <li v-for="a in alarms" :key="a.id"><i :style="{ background: alarmColor(a.type) }" /><div><span class="ellipsis"><b :style="{ color: alarmColor(a.type) }">{{ a.type }}</b> {{ a.content }}</span><small class="mono muted">{{ a.time.slice(5) }} · {{ a.src }} · {{ a.state }}</small></div></li>
          <li v-if="!alarms.length" class="muted" style="justify-content:center;border:0;padding:24px 0">暂无警情</li>
        </ul>
      </div>
    </div>

    <!-- 中 -->
    <div class="mo-col mo-center">
      <div class="pp-panel mo-video">
        <div class="pp-panel-h">
          <h3>视频监控</h3>
          <a-radio-group v-model:value="cam" size="small" button-style="solid"><a-radio-button value="vis">可见光</a-radio-button><a-radio-button value="ir">红外</a-radio-button></a-radio-group>
          <span class="r">
            <span class="muted" style="font-size:12px">AI 画框</span><a-switch v-model:checked="aiBox" size="small" />
            <a-select v-model:value="stream" size="small" style="width:90px" :options="['主码流', '子码流'].map((v) => ({ value: v, label: v }))" />
            <a-tooltip title="重连"><a-button type="text" size="small"><ReloadOutlined /></a-button></a-tooltip>
            <a-tooltip title="全屏"><a-button type="text" size="small"><ExpandOutlined /></a-button></a-tooltip>
          </span>
        </div>
        <div class="mo-video-b">
          <template v-if="robot.online">
            <CamShot :seed="robot.id.charCodeAt(4) + (cam === 'ir' ? 50 : 0)" :ir="cam === 'ir'" :box="aiBox ? (cam === 'ir' ? '最高温 46.2℃' : '配电柜 · 正常') : ''" :box-color="cam === 'ir' ? '#FFB74D' : '#4DE8B0'" hud />
            <div class="mo-ai"><i class="dot" />实时视频算法分析中 · {{ cam === 'ir' ? '设备测温' : '配电柜状态识别' }}<span class="mono">正常</span><a-tooltip title="配置识别提示词"><a-button type="text" size="small" @click="emit('go', 'alarm')"><SettingOutlined /></a-button></a-tooltip></div>
          </template>
          <div v-else class="mo-empty">设备离线 · 暂无视频流</div>
        </div>
      </div>
      <div class="pp-panel mo-map">
        <div class="pp-panel-h">
          <h3>{{ isIns ? '卫星地图' : '巡检地图' }}</h3><span class="muted" style="font-size:12px">{{ isIns ? 'INS 坐标系' : rt.navMap || '未开启导航' }}</span>
          <span v-if="!isIns" class="mo-lg"><span v-for="z in ZONES" :key="z.k"><i :style="{ borderColor: z.c, background: z.c + '33' }" />{{ z.t }}</span></span>
          <span class="r">
            <a-radio-group v-if="!isIns" v-model:value="mapMode" size="small"><a-radio-button value="grid">栅格</a-radio-button><a-radio-button value="cloud">点云</a-radio-button></a-radio-group>
            <a-tooltip title="定位机器人"><a-button type="text" size="small"><AimOutlined /></a-button></a-tooltip>
          </span>
        </div>
        <div class="mo-map-b">
          <BizMap v-if="robot.online && (hasNav || isIns)" :seed="seed" :mode="isIns ? 'sat' : mapMode" :zones="!isIns" :shape="runRoute?.shape ?? null" :pts="mapPts" :progress="runRoute && run ? run.progress : 0" :robot="rt.pose" />
          <div v-else class="mo-empty">{{ robot.online ? '未开启导航定位' : '设备离线' }}<a v-if="robot.online" style="margin-left:8px" @click="emit('go', 'nav', 'loc')">去开启 →</a></div>
        </div>
      </div>
    </div>

    <!-- 右 -->
    <div class="mo-col">
      <div class="pp-panel">
        <div class="pp-panel-h"><h3>机器人控制</h3><span class="mono muted r" style="font-size:12px">{{ robot.id }}</span></div>
        <div class="mo-stop">
          <button type="button" class="estop" :class="{ on: estop }" @click="toggleStop"><StopOutlined />{{ estop ? '解除急停' : '急 停' }}</button>
          <div class="sw"><span><AudioOutlined /> 语音对讲</span><a-switch v-model:checked="talk" size="small" /><template v-if="isDog"><span>力控模式</span><a-switch v-model:checked="force" size="small" /></template></div>
        </div>
        <a-tabs v-model:activeKey="ctab" size="small" class="mo-tabs">
          <a-tab-pane v-if="isDog" key="move" tab="步态">
            <div class="mo-gaits"><button v-for="(g, i) in GAITS" :key="g" type="button" :class="{ on: gait === i }" @click="setGait(i)">{{ g }}</button></div>
            <div class="mo-row3"><a-button size="small" @click="act('开始充电')"><ThunderboltOutlined />开始充电</a-button><a-button size="small" @click="act('结束充电')">结束充电</a-button><a-button size="small" @click="act('重置充电')">重置充电</a-button></div>
          </a-tab-pane>
          <a-tab-pane key="nav" tab="导航定位">
            <div class="mo-locst"><a-badge :status="hasNav ? (rt.locOk ? 'success' : 'processing') : 'warning'" /><span>{{ locText }}</span><a @click="emit('go', 'nav', 'loc')">{{ hasNav ? '定位管理' : '去开启' }} →</a></div>
            <div class="mo-row3"><a-button size="small" :disabled="!hasNav" @click="togglePause">{{ rt.pause ? '恢复导航' : '暂停导航' }}</a-button><a-button size="small" @click="act('一键回充')">一键回充</a-button></div>
            <div class="mo-loc"><span>避障模式</span><a-select v-model:value="rt.obsMode" size="small" style="grid-column:span 3" :options="OBS_MODES.map((v) => ({ value: v, label: v }))" /></div>
            <div class="mo-speed"><span>任务速度</span><a-slider v-model:value="rt.speed" :min="0.2" :max="1.6" :step="0.1" /><b class="mono">{{ rt.speed.toFixed(1) }} m/s</b></div>
          </a-tab-pane>
          <a-tab-pane key="ptz" tab="云台">
            <div class="mo-ptz">
              <div class="pad"><button type="button" class="u"><UpOutlined /></button><button type="button" class="l"><LeftOutlined /></button><button type="button" class="c" @click="act('云台复位')">复位</button><button type="button" class="r"><RightOutlined /></button><button type="button" class="d"><DownOutlined /></button></div>
              <div class="ops">
                <div><span>变焦</span><a-button size="small"><ZoomOutOutlined /></a-button><a-button size="small"><ZoomInOutlined /></a-button></div>
                <div><span>聚焦</span><a-button size="small">−</a-button><a-button size="small">+</a-button></div>
                <div><span>转速</span><a-input-number v-model:value="ptzSpeed" :min="1" :max="10" size="small" style="width:76px" /></div>
                <a-select size="small" placeholder="转到预置点" style="width:100%" :options="Array.from({ length: 8 }, (_, i) => ({ value: i + 1, label: `预置点 ${i + 1}` }))" />
              </div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>
      <div class="pp-panel mo-grow">
        <div class="pp-panel-h"><h3>任务执行</h3><a-button type="primary" size="small" class="r" :disabled="!robot.online" @click="emit('go', 'task')"><SendOutlined />{{ run ? '任务详情' : '启动任务' }}</a-button></div>
        <div v-if="run" class="mo-task">
          <div class="t"><b>{{ run.name }}</b><a-tag :color="rt.pause ? 'orange' : 'cyan'">{{ rt.pause ? '已暂停' : run.kind }}</a-tag></div>
          <div class="kv"><span>开始时间</span><b class="mono">{{ run.start }}</b><span>圈数</span><b>{{ run.laps }} / {{ run.circle }}</b><template v-if="pts.length"><span>当前巡检点</span><b>#{{ Math.min(doneN + 1, pts.length) }} {{ pts[Math.min(doneN, pts.length - 1)].desc }}</b></template></div>
          <div class="prog"><a-progress :percent="Math.round(run.progress * 100)" stroke-color="#26C6DA" size="small" /></div>
          <div class="st4"><div><b class="mono">{{ doneN }}</b><small>已巡检</small></div><div><b class="mono">{{ pts.length - doneN }}</b><small>待巡检</small></div><div><b class="mono" style="color:#4DE8B0">{{ Math.max(0, doneN - 1) }}</b><small>正常</small></div><div><b class="mono" style="color:#FF6B6B">{{ doneN > 0 ? 1 : 0 }}</b><small>异常</small></div></div>
          <div class="mo-row3"><a-button size="small" @click="togglePause">
            <template v-if="rt.pause"><CaretRightOutlined />恢复</template><template v-else><PauseOutlined />暂停</template></a-button><a-button size="small" danger @click="stopRun">关闭任务</a-button></div>
          <ol class="pts"><li v-for="(p, i) in pts" :key="p.id" :class="{ done: i < doneN, cur: i === doneN }"><i>{{ i + 1 }}</i><span>{{ p.desc }}</span><small>{{ p.type }}</small></li></ol>
        </div>
        <div v-else class="mo-empty sm">{{ !robot.online ? '设备离线' : '当前无执行任务' }}</div>
      </div>
    </div>
  </div>

  <!-- 本体参数 -->
  <a-drawer v-model:open="bodyOpen" :title="`本体参数 · ${robot.name}`" :width="560" class="dv-drawer">
    <template v-if="isDog">
      <h4 class="mo-h4">关节电机温度</h4>
      <a-table size="small" :pagination="false" :data-source="JOINTS" row-key="n" :columns="[{ title: '关节', dataIndex: 'n' }, { title: '电机温度', key: 't' }, { title: '驱动器温度', key: 'd' }]">
        <template #bodyCell="{ column, record }"><template v-if="column.key === 't' || column.key === 'd'"><span class="mono" :style="{ color: record[column.key] > 52 ? '#FFB74D' : undefined }">{{ record[column.key] }} ℃</span></template></template>
      </a-table>
    </template>
    <template v-else>
      <h4 class="mo-h4">电机运行状态</h4>
      <a-table size="small" :pagination="false" :data-source="MOTORS" row-key="n" :columns="[{ title: '电机', dataIndex: 'n' }, { title: '转速 (RPM)', dataIndex: 'rpm' }, { title: '电流 (A)', dataIndex: 'a' }, { title: '温度', key: 't' }, { title: '控制模式', dataIndex: 'mode' }, { title: '状态', key: 'st' }]">
        <template #bodyCell="{ column, record }"><template v-if="column.key === 't'"><span class="mono">{{ record.t }} ℃</span></template><template v-else-if="column.key === 'st'"><a-badge status="success" :text="record.st" /></template></template>
      </a-table>
    </template>
    <h4 class="mo-h4">电池信息</h4>
    <a-descriptions :column="3" size="small" bordered>
      <a-descriptions-item label="电量">{{ robot.battery }}%</a-descriptions-item><a-descriptions-item label="电压">52.4 V</a-descriptions-item><a-descriptions-item label="电流">6.8 A</a-descriptions-item>
      <a-descriptions-item label="容量">15 Ah</a-descriptions-item><a-descriptions-item label="循环次数">312</a-descriptions-item><a-descriptions-item label="电池温度">34 ℃</a-descriptions-item>
      <a-descriptions-item label="状态">放电</a-descriptions-item><a-descriptions-item label="保护状态" :span="2">无</a-descriptions-item>
    </a-descriptions>
  </a-drawer>
</template>

<style scoped>
.mo { display: grid; grid-template-columns: 290px minmax(0, 1fr) 330px; gap: 14px; height: calc(100vh - 60px - 44px - 74px); min-height: 700px; }
.mo-col { display: flex; flex-direction: column; gap: 14px; min-height: 0; min-width: 0; }
.mo-col .r { margin-left: auto; display: flex; align-items: center; gap: 6px; }
.mo-grow { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.ellipsis { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.mo-robots { padding: 6px 8px 8px; }
.mo-robots button { width: 100%; display: flex; align-items: center; gap: 10px; padding: 6px 10px; font: inherit; color: var(--text); text-align: left; cursor: pointer; background: none; border: 1px solid transparent; border-radius: 3px; }
.mo-robots button:hover:not(:disabled) { background: rgba(77,208,225,.05); }
.mo-robots button.on { background: var(--accent-soft); border-color: rgba(38,198,218,.5); }
.mo-robots button.off { opacity: .5; cursor: not-allowed; }
.mo-robots .n { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 8px; } .mo-robots .n b { font-size: 13px; font-weight: 500; } .mo-robots .n small { font-size: 11px; color: var(--faint); }
.mo-robots .bat { font-size: 12px; color: var(--muted); } .mo-robots .dot { width: 7px; height: 7px; border-radius: 50%; }
.mo-big { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px 14px 4px; }
.mo-big > div { padding: 8px 10px; background: rgba(77,208,225,.05); border: 1px solid rgba(77,208,225,.12); border-radius: 3px; }
.mo-big small { display: block; font-size: 11.5px; color: var(--muted); } .mo-big b { font-size: 18px; font-weight: 600; color: #fff; } .mo-big b.low { color: #FF6B6B; } .mo-big em { font-style: normal; font-size: 11px; color: var(--muted); margin-left: 3px; }
.mo-kv { display: grid; grid-template-columns: auto 1fr; gap: 7px 12px; padding: 10px 14px 14px; font-size: 12.5px; } .mo-kv span { color: var(--muted); } .mo-kv b { font-weight: 500; text-align: right; }
.mo-sensors { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 0 14px 14px; } .mo-sensors > div { display: flex; justify-content: space-between; align-items: baseline; padding: 4px 8px; font-size: 12px; background: rgba(77,232,176,.06); border-left: 2px solid #4DE8B0; } .mo-sensors small { color: var(--muted); } .mo-sensors em { font-style: normal; font-size: 10px; color: var(--muted); margin-left: 2px; }
.mo-alarms { list-style: none; margin: 0; padding: 4px 12px 10px; overflow: auto; }
.mo-alarms li { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px dashed var(--line); }
.mo-alarms li > i { width: 6px; height: 6px; margin-top: 7px; flex: none; border-radius: 50%; }
.mo-alarms li > div { min-width: 0; display: flex; flex-direction: column; font-size: 12.5px; } .mo-alarms b { font-size: 12px; } .mo-alarms small { font-size: 11px; }
.mo-center { gap: 14px; }
.mo-video { flex: 1.15; display: flex; flex-direction: column; min-height: 0; }
.mo-map { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.mo-video-b, .mo-map-b { position: relative; flex: 1; min-height: 0; margin: 10px; overflow: hidden; border: 1px solid rgba(77,208,225,.16); border-radius: 3px; background: #050E18; }
.mo-ai { position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; padding: 4px 6px 4px 14px; font-size: 12.5px; white-space: nowrap; background: rgba(6,18,30,.72); border: 1px solid rgba(77,232,176,.35); border-radius: 20px; backdrop-filter: blur(6px); }
.mo-ai .dot { width: 7px; height: 7px; border-radius: 50%; background: #4DE8B0; box-shadow: 0 0 8px #4DE8B0; } .mo-ai .mono { color: #4DE8B0; }
.mo-lg { display: flex; gap: 10px; margin-left: 8px; font-size: 11.5px; color: var(--muted); } .mo-lg i { display: inline-block; width: 9px; height: 9px; margin-right: 4px; border: 1px solid; vertical-align: -1px; }
.mo-empty { position: absolute; inset: 0; display: grid; place-items: center; color: var(--faint); font-size: 13px; } .mo-empty.sm { position: static; padding: 40px 0; text-align: center; }
.mo-stop { display: flex; align-items: center; gap: 12px; padding: 12px 14px 4px; }
.estop { width: 96px; height: 56px; flex: none; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font: 600 15px inherit; letter-spacing: 2px; color: #fff; cursor: pointer; background: radial-gradient(circle at 50% 35%, #FF6B6B, #C62828); border: 2px solid #FF9C9C; border-radius: 4px; box-shadow: 0 0 14px rgba(255,107,107,.35); }
.estop.on { background: #3A1A1F; color: #FF9C9C; border-color: #FF6B6B; font-size: 13px; letter-spacing: 0; }
.mo-stop .sw { flex: 1; display: grid; grid-template-columns: 1fr auto; gap: 8px 6px; align-items: center; font-size: 12.5px; color: var(--muted); }
.mo-tabs { padding: 0 14px 12px; } .mo-tabs :deep(.ant-tabs-nav) { margin-bottom: 10px; }
.mo-gaits { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.mo-gaits button { padding: 6px 0; font: inherit; font-size: 12px; color: var(--muted); cursor: pointer; background: rgba(77,208,225,.05); border: 1px solid var(--line); border-radius: 3px; }
.mo-gaits button:hover { color: var(--text); border-color: var(--line-strong); } .mo-gaits button.on { color: #fff; border-color: var(--accent); background: var(--accent-soft); }
.mo-row3 { display: flex; gap: 6px; margin-top: 10px; } .mo-row3 > * { flex: 1; padding-inline: 4px; }
.mo-loc { display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 10px 8px; align-items: center; margin-top: 12px; font-size: 12.5px; color: var(--muted); } .mo-loc :deep(.ant-select) { grid-column: span 1; }
.mo-speed { display: flex; align-items: center; gap: 10px; margin-top: 8px; font-size: 12.5px; color: var(--muted); } .mo-speed :deep(.ant-slider) { flex: 1; } .mo-speed b { color: var(--text); font-weight: 500; font-size: 12px; }
.mo-ptz { display: flex; gap: 14px; align-items: center; }
.mo-ptz .pad { position: relative; width: 112px; height: 112px; flex: none; border-radius: 50%; background: radial-gradient(circle, rgba(38,198,218,.12), rgba(10,27,43,.9) 70%); border: 1px solid var(--line-strong); }
.mo-ptz .pad button { position: absolute; width: 30px; height: 30px; display: grid; place-items: center; color: var(--cyan); cursor: pointer; background: none; border: 0; }
.mo-ptz .pad button:hover { color: #fff; } .mo-ptz .u { left: 41px; top: 4px; } .mo-ptz .d { left: 41px; bottom: 4px; } .mo-ptz .l { left: 4px; top: 41px; } .mo-ptz .r { right: 4px; top: 41px; }
.mo-ptz .c { left: 31px !important; top: 31px; width: 50px !important; height: 50px !important; font-size: 12px; border-radius: 50%; background: rgba(38,198,218,.15) !important; border: 1px solid var(--accent) !important; color: #fff !important; }
.mo-ptz .ops { flex: 1; display: flex; flex-direction: column; gap: 8px; font-size: 12.5px; color: var(--muted); } .mo-ptz .ops > div { display: flex; align-items: center; gap: 6px; } .mo-ptz .ops span { width: 32px; }
.mo-task { padding: 12px 14px; display: flex; flex-direction: column; min-height: 0; flex: 1; }
.mo-task .t { display: flex; align-items: center; gap: 8px; } .mo-task .t b { font-size: 14px; flex: 1; }
.mo-task .kv { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; margin-top: 10px; font-size: 12.5px; } .mo-task .kv span { color: var(--muted); } .mo-task .kv b { font-weight: 500; text-align: right; }
.mo-task .prog :deep(.ant-progress-text) { color: var(--text); }
.mo-task .st4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center; } .mo-task .st4 > div { padding: 6px 0; background: rgba(77,208,225,.05); border-radius: 3px; } .mo-task .st4 b { display: block; font-size: 16px; color: #fff; } .mo-task .st4 small { font-size: 11px; color: var(--muted); }
.mo-task .pts { list-style: none; margin: 10px 0 0; padding: 0; overflow: auto; flex: 1; min-height: 0; }
.mo-task .pts li { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 12.5px; color: var(--muted); border-bottom: 1px dashed var(--line); }
.mo-task .pts i { width: 20px; height: 20px; flex: none; display: grid; place-items: center; font: 600 11px var(--mono); font-style: normal; border: 1px solid var(--line-strong); border-radius: 50%; }
.mo-task .pts span { flex: 1; } .mo-task .pts small { font-size: 11px; }
.mo-task .pts li.done { color: var(--text); } .mo-task .pts li.done i { background: #26C6DA; border-color: #26C6DA; color: #04121D; }
.mo-task .pts li.cur { color: #fff; } .mo-task .pts li.cur i { border-color: #FFB74D; color: #FFB74D; box-shadow: 0 0 8px rgba(255,183,77,.5); }
.mo-locst { display: flex; align-items: center; gap: 4px; padding: 8px 10px; font-size: 12.5px; background: rgba(77,208,225,.04); border: 1px dashed var(--line-strong); border-radius: 3px; } .mo-locst span { flex: 1; } .mo-locst a { font-size: 12px; }
.mo-h4 { margin: 4px 0 10px; font-size: 14px; color: var(--text); } .mo-h4 ~ .mo-locst { display: flex; align-items: center; gap: 4px; padding: 8px 10px; font-size: 12.5px; background: rgba(77,208,225,.04); border: 1px dashed var(--line-strong); border-radius: 3px; } .mo-locst span { flex: 1; } .mo-locst a { font-size: 12px; }
.mo-h4 { margin-top: 20px; }
</style>
