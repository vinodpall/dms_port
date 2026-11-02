<script setup lang="ts">
/** 遥测指标网格：按插件声明的字段与展示位置渲染，字段多少自适应 */
import { computed } from 'vue'
import type { Descriptor, DeviceState, Display } from '@/plugins/types'
import { fmtField } from '@/plugins/runtime'
const props = withDefaults(defineProps<{ desc: Descriptor; state?: DeviceState; display?: Display; cols?: number; exclude?: string[]; dense?: boolean }>(), { display: 'detail', cols: 2, exclude: () => [], dense: false })
const fields = computed(() => props.desc.telemetry.filter((f) => f.display.includes(props.display) && f.type !== 'pose2d' && !props.exclude.includes(f.key)))
const on = computed(() => !!props.state?.online)
const cells = computed(() => fields.value.map((f) => ({ f, ...(on.value ? fmtField(f, props.state!.values[f.key]) : { text: '—', unit: undefined, warn: false }) })))
</script>
<template>
  <div v-if="cells.length" class="tg" :class="{ dense }" :style="{ '--cols': Math.min(cols, cells.length), '--odd': Math.min(cols, cells.length) === 2 ? 2 : 1 }">
    <div v-for="c in cells" :key="c.f.key" :class="{ warn: c.warn }">
      <small>{{ c.f.label }}<em v-if="c.f.group" class="g">{{ c.f.group }}</em></small>
      <b class="mono">{{ c.text }}<em v-if="c.unit && c.text !== '—'">{{ c.unit }}</em></b>
    </div>
  </div>
  <div v-else class="tg-empty">该设备未上报实时数据</div>
</template>
<style scoped>
.tg { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 1px; background: var(--line); }
.tg > div:last-child:nth-child(odd) { grid-column: span var(--odd, 1); }
.tg > div { padding: 13px 16px; background: var(--panel-2, #13263f); min-width: 0; }
.tg.dense > div { padding: 9px 12px; }
.tg small { display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 12px; margin-bottom: 4px; white-space: nowrap; }
.tg small .g { font-style: normal; font-size: 10.5px; color: var(--faint); }
.tg b { display: block; font-size: 21px; font-weight: 600; color: var(--title); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tg.dense b { font-size: 16px; }
.tg b em { font-style: normal; font-size: 12px; color: var(--muted); margin-left: 3px; font-weight: 400; }
.tg .warn b { color: var(--warn, #FFC15C); }
.tg-empty { padding: 22px; text-align: center; color: var(--faint); font-size: 12.5px; }
</style>
