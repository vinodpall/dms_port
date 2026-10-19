/** 界面风格 - 仅保留赛博风格 */
export type SkinKey = 'cyber'
export interface SkinDef {
  key: SkinKey
  name: string
  desc: string
  mode: 'dark'
}
export const SKIN: SkinDef = {
  key: 'cyber',
  name: '赛博科幻',
  desc: '深蓝网格底，青色光效与等轴插图',
  mode: 'dark'
}
