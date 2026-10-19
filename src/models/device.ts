/**
 * 机器人设备统一模型（设备管理模块为数据源，业务管理 / 数据采集 / 仿真 / 场景管理等模块共用）
 */
export type DeviceType = 'humanoid' | 'quadruped' | 'ugv' | 'uav' | 'usv'
export type DeviceStatus = 'working' | 'online' | 'charging' | 'offline' | 'fault'
export type Capability = 'collect' | 'patrol' | 'twin' | 'rescue' | 'teleop' | 'mapping'

export interface DeviceSpec {
  dof?: number          // 自由度
  payload: string       // 负载
  speed: string         // 最高速度
  endurance: string     // 续航
  ip: string            // 防护等级
  size: string          // 尺寸
  weight: string        // 重量
}
export interface Device {
  id: string
  sn: string
  name: string
  type: DeviceType
  model: string
  vendor: string
  status: DeviceStatus
  battery: number       // 0-100
  signal: number        // 0-4
  cpu: number
  temp: number
  scene: string         // 所在场景
  group: string
  protocol: 'ROS2' | 'MAVLink' | 'SDK' | 'NMEA2000'
  ipAddr: string
  firmware: string
  lastSeen: string
  hours: number         // 累计运行小时
  caps: Capability[]
  sensors: string[]
  spec: DeviceSpec
  owner: string
  commissioned: string
  task?: string         // 当前任务
}

export const TYPE_META: Record<DeviceType, { label: string; short: string; color: string }> = {
  humanoid: { label: '人形机器人', short: '人形', color: '#4DD0E1' },
  quadruped: { label: '机器狗', short: '四足', color: '#5B9BFF' },
  ugv: { label: '无人车', short: '无人车', color: '#4DE8B0' },
  uav: { label: '无人机', short: '无人机', color: '#B48CFF' },
  usv: { label: '无人救生船', short: '救生船', color: '#FFB74D' },
}
export const STATUS_META: Record<DeviceStatus, { label: string; badge: 'processing' | 'success' | 'warning' | 'default' | 'error'; color: string }> = {
  working: { label: '作业中', badge: 'processing', color: '#26C6DA' },
  online: { label: '在线空闲', badge: 'success', color: '#4DE8B0' },
  charging: { label: '充电中', badge: 'warning', color: '#FFB74D' },
  offline: { label: '离线', badge: 'default', color: '#5B7486' },
  fault: { label: '故障', badge: 'error', color: '#FF6B6B' },
}
export const CAP_META: Record<Capability, string> = {
  collect: '数据采集', patrol: '巡检', twin: '数字孪生', rescue: '应急救援', teleop: '遥操作', mapping: '建图定位',
}
