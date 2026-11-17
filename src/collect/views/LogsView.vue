<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import PageHead from '@/collect/components/PageHead.vue'
import AppIcon from '@/components/AppIcon.vue'
import StatusBadge from '@/collect/components/StatusBadge.vue'
import EmptyState from '@/collect/components/EmptyState.vue'
import { useLogs, type LogEntry } from '@/collect/stores/logs'
import { toast } from '@/composables/toast'
import type { BadgeKind } from '@/collect/constants'

const logsStore = useLogs()

const search = ref('')
const filterModule = ref<string>('all')
const filterStatus = ref<string>('all')
const filterUser = ref<string>('all')
const filterTime = ref<'all' | 'today' | '3days' | '7days'>('all')
const page = ref(1)
watch([search, filterModule, filterStatus, filterUser, filterTime], () => { page.value = 1 })

const timeChips: ['all' | 'today' | '3days' | '7days', string][] = [
  ['all', '全部时间'],
  ['today', '今日'],
  ['3days', '近3天'],
  ['7days', '近7天'],
]

const filteredList = computed(() => {
  const now = Date.now()
  return logsStore.list.filter((l) => {
    if (filterModule.value !== 'all' && l.module !== filterModule.value) return false
    if (filterStatus.value !== 'all' && l.status !== filterStatus.value) return false
    if (filterUser.value !== 'all' && l.user !== filterUser.value) return false

    if (filterTime.value === 'today') {
      if (now - l.timestamp > 1000 * 60 * 60 * 24) return false
    } else if (filterTime.value === '3days') {
      if (now - l.timestamp > 1000 * 60 * 60 * 24 * 3) return false
    } else if (filterTime.value === '7days') {
      if (now - l.timestamp > 1000 * 60 * 60 * 24 * 7) return false
    }

    if (search.value) {
      const q = search.value.toLowerCase()
      const matchTrace = l.traceId.toLowerCase().includes(q)
      const matchTarget = l.target.toLowerCase().includes(q)
      const matchSummary = l.summary.toLowerCase().includes(q)
      const matchAction = l.action.toLowerCase().includes(q)
      const matchUser = l.user.toLowerCase().includes(q)
      if (!matchTrace && !matchTarget && !matchSummary && !matchAction && !matchUser) return false
    }
    return true
  })
})

const columns = [
  { title: 'Trace ID', key: 'traceId', width: 120 },
  { title: '操作时间', key: 'time', width: 165 },
  { title: '操作人员', key: 'user', width: 130 },
  { title: '业务模块', key: 'module', width: 112 },
  { title: '操作行为', key: 'action', width: 100 },
  { title: '目标对象', key: 'target', width: 210 },
  { title: '业务摘要与变更说明', key: 'summary', width: 260 },
  { title: '耗时', key: 'duration', width: 84, align: 'right' as const },
  { title: '状态', key: 'status', width: 86 },
  { title: '操作', key: 'op', width: 76, align: 'right' as const },
]

const customRow = (r: LogEntry) => ({
  class: 'row-click',
  onClick: (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('a, button, .ant-btn')) return
    viewDetail(r)
  },
})

const stats = computed(() => {
  const all = logsStore.list
  return {
    total: all.length,
    success: all.filter((l) => l.status === 'success').length,
    warn: all.filter((l) => l.status === 'warn').length,
    failed: all.filter((l) => l.status === 'failed').length,
  }
})

/* 查看详情弹窗 */
const detailModal = reactive<{
  open: boolean
  entry: LogEntry | null
}>({
  open: false,
  entry: null,
})

function viewDetail(entry: LogEntry) {
  detailModal.entry = entry
  detailModal.open = true
}

function copyText(txt: string) {
  navigator.clipboard?.writeText(txt)
  toast('已复制到剪贴板')
}

