<script setup lang="ts">
import { computed } from 'vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { buildTheme } from '@/theme'
import { useSession } from '@/stores/session'
import ToastHost from '@/components/ToastHost.vue'

const session = useSession()
const theme = computed(() => buildTheme(session.dark))
</script>
<template>
  <a-config-provider :locale="zhCN" :theme="theme">
    <a-app style="height: 100%">
      <router-view />
      <ToastHost />
    </a-app>
  </a-config-provider>
</template>
