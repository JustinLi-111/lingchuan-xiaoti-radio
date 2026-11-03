<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useStarrySky } from '@/composables/useStarrySky'
import { useRealSky } from '@/composables/useRealSky'
import { useWeather } from '@/composables/useWeather'
import { CONSTELLATION_LINES, moonLitPath, projectAltAz } from '@/lib/skyMath'

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
const { sky, sunAlt, sunAz } = useRealSky()
const { weather, starDim } = useWeather()

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

/* ---------------- 时段：从白昼到深夜的完整天色 ---------------- */
const palettes = {
  dawn: {
    top: '#1b2749',
    mid: '#54517a',
    low: '#c07a5c',
    glow: 'rgba(255, 176, 120, 0.26)',
    tint: '#ffc08a',
    veil: 0.24,
    horizon: 'rgba(255, 152, 96, 0.42)',
  },
  day: {
    top: '#2b5c93',
    mid: '#6ea3c9',
    low: '#bfd0da',
    glow: 'rgba(255, 238, 208, 0.3)',
    tint: '#eaf2fb',
    veil: 0.58,
    horizon: 'rgba(255, 220, 160, 0.44)',
  },
  dusk: {
    top: '#1a2246',
    mid: '#5b4258',
    low: '#c26a4c',
    glow: 'rgba(255, 150, 104, 0.28)',
    tint: '#ffb083',
    veil: 0.26,
    horizon: 'rgba(255, 122, 78, 0.46)',
  },
  night: {
    top: '#070c1a',
    mid: '#0d1b33',
    low: '#050a14',
    glow: 'rgba(96, 140, 210, 0.18)',
    tint: '#9cbde8',
    veil: 0,
    horizon: 'rgba(96, 140, 210, 0.14)',
  },
  deep: {
    top: '#04060f',
    mid: '#0a1226',
    low: '#02040a',
    glow: 'rgba(78, 114, 186, 0.15)',
    tint: '#8aa8d8',
    veil: 0,
    horizon: 'rgba(78, 114, 186, 0.12)',
  },
}

const phase = computed(() => {
  // 用真实太阳高度决定天色：越高越亮，落到地平线下才真正入夜
  const alt = sunAlt.value
  if (alt >= 8) return 'day'
  if (alt >= -8) return sunAz.value < 180 ? 'dawn' : 'dusk'
  if (alt <= -28) return 'deep'
  return 'night'
})

const palette = computed(() => palettes[phase.value as keyof typeof palettes])

const skyVars = computed(() => ({
  '--sky-top': palette.value.top,
  '--sky-mid': palette.value.mid,
  '--sky-low': palette.value.low,
  '--sky-glow': palette.value.glow,
  '--sky-tint': palette.value.tint,
  '--sky-horizon': palette.value.horizon,
}))

// 星光随太阳一起退场：太阳落下去以后才亮起来
const starVisibility = computed(() => Math.min(1, Math.max(0, (-sunAlt.value - 2) / 6)))

/* ---------------- 太阳：白昼、日出与日落 ---------------- */
const isDaylight = computed(() => sunAlt.value > -4)

const sunPlace = computed(() => {
  const alt = sunAlt.value
  const p = projectAltAz(alt, sunAz.value)
  return {
    x: Math.min(96, Math.max(4, p.x)),
    y: Math.min(72, Math.max(2, p.y)),
    core: alt >= 2 ? 1 : Math.max(0, (alt + 2) / 4),
    halo: alt > -8 ? 0.16 + Math.min(0.34, Math.max(0, alt / 40)) : 0,
  }
})

/* ---------------- 真实夜空：月亮与亮星 ---------------- */
const moon = computed(() => sky.value?.moon ?? null)

const moonPath = computed(() =>
  moon.value ? moonLitPath(moon.value.illumination, moon.value.waxing) : moonLitPath(0.5, true),
)

const moonPlace = computed(() => {
  const m = moon.value
  if (!m) return { x: 82, y: 12, opacity: 1 }
  const p = projectAltAz(m.alt, m.az)
  return {
    x: Math.min(92, Math.max(8, p.x)),
    y: Math.min(72, Math.max(6, p.y)),
    // 月亮落到地平线以下就真的看不到，不再硬画在天上；白天只剩一轮淡淡的月
    opacity: m.visible ? (sunAlt.value > 2 ? 0.34 : 1) : 0,
  }
})

