import { theme as antdTheme } from 'ant-design-vue'

const font = "'IBM Plex Sans','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC',system-ui,sans-serif"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildTheme(dark: boolean): any {
  const c = dark
    ? { primary: '#16A9C4', bg: '#071523', surface: '#0C1E30', s2: '#10263B', s3: '#163149', line: '#1B3A52', line2: '#285370', text: '#E6F7FB', muted: '#8FB3C7', ok: '#4DE8B0', warn: '#FFB74D', err: '#FF6B6B' }
    : { primary: '#1565C0', bg: '#F2F5F9', surface: '#FFFFFF', s2: '#F7F9FC', s3: '#EDF1F6', line: '#E1E7EF', line2: '#C9D2DE', text: '#132033', muted: '#566579', ok: '#22A06B', warn: '#E8A317', err: '#D92D20' }
  return {
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: c.primary,
      colorSuccess: c.ok,
      colorWarning: c.warn,
      colorError: c.err,
      colorInfo: c.primary,
      colorBgBase: c.surface,
      colorBgLayout: c.bg,
      colorBgContainer: c.surface,
      colorBgElevated: c.surface,
      colorTextBase: c.text,
      colorText: c.text,
      colorTextSecondary: c.muted,
      colorBorder: c.line2,
      colorBorderSecondary: c.line,
      colorFillAlter: c.s2,
      colorFillSecondary: c.s3,
      borderRadius: 4,
      borderRadiusLG: 6,
      borderRadiusSM: 3,
      fontFamily: font,
      colorPrimaryText: dark ? '#4DD0E1' : c.primary,
      fontSize: 14,
      controlHeight: 36,
      wireframe: false,
      motionDurationMid: '0.15s',
    },
    components: {
      Table: { headerBg: c.s2, headerColor: c.muted, headerSplitColor: 'transparent', rowHoverBg: c.s2, cellPaddingBlock: 12, borderColor: c.line },
      Card: { borderRadiusLG: 6, headerFontSize: 15 },
      Button: { fontWeight: 500, primaryShadow: 'none', defaultShadow: 'none', dangerShadow: 'none' },
      Modal: { borderRadiusLG: 6 },
      Drawer: { borderRadiusLG: 0 },
      Tabs: { horizontalMargin: '0', titleFontSize: 14 },
      Segmented: { trackBg: c.s3, itemSelectedBg: c.surface },
      Progress: { remainingColor: c.s3 },
      Steps: { iconSize: 26 },
    },
  }
}
