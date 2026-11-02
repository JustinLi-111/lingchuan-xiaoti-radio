import { ref, computed, onMounted } from 'vue'
import { OBSERVER } from '@/lib/skyMath'

/**
 * 对方的天气：西安未央区。
 * 用 Open-Meteo 免费接口，半小时缓存一次；失败就静默降级为晴朗夜空。
 */

export type WeatherCondition = 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'thunder'

interface WeatherState {
  loaded: boolean
  code: number
  cloudCover: number
  precipitation: number
  temperature: number | null
  apparentTemperature: number | null
  humidity: number | null
  windSpeed: number | null
  pressure: number | null
  isDay: boolean | null
  condition: WeatherCondition
  label: string
  fetchedAt: number
}

const DEFAULT_STATE: WeatherState = {
  loaded: false,
  code: 0,
  cloudCover: 0,
  precipitation: 0,
  temperature: null,
  apparentTemperature: null,
  humidity: null,
  windSpeed: null,
  pressure: null,
  isDay: null,
  condition: 'clear',
  label: '晴朗',
  fetchedAt: 0,
}

const CACHE_KEY = 'starry-weather-xian'
const CACHE_TTL = 30 * 60 * 1000

const weather = ref<WeatherState>({ ...DEFAULT_STATE })

const RAIN_CODES = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]
const SNOW_CODES = [71, 73, 75, 77, 85, 86]
const THUNDER_CODES = [95, 96, 99]
const FOG_CODES = [45, 48]

const describe = (code: number): { condition: WeatherCondition; label: string } => {
  if (THUNDER_CODES.includes(code)) return { condition: 'thunder', label: '雷雨' }
  if (RAIN_CODES.includes(code)) return { condition: 'rain', label: '下雨' }
  if (SNOW_CODES.includes(code)) return { condition: 'snow', label: '下雪' }
  if (FOG_CODES.includes(code)) return { condition: 'fog', label: '有雾' }
  if (code === 0) return { condition: 'clear', label: '晴朗' }
  if (code === 1) return { condition: 'clear', label: '大致晴朗' }
  if (code === 2) return { condition: 'cloudy', label: '多云' }
  return { condition: 'cloudy', label: '阴天' }
}

let started = false

const readCache = () => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { at: number; state: Partial<WeatherState> }
    if (Date.now() - parsed.at > CACHE_TTL) return null
    // 旧版本缓存可能缺字段，用默认值补齐
    return {
      ...DEFAULT_STATE,
      ...parsed.state,
      isDay: typeof parsed.state.isDay === 'boolean' ? parsed.state.isDay : null,
      fetchedAt: parsed.state.fetchedAt ?? parsed.at,
    }
  } catch {
    return null
  }
}

const load = async (force = false) => {
  const cached = force ? null : readCache()
  if (cached) {
    weather.value = cached
    return
  }

  const params = new URLSearchParams({
    latitude: String(OBSERVER.latitude),
    longitude: String(OBSERVER.longitude),
    current:
      'weather_code,cloud_cover,precipitation,temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,pressure_msl,is_day',
    timezone: OBSERVER.timezone,
  })

  try {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 8000)
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
      signal: controller.signal,
    })
    window.clearTimeout(timer)
    if (!res.ok) return

    const data = await res.json()
    const code = Number(data?.current?.weather_code ?? 0)
    const described = describe(code)

    weather.value = {
      loaded: true,
      code,
      cloudCover: Number(data?.current?.cloud_cover ?? 0),
      precipitation: Number(data?.current?.precipitation ?? 0),
      temperature: data?.current?.temperature_2m ?? null,
      apparentTemperature: data?.current?.apparent_temperature ?? null,
      humidity: data?.current?.relative_humidity_2m ?? null,
      windSpeed: data?.current?.wind_speed_10m ?? null,
      pressure: data?.current?.pressure_msl ?? null,
      isDay: typeof data?.current?.is_day === 'number' ? data.current.is_day === 1 : null,
      condition: described.condition,
      label: described.label,
      fetchedAt: Date.now(),
    }

    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), state: weather.value }))
  } catch {
    // 拿不到天气就保持晴朗，不影响别的效果
  }
}

export const useWeather = () => {
  onMounted(() => {
    if (started) return
    started = true
    load()
    window.setInterval(load, CACHE_TTL)
  })

  return {
    weather,
    refresh: () => load(true),
    // 云量越高，星星越暗（0.45 ~ 1）
    starDim: computed(() => 1 - Math.min(1, weather.value.cloudCover / 100) * 0.55),
    isWet: computed(() => weather.value.condition === 'rain' || weather.value.condition === 'thunder'),
    rawApiUrl: `https://api.open-meteo.com/v1/forecast?latitude=${OBSERVER.latitude}&longitude=${OBSERVER.longitude}&current=weather_code,cloud_cover,precipitation,temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,pressure_msl,is_day&timezone=${OBSERVER.timezone}`,
  }
}
