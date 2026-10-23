<script setup lang="ts">
/** 所属区域管理：行内改名 / 删除（有设备的区域不能删除），底部直接添加 */
import { nextTick, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { AREAS } from '@/models/device'
import { areaCount, removeArea, saveArea } from './store'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [boolean] }>()

const editing = ref<string | null>(null)
const draft = ref('')
const added = ref('')
watch(() => props.open, (v) => { if (v) { editing.value = null; added.value = '' } })

const check = (v: string, old: string | null) => {
  const n = v.trim()
  if (!n) { message.warning('请输入区域名称'); return '' }
  if (AREAS.some((a) => a === n && a !== old)) { message.warning('已存在同名区域'); return '' }
  return n
}
const startEdit = async (a: string) => { editing.value = a; draft.value = a; await nextTick(); (document.querySelector('.am-edit input') as HTMLInputElement)?.focus() }
function commit() {
  const old = editing.value!; const n = check(draft.value, old); if (!n) return
  if (n !== old) { saveArea(old, n); message.success('已保存') }
  editing.value = null
}
function add() { const n = check(added.value, null); if (!n) return; saveArea(null, n); added.value = ''; message.success('区域已添加') }
const del = (a: string) => Modal.confirm({ title: `删除区域「${a}」？`, okText: '删除', okType: 'danger', cancelText: '取消', onOk: () => { removeArea(a); message.success('已删除') } })
</script>

<template>
  <a-modal :open="open" title="所属区域" :width="520" :footer="null" @cancel="emit('update:open', false)">
    <ul class="am-list">
      <li v-for="a in AREAS" :key="a">
        <template v-if="editing === a">
          <a-input v-model:value="draft" class="am-edit" :maxlength="20" @press-enter="commit" @keydown.esc="editing = null" />
          <div class="op"><a-button type="link" size="small" @click="commit">保存</a-button><a-button type="link" size="small" class="muted" @click="editing = null">取消</a-button></div>
        </template>
        <template v-else>
          <b>{{ a }}</b>
          <span class="n muted">{{ areaCount(a) }} 台设备</span>
          <div class="op">
            <a-button type="link" size="small" @click="startEdit(a)">编辑</a-button>
            <a-tooltip :title="areaCount(a) ? '该区域下还有设备，不能删除' : ''"><a-button type="link" size="small" danger :disabled="!!areaCount(a)" @click="del(a)">删除</a-button></a-tooltip>
          </div>
        </template>
      </li>
      <li v-if="!AREAS.length" class="muted am-empty">暂无区域</li>
    </ul>
    <div class="am-add">
      <a-input v-model:value="added" placeholder="新区域名称，如：E 区 · 仓储区" :maxlength="20" @press-enter="add" />
      <a-button type="primary" @click="add"><PlusOutlined />添加</a-button>
    </div>
  </a-modal>
</template>

<style scoped>
.am-list { list-style: none; margin: 12px 0 0; padding: 0; max-height: 380px; overflow-y: auto; }
.am-list li { display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 6px 4px; }
.am-list li + li { border-top: 1px dashed var(--line); }
.am-list b { font-weight: 500; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.am-list .n { font-size: 12px; }
.am-list .op { display: flex; }
.am-edit { flex: 1; }
.am-empty { justify-content: center; }
.am-add { display: flex; gap: 8px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line); }
</style>
