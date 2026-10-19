<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  CaretRightOutlined, PauseOutlined, BorderOutlined, StepForwardOutlined, SelectOutlined, DragOutlined, RedoOutlined, ExpandOutlined,
  EyeOutlined, EyeInvisibleOutlined, FolderOutlined, CameraOutlined, BulbOutlined, AppstoreOutlined, ApartmentOutlined, CloudUploadOutlined,
  PlusOutlined, SearchOutlined, LinkOutlined, ThunderboltOutlined, CodeOutlined, LineChartOutlined, VideoCameraOutlined, ExperimentOutlined, InboxOutlined,
} from '@ant-design/icons-vue'
import ModuleShell from '@/components/proto/ModuleShell.vue'
import DeviceGlyph from '@/components/proto/DeviceGlyph.vue'
import LineChart from '@/components/proto/LineChart.vue'
import { DEVICES } from '@/mock/devices'
import { TYPE_META, type DeviceType } from '@/models/device'

document.title = '机器人仿真 · 具身智能训练场'

/* ---------- 播放控制 ---------- */
const playing = ref(true)
const simTime = ref(128.42)
const fps = ref(60.0)
let t = 0
onMounted(() => { t = window.setInterval(() => { if (playing.value) { simTime.value += 0.5; fps.value = 58 + Math.random() * 3 } }, 500) })
onBeforeUnmount(() => clearInterval(t))
const tool = ref('move')

/* ---------- 舞台树 ---------- */
const stage = [
  { title: 'World', key: 'w', icon: 'folder', children: [
    { title: 'GroundPlane', key: 'g', icon: 'mesh' },
    { title: 'Environment · 复杂地形', key: 'env', icon: 'folder', children: [
      { title: 'Stairs_01', key: 's1', icon: 'mesh' }, { title: 'Slope_15deg', key: 's2', icon: 'mesh' }, { title: 'RoughTerrain', key: 's3', icon: 'mesh' }] },
    { title: 'envs（×4096 克隆）', key: 'envs', icon: 'folder', children: [
      { title: 'env_0 / Robot · Unitree B2', key: 'r0', icon: 'robot' }, { title: 'env_1 / Robot · Unitree B2', key: 'r1', icon: 'robot' }, { title: '…', key: 'rx', icon: 'mesh' }] },
    { title: 'Sensors', key: 'sen', icon: 'folder', children: [
      { title: 'front_cam · RGB-D', key: 'c1', icon: 'cam' }, { title: 'lidar · MID-360', key: 'c2', icon: 'cam' }, { title: 'height_scanner', key: 'c3', icon: 'cam' }] },
    { title: 'DomeLight', key: 'l1', icon: 'light' }, { title: 'DistantLight', key: 'l2', icon: 'light' },
  ] },
]
const selected = ref<string[]>(['r0'])
const expanded = ref<string[]>(['w', 'envs', 'env', 'sen'])
const hidden = ref<Set<string>>(new Set(['l2']))
const toggleEye = (k: string) => { const s = new Set(hidden.value); s.has(k) ? s.delete(k) : s.add(k); hidden.value = s }
const leftTab = ref('stage')
const ASSETS = (() => { const m = new Map<string, (typeof DEVICES)[number]>(); DEVICES.forEach((d) => m.has(d.model) || m.set(d.model, d)); return [...m.values()] })()

/* ---------- 视口中的并行环境 ---------- */
const ROWS = 5, COLS = 9
const envs = computed(() => {
  const out: { x: number; y: number; s: number; d: number; sel: boolean }[] = []
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const depth = r / (ROWS - 1)            // 0 = 远，1 = 近
    const s = 0.45 + depth * 0.75
    const y = 150 + Math.pow(depth, 1.25) * 300
    const spread = 70 + depth * 75
    const x = 600 + (c - (COLS - 1) / 2) * spread
    out.push({ x, y, s, d: (r * COLS + c) % 7, sel: r === ROWS - 1 && c === 4 })
  }
  return out
})
const floorV = Array.from({ length: 21 }, (_, i) => i - 10)
const floorH = Array.from({ length: 10 }, (_, i) => i)

