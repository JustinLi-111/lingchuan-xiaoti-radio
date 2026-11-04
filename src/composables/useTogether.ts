import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'

/**
 * 双人互动：在线陪伴 + 抢月亮 + 望远镜光点（只服务两台设备，所以用轮询而不是 WebSocket）。
 *
 * 为什么不用 Supabase Realtime：
 *   本站 REST 走 Cloudflare 同源代理 /api，Realtime 需要 WebSocket 升级，
 *   Pages Function 无法把上游 socket 与客户端配对，连接建立后立刻断开，
 *   表现就是"永远拿不到对方的状态"。轮询走的是已跑通的 REST 通道，稳定得多。
 *
 * 轮询节奏放得很宽（8s 拉取 / 20s 心跳 / 页面隐藏时暂停），
 * 只是为了显示"对方在线"，不值得为它拖慢移动端首屏。
 *
 * 所有状态都存在 room_state 表的 key / payload 两列里。
 */

const TABLE = 'room_state'
const POLL_MS = 8_000
const PRESENCE_MS = 20_000
const START_DELAY_MS = 1_500
const PRESENCE_TTL = 45_000

export interface MoonClaim {
  by: string
  byName: string
  at: number
  _updatedAt?: number
}

export interface Gaze {
  by: string
  byName: string
  starId: number
  title: string
  at: number
  _updatedAt?: number
}

/* ---------------- 设备身份 ---------------- */
const DEVICE_KEY = 'starryDeviceId'
const NAME_KEY = 'starryWho'

const readDeviceId = () => {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = `d${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

export const deviceId = readDeviceId()

/** 自己是谁：'小狗' 或 '哥哥'，第一次使用时在互动条上选一次 */
export const myName = ref(localStorage.getItem(NAME_KEY) || '')
export const setMyName = (name: string) => {
  myName.value = name
  localStorage.setItem(NAME_KEY, name)
  // 选好身份后立刻把在线心跳发出去
  wake()
}

/* ---------------- 轮询 ---------------- */
const rows = ref<Record<string, any>>({})
const ready = ref(true)
const lastError = ref('')
const todayKey = ref(new Date().toISOString().slice(0, 10))

let timer: number | null = null
let polling = false
let beating = false
let started = false
let lastPresenceAt = 0

const pull = async () => {
  if (polling || document.hidden) return
  polling = true
  try {
    const { data, error } = await supabase.from(TABLE).select('key, payload, updated_at')
    if (error) {
      ready.value = false
      lastError.value = error.message
      return
    }
    ready.value = true
    const map: Record<string, any> = {}
    for (const row of data ?? []) {
      map[row.key] = row.payload ?? {}
    }
    rows.value = map
    const d = new Date()
    todayKey.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch {
    ready.value = false
  } finally {
    polling = false
  }
}

const push = async (key: string, payload: any) => {
  rows.value = { ...rows.value, [key]: payload }
  const { error } = await supabase.from(TABLE).upsert(
    { key, payload, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  )
  if (error) {
    ready.value = false
    lastError.value = error.message
  }
}

/** 心跳：让对方的互动条知道我在线 */
const beat = async () => {
  if (beating || Date.now() - lastPresenceAt < PRESENCE_MS || document.hidden) return
  beating = true
  lastPresenceAt = Date.now()
  try {
    await push(`who:${deviceId}`, { name: myName.value || '', at: Date.now() })
  } finally {
    beating = false
  }
}

const clearTimer = () => {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
}

const syncOnce = () => Promise.all([pull(), beat()]).catch(() => {})

const scheduleNext = () => {
  clearTimer()
  if (document.hidden) return
  timer = window.setTimeout(async () => {
    timer = null
    await syncOnce()
    scheduleNext()
  }, POLL_MS)
}

/** 立即同步一次并重新排期（选好身份、回到前台时用） */
function wake() {
  if (!started) {
    ensurePolling()
    return
  }
  if (document.hidden) return
  clearTimer()
  void syncOnce().finally(scheduleNext)
}

const ensurePolling = () => {
  if (started) return
  started = true
  // 先让首屏的故事/小记请求跑完，再开始同步，避免在移动端抢带宽
  window.setTimeout(() => {
    if (document.hidden) return
    void syncOnce()
    scheduleNext()
  }, START_DELAY_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimer()
      return
    }
    clearTimer()
    void syncOnce().finally(scheduleNext)
  })
}

/* ---------------- 派生状态 ---------------- */
const moonClaim = computed<MoonClaim | null>(() => rows.value[`moon:${todayKey.value}`] ?? null)
const gaze = computed<Gaze | null>(() => rows.value['gaze'] ?? null)

/** 对方的名字（45s 内有心跳才算在线） */
const partnerName = computed(() => {
  for (const [key, value] of Object.entries(rows.value)) {
    if (!key.startsWith('who:') || key === `who:${deviceId}`) continue
    if (Date.now() - (value?.at ?? 0) < PRESENCE_TTL) return (value?.name as string) || ''
  }
  return ''
})
const partnerOnline = computed(() => partnerName.value !== '')

/** 对方正在看的星，60s 内有效且确实存在于当前星图 */
const partnerGaze = computed(() => {
  const g = gaze.value
  if (!g || g.by === deviceId) return null
  if (Date.now() - (g.at ?? 0) > 60_000) return null
  return g
})

/* ---------------- 动作 ---------------- */
const publishGaze = async (starId: number, title: string) => {
  await push('gaze', { by: deviceId, byName: myName.value || '我', starId, title, at: Date.now() })
}

/** 抢月亮：先写入的人赢，后来者只读 */
const claimMoon = async (): Promise<'mine' | 'taken' | 'error'> => {
  const key = `moon:${todayKey.value}`
  const payload: MoonClaim = {
    by: deviceId,
    byName: myName.value || '我',
    at: Date.now(),
  }
  const { error } = await supabase.from(TABLE).insert({
    key,
    payload,
    updated_at: new Date().toISOString(),
  })
  if (!error) {
    rows.value = { ...rows.value, [key]: payload }
    return 'mine'
  }
  // 主键冲突：对方已经先点了
  if ((error as any).code === '23505') {
    await pull()
    return rows.value[key]?.by === deviceId ? 'mine' : 'taken'
  }
  ready.value = false
  lastError.value = error.message
  return 'error'
}

export const useTogether = () => {
  ensurePolling()
  return {
    ready,
    lastError,
    deviceId,
    myName,
    setMyName,
    moonClaim,
    gaze,
    partnerGaze,
    partnerName,
    partnerOnline,
    todayKey,
    publishGaze,
    claimMoon,
  }
}
