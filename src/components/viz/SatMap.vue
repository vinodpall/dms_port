<script setup lang="ts">
/** 卫星地图（高德在线卫星图 + 路网），叠加路线、任务点、机器人位置 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { loadAMap, type AMapNS } from './amap'

export interface SatPt { lnglat: [number, number]; st?: 'done' | 'cur' | 'todo' | 'bad' }
const props = withDefaults(defineProps<{
  center: [number, number]
  zoom?: number
  route?: [number, number][] | null
  done?: [number, number][] | null
  ghost?: [number, number][][]
  pts?: SatPt[]
  robot?: { lnglat: [number, number]; yaw: number } | null
  arrow?: { lnglat: [number, number]; yaw: number } | null
  pick?: boolean
}>(), { zoom: 18, route: null, done: null, ghost: () => [], pts: () => [], robot: null, arrow: null, pick: false })
const emit = defineEmits<{ pick: [lng: number, lat: number] }>()

const el = ref<HTMLDivElement>()
const state = ref<'loading' | 'ok' | 'error'>('loading')
const err = ref('')
let A: AMapNS = null
let map: AMapNS = null
let layer: AMapNS[] = []
let robotMk: AMapNS = null

const ptHtml = (i: number, st = 'todo') => `<div class="sm-pt ${st}">${i + 1}</div>`
const robotHtml = (yaw: number) => `<div class="sm-rb"><i></i><svg viewBox="-6 -6 12 12" style="transform:rotate(${yaw}deg)"><path d="M4.5 0 L-2.6 3.2 L-1.2 0 L-2.6 -3.2 Z" fill="#7FF3FF" stroke="#0B1C2E" stroke-width=".4"/></svg></div>`

function draw() {
  if (!map) return
  map.remove(layer); layer = []
  const add = (o: AMapNS) => { layer.push(o); return o }
  for (const g of props.ghost) add(new A.Polyline({ path: g, strokeColor: '#C9DCE6', strokeOpacity: 0.45, strokeWeight: 2, strokeStyle: 'dashed', strokeDasharray: [6, 6] }))
  if (props.route?.length) {
    add(new A.Polyline({ path: props.route, strokeColor: '#45E3A8', strokeWeight: 9, strokeOpacity: 0.25, lineJoin: 'round' }))
    add(new A.Polyline({ path: props.route, strokeColor: '#45E3A8', strokeWeight: 3, strokeStyle: 'dashed', strokeDasharray: [10, 6], lineJoin: 'round' }))
    add(new A.Marker({ position: props.route[0], content: '<div class="sm-start">起点</div>', offset: new A.Pixel(-16, -28) }))
  }
  if (props.done && props.done.length > 1) add(new A.Polyline({ path: props.done, strokeColor: '#26C6DA', strokeWeight: 5, lineJoin: 'round' }))
  props.pts.forEach((p, i) => add(new A.Marker({ position: p.lnglat, content: ptHtml(i, p.st), offset: new A.Pixel(-10, -10), zIndex: 120 })))
  if (props.arrow) add(new A.Marker({ position: props.arrow.lnglat, content: `<div class="sm-arrow" style="transform:rotate(${props.arrow.yaw}deg)"></div>`, offset: new A.Pixel(0, -1), zIndex: 140 }))
  robotMk = props.robot ? add(new A.Marker({ position: props.robot.lnglat, content: robotHtml(props.robot.yaw), offset: new A.Pixel(-18, -18), zIndex: 150 })) : null
  map.add(layer)
}

/** 图层切换：标准图层 / 卫星图 */
const base = ref<'std' | 'sat'>('sat')
const layersOf = (b: 'std' | 'sat') => (b === 'std' ? [new A.TileLayer({ detectRetina: true })] : [new A.TileLayer.Satellite({ detectRetina: true }), new A.TileLayer.RoadNet({ detectRetina: true, opacity: 0.7 })])
watch(base, (b) => map?.setLayers(layersOf(b)))
const locate = () => { if (map && props.robot) map.setCenter(props.robot.lnglat, false, 300) }
defineExpose({ locate })

