<script setup lang="ts">
/** 系统管理：用户、角色、权限配置 */
import { ref } from 'vue'
import { TeamOutlined, SafetyCertificateOutlined, KeyOutlined } from '@ant-design/icons-vue'
import ModuleShell from '@/components/proto/ModuleShell.vue'
import SysUsers from './system/SysUsers.vue'
import SysRoles from './system/SysRoles.vue'
import SysPerms from './system/SysPerms.vue'

document.title = '系统管理 · 具身智能训练场'
const MENU = [
  { key: 'user', label: '用户管理', icon: TeamOutlined, group: '系统' },
  { key: 'role', label: '角色管理', icon: SafetyCertificateOutlined, group: '系统' },
  { key: 'perm', label: '权限配置', icon: KeyOutlined, group: '系统' },
]
const tab = ref('user')
const roleId = ref('r1')
const toPerm = (id: string) => { roleId.value = id; tab.value = 'perm' }
</script>
<template>
  <ModuleShell v-model:active="tab" title="系统管理" en="System Settings" :menu="MENU">
    <SysUsers v-if="tab === 'user'" />
    <SysRoles v-else-if="tab === 'role'" @perm="toPerm" />
    <SysPerms v-else v-model:role="roleId" />
  </ModuleShell>
</template>
