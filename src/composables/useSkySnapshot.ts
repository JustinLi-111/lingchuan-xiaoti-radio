import { ref } from 'vue'
import { moonAltitudeAt } from '@/lib/skyMath'

/**
 * "那一夜的星空快照" —— 星图上点中某条故事时，把它的发布时间戳传进来。
 * StarryBackground 监听这个 ref，重算"那条故事发布当晚月亮升起后 15 分钟"的真实天空。
 *
 * 策略（极简且正确）：
 *   故事发布那天的"夜晚窗口" = 那天 18:00 → 次日 06:00（共 12 小时）
 *   在这个窗口内找第一个"月亮高度角从 <0° 越过 0°"的时刻 → 那就是月亮升起
 *   +15 分钟 = 快照时刻
 *
 *   为什么跨天？比如故事是 11/03 晚上发布的，但月亮在 11/04 凌晨 01:22 才升起来
 *   那快照时刻就是 11/04 01:37 —— 这是对的，因为 11/03 那晚的月亮就是在 11/04 凌晨才升起来的
 *   月相按"哪一天"算，跨一天月相差不到 1°（肉眼完全看不出），语义上没问题
 *
 *   极夜兜底（西安不会，但保险）：窗口内没找到月升 → 用原始发布时刻或 23:00
 */
export interface SnapshotMeta {
  id: number
  title: string
  subtitle: string
  timeNote?: string
}

const targetDate = ref<Date | null>(null)
const targetMeta = ref<SnapshotMeta | null>(null)

const padHM = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/**
 * 扫描 [start, end] 区间（步长 5 分钟），找月亮从地平线下升起来的第一个时刻
 * 返回该时刻 +15 分钟，找不到返回 null
 */
const findMoonRiseInWindow = (start: Date, end: Date): Date | null => {
  const prevAlt = moonAltitudeAt(start)
  let prev = prevAlt
  let cur = start
  const stepMs = 5 * 60_000

  while (cur.getTime() < end.getTime()) {
    const next = new Date(cur.getTime() + stepMs)
    const alt = moonAltitudeAt(next)
    // 月亮从上往下穿 → 往上穿 0°（上升）
    if (prev < 0 && alt >= 0) {
      // 线性插值精确时刻（更准一点，但 5 分钟精度也够）
      const frac = prev / (prev - alt)
      const riseAt = new Date(cur.getTime() + frac * stepMs)
      return new Date(riseAt.getTime() + 15 * 60_000)
    }
    prev = alt
    cur = next
  }
  return null
}

const resolveSkyTime = (raw: Date): { date: Date; note: string } => {
  // 夜晚窗口 = 故事那天 18:00 → 次日 06:00
  const nightStart = new Date(raw)
  nightStart.setHours(18, 0, 0, 0)
  const nightEnd = new Date(nightStart.getTime() + 12 * 60 * 60_000) // +12h → 次日 06:00

  const risePlus15 = findMoonRiseInWindow(nightStart, nightEnd)
  if (risePlus15) {
    const storyDay = `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}-${String(raw.getDate()).padStart(2, '0')}`
    const snapDay = `${risePlus15.getFullYear()}-${String(risePlus15.getMonth() + 1).padStart(2, '0')}-${String(risePlus15.getDate()).padStart(2, '0')}`
    const crossed = storyDay !== snapDay
    const note = crossed
      ? `（月在次日 ${padHM(risePlus15)} 升起）`
      : `（月升后 ${padHM(risePlus15)}）`
    return { date: risePlus15, note }
  }

  // 兜底：窗口内没找到月升（极夜）→ 用 23:00
  const fallback = new Date(raw)
  fallback.setHours(23, 0, 0, 0)
  return { date: fallback, note: '' }
}

export const useSkySnapshot = () => ({
  targetDate,
  targetMeta,
  lock(createdAt: string, meta: Omit<SnapshotMeta, 'timeNote'>) {
    const raw = new Date(createdAt)
    const { date, note } = resolveSkyTime(raw)
    targetDate.value = date
    targetMeta.value = { ...meta, timeNote: note }
  },
  unlock() {
    targetDate.value = null
    targetMeta.value = null
  },
})
