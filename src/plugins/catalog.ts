/**
 * 插件目录（原型模拟）：插件启动后向平台注册，上报 manifest（插件信息 + 所支持型号的设备描述）
 * 真实环境由后端 /device/plugins、/device/models/{code}/descriptor 提供
 */
import { reactive } from 'vue'
import type { ControlDef, Descriptor, PluginInfo, TelemetryField, ConnField } from './types'

/* ---------------- 通用字段 / 控件片段 ---------------- */
const F = {
  battery: (): TelemetryField => ({ key: 'battery', label: '电量', type: 'percent', unit: '%', role: 'battery', display: ['kpi', 'card', 'detail', 'hud'], warn: '<20', sim: { min: 20, max: 100, drift: 0.2 } }),
  speed: (max = 1.5): TelemetryField => ({ key: 'speed', label: '速度', type: 'number', unit: 'm/s', precision: 2, role: 'speed', display: ['kpi', 'detail', 'chart', 'hud'], sim: { min: 0, max, drift: 0.25 } }),
  odometer: (): TelemetryField => ({ key: 'odometer', label: '运动里程', type: 'number', unit: 'km', precision: 2, role: 'odometer', display: ['kpi', 'detail'], sim: { min: 10, max: 1800, drift: 0.01 } }),
  pose: (): TelemetryField => ({ key: 'pose', label: '坐标', type: 'pose2d', role: 'location', display: ['map', 'detail'] }),
  latency: (): TelemetryField => ({ key: 'latency', label: '网络延迟', type: 'number', unit: 'ms', role: 'latency', group: '通信', display: ['detail', 'card', 'hud'], warn: '>120', sim: { min: 18, max: 80, drift: 6 } }),
  uptime: (): TelemetryField => ({ key: 'uptime', label: '运行时长', type: 'duration', unit: 's', role: 'uptime', display: ['kpi', 'card', 'detail'], sim: { min: 3600, max: 36000, drift: 0 } }),
  temp: (label = '电机温度', max = 85): TelemetryField => ({ key: 'motorTemp', label, type: 'number', unit: '℃', precision: 1, role: 'temperature', group: '健康', display: ['detail', 'chart'], warn: `>${max - 10}`, sim: { min: 36, max: max - 18, drift: 0.6 } }),
  cpu: (): TelemetryField => ({ key: 'cpu', label: 'CPU', type: 'percent', unit: '%', group: '系统', display: ['detail'], warn: '>90', sim: { min: 20, max: 70, drift: 3 } }),
  voltage: (lo: number, hi: number): TelemetryField => ({ key: 'voltage', label: '电压', type: 'number', unit: 'V', precision: 1, group: '电源', display: ['detail'], sim: { min: lo, max: hi, drift: 0.1 } }),
}
const ESTOP: ControlDef = { key: 'estop', label: '急停', kind: 'button', group: 'safety', danger: true, desc: '立即停止所有运动', costMs: 300 }
const TELEOP = (max: number, axes = ['vx', 'vy', 'wz']): ControlDef => ({ key: 'teleop', label: '遥操作', kind: 'joystick', group: 'teleop', axes, maxSpeed: max, heartbeatMs: 200 })
const NAV: ControlDef = { key: 'navEnable', label: '导航', kind: 'toggle', group: 'navigation', stateKey: 'navOn', onLabel: '导航开启', offLabel: '导航关闭' }
const TASK: ControlDef = { key: 'taskEnable', label: '任务', kind: 'toggle', group: 'task', stateKey: 'taskOn', onLabel: '任务运行', offLabel: '任务停止' }
const DOCK: ControlDef[] = [
  { key: 'dock', label: '自主充电', kind: 'button', group: 'charge', confirm: '确认让设备返回充电桩充电？', costMs: 4000, effect: { charging: true } },
  { key: 'undock', label: '结束充电', kind: 'button', group: 'charge', costMs: 1500, effect: { charging: false } },
]
const SPEAK: ControlDef = { key: 'speak', label: '语音播报', kind: 'button', group: 'voice', costMs: 2500, params: [{ key: 'text', label: '播报内容', type: 'string', maxLength: 100, required: true, default: '您好，欢迎光临' }, { key: 'volume', label: '音量', type: 'number', min: 0, max: 100, step: 10, default: 60, unit: '%' }] }
const NET: ConnField[] = [
  { key: 'ip', label: '设备 IP', type: 'string', required: true, placeholder: '如 192.168.1.20' },
  { key: 'port', label: '端口', type: 'number', required: true },
]

