/// <reference types="vite/client" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const c: DefineComponent<object, object, any>
  export default c
}

interface ImportMetaEnv {
  /** 高德地图 JS API Key / 安全密钥 */
  readonly VITE_AMAP_KEY?: string
  readonly VITE_AMAP_SECURITY?: string
  /** WebRTC 信令地址前缀，默认走 /rtc-proxy/{host}；设为 direct 时直连 http://{host}:1985 */
  readonly VITE_RTC_API?: string
}
