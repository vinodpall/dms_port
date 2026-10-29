<script setup lang="ts">
/** 权限配置：左侧角色，右侧按模块分栏的页面/按钮权限 */
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CATALOG, leafOf, sys, type PermNode } from './perms'

const role = defineModel<string>('role', { required: true })
const cur = computed(() => sys.roles.find((r) => r.id === role.value) ?? sys.roles[0])
const draft = ref<Set<string>>(new Set())
watch(cur, (r) => { draft.value = new Set(r?.perms ?? []) }, { immediate: true })
const dirty = computed(() => cur.value && (draft.value.size !== cur.value.perms.length || cur.value.perms.some((p) => !draft.value.has(p))))
const mod = ref(CATALOG[0].key)
const curMod = computed(() => CATALOG.find((m) => m.key === mod.value)!)
const stat = (k: string) => { const l = leafOf(k); const n = l.filter((x) => draft.value.has(x)).length; return { n, all: l.length, on: n === l.length && n > 0, half: n > 0 && n < l.length } }
const toggle = (k: string, v: boolean) => { const s = new Set(draft.value); leafOf(k).forEach((x) => (v ? s.add(x) : s.delete(x))); if (v && !k.endsWith('.view') && k.split('.').length === 3) s.add(k.split('.').slice(0, 2).join('.') + '.view'); draft.value = s }
const toggleBtn = (p: PermNode, b: PermNode, v: boolean) => {
  const s = new Set(draft.value)
  if (b.key.endsWith('.view') && !v) leafOf(p.key).forEach((x) => s.delete(x)) // 取消查看 = 页面不可见
  else { v ? s.add(b.key) : s.delete(b.key); if (v) s.add(p.key + '.view') }
  draft.value = s
}
const save = () => { cur.value.perms = [...draft.value]; message.success(`已保存「${cur.value.name}」的权限`) }
const users = (id: string) => sys.users.filter((u) => u.roleIds.includes(id)).length
</script>
<template>
  <div class="pp-head">
    <div><h2>权限配置</h2><p>按角色勾选五大模块的页面访问与按钮操作权限；取消“查看”即隐藏该页面</p></div>
    <div class="r" style="margin-left:auto; display:flex; gap:8px">
      <a-button :disabled="!dirty" @click="draft = new Set(cur.perms)">还原</a-button>
      <a-button type="primary" :disabled="!dirty || cur.builtin" @click="save">保存</a-button>
    </div>
  </div>
  <div class="sp">
    <section class="pp-panel sp-roles">
      <div class="sp-t">角色</div>
      <div class="sp-list">
        <div v-for="r in sys.roles" :key="r.id" class="sp-role" :class="{ on: r.id === cur.id }" @click="role = r.id">
          <b>{{ r.name }}</b><small>{{ users(r.id) }} 人 · {{ r.perms.length }} 项权限</small>
        </div>
      </div>
    </section>
    <section class="pp-panel sp-main">
      <div class="sp-mods">
        <div v-for="m in CATALOG" :key="m.key" class="sp-mod" :class="{ on: m.key === mod }" @click="mod = m.key">
          <a-checkbox :checked="stat(m.key).on" :indeterminate="stat(m.key).half" :disabled="cur.builtin" @click.stop @change="(e: any) => toggle(m.key, e.target.checked)" />
          <span>{{ m.title }}</span><em>{{ stat(m.key).n }}/{{ stat(m.key).all }}</em>
        </div>
      </div>
      <div v-if="cur.builtin" class="sp-tip">内置管理员角色默认拥有全部权限，不可修改</div>
      <div class="sp-body">
        <div class="sp-row sp-hd"><span>页面</span><span>按钮权限</span></div>
        <div v-for="p in curMod.children" :key="p.key" class="sp-row">
          <a-checkbox :checked="stat(p.key).on" :indeterminate="stat(p.key).half" :disabled="cur.builtin" @change="(e: any) => toggle(p.key, e.target.checked)">{{ p.title }}</a-checkbox>
          <div class="sp-btns">
            <a-checkbox v-for="b in p.children" :key="b.key" :checked="draft.has(b.key)" :disabled="cur.builtin" @change="(e: any) => toggleBtn(p, b, e.target.checked)">{{ b.title }}</a-checkbox>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
<style scoped>
.sp { height: calc(100vh - 190px); min-height: 0; display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 16px; }
.sp > .pp-panel { min-height: 0; display: flex; flex-direction: column; }
.sp-t { padding: 4px 4px 12px; font-weight: 500; color: var(--title); }
.sp-list { flex: 1; overflow: auto; display: flex; flex-direction: column; gap: 6px; }
.sp-role { padding: 10px 12px; border: 1px solid transparent; border-radius: 8px; cursor: pointer; display: flex; flex-direction: column; gap: 2px; transition: all .2s; }
.sp-role small { color: var(--muted); font-size: 12px; }
.sp-role:hover { background: rgba(46,211,230,.05); }
.sp-role.on { border-color: rgba(46,211,230,.45); background: rgba(46,211,230,.1); }
.sp-role.on b { color: var(--cyan, #2ED3E6); }
.sp-mods { display: flex; gap: 8px; padding-bottom: 14px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
.sp-mod { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border: 1px solid var(--line); border-radius: 8px; cursor: pointer; transition: all .2s; }
.sp-mod em { font-style: normal; font-size: 12px; color: var(--muted); font-family: var(--mono); }
.sp-mod.on { border-color: rgba(46,211,230,.6); background: rgba(46,211,230,.1); color: var(--title); }
.sp-tip { margin-top: 12px; color: var(--muted); font-size: 12px; }
.sp-body { flex: 1; overflow: auto; margin-top: 6px; }
.sp-row { display: grid; grid-template-columns: 200px minmax(0, 1fr); align-items: center; gap: 16px; padding: 14px 8px; border-bottom: 1px dashed var(--line); }
.sp-hd { color: var(--muted); font-size: 12px; padding: 10px 8px; border-bottom-style: solid; }
.sp-btns { display: flex; flex-wrap: wrap; gap: 10px 4px; }
.sp-btns :deep(.ant-checkbox-wrapper) { min-width: 110px; margin-inline-start: 0; }
</style>
