<script setup lang="ts">
import type { DeviceType } from '@/models/device'
withDefaults(defineProps<{ type: DeviceType; size?: number; color?: string }>(), { size: 40, color: '#2ED3E6' })
</script>
<template>
  <svg :width="size" :height="size" viewBox="0 0 64 64" fill="none" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="type === 'humanoid'">
      <rect x="25" y="5" width="14" height="12" rx="4" /><path d="M28 11h.01M36 11h.01" stroke-width="3" />
      <path d="M22 21h20l2 18H20z" /><path d="M22 23l-7 13 3 5M42 23l7 13-3 5" /><path d="M26 39l-2 20M38 39l2 20M22 59h5M37 59h5" />
      <path d="M27 28h10" opacity=".6" />
    </template>
    <template v-else-if="type === 'quadruped'">
      <path d="M14 26h30l4 8H12z" /><path d="M44 26l6-6h6v6l-6 4" /><circle cx="53" cy="23" r="1" fill="currentColor" />
      <path d="M17 34l-4 10 4 10M24 34l2 10-3 10M38 34l-2 10 3 10M45 34l4 10-4 10" /><path d="M20 30h20" opacity=".6" />
    </template>
    <template v-else-if="type === 'ugv'">
      <rect x="10" y="22" width="44" height="18" rx="3" /><path d="M18 22v-6h16l4 6" /><circle cx="44" cy="15" r="3" />
      <circle cx="18" cy="46" r="6" /><circle cx="46" cy="46" r="6" /><path d="M24 46h16" /><path d="M16 31h10M40 31h8" opacity=".6" />
    </template>
    <template v-else-if="type === 'uav'">
      <rect x="25" y="26" width="14" height="10" rx="3" /><path d="M25 28L14 18M39 28l11-10M25 34L14 44M39 34l11 10" />
      <ellipse cx="13" cy="17" rx="8" ry="2.5" /><ellipse cx="51" cy="17" rx="8" ry="2.5" /><ellipse cx="13" cy="45" rx="8" ry="2.5" /><ellipse cx="51" cy="45" rx="8" ry="2.5" />
      <path d="M28 36l-3 8M36 36l3 8M24 44h16" opacity=".6" />
    </template>
    <template v-else>
      <path d="M6 36h52l-7 12H13z" /><path d="M18 36v-9h20l6 9" /><path d="M24 27v-8h8" /><circle cx="48" cy="28" r="4" />
      <path d="M4 54c5 0 5-3 10-3s5 3 10 3 5-3 10-3 5 3 10 3 5-3 10-3 5 3 6 3" opacity=".6" />
    </template>
  </svg>
</template>
