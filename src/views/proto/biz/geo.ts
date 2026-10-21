/**
 * 地图坐标系（frame）：SVG 160×100，1 单位 = 0.85 m。
 * 真实栅格图 gridMap.pgm（0.2 m/px）逆时针旋转 90° 后铺进 frame，点云 tinyMap.pcd 与栅格图已配准：
 *   world(x, y) → frame: fx = 81.055 - y / 0.85, fy = 59.707 - x / 0.85
 */
export type P = [number, number]
export const ROUTE_SET: P[][] = [
  // 0 主院环线（真实栅格图，A* 沿可通行区规划）
  [[88, 40.1], [95.5, 42.2], [105.6, 42.2], [112, 35.9], [112.5, 33.3], [106.8, 28.1], [106.1, 24.1], [106.6, 18.2], [96.9, 8.1], [91.3, 11.2], [74.4, 10.2], [69.6, 7.6], [66.6, 10.7], [66.8, 17.1], [60, 23.9], [52, 24.1], [61.9, 24.1], [66.6, 28.6], [84, 27.2], [85.4, 25.8], [96.7, 25.8], [100.2, 28.4], [108, 29.8], [112.5, 33.3], [112, 35.9], [105.6, 42.2], [95.5, 42.2], [88, 40.1]],
  // 1 南北通道往返
  [[88, 40.1], [95.5, 42.2], [105.6, 42.2], [112, 35.9], [112.5, 33.3], [108, 29.8], [100.2, 28.4], [96.7, 25.8], [85.4, 25.8], [80, 23.9], [76, 27.9], [76.9, 40.1], [78.6, 55], [80, 62], [78.6, 55], [76.9, 40.1], [76, 27.9], [80, 23.9], [85.4, 25.8], [96.7, 25.8], [100.2, 28.4], [108, 29.8], [112.5, 33.3], [112, 35.9], [105.6, 42.2], [95.5, 42.2], [88, 40.1]],
  // 2 东侧消防通道
  [[88, 40.1], [88.5, 43.2], [104.9, 57.5], [104.9, 60.8], [102.1, 62], [107.3, 66.9], [107.3, 89.8], [102.1, 94.9], [107.3, 89.8], [107.3, 66.9], [102.1, 62], [104.9, 60.8], [104.9, 57.8], [88.5, 43.2], [88, 40.1]],
  // 3 充电回桩
  [[104, 46], [98.1, 46], [93.4, 41.3], [88, 40.1]],
  // 4 园区外围（室外 · 卫星）
  [[14, 50], [76, 50], [76, 8], [82, 8], [82, 50], [148, 50], [148, 56], [82, 56], [82, 94], [76, 94], [76, 56], [14, 56], [14, 50]],
  // 5 主干道巡查（室外 · 卫星）
  [[20, 53], [79, 53], [79, 90], [79, 53], [140, 53]],
  // 6 南侧连廊
  [[57, 70], [58.8, 71.6], [58.2, 93.5], [64.5, 99.4], [76, 99.4], [80.9, 94.9], [80.9, 84.6], [84, 78], [86, 72], [80, 64]],
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
export const UNIT = 0.85
/** 栅格图（旋转后）在 frame 中的位置 */
export const GRID_RECT = { x: 60 / 4.25, y: 8.5 / 4.25, w: 501 / 4.25, h: 514 / 4.25 }
/** 地图坐标 → 机器人坐标（m，与点云坐标系一致） */
export const toReal = (x: number, y: number) => ({ x: +((59.707 - y) * UNIT).toFixed(2), y: +((81.055 - x) * UNIT).toFixed(2) })
/** 机器人坐标 → 地图坐标 */
export const toFrame = (x: number, y: number) => ({ x: 81.055 - y / UNIT, y: 59.707 - x / UNIT })
export const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y) * UNIT
/** 卫星图：frame → 经纬度（以 INS 原点为中心，1 单位 = 1.5 m） */
export const SAT_CENTER = { lng: 120.155231, lat: 30.274512 }
export const toLngLat = (x: number, y: number, c = SAT_CENTER): [number, number] => {
  const m = 1.5, ex = (x - 80) * m, ny = (50 - y) * m
  return [c.lng + ex / (111320 * Math.cos((c.lat * Math.PI) / 180)), c.lat + ny / 110540]
}
export const fromLngLat = (lng: number, lat: number, c = SAT_CENTER) => {
  const m = 1.5
  return { x: 80 + ((lng - c.lng) * 111320 * Math.cos((c.lat * Math.PI) / 180)) / m, y: 50 - ((lat - c.lat) * 110540) / m }
}
/** 地图朝向（屏幕坐标，度）→ 机器人坐标系航向（弧度） */
export const yawToReal = (deg: number) => { const t = (deg * Math.PI) / 180; return Math.atan2(-Math.cos(t), -Math.sin(t)) }
