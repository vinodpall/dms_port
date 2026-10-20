<script setup lang="ts">
import { computed, ref } from 'vue'
import { ExportOutlined, DownloadOutlined, PictureOutlined, VideoCameraOutlined } from '@ant-design/icons-vue'
import BizMap from './BizMap.vue'
import CamShot from './CamShot.vue'
import { ROUNDS, TASKS, ROBOTS, MAPS } from '@/mock/biz'
import { rng } from '@/utils'

type Round = (typeof ROUNDS)[number]
const f = ref({ task: '全部', robot: '全部', map: '全部' })
const rows = computed(() => ROUNDS.filter((r) => (f.value.task === '全部' || r.task === f.value.task) && (f.value.robot === '全部' || r.robot === f.value.robot) && (f.value.map === '全部' || r.map === f.value.map)))
const sum = computed(() => ({ n: ROUNDS.length, pts: ROUNDS.reduce((a, r) => a + r.total, 0), bad: ROUNDS.reduce((a, r) => a + r.bad, 0), rate: Math.round((ROUNDS.filter((r) => r.state === '已完成').length / ROUNDS.length) * 100) }))
const cur = ref<Round | null>(null)
const task = computed(() => TASKS.find((t) => t.name === cur.value?.task))
const results = computed(() => {
  if (!cur.value || !task.value) return []
  const r = rng(cur.value.id.charCodeAt(4) * 7)
  const badIdx = new Set(Array.from({ length: cur.value.bad }, () => Math.floor(r() * task.value!.pts.length)))
  return task.value.pts.map((p, i) => ({ ...p, bad: badIdx.has(i), seed: 200 + i + cur.value!.id.charCodeAt(5), res: badIdx.has(i) ? ['指示灯异常熄灭', '温度 68.4℃ 超限', '读数 1.86 MPa 超上限'][i % 3] : ['正常', '温度 36.2℃', '读数 0.82 MPa'][i % 3] }))
})
const opt = (arr: string[]) => ['全部', ...arr].map((v) => ({ value: v, label: v }))
</script>

<template>
  <div class="pp-head"><div><h2>巡检记录</h2><p>每轮巡检的执行情况、点位识别结果与采集的图片视频</p></div><div class="r"><a-button><ExportOutlined />导出</a-button></div></div>
  <div class="pp-kpis">
    <div class="pp-kpi" style="--k:#4DD0E1"><small>巡检轮次</small><b>{{ sum.n }}<em>轮</em></b><span class="bar" /></div>
    <div class="pp-kpi" style="--k:#5B9BFF"><small>巡检点位</small><b>{{ sum.pts }}<em>个</em></b><span class="bar" /></div>
    <div class="pp-kpi" style="--k:#FF6B6B"><small>异常点位</small><b>{{ sum.bad }}<em>个</em></b><span class="bar" /></div>
    <div class="pp-kpi" style="--k:#4DE8B0"><small>完成率</small><b>{{ sum.rate }}<em>%</em></b><span class="bar" /></div>
  </div>
  <div class="pp-panel">
    <div class="rc-filter">
      <span>巡检任务</span><a-select v-model:value="f.task" style="width:200px" :options="opt(TASKS.map((t) => t.name))" />
      <span>机器人</span><a-select v-model:value="f.robot" style="width:130px" :options="opt(ROBOTS.map((r) => r.id))" />
      <span>地图</span><a-select v-model:value="f.map" style="width:140px" :options="opt(MAPS.map((m) => m.name))" />
      <span>时间</span><a-range-picker style="width:260px" />
      <a-button @click="f = { task: '全部', robot: '全部', map: '全部' }">重置</a-button>
    </div>
    <a-table :data-source="rows" row-key="id" size="middle" :pagination="{ pageSize: 10, size: 'small' }"
      :columns="[{ title: '轮次', key: 'id', width: 100 }, { title: '巡检任务', dataIndex: 'task' }, { title: '类型', key: 'kind', width: 110 }, { title: '机器人', key: 'robot', width: 100 }, { title: '地图', dataIndex: 'map' }, { title: '开始时间', key: 'start', width: 120 }, { title: '耗时', dataIndex: 'dur', width: 80 }, { title: '点位（正常 / 异常）', key: 'pts', width: 200 }, { title: '状态', key: 'state', width: 90 }, { title: '操作', key: 'op', width: 90 }]">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'id'"><span class="mono">{{ record.id }}</span></template>
        <template v-else-if="column.key === 'kind'"><a-tag :color="record.kind === '循迹任务' ? 'cyan' : 'purple'">{{ record.kind }}</a-tag></template>
        <template v-else-if="column.key === 'robot'"><span class="mono">{{ record.robot }}</span></template>
        <template v-else-if="column.key === 'start'"><span class="mono">{{ record.start }}</span></template>
        <template v-else-if="column.key === 'pts'"><div class="rc-pts"><div class="bar"><i class="ok" :style="{ flex: record.ok }" /><i class="ng" :style="{ flex: record.bad || 0.0001 }" /></div><span class="mono">{{ record.ok }}</span><span class="mono" :class="{ ng: record.bad }">{{ record.bad }}</span></div></template>
        <template v-else-if="column.key === 'state'"><a-badge :status="record.state === '已完成' ? 'success' : record.state === '执行中' ? 'processing' : 'error'" :text="record.state" /></template>
        <template v-else-if="column.key === 'op'"><a @click="cur = record">查看详情</a></template>
      </template>
    </a-table>
  </div>

  <a-drawer :open="!!cur" :width="900" :title="cur ? `${cur.task} · ${cur.id}` : ''" class="dv-drawer" @close="cur = null">
    <template v-if="cur">
      <div class="rc-sum">
        <div><small>机器人</small><b class="mono">{{ cur.robot }}</b></div><div><small>开始时间</small><b class="mono">{{ cur.start }}</b></div><div><small>耗时</small><b>{{ cur.dur }}</b></div>
        <div><small>总点位</small><b class="mono">{{ cur.total }}</b></div><div><small>异常点位</small><b class="mono" :style="{ color: cur.bad ? '#FF6B6B' : undefined }">{{ cur.bad }}</b></div>
      </div>
      <div class="rc-map"><BizMap :seed="3" :route="TASKS.indexOf(task!) % 3" :hide-route="cur.kind === '发布点任务'" :points="task?.pts.length ?? 0" :progress="1" /></div>
      <h4 class="rc-h">点位识别结果</h4>
      <div class="rc-grid">
        <div v-for="p in results" :key="p.no" class="rc-cell" :class="{ bad: p.bad }">
          <div class="img"><CamShot :seed="p.seed" :ir="p.action === '红外测温'" :box="p.bad ? '异常' : ''" /><span class="no mono">#{{ p.no }}</span></div>
          <div class="b"><b>{{ p.desc }}</b><small>{{ p.action }}</small><span :class="p.bad ? 'r-bad' : 'r-ok'">{{ p.res }}</span></div>
        </div>
      </div>
      <h4 class="rc-h">媒体文件</h4>
      <ul class="rc-media">
        <li v-for="(p, i) in results.slice(0, 5)" :key="i"><PictureOutlined v-if="i % 3" /><VideoCameraOutlined v-else /><span class="mono">{{ cur.id }}_P{{ String(p.no).padStart(2, '0') }}.{{ i % 3 ? 'jpg' : 'mp4' }}</span><small class="muted">{{ i % 3 ? '1.2 MB' : '18.6 MB' }}</small><a-button type="link" size="small"><DownloadOutlined />下载</a-button></li>
      </ul>
    </template>
  </a-drawer>
