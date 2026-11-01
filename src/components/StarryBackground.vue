<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useStarrySky } from '@/composables/useStarrySky'

interface Star {
  x: number
  y: number
  size: number
  opacity: number
  delay: number
  duration: number
  warm: boolean
}

interface Meteor {
  id: number
  x: number
  y: number
  angle: number
  travel: number
  duration: number
}

const { audioLevel, dim, onShootingStar } = useStarrySky()

/* ---------------- 星野：一次性生成，避免重渲染时星星乱跳 ---------------- */
const rand = (min: number, max: number) => Math.random() * (max - min) + min

const makeStars = (count: number, options: { size: [number, number]; opacity: [number, number]; warm: boolean }) => {
  const list: Star[] = []
  for (let i = 0; i < count; i++) {
    list.push({
      x: rand(0, 100),
      y: rand(0, 100),
      size: rand(options.size[0], options.size[1]),
      opacity: rand(options.opacity[0], options.opacity[1]),
      delay: rand(0, 6),
      duration: rand(2.4, 6),
      warm: options.warm,
    })
  }
  return list
}

const farStars = makeStars(140, { size: [0.7, 1.6], opacity: [0.18, 0.55], warm: false })
const midStars = makeStars(56, { size: [1.4, 2.4], opacity: [0.35, 0.8], warm: true })
const nearStars = makeStars(22, { size: [2, 3.6], opacity: [0.55, 1], warm: true })

/* ---------------- 指针视差 ---------------- */
const pointer = reactive({ x: 0, y: 0 })
let targetX = 0
let targetY = 0

const onPointerMove = (e: PointerEvent) => {
  targetX = (e.clientX / window.innerWidth - 0.5) * 2
  targetY = (e.clientY / window.innerHeight - 0.5) * 2
}

/* ---------------- 音频律动 ---------------- */
const level = ref(0)

/* ---------------- 时段色温 ---------------- */
const palettes = {
  dawn: { top: '#121a34', mid: '#1a2542', low: '#080d1c', glow: 'rgba(148, 164, 255, 0.16)', tint: '#9fb4ff' },
  day: { top: '#0a1426', mid: '#13263f', low: '#070e1b', glow: 'rgba(132, 176, 216, 0.14)', tint: '#a9c9ff' },
  dusk: { top: '#1c1b3a', mid: '#17253f', low: '#0a0f22', glow: 'rgba(255, 160, 112, 0.2)', tint: '#ffb37a' },
  night: { top: '#070c1a', mid: '#0d1b33', low: '#050a14', glow: 'rgba(96, 140, 210, 0.18)', tint: '#9cbde8' },
  deep: { top: '#04060f', mid: '#0a1226', low: '#02040a', glow: 'rgba(78, 114, 186, 0.15)', tint: '#8aa8d8' },
}

const phase = computed(() => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 8) return 'dawn'
  if (hour >= 8 && hour < 17) return 'day'
  if (hour >= 17 && hour < 20) return 'dusk'
  if (hour >= 20 || hour < 2) return 'night'
  return 'deep'
})

const palette = computed(() => palettes[phase.value as keyof typeof palettes])

const skyVars = computed(() => ({
  '--sky-top': palette.value.top,
  '--sky-mid': palette.value.mid,
  '--sky-low': palette.value.low,
  '--sky-glow': palette.value.glow,
  '--sky-tint': palette.value.tint,
}))

/* ---------------- 流星 ---------------- */
const meteors = ref<Meteor[]>([])
let meteorSeq = 0
let autoMeteorTimer: number | undefined

const spawnMeteor = () => {
  const id = ++meteorSeq
  const duration = rand(900, 1500)

  meteors.value.push({
    id,
    x: rand(6, 62),
    y: rand(0, 34),
    angle: rand(40, 48),
    travel: rand(200, 340),
    duration,
  })

  // 最多同时 4 颗，避免屏幕太吵
  if (meteors.value.length > 4) meteors.value.shift()

  window.setTimeout(() => {
    meteors.value = meteors.value.filter((m) => m.id !== id)
  }, duration + 200)
}

const scheduleMeteor = () => {
  autoMeteorTimer = window.setTimeout(() => {
    spawnMeteor()
    scheduleMeteor()
  }, rand(8000, 16000))
}

/* ---------------- 帧循环：指针缓动 + 音频平滑 ---------------- */
let rafId = 0
const tick = () => {
  pointer.x += (targetX - pointer.x) * 0.045
  pointer.y += (targetY - pointer.y) * 0.045
  level.value += (audioLevel.value - level.value) * 0.08
  rafId = requestAnimationFrame(tick)
}

const rootStyle = computed(() => ({
  ...skyVars.value,
  opacity: String(1 - dim.value * 0.5),
}))

