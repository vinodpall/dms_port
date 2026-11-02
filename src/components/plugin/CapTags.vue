<script setup lang="ts">
/** 能力标签：插件声明的设备能力 */
import { computed } from 'vue'
import { capMeta, type Capability } from '@/plugins/types'
const props = withDefaults(defineProps<{ caps: Capability[]; scope?: 'device' | 'biz'; max?: number; small?: boolean }>(), { scope: undefined, max: 99, small: false })
const list = computed(() => props.caps.filter((c) => c !== 'status' && (!props.scope || capMeta(c)[props.scope])))
</script>
<template>
  <span class="ct" :class="{ sm: small }">
    <a-tooltip v-for="c in list.slice(0, max)" :key="c" :title="capMeta(c).desc"><i :style="{ '--c': capMeta(c).color }">{{ capMeta(c).label }}</i></a-tooltip>
    <a-tooltip v-if="list.length > max" :title="list.slice(max).map((c) => capMeta(c).label).join('、')"><i class="more">+{{ list.length - max }}</i></a-tooltip>
  </span>
</template>
<style scoped>
.ct { display: inline-flex; flex-wrap: wrap; gap: 5px; }
.ct i { font-style: normal; font-size: 12px; line-height: 20px; padding: 0 7px; color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); border-radius: 4px; white-space: nowrap; }
.ct.sm i { font-size: 11px; line-height: 17px; padding: 0 5px; }
.ct i.more { --c: #8EA6BE; }
</style>
