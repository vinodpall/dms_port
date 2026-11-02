<script setup lang="ts">
import { computed, ref } from 'vue'
import { LoadingOutlined } from '@ant-design/icons-vue'
import DeviceGlyph from '@/components/proto/DeviceGlyph.vue'
import CamShot from './CamShot.vue'
import TelemetryGrid from '@/components/plugin/TelemetryGrid.vue'
import ControlPanel from '@/components/plugin/ControlPanel.vue'
import ChessBoard from '@/components/plugin/ChessBoard.vue'
import CmdList from '@/components/plugin/CmdList.vue'
import LogList from '@/components/plugin/LogList.vue'
import CapTags from '@/components/plugin/CapTags.vue'
import { KIND_META } from '@/mock/biz'
import { pluginOf } from '@/plugins/catalog'
import { busyOf, stateOf } from '@/plugins/runtime'
import { robot, desc, hasCap } from './store'

const st = computed(() => stateOf(robot.value.id))
const on = computed(() => robot.value.online && !!st.value?.online)
const busy = computed(() => busyOf(robot.value.id))
const plugin = computed(() => pluginOf(desc.value.pluginId))
const cams = computed(() => desc.value.video ?? [])
const cam = ref(0)
const chess = computed(() => hasCap('custom:chess'))
const status = computed(() =>
  !on.value ? { t: '离线', c: '#8EA6BE' }
  : st.value?.status === 'fault' ? { t: '故障', c: '#FF6B6B' }
  : busy.value ? { t: '执行中', c: '#26C6DA' }
  : { t: '空闲待命', c: '#45E3A8' }
)
const kpis = computed(() =>
  desc.value.telemetry.filter((f) => f.display.includes('kpi') && f.type !== 'pose2d').length
)
const tab = ref<'cmd' | 'log'>('cmd')
</script>

<template>
  <div class="sh">
    <div class="sh-main">
      <section v-if="cams.length || chess" class="pp-panel sh-view" :class="{ duo: cams.length && chess }">
        <div v-if="cams.length" class="sh-cam">
          <div class="pp-panel-h">
            <h3>实时画面</h3>
            <div v-if="cams.length > 1" class="r">
              <a-radio-group v-model:value="cam" size="small" button-style="solid">
                <a-radio-button v-for="(c, i) in cams" :key="c.key" :value="i">{{ c.label }}</a-radio-button>
              </a-radio-group>
            </div>
          </div>
          <div class="sh-screen">
            <CamShot v-if="on" :seed="cam + robot.id.length * 5" :ir="cams[cam]?.ir" />
            <div v-else class="sh-empty">设备离线，暂无画面</div>
            <span v-if="on" class="sh-live"><i />LIVE · {{ cams[cam]?.label }}</span>
          </div>
        </div>
        <div v-if="chess" class="sh-chess">
          <div class="pp-panel-h"><h3>棋局</h3></div>
          <div class="sh-board"><ChessBoard :state="st" :size="300" /></div>
        </div>
      </section>

      <section class="pp-panel sh-skill">
        <div class="pp-panel-h">
          <h3>技能与服务</h3>
          <span class="r muted sh-hint">点击卡片下发指令，带参数的技能会先弹出参数表单</span>
        </div>
        <div class="sh-ctl">
          <ControlPanel :device-id="robot.id" :desc="desc" scope="biz" variant="cards" :cols="cams.length || chess ? 4 : 3" />
        </div>
      </section>
    </div>

    <aside class="sh-side">
      <section class="pp-panel sh-hero">
        <span class="sh-ic" :style="{ '--c': KIND_META[robot.kind].c }">
          <DeviceGlyph :type="KIND_META[robot.kind].glyph" :size="40" :color="KIND_META[robot.kind].c" />
        </span>
        <div class="sh-ht">
          <b>{{ robot.name }}</b>
          <small class="muted mono">{{ robot.id }} · {{ robot.ip }}</small>
          <span class="sh-st" :style="{ '--c': status.c }"><i />{{ status.t }}</span>
        </div>
        <div v-if="busy" class="sh-busy"><LoadingOutlined /> 正在执行「{{ busy.label }}」</div>
        <div class="sh-meta">
          <span><em>位置</em>{{ robot.site }}</span>
          <span><em>插件</em>{{ plugin?.name ?? '—' }}</span>
        </div>
        <CapTags :caps="desc.capabilities" scope="biz" small class="sh-caps" />
      </section>

      <section v-if="kpis" class="pp-panel">
        <div class="pp-panel-h"><h3>实时数据</h3></div>
        <TelemetryGrid :desc="desc" :state="on ? st : undefined" display="kpi" :cols="2" />
      </section>

      <section class="pp-panel sh-rec">
        <div class="pp-panel-h">
          <a-radio-group v-model:value="tab" size="small" button-style="solid">
            <a-radio-button value="cmd">执行记录</a-radio-button>
            <a-radio-button value="log">设备日志</a-radio-button>
          </a-radio-group>
        </div>
        <div class="sh-list">
          <CmdList v-if="tab === 'cmd'" :device-id="robot.id" :limit="12" />
          <LogList v-else :device-id="robot.id" :limit="12" :filter="false" />
        </div>
      </section>
    </aside>
  </div>
</template>

<style scoped>
.sh { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 14px; align-items: start; }
.sh-main, .sh-side { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.sh-view { display: grid; grid-template-columns: 1fr; }
.sh-view.duo { grid-template-columns: 1.4fr 1fr; }
.sh-view.duo .sh-chess { border-left: 1px solid var(--line); }
.sh-screen { position: relative; height: 340px; margin: 12px; border-radius: 6px; overflow: hidden; background: #0b1726; }
.sh-screen :deep(svg) { width: 100%; height: 100%; display: block; }
.sh-live { position: absolute; left: 10px; top: 10px; padding: 2px 8px; border-radius: 3px; background: rgba(0,0,0,.45); color: #fff; font-size: 11.5px; display: flex; align-items: center; gap: 6px; }
.sh-live i { width: 6px; height: 6px; border-radius: 50%; background: #FF5A5A; }
.sh-empty { height: 100%; display: grid; place-items: center; color: var(--muted); font-size: 13px; }
.sh-board { display: grid; place-items: center; padding: 14px; min-height: 340px; }
.sh-hint { font-size: 12px; }
.sh-ctl { padding: 14px 16px 16px; }
.sh-hero { padding: 16px; display: grid; grid-template-columns: auto 1fr; gap: 12px 14px; }
.sh-ic { width: 60px; height: 60px; display: grid; place-items: center; border-radius: 12px; background: color-mix(in srgb, var(--c) 12%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.sh-ht { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.sh-ht b { font-size: 17px; color: var(--title); }
.sh-ht small { font-size: 12px; }
.sh-st { align-self: flex-start; margin-top: 4px; display: inline-flex; align-items: center; gap: 6px; padding: 1px 9px; font-size: 12px; color: var(--c); border-radius: 10px; background: color-mix(in srgb, var(--c) 12%, transparent); }
.sh-st i { width: 6px; height: 6px; border-radius: 50%; background: var(--c); }
.sh-busy { grid-column: 1 / -1; padding: 7px 10px; font-size: 12.5px; color: #9FE6EF; border-radius: 6px; background: rgba(46,211,230,.08); border: 1px solid rgba(46,211,230,.25); }
.sh-meta { grid-column: 1 / -1; display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; }
.sh-meta em { font-style: normal; color: var(--faint); margin-right: 10px; }
.sh-caps { grid-column: 1 / -1; }
.sh-list { padding: 4px 14px 10px; max-height: 360px; overflow: auto; }
</style>
