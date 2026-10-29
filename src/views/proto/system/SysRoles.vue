<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, MoreOutlined } from '@ant-design/icons-vue'
import { useFitRows } from '@/components/proto/fitRows'
import { ALL, CATALOG, sys, type Role } from './perms'

const emit = defineEmits<{ perm: [string] }>()
const host = ref<HTMLElement>()
const { size: pageSize } = useFitRows(host, 56)
const kw = ref('')
const rows = computed(() => sys.roles.filter((r) => !kw.value.trim() || r.name.includes(kw.value.trim())))
const users = (id: string) => sys.users.filter((u) => u.roleIds.includes(id)).length
const mods = (r: Role) => CATALOG.filter((m) => r.perms.some((p) => p.startsWith(m.key + '.'))).map((m) => m.title)
const columns = [
  { title: '角色', key: 'name', width: '24%' }, { title: '可访问模块', key: 'mods', width: '36%' },
  { title: '权限项', key: 'n', width: '14%' }, { title: '用户数', key: 'u', width: '10%' }, { title: '操作', key: 'op', align: 'right' as const },
]
const open = ref(false)
const editId = ref<string | null>(null)
const f = reactive({ name: '', desc: '' })
const formRef = ref()
const edit = (r?: Role) => { editId.value = r?.id ?? null; Object.assign(f, { name: r?.name ?? '', desc: r?.desc ?? '' }); open.value = true; formRef.value?.clearValidate() }
async function submit() {
  await formRef.value.validate()
  if (editId.value) Object.assign(sys.roles.find((r) => r.id === editId.value)!, f)
  else { const id = `r-${Date.now().toString(36)}`; sys.roles.push({ id, ...f, perms: [] }); message.success('角色已添加，请配置权限'); open.value = false; emit('perm', id); return }
  message.success('已保存'); open.value = false
}
const del = (r: Role) => Modal.confirm({ title: `删除角色「${r.name}」？`, okText: '删除', okType: 'danger', cancelText: '取消', onOk: () => { sys.roles.splice(sys.roles.indexOf(r), 1); message.success('已删除') } })
</script>
<template>
  <div class="pp-head">
    <div><h2>角色管理</h2><p>按岗位定义角色，角色决定可访问的模块、页面与操作按钮</p></div>
    <div class="r" style="margin-left:auto"><a-button type="primary" @click="edit()"><PlusOutlined />新增角色</a-button></div>
  </div>
  <section ref="host" class="pp-panel">
    <div class="pp-filter">
      <a-input v-model:value="kw" allow-clear placeholder="角色名称" style="width: 220px"><template #prefix><SearchOutlined /></template></a-input>
      <span class="sum">共<b>{{ rows.length }}</b>个角色</span>
    </div>
    <a-table :data-source="rows" :columns="columns" row-key="id" size="middle" class="pp-table" :pagination="{ pageSize, showSizeChanger: false, size: 'small' }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'"><div class="pp-cell"><b>{{ record.name }}<a-tag v-if="record.builtin" style="margin-left:8px">内置</a-tag></b><small>{{ record.desc }}</small></div></template>
        <template v-else-if="column.key === 'mods'"><a-tag v-for="m in mods(record as Role)" :key="m" color="cyan">{{ m }}</a-tag><span v-if="!mods(record as Role).length" class="muted">未配置</span></template>
        <template v-else-if="column.key === 'n'">{{ record.perms.length }} / {{ ALL.length }}</template>
        <template v-else-if="column.key === 'u'">{{ users(record.id) }}</template>
        <template v-else-if="column.key === 'op'">
          <div class="pp-op">
            <a-button type="link" size="small" @click="emit('perm', record.id)">配置权限</a-button>
            <a-button type="link" size="small" @click="edit(record as Role)">编辑</a-button>
            <a-dropdown :trigger="['click']"><a-button type="text" size="small"><MoreOutlined /></a-button>
              <template #overlay><a-menu><a-menu-item key="del" danger :disabled="record.builtin || !!users(record.id)" @click="del(record as Role)">{{ users(record.id) ? '删除（仍有用户使用）' : '删除' }}</a-menu-item></a-menu></template>
            </a-dropdown>
          </div>
        </template>
      </template>
    </a-table>
  </section>
  <a-modal v-model:open="open" :title="editId ? '编辑角色' : '新增角色'" :width="480" :ok-text="editId ? '保存' : '添加'" @ok="submit">
    <a-form ref="formRef" :model="f" layout="vertical" style="margin-top:16px">
      <a-form-item label="角色名称" name="name" :rules="[{ required: true, message: '请输入角色名称' }]"><a-input v-model:value="f.name" placeholder="如：巡检操作员" /></a-form-item>
      <a-form-item label="描述" style="margin-bottom:0"><a-textarea v-model:value="f.desc" :rows="3" placeholder="角色职责说明" /></a-form-item>
    </a-form>
  </a-modal>
</template>
