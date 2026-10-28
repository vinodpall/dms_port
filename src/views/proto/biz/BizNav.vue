<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  PlayCircleOutlined, StopOutlined, EyeOutlined, BuildOutlined, AppstoreOutlined, BlockOutlined, AimOutlined, EnvironmentOutlined,
  PlusOutlined, DeleteOutlined, ReloadOutlined, DragOutlined, EditOutlined, ClearOutlined, UndoOutlined, SaveOutlined, InfoCircleOutlined, MinusOutlined,
} from '@ant-design/icons-vue'
import MapSlot from './MapSlot.vue'
import { toReal } from './geo'
import { ZONES, OBS_MODES } from '@/mock/biz'
import {
  robot, rt, isIns, hasNav, locText, myBags, myMaps, myRoutes, myGroups, db, curId, toggleNav, toggleIns, initIns, toggleMsf,
  startBag, stopBag, genMap, genGrid, stopJob, shortName,
} from './store'

const props = defineProps<{ sub: string }>()
const emit = defineEmits<{ 'update:sub': [string]; go: [tab: string, sub?: string] }>()
const subs = computed(() => (isIns.value
  ? [{ value: 'build', label: '录包建图' }, { value: 'loc', label: '导航定位' }, { value: 'file', label: '文件管理' }]
  : [{ value: 'build', label: '录包建图' }, { value: 'edit', label: '地图编辑' }, { value: 'loc', label: '导航定位' }, { value: 'file', label: '文件管理' }]))
const sub = computed({ get: () => (subs.value.some((s) => s.value === props.sub) ? props.sub : subs.value[0].value), set: (v) => emit('update:sub', v) })

