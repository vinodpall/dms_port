/** SRS WebRTC 拉流（/rtc/v1/play/），参考 robot_web useWebRTCVideo：SDP 握手 + 指数退避自动重连 */
import { onBeforeUnmount, ref } from 'vue'

/** webrtc://host:port/app/stream → 信令地址 */
export function rtcApi(url: string) {
  const u = new URL(url.replace(/^webrtc:/, 'http:'))
  const mode = import.meta.env.VITE_RTC_API
  if (mode === 'direct') return `http://${u.hostname}:${u.port || 1985}/rtc/v1/play/`
  if (mode) return `${mode.replace(/\/$/, '')}/${u.hostname}/rtc/v1/play/`
  return `/rtc-proxy/${u.hostname}${u.port && u.port !== '1985' ? ':' + u.port : ''}/rtc/v1/play/`
}

export function useWebRtc(opts: { maxRetry?: number; baseDelay?: number } = {}) {
  const { maxRetry = 8, baseDelay = 2000 } = opts
  const status = ref<'idle' | 'connecting' | 'playing' | 'retrying' | 'failed'>('idle')
  const error = ref('')
  const retries = ref(0)
  let pc: RTCPeerConnection | null = null
  let el: HTMLVideoElement | null = null
  let url = ''
  let sid = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  const close = () => { if (pc) { try { pc.close() } catch { /* ignore */ } pc = null } }
  function retry() {
    if (!url || !el) return
    if (retries.value >= maxRetry) { status.value = 'failed'; return }
    status.value = 'retrying'; retries.value++
    clearTimeout(timer)
    timer = setTimeout(() => { void connect() }, Math.min(baseDelay * 1.5 ** (retries.value - 1), 10000))
  }
  async function connect() {
    if (!el || !url) return
    const my = ++sid
    close()
    if (status.value !== 'retrying') status.value = 'connecting'
    try {
      const p = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
      pc = p
      p.addTransceiver('video', { direction: 'recvonly' })
      p.addTransceiver('audio', { direction: 'recvonly' })
      p.ontrack = (e) => {
        if (my !== sid || !el) return
        if (e.track.kind !== 'video') return
        el.srcObject = e.streams[0] ?? new MediaStream([e.track])
        el.play().catch(() => undefined)
      }
      p.oniceconnectionstatechange = () => {
        if (my !== sid) return
        const s = p.iceConnectionState
        if (s === 'failed' || s === 'disconnected' || s === 'closed') { error.value = 'ICE 连接中断'; retry() }
      }
      const offer = await p.createOffer()
      await p.setLocalDescription(offer)
      const r = await fetch(rtcApi(url), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api: rtcApi(url), streamurl: url, clientip: null, sdp: offer.sdp }) })
      if (!r.ok) throw new Error(`信令服务 ${r.status}`)
      const d = await r.json()
      if (d.code !== 0 || !d.sdp) throw new Error(d.code === 5001 || d.code === 1028 ? '流不存在或未推流' : `SRS 返回 ${d.code}`)
      if (my !== sid) { p.close(); return }
      await p.setRemoteDescription({ type: 'answer', sdp: d.sdp })
    } catch (e) {
      if (my !== sid) return
      error.value = (e as Error).message || '连接失败'
      close(); retry()
    }
  }
  /** 收到首帧后由组件调用 */
  const onFrame = () => { status.value = 'playing'; retries.value = 0; error.value = '' }
  function play(u: string, v: HTMLVideoElement) { url = u; el = v; retries.value = 0; error.value = ''; status.value = 'connecting'; clearTimeout(timer); void connect() }
  function stop() { sid++; clearTimeout(timer); close(); if (el) el.srcObject = null; status.value = 'idle' }
  onBeforeUnmount(stop)
  return { status, error, retries, play, stop, onFrame }
}
