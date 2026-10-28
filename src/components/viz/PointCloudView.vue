<script setup lang="ts">
/**
 * 三维点云查看器（three.js）：加载 PCD，按高度 / 强度着色，可叠加路线、任务点与机器人位姿。
 * 交互：左键旋转 · 右键平移 · 滚轮缩放；参考 robot_web ThreePointCloudPreview
 */
import { onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { SettingOutlined } from '@ant-design/icons-vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { loadPCD, type PointCloud } from './pcd'
import { MAP_FILES } from '@/config/media'

/** 显示设置（模块内共享） */
const cfg = reactive({ density: 'sparse' as 'sparse' | 'fine', scheme: 'blue' as 'blue' | 'rainbow' })
export interface CloudPt { x: number; y: number; st?: 'done' | 'cur' | 'todo' | 'bad' }
const props = withDefaults(defineProps<{
  src?: string
  /** 路线（机器人坐标 m） */
  route?: [number, number][] | null
  /** 路线已完成比例 0~1 */
  done?: number
  pts?: CloudPt[]
  /** 机器人位姿（m，yaw 为弧度，x 轴正向为 0） */
  robot?: { x: number; y: number; yaw: number } | null
  /** 实时建图：点云逐步累积 */
  live?: boolean
  toolbar?: boolean
  /** 初始视角 */
  view?: '3d' | 'top'
}>(), { src: MAP_FILES.pcd, route: null, done: 0, pts: () => [], robot: null, live: false, toolbar: true, view: '3d' })

const host = ref<HTMLDivElement>()
const state = ref<'loading' | 'ok' | 'error'>('loading')
const err = ref('')
const info = ref({ n: 0, shown: 0 })
const viewMode = ref(props.view)

let renderer: THREE.WebGLRenderer | null = null
let labeler: CSS2DRenderer | null = null
let scene: THREE.Scene, camera: THREE.PerspectiveCamera, controls: OrbitControls
let points: THREE.Points | null = null
let raf = 0, ro: ResizeObserver | null = null
let groundZ = 0, span = 50
const center = new THREE.Vector3()
const cloud = shallowRef<PointCloud | null>(null)
const overlay = new THREE.Group()
const lineMats: LineMaterial[] = []
let robotObj: THREE.Group | null = null
let liveT = 0

const showSet = ref(false)
/** 配色对齐 robot_web ThreePointCloudPreview：科技经典蓝（强度驱动 HSL）/ 高程彩虹（RViz rainbow，1%~99% 分位归一化） */
function paint() {
  const c = cloud.value; if (!c || !points) return
  const col = (points.geometry.getAttribute('color') as THREE.BufferAttribute)
  const tmp = new THREE.Color()
  const zs = Array.from(c.positions.filter((_, i) => i % 3 === 2 && i % 30 === 2)).sort((a, b) => a - b)
  const z0 = zs[Math.floor(zs.length * 0.01)] ?? c.min[2], z1 = zs[Math.floor(zs.length * 0.99)] ?? c.max[2]
  let imax = 0
  if (c.intensity) { const v = Array.from(c.intensity.filter((_, i) => i % 10 === 0)).sort((a, b) => a - b); imax = v[Math.floor(v.length * 0.99)] || 0 }
  for (let k = 0; k < c.count; k++) {
    const t = Math.min(1, Math.max(0, (c.positions[k * 3 + 2] - z0) / (z1 - z0 || 1)))
    if (cfg.scheme === 'blue') {
      const i = imax > 0 ? Math.min(1, c.intensity![k] / imax) : t
      tmp.setHSL(0.59 - i * 0.1, 0.9, 0.48 + i * 0.18)
    } else if (t < 0.25) tmp.setRGB(0, t / 0.25, 1)
    else if (t < 0.5) tmp.setRGB(0, 1, 1 - (t - 0.25) / 0.25)
    else if (t < 0.75) tmp.setRGB((t - 0.5) / 0.25, 1, 0)
    else tmp.setRGB(1, 1 - (t - 0.75) / 0.25, 0)
    col.setXYZ(k, tmp.r, tmp.g, tmp.b)
  }
  col.needsUpdate = true
}

function build(c: PointCloud) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(c.positions, 3))
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(c.count * 3), 3))
  const zs = Array.from(c.positions.filter((_, i) => i % 3 === 2 && i % 30 === 2)).sort((a, b) => a - b)
  groundZ = zs[Math.floor(zs.length * 0.05)] ?? c.min[2]
  // 视野中心：按点密度取 2%~98% 分位，避免离群点
  const q = (a: number) => { const v = Array.from(c.positions.filter((_, i) => i % 3 === a && i % 30 === a)).sort((x, y) => x - y); return [v[Math.floor(v.length * 0.02)], v[Math.floor(v.length * 0.98)]] }
  const [x0, x1] = q(0), [y0, y1] = q(1)
  center.set((x0 + x1) / 2, (y0 + y1) / 2, groundZ)
  span = Math.max(x1 - x0, y1 - y0)
  points = new THREE.Points(g, new THREE.PointsMaterial({ size: 1, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.6 }))
  scene.add(points)
  paint(); applyDensity()
  info.value = { n: c.count, shown: c.count }
  scene.fog = new THREE.Fog('#020915', span * 1.1, span * 3.2)
  setView(viewMode.value)
}

