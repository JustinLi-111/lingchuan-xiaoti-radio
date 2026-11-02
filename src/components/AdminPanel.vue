<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { X, Sun, Moon, CloudRain, Star, RefreshCw, ExternalLink, ChevronDown, Upload, Compass } from 'lucide-vue-next'
import { useRealSky } from '@/composables/useRealSky'
import { useWeather } from '@/composables/useWeather'
import { useSupabaseStories } from '@/composables/useSupabaseStories'
import { findRiseSet, skyDebug, OBSERVER } from '@/lib/skyMath'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'openUpload'): void
}>()

const { sky } = useRealSky()
const { weather, refresh, rawApiUrl } = useWeather()
const { stories, fetchStories } = useSupabaseStories()

const tick = ref(Date.now())
let timer = 0

const refreshAll = () => {
  tick.value = Date.now()
}

onMounted(() => {
  timer = window.setInterval(refreshAll, 30000)
})

onUnmounted(() => {
  window.clearInterval(timer)
})

watch(
  () => props.visible,
  (open) => {
    if (open) {
      refreshAll()
      fetchStories()
    }
  },
)

const debug = computed(() => skyDebug(new Date(tick.value)))
const sunTimes = computed(() => findRiseSet('sun', new Date(tick.value)))
const moonTimes = computed(() => findRiseSet('moon', new Date(tick.value)))

const showMath = ref(false)

const fmtTime = (value: Date | null) =>
  value ? value.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—'

const num = (value: number | null | undefined, digits = 1) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—'

const deg = (value: number) => `${value.toFixed(1)}°`

const moon = computed(() => sky.value?.moon ?? null)

const brightStars = computed(() =>
  (sky.value?.stars ?? [])
    .slice()
    .sort((a, b) => a.mag - b.mag)
    .slice(0, 6),
)

const weatherRows = computed(() => [
  { label: '气温', value: `${num(weather.value.temperature)} °C` },
  { label: '体感', value: `${num(weather.value.apparentTemperature)} °C` },
  { label: '湿度', value: `${num(weather.value.humidity, 0)} %` },
  { label: '风速', value: `${num(weather.value.windSpeed)} km/h` },
  { label: '气压', value: `${num(weather.value.pressure, 0)} hPa` },
  { label: '降水', value: `${num(weather.value.precipitation, 2)} mm` },
  { label: '云量', value: `${num(weather.value.cloudCover, 0)} %` },
  { label: '天气码', value: String(weather.value.code) },
])

const fetchedAt = computed(() =>
  weather.value.fetchedAt
    ? new Date(weather.value.fetchedAt).toLocaleTimeString('zh-CN', { hour12: false })
    : '未获取',
)

