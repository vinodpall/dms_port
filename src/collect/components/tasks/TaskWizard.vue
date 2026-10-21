<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import StatusBadge from '@/collect/components/StatusBadge.vue'
import { MODE_SLOTS, MODES, OPS, SCEN, TODAY, type DevSlot, type ModeKey, type ScenKey } from '@/collect/constants'
import { DEF_PARAMS, useTasks } from '@/collect/stores/tasks'
import { useSettings } from '@/collect/stores/settings'
import { useDatasets } from '@/collect/stores/datasets'
import { useDict } from '@/collect/stores/dict'
import { useSession } from '@/collect/stores/session'
import { DEV_PARAMS, DV_ST, KITS, useDevices, type Device } from '@/collect/stores/devices'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; done: [id: string] }>()
const tasks = useTasks()
const settings = useSettings()
const dv = useDevices()
const ds = useDatasets()
const dict = useDict()
const session = useSession()

const step = ref(1)
const labels = ['场景与模式', '选择设备', '数据集与参数', '确认创建']
const defName = (s: ScenKey) => SCEN[s].short + ' · 新批次'
const defLang = (s: ScenKey) => (s === 'qmd' ? '把轮毂放上气密工装，夹紧后充气保压并判定是否合格' : '把防护堵对准轮毂安装孔并压入到位')
const blank = () => ({
  scen: 'qmd' as ScenKey, mode: 'vr' as ModeKey, name: defName('qmd'), note: '', op: 0, devices: [] as string[],
  dsMode: 'pick' as 'pick' | 'new', datasetId: '', dsName: '', params: { ...DEF_PARAMS }, lang: defLang('qmd'), objects: [] as string[],
})
const w = reactive(blank())
const err = reactive({ name: '', devices: '', dataset: '' })

const slots = computed(() => MODE_SLOTS[w.mode])
const slotDevs = (s: DevSlot) => dv.ofTypes(s.types)
const picked = computed(() => w.devices.map((id) => dv.byId(id)).filter((d): d is Device => !!d))
const inSlot = (s: DevSlot) => picked.value.filter((d) => s.types.includes(d.type))
const occ = (d: Device) => tasks.occupant(d.id)
const selectable = (d: Device) => d.st === 'online' && !occ(d)
const kits = computed(() => KITS.filter((k) => k.mode === w.mode))
const scenDs = computed(() => ds.list.filter((d) => d.scen === w.scen && d.status !== 'published'))
const allScenDs = computed(() => ds.list.filter((d) => d.scen === w.scen))

function applyKit(id: string) {
  const k = KITS.find((x) => x.id === id)
  if (!k) return
  w.devices = k.devices.filter((d) => { const x = dv.byId(d); return x && selectable(x) })
  err.devices = ''
}
function resetScene(s: ScenKey) {
  w.mode = SCEN[s].defMode
  w.objects = dict.objectsFor(s).slice(0, 2).map((x) => x.name)
  w.lang = defLang(s)
  w.datasetId = (scenDs.value[0] ?? allScenDs.value[0])?.id ?? ''
}
watch(() => props.open, (v) => {
  if (!v) return
  step.value = 1; Object.assign(w, blank()); err.name = err.devices = err.dataset = ''
  resetScene('qmd'); applyKit(kits.value[0]?.id ?? '')
})
watch(() => w.scen, (s, old) => { if (w.name === defName(old)) w.name = defName(s); resetScene(s) })
watch(() => w.mode, () => { applyKit(kits.value[0]?.id ?? ''); if (!kits.value.length) w.devices = [] })

function toggle(d: Device, s: DevSlot) {
  if (!selectable(d)) return
  if (w.devices.includes(d.id)) { w.devices = w.devices.filter((x) => x !== d.id); return }
  const cur = inSlot(s)
  if (cur.length >= s.max) w.devices = w.devices.filter((x) => x !== (s.max === 1 ? cur[0].id : cur[cur.length - 1].id))
  w.devices = [...w.devices, d.id]
  err.devices = ''
}
/** 槽位校验：数量、双臂同工位 */
const slotErr = (s: DevSlot) => {
  const n = inSlot(s).length
  if (n < s.min) return '至少选择 ' + s.min + ' 台'
  if (s.key === 'arm' && n === 2 && new Set(inSlot(s).map((d) => d.station)).size > 1) return '双臂协同需选择同一工位的两台机械臂'
  return ''
}
const uncal = computed(() => picked.value.filter((d) => !d.calib))
const rows = computed(() => picked.value.map((d) => ({ ...d, p: DEV_PARAMS[d.type] ?? DEV_PARAMS['其他'] })))
const resK: Record<string, number> = { '720p': 0.55, '1080p': 1, '4K': 3.2 }
const sizeGb = computed(() => rows.value.reduce((a, r) => a + r.p.gb * (r.type === '相机' || r.type === 'UMI' ? resK[w.params.res] * (w.params.fps / 30) * (w.params.codec === 'H.265' ? 0.7 : 1) : 1), 0))
const perHour = computed(() => (sizeGb.value * 3600) / 20)
const dsLabel = computed(() => (w.dsMode === 'new' ? w.dsName.trim() + '（新建）' : (ds.byId(w.datasetId)?.name ?? '—') + ' · ' + w.datasetId))
const preview = computed(() => settings.nameFile(SCEN[w.scen].code, TODAY, 1, OPS[w.op].c))
const objOpts = computed(() => dict.objectsFor(w.scen).map((x) => ({ value: x.name })))