const moonHaloOpacity = computed(() => {
  const m = moon.value
  if (!m) return 0.22
  return m.visible ? 0.12 + m.illumination * 0.5 : 0
})

/* 角落里的一行小字：白天说太阳，入夜说月亮与亮星 */
const skyLegend = computed(() => {
  const s = sky.value
  if (!s) return ''
  if (sunAlt.value > 2) {
    return `未央 · ${weather.value.label} · 太阳高 ${Math.round(sunAlt.value)}°`
  }
  const m = s.moon
  const moonPart = m.visible ? `${m.phaseName} ${Math.round(m.illumination * 100)}%` : `${m.phaseName} 未升起`
  return `未央 · ${moonPart} · 亮星 ${s.stars.length}`
})

const realStars = computed(() =>
  (sky.value?.stars ?? []).map((star) => {
    const p = projectAltAz(star.alt, star.az)
    return {
      ...star,
      x: p.x,
      y: p.y,
      size: 1.5 + Math.max(0, 3.4 - star.mag) * 0.5,
      opacity: 0.32 + star.brightness * 0.68,
    }
  }),
)

const constellationLines = computed(() => {
  const byName = new Map(realStars.value.map((star) => [star.name, star]))
  return CONSTELLATION_LINES.filter((line) => byName.has(line.from) && byName.has(line.to)).map((line) => {
    const a = byName.get(line.from)!
    const b = byName.get(line.to)!
    return {
      key: `${line.from}-${line.to}`,
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      opacity: Math.min(a.opacity, b.opacity) * 0.34,
    }
  })
})

/* ---------------- 天气：西安未央此刻的云、雨、雪 ---------------- */
const starLayerOpacity = computed(() => Math.max(0.4, starDim.value) * starVisibility.value)

// 白天不画银河
const milkyOpacity = computed(() => 0.85 * starVisibility.value)

const showClouds = computed(
  () =>
    weather.value.loaded &&
    (weather.value.cloudCover >= 28 ||
      ['cloudy', 'fog', 'rain', 'snow', 'thunder'].includes(weather.value.condition)),
)

const cloudOpacity = computed(() => 0.06 + Math.min(1, weather.value.cloudCover / 100) * 0.26)

const clouds = [
  { x: -6, y: 8, w: 460, h: 150, delay: 0, duration: 68 },
  { x: 46, y: 4, w: 520, h: 170, delay: 12, duration: 84 },
  { x: 18, y: 22, w: 380, h: 130, delay: 24, duration: 74 },
  { x: 62, y: 26, w: 340, h: 120, delay: 6, duration: 92 },
  { x: 4, y: 34, w: 420, h: 140, delay: 32, duration: 80 },
]

// 云量越厚，天上的云越多
const visibleClouds = computed(() => {
  const count = Math.round(Math.max(0.25, weather.value.cloudCover / 100) * clouds.length)
  return clouds.slice(0, Math.max(2, count))
})

interface Drop {
  x: number
  delay: number
  duration: number
  length: number
  opacity: number
}

interface Flake {
  x: number
  delay: number
  duration: number
  size: number
  drift: number
}

const drops = ref<Drop[]>([])
const flakes = ref<Flake[]>([])

const makeDrops = (): Drop[] =>
  Array.from({ length: 64 }, () => ({
    x: rand(-8, 108),
    delay: rand(0, 4),
    duration: rand(0.7, 1.6),
    length: rand(38, 86),
    opacity: rand(0.2, 0.55),
  }))

const makeFlakes = (): Flake[] =>
  Array.from({ length: 48 }, () => ({
    x: rand(-4, 104),
    delay: rand(0, 10),
    duration: rand(9, 20),
    size: rand(1.6, 4),
    drift: rand(-30, 30),
  }))

watch(
  () => weather.value.condition,
  (condition) => {
    drops.value = condition === 'rain' || condition === 'thunder' ? makeDrops() : []
    flakes.value = condition === 'snow' ? makeFlakes() : []
  },
  { immediate: true },
)

