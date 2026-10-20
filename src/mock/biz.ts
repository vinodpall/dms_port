/** 机器人业务管理（巡检业务）示例数据 —— 业务字段对齐 robot_web 现有接口（/navigation /tracks /taskpoints /multitasks /scheduled /vision /alerts /operation_logs） */
import { rng, pad } from '@/utils'

export type BizRobotKind = 'dog' | 'car'
export type BizRobotState = 'task' | 'idle' | 'charging' | 'offline'
export interface BizRobot { id: string; name: string; kind: BizRobotKind; model: string; state: BizRobotState; battery: number; speed: number; latency: number; mileage: number; map: string; task?: string; progress?: number; x: number; y: number; yaw: number }
export const ROBOT_STATE: Record<BizRobotState, { t: string; c: string; b: 'processing' | 'success' | 'warning' | 'default' }> = {
  task: { t: '任务中', c: '#26C6DA', b: 'processing' }, idle: { t: '空闲', c: '#4DE8B0', b: 'success' },
  charging: { t: '充电中', c: '#FFB74D', b: 'warning' }, offline: { t: '离线', c: '#5B7486', b: 'default' },
}
export const KIND_META: Record<BizRobotKind, { t: string; glyph: 'quadruped' | 'ugv'; c: string }> = {
  dog: { t: '机器狗', glyph: 'quadruped', c: '#5B9BFF' }, car: { t: '无人车', glyph: 'ugv', c: '#4DE8B0' },
}
export const ROBOTS: BizRobot[] = [
  { id: 'DOG-001', name: '巡检狗 01', kind: 'dog', model: 'X30 Pro', state: 'task', battery: 76, speed: 0.8, latency: 38, mileage: 1286.4, map: '综合楼一层', task: '一层配电室日常巡检', progress: 62, x: 58, y: 38, yaw: 30 },
  { id: 'DOG-002', name: '巡检狗 02', kind: 'dog', model: 'X30 Pro', state: 'task', battery: 54, speed: 0.6, latency: 46, mileage: 964.2, map: '地下管廊', task: '管廊温湿度巡检', progress: 35, x: 30, y: 60, yaw: 180 },
  { id: 'DOG-003', name: '巡检狗 03', kind: 'dog', model: 'B2', state: 'charging', battery: 23, speed: 0, latency: 41, mileage: 702.8, map: '综合楼一层', x: 12, y: 80, yaw: 90 },
  { id: 'CAR-001', name: '巡检车 01', kind: 'car', model: 'Scout 2.0', state: 'idle', battery: 88, speed: 0, latency: 29, mileage: 3210.5, map: '室外园区', x: 70, y: 70, yaw: 0 },
  { id: 'CAR-002', name: '巡检车 02', kind: 'car', model: 'Hunter SE', state: 'offline', battery: 0, speed: 0, latency: 0, mileage: 2480.1, map: '室外园区', x: 0, y: 0, yaw: 0 },
]

/** 步态（对齐 /dog/{id}/dog_command） */
export const GAITS = [
  { k: 'foot_walk', t: '行走步态' }, { k: 'foot_climb', t: '斜坡步态' }, { k: 'foot_obs', t: '越障步态' },
  { k: 'foot_stair', t: '楼梯步态' }, { k: 'foot_stair2', t: '楼梯·累积帧' }, { k: 'foot_stair3', t: '45° 楼梯' },
  { k: 'foot_mountain', t: '山地步态' }, { k: 'foot_silent', t: '静音步态' }, { k: 'foot_l', t: 'L 行走' },
]
export const OBS_MODES = ['无避障', '停障模式', '绕障模式']
export const ACTIONS = [
  { t: '可见光识别', c: '#4DD0E1' }, { t: '红外测温', c: '#FF8A50' }, { t: '仪表读数', c: '#5B9BFF' },
  { t: '气体检测', c: '#4DE8B0' }, { t: '录像', c: '#B48CFF' }, { t: '语音播报', c: '#FFB74D' }, { t: '到点停留', c: '#8FB3C7' },
]