/* ---------- 属性 ---------- */
const xf = ref({ t: [0, 0, 0.62], r: [0, 0, 90], s: [1, 1, 1] })
const joints = ref([
  { n: 'FL_hip_joint', v: 0.1, min: -1.05, max: 1.05 }, { n: 'FL_thigh_joint', v: 0.8, min: -1.5, max: 3.4 }, { n: 'FL_calf_joint', v: -1.5, min: -2.7, max: -0.9 },
  { n: 'FR_hip_joint', v: -0.1, min: -1.05, max: 1.05 }, { n: 'RL_thigh_joint', v: 1.0, min: -0.5, max: 4.5 }, { n: 'RR_calf_joint', v: -1.5, min: -2.7, max: -0.9 },
])
const activeProps = ref(['xf', 'art', 'link'])

/* ---------- 底部面板 ---------- */
const bottom = ref('tasks')
const TASKS = [
  { key: 1, name: 'Isaac-Velocity-Rough-B2-v0', robot: 'Unitree B2', envs: 4096, algo: 'PPO · rsl_rl', it: 1420, total: 2000, reward: 18.62, status: 'running', gpu: 'A100 #0' },
  { key: 2, name: 'Isaac-Stairs-Climb-H1-v1', robot: 'Unitree H1', envs: 2048, algo: 'PPO · rsl_rl', it: 860, total: 3000, reward: 9.84, status: 'running', gpu: 'A100 #1' },
  { key: 3, name: 'Isaac-Lift-Cube-Walker-v0', robot: 'Walker S1', envs: 1024, algo: 'SAC · skrl', it: 500, total: 500, reward: 42.1, status: 'done', gpu: 'A100 #0' },
  { key: 4, name: 'Isaac-Nav-Flat-Scout-v0', robot: 'Scout 2.0', envs: 512, algo: 'PPO · rl_games', it: 0, total: 1500, reward: 0, status: 'queued', gpu: '—' },
]
const STATUS: Record<string, { b: 'processing' | 'success' | 'default'; t: string }> = { running: { b: 'processing', t: '训练中' }, done: { b: 'success', t: '已完成' }, queued: { b: 'default', t: '排队中' } }
const reward = Array.from({ length: 40 }, (_, i) => +(20 * (1 - Math.exp(-i / 11)) + Math.sin(i * 1.3) * 0.8 - 1.5).toFixed(2))
const epLen = Array.from({ length: 40 }, (_, i) => +(4 + 16 * (1 - Math.exp(-i / 9)) + Math.cos(i) * 0.6).toFixed(2))
const LOGS = [
  ['12:08:01', 'info', '[omni.physx] PhysX GPU 仿真已启动，dt = 0.005 s，substeps = 4'],
  ['12:08:01', 'info', '[isaaclab] 克隆环境 4096 个，用时 3.42 s'],
  ['12:08:03', 'info', '[urdf_importer] unitree_b2.urdf → /World/envs/env_0/Robot（12 关节，13 刚体）'],
  ['12:08:05', 'warn', '[omni.sensors] height_scanner 射线数 187 超过推荐值，可能影响帧率'],
  ['12:08:10', 'info', '[rsl_rl] Iteration 1420/2000 | mean reward 18.62 | ep len 19.4 s | 82 k steps/s'],
  ['12:08:12', 'info', '[device-sync] 已从设备管理同步 机器狗-003（B2）标定参数'],
]
const urdfStep = ref(1)
const doImport = () => { urdfStep.value = 3; message.success('USD 生成完成（原型演示）') }
</script>

