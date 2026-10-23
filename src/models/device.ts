/**
 * 机器人设备数据模型（设备管理模块）
 * 三层结构：设备类型（决定展示哪些实时指标、能否遥操作）→ 型号（规格、摄像头）→ 设备（具体某一台）
 */
export type DeviceType = 'quadruped' | 'ugv' | 'uav' | 'humanoid'
export type DeviceStatus = 'working' | 'idle' | 'charging' | 'fault' | 'offline'

/** 实时指标（详情页按类型取用） */
export type MetricKey = 'battery' | 'speed' | 'alt' | 'gait' | 'joint' | 'latency'

export interface DeviceModel {
  id: string
  type: DeviceType
  name: string
  vendor: string
  protocol: 'ROS2' | 'SDK' | 'MAVLink'
  cameras: string[]
  spec: { speed: string; endurance: string; payload: string; weight: string }
}

export interface Telemetry {
  speed: number            // m/s
  latency: number          // ms
  x: number; y: number; yaw: number
  alt?: number             // 无人机相对高度 m
  gait?: string            // 机器狗步态
  joint?: '正常' | '异常'   // 人形关节状态
}

export interface Device {
  id: string
  sn: string
  name: string
  type: DeviceType
  modelId: string
  status: DeviceStatus
  battery: number          // 0-100
  ip: string              // 内网 IP
  publicIp?: string        // 外网 IP
  cameraIps?: string[]     // 相机 IP
  voltMin?: number         // 最小电压 V
  voltMax?: number         // 最大电压 V
  size?: string            // 尺寸 长×宽×高 mm
  area: string
  firmware: string
  commissioned: string
  lastSeen: string
  remark?: string
  tm: Telemetry
}

export const TYPE_META: Record<DeviceType, { label: string; color: string; teleop: boolean; metrics: MetricKey[] }> = {
  quadruped: { label: '机器狗', color: '#5B9BFF', teleop: true, metrics: ['battery', 'speed', 'gait', 'latency'] },
  ugv: { label: '无人车', color: '#45E3A8', teleop: true, metrics: ['battery', 'speed', 'latency'] },
  uav: { label: '无人机', color: '#B48CFF', teleop: true, metrics: ['battery', 'speed', 'alt', 'latency'] },
  humanoid: { label: '人形机器人', color: '#2ED3E6', teleop: false, metrics: ['battery', 'joint', 'latency'] },
}
export const TYPES = Object.keys(TYPE_META) as DeviceType[]

export const STATUS_META: Record<DeviceStatus, { label: string; badge: 'processing' | 'success' | 'warning' | 'default' | 'error' }> = {
  working: { label: '运行中', badge: 'processing' },
  idle: { label: '空闲', badge: 'success' },
  charging: { label: '充电中', badge: 'warning' },
  fault: { label: '故障', badge: 'error' },
  offline: { label: '离线', badge: 'default' },
}
export const STATUSES = Object.keys(STATUS_META) as DeviceStatus[]

/** 在线 = 非离线（故障设备仍能上报状态） */
export const isOnline = (d: Device) => d.status !== 'offline'
/** 可遥操作：类型支持且设备在线、无故障 */
export const canTeleop = (d: Device) => TYPE_META[d.type].teleop && d.status !== 'offline' && d.status !== 'fault'

export const AREAS = ['A 区 · 室内训练场', 'B 区 · 越野场地', 'C 区 · 室外道路', 'D 区 · 停机坪']
