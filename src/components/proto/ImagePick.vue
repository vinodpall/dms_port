<script setup lang="ts">
/** 图片上传框：选择后自动裁边、压缩，预览按等比缩放居中显示；说明文字放在空框内，已上传时框下显示更换 / 移除 */
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { fitImage } from './imageFit'

const props = withDefaults(defineProps<{ value?: string; width?: number; height?: number; max?: number; hint?: string }>(), { width: 140, height: 140, max: 720 })
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
  <div class="ip" :style="{ width: width + 'px' }">
    <button type="button" class="box" :class="{ has: value }" :style="{ height: height + 'px' }" @click="input?.click()">
      <img v-if="value" :src="value" alt="" />
      <span v-else class="ph"><PlusOutlined /><em>{{ busy ? '处理中…' : '上传图片' }}</em><small v-if="hint">{{ hint }}</small></span>
    </button>
    <div v-if="value" class="acts"><a @click="input?.click()">更换</a><a class="del" @click="emit('update:value', undefined)">移除</a></div>
    <input ref="input" type="file" accept="image/png,image/webp,image/jpeg,image/svg+xml" hidden @change="pick" />
  </div>
</template>

<style scoped>
.ip { display: flex; flex-direction: column; gap: 6px; }
.box { width: 100%; padding: 10px; display: grid; place-items: center; border: 1px dashed rgba(46,211,230,.35); border-radius: 8px; background: radial-gradient(ellipse at 50% 60%, rgba(46,211,230,.08), rgba(10,24,42,.4) 70%); cursor: pointer; transition: border-color .15s; overflow: hidden; }
.box.has { border-style: solid; border-color: var(--line); }
.box:hover { border-color: #2ED3E6; }
.box img { width: 100%; height: 100%; min-height: 0; object-fit: contain; display: block; }
.ph { display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--muted); font-size: 18px; text-align: center; }
.ph em { font-style: normal; font-size: 13px; color: var(--text); }
.ph small { font-size: 11.5px; line-height: 1.5; padding: 0 4px; }
.acts { display: flex; justify-content: center; gap: 16px; font-size: 12.5px; } .acts .del { color: var(--bad); }
</style>