<template>
  <ModuleShell title="机器人仿真" en="Simulation · GPU Accelerated" flush>
    <template #extra><a-tag color="cyan" style="margin-right:8px">warehouse_b2_rough.usd</a-tag></template>
    <div class="sm">
      <!-- 菜单栏 + 工具栏 -->
      <div class="sm-bar">
        <nav class="sm-menu"><span v-for="m in ['文件', '编辑', '创建', '窗口', '工具', 'Isaac 工具', 'Isaac Lab', '帮助']" :key="m">{{ m }}</span></nav>
        <div class="sm-tools">
          <a-radio-group v-model:value="tool" size="small" button-style="solid">
            <a-radio-button value="select"><a-tooltip title="选择 Q"><SelectOutlined /></a-tooltip></a-radio-button>
            <a-radio-button value="move"><a-tooltip title="移动 W"><DragOutlined /></a-tooltip></a-radio-button>
            <a-radio-button value="rotate"><a-tooltip title="旋转 E"><RedoOutlined /></a-tooltip></a-radio-button>
            <a-radio-button value="scale"><a-tooltip title="缩放 R"><ExpandOutlined /></a-tooltip></a-radio-button>
          </a-radio-group>
        </div>
        <div class="sm-play">
          <a-button size="small" :type="playing ? 'default' : 'primary'" @click="playing = !playing"><component :is="playing ? PauseOutlined : CaretRightOutlined" /></a-button>
          <a-button size="small" @click="playing = false; simTime = 0"><BorderOutlined /></a-button>
          <a-button size="small"><StepForwardOutlined /></a-button>
          <span class="mono sm-time">t = {{ simTime.toFixed(2) }} s</span>
        </div>
        <div class="sm-tb-r">
          <a-select size="small" value="rtx" style="width:132px" :options="[{ value: 'rtx', label: 'RTX – 实时' }, { value: 'pt', label: 'RTX – 路径追踪' }]" />
          <a-select size="small" value="gpu" style="width:120px" :options="[{ value: 'gpu', label: 'PhysX · GPU' }, { value: 'cpu', label: 'PhysX · CPU' }]" />
        </div>
      </div>

      <div class="sm-body">
        <!-- 左：舞台 / 资产 -->
        <section class="sm-left sm-pane">
          <a-tabs v-model:active-key="leftTab" size="small" class="sm-tabs">
            <a-tab-pane key="stage"><template #tab><ApartmentOutlined />舞台</template>
              <a-input size="small" placeholder="搜索 Prim" class="sm-search"><template #prefix><SearchOutlined /></template></a-input>
              <a-tree v-model:selected-keys="selected" v-model:expanded-keys="expanded" :tree-data="stage" block-node class="sm-tree">
                <template #title="{ title, key, icon }">
                  <span class="sm-node" :class="{ dim: hidden.has(key) }">
                    <FolderOutlined v-if="icon === 'folder'" class="i f" /><CameraOutlined v-else-if="icon === 'cam'" class="i c" /><BulbOutlined v-else-if="icon === 'light'" class="i l" />
                    <ThunderboltOutlined v-else-if="icon === 'robot'" class="i r" /><AppstoreOutlined v-else class="i m" />
                    <span class="t">{{ title }}</span>
                    <component :is="hidden.has(key) ? EyeInvisibleOutlined : EyeOutlined" class="eye" @click.stop="toggleEye(key)" />
                  </span>
                </template>
              </a-tree>
            </a-tab-pane>
            <a-tab-pane key="assets"><template #tab><AppstoreOutlined />机器人资产</template>
              <div class="sm-assets">
                <div v-for="a in ASSETS" :key="a.model" class="sm-asset" draggable="true">
                  <span class="art"><DeviceGlyph :type="a.type" :size="34" :color="TYPE_META[a.type as DeviceType].color" /></span>
                  <div><b>{{ a.model }}</b><small>{{ a.vendor }} · {{ TYPE_META[a.type as DeviceType].short }}</small></div>
                  <a-tag color="green" class="usd">USD</a-tag>
                </div>
                <a-button block type="dashed" @click="bottom = 'urdf'"><PlusOutlined />导入 URDF</a-button>
              </div>
            </a-tab-pane>
          </a-tabs>
        </section>

        <!-- 中：视口 -->
        <section class="sm-view">
          <div class="sm-vbar">
            <a-dropdown><a-button size="small" class="glass"><CameraOutlined />Perspective</a-button><template #overlay><a-menu><a-menu-item>Perspective</a-menu-item><a-menu-item>Top</a-menu-item><a-menu-item>front_cam</a-menu-item></a-menu></template></a-dropdown>
            <a-button size="small" class="glass"><BulbOutlined />光照：Stage</a-button>
            <a-button size="small" class="glass"><EyeOutlined />显示</a-button>
            <span class="sm-stat mono">FPS {{ fps.toFixed(1) }} · 4096 envs · 82.4k steps/s · 1920×1080</span>
          </div>
          <svg class="sm-scene" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B2236" /><stop offset=".3" stop-color="#0E2D45" /><stop offset="1" stop-color="#071523" /></linearGradient>
              <radialGradient id="spot" cx=".5" cy=".55" r=".55"><stop offset="0" stop-color="#26C6DA" stop-opacity=".18" /><stop offset="1" stop-color="#26C6DA" stop-opacity="0" /></radialGradient>
            </defs>
            <rect width="1200" height="520" fill="url(#sky)" />
            <rect width="1200" height="520" fill="url(#spot)" />
            <!-- 透视地面网格 -->
            <g stroke="#4DD0E1" stroke-width="1">
              <line v-for="v in floorV" :key="`v${v}`" :x1="600 + v * 30" y1="120" :x2="600 + v * 160" y2="520" :opacity="v === 0 ? .4 : .14" />
              <line v-for="h in floorH" :key="`h${h}`" x1="0" :y1="120 + Math.pow(h / 9, 1.8) * 400" x2="1200" :y2="120 + Math.pow(h / 9, 1.8) * 400" :opacity=".06 + h * .012" />
            </g>
            <line x1="0" y1="120" x2="1200" y2="120" stroke="#4DD0E1" opacity=".35" />
            <!-- 地形：台阶 + 坡道 -->
            <g fill="rgba(77,208,225,.05)" stroke="#4DD0E1" stroke-opacity=".35">
              <path d="M70 330 L210 330 L210 300 L180 300 L180 270 L150 270 L150 240 L120 240 L120 330" />
              <path d="M1000 330 L1150 330 L1150 250 Z" />
            </g>
            <!-- 并行环境中的机器人 -->
            <g v-for="(e, i) in envs" :key="i" :transform="`translate(${e.x} ${e.y}) scale(${e.s})`" :opacity="0.35 + e.s * 0.55">
              <ellipse cx="0" cy="26" rx="34" ry="7" :fill="e.sel ? 'rgba(38,198,218,.35)' : 'rgba(77,208,225,.1)'" />
              <g class="bob" :style="{ animationDelay: `${e.d * 0.18}s` }"><g transform="translate(-32 -36)"><DeviceGlyph type="quadruped" :size="64" :color="e.sel ? '#7FF3FF' : '#4DD0E1'" /></g></g>
              <template v-if="e.sel">
                <rect x="-44" y="-44" width="88" height="80" fill="none" stroke="#FFB74D" stroke-dasharray="4 3" />
                <g stroke-width="3" stroke-linecap="round"><line x1="0" y1="0" x2="60" y2="0" stroke="#FF5A5A" /><line x1="0" y1="0" x2="0" y2="-62" stroke="#4DE8B0" /><line x1="0" y1="0" x2="-34" y2="30" stroke="#5B9BFF" /></g>
                <polygon points="66,0 56,-5 56,5" fill="#FF5A5A" /><polygon points="0,-68 -5,-58 5,-58" fill="#4DE8B0" />
                <text x="-44" y="-52" fill="#FFB74D" style="font: 12px 'JetBrains Mono', monospace">/World/envs/env_0/Robot</text>
              </template>
            </g>
          </svg>
          <svg class="sm-axis" viewBox="0 0 60 60"><line x1="20" y1="40" x2="48" y2="40" stroke="#FF5A5A" stroke-width="2" /><line x1="20" y1="40" x2="20" y2="12" stroke="#4DE8B0" stroke-width="2" /><line x1="20" y1="40" x2="6" y2="54" stroke="#5B9BFF" stroke-width="2" /><text x="50" y="44" fill="#FF5A5A" font-size="9">X</text><text x="17" y="9" fill="#4DE8B0" font-size="9">Z</text><text x="0" y="60" fill="#5B9BFF" font-size="9">Y</text></svg>
          <div class="sm-hud mono"><span><i class="dot" />{{ playing ? 'PLAYING' : 'PAUSED' }}</span><span>GPU 0 · A100 80G · 71%</span><span>显存 46.2 / 80 GB</span></div>
        </section>

        <!-- 右：属性 -->
        <section class="sm-right sm-pane">
          <div class="sm-ph"><b>属性</b><span class="mono muted">/World/envs/env_0/Robot</span></div>
          <a-collapse v-model:active-key="activeProps" ghost expand-icon-position="end" class="sm-collapse">
            <a-collapse-panel key="xf" header="变换 Transform">
              <div v-for="(row, k) in ({ t: '位置', r: '旋转', s: '缩放' } as const)" :key="k" class="sm-xyz">
                <label>{{ row }}</label>
                <a-input-number v-for="(_, j) in 3" :key="j" v-model:value="xf[k][j]" size="small" :step="0.1" :class="['x', 'y', 'z'][j]" />
              </div>
            </a-collapse-panel>
            <a-collapse-panel key="art" header="关节 Articulation">
              <div v-for="j in joints" :key="j.n" class="sm-joint"><span class="mono">{{ j.n }}</span><a-slider v-model:value="j.v" :min="j.min" :max="j.max" :step="0.01" /><b class="mono">{{ j.v.toFixed(2) }}</b></div>
              <a-form-item label="驱动模式" class="sm-fi"><a-segmented size="small" :options="['位置', '速度', '力矩']" value="位置" /></a-form-item>
            </a-collapse-panel>
            <a-collapse-panel key="phy" header="物理 Rigid Body">
              <a-descriptions :column="1" size="small" class="sm-desc">
                <a-descriptions-item label="质量">60.0 kg</a-descriptions-item><a-descriptions-item label="静摩擦">0.80</a-descriptions-item>
                <a-descriptions-item label="恢复系数">0.00</a-descriptions-item><a-descriptions-item label="自碰撞"><a-switch size="small" :checked="false" /></a-descriptions-item>
              </a-descriptions>
            </a-collapse-panel>
            <a-collapse-panel key="link" header="实体设备关联">
              <div class="sm-link"><DeviceGlyph type="quadruped" :size="38" color="#5B9BFF" /><div><b>机器狗-003</b><small>Unitree B2 · 来自设备管理</small></div><a-tag color="green">已同步</a-tag></div>
              <a-button size="small" block style="margin-top:10px"><LinkOutlined />Sim2Real 部署策略到实体</a-button>
            </a-collapse-panel>
          </a-collapse>
        </section>
      </div>

      <!-- 底部面板 -->
      <section class="sm-bottom sm-pane">
        <a-tabs v-model:active-key="bottom" size="small" class="sm-tabs">
          <template #rightExtra><a-button size="small" type="primary" style="margin-right:12px"><ExperimentOutlined />新建训练任务</a-button></template>
          <a-tab-pane key="tasks"><template #tab><ExperimentOutlined />训练任务</template>
            <a-table :data-source="TASKS" size="small" :pagination="false" :columns="[{ title: '任务', key: 'name' }, { title: '机器人', dataIndex: 'robot' }, { title: '并行环境', key: 'envs' }, { title: '算法', dataIndex: 'algo' }, { title: '进度', key: 'it', width: 220 }, { title: '平均奖励', key: 'reward' }, { title: 'GPU', dataIndex: 'gpu' }, { title: '状态', key: 'status' }, { title: '操作', key: 'op' }]">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'name'"><span class="mono" style="color:#9FE6EF">{{ record.name }}</span></template>
                <template v-else-if="column.key === 'envs'"><span class="mono">{{ record.envs }}</span></template>
                <template v-else-if="column.key === 'it'"><a-progress :percent="Math.round((record.it / record.total) * 100)" size="small" :format="() => `${record.it}/${record.total}`" /></template>
                <template v-else-if="column.key === 'reward'"><span class="mono">{{ record.reward || '—' }}</span></template>
                <template v-else-if="column.key === 'status'"><a-badge :status="STATUS[record.status].b" :text="STATUS[record.status].t" /></template>
                <template v-else-if="column.key === 'op'"><a-space :size="0"><a-button type="link" size="small">回放</a-button><a-button type="link" size="small" :disabled="record.status !== 'done'">导出策略</a-button></a-space></template>
              </template>
            </a-table>
          </a-tab-pane>
          <a-tab-pane key="curve"><template #tab><LineChartOutlined />训练曲线</template>
            <div class="sm-curves">
              <div><span class="muted">平均奖励 Mean Reward</span><LineChart :series="[{ name: 'reward', color: '#4DD0E1', data: reward }]" :height="150" /></div>
              <div><span class="muted">回合长度 Episode Length (s)</span><LineChart :series="[{ name: 'len', color: '#B48CFF', data: epLen }]" :height="150" /></div>
            </div>
          </a-tab-pane>
          <a-tab-pane key="sensor"><template #tab><VideoCameraOutlined />传感器</template>
            <div class="sm-cams">
              <div v-for="c in [{ n: 'front_cam · RGB', k: 'rgb' }, { n: 'front_cam · Depth', k: 'depth' }, { n: 'Semantic Segmentation', k: 'seg' }, { n: 'LiDAR 点云', k: 'lidar' }]" :key="c.k" class="sm-cam" :class="c.k"><span>{{ c.n }}</span></div>
            </div>
          </a-tab-pane>
          <a-tab-pane key="console"><template #tab><CodeOutlined />控制台</template>
            <div class="sm-log mono"><div v-for="(l, i) in LOGS" :key="i" :class="l[1]"><span class="muted">{{ l[0] }}</span> <b>{{ l[1].toUpperCase() }}</b> {{ l[2] }}</div></div>
          </a-tab-pane>
          <a-tab-pane key="urdf"><template #tab><CloudUploadOutlined />URDF → USD</template>
            <div class="sm-urdf">
              <a-steps :current="urdfStep" size="small" :items="[{ title: '上传 URDF' }, { title: '解析关节与连杆' }, { title: '配置物理与驱动' }, { title: '生成 USD' }]" />
              <div class="sm-urdf-b">
                <a-upload-dragger :before-upload="() => false" class="sm-drag"><p style="font-size:28px;color:#4DD0E1;margin:0"><InboxOutlined /></p><p>拖拽 URDF / xacro 文件或压缩包到此处</p><p class="muted" style="font-size:12px">支持 meshes 目录（.stl / .dae / .obj）</p></a-upload-dragger>
                <a-form layout="vertical" class="sm-urdf-f">
                  <a-row :gutter="12">
                    <a-col :span="12"><a-form-item label="关节驱动类型"><a-select value="pos" :options="[{ value: 'pos', label: '位置控制' }, { value: 'vel', label: '速度控制' }]" /></a-form-item></a-col>
                    <a-col :span="12"><a-form-item label="关联实体设备型号"><a-select value="B2" :options="ASSETS.map((a) => ({ value: a.model, label: a.model }))" /></a-form-item></a-col>
                  </a-row>
                  <a-checkbox checked>固定基座</a-checkbox><a-checkbox checked>合并固定关节</a-checkbox><a-checkbox>自碰撞</a-checkbox>
                  <div style="margin-top:12px"><a-button type="primary" @click="doImport">开始转换</a-button></div>
                </a-form>
              </div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </section>
    </div>
  </ModuleShell>
