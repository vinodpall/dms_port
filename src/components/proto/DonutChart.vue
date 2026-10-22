<script setup lang="ts">
import { computed } from 'vue'
const props = withDefaults(defineProps<{ data: { label: string; value: number; color: string }[]; size?: number; title?: string; sub?: string }>(), { size: 160 })
const total = computed(() => props.data.reduce((a, b) => a + b.value, 0))
const R = 42, C = 2 * Math.PI * R
const arcs = computed(() => { let acc = 0; return props.data.map((d) => { const len = (d.value / total.value) * C; const a = { ...d, dash: `${Math.max(0, len - 2)} ${C}`, off: -acc }; acc += len; return a }) })
</script>
<template>
  <svg :width="size" :height="size" viewBox="0 0 100 100">
    <circle cx="50" cy="50" :r="R + 6" fill="none" style="stroke: rgba(var(--glow, 77,208,225),.15)" stroke-width=".6" stroke-dasharray="1 2" />
    <circle cx="50" cy="50" :r="R" fill="none" style="stroke: rgba(var(--glow, 77,208,225),.08)" stroke-width="9" />
    <circle v-for="a in arcs" :key="a.label" cx="50" cy="50" :r="R" fill="none" :stroke="a.color" stroke-width="9" :stroke-dasharray="a.dash" :stroke-dashoffset="a.off" transform="rotate(-90 50 50)" />
    <text x="50" y="50" text-anchor="middle" style="fill: var(--title, #fff); font: 600 17px 'JetBrains Mono', Consolas, monospace">{{ title ?? total }}</text>
    <text x="50" y="63" text-anchor="middle" style="fill: var(--muted, #B6CADC); font-size: 7px">{{ sub }}</text>
  </svg>
</template>
