import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import http from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * SRS WebRTC 信令代理：/rtc-proxy/{host}/rtc/v1/play/ → http://{host}:1985/rtc/v1/play/
 * 解决浏览器直连 SRS API 的跨域 / 混合内容问题（与 robot_web 的做法一致）；
 * 生产环境请在 nginx 中配置同样的 location，见 docs/media.md
 */
function rtcProxy(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const m = req.url?.match(/^\/rtc-proxy\/([\w.-]+)(?::(\d+))?(\/.*)$/)
  if (!m) return next()
  const [, host, port = '1985', path] = m
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' })
    return res.end()
  }
  const p = http.request({ hostname: host, port: Number(port), path, method: req.method, headers: { ...req.headers, host: `${host}:${port}` }, timeout: 10000 }, (r) => {
    res.writeHead(r.statusCode ?? 502, { ...r.headers, 'Access-Control-Allow-Origin': '*' })
    r.pipe(res)
  })
  p.on('timeout', () => p.destroy(new Error('timeout')))
  p.on('error', (e) => { if (!res.headersSent) { res.writeHead(502); res.end('rtc-proxy: ' + e.message) } })
  req.pipe(p)
}
const rtcProxyPlugin = (): Plugin => ({
  name: 'rtc-proxy',
  configureServer: (s) => { s.middlewares.use(rtcProxy) },
  configurePreviewServer: (s) => { s.middlewares.use(rtcProxy) },
})

export default defineConfig({
  plugins: [vue(), rtcProxyPlugin()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5174,
    strictPort: true,
  },
  build: { chunkSizeWarningLimit: 1500 },
})