</template>

<style scoped>
.rc-filter { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 14px 16px; border-bottom: 1px solid rgba(77,208,225,.1); font-size: 13px; color: var(--muted); }
.rc-filter > span:not(:first-child) { margin-left: 8px; }
.rc-pts { display: flex; align-items: center; gap: 10px; } .rc-pts .bar { flex: 1; display: flex; gap: 2px; height: 6px; } .rc-pts .bar i { display: block; border-radius: 1px; } .rc-pts .ok { background: #4DE8B0; } .rc-pts .bar .ng { background: #FF6B6B; }
.rc-pts span { width: 18px; text-align: right; font-size: 12px; } .rc-pts span.ng { color: #FF6B6B; }
.rc-sum { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.rc-sum > div { padding: 10px 12px; background: rgba(16,38,59,.6); border: 1px solid rgba(77,208,225,.12); border-radius: 3px; } .rc-sum small { display: block; font-size: 12px; color: #8FB3C7; } .rc-sum b { font-size: 16px; }
.rc-map { margin-top: 14px; aspect-ratio: 16 / 7.5; border: 1px solid rgba(77,208,225,.18); border-radius: 3px; overflow: hidden; }
.rc-h { margin: 20px 0 10px; font-size: 14px; }
.rc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.rc-cell { display: flex; flex-direction: column; background: rgba(16,38,59,.6); border: 1px solid rgba(77,208,225,.12); border-radius: 3px; overflow: hidden; }
.rc-cell.bad { border-color: rgba(255,107,107,.55); }
.rc-cell .img { position: relative; aspect-ratio: 16 / 9; } .rc-cell .no { position: absolute; left: 6px; top: 4px; font-size: 11px; color: #fff; text-shadow: 0 0 4px #000; }
.rc-cell .b { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; font-size: 12.5px; } .rc-cell .b small { color: #8FB3C7; font-size: 11.5px; }
.r-ok { color: #4DE8B0; } .r-bad { color: #FF6B6B; font-weight: 500; }
.rc-media { list-style: none; margin: 0; padding: 0; } .rc-media li { display: flex; align-items: center; gap: 10px; padding: 8px 4px; font-size: 13px; border-bottom: 1px dashed rgba(77,208,225,.12); } .rc-media li .mono { flex: 1; }
</style>
