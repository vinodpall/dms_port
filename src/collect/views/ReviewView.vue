<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHead from '@/collect/components/PageHead.vue'
import AppIcon from '@/components/AppIcon.vue'
import StatusBadge from '@/collect/components/StatusBadge.vue'
import EmptyState from '@/collect/components/EmptyState.vue'
import ClipList from '@/collect/components/annotate/ClipList.vue'
import VideoWall from '@/collect/components/annotate/VideoWall.vue'
import SliceTimeline from '@/collect/components/annotate/SliceTimeline.vue'
import { fmtT } from '@/collect/components/annotate/motion'
import { CLIP_ST, colorOf, useAnnotate, type Clip, type Seg } from '@/collect/stores/annotate'
import { DIMS, ISSUE_KIND, REJECT_TPL, SEV, VERDICT, useReview, type IssueKind, type IssueSev, type Skill, type Verdict } from '@/collect/stores/review'
import { useDict } from '@/collect/stores/dict'
import { useLogs } from '@/collect/stores/logs'
import { useSession } from '@/collect/stores/session'
import { toast } from '@/composables/toast'
import { SCEN, type BadgeKind } from '@/collect/constants'
import { clamp } from '@/utils'

const store = useAnnotate()
const rv = useReview()
const dict = useDict()
const logs = useLogs()
const session = useSession()
const router = useRouter()
const me = computed(() => session.info.user)

const activeTab = ref<'review' | 'stats'>('review')
const shortcutGuideOpen = ref(false)

/* 待审池（未领取，按 加急 → 时限 排序）/ 我的审核 / 已审 */
const view = ref<'pool' | 'mine' | 'done'>('mine')
const myReview = computed(() => store.clips.filter((c) => c.status === 'submitted' && c.reviewer === me.value))
const done = computed(() => store.clips.filter((c) => c.status === 'approved' || c.status === 'rejected'))
const vis = computed(() => (view.value === 'pool' ? store.reviewPool : view.value === 'mine' ? myReview.value : done.value))
const claimN = ref(5)
const clip = computed<Clip | undefined>(() => store.byId(store.cur))
const inPool = computed(() => !!clip.value && clip.value.status === 'submitted' && !clip.value.reviewer)
const reviewable = computed(() => !!clip.value && clip.value.status === 'submitted' && clip.value.reviewer === me.value)

function doClaim(x?: Clip) {
  const got = store.claimReview(x ?? claimN.value)
  if (!got.length) return toast('待审池为空', { type: 'warn' })
  view.value = 'mine'
  pick(got[0].id)
  toast(`已领取 ${got.length} 条待审数据`)
}
const dueText = (c: Clip) => (c.dueH == null ? '' : c.dueH < 24 ? `${c.dueH} 小时内` : `${Math.ceil(c.dueH / 24)} 天内`)

function pick(id: string) {
  store.cur = id
  t.value = 0
  playing.value = false
  sel.value = null
}
function ensureCur() {
  if (vis.value.length && !vis.value.some((c) => c.id === store.cur)) pick(vis.value[0].id)
}
watch(vis, ensureCur)
onMounted(() => {
  if (!myReview.value.length) view.value = 'pool'
  ensureCur()
})

/* 播放控制 */
const t = ref(0)
const playing = ref(false)
const speed = ref(1)
const sel = ref<number | null>(null)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    if (!playing.value || !clip.value) return
    t.value = Math.min(clip.value.dur, +(t.value + 0.1 * speed.value).toFixed(2))
    if (t.value >= clip.value.dur) playing.value = false
  }, 100)
})
function toggle() {
  if (!clip.value) return
  if (t.value >= clip.value.dur) t.value = 0
  playing.value = !playing.value
}

