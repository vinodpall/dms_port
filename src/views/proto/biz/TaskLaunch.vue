<script setup lang="ts">
/** 任务下发：选择 → 启动前检查 → 参数 → 启动步骤（对齐 robot_web Mission.vue 启动流程），全模块共用 */
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CheckCircleFilled, CloseCircleFilled, LoadingOutlined } from '@ant-design/icons-vue'
import { GAITS, OBS_MODES } from '@/mock/biz'
import {
  rt, isDog, myRoutes, myGroups, db, curId, routeById, groupById, shortName,
  preCheck, bootSteps, launch, stopRun, togglePause, gotoStart, launchReq,
} from './store'

const emit = defineEmits<{ go: [tab: string, sub?: string] }>()
const kind = computed(() => launchReq.kind)
const rid = ref(''); const gid = ref(''); const mid = ref('')
const sf = reactive({ obs: '停障模式', gait: 1, circle: 1 })
const trackGroups = computed(() => myGroups.value.filter((g) => g.kind === '循迹' && g.route === rid.value))
const pubGroups = computed(() => myGroups.value.filter((g) => g.kind === '发布点'))
const myMulti = computed(() => db.multi.filter((m) => m.robot === curId.value))
watch(() => launchReq.n, () => {
  rid.value = launchReq.route || myRoutes.value[0]?.id || ''
  mid.value = launchReq.multi || myMulti.value[0]?.id || ''
  const l = kind.value === '发布点任务' ? pubGroups.value : myGroups.value.filter((g) => g.kind === '循迹' && g.route === rid.value)
  gid.value = launchReq.group && l.some((g) => g.id === launchReq.group) ? launchReq.group : l[0]?.id ?? ''
  Object.assign(sf, { obs: rt.value.obsMode, gait: 1, circle: 1 })
})
const pickRoute = (v: string) => { rid.value = v; gid.value = trackGroups.value[0]?.id ?? '' }

const route = computed(() => (kind.value === '循迹任务' ? routeById(rid.value) : undefined))
const group = computed(() => groupById(gid.value))
const multi = computed(() => myMulti.value.find((m) => m.id === mid.value))
const checks = computed(() => {
  if (kind.value !== '多任务组') return preCheck(kind.value, rid.value, gid.value)
  return [
    ...preCheck('多任务组', undefined, multi.value?.steps[0]?.group).filter((c) => !c.t.startsWith('任务组')),
    { t: '多任务组包含任务', ok: !!multi.value?.steps.length, m: multi.value ? '多任务组中没有任务' : '请先选择多任务组' },
  ]
})
const ready = computed(() => checks.value.every((c) => c.ok))
const close = () => { launchReq.open = false }
const fix = (t: string) => {
  if (t.startsWith('导航 /') || t.startsWith('INS /') || t.startsWith('导航地图')) return { l: '去开启', f: () => { close(); emit('go', 'nav', 'loc') } }
  if (t.startsWith('位于路线起点')) return { l: '前往起点', f: () => route.value && gotoStart(route.value) }
  if (t.startsWith('任务组') || t.startsWith('已选择路线')) return { l: '去配置', f: () => { close(); emit('go', 'task', 'points') } }
  if (t.startsWith('多任务组')) return { l: '去配置', f: () => { close(); emit('go', 'task', 'multi') } }
  if (t.startsWith('无其他任务')) return { l: '关闭任务', f: stopRun }
  if (t.startsWith('导航未暂停')) return { l: '恢复', f: togglePause }
  return null
}

/* 启动步骤 */
const boot = reactive({ open: false, list: [] as { t: string; s: 'p' | 's' }[], done: false })
const ok = () => {
  if (!ready.value) return message.error(checks.value.find((c) => !c.ok)!.m)
  let run
  if (kind.value === '多任务组') { const m = multi.value!; const s0 = m.steps[0]; run = { kind: kind.value, name: `${m.name}（1/${m.steps.length}）`, route: s0.route || undefined, group: s0.group, obs: s0.obs, gait: isDog.value ? GAITS[s0.gait - 1] : '—', circle: s0.circle } }
  else { const g = group.value!; const r = route.value; run = { kind: kind.value, name: r ? `${shortName(r)} / ${g.name}` : g.name, route: r?.id, group: g.id, obs: sf.obs, gait: isDog.value ? GAITS[sf.gait - 1] : '—', circle: sf.circle } }
  close(); boot.open = true; boot.done = false; boot.list = []
  const all = bootSteps(); let i = 0
  const next = () => {
    if (i > 0) boot.list[i - 1].s = 's'
    if (i >= all.length) { boot.done = true; launch(run); message.success('任务启动成功'); setTimeout(() => { boot.open = false }, 700); return }
    boot.list.push({ t: all[i], s: 'p' }); i++; setTimeout(next, 380 + Math.random() * 260)
  }
  next()
}
</script>

