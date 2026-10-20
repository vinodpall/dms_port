<script setup lang="ts">
/** 首页：对齐 robot_web Home.vue 三栏结构 —— 左 视频/任务统计 · 中 地图/实时警情 · 右 状态/控制/任务下发 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { AimOutlined, ExpandOutlined, PauseOutlined, CaretRightOutlined, SendOutlined, ThunderboltOutlined } from '@ant-design/icons-vue'
import BizMap from './BizMap.vue'
import CamShot from './CamShot.vue'
import { KIND_META, GAITS, ZONES, SENSORS, alarmColor, type BizAlarm } from '@/mock/biz'
import {
  robot, rt, isDog, isIns, hasNav, locText, db, curId, myMaps, myRoutes, myGroups, routeById, groupById,
  togglePause, stopRun, toggleNav, toggleIns, openLaunch,
} from './store'

const emit = defineEmits<{ go: [tab: string, sub?: string] }>()
const on = computed(() => robot.value.online)
const latency = ref(robot.value.latency)
const tm = setInterval(() => { latency.value = on.value ? Math.round(robot.value.latency + (Math.random() - 0.5) * 8) : 0 }, 1000)
onBeforeUnmount(() => clearInterval(tm))
const speed = computed(() => (rt.value.run && !rt.value.pause ? rt.value.speed : 0))
const pose = computed(() => ({ x: ((rt.value.pose.x - 6) * 0.25).toFixed(2), y: ((94 - rt.value.pose.y) * 0.25).toFixed(2) }))

/* 任务统计 */
const run = computed(() => rt.value.run)
const runRoute = computed(() => routeById(run.value?.route)); const runGroup = computed(() => groupById(run.value?.group))
const pts = computed(() => runGroup.value?.points ?? [])
const doneN = computed(() => (run.value ? pts.value.filter((p, i) => (runRoute.value ? p.f : i / Math.max(1, pts.value.length - 1)) < run.value!.progress - 0.01).length : 0))
const mapPts = computed(() => pts.value.map((p, i) => ({ mx: p.mx, my: p.my, st: (i < doneN.value ? 'done' : i === doneN.value ? 'cur' : 'todo') as 'done' | 'cur' | 'todo' })))

/* 地图 */
const mapMode = ref<'cloud' | 'grid' | 'sat'>(isIns.value ? 'sat' : 'grid')

/* 实时警情 */
const alarms = computed(() => db.alarms.filter((a) => a.robot === curId.value).slice(0, 6))
const pic = ref<BizAlarm | null>(null)

/* 控制 */
const gait = ref(0); const force = ref(false); const talk = ref(false)
const act = (t: string) => message.success(`${t}指令已发送`)
const setGait = (i: number) => { if (run.value) return message.error('任务执行中，无法切换步态'); gait.value = i; act(`切换${GAITS[i]}`) }

/* 任务下发 */
const gridMaps = computed(() => myMaps.value.filter((m) => m.grid))
const navSel = ref(''); const rSel = ref(''); const pSel = ref(''); const mSel = ref('')
const pubGroups = computed(() => myGroups.value.filter((g) => g.kind === '发布点'))
const myMulti = computed(() => db.multi.filter((m) => m.robot === curId.value))
watch(curId, () => {
  navSel.value = rt.value.navMap || gridMaps.value[0]?.name || ''
  rSel.value = run.value?.route ?? myRoutes.value.find((r) => !rt.value.navMap || r.map === rt.value.navMap)?.id ?? myRoutes.value[0]?.id ?? ''
  pSel.value = pubGroups.value[0]?.id ?? ''; mSel.value = myMulti.value[0]?.id ?? ''
}, { immediate: true })
const seed = computed(() => myMaps.value.find((m) => m.name === (rt.value.navMap || navSel.value))?.seed ?? 11)
const navRoutes = computed(() => myRoutes.value.filter((r) => isIns.value || !rt.value.nav || r.map === rt.value.navMap))
</script>