const sorted = computed(() => (clip.value ? clip.value.segs.slice().sort((a, b) => a.s - b.s) : []))
const coverage = computed(() => (clip.value ? Math.min(100, Math.round((sorted.value.reduce((a, s) => a + (s.e - s.s), 0) / clip.value.dur) * 100)) : 0))
const issues = computed(() => (clip.value ? rv.getIssues(clip.value.id) : []))
const issueOf = (seg: Seg) => issues.value.find((x) => x.segId === seg.id)
const score = computed(() => (clip.value ? rv.calculateScore(clip.value.id) : 0))
const scoreObj = computed(() => (clip.value ? rv.getScore(clip.value.id) : null))
const hi = computed(() => (scoreObj.value ? DIMS.filter(([k]) => scoreObj.value![k] >= 8).length : 0))
const suggestion = computed<Verdict>(() => (clip.value ? rv.suggest(clip.value.id) : 'pass'))
const fatalN = computed(() => issues.value.filter((x) => x.severity === 'fatal').length)

/* 问题标记：类型 + 严重度 */
const issueModal = reactive({ open: false, seg: null as Seg | null, kind: 'boundary' as IssueKind, severity: 'warn' as IssueSev, desc: '' })
function openTagIssue(seg: Seg) {
  const old = issueOf(seg)
  Object.assign(issueModal, { open: true, seg, kind: old?.kind ?? 'boundary', severity: old?.severity ?? 'warn', desc: old?.desc ?? seg.flag ?? '' })
}
function saveIssue() {
  const c = clip.value, seg = issueModal.seg
  if (!c || !seg) return
  const desc = issueModal.desc.trim()
  if (!desc) return toast('请填写问题说明', { type: 'warn' })
  seg.flag = `[${SEV[issueModal.severity][1]}] ${desc}`
  rv.addIssue(c.id, { segId: seg.id, kind: issueModal.kind, severity: issueModal.severity, desc })
  logs.addLog({ user: me.value, role: session.info.name, module: 'review', moduleName: '审核工作台', action: '标记问题', target: `${c.file} · [${seg.n}]`, summary: `${SEV[issueModal.severity][1]}问题（${ISSUE_KIND[issueModal.kind]}）：${desc}` })
  issueModal.open = false
  toast('已记录问题')
}
function removeIssue(seg: Seg) {
  seg.flag = undefined
  if (clip.value) rv.removeIssue(clip.value.id, seg.id)
  toast('已取消问题标记')
}

/* 四种审核结论 */
const KIND_OPTS = (Object.keys(ISSUE_KIND) as IssueKind[]).map((k) => ({ value: k, label: ISSUE_KIND[k] }))
const dec = reactive({ open: false, v: 'pass' as Verdict, reasons: [] as string[], text: '' })
function openDecision(v: Verdict) {
  if (!reviewable.value) return
  if (v === 'pass' && issues.value.length) return toast('存在已标记问题，请选择「修改后通过」或「驳回」', { type: 'warn' })
  const flagged = sorted.value.filter((s) => issueOf(s)).map((s) => `「${s.n}」${issueOf(s)!.desc}`).join('；')
  Object.assign(dec, { open: true, v, reasons: [], text: v === 'reject' || v === 'redo' ? flagged : '' })
}
function confirmDecision() {
  const c = clip.value
  if (!c) return
  const text = dec.text.trim()
  const need = dec.v !== 'pass'
  if (need && !text && !dec.reasons.length) return toast(dec.v === 'fixpass' ? '请说明修改了哪些内容' : '请选择驳回原因或填写说明', { type: 'warn' })
  const reason = [...dec.reasons, text].filter(Boolean).join('；')
  const annotator = c.owner ?? '未知'
  if (dec.v === 'pass' || dec.v === 'fixpass') store.approve(c)
  else if (dec.v === 'reject') store.reject(c, reason, me.value)
  else store.redo(c, reason, me.value)
  rv.record({ clipId: c.id, annotator, reviewer: me.value, verdict: dec.v, score: score.value, reasons: dec.v === 'pass' ? [] : dec.reasons.length ? dec.reasons : [text] })
  logs.addLog({ user: me.value, role: session.info.name, module: 'review', moduleName: '审核工作台', action: VERDICT[dec.v][1], target: `${c.file} · 批次 ${c.batch}`, status: dec.v === 'pass' || dec.v === 'fixpass' ? undefined : 'warn', summary: `${VERDICT[dec.v][1]}：评分 ${score.value}${reason ? '，' + reason : ''}` })
  dec.open = false
  toast({ pass: '已通过，数据进入格式转换', fixpass: '已修改并通过', reject: `已驳回给 ${annotator} 修改`, redo: '已退回重做，数据回到标注任务池' }[dec.v])
}

