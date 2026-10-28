/** 栅格地图（PGM P2/P5）解析与渲染，参考 robot_web useGridMapLoader */
export interface ParsedPGM { width: number; height: number; maxVal: number; data: Uint8Array }

export function parsePGM(buf: ArrayBuffer): ParsedPGM {
  const b = new Uint8Array(buf)
  const tok: string[] = []
  let p = 0
  while (p < b.length && tok.length < 4) {
    const c = b[p]
    if (c === 35) { while (p < b.length && b[p] !== 10) p++; continue } // # 注释
    if (c === 32 || c === 9 || c === 10 || c === 13) { p++; continue }
    const s = p
    while (p < b.length && ![32, 9, 10, 13].includes(b[p])) p++
    tok.push(String.fromCharCode(...b.subarray(s, p)))
  }
  p++ // 头部后的单个空白
  const [magic, ws, hs, ms] = tok
  const width = +ws, height = +hs, maxVal = +ms || 255
  if (!width || !height) throw new Error(`无效的 PGM 尺寸: ${ws}×${hs}`)
  const n = width * height
  const data = new Uint8Array(n)
  if (magic === 'P5') data.set(b.subarray(p, p + n))
  else if (magic === 'P2') {
    let v = 0, inNum = false, k = 0
    for (let i = p; i < b.length && k < n; i++) {
      const c = b[i]
      if (c >= 48 && c <= 57) { v = v * 10 + c - 48; inNum = true }
      else if (inNum) { data[k++] = Math.round((v / maxVal) * 255); v = 0; inNum = false }
    }
    if (inNum && k < n) data[k] = Math.round((v / maxVal) * 255)
  } else throw new Error(`不支持的 PGM 格式: ${magic}`)
  return { width, height, maxVal, data }
}

export interface GridStyle { free: string; occ: string; unknown: string }
/** 深色主题配色：可通行 / 障碍 / 未知 */
/** 原始黑白配色（同 ROS map_server：白=空闲 黑=障碍 灰=未知） */
export const RAW_GRID: GridStyle = { free: '#FEFEFE', occ: '#000000', unknown: '#CDCDCD' }
export const DARK_GRID: GridStyle = { free: '#1A324D', occ: '#A9D8EA', unknown: '#101f33' }
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

/** 渲染为图片（rotate=逆时针旋转 90°，让横向面板显示更饱满） */
export function renderPGM(g: ParsedPGM, style: GridStyle = DARK_GRID, rotate = false): string {
  const W = rotate ? g.height : g.width, H = rotate ? g.width : g.height
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')!
  const img = ctx.createImageData(W, H)
  const [f, o, u] = [hex(style.free), hex(style.occ), hex(style.unknown)]
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // 逆时针旋转：新(x, y) ← 原(W0-1-y, x)
    const v = rotate ? g.data[x * g.width + (g.width - 1 - y)] : g.data[y * g.width + x]
    const c = v < 100 ? o : v > 250 ? f : v >= 190 && v <= 215 ? u : f
    const k = (y * W + x) * 4
    img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return cv.toDataURL('image/png')
}

const cache = new Map<string, Promise<string>>()
/** 加载并渲染（按 url + 参数缓存） */
export function loadGridImage(url: string, rotate = false, style: GridStyle = DARK_GRID): Promise<string> {
  const key = `${url}|${rotate}|${style.free}${style.occ}`
  let p = cache.get(key)
  if (!p) {
    p = fetch(url).then((r) => { if (!r.ok) throw new Error(`栅格地图加载失败 ${r.status}`); return r.arrayBuffer() }).then((b) => renderPGM(parsePGM(b), style, rotate))
    p.catch(() => cache.delete(key))
    cache.set(key, p)
  }
  return p
}
