/**
 * 配色方案（预览用）。
 * 设计依据：
 *  - 文字对比度按 WCAG 2.1 AA：正文 / 次要文字 ≥ 4.5:1，弱提示 ≥ 3:1（相对卡片底色）
 *  - 深色界面分层参考 Material Design 深色主题：背景 < 卡片 < 浮层，层级越高越亮，避免纯黑
 *  - 组件令牌映射到 Ant Design Vue 5 的 Seed / Map Token，切换方案只改令牌
 */
import { theme as antdTheme } from 'ant-design-vue'

export interface Palette {
  key: string
  name: string
  en: string
  desc: string
  dark: boolean
  chart: [string, string]
  /** CSS 变量（作用于模块外壳 .pp） */
  vars: Record<string, string>
}

const font = "'IBM Plex Sans','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC',system-ui,sans-serif"

export const PALETTES: Palette[] = [
  {
    key: 'cur', name: '当前配色', en: 'Current', dark: true, chart: ['#4DD0E1', '#4DE8B0'],
    desc: '深海军蓝 + 青色。文字对比度本身达标，但底色接近纯黑（亮度仅约 1%），卡片与背景层次差小，整体显得压抑、发暗。',
    vars: {},
  },
  {
    key: 'a', name: '方案一 · 深空蓝', en: 'Deep Space', dark: true, chart: ['#2ED3E6', '#45E3A8'],
    desc: '保留品牌蓝青基调，整体提亮约 1.5 级：底色从近黑提到深蓝，卡片与背景分层更明显，文字全部达到 AA。',
    vars: {
      '--bg': '#0F1F35', '--bg-hi': '#1A3A63', '--surface': '#162A43', '--surface-2': '#1B3252', '--surface-3': '#223D61',
      '--line': '#2B4A6D', '--line-strong': '#3C6189', '--text': '#F3F8FC', '--muted': '#B6CADC', '--faint': '#8EA6BE',
      '--accent': '#2ED3E6', '--accent-soft': 'rgba(46,211,230,.14)', '--accent-text': '#8BEFFF', '--cyan': '#2ED3E6', '--accent2': '#4C8DFF',
      '--glow': '46,211,230', '--ok': '#45E3A8', '--warn': '#FFC15C', '--bad': '#FF7A7A', '--bad-text': '#FFB0B0', '--title': '#FFFFFF',
      '--panel-1': 'rgba(30,56,88,.88)', '--panel-2': 'rgba(22,42,67,.9)', '--kpi-1': 'rgba(36,66,102,.88)', '--kpi-2': 'rgba(22,42,66,.92)',
      '--tile-1': 'rgba(24,46,72,.94)', '--tile-2': 'rgba(20,38,60,.92)', '--well': 'rgba(12,27,45,.55)',
      '--top-1': 'rgba(14,29,48,.97)', '--top-2': 'rgba(18,36,58,.92)', '--side-bg': 'rgba(14,29,48,.78)',
      '--th-bg': 'rgba(35,62,98,.78)', '--row-line': 'rgba(43,74,109,.75)', '--btn-1': '#17BFD4', '--btn-2': '#3B8BFF', '--btn-shadow': 'rgba(59,139,255,.28)',
      '--scroll': '#33597F', '--menu-on': '#FFFFFF', '--card-shadow': '0 4px 18px rgba(4,12,24,.28)', '--grid-a': '.045', '--axis': '#9DB5CB',
    },
  },
  {
    key: 'b', name: '方案二 · 石墨青', en: 'Graphite Teal', dark: true, chart: ['#2DD4BF', '#7DD3FC'],
    desc: '中性石墨灰底降低蓝色饱和度，长时间看不累；青绿色作强调，蓝色作辅助，像工业控制台。',
    vars: {
      '--bg': '#161C24', '--bg-hi': '#243040', '--surface': '#1E2631', '--surface-2': '#242E3B', '--surface-3': '#2C3746',
      '--line': '#364354', '--line-strong': '#4C5D73', '--text': '#F2F5F8', '--muted': '#B9C3CF', '--faint': '#8F9AA9',
      '--accent': '#2DD4BF', '--accent-soft': 'rgba(45,212,191,.14)', '--accent-text': '#8EF5E4', '--cyan': '#2DD4BF', '--accent2': '#5B9BFF',
      '--glow': '45,212,191', '--ok': '#5EE08A', '--warn': '#FFC456', '--bad': '#FF7B72', '--bad-text': '#FFB1AB', '--title': '#FFFFFF',
      '--panel-1': 'rgba(40,49,62,.92)', '--panel-2': 'rgba(30,38,49,.94)', '--kpi-1': 'rgba(44,54,68,.92)', '--kpi-2': 'rgba(30,38,49,.94)',
      '--tile-1': 'rgba(35,44,56,.95)', '--tile-2': 'rgba(29,37,47,.94)', '--well': 'rgba(16,21,28,.55)',
      '--top-1': 'rgba(21,27,35,.97)', '--top-2': 'rgba(26,33,42,.94)', '--side-bg': 'rgba(21,27,35,.82)',
      '--th-bg': 'rgba(44,55,70,.85)', '--row-line': 'rgba(54,67,84,.75)', '--btn-1': '#14B8A6', '--btn-2': '#3B82F6', '--btn-shadow': 'rgba(20,184,166,.25)',
      '--scroll': '#46566B', '--menu-on': '#FFFFFF', '--card-shadow': '0 4px 16px rgba(0,0,0,.25)', '--grid-a': '.03', '--axis': '#A3AEBB',
    },
  },
  {
    key: 'c', name: '方案三 · 晨雾白', en: 'Light Tech', dark: false, chart: ['#0891D1', '#10B981'],
    desc: '浅色科技风：冷灰蓝底 + 白色卡片，蓝青强调色、细网格与角标保留科技感；适合白天/投屏，文字最清晰。',
    vars: {
      '--bg': '#EAF0F6', '--bg-hi': '#F7FAFD', '--surface': '#FFFFFF', '--surface-2': '#F5F8FB', '--surface-3': '#E9EFF5',
      '--line': '#DBE3EC', '--line-strong': '#C2CEDB', '--text': '#13202F', '--muted': '#4D5E72', '--faint': '#738398',
      '--accent': '#0891D1', '--accent-soft': 'rgba(8,145,209,.1)', '--accent-text': '#0570A3', '--cyan': '#0891D1', '--accent2': '#3D5AFE',
      '--glow': '8,145,209', '--ok': '#0E9F6E', '--warn': '#C77700', '--bad': '#DC3B36', '--bad-text': '#C0302B', '--title': '#0D1A2A',
      '--panel-1': '#FFFFFF', '--panel-2': '#FFFFFF', '--kpi-1': '#FFFFFF', '--kpi-2': '#F3F8FC',
      '--tile-1': '#FFFFFF', '--tile-2': '#FAFCFE', '--well': '#F1F5F9',
      '--top-1': 'rgba(255,255,255,.97)', '--top-2': 'rgba(250,252,255,.94)', '--side-bg': 'rgba(255,255,255,.9)',
      '--th-bg': '#F2F6FA', '--row-line': '#E6ECF2', '--btn-1': '#0EA5E9', '--btn-2': '#2563EB', '--btn-shadow': 'rgba(37,99,235,.22)',
      '--scroll': '#C2CEDB', '--menu-on': '#0570A3', '--card-shadow': '0 1px 2px rgba(16,40,70,.06), 0 6px 18px rgba(16,40,70,.06)', '--grid-a': '.06', '--axis': '#6B7B8F',
    },
  },
]