/* 快捷键 */
function onKey(e: KeyboardEvent) {
  if (issueModal.open || dec.open || shortcutGuideOpen.value || activeTab.value !== 'review') return
  const el = e.target as HTMLElement, tag = el?.tagName
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || el?.closest?.('.ant-select') || el?.closest?.('.ant-input') || el?.closest?.('.ant-rate') || el?.isContentEditable) return
  const k = e.key.toLowerCase(), code = e.code
  if (code === 'Space') { e.preventDefault(); toggle(); return }
  if (code === 'ArrowLeft' && clip.value) { e.preventDefault(); t.value = clamp(+(t.value - (e.shiftKey ? 2 : 0.1)).toFixed(2), 0, clip.value.dur); return }
  if (code === 'ArrowRight' && clip.value) { e.preventDefault(); t.value = clamp(+(t.value + (e.shiftKey ? 2 : 0.1)).toFixed(2), 0, clip.value.dur); return }
  if ((k === 't' || k === 'f') && !e.ctrlKey && !e.metaKey && !e.altKey && reviewable.value) {
    e.preventDefault()
    const seg = sorted.value.find((s) => s.id === sel.value) ?? sorted.value.find((s) => t.value >= s.s && t.value <= s.e)
    if (seg) openTagIssue(seg)
    else toast('请先选中或移动至要标记问题的切片', { type: 'warn' })
    return
  }
  if (k === 'escape') sel.value = null
}
onMounted(() => window.addEventListener('keydown', onKey, true))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey, true)
  if (timer) clearInterval(timer)
})

/* 质量统计 */
const st = computed(() => rv.stats)
const maxReason = computed(() => Math.max(1, ...st.value.reasons.map((r) => r[1])))
const maxVerdict = computed(() => Math.max(1, ...st.value.verdicts.map((r) => r.n)))
const SKILL: Record<Skill, string> = { new: '新人', skilled: '熟练' }
function setSkill(name: string, v: Skill) {
  const a = rv.annotators.find((x) => x.name === name)
  if (a) a.skill = v
  else rv.annotators.push({ name, skill: v })
  toast(`${name} 设为${SKILL[v]}，抽检比例 ${rv.sampleRate[v]}%`)
}
</script>

