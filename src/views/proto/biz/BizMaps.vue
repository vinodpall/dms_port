<script setup lang="ts">
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlusOutlined, DragOutlined, EditOutlined, ClearOutlined, BorderOutlined, LineOutlined, UndoOutlined, ZoomInOutlined, ZoomOutOutlined, SaveOutlined,
  VideoCameraOutlined, ScissorOutlined, NodeIndexOutlined, DeleteOutlined, ReloadOutlined, CheckCircleFilled, CloudUploadOutlined, BuildOutlined,
} from '@ant-design/icons-vue'
import BizMap from './BizMap.vue'
import { MAPS, ROUTES, BAGS, ZONES, ROBOTS, type BizMap as TMap, type BizRoute } from '@/mock/biz'

const tab = ref<'map' | 'route' | 'bag'>('map')
const ok = (t: string) => message.success(`${t}（原型演示）`)

/* 地图 */
const cur = ref<TMap>(MAPS[0])
const view = ref<'grid' | 'cloud'>('grid')
const tool = ref('drag')
const TOOLS = [
  { k: 'drag', t: '拖动', i: DragOutlined }, { k: 'pen', t: '画笔', i: EditOutlined }, { k: 'eraser', t: '橡皮擦', i: ClearOutlined },
  { k: 'zone', t: '绘制功能区', i: BorderOutlined }, { k: 'line', t: '绘制虚拟墙', i: LineOutlined },
]
const brush = ref(4)
const ZONE_LIST = [
  { n: '禁行区-配电柜前', k: 'forbid' }, { n: '禁行区-机房 3 排', k: 'forbid' }, { n: '东侧楼梯', k: 'stair' }, { n: '电池室坡道', k: 'slope' }, { n: '消防通道窄道', k: 'narrow' }, { n: '变压器室草坪', k: 'grass' },
]
const zoneMeta = (k: string) => ZONES.find((z) => z.k === k)!
const kindColor: Record<string, string> = { 栅格地图: 'cyan', 点云地图: 'purple', 融合地图: 'blue' }

/* 新建地图向导 */
const wizOpen = ref(false)
const step = ref(0)
const recording = ref(false)
const STEPS = [{ title: '录包采集' }, { title: '生成点云地图' }, { title: '生成栅格地图' }, { title: '完成' }]

/* 路线 */
const rmap = ref(MAPS[0].name)
const routes = computed(() => ROUTES.filter((r) => r.map === rmap.value))
const route = ref<BizRoute>(ROUTES[0])
const rec = ref(false)
const drawType = ref('直线')
const stepLen = ref(0.5)
</script>