/** 方案对应的 Ant Design 令牌 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function paletteTheme(p: Palette, base: any): any {
  if (p.key === 'cur') return base
  const v = p.vars
  return {
    algorithm: p.dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      ...base.token,
      colorPrimary: v['--accent'], colorInfo: v['--accent'], colorSuccess: v['--ok'], colorWarning: v['--warn'], colorError: v['--bad'],
      colorBgBase: v['--surface'], colorBgLayout: v['--bg'], colorBgContainer: v['--surface'], colorBgElevated: p.dark ? v['--surface-2'] : '#FFFFFF',
      colorTextBase: v['--text'], colorText: v['--text'], colorTextSecondary: v['--muted'], colorTextTertiary: v['--faint'],
      colorBorder: v['--line-strong'], colorBorderSecondary: v['--line'], colorFillAlter: v['--surface-2'], colorFillSecondary: v['--surface-3'],
      colorPrimaryText: v['--accent-text'], fontFamily: font,
    },
    components: {
      ...base.components,
      Table: { ...base.components.Table, headerBg: v['--th-bg'], headerColor: v['--muted'], rowHoverBg: v['--surface-2'], borderColor: v['--line'] },
      Segmented: { trackBg: v['--surface-3'], itemSelectedBg: v['--surface'] },
      Progress: { remainingColor: v['--surface-3'] },
    },
  }
}

/* ---------- WCAG 对比度 ---------- */
const lum = (hex: string) => {
  const n = hex.replace('#', '')
  const c = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
export const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }
