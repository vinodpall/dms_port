import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/** 6 维度评分，每项 1–10 分；≥5 个维度 ≥8 分且无维度 <6 时建议通过 */
export interface ReviewScore {
  timeAccuracy: number; actionRationality: number; objectCompleteness: number
  semanticClarity: number; outcomeAccuracy: number; consistency: number; note: string
}
export const DIMS: [keyof Omit<ReviewScore, 'note'>, string, string][] = [
  ['timeAccuracy', '时间准确性', '起止时间是否贴合动作'],
  ['actionRationality', '动作合理性', '子任务归类与粒度是否恰当'],
  ['objectCompleteness', '物体完整性', '主物体 / 辅助物体是否完整'],
  ['semanticClarity', '语义清晰度', '语义描述是否清楚准确'],
  ['outcomeAccuracy', '结果准确性', '成功 / 失败及原因是否正确'],
  ['consistency', '标注一致性', '与字典定义及同类数据一致'],
]
export type IssueSev = 'fatal' | 'warn' | 'info'
export const SEV: Record<IssueSev, [string, string]> = { fatal: ['crit', '致命'], warn: ['warn', '一般'], info: ['info', '建议'] }
export type IssueKind = 'boundary' | 'label' | 'missing' | 'redundant' | 'content' | 'other'
export const ISSUE_KIND: Record<IssueKind, string> = { boundary: '边界不准', label: '标签错误', missing: '遗漏动作', redundant: '冗余切片', content: '内容错误（物体/描述/结果）', other: '其他' }
export interface SegIssue { segId: number; kind: IssueKind; severity: IssueSev; desc: string }

export type Verdict = 'pass' | 'fixpass' | 'reject' | 'redo'
export const VERDICT: Record<Verdict, [string, string, string]> = {
  pass: ['good', '通过', '标注质量合格，直接入库'],
  fixpass: ['info', '修改后通过', '审核员已直接修正小问题，无需返回标注员'],
  reject: ['warn', '驳回', '返回原标注员按意见修改'],
  redo: ['crit', '退回重做', '清空标注，放回任务池重新分配'],
}
export const REJECT_TPL = ['子任务起止边界偏差超过 0.5s', '子任务标签与实际动作不符', '遗漏关键子任务', '主物体 / 辅助物体选择错误', '语义描述不清或过于简略', '执行结果判定错误或失败原因缺失']

export interface ReviewRecord { clipId: string; annotator: string; reviewer: string; verdict: Verdict; score: number; reasons: string[]; t: string; today: boolean }
export type Skill = 'new' | 'skilled'
export interface Annotator { name: string; skill: Skill }

const seedRecords = (): ReviewRecord[] => {
  const ann = ['林悦', '王磊', '周工', '林悦', '刘洋', '林悦', '王磊', '刘洋']
  const vs: Verdict[] = ['pass', 'pass', 'fixpass', 'pass', 'reject', 'pass', 'reject', 'pass', 'redo', 'pass', 'fixpass', 'pass']
  return Array.from({ length: 36 }, (_, i) => {
    const v = vs[i % vs.length]
    const reasons = v === 'reject' ? [REJECT_TPL[i % 6]] : v === 'redo' ? [REJECT_TPL[2], REJECT_TPL[1]] : v === 'fixpass' ? [REJECT_TPL[(i + 3) % 6]] : []
    return { clipId: 'H' + (100 + i), annotator: ann[i % ann.length], reviewer: i % 3 ? '陈静' : '周工', verdict: v, score: +(v === 'pass' ? 8.4 + (i % 5) * 0.3 : v === 'fixpass' ? 7.8 : v === 'reject' ? 6.6 : 5.2).toFixed(1), reasons, t: i < 14 ? '今天' : '近 7 天', today: i < 14 }
  })
}

