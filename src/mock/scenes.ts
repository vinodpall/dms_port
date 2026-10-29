/** 场景管理模块数据 */

export type SceneStatus = 'planning' | 'building' | 'trial' | 'active' | 'maint' | 'retired'
export type PlanKind = 'zone' | 'stairs' | 'slope' | 'terrain' | 'water' | 'equip' | 'facility' | 'point' | 'path' | 'wall'
export interface PlanItem { k: PlanKind; x?: number; y?: number; w?: number; h?: number; t?: string; pts?: [number, number][] }

export interface SceneFacility {
  id: string
  name: string
  category: string   // 障碍设施 | 安全设施 | 电气设施 | 标定设施 | 辅助设施
  qty: number
  spec: string
  installedAt: string
  status: 'normal' | 'damaged' | 'repairing' | 'scrapped'
  remark: string
}

export interface SceneLifecycleRecord {
  status: SceneStatus
  date: string
  operator: string
  remark: string
}

export interface SceneBooking {
  id: string
  date: string
  timeStart: string
  timeEnd: string
  team: string
  purpose: string
  status: 'confirmed' | 'pending' | 'cancelled'
  createdBy: string
  createdAt: string
}

export interface Scene {
  id: string
  name: string
  type: string
  status: SceneStatus
  area: number
  capacity: number
  open: string
  owner: string
  location: string
  difficulty: number
  desc: string
  tags: string[]
  createdAt: string
  plan: PlanItem[]
  site: [number, number, number, number]
  facilities: SceneFacility[]
  lifecycle: SceneLifecycleRecord[]
  bookings: SceneBooking[]
}

export const SCENE_TYPES = ['综合', '楼梯攀爬', '复杂地形', '巡检模拟', '室内操作', '水域救援']

export const TYPE_COLOR: Record<string, string> = {
  综合: '#2ED3E6', 楼梯攀爬: '#FFC15C', 复杂地形: '#45E3A8',
  巡检模拟: '#5B9BFF', 室内操作: '#B48CFF', 水域救援: '#3FA9F5',
}

export const SCENE_STATUS: Record<SceneStatus, { t: string; b: 'success'|'processing'|'warning'|'default'|'error'; c: string }> = {
  planning: { t: '规划中', b: 'default',    c: '#8EA6BE' },
  building: { t: '建设中', b: 'processing', c: '#2ED3E6' },
  trial:    { t: '试运行', b: 'warning',    c: '#FFC15C' },
  active:   { t: '正式启用', b: 'success',  c: '#45E3A8' },
  maint:    { t: '维护中', b: 'warning',    c: '#FFA940' },
  retired:  { t: '已停用', b: 'error',      c: '#FF7A7A' },
}

export const LC_FLOW: SceneStatus[] = ['planning', 'building', 'trial', 'active', 'maint', 'retired']

export const FACILITY_CATEGORIES = ['障碍设施', '安全设施', '电气设施', '标定设施', '辅助设施']
export const FACILITY_STATUS: Record<string, { t: string; c: string }> = {
  normal:    { t: '正常',   c: '#45E3A8' },
  damaged:   { t: '损坏',   c: '#FF7A7A' },
  repairing: { t: '维修中', c: '#FFC15C' },
  scrapped:  { t: '已报废', c: '#8EA6BE' },
}

export const PLAN_LEGEND: { k: PlanKind; t: string; c: string }[] = [
  { k: 'facility', t: '设施',      c: '#2ED3E6' },
  { k: 'equip',    t: '设备',      c: '#B48CFF' },
  { k: 'stairs',   t: '台阶/坡道', c: '#FFC15C' },
  { k: 'terrain',  t: '地形',      c: '#45E3A8' },
  { k: 'water',    t: '水域',      c: '#3FA9F5' },
  { k: 'path',     t: '路线',      c: '#7FF3FF' },
]

