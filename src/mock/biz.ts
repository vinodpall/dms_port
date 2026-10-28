/** 机器人业务管理（巡检业务）示例数据 —— 以「当前机器人」为中心，字段对齐 robot_web（/navigation /taskpoints /multitasks /scheduled /vision /alerts /operation_logs） */
import { rng, pad } from '@/utils'
import { ROUTE_SET, routeAt, toReal } from '@/views/proto/biz/geo'

export type BizRobotKind = 'dog' | 'car'
/** 定位方式：激光雷达 SLAM / INS（RTK 组合导航） */
export type LocMode = 'lidar' | 'ins'
export interface BizRobot { id: string; name: string; kind: BizRobotKind; model: string; loc: LocMode; rtk: boolean; online: boolean; battery: number; mileage: number; latency: number; ip: string; site: string }
export const KIND_META: Record<BizRobotKind, { t: string; glyph: 'quadruped' | 'ugv'; c: string }> = {
  dog: { t: '机器狗', glyph: 'quadruped', c: '#5B9BFF' }, car: { t: '无人车', glyph: 'ugv', c: '#45E3A8' },
}
export const LOC_META: Record<LocMode, { t: string; s: string; c: string }> = {
  lidar: { t: '激光雷达 SLAM', s: '激光', c: '#5B9BFF' }, ins: { t: 'INS 组合导航', s: 'INS', c: '#45E3A8' },
}
export const ROBOTS: BizRobot[] = [
  { id: 'DOG-001', name: '巡检狗 01', kind: 'dog', model: 'X30 Pro', loc: 'lidar', rtk: false, online: true, battery: 76, mileage: 1286.4, latency: 38, ip: '10.12.3.101', site: '综合楼' },
  { id: 'DOG-002', name: '巡检狗 02', kind: 'dog', model: 'X30 Pro', loc: 'lidar', rtk: true, online: true, battery: 91, mileage: 964.2, latency: 46, ip: '10.12.3.102', site: '地下管廊' },
  { id: 'DOG-003', name: '巡检狗 03', kind: 'dog', model: 'B2', loc: 'lidar', rtk: false, online: true, battery: 64, mileage: 102.8, latency: 41, ip: '10.12.3.103', site: '综合楼二层（新部署）' },
  { id: 'CAR-001', name: '巡检车 01', kind: 'car', model: 'Scout 2.0', loc: 'ins', rtk: true, online: true, battery: 88, mileage: 3210.5, latency: 29, ip: '10.12.3.111', site: '室外园区' },
  { id: 'CAR-002', name: '巡检车 02', kind: 'car', model: 'Hunter SE', loc: 'ins', rtk: true, online: false, battery: 0, mileage: 2480.1, latency: 0, ip: '10.12.3.112', site: '室外园区' },
]

/** 步态（对齐任务点 gait 1-9） */
export const GAITS = ['行走步态', '斜坡步态', '越障步态', '楼梯步态', '帧楼梯步态', '帧45°楼梯步态', 'L行走步态', '山地步态', '静音步态']
export const GROUNDS = ['实心地面', '镂空地面', '无踢面地面', '累积帧模式']
export const OBS_MODES = ['无避障', '停障模式', '绕障模式']
/** 任务类型（对齐 /taskpoints/{id}/task_type_list：single 单选 / 多选组合） */
export const TASK_TYPES = [
  { cn: '可见光拍照', single: true, c: '#2ED3E6' }, { cn: '红外测温', single: true, c: '#FF8A50' }, { cn: '表计识别', single: true, c: '#5B9BFF' },
  { cn: '录像', single: true, c: '#B48CFF' }, { cn: '气体检测', single: true, c: '#45E3A8' }, { cn: '大模型识别', single: true, c: '#FFC15C' },
  { cn: '到点停留', single: true, c: '#B6CADC' },
  { cn: '可见光+红外', single: false, c: '#2ED3E6' }, { cn: '拍照+录像', single: false, c: '#B48CFF' }, { cn: '表计+红外测温', single: false, c: '#5B9BFF' },
]
export const typeColor = (t: string) => TASK_TYPES.find((x) => x.cn === t)?.c ?? '#B6CADC'
export const PRESETS = Array.from({ length: 8 }, (_, i) => `预置点${i + 1}`)
export const ZONES = [
  { k: 'forbid', t: '禁行区', c: '#FF7A7A' }, { k: 'stair', t: '楼梯', c: '#FFC15C' }, { k: 'slope', t: '斜坡', c: '#B48CFF' },
  { k: 'narrow', t: '窄通道', c: '#2ED3E6' }, { k: 'grass', t: '草地', c: '#45E3A8' },
] as const