onMounted(() => {
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  rafId = requestAnimationFrame(tick)
  onShootingStar(spawnMeteor)
  scheduleMeteor()
  window.setTimeout(spawnMeteor, 1400)
})

onUnmounted(() => {
  window.removeEventListener('pointermove', onPointerMove)
  cancelAnimationFrame(rafId)
  if (autoMeteorTimer) window.clearTimeout(autoMeteorTimer)
})
</script>

<template>
  <div class="star-sky grain" :style="rootStyle" aria-hidden="true">
    <!-- 天幕渐变 -->
    <div class="sky-base" />

    <!-- 银河带 -->
    <div class="milky-way" />

    <!-- 星层：远 / 中 / 近，三层不同视差 -->
    <div class="star-layer layer-far" :style="{ transform: `translate3d(${-pointer.x * 10}px, ${-pointer.y * 8}px, 0)` }">
      <div
        v-for="(star, index) in farStars"
        :key="'f' + index"
        class="star"
        :style="{
          left: star.x + '%',
          top: star.y + '%',
          width: star.size + 'px',
          height: star.size + 'px',
          opacity: star.opacity,
          animationDuration: star.duration + 's',
          animationDelay: star.delay + 's',
        }"
      />
    </div>

    <div class="star-layer layer-mid" :style="{ transform: `translate3d(${-pointer.x * 20}px, ${-pointer.y * 16}px, 0)` }">
      <div
        v-for="(star, index) in midStars"
        :key="'m' + index"
        class="star"
        :class="{ 'star-warm': star.warm }"
        :style="{
          left: star.x + '%',
          top: star.y + '%',
          width: star.size + 'px',
          height: star.size + 'px',
          opacity: star.opacity,
          animationDuration: star.duration + 's',
          animationDelay: star.delay + 's',
        }"
      />
    </div>

    <div class="star-layer layer-near" :style="{ transform: `translate3d(${-pointer.x * 34}px, ${-pointer.y * 26}px, 0)` }">
      <div
        v-for="(star, index) in nearStars"
        :key="'n' + index"
        class="star star-warm star-big"
        :style="{
          left: star.x + '%',
          top: star.y + '%',
          width: star.size + 'px',
          height: star.size + 'px',
          opacity: star.opacity,
          animationDuration: star.duration + 's',
          animationDelay: star.delay + 's',
        }"
      />
    </div>

    <!-- 光晕：跟着指针缓动，跟着音乐呼吸 -->
    <div
      class="glow glow-a"
      :style="{
        transform: `translate3d(${-pointer.x * 46}px, ${-pointer.y * 34}px, 0) scale(${1 + level * 0.28})`,
        opacity: 0.2 + level * 0.4,
      }"
    />
    <div
      class="glow glow-b"
      :style="{
        transform: `translate3d(${-pointer.x * 26}px, ${-pointer.y * 20}px, 0) scale(${1 + level * 0.18})`,
        opacity: 0.14 + level * 0.26,
      }"
    />
    <div class="glow glow-c aurora" :style="{ transform: `translate3d(${pointer.x * 18}px, ${pointer.y * 12}px, 0)` }" />

    <!-- 月亮 -->
    <div class="moon-wrap" :style="{ transform: `translate3d(${-pointer.x * 8}px, ${-pointer.y * 6}px, 0)` }">
      <div class="moon-halo" />
      <div class="moon-disc">
        <span class="crater c1" />
        <span class="crater c2" />
        <span class="crater c3" />
      </div>
    </div>

    <!-- 流星：一次一颗，从右上斜向左下 -->
    <div
      v-for="meteor in meteors"
      :key="meteor.id"
      class="meteor-wrap"
      :style="{ left: meteor.x + '%', top: meteor.y + '%', transform: `rotate(${meteor.angle}deg)` }"
    >
      <div
        class="meteor"
        :style="{
          '--travel': meteor.travel + 'px',
          animationDuration: meteor.duration + 'ms',
        }"
      >
        <span class="meteor-head" />
      </div>
    </div>

    <!-- 底部沉入夜色 -->
    <div class="bottom-fade" />
    <div class="vignette" />
  </div>
</template>

<style scoped>
.star-sky {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  transition: opacity 1.4s var(--ease-glide);
}

.sky-base {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 70% at 50% 0%, var(--sky-mid) 0%, transparent 62%),
    linear-gradient(180deg, var(--sky-top) 0%, var(--sky-mid) 42%, var(--sky-low) 100%);
  transition: background 2.5s var(--ease-glide);
}

.milky-way {
  position: absolute;
  left: -30%;
  top: 6%;
  width: 160%;
  height: 46%;
  transform: rotate(-18deg);
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(150, 176, 230, 0.06) 28%,
    rgba(206, 218, 255, 0.13) 48%,
    rgba(150, 176, 230, 0.06) 68%,
    transparent 100%
  );
  filter: blur(28px);
  opacity: 0.85;
  mix-blend-mode: screen;
}

