<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { ExportOutlined, PlusOutlined, EnvironmentOutlined } from '@ant-design/icons-vue'
import CamShot from './CamShot.vue'
import BizMap from './BizMap.vue'
import { ALARM_TYPES, ROBOTS, PROMPTS, SENSORS, alarmColor as color, type BizAlarm } from '@/mock/biz'
import { db, curId, robot } from './store'

const tab = ref<'list' | 'rule'>('list')
const f = reactive({ state: '全部', type: '全部', scope: 'cur', src: '全部' })
const scoped = computed(() => db.alarms.filter((a) => f.scope === 'all' || a.robot === curId.value))
const rows = computed(() => scoped.value.filter((a) => (f.state === '全部' || a.state === f.state) && (f.type === '全部' || a.type === f.type) && (f.src === '全部' || a.src === f.src)))
const cnt = (s: string) => scoped.value.filter((a) => a.state === s).length
const cur = ref<BizAlarm | null>(null); const mode = ref<'view' | 'img'>('view')
const hd = reactive({ res: '非误报' as '误报' | '非误报', desc: '' })
const handle = () => { const a = cur.value!; if (!hd.desc.trim()) return message.error('请输入处理描述'); Object.assign(a, { state: hd.res, who: '周工', note: hd.desc, handled: new Date().toISOString().slice(0, 16).replace('T', ' ') }); cur.value = null; message.success('告警已处理') }
const open = (a: BizAlarm, m: 'view' | 'img' = 'view') => { cur.value = a; mode.value = m; hd.res = '非误报'; hd.desc = '' }
const rname = (id: string) => ROBOTS.find((r) => r.id === id)?.name ?? id
const cols = computed(() => [
  { title: '报警时间', key: 'time', width: 165 }, ...(f.scope === 'all' ? [{ title: '机器人', key: 'robot', width: 100 }] : []),
  { title: '警情类型', key: 'type', width: 110 }, { title: '内容', dataIndex: 'content', ellipsis: true }, { title: '来源', dataIndex: 'src', width: 76 },
  { title: '置信度', key: 'conf', width: 76 }, { title: '所属任务', dataIndex: 'task', ellipsis: true, width: 220 }, { title: '位置', key: 'coord', width: 130 },
  { title: '状态', key: 'state', width: 90 }, { title: '操作', key: 'op', width: 150 },
])

/* 识别配置 */
const prompts = ref(PROMPTS.map((p) => ({ ...p })))
const pSel = ref(0)
const sensors = ref(SENSORS.map((s) => ({ ...s })))
const fall = reactive({ on: true, roll: 45, pitch: 45 })
</script>

