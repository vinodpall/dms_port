/** 场景管理模块示例数据：训练场物理场景、平面布局、环境监测与使用排期 */
export type SceneStatus = 'active' | 'maint' | 'draft'
export type PlanKind = 'zone' | 'stairs' | 'slope' | 'terrain' | 'water' | 'equip' | 'facility' | 'point' | 'path' | 'wall'
export interface PlanItem { k: PlanKind; x?: number; y?: number; w?: number; h?: number; t?: string; pts?: [number, number][] }
export interface SceneElement { name: string; kind: string; qty: number; spec: string }
export interface Scene {
  id: string; name: string; type: string; status: SceneStatus; area: number; difficulty: number
  desc: string; owner: string; updated: string; hours: number; open: string; capacity: number
  env: { temp: number; hum: number; lux: number; noise: number }
  elements: SceneElement[]; tags: string[]
  /** 场景平面布局（160 × 100 坐标） */
  plan: PlanItem[]
  /** 在训练场总平面图中的位置（160 × 90 坐标） */
  site: [number, number, number, number]
}
export const SCENE_STATUS: Record<SceneStatus, { t: string; b: 'success' | 'warning' | 'default'; c: string }> = {
  active: { t: '启用中', b: 'success', c: '#45E3A8' }, maint: { t: '维护中', b: 'warning', c: '#FFC15C' }, draft: { t: '规划中', b: 'default', c: '#8EA6BE' },
}
export const SCENE_TYPES = ['综合', '楼梯攀爬', '复杂地形', '巡检模拟', '室内操作', '水域救援']
export const TYPE_COLOR: Record<string, string> = { 综合: '#2ED3E6', 楼梯攀爬: '#FFC15C', 复杂地形: '#45E3A8', 巡检模拟: '#5B9BFF', 室内操作: '#B48CFF', 水域救援: '#3FA9F5' }
export const PLAN_LEGEND: { k: PlanKind; t: string; c: string }[] = [
  { k: 'facility', t: '设施', c: '#2ED3E6' }, { k: 'equip', t: '设备', c: '#B48CFF' }, { k: 'stairs', t: '台阶 / 坡道', c: '#FFC15C' },
  { k: 'terrain', t: '地形', c: '#45E3A8' }, { k: 'water', t: '水域', c: '#3FA9F5' }, { k: 'path', t: '路线', c: '#7FF3FF' },
]

