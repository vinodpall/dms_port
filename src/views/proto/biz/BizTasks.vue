<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, EyeOutlined, SendOutlined, EditOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined, CaretRightOutlined, PauseOutlined, StopOutlined, NodeIndexOutlined, AimOutlined } from '@ant-design/icons-vue'
import BizMap from './BizMap.vue'
import { TASKS, MULTI_GROUPS, SCHEDULES, ROBOTS, MAPS, ROUTES, GAITS, OBS_MODES, ACTIONS, type BizTask, type TaskPoint } from '@/mock/biz'

const tab = ref<'task' | 'multi' | 'plan'>('task')
const actColor = (t: string) => ACTIONS.find((a) => a.t === t)?.c ?? '#8FB3C7'
const ok = (t: string) => message.success(`${t}（原型演示）`)

/* ---------- 巡检任务 ---------- */
const f = reactive({ kind: '全部', kw: '' })
const list = computed(() => TASKS.filter((t) => (f.kind === '全部' || t.kind === f.kind) && (!f.kw || t.name.includes(f.kw))))
const cur = ref<BizTask>(TASKS[0])
const sel = ref(-1)
const preview = ref(0)
const runPreview = () => { preview.value = 0; const id = setInterval(() => { preview.value += 0.02; if (preview.value >= 1) { clearInterval(id); preview.value = 0 } }, 60) }
const stateColor = (s: string) => (s === '执行中' ? 'processing' : s === '就绪' ? 'success' : 'default')
const ptCols = [
  { title: '序号', dataIndex: 'no', width: 56 }, { title: '动作', key: 'action', width: 104 }, { title: '坐标 (x, y)', key: 'xy', width: 130 }, { title: '角度', key: 'yaw', width: 64 },
  { title: '预置点', dataIndex: 'preset', width: 86 }, { title: '步态', dataIndex: 'gait', width: 90 }, { title: '避障', dataIndex: 'obs', width: 86 },
  { title: '到点不停', key: 'pass', width: 80 }, { title: '常检', key: 'always', width: 60 }, { title: '描述', dataIndex: 'desc', ellipsis: true }, { title: '操作', key: 'op', width: 96, fixed: 'right' as const },
]
const newOpen = ref(false)
const newForm = reactive({ name: '', kind: '循迹任务', map: MAPS[0].name, route: ROUTES[0].name, robot: ROBOTS[0].id })
const ptOpen = ref(false)
const ptForm = reactive<TaskPoint & { terrain: string; extra: string }>({ ...TASKS[0].pts[0], terrain: '实心地面', extra: '' })
const editPt = (p?: TaskPoint) => { Object.assign(ptForm, p ?? { no: cur.value.pts.length + 1, action: ACTIONS[0].t, x: 0, y: 0, z: 0, yaw: 0, preset: '—', gait: GAITS[0].t, obs: '停障模式', pass: false, always: false, desc: '' }, { terrain: '实心地面', extra: '' }); ptOpen.value = true }

/* ---------- 多任务组 ---------- */
const mg = ref(MULTI_GROUPS[0])
const stepOpen = ref(false)
const stepForm = reactive({ mode: '循迹模式', map: MAPS[0].name, track: ROUTES[0].name, group: TASKS[0].name, laps: 1, obs: '停障模式', gait: GAITS[0].t, terrain: '实心地面', origin: false })

/* ---------- 定时计划 ---------- */
const plans = ref(SCHEDULES.map((s) => ({ ...s })))
const planOpen = ref(false)
</script>