const ts = ref(Date.now()); const tm = setInterval(() => { ts.value = Date.now() }, 1000); onBeforeUnmount(() => clearInterval(tm))
const mmss = (t0: number) => { const s = Math.max(0, Math.round((ts.value - t0) / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` }

/* ---------- 录包建图 ---------- */
const dlg = reactive({ bag: false, map: false, grid: false, fusion: false, slam: false })
const form = reactive({ bag: '', mapBag: '', mapName: '', gridMap: '', fusion: '' })
const openBag = () => { if (rt.value.run) return message.error('任务执行中，无法录包'); form.bag = `bag_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${String(new Date().getHours()).padStart(2, '0')}${String(new Date().getMinutes()).padStart(2, '0')}`; dlg.bag = true }
const okBag = () => { startBag(form.bag); if (rt.value.bagRec) dlg.bag = false }
const canGen = computed(() => myBags.value.length > 0)
const openMap = () => { form.mapBag = myBags.value[0]?.name ?? ''; form.mapName = ''; dlg.map = true }
const okMap = () => { if (!form.mapBag) return message.error('请选择数据包'); genMap(form.mapBag, form.mapName.trim()); if (rt.value.job) dlg.map = false }
const openGrid = () => { form.gridMap = myMaps.value.find((m) => !m.grid)?.name ?? myMaps.value[0]?.name ?? ''; dlg.grid = true }
const okGrid = () => { genGrid(form.gridMap); if (rt.value.job) dlg.grid = false }
const okFusion = () => { genMap(myBags.value[0]?.name ?? '', form.fusion.trim(), true); if (rt.value.job) dlg.fusion = false }
const toggleSlam = () => { rt.value.slam = !rt.value.slam; message.success(rt.value.slam ? '实时建图已开启' : '实时建图已关闭') }
const preview = ref('')
watch([curId, myMaps], () => { if (!myMaps.value.some((m) => m.name === preview.value)) preview.value = myMaps.value[0]?.name ?? '' }, { immediate: true })
const previewMap = computed(() => myMaps.value.find((m) => m.name === preview.value))

/* ---------- 地图编辑 ---------- */
const editMap = ref('')
const gridMaps = computed(() => myMaps.value.filter((m) => m.grid))
watch([curId, gridMaps], () => { if (!gridMaps.value.some((m) => m.name === editMap.value)) editMap.value = gridMaps.value[0]?.name ?? '' }, { immediate: true })
const em = computed(() => gridMaps.value.find((m) => m.name === editMap.value))
const tool = ref<'pan' | 'pen' | 'eraser'>('pan')
const zoneOpen = ref(false); const zf = reactive({ name: '', k: 'forbid', geo: 'area' })
const zonePanel = ref(false); const editOn = ref(false); const zonePreview = ref(true); const drawing = ref(false); const zoneSel = ref(''); const brush = ref(5)
const resetMap = () => Modal.confirm({ title: '初始化地图', content: '将丢弃所有未保存的编辑，恢复为原始栅格地图？', onOk: () => { message.success('已恢复原始地图') } })
const startDraw = () => { drawing.value = true; zonePreview.value = true }
const submitZone = () => { zf.name = ''; zoneOpen.value = true }
watch(editMap, () => { zoneSel.value = ''; drawing.value = false })
const addZone = () => { if (!zf.name.trim()) return message.error('请输入功能区名称'); em.value!.zones.push({ name: zf.name.trim(), k: zf.k }); zoneOpen.value = false; drawing.value = false; message.success('功能区已提交') }
const delZone = (i: number) => Modal.confirm({ title: '删除功能区', content: `确定删除「${em.value!.zones[i].name}」吗？`, okButtonProps: { danger: true }, onOk: () => { em.value!.zones.splice(i, 1); zoneSel.value = '' } })
const zMeta = (k: string) => ZONES.find((z) => z.k === k)!

/* ---------- 导航定位 ---------- */
const navMap = ref('')
watch([curId, gridMaps], () => { navMap.value = rt.value.navMap && gridMaps.value.some((m) => m.name === rt.value.navMap) ? rt.value.navMap : gridMaps.value[0]?.name ?? '' }, { immediate: true })
const locMode = ref<'cloud' | 'grid' | 'sat'>('cloud')
watch(curId, () => { locMode.value = 'cloud' }, { immediate: true })
const relo = ref(false); const arrow = ref<{ x: number; y: number; yaw: number } | null>(null)
const startRelo = () => { if (!rt.value.nav) return message.error('请先开启导航'); relo.value = true; arrow.value = null; message.info('在地图上点击机器人实际位置以设置初始位姿') }
const onPick = (x: number, y: number) => { if (!relo.value) return; arrow.value = { x, y, yaw: rt.value.pose.yaw } }
const okRelo = () => { if (!arrow.value) return; rt.value.pose = { ...arrow.value }; rt.value.locOk = true; relo.value = false; arrow.value = null; message.success('重定位成功') }
const needMap = () => { if (!navMap.value) { message.error('请先选择地图'); return true } rt.value.navMap = navMap.value; return false }
const onIns = () => { if (!rt.value.ins && needMap()) return; toggleIns() }
const anyLoc = computed(() => rt.value.nav || rt.value.ins || rt.value.msf)
const msfOpen = ref(false); const msfMode = ref<'融合定位' | '卫星定位'>('融合定位')
const onMsf = () => { if (!rt.value.msf && needMap()) return; if (rt.value.msf) return toggleMsf(navMap.value, msfMode.value); if (!robot.value.rtk) return toggleMsf('', msfMode.value); msfOpen.value = true }
const obsOpen = ref(false); const obsSel = ref('停障模式')
const toggleGps = () => { rt.value.gps = !rt.value.gps; message.success(rt.value.gps ? '已开启GPS' : '已关闭GPS') }
const setOrigin = () => Modal.confirm({ title: '原点设置', content: '将机器人当前位置设置为地图原点？', onOk: () => message.success('原点设置成功') })
const speedUp = (d: number) => { rt.value.speed = Math.min(1.6, Math.max(0.2, +(rt.value.speed + d).toFixed(1))) }
const curMapSeed = computed(() => myMaps.value.find((m) => m.name === (rt.value.nav ? rt.value.navMap : navMap.value))?.seed ?? 11)
const ghost = computed(() => myRoutes.value.filter((r) => isIns.value || r.map === (rt.value.nav ? rt.value.navMap : navMap.value)).map((r) => r.shape))

/* ---------- 文件管理 ---------- */
const fMap = ref(''); const fBag = ref('')
watch([curId, myMaps], () => { if (!myMaps.value.some((m) => m.name === fMap.value)) fMap.value = (rt.value.nav && rt.value.navMap) || myMaps.value[0]?.name || '' }, { immediate: true })
watch([curId, myBags], () => { if (!myBags.value.some((b) => b.name === fBag.value)) fBag.value = myBags.value[0]?.name ?? '' }, { immediate: true })
interface FItem { t: string; c: string; name: string; time: string; del: () => void }
const fileGroups = computed(() => myRoutes.value.filter((r) => (isIns.value ? !r.map || r.map === fMap.value : r.map === fMap.value)).map((r) => {
  const items: FItem[] = [
    { t: '循迹路线', c: 'r', name: `${r.name}.txt`, time: r.created, del: () => delRoute(r.id) },
    { t: '循迹路线', c: 'r', name: `${r.name}_origin.txt`, time: r.created, del: () => message.success('已删除') },
    ...myGroups.value.filter((g) => g.route === r.id).map((g) => ({ t: '循迹任务组', c: 'g', name: `${g.name}.json`, time: r.created, del: () => del(`任务组「${g.name}」`, () => { db.groups.splice(db.groups.findIndex((x) => x.id === g.id), 1) }) })),
  ]
  return { id: r.id, route: r, items }
}))
const otherFiles = computed<FItem[]>(() => myGroups.value.filter((g) => g.kind === '发布点' && (g.map === fMap.value || (isIns.value && !g.map))).map((g) => ({ t: '发布点任务组', c: 'p', name: `${g.name}.json`, time: '—', del: () => del(`任务组「${g.name}」`, () => { db.groups.splice(db.groups.findIndex((x) => x.id === g.id), 1) }) })))
const del = (what: string, fn: () => void) => Modal.confirm({ title: `删除${what}`, content: `删除后不可恢复，确定删除吗？`, okButtonProps: { danger: true }, onOk: () => { fn(); message.success('已删除') } })
const delMap = (name: string) => del(`地图「${name}」`, () => { db.maps.splice(db.maps.findIndex((m) => m.name === name && m.robot === curId.value), 1) })
const delBag = (name: string) => del(`数据包「${name}」`, () => { db.bags.splice(db.bags.findIndex((m) => m.name === name && m.robot === curId.value), 1) })
const delRoute = (id: string) => del('路线及其任务组', () => { db.routes.splice(db.routes.findIndex((r) => r.id === id), 1); for (let i = db.groups.length - 1; i >= 0; i--) if (db.groups[i].route === id) db.groups.splice(i, 1) })
</script>

<template>

  <!-- ================= 录包建图 ================= -->
  <div v-if="sub === 'build'" class="bz-2 bz-fit">
    <div class="pp-panel">
      <div class="bz-sec">
        <h4><span class="n">1</span>采集地图数据</h4>
        <div class="bz-status" :class="{ on: rt.bagRec }"><i class="dot" /><template v-if="rt.bagRec"><span>录包中 · <b>{{ rt.bagRec.name }}</b></span><span class="mono">{{ mmss(rt.bagRec.t0) }}</span></template><span v-else>未在录包，遥控机器人前请先开始录包</span></div>
        <div class="bz-btns">
          <a-button type="primary" :disabled="!!rt.bagRec || !robot.online" @click="openBag">开始录包</a-button>
          <a-button :disabled="!rt.bagRec" danger @click="stopBag">完成录制</a-button>
          <a-button :danger="rt.slam" :disabled="!robot.online" @click="toggleSlam">{{ rt.slam ? '关闭建图' : '实时建图' }}</a-button>
          <a-button :disabled="!rt.slam" @click="dlg.slam = true">查看实时地图</a-button>
        </div>
      </div>
      <div class="bz-sec">
        <h4><span class="n">2</span>创建二维地图</h4>
        <div class="bz-btns">
          <a-button type="primary" :disabled="!!rt.bagRec || !canGen" @click="openMap">生成地图</a-button>
          <a-button type="primary" :disabled="!!rt.bagRec || !myMaps.length" @click="openGrid">生成栅格地图</a-button>
          <a-tooltip :title="robot.rtk ? '' : '当前机器人未搭载RTK设备'"><a-button :disabled="!!rt.bagRec || !robot.rtk" @click="form.fusion = ''; dlg.fusion = true">新建融合地图</a-button></a-tooltip>
        </div>
      </div>
      <div class="bz-sec">
        <h4><span class="n">3</span>建图进度<span class="r">{{ rt.job ? rt.job.kind + ' · ' + rt.job.name : '无进行中的任务' }}</span></h4>
        <div style="display:flex;align-items:center;gap:12px"><a-progress :percent="rt.job?.progress ?? 0" stroke-color="#26C6DA" style="flex:1;margin:0" /><a-button size="small" danger :disabled="!rt.job" @click="stopJob">终止</a-button></div>
      </div>
      <div class="bz-sec"><div class="bz-hint"><InfoCircleOutlined /><span>栅格地图生成后，前往「导航定位」选择地图开启定位，再到「任务管理」录制循迹路线。</span></div></div>
    </div>
    <div class="pp-panel bz-fill">
      <div class="pp-panel-h"><h3>建图预览</h3><span class="muted" style="font-size:12px;margin-left:6px">{{ rt.bagRec || rt.slam ? '实时栅格地图' : '' }}</span></div>
      <div class="bz-canvas">
        <MapSlot v-if="rt.bagRec || rt.slam" :seed="41" mode="grid" :zones="false" :labels="false" live :robot="rt.pose" />
        <div v-else class="nv-blank"><BuildOutlined /><span>开始录包或开启实时建图后，此处显示实时栅格地图</span></div>
      </div>
    </div>
  </div>

  <!-- ================= 地图编辑（参考 robot_web map_edit：功能区 / 编辑 浮层叠加在栅格图上） ================= -->
  <div v-else-if="sub === 'edit'" class="bz-fit nv-edit">
    <div class="pp-panel bz-fill">
      <div class="pp-panel-h"><h3>地图编辑</h3>
        <a-select v-model:value="editMap" size="small" style="width:180px;margin-left:12px" :placeholder="gridMaps.length ? '请选择地图' : '暂无地图'" :options="gridMaps.map((m) => ({ value: m.name, label: m.name }))" />
        <span class="bz-panel-tools">
          <a-button size="small" :type="zonePanel ? 'primary' : 'default'" :disabled="!em" @click="zonePanel = !zonePanel">功能区</a-button>
          <a-button size="small" :type="editOn ? 'primary' : 'default'" :disabled="!em" @click="editOn = !editOn; tool = editOn ? 'pen' : 'pan'">编辑</a-button>
        </span></div>
      <div class="bz-canvas">
        <MapSlot v-if="em" :seed="em.seed" mode="grid" :zones="zonePreview" :edit="editOn" light :controls="false" />
        <div v-else class="nv-blank"><span>暂无栅格地图，请先在「录包建图」中生成</span></div>
        <!-- 编辑工具条 -->
        <div v-if="editOn" class="nv-tools">
          <a-tooltip title="拖动" placement="right"><button type="button" :class="{ on: tool === 'pan' }" @click="tool = 'pan'"><DragOutlined /></button></a-tooltip>
          <a-tooltip title="画笔（障碍物）" placement="right"><button type="button" :class="{ on: tool === 'pen' }" @click="tool = 'pen'"><EditOutlined /></button></a-tooltip>
          <a-tooltip title="橡皮擦" placement="right"><button type="button" :class="{ on: tool === 'eraser' }" @click="tool = 'eraser'"><ClearOutlined /></button></a-tooltip>
          <a-tooltip title="撤销" placement="right"><button type="button" @click="message.info('已撤销上一步')"><UndoOutlined /></button></a-tooltip>
          <a-tooltip title="初始化（恢复原始地图）" placement="right"><button type="button" @click="resetMap"><ReloadOutlined /></button></a-tooltip>
          <div class="sz"><small>大小</small><a-slider v-model:value="brush" vertical :min="1" :max="20" style="height:80px;margin:6px auto" /><small class="mono">{{ brush }}</small></div>
          <a-tooltip title="保存地图" placement="right"><button type="button" class="save" @click="message.success('地图已保存')"><SaveOutlined /></button></a-tooltip>
        </div>
        <!-- 功能区面板 -->
        <div v-if="zonePanel && em" class="nv-zp">
          <div class="seg"><button type="button" :class="{ on: zf.geo === 'area' }" @click="zf.geo = 'area'">区域</button><button type="button" :class="{ on: zf.geo === 'line' }" @click="zf.geo = 'line'">线段</button></div>
          <div class="row"><a-button size="small" :type="drawing ? 'primary' : 'default'" @click="startDraw">添加</a-button><a-button size="small" :disabled="!drawing" @click="message.info('已撤销上一个点')">撤销</a-button></div>
          <div class="types"><label v-for="z in ZONES" :key="z.k" :class="{ on: zf.k === z.k }" @click="zf.k = z.k"><i :style="{ borderColor: z.c, background: z.c + '33' }" />{{ z.t }}</label></div>
          <div class="hr" />
          <a-select v-model:value="zoneSel" size="small" style="width:100%" :options="[{ value: '', label: '全部' }, ...em.zones.map((z, i) => ({ value: String(i), label: z.name }))]" />
          <div class="row"><a-button size="small" danger :disabled="zoneSel === ''" @click="delZone(+zoneSel)">删除</a-button><a-button size="small" :type="zonePreview ? 'primary' : 'default'" @click="zonePreview = !zonePreview">预览</a-button></div>
          <a-button size="small" type="primary" block :disabled="!drawing" @click="submitZone">提交</a-button>
        </div>
        <div v-if="em && zonePreview" class="bz-legend"><span v-for="z in ZONES" :key="z.k"><i :style="{ borderColor: z.c, background: z.c + '33' }" />{{ z.t }}</span></div>
      </div>
    </div>
  </div>

  <!-- ================= 导航定位 ================= -->
  <div v-else-if="sub === 'loc'" class="bz-2 bz-fit">
    <div class="pp-panel nv-left">
      <div class="bz-sec">
        <h4>定位方式<span class="r">{{ locText }}</span></h4>
        <div class="nv-field"><span>地图</span><a-select v-model:value="navMap" :disabled="anyLoc" style="flex:1" :placeholder="gridMaps.length ? '请选择地图' : '暂无地图'" :options="gridMaps.map((m) => ({ value: m.name, label: m.name }))" /></div>
        <div class="nv-sw">
          <button type="button" :class="{ on: rt.nav }" :disabled="!robot.online || !navMap || rt.ins || rt.msf" @click="toggleNav(navMap)"><b>导航</b><small>{{ rt.nav ? '运行中' : '激光导航' }}</small></button>
          <button type="button" :class="{ on: rt.ins }" :disabled="!robot.online || !robot.rtk || !navMap || rt.nav || rt.msf" @click="onIns"><b>INS</b><small>{{ rt.ins ? '运行中' : '组合导航' }}</small></button>
          <button type="button" :class="{ on: rt.msf }" :disabled="!robot.online || !robot.rtk || !navMap || rt.nav || rt.ins" @click="onMsf"><b>MSF</b><small>{{ rt.msf ? rt.msfMode : '多源融合' }}</small></button>
        </div>
        <div v-if="!navMap" class="bz-hint warn" style="margin-top:10px"><InfoCircleOutlined /><span>{{ gridMaps.length ? '请先选择地图，再开启导航 / INS / MSF。' : '暂无地图，请先在「录包建图」中生成地图。' }}</span></div>
      </div>
      <div class="bz-sec">
        <h4>导航控制</h4>
        <div class="nv-ops">
          <a-button size="small" :disabled="!hasNav" @click="rt.pause = !rt.pause; message.success(rt.pause ? '暂停指令已发送' : '恢复指令已发送')">{{ rt.pause ? '恢复导航' : '暂停导航' }}</a-button>
          <a-button size="small" :disabled="!hasNav" @click="rt.navStop = !rt.navStop; message.success(rt.navStop ? '暂停停障指令已发送' : '恢复停障指令已发送')">{{ rt.navStop ? '恢复停障' : '暂停停障' }}</a-button>
          <a-button size="small" :disabled="!rt.nav" @click="startRelo">重定位</a-button>
          <a-button size="small" :disabled="!rt.nav" @click="setOrigin">原点设置</a-button>
          <a-button size="small" :disabled="!robot.online || !robot.rtk" @click="toggleGps">{{ rt.gps ? '关闭GPS' : '开启GPS' }}</a-button>
          <a-button size="small" :disabled="!rt.run" @click="obsSel = rt.obsMode; obsOpen = true">循迹避障</a-button>
          <a-button v-if="isIns" size="small" :disabled="!robot.rtk || !robot.online || rt.ins" @click="initIns">INS初始化</a-button>
        </div>
        <div v-if="isIns" class="bz-kv nv-org"><span>INS 原点</span><b class="mono">{{ rt.insOrigin ? `${rt.insOrigin.lat.toFixed(6)}, ${rt.insOrigin.lng.toFixed(6)}` : '未初始化' }}</b></div>
      </div>
      <div class="bz-sec">
        <h4>任务速度<span class="r">0.2 ~ 1.6 m/s</span></h4>
        <div class="nv-speed"><a-button size="small" @click="speedUp(-0.1)"><MinusOutlined /></a-button><b class="mono">{{ rt.speed.toFixed(1) }} m/s</b><a-button size="small" @click="speedUp(0.1)"><PlusOutlined /></a-button></div>
      </div>
      <div class="bz-sec">
        <h4>状态信息</h4>
        <div class="nv-st">
          <div><small>速度</small><b class="mono">{{ rt.run && !rt.pause ? rt.speed.toFixed(2) : '0.00' }}<em>m/s</em></b></div>
          <div><small>角度 θ</small><b class="mono">{{ rt.pose.yaw }}<em>°</em></b></div>
          <div class="w"><small>位姿 (x, y)</small><b class="mono">{{ toReal(rt.pose.x, rt.pose.y).x.toFixed(2) }}, {{ toReal(rt.pose.x, rt.pose.y).y.toFixed(2) }}</b></div>
          <div><small>{{ isIns ? 'IMU数据' : '激光雷达' }}</small><b><a-badge status="success" text="正常" /></b></div>
          <div><small>定位状态</small><b><a-badge :status="hasNav ? (rt.locOk ? 'success' : 'processing') : 'default'" :text="hasNav ? (rt.locOk ? '正常' : '定位中') : '未开启'" /></b></div>
          <div class="w"><small>卫星数据</small><b><a-badge :status="robot.rtk && rt.gps ? 'success' : 'default'" :text="robot.rtk ? (rt.gps ? 'RTK 固定解 · 24 颗' : '未开启') : '未配置'" /></b></div>
        </div>
      </div>
    </div>
    <div class="pp-panel bz-fill">
      <div class="pp-panel-h"><h3>导航地图</h3><span class="muted" style="font-size:12px;margin-left:6px">{{ anyLoc ? rt.navMap : navMap || '未选择地图' }}</span>
        <span class="bz-panel-tools"><template v-if="relo"><a-button size="small" @click="relo = false; arrow = null">取消</a-button><a-button size="small" type="primary" :disabled="!arrow" @click="okRelo">确认重定位</a-button></template>
          <a-radio-group v-else v-model:value="locMode" size="small"><a-radio-button value="cloud">点云</a-radio-button><a-radio-button value="grid">栅格</a-radio-button><a-radio-button value="sat">卫星</a-radio-button></a-radio-group></span></div>
      <div class="bz-canvas">
        <MapSlot :seed="curMapSeed" :mode="navMap || anyLoc ? locMode : 'blank'" :zones="locMode === 'grid'" :ghost="ghost" :robot="hasNav ? rt.pose : null" :pick="relo" :arrow="arrow" :cloud-bar="false" @pick="onPick" />
      </div>
    </div>
  </div>

  <!-- ================= 文件管理（参考 robot_web file_manage：地图 / 数据包 选择删除 + 路线文件分组卡片） ================= -->
  <div v-else-if="sub === 'file'" class="bz-fit nv-file">
    <div class="pp-panel bz-fill">
      <div class="nv-ftb">
        <span>地图</span><a-select v-model:value="fMap" style="width:200px" :disabled="rt.nav" :placeholder="myMaps.length ? '请选择地图' : '暂无地图'" :options="myMaps.map((m) => ({ value: m.name, label: m.name }))" />
        <a-button danger :disabled="!fMap || rt.nav" @click="delMap(fMap)">删除地图</a-button>
        <span style="margin-left:20px">数据包</span><a-select v-model:value="fBag" style="width:220px" :placeholder="myBags.length ? '请选择数据包' : '暂无数据包'" :options="myBags.map((b) => ({ value: b.name, label: b.name }))" />
        <a-button danger :disabled="!fBag" @click="delBag(fBag)">删除数据包</a-button>
        <span class="muted" style="margin-left:auto;font-size:12px">{{ fileGroups.length }} 组路线文件 · {{ fileGroups.reduce((a, g) => a + g.items.length, 0) + otherFiles.length }} 个文件</span>
      </div>
      <div class="nv-board">
        <div v-for="g in fileGroups" :key="g.id" class="nv-fc">
          <div class="nv-fch"><i />循迹路线：<b>{{ shortName(g.route) }}</b><a class="danger" :class="{ dis: rt.nav }" @click="!rt.nav && delRoute(g.id)"><DeleteOutlined /> 删除</a></div>
          <div class="nv-fcm">{{ g.items.length }} 个文件 · 最近：{{ g.route.created }}</div>
          <div v-for="f in g.items" :key="f.name" class="nv-fi"><span class="t" :class="f.c">{{ f.t }}</span><span class="n" :title="f.name">{{ f.name }}</span><span class="tm mono">{{ f.time }}</span><a class="danger" :class="{ dis: rt.nav }" @click="!rt.nav && f.del()">删除</a></div>
        </div>
        <div v-if="otherFiles.length" class="nv-fc">
          <div class="nv-fch"><i />其他文件</div>
          <div class="nv-fcm">{{ otherFiles.length }} 个文件</div>
          <div v-for="f in otherFiles" :key="f.name" class="nv-fi"><span class="t" :class="f.c">{{ f.t }}</span><span class="n" :title="f.name">{{ f.name }}</span><span class="tm mono">{{ f.time }}</span><a class="danger" :class="{ dis: rt.nav }" @click="!rt.nav && f.del()">删除</a></div>
        </div>
        <div v-if="!fileGroups.length && !otherFiles.length" class="nv-blank"><span>{{ fMap ? '该地图下暂无路线文件' : '请选择地图' }}</span></div>
      </div>
    </div>
  </div>

  <!-- 弹窗 -->
  <a-modal v-model:open="dlg.bag" title="开始录包 - 输入数据包名称" ok-text="开始录包" @ok="okBag"><a-input v-model:value="form.bag" placeholder="请输入数据包名称" style="margin-top:12px" /></a-modal>
  <a-modal v-model:open="dlg.map" title="生成地图" ok-text="确定" @ok="okMap">
    <a-form layout="vertical" style="margin-top:12px"><a-form-item label="选择数据包"><a-select v-model:value="form.mapBag" :options="myBags.map((b) => ({ value: b.name, label: `${b.name}（${b.dur}）` }))" /></a-form-item><a-form-item label="地图名称"><a-input v-model:value="form.mapName" placeholder="请输入地图名称" /></a-form-item></a-form>
  </a-modal>
  <a-modal v-model:open="dlg.grid" title="生成栅格地图" ok-text="确定" @ok="okGrid">
    <a-form layout="vertical" style="margin-top:12px"><a-form-item label="选择地图"><a-select v-model:value="form.gridMap" :options="myMaps.map((m) => ({ value: m.name, label: m.name + (m.grid ? '（已生成，将覆盖）' : '') }))" /></a-form-item></a-form>
  </a-modal>
  <a-modal v-model:open="dlg.fusion" title="新建融合地图" ok-text="确定" @ok="okFusion"><a-form layout="vertical" style="margin-top:12px"><a-form-item label="融合地图名称"><a-input v-model:value="form.fusion" placeholder="请输入融合地图名称" /></a-form-item></a-form></a-modal>
  <a-modal v-model:open="dlg.slam" title="实时建图 - 栅格地图" :footer="null" :width="760">
    <div class="bz-canvas" style="margin:12px 0"><MapSlot v-if="dlg.slam" :seed="41" mode="cloud" live :zones="false" :robot="rt.pose" /></div>
    <div class="muted" style="font-size:12px">分辨率: 0.2 · 地图尺寸: 514×501 · 车辆位姿: x: {{ toReal(rt.pose.x, rt.pose.y).x.toFixed(3) }}, y: {{ toReal(rt.pose.x, rt.pose.y).y.toFixed(3) }}, θ: {{ rt.pose.yaw }}°</div>
  </a-modal>
  <a-modal v-model:open="zoneOpen" title="添加功能区" ok-text="确定" @ok="addZone">
    <a-form layout="vertical" style="margin-top:12px">
      <a-form-item label="绘制类型"><a-radio-group v-model:value="zf.geo"><a-radio value="area">区域</a-radio><a-radio value="line">线段</a-radio></a-radio-group></a-form-item>
      <a-form-item label="功能区类型"><a-select v-model:value="zf.k" :options="ZONES.map((z) => ({ value: z.k, label: z.t }))" /></a-form-item>
      <a-form-item label="功能区名称"><a-input v-model:value="zf.name" placeholder="请输入功能区名称" /></a-form-item>
    </a-form>
    <div class="bz-hint"><InfoCircleOutlined /><span>确定后在地图上依次点击绘制{{ zf.geo === 'area' ? '多边形区域（至少 3 个点）' : '线段（至少 2 个点）' }}。</span></div>
  </a-modal>
  <a-modal v-model:open="msfOpen" title="选择 MSF 定位模式" ok-text="确定" @ok="msfOpen = false; toggleMsf(navMap, msfMode)">
    <a-radio-group v-model:value="msfMode" style="margin-top:12px;display:flex;flex-direction:column;gap:10px"><a-radio value="融合定位">融合定位（激光 + RTK）</a-radio><a-radio value="卫星定位">卫星定位（RTK）</a-radio></a-radio-group>
  </a-modal>
  <a-modal v-model:open="obsOpen" title="循迹避障模式设置" ok-text="确认" @ok="rt.obsMode = obsSel; if (rt.run) rt.run.obs = obsSel; obsOpen = false; message.success('避障模式已更新')">
    <a-radio-group v-model:value="obsSel" style="margin-top:12px"><a-radio v-for="o in OBS_MODES" :key="o" :value="o">{{ o }}</a-radio></a-radio-group>
  </a-modal>
</template>

<style scoped>
.nv-field { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font-size: 13px; color: var(--muted); }
.nv-sw { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.nv-sw button { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 0; font: inherit; cursor: pointer; color: var(--text); background: rgba(46,211,230,.05); border: 1px solid var(--line-strong); border-radius: 7px; }
.nv-sw button b { font-size: 14px; } .nv-sw button small { font-size: 11px; color: var(--muted); }
.nv-sw button:hover:not(:disabled) { border-color: var(--cyan); } .nv-sw button:disabled { cursor: not-allowed; opacity: .4; }
.nv-sw button.on { color: #0B1C2E; background: var(--cyan); border-color: var(--cyan); } .nv-sw button.on small { color: #0B1C2E; }
.nv-ops { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; } .nv-ops :deep(.ant-btn) { padding: 0 4px; }
.nv-org { margin-top: 10px; }
.nv-left { overflow: hidden; }
.nv-left > .bz-sec { padding: 10px 14px; } .nv-left .bz-sec h4 { margin-bottom: 8px; } .nv-left .nv-field { margin-bottom: 8px; }
.nv-left .nv-sw button { padding: 8px 0; gap: 2px; } .nv-left .nv-ops :deep(.ant-btn) { height: 30px; } .nv-left .nv-speed { padding: 2px 0; } .nv-left .nv-ops { gap: 6px; } .nv-left .nv-org { margin-top: 6px; }
.nv-list { flex: none; }
.nv-blank { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: var(--faint); font-size: 13px; } .nv-blank .anticon { font-size: 34px; opacity: .5; }
.nv-left { display: flex; flex-direction: column; } .nv-left > .bz-sec:last-child { flex: 1; display: flex; flex-direction: column; }
.nv-st { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: minmax(44px, 1fr); gap: 8px; }
.nv-st > div { display: flex; flex-direction: column; justify-content: center; gap: 3px; min-width: 0; padding: 6px 12px; background: rgba(46,211,230,.05); border: 1px solid rgba(46,211,230,.12); border-radius: 7px; } .nv-st > div.w { grid-column: span 2; }
.nv-st small { font-size: 11.5px; color: var(--muted); } .nv-st b { font-size: 15px; font-weight: 600; color: #fff; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; } .nv-st em { font-style: normal; font-size: 11px; color: var(--muted); margin-left: 3px; } .nv-st :deep(.ant-badge-status-text) { font-size: 13px; }
.nv-edit { display: flex; } .nv-edit > .pp-panel, .nv-file > .pp-panel { flex: 1; } .nv-file { display: flex; }
.nv-tools .sz { display: flex; flex-direction: column; align-items: center; padding: 4px 0; font-size: 11px; color: var(--muted); } .nv-tools button.save { color: var(--cyan); }
.nv-zp { position: absolute; z-index: 2; right: 58px; top: 10px; width: 200px; display: flex; flex-direction: column; gap: 8px; padding: 10px; background: rgba(13,28,47,.92); border: 1px solid var(--line-strong); border-radius: 8px; }
.nv-zp .seg { display: flex; } .nv-zp .seg button { flex: 1; height: 26px; font: inherit; font-size: 12px; color: var(--muted); cursor: pointer; background: rgba(46,211,230,.05); border: 1px solid var(--line-strong); } .nv-zp .seg button.on { color: #0B1C2E; background: var(--cyan); border-color: var(--cyan); }
.nv-zp .row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.nv-zp .types { display: flex; flex-direction: column; gap: 2px; } .nv-zp .types label { display: flex; align-items: center; gap: 8px; padding: 4px 8px; font-size: 12.5px; color: var(--muted); cursor: pointer; border-radius: 7px; } .nv-zp .types label.on { color: #fff; background: var(--accent-soft); } .nv-zp .types i { width: 12px; height: 12px; border: 1px solid; }
.nv-zp .hr { height: 1px; background: var(--line); }
.nv-ftb { display: flex; align-items: center; gap: 10px; padding: 14px 16px; font-size: 13px; color: var(--muted); border-bottom: 1px solid var(--line); }
.nv-board { position: relative; flex: 1; min-height: 0; overflow: auto; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-content: start; gap: 14px; padding: 14px 16px; }
.nv-fc { padding: 12px 14px; background: rgba(46,211,230,.04); border: 1px solid rgba(46,211,230,.14); border-radius: 8px; }
.nv-fch { display: flex; align-items: center; gap: 6px; font-size: 13.5px; } .nv-fch i { width: 7px; height: 7px; border-radius: 50%; background: var(--cyan); } .nv-fch b { color: #fff; font-weight: 500; } .nv-fch a { margin-left: auto; font-size: 12px; }
.nv-fcm { margin: 4px 0 8px 13px; font-size: 11.5px; color: var(--faint); }
.nv-fi { display: flex; align-items: center; gap: 10px; padding: 7px 4px; font-size: 12.5px; border-top: 1px dashed var(--line); }
.nv-fi .t { flex: none; padding: 0 6px; font-size: 11px; line-height: 18px; border-radius: 5px; } .nv-fi .t.r { color: #45E3A8; background: rgba(69,227,168,.12); } .nv-fi .t.g { color: #26C6DA; background: rgba(38,198,218,.12); } .nv-fi .t.p { color: #B48CFF; background: rgba(180,140,255,.14); }
.nv-fi .n { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; } .nv-fi .tm { font-size: 11.5px; color: var(--muted); }
.nv-speed { display: flex; align-items: center; gap: 14px; } .nv-speed b { width: 80px; text-align: center; font-size: 15px; }
.nv-tools { position: absolute; z-index: 1; right: 10px; top: 10px; display: flex; flex-direction: column; gap: 4px; padding: 4px; background: rgba(13,28,47,.82); border: 1px solid var(--line); border-radius: 8px; }
.nv-tools button { width: 30px; height: 30px; display: grid; place-items: center; font-size: 15px; color: var(--muted); cursor: pointer; background: none; border: 1px solid transparent; border-radius: 7px; }
.nv-tools button:hover { color: #fff; } .nv-tools button.on { color: #fff; background: var(--accent-soft); border-color: var(--accent); }
.nv-zones { list-style: none; margin: 0; padding: 6px 12px 10px; } .nv-zones li { display: flex; align-items: center; gap: 10px; padding: 8px 4px; border-bottom: 1px dashed var(--line); }
.nv-zones li > i { width: 12px; height: 12px; flex: none; border: 1px solid; } .nv-zones li div { flex: 1; min-width: 0; } .nv-zones li b { display: block; font-size: 13px; font-weight: 500; } .nv-zones li small { font-size: 11.5px; color: var(--muted); }
.nv-zones li.empty { justify-content: center; color: var(--faint); border: 0; padding: 30px 0; font-size: 13px; }
.danger { color: #FF7A7A; } .danger.dis { color: var(--faint); cursor: not-allowed; }
:deep(.bz-row-on) td { background: var(--accent-soft) !important; }
</style>
