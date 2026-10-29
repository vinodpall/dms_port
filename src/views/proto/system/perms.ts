import { reactive } from 'vue'
/** 权限目录：模块 → 页面 → 按钮；key 形如 device.list.add */
export interface PermNode { key: string; title: string; children?: PermNode[] }
const P = (m: string, pages: [string, string, [string, string][]][]): PermNode[] =>
  pages.map(([k, t, btns]) => ({ key: `${m}.${k}`, title: t, children: [[ 'view', '查看' ] as [string, string], ...btns].map(([b, bt]) => ({ key: `${m}.${k}.${b}`, title: bt })) }))
export const CATALOG: PermNode[] = [
  { key: 'device', title: '机器人设备管理', children: P('device', [
    ['dash', '设备概览', []],
    ['wall', '监控大屏', [['tour', '轮巡'], ['full', '全屏']]],
    ['list', '设备列表', [['add', '新增设备'], ['edit', '编辑'], ['del', '删除'], ['teleop', '遥操作']]],
    ['models', '型号管理', [['add', '新增型号'], ['edit', '编辑'], ['del', '删除'], ['types', '设备类型']]],
  ]) },
  { key: 'biz', title: '机器人业务管理', children: P('biz', [
    ['home', '首页', [['dispatch', '任务下发'], ['stop', '停止任务'], ['estop', '急停']]],
    ['nav', '导航管理', [['build', '录包建图'], ['loc', '导航定位'], ['edit', '地图编辑'], ['file', '文件管理']]],
    ['task', '任务管理', [['route', '循迹路线'], ['pub', '发布点任务'], ['multi', '多任务组'], ['sched', '定时任务'], ['start', '启动任务']]],
    ['log', '日志管理', [['handle', '警情处置'], ['export', '导出']]],
  ]) },
  { key: 'collect', title: '数据采集', children: P('collect', [
    ['dashboard', '数据看板', []],
    ['tasks', '采集任务', [['add', '新建任务'], ['edit', '编辑'], ['del', '删除'], ['start', '开始采集']]],
    ['monitor', '实时监控', [['stop', '停止采集']]],
    ['pipeline', '处理流水线', [['run', '运行'], ['edit', '编辑']]],
    ['annotate', '标注工作台', [['submit', '提交标注']]],
    ['review', '审核工作台', [['pass', '通过'], ['reject', '驳回']]],
    ['dict', '标注字典', [['edit', '编辑']]],
    ['datasets', '数据集管理', [['add', '新建数据集'], ['export', '导出'], ['del', '删除']]],
    ['storage', '存储管理', [['edit', '配置']]],
    ['devices', '设备管理', [['edit', '编辑']]],
    ['logs', '操作审计日志', [['export', '导出']]],
  ]) },
  { key: 'sim', title: '机器人仿真', children: P('sim', [
    ['stage', '场景编辑', [['import', '导入模型'], ['save', '保存场景']]],
    ['train', '训练任务', [['add', '新建训练'], ['stop', '停止训练'], ['export', '导出策略']]],
  ]) },
  { key: 'scene', title: '场景管理', children: P('scene', [
    ['lib', '训练场景', [['add', '新增场景'], ['edit', '编辑'], ['del', '删除'], ['book', '使用排期']]],
    ['screen', '大屏展示', []],
  ]) },
]
const leaves = (n: PermNode[]): string[] => n.flatMap((x) => (x.children ? leaves(x.children) : [x.key]))
export const ALL = leaves(CATALOG)
export const leafOf = (k: string) => ALL.filter((x) => x === k || x.startsWith(k + '.'))

export interface Role { id: string; name: string; desc: string; perms: string[]; builtin?: boolean }
export interface User { id: string; account: string; name: string; phone: string; roleIds: string[]; enabled: boolean; last: string }
const pick = (...mods: string[]) => ALL.filter((k) => mods.some((m) => k.startsWith(m + '.')))
export const sys = reactive({
  roles: [
    { id: 'r1', name: '系统管理员', desc: '拥有全部模块与系统管理权限', perms: [...ALL], builtin: true },
    { id: 'r2', name: '巡检操作员', desc: '下发与监控巡检任务', perms: [...pick('biz.home', 'biz.task', 'device.dash', 'device.wall')] },
    { id: 'r3', name: '设备运维', desc: '维护设备台账与型号', perms: [...pick('device')] },
    { id: 'r4', name: '数据标注员', desc: '数据标注与审核', perms: [...pick('collect.annotate', 'collect.review', 'collect.dict')] },
    { id: 'r5', name: '仿真工程师', desc: '仿真场景与训练任务', perms: [...pick('sim', 'scene.lib')] },
  ] as Role[],
  users: [
    { id: 'u1', account: 'admin', name: '周工', phone: '138****2011', roleIds: ['r1'], enabled: true, last: '2025-06-12 13:58' },
    { id: 'u2', account: 'zhangjie', name: '张杰', phone: '139****8620', roleIds: ['r2'], enabled: true, last: '2025-06-12 09:12' },
    { id: 'u3', account: 'liming', name: '李明', phone: '137****3305', roleIds: ['r2', 'r3'], enabled: true, last: '2025-06-11 18:40' },
    { id: 'u4', account: 'wangfang', name: '王芳', phone: '136****7719', roleIds: ['r4'], enabled: true, last: '2025-06-11 16:05' },
    { id: 'u5', account: 'chenhao', name: '陈浩', phone: '135****1902', roleIds: ['r5'], enabled: false, last: '2025-05-30 10:22' },
    { id: 'u6', account: 'liuyang', name: '刘洋', phone: '188****4410', roleIds: ['r3'], enabled: true, last: '2025-06-10 14:31' },
  ] as User[],
})
