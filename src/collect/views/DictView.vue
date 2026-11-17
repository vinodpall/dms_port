<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import PageHead from '@/collect/components/PageHead.vue'
import AppIcon from '@/components/AppIcon.vue'
import EmptyState from '@/collect/components/EmptyState.vue'
import { SCEN, type ScenKey } from '@/collect/constants'
import { LEVELS, useDict, type ActLevel, type DictCat, type DictItem, type DictOp } from '@/collect/stores/dict'
import { useAnnotate } from '@/collect/stores/annotate'
import { useSession } from '@/collect/stores/session'
import { toast } from '@/composables/toast'
import { confirmDlg } from '@/collect/composables/confirm'

/** 统一标注字典：标注员下拉选项与审核校验共用这一份；子任务分标准 / 异常；每次修改递增版本 */
const dict = useDict()
const ann = useAnnotate()
const session = useSession()

type Tab = 'all' | ActLevel
const tab = ref<Tab>('all')
const scen = ref<'all' | ScenKey | 'common'>('all')
const q = ref('')
const page = ref(1)
watch([tab, scen, q], () => { page.value = 1 })
const TABS: [Tab, string][] = [['all', '全部'], ['compound', '标准子任务'], ['abnormal', '异常子任务']]
const count = (t: Tab) => dict.items.filter((x) => match(x, t)).length
function match(x: DictItem, t: Tab) {
  if (t === 'all') return true
  return x.category === 'action' && (x.level ?? 'compound') === t
}
const rows = computed(() => dict.items.filter((x) => {
  if (!match(x, tab.value)) return false
  if (scen.value !== 'all' && x.scen !== scen.value) return false
  const k = q.value.trim().toLowerCase()
  return !k || [x.name, x.code, ...x.aliases].some((v) => v.toLowerCase().includes(k))
}))
/** 被标注引用的次数，删除前提示 */
const usage = (name: string) => ann.clips.reduce((a, c) => a + c.segs.filter((s) => s.n === name).length, 0)
const SCEN_OPTS = (Object.keys(SCEN) as ScenKey[]).map((k) => ({ value: k, label: SCEN[k].short }))
const LEVEL_OPTS = (Object.keys(LEVELS) as ActLevel[]).map((k) => ({ value: k, label: LEVELS[k] }))
const scenLabel = (s: DictItem['scen']) => (s === 'common' ? '通用' : SCEN[s].short)

const itemCols = [
  { title: '编码', key: 'code', width: 120 },
  { title: '名称', key: 'name', width: 140 },
  { title: '分级', key: 'level', width: 112 },
  { title: '场景', key: 'scen', width: 100 },
  { title: '定义', key: 'desc', width: 260 },
  { title: '别名', key: 'aliases', width: 180 },
  { title: '引用', key: 'usage', width: 70, align: 'right' as const },
  { title: '启用', key: 'status', width: 76 },
  { title: '操作', key: 'action', width: 120, align: 'right' as const },
]

const modal = reactive({ open: false, id: '', code: '', name: '', category: 'action' as DictCat, level: 'compound' as ActLevel, scen: 'common' as DictItem['scen'], aliases: '', desc: '', required: false })
function openAdd() {
  Object.assign(modal, { open: true, id: '', code: '', name: '', category: 'action', level: tab.value === 'all' ? 'compound' : tab.value, scen: 'common', aliases: '', desc: '', required: false })
}
function openEdit(x: DictItem) {
  Object.assign(modal, { open: true, id: x.id, code: x.code, name: x.name, category: x.category, level: x.level ?? 'compound', scen: x.scen, aliases: x.aliases.join('、'), desc: x.desc, required: !!x.required })
}
function save() {
  const name = modal.name.trim(), code = modal.code.trim().toUpperCase()
  if (!name || !code) return toast('请填写编码与名称', { type: 'warn' })
  if (dict.items.some((x) => x.id !== modal.id && (x.name === name || x.code === code))) return toast('名称或编码与已有词条重复', { type: 'warn' })
  const isAct = modal.category === 'action'
  const data = {
    code, name, category: modal.category, scen: modal.scen, desc: modal.desc.trim(),
    aliases: modal.aliases.split(/[,，、\s]+/).map((s) => s.trim()).filter(Boolean),
    level: isAct ? modal.level : undefined,
    required: isAct && modal.level === 'compound' && modal.scen !== 'common' ? modal.required : false,
  }
  if (modal.id) {
    const old = dict.items.find((x) => x.id === modal.id)
    if (old && old.name !== name) ann.clips.forEach((c) => c.segs.forEach((s) => { if (s.n === old.name) s.n = name }))
    dict.update(modal.id, data, session.info.user)
    toast('已保存，字典升级为 ' + dict.version)
  } else {
    dict.add(data, session.info.user)
    toast('已新增，字典升级为 ' + dict.version)
  }
  modal.open = false
}
async function del(x: DictItem) {
  const n = usage(x.name)
  const ok = await confirmDlg({ title: '删除词条？', msg: n ? `「${x.name}」已被 ${n} 处标注引用，删除后这些标注提交时会提示“标签不在字典中”。建议改为停用。` : `确定删除「${x.name}」？`, ok: '删除', danger: true })
  if (!ok) return
  dict.remove(x.id, session.info.user)
  toast('已删除，字典升级为 ' + dict.version)
}
function toggle(x: DictItem) {
  dict.toggle(x.id, session.info.user)
  toast((x.status === 'active' ? '已启用' : '已停用') + '，字典升级为 ' + dict.version)
}

