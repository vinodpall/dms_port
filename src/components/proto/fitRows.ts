import { nextTick, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/** 找到页面实际滚动的容器（向上查找 overflow 为 auto/scroll 的祖先，找不到则为文档） */
function scroller(el: HTMLElement | undefined): HTMLElement {
  for (let p = el?.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY
    if ((o === 'auto' || o === 'scroll') && p.clientHeight > 0) return p
  }
  return document.documentElement
}
const overflow = (s: HTMLElement) => s.scrollHeight - s.clientHeight > 0

/**
 * 根据可视高度计算表格每页行数，使「表格 + 分页」在一屏内完整显示、不出现滚动条
 * 先按行高估算，渲染后若仍有溢出则逐行递减
 */
export function useFitRows(host: Ref<HTMLElement | undefined>, rowH: number, reserve = 80, min = 5) {
  const size = ref(10)
  let busy = false
  async function calc() {
    if (busy || !host.value) return
    busy = true
    try {
      const body = host.value.querySelector('.ant-table-tbody') as HTMLElement | null
      const top = (body ?? host.value).getBoundingClientRect().top
      size.value = Math.max(min, Math.floor((window.innerHeight - top - reserve) / rowH))
      await nextTick()
      const s = scroller(host.value)
      for (let i = 0; i < 20 && size.value > min && overflow(s); i++) { size.value--; await nextTick() }
    } finally { busy = false }
  }
  onMounted(() => { nextTick(calc); window.addEventListener('resize', calc) })
  onBeforeUnmount(() => window.removeEventListener('resize', calc))
  return { size, calc }
}