.star-layer {
  position: absolute;
  inset: -24px;
  will-change: transform;
}

.star {
  position: absolute;
  border-radius: 50%;
  background: #ffffff;
  animation-name: twinkleGlow;
  animation-iteration-count: infinite;
  animation-timing-function: ease-in-out;
  animation-fill-mode: both;
}

.star-warm {
  background: #ffeacb;
  box-shadow: 0 0 6px rgba(255, 216, 155, 0.7);
}

.star-big {
  box-shadow: 0 0 10px rgba(255, 216, 155, 0.9), 0 0 22px rgba(245, 166, 35, 0.35);
}

@keyframes twinkleGlow {
  0%,
  100% {
    transform: scale(1);
    filter: brightness(1);
  }
  50% {
    transform: scale(1.22);
    filter: brightness(1.6);
  }
}

.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(64px);
  transition: opacity 0.5s linear;
  will-change: transform, opacity;
}

.glow-a {
  top: 16%;
  left: 46%;
  width: 460px;
  height: 460px;
  background: radial-gradient(circle, var(--sky-glow) 0%, rgba(245, 166, 35, 0.1) 45%, transparent 72%);
}

.glow-b {
  right: 6%;
  bottom: 12%;
  width: 360px;
  height: 360px;
  background: radial-gradient(circle, rgba(96, 140, 210, 0.22) 0%, transparent 70%);
}

.glow-c {
  left: 4%;
  bottom: 26%;
  width: 300px;
  height: 300px;
  border-radius: 42% 58% 46% 54%;
  opacity: 0.4;
}

/* 月亮 */
.moon-wrap {
  position: absolute;
  top: 7%;
  right: 10%;
  width: 96px;
  height: 96px;
  transition: transform 0.8s var(--ease-out-expo);
  will-change: transform;
}

.moon-halo {
  position: absolute;
  inset: -34px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 236, 200, 0.22) 0%, rgba(255, 236, 200, 0.08) 45%, transparent 70%);
  animation: moonBreath 9s ease-in-out infinite;
}

.moon-disc {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 30%, #fffdf5 0%, #f7ecd2 46%, #e2d0a9 82%, #cfba90 100%);
  box-shadow:
    inset -10px -8px 22px rgba(120, 100, 70, 0.35),
    0 0 32px rgba(255, 236, 200, 0.35);
  animation: moonBreath 9s ease-in-out infinite;
}

.crater {
  position: absolute;
  border-radius: 50%;
  background: rgba(180, 160, 128, 0.32);
  box-shadow: inset 1px 1px 2px rgba(255, 255, 255, 0.35);
}

.c1 {
  width: 16px;
  height: 16px;
  top: 24%;
  left: 26%;
}

.c2 {
  width: 10px;
  height: 10px;
  top: 56%;
  left: 18%;
}

.c3 {
  width: 20px;
  height: 20px;
  top: 48%;
  left: 54%;
}

@keyframes moonBreath {
  0%,
  100% {
    opacity: 0.92;
  }
  50% {
    opacity: 1;
  }
}

/* 流星 */
.meteor-wrap {
  position: absolute;
  transform-origin: left center;
}

.meteor {
  width: 130px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(255, 216, 155, 0) 0%, rgba(255, 216, 155, 0.5) 55%, rgba(255, 240, 210, 0.95) 100%);
  box-shadow: 0 0 12px rgba(255, 216, 155, 0.6);
  opacity: 0;
  animation-name: meteorFly;
  animation-timing-function: cubic-bezier(0.3, 0.1, 0.5, 1);
  animation-fill-mode: forwards;
}

.meteor-head {
  position: absolute;
  right: -1px;
  top: 50%;
  width: 4px;
  height: 4px;
  margin-top: -2px;
  border-radius: 50%;
  background: #fffdf6;
  box-shadow: 0 0 14px 4px rgba(255, 236, 200, 0.7);
}

@keyframes meteorFly {
  0% {
    opacity: 0;
    transform: translate3d(0, 0, 0);
  }
  10% {
    opacity: 1;
  }
  70% {
    opacity: 0.85;
  }
  100% {
    opacity: 0;
    transform: translate3d(var(--travel, 260px), var(--travel, 260px), 0);
  }
}

.bottom-fade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 38%;
  background: linear-gradient(to top, var(--night-950, #050a14) 8%, transparent 100%);
}

.vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(130% 100% at 50% 40%, transparent 46%, rgba(2, 5, 12, 0.55) 100%);
}

@media (max-width: 640px) {
  .moon-wrap {
    top: 5%;
    right: 8%;
    width: 64px;
    height: 64px;
  }

  .glow-a {
    width: 320px;
    height: 320px;
  }

  .glow-b {
    width: 240px;
    height: 240px;
  }
}
</style>
