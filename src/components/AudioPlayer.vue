<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Play, Pause, Rewind, FastForward } from 'lucide-vue-next'
import type { Story } from '@/composables/useSupabaseStories'
import { useStarrySky } from '@/composables/useStarrySky'

const props = defineProps<{
  story: Story
}>()

const { setAudio, requestShootingStar } = useStarrySky()

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const audioRef = ref<HTMLAudioElement | null>(null)

const BAR_COUNT = 44
const bars = ref<number[]>(Array.from({ length: BAR_COUNT }, () => 0.08))
const seeds = Array.from({ length: BAR_COUNT }, () => Math.random())

const formatTime = (time: number) => {
  if (!Number.isFinite(time) || time < 0) time = 0
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const totalSeconds = computed(() => {
  if (duration.value > 0) return duration.value
  const [minutes, seconds] = (props.story.duration || '0:00').split(':').map(Number)
  return (minutes || 0) * 60 + (seconds || 0)
})

const progress = computed(() => {
  if (totalSeconds.value === 0) return 0
  return Math.min(100, (currentTime.value / totalSeconds.value) * 100)
})

const activeCount = computed(() => Math.round((progress.value / 100) * BAR_COUNT))

const togglePlay = () => {
  if (!audioRef.value) return

  if (isPlaying.value) {
    audioRef.value.pause()
    isPlaying.value = false
    return
  }

  audioRef.value
    .play()
    .then(() => {
      isPlaying.value = true
      requestShootingStar()
    })
    .catch(() => {
      isPlaying.value = false
    })
}

const handleTimeUpdate = () => {
  if (audioRef.value) currentTime.value = audioRef.value.currentTime
}

const handleLoadedMetadata = () => {
  if (audioRef.value) duration.value = audioRef.value.duration || 0
}

const handleEnded = () => {
  isPlaying.value = false
  currentTime.value = 0
}

const handlePlay = () => {
  isPlaying.value = true
}

const handlePause = () => {
  isPlaying.value = false
}

const seekToRatio = (ratio: number) => {
  if (!audioRef.value || totalSeconds.value === 0) return
  const clamped = Math.max(0, Math.min(1, ratio))
  audioRef.value.currentTime = clamped * totalSeconds.value
  currentTime.value = audioRef.value.currentTime
}

const handleSeekInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  seekToRatio(parseFloat(target.value) / 100)
}

const handleRibbonClick = (e: MouseEvent) => {
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  seekToRatio((e.clientX - rect.left) / rect.width)
}

const skip = (delta: number) => {
  if (!audioRef.value) return
  audioRef.value.currentTime = Math.max(0, Math.min(totalSeconds.value, audioRef.value.currentTime + delta))
}

/* ---------- 假波形：不接管音频输出，只做视觉律动 ---------- */
let rafId = 0
let lastPaint = 0

const paint = (now: number) => {
  rafId = requestAnimationFrame(paint)

  const frameGap = isPlaying.value ? 42 : 180
  if (now - lastPaint < frameGap) return
  lastPaint = now

  const t = audioRef.value?.currentTime || 0
  const playing = isPlaying.value
  const next: number[] = []
  let sum = 0

  for (let i = 0; i < BAR_COUNT; i++) {
    const phase = i / BAR_COUNT
    const envelope = 0.52 + 0.48 * Math.sin(phase * Math.PI)

    if (!playing) {
      const idle = 0.07 + 0.05 * Math.sin(now / 780 + i * 0.7)
      next.push(idle > 0 ? idle : 0.05)
      sum += idle
      continue
    }

    const s1 = Math.sin(t * 3.05 + i * 0.62 + seeds[i] * 6.28)
    const s2 = Math.sin(t * 1.63 - i * 0.95 + seeds[i] * 3.14)
    const s3 = Math.sin(t * 6.4 + i * 1.7 + seeds[i])
    const mixed = (s1 * 0.48 + s2 * 0.3 + s3 * 0.22 + 1) / 2
    const value = Math.max(0.1, envelope * (0.3 + mixed * 0.7))
    next.push(value)
    sum += value
  }

  bars.value = next
  setAudio(playing ? sum / BAR_COUNT : 0, playing)
}

watch(
  () => props.story,
  () => {
    isPlaying.value = false
    currentTime.value = 0
    if (audioRef.value) audioRef.value.load()
    setAudio(0, false)
  },
)

onMounted(() => {
  const el = audioRef.value
  if (el) {
    el.addEventListener('timeupdate', handleTimeUpdate)
    el.addEventListener('loadedmetadata', handleLoadedMetadata)
    el.addEventListener('ended', handleEnded)
    el.addEventListener('play', handlePlay)
    el.addEventListener('pause', handlePause)
  }
  rafId = requestAnimationFrame(paint)
})

