<script setup lang="ts">
/** 模型资产库：上传 URDF 压缩包 → 调用 Isaac Lab convert_urdf.py 转为 USD */
import { computed, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { InboxOutlined, SearchOutlined, MoreOutlined } from '@ant-design/icons-vue'
import DeviceGlyph from '@/components/proto/DeviceGlyph.vue'
import { useFitRows } from '@/components/proto/fitRows'
import { sim, type Asset } from './data'

const emit = defineEmits<{ train: [] }>()
const f = reactive({ file: '', name: '', kind: '四足机器狗', fixBase: false, merge: true, drive: 'position' })
const KINDS = ['四足机器狗', '人形机器人', '机械臂', '轮式小车'].map((v) => ({ value: v, label: v }))
const TYPE: Record<string, string> = { 四足机器狗: 'quadruped', 人形机器人: 'humanoid', 机械臂: 'arm', 轮式小车: 'ugv' }
const out = computed(() => `custom/${(f.name || 'robot').toLowerCase().replace(/\s+/g, '_')}.usd`)
const cmd = computed(() => `./isaaclab.sh -p scripts/tools/convert_urdf.py ${f.file ? f.file.replace('.zip', '') + '/robot.urdf' : 'input.urdf'} ${out.value}${f.merge ? ' --merge-joints' : ''}${f.fixBase ? ' --fix-base' : ''} --joint-stiffness 0.0 --joint-target-type ${f.drive}`)
const pct = ref(-1)
const beforeUpload = (file: File) => { f.file = file.name; if (!f.name) f.name = file.name.replace(/\.zip$/i, ''); return false }
const start = () => {
  if (!f.file) return message.warning('请先上传包含 .urdf 与 meshes 的 zip 压缩包')
  const a: Asset = { id: `a-${Date.now().toString(36)}`, name: f.name, kind: f.kind, type: TYPE[f.kind], joints: 12, links: 13, src: f.file, usd: out.value, status: 'converting', time: new Date().toLocaleString('zh-CN', { hour12: false }).slice(0, 16).replace(/\//g, '-') }
  sim.assets.unshift(a); pct.value = 0
  const t = setInterval(() => { pct.value += 20; if (pct.value >= 100) { clearInterval(t); const x = sim.assets.find((v) => v.id === a.id); if (x) x.status = 'ok'; pct.value = -1; message.success(`${a.name} 已转换为 USD，可在训练任务中选用`); f.file = ''; f.name = '' } }, 500)
}
const host = ref<HTMLElement>()
const { size: pageSize } = useFitRows(host, 60)
const kw = ref(''); const kind = ref<string>()
const rows = computed(() => sim.assets.filter((a) => (!kind.value || a.kind === kind.value) && (!kw.value || a.name.toLowerCase().includes(kw.value.toLowerCase()))))
const columns = [{ title: '模型', key: 'name', width: '24%' }, { title: '类型', dataIndex: 'kind', width: '12%' }, { title: '关节 / 刚体', key: 'j', width: '12%' }, { title: 'USD 路径', key: 'usd', width: '28%' }, { title: '状态', key: 'st', width: '10%' }, { title: '操作', key: 'op', align: 'right' as const }]
const del = (a: Asset) => Modal.confirm({ title: `删除模型「${a.name}」？`, okText: '删除', okType: 'danger', cancelText: '取消', onOk: () => { sim.assets.splice(sim.assets.indexOf(a), 1); message.success('已删除') } })
</script>
<template>
  <div class="pp-head">
    <div><h2>模型资产</h2><p>上传 URDF 模型包，一键转换为 Isaac Sim 可用的 USD 资产，转换完成后可下载或在训练任务中选用</p></div>
  </div>
  <div class="sa">
    <section class="pp-panel sa-up">
      <div class="pp-panel-h"><h3>URDF 转 USD</h3></div>
      <a-upload-dragger :before-upload="beforeUpload" :show-upload-list="false" accept=".zip" class="sa-drag">
        <p class="ant-upload-drag-icon"><InboxOutlined /></p>
        <p class="ant-upload-text">{{ f.file || '点击或拖拽上传 zip 压缩包' }}</p>
        <p class="ant-upload-hint">需包含 .urdf 文件与 meshes 目录</p>
      </a-upload-dragger>
      <a-form layout="vertical" class="sa-f">
        <div class="sa-g">
          <a-form-item label="模型名称"><a-input v-model:value="f.name" placeholder="如：Unitree B2" /></a-form-item>
          <a-form-item label="机器人类型"><a-select v-model:value="f.kind" :options="KINDS" /></a-form-item>
        </div>
        <a-form-item label="关节驱动"><a-segmented v-model:value="f.drive" block :options="[{ value: 'position', label: '位置' }, { value: 'velocity', label: '速度' }, { value: 'none', label: '力矩' }]" /></a-form-item>
        <div class="sa-sw">
          <label><a-switch v-model:checked="f.merge" size="small" /><span>合并固定关节<small>--merge-joints</small></span></label>
          <label><a-switch v-model:checked="f.fixBase" size="small" /><span>固定基座<small>--fix-base，机械臂等固定安装模型</small></span></label>
        </div>
      </a-form>
      <div class="sa-cmd mono">{{ cmd }}</div>
      <a-progress v-if="pct >= 0" :percent="pct" size="small" status="active" />
      <a-button type="primary" block :loading="pct >= 0" @click="start">开始转换</a-button>
    </section>
    <section ref="host" class="pp-panel sa-list">
      <div class="pp-filter">
        <a-input v-model:value="kw" allow-clear placeholder="模型名称" style="width: 200px"><template #prefix><SearchOutlined /></template></a-input>
        <a-select v-model:value="kind" allow-clear placeholder="机器人类型" style="width: 130px" :options="KINDS" />
        <span class="sum">共<b>{{ rows.length }}</b>个模型</span>
      </div>
      <a-table :data-source="rows" :columns="columns" row-key="id" size="middle" class="pp-table" :pagination="{ pageSize, showSizeChanger: false, size: 'small' }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'"><div class="sa-m"><span class="sa-th"><DeviceGlyph :type="record.type === 'arm' ? 'humanoid' : record.type" :size="34" color="#2ED3E6" /></span><div class="pp-cell"><b>{{ record.name }}</b><small>{{ record.src }}</small></div></div></template>
          <template v-else-if="column.key === 'j'"><span class="mono">{{ record.joints }} / {{ record.links }}</span></template>
          <template v-else-if="column.key === 'usd'"><span class="mono sa-usd">{{ record.usd }}</span></template>
          <template v-else-if="column.key === 'st'"><a-badge :status="record.status === 'ok' ? 'success' : record.status === 'fail' ? 'error' : 'processing'" :text="record.status === 'ok' ? '可用' : record.status === 'fail' ? '失败' : '转换中'" /></template>
          <template v-else-if="column.key === 'op'">
            <div class="pp-op">
              <a-button type="link" size="small" :disabled="record.status !== 'ok'" @click="message.success('开始下载 ' + record.usd.split('/').pop())">下载 USD</a-button>
              <a-button type="link" size="small" :disabled="record.status !== 'ok'" @click="emit('train')">用于训练</a-button>
              <a-dropdown :trigger="['click']"><a-button type="text" size="small"><MoreOutlined /></a-button>
                <template #overlay><a-menu><a-menu-item key="del" danger :disabled="record.builtin" @click="del(record as Asset)">{{ record.builtin ? '内置资产不可删除' : '删除' }}</a-menu-item></a-menu></template>
              </a-dropdown>
            </div>
          </template>
        </template>
      </a-table>
    </section>
  </div>
</template>
<style scoped>
.sa { display: grid; grid-template-columns: 360px minmax(0, 1fr); gap: 16px; height: calc(100vh - 190px); min-height: 520px; }
.sa > .pp-panel { min-height: 0; }
.sa-up { display: flex; flex-direction: column; gap: 12px; overflow: auto; padding-bottom: 16px; }
.sa-up > :not(.pp-panel-h) { margin: 0 16px; }
.sa-drag :deep(.ant-upload-btn) { padding: 14px 0 !important; }
.sa-f :deep(.ant-form-item) { margin-bottom: 12px; }
.sa-g { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.sa-sw { display: flex; flex-direction: column; gap: 10px; }
.sa-sw label { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; }
.sa-sw span { display: flex; flex-direction: column; font-size: 13px; } .sa-sw small { font-size: 11.5px; color: var(--muted); }
.sa-cmd { padding: 10px 12px; font-size: 11.5px; line-height: 1.6; color: #9FE6EF; background: #081220; border: 1px solid rgba(46,211,230,.15); border-radius: 8px; word-break: break-all; }
.sa-m { display: flex; align-items: center; gap: 10px; }
.sa-th { width: 44px; height: 40px; flex: none; display: grid; place-items: center; border-radius: 8px; background: rgba(46,211,230,.08); border: 1px solid rgba(46,211,230,.18); }
.sa-usd { font-size: 12px; color: var(--muted); }
</style>
