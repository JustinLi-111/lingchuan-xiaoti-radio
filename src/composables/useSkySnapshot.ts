import { ref } from 'vue'

/**
 * "那一夜的星空快照" —— 星图上点中某条故事时，把它的发布时间戳传进来。
 * StarryBackground 监听这个 ref，重算那天 23:00 的真实天空。
 * 模块级单例，全局共享。
 */
export interface SnapshotMeta {
  id: number
  title: string
  subtitle: string
}

const targetDate = ref<Date | null>(null)
const targetMeta = ref<SnapshotMeta | null>(null)

export const useSkySnapshot = () => ({
  targetDate,
  targetMeta,
  /** 把天幕锁到这条故事发布那晚的 23:00 本地时间 */
  lock(createdAt: string, meta: SnapshotMeta) {
    const d = new Date(createdAt)
    if (d.getHours() < 23) d.setHours(23, 0, 0, 0)
    targetDate.value = d
    targetMeta.value = meta
  },
  /** 恢复为"此刻" */
  unlock() {
    targetDate.value = null
    targetMeta.value = null
  },
})
