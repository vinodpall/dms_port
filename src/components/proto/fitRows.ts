import { nextTick, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/**
 * 根据可视高度计算表格每页行数，使「表格 + 分页」在一屏内完整显示、不出现页面滚动
 * @param host 表格容器
 * @param rowH 行高（px）
 * @param reserve 表格下方需保留的高度（分页 + 页面底部留白）
 */
export function useFitRows(host: Ref<HTMLElement | undefined>, rowH: number, reserve = 76, min = 5) {
  const size = ref(10)
  const calc = () => {
    const body = host.value?.querySelector('.ant-table-tbody') as HTMLElement | null
    const top = (body ?? host.value)?.getBoundingClientRect().top
    if (top == null) return
    size.value = Math.max(min, Math.floor((window.innerHeight - top - reserve) / rowH))
  }
  onMounted(() => { nextTick(calc); window.addEventListener('resize', calc) })
  onBeforeUnmount(() => window.removeEventListener('resize', calc))
  return { size, calc }
}
