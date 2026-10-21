/** 高德地图 JS API 2.0 加载（不引第三方 loader，直接注入脚本） */
import { AMAP_KEY, AMAP_SECURITY } from '@/config/media'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AMapNS = any
let p: Promise<AMapNS> | null = null
export function loadAMap(): Promise<AMapNS> {
  const w = window as unknown as { AMap?: AMapNS; _AMapSecurityConfig?: { securityJsCode: string } }
  if (w.AMap) return Promise.resolve(w.AMap)
  if (p) return p
  if (AMAP_SECURITY) w._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY }
  p = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.Scale`
    s.async = true
    s.onload = () => (w.AMap ? resolve(w.AMap) : reject(new Error('高德地图加载失败')))
    s.onerror = () => { p = null; s.remove(); reject(new Error('无法连接高德地图服务')) }
    document.head.appendChild(s)
  })
  return p
}