const skyStatus = computed(() => {
  if (!sky.value) return '—'
  const alt = sky.value.sunAlt
  if (alt >= 8) return '白昼'
  if (alt >= -8) return sky.value.sunAz < 180 ? '日出' : '日落'
  if (alt <= -28) return '深夜'
  return '夜晚'
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-[60]">
      <div class="absolute inset-0 bg-black/55 backdrop-blur-sm" @click="emit('close')" />

      <aside
        class="admin-panel absolute right-0 top-0 h-full w-full sm:w-[420px] overflow-y-auto"
      >
        <!-- 头部 -->
        <div class="sticky top-0 z-10 px-6 pt-5 pb-4 panel-head">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[10px] tracking-[0.3em] text-warm-400/80">OBSERVATORY · ADMIN</p>
              <h2 class="font-serif text-xl text-warm-100 mt-1">观测台</h2>
              <p class="text-[11px] text-night-400 mt-1">
                {{ OBSERVER.name }} · {{ OBSERVER.latitude }}°N {{ OBSERVER.longitude }}°E
              </p>
            </div>
            <button
              class="p-2 rounded-xl text-night-400 hover:text-warm-300 hover:bg-white/5 transition"
              title="关闭"
              @click="emit('close')"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <div class="px-6 pb-10 space-y-5">
          <!-- 概览 -->
          <section class="grid grid-cols-4 gap-2">
            <div class="stat">
              <span class="stat-value">{{ stories.length }}</span>
              <span class="stat-label">故事</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ sky?.stars.length ?? 0 }}</span>
              <span class="stat-label">亮星</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ Math.round(weather.cloudCover) }}</span>
              <span class="stat-label">云量%</span>
            </div>
            <div class="stat">
              <span class="stat-value text-[13px]">{{ skyStatus }}</span>
              <span class="stat-label">天色</span>
            </div>
          </section>

          <!-- 天气 -->
          <section class="card">
            <div class="card-head">
              <span class="flex items-center gap-2">
                <CloudRain class="w-4 h-4 text-warm-400" />
                <span>未央天气实况</span>
              </span>
              <span class="text-[10px] text-night-500">{{ fetchedAt }}</span>
            </div>

            <div class="flex items-baseline gap-3 mb-3">
              <span class="text-2xl font-serif text-warm-100">{{ num(weather.temperature) }}°</span>
              <span class="text-sm text-night-300">{{ weather.label }}</span>
              <span class="text-[10px] text-night-500 ml-auto">
                接口判定 {{ weather.isDay === null ? '—' : weather.isDay ? '白天' : '夜间' }}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div v-for="row in weatherRows" :key="row.label" class="row">
                <span class="row-label">{{ row.label }}</span>
                <span class="row-value">{{ row.value }}</span>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 mt-4">
              <button class="action" @click="refresh(); refreshAll()">
                <RefreshCw class="w-3.5 h-3.5" />
                刷新实况
              </button>
              <a
                class="action"
                href="https://open-meteo.com/en/docs?latitude=34.35&longitude=108.94&current=temperature_2m,cloud_cover,precipitation,weather_code"
                target="_blank"
                rel="noopener"
              >
                <ExternalLink class="w-3.5 h-3.5" />
                Open-Meteo
              </a>
              <a class="action" :href="rawApiUrl" target="_blank" rel="noopener">
                <ExternalLink class="w-3.5 h-3.5" />
                原始 JSON
              </a>
            </div>
          </section>

          <!-- 太阳与月亮 -->
          <section class="card">
            <div class="card-head">
              <span class="flex items-center gap-2">
                <Compass class="w-4 h-4 text-warm-400" />
                <span>日与月</span>
              </span>
            </div>

            <div class="space-y-3">
              <div>
                <div class="flex items-center gap-2 mb-1.5">
                  <Sun class="w-3.5 h-3.5 text-warm-300" />
                  <span class="text-xs text-warm-200">太阳</span>
                </div>
                <div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div class="row">
                    <span class="row-label">地平高度</span>
                    <span class="row-value">{{ num(debug.sunAlt) }}°</span>
                  </div>
                  <div class="row">
                    <span class="row-label">方位角</span>
                    <span class="row-value">{{ deg(debug.sunAz) }}</span>
                  </div>
                  <div class="row">
                    <span class="row-label">日出</span>
                    <span class="row-value">{{ fmtTime(sunTimes.rise) }}</span>
                  </div>
                  <div class="row">
                    <span class="row-label">日落</span>
                    <span class="row-value">{{ fmtTime(sunTimes.set) }}</span>
                  </div>
                </div>
              </div>

              <div class="pt-3 border-t border-white/5">
                <div class="flex items-center gap-2 mb-1.5">
                  <Moon class="w-3.5 h-3.5 text-warm-300" />
                  <span class="text-xs text-warm-200">月亮</span>
                  <span class="text-[10px] text-night-500 ml-auto">
                    {{ moon?.visible ? '此刻可见' : '此刻在地平线下' }}
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div class="row">
                    <span class="row-label">月相</span>
                    <span class="row-value">{{ moon?.phaseName ?? '—' }}</span>
                  </div>
                  <div class="row">
                    <span class="row-label">照亮</span>
                    <span class="row-value">{{ Math.round((moon?.illumination ?? 0) * 100) }}%</span>
                  </div>
                  <div class="row">
                    <span class="row-label">地平高度</span>
                    <span class="row-value">{{ num(debug.moonAlt) }}°</span>
                  </div>
                  <div class="row">
                    <span class="row-label">方位角</span>
                    <span class="row-value">{{ deg(debug.moonAz) }}</span>
                  </div>
                  <div class="row">
                    <span class="row-label">月出</span>
                    <span class="row-value">{{ fmtTime(moonTimes.rise) }}</span>
                  </div>
                  <div class="row">
                    <span class="row-label">月落</span>
                    <span class="row-value">{{ fmtTime(moonTimes.set) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 亮星 -->
          <section class="card">
            <div class="card-head">
              <span class="flex items-center gap-2">
                <Star class="w-4 h-4 text-warm-400" />
                <span>此刻最亮的几颗</span>
              </span>
              <span class="text-[10px] text-night-500">按星等</span>
            </div>

            <div v-if="brightStars.length === 0" class="text-[11px] text-night-500 py-2">
              此刻天上没有达到可见阈值的亮星
            </div>
            <div v-else class="space-y-1.5">
              <div v-for="star in brightStars" :key="star.name" class="row">
                <span class="row-label">{{ star.name }}</span>
                <span class="row-value">
                  高度 {{ num(star.alt) }}° · {{ deg(star.az) }} · {{ star.mag }} 等
                </span>
              </div>
            </div>
          </section>

          <!-- 计算过程 -->
          <section class="card">
            <button class="card-head w-full" @click="showMath = !showMath">
              <span class="flex items-center gap-2">
                <span class="text-warm-200">计算过程</span>
                <span class="text-[10px] text-night-500">低精度模型 · 误差约 ±1°</span>
              </span>
              <ChevronDown
                class="w-4 h-4 text-night-400 transition-transform"
                :class="{ 'rotate-180': showMath }"
              />
            </button>

            <div v-if="showMath" class="mt-3 space-y-1.5">
              <div class="row">
                <span class="row-label">距 J2000</span>
                <span class="row-value">{{ debug.d.toFixed(4) }} 天</span>
              </div>
              <div class="row">
                <span class="row-label">太阳视黄经</span>
                <span class="row-value">{{ deg(debug.sunLongitude) }}</span>
              </div>
              <div class="row">
                <span class="row-label">月相角（日月黄经差）</span>
                <span class="row-value">{{ deg(debug.elongation) }}</span>
              </div>
              <div class="row">
                <span class="row-label">照明比例</span>
                <span class="row-value">(1 − cos φ) / 2 = {{ (debug.illumination * 100).toFixed(1) }}%</span>
              </div>
              <div class="row">
                <span class="row-label">恒星时（含经度）</span>
                <span class="row-value">{{ deg(debug.lst) }}</span>
              </div>
              <div class="row">
                <span class="row-label">太阳赤经 / 赤纬</span>
                <span class="row-value">{{ deg(debug.sunRa) }} / {{ deg(debug.sunDec) }}</span>
              </div>
              <div class="row">
                <span class="row-label">月亮赤经 / 赤纬</span>
                <span class="row-value">{{ deg(debug.moonRa) }} / {{ deg(debug.moonDec) }}</span>
              </div>
              <p class="text-[10px] leading-relaxed text-night-500 pt-2">
                月球黄经取「太阳黄经 + 月相角」的线性近似，再经黄道→赤道、赤道→地平两步换算；
                日出日落与月出月落由当天每 5 分钟采样高度、找 0° 穿越点得到，时间可能有几分钟偏差。
              </p>
            </div>
          </section>

          <!-- 快捷操作 -->
          <section class="card">
            <div class="card-head">
              <span>快捷操作</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <button class="action" @click="emit('openUpload'); emit('close')">
                <Upload class="w-3.5 h-3.5" />
                上传新故事
              </button>
              <button class="action" @click="fetchStories()">
                <RefreshCw class="w-3.5 h-3.5" />
                刷新故事
              </button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<style scoped>
.admin-panel {
  background: linear-gradient(180deg, rgba(10, 16, 30, 0.94), rgba(6, 10, 20, 0.97));
  backdrop-filter: blur(22px);
  border-left: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: -30px 0 60px -30px rgba(0, 0, 0, 0.9);
  animation: slideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.panel-head {
  background: linear-gradient(180deg, rgba(10, 16, 30, 0.96), rgba(10, 16, 30, 0.82));
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

@keyframes slideIn {
  from {
    transform: translateX(28px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  padding: 10px 6px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.stat-value {
  font-family: var(--font-serif, serif);
  font-size: 17px;
  color: #fbe9cd;
}

.stat-label {
  font-size: 9px;
  letter-spacing: 0.16em;
  color: rgba(148, 163, 184, 0.7);
}

.card {
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: rgba(253, 230, 190, 0.92);
  letter-spacing: 0.06em;
  margin-bottom: 10px;
}

.row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  font-size: 11px;
}

.row-label {
  color: rgba(148, 163, 184, 0.78);
  white-space: nowrap;
}

.row-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: rgba(226, 232, 240, 0.92);
  text-align: right;
}

.action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 10px;
  font-size: 11px;
  color: rgba(253, 230, 190, 0.9);
  background: rgba(245, 166, 35, 0.12);
  border: 1px solid rgba(245, 166, 35, 0.2);
  transition: all 0.25s ease;
}

.action:hover {
  background: rgba(245, 166, 35, 0.2);
  color: #ffe9c4;
}
</style>
