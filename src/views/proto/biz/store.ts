/** 机器人业务原型 · 运行时状态（模拟 robot_web 的 cmdStatus / taskExecution 等），所有页面围绕当前机器人 */
import { computed, reactive, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { ROBOTS, BAGS, MAPS, ROUTES, PUBS, GROUPS, MULTI, SCHEDULES, RECORDS, ROUNDS, ALARMS, INS_ORIGINS, GAITS, newPid, type TaskGroup, type BizRoute, type TaskPoint } from '@/mock/biz'
import { routeAt, nearestF, toReal, toFrame, dist } from './geo'
import { pad } from '@/utils'

export interface Running { kind: '循迹任务' | '发布点任务' | '多任务组'; name: string; route?: string; group: string; progress: number; obs: string; gait: string; start: string; circle: number; laps: number }
export interface Rt {
  nav: boolean; ins: boolean; msf: boolean; msfMode: '融合定位' | '卫星定位'; gps: boolean; navMap: string; pause: boolean; navStop: boolean; locOk: boolean
  insOrigin: { lat: number; lng: number; alt: number; time: string } | null
  bagRec: { name: string; t0: number } | null; slam: boolean; job: { kind: string; name: string; progress: number } | null
  trackRec: { name: string; map: string; shape: number; t0: number; f: number } | null
  run: Running | null; standing: boolean; pose: { x: number; y: number; yaw: number }; speed: number; obsMode: string
}
const now = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}` }

export const db = reactive({ bags: BAGS, maps: MAPS, routes: ROUTES, pubs: PUBS, groups: GROUPS, multi: MULTI, schedules: SCHEDULES, records: RECORDS, rounds: ROUNDS, alarms: ALARMS })
const base = (): Rt => ({ nav: false, ins: false, msf: false, msfMode: '融合定位', gps: false, navMap: '', pause: false, navStop: false, locOk: false, insOrigin: null, bagRec: null, slam: false, job: null, trackRec: null, run: null, standing: true, pose: { x: 18, y: 76, yaw: -60 }, speed: 0.8, obsMode: '停障模式' })
export const rts = reactive<Record<string, Rt>>(Object.fromEntries(ROBOTS.map((r) => [r.id, { ...base(), insOrigin: INS_ORIGINS[r.id] ?? null }])))
// 初始场景：DOG-001 导航中并在执行循迹任务；DOG-002 资料齐备待开导航；DOG-003 仅录包；CAR-001 INS 已初始化未开启
Object.assign(rts['DOG-001'], { nav: true, navMap: '综合楼一层', locOk: true, run: { kind: '循迹任务', name: '综合楼一层_配电室环线 / 日常巡检', route: 'RT-01', group: 'G-01', progress: 0.42, obs: '停障模式', gait: '行走步态', start: '08:30', circle: 1, laps: 1 } })
Object.assign(rts['DOG-002'], { navMap: '地下管廊', pose: { ...routeAt(6, 0) } })
Object.assign(rts['CAR-001'], { pose: { ...routeAt(4, 0.02) }, gps: true })
rts['DOG-001'].pose = routeAt(0, 0.42)

export const curId = ref('DOG-001')
export const switching = ref(false)
export const selectRobot = (id: string) => { if (id === curId.value) return; switching.value = true; setTimeout(() => { curId.value = id; switching.value = false }, 450) }
export const robot = computed(() => ROBOTS.find((r) => r.id === curId.value)!)
export const rt = computed(() => rts[curId.value])
export const isDog = computed(() => robot.value.kind === 'dog')
export const isIns = computed(() => robot.value.loc === 'ins')
export const hasNav = computed(() => rt.value.nav || rt.value.ins || rt.value.msf)
export const locText = computed(() => (rt.value.nav ? `激光导航 · ${rt.value.navMap}` : rt.value.ins ? 'INS 定位中' : rt.value.msf ? `MSF ${rt.value.msfMode}` : '未开启定位'))

/* 当前机器人数据 */
export const myBags = computed(() => db.bags.filter((b) => b.robot === curId.value))
export const myMaps = computed(() => db.maps.filter((m) => m.robot === curId.value))
export const myRoutes = computed(() => db.routes.filter((r) => r.robot === curId.value))
export const myGroups = computed(() => db.groups.filter((g) => g.robot === curId.value))
export const routeById = (id?: string) => db.routes.find((r) => r.id === id)
export const groupById = (id?: string) => db.groups.find((g) => g.id === id)
export const shortName = (r?: BizRoute) => (r ? (r.map && r.name.startsWith(r.map + '_') ? r.name.slice(r.map.length + 1) : r.name) : '—')

/* ---------------- 作业流程（主流程步骤） ---------------- */
export interface Step { k: string; t: string; d: string; done: boolean; tab: string; sub?: string; tip: string }
export const steps = computed<Step[]>(() => {
  const s = rt.value; const routes = myRoutes.value; const pts = myGroups.value.filter((g) => g.kind === '循迹').reduce((a, g) => a + g.points.length, 0)
  const tail: Step[] = [
    { k: 'route', t: '录制循迹路线', d: routes.length ? `${routes.length} 条路线` : '暂无路线', done: routes.length > 0, tab: 'task', sub: 'route', tip: '定位开启后遥控机器人沿巡检路径行走一遍，完成录制' },
    { k: 'point', t: '路线上添加任务点', d: pts ? `${myGroups.value.filter((g) => g.kind === '循迹').length} 个任务组 · ${pts} 个任务点` : '暂无任务点', done: pts > 0, tab: 'task', sub: 'route', tip: '为路线创建任务组，在巡检位置添加任务点（拍照/测温/表计…）' },
    { k: 'run', t: isIns.value ? '启动巡检任务' : '起点启动任务', d: s.run ? `执行中 · ${Math.round(s.run.progress * 100)}%` : '未在执行', done: !!s.run, tab: 'home', tip: isIns.value ? 'INS 不重新初始化即可直接启动任务' : '机器人位于路线起点、导航开启后启动循迹任务' },
  ]
  if (isIns.value) return [
    { k: 'origin', t: 'INS 初始化', d: s.insOrigin ? `原点已设置 · ${s.insOrigin.time.slice(5)}` : '未初始化', done: !!s.insOrigin, tab: 'nav', sub: 'loc', tip: '设置 INS 原点（GPS 经纬高），仅需一次；重新初始化会使已录路线坐标失效' },
    { k: 'ins', t: '开启 INS 定位', d: s.ins ? 'INS 运行中' : s.msf ? `MSF ${s.msfMode}` : '未开启', done: s.ins || s.msf, tab: 'nav', sub: 'loc', tip: '开启 INS 后机器人使用 GPS 坐标定位，无需建图' },
    ...tail,
  ]
  return [
    { k: 'bag', t: '录包', d: myBags.value.length ? `${myBags.value.length} 个数据包` : '暂无数据包', done: myBags.value.length > 0, tab: 'nav', sub: 'build', tip: '开始录包后遥控机器人走遍巡检区域，完成录制' },
    { k: 'map', t: '生成地图', d: myMaps.value.length ? `${myMaps.value.length} 张地图` : '暂无地图', done: myMaps.value.length > 0, tab: 'nav', sub: 'build', tip: '选择数据包生成点云地图' },
    { k: 'grid', t: '生成栅格地图', d: myMaps.value.filter((m) => m.grid).length ? `${myMaps.value.filter((m) => m.grid).length} 张栅格图` : '未生成', done: myMaps.value.some((m) => m.grid), tab: 'nav', sub: 'build', tip: '由点云地图生成 2D 栅格地图，用于导航与地图编辑' },
    { k: 'nav', t: '开启导航定位', d: s.nav ? `导航中 · ${s.navMap}` : s.msf ? `MSF ${s.msfMode}` : '未开启', done: s.nav || s.msf, tab: 'nav', sub: 'loc', tip: '选择地图开始导航，必要时在地图上重定位' },
    ...tail,
  ]
})
export const curStep = computed(() => steps.value.findIndex((s) => !s.done))

/* ---------------- 定位控制（互斥逻辑对齐 NavigationManage） ---------------- */
const confirm = (title: string, content: string, ok: () => void, danger = false) => Modal.confirm({ title, content, okText: '确定', cancelText: '取消', okButtonProps: danger ? { danger: true } : undefined, onOk: ok })
const noRtk = (what: string) => { message.error(`当前机器人未搭载RTK设备，无法${what}`); return true }
export function toggleNav(map: string) {
  const s = rt.value
  if (s.ins || s.msf) return message.error('请先关闭INS或MSF')
  if (!s.nav && !map) return message.error('请先选择地图')
  if (s.nav && s.run) return message.error('任务执行中，请先关闭任务')
  const a = s.nav ? '关闭' : '开启'
  confirm(`${a}导航`, `确定要${a}导航吗？`, () => {
    if (s.nav) { Object.assign(s, { nav: false, locOk: false, pause: false }); message.success('导航已关闭'); return }
    Object.assign(s, { nav: true, navMap: map, locOk: false }); message.success(`导航已开启 · ${map}`)
    setTimeout(() => { s.locOk = true }, 1500)
  })
}
export function toggleIns() {
  const s = rt.value
  if (!robot.value.rtk) return noRtk('操作INS')
  if (s.nav || s.msf) return message.error('请先关闭导航或MSF')
  if (!s.ins && !s.insOrigin) return message.warning('请先进行 INS 初始化')
  if (s.ins && s.run) return message.error('任务执行中，请先关闭任务')
  const a = s.ins ? '关闭' : '开始'
  confirm(`${a}INS`, `确定要${a}INS吗？`, () => { s.ins = !s.ins; s.locOk = s.ins; message.success(`${a}INS成功`) })
}
export function initIns() {
  const s = rt.value
  if (!robot.value.rtk) return noRtk('进行INS初始化')
  if (s.nav || s.msf) return message.error('请先关闭导航或MSF')
  const re = !!s.insOrigin
  confirm('INS初始化', re ? '当前已存在 INS 原点。重新初始化将更新原点，已录制路线与任务点坐标可能产生偏移，确定继续吗？' : '确定要进行INS初始化吗？请确认机器人处于开阔无遮挡位置且卫星信号良好。', () => {
    s.insOrigin = { lat: +(30.2745 + Math.random() * 0.0003).toFixed(6), lng: +(120.1552 + Math.random() * 0.0003).toFixed(6), alt: +(12 + Math.random()).toFixed(1), time: now() }
    message.success('INS初始化成功')
  }, re)
}
export function toggleMsf(map: string, mode: '融合定位' | '卫星定位') {
  const s = rt.value
  if (!robot.value.rtk) return noRtk('操作MSF')
  if (s.nav || s.ins) return message.error('请先关闭导航或INS')
  if (!s.msf && !map && !isIns.value) return message.error('请先选择地图')
  if (s.msf) { s.msf = false; s.locOk = false; message.success('MSF 已关闭'); return }
  Object.assign(s, { msf: true, msfMode: mode, navMap: map || s.navMap, locOk: true }); message.success(`MSF 已开启 · ${mode}`)
}

/* ---------------- 录包建图 ---------------- */
export function startBag(name: string) {
  const s = rt.value
  if (!name.trim()) return message.error('请输入数据包名称')
  if (db.bags.some((b) => b.name === name)) return message.error('数据包名称已存在')
  s.bagRec = { name, t0: Date.now() }; message.success('开始录包，请遥控机器人遍历巡检区域')
}
export function stopBag() {
  const s = rt.value; if (!s.bagRec) return
  const sec = Math.max(1, Math.round((Date.now() - s.bagRec.t0) / 1000))
  db.bags.unshift({ name: s.bagRec.name, robot: curId.value, size: `${(0.4 + sec * 0.02).toFixed(1)} GB`, dur: `${Math.floor(sec / 60)} 分 ${pad(sec % 60)} 秒`, time: now() })
  s.bagRec = null; message.success('录制完成，可选择数据包生成地图')
}
const runJob = (kind: string, name: string, done: () => void) => {
  const s = rt.value; s.job = { kind, name, progress: 0 }
  const tm = setInterval(() => { if (!s.job) return clearInterval(tm); s.job.progress = Math.min(100, s.job.progress + 7 + Math.round(Math.random() * 6)); if (s.job.progress >= 100) { clearInterval(tm); setTimeout(() => { s.job = null; done() }, 400) } }, 350)
}
export function genMap(bag: string, name: string, fusion = false) {
  if (!name.trim()) return message.error(fusion ? '请输入融合地图名称' : '请输入地图名称')
  if (db.maps.some((m) => m.name === name)) return message.error('地图名称已存在')
  if (rt.value.job) return message.error('当前有建图任务在进行中')
  const id = curId.value
  runJob(fusion ? '新建融合地图' : '生成地图', name, () => { db.maps.push({ name, robot: id, kind: fusion ? '融合地图' : '点云地图', grid: false, bag, res: 0.05, size: '1280×860', area: 3000, created: now(), seed: 41, zones: [] }); message.success(`地图「${name}」已生成，请继续生成栅格地图`) })
}
export function genGrid(map: string) {
  const m = db.maps.find((x) => x.name === map); if (!m) return message.error('请选择地图')
  if (rt.value.job) return message.error('当前有建图任务在进行中')
  runJob('生成栅格地图', map, () => { m.grid = true; message.success(`「${map}」栅格地图已生成，可开启导航`) })
}
export const stopJob = () => { rt.value.job = null; message.info('已终止') }

/* ---------------- 路线录制 ---------------- */
export function startTrackRec(map: string, name: string) {
  const s = rt.value
  if (s.run) return message.error('当前正在循迹，无法录制路线')
  if (!hasNav.value) return message.error('请先开启导航、INS或MSF')
  if (!isIns.value && !map) return message.error('请先选择地图')
  if (!name.trim()) return message.error('请输入路线名称')
  const full = isIns.value ? name : `${map}_${name}`
  if (myRoutes.value.some((r) => r.name === full)) return message.error(`路线名称已存在：${full}`)
  const shape = isIns.value ? 5 : [2, 1, 3][myRoutes.value.length % 3]
  s.trackRec = { name: full, map: isIns.value ? '' : map, shape, t0: Date.now(), f: 0 }; message.success('开始录制路线')
}
export function stopTrackRec() {
  const s = rt.value; if (!s.trackRec) return
  confirm('完成录制', '确定要完成录制吗？', () => {
    const t = s.trackRec!; const id = `RT-${pad(db.routes.length + 1)}${Math.floor(Math.random() * 9)}`
    db.routes.push({ id, name: t.name, robot: curId.value, map: t.map, shape: t.shape, smooth: false, created: now() }); s.trackRec = null; message.success('录制完成'); lastRoute.value = id
  })
}
export const lastRoute = ref('')

/* ---------------- 任务点 ---------------- */
export function newPointFromPose(g: TaskGroup): Partial<TaskPoint> {
  const p = rt.value.pose; const real = toReal(p.x, p.y)
  return hasNav.value ? { x: real.x, y: real.y, z: 0, angle: p.yaw, mx: p.x, my: p.y } : {}
}
export function savePoint(g: TaskGroup, f: Partial<TaskPoint>, editId?: number) {
  const r = routeById(g.route)
  const fp = toFrame(f.x ?? 0, f.y ?? 0); const mx = f.mx ?? fp.x, my = f.my ?? fp.y
  const full = { ...f, mx, my, f: r ? nearestF(r.shape, mx, my) : 0 } as TaskPoint
  if (editId) { const i = g.points.findIndex((p) => p.id === editId); g.points[i] = { ...g.points[i], ...full } }
  else { g.points.push({ ...full, id: newPid() }); if (r) g.points.sort((a, b) => a.f - b.f) }
}
export function gotoPoint(p: TaskPoint) {
  const s = rt.value
  if (!hasNav.value) return message.error('请先开启导航、INS或MSF')
  if (s.run) return message.error('当前有任务正在运行')
  message.loading({ content: `正在前往 ${p.desc}…`, key: 'goto' })
  setTimeout(() => { s.pose = { x: p.mx, y: p.my, yaw: p.angle }; message.success({ content: `已到达 ${p.desc}`, key: 'goto' }) }, 1600)
}
export function gotoStart(r: BizRoute) {
  const s = rt.value
  if (!hasNav.value) return message.error('请先开启导航、INS或MSF')
  message.loading({ content: '正在前往路线起点…', key: 'goto' })
  setTimeout(() => { s.pose = routeAt(r.shape, 0); message.success({ content: '已到达路线起点', key: 'goto' }) }, 1600)
}
export const startDist = (r?: BizRoute) => (r ? dist(rt.value.pose, routeAt(r.shape, 0)) : 0)

/* ---------------- 任务启动（对齐 Mission.vue 启动流程） ---------------- */
export function preCheck(kind: Running['kind'], routeId?: string, groupId?: string) {
  const s = rt.value; const r = routeById(routeId); const g = groupById(groupId)
  return [
    { t: '无其他任务运行', ok: !s.run, m: '当前有其他任务正在运行' },
    { t: '导航未暂停', ok: !s.pause, m: '请先关闭导航暂停' },
    { t: isIns.value ? 'INS / MSF 已开启' : '导航 / MSF 已开启', ok: hasNav.value, m: '请先开启导航、INS或MSF' },
    ...(kind === '循迹任务' && !isIns.value ? [{ t: '导航地图与路线一致', ok: !r || !s.nav || s.navMap === r.map, m: `当前导航地图为「${s.navMap}」，与路线所属地图「${r?.map}」不一致` }] : []),
    ...(kind === '循迹任务' ? [{ t: '已选择路线', ok: !!r, m: '请先选择路线' }] : []),
    { t: '任务组包含任务点', ok: !!g && g.points.length > 0, m: g ? '当前任务组没有任务点，请先添加任务点' : '请先选择任务组' },
    ...(kind === '循迹任务' && r ? [{ t: `位于路线起点附近（${startDist(r).toFixed(1)} m）`, ok: startDist(r) < 2, m: '机器人未位于路线起点，请先前往起点' }] : []),
  ]
}
export function bootSteps() {
  return isDog.value
    ? ['检查循迹启动前置状态', '切换到行走步态', '发送非手动模式指令', '设置地形为实心地面', '等待机器人进入非手动模式', '发送导航模块非手动模式指令', '发送踏步指令，等待进入踏步状态', '发送任务启动指令']
    : ['检查循迹启动前置状态', '发送非手动模式指令', '发送导航模块非手动模式指令', '发送任务启动指令']
}
export function launch(run: Omit<Running, 'progress' | 'start' | 'laps'>) {
  const s = rt.value; const d = new Date()
  s.run = { ...run, progress: 0, start: `${pad(d.getHours())}:${pad(d.getMinutes())}`, laps: 1 }; s.obsMode = run.obs
}
export function stopRun() {
  const s = rt.value; if (!s.run) return
  confirm('关闭任务', `确定要关闭「${s.run.name}」吗？`, () => { s.run = null; s.pause = false; message.success('任务已关闭') }, true)
}
export const togglePause = () => { const s = rt.value; s.pause = !s.pause; message.success(s.pause ? '暂停指令已发送' : '恢复指令已发送') }
/* 任务下发弹窗（全局唯一，在 BizView 挂载） */
export const launchReq = reactive({ open: false, kind: '循迹任务' as Running['kind'], route: '', group: '', multi: '', n: 0 })
export function openLaunch(kind: Running['kind'], o: { route?: string; group?: string; multi?: string } = {}) {
  if (!robot.value.online) return message.error('机器人离线，无法下发任务')
  if (rt.value.run) return message.error('当前有其他任务正在运行')
  Object.assign(launchReq, { open: true, kind, route: o.route ?? '', group: o.group ?? '', multi: o.multi ?? '', n: launchReq.n + 1 })
}
export const gaitName = (n: number) => GAITS[n - 1] ?? '—'

/* 任务进度推进（演示） */
setInterval(() => {
  for (const r of ROBOTS) {
    const s = rts[r.id]; const run = s.run
    if (s.trackRec) { s.trackRec.f = Math.min(1, s.trackRec.f + 0.012); s.pose = routeAt(s.trackRec.shape, s.trackRec.f) }
    if (!run || s.pause) continue
    run.progress = Math.min(1, run.progress + 0.0035)
    const rr = routeById(run.route)
    if (rr) s.pose = routeAt(rr.shape, run.progress)
    else { const g = groupById(run.group); if (g?.points.length) { const k = run.progress * (g.points.length - 1); const a = g.points[Math.floor(k)], b = g.points[Math.min(g.points.length - 1, Math.floor(k) + 1)]; const t = k - Math.floor(k); s.pose = { x: a.mx + (b.mx - a.mx) * t, y: a.my + (b.my - a.my) * t, yaw: Math.round((Math.atan2(b.my - a.my, b.mx - a.mx) * 180) / Math.PI) } } }
    if (run.progress >= 1) {
      if (run.laps < run.circle) { run.laps++; run.progress = 0; continue }
      const g = groupById(run.group)
      db.rounds.unshift({ id: `${r.id.slice(0, 1)}${Date.now() % 100000}`, robot: r.id, kind: run.kind, route: shortName(rr), group: g?.name ?? '—', start: run.start, end: now().slice(5), total: g?.points.length ?? 0, bad: 0, state: '已完成' })
      s.run = null; if (r.id === curId.value) message.success('任务执行完成')
    }
  }
}, 1000)
