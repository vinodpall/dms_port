export type RoleKey = 'admin' | 'op' | 'ann' | 'rev' | 'mt'
export const PLATFORM = { name: '具身智能训练场', en: 'EMBODIED AI TRAINING GROUND' }
export const ROLES: Record<RoleKey, { name: string; user: string; init: string }> = {
  admin: { name: '系统管理员', user: '周工', init: '周' },
  op: { name: '采集操作员', user: '张杰', init: '张' },
  ann: { name: '标注员', user: '林悦', init: '林' },
  rev: { name: '审核员', user: '陈静', init: '陈' },
  mt: { name: '维护工程师', user: '赵工', init: '赵' },
}
const env = import.meta.env as Record<string, string | undefined>

/** 平台五大模块（各自为独立站点）。url 来自 .env；sso 表示跳转时携带角色，目标站点免二次登录 */
export type ModuleKey = 'device' | 'biz' | 'collect' | 'sim' | 'scene'
export interface ModuleDef { key: ModuleKey; title: string; en: string; icon: string; desc: string; tags: string[]; roles: RoleKey[]; url: string; sso?: boolean; hue: string; /** 平台内置原型页路由（url 未配置时使用） */ proto?: string }
export const MODULES: ModuleDef[] = [
  { key: 'device', title: '机器人设备管理', en: 'Robot Device', icon: 'robot', desc: '适配轮式、四足、双足、无人机等 30+ 类机器人，统一管控设备信息、在线与工作状态、实时数据。', tags: ['设备台账', '状态监控', '全域管控'], roles: ['admin', 'mt'], url: env.VITE_URL_DEVICE ?? '', hue: '#2F8BFF', proto: '/m/device' },
  { key: 'biz', title: '机器人业务管理', en: 'Robot Business', icon: 'route', desc: '巡检业务编排：数据总览、地图与视频展示、预警、录包建图、轨迹录制、巡检任务编辑调度。', tags: ['巡检任务', '地图展示', '预警日志'], roles: ['admin', 'op', 'mt'], url: env.VITE_URL_BIZ ?? '', hue: '#19B5A5' },
  { key: 'collect', title: '数据采集', en: 'Data Collection', icon: 'db', desc: '采集任务、实时监控、数据处理流水线、标注校验、数据集与存储管理，覆盖具身数据全流程。', tags: ['采集任务', '标注校验', '数据集'], roles: ['admin', 'op', 'ann', 'rev', 'mt'], url: env.VITE_URL_COLLECT ?? '', sso: true, hue: '#5B7CFA' },
  { key: 'sim', title: '机器人仿真', en: 'Simulation', icon: 'cube', desc: 'GPU 加速仿真：URDF 转 USD 模型导入、自定义仿真场景、强化学习框架与任务构建。', tags: ['URDF→USD', '强化学习', '仿真场景'], roles: ['admin', 'ann', 'rev'], url: env.VITE_URL_SIM ?? '', hue: '#A667F0', proto: '/m/sim' },
  { key: 'scene', title: '场景管理', en: 'Training Ground', icon: 'map', desc: '管理训练场物理场景的布局、场景要素、环境状态与使用排期，并提供训练场实时态势大屏。', tags: ['训练场景', '使用排期', '大屏展示'], roles: ['admin', 'op', 'ann', 'rev'], url: env.VITE_URL_SCENE ?? '', hue: '#F08A3C', proto: '/m/scene' },
]
export const DEMO_ACCOUNTS: { u: string; role: RoleKey }[] = [
  { u: 'admin', role: 'admin' }, { u: 'zhangjie', role: 'op' }, { u: 'linyue', role: 'ann' }, { u: 'chenjing', role: 'rev' }, { u: 'zhaogong', role: 'mt' },
]
export const DEMO_PASSWORD = '123456'