function validate() {
  err.name = err.devices = err.dataset = ''
  if (step.value === 1) { w.name = w.name.trim(); err.name = w.name ? '' : '请填写任务名称' }
  if (step.value === 2) err.devices = slots.value.map(slotErr).find(Boolean) ?? ''
  if (step.value === 3) err.dataset = w.dsMode === 'new' ? (w.dsName.trim() ? '' : '请填写新数据集名称') : w.datasetId ? '' : '请选择目标数据集'
  return !err.name && !err.devices && !err.dataset
}
function next() { if (validate()) step.value++ }
function create(status: 'ready' | 'draft') {
  if (status === 'draft') w.name = w.name.trim() || '未命名任务'
  else for (const s of [1, 2, 3]) { step.value = s; if (!validate()) return }
  let datasetId = w.datasetId
  if (w.dsMode === 'new' && w.dsName.trim()) datasetId = ds.create(w.dsName.trim(), w.scen, session.info.user).id
  const t = tasks.create({ scen: w.scen, mode: w.mode, name: w.name, note: w.note.trim(), op: w.op, devices: w.devices, datasetId, params: w.params, lang: w.lang.trim(), objects: w.objects }, status)
  emit('close'); emit('done', t.id)
}
</script>

<template>
  <a-modal :open="open" title="新建采集任务" :width="880" :footer="null" centered destroy-on-close @cancel="emit('close')">
    <div class="steps" style="margin:4px 0 20px">
      <div v-for="(s, i) in labels" :key="s" class="step" :class="i + 1 < step ? 'done' : i + 1 === step ? 'cur' : ''">
        <span class="n"><AppIcon v-if="i + 1 < step" name="check" size="sm" /><template v-else>{{ i + 1 }}</template></span><span class="t">{{ s }}</span><span class="bar" />
      </div>
    </div>

    <!-- 1 场景与模式 -->
    <div v-if="step === 1" class="wz-body">
      <div class="field"><span class="label">采集场景</span>
        <div class="grid g2" style="gap:12px">
          <label v-for="(s, k) in SCEN" :key="k" class="fmtcard"><input v-model="w.scen" type="radio" name="scen" :value="k" /><span><b>{{ s.name }}</b><br /><span class="muted" style="font-size:12.5px">推荐 {{ MODES[s.defMode].name }} · 单条 {{ s.dur[0] }}–{{ s.dur[1] }} 秒</span></span></label>
        </div>
      </div>
      <div class="field"><span class="label">采集模式</span>
        <div class="grid g2" style="gap:12px">
          <label v-for="(m, k) in MODES" :key="k" class="fmtcard"><input v-model="w.mode" type="radio" name="mode" :value="k" /><span><b>{{ m.name }}</b><span v-if="SCEN[w.scen].defMode === k" class="tag" style="margin-left:6px">推荐</span><br /><span class="muted" style="font-size:12.5px">{{ m.desc }}</span></span></label>
        </div>
      </div>
      <a-form layout="vertical">
        <div class="two">
          <a-form-item label="任务名称" :validate-status="err.name ? 'error' : ''" :help="err.name"><a-input v-model:value="w.name" :maxlength="40" /></a-form-item>
          <a-form-item label="操作员"><a-select v-model:value="w.op" :options="OPS.map((o, i) => ({ value: i, label: o.n + '（' + o.c + '）' }))" /></a-form-item>
        </div>
        <a-form-item label="备注信息" style="margin-bottom:0"><a-textarea v-model:value="w.note" :rows="2" :maxlength="100" show-count placeholder="选填，如工件批次、采集注意事项等" /></a-form-item>
      </a-form>
    </div>

    <!-- 2 选择设备：按模式的设备槽位，从全部设备中按类型挑选，可跨场景复用 -->
    <div v-else-if="step === 2" class="wz-body">
      <div class="row" style="gap:8px;flex-wrap:wrap">
        <span class="label" style="margin:0">工位套装</span>
        <button v-for="k in kits" :key="k.id" type="button" class="chip" @click="applyKit(k.id)"><AppIcon name="layers" size="sm" />{{ k.name }}</button>
        <span class="muted" style="font-size:12.5px">一键带出常用组合，再按需增减；被占用或不在线的设备会自动跳过</span>
      </div>
      <div v-for="s in slots" :key="s.key" class="slot">
        <div class="row between slot-h">
          <span><b>{{ s.label }}</b><span class="muted"> · {{ s.hint }}</span></span>
          <span class="num" :class="slotErr(s) ? 'bad' : 'muted'">{{ inSlot(s).length }} / {{ s.min === s.max ? s.max : (s.min ? s.min + '–' : '0–') + s.max }}<template v-if="slotErr(s)"> · {{ slotErr(s) }}</template></span>
        </div>
        <div class="devpick">
          <button v-for="d in slotDevs(s)" :key="d.id" type="button" class="dp" :class="{ on: w.devices.includes(d.id), off: !selectable(d) }" :disabled="!selectable(d) && !w.devices.includes(d.id)" @click="toggle(d, s)">
            <span class="ck"><AppIcon v-if="w.devices.includes(d.id)" name="check" size="sm" /></span>
            <span class="grow"><b>{{ d.name }}</b><small class="muted">{{ d.station }} · {{ d.id }}<template v-if="!d.calib"> · <span style="color:var(--warn)">未标定</span></template></small></span>
            <StatusBadge v-if="occ(d)" kind="info" :text="'占用 ' + occ(d)" />
            <StatusBadge v-else :kind="DV_ST[d.st][0]" :text="DV_ST[d.st][1]" />
          </button>
          <div v-if="!slotDevs(s).length" class="muted" style="padding:10px">设备台账中还没有此类设备</div>
        </div>
      </div>
      <span v-if="err.devices" class="ferr">{{ err.devices }}</span>
      <div v-if="uncal.length" class="callout warn"><AppIcon name="alert" /><span>{{ uncal.map((d) => d.name).join('、') }} 尚未标定，自检时会被拦截。请先在“设备管理”完成一次性标定。</span></div>
    </div>

    <!-- 3 数据集与参数 -->
    <div v-else-if="step === 3" class="wz-body">
      <div class="field"><span class="label">目标数据集</span>
        <div class="seg" role="group" style="margin-bottom:8px"><button type="button" :aria-pressed="w.dsMode === 'pick'" @click="w.dsMode = 'pick'">选择已有</button><button type="button" :aria-pressed="w.dsMode === 'new'" @click="w.dsMode = 'new'">新建数据集</button></div>
        <a-select v-if="w.dsMode === 'pick'" v-model:value="w.datasetId" :status="err.dataset ? 'error' : ''" :options="allScenDs.map((d) => ({ value: d.id, label: d.name + ' · ' + d.ver + '（' + d.id + '）' + (d.status === 'published' ? ' · 已发布，新数据进入下一版本' : '') }))" />
        <a-input v-else v-model:value="w.dsName" :status="err.dataset ? 'error' : ''" :maxlength="40" :placeholder="SCEN[w.scen].name + ' · 新规格'" />
        <span v-if="err.dataset" class="ferr">{{ err.dataset }}</span>
      </div>
      <a-form layout="vertical">
        <div class="three">
          <a-form-item label="视频帧率"><a-select v-model:value="w.params.fps" :options="[15, 30, 60].map((v) => ({ value: v, label: v + ' fps' }))" /></a-form-item>
          <a-form-item label="分辨率"><a-select v-model:value="w.params.res" :options="['720p', '1080p', '4K'].map((v) => ({ value: v }))" /></a-form-item>
          <a-form-item label="视频编码"><a-select v-model:value="w.params.codec" :options="['H.264', 'H.265'].map((v) => ({ value: v }))" /></a-form-item>
        </div>
        <div class="row" style="gap:24px;margin:-6px 0 14px">
          <a-checkbox v-model:checked="w.params.audio">录制环境音频</a-checkbox>
          <a-checkbox v-model:checked="w.params.autoRetry">入库失败自动重试 3 次</a-checkbox>
        </div>
        <a-form-item label="语言指令" extra="描述本任务要完成的操作，标注时可直接复用为语义描述"><a-input v-model:value="w.lang" :maxlength="80" /></a-form-item>
        <a-form-item label="关键物体" style="margin-bottom:0"><a-select v-model:value="w.objects" mode="multiple" :options="objOpts" placeholder="从标注字典选择" /></a-form-item>
      </a-form>
      <dl class="kv"><dt>单条体量</dt><dd>约 {{ sizeGb.toFixed(2) }} GB / 条（按 20 秒估算）</dd><dt>码率</dt><dd>约 {{ perHour.toFixed(0) }} GB / 小时</dd></dl>
    </div>

    <!-- 4 确认 -->
    <div v-else class="wz-body">
      <dl class="kv"><dt>任务名称</dt><dd>{{ w.name }}</dd><dt>场景 / 模式</dt><dd>{{ SCEN[w.scen].name }} · {{ MODES[w.mode].name }}</dd><dt>操作员</dt><dd>{{ OPS[w.op].n }}</dd>
        <dt>目标数据集</dt><dd>{{ dsLabel }}</dd><dt>采集参数</dt><dd>{{ w.params.fps }} fps · {{ w.params.res }} · {{ w.params.codec }}{{ w.params.audio ? ' · 含音频' : '' }}</dd>
        <dt>语言指令</dt><dd>{{ w.lang || '—' }}</dd><dt>关键物体</dt><dd>{{ w.objects.join('、') || '—' }}</dd><dt>备注</dt><dd>{{ w.note.trim() || '—' }}</dd></dl>
      <div class="card"><a-table :data-source="rows" row-key="id" size="small" :pagination="false" :columns="[{ title: '设备', key: 'name' }, { title: '数据通道', key: 'ch' }, { title: '采样率', key: 'rate', width: 90 }, { title: '状态', key: 'st', width: 90 }]">
        <template #bodyCell="{ column, record }">
          <div v-if="column.key === 'name'" class="cell-main"><span>{{ record.name }}</span><small class="muted">{{ record.type }} · {{ record.station }}</small></div>
          <span v-else-if="column.key === 'ch'">{{ record.p.ch }}</span>
          <span v-else-if="column.key === 'rate'" class="num">{{ record.p.rate }}</span>
          <StatusBadge v-else-if="column.key === 'st'" :kind="DV_ST[record.st as 'online'][0]" :text="DV_ST[record.st as 'online'][1]" />
        </template>
      </a-table></div>
      <div class="field"><span class="label">数据文件命名预览</span><div class="mono" style="padding:10px 12px;border-radius:8px;background:var(--surface-3)">{{ preview }}</div><span class="hint">创建后进入“设备自检”，每次开始采集前都需要自检</span></div>
    </div>

    <div class="wz-foot">
      <span class="l">第 {{ step }} / 4 步</span>
      <a-button type="text" @click="create('draft')">存为草稿</a-button>
      <a-button v-if="step > 1" @click="step--">上一步</a-button>
      <a-button v-if="step < 4" type="primary" @click="next">下一步</a-button>
      <a-button v-else type="primary" @click="create('ready')">创建任务</a-button>
    </div>
  </a-modal>
