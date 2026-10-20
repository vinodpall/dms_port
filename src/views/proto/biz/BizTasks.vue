<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import {
  PlayCircleOutlined, PauseCircleOutlined, StopOutlined, CheckCircleFilled, CloseCircleFilled, PlusOutlined, LoadingOutlined, InfoCircleOutlined,
} from '@ant-design/icons-vue'
import BizMap from './BizMap.vue'
import { GAITS, GROUNDS, OBS_MODES, type MultiStep, type TaskPoint } from '@/mock/biz'
import {
  rt, isDog, isIns, hasNav, myMaps, myRoutes, myGroups, db, curId, robot, routeById, groupById, shortName,
  preCheck, bootSteps, launch, stopRun, togglePause, gotoStart, gaitName, type Running,
} from './store'

const props = defineProps<{ sub: string }>()
const emit = defineEmits<{ 'update:sub': [string]; go: [tab: string, sub?: string] }>()
const subs = computed(() => [{ value: 'track', label: '循迹任务' }, ...(isIns.value ? [] : [{ value: 'pub', label: '发布点任务' }]), { value: 'multi', label: '多任务组' }, { value: 'sched', label: '定时循迹' }])
const sub = computed({ get: () => (subs.value.some((s) => s.value === props.sub) ? props.sub : 'track'), set: (v) => emit('update:sub', v) })
const mapSeed = (name?: string) => myMaps.value.find((m) => m.name === name)?.seed ?? 11

/* ---------- 循迹 / 发布点：选择 ---------- */
const rid = ref(''); const gid = ref(''); const pid = ref('')
const trackGroups = computed(() => myGroups.value.filter((g) => g.kind === '循迹' && g.route === rid.value))
const pubGroups = computed(() => myGroups.value.filter((g) => g.kind === '发布点'))
watch(curId, () => { const run = rt.value.run; rid.value = run?.route ?? myRoutes.value[0]?.id ?? ''; pid.value = pubGroups.value[0]?.id ?? '' }, { immediate: true })
watch(trackGroups, (l) => { const run = rt.value.run; if (!l.some((g) => g.id === gid.value)) gid.value = (run && l.some((g) => g.id === run.group) ? run.group : l[0]?.id) ?? '' }, { immediate: true })
const kind = computed<Running['kind']>(() => (sub.value === 'pub' ? '发布点任务' : '循迹任务'))
const route = computed(() => (kind.value === '循迹任务' ? routeById(rid.value) : undefined))
const group = computed(() => groupById(kind.value === '循迹任务' ? gid.value : pid.value))
const checks = computed(() => preCheck(kind.value, rid.value, kind.value === '循迹任务' ? gid.value : pid.value))
const ready = computed(() => checks.value.every((c) => c.ok))
const fix = (t: string) => {
  if (t.startsWith('导航 /') || t.startsWith('INS /') || t.startsWith('导航地图')) return { l: '去开启', f: () => emit('go', 'nav', 'loc') }
  if (t.startsWith('位于路线起点')) return { l: '前往起点', f: () => route.value && gotoStart(route.value) }
  if (t.startsWith('任务组') || t.startsWith('已选择路线')) return { l: '去配置', f: () => emit('go', 'route', 'points') }
  if (t.startsWith('无其他任务')) return { l: '关闭任务', f: stopRun }
  if (t.startsWith('导航未暂停')) return { l: '恢复', f: togglePause }
  return null
}