/* ---------------- 数据包 / 地图 ---------------- */
export interface BizBag { name: string; robot: string; size: string; dur: string; time: string }
export interface BizMapItem { name: string; robot: string; kind: '点云地图' | '融合地图'; grid: boolean; bag: string; res: number; size: string; area: number; created: string; seed: number; zones: { name: string; k: string }[] }
export const BAGS: BizBag[] = [
  { name: 'bag_20261016_0930', robot: 'DOG-001', size: '3.6 GB', dur: '18 分 42 秒', time: '2026-10-16 09:30' },
  { name: 'bag_20261009_1520', robot: 'DOG-001', size: '3.1 GB', dur: '15 分 06 秒', time: '2026-10-09 15:20' },
  { name: 'bag_20261012_1410', robot: 'DOG-002', size: '5.1 GB', dur: '26 分 10 秒', time: '2026-10-12 14:10' },
  { name: 'bag_20261007_1450', robot: 'CAR-001', size: '6.8 GB', dur: '32 分 15 秒', time: '2026-10-07 14:50' },
  { name: 'bag_20261001_1010', robot: 'CAR-002', size: '6.2 GB', dur: '29 分 40 秒', time: '2026-10-01 10:10' },
  { name: 'bag_20261019_1605', robot: 'DOG-003', size: '2.2 GB', dur: '11 分 37 秒', time: '2026-10-19 16:05' },
]
const Z1 = [{ name: '禁行区-庭院花坛', k: 'forbid' }, { name: '禁行区-东楼设备间', k: 'forbid' }, { name: '东侧台阶', k: 'stair' }, { name: '消防通道坡道', k: 'slope' }, { name: '院门窄道', k: 'narrow' }, { name: '庭院草坪', k: 'grass' }]
export const MAPS: BizMapItem[] = [
  { name: '综合楼一层', robot: 'DOG-001', kind: '点云地图', grid: true, bag: 'bag_20261016_0930', res: 0.2, size: '514×501', area: 3200, created: '2026-10-16 10:12', seed: 11, zones: Z1 },
  { name: '综合楼二层', robot: 'DOG-001', kind: '点云地图', grid: true, bag: 'bag_20261009_1520', res: 0.05, size: '1260×840', area: 3000, created: '2026-10-09 16:02', seed: 41, zones: Z1.slice(0, 2) },
  { name: '室外园区', robot: 'CAR-001', kind: '融合地图', grid: true, bag: 'bag_20261007_1450', res: 0.1, size: '1800×1200', area: 21600, created: '2026-10-07 16:20', seed: 31, zones: [] },
  { name: '室外园区', robot: 'CAR-002', kind: '融合地图', grid: true, bag: 'bag_20261001_1010', res: 0.1, size: '1800×1200', area: 21600, created: '2026-10-01 11:30', seed: 31, zones: [] },
  { name: '地下管廊', robot: 'DOG-002', kind: '融合地图', grid: true, bag: 'bag_20261012_1410', res: 0.05, size: '2400×420', area: 1800, created: '2026-10-12 15:30', seed: 23, zones: Z1.slice(2, 5) },
]
/** INS 原点（/navigation/{id}/ins_origin） */
export const INS_ORIGINS: Record<string, { lat: number; lng: number; alt: number; time: string } | null> = {
  'CAR-001': { lat: 30.274512, lng: 120.155231, alt: 12.6, time: '2026-10-08 09:42' }, 'CAR-002': { lat: 30.274498, lng: 120.155270, alt: 12.4, time: '2026-10-02 10:05' },
}

