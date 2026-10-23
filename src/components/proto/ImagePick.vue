<script setup lang="ts">
/** 图片上传框：选择后自动裁边、压缩，预览按等比缩放居中显示 */
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { fitImage } from './imageFit'

const props = withDefaults(defineProps<{ value?: string; size?: number; max?: number; hint?: string }>(), { size: 112, max: 720 })
const emit = defineEmits<{ 'update:value': [string | undefined] }>()
const busy = ref(false)
const input = ref<HTMLInputElement>()

async function pick(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!f) return
  if (!f.type.startsWith('image/')) return message.warning('请选择图片文件')
  if (f.size > 10 * 1024 * 1024) return message.warning('图片不能超过 10 MB')
  busy.value = true
  try { emit('update:value', await fitImage(f, props.max)) } catch { message.error('图片读取失败') } finally { busy.value = false }
}
</script>

<template>
  <div class="ip">
    <button type="button" class="box" :style="{ width: size + 'px', height: size + 'px' }" @click="input?.click()">
      <img v-if="value" :src="value" alt="" />
      <span v-else class="ph"><PlusOutlined /><small>{{ busy ? '处理中…' : '上传' }}</small></span>
    </button>
    <div class="side">
      <small v-if="hint" class="muted">{{ hint }}</small>
      <div v-if="value" class="acts"><a @click="input?.click()">更换</a><a class="del" @click="emit('update:value', undefined)">移除</a></div>
    </div>
    <input ref="input" type="file" accept="image/png,image/webp,image/jpeg,image/svg+xml" hidden @change="pick" />
  </div>
</template>

<style scoped>
.ip { display: flex; align-items: flex-end; gap: 12px; }
.box { flex: none; padding: 8px; display: grid; place-items: center; border: 1px dashed rgba(46,211,230,.35); border-radius: 8px; background: radial-gradient(ellipse at 50% 60%, rgba(46,211,230,.08), rgba(10,24,42,.4) 70%); cursor: pointer; transition: border-color .15s; }
.box:hover { border-color: #2ED3E6; }
.box img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
.ph { display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--muted); font-size: 16px; } .ph small { font-size: 12px; }
.side { display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
.acts { display: flex; gap: 12px; } .acts .del { color: var(--bad); }
</style>
