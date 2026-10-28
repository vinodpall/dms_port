<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useFitRows } from '@/components/proto/fitRows'
import { message, Modal } from 'ant-design-vue'
import { ExportOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined, UnorderedListOutlined } from '@ant-design/icons-vue'
import CamShot from './CamShot.vue'
import { ITEMS, type BizRecord, type BizRound } from '@/mock/biz'
import { db, curId, robot } from './store'

const roundsOpen = ref(false)
const host = ref<HTMLElement>()
const { size } = useFitRows(host, 47, 70)
const f = reactive({ kind: '全部', map: '全部', route: '全部', group: '全部', item: '全部', res: '全部' })
const q = reactive({ ...f })
const query = () => { Object.assign(q, f); page.value = 1 }
const reset = () => { Object.assign(f, { kind: '全部', map: '全部', route: '全部', group: '全部', item: '全部', res: '全部' }); query() }
const page = ref(1)
const mine = computed(() => db.records.filter((r) => r.robot === curId.value))
const uniq = (k: keyof BizRecord) => [...new Set(mine.value.map((r) => String(r[k])))]
const rows = computed(() => mine.value.filter((r) => (q.kind === '全部' || r.kind === q.kind) && (q.map === '全部' || r.map === q.map) && (q.route === '全部' || r.route === q.route) && (q.group === '全部' || r.group === q.group) && (q.item === '全部' || r.item === q.item) && (q.res === '全部' || (q.res === '异常') === r.bad)))
const rounds = computed(() => db.rounds.filter((r) => r.robot === curId.value))
const opt = (arr: string[]) => ['全部', ...arr].map((v) => ({ value: v, label: v }))
const sel = ref<(string | number)[]>([])
const img = ref<BizRecord | null>(null)
const round = ref<BizRound | null>(null)
const roundRecs = computed(() => db.records.filter((r) => r.round === round.value?.id))
const showRound = (id: string) => { round.value = db.rounds.find((r) => r.id === id) ?? null; if (!round.value) message.info('未找到轮次信息') }
const del = () => Modal.confirm({ title: '删除记录', content: `确定删除选中的 ${sel.value.length} 条记录吗？`, okButtonProps: { danger: true }, onOk: () => { for (const id of sel.value) db.records.splice(db.records.findIndex((r) => r.id === id), 1); sel.value = []; message.success('已删除') } })
</script>

