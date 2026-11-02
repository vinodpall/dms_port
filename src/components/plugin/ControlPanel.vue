<script setup lang="ts">
/**
 * 通用控制面板：完全由插件声明的 controls 渲染
 *  button → 动作按钮（有 params 自动弹参数表单；danger/confirm 二次确认）
 *  toggle → 开关 · select → 分段选择 · slider → 滑块 · joystick 不在此渲染（遥操作控制台）
 * 可用性统一由 ctrlState 计算（离线 / 故障 / 执行中 / 前置条件），不可用时提示原因
 */
import { computed, reactive, ref } from 'vue'
import { Modal } from 'ant-design-vue'
import {
  LoadingOutlined, CoffeeOutlined, ClearOutlined, SmileOutlined, SoundOutlined, UserAddOutlined, CompassOutlined, ReadOutlined,
  CameraOutlined, PlayCircleOutlined, UndoOutlined, HistoryOutlined, StopOutlined, AppstoreOutlined, ThunderboltOutlined,
} from '@ant-design/icons-vue'
import { GROUP_META, capMeta, type ControlDef, type ControlGroup, type Descriptor } from '@/plugins/types'
import { busyOf, ctrlState, execute, stateOf } from '@/plugins/runtime'

const props = withDefaults(defineProps<{
  deviceId: string; desc: Descriptor; groups?: ControlGroup[]; exclude?: ControlGroup[]
  scope?: 'device' | 'biz'; variant?: 'panel' | 'cards' | 'compact'; cols?: number; headers?: boolean
}>(), { groups: undefined, exclude: () => [], scope: 'device', variant: 'panel', cols: 3, headers: true })
const emit = defineEmits<{ done: [string] }>()

const ICONS: Record<string, any> = { coffee: CoffeeOutlined, wash: ClearOutlined, action: SmileOutlined, voice: SoundOutlined, greet: UserAddOutlined, guide: CompassOutlined, explain: ReadOutlined, photo: CameraOutlined, play: PlayCircleOutlined, undo: UndoOutlined, review: HistoryOutlined, stop: StopOutlined, arrange: AppstoreOutlined }
/** 设备管理不展示业务类控件（导航/任务开关归业务管理） */
const SCOPE_HIDE: Record<string, ControlGroup[]> = { device: ['navigation', 'task'], biz: [] }
const sections = computed(() => {
  const hide = new Set<ControlGroup>(['teleop', ...SCOPE_HIDE[props.scope], ...props.exclude])
  const by = new Map<ControlGroup, ControlDef[]>()
  for (const c of props.desc.controls) {
    if (c.kind === 'joystick' || hide.has(c.group) || (props.groups && !props.groups.includes(c.group))) continue
    if (!by.has(c.group)) by.set(c.group, [])
    by.get(c.group)!.push(c)
  }
  const order = props.groups ?? (Object.keys(GROUP_META) as ControlGroup[])
  return [...by.entries()].sort((a, b) => (props.groups ? order.indexOf(a[0]) - order.indexOf(b[0]) : GROUP_META[a[0]].order - GROUP_META[b[0]].order)).map(([g, items]) => ({ g, label: GROUP_META[g]?.label ?? g, items }))
})
const st = computed(() => stateOf(props.deviceId))
const cs = (c: ControlDef) => ctrlState(props.deviceId, c)
const running = (c: ControlDef) => busyOf(props.deviceId)?.control === c.key
const val = (c: ControlDef) => (c.stateKey ? st.value?.values[c.stateKey] : undefined)

