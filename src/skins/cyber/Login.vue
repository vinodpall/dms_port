<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import BrandMark from '@/components/BrandMark.vue'
import { PLATFORM } from '@/constants'
import { useLoginForm } from '@/composables/entry'
import hero from '@/assets/login-hero.webp'
import './cyber.css'

const { f, err, shake, loading, showPwd, uErr, pErr, submit, touched } = useLoginForm()

/* 插画动效坐标（基于原图 1800×1168） */
const ROUTE = 'M440 677 L762 489 L870 551 L545 741 Z'
const WAYPOINTS = [[440, 677], [530, 623], [622, 569], [762, 489], [870, 551], [545, 741]]
const PADS = [[260, 521], [437, 419], [628, 313], [818, 204]]
const LEDS = [[1103, 178, 0], [1103, 232, 1.1], [1150, 205, 0.5], [1150, 262, 1.7], [1203, 236, 0.8], [1203, 300, 2.2], [1140, 806, 0.3], [1140, 846, 1.4], [1257, 300, 2.6]]
</script>

<template>
  <div class="cy cy-login" :style="{ '--hero': `url(${hero})` }">
    <div class="cy-login-bg" aria-hidden="true" />
    <div class="cy-hero" aria-hidden="true">
      <img :src="hero" alt="" draggable="false" />
      <svg viewBox="0 0 1800 1168" class="cy-hero-fx">
        <defs>
          <clipPath id="holo-clip"><polygon points="893,163 1045,78 1045,272 893,357" /></clipPath>
          <radialGradient id="pad-g"><stop offset="0" stop-color="#7FF3FF" stop-opacity=".9" /><stop offset="1" stop-color="#4DD0E1" stop-opacity="0" /></radialGradient>
          <filter id="fx-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <!-- 巡检路线：流动虚线 + 巡检光点 + 节点脉冲 -->
        <path class="fx-route" :d="ROUTE" />
        <g v-for="(w, i) in WAYPOINTS" :key="`w${i}`" :transform="`translate(${w[0]} ${w[1]})`">
          <ellipse class="fx-ping" rx="14" ry="8" :style="{ animationDelay: `${i * 0.5}s` }" />
        </g>
        <circle r="7" fill="#9FF7FF" filter="url(#fx-glow)">
          <animateMotion :path="ROUTE" dur="9s" repeatCount="indefinite" />
        </circle>
        <!-- 充电位呼吸 -->
        <ellipse v-for="(p, i) in PADS" :key="`p${i}`" class="fx-pad" :cx="p[0]" :cy="p[1]" rx="46" ry="26" fill="url(#pad-g)" :style="{ animationDelay: `${i * 0.6}s` }" />
        <!-- 数字孪生全息屏扫描 -->
        <g clip-path="url(#holo-clip)">
          <polygon class="fx-holo" points="893,163 1045,78 1045,108 893,193" />
        </g>
        <!-- 机柜指示灯 -->
        <circle v-for="(l, i) in LEDS" :key="`l${i}`" class="fx-led" :cx="l[0]" :cy="l[1]" r="3" :style="{ animationDelay: `${l[2]}s` }" />
      </svg>
    </div>
    <div class="cy-login-fade" aria-hidden="true" />
    <div class="cy-login-grid" aria-hidden="true" />

    <!-- 左上：品牌 -->
    <header class="cy-title">
      <BrandMark />
      <div>
        <h1>{{ PLATFORM.name }}</h1>
        <p>{{ PLATFORM.en }}</p>
      </div>
    </header>

    <!-- 左侧：主视觉（背景） -->
    <section class="cy-stage" aria-hidden="true" />

    <!-- 右侧：登录 -->
    <section class="cy-side">
      <form class="cy-card" novalidate @submit.prevent="submit">
        <span class="cy-corner tl" /><span class="cy-corner tr" /><span class="cy-corner bl" /><span class="cy-corner br" />
        <div class="cy-card-head">
          <h2>账号登录</h2>
          <p class="sub">欢迎登录{{ PLATFORM.name }}</p>
        </div>

        <div v-if="err" class="cy-err" :class="{ shake }" role="alert"><AppIcon name="alert" size="sm" />{{ err }}</div>

        <label class="cy-field">
          <span class="cy-box" :class="{ bad: uErr }"><AppIcon name="user" size="sm" /><input v-model="f.u" placeholder="账号" aria-label="账号" autocomplete="username" :aria-invalid="!!uErr" @blur="touched.u = true" /></span>
          <small v-if="uErr" class="cy-help">{{ uErr }}</small>
        </label>
        <label class="cy-field">
          <span class="cy-box" :class="{ bad: pErr }">
            <AppIcon name="lock" size="sm" />
            <input v-model="f.p" :type="showPwd ? 'text' : 'password'" placeholder="密码" aria-label="密码" autocomplete="current-password" :aria-invalid="!!pErr" @blur="touched.p = true" />
            <button type="button" class="cy-eye" :aria-label="showPwd ? '隐藏密码' : '显示密码'" @click="showPwd = !showPwd"><AppIcon :name="showPwd ? 'eyeoff' : 'eye'" size="sm" /></button>
          </span>
          <small v-if="pErr" class="cy-help">{{ pErr }}</small>
        </label>

        <div class="cy-row"><label class="cy-check"><input v-model="f.remember" type="checkbox" />记住登录</label><span>忘记密码请联系管理员</span></div>
        <button type="submit" class="cy-go" :disabled="loading">{{ loading ? '验证中…' : '登 录' }}</button>
      </form>
    </section>
  </div>
</template>