/* ---------------- 品类模板 ---------------- */
function quadruped(o: { flip?: boolean; dance?: boolean; max?: number; gaits?: string[]; conn?: ConnField[] } = {}): Omit<Descriptor, 'pluginId' | 'model'> {
  const gaits = o.gaits ?? ['行走', '小跑', '爬楼', '斜坡']
  return {
    schemaVersion: '1.0',
    capabilities: ['status', 'telemetry', 'location', 'video', 'teleop', 'posture', 'action', 'charge', 'navigation', 'task', 'map', 'alarm', 'log'],
    telemetry: [
      F.battery(), F.odometer(), F.speed(o.max ?? 1.5), F.pose(),
      { key: 'posture', label: '姿态', type: 'enum', options: { stand: '站立', lie: '趴下', crawl: '匍匐' }, display: ['card', 'detail', 'hud'], sim: { values: ['stand'] } },
      { key: 'gait', label: '步态', type: 'enum', options: Object.fromEntries(gaits.map((g, i) => [`g${i}`, g])), display: ['detail', 'hud'], sim: { values: ['g0'] } },
      F.temp(), F.voltage(48, 56), F.latency(),
    ],
    controls: [
      ESTOP,
      { key: 'posture', label: '姿态', kind: 'select', group: 'posture', stateKey: 'posture', options: [{ value: 'stand', label: '站立' }, { value: 'lie', label: '趴下' }, { value: 'crawl', label: '匍匐' }], costMs: 1800 },
      { key: 'gait', label: '步态', kind: 'select', group: 'posture', stateKey: 'gait', options: gaits.map((g, i) => ({ value: `g${i}`, label: g })), costMs: 800 },
      { key: 'bodyHeight', label: '机身高度', kind: 'slider', group: 'posture', stateKey: 'bodyHeight', min: 0.2, max: 0.4, step: 0.01, unit: 'm', costMs: 600 },
      { key: 'forceCtl', label: '力控模式', kind: 'toggle', group: 'posture', stateKey: 'forceOn', costMs: 600 },
      TELEOP(o.max ?? 1.5),
      { key: 'hello', label: '打招呼', kind: 'button', group: 'action', costMs: 3000 },
      { key: 'stretch', label: '伸懒腰', kind: 'button', group: 'action', costMs: 3500 },
      ...(o.dance ? [{ key: 'dance', label: '跳舞', kind: 'button', group: 'action', costMs: 6000, params: [{ key: 'song', label: '舞曲', type: 'enum', options: { d1: '舞蹈一', d2: '舞蹈二' }, default: 'd1' }] } as ControlDef] : []),
      ...(o.flip ? [{ key: 'flip', label: '翻跟头', kind: 'button', group: 'action', danger: true, confirm: '请确认设备周围 2 米内无人员和障碍物', costMs: 4000 } as ControlDef] : []),
      ...DOCK, NAV, TASK,
    ],
    video: [{ key: 'front', label: '前视' }, { key: 'ir', label: '红外', ir: true }],
    navigation: { mapType: 'pointcloud', supports: ['bag', 'map', 'grid', 'relocate', 'route'] },
    task: { types: ['循迹任务', '发布点任务', '多任务组', '定时任务'], pointActions: ['可见光拍照', '红外测温', '表计识别', '录像', '到点停留'] },
    connection: o.conn ?? [...NET, { key: 'netIface', label: '网卡', type: 'enum', options: { eth0: 'eth0', wlan0: 'wlan0' }, default: 'eth0' }],
  }
}
function ugv(o: { max?: number; weeder?: boolean } = {}): Omit<Descriptor, 'pluginId' | 'model'> {
  return {
    schemaVersion: '1.0',
    capabilities: ['status', 'telemetry', 'location', 'video', 'teleop', 'charge', 'navigation', 'task', 'map', 'alarm', 'log', ...(o.weeder ? ['skill' as const] : [])],
    telemetry: [F.battery(), F.odometer(), F.speed(o.max ?? 1.5), F.pose(), F.temp('驱动器温度'), F.cpu(), F.voltage(23, 29), F.latency()],
    controls: [
      ESTOP, TELEOP(o.max ?? 1.5, ['vx', 'wz']),
      { key: 'light', label: '照明灯', kind: 'toggle', group: 'system', stateKey: 'lightOn', costMs: 400 },
      { key: 'horn', label: '鸣笛', kind: 'button', group: 'system', costMs: 800 },
      ...(o.weeder ? [
        { key: 'mow', label: '除草作业', kind: 'toggle', group: 'skill', stateKey: 'mowOn', confirm: '开启后刀盘将旋转，请确认作业区域无人', costMs: 1500 } as ControlDef,
        { key: 'bladeHeight', label: '刀盘高度', kind: 'slider', group: 'skill', stateKey: 'blade', min: 2, max: 10, step: 1, unit: 'cm', costMs: 800 } as ControlDef,
      ] : []),
      ...DOCK, NAV, TASK,
    ],
    video: [{ key: 'front', label: '前视' }, { key: 'ir', label: '红外', ir: true }],
    navigation: { mapType: 'gps', supports: ['ins', 'msf', 'route'] },
    task: { types: ['循迹任务', '发布点任务', '多任务组', '定时任务'], pointActions: ['可见光拍照', '红外测温', '气体检测', '到点停留'] },
    connection: [...NET, { key: 'rosDomain', label: 'ROS_DOMAIN_ID', type: 'number', default: 0 }],
  }
}
function uav(o: { dock?: boolean; max?: number } = {}): Omit<Descriptor, 'pluginId' | 'model'> {
  return {
    schemaVersion: '1.0',
    capabilities: ['status', 'telemetry', 'location', 'video', 'teleop', 'alarm', 'log', ...(o.dock ? ['custom:dock' as const, 'charge' as const] : [])],
    telemetry: [
      F.battery(), F.speed(o.max ?? 15), F.pose(),
      { key: 'alt', label: '相对高度', type: 'number', unit: 'm', precision: 1, role: 'altitude', display: ['kpi', 'card', 'detail', 'hud'], sim: { min: 0, max: 0, drift: 0 } },
      { key: 'sats', label: '卫星数', type: 'number', role: 'count', group: '定位', display: ['detail'], warn: '<10', sim: { min: 14, max: 26, drift: 1 } },
      { key: 'flight', label: '飞行状态', type: 'enum', options: { ground: '停机', hover: '悬停', fly: '飞行', rth: '返航中' }, display: ['card', 'detail', 'hud'], sim: { values: ['ground'] } },
      F.latency(),
      ...(o.dock ? [{ key: 'cover', label: '舱盖', type: 'enum', options: { open: '已打开', closed: '已关闭' }, group: '机场', display: ['detail'], sim: { values: ['closed'] } } as TelemetryField] : []),
    ],
    controls: [
      { key: 'estop', label: '紧急悬停', kind: 'button', group: 'safety', danger: true, costMs: 300, effect: { flight: 'hover' } },
      { key: 'takeoff', label: '起飞', kind: 'button', group: 'flight', confirm: '确认起飞？请确认起飞区域净空', costMs: 4000, effect: { flight: 'hover', alt: 10 }, params: [{ key: 'height', label: '起飞高度', type: 'number', min: 2, max: 120, step: 1, unit: 'm', default: 10 }] },
      { key: 'land', label: '降落', kind: 'button', group: 'flight', costMs: 5000, effect: { flight: 'ground', alt: 0 } },
      { key: 'rth', label: '一键返航', kind: 'button', group: 'flight', confirm: '确认返航？', costMs: 6000, effect: { flight: 'ground', alt: 0 } },
      { key: 'gimbal', label: '云台俯仰', kind: 'slider', group: 'flight', stateKey: 'pitch', min: -90, max: 30, step: 5, unit: '°', costMs: 400 },
      TELEOP(o.max ?? 15, ['vx', 'vy', 'vz', 'wz']),
      ...(o.dock ? [
        { key: 'cover', label: '机场舱盖', kind: 'toggle', group: 'charge', stateKey: 'coverOpen', onLabel: '舱盖已开', offLabel: '舱盖已关', costMs: 5000 } as ControlDef,
        { key: 'dockCharge', label: '机场充电', kind: 'button', group: 'charge', costMs: 2000, effect: { charging: true } } as ControlDef,
      ] : []),
    ],
    video: [{ key: 'wide', label: '广角' }, { key: 'zoom', label: '变焦' }, { key: 'ir', label: '红外', ir: true }],
    connection: [...NET, { key: 'appKey', label: 'App Key', type: 'password', required: true }],
  }
}
function humanoid(): Omit<Descriptor, 'pluginId' | 'model'> {
  return {
    schemaVersion: '1.0',
    capabilities: ['status', 'telemetry', 'video', 'posture', 'action', 'voice', 'alarm', 'log'],
    telemetry: [
      F.battery(), F.uptime(),
      { key: 'joint', label: '关节状态', type: 'enum', options: { ok: '正常', warn: '异常' }, display: ['card', 'detail'], sim: { values: ['ok'] } },
      F.temp('关节最高温度', 80), F.voltage(44, 54), F.latency(),
    ],
    controls: [
      ESTOP,
      { key: 'posture', label: '姿态', kind: 'select', group: 'posture', stateKey: 'posture', options: [{ value: 'stand', label: '站立' }, { value: 'sit', label: '坐下' }, { value: 'zero', label: '零位' }], costMs: 3000 },
      { key: 'wave', label: '挥手', kind: 'button', group: 'action', costMs: 2500 },
      { key: 'bow', label: '鞠躬', kind: 'button', group: 'action', costMs: 2500 },
      { key: 'shake', label: '握手', kind: 'button', group: 'action', costMs: 3000 },
      { key: 'dance', label: '跳舞', kind: 'button', group: 'action', costMs: 8000 },
      SPEAK,
    ],
    video: [{ key: 'head', label: '头部' }],
    connection: NET,
  }
}

