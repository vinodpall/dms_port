<script setup lang="ts">
/** 设备详情：首屏只放「摄像头 + 关键实时指标 + 位置」，档案、规格、日志收在下方标签页 */
import { computed, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { ArrowLeftOutlined, ControlOutlined, EditOutlined, MoreOutlined } from '@ant-design/icons-vue'
import DeviceGlyph from '@/components/proto/DeviceGlyph.vue'
import CamShot from '@/views/proto/biz/CamShot.vue'
import { STATUS_META, TYPE_META, canTeleop, isOnline, type Device, type MetricKey } from '@/models/device'
import { fleet, modelOf, removeDevice } from './store'

const props = defineProps<{ id: string }>()
const emit = defineEmits<{ back: []; teleop: [Device]; edit: [Device] }>()

const d = computed(() => fleet.devices.find((x) => x.id === props.id))
const m = computed(() => (d.value ? modelOf(d.value) : undefined))
const on = computed(() => !!d.value && isOnline(d.value))
const cam = ref(0)
watch(() => props.id, () => { cam.value = 0 })

const METRIC: Record<MetricKey, { label: string; val: (x: Device) => string; unit?: string; warn?: (x: Device) => boolean }> = {
  battery: { label: '电量', val: (x) => String(x.battery), unit: '%', warn: (x) => x.battery < 30 },
  speed: { label: '速度', val: (x) => x.tm.speed.toFixed(1), unit: 'm/s' },
  alt: { label: '相对高度', val: (x) => (x.tm.alt ?? 0).toFixed(1), unit: 'm' },
  gait: { label: '步态', val: (x) => x.tm.gait ?? '—' },
  joint: { label: '关节状态', val: (x) => x.tm.joint ?? '—', warn: (x) => x.tm.joint === '异常' },
  latency: { label: '网络延迟', val: (x) => String(x.tm.latency), unit: 'ms', warn: (x) => x.tm.latency > 120 },
}
const metrics = computed(() => (d.value ? TYPE_META[d.value.type].metrics.map((k) => ({ k, ...METRIC[k] })) : []))

const LOGS = [
  { t: '今天 09:12', c: '周工 遥操作 12 分钟' },
  { t: '昨天 16:40', c: '赵工 修改所属区域' },
  { t: '10-18 10:05', c: '固件升级至当前版本' },
  { t: '10-12 14:30', c: '设备接入平台' },
]

function del() {
  const x = d.value!
  Modal.confirm({ title: `删除设备「${x.name}」？`, content: '删除后不可恢复。', okText: '删除', okType: 'danger', cancelText: '取消',
    onOk: () => { removeDevice(x.id); message.success('已删除'); emit('back') } })
}
</script>

<template>
  <div v-if="d && m" class="dd">
    <div class="dd-head">
      <a-button type="text" class="dd-back" @click="emit('back')"><ArrowLeftOutlined /></a-button>
      <span class="dd-ic"><DeviceGlyph :type="d.type" :size="34" :color="TYPE_META[d.type].color" /></span>
      <div class="dd-t">
        <div><b>{{ d.name }}</b><a-badge :status="STATUS_META[d.status].badge" :text="STATUS_META[d.status].label" /></div>
        <small class="muted">{{ TYPE_META[d.type].label }} · {{ m.name }} · <span class="mono">{{ d.ip }}</span></small>
      </div>
      <div class="dd-op">
        <a-tooltip v-if="TYPE_META[d.type].teleop" :title="canTeleop(d) ? '' : '设备离线或故障，暂不可遥操作'">
          <a-button type="primary" :disabled="!canTeleop(d)" @click="emit('teleop', d)"><ControlOutlined />遥操作</a-button>
        </a-tooltip>
        <a-button @click="emit('edit', d)"><EditOutlined />编辑</a-button>
        <a-dropdown :trigger="['click']"><a-button><MoreOutlined /></a-button>
          <template #overlay><a-menu><a-menu-item key="del" danger @click="del">删除设备</a-menu-item></a-menu></template>
        </a-dropdown>
      </div>
    </div>

    <div class="dd-grid">
      <!-- 摄像头 -->
      <section class="pp-panel dd-campanel">
        <div class="pp-panel-h"><h3>摄像头</h3>
          <div class="r"><a-radio-group v-model:value="cam" size="small" button-style="solid"><a-radio-button v-for="(c, i) in m.cameras" :key="c" :value="i">{{ c }}</a-radio-button></a-radio-group></div>
        </div>
        <div class="dd-cam">
          <CamShot v-if="on" :seed="cam + d.id.length * 3" :ir="m.cameras[cam] === '红外'" />
          <div v-else class="dd-empty">设备离线，暂无画面</div>
          <span v-if="on" class="dd-live"><i />LIVE · {{ m.cameras[cam] }}</span>
        </div>
      </section>

      <div class="dd-side">
        <!-- 关键指标 -->
        <section class="pp-panel">
          <div class="pp-panel-h"><h3>实时状态</h3><span class="r muted" style="font-size:12px">{{ on ? '刚刚更新' : `最后在线 ${d.lastSeen}` }}</span></div>
          <div class="dd-metrics">
            <div v-for="x in metrics" :key="x.k" :class="{ warn: on && x.warn?.(d) }"><small>{{ x.label }}</small><b class="mono">{{ on ? x.val(d) : '—' }}<em v-if="on && x.unit">{{ x.unit }}</em></b></div>
          </div>
        </section>
        <!-- 位置 -->
        <section class="pp-panel">
          <div class="pp-panel-h"><h3>位置</h3><span class="r muted" style="font-size:12px">{{ d.area }}</span></div>
          <div class="dd-loc">
            <svg viewBox="0 0 60 40" class="dd-map" preserveAspectRatio="xMidYMid slice">
              <defs><pattern id="dd-g" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0H0V5" fill="none" stroke="rgba(46,211,230,.12)" stroke-width=".2" /></pattern></defs>
              <rect width="60" height="40" fill="url(#dd-g)" /><rect x=".3" y=".3" width="59.4" height="39.4" fill="none" stroke="rgba(46,211,230,.3)" stroke-width=".3" />
              <g v-if="on" :transform="`translate(${d.tm.x} ${d.tm.y})`">
                <circle r="2.6" fill="rgba(46,211,230,.18)" /><path :transform="`rotate(${d.tm.yaw})`" d="M0 -2.2 L1.4 1.4 L0 .6 L-1.4 1.4 Z" fill="#2ED3E6" />
              </g>
            </svg>
            <div class="dd-xy mono"><span>X {{ on ? d.tm.x.toFixed(1) : '—' }}</span><span>Y {{ on ? d.tm.y.toFixed(1) : '—' }}</span><span>航向 {{ on ? d.tm.yaw + '°' : '—' }}</span></div>
          </div>
        </section>
      </div>
    </div>

    <section class="pp-panel dd-more">
      <a-tabs size="small">
        <a-tab-pane key="info" tab="基本信息">
          <a-descriptions :column="3" size="small" class="dd-desc">
            <a-descriptions-item label="序列号"><span class="mono">{{ d.sn }}</span></a-descriptions-item>
            <a-descriptions-item label="型号">{{ m.name }}（{{ m.vendor }}）</a-descriptions-item>
            <a-descriptions-item label="内网 IP"><span class="mono">{{ d.ip }}</span></a-descriptions-item>
            <a-descriptions-item label="外网 IP"><span class="mono">{{ d.publicIp || '—' }}</span></a-descriptions-item>
            <a-descriptions-item label="相机 IP"><span class="mono">{{ d.cameraIps?.length ? d.cameraIps.join('; ') : '—' }}</span></a-descriptions-item>
            <a-descriptions-item label="电压范围"><span class="mono">{{ d.voltMin != null && d.voltMax != null ? `${d.voltMin} – ${d.voltMax} V` : '—' }}</span></a-descriptions-item>
            <a-descriptions-item label="尺寸"><span class="mono">{{ d.size ? `${d.size} mm` : '—' }}</span></a-descriptions-item>
            <a-descriptions-item label="所属区域">{{ d.area }}</a-descriptions-item>
            <a-descriptions-item label="通信协议">{{ m.protocol }}</a-descriptions-item>
            <a-descriptions-item label="固件版本"><span class="mono">{{ d.firmware }}</span></a-descriptions-item>
            <a-descriptions-item label="入场日期"><span class="mono">{{ d.commissioned }}</span></a-descriptions-item>
            <a-descriptions-item label="备注">{{ d.remark || '—' }}</a-descriptions-item>
          </a-descriptions>
        </a-tab-pane>
        <a-tab-pane key="spec" tab="型号规格">
          <a-descriptions :column="3" size="small" class="dd-desc">
            <a-descriptions-item label="最高速度">{{ m.spec.speed }}</a-descriptions-item>
            <a-descriptions-item label="续航">{{ m.spec.endurance }}</a-descriptions-item>
            <a-descriptions-item label="负载">{{ m.spec.payload }}</a-descriptions-item>
            <a-descriptions-item label="重量">{{ m.spec.weight }}</a-descriptions-item>
            <a-descriptions-item label="摄像头">{{ m.cameras.join('、') }}</a-descriptions-item>
          </a-descriptions>
        </a-tab-pane>
        <a-tab-pane key="log" tab="操作日志">
          <ul class="dd-log"><li v-for="l in LOGS" :key="l.t"><span class="mono muted">{{ l.t }}</span>{{ l.c }}</li></ul>
        </a-tab-pane>
      </a-tabs>
    </section>
  </div>
  <a-result v-else status="404" title="设备不存在" sub-title="该设备可能已被删除"><template #extra><a-button @click="emit('back')">返回列表</a-button></template></a-result>
</template>

<style scoped>
.dd-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.dd-back { font-size: 16px; color: var(--muted); }
.dd-ic { width: 48px; height: 48px; display: grid; place-items: center; background: rgba(46,211,230,.06); border: 1px solid var(--line); border-radius: 6px; }
.dd-t b { font-size: 20px; font-weight: 600; color: var(--title); margin-right: 12px; }
.dd-t small { display: block; margin-top: 2px; font-size: 12.5px; }
.dd-op { margin-left: auto; display: flex; gap: 8px; }
.dd-grid { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(300px, 1fr); gap: 16px; margin-bottom: 16px; }
.dd-campanel { display: flex; flex-direction: column; }
.dd-cam { position: relative; flex: 1; min-height: 360px; margin: 12px; border-radius: 4px; overflow: hidden; background: #0b1726; }
.dd-cam :deep(svg) { width: 100%; height: 100%; display: block; }
.dd-live { position: absolute; left: 10px; top: 10px; padding: 2px 8px; border-radius: 3px; background: rgba(0,0,0,.45); color: #fff; font-size: 11.5px; display: flex; align-items: center; gap: 6px; }
.dd-live i { width: 6px; height: 6px; border-radius: 50%; background: #FF5A5A; }
.dd-empty { height: 100%; display: grid; place-items: center; color: var(--muted); font-size: 13px; }
.dd-side { display: flex; flex-direction: column; gap: 16px; }
.dd-metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: var(--line); }
.dd-metrics > div { padding: 14px 16px; background: var(--panel-2, #13263f); }
.dd-metrics small { display: block; color: var(--muted); font-size: 12px; margin-bottom: 4px; }
.dd-metrics b { font-size: 22px; font-weight: 600; color: var(--title); }
.dd-metrics em { font-style: normal; font-size: 12px; color: var(--muted); margin-left: 3px; font-weight: 400; }
.dd-metrics .warn b { color: var(--warn); }
.dd-loc { padding: 12px 16px 14px; }
.dd-map { width: 100%; height: 200px; display: block; border-radius: 4px; background: rgba(11,23,38,.6); }
.dd-xy { display: flex; gap: 16px; margin-top: 8px; font-size: 12.5px; color: var(--muted); }
.dd-more { padding: 0 16px 6px; }
.dd-desc { margin-top: 4px; }
.dd-log { list-style: none; margin: 4px 0 10px; padding: 0; }
.dd-log li { display: flex; gap: 16px; padding: 8px 0; font-size: 13px; border-bottom: 1px dashed var(--line); }
.dd-log li:last-child { border-bottom: 0; }
.dd-log span { width: 90px; flex: none; font-size: 12px; }
</style>