/* ---------------- 流星 ---------------- */
const meteors = ref<Meteor[]>([])
let meteorSeq = 0
let autoMeteorTimer: number | undefined

const spawnMeteor = () => {
  // 白天看不见流星
  if (starVisibility.value < 0.35) return
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
    <div class="milky-way" :style="{ opacity: milkyOpacity }" />

    <!-- 星层：远 / 中 / 近，三层不同视差；云量越高越暗 -->
    <div
      class="star-layer layer-far"
      :style="{ transform: `translate3d(${-pointer.x * 10}px, ${-pointer.y * 8}px, 0)`, opacity: starLayerOpacity }"
    >
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

    <div
      class="star-layer layer-mid"
      :style="{ transform: `translate3d(${-pointer.x * 20}px, ${-pointer.y * 16}px, 0)`, opacity: starLayerOpacity }"
    >
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

    <div
      class="star-layer layer-near"
      :style="{ transform: `translate3d(${-pointer.x * 34}px, ${-pointer.y * 26}px, 0)`, opacity: starLayerOpacity }"
    >
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

    <!-- 真实星空：今夜西安未央头顶真正挂着的亮星 -->
    <div class="real-sky" :style="{ opacity: starLayerOpacity }">
      <svg class="constellation-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line
          v-for="line in constellationLines"
          :key="line.key"
          :x1="line.x1"
          :y1="line.y1"
          :x2="line.x2"
          :y2="line.y2"
          :style="{ opacity: line.opacity }"
          class="constellation-line"
        />
      </svg>

      <div
        v-for="star in realStars"
        :key="star.name"
        class="real-star"
        :style="{
          left: star.x + '%',
          top: star.y + '%',
          width: star.size + 'px',
          height: star.size + 'px',
          opacity: star.opacity,
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

    <!-- 地平线上的光：日出日落时最浓 -->
    <div class="horizon-glow" :style="{ left: sunPlace.x + '%' }" />

    <!-- 白昼滤光：压暗天幕与光晕；太阳、月亮、云画在它上面，才不会被一起压灰 -->
    <div class="day-veil" :style="{ opacity: palette.veil }" />

    <!-- 太阳：跟着真实方位与高度走 -->
    <div class="sun-wrap" :style="{ left: sunPlace.x + '%', top: sunPlace.y + '%' }">
      <div class="sun-c" :style="{ opacity: sunPlace.halo * 1.3 + 0.04 }" />
      <div class="sun-b" :style="{ opacity: sunPlace.halo * 1.1 + 0.04 }" />
      <div class="sun-a" :style="{ opacity: sunPlace.halo * 0.9 + 0.04 }" />
      <div class="sun-core" :style="{ opacity: sunPlace.core }">
        <div class="sun-surface" />
      </div>
    </div>

    <!-- 月亮：真实月相与真实位置 -->
    <div
      class="moon-wrap"
      :style="{
        left: moonPlace.x + '%',
        top: moonPlace.y + '%',
        opacity: moonPlace.opacity,
        transform: `translate3d(${-pointer.x * 8}px, ${-pointer.y * 6}px, 0)`,
      }"
    >
      <div
        class="moon-halo"
        :style="{
          opacity: moonHaloOpacity,
          transform: `scale(${0.86 + (moon ? moon.illumination : 0.5) * 0.34})`,
        }"
      />
      <svg class="moon-svg" viewBox="0 0 100 100">
        <defs>
          <radialGradient id="moonFace" cx="32%" cy="28%" r="84%">
            <stop offset="0%" stop-color="#fffaf0" />
            <stop offset="14%" stop-color="#fbf0d6" />
            <stop offset="40%" stop-color="#efdcb2" />
            <stop offset="70%" stop-color="#d8bf8a" />
            <stop offset="100%" stop-color="#b89e6a" />
          </radialGradient>
          <radialGradient id="moonMar" cx="40%" cy="42%" r="60%">
            <stop offset="0%" stop-color="#8a7452" stop-opacity="0.55" />
            <stop offset="60%" stop-color="#8a7452" stop-opacity="0.22" />
            <stop offset="100%" stop-color="#8a7452" stop-opacity="0" />
          </radialGradient>
          <clipPath id="moonLit">
            <path :d="moonPath" />
          </clipPath>
          <clipPath id="moonFull">
            <circle cx="50" cy="50" r="46" />
          </clipPath>
          <filter id="moonRough">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" />
            <feColorMatrix values="0 0 0 0 0.52  0 0 0 0 0.44  0 0 0 0 0.32  0 0 0 0.28 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
        </defs>

        <!-- 地球反照：暗面的轮廓 -->
        <circle cx="50" cy="50" r="46" class="moon-earthshine" />

        <!-- 未裁剪的整张月面阴影（让月影看起来立体） -->
        <path :d="moonPath" fill="url(#moonFace)" class="moon-face" />

        <!-- 月海（大斑块，只在亮面出现） -->
        <g clip-path="url(#moonLit)">
          <ellipse cx="38" cy="40" rx="14" ry="10" fill="url(#moonMar)" />
          <ellipse cx="60" cy="60" rx="10" ry="7" fill="url(#moonMar)" />
          <ellipse cx="68" cy="38" rx="8" ry="6" fill="url(#moonMar)" />
          <ellipse cx="45" cy="70" rx="9" ry="6" fill="url(#moonMar)" />
        </g>

        <!-- 陨石坑（小圆环，有阴影） -->
        <g clip-path="url(#moonLit)" class="crater-group">
          <circle cx="34" cy="36" r="5" />
          <circle cx="34" cy="36" r="2.6" />
          <circle cx="57" cy="59" r="4" />
          <circle cx="57" cy="59" r="2" />
          <circle cx="41" cy="67" r="3" />
          <circle cx="41" cy="67" r="1.4" />
          <circle cx="65" cy="31" r="2.4" />
          <circle cx="65" cy="31" r="1.2" />
          <circle cx="48" cy="48" r="1.8" />
          <circle cx="60" cy="42" r="1.6" />
          <circle cx="30" cy="58" r="1.4" />
        </g>
      </svg>
    </div>

    <!-- 天气：西安未央此刻的云、雨、雪 -->
    <div v-if="showClouds" class="cloud-layer" :class="{ 'is-day': sunAlt > 4 }" :style="{ opacity: cloudOpacity }">
      <span
        v-for="(cloud, index) in visibleClouds"
        :key="index"
        class="cloud"
        :style="{
          left: cloud.x + '%',
          top: cloud.y + '%',
          width: cloud.w + 'px',
          height: cloud.h + 'px',
          animationDuration: cloud.duration + 's',
          animationDelay: cloud.delay + 's',
        }"
      />
    </div>

    <div v-if="drops.length" class="rain-layer">
      <span
        v-for="(drop, index) in drops"
        :key="'d' + index"
        class="drop"
        :style="{
          left: drop.x + '%',
          height: drop.length + 'px',
          opacity: drop.opacity,
          animationDuration: drop.duration + 's',
          animationDelay: drop.delay + 's',
        }"
      />
    </div>

    <div v-if="flakes.length" class="snow-layer">
      <span
        v-for="(flake, index) in flakes"
        :key="'s' + index"
        class="flake"
        :style="{
          left: flake.x + '%',
          width: flake.size + 'px',
          height: flake.size + 'px',
          animationDuration: flake.duration + 's',
          animationDelay: flake.delay + 's',
          '--drift': flake.drift + 'px',
        }"
      />
    </div>

    <div v-if="weather.condition === 'fog'" class="fog-layer" />
    <div v-if="weather.condition === 'thunder'" class="thunder-flash" />

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

    <!-- 底部的夜与压暗 -->
    <div class="bottom-fade" />
    <div class="vignette" />

    <!-- 角落的天象小字 -->
    <p v-if="skyLegend" class="sky-legend">{{ skyLegend }}</p>
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
    radial-gradient(90% 46% at 50% 104%, var(--sky-horizon) 0%, transparent 70%),
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

