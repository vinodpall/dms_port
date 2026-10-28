<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  PlayCircleOutlined, StopOutlined, PlusOutlined, DeleteOutlined, AimOutlined, EditOutlined, UndoOutlined, SaveOutlined, InfoCircleOutlined,
  ScissorOutlined, HighlightOutlined, RedoOutlined, NodeIndexOutlined, CameraOutlined,
} from '@ant-design/icons-vue'
import MapSlot from './MapSlot.vue'
import WebRtcVideo from '@/components/viz/WebRtcVideo.vue'
import { streamsOf } from '@/config/media'
import { TASK_TYPES, PRESETS, GAITS, GROUNDS, OBS_MODES, PROMPTS, type TaskPoint, type TaskGroup } from '@/mock/biz'
import { routeLen, toReal, UNIT } from './geo'
import {
  rt, isDog, isIns, hasNav, myMaps, myRoutes, myGroups, db, curId, routeById, shortName, lastRoute,
  startTrackRec, stopTrackRec, openLaunch, stopRun, newPointFromPose, savePoint, gotoPoint,  gaitName,
} from './store'

const props = defineProps<{ sub: string }>()
const emit = defineEmits<{ 'update:sub': [string]; go: [tab: string, sub?: string] }>()
const sub = computed(() => (props.sub === 'pub' ? 'pub' : 'route'))
const ts = ref(Date.now()); const tm = setInterval(() => { ts.value = Date.now() }, 1000); onBeforeUnmount(() => clearInterval(tm))
const mmss = (t0: number) => { const s = Math.max(0, Math.round((ts.value - t0) / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` }

/* ---------- 左侧：路线 / 发布点任务组 ---------- */
const byMap = computed(() => {
  const out: { map: string; list: typeof myRoutes.value }[] = []
  for (const r of myRoutes.value) { const k = r.map || 'INS 坐标系'; let g = out.find((x) => x.map === k); if (!g) out.push((g = { map: k, list: [] })); g.list.push(r) }
  return out
})
const pubGroups = computed(() => myGroups.value.filter((g) => g.kind === '发布点'))
/** 发布点任务：按地图归类，地图下再分任务组（与循迹路线 → 任务组 一致） */
const pubMaps = computed(() => { const s = new Set<string>(myMaps.value.filter((m) => m.grid).map((m) => m.name)); pubGroups.value.forEach((g) => s.add(g.map || 'INS 坐标系')); return [...s] })
const sel = ref('') // 路线 id 或 'M:'+发布点地图
watch([curId, myRoutes, pubGroups, sub], () => {
  if (sub.value === 'pub') { if (!pubMaps.value.some((m) => 'M:' + m === sel.value)) sel.value = pubMaps.value[0] ? 'M:' + pubMaps.value[0] : '' }
  else if (!myRoutes.value.some((r) => r.id === sel.value)) sel.value = myRoutes.value[0]?.id ?? ''
}, { immediate: true })
watch(lastRoute, (v) => { if (v) sel.value = v })
const route = computed(() => routeById(sel.value))
const pubSel = computed(() => (sel.value.startsWith('M:') ? { name: sel.value.slice(2), map: sel.value.slice(2) } : undefined))
const pubOf = (m: string) => pubGroups.value.filter((g) => (g.map || 'INS 坐标系') === m)
const groupsOf = (id: string) => myGroups.value.filter((g) => g.route === id)
const ptsOf = (id: string) => groupsOf(id).reduce((a, g) => a + g.points.length, 0)
const lenM = (shape: number) => (routeLen(shape) * UNIT).toFixed(1)
const mapSeed = (name?: string) => myMaps.value.find((m) => m.name === name)?.seed ?? 11
const pickRoute = (id: string) => { sel.value = id; editing.value = false }
/* 地图：任务管理不显示卫星图，仅点云 / 栅格 */
const mode = ref<'grid' | 'cloud'>('cloud')
watch(mode, (m) => { if (m !== 'grid') editing.value = false })
/* 任务启停 */
const running = computed(() => !!group.value && rt.value.run?.group === group.value.id)
const toggleRun = () => {
  if (!group.value) return
  if (running.value) return stopRun()
  if (rt.value.run) return message.error('机器人正在执行其他任务')
  if (!group.value.points.length) return message.error('任务组暂无任务点')
  openLaunch(pubSel.value ? '发布点任务' : '循迹任务', { route: group.value.route, group: group.value.id })
}

/* ---------- 录制路线 ---------- */
const recOpen = ref(false); const rec = reactive({ map: '', name: '' })
const gridMaps = computed(() => myMaps.value.filter((m) => m.grid))
const openRec = () => {
  if (rt.value.run) return message.error('当前正在循迹，无法录制路线')
  if (!hasNav.value) return Modal.confirm({ title: '未开启定位', content: isIns.value ? '录制路线前需先开启 INS 或 MSF 定位，是否前往开启？' : '录制路线前需先开启导航定位，是否前往开启？', okText: '前往', onOk: () => emit('go', 'nav', 'loc') })
  rec.map = rt.value.navMap || gridMaps.value[0]?.name || ''; rec.name = ''; recOpen.value = true
}
const okRec = () => { startTrackRec(rec.map, rec.name.trim()); if (rt.value.trackRec) { recOpen.value = false; sel.value = '' } }
const recording = computed(() => !!rt.value.trackRec && sub.value === 'route')

/* ---------- 路线编辑 ---------- */
const editing = ref(false); const et = reactive({ tool: 'seg', line: '曲线', step: 0.2, z: 0 })
const smooth = () => { const r = route.value!; Modal.confirm({ title: '轨迹平滑', content: `对「${r.name}」进行轨迹平滑处理？平滑后将覆盖原路线文件。`, onOk: () => { r.smooth = true; message.success('轨迹平滑完成') } }) }
const saveEdit = () => { editing.value = false; message.success('路线已保存并上传至机器人') }
const delRoute = () => { const r = route.value!; Modal.confirm({ title: '删除路线', content: `删除「${r.name}」将同时删除其下 ${groupsOf(r.id).length} 个任务组，确定删除吗？`, okButtonProps: { danger: true }, onOk: () => {
  db.routes.splice(db.routes.findIndex((x) => x.id === r.id), 1); for (let i = db.groups.length - 1; i >= 0; i--) if (db.groups[i].route === r.id) db.groups.splice(i, 1); message.success('已删除') } }) }

/* ---------- 任务组 ---------- */
const gid = ref('')
const groups = computed<TaskGroup[]>(() => (pubSel.value ? pubOf(pubSel.value.map) : route.value ? groupsOf(route.value.id) : []))
watch([sel, groups], () => { if (!groups.value.some((g) => g.id === gid.value)) gid.value = groups.value[0]?.id ?? '' }, { immediate: true })
const group = computed(() => groups.value.find((g) => g.id === gid.value))
const gOpen = ref(false); const gf = reactive({ name: '', kind: '循迹' as '循迹' | '发布点', map: '' })
const openGroup = (kind: '循迹' | '发布点') => { gf.name = ''; gf.kind = kind; gf.map = pubSel.value?.map ?? (rt.value.navMap || gridMaps.value[0]?.name || ''); gOpen.value = true }
const okGroup = () => {
  if (!gf.name.trim()) return message.error('请输入任务组名称')
  const id = `G-${String(db.groups.length + 1).padStart(2, '0')}${Math.floor(Math.random() * 9)}`
  if (gf.kind === '循迹') { if (groups.value.some((g) => g.name === gf.name.trim())) return message.error('任务组名称已存在'); db.groups.push({ id, name: gf.name.trim(), robot: curId.value, kind: '循迹', route: route.value!.id, map: route.value!.map, points: [] }); gid.value = id }
  else { db.groups.push({ id, name: gf.name.trim(), robot: curId.value, kind: '发布点', map: gf.map, points: [] }); gid.value = id }
  
  gOpen.value = false; message.success('任务组已创建，请添加任务点')
}
const delGroup = () => { const g = group.value!; Modal.confirm({ title: '删除任务组', content: `确定删除任务组「${g.name}」及其 ${g.points.length} 个任务点吗？`, okButtonProps: { danger: true }, onOk: () => { db.groups.splice(db.groups.findIndex((x) => x.id === g.id), 1);  message.success('已删除') } }) }

/* ---------- 任务点 ---------- */
const selPt = ref(-1)
watch(gid, () => { selPt.value = -1 })
const mapPts = computed(() => (group.value?.points ?? []).map((p) => ({ mx: p.mx, my: p.my, st: 'todo' as const })))
const blank = (): TaskPoint => ({ id: 0, type: '可见光拍照', multi: false, x: 0, y: 0, z: 0, angle: 0, mx: 0, my: 0, f: 0, preset: '', extra: '', desc: '', gait: 1, ground: 1, nostop: false, obs: '停障模式', always: true })
const pOpen = ref(false); const editId = ref(0); const pf = reactive<TaskPoint>(blank())
const typeOpts = computed(() => TASK_TYPES.filter((t) => t.single === !pf.multi).map((t) => ({ value: t.cn, label: t.cn })))
const openPoint = (p?: TaskPoint) => {
  if (!group.value) return message.error('请先创建任务组')
  editId.value = p?.id ?? 0
  Object.assign(pf, blank(), p ?? newPointFromPose(group.value), p ? {} : { desc: `任务点 ${group.value.points.length + 1}` })
  if (!p && !hasNav.value) message.warning('未开启定位，无法获取当前位姿，请手动输入坐标')
  pOpen.value = true
}
const usePose = () => { if (!hasNav.value) return message.error('请先开启导航、INS或MSF'); Object.assign(pf, newPointFromPose(group.value!)); message.success('已读取当前位姿') }
const okPoint = () => { if (!pf.desc.trim()) return message.error('请输入任务描述'); savePoint(group.value!, { ...pf, mx: undefined, my: undefined }, editId.value || undefined); pOpen.value = false; message.success(editId.value ? '任务点已更新' : '任务点已添加') }
const delPoint = (p: TaskPoint) => Modal.confirm({ title: '删除任务点', content: `确定删除「${p.desc}」吗？`, okButtonProps: { danger: true }, onOk: () => { const g = group.value!; g.points.splice(g.points.findIndex((x) => x.id === p.id), 1) } })
const presetOpen = ref(false); const presetSel = ref('预置点1')
const PTZ = ['↖', '↑', '↗', '←', '⟳', '→', '↙', '↓', '↘']
const pose = computed(() => ({ x: toReal(rt.value.pose.x, rt.value.pose.y).x.toFixed(2), y: toReal(rt.value.pose.x, rt.value.pose.y).y.toFixed(2), yaw: rt.value.pose.yaw }))

</script>

<template>
  <div class="bz-3 bz-fit rt-wrap">
    <!-- 左：循迹路线 / 发布点任务 列表 -->
    <div class="pp-panel rt-col">
      <template v-if="sub === 'route'">
        <div class="pp-panel-h"><h3>循迹路线</h3><span class="muted" style="font-size:12px;margin-left:6px">{{ myRoutes.length }} 条</span>
          <span class="bz-panel-tools"><a-button v-if="!rt.trackRec" size="small" type="primary" @click="openRec">录制路线</a-button><a-button v-else size="small" danger @click="stopTrackRec">完成录制</a-button></span></div>
        <div v-if="rt.trackRec" style="padding:10px 10px 0"><div class="bz-status on" style="margin:0"><i class="dot" /><span>录制中 · <b>{{ rt.trackRec.name }}</b></span><span class="mono">{{ mmss(rt.trackRec.t0) }}</span></div></div>
        <div class="bz-items rt-scroll">
          <template v-for="g in byMap" :key="g.map">
            <div class="bz-grp">{{ g.map }}</div>
            <button v-for="r in g.list" :key="r.id" type="button" class="bz-item" :class="{ on: r.id === sel }" @click="pickRoute(r.id)">
              <span class="b"><b>{{ shortName(r) }}</b><small>{{ lenM(r.shape) }} m · {{ groupsOf(r.id).length }} 个任务组 · {{ ptsOf(r.id) }} 个点</small></span>
              <a-tag v-if="rt.run?.route === r.id" color="cyan" class="tg">执行中</a-tag>
            </button>
          </template>
          <div v-if="!myRoutes.length && !rt.trackRec" class="bz-empty">暂无路线<br /><span style="font-size:12px">{{ hasNav ? '点击「录制路线」开始' : '请先开启定位' }}</span></div>
        </div>
      </template>
      <template v-else>
        <div class="pp-panel-h"><h3>发布点任务</h3><span class="muted" style="font-size:12px;margin-left:6px">{{ pubMaps.length }} 张地图</span></div>
        <div class="bz-items rt-scroll">
          <button v-for="m in pubMaps" :key="m" type="button" class="bz-item" :class="{ on: 'M:' + m === sel }" @click="pickRoute('M:' + m)">
            <span class="b"><b>{{ m }}</b><small>{{ pubOf(m).length }} 个任务组 · {{ pubOf(m).reduce((a, g) => a + g.points.length, 0) }} 个任务点</small></span>
            <a-tag v-if="pubOf(m).some((g) => rt.run?.group === g.id)" color="cyan" class="tg">执行中</a-tag>
          </button>
          <div v-if="!pubMaps.length" class="bz-empty">暂无地图<br /><span style="font-size:12px">请先在导航管理中建图</span></div>
        </div>
      </template>
    </div>

    <!-- 中：地图 -->
    <div class="pp-panel bz-fill">
      <div class="pp-panel-h">
        <h3>{{ recording && !route ? '路线录制' : pubSel ? pubSel.name : route ? shortName(route) : '地图' }}</h3>
        <span class="bz-panel-tools">
          <template v-if="route && sub === 'route'">
            <a-button size="small" :disabled="route.smooth" @click="smooth">{{ route.smooth ? '已平滑' : '轨迹平滑' }}</a-button>
            <a-tooltip :title="mode !== 'grid' ? '请切换到栅格地图后编辑' : ''"><a-button size="small" :type="editing ? 'primary' : 'default'" :disabled="!!rt.run || mode !== 'grid'" @click="editing = !editing">{{ editing ? '退出编辑' : '路线编辑' }}</a-button></a-tooltip>
            <a-tooltip title="删除路线"><a-button size="small" danger :disabled="rt.run?.route === route.id" @click="delRoute"><DeleteOutlined /></a-button></a-tooltip>
          </template>
        </span></div>
      <div v-if="editing && route" class="bz-bar">
        <a-radio-group v-model:value="et.tool" size="small" button-style="solid"><a-radio-button value="seg">选段</a-radio-button><a-radio-button value="draw">绘制</a-radio-button></a-radio-group>
        <a-radio-group v-model:value="et.line" size="small"><a-radio-button value="直线">直线</a-radio-button><a-radio-button value="曲线">曲线</a-radio-button></a-radio-group>
        <span>步长 <a-input-number v-model:value="et.step" size="small" :min="0.05" :max="1" :step="0.05" style="width:72px" /> m</span>
        <span>Z 值 <a-input-number v-model:value="et.z" size="small" :step="0.1" style="width:72px" /></span>
        <span class="sp" /><a-button size="small">撤销</a-button><a-button size="small">重置</a-button><a-button size="small" type="primary" @click="saveEdit">保存上传</a-button>
      </div>
      <div class="bz-canvas">
        <MapSlot v-if="recording && !route" :seed="mapSeed(rt.trackRec!.map)" :mode="mode" :zones="false" :shape="rt.trackRec!.shape" :draw="rt.trackRec!.f" :robot="rt.pose" :light="mode === 'grid'" :cloud-bar="false" />
        <MapSlot v-else :seed="mapSeed(route?.map ?? pubSel?.map)" :mode="mode" :zones="mode === 'grid' && !isIns" :shape="sub === 'route' ? route?.shape ?? null : null" :pts="mapPts" :sel="selPt" :robot="rt.pose" :edit="editing" :light="mode === 'grid'" :cloud-bar="false" />
        <a-radio-group v-model:value="mode" size="small" class="rt-mode"><a-radio-button value="cloud">点云</a-radio-button><a-radio-button value="grid">栅格</a-radio-button></a-radio-group>
      </div>
    </div>

    <!-- 右：任务组 + 任务点列表 -->
    <div class="pp-panel rt-col">
      <div class="pp-panel-h"><h3>任务组</h3>
        <a-select v-model:value="gid" size="small" class="rt-gsel" :disabled="!route && !pubSel" :placeholder="route || pubSel ? '暂无任务组' : '请选择路线'" :options="groups.map((g) => ({ value: g.id, label: `${g.name}（${g.points.length}）` }))" />
        <span class="bz-panel-tools">
          <a-tooltip title="新增任务组"><a-button size="small" :disabled="!route && !pubSel" @click="openGroup(pubSel ? '发布点' : '循迹')"><PlusOutlined /></a-button></a-tooltip>
          <a-tooltip title="删除任务组"><a-button size="small" danger :disabled="!group || running" @click="delGroup"><DeleteOutlined /></a-button></a-tooltip>
        </span></div>
      <div class="rt-acts">
        <a-button size="small" :disabled="!group" @click="openPoint()">新增任务点</a-button>
        <a-button size="small"  type="primary" :danger="running" :disabled="!group" @click="toggleRun"><template v-if="running">停止任务</template><template v-else>启动任务</template></a-button>
      </div>
      <ul class="rt-pts rt-scroll">
        <li v-for="(p, i) in group?.points ?? []" :key="p.id" :class="{ on: i === selPt }" @click="selPt = i">
          <i class="mono">{{ i + 1 }}</i>
          <div><b :title="p.desc">{{ p.desc }}</b><small>{{ p.type }} · <span class="mono">{{ p.x }}, {{ p.y }}, {{ p.angle }}°</span></small></div>
          <span class="bz-ops" @click.stop><a @click="openPoint(p)">编辑</a><a @click="gotoPoint(p)">到点</a><a class="d" @click="delPoint(p)">删除</a></span>
        </li>
        <li v-if="!(group?.points.length)" class="empty">{{ group ? '暂无任务点，点击「新增任务点」' : pubSel || route ? '请先新增任务组' : '请先选择' + (sub === 'pub' ? '发布点任务' : '路线') }}</li>
      </ul>
      <div class="rt-pose"><a-badge :status="hasNav ? (rt.locOk ? 'success' : 'processing') : 'default'" />实时位姿 <b class="mono">{{ pose.x }}, {{ pose.y }}, {{ pose.yaw }}°</b></div>
    </div>
  </div>

  <!-- 弹窗：录制路线 -->
  <a-modal v-model:open="recOpen" title="录制路线" :width="440" ok-text="开始录制" @ok="okRec">
    <a-form layout="vertical" class="bz-form" style="margin-top:12px">
      <a-form-item v-if="!isIns" label="所属地图"><a-select v-model:value="rec.map" :options="gridMaps.map((m) => ({ value: m.name, label: m.name }))" :disabled="rt.nav" /><div v-if="rt.nav" class="muted" style="font-size:12px;margin-top:4px">导航中，路线将录制在当前导航地图上</div></a-form-item>
      <a-form-item label="路线名称"><a-input v-model:value="rec.name" placeholder="请输入路线名称" :maxlength="30" :addon-before="isIns ? undefined : rec.map + '_'" /></a-form-item>
    </a-form>
    <div class="bz-hint"><InfoCircleOutlined /><span>开始录制后遥控机器人沿巡检路径行走，录制的起点即为循迹任务的起点。</span></div>
  </a-modal>

  <!-- 弹窗：新建任务组 -->
  <a-modal v-model:open="gOpen" :title="gf.kind === '循迹' ? '新建任务组' : '新建发布点任务组'" :width="420" @ok="okGroup">
    <a-form layout="vertical" class="bz-form" style="margin-top:12px">
      <a-form-item v-if="gf.kind === '循迹'" label="所属路线"><a-input :value="route?.name" disabled /></a-form-item>
      <a-form-item v-else label="所属地图"><a-select v-model:value="gf.map" :options="gridMaps.map((m) => ({ value: m.name, label: m.name }))" /></a-form-item>
      <a-form-item label="任务组名称"><a-input v-model:value="gf.name" placeholder="如：日常巡检" :maxlength="20" /></a-form-item>
    </a-form>
  </a-modal>

  <!-- 弹窗：任务点 -->
  <a-modal v-model:open="pOpen" :title="editId ? '编辑任务点' : '添加任务点'" :width="640" @ok="okPoint">
    <a-form layout="vertical" class="bz-form" style="margin-top:12px">
      <a-row :gutter="12">
        <a-col :span="8"><a-form-item label="类型模式"><a-radio-group v-model:value="pf.multi" @change="pf.type = typeOpts[0].value"><a-radio :value="false">单选</a-radio><a-radio :value="true">多选</a-radio></a-radio-group></a-form-item></a-col>
        <a-col :span="16"><a-form-item label="任务类型"><a-select v-model:value="pf.type" :options="typeOpts" /></a-form-item></a-col>
      </a-row>
      <a-row :gutter="12">
        <a-col :span="5"><a-form-item label="X"><a-input-number v-model:value="pf.x" :step="0.1" style="width:100%" /></a-form-item></a-col>
        <a-col :span="5"><a-form-item label="Y"><a-input-number v-model:value="pf.y" :step="0.1" style="width:100%" /></a-form-item></a-col>
        <a-col :span="4"><a-form-item label="Z"><a-input-number v-model:value="pf.z" :step="0.1" style="width:100%" /></a-form-item></a-col>
        <a-col :span="5"><a-form-item label="角度"><a-input-number v-model:value="pf.angle" :min="-180" :max="180" style="width:100%" /></a-form-item></a-col>
        <a-col :span="5"><a-form-item label=" "><a-button block @click="usePose">当前位姿</a-button></a-form-item></a-col>
      </a-row>
      <a-row :gutter="12">
        <a-col :span="12"><a-form-item label="预置点"><div style="display:flex;gap:8px"><a-select v-model:value="pf.preset" allow-clear placeholder="不使用" style="flex:1" :options="PRESETS.map((p) => ({ value: p, label: p }))" /><a-button @click="presetSel = pf.preset || '预置点1'; presetOpen = true">设置</a-button></div></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="额外事务配置"><a-select v-model:value="pf.extra" allow-clear placeholder="无" :options="PROMPTS.filter((p) => p.on).map((p) => ({ value: '提示词：' + p.name, label: '大模型提示词 · ' + p.name }))" /></a-form-item></a-col>
      </a-row>
      <a-form-item label="任务描述"><a-input v-model:value="pf.desc" placeholder="如：配电柜 1# 柜门" :maxlength="40" /></a-form-item>
      <a-row :gutter="12">
        <a-col v-if="isDog" :span="8"><a-form-item label="步态"><a-select v-model:value="pf.gait" :options="GAITS.map((g, i) => ({ value: i + 1, label: g }))" /></a-form-item></a-col>
        <a-col v-if="isDog" :span="8"><a-form-item label="地形"><a-select v-model:value="pf.ground" :options="GROUNDS.map((g, i) => ({ value: i + 1, label: g }))" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="避障"><a-select v-model:value="pf.obs" :options="OBS_MODES.map((o) => ({ value: o, label: o }))" /></a-form-item></a-col>
      </a-row>
      <a-space :size="28"><span>到点不停 <a-switch v-model:checked="pf.nostop" size="small" /></span><span>常检 <a-switch v-model:checked="pf.always" size="small" /></span></a-space>
    </a-form>
  </a-modal>

  <!-- 弹窗：预置点设置 -->
  <a-modal v-model:open="presetOpen" title="预置点设置" :width="620" ok-text="保存预置点" @ok="pf.preset = presetSel; presetOpen = false; message.success(`${presetSel} 已保存`)">
    <div class="rp-preset">
      <div class="rp-cam"><WebRtcVideo v-if="presetOpen" :url="streamsOf(curId).rgb" label="可见光" /></div>
      <div class="rp-ptz">
        <a-select v-model:value="presetSel" size="small" style="width:100%" :options="PRESETS.map((p) => ({ value: p, label: p }))" />
        <div class="rp-pad"><button v-for="d in PTZ" :key="d" type="button">{{ d }}</button></div>
        <div class="rp-zoom"><a-button size="small">变倍 +</a-button><a-button size="small">变倍 −</a-button></div>
        <a-button size="small" block @click="message.success('已转到预置点')">转到预置点</a-button>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.rt-wrap { grid-template-columns: 260px minmax(0, 1fr) 360px; }
.rt-col { display: flex; flex-direction: column; min-height: 0; }
.rt-scroll { flex: 1; min-height: 0; overflow: auto; }
.rt-mode { position: absolute; z-index: 2; right: 10px; top: 10px; }
.bz-fill > .pp-panel-h h3 { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rt-meta { margin-left: 10px; font-size: 12px; white-space: nowrap; }
.rt-gsel { flex: 1; min-width: 0; margin-left: 10px; }
.rt-acts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; padding: 10px 12px; border-bottom: 1px solid var(--line); } .rt-acts :deep(.ant-btn) { padding: 0 4px; }
.rt-pts { list-style: none; margin: 0; padding: 4px 8px; }
.rt-pts li { display: flex; align-items: center; gap: 10px; padding: 8px 6px; border-bottom: 1px dashed var(--line); cursor: pointer; border-radius: 7px; }
.rt-pts li:hover { background: rgba(46,211,230,.05); } .rt-pts li.on { background: var(--accent-soft); }
.rt-pts li > i { width: 22px; height: 22px; flex: none; display: grid; place-items: center; font-size: 11px; font-style: normal; color: #FFD08A; border: 1.5px solid #FFC15C; border-radius: 50%; }
.rt-pts li > div { flex: 1; min-width: 0; } .rt-pts b { display: block; font-size: 13px; font-weight: 500; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; } .rt-pts small { display: block; font-size: 11.5px; color: var(--muted); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.rt-pts li.empty { justify-content: center; padding: 40px 0; color: var(--faint); font-size: 12.5px; border: 0; cursor: default; }
.rt-pose { padding: 8px 14px; font-size: 12px; color: var(--muted); border-top: 1px solid var(--line); } .rt-pose b { margin-left: 6px; font-weight: 500; color: var(--text); }
.rp-preset { display: grid; grid-template-columns: 1fr 170px; gap: 14px; margin-top: 12px; }
.rp-cam { aspect-ratio: 16 / 9; border: 1px solid var(--line); border-radius: 7px; overflow: hidden; } .rp-cam :deep(svg) { width: 100%; height: 100%; display: block; }
.rp-ptz { display: flex; flex-direction: column; gap: 10px; }
.rp-pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; } .rp-pad button { height: 34px; color: var(--text); cursor: pointer; background: rgba(46,211,230,.06); border: 1px solid var(--line); border-radius: 7px; } .rp-pad button:hover { border-color: var(--cyan); }
.rp-zoom { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
</style>