<template>
  <a-modal v-model:open="launchReq.open" :title="`下发${kind}`" :width="500" ok-text="开始任务" :ok-button-props="{ disabled: !ready }" @ok="ok">
    <a-form layout="vertical" class="bz-form tl">
      <template v-if="kind === '循迹任务'">
        <a-form-item label="循迹路线"><a-select :value="rid" placeholder="请选择路线" :options="myRoutes.map((r) => ({ value: r.id, label: r.name }))" @change="(v: any) => pickRoute(String(v))" /></a-form-item>
        <a-form-item label="任务组"><a-select v-model:value="gid" placeholder="请选择任务组" :options="trackGroups.map((g) => ({ value: g.id, label: `${g.name}（${g.points.length} 个任务点）` }))" /></a-form-item>
      </template>
      <a-form-item v-else-if="kind === '发布点任务'" label="发布点任务组"><a-select v-model:value="gid" placeholder="请选择任务组" :options="pubGroups.map((g) => ({ value: g.id, label: `${g.name}（${g.points.length} 个任务点）` }))" /></a-form-item>
      <a-form-item v-else label="多任务组"><a-select v-model:value="mid" placeholder="请选择多任务组" :options="myMulti.map((m) => ({ value: m.id, label: `${m.name}（${m.steps.length} 个任务）` }))" /></a-form-item>

      <div class="tl-h">启动前检查<span>{{ checks.filter((c) => c.ok).length }} / {{ checks.length }}</span></div>
      <ul class="bz-check tl-check">
        <li v-for="c in checks" :key="c.t"><CheckCircleFilled v-if="c.ok" class="ok" /><CloseCircleFilled v-else class="no" /><span :class="{ muted: c.ok }">{{ c.ok ? c.t : c.m }}</span><a v-if="!c.ok && fix(c.t)" @click="fix(c.t)!.f()">{{ fix(c.t)!.l }}</a></li>
      </ul>

      <template v-if="kind !== '多任务组'">
        <div class="tl-h">任务参数</div>
        <a-row :gutter="12">
          <a-col :span="isDog ? 10 : 16"><a-form-item label="避障模式"><a-select v-model:value="sf.obs" :options="OBS_MODES.map((o) => ({ value: o, label: o }))" /></a-form-item></a-col>
          <a-col v-if="isDog" :span="8"><a-form-item label="步态"><a-select v-model:value="sf.gait" :options="GAITS.map((g, i) => ({ value: i + 1, label: g }))" /></a-form-item></a-col>
          <a-col :span="isDog ? 6 : 8"><a-form-item label="圈数"><a-input-number v-model:value="sf.circle" :min="1" :max="99" style="width:100%" /></a-form-item></a-col>
        </a-row>
      </template>
      <p v-else class="muted tl-note">多任务组按顺序执行，每个任务使用其自身配置的避障、步态与圈数。</p>
    </a-form>
  </a-modal>

  <a-modal v-model:open="boot.open" title="任务启动中" :width="460" :footer="null" :closable="boot.done" :mask-closable="false">
    <ul class="bz-steps-log">
      <li v-for="(s, i) in boot.list" :key="i"><LoadingOutlined v-if="s.s === 'p'" class="p" /><CheckCircleFilled v-else class="s" /><span>{{ s.t }}</span></li>
      <li v-if="boot.done"><CheckCircleFilled class="s" /><b>任务启动成功</b></li>
    </ul>
  </a-modal>
</template>

<style scoped>
.tl { margin-top: 14px; }
.tl-h { display: flex; justify-content: space-between; margin: 4px 0 6px; font-size: 13px; font-weight: 600; color: var(--text); } .tl-h span { font-weight: 400; font-size: 12px; color: var(--muted); }
.tl-check { margin-bottom: 14px; padding: 4px 12px; background: rgba(46,211,230,.04); border: 1px solid var(--line); border-radius: 4px; }
.tl-note { margin: 0 0 4px; font-size: 12.5px; }
</style>
