<script setup lang="ts">
/** 插件管理：设备接入插件的运行状态、支持型号、能力与描述文件；可启停 / 重启 */
import { computed, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { ReloadOutlined, PoweroffOutlined, PlayCircleOutlined, FileTextOutlined, ApiOutlined, SearchOutlined } from '@ant-design/icons-vue'
import CapTags from '@/components/plugin/CapTags.vue'
import { DESCRIPTORS, PLUGINS } from '@/plugins/catalog'
import type { Capability, PluginInfo } from '@/plugins/types'
import { fleet, pluginDevices, setPluginStatus } from './store'

const kw = ref('')
const st = ref<'all' | PluginInfo['status']>('all')
const S: Record<PluginInfo['status'], { t: string; b: 'success' | 'default' | 'error'; c: string }> = {
  running: { t: '运行中', b: 'success', c: '#45E3A8' }, stopped: { t: '已停止', b: 'default', c: '#8EA6BE' }, error: { t: '异常', b: 'error', c: '#FF6B6B' },
}
const list = computed(() => PLUGINS.filter((p) => (st.value === 'all' || p.status === st.value) && (!kw.value || `${p.name}${p.id}${p.vendor}`.toLowerCase().includes(kw.value.toLowerCase()))))
const stat = computed(() => ({ all: PLUGINS.length, running: PLUGINS.filter((p) => p.status === 'running').length, error: PLUGINS.filter((p) => p.status === 'error').length, devs: fleet.devices.length }))
const modelName = (code: string) => fleet.models.find((m) => m.id === code)?.name ?? DESCRIPTORS[code]?.model.name ?? code
const caps = (p: PluginInfo) => [...new Set(p.models.flatMap((c) => DESCRIPTORS[c]?.capabilities ?? []))] as Capability[]
const devCount = (p: PluginInfo) => { const ds = pluginDevices(p.id); return { all: ds.length, on: ds.filter((d) => d.status !== 'offline').length } }
const busy = ref<Record<string, boolean>>({})
function run(p: PluginInfo, act: 'start' | 'stop' | 'restart') {
  const go = () => {
    busy.value[p.id] = true
    if (act === 'stop') { setPluginStatus(p.id, 'stopped'); busy.value[p.id] = false; message.success(`${p.name} 已停止`); return }
    setTimeout(() => { setPluginStatus(p.id, 'running'); busy.value[p.id] = false; message.success(`${p.name} ${act === 'start' ? '已启动' : '已重启'}，设备重新连接`) }, 1200)
  }
  const n = devCount(p).all
  if (act === 'start') return go()
  Modal.confirm({ title: `${act === 'stop' ? '停止' : '重启'}插件「${p.name}」？`, content: n ? `该插件下 ${n} 台设备将${act === 'stop' ? '离线，业务任务与遥操作中断' : '短暂断开后重连'}。` : '该插件下暂无设备。', okText: act === 'stop' ? '停止' : '重启', okType: act === 'stop' ? 'danger' : 'primary', cancelText: '取消', onOk: go })
}
const ERR_MSG = '连接飞控失败：MAVLink 心跳超时（udp://0.0.0.0:14540），已重试 3 次'
const manifest = ref<PluginInfo | null>(null)
const mfCode = ref('')
const mfText = computed(() => manifest.value ? JSON.stringify({ plugin: { id: manifest.value.id, name: manifest.value.name, version: manifest.value.version, sdk: manifest.value.sdk, transport: manifest.value.transport }, descriptor: DESCRIPTORS[mfCode.value] }, null, 2) : '')
const openMf = (p: PluginInfo) => { manifest.value = p; mfCode.value = p.models[0] ?? '' }
</script>

<template>
  <div class="pm">
    <div class="pm-head">
      <div class="pm-kpi">
        <div><small>已安装插件</small><b class="mono">{{ stat.all }}</b></div>
        <div><small>运行中</small><b class="mono ok">{{ stat.running }}</b></div>
        <div><small>异常</small><b class="mono" :class="{ err: stat.error }">{{ stat.error }}</b></div>
        <div><small>接入设备</small><b class="mono">{{ stat.devs }}</b></div>
      </div>
      <div class="pm-tool">
        <a-radio-group v-model:value="st" button-style="solid">
          <a-radio-button value="all">全部</a-radio-button><a-radio-button value="running">运行中</a-radio-button><a-radio-button value="error">异常</a-radio-button><a-radio-button value="stopped">已停止</a-radio-button>
        </a-radio-group>
        <a-input v-model:value="kw" allow-clear placeholder="搜索插件名称 / 标识 / 厂商" style="width: 240px"><template #prefix><SearchOutlined /></template></a-input>
      </div>
    </div>

    <div class="pm-grid">
      <section v-for="p in list" :key="p.id" class="pp-panel pm-card" :style="{ '--sc': S[p.status].c }">
        <div class="pm-top">
          <span class="pm-ic"><ApiOutlined /></span>
          <div class="pm-t"><b>{{ p.name }}</b><small class="mono muted">{{ p.id }} · v{{ p.version }}</small></div>
          <a-badge class="pm-st" :status="S[p.status].b" :text="S[p.status].t" />
        </div>
        <p class="pm-desc">{{ p.desc }}</p>
        <dl class="pm-meta">
          <div><dt>厂商</dt><dd>{{ p.vendor }}</dd></div>
          <div><dt>SDK</dt><dd>{{ p.sdk }}</dd></div>
          <div><dt>语言</dt><dd>{{ p.lang }}</dd></div>
          <div><dt>通信</dt><dd>{{ p.transport }}</dd></div>
          <div><dt>设备</dt><dd class="mono">{{ devCount(p).on }} / {{ devCount(p).all }} 在线</dd></div>
          <div><dt>资源</dt><dd class="mono">{{ p.status === 'running' ? `CPU ${p.cpu}% · ${p.mem} MB` : '—' }}</dd></div>
        </dl>
        <div class="pm-models"><span class="muted">支持型号</span>
          <template v-if="p.models.length"><a-tag v-for="c in p.models" :key="c" :bordered="false">{{ modelName(c) }}</a-tag></template>
          <span v-else class="faint">尚未绑定型号</span>
        </div>
        <CapTags v-if="caps(p).length" :caps="caps(p)" small :max="7" class="pm-caps" />
        <a-alert v-if="p.status === 'error'" type="error" show-icon class="pm-err" :message="ERR_MSG" />
        <div class="pm-ops">
          <span class="muted pm-since">{{ p.status === 'running' ? `启动于 ${p.startedAt}` : '未运行' }}</span>
          <a-button size="small" :disabled="!p.models.length" @click="openMf(p)"><FileTextOutlined />描述文件</a-button>
          <a-button v-if="p.status === 'running'" size="small" :loading="busy[p.id]" @click="run(p, 'restart')"><ReloadOutlined />重启</a-button>
          <a-button v-if="p.status === 'running'" size="small" danger @click="run(p, 'stop')"><PoweroffOutlined />停止</a-button>
          <a-button v-else size="small" type="primary" :loading="busy[p.id]" @click="run(p, p.status === 'error' ? 'restart' : 'start')"><PlayCircleOutlined />{{ p.status === 'error' ? '重启' : '启动' }}</a-button>
        </div>
      </section>
      <a-empty v-if="!list.length" class="pm-empty" description="没有匹配的插件" />
    </div>

    <a-modal :open="!!manifest" :width="760" :title="manifest ? `设备描述文件 · ${manifest.name}` : ''" :footer="null" @cancel="manifest = null">
      <div class="pm-mfbar"><span class="muted">型号</span><a-select v-model:value="mfCode" style="width: 220px" :options="(manifest?.models ?? []).map((c) => ({ value: c, label: modelName(c) }))" />
        <span class="muted pm-mfhint">插件注册时上报；前端据此渲染指标、控件与菜单</span></div>
      <pre class="pm-json mono">{{ mfText }}</pre>
    </a-modal>
  </div>
</template>

<style scoped>
.pm-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
.pm-kpi { display: flex; gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
.pm-kpi > div { padding: 10px 22px; background: var(--panel-2, #13263f); min-width: 112px; }
.pm-kpi small { display: block; font-size: 12px; color: var(--muted); }
.pm-kpi b { font-size: 22px; font-weight: 600; color: var(--title); } .pm-kpi b.ok { color: #45E3A8; } .pm-kpi b.err { color: #FF6B6B; }
.pm-tool { display: flex; gap: 10px; }
.pm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; }
.pm-card { position: relative; display: flex; flex-direction: column; padding: 16px 18px 14px; border-top: 2px solid var(--sc); }
.pm-top { display: flex; align-items: center; gap: 12px; }
.pm-ic { width: 38px; height: 38px; flex: none; display: grid; place-items: center; font-size: 18px; color: var(--sc); background: color-mix(in srgb, var(--sc) 12%, transparent); border-radius: 8px; }
.pm-t { flex: 1; min-width: 0; } .pm-t b { display: block; font-size: 15px; color: var(--title); font-weight: 600; } .pm-t small { font-size: 11.5px; }
.pm-desc { margin: 10px 0 10px; font-size: 12.5px; color: var(--muted); line-height: 1.6; min-height: 40px; }
.pm-meta { margin: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 12px; padding: 10px 12px; border-radius: 6px; background: rgba(10,24,42,.45); }
.pm-meta dt { font-size: 11.5px; color: var(--faint); } .pm-meta dd { margin: 1px 0 0; font-size: 12.5px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pm-models { margin-top: 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 12px; } .pm-models > span:first-child { margin-right: 4px; }
.pm-caps { margin-top: 10px; }
.pm-err { margin-top: 12px; font-size: 12px; }
.pm-ops { margin-top: auto; padding-top: 14px; display: flex; align-items: center; gap: 8px; }
.pm-since { margin-right: auto; font-size: 12px; }
.pm-empty { grid-column: 1 / -1; padding: 60px 0; }
.pm-mfbar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; } .pm-mfhint { margin-left: auto; font-size: 12px; }
.pm-json { max-height: 520px; overflow: auto; margin: 0; padding: 14px 16px; border-radius: 6px; background: #0a1524; border: 1px solid var(--line); color: #9FE6EF; font-size: 12px; line-height: 1.55; }
</style>