/* ---------------- 地图 / 路线 / 数据包 ---------------- */
export type MapKind = '栅格地图' | '点云地图' | '融合地图'
export interface BizMap { id: string; name: string; kind: MapKind; area: number; res: number; size: string; routes: number; updated: string; robot: string; current?: boolean; seed: number }
export const MAPS: BizMap[] = [
  { id: 'MAP-01', name: '综合楼一层', kind: '融合地图', area: 3200, res: 0.05, size: '1280×860', routes: 4, updated: '2026-10-16', robot: 'DOG-001', current: true, seed: 11 },
  { id: 'MAP-02', name: '地下管廊', kind: '栅格地图', area: 1800, res: 0.05, size: '2400×420', routes: 2, updated: '2026-10-12', robot: 'DOG-002', seed: 23 },
  { id: 'MAP-03', name: '室外园区', kind: '融合地图', area: 26000, res: 0.1, size: '1800×1500', routes: 3, updated: '2026-10-08', robot: 'CAR-001', seed: 37 },
  { id: 'MAP-04', name: '综合楼二层', kind: '点云地图', area: 3000, res: 0.05, size: '1260×840', routes: 1, updated: '2026-09-27', robot: 'DOG-003', seed: 41 },
]
export interface BizRoute { id: string; name: string; map: string; len: number; pts: number; closed: boolean; smooth: boolean; created: string; seed: number }
export const ROUTES: BizRoute[] = [
  { id: 'RT-01', name: '配电室环线', map: '综合楼一层', len: 186.4, pts: 412, closed: true, smooth: true, created: '2026-10-15', seed: 3 },
  { id: 'RT-02', name: '机房南北通道', map: '综合楼一层', len: 92.7, pts: 205, closed: false, smooth: true, created: '2026-10-14', seed: 7 },
  { id: 'RT-03', name: '消防通道巡查', map: '综合楼一层', len: 128.3, pts: 298, closed: true, smooth: false, created: '2026-10-10', seed: 13 },
  { id: 'RT-04', name: '充电回桩', map: '综合楼一层', len: 24.1, pts: 60, closed: false, smooth: true, created: '2026-10-02', seed: 17 },
  { id: 'RT-05', name: '管廊 A 段', map: '地下管廊', len: 310.0, pts: 690, closed: false, smooth: true, created: '2026-10-11', seed: 19 },
  { id: 'RT-06', name: '园区外围', map: '室外园区', len: 1240.5, pts: 2310, closed: true, smooth: true, created: '2026-10-07', seed: 29 },
]
export const BAGS = [
  { name: 'bag_20261016_0930', robot: 'DOG-001', map: '综合楼一层', size: '3.6 GB', dur: '18 分 42 秒', time: '2026-10-16 09:30', state: '已生成地图' },
  { name: 'bag_20261012_1410', robot: 'DOG-002', map: '地下管廊', size: '5.1 GB', dur: '26 分 10 秒', time: '2026-10-12 14:10', state: '已生成地图' },
  { name: 'bag_20261008_1020', robot: 'CAR-001', map: '室外园区', size: '9.8 GB', dur: '41 分 05 秒', time: '2026-10-08 10:20', state: '已生成地图' },
  { name: 'bag_20261019_1605', robot: 'DOG-003', map: '—', size: '2.2 GB', dur: '11 分 37 秒', time: '2026-10-19 16:05', state: '未建图' },
]
/** 功能区（地图编辑） */
export const ZONES = [
  { k: 'forbid', t: '禁行区', c: '#FF6B6B' }, { k: 'stair', t: '楼梯', c: '#FFB74D' }, { k: 'slope', t: '斜坡', c: '#B48CFF' },
  { k: 'narrow', t: '窄通道', c: '#4DD0E1' }, { k: 'grass', t: '草地', c: '#4DE8B0' },
] as const