</template>

<style scoped>
.wz-body { display: flex; flex-direction: column; gap: 16px; max-height: 62vh; overflow: auto; padding-right: 4px; }
.wz-foot { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin: 22px -24px -20px; padding: 14px 24px; border-top: 1px solid var(--line); }
.wz-foot .l { margin-right: auto; color: var(--muted); font-size: 13px; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.slot { border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; background: var(--surface-2); }
.slot-h { font-size: 13px; margin-bottom: 8px; gap: 10px; }
.slot-h .bad { color: var(--crit); }
.devpick { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.dp { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); cursor: pointer; text-align: left; color: inherit; font: inherit; }
.dp.on { border-color: var(--accent); background: var(--accent-soft); }
.dp.off:not(.on) { opacity: .5; cursor: not-allowed; }
.dp .ck { width: 16px; height: 16px; flex: none; border: 1px solid var(--line-strong, var(--line)); border-radius: 4px; display: grid; place-items: center; color: var(--accent); }
.dp.on .ck { border-color: var(--accent); }
.dp b { display: block; font-weight: 500; font-size: 13px; }
.dp small { display: block; font-size: 11.5px; }
.ferr { color: var(--crit); font-size: 12.5px; }
.seg { display: inline-flex; padding: 3px; border-radius: 8px; background: var(--surface-3); gap: 2px; }
.seg button { border: 0; background: none; color: var(--muted); padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 12.5px; }
.seg button[aria-pressed="true"] { background: var(--surface); color: var(--text); font-weight: 600; }
@media (max-width: 640px) { .devpick, .two, .three { grid-template-columns: 1fr; } }
</style>
