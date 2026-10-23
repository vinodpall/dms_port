<script setup lang="ts">
/** 型号详情弹窗：图片 + 基本信息 + 设备数量 + 规格 */
import { computed } from 'vue'
import DeviceGlyph from '@/components/proto/DeviceGlyph.vue'
import { STATUSES, STATUS_META, typeMeta, type DeviceModel } from '@/models/device'
import { fleet } from './store'

const props = defineProps<{ open: boolean; model: DeviceModel | null }>()
const emit = defineEmits<{ 'update:open': [boolean]; edit: [DeviceModel] }>()

const m = computed(() => props.model)
const devs = computed(() => fleet.devices.filter((d) => d.modelId === m.value?.id))
const volt = computed(() => (m.value?.voltMin != null || m.value?.voltMax != null ? `${m.value?.voltMin ?? '—'} ~ ${m.value?.voltMax ?? '—'} V` : '—'))
const specs = computed(() => m.value ? [
  ['最高速度', m.value.spec.speed], ['续航', m.value.spec.endurance], ['负载', m.value.spec.payload],
  ['重量', m.value.spec.weight], ['工作电压', volt.value], ['尺寸', m.value.size ? `${m.value.size} mm` : ''],
] : [])
</script>

<template>
  <a-modal :open="open" :width="720" :footer="null" :title="null" class="md-modal" @cancel="emit('update:open', false)">
    <div v-if="m" class="md">
      <div class="md-top">
        <div class="md-stage"><img v-if="m.image" :src="m.image" :alt="m.name" /><DeviceGlyph v-else :type="m.type" :size="80" :color="typeMeta(m.type).color" /></div>
        <div class="md-info">
          <span class="md-type" :style="{ color: typeMeta(m.type).color }">{{ typeMeta(m.type).label }}</span>
          <h3>{{ m.name }}</h3>
          <p class="muted">{{ m.vendor }}</p>
          <div class="md-count">
            <div><b>{{ devs.length }}</b><small>台设备</small></div>
            <ul><li v-for="s in STATUSES" :key="s"><a-badge :status="STATUS_META[s].badge" :text="STATUS_META[s].label" /><span class="mono">{{ devs.filter((d) => d.status === s).length }}</span></li></ul>
          </div>
          <div class="md-cams"><span class="muted">摄像头</span><a-tag v-for="c in m.cameras" :key="c" :bordered="false">{{ c }}</a-tag></div>
        </div>
      </div>
      <h4>规格参数</h4>
      <dl class="md-spec"><div v-for="[k, v] in specs" :key="k"><dt>{{ k }}</dt><dd>{{ v && v !== '—' ? v : '—' }}</dd></div></dl>
      <div class="md-foot"><a-button @click="emit('update:open', false)">关闭</a-button><a-button type="primary" @click="emit('edit', m)">编辑型号</a-button></div>
    </div>
  </a-modal>
</template>

<style scoped>
.md { padding-top: 4px; }
.md-top { display: flex; gap: 24px; }
.md-stage { position: relative; flex: none; width: 260px; height: 230px; display: grid; place-items: center; border-radius: 10px; background: radial-gradient(ellipse at 50% 62%, rgba(46,211,230,.12), rgba(10,24,42,.55) 72%); }
.md-stage img { position: absolute; inset: 14px; width: calc(100% - 28px); height: calc(100% - 28px); object-fit: contain; filter: drop-shadow(0 10px 14px rgba(0,0,0,.45)); }
.md-info { flex: 1; min-width: 0; display: flex; flex-direction: column; padding-top: 6px; }
.md-type { font-size: 12.5px; }
.md-info h3 { margin: 2px 0 0; font-size: 24px; font-weight: 600; color: var(--title); line-height: 1.3; }
.md-info p { margin: 2px 0 0; font-size: 13px; }
.md-count { display: flex; align-items: center; gap: 22px; margin-top: 20px; }
.md-count > div b { font-size: 30px; font-weight: 600; font-family: var(--mono); color: var(--title); line-height: 1; }
.md-count > div small { margin-left: 4px; color: var(--muted); font-size: 12px; }
.md-count ul { list-style: none; margin: 0; padding: 0 0 0 22px; border-left: 1px solid var(--line); display: flex; flex-direction: column; gap: 2px; font-size: 12.5px; }
.md-count li { display: flex; align-items: center; gap: 10px; } .md-count li .mono { color: var(--title); }
.md-cams { margin-top: auto; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 12.5px; } .md-cams > span { margin-right: 4px; }
.md h4 { margin: 24px 0 10px; font-size: 13px; font-weight: 500; color: var(--muted); }
.md-spec { margin: 0; display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.md-spec > div { padding: 10px 14px; }
.md-spec > div:nth-child(n+4) { border-top: 1px solid var(--line); }
.md-spec > div:not(:nth-child(3n+1)) { border-left: 1px solid var(--line); }
.md-spec dt { font-size: 12px; color: var(--muted); } .md-spec dd { margin: 2px 0 0; color: var(--title); font-family: var(--mono); font-size: 13.5px; }
.md-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 22px; }
</style>
