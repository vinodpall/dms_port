<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import BrandMark from '@/components/BrandMark.vue'
import { PLATFORM } from '@/constants'
import { useLoginForm } from '@/composables/entry'
import hero from '@/assets/login-hero.webp'
import './cyber.css'

const { f, err, shake, loading, showPwd, uErr, pErr, submit, touched } = useLoginForm()
</script>

<template>
  <div class="cy cy-login" :style="{ '--hero': `url(${hero})` }">
    <div class="cy-login-bg" aria-hidden="true" />
    <div class="cy-scan" aria-hidden="true" />

    <!-- 左侧：主视觉 + 品牌 -->
    <section class="cy-stage">
      <div class="cy-title">
        <BrandMark />
        <div>
          <h1>{{ PLATFORM.name }}</h1>
          <p>{{ PLATFORM.en }}</p>
        </div>
      </div>
    </section>

    <!-- 右侧：登录 -->
    <section class="cy-side">
      <form class="cy-card" novalidate @submit.prevent="submit">
        <span class="cy-corner tl" /><span class="cy-corner br" />
        <h2>账号登录</h2>
        <p class="sub">欢迎回来，请登录您的平台账号</p>

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