/** 稀疏：按 1/3 抽稀显示 */
function applyDensity() {
  const c = cloud.value; if (!c || !points) return
  const g = points.geometry
  if (cfg.density === 'sparse') {
    const idx: number[] = []; for (let k = 0; k < c.count; k += 3) idx.push(k)
    g.setIndex(idx)
  } else g.setIndex(null)
  ;(points.material as THREE.PointsMaterial).size = cfg.density === 'sparse' ? 1 : 1.1
}

function setView(v: '3d' | 'top') {
  viewMode.value = v
  if (!camera) return
  const d = span * 0.95
  // 与二维地图方向一致：屏幕上方 = 机器人 x 正向
  if (v === 'top') camera.position.set(center.x - 0.001, center.y, center.z + d * 1.25)
  else camera.position.set(center.x - d * 0.75, center.y, center.z + d * 0.62)
  controls.target.copy(center)
  controls.update()
}

function line(pts: [number, number][], color: number, width: number, z: number, dashed = false) {
  const g = new LineGeometry(); g.setPositions(pts.flatMap(([x, y]) => [x, y, z]))
  const m = new LineMaterial({ color, linewidth: width, dashed, dashSize: 1.2, gapSize: 0.8, transparent: true, opacity: 0.85, depthTest: false })
  m.resolution.set(host.value?.clientWidth ?? 800, host.value?.clientHeight ?? 500)
  lineMats.push(m)
  const l = new Line2(g, m); l.computeLineDistances(); l.renderOrder = 5
  return l
}
const label = (text: string, cls: string) => { const el = document.createElement('div'); el.className = `pcv-lb ${cls}`; el.textContent = text; return new CSS2DObject(el) }

function drawOverlay() {
  for (const o of [...overlay.children]) { overlay.remove(o); o.traverse((x) => { const a = x as THREE.Mesh; a.geometry?.dispose?.(); if (x instanceof CSS2DObject) x.element.remove() }) }
  lineMats.length = 0
  const z = groundZ + 0.25
  const r = props.route
  if (r && r.length > 1) {
    overlay.add(line(r, 0x2bff6d, 2, z, true))
    if (props.done > 0) {
      // 截取已完成部分
      const L = r.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - r[i][0], p[1] - r[i][1]), 0)
      let d = props.done * L; const out: [number, number][] = [r[0]]
      for (let i = 1; i < r.length && d > 0; i++) {
        const l = Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1])
        if (d >= l) { out.push(r[i]); d -= l } else { const t = d / l; out.push([r[i - 1][0] + (r[i][0] - r[i - 1][0]) * t, r[i - 1][1] + (r[i][1] - r[i - 1][1]) * t]); d = 0 }
      }
      if (out.length > 1) overlay.add(line(out, 0x2bff6d, 4, z + 0.02))
    }
    const s = label('起点', 'start'); s.position.set(r[0][0], r[0][1], z); overlay.add(s)
  }
  props.pts.forEach((p, i) => { const o = label(String(i + 1), `pt ${p.st ?? 'todo'}`); o.position.set(p.x, p.y, z); overlay.add(o) })
  if (props.robot) {
    robotObj = new THREE.Group()
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.4, 3), new THREE.MeshBasicMaterial({ color: 0x7ff3ff, depthTest: false }))
    cone.rotation.z = -Math.PI / 2; cone.scale.set(1, 1, 0.35); cone.renderOrder = 7
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.1, 40), new THREE.MeshBasicMaterial({ color: 0x7ff3ff, transparent: true, opacity: 0.45, depthTest: false, side: THREE.DoubleSide }))
    ring.name = 'pulse'; ring.renderOrder = 6
    robotObj.add(ring, cone)
    robotObj.position.set(props.robot.x, props.robot.y, z + 0.1)
    robotObj.rotation.z = props.robot.yaw
    overlay.add(robotObj)
  } else robotObj = null
}