<template>
  <PageHead title="审核工作台" desc="从待审池领取后审核：6 维度 10 分制评分、问题按严重度标记，四种结论；按标注员熟练度抽检">
    <div class="row" style="gap:8px;align-items:center">
      <div class="seg" role="tablist">
        <button type="button" role="tab" :aria-selected="activeTab === 'review'" @click="activeTab = 'review'"><span>审核</span></button>
        <button type="button" role="tab" :aria-selected="activeTab === 'stats'" @click="activeTab = 'stats'"><span>质量统计</span></button>
      </div>
      <a-button size="small" @click="router.push({ name: 'dict' })"><AppIcon name="layers" size="sm" />标注字典 <span class="mono muted" style="margin-left:4px">{{ dict.version }}</span></a-button>
      <a-button v-if="activeTab === 'review'" size="small" @click="shortcutGuideOpen = true"><AppIcon name="kbd" size="sm" />快捷键</a-button>
    </div>
  </PageHead>

  <template v-if="activeTab === 'review'">
    <div class="card ann2">
      <ClipList filter="" :clips="vis" :cur="clip?.id ?? null" :filters="[]" :empty-desc="view === 'pool' ? '待审池为空' : view === 'mine' ? '没有待审数据，可去待审池领取' : '暂无已审数据'" @pick="pick">
        <template #head>
          <div class="vseg" role="tablist" aria-label="审核视图">
            <button type="button" role="tab" :aria-selected="view === 'pool'" @click="view = 'pool'">待审池 <span class="num">{{ store.reviewPool.length }}</span></button>
            <button type="button" role="tab" :aria-selected="view === 'mine'" @click="view = 'mine'">我的审核 <span class="num">{{ myReview.length }}</span></button>
            <button type="button" role="tab" :aria-selected="view === 'done'" @click="view = 'done'">已审 <span class="num">{{ done.length }}</span></button>
          </div>
          <div v-if="view === 'pool'" class="claim">
            <span class="muted" style="font-size:12px">加急优先</span><span class="grow" />
            <a-input-number v-model:value="claimN" size="small" :min="1" :max="10" style="width:64px" aria-label="领取条数" />
            <a-button size="small" type="primary" :disabled="!store.reviewPool.length" @click="doClaim()">批量领取</a-button>
          </div>
        </template>
        <template #meta="{ clip: c }">
          <span v-if="c.status === 'submitted'" class="row" style="gap:6px;font-size:11.5px">
            <span class="tag" :class="c.prio === 'urgent' ? 'crit' : ''" style="font-size:11px">{{ c.prio === 'urgent' ? '加急' : '普通' }}</span>
            <span class="muted">{{ dueText(c) }} · 标注 {{ c.owner ?? '-' }}</span>
          </span>
        </template>
      </ClipList>

      <div class="work">
        <EmptyState v-if="!clip || !vis.length" icon="inbox" title="请选择一条数据" desc="从待审池领取后开始审核" />
        <template v-else>
          <div class="row between" style="gap:12px;align-items:flex-start">
            <div style="min-width:0">
              <div class="row" style="gap:8px">
                <span class="mono ell">{{ clip.file }}</span>
                <StatusBadge :kind="CLIP_ST[clip.status][0] as BadgeKind" :text="CLIP_ST[clip.status][1]" />
                <span v-if="clip.status === 'submitted'" class="tag" :class="clip.prio === 'urgent' ? 'crit' : ''">{{ clip.prio === 'urgent' ? '加急' : '普通' }} · {{ dueText(clip) }}</span>
                <span class="score-pill" :class="score >= 8 ? 'good' : 'warn'">{{ score }} / 10</span>
              </div>
              <div class="muted" style="font-size:12.5px;margin-top:2px">
                {{ SCEN[clip.scen].name }} · {{ clip.dur }} 秒 · 批次 {{ clip.batch }} · 标注员 {{ clip.owner ?? '-' }}（{{ SKILL[rv.skillOf(clip.owner ?? '')] }}，抽检 {{ rv.rateOf(clip.owner ?? '') }}%）
              </div>
            </div>
          </div>

          <div v-if="inPool" class="callout info">
            <AppIcon name="inbox" /><span class="grow">该数据在待审池中，领取后才能审核</span>
            <a-button size="small" type="primary" @click="doClaim(clip)">领取此条</a-button>
          </div>
          <div v-else-if="clip.status === 'submitted' && clip.reviewer !== me" class="callout"><AppIcon name="user" /><span>已由 {{ clip.reviewer }} 领取审核，当前只读</span></div>
          <div v-if="clip.submitNote" class="callout"><AppIcon name="info" /><span><b>标注员说明：</b>{{ clip.submitNote }}</span></div>
          <div v-if="clip.reject && clip.status === 'rejected'" class="callout warn" role="alert">
            <AppIcon name="alert" /><span><b>驳回原因：</b>{{ clip.reject.reason }}<span class="muted"> —— {{ clip.reject.by }} · {{ clip.reject.t }}</span></span>
          </div>

          <VideoWall :clip="clip" :t="t" :playing="playing" />

          <div class="row" style="gap:10px;flex-wrap:wrap">
            <a-button type="primary" @click="toggle"><AppIcon :name="playing ? 'pause' : 'play'" />{{ playing ? '暂停' : '播放' }}</a-button>
            <span class="mono num">{{ fmtT(t) }} / {{ fmtT(clip.dur) }}</span>
            <a-select v-model:value="speed" size="small" style="width:76px" aria-label="播放速度" :options="[{ value: 0.5, label: '0.5×' }, { value: 1, label: '1×' }, { value: 2, label: '2×' }]" />
            <span class="grow" />
            <span class="muted" style="font-size:12.5px">覆盖率 {{ coverage }}% · 切片 {{ sorted.length }} 个 · 问题 {{ issues.length }} 个</span>
          </div>

          <SliceTimeline v-model:t="t" :clip="clip" :selected="sel" :editable="false" @select="sel = $event" />

          <div v-if="scoreObj" class="card score-card">
            <div class="row between" style="margin-bottom:8px">
              <div class="row" style="gap:6px"><AppIcon name="shield" size="sm" /><b style="font-size:13.5px">6 维度评分（10 分制）</b><span class="muted" style="font-size:12px">≥5 个维度 ≥8 分且无维度低于 6 分建议通过</span></div>
              <span class="row" style="gap:8px">
                <span class="muted" style="font-size:12px">{{ hi }}/6 维度 ≥8</span>
                <span class="tag" :class="VERDICT[suggestion][0]">建议：{{ VERDICT[suggestion][1] }}</span>
              </span>
            </div>
            <div class="dim-grid">
              <div v-for="d in DIMS" :key="d[0]" class="dim-item">
                <div class="row between"><span class="lbl">{{ d[1] }}</span><b class="num" :style="{ color: scoreObj[d[0]] >= 8 ? 'var(--good-solid)' : scoreObj[d[0]] < 6 ? 'var(--crit-solid)' : 'var(--warn-solid)' }">{{ scoreObj[d[0]] }}</b></div>
                <a-slider v-model:value="scoreObj[d[0]]" :min="1" :max="10" :disabled="!reviewable" :tooltip-open="false" style="margin:4px 4px 0" />
                <span class="dim-hint">{{ d[2] }}</span>
              </div>
            </div>
          </div>

          <div style="font-weight:600;font-size:13.5px;margin-top:4px">逐段核对 ({{ sorted.length }})</div>
          <table class="stbl" aria-label="切片明细与问题标记">
            <thead>
              <tr><th style="width:26px" /><th style="width:96px">子任务</th><th style="width:96px">区间</th><th style="width:130px">动作 / 物体</th><th>语义描述</th><th style="width:70px">结果</th><th style="width:170px">问题</th><th style="width:130px">操作</th></tr>
            </thead>
            <tbody>
              <tr v-for="s in sorted" :key="s.id" :class="{ sel: sel === s.id, flag: !!issueOf(s) }" @click="sel = s.id">
                <td><i class="dot" :style="{ background: colorOf(clip.scen, s.n) }" /></td>
                <td><b>{{ s.n }}</b><span v-if="!dict.isValid(s.n)" class="tag crit" style="font-size:10.5px;margin-left:4px">非字典</span></td>
                <td class="num muted">{{ s.s.toFixed(1) }}–{{ s.e.toFixed(1) }}s</td>
                <td style="font-size:12px">{{ s.act || '—' }} · <b>{{ s.objMain || '缺主物体' }}</b><span v-if="s.objSub?.length" class="muted"> + {{ s.objSub.join('、') }}</span></td>
                <td class="muted" style="font-size:12px">{{ s.desc || '—' }}</td>
                <td><span class="tag" :class="s.result === 'fail' ? 'crit' : 'good'" style="font-size:11px" :title="s.failReason">{{ s.result === 'fail' ? '失败' : '成功' }}</span></td>
                <td>
                  <template v-if="issueOf(s)"><span class="tag" :class="SEV[issueOf(s)!.severity][0]" style="font-size:11px">{{ SEV[issueOf(s)!.severity][1] }}</span> <span style="font-size:12px">{{ ISSUE_KIND[issueOf(s)!.kind] }}：{{ issueOf(s)!.desc }}</span></template>
                  <span v-else class="muted" style="font-size:12px">—</span>
                </td>
                <td @click.stop>
                  <div class="row" style="gap:4px">
                    <a-button size="small" type="text" @click="t = s.s">定位</a-button>
                    <template v-if="reviewable">
                      <a-button v-if="!issueOf(s)" size="small" danger @click="openTagIssue(s)">标记</a-button>
                      <a-button v-else size="small" @click="removeIssue(s)">取消</a-button>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="actbar">
            <span class="muted grow" style="font-size:12px"><kbd>Space</kbd> 播放　<kbd>←</kbd><kbd>→</kbd> 0.1s　<kbd>T</kbd> 标记问题</span>
            <template v-if="reviewable">
              <a-button danger @click="openDecision('redo')">退回重做</a-button>
              <a-button danger @click="openDecision('reject')">驳回</a-button>
              <a-button @click="openDecision('fixpass')">修改后通过</a-button>
              <a-button type="primary" :disabled="fatalN > 0" :title="fatalN ? '存在致命问题，不能直接通过' : undefined" @click="openDecision('pass')"><AppIcon name="check" size="sm" />通过</a-button>
            </template>
            <a-button v-else-if="inPool" type="primary" @click="doClaim(clip)">领取此条</a-button>
            <span v-else-if="clip.status === 'approved'" style="color:var(--good-solid);font-weight:600;display:flex;align-items:center;gap:4px"><AppIcon name="check" size="sm" />已通过并归档</span>
            <span v-else-if="clip.status === 'rejected'" class="muted" style="font-size:12px">已驳回给标注员修改</span>
          </div>
        </template>
      </div>
    </div>
  </template>

  <template v-else>
    <div class="grid g4" style="margin-bottom:16px">
      <div class="card kpi"><span class="k">今日审核</span><span class="v">{{ st.today }}<small>条</small></span><span class="d">累计 {{ st.total }} 条</span></div>
      <div class="card kpi"><span class="k">通过率</span><span class="v">{{ st.passRate }}<small>%</small></span><span class="d">含修改后通过</span></div>
      <div class="card kpi"><span class="k">驳回率</span><span class="v">{{ st.rejectRate }}<small>%</small></span><span class="d">含退回重做</span></div>
      <div class="card kpi"><span class="k">平均分</span><span class="v">{{ st.avg }}<small>/ 10</small></span><span class="d">6 维度平均</span></div>
    </div>
    <div class="stat-grid">
      <div class="card pad">
        <b>审核结论分布</b>
        <div v-for="x in st.verdicts" :key="x.v" class="bar-row"><span class="bl">{{ VERDICT[x.v][1] }}</span><span class="bt"><i :class="VERDICT[x.v][0]" :style="{ width: (x.n / maxVerdict) * 100 + '%' }" /></span><span class="num">{{ x.n }}</span></div>
      </div>
      <div class="card pad">
        <b>常见驳回 / 修改原因</b>
        <div v-for="r in st.reasons.slice(0, 6)" :key="r[0]" class="bar-row"><span class="bl wide" :title="r[0]">{{ r[0] }}</span><span class="bt"><i class="warn" :style="{ width: (r[1] / maxReason) * 100 + '%' }" /></span><span class="num">{{ r[1] }}</span></div>
        <div v-if="!st.reasons.length" class="muted">暂无</div>
      </div>
      <div class="card pad">
        <b>抽检比例</b>
        <div class="muted" style="font-size:12px;margin:4px 0 10px">提交时按标注员等级随机抽检，未抽中的免检通过</div>
        <div class="row" style="gap:10px;margin-bottom:8px"><span style="width:48px">新人</span><a-input-number v-model:value="rv.sampleRate.new" :min="10" :max="100" :step="10" size="small" addon-after="%" style="width:110px" /></div>
        <div class="row" style="gap:10px"><span style="width:48px">熟练</span><a-input-number v-model:value="rv.sampleRate.skilled" :min="10" :max="100" :step="10" size="small" addon-after="%" style="width:110px" /></div>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="pad" style="padding-bottom:0"><b>标注员绩效</b></div>
      <table class="stbl" style="margin-top:8px" aria-label="标注员绩效">
        <thead><tr><th>标注员</th><th style="width:120px">等级</th><th>审核条数</th><th>通过率</th><th>一次通过率</th><th>驳回 / 重做</th><th>平均分</th><th>抽检比例</th></tr></thead>
        <tbody>
          <tr v-for="p in st.people" :key="p.name">
            <td><b>{{ p.name }}</b></td>
            <td><a-select :value="p.skill" size="small" style="width:90px" :options="[{ value: 'new', label: '新人' }, { value: 'skilled', label: '熟练' }]" @change="(v: unknown) => setSkill(p.name, v as Skill)" /></td>
            <td class="num">{{ p.total }}</td>
            <td class="num" :style="{ color: p.passRate >= 85 ? 'var(--good-solid)' : 'var(--warn-solid)' }">{{ p.passRate }}%</td>
            <td class="num">{{ p.firstPass }}%</td>
            <td class="num">{{ p.rejects }}</td>
            <td class="num">{{ p.avg }}</td>
            <td class="num muted">{{ rv.rateOf(p.name) }}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>

  <a-modal v-model:open="issueModal.open" title="标记问题" centered ok-text="确认标记" cancel-text="取消" @ok="saveIssue">
    <a-form layout="vertical">
      <a-form-item label="切片"><a-input :value="issueModal.seg ? `${issueModal.seg.n} (${issueModal.seg.s}s ~ ${issueModal.seg.e}s)` : ''" disabled /></a-form-item>
      <div class="row" style="gap:12px">
        <a-form-item label="问题类型" style="flex:1"><a-select v-model:value="issueModal.kind" :options="KIND_OPTS" /></a-form-item>
        <a-form-item label="严重度" style="flex:1">
          <a-radio-group v-model:value="issueModal.severity" button-style="solid"><a-radio-button value="fatal">致命</a-radio-button><a-radio-button value="warn">一般</a-radio-button><a-radio-button value="info">建议</a-radio-button></a-radio-group>
        </a-form-item>
      </div>
      <a-form-item label="说明" required><a-textarea v-model:value="issueModal.desc" :rows="3" placeholder="如：结束时间偏早，需覆盖至开始充气前" :maxlength="100" show-count /></a-form-item>
      <div class="muted" style="font-size:12px">致命：数据不可用（标签错、漏关键动作）；一般：需修改；建议：不影响通过</div>
    </a-form>
  </a-modal>

  <a-modal v-model:open="dec.open" :title="VERDICT[dec.v][1]" centered :ok-text="'确认' + VERDICT[dec.v][1]" cancel-text="取消" :ok-button-props="{ danger: dec.v === 'reject' || dec.v === 'redo' }" @ok="confirmDecision">
    <div class="callout" :class="VERDICT[dec.v][0]" style="margin-bottom:12px"><span>{{ VERDICT[dec.v][2] }}</span></div>
    <div class="muted" style="font-size:12.5px;margin-bottom:10px">评分 {{ score }} / 10 · 系统建议「{{ VERDICT[suggestion][1] }}」</div>
    <template v-if="dec.v === 'reject' || dec.v === 'redo'">
      <div style="font-weight:600;margin-bottom:6px">原因（可多选）</div>
      <a-checkbox-group v-model:value="dec.reasons" style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
        <a-checkbox v-for="r in REJECT_TPL" :key="r" :value="r">{{ r }}</a-checkbox>
      </a-checkbox-group>
    </template>
    <a-textarea v-if="dec.v !== 'pass'" v-model:value="dec.text" :rows="3" :maxlength="200" show-count :placeholder="dec.v === 'fixpass' ? '说明修改了哪些内容，如：第 2 段结束时间改为 8.4s' : '补充说明修改要求'" />
  </a-modal>

  <a-modal v-model:open="shortcutGuideOpen" title="审核快捷键" width="480px" centered :footer="null">
    <div class="kbd-guide-grid">
      <div class="kbd-row"><div class="keys"><kbd>Space</kbd></div><div class="desc">播放 / 暂停</div></div>
      <div class="kbd-row"><div class="keys"><kbd>←</kbd> <kbd>→</kbd></div><div class="desc">后退 / 前进 0.1 秒（Shift 2 秒）</div></div>
      <div class="kbd-row"><div class="keys"><kbd>T</kbd></div><div class="desc">对选中或播放头所在切片标记问题</div></div>
      <div class="kbd-row"><div class="keys"><kbd>Esc</kbd></div><div class="desc">取消选中</div></div>
    </div>
  </a-modal>