/* ---------- 启动弹窗 + 启动步骤 ---------- */
const sOpen = ref(false); const sf = reactive({ obs: '停障模式', gait: 1, circle: 1 })
const boot = reactive({ open: false, list: [] as { t: string; s: 'p' | 's' }[], done: false })
const openStart = () => { if (!ready.value) return message.error(checks.value.find((c) => !c.ok)!.m); sf.obs = rt.value.obsMode; sf.gait = 1; sf.circle = 1; sOpen.value = true }
const runBoot = (run: Omit<Running, 'progress' | 'start' | 'laps'>) => {
  sOpen.value = false; boot.open = true; boot.done = false; boot.list = []
  const all = bootSteps(); let i = 0
  const next = () => {
    if (i > 0) boot.list[i - 1].s = 's'
    if (i >= all.length) { boot.done = true; launch(run); message.success('任务启动成功'); setTimeout(() => { boot.open = false }, 700); return }
    boot.list.push({ t: all[i], s: 'p' }); i++; setTimeout(next, 420 + Math.random() * 300)
  }
  next()
}
const okStart = () => {
  const g = group.value!; const r = route.value
  runBoot({ kind: kind.value, name: r ? `${shortName(r)} / ${g.name}` : g.name, route: r?.id, group: g.id, obs: sf.obs, gait: isDog.value ? GAITS[sf.gait - 1] : '—', circle: sf.circle })
}