<template>
  <div class="pp-head">
    <div><h2>地图与路线</h2><p>录包建图、地图编辑与功能区划设，循迹路线录制与编辑，数据包文件管理</p></div>
    <div class="r">
      <a-button v-if="tab === 'map'" type="primary" @click="wizOpen = true; step = 0"><PlusOutlined />新建地图</a-button>
      <a-button v-else-if="tab === 'route'" type="primary" @click="rec = !rec"><VideoCameraOutlined />{{ rec ? '停止录制' : '录制路线' }}</a-button>
      <a-button v-else type="primary" @click="wizOpen = true; step = 0"><VideoCameraOutlined />开始录包</a-button>
    </div>
  </div>
  <a-segmented v-model:value="tab" class="mp-seg" :options="[{ value: 'map', label: '地图' }, { value: 'route', label: '路线' }, { value: 'bag', label: '数据包' }]" />

  <!-- 地图 -->
  <div v-if="tab === 'map'" class="mp">
    <div class="pp-panel mp-list">
      <div class="pp-panel-h"><h3>地图列表</h3><span class="muted" style="font-size:12px">{{ MAPS.length }} 张</span></div>
      <button v-for="m in MAPS" :key="m.id" type="button" class="mp-item" :class="{ on: cur.id === m.id }" @click="cur = m">
        <span class="th"><BizMap :seed="m.seed" :mode="m.name === '室外园区' ? 'sat' : m.kind === '点云地图' ? 'cloud' : 'grid'" :zones="false" :route="null" :labels="false" /></span>
        <span class="b"><span class="t"><b>{{ m.name }}</b><a-tag v-if="m.current" color="green" class="cur">当前</a-tag></span><small><a-tag :color="kindColor[m.kind]">{{ m.kind }}</a-tag>{{ m.area.toLocaleString('en-US') }} m² · {{ m.routes }} 条路线</small></span>
      </button>
    </div>
    <div class="mp-detail">
      <div class="pp-panel mp-hd">
        <div><span class="mono muted">{{ cur.id }}</span><h3>{{ cur.name }}</h3></div>
        <a-tag :color="kindColor[cur.kind]">{{ cur.kind }}</a-tag>
        <span class="meta">分辨率 <b class="mono">{{ cur.res }} m/px</b></span><span class="meta">尺寸 <b class="mono">{{ cur.size }}</b></span><span class="meta">建图机器人 <b class="mono">{{ cur.robot }}</b></span><span class="meta">更新 <b class="mono">{{ cur.updated }}</b></span>
        <a-space class="r"><a-button :disabled="cur.current" @click="ok('已切换为当前地图')">{{ cur.current ? '当前使用中' : '设为当前地图' }}</a-button><a-button danger><DeleteOutlined /></a-button></a-space>
      </div>
      <div class="mp-row">
        <div class="pp-panel mp-edit">
          <div class="pp-panel-h"><h3>地图编辑</h3>
            <a-radio-group v-model:value="view" size="small"><a-radio-button value="grid">栅格图</a-radio-button><a-radio-button value="cloud">点云图</a-radio-button></a-radio-group>
            <span class="r"><a-button size="small"><UndoOutlined />撤销</a-button><a-button size="small"><ReloadOutlined />初始化</a-button><a-button size="small" type="primary" @click="ok('地图已保存')"><SaveOutlined />保存地图</a-button></span>
          </div>
          <div class="mp-canvas">
            <div class="tools">
              <a-tooltip v-for="t in TOOLS" :key="t.k" :title="t.t" placement="right"><button type="button" :class="{ on: tool === t.k }" @click="tool = t.k"><component :is="t.i" /></button></a-tooltip>
              <i class="sep" />
              <a-tooltip title="放大" placement="right"><button type="button"><ZoomInOutlined /></button></a-tooltip>
              <a-tooltip title="缩小" placement="right"><button type="button"><ZoomOutOutlined /></button></a-tooltip>
            </div>
            <div class="cv"><BizMap :key="cur.id + view" :seed="cur.seed" :mode="cur.name === '室外园区' && view === 'grid' ? 'sat' : view" :route="null" edit /></div>
            <div v-if="tool === 'pen' || tool === 'eraser'" class="brush"><span>{{ tool === 'pen' ? '画笔' : '橡皮擦' }}大小</span><a-slider v-model:value="brush" :min="1" :max="20" style="width:140px" /><b class="mono">{{ brush }} px</b></div>
            <div class="legend"><span v-for="z in ZONES" :key="z.k"><i :style="{ borderColor: z.c, background: z.c + '33' }" />{{ z.t }}</span></div>
          </div>
        </div>
        <div class="pp-panel mp-zones">
          <div class="pp-panel-h"><h3>功能区</h3><span class="muted" style="font-size:12px">{{ ZONE_LIST.length }} 个</span><a-button size="small" class="r" @click="tool = 'zone'"><PlusOutlined />添加</a-button></div>
          <ul><li v-for="z in ZONE_LIST" :key="z.n"><i :style="{ borderColor: zoneMeta(z.k).c, background: zoneMeta(z.k).c + '33' }" /><div><b>{{ z.n }}</b><small>{{ zoneMeta(z.k).t }} · 区域</small></div><a-button type="text" size="small" danger><DeleteOutlined /></a-button></li></ul>
          <div class="pp-panel-h" style="border-top:1px solid rgba(77,208,225,.1)"><h3>建图信息</h3></div>
          <div class="kv"><span>数据包</span><b class="mono">{{ BAGS.find((b) => b.map === cur.name)?.name ?? '—' }}</b><span>定位方式</span><b>{{ cur.kind === '融合地图' ? '激光 + GNSS 融合' : '激光 SLAM' }}</b><span>面积</span><b class="mono">{{ cur.area.toLocaleString('en-US') }} m²</b><span>关联路线</span><b class="mono">{{ cur.routes }} 条</b></div>
        </div>
      </div>
    </div>
  </div>

  <!-- 路线 -->
  <div v-else-if="tab === 'route'" class="mp">
    <div class="pp-panel mp-list">
      <div class="mp-filter"><a-select v-model:value="rmap" style="width:100%" :options="MAPS.map((m) => ({ value: m.name, label: m.name }))" @change="route = routes[0] ?? route" /></div>
      <button v-for="r in routes" :key="r.id" type="button" class="mp-item r2" :class="{ on: route.id === r.id }" @click="route = r">
        <span class="ic"><NodeIndexOutlined /></span>
        <span class="b"><span class="t"><b>{{ r.name }}</b><a-tag v-if="r.closed" class="cur">闭环</a-tag></span><small class="mono">{{ r.len }} m · {{ r.pts }} 点 · {{ r.created }}</small></span>
      </button>
      <div v-if="!routes.length" class="muted" style="padding:24px;text-align:center;font-size:13px">该地图暂无路线</div>
    </div>
    <div class="mp-detail">
      <div class="pp-panel mp-hd">
        <div><span class="mono muted">{{ route.id }}</span><h3>{{ route.name }}</h3></div>
        <a-tag v-if="route.smooth" color="green">已平滑</a-tag><a-tag v-else color="orange">未平滑</a-tag>
        <span class="meta">所属地图 <b>{{ route.map }}</b></span><span class="meta">长度 <b class="mono">{{ route.len }} m</b></span><span class="meta">轨迹点 <b class="mono">{{ route.pts }}</b></span>
        <a-space class="r"><a-button @click="ok('轨迹平滑完成')"><BuildOutlined />轨迹平滑</a-button><a-button danger><DeleteOutlined />删除路线</a-button></a-space>
      </div>
      <div class="pp-panel mp-edit">
        <div class="pp-panel-h"><h3>路线编辑</h3>
          <a-radio-group v-model:value="drawType" size="small"><a-radio-button value="选段">选段</a-radio-button><a-radio-button value="直线">直线绘制</a-radio-button><a-radio-button value="曲线">曲线绘制</a-radio-button></a-radio-group>
          <span class="muted" style="font-size:12px;margin-left:8px">步长</span><a-input-number v-model:value="stepLen" size="small" :step="0.1" :min="0.1" style="width:80px" addon-after="m" />
          <span class="r"><a-button size="small"><UndoOutlined />撤销点</a-button><a-button size="small"><ScissorOutlined />删除选段</a-button><a-button size="small"><ReloadOutlined />重置路线</a-button><a-button size="small" type="primary" @click="ok('路线已保存并上传')"><CloudUploadOutlined />保存上传</a-button></span>
        </div>
        <div class="mp-canvas tall">
          <div class="cv"><BizMap :key="route.id" :seed="route.seed" :mode="route.map === '室外园区' ? 'sat' : 'grid'" :route="ROUTES.indexOf(route) % 4" edit /></div>
          <div v-if="rec" class="rec"><i class="dot" />路线录制中 · 已记录 <b class="mono">128</b> 点 · <span class="mono">02:16</span></div>
          <div class="legend"><span><i class="ln" />路线</span><span><i class="st" />起点</span><span><i class="nd" />轨迹节点（可拖拽编辑）</span></div>
        </div>
      </div>
    </div>
  </div>

  <!-- 数据包 -->
  <div v-else class="pp-panel">
    <a-table :data-source="BAGS" row-key="name" size="middle" :pagination="false"
      :columns="[{ title: '数据包', key: 'name' }, { title: '采集机器人', key: 'robot' }, { title: '关联地图', dataIndex: 'map' }, { title: '大小', dataIndex: 'size' }, { title: '时长', dataIndex: 'dur' }, { title: '采集时间', key: 'time' }, { title: '状态', key: 'state' }, { title: '操作', key: 'op', width: 180 }]">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'"><span class="mono">{{ record.name }}</span></template>
        <template v-else-if="column.key === 'robot'"><span class="mono">{{ record.robot }}</span></template>
        <template v-else-if="column.key === 'time'"><span class="mono">{{ record.time }}</span></template>
        <template v-else-if="column.key === 'state'"><a-badge :status="record.state === '已生成地图' ? 'success' : 'warning'" :text="record.state" /></template>
        <template v-else-if="column.key === 'op'"><a-space><a @click="wizOpen = true; step = 1">生成地图</a><a>下载</a><a class="danger">删除</a></a-space></template>
      </template>
    </a-table>
  </div>

  <!-- 新建地图向导 -->
  <a-modal v-model:open="wizOpen" title="新建地图" :width="720" :footer="null">
    <a-steps :current="step" size="small" :items="STEPS" style="margin:18px 0 22px" />
    <div v-if="step === 0" class="wz">
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="采集机器人"><a-select :value="ROBOTS[0].id" :options="ROBOTS.filter((r) => r.state !== 'offline').map((r) => ({ value: r.id, label: `${r.name}（${r.id}）` }))" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="数据包名称"><a-input value="bag_20261020_1000" /></a-form-item></a-col>
        </a-row>
        <a-form-item label="采集方式"><a-radio-group value="bag"><a-radio value="bag">录包采集（离线建图）</a-radio><a-radio value="online">实时建图（在线 SLAM）</a-radio></a-radio-group></a-form-item>
      </a-form>
      <div class="wz-rec" :class="{ on: recording }"><i class="dot" /><span v-if="recording">采集中 · 已录制 <b class="mono">03:42</b> · <b class="mono">612 MB</b>，请遥控机器人遍历目标区域</span><span v-else>点击「开始录包」后遥控机器人遍历待建图区域</span></div>
      <div class="wz-f"><a-button v-if="!recording" type="primary" @click="recording = true"><VideoCameraOutlined />开始录包</a-button><a-button v-else type="primary" @click="recording = false; step = 1">完成录制</a-button></div>
    </div>
    <div v-else-if="step === 1" class="wz">
      <a-form layout="vertical">
        <a-form-item label="选择数据包"><a-select value="bag_20261019_1605" :options="BAGS.map((b) => ({ value: b.name, label: `${b.name} · ${b.size}` }))" /></a-form-item>
        <a-form-item label="地图名称"><a-input placeholder="如：综合楼二层" /></a-form-item>
      </a-form>
      <div class="wz-prog"><span>建图进度</span><a-progress :percent="64" stroke-color="#26C6DA" status="active" /></div>
      <div class="wz-f"><a-button @click="step = 0">上一步</a-button><a-button type="primary" @click="step = 2">生成地图</a-button></div>
    </div>
    <div v-else-if="step === 2" class="wz">
      <div class="wz-prev"><BizMap :seed="41" mode="cloud" :zones="false" :route="null" /><BizMap :seed="41" :zones="false" :route="null" /></div>
      <a-form layout="vertical" style="margin-top:14px"><a-form-item label="栅格分辨率"><a-radio-group value="0.05" button-style="solid"><a-radio-button value="0.05">0.05 m</a-radio-button><a-radio-button value="0.1">0.1 m</a-radio-button><a-radio-button value="0.2">0.2 m</a-radio-button></a-radio-group></a-form-item></a-form>
      <div class="wz-f"><a-button @click="step = 1">上一步</a-button><a-button @click="ok('已新建融合地图')">新建融合地图</a-button><a-button type="primary" @click="step = 3">生成栅格地图</a-button></div>
    </div>
    <div v-else class="wz done"><CheckCircleFilled /><b>地图创建完成</b><p class="muted">可在「地图编辑」中划设禁行区、楼梯、斜坡等功能区，并在「路线」中录制循迹路线。</p><a-button type="primary" @click="wizOpen = false">完成</a-button></div>
  </a-modal>
