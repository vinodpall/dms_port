<script setup lang="ts">
import { PLATFORM } from '@/constants'
import { useSession } from '@/stores/session'
import CyberLogin from '@/skins/cyber/Login.vue'

const session = useSession()
document.title = '登录 · ' + PLATFORM.name
</script>
<template>
  <CyberLogin />
</template>
