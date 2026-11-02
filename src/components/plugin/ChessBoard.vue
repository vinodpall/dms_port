<script setup lang="ts">
/** 扩展面板示例（capability: custom:chess）：下棋机器人棋局视图 */
import { computed } from 'vue'
import type { DeviceState } from '@/plugins/types'
const props = withDefaults(defineProps<{ state?: DeviceState; size?: number }>(), { size: 180 })
const v = computed(() => props.state?.values ?? {})
const stones = computed(() => (v.value.board ?? []) as { x: number; y: number; c: 0 | 1 }[])
const KIND: Record<string, string> = { xiangqi: '中国象棋', gomoku: '五子棋', go: '围棋' }
const G: Record<string, string> = { idle: '空闲', playing: '对局中', review: '复盘中' }
</script>
<template>
  <div class="cb">
    <svg viewBox="-1 -1 10 10" class="cb-b" :style="{ width: size + 'px', height: size + 'px' }">
      <rect x="-.6" y="-.6" width="9.2" height="9.2" rx=".3" fill="#C9A46A" opacity=".16" stroke="rgba(255,193,92,.4)" stroke-width=".05" />
      <g stroke="rgba(255,213,150,.45)" stroke-width=".03"><line v-for="i in 9" :key="'h' + i" x1="0" x2="8" :y1="i - 1" :y2="i - 1" /><line v-for="i in 9" :key="'v' + i" y1="0" y2="8" :x1="i - 1" :x2="i - 1" /></g>
      <circle v-for="(s, i) in stones" :key="i" :cx="s.x" :cy="s.y" r=".38" :fill="s.c ? '#F2F6FA' : '#16212E'" :stroke="s.c ? '#C9D6E2' : '#5B6B7D'" stroke-width=".05" :class="{ last: i === stones.length - 1 }" />
    </svg>
    <dl class="cb-i">
      <div><dt>对局状态</dt><dd :class="v.game">{{ G[v.game] ?? '—' }}</dd></div>
      <div><dt>棋类</dt><dd>{{ v.game === 'idle' ? '—' : KIND[v.gameKind] ?? '中国象棋' }}</dd></div>
      <div><dt>当前手数</dt><dd class="mono">{{ v.moves ?? 0 }}</dd></div>
      <div><dt>执子</dt><dd>{{ v.game === 'playing' ? (stones.length % 2 ? '机器人思考中' : '等待人类落子') : '—' }}</dd></div>
    </dl>
  </div>
</template>
<style scoped>
.cb { display: flex; gap: 28px; padding: 14px 16px; align-items: center; }
.cb-b { flex: none; }
.cb-b .last { animation: cb-p 1.2s ease-in-out infinite; }
@keyframes cb-p { 50% { opacity: .55; } }
.cb-i { flex: 1; min-width: 120px; margin: 0; display: grid; gap: 14px; }
.cb-i dt { font-size: 12px; color: var(--muted); } .cb-i dd { margin: 2px 0 0; font-size: 15px; color: var(--title); }
.cb-i dd.playing { color: #45E3A8; } .cb-i dd.review { color: #FFC15C; }
</style>
