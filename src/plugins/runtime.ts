/**
 * 插件运行时（原型模拟）：模拟插件周期上报的实时状态、指令执行与回执、设备日志
 * 真实环境：状态来自 WebSocket 频道 device.{id}.state，指令走 POST /device/devices/{id}/commands，回执来自 device.{id}.cmd
 */
import { reactive } from 'vue'
import { message } from 'ant-design-vue'
import { descriptorOf, pluginOf } from './catalog'
import type { CommandRecord, ControlDef, ControlState, Descriptor, DeviceLog, DeviceState, TelemetryField } from './types'

const pad = (n: number) => String(n).padStart(2, '0')
const clock = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
const stamp = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${clock(d)}`

interface Entry { code: string; state: DeviceState }
const entries = reactive<Record<string, Entry>>({})
export const commands = reactive<CommandRecord[]>([])
const logs = reactive<Record<string, DeviceLog[]>>({})
/** 当前执行中的指令（每台设备同一时刻只执行一个业务动作；急停等安全指令不受限制） */
const busy = reactive<Record<string, CommandRecord | undefined>>({})
/** 遥操作控制权：同一设备同一时刻仅允许一个操作者 */
export const teleopOwner = reactive<Record<string, string | undefined>>({})

export const pluginRunning = (code: string) => { const p = pluginOf(descriptorOf(code).pluginId); return !p || p.status === 'running' }

function initValue(f: TelemetryField, seed: number) {
  const s = f.sim ?? {}
  if (s.values) return s.values[0]
  if (f.type === 'pose2d') return { x: 4 + (seed % 50), y: 4 + ((seed * 7) % 30), yaw: (seed * 37) % 360 }
  if (f.type === 'boolean') return false
  const lo = s.min ?? 0, hi = s.max ?? lo
  const v = lo + ((seed * 9301 + 49297) % 233280) / 233280 * (hi - lo)
  return f.type === 'duration' || f.role === 'count' ? Math.round(v) : +v.toFixed(f.precision ?? 1)
}

/** 注册设备（幂等）：首次进入页面时建立状态；online 由设备档案/插件状态决定 */
export function ensure(id: string, code: string, init: { online: boolean; fault?: boolean; values?: Record<string, any> } = { online: true }): DeviceState {
  const online = init.online && pluginRunning(code)
  const e = entries[id]
  if (e) {
    if (e.state.online !== online) { e.state.online = online; e.state.status = online ? (init.fault ? 'fault' : 'idle') : 'offline' }
    return e.state
  }
  const d = descriptorOf(code)
  const seed = [...id].reduce((a, c) => a + c.charCodeAt(0), 0)
  const values: Record<string, any> = {}
  d.telemetry.forEach((f, i) => { values[f.key] = initValue(f, seed + i * 13) })
  d.controls.forEach((c) => {
    if (!c.stateKey || c.stateKey in values) return
    values[c.stateKey] = c.kind === 'toggle' ? false : c.kind === 'slider' ? +(((c.min ?? 0) + (c.max ?? 1)) / 2).toFixed(2) : c.options?.[0]?.value
  })
  values.charging = false
  Object.assign(values, init.values ?? {})
  const state: DeviceState = reactive({ deviceId: id, ts: Date.now(), online, status: !online ? 'offline' : init.fault ? 'fault' : 'idle', values, controls: {}, faults: init.fault ? [{ code: 'E201', level: 'error', message: '关节驱动器通信异常' }] : [] })
  entries[id] = { code, state }
  if (!logs[id]) {
    const t = Date.now()
    logs[id] = ([
      { at: stamp(new Date(t - 3600e3 * 5)), level: 'info', source: '插件', message: `插件 ${d.pluginId || '—'} 建立连接，SDK 握手成功` },
      { at: stamp(new Date(t - 3600e3 * 3)), level: 'info', source: '设备', message: '自检完成，各模块状态正常' },
      ...(init.fault ? [{ at: stamp(new Date(t - 3600e3)), level: 'error' as const, source: '设备', message: 'E201 关节驱动器通信异常' }] : []),
      ...(!online ? [{ at: stamp(new Date(t - 3600e3 * 2)), level: 'warn' as const, source: '插件', message: pluginRunning(code) ? '设备心跳超时，判定离线' : '插件未运行，设备状态不可用' }] : []),
    ] as DeviceLog[]).reverse()
  }
  return state
}
export const stateOf = (id: string) => entries[id]?.state
export const logsOf = (id: string) => logs[id] ?? []
export const busyOf = (id: string) => busy[id]
export const cmdsOf = (id: string) => commands.filter((c) => c.deviceId === id)
export function addLog(id: string, level: DeviceLog['level'], source: string, msg: string) { (logs[id] ??= []).unshift({ at: stamp(), level, source, message: msg }); if (logs[id].length > 200) logs[id].pop() }

/* ---------------- 字段格式化 ---------------- */
export function warnOf(expr: string | undefined, v: unknown) {
  if (!expr || typeof v !== 'number') return false
  const m = expr.match(/^([<>]=?)\s*(-?[\d.]+)$/); if (!m) return false
  const n = +m[2]
  return m[1] === '<' ? v < n : m[1] === '<=' ? v <= n : m[1] === '>' ? v > n : v >= n
}
export function fmtDuration(s: number) { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}h ${pad(m)}m` : `${m}m` }
export function fmtField(f: TelemetryField, v: any): { text: string; unit?: string; warn: boolean } {
  if (v == null || v === '') return { text: '—', warn: false }
  if (f.type === 'enum') return { text: f.options?.[v] ?? String(v), warn: v === 'warn' }
  if (f.type === 'boolean') return { text: v ? '是' : '否', warn: false }
  if (f.type === 'duration') return { text: fmtDuration(v), warn: false }
  if (f.type === 'pose2d') return { text: `${(+v.x).toFixed(1)}, ${(+v.y).toFixed(1)}`, unit: `${Math.round(v.yaw)}°`, warn: false }
  if (typeof v === 'number') return { text: f.type === 'percent' ? String(Math.round(v)) : v.toFixed(f.precision ?? (Number.isInteger(v) ? 0 : 1)), unit: f.unit, warn: warnOf(f.warn, v) }
  return { text: String(v), unit: f.unit, warn: false }
}
export const fieldsBy = (d: Descriptor, display: string) => d.telemetry.filter((f) => f.display.includes(display as never))

