<script setup lang="ts">
import { computed } from 'vue'
import hero from '@/assets/login-hero.webp'
import DeviceGlyph from './DeviceGlyph.vue'
import type { Scene } from '@/mock/scenes'
const props = defineProps<{ scene: Scene }>()
/** 以主视觉插画为底图，按场景裁切中心与缩放生成缩略图 */
const style = computed(() => {
  const c = props.scene.crop
  if (!c) return {}
  const z = props.scene.zoom ?? 2.5
  const fx = c[0] / 1800, fy = c[1] / 1168
  const px = z === 1 ? 50 : ((fx * z - 0.5) / (z - 1)) * 100
  const py = z === 1 ? 50 : ((fy * z - 0.5) / (z - 1)) * 100
  return { backgroundImage: `url(${hero})`, backgroundSize: `${z * 100}% auto`, backgroundPosition: `${Math.min(100, Math.max(0, px))}% ${Math.min(100, Math.max(0, py))}%` }
})
</script>
<template>
  <div class="st" :class="{ water: !scene.crop }" :style="style">
    <template v-if="!scene.crop">
      <svg class="waves" viewBox="0 0 200 120" preserveAspectRatio="none"><path v-for="i in 7" :key="i" :d="`M0 ${18 * i} q12 -6 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0`" fill="none" stroke="#4DD0E1" stroke-opacity=".18" /></svg>
      <span class="boat"><DeviceGlyph type="usv" :size="58" color="#FFB74D" /></span><span class="drone"><DeviceGlyph type="uav" :size="40" color="#B48CFF" /></span>
    </template>
    <slot />
  </div>
</template>
<style scoped>
.st { position: relative; width: 100%; aspect-ratio: 16 / 9; background-color: #091A2A; background-repeat: no-repeat; overflow: hidden; }
.st.water { background: radial-gradient(ellipse at 50% 60%, #0F3550, #091A2A 75%); }
.waves { position: absolute; inset: 0; width: 100%; height: 100%; }
.boat { position: absolute; left: 34%; top: 46%; } .drone { position: absolute; left: 58%; top: 16%; animation: st-f 4s ease-in-out infinite; }
@keyframes st-f { 50% { transform: translateY(-5px); } }
</style>
