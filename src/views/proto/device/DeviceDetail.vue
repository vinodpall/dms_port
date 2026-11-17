<script setup lang="ts">
/** 设备详情：按插件声明的能力动态组合模块，保持双栏比例协调与留白均衡 */
import { computed, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { ArrowLeftOutlined, ControlOutlined, EditOutlined, MoreOutlined, VideoCameraOutlined } from '@ant-design/icons-vue'
import DeviceGlyph from '@/components/proto/DeviceGlyph.vue'
import CamShot from '@/views/proto/biz/CamShot.vue'
import CapTags from '@/components/plugin/CapTags.vue'
import TelemetryGrid from '@/components/plugin/TelemetryGrid.vue'
import ControlPanel from '@/components/plugin/ControlPanel.vue'
import ChessBoard from '@/components/plugin/ChessBoard.vue'
import CmdList from '@/components/plugin/CmdList.vue'
import LogList from '@/components/plugin/LogList.vue'
import { STATUS_META, TYPE_META, canTeleop, hasTeleop, isOnline, type Device } from '@/models/device'
import { descriptorOf, pluginOf } from '@/plugins/catalog'
import { pluginRunning } from '@/plugins/runtime'
import { GROUP_META } from '@/plugins/types'
import { fleet, modelOf, removeDevice, rtOf } from './store'

const props = defineProps<{ id: string }>()
const emit = defineEmits<{ back: []; teleop: [Device]; edit: [Device] }>()

const d = computed(() => fleet.devices.find((x) => x.id === props.id))
const m = computed(() => (d.value ? modelOf(d.value) : undefined))
const on = computed(() => !!d.value && isOnline(d.value))
const cam = ref(0)
watch(() => props.id, () => { cam.value = 0 })

const desc = computed(() => descriptorOf(d.value?.modelId))
const plugin = computed(() => pluginOf(desc.value.pluginId))
const rt = computed(() => (d.value ? rtOf(d.value) : undefined))
const has = (c: string) => desc.value.capabilities.includes(c as never)
const cams = computed(() => desc.value.video?.map((v) => ({ label: v.label, ir: !!v.ir })) ?? m.value?.cameras.map((c) => ({ label: c, ir: c === '红外' })) ?? [])
const showCam = computed(() => has('video') && cams.value.length > 0)
const chess = computed(() => has('custom:chess'))
const hasLoc = computed(() => has('location'))
/** 设备管理范围内可用控件（导航/任务/遥操作归其他页面） */
const ctrlCount = computed(() => desc.value.controls.filter((c) => c.kind !== 'joystick' && !['teleop', 'navigation', 'task'].includes(c.group)).length)
/** 首屏主区：有视频放视频，下棋放棋盘，否则仅展示型号卡与实时状态 */
const lead = computed<'cam' | 'chess' | 'ctrl' | 'none'>(() => (showCam.value ? 'cam' : chess.value ? 'chess' : ctrlCount.value ? 'ctrl' : 'none'))
const hasVisualLead = computed(() => lead.value === 'cam' || lead.value === 'chess')

const pose = computed(() => rt.value?.values.pose as { x: number; y: number; yaw: number } | undefined)
const tab = ref('info')
watch(() => props.id, () => { tab.value = 'info' })
const KIND_LABEL: Record<string, string> = { button: '按钮', toggle: '开关', select: '选择', slider: '滑块', joystick: '摇杆' }
const TYPE_LABEL: Record<string, string> = { number: '数值', percent: '百分比', string: '文本', boolean: '布尔', enum: '枚举', duration: '时长', pose2d: '位姿', gps: 'GPS' }
const P_STATUS: Record<string, { t: string; b: 'success' | 'default' | 'error' }> = { running: { t: '运行中', b: 'success' }, stopped: { t: '已停止', b: 'default' }, error: { t: '异常', b: 'error' } }

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
      <span class="dd-ic"><DeviceGlyph :type="d.type" :size="32" :color="TYPE_META[d.type].color" /></span>
      <div class="dd-t">
        <div class="dd-title">
          <b>{{ d.name }}</b>
          <a-badge :status="STATUS_META[d.status].badge" :text="STATUS_META[d.status].label" />
          <CapTags class="dd-caps" :caps="desc.capabilities" scope="device" small />
        </div>
        <small class="muted">{{ TYPE_META[d.type].label }} · {{ m.name }} · {{ d.area }} · <span class="mono">{{ d.ip }}</span>
          <template v-if="plugin"> · 插件 <a-badge :status="P_STATUS[plugin.status].b" />{{ plugin.name }}</template></small>
      </div>
      <div class="dd-op">
        <a-tooltip v-if="hasTeleop(d)" :title="canTeleop(d) ? '' : '设备离线或故障，暂不可遥操作'">
          <a-button type="primary" :disabled="!canTeleop(d)" @click="emit('teleop', d)"><ControlOutlined />遥操作</a-button>
        </a-tooltip>
        <a-button @click="emit('edit', d)"><EditOutlined />编辑</a-button>
        <a-dropdown :trigger="['click']"><a-button><MoreOutlined /></a-button>
          <template #overlay><a-menu><a-menu-item key="del" danger @click="del">删除设备</a-menu-item></a-menu></template>
        </a-dropdown>
      </div>
    </div>

    <!-- 第一行：实时画面/棋盘（若有） + 型号形象卡 & 实时状态 -->
    <div class="dd-grid" :class="{ 'is-minimal': !hasVisualLead }">
      <div class="dd-col">
        <section v-if="lead === 'cam'" class="pp-panel dd-campanel">
          <div class="pp-panel-h"><h3>实时画面</h3>
            <div class="r"><a-radio-group v-model:value="cam" size="small" button-style="solid"><a-radio-button v-for="(c, i) in cams" :key="c.label" :value="i">{{ c.label }}</a-radio-button></a-radio-group></div>
          </div>
          <div class="dd-cam">
            <CamShot v-if="on" :seed="cam + d.id.length * 3" :ir="cams[cam]?.ir" />
            <div v-else class="dd-empty">
              <VideoCameraOutlined />
              <span>{{ pluginRunning(d.modelId) ? '设备离线，暂无画面' : '接入插件未运行，暂无画面' }}</span>
            </div>
            <span v-if="on" class="dd-live"><i />LIVE · {{ cams[cam]?.label }}</span>
          </div>
        </section>
        <section v-else-if="lead === 'chess'" class="pp-panel dd-campanel">
          <div class="pp-panel-h"><h3>棋局</h3><span class="r muted" style="font-size:12px">由插件扩展面板渲染</span></div>
          <div class="dd-chess"><ChessBoard :state="rt" :size="280" /></div>
        </section>
        <template v-else>
          <section class="pp-panel dd-hero">
            <div class="dd-stage"><img v-if="m.image" :src="m.image" :alt="m.name" /><DeviceGlyph v-else :type="d.type" :size="88" :color="TYPE_META[d.type].color" /></div>
            <dl class="dd-mi">
              <div><dt>型号</dt><dd :title="m.name">{{ m.name }}</dd></div>
              <div><dt>厂商</dt><dd :title="m.vendor">{{ m.vendor }}</dd></div>
              <div><dt>序列号</dt><dd class="mono" :title="d.sn">{{ d.sn }}</dd></div>
              <div><dt>尺寸</dt><dd class="mono" :title="m.size ? `${m.size} mm` : '—'">{{ m.size ? `${m.size} mm` : '—' }}</dd></div>
            </dl>
          </section>
          <section v-if="lead === 'none'" class="pp-panel dd-hint-panel">
            <span class="muted">该型号暂未声明实时画面或控制指令，可在下方查看设备档案与接入状态</span>
          </section>
        </template>
      </div>

      <div class="dd-col">
        <!-- 有视觉主区时，型号卡置于右上；否则右上专注展示实时状态 -->
        <section v-if="hasVisualLead" class="pp-panel dd-hero">
          <div class="dd-stage"><img v-if="m.image" :src="m.image" :alt="m.name" /><DeviceGlyph v-else :type="d.type" :size="88" :color="TYPE_META[d.type].color" /></div>
          <dl class="dd-mi">
            <div><dt>型号</dt><dd :title="m.name">{{ m.name }}</dd></div>
            <div><dt>厂商</dt><dd :title="m.vendor">{{ m.vendor }}</dd></div>
            <div><dt>序列号</dt><dd class="mono" :title="d.sn">{{ d.sn }}</dd></div>
            <div><dt>尺寸</dt><dd class="mono" :title="m.size ? `${m.size} mm` : '—'">{{ m.size ? `${m.size} mm` : '—' }}</dd></div>
          </dl>
        </section>
        <section class="pp-panel dd-tele-panel">
          <div class="pp-panel-h"><h3>实时状态</h3><span class="r muted" style="font-size:12px">{{ on ? '刚刚更新' : `最后在线 ${d.lastSeen}` }}</span></div>
          <TelemetryGrid :desc="desc" :state="rt" display="detail" />
        </section>
      </div>
    </div>

    <!-- 第二行：设备控制（左）与 位置 + 基本信息标签页（右）左右并排 -->
    <div class="dd-row2" :class="{ 'solo-right': !ctrlCount }">
      <section v-if="ctrlCount" class="pp-panel dd-ctl-panel">
        <div class="pp-panel-h"><h3>设备控制</h3><span class="r muted" style="font-size:12px">控件由插件声明，不可用时悬停查看原因</span></div>
        <div class="dd-ctrl"><ControlPanel :device-id="d.id" :desc="desc" :variant="lead === 'chess' || lead === 'ctrl' ? 'cards' : 'panel'" :cols="3" /></div>
      </section>

      <div class="dd-col">
        <section v-if="hasLoc" class="pp-panel">
          <div class="pp-panel-h"><h3>位置</h3><span class="r muted" style="font-size:12px">{{ d.area }}</span></div>
          <div class="dd-loc">
            <svg viewBox="0 0 60 40" class="dd-map" preserveAspectRatio="xMidYMid slice">
              <defs><pattern id="dd-g" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0H0V5" fill="none" stroke="rgba(46,211,230,.12)" stroke-width=".2" /></pattern></defs>
              <rect width="60" height="40" fill="url(#dd-g)" /><rect x=".3" y=".3" width="59.4" height="39.4" fill="none" stroke="rgba(46,211,230,.3)" stroke-width=".3" />
              <g v-if="on && pose" :transform="`translate(${pose.x} ${pose.y})`">
                <circle r="2.6" fill="rgba(46,211,230,.18)" /><path :transform="`rotate(${pose.yaw})`" d="M0 -2.2 L1.4 1.4 L0 .6 L-1.4 1.4 Z" fill="#2ED3E6" />
              </g>
            </svg>
            <div class="dd-xy mono">
              <div><small>X 坐标</small><b>{{ on && pose ? pose.x.toFixed(1) : '—' }}</b></div>
              <div><small>Y 坐标</small><b>{{ on && pose ? pose.y.toFixed(1) : '—' }}</b></div>
              <div><small>航向角</small><b>{{ on && pose ? Math.round(pose.yaw) + '°' : '—' }}</b></div>
            </div>
          </div>
        </section>

        <section class="pp-panel dd-more" :class="{ compact: ctrlCount > 0 }">
          <a-tabs v-model:active-key="tab" size="small">
            <a-tab-pane key="info" tab="基本信息">
              <a-descriptions :column="ctrlCount ? 2 : 3" size="small" class="dd-desc">
                <a-descriptions-item label="序列号"><span class="mono">{{ d.sn }}</span></a-descriptions-item>
                <a-descriptions-item label="型号">{{ m.name }}（{{ m.vendor }}）</a-descriptions-item>
                <a-descriptions-item label="内网 IP"><span class="mono">{{ d.ip }}</span></a-descriptions-item>
                <a-descriptions-item label="外网 IP"><span class="mono">{{ d.publicIp || '—' }}</span></a-descriptions-item>
                <a-descriptions-item label="相机地址"><span class="mono">{{ d.cameraIps?.length ? d.cameraIps.join('; ') : '—' }}</span></a-descriptions-item>
                <a-descriptions-item label="所属区域">{{ d.area }}</a-descriptions-item>
                <a-descriptions-item label="固件版本"><span class="mono">{{ d.firmware }}</span></a-descriptions-item>
                <a-descriptions-item label="入场日期"><span class="mono">{{ d.commissioned }}</span></a-descriptions-item>
                <a-descriptions-item label="备注">{{ d.remark || '—' }}</a-descriptions-item>
              </a-descriptions>
            </a-tab-pane>
            <a-tab-pane key="spec" tab="型号规格">
              <a-descriptions :column="ctrlCount ? 2 : 3" size="small" class="dd-desc">
                <a-descriptions-item label="最高速度">{{ m.spec.speed }}</a-descriptions-item>
                <a-descriptions-item label="续航">{{ m.spec.endurance }}</a-descriptions-item>
                <a-descriptions-item label="负载">{{ m.spec.payload }}</a-descriptions-item>
                <a-descriptions-item label="重量">{{ m.spec.weight }}</a-descriptions-item>
                <a-descriptions-item label="电压范围"><span class="mono">{{ m.voltMin != null && m.voltMax != null ? `${m.voltMin} – ${m.voltMax} V` : '—' }}</span></a-descriptions-item>
                <a-descriptions-item label="尺寸"><span class="mono">{{ m.size ? `${m.size} mm` : '—' }}</span></a-descriptions-item>
                <a-descriptions-item label="摄像头">{{ cams.length ? cams.map((c) => c.label).join('、') : '无' }}</a-descriptions-item>
              </a-descriptions>
            </a-tab-pane>
            <a-tab-pane key="plugin" tab="插件与能力">
              <div class="dd-plug">
                <a-descriptions v-if="plugin" :column="ctrlCount ? 2 : 3" size="small" class="dd-desc">
                  <a-descriptions-item label="接入插件">{{ plugin.name }} <span class="mono muted">v{{ plugin.version }}</span></a-descriptions-item>
                  <a-descriptions-item label="运行状态"><a-badge :status="P_STATUS[plugin.status].b" :text="P_STATUS[plugin.status].t" /></a-descriptions-item>
                  <a-descriptions-item label="通信方式">{{ plugin.transport }}</a-descriptions-item>
                  <a-descriptions-item label="厂商 SDK">{{ plugin.sdk }}</a-descriptions-item>
                  <a-descriptions-item label="型号编码"><span class="mono">{{ desc.model.code || d.modelId }}</span></a-descriptions-item>
                  <a-descriptions-item label="描述版本"><span class="mono">schema {{ desc.schemaVersion }}</span></a-descriptions-item>
                </a-descriptions>
                <a-alert v-else type="warning" show-icon message="该型号暂无接入插件，仅展示基础档案信息" style="margin:6px 0 12px" />
                <h4>设备能力</h4><CapTags :caps="desc.capabilities" />
                <div class="dd-plug-cols">
                  <div><h4>上报字段 <em>{{ desc.telemetry.length }}</em></h4>
                    <a-table size="small" :pagination="false" :data-source="desc.telemetry" row-key="key" :scroll="{ y: 220 }"
                      :columns="[{ title: '字段', dataIndex: 'label' }, { title: '标识', dataIndex: 'key' }, { title: '类型', dataIndex: 'type' }, { title: '单位', dataIndex: 'unit' }, { title: '告警阈值', dataIndex: 'warn' }]">
                      <template #bodyCell="{ column, record, text }">
                        <span v-if="column.dataIndex === 'key'" class="mono muted">{{ text }}</span>
                        <span v-else-if="column.dataIndex === 'type'">{{ TYPE_LABEL[record.type] ?? text }}</span>
                        <span v-else-if="column.dataIndex === 'warn'" class="mono">{{ text || '—' }}</span>
                        <template v-else>{{ text ?? '—' }}</template>
                      </template>
                    </a-table></div>
                  <div><h4>控制指令 <em>{{ desc.controls.length }}</em></h4>
                    <a-table size="small" :pagination="false" :data-source="desc.controls" row-key="key" :scroll="{ y: 220 }"
                      :columns="[{ title: '指令', dataIndex: 'label' }, { title: '标识', dataIndex: 'key' }, { title: '分组', dataIndex: 'group' }, { title: '控件', dataIndex: 'kind' }, { title: '确认', dataIndex: 'confirm' }]">
                      <template #bodyCell="{ column, record, text }">
                        <span v-if="column.dataIndex === 'key'" class="mono muted">{{ text }}</span>
                        <span v-else-if="column.dataIndex === 'group'">{{ GROUP_META[record.group as keyof typeof GROUP_META]?.label ?? text }}</span>
                        <span v-else-if="column.dataIndex === 'kind'">{{ KIND_LABEL[text] ?? text }}</span>
                        <span v-else-if="column.dataIndex === 'confirm'">{{ record.confirm || record.danger ? '需确认' : '—' }}</span>
                        <template v-else>{{ text }}</template>
                      </template>
                    </a-table></div>
                </div>
              </div>
            </a-tab-pane>
            <a-tab-pane key="cmd" tab="执行记录"><CmdList :device-id="d.id" /></a-tab-pane>
            <a-tab-pane key="log" tab="设备日志"><LogList :device-id="d.id" /></a-tab-pane>
          </a-tabs>
        </section>
      </div>
    </div>
  </div>
  <a-result v-else status="404" title="设备不存在" sub-title="该设备可能已被删除"><template #extra><a-button @click="emit('back')">返回列表</a-button></template></a-result>
</template>

<style scoped>
.dd-head { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; flex-wrap: wrap; }
.dd-back { font-size: 16px; color: var(--muted); flex: none; }
.dd-ic { flex: none; width: 50px; height: 50px; overflow: hidden; display: grid; place-items: center;
  background: linear-gradient(135deg, rgba(46,211,230,.12), rgba(76,141,255,.06)); border: 1px solid rgba(46,211,230,.28); border-radius: 10px; box-shadow: 0 4px 14px rgba(0,0,0,.22); }
.dd-t { flex: 1; min-width: 240px; }
.dd-title { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; }
.dd-title b { font-size: 20px; font-weight: 600; color: var(--title); line-height: 1.2; }
.dd-t small { display: block; margin-top: 4px; font-size: 12.5px; }
.dd-op { margin-left: auto; display: flex; gap: 8px; flex: none; }

.dd-grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(360px, 1fr); gap: 16px; align-items: start; margin-bottom: 16px; }
.dd-grid.is-minimal { grid-template-columns: minmax(340px, 1fr) minmax(0, 1.3fr); }
.dd-row2 { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 16px; align-items: start; }
.dd-row2.solo-right { grid-template-columns: 1fr; }
.dd-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.dd-campanel { display: flex; flex-direction: column; }

