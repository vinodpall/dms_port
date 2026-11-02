<script setup lang="ts">
/** 指令执行记录：下发 → 执行中 → 成功 / 失败（插件回执） */
import { computed } from 'vue'
import { LoadingOutlined, CheckCircleFilled, CloseCircleFilled, ClockCircleOutlined } from '@ant-design/icons-vue'
import { cmdsOf } from '@/plugins/runtime'
const props = withDefaults(defineProps<{ deviceId: string; limit?: number }>(), { limit: 50 })
const list = computed(() => cmdsOf(props.deviceId).slice(0, props.limit))
const ST: Record<string, { t: string; c: string }> = { accepted: { t: '已下发', c: '#8EA6BE' }, running: { t: '执行中', c: '#2ED3E6' }, succeeded: { t: '成功', c: '#45E3A8' }, failed: { t: '失败', c: '#FF7A7A' }, timeout: { t: '超时', c: '#FFC15C' } }
</script>
<template>
  <ul v-if="list.length" class="cl">
    <li v-for="r in list" :key="r.requestId">
      <span class="ic" :style="{ color: ST[r.status].c }"><LoadingOutlined v-if="r.status === 'running'" /><CheckCircleFilled v-else-if="r.status === 'succeeded'" /><CloseCircleFilled v-else-if="r.status === 'failed' || r.status === 'timeout'" /><ClockCircleOutlined v-else /></span>
      <div class="b"><b>{{ r.label }}</b><small v-if="r.paramText">{{ r.paramText }}</small><small v-if="r.status === 'failed'" class="err">{{ r.message }}</small></div>
      <div class="m"><em :style="{ color: ST[r.status].c }">{{ ST[r.status].t }}</em><small class="mono">{{ r.at.slice(11) }}{{ r.costMs ? ` · ${(r.costMs / 1000).toFixed(1)}s` : '' }}</small></div>
    </li>
  </ul>
  <div v-else class="cl-empty">暂无执行记录<small>在控制面板中执行操作后，这里会显示插件回执</small></div>
</template>
<style scoped>
.cl { list-style: none; margin: 0; padding: 4px 0; }
.cl li { display: flex; align-items: flex-start; gap: 10px; padding: 9px 14px; border-bottom: 1px dashed var(--line); }
.cl li:last-child { border-bottom: 0; }
.cl .ic { margin-top: 1px; font-size: 14px; }
.cl .b { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cl .b b { font-size: 13px; font-weight: 500; color: var(--text); }
.cl .b small { font-size: 11.5px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .cl .b small.err { color: #FF9A9A; }
.cl .m { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex: none; }
.cl .m em { font-style: normal; font-size: 12px; } .cl .m small { font-size: 11px; color: var(--faint); }
.cl-empty { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 30px 12px; color: var(--muted); font-size: 13px; }
.cl-empty small { color: var(--faint); font-size: 12px; }
</style>