/* 地平线光 */
.horizon-glow {
  position: absolute;
  bottom: -14%;
  width: 70%;
  height: 46%;
  transform: translateX(-50%);
  background: radial-gradient(ellipse at 50% 100%, var(--sky-horizon) 0%, transparent 68%);
  filter: blur(18px);
  opacity: 0.72;
  transition:
    left 4s var(--ease-glide),
    opacity 2.5s var(--ease-glide);
}

/* 太阳 */
.sun-wrap {
  position: absolute;
  width: 64px;
  height: 64px;
  margin: -32px 0 0 -32px;
  transition:
    left 4s var(--ease-glide),
    top 4s var(--ease-glide);
}

.sun-core {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 38% 34%, #fffdf3 0%, rgba(255, 240, 190, 0) 38%),
    radial-gradient(circle, #ffe39a 0%, #ffc55b 48%, #ff9a2e 82%, rgba(255, 130, 30, 0) 100%);
  box-shadow:
    0 0 40px 14px rgba(255, 200, 110, 0.5),
    0 0 90px 34px rgba(255, 160, 60, 0.26),
    0 0 160px 70px rgba(255, 140, 40, 0.12);
  transition: opacity 2.2s var(--ease-glide);
  overflow: hidden;
}

.sun-surface {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 65% 55%, rgba(255, 230, 160, 0.38) 0%, transparent 40%),
    radial-gradient(circle at 30% 70%, rgba(255, 170, 80, 0.34) 0%, transparent 36%),
    radial-gradient(circle at 55% 25%, rgba(255, 210, 120, 0.3) 0%, transparent 30%);
  animation: sunSurface 14s ease-in-out infinite;
  pointer-events: none;
}