/* ---------------- 任务 ---------------- */
export type TaskKind = '循迹任务' | '发布点任务'
export interface TaskPoint { no: number; action: string; x: number; y: number; z: number; yaw: number; preset: string; gait: string; obs: string; pass: boolean; always: boolean; desc: string }
export interface BizTask { id: string; name: string; kind: TaskKind; map: string; route?: string; robot: string; pts: TaskPoint[]; lastRun: string; runs: number; state: '执行中' | '就绪' | '草稿' }
const mkPts = (seed: number, n: number): TaskPoint[] => {
  const r = rng(seed)
  return Array.from({ length: n }, (_, i) => ({
    no: i + 1, action: ACTIONS[Math.floor(r() * 5)].t, x: +(r() * 40 - 10).toFixed(2), y: +(r() * 30 - 8).toFixed(2), z: 0, yaw: Math.round(r() * 360 - 180),
    preset: r() > 0.4 ? `预置点 ${1 + Math.floor(r() * 8)}` : '—', gait: GAITS[Math.floor(r() * 4)].t, obs: OBS_MODES[1 + Math.floor(r() * 2)],
    pass: r() > 0.75, always: r() > 0.6, desc: ['配电柜 1# 柜门', '变压器温度', '压力表 P-03', '消防栓', '电缆桥架', '气体监测点', 'UPS 指示灯', '空调出风口'][Math.floor(r() * 8)],
  }))
}
export const TASKS: BizTask[] = [
  { id: 'T-101', name: '一层配电室日常巡检', kind: '循迹任务', map: '综合楼一层', route: '配电室环线', robot: 'DOG-001', pts: mkPts(5, 9), lastRun: '10-20 08:30', runs: 128, state: '执行中' },
  { id: 'T-102', name: '机房夜间巡查', kind: '循迹任务', map: '综合楼一层', route: '机房南北通道', robot: 'DOG-003', pts: mkPts(8, 6), lastRun: '10-19 22:00', runs: 64, state: '就绪' },
  { id: 'T-103', name: '消防设施点检', kind: '发布点任务', map: '综合楼一层', robot: 'DOG-001', pts: mkPts(12, 7), lastRun: '10-18 14:00', runs: 22, state: '就绪' },
  { id: 'T-104', name: '管廊温湿度巡检', kind: '循迹任务', map: '地下管廊', route: '管廊 A 段', robot: 'DOG-002', pts: mkPts(15, 10), lastRun: '10-20 09:10', runs: 87, state: '执行中' },
  { id: 'T-105', name: '园区外围安防', kind: '循迹任务', map: '室外园区', route: '园区外围', robot: 'CAR-001', pts: mkPts(21, 8), lastRun: '10-19 19:30', runs: 45, state: '就绪' },
  { id: 'T-106', name: '仪表读数专项', kind: '发布点任务', map: '综合楼一层', robot: 'DOG-003', pts: mkPts(27, 5), lastRun: '—', runs: 0, state: '草稿' },
]
export const MULTI_GROUPS = [
  { id: 'MG-01', name: '一层全区联巡', robot: 'DOG-001', inPlace: true, steps: [
    { map: '综合楼一层', track: '配电室环线', group: '一层配电室日常巡检', mode: '循迹模式', laps: 2, obs: '停障模式', origin: true },
    { map: '综合楼一层', track: '—', group: '消防设施点检', mode: '发布点模式', laps: 1, obs: '绕障模式', origin: false },
    { map: '综合楼一层', track: '充电回桩', group: '回桩充电', mode: '循迹模式', laps: 1, obs: '停障模式', origin: false },
  ] },
  { id: 'MG-02', name: '夜间机房 + 管廊', robot: 'DOG-002', inPlace: false, steps: [
    { map: '综合楼一层', track: '机房南北通道', group: '机房夜间巡查', mode: '循迹模式', laps: 1, obs: '停障模式', origin: true },
    { map: '地下管廊', track: '管廊 A 段', group: '管廊温湿度巡检', mode: '循迹模式', laps: 1, obs: '绕障模式', origin: true },
  ] },
]
export const SCHEDULES = [
  { id: 'S-01', name: '配电室早巡', task: '一层配电室日常巡检', robot: 'DOG-001', cycle: '每天', time: '08:30', next: '10-21 08:30', on: true },
  { id: 'S-02', name: '配电室午巡', task: '一层配电室日常巡检', robot: 'DOG-001', cycle: '每天', time: '14:00', next: '10-20 14:00', on: true },
  { id: 'S-03', name: '机房夜巡', task: '机房夜间巡查', robot: 'DOG-003', cycle: '工作日', time: '22:00', next: '10-20 22:00', on: true },
  { id: 'S-04', name: '管廊例巡', task: '管廊温湿度巡检', robot: 'DOG-002', cycle: '每天', time: '09:10', next: '10-21 09:10', on: true },
  { id: 'S-05', name: '园区周末安防', task: '园区外围安防', robot: 'CAR-001', cycle: '每周六、日', time: '19:30', next: '10-25 19:30', on: false },
]