</template>

<style scoped>
.mp-seg { margin-bottom: 16px; }
.mp { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 16px; align-items: start; }
.mp .r { margin-left: auto; display: flex; align-items: center; gap: 6px; }
.mp-list { position: sticky; top: 0; padding-bottom: 8px; }
.mp-filter { padding: 12px 12px 4px; }
.mp-item { width: calc(100% - 16px); margin: 6px 8px 0; display: flex; gap: 10px; align-items: center; padding: 8px; font: inherit; color: var(--text); text-align: left; cursor: pointer; background: transparent; border: 1px solid transparent; border-radius: 4px; }
.mp-item:hover { background: rgba(77,208,225,.05); } .mp-item.on { background: var(--accent-soft); border-color: rgba(38,198,218,.5); }
.mp-item .th { width: 84px; height: 52px; flex: none; overflow: hidden; border: 1px solid rgba(77,208,225,.2); border-radius: 3px; }
.mp-item .ic { width: 34px; height: 34px; flex: none; display: grid; place-items: center; font-size: 16px; color: #4DE8B0; background: rgba(77,232,176,.1); border-radius: 4px; }
.mp-item .b { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.mp-item .t { display: flex; align-items: center; gap: 6px; } .mp-item .t b { flex: 1; font-size: 13.5px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mp-item .cur { margin: 0; } .mp-item small { font-size: 12px; color: var(--muted); } .mp-item small :deep(.ant-tag) { margin-inline-end: 6px; font-size: 11px; line-height: 16px; padding: 0 4px; }
.mp-detail { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.mp-hd { display: flex; align-items: center; gap: 14px; padding: 14px 20px; flex-wrap: wrap; }
.mp-hd h3 { margin: 2px 0 0; font-size: 20px; color: #fff; } .mp-hd .mono { font-size: 12px; }
.mp-hd .meta { font-size: 13px; color: var(--muted); } .mp-hd .meta b { margin-left: 6px; color: var(--text); font-weight: 500; }
.mp-row { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 16px; align-items: stretch; }
.mp-edit { display: flex; flex-direction: column; min-width: 0; }
.mp-canvas { position: relative; margin: 12px; aspect-ratio: 16 / 9.4; border: 1px solid rgba(77,208,225,.18); border-radius: 3px; overflow: hidden; background: #050E18; }
.mp-canvas.tall { aspect-ratio: 16 / 8.6; }
.mp-canvas .cv { position: absolute; inset: 0; }
.mp-canvas .tools { position: absolute; z-index: 1; left: 10px; top: 10px; display: flex; flex-direction: column; gap: 4px; padding: 4px; background: rgba(6,18,30,.8); border: 1px solid var(--line-strong); border-radius: 4px; }
.mp-canvas .tools button { width: 30px; height: 30px; display: grid; place-items: center; font-size: 15px; color: var(--muted); cursor: pointer; background: none; border: 1px solid transparent; border-radius: 3px; }
.mp-canvas .tools button:hover { color: #fff; } .mp-canvas .tools button.on { color: #fff; background: var(--accent-soft); border-color: var(--accent); }
.mp-canvas .tools .sep { height: 1px; margin: 2px 4px; background: var(--line-strong); }
.mp-canvas .brush { position: absolute; z-index: 1; left: 56px; top: 10px; display: flex; align-items: center; gap: 10px; padding: 2px 12px; font-size: 12px; color: var(--muted); background: rgba(6,18,30,.8); border: 1px solid var(--line-strong); border-radius: 4px; } .mp-canvas .brush :deep(.ant-slider) { margin: 8px 0; }
.mp-canvas .legend { position: absolute; z-index: 1; right: 10px; bottom: 10px; display: flex; gap: 12px; padding: 5px 12px; font-size: 12px; color: var(--muted); background: rgba(6,18,30,.8); border: 1px solid var(--line-strong); border-radius: 4px; }
.mp-canvas .legend i { display: inline-block; width: 10px; height: 10px; margin-right: 5px; border: 1px solid; vertical-align: -1px; }
.mp-canvas .legend i.ln { width: 16px; height: 0; border: 0; border-top: 2px dashed #4DE8B0; vertical-align: 3px; } .mp-canvas .legend i.st { border-radius: 50%; border-color: #FFB74D; } .mp-canvas .legend i.nd { border-radius: 50%; border-color: #4DE8B0; width: 7px; height: 7px; }
.mp-canvas .rec { position: absolute; z-index: 1; left: 50%; top: 12px; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 5px 14px; font-size: 12.5px; background: rgba(58,26,31,.85); border: 1px solid #FF6B6B; border-radius: 20px; }
.mp-canvas .rec .dot { width: 8px; height: 8px; border-radius: 50%; background: #FF6B6B; animation: mp-blink 1.6s ease-in-out infinite; }
@keyframes mp-blink { 50% { opacity: .3; } }
.mp-zones { display: flex; flex-direction: column; }
.mp-zones ul { list-style: none; margin: 0; padding: 6px 12px; } .mp-zones li { display: flex; align-items: center; gap: 10px; padding: 7px 4px; border-bottom: 1px dashed var(--line); }
.mp-zones li i { width: 12px; height: 12px; flex: none; border: 1px solid; } .mp-zones li div { flex: 1; min-width: 0; } .mp-zones li b { display: block; font-size: 13px; font-weight: 500; } .mp-zones li small { font-size: 11.5px; color: var(--muted); }
.mp-zones .kv { display: grid; grid-template-columns: auto 1fr; gap: 8px 12px; padding: 12px 16px 16px; font-size: 12.5px; } .mp-zones .kv span { color: var(--muted); } .mp-zones .kv b { text-align: right; font-weight: 500; word-break: break-all; }
.danger { color: #FF6B6B; }
.wz { min-height: 220px; } .wz-f { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.wz-rec { display: flex; align-items: center; gap: 10px; padding: 14px 16px; font-size: 13px; color: var(--muted); background: rgba(77,208,225,.05); border: 1px dashed var(--line-strong); border-radius: 4px; }
.wz-rec .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--faint); } .wz-rec.on { color: var(--text); border-color: #FF6B6B; } .wz-rec.on .dot { background: #FF6B6B; animation: mp-blink 1.6s ease-in-out infinite; }
.wz-prog { display: flex; align-items: center; gap: 12px; font-size: 13px; color: var(--muted); } .wz-prog :deep(.ant-progress) { flex: 1; margin: 0; } .wz-prog :deep(.ant-progress-text) { color: var(--text); }
.wz-prev { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; } .wz-prev > * { aspect-ratio: 16 / 10; border: 1px solid rgba(77,208,225,.18); border-radius: 3px; overflow: hidden; }
.wz.done { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; } .wz.done :deep(.anticon) { font-size: 44px; color: #4DE8B0; } .wz.done b { font-size: 16px; } .wz.done p { max-width: 420px; font-size: 13px; }
</style>
