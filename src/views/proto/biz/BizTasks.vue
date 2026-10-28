<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import { PlayCircleOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons-vue'
import { GAITS, GROUNDS, OBS_MODES, type MultiStep } from '@/mock/biz'
import { rt, isDog, isIns, myMaps, myRoutes, myGroups, db, curId, robot, routeById, groupById, shortName, gaitName, openLaunch } from './store'

const props = defineProps<{ sub: string }>()
const sub = computed(() => (props.sub === 'sched' ? 'sched' : 'multi'))
const run = computed(() => rt.value.run)

/* ---------- 多任务组 ---------- */
const myMulti = computed(() => db.multi.filter((m) => m.robot === curId.value))
const mid = ref('')
watch([curId, myMulti], () => { if (!myMulti.value.some((m) => m.id === mid.value)) mid.value = myMulti.value[0]?.id ?? '' }, { immediate: true })
const multi = computed(() => myMulti.value.find((m) => m.id === mid.value))
const move = (i: number, d: number) => { const l = multi.value!.steps; const [x] = l.splice(i, 1); l.splice(i + d, 0, x) }
const delStep = (i: number) => Modal.confirm({ title: '删除任务', content: `确定删除第 ${i + 1} 个任务吗？`, okButtonProps: { danger: true }, onOk: () => { multi.value!.steps.splice(i, 1) } })
const stepOpen = ref(false); const stepIdx = ref(-1)
const blankStep = (): MultiStep => ({ startMode: isIns.value ? 'INS' : '导航', mode: '循迹模式', map: isIns.value ? '' : myMaps.value[0]?.name ?? '', route: '', group: '', circle: 1, obs: '停障模式', gait: 1, ground: 1, origin: false })
const st = reactive<MultiStep>(blankStep())
const stRoutes = computed(() => myRoutes.value.filter((r) => isIns.value || r.map === st.map))
const stGroups = computed(() => (st.mode === '循迹模式' ? myGroups.value.filter((g) => g.kind === '循迹' && g.route === st.route) : myGroups.value.filter((g) => g.kind === '发布点' && g.map === st.map)))
const openStep = (i = -1) => { stepIdx.value = i; Object.assign(st, i >= 0 ? multi.value!.steps[i] : blankStep()); stepOpen.value = true }
const okStep = () => {
  if (st.mode === '循迹模式' && !st.route) return message.error('请选择轨迹'); if (!st.group) return message.error('请选择任务组')
  const v = { ...st, route: st.mode === '循迹模式' ? st.route : '' }
  if (stepIdx.value >= 0) multi.value!.steps[stepIdx.value] = v; else multi.value!.steps.push(v)
  stepOpen.value = false; message.success('已保存')
}
const mgOpen = ref(false); const mgName = ref('')
const okMg = () => { if (!mgName.value.trim()) return message.error('请输入多任务组名称'); const id = `MG-${Date.now() % 1000}`; db.multi.push({ id, name: mgName.value.trim(), robot: curId.value, inPlace: false, steps: [] }); mid.value = id; mgOpen.value = false }
const delMg = () => Modal.confirm({ title: '删除多任务组', content: `确定删除「${multi.value!.name}」吗？`, okButtonProps: { danger: true }, onOk: () => { db.multi.splice(db.multi.findIndex((m) => m.id === mid.value), 1) } })
const startMulti = () => openLaunch('多任务组', { multi: mid.value })
const mCols = computed(() => [
  { title: '序号', key: 'i', width: 56 }, { title: '启动模式', dataIndex: 'startMode', width: 84 }, { title: '任务组模式', dataIndex: 'mode', width: 100 },
  ...(isIns.value ? [] : [{ title: '地图', key: 'map', width: 110 }]), { title: '轨迹', key: 'route' }, { title: '任务组', key: 'group', width: 120 }, { title: '圈数', dataIndex: 'circle', width: 56 },
  { title: '避障', dataIndex: 'obs', width: 84 }, ...(isDog.value ? [{ title: '步态', key: 'gait', width: 88 }] : []), { title: '原点发布', key: 'origin', width: 80 }, { title: '操作', key: 'op', width: 170 },
])

/* ---------- 定时循迹 ---------- */
const mySched = computed(() => db.schedules.filter((s) => s.robot === curId.value).sort((a, b) => a.time.localeCompare(b.time)))
const scOpen = ref(false); const sc = reactive({ route: '', group: '', time: null as Dayjs | null })
const scGroups = computed(() => myGroups.value.filter((g) => g.kind === '循迹' && g.route === sc.route))
const openSc = () => { sc.route = myRoutes.value[0]?.id ?? ''; sc.group = ''; sc.time = dayjs('08:00', 'HH:mm'); scOpen.value = true }
watch(scGroups, (l) => { if (!l.some((g) => g.id === sc.group)) sc.group = l[0]?.id ?? '' })
const okSc = () => {
  if (!sc.route || !sc.group || !sc.time) return message.error('请完整填写路线、任务组与执行时间')
  const t = sc.time.format('HH:mm'); if (mySched.value.some((s) => s.time === t)) return message.error('该时间已存在定时任务')
  db.schedules.push({ id: `S-${Date.now() % 1000}`, robot: curId.value, route: sc.route, group: sc.group, time: t, created: dayjs().format('YYYY-MM-DD HH:mm') }); scOpen.value = false; message.success('定时循迹任务已添加')
}
const delSc = (id: string) => Modal.confirm({ title: '删除定时任务', content: '确定删除该定时循迹任务吗？', okButtonProps: { danger: true }, onOk: () => { db.schedules.splice(db.schedules.findIndex((s) => s.id === id), 1) } })
</script>

<template>
  <!-- ================= 多任务组 ================= -->
  <div v-if="sub === 'multi'" class="pp-panel">
    <div class="pp-panel-h"><h3>多任务组</h3>
      <a-select v-model:value="mid" size="small" style="width:200px;margin-left:12px" placeholder="选择多任务组" :options="myMulti.map((m) => ({ value: m.id, label: m.name }))" />
      <span class="bz-panel-tools">
        <a-button size="small" @click="mgName = ''; mgOpen = true">新建多任务组</a-button>
        <a-button size="small" :disabled="!multi" @click="openStep()">添加任务</a-button>
        <a-button size="small" danger :disabled="!multi" @click="delMg">删除</a-button>
        <a-button size="small" type="primary" :disabled="!multi || !!run" @click="startMulti">启动任务</a-button>
        <span v-if="multi" class="muted" style="font-size:12px;display:inline-flex;align-items:center;gap:6px;margin-left:4px">异常时原地启动 <a-switch v-model:checked="multi.inPlace" size="small" /></span>
      </span></div>
    <div style="padding:12px 16px 0"><div class="bz-hint"><InfoCircleOutlined /><span>多任务组按顺序依次执行各任务；开启「原点发布」时，该任务开始前会先发布原点位姿；开启「异常时原地启动」时，任务异常中断后从当前位置继续下一个任务。</span></div></div>
    <a-table class="bt-center" size="small" :pagination="false" :data-source="multi?.steps ?? []" :row-key="(_r: any, i: any) => i" :columns="mCols" style="margin-top:8px">
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'i'"><span class="mono">{{ index + 1 }}</span></template>
        <template v-else-if="column.key === 'map'">{{ record.map || '—' }}</template>
        <template v-else-if="column.key === 'route'">{{ record.route ? routeById(record.route)?.name ?? '—' : '—' }}</template>
        <template v-else-if="column.key === 'group'">{{ groupById(record.group)?.name ?? '—' }}</template>
        <template v-else-if="column.key === 'gait'">{{ gaitName(record.gait) }}</template>
        <template v-else-if="column.key === 'origin'">{{ record.origin ? '是' : '否' }}</template>
        <template v-else-if="column.key === 'op'"><span class="bz-ops"><a @click="openStep(index)">编辑</a><a :class="{ dis: index === 0 }" @click="index > 0 && move(index, -1)">上移</a><a :class="{ dis: index === (multi?.steps.length ?? 0) - 1 }" @click="index < multi!.steps.length - 1 && move(index, 1)">下移</a><a class="d" @click="delStep(index)">删除</a></span></template>
      </template>
      <template #emptyText><div class="bz-empty" style="padding:24px">{{ multi ? '暂无任务，点击「添加任务」' : '暂无多任务组' }}</div></template>
    </a-table>
  </div>

  <!-- ================= 定时循迹 ================= -->
  <div v-else class="pp-panel">
    <div class="pp-panel-h"><h3>定时任务</h3><span class="muted" style="font-size:12px;margin-left:6px">{{ mySched.length }} 个 · 每日按时自动启动</span>
      <span class="bz-panel-tools"><a-button size="small" type="primary" :disabled="!myRoutes.length" @click="openSc">新增定时循迹</a-button></span></div>
    <a-table class="bt-center" size="small" :pagination="false" :data-source="mySched" row-key="id"
      :columns="[{ title: '执行时间', key: 'time', width: 120 }, { title: '路线', key: 'route' }, { title: '任务组', key: 'group' }, { title: '任务点数', key: 'n', width: 100 }, { title: '创建时间', dataIndex: 'created', width: 170 }, { title: '操作', key: 'op', width: 90 }]">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'time'"><b class="mono" style="font-size:14px">{{ record.time }}</b></template>
        <template v-else-if="column.key === 'route'">{{ routeById(record.route)?.name ?? '—' }}</template>
        <template v-else-if="column.key === 'group'">{{ groupById(record.group)?.name ?? '—' }}</template>
        <template v-else-if="column.key === 'n'">{{ groupById(record.group)?.points.length ?? 0 }}</template>
        <template v-else-if="column.key === 'op'"><span class="bz-ops"><a class="d" @click="delSc(record.id)">删除</a></span></template>
      </template>
      <template #emptyText><div class="bz-empty" style="padding:24px">暂无定时循迹任务</div></template>
    </a-table>
  </div>

  <!-- 弹窗：多任务组任务 -->
  <a-modal v-model:open="stepOpen" :title="stepIdx >= 0 ? '编辑任务' : '添加任务'" :width="560" @ok="okStep">
    <a-form layout="vertical" class="bz-form" style="margin-top:12px">
      <a-row :gutter="12">
        <a-col :span="12"><a-form-item label="启动模式"><a-select v-model:value="st.startMode" :options="(isIns ? ['INS', 'MSF'] : robot.rtk ? ['导航', 'MSF'] : ['导航']).map((v) => ({ value: v, label: v }))" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="任务组模式"><a-select v-model:value="st.mode" :options="(isIns ? ['循迹模式'] : ['循迹模式', '发布点模式']).map((v) => ({ value: v, label: v }))" @change="st.route = ''; st.group = ''" /></a-form-item></a-col>
        <a-col v-if="!isIns" :span="12"><a-form-item label="地图"><a-select v-model:value="st.map" :options="myMaps.filter((m) => m.grid).map((m) => ({ value: m.name, label: m.name }))" @change="st.route = ''; st.group = ''" /></a-form-item></a-col>
        <a-col v-if="st.mode === '循迹模式'" :span="12"><a-form-item label="轨迹"><a-select v-model:value="st.route" placeholder="请选择" :options="stRoutes.map((r) => ({ value: r.id, label: shortName(r) }))" @change="st.group = ''" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="任务组"><a-select v-model:value="st.group" placeholder="请选择" :options="stGroups.map((g) => ({ value: g.id, label: g.name }))" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="圈数"><a-input-number v-model:value="st.circle" :min="1" style="width:100%" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="避障"><a-select v-model:value="st.obs" :options="OBS_MODES.map((o) => ({ value: o, label: o }))" /></a-form-item></a-col>
        <a-col v-if="isDog" :span="12"><a-form-item label="步态"><a-select v-model:value="st.gait" :options="GAITS.map((g, i) => ({ value: i + 1, label: g }))" /></a-form-item></a-col>
        <a-col v-if="isDog" :span="12"><a-form-item label="地形"><a-select v-model:value="st.ground" :options="GROUNDS.map((g, i) => ({ value: i + 1, label: g }))" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="原点发布"><a-switch v-model:checked="st.origin" /></a-form-item></a-col>
      </a-row>
    </a-form>
  </a-modal>
  <a-modal v-model:open="mgOpen" title="新建多任务组" :width="400" @ok="okMg"><a-input v-model:value="mgName" placeholder="请输入多任务组名称" style="margin-top:12px" :maxlength="20" /></a-modal>

  <!-- 弹窗：定时循迹 -->
  <a-modal v-model:open="scOpen" title="新增定时循迹任务" :width="440" @ok="okSc">
    <a-form layout="vertical" class="bz-form" style="margin-top:12px">
      <a-form-item label="路线"><a-select v-model:value="sc.route" :options="myRoutes.map((r) => ({ value: r.id, label: r.name }))" /></a-form-item>
      <a-form-item label="任务组"><a-select v-model:value="sc.group" :options="scGroups.map((g) => ({ value: g.id, label: g.name }))" /></a-form-item>
      <a-form-item label="执行时间（每日）"><a-time-picker v-model:value="sc.time" format="HH:mm" style="width:100%" /></a-form-item>
    </a-form>
    <div class="bz-hint warn"><InfoCircleOutlined /><span>到达执行时间时机器人需已开启{{ isIns ? ' INS ' : '导航' }}定位并位于路线起点，否则任务启动失败。</span></div>
  </a-modal>
</template>
