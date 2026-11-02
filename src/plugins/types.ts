/**
 * 设备插件统一数据结构（schema v1.0）
 * 插件运行在服务器上，通过厂商 SDK 与局域网内设备通信，对平台只输出这里定义的统一结构：
 *   设备描述 Descriptor（按型号，静态）+ 实时状态 DeviceState（按设备，动态）+ 指令 Command / 回执
 * 前端只认这套结构：能力 → 面板/菜单是否显示；字段 → 指标展示；控件 → 按钮/开关/选择/滑块/摇杆
 */

/** 能力标签：决定页面上显示哪些面板、菜单；前端不认识的能力直接忽略（custom:* 为专用扩展面板） */
export type Capability =
  | 'status' | 'telemetry' | 'location' | 'video' | 'teleop' | 'posture' | 'action' | 'skill'
  | 'charge' | 'navigation' | 'task' | 'alarm' | 'log' | 'map' | 'voice' | `custom:${string}`

export type FieldType = 'number' | 'percent' | 'string' | 'boolean' | 'enum' | 'duration' | 'pose2d' | 'gps'
/** 字段展示位置：kpi 首页指标 · card 设备卡片 · detail 详情 · chart 曲线 · map 地图 · hud 遥操作画面 */
export type Display = 'kpi' | 'card' | 'detail' | 'chart' | 'map' | 'hud'
/** 标准语义：平台据此做通用统计/告警，与 key 命名无关 */
export type FieldRole = 'battery' | 'speed' | 'odometer' | 'uptime' | 'location' | 'altitude' | 'latency' | 'temperature' | 'count'

export interface TelemetryField {
  key: string
  label: string
  type: FieldType
  unit?: string
  precision?: number
  role?: FieldRole
  group?: string
  display: Display[]
  /** 阈值：如 '<20'、'>75'，超出标红并可生成告警 */
  warn?: string
  options?: Record<string, string>
  /** 原型演示用：模拟取值范围 */
  sim?: { min?: number; max?: number; drift?: number; values?: string[] }
}

export type ControlKind = 'button' | 'toggle' | 'select' | 'slider' | 'joystick'
/** 控件分组，对应能力面板 */
export type ControlGroup = 'safety' | 'posture' | 'action' | 'skill' | 'charge' | 'navigation' | 'task' | 'voice' | 'teleop' | 'system' | 'flight'

export interface ParamDef {
  key: string
  label: string
  type: 'enum' | 'string' | 'number' | 'boolean'
  options?: Record<string, string>
  default?: string | number | boolean
  min?: number; max?: number; step?: number; unit?: string
  maxLength?: number
  required?: boolean
}

export interface ControlDef {
  key: string
  label: string
  kind: ControlKind
  group: ControlGroup
  icon?: string
  desc?: string
  /** select 选项 */
  options?: { value: string; label: string }[]
  /** slider */
  min?: number; max?: number; step?: number; unit?: string
  /** joystick */
  axes?: string[]; maxSpeed?: number; heartbeatMs?: number
  /** 执行参数：前端自动生成参数表单 */
  params?: ParamDef[]
  /** toggle/select/slider 当前值在状态 values 中的键 */
  stateKey?: string
  /** toggle 开/关两态的显示名 */
  onLabel?: string; offLabel?: string
  danger?: boolean
  confirm?: string
  /** 执行耗时（原型模拟），毫秒 */
  costMs?: number
  /** 执行后对状态的影响（原型模拟：插件执行成功后上报的新状态） */
  effect?: Record<string, string | number | boolean>
  permission?: string
}

export interface ConnField { key: string; label: string; type: 'string' | 'number' | 'password' | 'enum'; required?: boolean; default?: string | number; options?: Record<string, string>; placeholder?: string }

export interface Descriptor {
  schemaVersion: '1.0'
  pluginId: string
  model: { code: string; name: string; category: string; tags: string[] }
  capabilities: Capability[]
  telemetry: TelemetryField[]
  controls: ControlDef[]
  video?: { key: string; label: string; ir?: boolean }[]
  navigation?: { mapType: 'grid2d' | 'pointcloud' | 'gps'; supports: string[] }
  task?: { types: string[]; pointActions: string[] }
  connection: ConnField[]
}