/* ---------------- 路线 / 任务组 / 任务点 ---------------- */
export interface BizRoute { id: string; name: string; robot: string; map: string; shape: number; smooth: boolean; created: string }
/** map 为空字符串表示 INS 坐标系（以 INS 原点为基准） */
export const ROUTES: BizRoute[] = [
  { id: 'RT-01', name: '综合楼一层_配电室环线', robot: 'DOG-001', map: '综合楼一层', shape: 0, smooth: true, created: '2026-10-16 11:05' },
  { id: 'RT-02', name: '综合楼一层_机房南北通道', robot: 'DOG-001', map: '综合楼一层', shape: 1, smooth: true, created: '2026-10-16 11:40' },
  { id: 'RT-03', name: '综合楼一层_充电回桩', robot: 'DOG-001', map: '综合楼一层', shape: 3, smooth: false, created: '2026-10-16 12:02' },
  { id: 'RT-04', name: '综合楼二层_消防通道', robot: 'DOG-001', map: '综合楼二层', shape: 2, smooth: true, created: '2026-10-10 09:20' },
  { id: 'RT-05', name: '地下管廊_A段', robot: 'DOG-002', map: '地下管廊', shape: 6, smooth: true, created: '2026-10-12 16:10' },
  { id: 'RT-06', name: '园区外围', robot: 'CAR-001', map: '', shape: 4, smooth: true, created: '2026-10-08 10:30' },
  { id: 'RT-07', name: '主干道巡查', robot: 'CAR-001', map: '', shape: 5, smooth: false, created: '2026-10-08 11:15' },
  { id: 'RT-08', name: '园区外围', robot: 'CAR-002', map: '', shape: 4, smooth: true, created: '2026-10-02 10:40' },
]
export interface TaskPoint { id: number; type: string; multi: boolean; x: number; y: number; z: number; angle: number; mx: number; my: number; f: number; preset: string; extra: string; desc: string; gait: number; ground: number; nostop: boolean; obs: string; always: boolean }
export interface TaskGroup { id: string; name: string; robot: string; kind: '循迹' | '发布点'; route?: string; map: string; points: TaskPoint[] }
const DESCS = ['配电柜 1# 柜门', '变压器温度', '压力表 P-03', '消防栓', '电缆桥架', '气体监测点', 'UPS 指示灯', '空调出风口', '配电柜 2# 指示灯', '门禁状态']
let pid = 1
export const newPid = () => pid++
const mkPts = (seed: number, shape: number, n: number): TaskPoint[] => {
  const r = rng(seed)
  return Array.from({ length: n }, (_, i) => {
    const f = +((i + 0.7) / (n + 0.4)).toFixed(3); const p = routeAt(shape, f); const real = toReal(p.x, p.y); const single = r() > 0.2
    const type = single ? TASK_TYPES[Math.floor(r() * 6)].cn : TASK_TYPES[7 + Math.floor(r() * 3)].cn
    return { id: pid++, type, multi: !single, x: real.x, y: real.y, z: 0, angle: p.yaw, mx: p.x, my: p.y, f, preset: r() > 0.35 ? PRESETS[Math.floor(r() * 8)] : '', extra: type === '大模型识别' ? '提示词：配电柜状态识别' : '',
      desc: DESCS[Math.floor(r() * DESCS.length)], gait: 1 + Math.floor(r() * 3), ground: 1, nostop: r() > 0.8, obs: OBS_MODES[1 + Math.floor(r() * 2)], always: r() > 0.5 }
  })
}
const mkFree = (seed: number, n: number): TaskPoint[] => {
  const r = rng(seed); const spots = [[54, 18], [74, 14], [100, 16], [92, 30], [100, 50], [109, 80], [62, 84], [84, 38]]
  return Array.from({ length: n }, (_, i) => { const [mx, my] = spots[i % spots.length]; const real = toReal(mx, my)
    return { id: pid++, type: TASK_TYPES[Math.floor(r() * 4)].cn, multi: false, x: real.x, y: real.y, z: 0, angle: Math.round(r() * 360 - 180), mx, my, f: 0, preset: PRESETS[i % 8], extra: '', desc: ['消防栓 F-0' + (i + 1), '灭火器箱', '应急灯', '烟感探头'][i % 4], gait: 1, ground: 1, nostop: false, obs: '停障模式', always: true } })
}
export const GROUPS: TaskGroup[] = [
  { id: 'G-01', name: '日常巡检', robot: 'DOG-001', kind: '循迹', route: 'RT-01', map: '综合楼一层', points: mkPts(5, 0, 9) },
  { id: 'G-02', name: '夜间重点', robot: 'DOG-001', kind: '循迹', route: 'RT-01', map: '综合楼一层', points: mkPts(9, 0, 4) },
  { id: 'G-03', name: '机房巡查', robot: 'DOG-001', kind: '循迹', route: 'RT-02', map: '综合楼一层', points: mkPts(8, 1, 6) },
  { id: 'G-04', name: '回桩', robot: 'DOG-001', kind: '循迹', route: 'RT-03', map: '综合楼一层', points: [] },
  { id: 'G-05', name: '消防设施点检', robot: 'DOG-001', kind: '发布点', map: '综合楼一层', points: mkFree(12, 6) },
  { id: 'G-06', name: '温湿度巡检', robot: 'DOG-002', kind: '循迹', route: 'RT-05', map: '地下管廊', points: mkPts(15, 6, 8) },
  { id: 'G-07', name: '外围安防', robot: 'CAR-001', kind: '循迹', route: 'RT-06', map: '', points: mkPts(21, 4, 8) },
  { id: 'G-08', name: '道路巡查', robot: 'CAR-001', kind: '循迹', route: 'RT-07', map: '', points: mkPts(25, 5, 5) },
  { id: 'G-10', name: '停车场定点巡查', robot: 'CAR-001', kind: '发布点', map: '室外园区', points: mkFree(33, 5) },
  { id: 'G-09', name: '外围安防', robot: 'CAR-002', kind: '循迹', route: 'RT-08', map: '', points: mkPts(29, 4, 6) },
]
export interface MultiStep { startMode: '导航' | 'INS' | 'MSF'; mode: '循迹模式' | '发布点模式'; map: string; route: string; group: string; circle: number; obs: string; gait: number; ground: number; origin: boolean }
export interface MultiGroup { id: string; name: string; robot: string; inPlace: boolean; steps: MultiStep[] }
export const MULTI: MultiGroup[] = [
  { id: 'MG-01', name: '一层全区联巡', robot: 'DOG-001', inPlace: true, steps: [
    { startMode: '导航', mode: '循迹模式', map: '综合楼一层', route: 'RT-01', group: 'G-01', circle: 2, obs: '停障模式', gait: 1, ground: 1, origin: true },
    { startMode: '导航', mode: '发布点模式', map: '综合楼一层', route: '', group: 'G-05', circle: 1, obs: '绕障模式', gait: 1, ground: 1, origin: false },
    { startMode: '导航', mode: '循迹模式', map: '综合楼一层', route: 'RT-03', group: 'G-04', circle: 1, obs: '停障模式', gait: 1, ground: 1, origin: false },
  ] },
  { id: 'MG-02', name: '园区早晚巡', robot: 'CAR-001', inPlace: false, steps: [
    { startMode: 'INS', mode: '循迹模式', map: '', route: 'RT-06', group: 'G-07', circle: 1, obs: '停障模式', gait: 1, ground: 1, origin: false },
    { startMode: 'INS', mode: '循迹模式', map: '', route: 'RT-07', group: 'G-08', circle: 2, obs: '绕障模式', gait: 1, ground: 1, origin: false },
  ] },
]
export interface Schedule { id: string; robot: string; route: string; group: string; time: string; created: string }
export const SCHEDULES: Schedule[] = [
  { id: 'S-01', robot: 'DOG-001', route: 'RT-01', group: 'G-01', time: '08:30', created: '2026-10-16 12:30' },
  { id: 'S-02', robot: 'DOG-001', route: 'RT-01', group: 'G-01', time: '14:00', created: '2026-10-16 12:31' },
  { id: 'S-03', robot: 'DOG-001', route: 'RT-02', group: 'G-03', time: '22:00', created: '2026-10-17 09:02' },
  { id: 'S-04', robot: 'DOG-002', route: 'RT-05', group: 'G-06', time: '09:10', created: '2026-10-12 17:00' },
  { id: 'S-05', robot: 'CAR-001', route: 'RT-06', group: 'G-07', time: '19:30', created: '2026-10-08 12:00' },
]

