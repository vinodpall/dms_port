<script setup lang="ts">
import { PLATFORM } from '@/constants'
import { useSession } from '@/stores/session'
import CyberPortal from '@/skins/cyber/Portal.vue'

const session = useSession()
document.title = '选择模块 · ' + PLATFORM.name
</script>
<template>
  <CyberPortal />
</template>