/* ---------------- 服务类设备 ---------------- */
const coffee = (): Omit<Descriptor, 'pluginId' | 'model'> => ({
  schemaVersion: '1.0',
  capabilities: ['status', 'telemetry', 'skill', 'voice', 'log'],
  telemetry: [
    F.battery(), F.uptime(),
    { key: 'cups', label: '今日出杯', type: 'number', unit: '杯', role: 'count', display: ['kpi', 'card', 'detail'], sim: { min: 12, max: 60, drift: 0 } },
    { key: 'beans', label: '咖啡豆余量', type: 'percent', unit: '%', group: '耗材', display: ['detail'], warn: '<15', sim: { min: 30, max: 90, drift: 0 } },
  ],
  controls: [
    { key: 'pourCoffee', label: '倒咖啡', kind: 'button', group: 'skill', icon: 'coffee', desc: '制作并递出一杯咖啡', costMs: 6000,
      params: [{ key: 'drink', label: '饮品', type: 'enum', options: { americano: '美式', latte: '拿铁', espresso: '浓缩' }, default: 'americano' }, { key: 'cup', label: '杯型', type: 'enum', options: { S: '小杯', M: '中杯', L: '大杯' }, default: 'M' }] },
    { key: 'washCup', label: '洗杯子', kind: 'button', group: 'skill', icon: 'wash', desc: '清洗并归位杯具', costMs: 5000 },
    { key: 'action', label: '动作', kind: 'button', group: 'skill', icon: 'action', desc: '执行预置机械臂动作', costMs: 3000,
      params: [{ key: 'name', label: '动作', type: 'enum', options: { wave: '挥手', bow: '致谢', heart: '比心' }, default: 'wave' }] },
    { ...SPEAK, group: 'skill', icon: 'voice', desc: '通过扬声器播报文字' },
  ],
  connection: [{ key: 'baseUrl', label: '接口地址', type: 'string', required: true, placeholder: 'http://192.168.1.30:8080' }, { key: 'token', label: '访问令牌', type: 'password', required: true }],
})
const greeter = (): Omit<Descriptor, 'pluginId' | 'model'> => ({
  schemaVersion: '1.0',
  capabilities: ['status', 'telemetry', 'location', 'video', 'skill', 'action', 'voice', 'charge', 'log'],
  telemetry: [
    F.battery(), F.uptime(),
    { key: 'visitors', label: '今日接待', type: 'number', unit: '人次', role: 'count', display: ['kpi', 'card', 'detail'], sim: { min: 40, max: 160, drift: 0 } },
    F.pose(), F.latency(),
  ],
  controls: [
    ESTOP,
    { key: 'greet', label: '迎宾问候', kind: 'button', group: 'skill', icon: 'greet', desc: '识别来访者并主动问候', costMs: 3000 },
    { key: 'guide', label: '引领带路', kind: 'button', group: 'skill', icon: 'guide', desc: '带领访客前往指定地点', costMs: 8000,
      params: [{ key: 'to', label: '目的地', type: 'enum', options: { hall: '展厅', meet: '会议室', lift: '电梯间', rest: '休息区' }, default: 'hall' }] },
    { key: 'explain', label: '讲解', kind: 'button', group: 'skill', icon: 'explain', desc: '播放展项讲解词', costMs: 8000,
      params: [{ key: 'topic', label: '讲解内容', type: 'enum', options: { intro: '园区介绍', robot: '机器人展区', safety: '安全须知' }, default: 'intro' }] },
    { key: 'photo', label: '拍照合影', kind: 'button', group: 'skill', icon: 'photo', costMs: 4000 },
    { key: 'patrolWelcome', label: '迎宾模式', kind: 'toggle', group: 'skill', stateKey: 'welcomeOn', desc: '开启后自动识别并迎接来访者', costMs: 800 },
    { key: 'wave', label: '挥手', kind: 'button', group: 'action', costMs: 2000 },
    { key: 'bow', label: '鞠躬', kind: 'button', group: 'action', costMs: 2000 },
    SPEAK, ...DOCK,
  ],
  video: [{ key: 'head', label: '头部' }],
  connection: NET,
})
const chess = (): Omit<Descriptor, 'pluginId' | 'model'> => ({
  schemaVersion: '1.0',
  capabilities: ['status', 'telemetry', 'skill', 'voice', 'log', 'custom:chess'],
  telemetry: [
    F.uptime(),
    { key: 'games', label: '今日对局', type: 'number', unit: '局', role: 'count', display: ['kpi', 'card', 'detail'], sim: { min: 6, max: 24, drift: 0 } },
    { key: 'winRate', label: '机器人胜率', type: 'percent', unit: '%', display: ['kpi', 'detail'], sim: { min: 62, max: 88, drift: 0 } },
    { key: 'game', label: '对局状态', type: 'enum', options: { idle: '空闲', playing: '对局中', review: '复盘中' }, display: ['card', 'detail'], sim: { values: ['idle'] } },
    { key: 'moves', label: '当前手数', type: 'number', unit: '手', display: ['detail'], sim: { min: 0, max: 0, drift: 0 } },
  ],
  controls: [
    { key: 'startGame', label: '开始对局', kind: 'button', group: 'skill', icon: 'play', desc: '摆好棋子后开始新对局', costMs: 2500, effect: { game: 'playing', moves: 0 },
      params: [{ key: 'kind', label: '棋类', type: 'enum', options: { xiangqi: '中国象棋', gomoku: '五子棋', go: '围棋' }, default: 'xiangqi' }, { key: 'level', label: '难度', type: 'enum', options: { easy: '入门', mid: '进阶', hard: '大师' }, default: 'mid' }, { key: 'first', label: '先手', type: 'enum', options: { human: '人类先手', robot: '机器人先手' }, default: 'human' }] },
    { key: 'undo', label: '悔棋', kind: 'button', group: 'skill', icon: 'undo', costMs: 2000 },
    { key: 'review', label: '复盘讲解', kind: 'button', group: 'skill', icon: 'review', costMs: 4000, effect: { game: 'review' } },
    { key: 'endGame', label: '结束对局', kind: 'button', group: 'skill', icon: 'stop', confirm: '确认结束当前对局？', costMs: 1500, effect: { game: 'idle' } },
    { key: 'arrange', label: '整理棋盘', kind: 'button', group: 'skill', icon: 'arrange', desc: '机械臂自动收子归位', costMs: 9000 },
    SPEAK,
  ],
  connection: [{ key: 'ws', label: 'WebSocket 地址', type: 'string', required: true, placeholder: 'ws://192.168.1.40:9001' }],
})

