<script setup lang="ts">
import { computed } from 'vue'
import { message } from 'ant-design-vue'
import { StopOutlined, SwapOutlined } from '@ant-design/icons-vue'
import { ROBOTS, KIND_META, LOC_META } from '@/mock/biz'
import { curId, robot, rt, hasNav, locText, selectRobot, rts } from './store'

const emit = defineEmits<{ go: [tab: string, sub?: string] }>()
const opts = computed(() => ROBOTS.map((r) => ({ value: r.id, label: `${r.id}  ${r.name}`, disabled: false, r })))
const state = (id: string) => { const r = ROBOTS.find((x) => x.id === id)!; const s = rts[id]; return !r.online ? { t: '离线', c: '#5B7486' } : s.run ? { t: '任务中', c: '#26C6DA' } : { t: '在线', c: '#4DE8B0' } }
const estop = () => message.error(`${robot.value.name} 已触发软件急停`)
</script>

<template>
  <div class="rb">
    <div class="rb-sel">
      <small>当前机器人</small>
      <a-select :value="curId" :options="opts" :bordered="false" popup-class-name="rb-pop" :dropdown-match-select-width="300" @change="(v: any) => selectRobot(String(v))">
        <template #option="{ r }">
          <div class="rb-opt"><i :style="{ background: state(r.id).c }" /><b class="mono">{{ r.id }}</b><span>{{ r.name }}</span><em>{{ LOC_META[r.loc as 'lidar' | 'ins'].s }}</em><small>{{ state(r.id).t }}</small></div>
        </template>
      </a-select>
      <SwapOutlined class="rb-swap" />
    </div>
    <div class="rb-items">
      <div><small>类型</small><b>{{ KIND_META[robot.kind].t }} · {{ robot.model }}</b></div>
      <div><small>定位方式</small><b :style="{ color: LOC_META[robot.loc].c }">{{ LOC_META[robot.loc].t }}</b><a-tag v-if="robot.rtk" class="rb-tag" color="green">RTK</a-tag></div>
      <div><small>定位状态</small><b><a-badge :status="!robot.online ? 'default' : hasNav ? (rt.locOk ? 'success' : 'processing') : 'warning'" />{{ !robot.online ? '设备离线' : locText }}<span v-if="hasNav && !rt.locOk" class="muted"> · 定位中</span></b></div>
      <div class="task"><small>当前任务</small>
        <b v-if="rt.run" class="ellipsis"><a class="lk" @click="emit('go', 'task')">{{ rt.run.name }}</a></b>
        <b v-else-if="rt.trackRec" style="color:#FF6B6B">● 路线录制中</b>
        <b v-else-if="rt.bagRec" style="color:#FF6B6B">● 录包中</b>
        <b v-else class="muted">空闲</b>
        <a-progress v-if="rt.run" :percent="Math.round(rt.run.progress * 100)" size="small" stroke-color="#26C6DA" :show-info="false" style="width:90px;margin:0" />
      </div>
      <div><small>电量</small><b class="mono" :class="{ low: robot.online && robot.battery < 30 }">{{ robot.online ? robot.battery + '%' : '--' }}</b></div>
      <div><small>网络延迟</small><b class="mono">{{ robot.online ? robot.latency + ' ms' : '--' }}</b></div>
    </div>
    <a-button danger class="rb-stop" :disabled="!robot.online" @click="estop"><StopOutlined />急停</a-button>
  </div>
</template>

<style scoped>
.rb { display: flex; align-items: center; gap: 18px; margin-bottom: 16px; padding: 10px 16px; background: linear-gradient(90deg, rgba(25,181,165,.12), rgba(10,27,43,.85) 40%); border: 1px solid rgba(77,208,225,.2); border-radius: 4px; }
.rb-sel { position: relative; display: flex; flex-direction: column; padding-right: 18px; border-right: 1px solid var(--line); }
.rb-sel small, .rb-items small { font-size: 11.5px; color: var(--muted); }
.rb-sel :deep(.ant-select) { width: 196px; margin-left: -11px; } .rb-sel :deep(.ant-select-selection-item) { font-size: 16px; font-weight: 600; color: #fff; }
.rb-swap { position: absolute; right: 8px; bottom: 9px; color: var(--faint); font-size: 12px; pointer-events: none; display: none; }
.rb-items { flex: 1; min-width: 0; display: flex; gap: 28px; align-items: center; }
.rb-items > div { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.rb-items b { display: flex; align-items: center; gap: 4px; font-size: 13.5px; font-weight: 500; white-space: nowrap; } .rb-items b.low { color: #FF6B6B; }
.rb-items .task { flex: 1; max-width: 320px; } .rb-items .task b { display: block; overflow: hidden; text-overflow: ellipsis; }
.rb-tag { margin: 0 0 0 4px; font-size: 11px; line-height: 16px; padding: 0 4px; }
.lk { color: var(--cyan); }
.rb-stop { flex: none; }
.rb-opt { display: flex; align-items: center; gap: 8px; } .rb-opt i { width: 7px; height: 7px; border-radius: 50%; } .rb-opt b { font-size: 12.5px; } .rb-opt span { flex: 1; } .rb-opt em { font-style: normal; font-size: 11px; color: var(--muted); } .rb-opt small { font-size: 11px; color: var(--faint); }
</style>
