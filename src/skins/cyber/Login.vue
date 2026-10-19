<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import BrandMark from '@/components/BrandMark.vue'
import { DEMO_ACCOUNTS, MODULES, PLATFORM, ROLES } from '@/constants'
import { useClock, useLoginForm } from '@/composables/entry'
import hero from '@/assets/login-hero.webp'
import './cyber.css'

const { f, err, shake, loading, showPwd, uErr, pErr, submit, fill, touched } = useLoginForm()
const { time, date } = useClock()

/** 演示用遥测数据：轻微跳动，营造“系统在线”的氛围 */
const lat = ref(12)
const fps = ref(60)
let t = 0
onMounted(() => { t = window.setInterval(() => { lat.value = 9 + Math.round(Math.random() * 7); fps.value = 58 + Math.round(Math.random() * 2) }, 1600) })
onBeforeUnmount(() => clearInterval(t))

const onlineCount = computed(() => MODULES.filter((m) => m.url).length)
</script>

<template>
  <div class="cy cy-login" :style="{ '--hero': `url(${hero})` }">
    <div class="cy-login-bg" aria-hidden="true" />
    <div class="cy-floor" aria-hidden="true" />
    <div class="cy-scan" aria-hidden="true" />

    <!-- 左侧：品牌叙事 -->
    <section class="cy-stage">
      <header class="cy-brand"><BrandMark /><div><b>{{ PLATFORM.name }}</b><small>{{ PLATFORM.en }}</small></div></header>

      <aside class="cy-hud" aria-hidden="true">
        <div class="cy-hud-h"><i />SYSTEM TELEMETRY</div>
        <dl>
          <div><dt>LATENCY</dt><dd>{{ lat }}<small>ms</small></dd></div>
          <div><dt>RENDER</dt><dd>{{ fps }}<small>fps</small></dd></div>
          <div><dt>NODES</dt><dd>{{ onlineCount }}<small>/{{ MODULES.length }}</small></dd></div>
        </dl>
      </aside>

      <div class="cy-copy">
        <span class="cy-kicker">// EMBODIED INTELLIGENCE PLATFORM</span>
        <h1>让机器人在<em>训练场</em>中<br />持续进化</h1>
        <p>设备管控、业务编排、数据采集、仿真训练与场景管理，一个入口，全链路贯通。</p>
        <ul class="cy-mods">
          <li v-for="m in MODULES" :key="m.key" :style="{ '--c': m.hue }"><i />{{ m.title.replace('（训练场）', '') }}</li>
        </ul>
      </div>
    </section>

    <!-- 右侧：登录面板 -->
    <section class="cy-side">
      <form class="cy-card" novalidate @submit.prevent="submit">
        <span class="cy-corner tl" /><span class="cy-corner tr" /><span class="cy-corner bl" /><span class="cy-corner br" />
        <div class="cy-card-h"><span><i />SECURE ACCESS</span><span>{{ time }}</span></div>
        <h2>账号登录</h2>
        <p class="sub">使用平台账号登录，进入各业务模块</p>

        <div v-if="err" class="cy-err" :class="{ shake }" role="alert"><AppIcon name="alert" size="sm" />{{ err }}</div>

        <label class="cy-field">
          <span>账号</span>
          <span class="cy-box" :class="{ bad: uErr }"><AppIcon name="user" size="sm" /><input v-model="f.u" placeholder="请输入账号" autocomplete="username" :aria-invalid="!!uErr" @blur="touched.u = true" /></span>
          <small v-if="uErr" class="cy-help">{{ uErr }}</small>
        </label>
        <label class="cy-field">
          <span>密码</span>
          <span class="cy-box" :class="{ bad: pErr }">
            <AppIcon name="lock" size="sm" />
            <input v-model="f.p" :type="showPwd ? 'text' : 'password'" placeholder="请输入密码" autocomplete="current-password" :aria-invalid="!!pErr" @blur="touched.p = true" />
            <button type="button" class="cy-eye" :aria-label="showPwd ? '隐藏密码' : '显示密码'" @click="showPwd = !showPwd"><AppIcon :name="showPwd ? 'eyeoff' : 'eye'" size="sm" /></button>
          </span>
          <small v-if="pErr" class="cy-help">{{ pErr }}</small>
        </label>

        <div class="cy-row"><label class="cy-check"><input v-model="f.remember" type="checkbox" />记住登录</label><span>忘记密码请联系管理员</span></div>
        <button type="submit" class="cy-go" :disabled="loading">
          <span>{{ loading ? '身份验证中…' : '登 录' }}</span><AppIcon v-if="!loading" name="arrow" size="sm" />
        </button>

        <div class="cy-demo">
          <small>演示账号 · 点击快速填充</small>
          <div>
            <button v-for="a in DEMO_ACCOUNTS" :key="a.u" type="button" class="cy-chip" :class="{ on: f.u === a.u }" @click="fill(a.u)">{{ ROLES[a.role].name }}</button>
          </div>
        </div>
      </form>
      <footer class="cy-foot"><span>{{ date }}</span><span>v0.1.0 · DEMO BUILD</span></footer>
    </section>
  </div>
</template>