@keyframes sunSurface {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
    opacity: 0.9;
  }
  50% {
    transform: rotate(15deg) scale(1.04);
    opacity: 1;
  }
}

/* 三层外晕：越外越大越虚 */
.sun-a,
.sun-b,
.sun-c {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  transition: opacity 2.2s var(--ease-glide);
}

.sun-a {
  left: -120px;
  top: -120px;
  width: 304px;
  height: 304px;
  background: radial-gradient(
    circle,
    rgba(255, 230, 170, 0.42) 0%,
    rgba(255, 200, 130, 0.18) 32%,
    rgba(255, 170, 90, 0.06) 58%,
    transparent 76%
  );
  filter: blur(4px);
}

.sun-b {
  left: -240px;
  top: -240px;
  width: 544px;
  height: 544px;
  background: radial-gradient(
    circle,
    rgba(255, 210, 140, 0.22) 0%,
    rgba(255, 180, 100, 0.1) 32%,
    rgba(255, 160, 80, 0.03) 58%,
    transparent 78%
  );
  filter: blur(10px);
}

.sun-c {
  left: -420px;
  top: -420px;
  width: 904px;
  height: 904px;
  background: radial-gradient(
    circle,
    rgba(255, 180, 110, 0.12) 0%,
    rgba(255, 160, 90, 0.05) 30%,
    rgba(255, 140, 70, 0.015) 60%,
    transparent 80%
  );
  filter: blur(22px);
}

/* 月亮 */
.moon-wrap {
  position: absolute;
  left: 82%;
  top: 12%;
  width: 128px;
  height: 128px;
  margin-left: -64px;
  transition:
    left 3s var(--ease-glide),
    top 3s var(--ease-glide),
    opacity 1.6s var(--ease-glide),
    transform 0.8s var(--ease-out-expo);
  will-change: transform, left, top;
}

.moon-halo {
  position: absolute;
  inset: -48px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(220, 232, 255, 0.26) 0%,
    rgba(200, 216, 248, 0.1) 40%,
    rgba(170, 196, 236, 0.03) 66%,
    transparent 82%
  );
  animation: moonBreath 9s ease-in-out infinite;
  transition: opacity 1.6s var(--ease-glide);
  filter: blur(2px);
}

.moon-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  filter: drop-shadow(0 0 16px rgba(220, 232, 255, 0.3))
    drop-shadow(0 0 38px rgba(180, 200, 240, 0.18));
}

.moon-earthshine {
  fill: rgba(200, 216, 240, 0.04);
  stroke: rgba(200, 216, 240, 0.1);
  stroke-width: 1;
}

.moon-face {
  animation: moonBreath 9s ease-in-out infinite;
}