onUnmounted(() => {
  const el = audioRef.value
  if (el) {
    el.removeEventListener('timeupdate', handleTimeUpdate)
    el.removeEventListener('loadedmetadata', handleLoadedMetadata)
    el.removeEventListener('ended', handleEnded)
    el.removeEventListener('play', handlePlay)
    el.removeEventListener('pause', handlePause)
  }
  cancelAnimationFrame(rafId)
  setAudio(0, false)
})
</script>

<template>
  <div class="player flex flex-col items-center w-full">
    <audio ref="audioRef" :src="story.audioUrl" preload="metadata" />

    <!-- 唱片机 -->
    <div class="deck">
      <div class="halo" :class="{ 'is-live': isPlaying }" />

      <div class="vinyl" :class="{ spinning: isPlaying }">
        <span class="grooves" />
        <span class="pressing" />
        <span class="sheen" />
      </div>

      <span class="tonearm" :class="{ 'is-down': isPlaying }" />

      <button class="play-btn" :class="{ 'is-playing': isPlaying }" @click="togglePlay" :aria-label="isPlaying ? '暂停' : '播放'">
        <span class="play-ripple" />
        <Pause v-if="isPlaying" class="w-9 h-9 text-white drop-shadow" :stroke-width="1.8" />
        <Play v-else class="w-9 h-9 text-white drop-shadow ml-1" :stroke-width="1.8" />
      </button>
    </div>

    <!-- 曲目信息 -->
    <div class="text-center mt-7 mb-6">
      <p class="text-warm-400/85 text-xs tracking-[0.32em] mb-2">
        {{ story.subtitle }}
      </p>
      <h2 class="font-serif text-2xl md:text-3xl font-light text-warm-100 mb-2 text-glow">
        {{ story.title }}
      </h2>
      <p class="text-night-400 text-xs tracking-[0.16em]">
        {{ story.date }} · {{ story.duration }}
      </p>
    </div>

    <!-- 波形丝带：可点击跳转 -->
    <div class="ribbon-wrap w-full max-w-md">
      <div class="ribbon" @click="handleRibbonClick">
        <span
          v-for="(value, index) in bars"
          :key="index"
          class="bar"
          :class="{ 'bar-active': index < activeCount, 'bar-playing': isPlaying }"
          :style="{ height: `${4 + value * 54}px` }"
        />
        <span class="playhead" :style="{ left: progress + '%' }" />
      </div>

      <input
        type="range"
        min="0"
        max="100"
        step="0.1"
        :value="progress"
        class="sr-only"
        aria-label="播放进度"
        @input="handleSeekInput"
      />

      <div class="flex justify-between text-[11px] text-night-500 tracking-widest mt-3 tabular-nums">
        <span>{{ formatTime(currentTime) }}</span>
        <span>{{ formatTime(totalSeconds) }}</span>
      </div>
    </div>

    <!-- 控制 -->
    <div class="flex items-center gap-6 mt-6">
      <button class="ctrl" title="后退 10 秒" @click="skip(-10)">
        <Rewind class="w-4 h-4" :stroke-width="1.6" />
        <span>10s</span>
      </button>

      <button class="ctrl" title="前进 10 秒" @click="skip(10)">
        <span>10s</span>
        <FastForward class="w-4 h-4" :stroke-width="1.6" />
      </button>
    </div>

    <p class="text-night-600 text-[11px] mt-8 tracking-[0.28em]">
      {{ isPlaying ? '正在播放 · 星夜里有人陪你' : '戴上耳机，效果更好哦' }}
    </p>
  </div>
</template>

<style scoped>
.deck {
  position: relative;
  width: 248px;
  height: 248px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.halo {
  position: absolute;
  inset: -22px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 166, 35, 0.26) 0%, rgba(245, 166, 35, 0.08) 46%, transparent 70%);
  filter: blur(14px);
  transition: opacity 0.9s ease, transform 0.9s var(--ease-out-expo);
  opacity: 0.55;
}

.halo.is-live {
  opacity: 1;
  animation: haloBreath 4.5s ease-in-out infinite;
}

@keyframes haloBreath {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.14);
  }
}

/* 黑胶唱片 */
.vinyl {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 36% 30%, rgba(255, 255, 255, 0.1), transparent 42%),
    repeating-radial-gradient(circle at 50% 50%, #101728 0px, #101728 2px, #0a101d 3px, #0a101d 4px),
    #0a0f1a;
  box-shadow:
    inset 0 0 40px rgba(0, 0, 0, 0.9),
    0 22px 50px -18px rgba(0, 0, 0, 0.9),
    0 0 0 1px rgba(255, 255, 255, 0.06);
  animation: vinylSpin 26s linear infinite;
  animation-play-state: paused;
  transition: transform 0.6s var(--ease-out-expo);
}

.vinyl.spinning {
  animation-play-state: running;
}

@keyframes vinylSpin {
  to {
    transform: rotate(360deg);
  }
}