/* ---------------- 巡检记录 / 告警 / 日志 ---------------- */
export const ITEMS = ['可见光识别', '红外测温', '表计识别', '气体检测', '大模型识别']
export interface BizRecord { id: number; robot: string; time: string; map: string; kind: '循迹任务' | '发布点任务' | '日常巡检'; route: string; group: string; coord: string; item: string; result: string; bad: boolean; desc: string; round: string; seed: number }
export interface BizRound { id: string; robot: string; kind: string; route: string; group: string; start: string; end: string; total: number; bad: number; state: '已完成' | '异常结束' | '执行中' }
const routeName = (id?: string) => ROUTES.find((r) => r.id === id)?.name ?? '—'
export const ROUNDS: BizRound[] = []
export const RECORDS: BizRecord[] = (() => {
  const out: BizRecord[] = []; let id = 1
  for (const g of GROUPS.filter((x) => x.points.length)) {
    const r = rng(g.id.charCodeAt(3) * 13)
    for (let k = 0; k < 3; k++) {
      const day = 20 - k; const h = [8, 14, 22][(k + g.id.charCodeAt(3)) % 3]; const rid = `${g.robot.slice(0, 1)}${pad(day)}${pad(h)}-${g.id.slice(2)}`
      let bad = 0
      g.points.forEach((p, i) => {
        const isBad = r() < 0.14; if (isBad) bad++
        const item = p.type.includes('红外') ? '红外测温' : p.type.includes('表计') ? '表计识别' : p.type.includes('气体') ? '气体检测' : p.type.includes('大模型') ? '大模型识别' : '可见光识别'
        const res = { 红外测温: isBad ? '最高温 68.4℃ 超限' : `最高温 ${(32 + r() * 8).toFixed(1)}℃`, 表计识别: isBad ? '读数 1.86 MPa 超上限' : `读数 ${(0.7 + r() * 0.3).toFixed(2)} MPa`, 气体检测: isBad ? 'O₂ 18.6% 偏低' : 'O₂ 20.8% 正常', 大模型识别: isBad ? '柜门未关闭' : '柜门关闭，指示灯正常', 可见光识别: isBad ? '指示灯异常熄灭' : '正常' }[item]!
        out.push({ id: id++, robot: g.robot, time: `2026-10-${pad(day)} ${pad(h)}:${pad(2 + i * 2)}:${pad(Math.floor(r() * 60))}`, map: g.map || 'INS 坐标系', kind: g.kind === '发布点' ? '发布点任务' : k === 2 ? '日常巡检' : '循迹任务', route: g.kind === '发布点' ? '—' : routeName(g.route), group: g.name, coord: `${p.x}, ${p.y}`, item, result: res, bad: isBad, desc: p.desc, round: rid, seed: 200 + id })
      })
      ROUNDS.push({ id: rid, robot: g.robot, kind: g.kind === '发布点' ? '发布点任务' : '循迹任务', route: g.kind === '发布点' ? '—' : routeName(g.route), group: g.name, start: `10-${pad(day)} ${pad(h)}:00`, end: `10-${pad(day)} ${pad(h)}:${pad(4 + g.points.length * 3)}`, total: g.points.length, bad, state: r() > 0.9 ? '异常结束' : '已完成' })
    }
  }
  return out.sort((a, b) => b.time.localeCompare(a.time))
})()
ROUNDS.sort((a, b) => b.start.localeCompare(a.start))