export interface PluginInfo {
  id: string
  name: string
  vendor: string
  version: string
  sdk: string
  lang: 'Python' | 'C++' | 'Java' | 'Node.js'
  transport: string
  desc: string
  status: 'running' | 'stopped' | 'error'
  startedAt: string
  cpu: number
  mem: number
  /** 插件支持的型号编码 */
  models: string[]
}

export type DeviceRunStatus = 'idle' | 'running' | 'charging' | 'fault' | 'offline'
export interface ControlState { enabled: boolean; reason?: string }
export interface Fault { code: string; level: 'info' | 'warn' | 'error'; message: string }

export interface DeviceState {
  deviceId: string
  ts: number
  online: boolean
  status: DeviceRunStatus
  values: Record<string, any>
  controls: Record<string, ControlState>
  faults: Fault[]
}

export type CmdStatus = 'accepted' | 'running' | 'succeeded' | 'failed' | 'timeout'
export interface CommandRecord {
  requestId: string
  deviceId: string
  control: string
  label: string
  params?: Record<string, any>
  paramText?: string
  status: CmdStatus
  message?: string
  operator: string
  at: string
  costMs?: number
}

export interface DeviceLog { at: string; level: 'info' | 'warn' | 'error'; source: string; message: string }

/** 能力元信息：前端组件注册表据此决定面板标题、在哪个模块出现 */
export const CAP_META: Record<string, { label: string; color: string; desc: string; device: boolean; biz: boolean }> = {
  status: { label: '运行状态', color: '#45E3A8', desc: '在线 / 运行 / 故障状态', device: true, biz: true },
  telemetry: { label: '实时数据', color: '#2ED3E6', desc: '电量、速度等遥测数据', device: true, biz: true },
  location: { label: '实时定位', color: '#5B9BFF', desc: '坐标、航向，地图展示', device: true, biz: true },
  video: { label: '视频', color: '#B48CFF', desc: '设备相机实时画面', device: true, biz: true },
  teleop: { label: '遥操作', color: '#26C6DA', desc: '摇杆 / 键盘远程控制', device: true, biz: true },
  posture: { label: '姿态设置', color: '#7FB8FF', desc: '站立、趴下、机身高度等', device: true, biz: true },
  action: { label: '基础动作', color: '#FFC15C', desc: '跳舞、挥手等预置动作', device: true, biz: true },
  skill: { label: '技能', color: '#FF9F6B', desc: '业务技能，可带参数执行', device: true, biz: true },
  charge: { label: '自主充电', color: '#45E3A8', desc: '返回充电桩、结束充电', device: true, biz: true },
  navigation: { label: '自主导航', color: '#5B9BFF', desc: '建图、定位、路线导航', device: false, biz: true },
  task: { label: '任务执行', color: '#26C6DA', desc: '巡检任务、定时任务', device: false, biz: true },
  alarm: { label: '告警', color: '#FF7A7A', desc: '异常事件与告警上报', device: true, biz: true },
  log: { label: '设备日志', color: '#B6CADC', desc: '设备运行日志', device: true, biz: true },
  map: { label: '地图管理', color: '#5B9BFF', desc: '地图采集与编辑', device: false, biz: true },
  voice: { label: '语音', color: '#E58BFF', desc: '语音播报 / 对讲', device: true, biz: true },
  'custom:chess': { label: '棋局', color: '#FFC15C', desc: '下棋机器人专用棋盘面板', device: true, biz: true },
  'custom:dock': { label: '机场', color: '#B48CFF', desc: '无人机机场舱盖与充电', device: true, biz: true },
}
export const capMeta = (c: string) => CAP_META[c] ?? { label: c, color: '#8EA6BE', desc: '扩展能力', device: true, biz: true }

export const GROUP_META: Record<ControlGroup, { label: string; order: number }> = {
  safety: { label: '安全', order: 0 },
  posture: { label: '姿态设置', order: 1 },
  flight: { label: '飞行控制', order: 2 },
  action: { label: '基础动作', order: 3 },
  skill: { label: '技能', order: 4 },
  voice: { label: '语音', order: 5 },
  charge: { label: '充电', order: 6 },
  navigation: { label: '导航', order: 7 },
  task: { label: '任务', order: 8 },
  system: { label: '系统', order: 9 },
  teleop: { label: '遥操作', order: 10 },
}
