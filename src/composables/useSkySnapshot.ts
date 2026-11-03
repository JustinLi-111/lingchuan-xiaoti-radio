import { ref } from 'vue'
import { findRiseSet, moonAltitudeAt } from '@/lib/skyMath'

/**
 * "那一夜的星空快照" —— 星图上点中某条故事时，把它的发布时间戳传进来。
 * StarryBackground 监听这个 ref，重算"那条故事发布那天、且月亮真的在天上"的真实天空。
 *
 * 策略：
 *   1. 优先 23:00 —— 如果那一刻月亮高度角 > 0°（在天上），就用它
 *   2. 否则用 findRiseSet('moon', day) 找到那天的月升/月落时刻，选一个保证月亮在天上的
 *      - 23:00 还没升起 → 月升后 15 分钟
 *      - 23:00 已经落了 → 月落前 15 分钟
 *      - 极昼极夜（西安不会）→ 兜底 23:00
 *   3. 月相只跟"哪一天"有关，跟时刻无关，所以月相永远是发布那天的月相
 *
 * 模块级单例，全局共享。
 */
export interface SnapshotMeta {
  id: number
  title: string
  subtitle: string
  /** 如果自动偏移了时间，这里存偏移说明给 banner 显示 */
  timeNote?: string
}

const targetDate = ref<Date | null>(null)
const targetMeta = ref<SnapshotMeta | null>(null)

/** 把时分格式化成 "HH:MM" */
const padHM = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/** 找到"发布那天月亮肯定在天上"的时刻 */
const resolveSkyTime = (raw: Date): { date: Date; note: string } => {
  // 1. 优先 23:00
  const night23 = new Date(raw)
  night23.setHours(23, 0, 0, 0)
  if (moonAltitudeAt(night23) > 0) {
    return { date: night23, note: '' }
  }

  // 2. 找月升月落
  const { rise, set } = findRiseSet('moon', raw)

  // 2a. 有月升时刻且 23:00 在月升之前（月亮还没升起）→ 用月升后 15 分钟
  if (rise && raw.getHours() < 23) {
    if (rise.getTime() < night23.getTime()) {
      const d = new Date(rise.getTime() + 15 * 60_000)
      if (moonAltitudeAt(d) > 0) {
        return { date: d, note: `（展示月升后 ${padHM(d)}）` }
      }
    }
  }

  // 2b. 23:00 时月亮已经落了 → 用月落前 15 分钟
  if (set) {
    if (set.getTime() <= night23.getTime()) {
      const d = new Date(set.getTime() - 15 * 60_000)
      if (moonAltitudeAt(d) > 0) {
        return { date: d, note: `（展示月落前 ${padHM(d)}）` }
      }
    } else if (moonAltitudeAt(set) <= 0) {
      // set 是 null 或异常：月落其实在 23:00 之后（意味着月亮此时在天上）→ 用 23:00
      return { date: night23, note: '' }
    }
  }

  // 3. 兜底（极夜/极昼/异常）→ 原始发布时刻（如果是晚上）或 23:00
  const fallback = raw.getHours() >= 18 && raw.getHours() <= 4 ? raw : night23
  return { date: fallback, note: '' }
}

export const useSkySnapshot = () => ({
  targetDate,
  targetMeta,
  /** 锁天幕到"发布那天月亮在天上的时刻" */
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
