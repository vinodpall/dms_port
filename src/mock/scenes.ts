import { DEVICES } from './devices'

export type SceneStatus = 'active' | 'maint' | 'draft'
export interface SceneElement { name: string; kind: string; qty: number; spec: string }
export interface Scene {
  id: string; name: string; type: string; status: SceneStatus; area: number; difficulty: number
  /** 主视觉插画中的裁切中心（原图 1800×1168 坐标），无则使用水域示意图 */
  crop?: [number, number]; zoom?: number
  desc: string; owner: string; updated: string; hours: number; tasks: number; sim: boolean
  elements: SceneElement[]; metrics: string[]; tags: string[]
}
export const SCENE_STATUS: Record<SceneStatus, { t: string; b: 'success' | 'warning' | 'default' }> = {
  active: { t: '启用中', b: 'success' }, maint: { t: '维护中', b: 'warning' }, draft: { t: '草稿', b: 'default' },
}
export const SCENE_TYPES = ['综合', '楼梯攀爬', '复杂地形', '巡检模拟', '室内操作', '水域救援']

export const SCENES: Scene[] = [
  { id: 'SC-001', name: '综合训练场 A', type: '综合', status: 'active', area: 2400, difficulty: 3, crop: [900, 560], zoom: 1.15, desc: '覆盖设备停机坪、巡检、采集、仿真孪生与地形训练的综合场地', owner: '周工', updated: '2026-10-18', hours: 1860, tasks: 42, sim: true,
    elements: [{ name: '充电停机位', kind: '设施', qty: 6, spec: '自动对接充电 48V' }, { name: '巡检路线', kind: '路线', qty: 3, spec: '总长 420 m' }, { name: 'UWB 定位基站', kind: '设施', qty: 12, spec: '精度 ±10 cm' }],
    metrics: ['任务完成率', '平均通过时间', '定位误差'], tags: ['标准场景', '多机协同'] },
  { id: 'SC-002', name: '楼梯攀爬区', type: '楼梯攀爬', status: 'active', area: 320, difficulty: 4, crop: [1250, 450], zoom: 3.2, desc: '标准 15/18/20 cm 台阶与 15° 坡道组合，用于双足与四足攀爬训练', owner: '赵工', updated: '2026-10-16', hours: 640, tasks: 18, sim: true,
    elements: [{ name: '标准台阶', kind: '障碍', qty: 3, spec: '踏步高 15 / 18 / 20 cm' }, { name: '坡道', kind: '障碍', qty: 2, spec: '15° / 25°' }, { name: '防护扶手', kind: '设施', qty: 4, spec: '高 1.1 m' }],
    metrics: ['攀爬成功率', '跌倒次数', '能耗'], tags: ['步态训练'] },
  { id: 'SC-003', name: '复杂地形区', type: '复杂地形', status: 'active', area: 450, difficulty: 5, crop: [1420, 630], zoom: 3.2, desc: '碎石、草地、软垫、起伏地形与门框通行，评测足式机器人的地形适应能力', owner: '赵工', updated: '2026-10-12', hours: 520, tasks: 15, sim: true,
    elements: [{ name: '碎石地', kind: '地形', qty: 1, spec: '粒径 2–5 cm' }, { name: '起伏地形块', kind: '地形', qty: 6, spec: '高差 ≤ 12 cm' }, { name: '门框', kind: '障碍', qty: 2, spec: '宽 0.9 m' }],
    metrics: ['通过率', '平均速度', '姿态稳定性'], tags: ['步态训练', '泛化评测'] },
  { id: 'SC-004', name: '巡检模拟区', type: '巡检模拟', status: 'active', area: 600, difficulty: 3, crop: [560, 590], zoom: 2.6, desc: '模拟工业现场的管道、阀门、仪表与控制柜，用于巡检读表与异常识别', owner: '张杰', updated: '2026-10-15', hours: 780, tasks: 22, sim: false,
    elements: [{ name: '管道阀门组', kind: '设备', qty: 4, spec: 'DN50–DN150' }, { name: '指针仪表', kind: '设备', qty: 12, spec: '压力 / 温度' }, { name: '巡检点位', kind: '点位', qty: 6, spec: 'RFID 标签' }],
    metrics: ['读表准确率', '巡检覆盖率', '异常检出率'], tags: ['巡检', '视觉识别'] },
  { id: 'SC-005', name: '数据采集间', type: '室内操作', status: 'maint', area: 180, difficulty: 2, crop: [980, 780], zoom: 3, desc: '遥操作采集工位，人形机器人桌面抓取、装配等操作示教数据采集', owner: '张杰', updated: '2026-10-19', hours: 960, tasks: 36, sim: true,
    elements: [{ name: '遥操作工位', kind: '设施', qty: 2, spec: 'VR + 动捕手套' }, { name: '操作台', kind: '设施', qty: 3, spec: '1.6 × 0.8 m' }, { name: '标准物体集', kind: '物料', qty: 120, spec: 'YCB 物体集' }],
    metrics: ['抓取成功率', '示教时长', '数据合格率'], tags: ['数据采集', '遥操作'] },
  { id: 'SC-006', name: '水域救援池', type: '水域救援', status: 'active', area: 1200, difficulty: 4, desc: '模拟落水人员搜救，无人救生船与无人机协同搜索、投放救生设备', owner: '周工', updated: '2026-10-10', hours: 310, tasks: 9, sim: false,
    elements: [{ name: '救援水池', kind: '设施', qty: 1, spec: '40 × 30 m，水深 2 m' }, { name: '造浪机', kind: '设备', qty: 2, spec: '浪高 ≤ 0.5 m' }, { name: '假人目标', kind: '物料', qty: 6, spec: '漂浮式' }],
    metrics: ['搜索时长', '到达精度', '投放成功率'], tags: ['应急救援', '空水协同'] },
  { id: 'SC-007', name: '数字孪生仿真台', type: '综合', status: 'active', area: 90, difficulty: 2, crop: [1060, 270], zoom: 3, desc: '实体机械臂与数字孪生体同步，验证 Sim2Real 策略迁移', owner: '林悦', updated: '2026-10-17', hours: 420, tasks: 12, sim: true,
    elements: [{ name: '六轴机械臂', kind: '设备', qty: 1, spec: '负载 10 kg' }, { name: 'GPU 服务器', kind: '设施', qty: 3, spec: 'A100 ×8' }], metrics: ['同步延迟', '策略迁移成功率'], tags: ['Sim2Real'] },
  { id: 'SC-008', name: '废墟搜救场景', type: '复杂地形', status: 'draft', area: 800, difficulty: 5, crop: [420, 260], zoom: 2.4, desc: '规划中：坍塌建筑废墟、狭窄通道与烟雾环境', owner: '周工', updated: '2026-10-08', hours: 0, tasks: 0, sim: false,
    elements: [{ name: '狭窄通道', kind: '障碍', qty: 3, spec: '宽 0.6 m' }], metrics: ['搜索覆盖率'], tags: ['应急救援', '规划中'] },
]
export const devicesOf = (s: Scene) => DEVICES.filter((d) => d.scene === s.name)