export const SCENES: Scene[] = [
  {
    id: 'SC-001', name: '综合训练场 A', type: '综合', status: 'active',
    area: 2400, capacity: 12, open: '08:00–22:00', owner: '周工',
    location: 'A 栋 1 层', difficulty: 3, createdAt: '2026-01-10',
    desc: '多功能综合场地，包含停机充电区、巡检区、操作区、攀爬区与地形区，可按训练科目灵活组合。',
    tags: ['标准场景', '多区组合'],
    plan: [
      { k: 'zone', x: 4, y: 4, w: 44, h: 28, t: '停机充电区' }, { k: 'point', x: 14, y: 20 }, { k: 'point', x: 26, y: 20 }, { k: 'point', x: 38, y: 20 },
      { k: 'zone', x: 52, y: 4, w: 54, h: 40, t: '巡检区' }, { k: 'equip', x: 58, y: 12, w: 20, h: 9, t: '管道阀门' }, { k: 'equip', x: 82, y: 12, w: 18, h: 9, t: '仪表柜' },
      { k: 'zone', x: 110, y: 4, w: 46, h: 40, t: '操作区' }, { k: 'facility', x: 116, y: 13, w: 16, h: 10, t: '操作台' }, { k: 'facility', x: 136, y: 13, w: 14, h: 10, t: '工位' },
      { k: 'zone', x: 4, y: 36, w: 44, h: 60, t: '攀爬区' }, { k: 'stairs', x: 9, y: 46, w: 34, h: 18, t: '台阶' }, { k: 'slope', x: 9, y: 70, w: 34, h: 20, t: '坡道' },
      { k: 'zone', x: 52, y: 48, w: 60, h: 48, t: '地形区' }, { k: 'terrain', x: 57, y: 56, w: 24, h: 16, t: '碎石' }, { k: 'terrain', x: 85, y: 56, w: 22, h: 16, t: '草地' }, { k: 'terrain', x: 57, y: 76, w: 50, h: 14, t: '起伏地形' },
      { k: 'zone', x: 116, y: 48, w: 40, h: 48, t: '控制室' }, { k: 'facility', x: 122, y: 58, w: 28, h: 10, t: '监控席' },
      { k: 'path', pts: [[26, 28], [26, 34], [79, 34], [79, 44], [80, 52], [130, 46]] },
    ],
    site: [6, 8, 56, 40],
    facilities: [
      { id: 'F-001-01', name: '自动充电桩', category: '电气设施', qty: 6, spec: '48V 直流，自动对接', installedAt: '2026-01-18', status: 'normal', remark: '' },
      { id: 'F-001-02', name: '标准台阶组', category: '障碍设施', qty: 2, spec: '踏步高 15/18 cm，宽 2 m', installedAt: '2026-01-18', status: 'normal', remark: '' },
      { id: 'F-001-03', name: '15° 坡道',   category: '障碍设施', qty: 1, spec: '长 6 m，防滑纹理', installedAt: '2026-01-18', status: 'normal', remark: '' },
      { id: 'F-001-04', name: 'UWB 定位基站', category: '标定设施', qty: 12, spec: '精度 ±10 cm', installedAt: '2026-02-05', status: 'normal', remark: '' },
      { id: 'F-001-05', name: '4K 球形摄像头', category: '辅助设施', qty: 8, spec: '360° 旋转，夜视', installedAt: '2026-02-05', status: 'normal', remark: '' },
      { id: 'F-001-06', name: '防跌落软垫', category: '安全设施', qty: 6, spec: '厚 10 cm，邵氏硬度 30', installedAt: '2026-01-20', status: 'damaged', remark: '角落处破损，待更换' },
    ],
    lifecycle: [
      { status: 'planning', date: '2026-01-05', operator: '周工', remark: '完成场地需求调研，立项' },
      { status: 'building', date: '2026-01-10', operator: '周工', remark: '开始场地建设与设施安装' },
      { status: 'trial',    date: '2026-02-01', operator: '赵工', remark: '设施安装完毕，进入试运行验证阶段' },
      { status: 'active',   date: '2026-02-20', operator: '周工', remark: '试运行验收通过，正式对外开放' },
    ],
    bookings: [
      { id: 'BK-001', date: '2026-10-21', timeStart: '09:00', timeEnd: '11:00', team: '二组', purpose: '综合科目训练', status: 'confirmed', createdBy: '赵工', createdAt: '2026-10-18' },
      { id: 'BK-002', date: '2026-10-21', timeStart: '14:00', timeEnd: '16:30', team: '一组', purpose: '多场景联合演练', status: 'confirmed', createdBy: '周工', createdAt: '2026-10-18' },
      { id: 'BK-003', date: '2026-10-22', timeStart: '09:30', timeEnd: '12:00', team: '三组', purpose: '设备验收测试', status: 'pending', createdBy: '张杰', createdAt: '2026-10-19' },
      { id: 'BK-004', date: '2026-10-23', timeStart: '10:00', timeEnd: '12:00', team: '外部单位', purpose: '参观演示', status: 'pending', createdBy: '周工', createdAt: '2026-10-20' },
    ],
  },
  {
    id: 'SC-002', name: '楼梯攀爬区', type: '楼梯攀爬', status: 'active',
    area: 320, capacity: 4, open: '08:00–20:00', owner: '赵工',
    location: 'A 栋 1 层', difficulty: 4, createdAt: '2026-01-15',
    desc: '标准 15/18/20 cm 台阶与 15°/25° 坡道组合，用于双足与四足攀爬训练。',
    tags: ['步态训练'],
    plan: [
      { k: 'zone', x: 4, y: 4, w: 152, h: 92, t: '攀爬训练区' },
      { k: 'stairs', x: 12, y: 14, w: 40, h: 30, t: '15 cm 台阶' }, { k: 'stairs', x: 60, y: 14, w: 40, h: 30, t: '18 cm 台阶' }, { k: 'stairs', x: 108, y: 14, w: 40, h: 30, t: '20 cm 台阶' },
      { k: 'slope', x: 12, y: 56, w: 60, h: 24, t: '15° 坡道' }, { k: 'slope', x: 80, y: 56, w: 68, h: 24, t: '25° 坡道' },
      { k: 'facility', x: 12, y: 84, w: 136, h: 5, t: '防护扶手' }, { k: 'path', pts: [[32, 48], [80, 50], [128, 48]] },
    ],
    site: [66, 8, 26, 20],
    facilities: [
      { id: 'F-002-01', name: '15 cm 标准台阶', category: '障碍设施', qty: 1, spec: '宽 2 m，踏步高 15 cm，共 6 级', installedAt: '2026-01-22', status: 'normal', remark: '' },
      { id: 'F-002-02', name: '18 cm 标准台阶', category: '障碍设施', qty: 1, spec: '宽 2 m，踏步高 18 cm，共 6 级', installedAt: '2026-01-22', status: 'normal', remark: '' },
      { id: 'F-002-03', name: '20 cm 标准台阶', category: '障碍设施', qty: 1, spec: '宽 2 m，踏步高 20 cm，共 6 级', installedAt: '2026-01-22', status: 'normal', remark: '' },
      { id: 'F-002-04', name: '15° 坡道', category: '障碍设施', qty: 1, spec: '长 5 m，防滑纹理', installedAt: '2026-01-22', status: 'normal', remark: '' },
      { id: 'F-002-05', name: '25° 坡道', category: '障碍设施', qty: 1, spec: '长 5 m，防滑纹理', installedAt: '2026-01-22', status: 'repairing', remark: '坡道表面防滑层部分脱落，维修中' },
      { id: 'F-002-06', name: '防跌落软垫', category: '安全设施', qty: 8, spec: '厚 10 cm', installedAt: '2026-01-22', status: 'normal', remark: '' },
      { id: 'F-002-07', name: '防护扶手', category: '安全设施', qty: 4, spec: '高 1.1 m，不锈钢', installedAt: '2026-01-22', status: 'normal', remark: '' },
    ],
    lifecycle: [
      { status: 'planning', date: '2026-01-08', operator: '赵工', remark: '确认台阶规格需求' },
      { status: 'building', date: '2026-01-15', operator: '赵工', remark: '台阶与坡道安装' },
      { status: 'trial',    date: '2026-02-05', operator: '周工', remark: '进行安全性验证测试' },
      { status: 'active',   date: '2026-02-18', operator: '赵工', remark: '验收通过，正式启用' },
    ],
    bookings: [
      { id: 'BK-010', date: '2026-10-21', timeStart: '08:30', timeEnd: '10:30', team: '二组', purpose: '台阶攀爬训练', status: 'confirmed', createdBy: '赵工', createdAt: '2026-10-17' },
      { id: 'BK-011', date: '2026-10-22', timeStart: '14:00', timeEnd: '16:00', team: '一组', purpose: '坡道通行测试', status: 'pending', createdBy: '张杰', createdAt: '2026-10-19' },
    ],
  },
  {
    id: 'SC-003', name: '巡检模拟区', type: '巡检模拟', status: 'active',
    area: 600, capacity: 6, open: '全天', owner: '张杰',
    location: 'B 栋 1 层', difficulty: 3, createdAt: '2026-02-01',
    desc: '模拟工业现场的管道、阀门、仪表与控制柜，用于巡检读表与异常识别训练。',
    tags: ['巡检', '视觉识别'],
    plan: [
      { k: 'zone', x: 4, y: 4, w: 152, h: 92, t: '巡检模拟区' },
      { k: 'equip', x: 12, y: 14, w: 50, h: 12, t: '管道阀门组 A' }, { k: 'equip', x: 12, y: 74, w: 50, h: 12, t: '管道阀门组 B' },
      { k: 'equip', x: 100, y: 14, w: 14, h: 18, t: '柜 1' }, { k: 'equip', x: 118, y: 14, w: 14, h: 18, t: '柜 2' }, { k: 'equip', x: 136, y: 14, w: 14, h: 18, t: '柜 3' },
      { k: 'equip', x: 100, y: 62, w: 50, h: 24, t: '仪表墙' },
      { k: 'path', pts: [[20, 40], [80, 40], [140, 40], [140, 56], [80, 60], [20, 60], [20, 40]] },
      { k: 'point', x: 20, y: 40 }, { k: 'point', x: 80, y: 40 }, { k: 'point', x: 140, y: 40 },
    ],
    site: [96, 8, 30, 40],
    facilities: [
      { id: 'F-003-01', name: '管道阀门组', category: '障碍设施', qty: 4, spec: 'DN50–DN150，含手动阀与电动阀', installedAt: '2026-02-10', status: 'normal', remark: '' },
      { id: 'F-003-02', name: '指针压力表', category: '标定设施', qty: 8, spec: '0–1.6 MPa，精度 1.5 级', installedAt: '2026-02-10', status: 'normal', remark: '' },
      { id: 'F-003-03', name: '指针温度表', category: '标定设施', qty: 4, spec: '0–100℃', installedAt: '2026-02-10', status: 'normal', remark: '' },
      { id: 'F-003-04', name: '模拟控制柜', category: '辅助设施', qty: 3, spec: '含告警指示灯、按钮面板', installedAt: '2026-02-12', status: 'normal', remark: '' },
      { id: 'F-003-05', name: 'RFID 巡检点', category: '标定设施', qty: 6, spec: 'UHF 频段，读取距离 ≤ 1 m', installedAt: '2026-02-15', status: 'normal', remark: '' },
    ],
    lifecycle: [
      { status: 'planning', date: '2026-01-20', operator: '张杰', remark: '调研工业巡检场景需求' },
      { status: 'building', date: '2026-02-01', operator: '张杰', remark: '管道、仪表、控制柜安装' },
      { status: 'trial',    date: '2026-02-20', operator: '周工', remark: '巡检路线标定与点位测试' },
      { status: 'active',   date: '2026-03-05', operator: '张杰', remark: '正式启用' },
    ],
    bookings: [
      { id: 'BK-020', date: '2026-10-21', timeStart: '09:00', timeEnd: '12:00', team: '三组', purpose: '仪表识读训练', status: 'confirmed', createdBy: '张杰', createdAt: '2026-10-16' },
    ],
  },
  {
    id: 'SC-004', name: '水域救援池', type: '水域救援', status: 'maint',
    area: 1200, capacity: 4, open: '09:00–18:00', owner: '周工',
    location: 'C 栋室外', difficulty: 4, createdAt: '2026-03-01',
    desc: '模拟落水人员搜救场景，支持造浪与目标投放，用于水面搜索与救援训练。',
    tags: ['应急救援', '水域'],
    plan: [
      { k: 'water', x: 8, y: 8, w: 120, h: 84, t: '救援水池' },
      { k: 'facility', x: 132, y: 14, w: 22, h: 26, t: '码头' },
      { k: 'equip', x: 132, y: 50, w: 22, h: 14, t: '造浪机' },
      { k: 'point', x: 40, y: 30 }, { k: 'point', x: 82, y: 58 },
    ],
    site: [6, 52, 56, 34],
    facilities: [
      { id: 'F-004-01', name: '救援水池',   category: '辅助设施', qty: 1, spec: '40×30 m，水深 2 m，防水涂层', installedAt: '2026-03-10', status: 'normal', remark: '' },
      { id: 'F-004-02', name: '造浪机',     category: '辅助设施', qty: 2, spec: '最大浪高 0.5 m，变频调节', installedAt: '2026-03-10', status: 'damaged', remark: '2 号机电机过热，停机维修中' },
      { id: 'F-004-03', name: '浮动码头',   category: '辅助设施', qty: 2, spec: '浮动式，承重 500 kg', installedAt: '2026-03-12', status: 'normal', remark: '' },
      { id: 'F-004-04', name: '漂浮假人',   category: '标定设施', qty: 6, spec: '成人/儿童各 3 具', installedAt: '2026-03-15', status: 'normal', remark: '' },
      { id: 'F-004-05', name: '救生护栏',   category: '安全设施', qty: 1, spec: '水池四周，高 1.2 m', installedAt: '2026-03-12', status: 'normal', remark: '' },
    ],
    lifecycle: [
      { status: 'planning', date: '2026-02-20', operator: '周工', remark: '立项，确认水池规格' },
      { status: 'building', date: '2026-03-01', operator: '周工', remark: '水池建设及设备安装' },
      { status: 'trial',    date: '2026-04-10', operator: '赵工', remark: '造浪测试，漂浮目标验证' },
      { status: 'active',   date: '2026-04-25', operator: '周工', remark: '正式启用' },
      { status: 'maint',    date: '2026-10-18', operator: '周工', remark: '2 号造浪机故障，进入维护模式' },
    ],
    bookings: [],
  },
  {
    id: 'SC-005', name: '废墟搜救场景', type: '复杂地形', status: 'building',
    area: 800, capacity: 4, open: '—', owner: '周工',
    location: 'B 栋 2 层', difficulty: 5, createdAt: '2026-09-01',
    desc: '坍塌建筑废墟、狭窄通道与烟雾环境，用于搜救类训练，预计 11 月完工。',
    tags: ['应急救援', '建设中'],
    plan: [
      { k: 'zone', x: 4, y: 4, w: 152, h: 92, t: '废墟区（建设中）' },
      { k: 'terrain', x: 14, y: 14, w: 50, h: 34, t: '瓦砾堆' },
      { k: 'terrain', x: 90, y: 54, w: 56, h: 34, t: '坍塌楼板' },
      { k: 'wall', pts: [[74, 10], [74, 50]] }, { k: 'wall', pts: [[84, 10], [84, 50]] },
    ],
    site: [130, 30, 24, 18],
    facilities: [
      { id: 'F-005-01', name: '狭窄通道框架', category: '障碍设施', qty: 3, spec: '宽 0.6 m，高 1.2 m', installedAt: '2026-10-01', status: 'normal', remark: '安装中' },
      { id: 'F-005-02', name: '烟雾发生器',   category: '辅助设施', qty: 2, spec: '可调浓度，低毒无味', installedAt: '—', status: 'normal', remark: '待采购' },
    ],
    lifecycle: [
      { status: 'planning', date: '2026-08-15', operator: '周工', remark: '需求调研，完成方案设计' },
      { status: 'building', date: '2026-09-01', operator: '周工', remark: '开始施工，预计 2026-11-30 完工' },
    ],
    bookings: [],
  },
]