/* ---------------- 巡检记录 / 告警 / 日志 ---------------- */
export const ALARM_TYPES = [
  { t: '设备异常', c: '#FF6B6B' }, { t: '温度超限', c: '#FF8A50' }, { t: '仪表异常', c: '#FFB74D' },
  { t: '人员闯入', c: '#B48CFF' }, { t: '异物/遗留物', c: '#5B9BFF' }, { t: '气体超标', c: '#4DE8B0' },
]
export interface BizAlarm { id: string; time: string; robot: string; cam: '可见光' | '红外'; type: string; content: string; desc: string; pos: string; task: string; state: '待处理' | '已处理' | '误报'; seed: number; who?: string }
export const ALARMS: BizAlarm[] = (() => {
  const r = rng(99)
  const contents: Record<string, string[]> = {
    设备异常: ['配电柜 2# 指示灯异常熄灭', 'UPS 面板告警灯亮起'], 温度超限: ['变压器 T1 表面温度 78.6℃', '电缆接头温度 65.2℃'],
    仪表异常: ['压力表 P-03 读数 1.86 MPa 超上限', 'SF6 密度表指针偏低'], 人员闯入: ['配电室发现未授权人员', '管廊入口有人员逗留'],
    '异物/遗留物': ['通道内发现遗留纸箱', '设备顶部有异物'], 气体超标: ['可燃气体浓度 12% LEL', 'O₂ 浓度 18.6% 偏低'],
  }
  return Array.from({ length: 16 }, (_, i) => {
    const ty = ALARM_TYPES[Math.floor(r() * ALARM_TYPES.length)]
    const c = contents[ty.t][Math.floor(r() * 2)]
    const rb = ROBOTS[Math.floor(r() * 4)]
    return { id: `AL-${2400 - i}`, time: `10-${pad(20 - Math.floor(i / 5))} ${pad(9 - (i % 5) * 2 + 9)}:${pad(Math.floor(r() * 60))}`, robot: rb.id, cam: ty.t === '温度超限' ? '红外' : '可见光', type: ty.t, content: c,
      desc: 'AI 识别置信度 ' + (0.82 + r() * 0.16).toFixed(2), pos: `(${(r() * 40).toFixed(1)}, ${(r() * 30).toFixed(1)})`, task: TASKS[Math.floor(r() * 5)].name,
      state: i < 5 ? '待处理' : r() > 0.3 ? '已处理' : '误报', seed: 100 + i, who: i < 5 ? undefined : ['周工', '赵工'][i % 2] }
  })
})()
export const ROUNDS = Array.from({ length: 12 }, (_, i) => {
  const r = rng(300 + i)
  const t = TASKS[i % 5]
  const total = t.pts.length * (i % 3 === 0 ? 2 : 1)
  const bad = Math.floor(r() * 3)
  return { id: `RD-${8820 - i}`, task: t.name, kind: t.kind, robot: t.robot, map: t.map, start: `10-${pad(20 - Math.floor(i / 3))} ${pad([8, 14, 22][i % 3])}:${pad(Math.floor(r() * 50))}`, dur: `${18 + Math.floor(r() * 30)} 分`, total, bad, ok: total - bad, state: i === 0 ? '执行中' : r() > 0.12 ? '已完成' : '中断' }
})
export const OP_LOGS = Array.from({ length: 14 }, (_, i) => {
  const r = rng(500 + i)
  const ops = [
    ['任务下发', '下发循迹任务「一层配电室日常巡检」'], ['步态切换', '切换为楼梯步态'], ['急停', '触发软件急停'], ['导航控制', '开始导航'],
    ['地图编辑', '新增功能区「禁行区-配电柜前」'], ['告警处理', '标记 AL-2391 为误报'], ['定时计划', '启用定时计划「配电室午巡」'], ['路线录制', '完成录制路线「消防通道巡查」'],
  ]
  const o = ops[Math.floor(r() * ops.length)]
  return { k: i, user: ['周工', '赵工', '张杰'][Math.floor(r() * 3)], ip: `10.12.3.${10 + Math.floor(r() * 90)}`, robot: ROBOTS[Math.floor(r() * 4)].id, type: o[0], desc: o[1], time: `2026-10-${pad(20 - Math.floor(i / 4))} ${pad(16 - (i % 4) * 3)}:${pad(Math.floor(r() * 60))}:${pad(Math.floor(r() * 60))}`, ok: r() > 0.08 }
})
/** AI 识别提示词（对齐 /vision/{id}/llm_prompts） */
export const PROMPTS = [
  { name: '配电柜状态识别', cam: '可见光', on: true, text: '识别画面中配电柜柜门是否关闭、指示灯颜色与状态，若存在异常亮灯或柜门打开，输出异常描述。' },
  { name: '异物卫生质检', cam: '可见光', on: true, text: '检查通道及设备表面是否存在遗留物、积水或杂物，并给出位置描述。' },
  { name: '人员闯入检测', cam: '可见光', on: true, text: '检测画面中是否出现人员，若出现请判断是否佩戴安全帽与工牌。' },
  { name: '设备测温', cam: '红外', on: true, text: '提取画面中最高温度点及其所在设备，超过 60℃ 时输出告警。' },
  { name: '仪表读数', cam: '可见光', on: false, text: '读取指针式压力表读数，单位 MPa，保留两位小数。' },
]
/** 传感器阈值（原设备详情页「传感器挂载配置」） */
export const SENSORS = [
  { en: 'O2', cn: '氧气', unit: '%VOL', lo: 19.5, hi: 23.5, v: 20.8, on: true }, { en: 'EX', cn: '可燃气体', unit: '%LEL', lo: null, hi: 10, v: 2.1, on: true },
  { en: 'H2S', cn: '硫化氢', unit: 'ppm', lo: null, hi: 10, v: 0.4, on: true }, { en: 'CO', cn: '一氧化碳', unit: 'ppm', lo: null, hi: 24, v: 3.2, on: true },
  { en: 'TEMP', cn: '环境温度', unit: '℃', lo: -10, hi: 45, v: 26.4, on: true }, { en: 'HUMI', cn: '环境湿度', unit: '%RH', lo: null, hi: 85, v: 61, on: true },
]
