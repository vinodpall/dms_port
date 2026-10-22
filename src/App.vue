<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { routeLoading } from '@/router'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { buildTheme } from '@/theme'
import { useSession } from '@/stores/session'
import ToastHost from '@/components/ToastHost.vue'

const session = useSession()
const theme = computed(() => buildTheme(session.dark))
/** 路由懒加载超过 120ms 时显示顶部进度条，避免点击后“没反应” */
const showBar = ref(false)
let timer = 0
watch(routeLoading, (v) => {
  clearTimeout(timer)
  if (v) timer = window.setTimeout(() => { showBar.value = true }, 120)
  else showBar.value = false
})
</script>
<template>
  <a-config-provider :locale="zhCN" :theme="theme">
    <a-app style="height: 100%">
      <div v-if="showBar" class="route-bar" role="progressbar" aria-label="页面加载中" />
      <router-view />
      <ToastHost />
    </a-app>
  </a-config-provider>
</template>

<style>
.route-bar { position: fixed; top: 0; left: 0; height: 2px; width: 100%; z-index: 3000; pointer-events: none;
  background: linear-gradient(90deg, transparent, #2ed3e6, #5b7cfa, transparent); background-size: 50% 100%; background-repeat: no-repeat;
  animation: route-bar 1s ease-in-out infinite; }
@keyframes route-bar { from { background-position: -50% 0; } to { background-position: 150% 0; } }
</style>