onMounted(async () => {
  try {
    A = await loadAMap()
    if (!el.value) return
    map = new A.Map(el.value, {
      zoom: props.zoom, zooms: [3, 20], center: props.center, viewMode: '2D',
      layers: layersOf(base.value),
      logoEnable: false, copyrightEnable: false, showLabel: true,
    })
    map.addControl(new A.Scale({ position: 'RB' }))
    map.on('click', (e: AMapNS) => { if (props.pick) emit('pick', e.lnglat.getLng(), e.lnglat.getLat()) })
    draw(); state.value = 'ok'
  } catch (e) { state.value = 'error'; err.value = (e as Error).message }
})
watch(() => [props.route, props.done, props.ghost, props.pts, props.arrow], draw, { deep: true })
watch(() => props.robot, (r) => {
  if (!map) return
  if (r && robotMk) { robotMk.setPosition(r.lnglat); robotMk.setContent(robotHtml(r.yaw)) } else draw()
}, { deep: true })
watch(() => props.center, (c) => map?.setCenter(c))
watch(() => props.pick, (v) => map?.setDefaultCursor(v ? 'crosshair' : 'default'))
onBeforeUnmount(() => { map?.destroy(); map = null })
</script>

<template>
  <div class="sat">
    <div ref="el" class="sat-map" />
    <div v-if="state === 'ok'" class="sat-tb" @click.stop><button type="button" :class="{ on: base === 'std' }" @click="base = 'std'">标准图层</button><button type="button" :class="{ on: base === 'sat' }" @click="base = 'sat'">卫星图</button></div>
    <div v-if="state !== 'ok'" class="sat-st"><template v-if="state === 'loading'"><a-spin size="small" /><span>卫星地图加载中…</span></template><span v-else>卫星地图加载失败：{{ err }}</span></div>
  </div>
</template>

<style scoped>
.sat { position: relative; width: 100%; height: 100%; min-height: 120px; background: #132034; overflow: hidden; }
.sat-map { position: absolute; inset: 0; }
.sat-tb { position: absolute; left: 10px; top: 10px; z-index: 5; display: flex; gap: 2px; padding: 3px; background: rgba(13,28,49,.82); border: 1px solid rgba(46,211,230,.25); border-radius: 6px; }
.sat-tb button { height: 24px; padding: 0 10px; font: inherit; font-size: 12px; color: var(--muted, #B6CADC); background: none; border: 0; border-radius: 4px; cursor: pointer; }
.sat-tb button:hover { color: #fff; } .sat-tb button.on { color: #0B2D3D; background: #26C6DA; }
.sat-st { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 10px; color: var(--muted, #B6CADC); font-size: 13px; }
.sat :deep(.amap-scalecontrol) { background: rgba(13,28,49,.6) !important; color: #F3F8FC; }
.sat :deep(.sm-pt) { width: 20px; height: 20px; display: grid; place-items: center; font: 600 11px var(--mono, monospace); color: #FFD08A; background: #14253B; border: 2px solid #FFC15C; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,.5); }
.sat :deep(.sm-pt.done) { color: #0B1C2E; background: #26C6DA; border-color: #7FF3FF; }
.sat :deep(.sm-pt.bad) { color: #fff; background: #FF7A7A; border-color: #FFB0B0; }
.sat :deep(.sm-pt.cur) { border-color: #fff; }
.sat :deep(.sm-start) { padding: 1px 6px; font-size: 11px; white-space: nowrap; color: #FFC15C; background: rgba(13,28,49,.85); border: 1px solid #FFC15C; border-radius: 4px; }
.sat :deep(.sm-rb) { position: relative; width: 36px; height: 36px; display: grid; place-items: center; }
.sat :deep(.sm-rb i) { position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(rgba(127,243,255,.55), rgba(127,243,255,0) 70%); animation: sm-pulse 2.8s ease-in-out infinite; }
.sat :deep(.sm-rb svg) { width: 26px; height: 26px; position: relative; }
.sat :deep(.sm-arrow) { width: 46px; height: 3px; background: #FF7A7A; transform-origin: 0 50%; position: relative; }
.sat :deep(.sm-arrow::after) { content: ''; position: absolute; right: -6px; top: -5px; border: 6px solid transparent; border-left: 8px solid #FF7A7A; border-right: 0; }
@keyframes sm-pulse { 0%, 100% { opacity: .9; transform: scale(.85); } 50% { opacity: .35; transform: scale(1.15); } }
</style>