/** 操作记录子页 */
const view = ref<'list' | 'log'>('list')
const logQ = ref('')
const logOp = ref<'all' | DictOp>('all')
const logBy = ref('all')
const logPage = ref(1)
watch([logQ, logOp, logBy], () => { logPage.value = 1 })
const OPS: DictOp[] = ['新增', '修改', '启用', '停用', '删除']
const OP_CLS: Record<DictOp, string> = { 新增: 'good', 修改: 'info', 启用: 'good', 停用: 'warn', 删除: 'crit' }
const byOpts = computed(() => [{ value: 'all', label: '全部操作人' }, ...[...new Set(dict.changes.map((c) => c.by))].map((v) => ({ value: v, label: v }))])
const logs = computed(() => dict.changes.filter((c) => {
  if (logOp.value !== 'all' && c.op !== logOp.value) return false
  if (logBy.value !== 'all' && c.by !== logBy.value) return false
  const k = logQ.value.trim()
  return !k || c.target.includes(k) || c.summary.includes(k)
}).map((c, i) => ({ ...c, _key: `${i}-${c.t}-${c.ver}` })))
const logCols = [
  { title: '时间', key: 't', width: 155 },
  { title: '版本', key: 'ver', width: 92 },
  { title: '操作人', key: 'by', width: 92 },
  { title: '操作', key: 'op', width: 84 },
  { title: '词条', key: 'target', width: 150 },
  { title: '内容', key: 'summary', width: 280 },
]
</script>