.dd-cam { position: relative; aspect-ratio: 16 / 9; margin: 14px; border-radius: 8px; overflow: hidden; background: #091524; border: 1px solid rgba(46,211,230,.16); }
.dd-cam :deep(svg) { width: 100%; height: 100%; display: block; }
.dd-live { position: absolute; left: 10px; top: 10px; padding: 3px 9px; border-radius: 4px; background: rgba(8,18,32,.72); backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,.12); color: #fff; font-size: 11.5px; display: flex; align-items: center; gap: 6px; }
.dd-live i { width: 6px; height: 6px; border-radius: 50%; background: #FF5A5A; box-shadow: 0 0 6px #FF5A5A; }
.dd-empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--muted); font-size: 13px; }
.dd-empty :deep(.anticon) { font-size: 26px; color: var(--faint); opacity: .7; }

.dd-hero { display: flex; align-items: stretch; gap: 16px; padding: 14px 16px; }
.dd-stage { position: relative; flex: 0 0 44%; min-height: 162px; padding: 10px 12px 16px; display: grid; place-items: center; border-radius: 8px; overflow: hidden;
  border: 1px solid rgba(46,211,230,.12);
  background: radial-gradient(ellipse 75% 65% at 50% 45%, rgba(46,211,230,.14), rgba(46,211,230,0) 70%), rgba(10,24,42,.5); }