/* ---------------- 控件可用性 ---------------- */
const NEED_STAND = new Set(['hello', 'stretch', 'dance', 'flip', 'wave', 'bow', 'shake'])
export function ctrlState(id: string, c: ControlDef): ControlState {
  const st = entries[id]?.state
  if (!st) return { enabled: false, reason: '设备未连接' }
  const code = entries[id].code
  if (!pluginRunning(code)) return { enabled: false, reason: '插件未运行' }
  if (!st.online) return { enabled: false, reason: '设备离线' }
  if (c.group === 'safety') return { enabled: true }
  if (st.status === 'fault') return { enabled: false, reason: '设备故障，仅可急停' }
  const b = busy[id]
  if (b && b.control === c.key) return { enabled: false, reason: '执行中' }
  if (b && c.kind === 'button') return { enabled: false, reason: `正在执行「${b.label}」` }
  const v = st.values
  if (NEED_STAND.has(c.key) && v.posture && v.posture !== 'stand') return { enabled: false, reason: '请先切换为站立姿态' }
  if (c.key === 'flip' && v.battery < 30) return { enabled: false, reason: '电量低于 30%' }
  if ((c.key === 'dock' || c.key === 'dockCharge') && v.charging) return { enabled: false, reason: '已在充电中' }
  if (c.key === 'undock' && !v.charging) return { enabled: false, reason: '未在充电' }
  if (c.key === 'takeoff' && v.flight && v.flight !== 'ground') return { enabled: false, reason: '已在空中' }
  if (c.key === 'takeoff' && v.cover === 'closed' && 'coverOpen' in v && !v.coverOpen) return { enabled: false, reason: '请先打开机场舱盖' }
  if ((c.key === 'land' || c.key === 'rth') && v.flight === 'ground') return { enabled: false, reason: '未起飞' }
  if (c.key === 'startGame' && v.game && v.game !== 'idle') return { enabled: false, reason: '对局进行中' }
  if ((c.key === 'undo') && v.game !== 'playing') return { enabled: false, reason: '当前无对局' }
  if ((c.key === 'review' || c.key === 'endGame') && v.game === 'idle') return { enabled: false, reason: '当前无对局' }
  if (c.key === 'arrange' && v.game === 'playing') return { enabled: false, reason: '对局进行中' }
  if (c.key === 'guide' && v.charging) return { enabled: false, reason: '充电中，请先结束充电' }
  if (c.key === 'pourCoffee' && v.beans < 5) return { enabled: false, reason: '咖啡豆不足' }
  if (c.group === 'skill' && c.key === 'mow' && v.charging) return { enabled: false, reason: '充电中' }
  return { enabled: true }
}

/* ---------------- 指令执行 ---------------- */
let seq = 0
const paramText = (c: ControlDef, p?: Record<string, any>) => !p || !c.params ? '' : c.params.map((d) => { const v = p[d.key]; if (v == null || v === '') return ''; return `${d.label}：${d.options?.[v] ?? v}${d.unit && d.type === 'number' ? d.unit : ''}` }).filter(Boolean).join('，')

