<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Lock, Sparkles, ArrowRight } from 'lucide-vue-next'
import { useStarrySky } from '@/composables/useStarrySky'

const ENTRY_PASSWORD = import.meta.env.VITE_ENTRY_PASSWORD || 'zhulaoshi'

const router = useRouter()
const { setDim, requestShootingStar } = useStarrySky()

const password = ref('')
const isShaking = ref(false)
const isFocused = ref(false)
const isOpening = ref(false)
const showContent = ref(false)
const errorMessage = ref('')

let errorTimer: number | undefined
let enterTimer: number | undefined

const handleSubmit = () => {
  if (isOpening.value) return

  if (password.value === ENTRY_PASSWORD) {
    isOpening.value = true
    requestShootingStar()

    enterTimer = window.setTimeout(() => {
      setDim(0)
      sessionStorage.setItem('starryEntry', 'true')
      router.push('/home')
    }, 1000)
    return
  }

  isShaking.value = true
  errorMessage.value = '密码不对哦，再想想~'
  setDim(0.55)

  window.clearTimeout(errorTimer)
  errorTimer = window.setTimeout(() => {
    isShaking.value = false
    errorMessage.value = ''
    setDim(0)
  }, 1600)
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') handleSubmit()
}

onMounted(() => {
  if (sessionStorage.getItem('starryEntry') === 'true') {
    router.push('/home')
    return
  }

  window.setTimeout(() => {
    showContent.value = true
  }, 120)
})

onUnmounted(() => {
  window.clearTimeout(errorTimer)
  window.clearTimeout(enterTimer)
  setDim(0)
})
</script>

<template>
  <div class="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-16">
    <!-- 望远镜的同心圆环：密码对焦时收缩，进门时张开 -->
    <div class="aperture" :class="{ 'is-focus': isFocused, 'is-error': isShaking, 'is-open': isOpening }" aria-hidden="true">
      <span class="ring ring-outer" />
      <span class="ring ring-mid" />
      <span class="ring ring-inner" />
      <span class="ring-glow" />
    </div>

    <div
      class="relative z-10 w-full max-w-md transition-all duration-[1100ms] ease-out"
      :class="showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'"
    >
      <!-- 标题 -->
      <header class="text-center mb-10">
        <p class="eyebrow">NIGHT OBSERVATORY</p>
        <div class="flex items-center justify-center gap-3 mt-4 mb-3">
          <Sparkles class="w-5 h-5 text-warm-300/80 animate-pulse" />
          <h1 class="font-serif text-[26px] md:text-3xl font-light text-warm-100 tracking-[0.28em]">
            小华星空广播站
          </h1>
          <Sparkles class="w-5 h-5 text-warm-300/80 animate-pulse" />
        </div>
        <p class="text-night-400 text-sm tracking-[0.2em]">
          今夜，有一颗星星为你而亮
        </p>
      </header>

      <!-- 舱门 / 天文台控制台 -->
      <div
        class="entry-card glass rounded-[28px] px-7 py-9 md:px-9 md:py-10"
        :class="{ 'shake': isShaking && !isOpening, 'opening': isOpening }"
      >
        <div class="flex justify-center mb-7">
          <div class="lens-badge">
            <Lock class="w-6 h-6 text-warm-300" :stroke-width="1.6" />
            <span class="lens-badge-ring" />
          </div>
        </div>

        <p class="text-center text-night-300 text-[13px] tracking-[0.28em] mb-7">
          请输入今晚的入场密码
        </p>

        <div class="field" :class="{ 'is-active': isFocused }">
          <input
            v-model="password"
            type="password"
            autocomplete="off"
            placeholder="今晚的秘密"
            class="field-input"
            @focus="isFocused = true"
            @blur="isFocused = false"
            @keydown="handleKeydown"
          />
          <span class="field-line" />
        </div>

        <Transition name="err">
          <p v-if="errorMessage" class="text-center text-red-300/85 text-xs tracking-wider mt-4">
            {{ errorMessage }}
          </p>
        </Transition>

        <button
          class="enter-btn mt-8"
          :disabled="isOpening"
          @click="handleSubmit"
        >
          <span>{{ isOpening ? '星门开启中…' : '推开星门' }}</span>
          <ArrowRight v-if="!isOpening" class="w-4 h-4 btn-arrow" :stroke-width="1.8" />
        </button>
      </div>

      <div class="text-center mt-9">
        <p class="text-night-600 text-[11px] tracking-[0.3em]">
          · 每晚 23:00，为你点亮一颗星 ·
        </p>
      </div>
    </div>

    <!-- 开门时的星尘闪光 -->
    <Transition name="flash">
      <div v-if="isOpening" class="flash" aria-hidden="true" />
    </Transition>
  </div>
</template>

<style scoped>
.eyebrow {
  font-family: 'Cormorant Garamond', serif;
  font-size: 11px;
  letter-spacing: 0.5em;
  color: rgba(245, 166, 35, 0.55);
  text-transform: uppercase;
}

/* ---------- 同心圆环 ---------- */
.aperture {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1px;
  height: 1px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  transition: transform 0.9s var(--ease-out-expo), opacity 0.9s var(--ease-out-expo);
}

.ring {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 50%;
  border: 1px solid rgba(245, 166, 35, 0.14);
  transform: translate(-50%, -50%) scale(1);
  transition: transform 1s var(--ease-out-expo), border-color 0.8s ease, opacity 0.8s ease;
}

.ring-outer {
  width: 620px;
  height: 620px;
  border-style: dashed;
  border-color: rgba(245, 166, 35, 0.1);
  animation: ringSpin 90s linear infinite;
}

.ring-mid {
  width: 460px;
  height: 460px;
  border-color: rgba(160, 186, 235, 0.12);
}

.ring-inner {
  width: 300px;
  height: 300px;
  border-color: rgba(245, 166, 35, 0.16);
  animation: ringPulse 6s ease-in-out infinite;
}

.ring-glow {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 420px;
  height: 420px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 166, 35, 0.12) 0%, transparent 62%);
  filter: blur(26px);
  opacity: 0.7;
  transition: opacity 0.8s ease;
}

.aperture.is-focus .ring-mid {
  transform: translate(-50%, -50%) scale(1.06);
  border-color: rgba(245, 166, 35, 0.3);
}

.aperture.is-focus .ring-inner {
  transform: translate(-50%, -50%) scale(0.94);
  border-color: rgba(255, 214, 150, 0.4);
}

.aperture.is-error .ring-glow {
  opacity: 0.2;
}

.aperture.is-open {
  transform: translate(-50%, -50%) scale(1.5);
  opacity: 0;
}

.aperture.is-open .ring-outer {
  border-color: rgba(255, 236, 200, 0.5);
}

@keyframes ringSpin {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes ringPulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 0.9;
  }
}

/* ---------- 卡片 ---------- */
.entry-card {
  transition: transform 0.7s var(--ease-out-expo), box-shadow 0.7s ease, filter 0.7s ease;
}

.entry-card.opening {
  transform: scale(1.05);
  filter: blur(2px) brightness(1.35);
}

.entry-card.shake {
  animation: entryShake 0.55s var(--ease-glide);
}

@keyframes entryShake {
  0%,
  100% {
    transform: translateX(0);
  }
  15% {
    transform: translateX(-9px) rotate(-0.4deg);
  }
  40% {
    transform: translateX(8px) rotate(0.4deg);
  }
  70% {
    transform: translateX(-4px);
  }
}

.lens-badge {
  position: relative;
  width: 62px;
  height: 62px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 32% 28%, rgba(255, 236, 200, 0.16), rgba(245, 166, 35, 0.05) 60%, transparent 100%);
  border: 1px solid rgba(245, 166, 35, 0.22);
  box-shadow: inset 0 0 22px rgba(245, 166, 35, 0.12);
}

.lens-badge-ring {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 1px solid rgba(245, 166, 35, 0.1);
  animation: ringPulse 4.5s ease-in-out infinite;
}

/* ---------- 输入 ---------- */
.field {
  position: relative;
  transition: transform 0.4s var(--ease-spring);
}

.field.is-active {
  transform: scale(1.015);
}

.field-input {
  width: 100%;
  background: transparent;
  border: 0;
  outline: none;
  padding: 10px 4px 14px;
  text-align: center;
  letter-spacing: 0.42em;
  font-size: 16px;
  color: #fffaf0;
  caret-color: #f5a623;
}

.field-input::placeholder {
  color: rgba(148, 163, 184, 0.55);
  letter-spacing: 0.3em;
  font-size: 13px;
}

.field-line {
  position: absolute;
  left: 50%;
  bottom: 0;
  height: 1px;
  width: 46%;
  transform: translateX(-50%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.18), transparent);
  transition: width 0.5s var(--ease-out-expo), background 0.5s ease, box-shadow 0.5s ease;
}

.field.is-active .field-line {
  width: 100%;
  background: linear-gradient(90deg, transparent, rgba(245, 166, 35, 0.85), transparent);
  box-shadow: 0 0 14px rgba(245, 166, 35, 0.5);
}

/* ---------- 按钮 ---------- */
.enter-btn {
  position: relative;
  width: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 15px 0;
  border-radius: 16px;
  font-size: 14px;
  letter-spacing: 0.28em;
  color: #2a1a05;
  background: linear-gradient(135deg, #ffdca8 0%, #f5a623 46%, #d17c12 100%);
  box-shadow: 0 14px 34px -16px rgba(245, 166, 35, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.5);
  transition: transform 0.35s var(--ease-spring), box-shadow 0.35s ease, filter 0.35s ease;
}

.enter-btn::after {
  content: '';
  position: absolute;
  top: -60%;
  left: -40%;
  width: 40%;
  height: 220%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.65), transparent);
  transform: rotate(18deg);
  transition: left 0.7s var(--ease-out-expo);
}

.enter-btn:hover::after {
  left: 110%;
}

.enter-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 42px -14px rgba(245, 166, 35, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.enter-btn:active {
  transform: translateY(0) scale(0.985);
}

.enter-btn:disabled {
  filter: saturate(0.7) brightness(1.1);
  cursor: default;
}

.btn-arrow {
  transition: transform 0.4s var(--ease-spring);
}

.enter-btn:hover .btn-arrow {
  transform: translateX(5px);
}

/* ---------- 错误浮现 ---------- */
.err-enter-active,
.err-leave-active {
  transition: opacity 0.35s ease, transform 0.35s var(--ease-out-expo);
}

.err-enter-from,
.err-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ---------- 开门闪光 ---------- */
.flash {
  position: fixed;
  inset: 0;
  z-index: 30;
  pointer-events: none;
  background: radial-gradient(circle at center, #fffdf6 0%, rgba(255, 236, 200, 0.6) 26%, transparent 62%);
  animation: flashOpen 1.05s var(--ease-out-expo) forwards;
}

@keyframes flashOpen {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  45% {
    opacity: 0.95;
  }
  100% {
    opacity: 0;
    transform: scale(2.6);
  }
}

.flash-leave-active {
  transition: opacity 0.3s ease;
}

@media (max-width: 640px) {
  .ring-outer {
    width: 420px;
    height: 420px;
  }

  .ring-mid {
    width: 320px;
    height: 320px;
  }

  .ring-inner {
    width: 220px;
    height: 220px;
  }

  .ring-glow {
    width: 300px;
    height: 300px;
  }
}
</style>