.dd-stage::after { content: ''; position: absolute; left: 18%; right: 18%; bottom: 10px; height: 10px; border-radius: 50%; background: radial-gradient(ellipse, rgba(0,0,0,.45), transparent 70%); }
.dd-stage img { position: absolute; z-index: 1; inset: 10px 12px 14px; width: calc(100% - 24px); height: calc(100% - 24px); object-fit: contain; filter: drop-shadow(0 6px 10px rgba(0,0,0,.35)); }
.dd-mi { flex: 1; min-width: 0; margin: 0; display: grid; grid-template-columns: minmax(0, 1fr); align-content: center; gap: 9px; }
.dd-mi div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dd-mi dt { font-size: 11.5px; color: var(--faint); line-height: 1.2; }
.dd-mi dd { margin: 0; font-size: 13px; color: var(--title); line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.dd-hint-panel { padding: 14px 18px; font-size: 12.5px; }
.dd-tele-panel { overflow: hidden; }

.dd-loc { padding: 14px 16px; }
.dd-map { width: 100%; height: 160px; display: block; border-radius: 6px; background: rgba(11,23,38,.65); border: 1px solid rgba(46,211,230,.15); }
.dd-xy { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.dd-xy > div { display: flex; flex-direction: column; gap: 2px; padding: 7px 10px; border-radius: 6px; background: var(--well, rgba(12,27,45,.55)); border: 1px solid rgba(46,211,230,.1); }
.dd-xy small { font-size: 11px; color: var(--faint); }
.dd-xy b { font-size: 13.5px; font-weight: 600; color: var(--title); }

.dd-more { padding: 4px 18px 14px; }
.dd-more.compact .dd-plug-cols { grid-template-columns: 1fr; }
.dd-ctrl { padding: 16px; }
.dd-chess { display: grid; place-items: center; padding: 20px 24px; }
.dd-plug { padding-bottom: 10px; }
.dd-plug h4 { margin: 14px 0 8px; font-size: 13px; color: var(--title); font-weight: 600; }
.dd-plug h4 em { font-style: normal; color: var(--muted); font-weight: 400; margin-left: 4px; }
.dd-plug-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.dd-desc { margin-top: 4px; }

@media (max-width: 1120px) {
  .dd-grid, .dd-grid.is-minimal, .dd-row2 { grid-template-columns: 1fr; }
}
@media (max-width: 960px) {
  .dd-plug-cols { grid-template-columns: 1fr; }
}
</style>