/* ---- 执行 ---- */
const run = (c: ControlDef, p?: Record<string, any>) => execute(props.deviceId, c, p).then(() => emit('done', c.key)).catch(() => {})
function click(c: ControlDef) {
  if (!cs(c).enabled) return
  if (c.params?.length) return openForm(c)
  if (c.confirm || c.danger) {
    Modal.confirm({ title: `确认执行「${c.label}」？`, content: c.confirm ?? '该操作存在风险，请确认现场安全。', okText: '执行', cancelText: '取消', okButtonProps: c.danger ? { danger: true } : undefined, onOk: () => { run(c) } })
    return
  }
  run(c)
}
function toggle(c: ControlDef) {
  const on = !val(c)
  if (on && c.confirm) { Modal.confirm({ title: `开启「${c.label}」？`, content: c.confirm, okText: '开启', cancelText: '取消', onOk: () => { run(c) } }); return }
  run(c)
}
const slide = reactive<Record<string, number>>({})
const pick = (c: ControlDef, v: any) => { if (v !== val(c)) run(c, { value: v }) }

/* ---- 参数表单（按 params 自动生成） ---- */
const form = reactive<{ open: boolean; c: ControlDef | null; v: Record<string, any>; err: string }>({ open: false, c: null, v: {}, err: '' })
function openForm(c: ControlDef) { form.c = c; form.err = ''; form.v = Object.fromEntries((c.params ?? []).map((p) => [p.key, p.default ?? (p.type === 'enum' ? Object.keys(p.options ?? {})[0] : p.type === 'number' ? p.min ?? 0 : '')])); form.open = true }
const submitting = ref(false)
function submit() {
  const c = form.c!; const miss = c.params!.find((p) => p.required && (form.v[p.key] == null || form.v[p.key] === ''))
  if (miss) { form.err = `请填写${miss.label}`; return }
  form.open = false; run(c, { ...form.v })
}
const groupColor = (g: ControlGroup) => capMeta(g === 'safety' ? 'alarm' : g === 'flight' ? 'teleop' : g).color
</script>

