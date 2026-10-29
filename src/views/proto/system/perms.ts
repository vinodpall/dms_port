import { reactive } from 'vue'
/** 权限目录：模块 → 页面 → 按钮；key 形如 device.list.add */
export interface PermNode { key: string; title: string; children?: PermNode[] }
type Sub = [string, string, string[]] // [key, 子页面, 按钮]
type Menu = [string, string, Sub[]]
/** 模块 → 菜单 → 子页面 → 按钮；每个子页面自带“查看”，取消查看即隐藏该子页面 */
const M = (m: string, title: string, menus: Menu[]): PermNode => ({
  key: m, title,
  children: menus.map(([mk, mt, subs]) => ({ key: `${m}.${mk}`, title: mt,
    children: subs.map(([sk, st, btns]) => ({ key: `${m}.${mk}.${sk}`, title: st,
      children: ['查看', ...btns].map((b, i) => ({ key: `${m}.${mk}.${sk}.${i ? 'b' + i : 'view'}`, title: b })) })) })),
})
const one = (k: string, t: string, btns: string[]): Menu => [k, t, [['main', t, btns]]]
export const CATALOG: PermNode[] = [
  M('device', '机器人设备管理', [
    one('dash', '设备概览', ['跳转设备列表', '查看设备详情']),
    one('wall', '监控大屏', ['选择通道', '分屏切换', '主次画面', '单路放大', '关闭画面', '全屏', '清空画面']),
    ['list', '设备列表', [
      ['list', '设备列表', ['新增设备', '编辑', '删除', '导出', '所属区域管理']],
      ['detail', '设备详情', ['编辑', '查看实时数据', '查看视频']],
      ['teleop', '遥操作', ['进入遥操作', '运动控制', '云台控制', '起飞 / 降落', '返航', '急停 / 解除急停']],
    ]],
    ['models', '型号管理', [
      ['list', '型号列表', ['新增型号', '编辑型号', '删除型号', '上传型号图片']],
      ['types', '设备类型', ['新增类型', '编辑类型', '删除类型']],
    ]],
  ]),
  M('biz', '机器人业务管理', [
    ['home', '首页', [
      ['main', '首页总览', ['切换机器人', '任务下发', '关闭任务', '急停', '查看视频', '切换地图视图']],
      ['alarm', '警情与告警配置', ['警情处置', '新增告警规则', '添加传感器', '保存并下发', '删除规则']],
    ]],
    ['nav', '导航管理', [
      ['build', '录包建图', ['开始录包', '完成录制', '生成地图', '删除数据包']],
      ['loc', '导航定位', ['重定位', '确认重定位', 'INS 初始化', '原点设置', '循迹避障开关', '查看实时地图', '终止导航']],
      ['edit', '地图编辑', ['功能区绘制', '撤销', '生成栅格地图', '新建融合地图', '提交']],
      ['file', '文件管理', ['预览', '编辑', '下载', '删除地图']],
    ]],
    ['task', '任务管理', [
      ['route', '循迹路线', ['录制路线', '完成录制', '保存上传', '轨迹平滑', '新增任务点', '编辑任务点', '云台控制', '转到预置点', '下发任务', '删除路线']],
      ['pub', '发布点任务', ['新增发布点任务', '编辑', '新增任务组', '下发任务', '删除']],
      ['multi', '多任务组', ['新建多任务组', '添加任务', '启动任务', '停止任务', '异常时原地启动', '删除']],
      ['sched', '定时任务', ['新增定时循迹', '编辑', '启用 / 停用', '删除']],
    ]],
    ['log', '日志管理', [
      ['rec', '警情记录', ['查询', '轮次信息', '警情处置', '导出', '删除']],
      ['op', '操作日志', ['查询', '导出']],
    ]],
  ]),
  M('collect', '数据采集', [
    one('dashboard', '数据看板', ['切换时间范围', '导出看板']),
    ['tasks', '采集任务', [['list', '任务列表', ['新建任务', '编辑', '删除', '开始采集', '暂停 / 结束']], ['detail', '任务详情', ['分配操作员', '查看数据']]]],
    one('monitor', '实时监控', ['切换工位', '停止采集', '标记异常']),
    one('pipeline', '处理流水线', ['新建流水线', '运行', '编辑', '停止', '删除']),
    one('annotate', '标注工作台', ['领取任务', '保存', '提交标注']),
    one('review', '审核工作台', ['通过', '驳回', '批量审核']),
    one('dict', '标注字典', ['新增', '编辑', '删除']),
    one('datasets', '数据集管理', ['新建数据集', '版本发布', '导出', '删除']),
    one('storage', '存储管理', ['新增存储', '配置', '清理']),
    one('devices', '采集设备', ['新增', '编辑', '删除']),
    one('logs', '操作审计日志', ['查询', '导出']),
  ]),
  M('sim', '机器人仿真', [
    one('assets', '模型资产', ['上传 URDF', '开始转换', '下载 USD', '用于训练', '删除模型']),
    one('train', '训练任务', ['新建训练任务', '启动训练', '停止训练', '导出策略', '删除']),
    one('view', '实时视口', ['切换任务', '切换环境']),
    one('monitor', '训练监控', ['切换任务', '导出 JSON', '导出报告']),
  ]),
  M('scene', '场景管理', [
    ['lib', '训练场景', [['list', '场景列表', ['新建场景', '编辑', '删除']], ['layout', '场景布局', ['编辑布局', '保存布局']], ['book', '使用排期', ['新增排期', '取消排期']]]],
    one('screen', '大屏展示', ['全屏', '切换场景']),
  ]),
  M('system', '系统管理', [
    one('user', '用户管理', ['新增用户', '编辑', '启用 / 停用', '重置密码', '删除']),
    one('role', '角色管理', ['新增角色', '编辑', '删除']),
    one('perm', '权限配置', ['修改权限', '保存']),
  ]),
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
