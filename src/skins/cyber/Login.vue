<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import BrandMark from '@/components/BrandMark.vue'
import { PLATFORM } from '@/constants'
import { useLoginForm } from '@/composables/entry'
import './cyber.css'

const { f, touched, err, shake, loading, showPwd, uErr, pErr, submit } = useLoginForm()
</script>

<template>
  <div class="cy cy-login">
    <div class="cy-scan" />
    <section class="cy-stage">
      <div class="cy-brand"><BrandMark /><div><b>{{ PLATFORM.name }}</b><small>{{ PLATFORM.en }}</small></div></div>
      <div class="cy-art">
        <svg viewBox="0 0 600 480" style="max-width:560px;width:100%;height:auto;filter:drop-shadow(0 10px 30px rgba(77,208,225,.4))">
          <defs>
            <linearGradient id="cy-base" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1A3A52" /><stop offset="1" stop-color="#0F2333" /></linearGradient>
            <linearGradient id="cy-arm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1E4A62" /><stop offset="1" stop-color="#2A5F7A" /></linearGradient>
            <radialGradient id="cy-glow"><stop offset="0" stop-color="#4DD0E1" stop-opacity="0.9" /><stop offset="1" stop-color="#26C6DA" stop-opacity="0" /></radialGradient>
          </defs>
          <!-- 底座平台 -->
          <path d="M200 420 L150 450 L450 450 L400 420 Z" fill="url(#cy-base)" stroke="#4DD0E1" stroke-width="1.5" />
          <path d="M200 400 L200 420 L400 420 L400 400 Z" fill="#0F2333" stroke="#4DD0E1" stroke-width="1.5" />
          <ellipse cx="300" cy="400" rx="100" ry="16" fill="#1A3A52" stroke="#4DD0E1" stroke-width="1" />
          <!-- 底座细节 -->
          <line x1="220" y1="410" x2="220" y2="440" stroke="#26C6DA" stroke-width="2" opacity="0.6" />
          <line x1="300" y1="410" x2="300" y2="440" stroke="#26C6DA" stroke-width="2" opacity="0.6" />
          <line x1="380" y1="410" x2="380" y2="440" stroke="#26C6DA" stroke-width="2" opacity="0.6" />
          <!-- 第一关节 -->
          <rect x="280" y="340" width="40" height="60" rx="4" fill="url(#cy-arm)" stroke="#4DD0E1" stroke-width="1.5" />
          <circle cx="300" cy="355" r="8" fill="#4DD0E1"><animate attributeName="opacity" values="1;0.4;1" dur="2.5s" repeatCount="indefinite" /></circle>
          <!-- 第二段臂 -->
          <g transform="translate(300 340) rotate(-35)">
            <rect x="-16" y="-120" width="32" height="120" rx="6" fill="url(#cy-arm)" stroke="#4DD0E1" stroke-width="1.5" />
            <circle cx="0" cy="-60" r="6" fill="#26C6DA" />
          </g>
          <!-- 第三段臂 -->
          <g transform="translate(230 240) rotate(25)">
            <rect x="-14" y="-100" width="28" height="100" rx="5" fill="url(#cy-arm)" stroke="#4DD0E1" stroke-width="1.5" />
            <circle cx="0" cy="-50" r="5" fill="#26C6DA" />
          </g>
          <!-- 末端执行器 -->
          <g transform="translate(210 150)">
            <rect x="-20" y="0" width="40" height="30" rx="4" fill="#1E4A62" stroke="#4DD0E1" stroke-width="1.5" />
            <path d="M-12 30 L-8 50 L-4 30" fill="none" stroke="#4DD0E1" stroke-width="2" />
            <path d="M4 30 L8 50 L12 30" fill="none" stroke="#4DD0E1" stroke-width="2" />
            <circle cx="0" cy="15" r="12" fill="url(#cy-glow)"><animate attributeName="r" values="10;14;10" dur="1.8s" repeatCount="indefinite" /></circle>
          </g>
          <!-- 悬浮元素 -->
          <g opacity="0.7">
            <rect x="420" y="180" width="60" height="45" rx="3" fill="#1A3A52" stroke="#4DD0E1" stroke-width="1" /><text x="450" y="207" text-anchor="middle" fill="#4DD0E1" font-size="11" font-family="monospace">AXIS-3</text>
            <circle cx="140" cy="280" r="18" fill="none" stroke="#4DD0E1" stroke-width="1.5" stroke-dasharray="3 2" /><text x="140" y="285" text-anchor="middle" fill="#4DD0E1" font-size="10" font-family="monospace">J2</text>
          </g>
          <!-- 扫描线 -->
          <line x1="100" y1="200" x2="500" y2="200" stroke="#4DD0E1" stroke-width="0.8" opacity="0.5"><animate attributeName="y1" values="150;350;150" dur="4s" repeatCount="indefinite" /><animate attributeName="y2" values="150;350;150" dur="4s" repeatCount="indefinite" /></line>
        </svg>
      </div>
      <div class="cy-status">
        <span class="cy-status-item"><i class="cy-hex on" />设备在线</span>
        <span class="cy-status-item"><i class="cy-hex on" />采集就绪</span>
        <span class="cy-status-item"><i class="cy-hex" />仿真待机</span>
        <span class="cy-status-item"><i class="cy-hex on" />场景加载</span>
        <span class="cy-status-item"><i class="cy-hex" />巡检暂停</span>
      </div>
    </section>

    <section class="cy-side">
      <form class="cy-card" novalidate @submit.prevent="submit">
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
        <div class="cy-row"><label class="cy-check"><input v-model="f.remember" type="checkbox" />记住密码</label><span>忘记密码请联系管理员</span></div>
        <button type="submit" class="cy-go" :disabled="loading">{{ loading ? '验证中…' : '登 录' }}</button>
      </form>
    </section>
  </div>
</template>