/* ---------------- 型号 → 描述 ---------------- */
type Tpl = Omit<Descriptor, 'pluginId' | 'model'>
const D = (code: string, name: string, category: string, pluginId: string, tpl: Tpl, tags: string[] = []): Descriptor => ({ ...tpl, pluginId, model: { code, name, category, tags } })

export const DESCRIPTORS: Record<string, Descriptor> = Object.fromEntries([
  D('qd-b2', 'B2', 'quadruped', 'unitree-sdk2', quadruped({ max: 6, dance: false }), ['巡检']),
  D('qd-go2', 'Go2 EDU', 'quadruped', 'unitree-sdk2', quadruped({ max: 3.7, dance: true, flip: true }), ['教育', '表演']),
  D('qd-x30', 'X30', 'quadruped', 'deeprobotics-ros2', quadruped({ max: 4, gaits: ['行走', '斜坡', '越障', '楼梯', '山地', '静音'] }), ['巡检', '工业']),
  D('qd-lite3', 'Lite3', 'quadruped', 'deeprobotics-ros2', quadruped({ max: 2.5, dance: true }), ['教育']),
  D('qd-spot', 'Spot', 'quadruped', 'bd-spot-sdk', quadruped({ max: 1.6, dance: true }), ['巡检']),
  D('qd-zsl1', 'ZSL-1', 'quadruped', 'zsl-ros2', quadruped({ max: 3, dance: true }), ['巡检']),
  D('ug-scout', 'Scout 2.0', 'ugv', 'agilex-ros2', ugv({ max: 1.5 }), ['巡检']),
  D('ug-hunter', 'Hunter SE', 'ugv', 'agilex-ros2', ugv({ max: 4.8 }), ['巡检']),
  D('ug-bunker', 'Bunker Mini', 'ugv', 'agilex-ros2', ugv({ max: 1.5 }), ['越野']),
  D('ug-knight', '骑士巡逻', 'ugv', 'generic-ros2', ugv({ max: 2 }), ['安防']),
  D('ug-weeder', '除草机器人', 'ugv', 'generic-ros2', ugv({ max: 1.2, weeder: true }), ['园林']),
  D('ua-m350', 'M350 RTK', 'uav', 'dji-psdk', uav({ max: 23 })),
  D('ua-m30t', 'M30T', 'uav', 'dji-psdk', uav({ max: 23 })),
  D('ua-m3e', 'Mavic 3E', 'uav', 'dji-psdk', uav({ max: 21 })),
  D('ua-m4t', 'Matrice 4T', 'uav', 'dji-psdk', uav({ max: 21 })),
  D('ua-dock3', '机场 3', 'uav', 'dji-psdk', uav({ max: 21, dock: true }), ['机场']),
  D('ua-x500', 'X500 V2', 'uav', 'px4-mavlink', uav({ max: 15 }), ['科研']),
  D('hm-walker', 'Walker S1', 'humanoid', 'ubtech-ros2', humanoid()),
  D('hm-h1', 'H1', 'humanoid', 'unitree-sdk2', humanoid()),
  D('hm-x2', 'X2', 'humanoid', 'agibot-sdk', humanoid()),
  D('sv-coffee', '咖啡机器人 C1', 'service', 'barista-http', coffee(), ['服务', '固定工位']),
  D('sv-greeter', '迎宾机器人 W2', 'service', 'greeter-sdk', greeter(), ['服务', '接待']),
  D('sv-chess', '下棋机器人 K1', 'service', 'chess-ws', chess(), ['服务', '娱乐']),
].map((d) => [d.model.code, d]))