<template>
  <div class="cp" :class="variant">
    <div v-if="!sections.length" class="cp-empty">该设备未声明可执行的控制项</div>
    <section v-for="s in sections" :key="s.g" class="cp-sec">
      <h5 v-if="headers && variant !== 'compact'"><i :style="{ background: groupColor(s.g) }" />{{ s.label }}<small>{{ s.items.length }}</small></h5>
      <div class="cp-items" :style="{ '--cols': cols }">
        <template v-for="c in s.items" :key="c.key">
          <!-- 按钮 -->
          <a-tooltip v-if="c.kind === 'button'" :title="cs(c).enabled ? c.desc : cs(c).reason">
            <button v-if="variant === 'cards'" type="button" class="cp-card" :class="{ danger: c.danger, busy: running(c) }" :disabled="!cs(c).enabled" @click="click(c)">
              <span class="ic"><LoadingOutlined v-if="running(c)" /><component :is="ICONS[c.icon ?? ''] ?? ThunderboltOutlined" v-else /></span>
              <b>{{ c.label }}</b>
              <small>{{ running(c) ? '执行中…' : !cs(c).enabled ? cs(c).reason : c.desc ?? (c.params?.length ? `可设置 ${c.params.map((p) => p.label).join('、')}` : '点击执行') }}</small>
            </button>
            <button v-else type="button" class="cp-btn" :class="{ danger: c.danger, busy: running(c), stop: c.group === 'safety' }" :disabled="!cs(c).enabled" @click="click(c)">
              <LoadingOutlined v-if="running(c)" />{{ c.label }}<em v-if="c.params?.length">…</em>
            </button>
          </a-tooltip>
          <!-- 开关 -->
          <a-tooltip v-else-if="c.kind === 'toggle'" :title="cs(c).enabled ? c.desc : cs(c).reason">
            <div class="cp-tg" :class="{ on: !!val(c), dis: !cs(c).enabled }" @click="cs(c).enabled && toggle(c)">
              <span>{{ c.label }}</span><small>{{ val(c) ? c.onLabel ?? '已开启' : c.offLabel ?? '已关闭' }}</small>
              <a-switch size="small" :checked="!!val(c)" :disabled="!cs(c).enabled" :loading="running(c)" @click.stop="toggle(c)" />
            </div>
          </a-tooltip>
          <!-- 选择 -->
          <div v-else-if="c.kind === 'select'" class="cp-row" :class="{ dis: !cs(c).enabled }">
            <span>{{ c.label }}</span>
            <a-tooltip :title="cs(c).enabled ? '' : cs(c).reason">
              <a-radio-group v-if="(c.options?.length ?? 0) <= 4" :value="val(c)" size="small" button-style="solid" :disabled="!cs(c).enabled" @change="(e: any) => pick(c, e.target.value)">
                <a-radio-button v-for="o in c.options" :key="o.value" :value="o.value">{{ o.label }}</a-radio-button>
              </a-radio-group>
              <a-select v-else :value="val(c)" size="small" style="width: 140px" :disabled="!cs(c).enabled" :options="c.options" @change="(v: any) => pick(c, v)" />
            </a-tooltip>
          </div>
          <!-- 滑块 -->
          <div v-else-if="c.kind === 'slider'" class="cp-row sl" :class="{ dis: !cs(c).enabled }">
            <span>{{ c.label }}</span>
            <a-slider :value="slide[c.key] ?? val(c)" :min="c.min" :max="c.max" :step="c.step" :disabled="!cs(c).enabled" :tooltip-open="false" @change="(v: any) => (slide[c.key] = v)" @after-change="(v: any) => { delete slide[c.key]; pick(c, v) }" />
            <b class="mono">{{ slide[c.key] ?? val(c) }}<em>{{ c.unit }}</em></b>
          </div>
        </template>
      </div>
    </section>

    <a-modal v-model:open="form.open" :title="form.c ? `执行「${form.c.label}」` : ''" :width="440" ok-text="执行" cancel-text="取消" :ok-button-props="{ danger: form.c?.danger, loading: submitting }" @ok="submit">
      <template v-if="form.c">
        <a-alert v-if="form.c.confirm" type="warning" show-icon :message="form.c.confirm" style="margin-bottom: 14px" />
        <p v-if="form.c.desc" class="muted" style="margin: 0 0 12px; font-size: 12.5px">{{ form.c.desc }}</p>
        <a-form layout="vertical" class="cp-form">
          <a-form-item v-for="p in form.c.params" :key="p.key" :label="p.label" :required="p.required">
            <a-radio-group v-if="p.type === 'enum' && Object.keys(p.options ?? {}).length <= 4" v-model:value="form.v[p.key]" button-style="solid">
              <a-radio-button v-for="(l, k) in p.options" :key="k" :value="k">{{ l }}</a-radio-button>
            </a-radio-group>
            <a-select v-else-if="p.type === 'enum'" v-model:value="form.v[p.key]" :options="Object.entries(p.options ?? {}).map(([value, label]) => ({ value, label }))" />
            <div v-else-if="p.type === 'number'" class="cp-num"><a-slider v-model:value="form.v[p.key]" :min="p.min" :max="p.max" :step="p.step" /><a-input-number v-model:value="form.v[p.key]" :min="p.min" :max="p.max" :step="p.step" size="small" /><span class="muted">{{ p.unit }}</span></div>
            <a-switch v-else-if="p.type === 'boolean'" v-model:checked="form.v[p.key]" />
            <a-textarea v-else v-model:value="form.v[p.key]" :maxlength="p.maxLength" show-count :auto-size="{ minRows: 2, maxRows: 4 }" />
          </a-form-item>
        </a-form>
        <div v-if="form.err" class="cp-err">{{ form.err }}</div>
      </template>
    </a-modal>
  </div>
</template>