export const useReview = defineStore('cl-review', () => {
  const scores = ref<Record<string, ReviewScore>>({})
  const clipIssues = ref<Record<string, SegIssue[]>>({})
  const records = ref<ReviewRecord[]>(seedRecords())

  /** 抽检：新人全审，熟练按比例抽检 */
  const annotators = ref<Annotator[]>([
    { name: '林悦', skill: 'skilled' }, { name: '周工', skill: 'skilled' }, { name: '王磊', skill: 'new' }, { name: '刘洋', skill: 'new' },
  ])
  const sampleRate = ref<Record<Skill, number>>({ new: 100, skilled: 30 })
  const skillOf = (name: string): Skill => annotators.value.find((a) => a.name === name)?.skill ?? 'new'
  const rateOf = (name: string) => sampleRate.value[skillOf(name)]
  const sampleFor = (name: string) => Math.random() * 100 < rateOf(name)

  function getScore(clipId: string): ReviewScore {
    if (!scores.value[clipId]) scores.value[clipId] = { timeAccuracy: 9, actionRationality: 9, objectCompleteness: 8, semanticClarity: 8, outcomeAccuracy: 9, consistency: 8, note: '' }
    return scores.value[clipId]
  }
  function setScore(clipId: string, patch: Partial<ReviewScore>) { Object.assign(getScore(clipId), patch) }
  /** 平均分（10 分制，一位小数） */
  function calculateScore(clipId: string): number {
    const s = getScore(clipId)
    return +(DIMS.reduce((a, [k]) => a + s[k], 0) / DIMS.length).toFixed(1)
  }
  /** 根据评分与问题严重度给出建议结论 */
  function suggest(clipId: string): Verdict {
    const s = getScore(clipId), vals = DIMS.map(([k]) => s[k])
    const iss = getIssues(clipId)
    if (vals.some((v) => v < 5) || iss.filter((x) => x.severity === 'fatal').length >= 2) return 'redo'
    if (iss.some((x) => x.severity === 'fatal')) return 'reject'
    if (vals.filter((v) => v >= 8).length >= 5 && vals.every((v) => v >= 6)) return iss.length ? 'fixpass' : 'pass'
    return 'reject'
  }

  const getIssues = (clipId: string): SegIssue[] => clipIssues.value[clipId] ?? []
  function addIssue(clipId: string, issue: SegIssue) {
    const l = (clipIssues.value[clipId] ??= [])
    const i = l.findIndex((x) => x.segId === issue.segId)
    if (i >= 0) l[i] = issue
    else l.push(issue)
  }
  function removeIssue(clipId: string, segId: number) {
    if (clipIssues.value[clipId]) clipIssues.value[clipId] = clipIssues.value[clipId].filter((x) => x.segId !== segId)
  }
  function record(r: Omit<ReviewRecord, 't' | 'today'>) { records.value.unshift({ ...r, t: '刚刚', today: true }) }

  /** 质量统计 */
  const stats = computed(() => {
    const rs = records.value, n = rs.length || 1
    const ok = rs.filter((r) => r.verdict === 'pass' || r.verdict === 'fixpass').length
    const reasons: Record<string, number> = {}
    rs.forEach((r) => r.reasons.forEach((x) => (reasons[x] = (reasons[x] ?? 0) + 1)))
    const people = [...new Set(rs.map((r) => r.annotator))].map((name) => {
      const m = rs.filter((r) => r.annotator === name), k = m.length || 1
      return {
        name, skill: skillOf(name), total: m.length,
        passRate: Math.round((m.filter((r) => r.verdict === 'pass' || r.verdict === 'fixpass').length / k) * 100),
        firstPass: Math.round((m.filter((r) => r.verdict === 'pass').length / k) * 100),
        rejects: m.filter((r) => r.verdict === 'reject' || r.verdict === 'redo').length,
        avg: +(m.reduce((a, r) => a + r.score, 0) / k).toFixed(1),
      }
    }).sort((a, b) => b.total - a.total)
    const by = (v: Verdict) => rs.filter((r) => r.verdict === v).length
    return {
      today: rs.filter((r) => r.today).length, total: rs.length,
      passRate: Math.round((ok / n) * 100), rejectRate: Math.round(((by('reject') + by('redo')) / n) * 100),
      avg: +(rs.reduce((a, r) => a + r.score, 0) / n).toFixed(1),
      verdicts: (Object.keys(VERDICT) as Verdict[]).map((v) => ({ v, n: by(v) })),
      reasons: Object.entries(reasons).sort((a, b) => b[1] - a[1]),
      people,
    }
  })

  return { scores, clipIssues, records, annotators, sampleRate, skillOf, rateOf, sampleFor, getScore, setScore, calculateScore, suggest, getIssues, addIssue, removeIssue, record, stats }
})
