<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  PlayCircleOutlined, StopOutlined, PlusOutlined, DeleteOutlined, AimOutlined, EditOutlined, UndoOutlined, SaveOutlined, InfoCircleOutlined,
  ScissorOutlined, HighlightOutlined, RedoOutlined, NodeIndexOutlined, CameraOutlined, EnvironmentOutlined,
} from '@ant-design/icons-vue'
import BizMap from './BizMap.vue'
import CamShot from './CamShot.vue'
import { TASK_TYPES, PRESETS, GAITS, GROUNDS, OBS_MODES, PROMPTS, type TaskPoint, type TaskGroup } from '@/mock/biz'
import { routeLen } from './geo'
import {
  rt, isDog, isIns, hasNav, myMaps, myRoutes, myGroups, db, curId, routeById, shortName, lastRoute,
  startTrackRec, stopTrackRec, newPointFromPose, savePoint, gotoPoint, gotoStart, startDist, gaitName,
} from './store'

const props = defineProps<{ sub: string }>()
const emit = defineEmits<{ 'update:sub': [string]; go: [tab: string, sub?: string] }>()
const sub = computed({ get: () => (props.sub === 'points' ? 'points' : 'route'), set: (v) => emit('update:sub', v) })
const ts = ref(Date.now()); const tm = setInterval(() => { ts.value = Date.now() }, 1000); onBeforeUnmount(() => clearInterval(tm))
const mmss = (t0: number) => { const s = Math.max(0, Math.round((ts.value - t0) / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` }

/* ---------- 左侧：路线 / 发布点任务组 ---------- */
const byMap = computed(() => {
  const out: { map: string; list: typeof myRoutes.value }[] = []
  for (const r of myRoutes.value) { const k = r.map || 'INS 坐标系'; let g = out.find((x) => x.map === k); if (!g) out.push((g = { map: k, list: [] })); g.list.push(r) }
  return out
})
const pubGroups = computed(() => myGroups.value.filter((g) => g.kind === '发布点'))
const sel = ref('') // 路线 id 或 'G:'+发布点任务组 id
watch([curId, myRoutes], () => { if (!myRoutes.value.some((r) => r.id === sel.value) && !pubGroups.value.some((g) => 'G:' + g.id === sel.value)) sel.value = myRoutes.value[0]?.id ?? '' }, { immediate: true })
watch(lastRoute, (v) => { if (v) sel.value = v })
const route = computed(() => routeById(sel.value))
const pubSel = computed(() => (sel.value.startsWith('G:') ? pubGroups.value.find((g) => 'G:' + g.id === sel.value) : undefined))
const groupsOf = (id: string) => myGroups.value.filter((g) => g.route === id)
const ptsOf = (id: string) => groupsOf(id).reduce((a, g) => a + g.points.length, 0)
const lenM = (shape: number) => (routeLen(shape) * 0.25).toFixed(1)
const mapSeed = (name?: string) => myMaps.value.find((m) => m.name === name)?.seed ?? 11
const pickRoute = (id: string) => { sel.value = id; if (sub.value === 'route' && id.startsWith('G:')) sub.value = 'points' }

/* ---------- 录制路线 ---------- */
const recOpen = ref(false); const rec = reactive({ map: '', name: '' })
const gridMaps = computed(() => myMaps.value.filter((m) => m.grid))
const openRec = () => {
  if (rt.value.run) return message.error('当前正在循迹，无法录制路线')
  if (!hasNav.value) return Modal.confirm({ title: '未开启定位', content: isIns.value ? '录制路线前需先开启 INS 或 MSF 定位，是否前往开启？' : '录制路线前需先开启导航定位，是否前往开启？', okText: '前往', onOk: () => emit('go', 'nav', 'loc') })
  rec.map = rt.value.navMap || gridMaps.value[0]?.name || ''; rec.name = ''; recOpen.value = true
}
const okRec = () => { startTrackRec(rec.map, rec.name.trim()); if (rt.value.trackRec) { recOpen.value = false; sel.value = '' } }

/* ---------- 路线编辑 ---------- */
const editing = ref(false); const et = reactive({ tool: 'seg', line: '曲线', step: 0.2, z: 0 })
const smooth = () => { const r = route.value!; Modal.confirm({ title: '轨迹平滑', content: `对「${r.name}」进行轨迹平滑处理？平滑后将覆盖原路线文件。`, onOk: () => { r.smooth = true; message.success('轨迹平滑完成') } }) }
const saveEdit = () => { editing.value = false; message.success('路线已保存并上传至机器人') }
const delRoute = () => { const r = route.value!; Modal.confirm({ title: '删除路线', content: `删除「${r.name}」将同时删除其下 ${groupsOf(r.id).length} 个任务组，确定删除吗？`, okButtonProps: { danger: true }, onOk: () => {
  db.routes.splice(db.routes.findIndex((x) => x.id === r.id), 1); for (let i = db.groups.length - 1; i >= 0; i--) if (db.groups[i].route === r.id) db.groups.splice(i, 1); message.success('已删除') } }) }

/* ---------- 任务组 ---------- */
const gid = ref('')
const groups = computed<TaskGroup[]>(() => (pubSel.value ? [pubSel.value] : route.value ? groupsOf(route.value.id) : []))
watch([sel, groups], () => { if (!groups.value.some((g) => g.id === gid.value)) gid.value = groups.value[0]?.id ?? '' }, { immediate: true })
const group = computed(() => groups.value.find((g) => g.id === gid.value))
const gOpen = ref(false); const gf = reactive({ name: '', kind: '循迹' as '循迹' | '发布点', map: '' })
const openGroup = (kind: '循迹' | '发布点') => { gf.name = ''; gf.kind = kind; gf.map = rt.value.navMap || gridMaps.value[0]?.name || ''; gOpen.value = true }
const okGroup = () => {
  if (!gf.name.trim()) return message.error('请输入任务组名称')
  const id = `G-${String(db.groups.length + 1).padStart(2, '0')}${Math.floor(Math.random() * 9)}`
  if (gf.kind === '循迹') { if (groups.value.some((g) => g.name === gf.name.trim())) return message.error('任务组名称已存在'); db.groups.push({ id, name: gf.name.trim(), robot: curId.value, kind: '循迹', route: route.value!.id, map: route.value!.map, points: [] }); gid.value = id }
  else { db.groups.push({ id, name: gf.name.trim(), robot: curId.value, kind: '发布点', map: gf.map, points: [] }); sel.value = 'G:' + id }
  gOpen.value = false; message.success('任务组已创建，请添加任务点')
}
const delGroup = () => { const g = group.value!; Modal.confirm({ title: '删除任务组', content: `确定删除任务组「${g.name}」及其 ${g.points.length} 个任务点吗？`, okButtonProps: { danger: true }, onOk: () => { db.groups.splice(db.groups.findIndex((x) => x.id === g.id), 1); if (pubSel.value === undefined && sel.value.startsWith('G:')) sel.value = myRoutes.value[0]?.id ?? ''; message.success('已删除') } }) }

/* ---------- 任务点 ---------- */
const selPt = ref(-1)
watch(gid, () => { selPt.value = -1 })
const mapPts = computed(() => (group.value?.points ?? []).map((p, i) => ({ mx: p.mx, my: p.my, st: (i === selPt.value ? 'cur' : 'todo') as 'cur' | 'todo' })))
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
const pose = computed(() => ({ x: ((rt.value.pose.x - 6) * 0.25).toFixed(2), y: ((94 - rt.value.pose.y) * 0.25).toFixed(2), yaw: rt.value.pose.yaw }))

const cols = computed(() => [
  { title: '序号', key: 'i', width: 56 }, { title: '任务类型', dataIndex: 'type', width: 120 },
  { title: 'X', dataIndex: 'x', width: 72 }, { title: 'Y', dataIndex: 'y', width: 72 }, { title: 'Z', dataIndex: 'z', width: 48 }, { title: '角度', key: 'angle', width: 64 },
  { title: '预置点', key: 'preset', width: 84 }, { title: '描述', dataIndex: 'desc', ellipsis: true },
  ...(isDog.value ? [{ title: '步态', key: 'gait', width: 92 }] : []), { title: '避障', dataIndex: 'obs', width: 84 },
  { title: '到点不停', key: 'nostop', width: 76 }, { title: '常检', key: 'always', width: 56 }, { title: '操作', key: 'op', width: 140 },
])
</script>

<template>
  <div class="pp-head">
    <div><h2>路线与任务点</h2><p>{{ isIns ? '开启 INS 后遥控机器人录制路线，再在路线上建立任务组、添加任务点' : '导航开启后遥控机器人沿巡检路径录制循迹路线，再在路线上建立任务组、添加任务点' }}</p></div>
  </div>
  <a-segmented v-model:value="sub" class="bz-seg" :options="[{ value: 'route', label: '循迹路线' }, { value: 'points', label: '任务点配置' }]" />

  <div class="bz-2">
    <!-- 左：路线列表 -->
    <div class="pp-panel">
      <div class="pp-panel-h"><h3>路线</h3><span class="muted" style="font-size:12px;margin-left:6px">{{ myRoutes.length }} 条</span>
        <span class="bz-panel-tools"><a-button v-if="!rt.trackRec" size="small" type="primary" @click="openRec"><PlayCircleOutlined />录制路线</a-button><a-button v-else size="small" danger @click="stopTrackRec"><StopOutlined />完成录制</a-button></span></div>
      <div v-if="rt.trackRec" style="padding:12px 12px 0"><div class="bz-status on" style="margin:0"><i class="dot" /><span>录制中 · <b>{{ rt.trackRec.name }}</b></span><span class="mono">{{ mmss(rt.trackRec.t0) }}</span></div></div>
      <div class="bz-items">
        <template v-for="g in byMap" :key="g.map">
          <div class="bz-grp">{{ g.map }}</div>
          <button v-for="r in g.list" :key="r.id" type="button" class="bz-item" :class="{ on: r.id === sel }" @click="pickRoute(r.id)">
            <span class="b"><b>{{ shortName(r) }}</b><small>{{ lenM(r.shape) }} m · {{ groupsOf(r.id).length }} 个任务组 · {{ ptsOf(r.id) }} 个任务点</small></span>
            <a-tag v-if="rt.run?.route === r.id" color="cyan" class="tg">执行中</a-tag>
          </button>
        </template>
        <template v-if="!isIns && sub === 'points'">
          <div class="bz-grp" style="display:flex;align-items:center">发布点任务组<a style="margin-left:auto;font-size:12px;letter-spacing:0" @click="openGroup('发布点')"><PlusOutlined /> 新建</a></div>
          <button v-for="g in pubGroups" :key="g.id" type="button" class="bz-item" :class="{ on: 'G:' + g.id === sel }" @click="pickRoute('G:' + g.id)">
            <span class="b"><b>{{ g.name }}</b><small>{{ g.map }} · {{ g.points.length }} 个任务点</small></span>
          </button>
          <div v-if="!pubGroups.length" class="muted" style="padding:6px 14px;font-size:12px">暂无发布点任务组</div>
        </template>
        <div v-if="!myRoutes.length && !rt.trackRec" class="bz-empty">暂无路线<br /><span style="font-size:12px">{{ hasNav ? '点击「录制路线」开始' : isIns ? '请先开启 INS 定位' : '请先开启导航定位' }}</span></div>
      </div>
    </div>

    <!-- 右：录制中 -->
    <div v-if="rt.trackRec && !route && !pubSel" class="pp-panel">
      <div class="pp-panel-h"><h3>路线录制</h3><span class="muted" style="font-size:12px;margin-left:6px">{{ rt.trackRec.map || 'INS 坐标系' }}</span></div>
      <div class="bz-canvas"><BizMap :seed="mapSeed(rt.trackRec.map)" :mode="isIns ? 'sat' : 'grid'" :zones="false" :shape="rt.trackRec.shape" :draw="rt.trackRec.f" :robot="rt.pose" />
        <div class="bz-ov red"><i class="dot" />录制中 {{ mmss(rt.trackRec.t0) }} · 请遥控机器人沿巡检路径行走，到达终点后点击「完成录制」</div></div>
    </div>

    <!-- 右：循迹路线 -->
    <div v-else-if="sub === 'route' && route" class="pp-panel">
      <div class="pp-panel-h"><h3>{{ route.name }}</h3>
        <span class="bz-panel-tools">
          <a-button size="small" :disabled="!!rt.run" @click="gotoStart(route)"><AimOutlined />前往起点</a-button>
          <a-button size="small" :disabled="route.smooth" @click="smooth"><NodeIndexOutlined />{{ route.smooth ? '已平滑' : '轨迹平滑' }}</a-button>
          <a-button size="small" :type="editing ? 'primary' : 'default'" :disabled="!!rt.run" @click="editing = !editing"><EditOutlined />路线编辑</a-button>
          <a-button size="small" danger :disabled="rt.run?.route === route.id" @click="delRoute"><DeleteOutlined /></a-button>
        </span></div>
      <div class="bz-bar">
        <span>所属地图 <b>{{ route.map || 'INS 坐标系' }}</b></span><span>长度 <b class="mono">{{ lenM(route.shape) }} m</b></span>
        <span>任务组 <b>{{ groupsOf(route.id).length }}</b></span><span>任务点 <b>{{ ptsOf(route.id) }}</b></span><span>创建 <b class="mono">{{ route.created }}</b></span>
        <span class="sp" /><span>距起点 <b class="mono" :style="{ color: startDist(route) < 2 ? '#4DE8B0' : '#FFB74D' }">{{ startDist(route).toFixed(1) }} m</b></span>
      </div>
      <div v-if="editing" class="bz-bar">
        <a-radio-group v-model:value="et.tool" size="small" button-style="solid"><a-radio-button value="seg"><ScissorOutlined /> 选段</a-radio-button><a-radio-button value="draw"><HighlightOutlined /> 绘制</a-radio-button></a-radio-group>
        <a-radio-group v-model:value="et.line" size="small"><a-radio-button value="直线">直线</a-radio-button><a-radio-button value="曲线">曲线</a-radio-button></a-radio-group>
        <span>步长 <a-input-number v-model:value="et.step" size="small" :min="0.05" :max="1" :step="0.05" style="width:72px" /> m</span>
        <span>Z 值 <a-input-number v-model:value="et.z" size="small" :step="0.1" style="width:72px" /></span>
        <span class="sp" /><a-button size="small"><UndoOutlined />撤销</a-button><a-button size="small"><RedoOutlined />重置</a-button><a-button size="small" type="primary" @click="saveEdit"><SaveOutlined />保存上传</a-button>
      </div>
      <div class="bz-canvas">
        <BizMap :seed="mapSeed(route.map)" :mode="isIns ? 'sat' : 'grid'" :zones="!isIns" :shape="route.shape" :pts="groupsOf(route.id).flatMap((g) => g.points.map((p) => ({ mx: p.mx, my: p.my })))" :robot="rt.pose" :edit="editing" />
        <div v-if="editing" class="bz-ov tip">{{ et.tool === 'seg' ? '在路线上点击两个节点选取路段，可删除或重绘该段' : '按住鼠标在地图上绘制新的路线段' }}</div>
      </div>
      <div class="pp-panel-h" style="border-top:1px solid var(--line)"><h3>任务组</h3><a-button size="small" style="margin-left:auto" @click="sub = 'points'">配置任务点 →</a-button></div>
      <a-table size="small" :pagination="false" :data-source="groupsOf(route.id)" row-key="id" :columns="[{ title: '任务组', dataIndex: 'name' }, { title: '任务点数', key: 'n', width: 120 }, { title: '任务类型', key: 't' }, { title: '操作', key: 'op', width: 140 }]">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'n'">{{ record.points.length }}</template>
          <template v-else-if="column.key === 't'"><span class="muted">{{ [...new Set(record.points.map((p: TaskPoint) => p.type))].join('、') || '—' }}</span></template>
          <template v-else-if="column.key === 'op'"><span class="bz-ops"><a @click="gid = record.id; sub = 'points'">任务点</a><a @click="emit('go', 'task')">去执行</a></span></template>
        </template>
        <template #emptyText><div class="bz-empty" style="padding:16px">暂无任务组<br /><a-button size="small" @click="sub = 'points'">去创建</a-button></div></template>
      </a-table>
    </div>

    <!-- 右：任务点配置 -->
    <div v-else-if="sub === 'points' && (route || pubSel)" class="pp-panel">
      <div class="pp-panel-h"><h3>{{ pubSel ? '发布点任务组' : shortName(route) }}</h3>
        <a-select v-if="!pubSel" v-model:value="gid" size="small" style="width:160px;margin-left:12px" placeholder="选择任务组" :options="groups.map((g) => ({ value: g.id, label: `${g.name}（${g.points.length}）` }))" />
        <span v-else class="muted" style="font-size:12px;margin-left:8px">{{ pubSel.name }} · {{ pubSel.map }}</span>
        <span class="bz-panel-tools">
          <a-button v-if="!pubSel" size="small" @click="openGroup('循迹')"><PlusOutlined />新建任务组</a-button>
          <a-button size="small" danger :disabled="!group" @click="delGroup"><DeleteOutlined />删除任务组</a-button>
        </span></div>
      <div class="bz-bar">
        <span><a-badge :status="hasNav ? (rt.locOk ? 'success' : 'processing') : 'default'" />实时位姿</span>
        <span>X <b class="mono">{{ pose.x }}</b></span><span>Y <b class="mono">{{ pose.y }}</b></span><span>Z <b class="mono">0.00</b></span><span>角度 <b class="mono">{{ pose.yaw }}°</b></span>
        <span v-if="!hasNav" style="color:#FFB74D">未开启定位，添加任务点需手动输入坐标</span>
        <span class="sp" /><a-button size="small" type="primary" :disabled="!group" @click="openPoint()"><EnvironmentOutlined />在当前位置添加任务点</a-button>
      </div>
      <div class="bz-canvas" style="aspect-ratio:16/7.6">
        <BizMap :seed="mapSeed(route?.map ?? pubSel?.map)" :mode="isIns ? 'sat' : 'grid'" :zones="false" :shape="route?.shape ?? null" :pts="mapPts" :sel="selPt" :robot="rt.pose" />
        <div class="bz-legend"><span><i style="border-color:#4DD0E1;background:#4DD0E133;border-radius:50%" />任务点</span><span><i style="border-color:#FFB74D;border-radius:50%" />选中</span></div>
      </div>
      <a-table size="small" :pagination="false" :data-source="group?.points ?? []" row-key="id" :columns="cols" :scroll="{ x: 1100, y: 320 }"
        :custom-row="(r: any, i: any) => ({ onClick: () => (selPt = i), style: 'cursor:pointer' })" :row-class-name="(_r: any, i: any) => (i === selPt ? 'bz-row-on' : '')">
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'i'"><span class="mono">{{ index + 1 }}</span></template>
          <template v-else-if="column.key === 'angle'"><span class="mono">{{ record.angle }}°</span></template>
          <template v-else-if="column.key === 'preset'">{{ record.preset || '—' }}</template>
          <template v-else-if="column.key === 'gait'">{{ gaitName(record.gait) }}</template>
          <template v-else-if="column.key === 'nostop'">{{ record.nostop ? '是' : '否' }}</template>
          <template v-else-if="column.key === 'always'">{{ record.always ? '是' : '否' }}</template>
          <template v-else-if="column.key === 'op'"><span class="bz-ops" @click.stop><a @click="openPoint(record)">编辑</a><a @click="gotoPoint(record)">到点</a><a class="d" @click="delPoint(record)">删除</a></span></template>
        </template>
        <template #emptyText><div class="bz-empty" style="padding:16px">{{ group ? '暂无任务点，移动机器人到巡检位置后点击「在当前位置添加任务点」' : '请先新建任务组' }}</div></template>
      </a-table>
    </div>

    <div v-else class="pp-panel"><div class="bz-empty" style="padding:120px 16px">{{ myRoutes.length ? '请选择左侧路线' : '暂无路线，请先录制循迹路线' }}<br /><a-button v-if="!myRoutes.length && !rt.trackRec" type="primary" size="small" @click="openRec"><PlayCircleOutlined />录制路线</a-button></div></div>
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
        <a-col :span="5"><a-form-item label=" "><a-button block @click="usePose"><AimOutlined />当前位姿</a-button></a-form-item></a-col>
      </a-row>
      <a-row :gutter="12">
        <a-col :span="12"><a-form-item label="预置点"><div style="display:flex;gap:8px"><a-select v-model:value="pf.preset" allow-clear placeholder="不使用" style="flex:1" :options="PRESETS.map((p) => ({ value: p, label: p }))" /><a-button @click="presetSel = pf.preset || '预置点1'; presetOpen = true"><CameraOutlined />设置</a-button></div></a-form-item></a-col>
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
      <div class="rp-cam"><CamShot :seed="presetSel.charCodeAt(3)" hud /></div>
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
.rp-preset { display: grid; grid-template-columns: 1fr 170px; gap: 14px; margin-top: 12px; }
.rp-cam { aspect-ratio: 16 / 9; border: 1px solid var(--line); border-radius: 3px; overflow: hidden; } .rp-cam :deep(svg) { width: 100%; height: 100%; display: block; }
.rp-ptz { display: flex; flex-direction: column; gap: 10px; }
.rp-pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; } .rp-pad button { height: 34px; color: var(--text); cursor: pointer; background: rgba(77,208,225,.06); border: 1px solid var(--line); border-radius: 3px; } .rp-pad button:hover { border-color: var(--cyan); }
.rp-zoom { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
</style>