</template>

<style scoped>
.sm { height: 100%; display: grid; grid-template-rows: auto 1fr 268px; }
.sm-pane { background: rgba(8,22,36,.88); border: 1px solid rgba(77,208,225,.12); }
.sm-bar { display: flex; align-items: center; gap: 18px; height: 42px; padding: 0 14px; background: rgba(6,17,29,.9); border-bottom: 1px solid rgba(77,208,225,.12); }
.sm-menu { display: flex; gap: 2px; } .sm-menu span { padding: 4px 9px; font-size: 13px; color: var(--muted); cursor: pointer; border-radius: 3px; } .sm-menu span:hover { background: rgba(77,208,225,.1); color: #fff; }
.sm-tools { padding-left: 14px; border-left: 1px solid var(--line); }
.sm-play { display: flex; align-items: center; gap: 6px; margin: 0 auto; }
.sm-time { font-size: 12px; color: #9FE6EF; margin-left: 8px; min-width: 100px; }
.sm-tb-r { display: flex; gap: 8px; }
.sm-body { min-height: 0; display: grid; grid-template-columns: 270px 1fr 310px; gap: 6px; padding: 6px 6px 0; }
.sm-left, .sm-right { min-height: 0; overflow: auto; border-radius: 3px; }
.sm-tabs :deep(.ant-tabs-nav) { margin: 0; padding: 0 12px; background: rgba(6,17,29,.6); }
.sm-tabs :deep(.ant-tabs-tab) { font-size: 13px; padding: 9px 0; } .sm-tabs :deep(.ant-tabs-tab .anticon) { margin-right: 6px; }
.sm-search { margin: 10px 10px 6px; width: calc(100% - 20px); }
.sm-tree { background: transparent !important; padding: 0 6px 10px; font-size: 12.5px; }
.sm-node { display: flex; align-items: center; gap: 6px; width: 100%; } .sm-node.dim { opacity: .4; }
.sm-node .t { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sm-node .i.f { color: #FFB74D; } .sm-node .i.c { color: #B48CFF; } .sm-node .i.l { color: #FFE082; } .sm-node .i.r { color: #4DD0E1; } .sm-node .i.m { color: #6F92A8; }
.sm-node .eye { color: #5B7486; opacity: 0; } .sm-node:hover .eye, .sm-node.dim .eye { opacity: 1; }
.sm-assets { padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.sm-asset { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid rgba(77,208,225,.12); border-radius: 3px; background: rgba(16,38,59,.5); cursor: grab; }
.sm-asset:hover { border-color: rgba(77,208,225,.45); }
.sm-asset .art { width: 40px; height: 40px; display: grid; place-items: center; background: rgba(77,208,225,.06); border-radius: 3px; }
.sm-asset div { flex: 1; display: flex; flex-direction: column; line-height: 1.3; } .sm-asset b { font-size: 13px; } .sm-asset small { color: var(--muted); font-size: 11.5px; }
.sm-view { position: relative; min-height: 0; overflow: hidden; border: 1px solid rgba(77,208,225,.25); border-radius: 3px; background: #071523; }
.sm-scene { position: absolute; inset: 0; width: 100%; height: 100%; }
.bob { animation: sm-bob 1.6s ease-in-out infinite; } @keyframes sm-bob { 50% { transform: translateY(-3px); } }
.sm-vbar { position: absolute; z-index: 2; left: 10px; right: 10px; top: 10px; display: flex; gap: 6px; align-items: center; }
.glass { background: rgba(6,17,29,.7) !important; border-color: rgba(77,208,225,.2) !important; backdrop-filter: blur(6px); }
.sm-stat { margin-left: auto; font-size: 11.5px; color: #9FE6EF; padding: 4px 10px; background: rgba(6,17,29,.7); border: 1px solid rgba(77,208,225,.2); border-radius: 3px; }
.sm-axis { position: absolute; left: 12px; bottom: 12px; width: 60px; height: 60px; }
.sm-hud { position: absolute; right: 12px; bottom: 10px; display: flex; gap: 14px; font-size: 11px; color: var(--muted); }
.sm-hud span { display: flex; align-items: center; gap: 6px; }
.sm-ph { display: flex; flex-direction: column; gap: 2px; padding: 10px 14px; border-bottom: 1px solid var(--line); background: rgba(6,17,29,.6); } .sm-ph span { font-size: 11px; }
.sm-collapse :deep(.ant-collapse-header) { padding: 10px 14px !important; font-size: 13px; font-weight: 600; border-bottom: 1px solid rgba(27,58,82,.6); }
.sm-collapse :deep(.ant-collapse-content-box) { padding: 10px 14px 14px !important; }
.sm-xyz { display: grid; grid-template-columns: 34px repeat(3, 1fr); gap: 6px; align-items: center; margin-bottom: 8px; font-size: 12px; color: var(--muted); }
.sm-xyz :deep(.ant-input-number) { width: 100%; border-left-width: 3px; }
.sm-xyz .x { border-left-color: #FF5A5A; } .sm-xyz .y { border-left-color: #4DE8B0; } .sm-xyz .z { border-left-color: #5B9BFF; }
.sm-joint { display: grid; grid-template-columns: 104px 1fr 40px; align-items: center; gap: 6px; font-size: 11px; color: var(--muted); }
.sm-joint :deep(.ant-slider) { margin: 6px 4px; } .sm-joint b { font-weight: 400; color: #fff; text-align: right; }
.sm-fi { margin: 8px 0 0; }
.sm-desc :deep(.ant-descriptions-item) { padding-bottom: 6px; }
.sm-link { display: flex; align-items: center; gap: 10px; padding: 10px; background: rgba(91,155,255,.08); border: 1px solid rgba(91,155,255,.25); border-radius: 3px; }
.sm-link div { flex: 1; display: flex; flex-direction: column; line-height: 1.3; } .sm-link small { color: var(--muted); font-size: 11.5px; }
.sm-bottom { margin: 6px; border-radius: 3px; overflow: hidden; display: flex; flex-direction: column; }
.sm-bottom :deep(.ant-tabs) { height: 100%; } .sm-bottom :deep(.ant-tabs-content-holder) { overflow: auto; }
.sm-curves { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 14px 18px; font-size: 12px; }
.sm-cams { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 12px; }
.sm-cam { position: relative; height: 170px; border: 1px solid rgba(77,208,225,.2); border-radius: 3px; overflow: hidden; }
.sm-cam span { position: absolute; left: 8px; top: 6px; font-size: 11px; padding: 1px 6px; background: rgba(0,0,0,.5); border-radius: 2px; }
.sm-cam.rgb { background: linear-gradient(180deg, #23465E 0 45%, #2E3A2E 45%), #222; background-image: linear-gradient(180deg, #3A6A86 0, #1C3B50 44%, #3A3F36 45%, #23281F 100%); }
.sm-cam.rgb::after { content: ''; position: absolute; left: 30%; top: 40%; width: 40%; height: 35%; background: linear-gradient(#4E5A63, #2B3238); clip-path: polygon(0 100%, 0 30%, 20% 30%, 20% 0, 80% 0, 80% 30%, 100% 30%, 100% 100%); }
.sm-cam.depth { background: radial-gradient(ellipse at 50% 120%, #fff 0, #888 30%, #222 70%, #000); filter: grayscale(1); }
.sm-cam.seg { background: linear-gradient(180deg, #1E3A8A 0 44%, #16A34A 44% 100%); }
.sm-cam.seg::after { content: ''; position: absolute; left: 32%; top: 38%; width: 36%; height: 38%; background: #F97316; clip-path: polygon(0 100%, 0 30%, 20% 30%, 20% 0, 80% 0, 80% 30%, 100% 30%, 100% 100%); }
.sm-cam.lidar { background: #050B12 radial-gradient(circle at 50% 70%, transparent 0 8px, rgba(77,208,225,.0) 8px); }
.sm-cam.lidar::after { content: ''; position: absolute; inset: 0; background: repeating-radial-gradient(ellipse at 50% 85%, rgba(77,208,225,.7) 0 1px, transparent 1px 12px); mask: linear-gradient(transparent 20%, #000); }
.sm-log { padding: 10px 16px; font-size: 12px; line-height: 1.9; } .sm-log b { font-weight: 600; color: #4DD0E1; margin: 0 6px; } .sm-log .warn b { color: #FFB74D; }
.sm-urdf { padding: 14px 18px; } .sm-urdf-b { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 14px; }
.sm-drag :deep(.ant-upload-drag) { background: rgba(16,38,59,.5); }
.sm-urdf-f :deep(.ant-form-item) { margin-bottom: 10px; }
</style>
