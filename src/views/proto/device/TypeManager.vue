<script setup lang="ts">
/** 设备类型管理：查看全部类型，新增 / 编辑 / 删除（有型号引用的类型不能删除） */
import { reactive, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined, LeftOutlined, CloseOutlined } from '@ant-design/icons-vue'
import DeviceGlyph from '@/components/proto/DeviceGlyph.vue'
import { fitImage } from '@/components/proto/imageFit'
import { TYPES, TYPE_META, type DeviceType, type GlyphKey } from '@/models/device'
import { removeType, saveType, typeDeviceCount, typeModelCount } from './store'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [boolean] }>()

const ICONS: { k: GlyphKey; l: string }[] = [{ k: 'quadruped', l: '四足' }, { k: 'ugv', l: '轮式' }, { k: 'uav', l: '飞行' }, { k: 'humanoid', l: '人形' }, { k: 'generic', l: '通用' }]
const COLORS = ['#5B9BFF', '#45E3A8', '#B48CFF', '#2ED3E6', '#FFC15C', '#FF8FB1', '#7FD1FF', '#A3E36B']

const mode = ref<'list' | 'edit'>('list')
const editId = ref<DeviceType | null>(null)
const f = reactive({ label: '', icon: 'generic' as GlyphKey, img: undefined as string | undefined, color: COLORS[0], teleop: false })
const formRef = ref()
/* 自定义图标：与内置图标同排，选中后优先使用 */
const upInput = ref<HTMLInputElement>()
const upBusy = ref(false)
async function pickIcon(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]; (e.target as HTMLInputElement).value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) return message.warning('请选择图片文件')
  upBusy.value = true
  try { f.img = await fitImage(file, 128) } catch { message.error('图片读取失败') } finally { upBusy.value = false }
}
watch(() => props.open, (v) => { if (v) mode.value = 'list' })

const edit = (t?: DeviceType) => {
  editId.value = t ?? null
  const m = t ? TYPE_META[t] : null
  Object.assign(f, m ? { label: m.label, icon: m.icon, img: m.img, color: m.color, teleop: m.teleop } : { label: '', icon: 'generic', img: undefined, color: COLORS[TYPES.length % COLORS.length], teleop: false })
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
      <a-form-item label="图标" extra="也可点击「上传」使用自定义图标，建议正方形透明底">
        <div class="tm-icons">
          <button v-for="x in ICONS" :key="x.k" type="button" :class="{ on: !f.img && f.icon === x.k }" @click="f.icon = x.k; f.img = undefined"><DeviceGlyph :type="x.k" :size="28" :color="f.color" /><span>{{ x.l }}</span></button>
          <button type="button" class="up" :class="{ on: !!f.img }" title="上传自定义图标" @click="upInput?.click()">
            <template v-if="f.img"><img :src="f.img" alt="" /><span>自定义</span><i class="rm" title="移除" @click.stop="f.img = undefined"><CloseOutlined /></i></template>
            <template v-else><PlusOutlined class="plus" /><span>{{ upBusy ? '处理中' : '上传' }}</span></template>
          </button>
          <input ref="upInput" type="file" accept="image/png,image/webp,image/jpeg,image/svg+xml" hidden @change="pickIcon" />
        </div>
      </a-form-item>
      <a-form-item label="颜色">
        <div class="tm-colors"><button v-for="c in COLORS" :key="c" type="button" :class="{ on: f.color === c }" :style="{ background: c }" @click="f.color = c" /></div>
      </a-form-item>
      <div class="tm-switch">
        <div><b>支持遥操作</b><small class="muted">开启后，该类型的设备在列表和详情中显示「遥操作」入口</small></div>
        <a-switch v-model:checked="f.teleop" />
      </div>
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
.tm-icons { display: flex; gap: 10px; margin-bottom: 6px; }
.tm-icons button { position: relative; flex: 1; min-width: 0; height: 64px; justify-content: center; padding: 8px 0 6px; display: flex; flex-direction: column; align-items: center; gap: 4px; border: 1px solid var(--line); border-radius: 8px; background: rgba(10,24,42,.35); font: inherit; font-size: 12px; color: var(--muted); cursor: pointer; }
.tm-icons button.on { border-color: #2ED3E6; color: #2ED3E6; background: rgba(46,211,230,.08); }
.tm-icons button:not(.on):hover { border-color: rgba(46,211,230,.45); color: var(--text); }
.tm-icons .up { border-style: dashed; border-color: rgba(46,211,230,.35); }
.tm-icons .up .plus { font-size: 18px; line-height: 28px; }
.tm-icons .up img { width: 28px; height: 28px; object-fit: contain; }
.tm-icons .rm { position: absolute; top: -7px; right: -7px; width: 18px; height: 18px; display: grid; place-items: center; border-radius: 50%; background: #3a4c66; color: #fff; font-size: 9px; font-style: normal; }
.tm-icons .rm:hover { background: var(--bad); }
.tm-switch { display: flex; align-items: center; gap: 16px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 8px; background: rgba(10,24,42,.3); }
.tm-switch > div { flex: 1; display: flex; flex-direction: column; gap: 2px; } .tm-switch b { font-weight: 500; } .tm-switch small { font-size: 12px; }
.tm-colors { display: flex; gap: 10px; }
.tm-colors button { width: 26px; height: 26px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; box-shadow: inset 0 0 0 2px rgba(10,24,42,.6); }
.tm-colors button.on { border-color: #fff; }
.tm-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
</style>
