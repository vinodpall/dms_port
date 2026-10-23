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