function resize() {
  const el = host.value; if (!el || !renderer) return
  const w = el.clientWidth || 1, h = el.clientHeight || 1
  renderer.setSize(w, h, false); labeler?.setSize(w, h)
  camera.aspect = w / h; camera.updateProjectionMatrix()
  for (const m of lineMats) m.resolution.set(w, h)
}

function loop(t: number) {
  raf = requestAnimationFrame(loop)
  controls.update()
  if (robotObj) { const p = robotObj.getObjectByName('pulse'); if (p) { const s = 0.85 + 0.3 * (0.5 + 0.5 * Math.sin(t / 450)); p.scale.set(s, s, s) } }
  if (props.live && points && cloud.value) {
    liveT = (liveT + 0.0025) % 1.15
    const shown = Math.floor(cloud.value.count * Math.min(1, liveT))
    points.geometry.setDrawRange(0, shown); info.value.shown = shown
  }
  renderer!.render(scene, camera); labeler?.render(scene, camera)
}

onMounted(async () => {
  const el = host.value!
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  } catch (e) { state.value = 'error'; err.value = '当前浏览器不支持 WebGL'; return }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
  renderer.setClearColor('#020915', 1)
  el.appendChild(renderer.domElement)
  labeler = new CSS2DRenderer(); labeler.domElement.className = 'pcv-labels'; el.appendChild(labeler.domElement)
  scene = new THREE.Scene(); scene.background = new THREE.Color('#020915'); scene.add(overlay)
  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 5000); camera.up.set(0, 0, 1)
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true; controls.dampingFactor = 0.12; controls.screenSpacePanning = true; controls.maxPolarAngle = Math.PI * 0.49
  ro = new ResizeObserver(resize); ro.observe(el); resize()
  raf = requestAnimationFrame(loop)
  try {
    const c = await loadPCD(props.src)
    if (!renderer) return
    cloud.value = c; build(c); drawOverlay(); resize(); state.value = 'ok'
  } catch (e) { state.value = 'error'; err.value = (e as Error).message }
})
watch(() => [props.route, props.done, props.pts, props.robot], () => { if (cloud.value) drawOverlay() }, { deep: true })
watch(() => cfg.scheme, paint)
watch(() => cfg.density, applyDensity)
watch(() => props.live, (v) => { if (!v && points && cloud.value) { points.geometry.setDrawRange(0, Infinity); info.value.shown = cloud.value.count } })

onBeforeUnmount(() => {
  cancelAnimationFrame(raf); ro?.disconnect(); controls?.dispose()
  scene?.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose()) })
  renderer?.dispose(); renderer?.domElement.remove(); labeler?.domElement.remove(); renderer = null
})
</script>

<template>
  <div ref="host" class="pcv">
    <div v-if="state !== 'ok'" class="pcv-st"><template v-if="state === 'loading'"><a-spin size="small" /><span>点云加载中…</span></template><span v-else>点云加载失败：{{ err }}</span></div>
    <div v-if="state === 'ok'" class="pcv-tb" @click.stop @pointerdown.stop>
      <button type="button" class="gear" :class="{ on: showSet }" title="显示设置" @click="showSet = !showSet"><SettingOutlined /></button>
      <template v-if="toolbar"><i /><button type="button" :class="{ on: viewMode === '3d' }" @click="setView('3d')">3D</button><button type="button" :class="{ on: viewMode === 'top' }" @click="setView('top')">俯视</button></template>
    </div>
    <div v-if="showSet && state === 'ok'" class="pcv-set" @click.stop @pointerdown.stop>
      <div class="pcv-set-h">地图清晰度</div>
      <button v-for="o in [['sparse', '稀疏'], ['fine', '精细']]" :key="o[0]" type="button" class="pcv-opt" :class="{ on: cfg.density === o[0] }" @click="cfg.density = o[0] as any"><i />{{ o[1] }}</button>
      <div class="pcv-set-d" />
      <div class="pcv-set-h">配色方案</div>
      <button v-for="o in [['blue', '科技经典蓝'], ['rainbow', '高程彩虹']]" :key="o[0]" type="button" class="pcv-opt" :class="{ on: cfg.scheme === o[0] }" @click="cfg.scheme = o[0] as any"><i />{{ o[1] }}</button>
    </div>
    <div v-if="toolbar && state === 'ok'" class="pcv-info"><span class="ramp" :class="cfg.scheme" />低 → 高 · {{ info.shown.toLocaleString() }}{{ live ? ` / ${info.n.toLocaleString()}` : '' }} 点<small>左键旋转 · 右键平移 · 滚轮缩放</small></div>
  </div>
</template>

<style scoped>
.pcv { position: relative; width: 100%; height: 100%; min-height: 120px; overflow: hidden; background: #020915; }
.pcv :deep(canvas) { display: block; width: 100% !important; height: 100% !important; }
.pcv :deep(.pcv-labels) { position: absolute; inset: 0; pointer-events: none; }
.pcv-st { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 10px; color: var(--muted, #B6CADC); font-size: 13px; }
.pcv-tb { position: absolute; left: 10px; top: 10px; display: flex; align-items: center; gap: 2px; padding: 3px; background: rgba(13,28,49,.78); border: 1px solid rgba(46,211,230,.2); border-radius: 8px; z-index: 2; }
.pcv-tb button { height: 24px; padding: 0 9px; font: inherit; font-size: 12px; color: var(--muted, #B6CADC); background: none; border: 0; border-radius: 7px; cursor: pointer; }
.pcv-tb button.gear { width: 26px; padding: 0; font-size: 13px; }
.pcv-tb { left: 16px !important; top: 16px !important; padding: 0 !important; gap: 4px !important; background: none !important; border: 0 !important; }
.pcv-tb button.gear { width: 24px !important; height: 24px; display: grid; place-items: center; color: #9adfff !important; background: rgba(10,30,45,.75) !important; border: 1px solid #164159 !important; border-radius: 7px; transition: transform .2s, color .2s, border-color .2s; }
.pcv-tb button.gear.on, .pcv-tb button.gear:hover { color: #00e1ff !important; border-color: #00e1ff !important; }
.pcv-tb button.gear.on { transform: rotate(60deg); }
.pcv-tb > button:not(.gear) { background: rgba(10,30,45,.75); border: 1px solid #164159; color: #9adfff; }
.pcv-tb i { display: none; }
.pcv-set { position: absolute; left: 16px; top: 46px; z-index: 3; width: 145px; padding: 8px 10px; background: rgba(10,30,45,.92); border: 1px solid #164159; border-radius: 7px; box-shadow: 0 6px 18px rgba(0,0,0,.4); }
.pcv-set-h { margin: 2px 0 4px; font-size: 11px; color: #8ab4f8; }
.pcv-set-d { height: 1px; margin: 6px 0; background: #164159; }
.pcv-opt { display: flex; align-items: center; gap: 8px; width: 100%; padding: 4px 2px; font: inherit; font-size: 12px; color: #c9e6f5; text-align: left; background: none; border: 0; border-radius: 5px; cursor: pointer; }
.pcv-opt:hover { background: rgba(0,225,255,.08); }
.pcv-opt i { width: 12px; height: 12px; flex: none; border: 1px solid #4d7a93; border-radius: 50%; }
.pcv-opt.on { color: #00e1ff; } .pcv-opt.on i { border-color: #00e1ff; box-shadow: inset 0 0 0 2.5px rgba(10,30,45,.92); background: #00e1ff; }
.pcv-tb button:hover { color: #fff; } .pcv-tb > button:not(.gear).on { color: #00e1ff; border-color: #00e1ff; }
.pcv-tb i { width: 1px; height: 14px; margin: 0 4px; background: rgba(46,211,230,.25); }
.pcv-info { position: absolute; left: 10px; bottom: 8px; display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--muted, #B6CADC); z-index: 2; pointer-events: none; }
.pcv-info .ramp { width: 54px; height: 6px; border-radius: 5px; background: linear-gradient(90deg, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000); } .pcv-info .ramp.blue { background: linear-gradient(90deg, hsl(212,90%,48%), hsl(176,90%,66%)); }
.pcv-info small { color: var(--faint, #8EA6BE); margin-left: 6px; }
.pcv :deep(.pcv-lb) { font: 600 10.5px var(--mono, monospace); pointer-events: none; }
.pcv :deep(.pcv-lb.start) { padding: 1px 5px; color: #FFC15C; background: rgba(13,28,49,.8); border: 1px solid #FFC15C; border-radius: 7px; font-family: inherit; transform: translateY(-14px); }
.pcv :deep(.pcv-lb.pt) { width: 18px; height: 18px; display: grid; place-items: center; color: #FFD08A; background: #14253B; border: 1.5px solid #FFC15C; border-radius: 50%; }
.pcv :deep(.pcv-lb.pt.done) { color: #0B1C2E; background: #26C6DA; border-color: #7FF3FF; }
.pcv :deep(.pcv-lb.pt.bad) { color: #fff; background: #FF7A7A; border-color: #FFB0B0; }
.pcv :deep(.pcv-lb.pt.cur) { border-color: #fff; }
</style>