<template>
  <div class="pp-head">
    <div><h2>告警中心</h2><p>AI 视觉识别、传感器与本体异常告警的查看与处置，并配置识别规则</p></div>
    <div class="r"><a-button v-if="tab === 'list'"><ExportOutlined />导出</a-button></div>
  </div>
  <a-segmented v-model:value="tab" class="al-seg" :options="[{ value: 'list', label: '告警列表' }, { value: 'rule', label: '识别配置' }]" />

  <template v-if="tab === 'list'">
    <div class="pp-kpis">
      <div class="pp-kpi" style="--k:#FF6B6B"><small>待处理</small><b>{{ cnt('待处理') }}<em>条</em></b><span class="bar" /></div>
      <div class="pp-kpi" style="--k:#4DE8B0"><small>非误报</small><b>{{ cnt('非误报') }}<em>条</em></b><span class="bar" /></div>
      <div class="pp-kpi" style="--k:#5B7486"><small>误报</small><b>{{ cnt('误报') }}<em>条</em></b><span class="bar" /></div>
      <div class="pp-kpi" style="--k:#FFB74D"><small>误报率</small><b>{{ scoped.length ? Math.round((cnt('误报') / scoped.length) * 100) : 0 }}<em>%</em></b><span class="bar" /></div>
    </div>
    <div class="pp-panel">
      <div class="al-filter">
        <a-radio-group v-model:value="f.scope" size="small" button-style="solid"><a-radio-button value="cur">{{ robot.id }}</a-radio-button><a-radio-button value="all">全部机器人</a-radio-button></a-radio-group>
        <div class="chips"><button v-for="s in ['全部', '待处理', '非误报', '误报']" :key="s" type="button" :class="{ on: f.state === s }" @click="f.state = s">{{ s }}<em v-if="s !== '全部'">{{ cnt(s) }}</em></button></div>
        <span>警情类型</span><a-select v-model:value="f.type" style="width:130px" :options="['全部', ...ALARM_TYPES.map((t) => t.t)].map((v) => ({ value: v, label: v }))" />
        <span>来源</span><a-select v-model:value="f.src" style="width:100px" :options="['全部', '可见光', '红外', '传感器', '本体'].map((v) => ({ value: v, label: v }))" />
        <a-range-picker style="width:250px" />
      </div>
      <a-table :data-source="rows" row-key="id" size="middle" :columns="cols" :pagination="{ pageSize: 10, size: 'small' }" :row-class-name="(r: any) => (r.state === '待处理' ? 'al-pend' : '')">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'time'"><span class="mono">{{ record.time }}</span></template>
          <template v-else-if="column.key === 'robot'"><span class="mono">{{ record.robot }}</span></template>
          <template v-else-if="column.key === 'type'"><span class="al-type"><i :style="{ background: color(record.type) }" />{{ record.type }}</span></template>
          <template v-else-if="column.key === 'conf'"><span class="mono">{{ record.conf }}</span></template>
          <template v-else-if="column.key === 'coord'"><span class="mono" style="font-size:12px">{{ record.lnglat ?? record.coord }}</span></template>
          <template v-else-if="column.key === 'state'"><a-badge :status="record.state === '待处理' ? 'error' : record.state === '误报' ? 'default' : 'success'" :text="record.state" /></template>
          <template v-else-if="column.key === 'op'"><span class="bz-ops"><a @click="open(record, 'img')">图片</a><a v-if="record.state === '待处理'" @click="open(record)">处理</a><a v-else @click="open(record)">详情</a></span></template>
        </template>
      </a-table>
    </div>
  </template>

  <div v-else class="al-rule">
    <div class="pp-panel al-prompt">
      <div class="pp-panel-h"><h3>AI 识别提示词</h3><span class="muted" style="font-size:12px">下发至机器人视觉算法，按相机通道生效</span><a-button size="small" class="r"><PlusOutlined />新增</a-button></div>
      <div class="al-pl">
        <ul>
          <li v-for="(p, i) in prompts" :key="p.name" :class="{ on: pSel === i }" @click="pSel = i"><b>{{ p.name }}</b><a-tag :color="p.cam === '红外' ? 'orange' : 'cyan'">{{ p.cam }}</a-tag><a-switch v-model:checked="p.on" size="small" @click.stop /></li>
        </ul>
        <a-form layout="vertical" class="al-pf">
          <a-row :gutter="16">
            <a-col :span="14"><a-form-item label="提示词名称"><a-input v-model:value="prompts[pSel].name" /></a-form-item></a-col>
            <a-col :span="10"><a-form-item label="适用相机"><a-radio-group v-model:value="prompts[pSel].cam" button-style="solid"><a-radio-button value="可见光">可见光</a-radio-button><a-radio-button value="红外">红外</a-radio-button></a-radio-group></a-form-item></a-col>
          </a-row>
          <a-form-item label="提示词内容"><a-textarea v-model:value="prompts[pSel].text" :rows="5" /></a-form-item>
          <a-space><a-button type="primary" @click="message.success('已保存并下发')">保存并下发</a-button><a-button danger>删除</a-button></a-space>
        </a-form>
      </div>
    </div>
    <div class="al-side">
      <div class="pp-panel">
        <div class="pp-panel-h"><h3>传感器告警阈值</h3><a-button size="small" class="r"><PlusOutlined />添加传感器</a-button></div>
        <a-table :data-source="sensors" row-key="en" size="small" :pagination="false" :columns="[{ title: '传感器', key: 'n' }, { title: '下限', key: 'lo', width: 96 }, { title: '上限', key: 'hi', width: 96 }, { title: '启用', key: 'on', width: 60 }]">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'n'"><b style="font-weight:500">{{ record.cn }}</b> <span class="mono muted" style="font-size:11px">{{ record.en }} · {{ record.unit }}</span></template>
            <template v-else-if="column.key === 'lo'"><a-input-number v-model:value="record.lo" size="small" placeholder="无" style="width:80px" /></template>
            <template v-else-if="column.key === 'hi'"><a-input-number v-model:value="record.hi" size="small" placeholder="无" style="width:80px" /></template>
            <template v-else-if="column.key === 'on'"><a-switch v-model:checked="record.on" size="small" /></template>
          </template>
        </a-table>
      </div>
      <div class="pp-panel">
        <div class="pp-panel-h"><h3>本体安全告警</h3></div>
        <div class="al-fall">
          <span>机器狗摔倒检测</span><a-switch v-model:checked="fall.on" size="small" />
          <span>横滚角阈值</span><a-input-number v-model:value="fall.roll" size="small" addon-after="°" style="width:110px" />
          <span>俯仰角阈值</span><a-input-number v-model:value="fall.pitch" size="small" addon-after="°" style="width:110px" />
          <span>低电量告警</span><a-input-number :value="20" size="small" addon-after="%" style="width:110px" />
        </div>
      </div>
    </div>
  </div>

  <a-drawer :open="!!cur" :width="640" :title="cur ? `告警详情 · ${cur.id}` : ''" class="dv-drawer" @close="cur = null">
    <template v-if="cur">
      <div class="al-big"><CamShot :seed="cur.seed" :ir="cur.src === '红外'" :box="cur.type" :box-color="color(cur.type)" hud /></div>
      <a-descriptions :column="2" size="small" bordered style="margin-top:14px">
        <a-descriptions-item label="警情类型"><span :style="{ color: color(cur.type) }">{{ cur.type }}</span></a-descriptions-item>
        <a-descriptions-item label="来源">{{ cur.src }} · 置信度 {{ cur.conf }}</a-descriptions-item>
        <a-descriptions-item label="内容详情" :span="2">{{ cur.content }}</a-descriptions-item>
        <a-descriptions-item label="机器人">{{ cur.robot }} · {{ rname(cur.robot) }}</a-descriptions-item>
        <a-descriptions-item label="报警时间">{{ cur.time }}</a-descriptions-item>
        <a-descriptions-item label="所属任务">{{ cur.task }}</a-descriptions-item>
        <a-descriptions-item label="位置"><EnvironmentOutlined /> {{ cur.lnglat ?? cur.coord }}</a-descriptions-item>
      </a-descriptions>
      <div class="al-loc"><BizMap :seed="11" :mode="cur.lnglat ? 'sat' : 'grid'" :zones="false" :robot="{ x: 40 + (cur.seed % 7) * 12, y: 30 + (cur.seed % 3) * 20, yaw: 0 }" /></div>
      <template v-if="cur.state === '待处理' && mode === 'view'">
        <h4 style="margin:18px 0 10px">处理告警</h4>
        <a-form layout="vertical">
          <a-form-item label="处理方式"><a-radio-group v-model:value="hd.res" button-style="solid"><a-radio-button value="非误报">非误报</a-radio-button><a-radio-button value="误报">误报</a-radio-button></a-radio-group></a-form-item>
          <a-form-item label="处理描述"><a-textarea v-model:value="hd.desc" :rows="3" placeholder="请输入处理描述" /></a-form-item>
          <a-button type="primary" @click="handle">提交</a-button>
        </a-form>
      </template>
      <a-descriptions v-else-if="cur.state !== '待处理'" :column="2" size="small" bordered title="处理详情" style="margin-top:18px">
        <a-descriptions-item label="处理结果">{{ cur.state }}</a-descriptions-item>
        <a-descriptions-item label="处理人">{{ cur.who }} · {{ cur.handled }}</a-descriptions-item>
        <a-descriptions-item label="处理内容" :span="2">{{ cur.note }}</a-descriptions-item>
      </a-descriptions>
    </template>
  </a-drawer>
