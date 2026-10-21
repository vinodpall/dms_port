import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ScenKey } from '@/collect/constants'
import { useLogs } from './logs'

/**
 * 统一标注字典：标注员选子任务/物体、审核员校验标签都用这一份。
 * 动作分三级：基础动作 / 复合动作（即子任务，标注的主粒度）/ 异常动作；每次修改递增小版本号。
 */
export type DictCat = 'action' | 'object'
export type ActLevel = 'basic' | 'compound' | 'abnormal'
export const LEVELS: Record<ActLevel, string> = { basic: '基础动作', compound: '复合动作（子任务）', abnormal: '异常动作' }
export interface DictItem {
  id: string; code: string; name: string; category: DictCat; level?: ActLevel; scen: ScenKey | 'common'
  aliases: string[]; desc: string; /** 该场景的核心必选子任务 */ required?: boolean
  status: 'active' | 'inactive'; updatedAt: string; updatedBy: string
}
export interface DictChange { ver: string; t: string; by: string; summary: string }

const T = '2026-10-12 16:00'
const A = (id: string, code: string, name: string, level: ActLevel, scen: DictItem['scen'], aliases: string[], desc: string, required = false): DictItem =>
  ({ id, code, name, category: 'action', level, scen, aliases, desc, required, status: 'active', updatedAt: T, updatedBy: '陈静' })
const O = (id: string, code: string, name: string, scen: DictItem['scen'], aliases: string[], desc: string): DictItem =>
  ({ id, code, name, category: 'object', scen, aliases, desc, status: 'active', updatedAt: T, updatedBy: '陈静' })

const DEFAULTS: DictItem[] = [
  A('D-A01', 'GRASP', '抓取', 'basic', 'common', ['拿取', '拾取', 'Grasp'], '末端夹爪或人手接触工件并施加夹紧力提起'),
  A('D-A02', 'MOVE', '移动', 'basic', 'common', ['搬运', 'Move'], '持物从一处平移到另一处'),
  A('D-A03', 'RELEASE', '放置', 'basic', 'common', ['松开', 'Release'], '松开夹爪，工件稳定落位'),
  A('D-A04', 'PRESS', '按压', 'basic', 'common', ['推压', 'Press'], '沿法向施加推力'),
  A('D-S01', 'LOAD', '取件上台', 'compound', 'qmd', ['上料', '取件'], '抓取工件移送至检测工位并安放平稳', true),
  A('D-S02', 'CLAMP', '夹紧密封', 'compound', 'qmd', ['固定', '闭合密封', 'Seal'], '气动机构闭合压紧，密封胶垫完全压实气阀孔', true),
  A('D-S03', 'INFLATE', '充气保压', 'compound', 'qmd', ['加压', '气密测试'], '向工件充入测试气体并保持稳定', true),
  A('D-S04', 'READ', '读数判定', 'compound', 'qmd', ['观察压降', '判级'], '观察微压表压降，判定气密是否合格', true),
  A('D-S05', 'UNLOAD', '取下放回', 'compound', 'qmd', ['下料', '复位'], '松开夹具，取出工件移送至传输托盘'),
  A('D-S06', 'PICK_PLUG', '取防护堵', 'compound', 'fhd', ['取料'], '从料盒中抓取硅胶防护堵', true),
  A('D-S07', 'ALIGN', '对准孔位', 'compound', 'fhd', ['定位', '定心', 'Align'], '将防护堵中心轴线与轮毂安装孔同轴对齐', true),
  A('D-S08', 'PRESS_IN', '压入到位', 'compound', 'fhd', ['安装', 'PressIn'], '垂直施加推力压入孔槽，边缘平整卡紧', true),
  A('D-S09', 'VERIFY', '检查确认', 'compound', 'fhd', ['复查', 'Verify'], '轻触并目视确认安装平齐无翘曲'),
  A('D-E01', 'REGRASP', '重新抓取', 'abnormal', 'common', ['二次抓取', '补抓'], '首次抓取失败或姿态不佳后的再次抓取'),
  A('D-E02', 'DROP', '工件掉落', 'abnormal', 'common', ['脱手', 'Drop'], '工件在搬运或放置中意外脱落'),
  A('D-E03', 'MISALIGN', '对位偏差', 'abnormal', 'fhd', ['偏位', '没对准'], '对准后仍明显偏离孔位，需要回退调整'),
  O('D-O01', 'WHEEL_HUB', '铝合金轮毂', 'common', ['车轮', '工件', 'Hub'], '待检测/待装配的铝合金轮毂'),
  O('D-O02', 'SEAL_FIXTURE', '气密专用夹具', 'qmd', ['夹具', '密封测试台'], '包含压紧气缸、密封圈的检测工装'),
  O('D-O03', 'GAUGE', '数字精密压力表', 'qmd', ['气压表', '差压表'], '测量密封腔内微压降'),
  O('D-O04', 'PLUG_CAP', '橡胶防护堵', 'fhd', ['防尘塞', '防护盖'], '安装于轮毂通孔用于防尘防划伤'),
  O('D-O05', 'VALVE_PORT', '轮毂气门嘴孔', 'common', ['充气孔'], '轮毂侧壁安装气门嘴的孔位'),
  O('D-O06', 'PLUG_TRAY', '防护堵料盒', 'fhd', ['料盘'], '存放待安装防护堵的料盒'),
]

