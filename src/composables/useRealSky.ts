import { ref, computed, onMounted, onUnmounted } from 'vue'
import { computeSky, type SkySnapshot } from '@/lib/skyMath'

/**
 * 真实夜空：每分钟重算一次"此刻头顶的月亮与亮星"。
 * 单例，整站共享，避免多个页面各自计算。
 */
const snapshot = ref<SkySnapshot | null>(null)
const updatedAt = ref(0)

let timer: number | undefined
let refCount = 0

const refresh = () => {
  snapshot.value = computeSky(new Date())
  updatedAt.value = Date.now()
}

export const useRealSky = () => {
  // 组件挂载时才启动计时器，卸载后停掉，避免后台一直算
  const start = () => {
    refCount += 1
    if (refCount > 1) return
    refresh()
    timer = window.setInterval(refresh, 60_000)
  }

  const stop = () => {
    refCount = Math.max(0, refCount - 1)
    if (refCount === 0 && timer) {
      window.clearInterval(timer)
      timer = undefined
    }
  }

  onMounted(start)
  onUnmounted(stop)

  return {
    sky: snapshot,
    moon: computed(() => snapshot.value?.moon ?? null),
    stars: computed(() => snapshot.value?.stars ?? []),
    sunAlt: computed(() => snapshot.value?.sunAlt ?? -60),
    sunAz: computed(() => snapshot.value?.sunAz ?? 180),
    updatedAt,
  }
}