</template>

<style scoped>
.ann2 { display: grid; grid-template-columns: 300px minmax(0, 1fr); min-height: 640px; }
.work { padding: 16px; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.ell { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 480px; }
.stbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.stbl th { text-align: left; font-weight: 500; color: var(--muted); padding: 8px 8px; border-bottom: 1px solid var(--line); background: var(--surface-2); }
.stbl td { padding: 6px 8px; border-bottom: 1px solid var(--line); vertical-align: middle; }
.stbl tr.sel td { background: var(--accent-soft); }
.stbl tr.flag td { background: var(--crit-soft); }
.dot { display: block; width: 10px; height: 10px; border-radius: 3px; }

.score-card { padding: 12px 14px; background: var(--surface-2); border: 1px solid var(--line); }
.vseg { display: flex; gap: 2px; padding: 3px; border-radius: 8px; background: var(--surface-3); margin-bottom: 8px; }
.vseg button { flex: 1; height: 28px; border: 0; border-radius: 6px; background: none; color: var(--muted); font-size: 12.5px; cursor: pointer; }
.vseg button[aria-selected="true"] { background: var(--surface); color: var(--text); font-weight: 600; box-shadow: 0 1px 2px rgba(15,30,55,.12); }
.claim { display: flex; gap: 6px; align-items: center; }
.stat-grid { display: grid; grid-template-columns: 1fr 1.3fr 1fr; gap: 16px; }
.pad { padding: 14px 16px; }
.bar-row { display: flex; align-items: center; gap: 10px; margin-top: 10px; font-size: 12.5px; }
.bar-row .bl { width: 84px; color: var(--muted); flex: none; }
.bar-row .bl.wide { width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-row .bt { flex: 1; height: 8px; border-radius: 4px; background: var(--surface-3); overflow: hidden; }
.bar-row .bt i { display: block; height: 100%; border-radius: 4px; background: var(--accent); }
.bar-row .bt i.good { background: var(--good-solid); }
.bar-row .bt i.warn { background: var(--warn-solid); }
.bar-row .bt i.crit { background: var(--crit-solid); }
.dim-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.dim-item { background: var(--surface); padding: 10px 12px; border-radius: 6px; border: 1px solid var(--line); display: flex; flex-direction: column; gap: 4px; }
.dim-item .lbl { font-size: 12.5px; font-weight: 600; }
.dim-item .dim-hint { font-size: 11px; color: var(--muted); }

.score-pill { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 12px; }
.score-pill.good { background: var(--good-soft); color: var(--good-solid); }
.score-pill.warn { background: var(--warn-soft); color: var(--warn-solid); }

.actbar { position: sticky; bottom: 0; display: flex; align-items: center; gap: 10px; padding: 12px 0 2px; margin-top: 4px; border-top: 1px solid var(--line); background: var(--surface); flex-wrap: wrap; }
kbd { font: 11px var(--font-mono); padding: 1px 5px; border: 1px solid var(--line-strong); border-radius: 4px; background: var(--surface-2); }

.kbd-guide-grid { display: flex; flex-direction: column; gap: 10px; }
.kbd-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 6px; background: var(--surface-2); }
.kbd-row .keys { display: flex; gap: 4px; align-items: center; }
.kbd-row .desc { font-size: 13px; color: var(--text); }

@media (max-width: 900px) { .ann2, .stat-grid { grid-template-columns: 1fr; } .dim-grid { grid-template-columns: 1fr; } }
</style>
