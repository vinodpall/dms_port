/**
 * 上传图片规整：自动裁掉透明 / 纯白留边，留少量内边距，等比缩放到 max 以内，输出 webp dataURL。
 * 这样不同来源、不同留白的设备图在展示时主体大小一致。
 */
export async function fitImage(file: File, max = 720): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url })
    const w = img.naturalWidth, h = img.naturalHeight
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const g = c.getContext('2d', { willReadFrequently: true })!
    g.drawImage(img, 0, 0)
    const px = g.getImageData(0, 0, w, h).data
    let transparent = false
    for (let i = 3; i < px.length; i += 4 * 97) if (px[i] < 250) { transparent = true; break }
    const bg = (i: number) => (transparent ? px[i + 3] <= 12 : px[i] > 244 && px[i + 1] > 244 && px[i + 2] > 244)
    let x0 = w, y0 = h, x1 = -1, y1 = -1
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!bg((y * w + x) * 4)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    }
    if (x1 < 0) { x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1 }
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1
    const pad = Math.round(Math.max(cw, ch) * 0.03)
    const k = Math.min(1, max / (Math.max(cw, ch) + pad * 2))
    const o = document.createElement('canvas')
    o.width = Math.round((cw + pad * 2) * k); o.height = Math.round((ch + pad * 2) * k)
    const og = o.getContext('2d')!
    og.imageSmoothingQuality = 'high'
    og.drawImage(c, x0, y0, cw, ch, pad * k, pad * k, cw * k, ch * k)
    return o.toDataURL('image/webp', 0.88)
  } finally { URL.revokeObjectURL(url) }
}
