/** 原型地图坐标系：SVG 160×100，1 单位 = 0.25 m */
export type P = [number, number]
export const ROUTE_SET: P[][] = [
  // 0 配电室环线（室内）
  [[16, 82], [26, 50], [34, 50], [34, 26], [20, 20], [34, 14], [34, 50], [74, 50], [74, 24], [86, 16], [74, 34], [74, 50], [108, 50], [108, 26], [108, 50], [150, 50], [140, 76], [128, 86], [120, 50], [66, 50], [60, 76], [48, 84], [66, 50], [26, 50], [16, 82]],
  // 1 机房南北通道
  [[16, 82], [26, 50], [74, 50], [74, 20], [60, 14], [74, 20], [74, 50], [108, 50], [108, 18], [116, 30], [108, 50]],
  // 2 消防通道巡查
  [[26, 50], [150, 50], [140, 26], [134, 14], [128, 50], [100, 50], [100, 80], [90, 86], [100, 50], [26, 50]],
  // 3 充电回桩
  [[16, 82], [18, 66], [26, 50], [12, 50]],
  // 4 园区外围（室外）
  [[14, 50], [76, 50], [76, 8], [82, 8], [82, 50], [148, 50], [148, 56], [82, 56], [82, 94], [76, 94], [76, 56], [14, 56], [14, 50]],
  // 5 主干道巡查（室外）
  [[20, 53], [79, 53], [79, 90], [79, 53], [140, 53]],
  // 6 管廊 A 段
  [[10, 50], [40, 50], [40, 30], [40, 50], [90, 50], [90, 70], [90, 50], [150, 50]],
]
const seg = (a: P, b: P) => Math.hypot(b[0] - a[0], b[1] - a[1])
export const routeLen = (i: number) => { const r = ROUTE_SET[i]; return r.slice(1).reduce((s, p, k) => s + seg(r[k], p), 0) }
export function routeAt(i: number, f: number): { x: number; y: number; yaw: number } {
  const r = ROUTE_SET[i]; let d = Math.max(0, Math.min(1, f)) * routeLen(i)
  for (let k = 1; k < r.length; k++) {
    const l = seg(r[k - 1], r[k]); const yaw = Math.round((Math.atan2(r[k][1] - r[k - 1][1], r[k][0] - r[k - 1][0]) * 180) / Math.PI)
    if (d <= l || k === r.length - 1) { const t = l ? Math.min(1, d / l) : 0; return { x: r[k - 1][0] + (r[k][0] - r[k - 1][0]) * t, y: r[k - 1][1] + (r[k][1] - r[k - 1][1]) * t, yaw } }
    d -= l
  }
  return { x: r[0][0], y: r[0][1], yaw: 0 }
}
export function nearestF(i: number, x: number, y: number) {
  let best = 0, bd = Infinity
  for (let k = 0; k <= 200; k++) { const p = routeAt(i, k / 200); const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = k / 200 } }
  return best
}
/** 地图坐标 → 机器人坐标（m） */
export const toReal = (x: number, y: number) => ({ x: +((x - 6) * 0.25).toFixed(2), y: +((94 - y) * 0.25).toFixed(2) })
export const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y) * 0.25
