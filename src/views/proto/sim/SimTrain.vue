<script setup lang="ts">
/** 训练任务：选择场景 / 行走任务 / 机器人 / 强化学习框架 + 超参数，后台拼接 Isaac Lab train.py 命令拉起训练 */
import { computed, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, MoreOutlined } from '@ant-design/icons-vue'
import { useFitRows } from '@/components/proto/fitRows'
import { FRAMEWORKS, SCENES, WALKS, cmdOf, fwOf, sceneOf, sim, taskId, type Train } from './data'

const emit = defineEmits<{ view: [string]; monitor: [string] }>()
const host = ref<HTMLElement>()
const { size: pageSize } = useFitRows(host, 60)
const kw = ref(''); const fw = ref<string>(); const st = ref<string>()
const ST: Record<string, { b: 'processing' | 'success' | 'default' | 'warning'; t: string }> = { running: { b: 'processing', t: '训练中' }, done: { b: 'success', t: '已完成' }, queued: { b: 'default', t: '排队中' }, stopped: { b: 'warning', t: '已停止' } }
const rows = computed(() => sim.trains.filter((t) => (!fw.value || t.fw === fw.value) && (!st.value || t.status === st.value) && (!kw.value || t.name.includes(kw.value))))
const columns = [{ title: '任务', key: 'name', width: '22%' }, { title: '场景 / 行走任务', key: 'scene', width: '17%' }, { title: '机器人', dataIndex: 'robot', width: '10%' }, { title: '框架', key: 'fw', width: '12%' }, { title: '并行环境', key: 'envs', width: '8%' }, { title: '迭代进度', key: 'it', width: '13%' }, { title: '状态', key: 'st', width: '8%' }, { title: '操作', key: 'op', align: 'right' as const }]
const stat = computed(() => ({ run: sim.trains.filter((t) => t.status === 'running').length, done: sim.trains.filter((t) => t.status === 'done').length, q: sim.trains.filter((t) => t.status === 'queued').length }))