/** 未登记描述的型号：只给最基础的状态能力，页面只展示基础信息 */
export const FALLBACK: Descriptor = { schemaVersion: '1.0', pluginId: '', model: { code: '', name: '', category: 'generic', tags: [] }, capabilities: ['status'], telemetry: [], controls: [], connection: NET }
export const descriptorOf = (code?: string): Descriptor => (code && DESCRIPTORS[code]) || FALLBACK

const modelsOf = (pid: string) => Object.values(DESCRIPTORS).filter((d) => d.pluginId === pid).map((d) => d.model.code)
const P = (id: string, name: string, vendor: string, version: string, sdk: string, lang: PluginInfo['lang'], transport: string, desc: string, status: PluginInfo['status'] = 'running', cpu = 2, mem = 80): PluginInfo =>
  ({ id, name, vendor, version, sdk, lang, transport, desc, status, startedAt: status === 'running' ? '2026-10-27 08:12' : '—', cpu, mem, models: modelsOf(id) })

export const PLUGINS = reactive<PluginInfo[]>([
  P('unitree-sdk2', '宇树 SDK2 适配插件', '宇树科技', '1.4.2', 'unitree_sdk2', 'C++', 'DDS', '对接宇树四足与人形机器人，支持运动控制、姿态、动作与状态订阅', 'running', 4.2, 186),
  P('deeprobotics-ros2', '云深处 ROS2 适配插件', '云深处', '2.1.0', 'ROS2 Humble', 'Python', 'ROS2 / DDS', '对接云深处 X30、Lite3，含导航、建图、巡检任务', 'running', 6.8, 312),
  P('bd-spot-sdk', 'Spot SDK 适配插件', 'Boston Dynamics', '1.0.3', 'spot-sdk 4.0', 'Python', 'gRPC', '对接 Spot 运动控制与 Autowalk 任务', 'running', 2.1, 120),
  P('zsl-ros2', '智身 ROS2 适配插件', '智身科技', '0.9.1', 'ROS2 Humble', 'Python', 'ROS2 / DDS', '对接 ZSL-1 四足机器人', 'running', 1.8, 96),
  P('agilex-ros2', '松灵底盘适配插件', '松灵机器人', '1.6.0', 'ugv_sdk + ROS2', 'C++', 'CAN / ROS2', '对接 Scout、Hunter、Bunker 系列底盘', 'running', 3.4, 140),
  P('generic-ros2', '通用 ROS2 巡检插件', '平台内置', '1.2.0', 'ROS2 Nav2', 'Python', 'ROS2 / DDS', '面向遵循标准话题的 ROS2 设备，按配置映射话题与服务', 'running', 2.6, 110),
  P('dji-psdk', '大疆云平台适配插件', '大疆', '3.0.1', 'DJI Cloud API', 'Java', 'MQTT / HTTPS', '对接大疆行业无人机与机场，支持飞行控制、云台、航线任务', 'running', 5.1, 420),
  P('px4-mavlink', 'PX4 MAVLink 插件', 'Holybro', '1.1.0', 'MAVSDK', 'C++', 'MAVLink / UDP', '对接 PX4 飞控无人机', 'error', 0, 0),
  P('ubtech-ros2', '优必选 Walker 插件', '优必选', '1.0.0', 'Walker SDK', 'Python', 'ROS2', '对接 Walker S 系列人形机器人', 'running', 3.0, 150),
  P('agibot-sdk', '智元 SDK 插件', '智元机器人', '0.8.2', 'AgiBot SDK', 'Python', 'gRPC', '对接智元人形机器人', 'running', 2.2, 132),
  P('barista-http', '咖啡机器人插件', '平台内置', '1.0.0', '厂商 HTTP OpenAPI', 'Node.js', 'HTTP', '对接咖啡机器人：出杯、清洗、动作、语音播报', 'running', 0.6, 48),
  P('greeter-sdk', '迎宾机器人插件', '平台内置', '1.1.0', '厂商 Android SDK 网关', 'Java', 'WebSocket', '对接迎宾机器人：迎宾、引领、讲解、合影', 'running', 1.1, 88),
  P('chess-ws', '下棋机器人插件', '平台内置', '0.9.0', '厂商 WebSocket 协议', 'Python', 'WebSocket', '对接下棋机器人：对局、悔棋、复盘、整理棋盘', 'running', 0.9, 64),
  P('jaka-arm', '节卡机械臂插件', '节卡', '0.5.0', 'JAKA SDK', 'C++', 'TCP', '机械臂接入（开发中，尚未绑定型号）', 'stopped', 0, 0),
])
export const pluginOf = (id?: string) => PLUGINS.find((p) => p.id === id)
