<script setup lang="ts">
/**
 * 地图槽位：模块内只创建一个 BizMap 实例（BizView 中），各页面 / 弹窗通过 MapSlot 声明显示位置与参数，
 * 单例地图经 Teleport 挂到最近挂载的槽位；槽位卸载后自动回到上一个槽位。属性与事件同 BizMap。
 */
import { onBeforeUnmount, onMounted, onUpdated, ref, useAttrs } from 'vue'
import { mountSlot } from './mapHost'

defineOptions({ inheritAttrs: false })
const attrs = useAttrs()
const el = ref<HTMLDivElement>()
let slot: ReturnType<typeof mountSlot> | null = null
onMounted(() => { slot = mountSlot(el.value!, { ...attrs }) })
onUpdated(() => slot?.update({ ...attrs }))
onBeforeUnmount(() => slot?.remove())
</script>

<template><div ref="el" class="map-slot" /></template>

<style scoped>
.map-slot { position: absolute; inset: 0; }
</style>