<template>
  <div class="pp-head">
    <div><h2>任务管理</h2><p>编排巡检任务（循迹 / 发布点）、多任务组串联执行与定时计划</p></div>
    <div class="r">
      <a-button v-if="tab === 'task'" type="primary" @click="newOpen = true"><PlusOutlined />新建任务</a-button>
      <a-button v-else-if="tab === 'multi'" type="primary"><PlusOutlined />新建多任务组</a-button>
      <a-button v-else type="primary" @click="planOpen = true"><PlusOutlined />新建定时计划</a-button>
    </div>
  </div>
  <a-segmented v-model:value="tab" class="tk-seg" :options="[{ value: 'task', label: '巡检任务' }, { value: 'multi', label: '多任务组' }, { value: 'plan', label: '定时计划' }]" />

  <!-- 巡检任务 -->
  <div v-if="tab === 'task'" class="tk">
    <div class="pp-panel tk-list">
      <div class="tk-filter">
        <a-input v-model:value="f.kw" allow-clear placeholder="搜索任务名称"><template #prefix><SearchOutlined class="muted" /></template></a-input>
        <div class="tk-chips"><button v-for="k in ['全部', '循迹任务', '发布点任务']" :key="k" type="button" :class="{ on: f.kind === k }" @click="f.kind = k">{{ k }}</button></div>
      </div>
      <button v-for="t in list" :key="t.id" type="button" class="tk-item" :class="{ on: cur.id === t.id }" @click="cur = t; sel = -1">
        <span class="ic" :class="t.kind === '循迹任务' ? 'trk' : 'pub'"><NodeIndexOutlined v-if="t.kind === '循迹任务'" /><AimOutlined v-else /></span>
        <span class="b"><span class="t"><b>{{ t.name }}</b><a-badge :status="stateColor(t.state)" :text="t.state" /></span><small>{{ t.kind }} · {{ t.map }} · {{ t.pts.length }} 个任务点</small></span>
      </button>
    </div>
    <div class="tk-detail">
      <div class="pp-panel tk-hd">
        <div class="top">
          <div><span class="mono muted">{{ cur.id }}</span><h3>{{ cur.name }}</h3></div>
          <a-tag :color="cur.kind === '循迹任务' ? 'cyan' : 'purple'">{{ cur.kind }}</a-tag><a-badge :status="stateColor(cur.state)" :text="cur.state" />
          <a-space class="r"><a-button @click="runPreview"><EyeOutlined />运行预览</a-button><a-button><EditOutlined />编辑</a-button><a-button type="primary" @click="ok('任务已下发至 ' + cur.robot)"><SendOutlined />下发执行</a-button></a-space>
        </div>
        <div class="meta">
          <span>地图<b>{{ cur.map }}</b></span><span v-if="cur.route">循迹路线<b>{{ cur.route }}</b></span><span>执行机器人<b class="mono">{{ cur.robot }}</b></span>
          <span>任务点<b class="mono">{{ cur.pts.length }}</b></span><span>累计执行<b class="mono">{{ cur.runs }} 次</b></span><span>最近执行<b class="mono">{{ cur.lastRun }}</b></span>
        </div>
      </div>
      <div class="tk-row">
        <div class="pp-panel tk-map">
          <div class="pp-panel-h"><h3>任务点分布</h3><span class="muted" style="font-size:12px">点击表格行定位任务点</span></div>
          <div class="b"><BizMap :key="cur.id" :seed="cur.id.charCodeAt(4)" :route="TASKS.indexOf(cur) % 3" :hide-route="cur.kind === '发布点任务'" :points="cur.pts.length" :sel-point="sel" :progress="preview" /></div>
        </div>
        <div class="pp-panel tk-sum">
          <div class="pp-panel-h"><h3>动作统计</h3></div>
          <ul><li v-for="a in ACTIONS.filter((x) => cur.pts.some((p) => p.action === x.t))" :key="a.t"><i :style="{ background: a.c }" />{{ a.t }}<b class="mono">{{ cur.pts.filter((p) => p.action === a.t).length }}</b></li></ul>
          <div class="pp-panel-h" style="border-top:1px solid rgba(77,208,225,.1)"><h3>执行参数</h3></div>
          <div class="kv"><span>默认避障</span><b>停障模式</b><span>默认步态</span><b>行走步态</b><span>任务速度</span><b class="mono">0.8 m/s</b><span>异常处理</span><b>告警并继续</b><span>结束动作</span><b>回桩充电</b></div>
        </div>
      </div>
      <div class="pp-panel">
        <div class="pp-panel-h"><h3>任务点</h3><span class="muted" style="font-size:12px">{{ cur.pts.length }} 个</span><a-button size="small" class="r" @click="editPt()"><PlusOutlined />添加任务点</a-button></div>
        <a-table :data-source="cur.pts" row-key="no" size="small" :pagination="false" :columns="ptCols" :scroll="{ x: 1100, y: 300 }" :custom-row="(r: TaskPoint) => ({ onClick: () => (sel = r.no - 1), class: sel === r.no - 1 ? 'tk-sel' : '' })">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'action'"><span class="tk-act" :style="{ '--c': actColor(record.action) }">{{ record.action }}</span></template>
            <template v-else-if="column.key === 'xy'"><span class="mono">{{ record.x.toFixed(2) }}, {{ record.y.toFixed(2) }}</span></template>
            <template v-else-if="column.key === 'yaw'"><span class="mono">{{ record.yaw }}°</span></template>
            <template v-else-if="column.key === 'pass'">{{ record.pass ? '是' : '否' }}</template>
            <template v-else-if="column.key === 'always'"><a-badge :status="record.always ? 'success' : 'default'" :text="record.always ? '是' : '否'" /></template>
            <template v-else-if="column.key === 'op'"><a-space><a @click.stop="editPt(record)">编辑</a><a class="danger" @click.stop>删除</a></a-space></template>
          </template>
        </a-table>
      </div>
    </div>
  </div>

  <!-- 多任务组 -->
  <div v-else-if="tab === 'multi'" class="tk">
    <div class="pp-panel tk-list">
      <div class="pp-panel-h"><h3>多任务组</h3><span class="muted" style="font-size:12px">{{ MULTI_GROUPS.length }} 个</span></div>
      <button v-for="g in MULTI_GROUPS" :key="g.id" type="button" class="tk-item" :class="{ on: mg.id === g.id }" @click="mg = g">
        <span class="ic pub"><NodeIndexOutlined /></span>
        <span class="b"><span class="t"><b>{{ g.name }}</b></span><small>{{ g.steps.length }} 个子任务 · {{ g.robot }}</small></span>
      </button>
    </div>
    <div class="tk-detail">
      <div class="pp-panel tk-hd">
        <div class="top">
          <div><span class="mono muted">{{ mg.id }}</span><h3>{{ mg.name }}</h3></div>
          <span class="sw">异常时原地启动 <a-switch v-model:checked="mg.inPlace" size="small" /></span>
          <a-space class="r">
            <a-button type="primary" @click="ok('多任务组已开始')"><CaretRightOutlined />开始</a-button><a-button><PauseOutlined />暂停</a-button><a-button>恢复</a-button><a-button danger><StopOutlined />关闭</a-button>
          </a-space>
        </div>
        <div class="tk-flow">
          <template v-for="(s, i) in mg.steps" :key="i">
            <div class="node"><i>{{ i + 1 }}</i><div><b>{{ s.group }}</b><small>{{ s.map }} · {{ s.mode }} · {{ s.laps }} 圈</small></div></div>
            <span v-if="i < mg.steps.length - 1" class="arrow" />
          </template>
        </div>
      </div>
      <div class="pp-panel">
        <div class="pp-panel-h"><h3>子任务编排</h3><span class="muted" style="font-size:12px">按顺序依次执行</span><a-button size="small" class="r" @click="stepOpen = true"><PlusOutlined />添加任务组</a-button></div>
        <a-table :data-source="mg.steps" :row-key="(_: unknown, i: number) => i" size="middle" :pagination="false"
          :columns="[{ title: '序号', key: 'i', width: 60 }, { title: '地图', dataIndex: 'map' }, { title: '轨迹', dataIndex: 'track' }, { title: '任务组', dataIndex: 'group' }, { title: '模式', key: 'mode' }, { title: '圈数', dataIndex: 'laps', width: 70 }, { title: '避障模式', dataIndex: 'obs' }, { title: '原点发布', key: 'origin', width: 90 }, { title: '操作', key: 'op', width: 170 }]">
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'i'"><span class="mono">{{ index + 1 }}</span></template>
            <template v-else-if="column.key === 'mode'"><a-tag :color="record.mode === '循迹模式' ? 'cyan' : 'purple'">{{ record.mode }}</a-tag></template>
            <template v-else-if="column.key === 'origin'">{{ record.origin ? '是' : '否' }}</template>
            <template v-else-if="column.key === 'op'"><a-space :size="4"><a-tooltip title="上移"><a-button type="text" size="small" :disabled="index === 0"><ArrowUpOutlined /></a-button></a-tooltip><a-tooltip title="下移"><a-button type="text" size="small" :disabled="index === mg.steps.length - 1"><ArrowDownOutlined /></a-button></a-tooltip><a-button type="text" size="small" @click="stepOpen = true"><EditOutlined /></a-button><a-button type="text" size="small" danger><DeleteOutlined /></a-button></a-space></template>
          </template>
        </a-table>
      </div>
    </div>
  </div>

  <!-- 定时计划 -->
  <div v-else class="pp-panel">
    <a-table :data-source="plans" row-key="id" size="middle" :pagination="false"
      :columns="[{ title: '计划名称', dataIndex: 'name' }, { title: '巡检任务', dataIndex: 'task' }, { title: '执行机器人', key: 'robot' }, { title: '执行周期', key: 'cycle' }, { title: '执行时间', key: 'time' }, { title: '下次执行', key: 'next' }, { title: '启用', key: 'on', width: 80 }, { title: '操作', key: 'op', width: 120 }]">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'robot'"><span class="mono">{{ record.robot }}</span></template>
        <template v-else-if="column.key === 'cycle'"><a-tag>{{ record.cycle }}</a-tag></template>
        <template v-else-if="column.key === 'time'"><span class="mono">{{ record.time }}</span></template>
        <template v-else-if="column.key === 'next'"><span class="mono" :class="{ muted: !record.on }">{{ record.on ? record.next : '—' }}</span></template>
        <template v-else-if="column.key === 'on'"><a-switch v-model:checked="record.on" size="small" /></template>
        <template v-else-if="column.key === 'op'"><a-space><a>编辑</a><a class="danger">删除</a></a-space></template>
      </template>
    </a-table>
  </div>

  <!-- 弹窗 -->
  <a-modal v-model:open="newOpen" title="新建巡检任务" ok-text="创建" :width="560" @ok="newOpen = false; ok('任务已创建')">
    <a-form layout="vertical" style="margin-top:12px">
      <a-form-item label="任务名称" required><a-input v-model:value="newForm.name" placeholder="如：二层机房日常巡检" /></a-form-item>
      <a-form-item label="任务类型"><a-radio-group v-model:value="newForm.kind" button-style="solid"><a-radio-button value="循迹任务">循迹任务</a-radio-button><a-radio-button value="发布点任务">发布点任务</a-radio-button></a-radio-group></a-form-item>
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="地图"><a-select v-model:value="newForm.map" :options="MAPS.map((m) => ({ value: m.name, label: m.name }))" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item v-if="newForm.kind === '循迹任务'" label="循迹路线"><a-select v-model:value="newForm.route" :options="ROUTES.filter((r) => r.map === newForm.map).map((r) => ({ value: r.name, label: r.name }))" /></a-form-item></a-col>
      </a-row>
      <a-form-item label="执行机器人"><a-select v-model:value="newForm.robot" :options="ROBOTS.map((r) => ({ value: r.id, label: `${r.name}（${r.id}）` }))" /></a-form-item>
    </a-form>
  </a-modal>

  <a-modal v-model:open="ptOpen" title="任务点设置" ok-text="保存" :width="680" @ok="ptOpen = false; ok('任务点已保存')">
    <a-form layout="vertical" style="margin-top:12px">
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="动作类型"><a-select v-model:value="ptForm.action" :options="ACTIONS.map((a) => ({ value: a.t, label: a.t }))" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="预置点"><a-select v-model:value="ptForm.preset" :options="['—', ...Array.from({ length: 8 }, (_, i) => `预置点 ${i + 1}`)].map((v) => ({ value: v, label: v }))" /></a-form-item></a-col>
        <a-col :span="6"><a-form-item label="X"><a-input-number v-model:value="ptForm.x" style="width:100%" /></a-form-item></a-col>
        <a-col :span="6"><a-form-item label="Y"><a-input-number v-model:value="ptForm.y" style="width:100%" /></a-form-item></a-col>
        <a-col :span="6"><a-form-item label="Z"><a-input-number v-model:value="ptForm.z" style="width:100%" /></a-form-item></a-col>
        <a-col :span="6"><a-form-item label="角度"><a-input-number v-model:value="ptForm.yaw" style="width:100%" addon-after="°" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="步态切换"><a-select v-model:value="ptForm.gait" :options="GAITS.map((g) => ({ value: g.t, label: g.t }))" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="地形图设置"><a-select v-model:value="ptForm.terrain" :options="['实心地面', '镂空地面', '无踢面地面'].map((v) => ({ value: v, label: v }))" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="避障模式"><a-select v-model:value="ptForm.obs" :options="OBS_MODES.map((v) => ({ value: v, label: v }))" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="到点不停"><a-switch v-model:checked="ptForm.pass" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="常检"><a-switch v-model:checked="ptForm.always" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="额外事务"><a-input v-model:value="ptForm.extra" placeholder="未配置"><template #suffix><a>配置</a></template></a-input></a-form-item></a-col>
      </a-row>
      <a-form-item label="描述"><a-input v-model:value="ptForm.desc" placeholder="如：配电柜 1# 柜门" /></a-form-item>
      <a-button size="small"><AimOutlined />使用机器人当前位姿</a-button>
    </a-form>
  </a-modal>

  <a-modal v-model:open="stepOpen" title="编辑任务组" ok-text="保存" :width="600" @ok="stepOpen = false; ok('已保存')">
    <a-form layout="vertical" style="margin-top:12px">
      <a-form-item label="任务组模式"><a-radio-group v-model:value="stepForm.mode" button-style="solid"><a-radio-button value="循迹模式">循迹模式</a-radio-button><a-radio-button value="发布点模式">发布点模式</a-radio-button></a-radio-group></a-form-item>
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="地图"><a-select v-model:value="stepForm.map" :options="MAPS.map((m) => ({ value: m.name, label: m.name }))" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="轨迹" :extra="stepForm.mode === '发布点模式' ? '发布点模式无需轨迹' : ''"><a-select v-model:value="stepForm.track" :disabled="stepForm.mode === '发布点模式'" :options="ROUTES.map((r) => ({ value: r.name, label: r.name }))" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="任务组"><a-select v-model:value="stepForm.group" :options="TASKS.map((t) => ({ value: t.name, label: t.name }))" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="圈数"><a-input-number v-model:value="stepForm.laps" :min="1" style="width:100%" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="避障模式"><a-select v-model:value="stepForm.obs" :options="OBS_MODES.map((v) => ({ value: v, label: v }))" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="步态切换"><a-select v-model:value="stepForm.gait" :options="GAITS.map((g) => ({ value: g.t, label: g.t }))" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="地形图设置"><a-select v-model:value="stepForm.terrain" :options="['实心地面', '镂空地面', '无踢面地面'].map((v) => ({ value: v, label: v }))" /></a-form-item></a-col>
      </a-row>
      <a-form-item label="原点发布"><a-switch v-model:checked="stepForm.origin" /></a-form-item>
    </a-form>
  </a-modal>

  <a-modal v-model:open="planOpen" title="新建定时计划" ok-text="创建" :width="520" @ok="planOpen = false; ok('定时计划已创建')">
    <a-form layout="vertical" style="margin-top:12px">
      <a-form-item label="计划名称" required><a-input placeholder="如：配电室晚巡" /></a-form-item>
      <a-form-item label="巡检任务"><a-select :options="TASKS.filter((t) => t.kind === '循迹任务').map((t) => ({ value: t.id, label: t.name }))" placeholder="选择循迹任务" /></a-form-item>
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="执行周期"><a-select :options="['仅一次', '每天', '工作日', '每周'].map((v) => ({ value: v, label: v }))" value="每天" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="开始时间"><a-time-picker format="HH:mm" style="width:100%" /></a-form-item></a-col>
      </a-row>
      <a-form-item label="生效日期"><a-range-picker style="width:100%" /></a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped>
