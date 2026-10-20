<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ExportOutlined } from '@ant-design/icons-vue'
import { OP_LOGS, ROBOTS } from '@/mock/biz'
import { curId } from './store'

const f = reactive({ user: '全部', robot: curId.value, type: '' })
const rows = computed(() => OP_LOGS.filter((l) => (f.user === '全部' || l.user === f.user) && (f.robot === '全部' || l.robot === f.robot) && (!f.type || l.type.includes(f.type))))
const cur = ref<(typeof OP_LOGS)[number] | null>(null)
</script>

<template>
  <div class="pp-panel">
    <div class="lg-filter">
      <span>操作用户</span><a-select v-model:value="f.user" style="width:120px" :options="['全部', '周工', '赵工', '张杰'].map((v) => ({ value: v, label: v }))" />
      <span>关联设备</span><a-select v-model:value="f.robot" style="width:120px" :options="['全部', ...ROBOTS.map((r) => r.id)].map((v) => ({ value: v, label: v }))" />
      <span>操作类型</span><a-input v-model:value="f.type" allow-clear placeholder="搜索操作类型" style="width:160px" />
      <span>时间</span><a-range-picker show-time style="width:340px" />
      <a-button @click="Object.assign(f, { user: '全部', robot: '全部', type: '' })">重置</a-button><span style="flex:1" /><a-button><ExportOutlined />导出</a-button>
    </div>
    <a-table :data-source="rows" row-key="k" size="middle" :pagination="{ pageSize: 10, size: 'small' }"
      :columns="[{ title: '操作用户', dataIndex: 'user', width: 100 }, { title: '地址', key: 'ip', width: 130 }, { title: '关联设备', key: 'robot', width: 110 }, { title: '操作类型', key: 'type', width: 110 }, { title: '操作描述', dataIndex: 'desc' }, { title: '结果', key: 'ok', width: 90 }, { title: '操作时间', key: 'time', width: 180 }, { title: '操作内容', key: 'op', width: 100 }]">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'ip' || column.key === 'robot' || column.key === 'time'"><span class="mono">{{ record[column.key as 'ip'] }}</span></template>
        <template v-else-if="column.key === 'type'"><a-tag>{{ record.type }}</a-tag></template>
        <template v-else-if="column.key === 'ok'"><a-badge :status="record.ok ? 'success' : 'error'" :text="record.ok ? '成功' : '失败'" /></template>
        <template v-else-if="column.key === 'op'"><a @click="cur = record">查看详情</a></template>
      </template>
    </a-table>
  </div>
  <a-modal :open="!!cur" title="操作详情" :footer="null" :width="640" @cancel="cur = null">
    <template v-if="cur">
      <h4 class="lg-h">请求数据</h4>
      <pre class="lg-pre">{{ JSON.stringify({ robot_id: cur.robot, action: cur.type, desc: cur.desc, operator: cur.user }, null, 2) }}</pre>
      <h4 class="lg-h">响应数据</h4>
      <pre class="lg-pre">{{ JSON.stringify({ code: cur.ok ? 0 : 5003, message: cur.ok ? 'success' : 'robot not response', time: cur.time }, null, 2) }}</pre>
    </template>
  </a-modal>
</template>

<style scoped>
.lg-filter { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 14px 16px; border-bottom: 1px solid rgba(77,208,225,.1); font-size: 13px; color: var(--muted); }
.lg-filter > span:not(:first-child) { margin-left: 8px; }
.lg-h { margin: 14px 0 8px; font-size: 13px; }
.lg-pre { margin: 0; padding: 12px 14px; font: 12px/1.6 var(--mono); color: #9FE6EF; background: #06121E; border: 1px solid rgba(77,208,225,.15); border-radius: 3px; }
</style>