<template>
  <template v-if="view === 'log'">
    <PageHead title="字典操作记录" :desc="'当前版本 ' + dict.version + ' · 共 ' + dict.changes.length + ' 条记录，每次新增、修改、启停、删除都会升级版本'">
      <a-button @click="view = 'list'"><AppIcon name="left" />返回字典</a-button>
    </PageHead>
    <div class="card">
      <div class="toolbar">
        <a-input v-model:value="logQ" class="grow" allow-clear placeholder="搜索词条或内容" aria-label="搜索操作记录"><template #prefix><AppIcon name="search" /></template></a-input>
        <a-select v-model:value="logOp" style="width:130px" aria-label="操作类型" :options="[{ value: 'all', label: '全部操作' }, ...OPS.map((v) => ({ value: v, label: v }))]" />
        <a-select v-model:value="logBy" style="width:130px" aria-label="操作人" :options="byOpts" />
      </div>
      <a-table
        row-key="_key"
        :columns="logCols"
        :data-source="logs"
        size="middle"
        class="pp-table"
        :scroll="{ x: 840 }"
        :pagination="{ current: logPage, pageSize: 12, showSizeChanger: false, size: 'small', hideOnSinglePage: false, showTotal: (n: number) => `共 ${n} 条记录` }"
        @change="(p: { current?: number }) => (logPage = p.current ?? 1)"
      >
        <template #bodyCell="{ column, record }">
          <span v-if="column.key === 't'" class="num muted">{{ record.t }}</span>
          <span v-else-if="column.key === 'ver'" class="mono ver">{{ record.ver }}</span>
          <span v-else-if="column.key === 'by'">{{ record.by }}</span>
          <span v-else-if="column.key === 'op'" class="tag" :class="OP_CLS[record.op as DictOp]">{{ record.op }}</span>
          <b v-else-if="column.key === 'target'">{{ record.target }}</b>
          <span v-else-if="column.key === 'summary'" class="muted">{{ record.summary }}</span>
        </template>
        <template #emptyText><EmptyState icon="search" title="没有匹配的记录" desc="换个关键词或筛选条件试试" /></template>
      </a-table>
    </div>
  </template>

  <template v-else>
  <PageHead title="标注字典" :desc="'标注与审核共用一份字典 · 当前版本 ' + dict.version + '；子任务分标准 / 异常两类'">
    <a-button @click="view = 'log'"><AppIcon name="clock" />操作记录</a-button>
    <a-button type="primary" @click="openAdd"><AppIcon name="plus" />新增词条</a-button>
  </PageHead>

  <div class="card">
      <div class="toolbar">
        <a-input v-model:value="q" class="grow" allow-clear placeholder="搜索名称、编码、别名" aria-label="搜索词条"><template #prefix><AppIcon name="search" /></template></a-input>
        <a-select v-model:value="scen" style="width:150px" aria-label="按场景筛选" :options="[{ value: 'all', label: '全部场景' }, { value: 'common', label: '通用' }, ...SCEN_OPTS]" />
      </div>
      <div class="toolbar" style="border-bottom:0;padding-bottom:0">
        <div class="chips"><button v-for="t in TABS" :key="t[0]" type="button" class="chip" :aria-pressed="tab === t[0]" @click="tab = t[0]">{{ t[1] }} <span class="n num">{{ count(t[0]) }}</span></button></div>
      </div>
      <a-table
        row-key="id"
        :columns="itemCols"
        :data-source="rows"
        size="middle"
        class="pp-table"
        :row-class-name="(r: DictItem) => (r.status !== 'active' ? 'row-off' : '')"
        :scroll="{ x: 1080 }"
        :pagination="{ current: page, pageSize: 12, showSizeChanger: false, size: 'small', hideOnSinglePage: false, showTotal: (n: number) => `共 ${n} 条词条` }"
        @change="(p: { current?: number }) => (page = p.current ?? 1)"
      >
        <template #bodyCell="{ column, record }">
          <b v-if="column.key === 'code'" class="mono">{{ record.code }}</b>
          <template v-else-if="column.key === 'name'"><b>{{ record.name }}</b> <span v-if="record.required" class="tag crit" style="font-size:11px">必选</span></template>
          <span v-else-if="column.key === 'level'" class="tag" :class="record.category === 'object' ? 'good' : record.level === 'abnormal' ? 'warn' : 'info'">{{ record.category === 'object' ? '物体' : LEVELS[(record.level ?? 'compound') as ActLevel] }}</span>
          <span v-else-if="column.key === 'scen'" class="muted" style="white-space:nowrap">{{ scenLabel(record.scen) }}</span>
          <span v-else-if="column.key === 'desc'" class="muted" style="font-size:12.5px">{{ record.desc }}</span>
          <template v-else-if="column.key === 'aliases'"><span v-for="a in record.aliases" :key="a" class="alias">{{ a }}</span></template>
          <span v-else-if="column.key === 'usage'" class="num muted">{{ usage(record.name) }}</span>
          <a-switch v-else-if="column.key === 'status'" size="small" :checked="record.status === 'active'" :aria-label="'启用 ' + record.name" @change="toggle(record as DictItem)" />
          <div v-else-if="column.key === 'action'" class="pp-op">
            <a-button size="small" type="link" @click="openEdit(record as DictItem)">编辑</a-button>
            <a-button size="small" type="link" danger @click="del(record as DictItem)">删除</a-button>
          </div>
        </template>
        <template #emptyText><EmptyState icon="search" title="没有匹配的词条" desc="换个关键词或场景试试" /></template>
      </a-table>
    </div>

  </template>

  <a-modal v-model:open="modal.open" :title="modal.id ? '编辑词条' : '新增词条'" centered ok-text="保存" cancel-text="取消" @ok="save">
    <a-form layout="vertical">
      <div class="row" style="gap:12px">
        <a-form-item label="编码" required style="flex:1"><a-input v-model:value="modal.code" placeholder="如 CLAMP" /></a-form-item>
        <a-form-item label="名称" required style="flex:1"><a-input v-model:value="modal.name" placeholder="如 夹紧密封" /></a-form-item>
      </div>
      <div class="row" style="gap:12px">
        
        <a-form-item v-if="modal.category === 'action'" label="分级" style="flex:1"><a-select v-model:value="modal.level" :options="LEVEL_OPTS" /></a-form-item>
        <a-form-item label="适用场景" style="flex:1"><a-select v-model:value="modal.scen" :options="[{ value: 'common', label: '通用' }, ...SCEN_OPTS]" /></a-form-item>
      </div>
      <a-form-item v-if="modal.category === 'action' && modal.level === 'compound' && modal.scen !== 'common'">
        <a-checkbox v-model:checked="modal.required">该场景的必选子任务（未标注时提交会提示）</a-checkbox>
      </a-form-item>
      <a-form-item label="别名（逗号或顿号分隔）"><a-input v-model:value="modal.aliases" placeholder="如 夹紧、闭合气缸" /></a-form-item>
      <a-form-item label="定义"><a-textarea v-model:value="modal.desc" :rows="3" placeholder="清楚描述起止边界，便于标注员与审核员统一理解" /></a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped>
.pp-table :deep(tr.row-off td) { opacity: .5; }
.alias { display: inline-block; font-size: 11px; padding: 0 6px; margin: 1px 3px 1px 0; border-radius: 4px; background: var(--surface-3); color: var(--muted); }
.vlog { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; font-size: 13px; }
.vlog li { display: flex; gap: 10px; }
.ver { flex: none; font-size: 12px; padding: 1px 6px; height: 20px; border-radius: 4px; background: var(--accent-soft); color: var(--accent); }
</style>
