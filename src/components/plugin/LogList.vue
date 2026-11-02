<script setup lang="ts">
/** 设备日志：插件上报的运行日志 + 指令日志，可按级别筛选 */
import { computed, ref } from 'vue'
import { logsOf } from '@/plugins/runtime'
const props = withDefaults(defineProps<{ deviceId: string; limit?: number; filter?: boolean }>(), { limit: 100, filter: true })
const lv = ref<'all' | 'info' | 'warn' | 'error'>('all')
const list = computed(() => logsOf(props.deviceId).filter((l) => lv.value === 'all' || l.level === lv.value).slice(0, props.limit))
const C: Record<string, string> = { info: '#2ED3E6', warn: '#FFC15C', error: '#FF7A7A' }
const T: Record<string, string> = { info: '信息', warn: '警告', error: '错误' }
</script>
<template>
  <div class="ll">
    <div v-if="filter" class="ll-f"><a-radio-group v-model:value="lv" size="small"><a-radio-button value="all">全部</a-radio-button><a-radio-button value="info">信息</a-radio-button><a-radio-button value="warn">警告</a-radio-button><a-radio-button value="error">错误</a-radio-button></a-radio-group><span class="muted">共 {{ list.length }} 条</span></div>
    <ul v-if="list.length">
      <li v-for="(l, i) in list" :key="i"><span class="mono t">{{ l.at.slice(5) }}</span><i :style="{ color: C[l.level], borderColor: C[l.level] + '55' }">{{ T[l.level] }}</i><em>{{ l.source }}</em><span class="c">{{ l.message }}</span></li>
    </ul>
    <div v-else class="ll-empty">暂无日志</div>
  </div>
</template>
<style scoped>
.ll { display: flex; flex-direction: column; min-height: 0; }
.ll-f { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 12px; }
.ll ul { list-style: none; margin: 0; padding: 0; overflow: auto; }
.ll li { display: flex; align-items: center; gap: 10px; padding: 7px 2px; font-size: 12.5px; border-bottom: 1px dashed var(--line); }
.ll li:last-child { border-bottom: 0; }
.ll .t { flex: none; width: 112px; font-size: 11.5px; color: var(--faint); }
.ll li i { flex: none; font-style: normal; font-size: 11px; line-height: 17px; padding: 0 5px; border: 1px solid; border-radius: 3px; }
.ll li em { flex: none; width: 34px; font-style: normal; font-size: 11.5px; color: var(--muted); }
.ll .c { flex: 1; min-width: 0; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ll-empty { padding: 26px; text-align: center; color: var(--faint); font-size: 12.5px; }
</style>