.crater-group circle {
  fill: rgba(120, 100, 72, 0.42);
  stroke: rgba(96, 80, 56, 0.3);
  stroke-width: 0.6;
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

/* 白昼滤光：让亮起来的天空不为难文字 */
.day-veil {
  position: absolute;
  inset: 0;
  background: #070b1a;
  transition: opacity 2.5s var(--ease-glide);
}

/* 真实星空 */
.real-sky {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: opacity 1.2s var(--ease-glide);
}

.constellation-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.constellation-line {
  stroke: rgba(170, 198, 240, 0.55);
  stroke-width: 0.22;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}

.real-star {
  position: absolute;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: #ffffff;
  box-shadow:
    0 0 7px rgba(214, 230, 255, 0.75),
    0 0 18px rgba(170, 198, 255, 0.28);
}

/* 角落的天象小字 */
.sky-legend {
  position: absolute;
  left: 20px;
  bottom: 18px;
  margin: 0;
  font-size: 10px;
  letter-spacing: 0.24em;
  color: rgba(214, 226, 246, 0.42);
  animation: legendIn 1.6s var(--ease-glide) both;
}

@keyframes legendIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 天气：云 / 雨 / 雪 / 雾 / 雷 */
.cloud-layer,
.rain-layer,
.snow-layer,
.fog-layer,
.thunder-flash {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.cloud-layer {
  transition: opacity 2.4s var(--ease-glide);
}

.cloud-layer.is-day .cloud {
  background: radial-gradient(
    ellipse at 50% 55%,
    rgba(255, 255, 255, 0.66) 0%,
    rgba(226, 236, 248, 0.34) 44%,
    transparent 72%
  );
}

.cloud {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at 50% 55%,
    rgba(212, 226, 246, 0.5) 0%,
    rgba(168, 190, 222, 0.24) 46%,
    transparent 72%
  );
  filter: blur(26px);
  animation-name: cloudDrift;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
}

@keyframes cloudDrift {
  from {
    transform: translate3d(-18px, 0, 0);
  }
  to {
    transform: translate3d(26px, 7px, 0);
  }
}

.drop {
  position: absolute;
  top: -12%;
  width: 1px;
  background: linear-gradient(to bottom, rgba(190, 214, 244, 0), rgba(200, 222, 252, 0.72));
  transform: rotate(12deg);
  animation-name: rainFall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@keyframes rainFall {
  0% {
    transform: translate3d(0, -12vh, 0) rotate(12deg);
    opacity: 0;
  }
  12% {
    opacity: 0.75;
  }
  100% {
    transform: translate3d(-11vh, 112vh, 0) rotate(12deg);
    opacity: 0;
  }
}

.flake {
  position: absolute;
  top: -6%;
  border-radius: 50%;
  background: #eef4ff;
  box-shadow: 0 0 6px rgba(220, 235, 255, 0.6);
  animation-name: snowFall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@keyframes snowFall {
  0% {
    transform: translate3d(0, -8vh, 0);
    opacity: 0;
  }
  12% {
    opacity: 0.75;
  }
  50% {
    transform: translate3d(var(--drift, 0px), 52vh, 0);
  }
  100% {
    transform: translate3d(0, 108vh, 0);
    opacity: 0;
  }
}

.fog-layer {
  top: auto;
  bottom: 0;
  height: 46%;
  background: linear-gradient(to top, rgba(196, 206, 222, 0.16), rgba(196, 206, 222, 0.05) 55%, transparent 100%);
}

.thunder-flash {
  background: rgba(212, 228, 255, 0.5);
  opacity: 0;
  animation: thunderFlash 16s linear infinite;
}

@keyframes thunderFlash {
  0%,
  92%,
  100% {
    opacity: 0;
  }
  93% {
    opacity: 0.5;
  }
  94% {
    opacity: 0.08;
  }
  95% {
    opacity: 0.34;
  }
  96% {
    opacity: 0;
  }
}

@media (max-width: 640px) {
  .sun-wrap {
    width: 44px;
    height: 44px;
    margin: -22px 0 0 -22px;
  }

  .sun-a {
    left: -90px;
    top: -90px;
    width: 224px;
    height: 224px;
  }

  .sun-b {
    left: -170px;
    top: -170px;
    width: 384px;
    height: 384px;
  }

  .moon-wrap {
    width: 84px;
    height: 84px;
    margin-left: -42px;
  }

  .moon-halo {
    inset: -30px;
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