function exportCsv() {
  const rows = [
    ['日志ID', 'TraceID', '时间', '操作人', '角色', '所属模块', '操作行为', '目标对象', '状态', '耗时(ms)', '客户端IP', '业务说明'],
    ...filteredList.value.map((l) => [
      l.id,
      l.traceId,
      l.time,
      l.user,
      l.role,
      l.moduleName,
      l.action,
      l.target,
      l.status,
      l.duration,
      l.ip,
      `"${l.summary.replace(/"/g, '""')}"`,
    ]),
  ]
  const csvContent = '\uFEFF' + rows.map((e) => e.join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dms_audit_logs_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast('已成功导出审计日志 CSV 文件')
}
</script>

<template>
  <PageHead title="操作审计日志" desc="采集、标注、审核及系统字典全链路操作流水审计；支持链路追踪与变更快照比对">
    <div class="row" style="gap:8px">
      <a-button @click="exportCsv"><AppIcon name="download" size="sm" />导出审计流水 (CSV)</a-button>
    </div>
  </PageHead>

  <!-- 统计指标条 -->
  <div class="stats-row">
    <div class="stat-card">
      <span class="num">{{ stats.total }}</span>
      <span class="lbl">累计操作流水</span>
    </div>
    <div class="stat-card">
      <span class="num" style="color:var(--good-solid)">{{ stats.success }}</span>
      <span class="lbl">正常执行成功</span>
    </div>
    <div class="stat-card">
      <span class="num" style="color:var(--warn-solid)">{{ stats.warn }}</span>
      <span class="lbl">审核打回 / 质检告警</span>
    </div>
    <div class="stat-card">
      <span class="num" style="color:var(--crit-solid)">{{ stats.failed }}</span>
      <span class="lbl">流水线异常 / 拦截</span>
    </div>
  </div>

  <div class="card">
    <!-- 筛选搜索栏 -->
    <div class="toolbar">
      <a-input
        v-model:value="search"
        class="grow"
        placeholder="搜索流水号 / 操作人 / 目标 / 行为"
        aria-label="搜索审计日志"
        allow-clear
      >
        <template #prefix><AppIcon name="search" /></template>
      </a-input>

      <a-select v-model:value="filterModule" style="width:140px" aria-label="按业务模块筛选">
        <a-select-option value="all">全部业务模块</a-select-option>
        <a-select-option value="annotate">标注工作台</a-select-option>
        <a-select-option value="review">审核工作台</a-select-option>
        <a-select-option value="vocab">字典管理</a-select-option>
        <a-select-option value="collect">采集任务</a-select-option>
        <a-select-option value="pipeline">数据流水线</a-select-option>
        <a-select-option value="system">系统管理</a-select-option>
      </a-select>

      <a-select v-model:value="filterStatus" style="width:115px" aria-label="按状态筛选">
        <a-select-option value="all">全部状态</a-select-option>
        <a-select-option value="success">成功</a-select-option>
        <a-select-option value="warn">质检告警</a-select-option>
        <a-select-option value="failed">执行失败</a-select-option>
      </a-select>

      <a-select v-model:value="filterUser" style="width:130px" aria-label="按操作人筛选">
        <a-select-option value="all">全部操作人</a-select-option>
        <a-select-option value="林悦">林悦 (标注员)</a-select-option>
        <a-select-option value="陈静">陈静 (审核员)</a-select-option>
        <a-select-option value="周工">周工 (管理员)</a-select-option>
        <a-select-option value="张杰">张杰 (操作员)</a-select-option>
      </a-select>
    </div>

    <div class="toolbar" style="border-bottom:0;padding-bottom:0">
      <div class="chips">
        <button v-for="t in timeChips" :key="t[0]" type="button" class="chip" :aria-pressed="filterTime === t[0]" @click="filterTime = t[0]">{{ t[1] }}</button>
      </div>
    </div>

    <!-- 日志表格 -->
    <a-table
      row-key="id"
      :columns="columns"
      :data-source="filteredList"
      size="middle"
      class="pp-table"
      :custom-row="customRow"
      :scroll="{ x: 1180 }"
      :pagination="{ current: page, pageSize: 10, showSizeChanger: false, size: 'small', hideOnSinglePage: false, showTotal: (n: number) => `共 ${n} 条流水` }"
      @change="(p: { current?: number }) => (page = p.current ?? 1)"
    >
      <template #bodyCell="{ column, record }">
        <a v-if="column.key === 'traceId'" class="mono ell-code" title="点击复制 TraceID" @click.stop="copyText(record.traceId)">{{ record.traceId }}</a>
        <span v-else-if="column.key === 'time'" class="muted num" style="font-size:12.5px">{{ record.time }}</span>
        <div v-else-if="column.key === 'user'" class="cell-main">
          <span>{{ record.user }}</span>
          <small>{{ record.role }}</small>
        </div>
        <a-tag v-else-if="column.key === 'module'" :color="record.module === 'annotate' ? 'blue' : record.module === 'review' ? 'purple' : record.module === 'vocab' ? 'cyan' : record.module === 'collect' ? 'green' : 'orange'">
          {{ record.moduleName }}
        </a-tag>
        <b v-else-if="column.key === 'action'">{{ record.action }}</b>
        <span v-else-if="column.key === 'target'" class="mono" style="font-size:12px">{{ record.target }}</span>
        <span v-else-if="column.key === 'summary'" class="muted" style="font-size:12.5px">{{ record.summary }}</span>
        <span v-else-if="column.key === 'duration'" class="num muted">{{ record.duration }} ms</span>
        <StatusBadge
          v-else-if="column.key === 'status'"
          :kind="(record.status === 'success' ? 'good' : record.status === 'warn' ? 'warn' : 'crit') as BadgeKind"
          :text="record.status === 'success' ? '成功' : record.status === 'warn' ? '打回' : '失败'"
        />
        <a-button v-else-if="column.key === 'op'" size="small" type="link" @click.stop="viewDetail(record as LogEntry)">查看</a-button>
      </template>
      <template #emptyText>
        <EmptyState icon="search" title="暂无符合条件的审计日志记录" desc="换个关键词或筛选条件试试" />
      </template>
    </a-table>
  </div>

  <!-- 详情弹窗 -->
  <a-modal v-model:open="detailModal.open" title="操作流水审计详情" width="640px" centered :footer="null">
    <div v-if="detailModal.entry" class="log-detail-body">
      <div class="row between" style="margin-bottom:12px">
        <div class="row" style="gap:8px">
          <span class="mono" style="font-size:15px;font-weight:700">{{ detailModal.entry.traceId }}</span>
          <a-button size="small" type="text" @click="copyText(detailModal.entry!.traceId)">复制</a-button>
        </div>
        <StatusBadge
          :kind="(detailModal.entry.status === 'success' ? 'good' : detailModal.entry.status === 'warn' ? 'warn' : 'crit') as BadgeKind"
          :text="detailModal.entry.status === 'success' ? '执行成功' : detailModal.entry.status === 'warn' ? '审核预警/打回' : '执行失败'"
        />
      </div>

      <div class="detail-grid">
        <div class="detail-row"><span class="k">日志主键</span><span class="v mono">{{ detailModal.entry.id }}</span></div>
        <div class="detail-row"><span class="k">记录时间</span><span class="v num">{{ detailModal.entry.time }}</span></div>
        <div class="detail-row"><span class="k">操作人员</span><span class="v">{{ detailModal.entry.user }} ({{ detailModal.entry.role }})</span></div>
        <div class="detail-row"><span class="k">所属模块</span><span class="v">{{ detailModal.entry.moduleName }} ({{ detailModal.entry.module }})</span></div>
        <div class="detail-row"><span class="k">操作动作</span><span class="v"><b>{{ detailModal.entry.action }}</b></span></div>
        <div class="detail-row"><span class="k">目标对象</span><span class="v mono">{{ detailModal.entry.target }}</span></div>
        <div class="detail-row"><span class="k">客户端 IP</span><span class="v mono">{{ detailModal.entry.ip }}</span></div>
        <div class="detail-row"><span class="k">用户代理</span><span class="v" style="font-size:12px">{{ detailModal.entry.ua }}</span></div>
        <div class="detail-row"><span class="k">执行耗时</span><span class="v num">{{ detailModal.entry.duration }} 毫秒</span></div>
        <div class="detail-row"><span class="k">业务说明</span><span class="v">{{ detailModal.entry.summary }}</span></div>
      </div>

      <div v-if="detailModal.entry.before || detailModal.entry.after" style="margin-top:16px">
        <div style="font-weight:600;margin-bottom:8px">数据变更快照对比 (Diff)</div>
        <div class="diff-box">
          <div class="diff-col">
            <span class="diff-title">变更前 (Before)</span>
            <pre class="diff-pre">{{ typeof detailModal.entry.before === 'object' ? JSON.stringify(detailModal.entry.before, null, 2) : (detailModal.entry.before ?? '无') }}</pre>
          </div>
          <div class="diff-col">
            <span class="diff-title">变更后 (After)</span>
            <pre class="diff-pre" style="color:var(--good-solid)">{{ typeof detailModal.entry.after === 'object' ? JSON.stringify(detailModal.entry.after, null, 2) : (detailModal.entry.after ?? '无') }}</pre>
          </div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.stat-card { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 14px 16px; box-shadow: var(--shadow-sm); }
.stat-card .num { display: block; font: 700 22px var(--font-mono); margin-bottom: 2px; }
.stat-card .lbl { font-size: 12px; color: var(--muted); }

.ell-code { cursor: pointer; text-decoration: underline; color: var(--accent); }

.detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; background: var(--surface-2); padding: 12px; border-radius: 6px; font-size: 12.5px; }
.detail-row { display: flex; flex-direction: column; gap: 2px; }
.detail-row .k { color: var(--muted); font-size: 11.5px; }
.detail-row .v { color: var(--text); }

.diff-box { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.diff-col { background: var(--surface-2); border-radius: 6px; padding: 10px; }
.diff-title { font-size: 12px; font-weight: 600; margin-bottom: 6px; display: block; }
.diff-pre { font: 11.5px var(--font-mono); margin: 0; white-space: pre-wrap; word-break: break-all; max-height: 180px; overflow-y: auto; }

@media (max-width: 900px) { .stats-row { grid-template-columns: repeat(2, 1fr); } .diff-box { grid-template-columns: 1fr; } }
</style>