.grooves {
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  background: repeating-radial-gradient(
    circle at 50% 50%,
    rgba(255, 255, 255, 0.045) 0px,
    rgba(255, 255, 255, 0.045) 1px,
    transparent 1px,
    transparent 5px
  );
}

.pressing {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 96px;
  height: 96px;
  margin: -48px 0 0 -48px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 34%, #ffeacb 0%, #f5a623 44%, #b96f10 100%);
  box-shadow: inset 0 0 18px rgba(120, 70, 10, 0.5);
}

.sheen {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(from 210deg, transparent 0%, rgba(255, 255, 255, 0.1) 12%, transparent 26%, transparent 52%, rgba(255, 235, 200, 0.08) 62%, transparent 76%);
  mix-blend-mode: screen;
  pointer-events: none;
}

/* 唱针 */
.tonearm {
  position: absolute;
  top: 4px;
  right: 6px;
  width: 74px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(245, 166, 35, 0.55), rgba(255, 255, 255, 0.75));
  transform-origin: 100% 50%;
  transform: rotate(30deg);
  transition: transform 1.2s var(--ease-out-expo);
  box-shadow: 0 0 9px rgba(245, 166, 35, 0.35);
}

.tonearm::before {
  content: '';
  position: absolute;
  right: -4px;
  top: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 236, 200, 0.9);
}

.tonearm.is-down {
  transform: rotate(56deg);
}

/* 播放键 */
.play-btn {
  position: relative;
  z-index: 5;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(150deg, #ffdca8 0%, #f5a623 48%, #cf7c0e 100%);
  box-shadow:
    0 14px 30px -10px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(255, 255, 255, 0.28) inset,
    0 0 34px rgba(245, 166, 35, 0.4);
  transition: transform 0.35s var(--ease-spring), box-shadow 0.35s ease;
}

.play-btn:hover {
  transform: scale(1.06);
  box-shadow:
    0 18px 34px -10px rgba(0, 0, 0, 0.72),
    0 0 0 1px rgba(255, 255, 255, 0.32) inset,
    0 0 48px rgba(245, 166, 35, 0.55);
}

.play-btn:active {
  transform: scale(0.97);
}

.play-btn.is-playing {
  animation: btnBreath 4s ease-in-out infinite;
}

@keyframes btnBreath {
  0%,
  100% {
    box-shadow:
      0 14px 30px -10px rgba(0, 0, 0, 0.7),
      0 0 0 1px rgba(255, 255, 255, 0.28) inset,
      0 0 30px rgba(245, 166, 35, 0.35);
  }
  50% {
    box-shadow:
      0 14px 30px -10px rgba(0, 0, 0, 0.7),
      0 0 0 1px rgba(255, 255, 255, 0.32) inset,
      0 0 58px rgba(245, 166, 35, 0.62);
  }
}

.play-ripple {
  position: absolute;
  inset: -1px;
  border-radius: 50%;
  border: 1px solid rgba(255, 236, 200, 0.25);
}

/* 波形丝带 */
.ribbon-wrap {
  padding: 0 2px;
}

.ribbon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 3px;
  height: 70px;
  padding: 0 4px;
  cursor: pointer;
  border-radius: 12px;
  transition: background 0.3s ease;
}

.ribbon:hover {
  background: rgba(255, 255, 255, 0.03);
}

.bar {
  flex: 1 1 0;
  min-width: 2px;
  border-radius: 2px;
  background: linear-gradient(180deg, rgba(245, 166, 35, 0.28), rgba(245, 166, 35, 0.1));
  transition: height 0.12s linear, background 0.4s ease, opacity 0.4s ease;
}

.bar-active {
  background: linear-gradient(180deg, #ffeacb, #f5a623 55%, rgba(245, 166, 35, 0.5));
  box-shadow: 0 0 9px rgba(245, 166, 35, 0.35);
}

.bar-playing.bar-active {
  box-shadow: 0 0 12px rgba(255, 200, 120, 0.5);
}

.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(255, 236, 200, 0.55);
  box-shadow: 0 0 10px rgba(255, 236, 200, 0.7);
  transition: left 0.12s linear;
  pointer-events: none;
}

/* 控制按钮 */
.ctrl {
  height: 42px;
  padding: 0 18px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  letter-spacing: 0.14em;
  color: rgba(203, 213, 225, 0.75);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.3s var(--ease-glide);
}

.ctrl:hover {
  color: #ffd49b;
  border-color: rgba(245, 166, 35, 0.35);
  background: rgba(245, 166, 35, 0.1);
  transform: translateY(-2px);
}

@media (max-width: 640px) {
  .deck {
    width: 208px;
    height: 208px;
  }

  .play-btn {
    width: 84px;
    height: 84px;
  }

  .pressing {
    width: 82px;
    height: 82px;
    margin: -41px 0 0 -41px;
  }

  .ribbon {
    height: 58px;
  }
}
</style>
