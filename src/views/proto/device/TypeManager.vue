<script setup lang="ts">
/** 设备类型管理：查看全部类型，新增 / 编辑 / 删除（有型号引用的类型不能删除） */
import { reactive, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined, LeftOutlined } from '@ant-design/icons-vue'
import DeviceGlyph from '@/components/proto/DeviceGlyph.vue'
import { TYPES, TYPE_META, type DeviceType, type GlyphKey } from '@/models/device'
import { removeType, saveType, typeDeviceCount, typeModelCount } from './store'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [boolean] }>()

const ICONS: { k: GlyphKey; l: string }[] = [{ k: 'quadruped', l: '四足' }, { k: 'ugv', l: '轮式' }, { k: 'uav', l: '飞行' }, { k: 'humanoid', l: '人形' }, { k: 'generic', l: '通用' }]
const COLORS = ['#5B9BFF', '#45E3A8', '#B48CFF', '#2ED3E6', '#FFC15C', '#FF8FB1', '#7FD1FF', '#A3E36B']

const mode = ref<'list' | 'edit'>('list')
const editId = ref<DeviceType | null>(null)
const f = reactive({ label: '', icon: 'generic' as GlyphKey, color: COLORS[0], teleop: false })
const formRef = ref()
watch(() => props.open, (v) => { if (v) mode.value = 'list' })

const edit = (t?: DeviceType) => {
  editId.value = t ?? null
  const m = t ? TYPE_META[t] : null
  Object.assign(f, m ? { label: m.label, icon: m.icon, color: m.color, teleop: m.teleop } : { label: '', icon: 'generic', color: COLORS[TYPES.length % COLORS.length], teleop: false })
  mode.value = 'edit'; formRef.value?.clearValidate()
}
const rules = { label: [{ required: true, validator: async (_: unknown, v: string) => {
  if (!v?.trim()) throw new Error('请输入类型名称')
  if (TYPES.some((t) => t !== editId.value && TYPE_META[t].label === v.trim())) throw new Error('已存在同名类型')
} }] }
async function submit() {
  await formRef.value.validate()
  saveType(editId.value, { ...f, label: f.label.trim() })
  message.success(editId.value ? '已保存' : '类型已添加'); mode.value = 'list'
}
const del = (t: DeviceType) => Modal.confirm({ title: `删除类型「${TYPE_META[t].label}」？`, okText: '删除', okType: 'danger', cancelText: '取消', onOk: () => { removeType(t); message.success('已删除') } })
</script>

<template>
  <a-modal :open="open" :width="600" :footer="null" @cancel="emit('update:open', false)">
    <template #title>
      <span v-if="mode === 'list'">设备类型</span>
      <span v-else class="tm-back" @click="mode = 'list'"><LeftOutlined />{{ editId ? '编辑类型' : '新增类型' }}</span>
    </template>

    <template v-if="mode === 'list'">
      <ul class="tm-list">
        <li v-for="t in TYPES" :key="t">
          <span class="ic" :style="{ background: TYPE_META[t].color + '1f' }"><DeviceGlyph :type="t" :size="24" :color="TYPE_META[t].color" /></span>
          <div class="n"><b>{{ TYPE_META[t].label }}</b><small class="muted">{{ typeModelCount(t) }} 个型号 · {{ typeDeviceCount(t) }} 台设备</small></div>
          <a-tag v-if="TYPE_META[t].teleop" :bordered="false" color="cyan">可遥操作</a-tag>
          <div class="op">
            <a-button type="link" size="small" @click="edit(t)">编辑</a-button>
            <a-tooltip :title="typeModelCount(t) ? '该类型下还有型号，不能删除' : ''"><a-button type="link" size="small" danger :disabled="!!typeModelCount(t)" @click="del(t)">删除</a-button></a-tooltip>
          </div>
        </li>
      </ul>
      <a-button block class="tm-add" @click="edit()"><PlusOutlined />新增类型</a-button>
    </template>

    <a-form v-else ref="formRef" :model="f" :rules="rules" layout="vertical" style="margin-top: 12px">
      <a-form-item label="类型名称" name="label"><a-input v-model:value="f.label" placeholder="如：机械臂" :maxlength="12" /></a-form-item>
      <a-form-item label="图标">
        <div class="tm-icons">
          <button v-for="x in ICONS" :key="x.k" type="button" :class="{ on: f.icon === x.k }" @click="f.icon = x.k"><DeviceGlyph :type="x.k" :size="28" :color="f.color" /><span>{{ x.l }}</span></button>
        </div>
      </a-form-item>
      <a-form-item label="颜色">
        <div class="tm-colors"><button v-for="c in COLORS" :key="c" type="button" :class="{ on: f.color === c }" :style="{ background: c }" @click="f.color = c" /></div>
      </a-form-item>
      <a-form-item label="支持遥操作" extra="开启后，该类型的设备在列表和详情中显示「遥操作」入口"><a-switch v-model:checked="f.teleop" /></a-form-item>
      <div class="tm-foot"><a-button @click="mode = 'list'">取消</a-button><a-button type="primary" @click="submit">{{ editId ? '保存' : '添加' }}</a-button></div>
    </a-form>
  </a-modal>
</template>

<style scoped>
.tm-back { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; } .tm-back:hover { color: #2ED3E6; }
.tm-list { list-style: none; margin: 12px 0 0; padding: 0; max-height: 420px; overflow-y: auto; }
.tm-list li { display: flex; align-items: center; gap: 12px; padding: 10px 4px; }
.tm-list li + li { border-top: 1px dashed var(--line); }
.tm-list .ic { width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center; flex: none; }
.tm-list .n { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; } .tm-list .n b { font-weight: 500; } .tm-list .n small { font-size: 12px; }
.tm-list .op { display: flex; }
.tm-add { margin-top: 12px; border-style: dashed; }
.tm-icons { display: flex; gap: 10px; }
.tm-icons button { width: 72px; padding: 8px 0 6px; display: flex; flex-direction: column; align-items: center; gap: 4px; border: 1px solid var(--line); border-radius: 8px; background: rgba(10,24,42,.35); font: inherit; font-size: 12px; color: var(--muted); cursor: pointer; }
.tm-icons button.on { border-color: #2ED3E6; color: #2ED3E6; background: rgba(46,211,230,.08); }
.tm-colors { display: flex; gap: 10px; }
.tm-colors button { width: 26px; height: 26px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; box-shadow: inset 0 0 0 2px rgba(10,24,42,.6); }
.tm-colors button.on { border-color: #fff; }
.tm-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
</style>
