<script setup lang="ts">
/** WebRTC 实时视频（SRS），带连接状态、自动重连、HUD 与全屏 */
import { onMounted, ref, watch } from 'vue'
import { useWebRtc } from './webrtc'

const props = withDefaults(defineProps<{ url: string; label?: string; hud?: boolean; fit?: 'contain' | 'cover' }>(), { label: '', hud: true, fit: 'cover' })
const box = ref<HTMLDivElement>()
const video = ref<HTMLVideoElement>()
const { status, error, retries, play, onFrame } = useWebRtc()
const res = ref('')
const start = () => { if (video.value) play(props.url, video.value) }
onMounted(start)
watch(() => props.url, start)
const onMeta = () => { const v = video.value; if (v) res.value = `${v.videoWidth}×${v.videoHeight}` }
const full = () => { const el = box.value; if (!el) return; document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.() }
defineExpose({ full, reconnect: start })
</script>

<template>
  <div ref="box" class="rtv">
    <video ref="video" muted autoplay playsinline :style="{ objectFit: fit }" @loadedmetadata="onMeta" @resize="onMeta" @playing="onFrame" />
    <div v-if="hud && status === 'playing'" class="rtv-hud"><span>{{ label }}<template v-if="res"> · {{ res }}</template></span><b><i />LIVE</b></div>
    <div v-if="status !== 'playing'" class="rtv-st">
      <template v-if="status === 'failed'">
        <span>视频连接失败<small v-if="error">（{{ error }}）</small></span>
        <a-button size="small" @click="start">重新连接</a-button>
      </template>
      <template v-else><a-spin size="small" /><span>{{ status === 'retrying' ? `重连中（第 ${retries} 次）…` : '正在连接视频流…' }}</span></template>
      <small class="url mono">{{ url.replace(/^webrtc:\/\/[^/]+/, '') }}</small>
    </div>
  </div>
</template>

<style scoped>
.rtv { position: relative; width: 100%; height: 100%; min-height: 90px; overflow: hidden; background: #050C14; }
.rtv video { display: block; width: 100%; height: 100%; background: #050C14; }
.rtv-hud { position: absolute; left: 0; right: 0; top: 0; display: flex; justify-content: space-between; padding: 6px 10px; font: 11px var(--mono, monospace); color: rgba(230,247,251,.85); background: linear-gradient(rgba(0,0,0,.45), transparent); pointer-events: none; }
.rtv-hud b { display: flex; align-items: center; gap: 5px; color: #FF6B6B; font-weight: 600; }
.rtv-hud b i { width: 6px; height: 6px; border-radius: 50%; background: #FF6B6B; animation: rtv-b 1.6s infinite; }
.rtv-st { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--muted, #8FB3C7); font-size: 12.5px; text-align: center; padding: 10px; }
.rtv-st small { color: var(--faint, #5B7486); font-size: 11px; }
.rtv-st .url { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rtv:fullscreen video { object-fit: contain !important; }
@keyframes rtv-b { 50% { opacity: .3; } }
</style>
