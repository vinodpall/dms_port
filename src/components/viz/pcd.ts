/** PCD 点云解析（ascii / binary / binary_compressed），参考 robot_web pcdParser.worker */
export interface PointCloud {
  count: number
  /** xyz 交错 */
  positions: Float32Array
  /** 强度（无该字段时为 null） */
  intensity: Float32Array | null
  min: [number, number, number]
  max: [number, number, number]
}

interface Header { fields: string[]; size: number[]; type: string[]; count: number[]; points: number; data: string; start: number }

function header(b: Uint8Array): Header {
  const h: Header = { fields: [], size: [], type: [], count: [], points: 0, data: 'ascii', start: 0 }
  const dec = new TextDecoder()
  let s = 0
  for (let i = 0; i < b.length; i++) {
    if (b[i] !== 10) continue
    const line = dec.decode(b.subarray(s, i)).trim(); s = i + 1
    const [k, ...v] = line.split(/\s+/); const key = k?.toUpperCase()
    if (key === 'FIELDS') h.fields = v
    else if (key === 'SIZE') h.size = v.map(Number)
    else if (key === 'TYPE') h.type = v.map((x) => x.toUpperCase())
    else if (key === 'COUNT') h.count = v.map(Number)
    else if (key === 'POINTS') h.points = +v[0]
    else if (key === 'DATA') { h.data = v[0].toLowerCase(); h.start = s; break }
  }
  if (!h.count.length) h.count = h.fields.map(() => 1)
  return h
}

/** LZF 解压（binary_compressed） */
function lzf(src: Uint8Array, outLen: number) {
  const out = new Uint8Array(outLen); let i = 0, o = 0
  while (i < src.length) {
    let c = src[i++]
    if (c < 32) { c++; while (c--) out[o++] = src[i++] }
    else {
      let len = c >> 5; let ref = o - ((c & 31) << 8) - 1
      if (len === 7) len += src[i++]
      ref -= src[i++]; len += 2
      while (len--) out[o++] = out[ref++]
    }
  }
  return out
}

const read = (v: DataView, off: number, t: string, s: number) =>
  t === 'F' ? (s === 8 ? v.getFloat64(off, true) : v.getFloat32(off, true))
    : t === 'U' ? (s === 1 ? v.getUint8(off) : s === 2 ? v.getUint16(off, true) : v.getUint32(off, true))
      : s === 1 ? v.getInt8(off) : s === 2 ? v.getInt16(off, true) : v.getInt32(off, true)

export function parsePCD(buf: ArrayBuffer): PointCloud {
  const b = new Uint8Array(buf)
  const h = header(b)
  const n = h.points
  const fi = (name: string) => h.fields.indexOf(name)
  const ix = fi('x'), iy = fi('y'), iz = fi('z'), ii = fi('intensity')
  if (ix < 0 || iy < 0) throw new Error('PCD 缺少 x / y 字段')
  const pos = new Float32Array(n * 3)
  const inten = ii >= 0 ? new Float32Array(n) : null
  const put = (k: number, x: number, y: number, z: number, it: number) => { pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z; if (inten) inten[k] = it }

  if (h.data === 'ascii') {
    const lines = new TextDecoder().decode(b.subarray(h.start)).split('\n')
    let k = 0
    for (const l of lines) {
      if (k >= n) break
      const t = l.trim().split(/\s+/); if (t.length < 2) continue
      put(k++, +t[ix], +t[iy], iz >= 0 ? +t[iz] : 0, ii >= 0 ? +t[ii] : 0)
    }
  } else {
    const offs: number[] = []; let stride = 0
    h.fields.forEach((_, i) => { offs.push(stride); stride += h.size[i] * h.count[i] })
    if (h.data === 'binary') {
      const v = new DataView(buf, h.start)
      for (let k = 0; k < n; k++) {
        const o = k * stride
        put(k, read(v, o + offs[ix], h.type[ix], h.size[ix]), read(v, o + offs[iy], h.type[iy], h.size[iy]),
          iz >= 0 ? read(v, o + offs[iz], h.type[iz], h.size[iz]) : 0, ii >= 0 ? read(v, o + offs[ii], h.type[ii], h.size[ii]) : 0)
      }
    } else if (h.data === 'binary_compressed') {
      const hv = new DataView(buf, h.start)
      const csize = hv.getUint32(0, true), usize = hv.getUint32(4, true)
      const raw = lzf(new Uint8Array(buf, h.start + 8, csize), usize)
      const v = new DataView(raw.buffer)
      // 压缩格式按字段列存储
      const col: number[] = []; let acc = 0
      h.fields.forEach((_, i) => { col.push(acc); acc += h.size[i] * h.count[i] * n })
      const at = (f: number, k: number) => read(v, col[f] + k * h.size[f] * h.count[f], h.type[f], h.size[f])
      for (let k = 0; k < n; k++) put(k, at(ix, k), at(iy, k), iz >= 0 ? at(iz, k) : 0, ii >= 0 ? at(ii, k) : 0)
    } else throw new Error(`不支持的 PCD DATA 类型: ${h.data}`)
  }
  const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  let m = 0
  for (let k = 0; k < n; k++) {
    const x = pos[k * 3], y = pos[k * 3 + 1], z = pos[k * 3 + 2]
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue
    if (m !== k) { pos[m * 3] = x; pos[m * 3 + 1] = y; pos[m * 3 + 2] = z; if (inten) inten[m] = inten[k] }
    for (let a = 0; a < 3; a++) { const c = pos[m * 3 + a]; if (c < min[a]) min[a] = c; if (c > max[a]) max[a] = c }
    m++
  }
  return { count: m, positions: pos.subarray(0, m * 3), intensity: inten ? inten.subarray(0, m) : null, min, max }
}

const cache = new Map<string, Promise<PointCloud>>()
export function loadPCD(url: string): Promise<PointCloud> {
  let p = cache.get(url)
  if (!p) {
    p = fetch(url).then((r) => { if (!r.ok) throw new Error(`点云加载失败 ${r.status}`); return r.arrayBuffer() }).then(parsePCD)
    p.catch(() => cache.delete(url))
    cache.set(url, p)
  }
  return p
}