.tk-seg { margin-bottom: 16px; }
.tk { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 16px; align-items: start; }
.tk .r { margin-left: auto; }
.tk-list { position: sticky; top: 0; padding-bottom: 8px; }
.tk-filter { padding: 12px 12px 4px; }
.tk-chips { display: flex; gap: 6px; margin: 10px 0 4px; }
.tk-chips button { padding: 2px 10px; font: inherit; font-size: 12px; color: var(--muted); cursor: pointer; background: rgba(77,208,225,.05); border: 1px solid var(--line); border-radius: 2px; }
.tk-chips button.on { color: #fff; border-color: var(--accent); background: var(--accent-soft); }
.tk-item { width: calc(100% - 16px); margin: 4px 8px 0; display: flex; gap: 10px; align-items: center; padding: 10px; font: inherit; color: var(--text); text-align: left; cursor: pointer; background: transparent; border: 1px solid transparent; border-radius: 4px; }
.tk-item:hover { background: rgba(77,208,225,.05); } .tk-item.on { background: var(--accent-soft); border-color: rgba(38,198,218,.5); }
.tk-item .ic { width: 34px; height: 34px; flex: none; display: grid; place-items: center; font-size: 16px; border-radius: 4px; }
.tk-item .ic.trk { color: #4DD0E1; background: rgba(77,208,225,.12); } .tk-item .ic.pub { color: #B48CFF; background: rgba(180,140,255,.12); }
.tk-item .b { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.tk-item .t { display: flex; align-items: center; gap: 6px; } .tk-item .t b { flex: 1; font-size: 13.5px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tk-item .t :deep(.ant-badge-status-text) { font-size: 12px; color: var(--muted); } .tk-item small { font-size: 12px; color: var(--muted); }
.tk-detail { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.tk-hd { padding: 16px 20px; }
.tk-hd .top { display: flex; align-items: center; gap: 12px; } .tk-hd h3 { margin: 2px 0 0; font-size: 20px; color: #fff; } .tk-hd .mono { font-size: 12px; }
.tk-hd .sw { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted); }
.tk-hd .meta { display: flex; flex-wrap: wrap; gap: 8px 28px; margin-top: 12px; font-size: 13px; color: var(--muted); } .tk-hd .meta b { margin-left: 8px; color: var(--text); font-weight: 500; }
.tk-row { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 16px; }
.tk-map { display: flex; flex-direction: column; } .tk-map .b { position: relative; margin: 12px; aspect-ratio: 16 / 10; border: 1px solid rgba(77,208,225,.18); border-radius: 3px; overflow: hidden; }
.tk-sum ul { list-style: none; margin: 0; padding: 8px 16px; } .tk-sum li { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 13px; border-bottom: 1px dashed var(--line); } .tk-sum li i { width: 8px; height: 8px; border-radius: 2px; } .tk-sum li b { margin-left: auto; }
.tk-sum .kv { display: grid; grid-template-columns: auto 1fr; gap: 8px 12px; padding: 12px 16px 16px; font-size: 13px; } .tk-sum .kv span { color: var(--muted); } .tk-sum .kv b { text-align: right; font-weight: 500; }
.tk-act { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; } .tk-act::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--c); }
:deep(.tk-sel td) { background: rgba(255,183,77,.08) !important; }
.danger { color: #FF6B6B; }
.tk-flow { display: flex; align-items: center; gap: 0; margin-top: 16px; overflow-x: auto; padding-bottom: 2px; }
.tk-flow .node { display: flex; align-items: center; gap: 10px; padding: 10px 14px; min-width: 200px; background: rgba(77,208,225,.06); border: 1px solid rgba(77,208,225,.2); border-radius: 4px; }
.tk-flow .node i { width: 24px; height: 24px; flex: none; display: grid; place-items: center; font: 600 12px var(--mono); font-style: normal; color: #04121D; background: var(--cyan); border-radius: 50%; }
.tk-flow .node b { display: block; font-size: 13px; font-weight: 500; } .tk-flow .node small { font-size: 12px; color: var(--muted); }
.tk-flow .arrow { width: 40px; height: 1px; flex: none; position: relative; background: var(--cyan); opacity: .6; } .tk-flow .arrow::after { content: ''; position: absolute; right: -1px; top: -4px; border: 4px solid transparent; border-left: 6px solid var(--cyan); }
</style>
