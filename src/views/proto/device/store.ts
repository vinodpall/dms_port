/** 设备管理模块的本地数据（原型：内存中增删改，刷新后恢复演示数据） */
import { reactive } from 'vue'
import { DEVICES, MODELS } from '@/mock/devices'
import { AREAS, TYPES, TYPE_META, type Device, type DeviceModel, type DeviceType, type TypeMeta } from '@/models/device'

export const fleet = reactive({ devices: DEVICES.map((d) => ({ ...d, tm: { ...d.tm } })) as Device[], models: MODELS.map((m) => ({ ...m, cameras: [...m.cameras], spec: { ...m.spec } })) as DeviceModel[] })

export const modelOf = (d: Device) => fleet.models.find((m) => m.id === d.modelId)
export const countOf = (modelId: string) => fleet.devices.filter((d) => d.modelId === modelId).length
export const ipTaken = (ip: string, exceptId?: string) => fleet.devices.some((d) => d.ip === ip && d.id !== exceptId)

export function saveDevice(d: Device) {
  const i = fleet.devices.findIndex((x) => x.id === d.id)
  if (i >= 0) fleet.devices.splice(i, 1, d)
  else fleet.devices.unshift(d)
}
export const removeDevice = (id: string) => { fleet.devices = fleet.devices.filter((d) => d.id !== id) }
export function saveModel(m: DeviceModel) {
  const i = fleet.models.findIndex((x) => x.id === m.id)
  if (i >= 0) fleet.models.splice(i, 1, m)
  else fleet.models.push(m)
}
export const removeModel = (id: string) => { fleet.models = fleet.models.filter((m) => m.id !== id) }

/* 设备类型 */
export const typeModelCount = (t: DeviceType) => fleet.models.filter((m) => m.type === t).length
export const typeDeviceCount = (t: DeviceType) => fleet.devices.filter((d) => d.type === t).length
export function saveType(id: DeviceType | null, meta: Omit<TypeMeta, 'metrics'>) {
  if (id && TYPE_META[id]) { Object.assign(TYPE_META[id], meta); return id }
  const nid = `t-${Date.now().toString(36)}`
  TYPE_META[nid] = { ...meta, metrics: ['battery', 'speed', 'latency'] }
  TYPES.push(nid)
  return nid
}
export function removeType(id: DeviceType) {
  const i = TYPES.indexOf(id); if (i >= 0) TYPES.splice(i, 1)
  delete TYPE_META[id]
}

/* 所属区域：改名时同步更新设备 */
export const areaCount = (a: string) => fleet.devices.filter((d) => d.area === a).length
export function saveArea(old: string | null, name: string) {
  if (old == null) { AREAS.push(name); return }
  const i = AREAS.indexOf(old); if (i >= 0) AREAS.splice(i, 1, name)
  fleet.devices.forEach((d) => { if (d.area === old) d.area = name })
}
export const removeArea = (a: string) => { const i = AREAS.indexOf(a); if (i >= 0) AREAS.splice(i, 1) }

/* 插件运行时：插件未运行时其设备一律判定离线；设备档案数据注入运行时初始值 */
import { ensure, pluginRunning } from '@/plugins/runtime'
fleet.devices.forEach((d) => { if (!pluginRunning(d.modelId)) d.status = 'offline' })
export const rtOf = (d: Device) => ensure(d.id, d.modelId, {
  online: d.status !== 'offline', fault: d.status === 'fault',
  values: { battery: d.battery, speed: d.tm.speed, latency: d.tm.latency, alt: d.tm.alt ?? 0, pose: { x: d.tm.x, y: d.tm.y, yaw: d.tm.yaw }, ...(d.tm.gait ? { gait: d.tm.gait } : {}) },
})

/** 插件启停：停止时其设备置离线（记住原状态），启动后恢复 */
import { PLUGINS, descriptorOf as _desc } from '@/plugins/catalog'
const before: Record<string, Device['status']> = {}
export const pluginDevices = (pid: string) => fleet.devices.filter((d) => _desc(d.modelId).pluginId === pid)
export function setPluginStatus(pid: string, status: 'running' | 'stopped') {
  const p = PLUGINS.find((x) => x.id === pid); if (!p) return
  p.status = status
  const pad = (n: number) => String(n).padStart(2, '0'), t = new Date()
  if (status === 'running') { p.startedAt = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}`; p.cpu = +(1 + Math.random() * 3).toFixed(1); p.mem = 60 + Math.round(Math.random() * 120) } else { p.cpu = 0; p.mem = 0 }
  pluginDevices(pid).forEach((d) => {
    if (status === 'stopped') { before[d.id] ??= d.status; d.status = 'offline' }
    else { d.status = before[d.id] ?? 'online'; delete before[d.id] }
    ensure(d.id, d.modelId, { online: d.status !== 'offline', fault: d.status === 'fault' })
  })
}