<style scoped>
.cp { display: flex; flex-direction: column; gap: 14px; }
.cp.compact { gap: 8px; }
.cp-empty { padding: 26px 12px; text-align: center; color: var(--faint); font-size: 12.5px; }
.cp-sec h5 { display: flex; align-items: center; gap: 7px; margin: 0 0 8px; font-size: 12.5px; font-weight: 500; color: var(--muted); }
.cp-sec h5 i { width: 3px; height: 11px; border-radius: 2px; }
.cp-sec h5 small { font-size: 11px; color: var(--faint); }
.cp-items { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 6px; }
.cp-items > .cp-tg, .cp-items > .cp-row { grid-column: 1 / -1; }
.cp-btn { position: relative; display: flex; align-items: center; justify-content: center; gap: 5px; width: 100%; height: 32px; padding: 0 6px; font: inherit; font-size: 12.5px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; background: rgba(46,211,230,.05); border: 1px solid var(--line); border-radius: 7px; transition: .15s; }
.cp-btn em { font-style: normal; color: var(--muted); }
.cp-btn:hover:not(:disabled) { color: #fff; border-color: rgba(46,211,230,.5); background: rgba(46,211,230,.12); }
.cp-btn:disabled { color: var(--faint); cursor: not-allowed; background: transparent; }
.cp-btn.busy { color: #9FE6EF; border-color: rgba(46,211,230,.5); }
.cp-btn.danger:not(:disabled) { color: #FFB0B0; border-color: rgba(255,122,122,.35); }
.cp-btn.stop:not(:disabled) { color: #fff; background: #C93838; border-color: #E05555; font-weight: 600; letter-spacing: 1px; }
.cp-btn.stop:hover:not(:disabled) { background: #DD4343; }
.cp-tg, .cp-row { display: flex; align-items: center; gap: 10px; min-height: 36px; padding: 6px 12px; font-size: 13px; background: rgba(46,211,230,.04); border: 1px solid var(--line); border-radius: 7px; }
.cp-tg { cursor: pointer; } .cp-tg small { margin-left: auto; font-size: 12px; color: var(--faint); }
.cp-tg.on { border-color: rgba(69,227,168,.4); background: rgba(69,227,168,.06); } .cp-tg.on small { color: #45E3A8; }
.cp-tg.dis, .cp-row.dis { opacity: .55; cursor: not-allowed; }
.cp-row > span { flex: none; min-width: 56px; color: var(--muted); font-size: 12.5px; }
.cp-row > :last-child:not(b) { margin-left: auto; }
.cp-row.sl :deep(.ant-slider) { flex: 1; margin: 0 6px; }
.cp-row.sl b { flex: none; min-width: 52px; text-align: right; font-weight: 500; font-size: 12.5px; } .cp-row.sl b em { font-style: normal; color: var(--muted); margin-left: 2px; }
/* 技能卡片 */
.cards .cp-items { gap: 10px; }
.cp-card { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; width: 100%; min-height: 104px; padding: 14px 14px 12px; text-align: left; font: inherit; color: var(--text); cursor: pointer; background: linear-gradient(160deg, rgba(46,211,230,.08), rgba(46,211,230,.02)); border: 1px solid var(--line); border-radius: 10px; transition: .18s; }
.cp-card .ic { width: 34px; height: 34px; display: grid; place-items: center; margin-bottom: 4px; font-size: 17px; color: #2ED3E6; background: rgba(46,211,230,.12); border-radius: 9px; }
.cp-card b { font-size: 14.5px; font-weight: 600; color: var(--title); }
.cp-card small { font-size: 12px; color: var(--muted); line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cp-card:hover:not(:disabled) { border-color: rgba(46,211,230,.55); transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0,0,0,.25); }
.cp-card:disabled { cursor: not-allowed; opacity: .5; }
.cp-card.busy { opacity: 1; border-color: rgba(46,211,230,.6); background: linear-gradient(160deg, rgba(46,211,230,.18), rgba(46,211,230,.04)); }
.cp-card.busy .ic { color: #fff; background: rgba(46,211,230,.35); }
.cp-card.danger .ic { color: #FF8A8A; background: rgba(255,122,122,.12); }
.cp-form :deep(.ant-form-item) { margin-bottom: 14px; }
.cp-num { display: flex; align-items: center; gap: 10px; } .cp-num :deep(.ant-slider) { flex: 1; }
.cp-err { color: #FF7A7A; font-size: 12.5px; }
</style>