<template>
  <div class="hm">
    <!-- ============ 左 ============ -->
    <div class="hm-col">
      <div class="pp-panel hm-cam">
        <div class="pp-panel-h"><h3>可见光视频</h3><a-tooltip title="全屏"><a-button type="text" size="small" class="r"><ExpandOutlined /></a-button></a-tooltip></div>
        <div class="hm-box"><CamShot v-if="on" :seed="robot.id.charCodeAt(4)" box="配电柜 · 正常" box-color="#4DE8B0" hud /><div v-else class="hm-empty">设备离线 · 暂无视频流</div></div>
      </div>
      <div class="pp-panel hm-cam">
        <div class="pp-panel-h"><h3>红外视频</h3><a-tooltip title="全屏"><a-button type="text" size="small" class="r"><ExpandOutlined /></a-button></a-tooltip></div>
        <div class="hm-box"><CamShot v-if="on" :seed="robot.id.charCodeAt(4) + 50" ir box="最高温 46.2℃" box-color="#FFB74D" hud /><div v-else class="hm-empty">设备离线 · 暂无视频流</div></div>
      </div>
      <div class="pp-panel hm-grow">
        <div class="pp-panel-h"><h3>任务统计</h3><a-tag v-if="run" :color="rt.pause ? 'orange' : 'cyan'" class="r">{{ rt.pause ? '已暂停' : run.kind }}</a-tag></div>
        <div v-if="run" class="hm-task">
          <div class="nm" :title="run.name">{{ run.name }}</div>
          <div class="ring">
            <a-progress type="circle" :percent="Math.round(run.progress * 100)" :size="82" stroke-color="#26C6DA" :stroke-width="7" />
            <div class="kv"><span>开始时间</span><b class="mono">{{ run.start }}</b><span>圈数</span><b class="mono">{{ run.laps }} / {{ run.circle }}</b><span>当前巡检点</span><b>{{ pts.length ? pts[Math.min(doneN, pts.length - 1)].desc : '—' }}</b></div>
          </div>
          <div class="st4"><div><b class="mono">{{ doneN }}</b><small>已巡检</small></div><div><b class="mono">{{ pts.length - doneN }}</b><small>待巡检</small></div><div><b class="mono ok">{{ Math.max(0, doneN - 1) }}</b><small>正常</small></div><div><b class="mono bad">{{ doneN > 0 ? 1 : 0 }}</b><small>异常</small></div></div>
          <div class="ops"><a-button size="small" @click="togglePause"><template v-if="rt.pause"><CaretRightOutlined />恢复</template><template v-else><PauseOutlined />暂停</template></a-button><a-button size="small" danger @click="stopRun">关闭任务</a-button></div>
        </div>
        <div v-else class="hm-empty sm">{{ on ? '当前无执行任务' : '设备离线' }}</div>
      </div>
    </div>

    <!-- ============ 中 ============ -->
    <div class="hm-col">
      <div class="pp-panel hm-map">
        <div class="pp-panel-h">
          <h3>巡检地图</h3><span class="muted sub">{{ isIns ? 'INS 坐标系' : rt.navMap || '未开启导航' }}</span>
          <span v-if="mapMode === 'grid'" class="hm-lg"><span v-for="z in ZONES" :key="z.k"><i :style="{ borderColor: z.c, background: z.c + '33' }" />{{ z.t }}</span></span>
          <span class="r">
            <a-radio-group v-model:value="mapMode" size="small"><a-radio-button v-if="!isIns" value="cloud">点云</a-radio-button><a-radio-button v-if="!isIns" value="grid">栅格</a-radio-button><a-radio-button value="sat">卫星</a-radio-button></a-radio-group>
            <a-tooltip title="定位机器人"><a-button type="text" size="small"><AimOutlined /></a-button></a-tooltip>
            <a-tooltip title="全屏"><a-button type="text" size="small"><ExpandOutlined /></a-button></a-tooltip>
          </span>
        </div>
        <div class="hm-box">
          <BizMap v-if="on" :seed="seed" :mode="mapMode" :zones="mapMode === 'grid'" :shape="runRoute?.shape ?? null" :pts="mapPts" :progress="runRoute && run ? run.progress : 0" :robot="hasNav ? rt.pose : null" />
          <div v-else class="hm-empty">设备离线</div>
          <div v-if="on && !hasNav" class="bz-ov">未开启定位 · 可在右侧「任务下发」中开启</div>
        </div>
      </div>
      <div class="pp-panel hm-alarm">
        <div class="pp-panel-h"><h3>实时警情</h3><span class="muted sub">{{ alarms.filter((a) => a.state === '待处理').length }} 条待处理</span><a class="r more" @click="emit('go', 'log', 'alarm')">全部告警 →</a></div>
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
      <div class="pp-panel">
        <div class="pp-panel-h"><h3>{{ KIND_META[robot.kind].t }}状态</h3><a-badge :status="!on ? 'default' : run ? 'processing' : 'success'" :text="!on ? '离线' : run ? '任务中' : '在线'" style="margin-left:8px" /></div>
        <div class="hm-big">
          <div><small>当前速度</small><b class="mono">{{ speed.toFixed(2) }}<em>m/s</em></b></div>
          <div><small>剩余电量</small><b class="mono" :class="{ low: robot.battery < 30 }">{{ on ? robot.battery : '--' }}<em>%</em></b></div>
          <div><small>网络延迟</small><b class="mono">{{ on ? latency : '--' }}<em>ms</em></b></div>
          <div><small>累计里程</small><b class="mono">{{ robot.mileage.toFixed(0) }}<em>m</em></b></div>
        </div>
        <div class="hm-kv">
          <span>X / Y</span><b class="mono">{{ pose.x }}, {{ pose.y }}</b><span>角度</span><b class="mono">{{ rt.pose.yaw }}°</b>
          <span>定位</span><b :class="hasNav ? 'ok' : 'warn'">{{ hasNav ? (rt.nav ? '激光导航' : rt.ins ? 'INS' : 'MSF') : '未开启' }}</b><span>RTK</span><b>{{ robot.rtk ? (rt.ins || rt.msf ? '固定解' : '待机') : '无' }}</b>
          <span>电压</span><b class="mono">{{ isDog ? '52.4 V' : '48.1 V' }}</b><span>电流</span><b class="mono">{{ isDog ? '6.8 A' : '9.2 A' }}</b>
          <span>CPU</span><b class="mono">38%</b><span>内存</span><b class="mono">46%</b>
          <template v-if="isDog"><span>步态</span><b>{{ GAITS[gait] }}</b><span>姿态</span><b>站立</b></template>
          <template v-else><span>磁盘</span><b class="mono">63%</b><span>避障</span><b>{{ rt.obsMode }}</b></template>
        </div>
      </div>

      <div class="pp-panel">
        <div class="pp-panel-h"><h3>{{ isDog ? '机器人控制' : '传感器数据' }}</h3></div>
        <div v-if="isDog" class="hm-ctl">
          <div class="sw"><span>语音对讲</span><a-switch v-model:checked="talk" size="small" :disabled="!on" /><span>力控模式</span><a-switch v-model:checked="force" size="small" :disabled="!on" /></div>
          <div class="gaits"><button v-for="(g, i) in GAITS" :key="g" type="button" :class="{ on: gait === i }" :disabled="!on" @click="setGait(i)">{{ g }}</button></div>
          <div class="row3"><a-button size="small" :disabled="!on" @click="act('开始充电')"><ThunderboltOutlined />开始充电</a-button><a-button size="small" :disabled="!on" @click="act('结束充电')">结束充电</a-button><a-button size="small" :disabled="!on" @click="act('重置充电')">重置充电</a-button></div>
        </div>
        <div v-else class="hm-sensors"><div v-for="s in SENSORS.slice(0, 6)" :key="s.en"><small>{{ s.cn }}</small><b class="mono">{{ on ? s.v : '--' }}<em>{{ s.unit }}</em></b></div></div>
      </div>

      <div class="pp-panel hm-grow">
        <div class="pp-panel-h"><h3>任务下发</h3><span class="muted sub">{{ locText }}</span></div>
        <div class="hm-send">
          <div v-if="!isIns" class="ln"><label>导航地图</label><a-select v-model:value="navSel" size="small" :disabled="rt.nav" placeholder="选择地图" :options="gridMaps.map((m) => ({ value: m.name, label: m.name }))" /><a-switch :checked="rt.nav" size="small" :disabled="!on || rt.ins || rt.msf" @click="toggleNav(navSel)" /></div>
          <div v-else class="ln"><label>INS 定位</label><span class="muted ins">{{ rt.insOrigin ? '原点已设置' : '未初始化' }}</span><a-switch :checked="rt.ins" size="small" :disabled="!on" @click="toggleIns" /></div>
          <div class="ln"><label>循迹任务</label><a-select v-model:value="rSel" size="small" placeholder="选择路线" :options="navRoutes.map((r) => ({ value: r.id, label: r.name }))" /><a-button size="small" type="primary" :disabled="!on || !!run" @click="openLaunch('循迹任务', { route: rSel })"><SendOutlined />下发</a-button></div>
          <div v-if="!isIns" class="ln"><label>发布点任务</label><a-select v-model:value="pSel" size="small" placeholder="选择任务组" :options="pubGroups.map((g) => ({ value: g.id, label: g.name }))" /><a-button size="small" type="primary" :disabled="!on || !!run" @click="openLaunch('发布点任务', { group: pSel })"><SendOutlined />下发</a-button></div>
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
.hm { display: grid; grid-template-columns: 300px minmax(0, 1fr) 330px; gap: 14px; height: calc(100vh - 104px); min-height: 720px; }
.hm-col { display: flex; flex-direction: column; gap: 14px; min-width: 0; min-height: 0; }
.hm-col .r { margin-left: auto; display: flex; align-items: center; gap: 4px; }
.hm-col .sub { margin-left: 8px; font-size: 12px; }
.hm-grow { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.hm-cam { flex: none; display: flex; flex-direction: column; } .hm-cam .hm-box { aspect-ratio: 16 / 9; flex: none; }
.hm-box { position: relative; flex: 1; min-height: 0; margin: 10px; overflow: hidden; border: 1px solid rgba(77,208,225,.16); border-radius: 3px; background: #050E18; }
.hm-empty { position: absolute; inset: 0; display: grid; place-items: center; color: var(--faint); font-size: 13px; } .hm-empty.sm { position: static; flex: 1; padding: 28px 0; }
.hm-task { flex: 1; display: flex; flex-direction: column; gap: 12px; padding: 12px 14px; }
.hm-task .nm { font-size: 13.5px; font-weight: 500; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.hm-task .ring { display: flex; align-items: center; gap: 14px; } .hm-task .ring :deep(.ant-progress-text) { color: #fff; font-size: 17px; }
.hm-task .kv { flex: 1; min-width: 0; display: grid; grid-template-columns: auto 1fr; gap: 6px 8px; font-size: 12px; } .hm-task .kv span { color: var(--muted); } .hm-task .kv b { font-weight: 500; text-align: right; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.hm-task .st4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center; } .hm-task .st4 > div { padding: 6px 0; background: rgba(77,208,225,.05); border-radius: 3px; }
.hm-task .st4 b { display: block; font-size: 16px; color: #fff; } .hm-task .st4 b.ok { color: #4DE8B0; } .hm-task .st4 b.bad { color: #FF6B6B; } .hm-task .st4 small { font-size: 11px; color: var(--muted); }
.hm-task .ops { display: flex; gap: 8px; margin-top: auto; } .hm-task .ops > * { flex: 1; }
.hm-map { flex: 1.7; min-height: 0; display: flex; flex-direction: column; }
.hm-lg { display: flex; gap: 10px; margin-left: 12px; font-size: 11.5px; color: var(--muted); } .hm-lg i { display: inline-block; width: 9px; height: 9px; margin-right: 4px; border: 1px solid; vertical-align: -1px; }
.hm-alarm { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.hm-alarm :deep(.ant-table-wrapper) { flex: 1; min-height: 0; padding: 0 10px 8px; }
.hm-alarm .more { font-size: 12px; }
.hm-type { display: inline-flex; align-items: center; gap: 6px; } .hm-type i { width: 6px; height: 6px; border-radius: 50%; }
.hm-right { overflow: auto; }
.hm-big { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px 14px 4px; }
.hm-big > div { padding: 7px 10px; background: rgba(77,208,225,.05); border: 1px solid rgba(77,208,225,.12); border-radius: 3px; }
.hm-big small { display: block; font-size: 11.5px; color: var(--muted); } .hm-big b { font-size: 18px; font-weight: 600; color: #fff; } .hm-big b.low { color: #FF6B6B; } .hm-big em { font-style: normal; font-size: 11px; color: var(--muted); margin-left: 3px; }
.hm-kv { display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 7px 10px; padding: 10px 14px 14px; font-size: 12.5px; } .hm-kv span { color: var(--muted); } .hm-kv b { font-weight: 500; text-align: right; white-space: nowrap; }
.hm-kv b.ok { color: #4DE8B0; } .hm-kv b.warn { color: #FFB74D; }
.hm-ctl { padding: 10px 14px 14px; }
.hm-ctl .sw { display: grid; grid-template-columns: 1fr auto 1fr auto; gap: 8px; align-items: center; margin-bottom: 10px; font-size: 12.5px; color: var(--muted); }
.hm-ctl .gaits { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.hm-ctl .gaits button { padding: 5px 0; font: inherit; font-size: 12px; color: var(--muted); cursor: pointer; background: rgba(77,208,225,.05); border: 1px solid var(--line); border-radius: 3px; }
.hm-ctl .gaits button:hover:not(:disabled) { color: var(--text); border-color: var(--line-strong); } .hm-ctl .gaits button.on { color: #fff; border-color: var(--accent); background: var(--accent-soft); } .hm-ctl .gaits button:disabled { cursor: not-allowed; opacity: .5; }
.hm-ctl .row3 { display: flex; gap: 6px; margin-top: 10px; } .hm-ctl .row3 > * { flex: 1; padding-inline: 4px; }
.hm-sensors { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 12px 14px 14px; } .hm-sensors > div { display: flex; justify-content: space-between; align-items: baseline; padding: 5px 8px; font-size: 12px; background: rgba(77,232,176,.06); border-left: 2px solid #4DE8B0; }
.hm-sensors small { color: var(--muted); } .hm-sensors em { font-style: normal; font-size: 10px; color: var(--muted); margin-left: 2px; }
.hm-send { display: flex; flex-direction: column; gap: 10px; padding: 12px 14px 14px; }
.hm-send .ln { display: grid; grid-template-columns: 70px minmax(0, 1fr) auto; align-items: center; gap: 8px; font-size: 12.5px; }
.hm-send .ln:first-child { padding-bottom: 10px; border-bottom: 1px dashed var(--line); }
.hm-send label { color: var(--muted); } .hm-send .ins { font-size: 12px; }
.hm-pic { aspect-ratio: 16 / 9; position: relative; overflow: hidden; border-radius: 3px; }
</style>