export const SCENES: Scene[] = [
  { id: 'SC-001', name: '综合训练场 A', type: '综合', status: 'active', area: 2400, difficulty: 3, desc: '多功能综合场地，包含停机充电区、巡检区、操作区、攀爬区与地形区，可按训练科目灵活组合。', owner: '周工', updated: '2026-10-18', hours: 1860, open: '08:00–22:00', capacity: 12,
    env: { temp: 22.4, hum: 46, lux: 520, noise: 48 }, tags: ['标准场景', '多区组合'],
    elements: [{ name: '充电停机位', kind: '设施', qty: 6, spec: '自动对接充电 48V' }, { name: '巡检路线', kind: '路线', qty: 3, spec: '总长 420 m' }, { name: 'UWB 定位基站', kind: '设施', qty: 12, spec: '精度 ±10 cm' }, { name: '标准台阶', kind: '障碍', qty: 2, spec: '踏步 15 / 18 cm' }, { name: '监控摄像头', kind: '设施', qty: 8, spec: '4K 球机' }],
    plan: [
      { k: 'zone', x: 4, y: 4, w: 44, h: 28, t: '停机充电区' }, { k: 'point', x: 14, y: 20 }, { k: 'point', x: 26, y: 20 }, { k: 'point', x: 38, y: 20 },
      { k: 'zone', x: 52, y: 4, w: 54, h: 40, t: '巡检区' }, { k: 'equip', x: 58, y: 12, w: 20, h: 9, t: '管道阀门' }, { k: 'equip', x: 82, y: 12, w: 18, h: 9, t: '仪表柜' },
      { k: 'zone', x: 110, y: 4, w: 46, h: 40, t: '操作区' }, { k: 'facility', x: 116, y: 13, w: 16, h: 10, t: '操作台' }, { k: 'facility', x: 136, y: 13, w: 14, h: 10, t: '工位' },
      { k: 'zone', x: 4, y: 36, w: 44, h: 60, t: '攀爬区' }, { k: 'stairs', x: 9, y: 46, w: 34, h: 18, t: '台阶' }, { k: 'slope', x: 9, y: 70, w: 34, h: 20, t: '坡道' },
      { k: 'zone', x: 52, y: 48, w: 60, h: 48, t: '地形区' }, { k: 'terrain', x: 57, y: 56, w: 24, h: 16, t: '碎石' }, { k: 'terrain', x: 85, y: 56, w: 22, h: 16, t: '草地' }, { k: 'terrain', x: 57, y: 76, w: 50, h: 14, t: '起伏地形' },
      { k: 'zone', x: 116, y: 48, w: 40, h: 48, t: '控制室' }, { k: 'facility', x: 122, y: 58, w: 28, h: 10, t: '监控席' }, { k: 'facility', x: 122, y: 74, w: 12, h: 14, t: '机柜' },
      { k: 'path', pts: [[26, 28], [26, 34], [79, 34], [79, 44], [80, 52], [130, 46]] },
    ], site: [6, 8, 56, 40] },
  { id: 'SC-002', name: '楼梯攀爬区', type: '楼梯攀爬', status: 'active', area: 320, difficulty: 4, desc: '标准 15 / 18 / 20 cm 台阶与 15° / 25° 坡道组合，用于双足与四足攀爬训练。', owner: '赵工', updated: '2026-10-16', hours: 640, open: '08:00–20:00', capacity: 4,
    env: { temp: 21.8, hum: 44, lux: 480, noise: 42 }, tags: ['步态训练'],
    elements: [{ name: '标准台阶', kind: '障碍', qty: 3, spec: '踏步高 15 / 18 / 20 cm' }, { name: '坡道', kind: '障碍', qty: 2, spec: '15° / 25°' }, { name: '防护扶手', kind: '设施', qty: 4, spec: '高 1.1 m' }, { name: '防跌落软垫', kind: '设施', qty: 6, spec: '厚 10 cm' }],
    plan: [
      { k: 'zone', x: 4, y: 4, w: 152, h: 92, t: '攀爬训练区' },
      { k: 'stairs', x: 12, y: 14, w: 40, h: 30, t: '15 cm 台阶' }, { k: 'stairs', x: 60, y: 14, w: 40, h: 30, t: '18 cm 台阶' }, { k: 'stairs', x: 108, y: 14, w: 40, h: 30, t: '20 cm 台阶' },
      { k: 'slope', x: 12, y: 56, w: 60, h: 24, t: '15° 坡道' }, { k: 'slope', x: 80, y: 56, w: 68, h: 24, t: '25° 坡道' },
      { k: 'facility', x: 12, y: 84, w: 136, h: 5, t: '防护扶手' }, { k: 'path', pts: [[32, 48], [80, 50], [128, 48]] },
    ], site: [66, 8, 26, 20] },
  { id: 'SC-003', name: '复杂地形区', type: '复杂地形', status: 'active', area: 450, difficulty: 5, desc: '碎石、草地、软垫、起伏地形与门框通行，评测足式机器人的地形适应能力。', owner: '赵工', updated: '2026-10-12', hours: 520, open: '08:00–20:00', capacity: 4,
    env: { temp: 23.1, hum: 51, lux: 610, noise: 45 }, tags: ['步态训练', '泛化'],
    elements: [{ name: '碎石地', kind: '地形', qty: 1, spec: '粒径 2–5 cm' }, { name: '起伏地形块', kind: '地形', qty: 6, spec: '高差 ≤ 12 cm' }, { name: '门框', kind: '障碍', qty: 2, spec: '宽 0.9 m' }, { name: '软垫区', kind: '地形', qty: 1, spec: '邵氏硬度 30' }],
    plan: [
      { k: 'zone', x: 4, y: 4, w: 152, h: 92, t: '地形训练区' },
      { k: 'terrain', x: 10, y: 14, w: 44, h: 32, t: '碎石地' }, { k: 'terrain', x: 60, y: 14, w: 40, h: 32, t: '草地' }, { k: 'terrain', x: 106, y: 14, w: 44, h: 32, t: '软垫' },
      { k: 'terrain', x: 10, y: 56, w: 70, h: 32, t: '起伏地形' }, { k: 'wall', pts: [[96, 56], [96, 88]] }, { k: 'wall', pts: [[124, 56], [124, 88]] },
      { k: 'facility', x: 92, y: 68, w: 8, h: 8, t: '门' }, { k: 'facility', x: 120, y: 68, w: 8, h: 8, t: '门' },
      { k: 'path', pts: [[32, 50], [80, 50], [130, 50], [140, 72]] },
    ], site: [66, 30, 26, 18] },
  { id: 'SC-004', name: '巡检模拟区', type: '巡检模拟', status: 'active', area: 600, difficulty: 3, desc: '模拟工业现场的管道、阀门、仪表与控制柜，用于巡检读表与异常识别训练。', owner: '张杰', updated: '2026-10-15', hours: 780, open: '全天', capacity: 6,
    env: { temp: 24.6, hum: 49, lux: 350, noise: 63 }, tags: ['巡检', '视觉识别'],
    elements: [{ name: '管道阀门组', kind: '设备', qty: 4, spec: 'DN50–DN150' }, { name: '指针仪表', kind: '设备', qty: 12, spec: '压力 / 温度' }, { name: '巡检点位', kind: '点位', qty: 6, spec: 'RFID 标签' }, { name: '控制柜', kind: '设备', qty: 3, spec: '模拟告警灯' }],
    plan: [
      { k: 'zone', x: 4, y: 4, w: 152, h: 92, t: '巡检模拟区' },
      { k: 'equip', x: 12, y: 14, w: 50, h: 12, t: '管道阀门组 A' }, { k: 'equip', x: 12, y: 74, w: 50, h: 12, t: '管道阀门组 B' },
      { k: 'equip', x: 100, y: 14, w: 14, h: 18, t: '柜 1' }, { k: 'equip', x: 118, y: 14, w: 14, h: 18, t: '柜 2' }, { k: 'equip', x: 136, y: 14, w: 14, h: 18, t: '柜 3' },
      { k: 'equip', x: 100, y: 62, w: 50, h: 24, t: '仪表墙' },
      { k: 'path', pts: [[20, 40], [80, 40], [140, 40], [140, 56], [80, 60], [20, 60], [20, 40]] },
      { k: 'point', x: 20, y: 40 }, { k: 'point', x: 80, y: 40 }, { k: 'point', x: 140, y: 40 }, { k: 'point', x: 140, y: 56 }, { k: 'point', x: 80, y: 60 }, { k: 'point', x: 20, y: 60 },
    ], site: [96, 8, 30, 40] },
  { id: 'SC-005', name: '操作训练间', type: '室内操作', status: 'maint', area: 180, difficulty: 2, desc: '桌面抓取、装配、开关门等室内精细操作训练工位。', owner: '张杰', updated: '2026-10-19', hours: 960, open: '08:00–22:00', capacity: 3,
    env: { temp: 22.0, hum: 42, lux: 750, noise: 38 }, tags: ['精细操作'],
    elements: [{ name: '操作台', kind: '设施', qty: 3, spec: '1.6 × 0.8 m' }, { name: '标准物体集', kind: '物料', qty: 120, spec: 'YCB 物体集' }, { name: '门 / 抽屉模块', kind: '设施', qty: 4, spec: '可调阻尼' }],
    plan: [
      { k: 'zone', x: 4, y: 4, w: 152, h: 92, t: '操作训练间' },
      { k: 'facility', x: 14, y: 16, w: 36, h: 16, t: '操作台 1' }, { k: 'facility', x: 62, y: 16, w: 36, h: 16, t: '操作台 2' }, { k: 'facility', x: 110, y: 16, w: 36, h: 16, t: '操作台 3' },
      { k: 'equip', x: 14, y: 60, w: 50, h: 24, t: '物料货架' }, { k: 'facility', x: 80, y: 60, w: 30, h: 24, t: '门 / 抽屉' }, { k: 'facility', x: 120, y: 60, w: 26, h: 24, t: '工具墙' },
    ], site: [130, 8, 24, 20] },
  { id: 'SC-006', name: '水域救援池', type: '水域救援', status: 'active', area: 1200, difficulty: 4, desc: '模拟落水人员搜救场景，支持造浪与目标投放，用于水面搜索与救援训练。', owner: '周工', updated: '2026-10-10', hours: 310, open: '09:00–18:00', capacity: 4,
    env: { temp: 19.5, hum: 78, lux: 820, noise: 56 }, tags: ['应急救援', '水域'],
    elements: [{ name: '救援水池', kind: '设施', qty: 1, spec: '40 × 30 m，水深 2 m' }, { name: '造浪机', kind: '设备', qty: 2, spec: '浪高 ≤ 0.5 m' }, { name: '漂浮假人', kind: '物料', qty: 6, spec: '成人 / 儿童' }, { name: '码头泊位', kind: '设施', qty: 2, spec: '浮动式' }],
    plan: [
      { k: 'water', x: 8, y: 8, w: 120, h: 84, t: '救援水池' }, { k: 'facility', x: 132, y: 14, w: 22, h: 26, t: '码头' }, { k: 'equip', x: 132, y: 50, w: 22, h: 14, t: '造浪机' }, { k: 'equip', x: 132, y: 70, w: 22, h: 14, t: '造浪机' },
      { k: 'point', x: 40, y: 30 }, { k: 'point', x: 82, y: 58 }, { k: 'point', x: 56, y: 76 },
      { k: 'path', pts: [[132, 28], [96, 26], [40, 30], [56, 76], [82, 58], [132, 28]] },
    ], site: [6, 52, 56, 34] },
  { id: 'SC-007', name: '室外越野道', type: '复杂地形', status: 'active', area: 1500, difficulty: 4, desc: '室外环形越野道，含砂石路、涉水坑、坡道与减速带，用于轮式与足式机器人长距离耐久训练。', owner: '赵工', updated: '2026-10-17', hours: 420, open: '08:00–18:00', capacity: 6,
    env: { temp: 17.2, hum: 58, lux: 12000, noise: 51 }, tags: ['室外', '耐久'],
    elements: [{ name: '环形道路', kind: '路线', qty: 1, spec: '全长 600 m，宽 3 m' }, { name: '涉水坑', kind: '地形', qty: 2, spec: '水深 ≤ 20 cm' }, { name: '减速带', kind: '障碍', qty: 8, spec: '高 5 cm' }],
    plan: [
      { k: 'zone', x: 4, y: 4, w: 152, h: 92, t: '越野道' }, { k: 'terrain', x: 20, y: 18, w: 120, h: 10, t: '砂石路' }, { k: 'water', x: 128, y: 40, w: 18, h: 20, t: '涉水坑' },
      { k: 'slope', x: 14, y: 40, w: 18, h: 22, t: '坡道' }, { k: 'terrain', x: 20, y: 72, w: 120, h: 10, t: '减速带路段' }, { k: 'facility', x: 56, y: 40, w: 48, h: 22, t: '中央绿地' },
      { k: 'path', pts: [[24, 23], [136, 23], [137, 50], [136, 77], [24, 77], [23, 50], [24, 23]] },
    ], site: [66, 52, 60, 34] },
  { id: 'SC-008', name: '废墟搜救场景', type: '复杂地形', status: 'draft', area: 800, difficulty: 5, desc: '规划中：坍塌建筑废墟、狭窄通道与烟雾环境，用于搜救类训练。', owner: '周工', updated: '2026-10-08', hours: 0, open: '—', capacity: 4,
    env: { temp: 0, hum: 0, lux: 0, noise: 0 }, tags: ['应急救援', '规划中'],
    elements: [{ name: '狭窄通道', kind: '障碍', qty: 3, spec: '宽 0.6 m' }, { name: '烟雾发生器', kind: '设备', qty: 2, spec: '可调浓度' }],
    plan: [
      { k: 'zone', x: 4, y: 4, w: 152, h: 92, t: '废墟区（规划）' }, { k: 'terrain', x: 14, y: 14, w: 50, h: 34, t: '瓦砾堆' }, { k: 'terrain', x: 90, y: 54, w: 56, h: 34, t: '坍塌楼板' },
      { k: 'wall', pts: [[74, 10], [74, 50]] }, { k: 'wall', pts: [[84, 10], [84, 50]] }, { k: 'equip', x: 100, y: 16, w: 22, h: 14, t: '烟雾发生器' }, { k: 'path', pts: [[40, 52], [79, 52], [79, 14]] },
    ], site: [130, 30, 24, 18] },
]
