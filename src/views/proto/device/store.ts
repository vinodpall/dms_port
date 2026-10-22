/** 设备管理模块的本地数据（原型：内存中增删改，刷新后恢复演示数据） */
import { reactive } from 'vue'
import { DEVICES, MODELS } from '@/mock/devices'
import type { Device, DeviceModel } from '@/models/device'

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
