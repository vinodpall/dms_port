import { reactive } from 'vue'
/** 机器人仿真（原型数据）：Isaac Sim + Isaac Lab，前端 Web 外壳 + FastAPI 调度 + WebRTC 串流 */
export const SCENES = [
  { v: 'warehouse', t: '标准工业厂房场景', usd: 'Isaac/Environments/Simple_Warehouse/warehouse.usd' },
  { v: 'room', t: '标准室内房间场景', usd: 'Isaac/Environments/Simple_Room/simple_room.usd' },
  { v: 'terrain', t: '自定义地形场景', usd: 'TerrainGenerator（程序化地形）' },
]
export const WALKS = [{ v: 'Flat', t: '平地全向行走（Flat）' }, { v: 'Rough', t: '复杂地形越障（Rough：斜坡 / 台阶）' }]
export const FRAMEWORKS = [
  { v: 'rsl_rl', t: 'RSL-RL', algo: 'PPO', c: '#2ED3E6' }, { v: 'rl_games', t: 'rl_games', algo: 'PPO', c: '#45E3A8' },
  { v: 'skrl', t: 'SKRL', algo: 'PPO / SAC', c: '#FFC15C' }, { v: 'sb3', t: 'Stable-Baselines3', algo: 'PPO', c: '#B48CFF' },
]
export interface Asset { id: string; name: string; kind: string; type: string; joints: number; links: number; src: string; usd: string; status: 'ok' | 'converting' | 'fail'; time: string; task?: string; builtin?: boolean }
export interface Train { id: string; name: string; scene: string; walk: string; robot: string; fw: string; envs: number; it: number; total: number; lr: number; reward: number; status: 'running' | 'done' | 'queued' | 'stopped'; gpu: string; start: string }
const seq = (n: number, f: (i: number) => number) => Array.from({ length: n }, (_, i) => +f(i).toFixed(2))
export const sim = reactive({
  assets: [
    { id: 'a1', name: 'Unitree Go2', kind: '四足机器狗', type: 'quadruped', joints: 12, links: 13, src: '内置资产', usd: 'Robots/Unitree/Go2/go2.usd', status: 'ok', time: '内置', task: 'Unitree-Go2', builtin: true },
    { id: 'a2', name: 'ANYmal D', kind: '四足机器狗', type: 'quadruped', joints: 12, links: 13, src: '内置资产', usd: 'Robots/ANYbotics/anymal_d.usd', status: 'ok', time: '内置', task: 'Anymal-D', builtin: true },
    { id: 'a3', name: 'Unitree H1', kind: '人形机器人', type: 'humanoid', joints: 19, links: 20, src: '内置资产', usd: 'Robots/Unitree/H1/h1.usd', status: 'ok', time: '内置', task: 'H1', builtin: true },
    { id: 'a4', name: 'Unitree G1', kind: '人形机器人', type: 'humanoid', joints: 23, links: 24, src: '内置资产', usd: 'Robots/Unitree/G1/g1.usd', status: 'ok', time: '内置', task: 'G1', builtin: true },
    { id: 'a5', name: 'Franka Panda', kind: '机械臂', type: 'arm', joints: 9, links: 11, src: '内置资产', usd: 'Robots/FrankaEmika/panda.usd', status: 'ok', time: '内置', task: 'Franka', builtin: true },
    { id: 'a6', name: 'Unitree B2', kind: '四足机器狗', type: 'quadruped', joints: 12, links: 13, src: 'b2_description.zip', usd: 'custom/unitree_b2.usd', status: 'ok', time: '2025-06-11 15:20', task: 'Unitree-B2' },
    { id: 'a7', name: 'Scout 2.0', kind: '轮式小车', type: 'ugv', joints: 4, links: 5, src: 'scout_v2.zip', usd: 'custom/scout_v2.usd', status: 'ok', time: '2025-06-10 10:02', task: 'Scout' },
  ] as Asset[],
  trains: [
    { id: 't1', name: 'go2_rough_rsl', scene: 'terrain', walk: 'Rough', robot: 'Unitree Go2', fw: 'rsl_rl', envs: 4096, it: 1120, total: 1500, lr: 0.001, reward: 18.6, status: 'running', gpu: 'RTX 6000 Ada #0', start: '06-12 09:20' },
    { id: 't2', name: 'go2_flat_sb3', scene: 'warehouse', walk: 'Flat', robot: 'Unitree Go2', fw: 'sb3', envs: 1024, it: 640, total: 1000, lr: 0.0003, reward: 12.4, status: 'running', gpu: 'RTX 6000 Ada #1', start: '06-12 10:05' },
    { id: 't3', name: 'h1_flat_skrl', scene: 'room', walk: 'Flat', robot: 'Unitree H1', fw: 'skrl', envs: 2048, it: 1500, total: 1500, lr: 0.001, reward: 21.3, status: 'done', gpu: 'RTX 6000 Ada #0', start: '06-11 14:30' },
    { id: 't4', name: 'anymal_rough_rlg', scene: 'terrain', walk: 'Rough', robot: 'ANYmal D', fw: 'rl_games', envs: 4096, it: 1500, total: 1500, lr: 0.0005, reward: 19.8, status: 'done', gpu: 'RTX 6000 Ada #1', start: '06-10 20:12' },
    { id: 't5', name: 'b2_rough_rsl', scene: 'terrain', walk: 'Rough', robot: 'Unitree B2', fw: 'rsl_rl', envs: 2048, it: 0, total: 2000, lr: 0.001, reward: 0, status: 'queued', gpu: '—', start: '—' },
  ] as Train[],
})
export const taskId = (t: Pick<Train, 'walk' | 'robot'>) => `Isaac-Velocity-${t.walk}-${sim.assets.find((a) => a.name === t.robot)?.task ?? 'Unitree-Go2'}-v0`
export const cmdOf = (t: Pick<Train, 'walk' | 'robot' | 'fw' | 'envs' | 'total'>) => `./isaaclab.sh -p scripts/reinforcement_learning/${t.fw}/train.py --task ${taskId(t)} --num_envs ${t.envs} --max_iterations ${t.total} --headless`
export const fwOf = (v: string) => FRAMEWORKS.find((f) => f.v === v)!
export const sceneOf = (v: string) => SCENES.find((s) => s.v === v)!
/** 模拟 TensorBoard 指标 */
export const curves = (t: Train) => {
  const n = 40, k = (t.reward || 18) / 20, p = Math.max(.15, t.it / t.total)
  const m = Math.max(4, Math.round(n * p))
  return {
    reward: seq(m, (i) => 20 * k * (1 - Math.exp(-i / 9)) + Math.sin(i * 1.3) * 0.7 - 1.5),
    len: seq(m, (i) => 4 + 16 * (1 - Math.exp(-i / 8)) + Math.cos(i) * 0.5),
    err: seq(m, (i) => 0.08 + 0.9 * Math.exp(-i / 7) + Math.abs(Math.sin(i)) * 0.03),
    fall: seq(m, (i) => Math.max(0, 300 * Math.exp(-i / 6) + Math.sin(i) * 8)),
  }
}