</template>

<style scoped>
.al-seg { margin-bottom: 16px; }
.al-filter { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 14px 16px; border-bottom: 1px solid rgba(77,208,225,.1); font-size: 13px; color: var(--muted); }
.al-filter .chips { display: flex; gap: 6px; margin-right: 12px; }
.al-filter .chips button { padding: 3px 12px; font: inherit; font-size: 12.5px; color: var(--muted); cursor: pointer; background: rgba(77,208,225,.05); border: 1px solid var(--line); border-radius: 2px; }
.al-filter .chips button.on { color: #fff; border-color: var(--accent); background: var(--accent-soft); } .al-filter .chips em { margin-left: 6px; font-style: normal; font-family: var(--mono); color: var(--faint); }
.al-type { display: inline-flex; align-items: center; gap: 6px; } .al-type i { width: 7px; height: 7px; border-radius: 50%; }
:deep(.al-pend) td:first-child { box-shadow: inset 2px 0 0 #FF6B6B; }
.al-rule { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 16px; align-items: start; }
.al-rule .r { margin-left: auto; }
.al-pl { display: grid; grid-template-columns: 240px 1fr; min-height: 420px; }
.al-pl ul { list-style: none; margin: 0; padding: 8px; border-right: 1px solid rgba(77,208,225,.1); }
.al-pl li { display: flex; align-items: center; gap: 8px; padding: 10px; cursor: pointer; border: 1px solid transparent; border-radius: 3px; font-size: 13px; } .al-pl li b { flex: 1; font-weight: 500; } .al-pl li :deep(.ant-tag) { margin: 0; }
.al-pl li:hover { background: rgba(77,208,225,.05); } .al-pl li.on { background: var(--accent-soft); border-color: rgba(38,198,218,.5); }
.al-pf { padding: 16px 20px; }
.al-side { display: flex; flex-direction: column; gap: 16px; }
.al-fall { display: grid; grid-template-columns: 1fr auto; gap: 12px 16px; align-items: center; padding: 14px 16px 16px; font-size: 13px; color: var(--muted); }
.al-big { aspect-ratio: 16 / 9; border: 1px solid rgba(77,208,225,.2); border-radius: 3px; overflow: hidden; }
.al-loc { margin-top: 14px; aspect-ratio: 16 / 6; border: 1px solid rgba(77,208,225,.18); border-radius: 3px; overflow: hidden; }
</style>