/* ---------- 运行面板 ---------- */
const run = computed(() => rt.value.run)
const runRoute = computed(() => routeById(run.value?.route)); const runGroup = computed(() => groupById(run.value?.group))
const viewRoute = computed(() => (run.value ? runRoute.value : route.value)); const viewGroup = computed(() => (run.value ? runGroup.value : group.value))
const ptState = (p: TaskPoint, i: number, n: number) => {
  if (!run.value) return 'todo'
  const k = runRoute.value ? p.f : n > 1 ? i / (n - 1) : 0
  return k < run.value.progress - 0.01 ? 'done' : k < run.value.progress + 0.08 ? 'cur' : 'todo'
}
const mapPts = computed(() => { const l = viewGroup.value?.points ?? []; return l.map((p, i) => ({ mx: p.mx, my: p.my, st: ptState(p, i, l.length) as 'done' | 'cur' | 'todo' })) })
const ST = { done: { t: '已完成', c: 'success' }, cur: { t: '执行中', c: 'processing' }, todo: { t: '待执行', c: 'default' } } as const

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
const startMulti = () => {
  const m = multi.value!; if (!m.steps.length) return message.error('多任务组中没有任务')
  if (rt.value.run) return message.error('当前有其他任务正在运行'); if (!hasNav.value) return message.error('请先开启导航、INS或MSF')
  const s0 = m.steps[0]
  Modal.confirm({ title: '启动多任务组', content: `将按顺序执行「${m.name}」中的 ${m.steps.length} 个任务，确定启动吗？`, onOk: () => runBoot({ kind: '多任务组', name: `${m.name}（1/${m.steps.length}）`, route: s0.route || undefined, group: s0.group, obs: s0.obs, gait: isDog.value ? GAITS[s0.gait - 1] : '—', circle: s0.circle }) })
}
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
  <div class="pp-head">
    <div><h2>任务执行</h2><p>{{ isIns ? '开启 INS 后选择路线与任务组启动巡检；INS 不重新初始化即可直接启动任务' : '机器人位于路线起点且导航开启后，选择路线与任务组启动循迹巡检' }}</p></div>
  </div>
  <a-segmented v-model:value="sub" class="bz-seg" :options="subs" />

  <!-- ================= 循迹 / 发布点 ================= -->
  <div v-if="sub === 'track' || sub === 'pub'" class="bz-2">
    <div class="bz-col">
      <div v-if="run" class="pp-panel">
        <div class="pp-panel-h"><h3>正在执行</h3><a-tag :color="rt.pause ? 'orange' : 'cyan'" style="margin-left:8px">{{ rt.pause ? '已暂停' : run.kind }}</a-tag></div>
        <div class="bz-sec">
          <div style="font-size:14px;font-weight:500;margin-bottom:8px">{{ run.name }}</div>
          <a-progress :percent="Math.round(run.progress * 100)" stroke-color="#26C6DA" :status="rt.pause ? 'normal' : 'active'" />
          <div class="bz-kv" style="margin-top:10px"><span>开始时间</span><b class="mono">{{ run.start }}</b><span>圈数</span><b>{{ run.laps }} / {{ run.circle }}</b><span>避障模式</span><b>{{ run.obs }}</b><template v-if="isDog"><span>步态</span><b>{{ run.gait }}</b></template><span>定位</span><b>{{ rt.nav ? '激光导航 · ' + rt.navMap : rt.ins ? 'INS' : 'MSF' }}</b></div>
        </div>
        <div class="bz-sec"><div class="bz-btns">
          <a-button @click="togglePause"><component :is="rt.pause ? PlayCircleOutlined : PauseCircleOutlined" />{{ rt.pause ? '恢复' : '暂停' }}</a-button>
          <a-button danger @click="stopRun"><StopOutlined />关闭任务</a-button>
        </div></div>
      </div>
      <div class="pp-panel">
        <div class="pp-panel-h"><h3>{{ sub === 'pub' ? '发布点任务' : '循迹任务' }}</h3></div>
        <div class="bz-sec">
          <a-form layout="vertical" class="bz-form">
            <template v-if="sub === 'track'">
              <a-form-item label="路线"><a-select v-model:value="rid" placeholder="请选择路线" :options="myRoutes.map((r) => ({ value: r.id, label: r.name }))" /></a-form-item>
              <a-form-item label="任务组"><a-select v-model:value="gid" placeholder="请选择任务组" :options="trackGroups.map((g) => ({ value: g.id, label: `${g.name}（${g.points.length} 个任务点）` }))" /></a-form-item>
            </template>
            <a-form-item v-else label="发布点任务组"><a-select v-model:value="pid" placeholder="请选择任务组" :options="pubGroups.map((g) => ({ value: g.id, label: `${g.name}（${g.points.length} 个任务点）` }))" /></a-form-item>
          </a-form>
          <h4 style="margin-top:4px">启动前检查<span class="r">{{ checks.filter((c) => c.ok).length }}/{{ checks.length }}</span></h4>
          <ul class="bz-check">
            <li v-for="c in checks" :key="c.t"><CheckCircleFilled v-if="c.ok" class="ok" /><CloseCircleFilled v-else class="no" /><span :class="{ muted: c.ok }">{{ c.ok ? c.t : c.m }}</span><a v-if="!c.ok && fix(c.t)" @click="fix(c.t)!.f()">{{ fix(c.t)!.l }}</a></li>
          </ul>
          <a-button type="primary" block size="large" style="margin-top:12px" :disabled="!ready || !robot.online" @click="openStart"><PlayCircleOutlined />开始任务</a-button>
        </div>
      </div>
    </div>
    <div class="pp-panel">
      <div class="pp-panel-h"><h3>{{ run ? '任务进度' : '任务预览' }}</h3><span class="muted" style="font-size:12px;margin-left:6px">{{ viewRoute ? viewRoute.name : '' }}{{ viewGroup ? ' · ' + viewGroup.name : '' }}</span></div>
      <div class="bz-canvas">
        <BizMap v-if="viewGroup" :seed="mapSeed(viewRoute?.map ?? viewGroup.map)" :mode="isIns ? 'sat' : 'grid'" :zones="false" :shape="viewRoute?.shape ?? null" :pts="mapPts" :progress="run && viewRoute ? run.progress : 0" :robot="rt.pose" />
        <BizMap v-else mode="blank" :zones="false" />
        <div class="bz-legend"><span><i style="border-color:#4DE8B0;background:#4DE8B033;border-radius:50%" />已完成</span><span><i style="border-color:#26C6DA;border-radius:50%" />执行中</span><span><i style="border-color:#8FB3C7;border-radius:50%" />待执行</span></div>
      </div>
      <a-table size="small" :pagination="false" :data-source="viewGroup?.points ?? []" row-key="id" :scroll="{ y: 280 }"
        :columns="[{ title: '序号', key: 'i', width: 60 }, { title: '任务描述', dataIndex: 'desc' }, { title: '任务类型', dataIndex: 'type', width: 130 }, { title: '预置点', key: 'preset', width: 100 }, { title: '状态', key: 'st', width: 100 }]">
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'i'"><span class="mono">{{ index + 1 }}</span></template>
          <template v-else-if="column.key === 'preset'">{{ record.preset || '—' }}</template>
          <template v-else-if="column.key === 'st'"><a-badge :status="ST[mapPts[index]?.st ?? 'todo'].c" :text="ST[mapPts[index]?.st ?? 'todo'].t" /></template>
        </template>
        <template #emptyText><div class="bz-empty" style="padding:16px">暂无任务点</div></template>
      </a-table>
    </div>
  </div>

  <!-- ================= 多任务组 ================= -->
  <div v-else-if="sub === 'multi'" class="pp-panel">
    <div class="pp-panel-h"><h3>多任务组</h3>
      <a-select v-model:value="mid" size="small" style="width:200px;margin-left:12px" placeholder="选择多任务组" :options="myMulti.map((m) => ({ value: m.id, label: m.name }))" />
      <span class="bz-panel-tools">
        <span v-if="multi" class="muted" style="font-size:12px">异常时原地启动 <a-switch v-model:checked="multi.inPlace" size="small" /></span>
        <a-button size="small" @click="mgName = ''; mgOpen = true"><PlusOutlined />新建多任务组</a-button>
        <a-button size="small" :disabled="!multi" @click="openStep()"><PlusOutlined />添加任务</a-button>
        <a-button size="small" danger :disabled="!multi" @click="delMg">删除</a-button>
        <a-button size="small" type="primary" :disabled="!multi || !!run" @click="startMulti"><PlayCircleOutlined />启动</a-button>
      </span></div>
    <div style="padding:12px 16px 0"><div class="bz-hint"><InfoCircleOutlined /><span>多任务组按顺序依次执行各任务；开启「原点发布」时，该任务开始前会先发布原点位姿；开启「异常时原地启动」时，任务异常中断后从当前位置继续下一个任务。</span></div></div>
    <a-table size="small" :pagination="false" :data-source="multi?.steps ?? []" :row-key="(_r: any, i: any) => i" :columns="mCols" style="margin-top:8px">
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
    <div class="pp-panel-h"><h3>定时循迹</h3><span class="muted" style="font-size:12px;margin-left:6px">{{ mySched.length }} 个 · 每日按时自动启动</span>
      <span class="bz-panel-tools"><a-button size="small" type="primary" :disabled="!myRoutes.length" @click="openSc"><PlusOutlined />新增定时任务</a-button></span></div>
    <a-table size="small" :pagination="false" :data-source="mySched" row-key="id"
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

  <!-- 弹窗：开始任务 -->
  <a-modal v-model:open="sOpen" :title="`开始${kind}`" :width="440" ok-text="开始" @ok="okStart">
    <div class="bz-kv" style="margin:14px 0"><template v-if="route"><span>路线</span><b>{{ route.name }}</b></template><span>任务组</span><b>{{ group?.name }}（{{ group?.points.length }} 个任务点）</b></div>
    <a-form layout="vertical" class="bz-form">
      <a-form-item label="避障模式"><a-radio-group v-model:value="sf.obs" button-style="solid"><a-radio-button v-for="o in OBS_MODES" :key="o" :value="o">{{ o }}</a-radio-button></a-radio-group></a-form-item>
      <a-row :gutter="12">
        <a-col v-if="isDog" :span="14"><a-form-item label="步态"><a-select v-model:value="sf.gait" :options="GAITS.map((g, i) => ({ value: i + 1, label: g }))" /></a-form-item></a-col>
        <a-col :span="10"><a-form-item label="圈数"><a-input-number v-model:value="sf.circle" :min="1" :max="99" style="width:100%" /></a-form-item></a-col>
      </a-row>
    </a-form>
  </a-modal>

  <!-- 弹窗：启动步骤 -->
  <a-modal v-model:open="boot.open" title="任务启动中" :width="460" :footer="null" :closable="boot.done" :mask-closable="false">
    <ul class="bz-steps-log">
      <li v-for="(s, i) in boot.list" :key="i"><LoadingOutlined v-if="s.s === 'p'" class="p" /><CheckCircleFilled v-else class="s" /><span>{{ s.t }}</span></li>
      <li v-if="boot.done"><CheckCircleFilled class="s" /><b>任务启动成功</b></li>
    </ul>
  </a-modal>

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
