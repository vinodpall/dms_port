<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, MoreOutlined } from '@ant-design/icons-vue'
import { useFitRows } from '@/components/proto/fitRows'
import { sys, type User } from './perms'

const host = ref<HTMLElement>()
const { size: pageSize } = useFitRows(host, 56)
const kw = ref('')
const role = ref<string>()
const ROLE_OPTS = computed(() => sys.roles.map((r) => ({ value: r.id, label: r.name })))
const roleName = (id: string) => sys.roles.find((r) => r.id === id)?.name ?? '-'
const rows = computed(() => { const k = kw.value.trim().toLowerCase(); return sys.users.filter((u) => (!role.value || u.roleIds.includes(role.value)) && (!k || [u.account, u.name].some((x) => x.toLowerCase().includes(k)))) })
const columns = [
  { title: '用户', key: 'name', width: '22%' }, { title: '手机号', dataIndex: 'phone', width: '16%' },
  { title: '角色', key: 'roles', width: '26%' }, { title: '状态', key: 'enabled', width: '12%' },
  { title: '最近登录', dataIndex: 'last', width: '14%' }, { title: '操作', key: 'op', align: 'right' as const },
]
const open = ref(false)
const editId = ref<string | null>(null)
const blank = (): User => ({ id: '', account: '', name: '', phone: '', roleIds: [], enabled: true, last: '-' })
const f = reactive<User>(blank())
const formRef = ref()
const rules = { account: [{ required: true, message: '请输入账号' }], name: [{ required: true, message: '请输入姓名' }], roleIds: [{ required: true, type: 'array', min: 1, message: '至少选择一个角色' }] }
const edit = (u?: User) => { editId.value = u?.id ?? null; Object.assign(f, u ? { ...u, roleIds: [...u.roleIds] } : blank()); open.value = true; formRef.value?.clearValidate() }
async function submit() {
  await formRef.value.validate()
  if (editId.value) Object.assign(sys.users.find((u) => u.id === editId.value)!, { ...f, roleIds: [...f.roleIds] })
  else sys.users.unshift({ ...f, roleIds: [...f.roleIds], id: `u-${Date.now().toString(36)}` })
  message.success(editId.value ? '已保存' : '用户已添加'); open.value = false
}
const reset = (u: User) => Modal.confirm({ title: `重置「${u.name}」的密码？`, content: '重置后将发送初始密码到其手机号', okText: '重置', cancelText: '取消', onOk: () => { message.success('密码已重置') } })
const del = (u: User) => Modal.confirm({ title: `删除用户「${u.name}」？`, okText: '删除', okType: 'danger', cancelText: '取消', onOk: () => { sys.users.splice(sys.users.indexOf(u), 1); message.success('已删除') } })
</script>
<template>
  <div class="pp-head">
    <div><h2>用户管理</h2><p>维护平台账号，为用户分配一个或多个角色</p></div>
    <div class="r" style="margin-left:auto"><a-button type="primary" @click="edit()"><PlusOutlined />新增用户</a-button></div>
  </div>
  <section ref="host" class="pp-panel">
    <div class="pp-filter">
      <a-input v-model:value="kw" allow-clear placeholder="账号 / 姓名" style="width: 220px"><template #prefix><SearchOutlined /></template></a-input>
      <a-select v-model:value="role" allow-clear placeholder="角色" style="width: 140px" :options="ROLE_OPTS" />
      <a v-if="kw || role" class="reset" @click="kw = ''; role = undefined">重置</a>
      <span class="sum">共<b>{{ rows.length }}</b>个用户</span>
    </div>
    <a-table :data-source="rows" :columns="columns" row-key="id" size="middle" class="pp-table" :pagination="{ pageSize, showSizeChanger: false, size: 'small' }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'"><div class="pp-cell"><b>{{ record.name }}</b><small>{{ record.account }}</small></div></template>
        <template v-else-if="column.key === 'roles'"><a-tag v-for="r in record.roleIds" :key="r" color="cyan">{{ roleName(r) }}</a-tag></template>
        <template v-else-if="column.key === 'enabled'"><a-switch v-model:checked="record.enabled" size="small" :disabled="record.account === 'admin'" /><span class="su-st">{{ record.enabled ? '启用' : '停用' }}</span></template>
        <template v-else-if="column.key === 'op'">
          <div class="pp-op">
            <a-button type="link" size="small" @click="edit(record as User)">编辑</a-button>
            <a-dropdown :trigger="['click']"><a-button type="text" size="small"><MoreOutlined /></a-button>
              <template #overlay><a-menu>
                <a-menu-item key="pwd" @click="reset(record as User)">重置密码</a-menu-item>
                <a-menu-item key="del" danger :disabled="record.account === 'admin'" @click="del(record as User)">删除</a-menu-item>
              </a-menu></template>
            </a-dropdown>
          </div>
        </template>
      </template>
    </a-table>
  </section>
  <a-modal v-model:open="open" :title="editId ? '编辑用户' : '新增用户'" :width="520" :ok-text="editId ? '保存' : '添加'" @ok="submit">
    <a-form ref="formRef" :model="f" :rules="rules" layout="vertical" class="su-f">
      <div class="su-g">
        <a-form-item label="账号" name="account"><a-input v-model:value="f.account" :disabled="!!editId" placeholder="登录账号" /></a-form-item>
        <a-form-item label="姓名" name="name"><a-input v-model:value="f.name" placeholder="真实姓名" /></a-form-item>
      </div>
      <a-form-item label="手机号"><a-input v-model:value="f.phone" placeholder="用于接收通知与重置密码" /></a-form-item>
      <a-form-item label="角色" name="roleIds"><a-select v-model:value="f.roleIds" mode="multiple" placeholder="选择角色" :options="ROLE_OPTS" /></a-form-item>
      <a-form-item label="状态" style="margin-bottom:0"><a-switch v-model:checked="f.enabled" /><span class="su-st">{{ f.enabled ? '启用' : '停用' }}</span></a-form-item>
    </a-form>
  </a-modal>
</template>
<style scoped>
.su-st { margin-left: 8px; color: var(--muted); }
.su-f { margin-top: 16px; }
.su-g { display: grid; grid-template-columns: 1fr 1fr; column-gap: 16px; }
</style>