export const useDict = defineStore('cl-dict', () => {
  const items = ref<DictItem[]>(DEFAULTS.map((x) => ({ ...x, aliases: [...x.aliases] })))
  const version = ref('v1.3')
  const changes = ref<DictChange[]>([
    { ver: 'v1.3', t: '10-13 14:10', by: '陈静', summary: '新增异常动作「对位偏差」' },
    { ver: 'v1.2', t: '10-12 16:00', by: '周工', summary: '气密性检测子任务定义调整' },
    { ver: 'v1.1', t: '10-08 10:20', by: '陈静', summary: '合并标注与审核两套字典' },
  ])
  const now = () => {
    const d = new Date(), p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  }
  function bump(by: string, summary: string) {
    const [maj, min] = version.value.slice(1).split('.').map(Number)
    version.value = `v${maj}.${min + 1}`
    changes.value.unshift({ ver: version.value, t: '刚刚', by, summary })
    useLogs().addLog({ user: by, role: '审核员', module: 'vocab', moduleName: '标注字典', action: '字典变更', target: version.value, summary })
  }
  const active = computed(() => items.value.filter((x) => x.status === 'active'))
  const fits = (x: DictItem, scen?: ScenKey) => !scen || x.scen === 'common' || x.scen === scen
  /** 标注下拉：某场景可用的动作（复合动作在前，其次异常、基础） */
  function actionsFor(scen?: ScenKey) {
    const order: Record<ActLevel, number> = { compound: 0, abnormal: 1, basic: 2 }
    return active.value.filter((x) => x.category === 'action' && fits(x, scen)).sort((a, b) => order[a.level ?? 'basic'] - order[b.level ?? 'basic'])
  }
  const objectsFor = (scen?: ScenKey) => active.value.filter((x) => x.category === 'object' && fits(x, scen))
  /** 某场景核心必选子任务 */
  const requiredFor = (scen: ScenKey) => active.value.filter((x) => x.category === 'action' && x.required && x.scen === scen).map((x) => x.name)
  /** 子任务（复合动作）的标准顺序，用于规则预切分 */
  const sequenceFor = (scen: ScenKey) => active.value.filter((x) => x.level === 'compound' && x.scen === scen).map((x) => x.name)
  const byName = (name: string) => items.value.find((x) => x.name === name)
  const isValid = (name: string) => active.value.some((x) => x.name === name)

  function add(x: Omit<DictItem, 'id' | 'updatedAt' | 'updatedBy' | 'status'>, by: string) {
    const id = 'D-' + (x.category === 'object' ? 'O' : 'A') + String(items.value.length + 1).padStart(2, '0') + Math.floor(Math.random() * 90 + 10)
    items.value.unshift({ ...x, id, status: 'active', updatedAt: now(), updatedBy: by })
    bump(by, '新增词条「' + x.name + '」')
  }
  function update(id: string, patch: Partial<DictItem>, by: string) {
    const it = items.value.find((x) => x.id === id)
    if (!it) return
    Object.assign(it, patch, { updatedAt: now(), updatedBy: by })
    bump(by, '修改词条「' + it.name + '」')
  }
  function toggle(id: string, by: string) {
    const it = items.value.find((x) => x.id === id)
    if (!it) return
    it.status = it.status === 'active' ? 'inactive' : 'active'
    it.updatedAt = now(); it.updatedBy = by
    bump(by, (it.status === 'active' ? '启用' : '停用') + '词条「' + it.name + '」')
  }
  function remove(id: string, by: string) {
    const i = items.value.findIndex((x) => x.id === id)
    if (i < 0) return
    const [r] = items.value.splice(i, 1)
    bump(by, '删除词条「' + r.name + '」')
  }
  return { items, version, changes, active, actionsFor, objectsFor, requiredFor, sequenceFor, byName, isValid, add, update, toggle, remove }
})