export const ALARM_TYPES = [
  { t: '设备异常', c: '#FF7A7A' }, { t: '温度超限', c: '#FF8A50' }, { t: '仪表异常', c: '#FFC15C' },
  { t: '人员闯入', c: '#B48CFF' }, { t: '异物/遗留物', c: '#5B9BFF' }, { t: '气体超标', c: '#45E3A8' }, { t: '摔倒检测', c: '#FF7A7A' },
]
export const alarmColor = (t: string) => ALARM_TYPES.find((x) => x.t === t)?.c ?? '#FF7A7A'
export interface BizAlarm { id: string; time: string; robot: string; src: '可见光' | '红外' | '传感器' | '本体'; type: string; content: string; conf: string; coord: string; lnglat?: string; task: string; state: '待处理' | '误报' | '非误报'; who?: string; note?: string; handled?: string; seed: number }
export const ALARMS: BizAlarm[] = (() => {
  const r = rng(99)
  const contents: Record<string, string[]> = {
    设备异常: ['配电柜 2# 指示灯异常熄灭', 'UPS 面板告警灯亮起'], 温度超限: ['变压器 T1 表面温度 78.6℃', '电缆接头温度 65.2℃'],
    仪表异常: ['压力表 P-03 读数 1.86 MPa 超上限', 'SF6 密度表指针偏低'], 人员闯入: ['配电室发现未授权人员', '围栏外有人员逗留'],
    '异物/遗留物': ['通道内发现遗留纸箱', '道路上有障碍物'], 气体超标: ['可燃气体浓度 12% LEL', 'O₂ 浓度 18.6% 偏低'], 摔倒检测: ['横滚角 38.2° 超阈值，疑似摔倒', '俯仰角 41.0° 超阈值'],
  }
  const robots = ['DOG-001', 'DOG-001', 'DOG-002', 'CAR-001', 'DOG-001', 'CAR-001', 'DOG-002']
  return Array.from({ length: 22 }, (_, i) => {
    const ty = ALARM_TYPES[Math.floor(r() * (i % 9 === 8 ? 7 : 6))]; const rb = robots[i % robots.length]; const g = GROUPS.find((x) => x.robot === rb)!
    const st: BizAlarm['state'] = i < 6 ? '待处理' : r() > 0.35 ? '非误报' : '误报'
    return { id: `AL-${2400 - i}`, time: `2026-10-${pad(20 - Math.floor(i / 6))} ${pad(18 - (i % 6) * 2)}:${pad(Math.floor(r() * 60))}:${pad(Math.floor(r() * 60))}`, robot: rb,
      src: ty.t === '温度超限' ? '红外' : ty.t === '气体超标' ? '传感器' : ty.t === '摔倒检测' ? '本体' : '可见光', type: ty.t, content: contents[ty.t][Math.floor(r() * 2)],
      conf: ty.t === '气体超标' || ty.t === '摔倒检测' ? '—' : (0.82 + r() * 0.16).toFixed(2), coord: `${(r() * 36).toFixed(2)}, ${(r() * 22).toFixed(2)}`,
      lnglat: rb.startsWith('CAR') ? `${(120.1552 + r() * 0.002).toFixed(6)}, ${(30.2745 + r() * 0.002).toFixed(6)}` : undefined,
      task: `${g.name} · ${routeName(g.route)}`, state: st, who: st === '待处理' ? undefined : ['周工', '赵工'][i % 2], note: st === '待处理' ? undefined : st === '误报' ? '现场确认为反光误识别' : '已通知运维现场处理', handled: st === '待处理' ? undefined : `2026-10-${pad(20 - Math.floor(i / 6))} ${pad(19 - (i % 6) * 2)}:10`, seed: 100 + i }
  })
})()
export const OP_LOGS = Array.from({ length: 28 }, (_, i) => {
  const r = rng(500 + i)
  const ops = [
    ['任务下发', '启动循迹任务「配电室环线 / 日常巡检」'], ['步态切换', '切换为楼梯步态'], ['急停', '触发软件急停'], ['导航控制', '开始导航（综合楼一层）'], ['INS', 'INS 初始化'],
    ['地图编辑', '新增功能区「禁行区-配电柜前」'], ['告警处理', '标记 AL-2391 为误报'], ['定时任务', '新增定时循迹任务 08:30'], ['路线录制', '完成录制路线「综合楼一层_充电回桩」'], ['任务点', '新增任务点 #10 红外测温'],
  ]
  const o = ops[Math.floor(r() * ops.length)]
  return { k: i, user: ['周工', '赵工', '张杰'][Math.floor(r() * 3)], ip: `10.12.3.${10 + Math.floor(r() * 90)}`, robot: ['DOG-001', 'DOG-002', 'CAR-001', 'DOG-003'][Math.floor(r() * 4)], type: o[0], desc: o[1], ok: r() > 0.1, time: `2026-10-${pad(20 - Math.floor(i / 6))} ${pad(18 - (i % 6) * 2)}:${pad(Math.floor(r() * 60))}:${pad(Math.floor(r() * 60))}` }
})
/** AI 识别提示词（/vision/{id}/llm_prompts） */
export const PROMPTS = [
  { key: 'p_cabinet', name: '配电柜状态识别', cam: '可见光', on: true, text: '识别画面中配电柜柜门是否关闭、指示灯颜色与状态，若存在异常亮灯或柜门打开，输出异常描述。' },
  { key: 'p_clean', name: '异物卫生质检', cam: '可见光', on: true, text: '检查通道及设备表面是否存在遗留物、积水或杂物，并给出位置描述。' },
  { key: 'p_person', name: '人员闯入检测', cam: '可见光', on: true, text: '检测画面中是否出现人员，若出现请判断是否佩戴安全帽与工牌。' },
  { key: 'p_temp', name: '设备测温', cam: '红外', on: true, text: '提取画面中最高温度点及其所在设备，超过 60℃ 时输出告警。' },
  { key: 'p_meter', name: '仪表读数', cam: '可见光', on: false, text: '读取指针式压力表读数，单位 MPa，保留两位小数。' },
]
/** 传感器阈值（原设备详情页「传感器挂载配置」） */
export const SENSORS = [
  { en: 'O2', cn: '氧气', unit: '%VOL', lo: 19.5, hi: 23.5, v: 20.8, on: true }, { en: 'EX', cn: '可燃气体', unit: '%LEL', lo: null, hi: 10, v: 2.1, on: true },
  { en: 'H2S', cn: '硫化氢', unit: 'ppm', lo: null, hi: 10, v: 0.4, on: true }, { en: 'CO', cn: '一氧化碳', unit: 'ppm', lo: null, hi: 24, v: 3.2, on: true },
  { en: 'TEMP', cn: '环境温度', unit: '℃', lo: -10, hi: 45, v: 26.4, on: true }, { en: 'HUMI', cn: '环境湿度', unit: '%RH', lo: null, hi: 85, v: 61, on: true },
]
export { ROUTE_SET }