const open = ref(false)
const ROBOTS = computed(() => sim.assets.filter((a) => a.status === 'ok').map((a) => ({ value: a.name, label: `${a.name} · ${a.kind}` })))
const f = reactive({ name: '', scene: 'terrain', walk: 'Rough', robot: 'Unitree Go2', fw: 'rsl_rl', envs: 2048, total: 1500, lr: 0.001, headless: true, seed: 42 })
const add = () => { Object.assign(f, { name: '', scene: 'terrain', walk: 'Rough', robot: 'Unitree Go2', fw: 'rsl_rl', envs: 2048, total: 1500, lr: 0.001 }); open.value = true }
const submit = () => {
  const name = f.name || `${f.robot.split(' ').pop()!.toLowerCase()}_${f.walk.toLowerCase()}_${f.fw}`
  sim.trains.unshift({ id: `t-${Date.now().toString(36)}`, name, scene: f.scene, walk: f.walk, robot: f.robot, fw: f.fw, envs: f.envs, it: 0, total: f.total, lr: f.lr, reward: 0, status: 'running', gpu: 'RTX 6000 Ada #0', start: '刚刚' })
  message.success('训练已启动'); open.value = false
}
const stop = (t: Train) => Modal.confirm({ title: `停止训练「${t.name}」？`, content: '已保存的 checkpoint 不受影响', okText: '停止', okType: 'danger', cancelText: '取消', onOk: () => { t.status = 'stopped'; message.success('已停止') } })
const del = (t: Train) => Modal.confirm({ title: `删除训练任务「${t.name}」？`, okText: '删除', okType: 'danger', cancelText: '取消', onOk: () => { sim.trains.splice(sim.trains.indexOf(t), 1); message.success('已删除') } })
</script>
<template>
  <div class="pp-head">
    <div><h2>训练任务</h2><p>基于 Isaac Lab 创建强化学习训练，支持 RSL-RL / rl_games / SKRL / Stable-Baselines3 四种框架</p></div>
    <div class="r" style="margin-left:auto"><a-button type="primary" @click="add"><PlusOutlined />新建训练任务</a-button></div>
  </div>
  <section ref="host" class="pp-panel">
    <div class="pp-filter">
      <a-input v-model:value="kw" allow-clear placeholder="任务名称" style="width: 200px"><template #prefix><SearchOutlined /></template></a-input>
      <a-select v-model:value="fw" allow-clear placeholder="框架" style="width: 160px" :options="FRAMEWORKS.map((x) => ({ value: x.v, label: x.t }))" />
      <a-select v-model:value="st" allow-clear placeholder="状态" style="width: 110px" :options="Object.entries(ST).map(([v, x]) => ({ value: v, label: x.t }))" />
      <span class="sum">训练中<b>{{ stat.run }}</b>· 已完成<b>{{ stat.done }}</b>· 排队<b>{{ stat.q }}</b></span>
    </div>
    <a-table :data-source="rows" :columns="columns" row-key="id" size="middle" class="pp-table" :pagination="{ pageSize, showSizeChanger: false, size: 'small' }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'"><div class="pp-cell"><b>{{ record.name }}</b><small class="mono">{{ taskId(record as Train) }}</small></div></template>
        <template v-else-if="column.key === 'scene'"><div class="pp-cell"><span>{{ sceneOf(record.scene).t.replace('标准', '') }}</span><small>{{ record.walk === 'Flat' ? '平地全向行走' : '斜坡 / 台阶越障' }}</small></div></template>
        <template v-else-if="column.key === 'fw'"><span class="st-fw"><i :style="{ background: fwOf(record.fw).c }" />{{ fwOf(record.fw).t }}</span></template>
        <template v-else-if="column.key === 'envs'"><span class="mono">{{ record.envs }}</span></template>
        <template v-else-if="column.key === 'it'"><a-progress :percent="Math.round((record.it / record.total) * 100)" size="small" :format="() => `${record.it}/${record.total}`" /></template>
        <template v-else-if="column.key === 'st'"><a-badge :status="ST[record.status].b" :text="ST[record.status].t" /></template>
        <template v-else-if="column.key === 'op'">
          <div class="pp-op">
            <a-button type="link" size="small" :disabled="record.status !== 'running'" @click="emit('view', record.id)">视口</a-button>
            <a-button type="link" size="small" :disabled="record.status === 'queued'" @click="emit('monitor', record.id)">监控</a-button>
            <a-dropdown :trigger="['click']"><a-button type="text" size="small"><MoreOutlined /></a-button>
              <template #overlay><a-menu>
                <a-menu-item key="stop" :disabled="record.status !== 'running'" @click="stop(record as Train)">停止训练</a-menu-item>
                <a-menu-item key="pol" :disabled="record.status !== 'done'" @click="message.success('策略已导出：policy.onnx')">导出策略</a-menu-item>
                <a-menu-item key="del" danger :disabled="record.status === 'running'" @click="del(record as Train)">删除</a-menu-item>
              </a-menu></template>
            </a-dropdown>
          </div>
        </template>
      </template>
    </a-table>
  </section>

  <a-modal v-model:open="open" title="新建训练任务" :width="720" ok-text="启动训练" @ok="submit">
    <a-form layout="vertical" class="st-f">
      <div class="st-sec">场景与任务</div>
      <div class="st-g">
        <a-form-item label="仿真场景"><a-select v-model:value="f.scene" :options="SCENES.map((s) => ({ value: s.v, label: s.t }))" /></a-form-item>
        <a-form-item label="行走任务"><a-select v-model:value="f.walk" :options="WALKS.map((s) => ({ value: s.v, label: s.t }))" /></a-form-item>
        <a-form-item label="机器人模型"><a-select v-model:value="f.robot" :options="ROBOTS" /></a-form-item>
        <a-form-item label="任务名称"><a-input v-model:value="f.name" placeholder="留空自动生成" /></a-form-item>
      </div>
      <div class="st-sec">强化学习框架</div>
      <div class="st-fws">
        <div v-for="x in FRAMEWORKS" :key="x.v" class="st-fwc" :class="{ on: f.fw === x.v }" @click="f.fw = x.v"><i :style="{ background: x.c }" /><b>{{ x.t }}</b><small>{{ x.algo }}</small></div>
      </div>
      <div class="st-sec">超参数</div>
      <div class="st-g3">
        <a-form-item label="并行环境数 num_envs"><a-input-number v-model:value="f.envs" :min="1" :max="8192" :step="512" style="width:100%" /></a-form-item>
        <a-form-item label="最大迭代 max_iterations"><a-input-number v-model:value="f.total" :min="1" :step="100" style="width:100%" /></a-form-item>
        <a-form-item label="学习率 learning_rate"><a-input-number v-model:value="f.lr" :min="0.00001" :step="0.0001" style="width:100%" /></a-form-item>
      </div>
      <div class="st-cmd mono">{{ cmdOf(f) }}</div>
    </a-form>
  </a-modal>
</template>
<style scoped>
.st-fw { display: inline-flex; align-items: center; gap: 8px; } .st-fw i { width: 6px; height: 6px; border-radius: 50%; }
.st-f { margin-top: 12px; } .st-f :deep(.ant-form-item) { margin-bottom: 12px; }
.st-sec { margin: 6px 0 10px; font-weight: 500; color: var(--title); }
.st-g { display: grid; grid-template-columns: 1fr 1fr; column-gap: 16px; }
.st-g3 { display: grid; grid-template-columns: repeat(3, 1fr); column-gap: 16px; }
.st-fws { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
.st-fwc { position: relative; display: flex; flex-direction: column; gap: 2px; padding: 10px 12px 10px 26px; border: 1px solid var(--line); border-radius: 8px; cursor: pointer; transition: all .2s; }
.st-fwc i { position: absolute; left: 12px; top: 17px; width: 6px; height: 6px; border-radius: 50%; }
.st-fwc small { color: var(--muted); font-size: 11.5px; }
.st-fwc.on { border-color: #2ED3E6; background: rgba(46,211,230,.1); }
.st-cmd { padding: 10px 12px; font-size: 11.5px; line-height: 1.6; color: #9FE6EF; background: #081220; border: 1px solid rgba(46,211,230,.15); border-radius: 8px; word-break: break-all; }
</style>
