/** 单例地图的槽位栈（见 MapSlot.vue / BizView.vue） */
import { computed, shallowReactive } from 'vue'

interface Slot { id: number; el: HTMLElement; attrs: Record<string, unknown> }
const stack = shallowReactive<Slot[]>([])
let seq = 0
export const activeSlot = computed(() => stack[stack.length - 1] ?? null)
export function mountSlot(el: HTMLElement, attrs: Record<string, unknown>) {
  const s: Slot = { id: ++seq, el, attrs }; stack.push(s)
  return {
    update(a: Record<string, unknown>) { const i = stack.findIndex((x) => x.id === s.id); if (i >= 0) stack.splice(i, 1, { ...stack[i], attrs: a }) },
    remove() { const i = stack.findIndex((x) => x.id === s.id); if (i >= 0) stack.splice(i, 1) },
  }
}