export function execute(id: string, c: ControlDef, params?: Record<string, any>, opts: { operator?: string; silent?: boolean } = {}): Promise<CommandRecord> {
  const st = entries[id]?.state
  const s = ctrlState(id, c)
  if (!st || !s.enabled) { message.warning(s.reason ?? '当前不可执行'); return Promise.reject(new Error(s.reason)) }
  const rec: CommandRecord = reactive({ requestId: `c_${Date.now().toString(36)}${++seq}`, deviceId: id, control: c.key, label: c.label, params, paramText: paramText(c, params), status: 'accepted', operator: opts.operator ?? '管理员', at: stamp() })
  commands.unshift(rec); if (commands.length > 500) commands.pop()
  const instant = c.group === 'safety' || c.kind === 'slider' || c.kind === 'select' || c.kind === 'toggle'
  if (!instant) busy[id] = rec
  const label = c.label + (rec.paramText ? `（${rec.paramText}）` : '')
  addLog(id, c.danger ? 'warn' : 'info', '指令', `${rec.operator} 下发「${label}」`)
  const cost = c.costMs ?? 1200
  return new Promise((resolve) => {
    setTimeout(() => { rec.status = 'running' }, Math.min(300, cost / 3))
    setTimeout(() => {
      const v = st.values
      const fail = (v.battery != null && v.battery < 10 && c.group !== 'safety' && c.group !== 'charge') ? '电量过低，设备拒绝执行' : !st.online ? '设备已离线' : ''
      if (fail) { rec.status = 'failed'; rec.message = fail }
      else {
        rec.status = 'succeeded'; rec.message = '执行完成'
        if (c.stateKey) v[c.stateKey] = c.kind === 'toggle' ? !v[c.stateKey] : params?.value ?? v[c.stateKey]
        if (c.effect) Object.assign(v, c.effect)
        if (c.key === 'takeoff') v.alt = params?.height ?? 10
        if (c.key === 'cover') v.cover = v.coverOpen ? 'open' : 'closed'
        if (c.key === 'estop') { if ('speed' in v) v.speed = 0; delete busy[id]; v.taskOn = false }
        if (c.key === 'pourCoffee') { v.cups = (v.cups ?? 0) + 1; v.beans = Math.max(0, (v.beans ?? 50) - 2) }
        if (c.key === 'greet' || c.key === 'guide') v.visitors = (v.visitors ?? 0) + 1
        if (c.key === 'startGame') { v.games = (v.games ?? 0) + 1; v.gameKind = params?.kind; v.board = [] }
        if (c.key === 'undo') { v.moves = Math.max(0, (v.moves ?? 0) - 2); (v.board as any[])?.splice(-2) }
        if (c.key === 'endGame' || c.key === 'arrange') { v.moves = 0; v.board = [] }
        if (c.key === 'dock' || c.key === 'dockCharge') st.status = 'charging'
        if (c.key === 'undock') st.status = 'idle'
      }
      rec.costMs = cost
      if (busy[id] === rec) delete busy[id]
      addLog(id, rec.status === 'succeeded' ? 'info' : 'error', '回执', `「${label}」${rec.status === 'succeeded' ? '执行成功' : '执行失败：' + rec.message}`)
      if (!opts.silent) rec.status === 'succeeded' ? message.success(`${c.label} · 执行成功`) : message.error(`${c.label} · ${rec.message}`)
      resolve(rec)
    }, cost)
  })
}

/* ---------------- 周期上报（模拟插件 1Hz 推送） ---------------- */
setInterval(() => {
  for (const [id, e] of Object.entries(entries)) {
    const st = e.state; if (!st.online) continue
    const d = descriptorOf(e.code); const v = st.values; st.ts = Date.now()
    for (const f of d.telemetry) {
      const s = f.sim; if (!s || s.values || !s.drift || typeof v[f.key] !== 'number') continue
      if (f.role === 'battery') { v[f.key] = Math.max(5, Math.min(100, v[f.key] + (v.charging ? 0.6 : -s.drift * 0.15))); continue }
      if (f.role === 'speed') { const moving = busy[id] || v.taskOn || teleopOwner[id]; v[f.key] = moving ? Math.max(0, Math.min(s.max ?? 1, v[f.key] + (Math.random() - 0.4) * s.drift)) : Math.max(0, v[f.key] * 0.6 - 0.01); continue }
      v[f.key] = +Math.max(s.min ?? -Infinity, Math.min(s.max ?? Infinity, v[f.key] + (Math.random() - 0.5) * s.drift)).toFixed(f.precision ?? 1)
    }
    if (typeof v.uptime === 'number') v.uptime += 1.5
    if (v.speed > 0 && v.pose) { v.pose = { x: Math.max(2, Math.min(58, v.pose.x + Math.cos(v.pose.yaw * Math.PI / 180) * 0.3)), y: Math.max(2, Math.min(38, v.pose.y + Math.sin(v.pose.yaw * Math.PI / 180) * 0.3)), yaw: (v.pose.yaw + (Math.random() - 0.5) * 12 + 360) % 360 } }
    if (v.game === 'playing' && Math.random() < 0.35) {
      v.moves = (v.moves ?? 0) + 1
      const b = (v.board ??= []) as { x: number; y: number; c: 0 | 1 }[]
      for (let i = 0; i < 6; i++) { const x = Math.floor(Math.random() * 9), y = Math.floor(Math.random() * 9); if (!b.some((p) => p.x === x && p.y === y)) { b.push({ x, y, c: (b.length % 2) as 0 | 1 }); break } }
    }
  }
}, 1500)