<template>
  <div ref="host" class="pp-panel">
    <div class="rc-filter">
      <div class="rc-f"><span>日志类型</span><a-select v-model:value="f.kind" :options="opt(['循迹任务', '发布点任务', '日常巡检'])" /></div>
      <div class="rc-f"><span>地图</span><a-select v-model:value="f.map" :options="opt(uniq('map'))" /></div>
      <div class="rc-f"><span>路线</span><a-select v-model:value="f.route" :options="opt(uniq('route').filter((v) => v !== '—'))" /></div>
      <div class="rc-f"><span>任务组</span><a-select v-model:value="f.group" :options="opt(uniq('group'))" /></div>
      <div class="rc-f"><span>识别项目</span><a-select v-model:value="f.item" :options="opt(ITEMS)" /></div>
      <div class="rc-f"><span>结果</span><a-select v-model:value="f.res" :options="opt(['正常', '异常'])" /></div>
      <div class="rc-f w"><span>时间</span><a-range-picker show-time /></div>
      <div class="rc-btns">
        <a-button type="primary" @click="query">查询</a-button>
        <a-button @click="reset">重置</a-button>
        <a-button danger :disabled="!sel.length" @click="del">删除</a-button>
        <a-button @click="message.success('已导出 Excel')">导出</a-button>
        <a-button @click="roundsOpen = true">轮次信息</a-button>
      </div>
    </div>
    <a-table :data-source="rows" row-key="id" size="middle" :pagination="{ current: page, pageSize: size, size: 'small', showSizeChanger: false, showTotal: (t: number) => `共 ${t} 条`, onChange: (p: number) => (page = p) }" :row-selection="{ selectedRowKeys: sel, onChange: (k: any) => (sel = k) }"
      :columns="[{ title: '时间', key: 'time', width: 165 }, { title: '地图', dataIndex: 'map', width: 110, ellipsis: true }, { title: '日志类型', key: 'kind', width: 100 }, { title: '任务名称（路线）', dataIndex: 'route', ellipsis: true }, { title: '任务组', dataIndex: 'group', width: 100, ellipsis: true }, { title: '实时坐标', key: 'coord', width: 120 }, { title: '识别项目', dataIndex: 'item', width: 100 }, { title: '识别结果', key: 'result', width: 160, ellipsis: true }, { title: '描述', dataIndex: 'desc', width: 140, ellipsis: true }, { title: '操作', key: 'op', width: 70 }]">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'time'"><span class="mono">{{ record.time }}</span></template>
        <template v-else-if="column.key === 'kind'"><a-tag :color="record.kind === '发布点任务' ? 'purple' : record.kind === '日常巡检' ? 'blue' : 'cyan'">{{ record.kind }}</a-tag></template>
        <template v-else-if="column.key === 'coord'"><span class="mono" style="font-size:12px">{{ record.coord }}</span></template>
        <template v-else-if="column.key === 'result'"><span :class="{ ng: record.bad }">{{ record.result }}</span></template>
        <template v-else-if="column.key === 'op'"><span class="bz-ops"><a @click="img = record">图片</a></span></template>
      </template>
    </a-table>
  </div>

  <a-modal v-model:open="roundsOpen" title="巡检轮次" :footer="null" :width="1000">
    <a-table :data-source="rounds" row-key="id" size="small" :pagination="{ pageSize: 8, size: 'small' }" style="margin-top:12px"
      :columns="[{ title: '轮次', key: 'id', width: 110 }, { title: '任务类型', key: 'kind', width: 100 }, { title: '路线', dataIndex: 'route', ellipsis: true }, { title: '任务组', dataIndex: 'group', width: 110 }, { title: '开始', key: 'start', width: 110 }, { title: '结束', key: 'end', width: 110 }, { title: '任务点', dataIndex: 'total', width: 70 }, { title: '异常', key: 'bad', width: 60 }, { title: '状态', key: 'state', width: 90 }, { title: '操作', key: 'op', width: 70 }]">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'id' || column.key === 'start' || column.key === 'end'"><span class="mono">{{ record[column.key as 'id'] }}</span></template>
        <template v-else-if="column.key === 'kind'"><a-tag :color="record.kind === '发布点任务' ? 'purple' : 'cyan'">{{ record.kind }}</a-tag></template>
        <template v-else-if="column.key === 'bad'"><span class="mono" :class="{ ng: record.bad }">{{ record.bad }}</span></template>
        <template v-else-if="column.key === 'state'"><a-badge :status="record.state === '已完成' ? 'success' : record.state === '执行中' ? 'processing' : 'error'" :text="record.state" /></template>
        <template v-else-if="column.key === 'op'"><a @click="round = record">详情</a></template>
      </template>
    </a-table>
  </a-modal>

  <a-modal :open="!!img" :title="img ? `${img.desc} · ${img.item}` : ''" :footer="null" :width="720" @cancel="img = null">
    <template v-if="img">
      <div class="rc-img"><CamShot :seed="img.seed" :ir="img.item === '红外测温'" :box="img.result" :box-color="img.bad ? '#FF7A7A' : '#45E3A8'" hud /></div>
      <div class="bz-kv" style="margin-top:12px"><span>时间</span><b class="mono">{{ img.time }}</b><span>路线 / 任务组</span><b>{{ img.route }} / {{ img.group }}</b><span>坐标</span><b class="mono">{{ img.coord }}</b><span>识别结果</span><b :class="{ ng: img.bad }">{{ img.result }}</b></div>
    </template>
  </a-modal>

  <a-modal :open="!!round" :title="round ? `轮次信息 · ${round.id}` : ''" :footer="null" :width="760" @cancel="round = null">
    <template v-if="round">
      <a-descriptions :column="3" size="small" bordered style="margin-top:12px">
        <a-descriptions-item label="任务类型">{{ round.kind }}</a-descriptions-item><a-descriptions-item label="路线">{{ round.route }}</a-descriptions-item><a-descriptions-item label="任务组">{{ round.group }}</a-descriptions-item>
        <a-descriptions-item label="开始">{{ round.start }}</a-descriptions-item><a-descriptions-item label="结束">{{ round.end }}</a-descriptions-item><a-descriptions-item label="状态">{{ round.state }}</a-descriptions-item>
        <a-descriptions-item label="任务点">{{ round.total }}</a-descriptions-item><a-descriptions-item label="异常" :span="2"><span :class="{ ng: round.bad }">{{ round.bad }}</span></a-descriptions-item>
      </a-descriptions>
      <a-table size="small" :pagination="false" :data-source="roundRecs" row-key="id" :scroll="{ y: 300 }" style="margin-top:14px"
        :columns="[{ title: '时间', key: 'time', width: 90 }, { title: '描述', dataIndex: 'desc' }, { title: '识别项目', dataIndex: 'item', width: 100 }, { title: '识别结果', key: 'result' }]">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'time'"><span class="mono">{{ record.time.slice(11) }}</span></template>
          <template v-else-if="column.key === 'result'"><span :class="{ ng: record.bad }">{{ record.result }}</span></template>
        </template>
        <template #emptyText><div class="bz-empty" style="padding:16px">本轮暂无识别记录</div></template>
      </a-table>
    </template>
  </a-modal>
</template>

<style scoped>
.rc-filter { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px 16px; padding: 14px 16px; border-bottom: 1px solid rgba(46,211,230,.1); font-size: 13px; color: var(--muted); }
.rc-f { display: flex; align-items: center; gap: 8px; min-width: 0; } .rc-f > span { flex: none; } .rc-f > :deep(.ant-select), .rc-f > :deep(.ant-picker) { flex: 1; min-width: 0; }
.rc-f.w { grid-column: span 2; }
.rc-btns { grid-column: span 4; display: flex; justify-content: flex-end; gap: 8px; }
.ng { color: #FF7A7A; }
.rc-img { aspect-ratio: 16 / 9; border: 1px solid var(--line); border-radius: 7px; overflow: hidden; } .rc-img :deep(svg) { width: 100%; height: 100%; display: block; }
</style>
