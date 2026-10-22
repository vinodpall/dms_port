<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  PlayCircleOutlined, StopOutlined, EyeOutlined, BuildOutlined, AppstoreOutlined, BlockOutlined, AimOutlined, EnvironmentOutlined,
  PlusOutlined, DeleteOutlined, DragOutlined, EditOutlined, ClearOutlined, UndoOutlined, SaveOutlined, InfoCircleOutlined, MinusOutlined,
} from '@ant-design/icons-vue'
import BizMap from './BizMap.vue'
import { toReal } from './geo'
import { ZONES, OBS_MODES } from '@/mock/biz'
import {
  robot, rt, isIns, hasNav, myBags, myMaps, myRoutes, myGroups, db, curId, toggleNav, toggleIns, initIns, toggleMsf,
  startBag, stopBag, genMap, genGrid, stopJob, shortName,
} from './store'

const props = defineProps<{ sub: string }>()
const emit = defineEmits<{ 'update:sub': [string]; go: [tab: string, sub?: string] }>()
const subs = computed(() => (isIns.value
  ? [{ value: 'loc', label: 'INS 定位' }, { value: 'file', label: '文件管理' }]
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
const addZone = () => { if (!zf.name.trim()) return message.error('请输入功能区名称'); em.value!.zones.push({ name: zf.name.trim(), k: zf.k }); zoneOpen.value = false; message.success('功能区已添加') }
const delZone = (i: number) => Modal.confirm({ title: '删除功能区', content: `确定删除「${em.value!.zones[i].name}」吗？`, okButtonProps: { danger: true }, onOk: () => { em.value!.zones.splice(i, 1) } })
const zMeta = (k: string) => ZONES.find((z) => z.k === k)!

/* ---------- 导航定位 ---------- */
const navMap = ref('')
watch([curId, gridMaps], () => { navMap.value = rt.value.navMap && gridMaps.value.some((m) => m.name === rt.value.navMap) ? rt.value.navMap : gridMaps.value[0]?.name ?? '' }, { immediate: true })
const relo = ref(false); const arrow = ref<{ x: number; y: number; yaw: number } | null>(null)
const startRelo = () => { if (!rt.value.nav) return message.error('请先开启导航'); relo.value = true; arrow.value = null; message.info('在地图上点击机器人实际位置以设置初始位姿') }
const onPick = (x: number, y: number) => { if (!relo.value) return; arrow.value = { x, y, yaw: rt.value.pose.yaw } }
const okRelo = () => { if (!arrow.value) return; rt.value.pose = { ...arrow.value }; rt.value.locOk = true; relo.value = false; arrow.value = null; message.success('重定位成功') }
const msfOpen = ref(false); const msfMode = ref<'融合定位' | '卫星定位'>('融合定位')
const onMsf = () => { if (rt.value.msf) return toggleMsf(navMap.value, msfMode.value); if (!robot.value.rtk) return toggleMsf('', msfMode.value); msfOpen.value = true }
const obsOpen = ref(false); const obsSel = ref('停障模式')
const toggleGps = () => { rt.value.gps = !rt.value.gps; message.success(rt.value.gps ? '已开启GPS' : '已关闭GPS') }
const setOrigin = () => Modal.confirm({ title: '原点设置', content: '将机器人当前位置设置为地图原点？', onOk: () => message.success('原点设置成功') })
const speedUp = (d: number) => { rt.value.speed = Math.min(1.6, Math.max(0.2, +(rt.value.speed + d).toFixed(1))) }
const curMapSeed = computed(() => myMaps.value.find((m) => m.name === (rt.value.nav ? rt.value.navMap : navMap.value))?.seed ?? 11)
const ghost = computed(() => myRoutes.value.filter((r) => isIns.value || r.map === (rt.value.nav ? rt.value.navMap : navMap.value)).map((r) => r.shape))

/* ---------- 文件管理 ---------- */
const del = (what: string, fn: () => void) => Modal.confirm({ title: `删除${what}`, content: `删除后不可恢复，确定删除吗？`, okButtonProps: { danger: true }, onOk: () => { fn(); message.success('已删除') } })
const delMap = (name: string) => del(`地图「${name}」`, () => { db.maps.splice(db.maps.findIndex((m) => m.name === name), 1) })
const delBag = (name: string) => del(`数据包「${name}」`, () => { db.bags.splice(db.bags.findIndex((m) => m.name === name), 1) })
const delRoute = (id: string) => del('路线及其任务组', () => { db.routes.splice(db.routes.findIndex((r) => r.id === id), 1); for (let i = db.groups.length - 1; i >= 0; i--) if (db.groups[i].route === id) db.groups.splice(i, 1) })
</script>

<template>

  <!-- ================= 录包建图 ================= -->
  <div v-if="sub === 'build'" class="bz-2">
    <div class="pp-panel">
      <div class="bz-sec">
        <h4><span class="n">1</span>采集地图数据</h4>
        <div class="bz-status" :class="{ on: rt.bagRec }"><i class="dot" /><template v-if="rt.bagRec"><span>录包中 · <b>{{ rt.bagRec.name }}</b></span><span class="mono">{{ mmss(rt.bagRec.t0) }}</span></template><span v-else>未在录包，遥控机器人前请先开始录包</span></div>
        <div class="bz-btns">
          <a-button type="primary" :disabled="!!rt.bagRec || !robot.online" @click="openBag"><PlayCircleOutlined />开始录包</a-button>
          <a-button :disabled="!rt.bagRec" danger @click="stopBag"><StopOutlined />完成录制</a-button>
          <a-button :type="rt.slam ? 'primary' : 'default'" :ghost="rt.slam" :disabled="!robot.online" @click="toggleSlam">{{ rt.slam ? '关闭建图' : '实时建图' }}</a-button>
          <a-button :disabled="!rt.slam" @click="dlg.slam = true"><EyeOutlined />查看实时地图</a-button>
        </div>
      </div>
      <div class="bz-sec">
        <h4><span class="n">2</span>创建二维地图</h4>
        <div class="bz-btns">
          <a-button type="primary" :disabled="!!rt.bagRec || !canGen" @click="openMap"><BuildOutlined />生成地图</a-button>
          <a-button type="primary" :disabled="!!rt.bagRec || !myMaps.length" @click="openGrid"><AppstoreOutlined />生成栅格地图</a-button>
          <a-tooltip :title="robot.rtk ? '' : '当前机器人未搭载RTK设备'"><a-button :disabled="!!rt.bagRec || !robot.rtk" @click="form.fusion = ''; dlg.fusion = true"><BlockOutlined />新建融合地图</a-button></a-tooltip>
        </div>
      </div>
      <div class="bz-sec">
        <h4><span class="n">3</span>建图进度<span class="r">{{ rt.job ? rt.job.kind + ' · ' + rt.job.name : '无进行中的任务' }}</span></h4>
        <div style="display:flex;align-items:center;gap:12px"><a-progress :percent="rt.job?.progress ?? 0" stroke-color="#26C6DA" style="flex:1;margin:0" /><a-button size="small" danger :disabled="!rt.job" @click="stopJob">终止</a-button></div>
      </div>
      <div class="bz-sec"><div class="bz-hint"><InfoCircleOutlined /><span>栅格地图生成后，前往「导航定位」选择地图开启导航，再到「路线与任务点」录制循迹路线。</span></div></div>
    </div>
    <div class="bz-col">
      <div class="pp-panel">
        <div class="pp-panel-h"><h3>建图预览</h3><span class="muted" style="font-size:12px;margin-left:6px">{{ rt.bagRec || rt.slam ? '实时点云' : previewMap ? previewMap.name + (previewMap.grid ? ' · 栅格地图' : ' · 点云地图') : '' }}</span></div>
        <div class="bz-canvas">
          <BizMap v-if="rt.bagRec || rt.slam || previewMap" :seed="previewMap?.seed ?? 41" :mode="rt.bagRec || rt.slam || !previewMap?.grid ? 'cloud' : 'grid'" :zones="false" :live="!!(rt.bagRec || rt.slam)" :robot="rt.bagRec || rt.slam ? rt.pose : null" />
          <BizMap v-else mode="blank" :zones="false" />
          <div v-if="rt.bagRec" class="bz-ov red"><i class="dot" />录包中 {{ mmss(rt.bagRec.t0) }} · 请遥控机器人遍历巡检区域</div>
          <div v-else-if="rt.job" class="bz-ov">{{ rt.job.kind }}中 · {{ rt.job.progress }}%</div>
          <div v-else-if="!previewMap" class="bz-ov tip">暂无地图，请先开始录包</div>
        </div>
      </div>
      <div class="pp-panel">
        <div class="pp-panel-h"><h3>地图列表</h3><span class="muted" style="font-size:12px;margin-left:6px">{{ myMaps.length }} 张</span></div>
        <a-table size="small" :pagination="false" :data-source="myMaps" row-key="name" :custom-row="(r: any) => ({ onClick: () => (preview = r.name), style: 'cursor:pointer' })" :row-class-name="(r: any) => (r.name === preview ? 'bz-row-on' : '')"
          :columns="[{ title: '地图名称', dataIndex: 'name' }, { title: '类型', key: 'kind', width: 100 }, { title: '栅格地图', key: 'grid', width: 100 }, { title: '数据包', dataIndex: 'bag' }, { title: '分辨率', key: 'res', width: 100 }, { title: '创建时间', dataIndex: 'created', width: 150 }]">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'kind'"><a-tag :color="record.kind === '融合地图' ? 'blue' : 'purple'">{{ record.kind }}</a-tag></template>
            <template v-else-if="column.key === 'grid'"><a-badge :status="record.grid ? 'success' : 'warning'" :text="record.grid ? '已生成' : '未生成'" /></template>
            <template v-else-if="column.key === 'res'"><span class="mono">{{ record.res }} m/px</span></template>
          </template>
          <template #emptyText><div class="bz-empty" style="padding:20px">暂无地图</div></template>
        </a-table>
      </div>
    </div>
  </div>

  <!-- ================= 地图编辑 ================= -->
  <div v-else-if="sub === 'edit'" class="bz-3">
    <div class="pp-panel">
      <div class="pp-panel-h"><h3>栅格地图</h3><span class="muted" style="font-size:12px;margin-left:6px">{{ gridMaps.length }} 张</span></div>
      <div class="bz-items">
        <button v-for="m in gridMaps" :key="m.name" type="button" class="bz-item" :class="{ on: m.name === editMap }" @click="editMap = m.name">
          <span class="b"><b>{{ m.name }}</b><small>{{ m.kind }} · {{ m.zones.length }} 个功能区</small></span>
          <a-tag v-if="rt.nav && rt.navMap === m.name" color="cyan" class="tg">导航中</a-tag>
        </button>
        <div v-if="!gridMaps.length" class="bz-empty">暂无栅格地图<br /><a-button size="small" @click="sub = 'build'">去生成</a-button></div>
      </div>
    </div>
    <div class="pp-panel">
      <div class="pp-panel-h"><h3>地图编辑</h3><span class="muted" style="font-size:12px;margin-left:6px">{{ em?.name }}</span>
        <span class="bz-panel-tools"><a-button size="small"><UndoOutlined />撤销</a-button><a-button size="small" type="primary" :disabled="!em" @click="message.success('地图已保存')"><SaveOutlined />保存地图</a-button></span></div>
      <div class="bz-canvas">
        <BizMap v-if="em" :seed="em.seed" mode="grid" :zones="em.zones.length > 0" :edit="tool !== 'pan'" />
        <div class="nv-tools">
          <a-tooltip title="拖动" placement="right"><button type="button" :class="{ on: tool === 'pan' }" @click="tool = 'pan'"><DragOutlined /></button></a-tooltip>
          <a-tooltip title="画笔（障碍物）" placement="right"><button type="button" :class="{ on: tool === 'pen' }" @click="tool = 'pen'"><EditOutlined /></button></a-tooltip>
          <a-tooltip title="橡皮擦" placement="right"><button type="button" :class="{ on: tool === 'eraser' }" @click="tool = 'eraser'"><ClearOutlined /></button></a-tooltip>
        </div>
        <div class="bz-legend"><span v-for="z in ZONES" :key="z.k"><i :style="{ borderColor: z.c, background: z.c + '33' }" />{{ z.t }}</span></div>
      </div>
    </div>
    <div class="pp-panel">
      <div class="pp-panel-h"><h3>功能区</h3><span class="muted" style="font-size:12px;margin-left:6px">{{ em?.zones.length ?? 0 }} 个</span><a-button size="small" class="r" style="margin-left:auto" :disabled="!em" @click="zf.name = ''; zoneOpen = true"><PlusOutlined />添加</a-button></div>
      <ul class="nv-zones">
        <li v-for="(z, i) in em?.zones ?? []" :key="z.name"><i :style="{ borderColor: zMeta(z.k).c, background: zMeta(z.k).c + '33' }" /><div><b>{{ z.name }}</b><small>{{ zMeta(z.k).t }}</small></div><a-button type="text" size="small" danger @click="delZone(i)"><DeleteOutlined /></a-button></li>
        <li v-if="em && !em.zones.length" class="empty">暂无功能区</li>
      </ul>
    </div>
  </div>

  <!-- ================= 导航定位 / INS 定位 ================= -->
  <div v-else-if="sub === 'loc'" class="bz-2">
    <div class="pp-panel">
      <template v-if="!isIns">
        <div class="bz-sec">
          <h4>导航</h4>
          <div class="nv-field"><span>地图</span><a-select v-model:value="navMap" :disabled="rt.nav" style="flex:1" placeholder="请选择地图" :options="gridMaps.map((m) => ({ value: m.name, label: m.name }))" /></div>
          <div v-if="!gridMaps.length" class="bz-hint warn" style="margin-bottom:10px"><InfoCircleOutlined /><span>暂无栅格地图，请先完成录包建图。</span></div>
          <div class="bz-btns">
            <a-button :type="rt.nav ? 'default' : 'primary'" :danger="rt.nav" :disabled="!robot.online" @click="toggleNav(navMap)">{{ rt.nav ? '关闭导航' : '开始导航' }}</a-button>
            <a-button :disabled="!rt.nav" @click="rt.pause = !rt.pause; message.success(rt.pause ? '暂停指令已发送' : '恢复指令已发送')">{{ rt.pause ? '恢复导航' : '暂停导航' }}</a-button>
            <a-button :disabled="!rt.nav" @click="rt.navStop = !rt.navStop; message.success(rt.navStop ? '暂停停障指令已发送' : '恢复停障指令已发送')">{{ rt.navStop ? '恢复停障' : '暂停停障' }}</a-button>
            <a-button :disabled="!rt.nav" @click="startRelo"><AimOutlined />重定位</a-button>
            <a-button :disabled="!rt.nav" @click="setOrigin">原点设置</a-button>
            <a-button :disabled="!rt.run" @click="obsSel = rt.obsMode; obsOpen = true">循迹避障模式</a-button>
          </div>
        </div>
      </template>
      <div class="bz-sec">
        <h4>{{ isIns ? 'INS 组合导航' : 'RTK 定位' }}<span v-if="!robot.rtk" class="r">未搭载 RTK</span></h4>
        <template v-if="isIns">
          <div class="bz-status" :class="{ ok: rt.insOrigin }"><i class="dot" /><span v-if="rt.insOrigin">INS 原点已设置 · <b>{{ rt.insOrigin.time }}</b></span><span v-else>未进行 INS 初始化</span></div>
          <div v-if="rt.insOrigin" class="bz-kv" style="margin-bottom:12px"><span>纬度</span><b class="mono">{{ rt.insOrigin.lat.toFixed(6) }}</b><span>经度</span><b class="mono">{{ rt.insOrigin.lng.toFixed(6) }}</b><span>高度</span><b class="mono">{{ rt.insOrigin.alt }} m</b></div>
        </template>
        <div class="bz-btns">
          <a-button :type="isIns && !rt.insOrigin ? 'primary' : 'default'" :disabled="!robot.rtk || !robot.online" @click="initIns">INS初始化</a-button>
          <a-button :type="isIns && rt.insOrigin && !rt.ins ? 'primary' : 'default'" :danger="rt.ins" :disabled="!robot.rtk || !robot.online" @click="toggleIns">{{ rt.ins ? '关闭INS' : '开始INS' }}</a-button>
          <a-button :danger="rt.msf" :disabled="!robot.rtk || !robot.online" @click="onMsf">{{ rt.msf ? '关闭MSF' : '开始MSF' }}</a-button>
          <a-button :disabled="!robot.online" @click="toggleGps">{{ rt.gps ? '关闭GPS' : '开启GPS' }}</a-button>
        </div>
        <div v-if="isIns" class="bz-hint" style="margin-top:12px"><InfoCircleOutlined /><span>INS 原点只需初始化一次。不重新初始化时，已录制路线与任务点坐标持续有效，开启 INS 后可直接执行任务。</span></div>
      </div>
      <div class="bz-sec">
        <h4>任务速度</h4>
        <div class="nv-speed"><a-button size="small" @click="speedUp(-0.1)"><MinusOutlined /></a-button><b class="mono">{{ rt.speed.toFixed(1) }} m/s</b><a-button size="small" @click="speedUp(0.1)"><PlusOutlined /></a-button></div>
      </div>
      <div class="bz-sec">
        <h4>状态信息</h4>
        <div class="bz-cards" style="margin-bottom:12px">
          <div><small>速度</small><b class="mono">{{ rt.run && !rt.pause ? rt.speed.toFixed(2) : '0.00' }}<em>m/s</em></b></div>
          <div><small>位姿 (x, y, θ)</small><b class="mono" style="font-size:13px">{{ toReal(rt.pose.x, rt.pose.y).x.toFixed(2) }}, {{ toReal(rt.pose.x, rt.pose.y).y.toFixed(2) }}, {{ rt.pose.yaw }}°</b></div>
        </div>
        <div class="bz-kv">
          <template v-if="!isIns"><span>激光雷达数据</span><b><a-badge status="success" text="正常" /></b></template>
          <span>IMU数据</span><b><a-badge status="success" text="正常" /></b>
          <span>卫星数据</span><b><a-badge :status="robot.rtk ? (rt.gps ? 'success' : 'default') : 'default'" :text="robot.rtk ? (rt.gps ? 'RTK 固定解 · 24 颗' : '未开启') : '未配置'" /></b>
          <span>MSF状态</span><b><a-badge :status="rt.msf ? 'success' : 'default'" :text="robot.rtk ? (rt.msf ? rt.msfMode : '未开启') : '未配置'" /></b>
          <span>定位状态</span><b><a-badge :status="hasNav ? (rt.locOk ? 'success' : 'processing') : 'default'" :text="hasNav ? (rt.locOk ? '正常' : '定位中') : '未收到'" /></b>
        </div>
      </div>
    </div>
    <div class="pp-panel">
      <div class="pp-panel-h"><h3>{{ isIns ? '卫星地图' : '导航地图' }}</h3><span class="muted" style="font-size:12px;margin-left:6px">{{ isIns ? (rt.insOrigin ? 'INS 原点坐标系' : '未初始化') : rt.nav ? rt.navMap : navMap }}</span>
        <span class="bz-panel-tools"><template v-if="relo"><a-button size="small" @click="relo = false; arrow = null">取消</a-button><a-button size="small" type="primary" :disabled="!arrow" @click="okRelo">确认重定位</a-button></template></span></div>
      <div class="bz-canvas" style="aspect-ratio:16/10.4">
        <BizMap :seed="curMapSeed" :mode="isIns ? 'sat' : navMap ? 'grid' : 'blank'" :zones="!isIns && !!navMap" :ghost="ghost" :robot="hasNav || isIns ? rt.pose : null" :pick="relo" :arrow="arrow" @pick="onPick" />
        <div v-if="relo" class="bz-ov">重定位：在地图上点击机器人实际位置，确认后提交初始位姿</div>
        <div v-else-if="!hasNav" class="bz-ov tip">{{ isIns ? (rt.insOrigin ? '开启 INS 后显示机器人实时位置' : '请先进行 INS 初始化') : '开始导航后显示机器人实时位置' }}</div>
        <div v-else class="bz-ov"><a-badge :status="rt.locOk ? 'success' : 'processing'" />{{ rt.locOk ? '定位正常' : '定位中…' }}<a v-if="!rt.run" style="margin-left:8px" @click="emit('go', 'task', 'route')">去录制路线 →</a></div>
      </div>
    </div>
  </div>

  <!-- ================= 文件管理 ================= -->
  <div v-else-if="sub === 'file'" class="bz-col">
    <div v-if="!isIns" class="pp-panel">
      <div class="pp-panel-h"><h3>地图</h3><span class="muted" style="font-size:12px;margin-left:6px">{{ myMaps.length }} 个</span></div>
      <a-table size="small" :pagination="false" :data-source="myMaps" row-key="name" :columns="[{ title: '地图名称', dataIndex: 'name' }, { title: '类型', dataIndex: 'kind' }, { title: '栅格地图', key: 'grid' }, { title: '来源数据包', dataIndex: 'bag' }, { title: '路线', key: 'routes' }, { title: '创建时间', dataIndex: 'created' }, { title: '操作', key: 'op', width: 90 }]">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'grid'">{{ record.grid ? '已生成' : '未生成' }}</template>
          <template v-else-if="column.key === 'routes'"><span class="mono">{{ myRoutes.filter((r) => r.map === record.name).length }}</span></template>
          <template v-else-if="column.key === 'op'"><a class="danger" :class="{ dis: rt.nav && rt.navMap === record.name }" @click="!(rt.nav && rt.navMap === record.name) && delMap(record.name)">删除</a></template>
        </template>
      </a-table>
    </div>
    <div v-if="!isIns" class="pp-panel">
      <div class="pp-panel-h"><h3>数据包</h3><span class="muted" style="font-size:12px;margin-left:6px">{{ myBags.length }} 个</span></div>
      <a-table size="small" :pagination="false" :data-source="myBags" row-key="name" :columns="[{ title: '数据包名称', dataIndex: 'name' }, { title: '大小', dataIndex: 'size' }, { title: '录制时长', dataIndex: 'dur' }, { title: '已生成地图', key: 'map' }, { title: '录制时间', dataIndex: 'time' }, { title: '操作', key: 'op', width: 90 }]">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'map'">{{ myMaps.filter((m) => m.bag === record.name).map((m) => m.name).join('、') || '—' }}</template>
          <template v-else-if="column.key === 'op'"><a class="danger" @click="delBag(record.name)">删除</a></template>
        </template>
      </a-table>
    </div>
    <div class="pp-panel">
      <div class="pp-panel-h"><h3>路线文件</h3><span class="muted" style="font-size:12px;margin-left:6px">{{ myRoutes.length }} 条路线</span></div>
      <a-table size="small" :pagination="false" :data-source="myRoutes" row-key="id" :columns="[{ title: '路线名称', key: 'name' }, { title: isIns ? '坐标系' : '所属地图', key: 'map' }, { title: '循迹任务组', key: 'groups' }, { title: '任务点', key: 'pts' }, { title: '轨迹平滑', key: 'smooth' }, { title: '创建时间', dataIndex: 'created' }, { title: '操作', key: 'op', width: 90 }]">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">{{ shortName(record) }}</template>
          <template v-else-if="column.key === 'map'">{{ record.map || 'INS 原点' }}</template>
          <template v-else-if="column.key === 'groups'">{{ myGroups.filter((g) => g.route === record.id).map((g) => g.name).join('、') || '—' }}</template>
          <template v-else-if="column.key === 'pts'"><span class="mono">{{ myGroups.filter((g) => g.route === record.id).reduce((a, g) => a + g.points.length, 0) }}</span></template>
          <template v-else-if="column.key === 'smooth'">{{ record.smooth ? '是' : '否' }}</template>
          <template v-else-if="column.key === 'op'"><a class="danger" @click="delRoute(record.id)">删除</a></template>
        </template>
      </a-table>
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
    <div class="bz-canvas" style="margin:12px 0"><BizMap :seed="41" mode="cloud" live :zones="false" :robot="rt.pose" /></div>
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
.nv-speed { display: flex; align-items: center; gap: 14px; } .nv-speed b { width: 80px; text-align: center; font-size: 15px; }
.nv-tools { position: absolute; z-index: 1; left: 10px; top: 10px; display: flex; flex-direction: column; gap: 4px; padding: 4px; background: rgba(13,28,47,.82); border: 1px solid var(--line); border-radius: 6px; }
.nv-tools button { width: 30px; height: 30px; display: grid; place-items: center; font-size: 15px; color: var(--muted); cursor: pointer; background: none; border: 1px solid transparent; border-radius: 4px; }
.nv-tools button:hover { color: #fff; } .nv-tools button.on { color: #fff; background: var(--accent-soft); border-color: var(--accent); }
.nv-zones { list-style: none; margin: 0; padding: 6px 12px 10px; } .nv-zones li { display: flex; align-items: center; gap: 10px; padding: 8px 4px; border-bottom: 1px dashed var(--line); }
.nv-zones li > i { width: 12px; height: 12px; flex: none; border: 1px solid; } .nv-zones li div { flex: 1; min-width: 0; } .nv-zones li b { display: block; font-size: 13px; font-weight: 500; } .nv-zones li small { font-size: 11.5px; color: var(--muted); }
.nv-zones li.empty { justify-content: center; color: var(--faint); border: 0; padding: 30px 0; font-size: 13px; }
.danger { color: #FF7A7A; } .danger.dis { color: var(--faint); cursor: not-allowed; }
:deep(.bz-row-on) td { background: var(--accent-soft) !important; }
</style>
