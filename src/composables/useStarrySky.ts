import { ref } from 'vue'

/**
 * 全站共享的星空氛围状态。
 * 单例：任何组件（播放器、入场页）都能改变星空的"情绪"，
 * 星空背景只订阅，不反向依赖页面。
 */

const audioLevel = ref(0)
const isPlaying = ref(false)
const dim = ref(0)

let shootingStarHandler: (() => void) | null = null
let lastShootAt = 0

export const useStarrySky = () => {
  /** 播放器每帧写入音频能量（0~1）与播放状态 */
  const setAudio = (level: number, playing: boolean) => {
    audioLevel.value = Math.max(0, Math.min(1, level))
    isPlaying.value = playing
  }

  /** 0 = 正常，1 = 完全压暗（用于密码错误等"星光熄灭"的时刻） */
  const setDim = (value: number) => {
    dim.value = Math.max(0, Math.min(1, value))
  }

  const onShootingStar = (handler: () => void) => {
    shootingStarHandler = handler
  }

  /** 重要的时刻：页面切换、信寄出、发布小记，都让一颗流星划过去 */
  const requestShootingStar = () => {
    const now = Date.now()
    if (now - lastShootAt < 700) return
    lastShootAt = now
    shootingStarHandler?.()
  }

  return {
    audioLevel,
    isPlaying,
    dim,
    setAudio,
    setDim,
    onShootingStar,
    requestShootingStar,
  }
}
