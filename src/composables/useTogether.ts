import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'

/**
 * 双人实时互动（只服务两台设备，所以用 1.8s 轮询而不是 WebSocket）。
 *
 * 为什么不用 Supabase Realtime：
 *   本站 REST 走 Cloudflare 同源代理 /api，Realtime 需要 WebSocket 升级，
 *   Pages Function 无法把上游 socket 与客户端配对，连接建立后立刻断开，
 *   表现就是"永远拿不到对方的状态"。轮询走的是已跑通的 REST 通道，稳定得多。
 *
 * 所有状态都存在 room_state 表的 key / payload 两列里，一张表装下三个玩法。
 */

const TABLE = 'room_state'
const POLL_MS = 1800
const PRESENCE_MS = 6000
const PRESENCE_TTL = 45_000

export interface RoomListen {
  storyId: number | null
  playing: boolean
  pos: number
  by: string
  byName: string
  active: boolean
  title?: string
  _updatedAt?: number
}

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
const TOGETHER_KEY = 'starryTogether'

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
}

/** 是否开启了"一起听" */
export const togetherMode = ref(localStorage.getItem(TOGETHER_KEY) === '1')
export const setTogetherMode = (on: boolean) => {
  togetherMode.value = on
  localStorage.setItem(TOGETHER_KEY, on ? '1' : '0')
}

/* ---------------- 轮询 ---------------- */
const rows = ref<Record<string, any>>({})
const ready = ref(true)
const lastError = ref('')
const todayKey = ref(new Date().toISOString().slice(0, 10))

let timer: number | null = null
let polling = false
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
      // 用服务端 updated_at 做基准时间，避免两台设备时钟偏差影响播放同步
      map[row.key] = { ...(row.payload ?? {}), _updatedAt: Date.parse(row.updated_at) }
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
  if (Date.now() - lastPresenceAt < PRESENCE_MS || document.hidden) return
  lastPresenceAt = Date.now()
  await push(`who:${deviceId}`, { name: myName.value || '', at: Date.now() })
}

const ensurePolling = () => {
  if (timer !== null) return
  void pull()
  void beat()
  timer = window.setInterval(() => {
    void pull()
    void beat()
  }, POLL_MS)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void pull()
  })
}

/* ---------------- 派生状态 ---------------- */
const listen = computed<RoomListen | null>(() => rows.value['listen'] ?? null)
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
const publishListen = async (state: Partial<RoomListen>) => {
  const payload: RoomListen = {
    storyId: state.storyId ?? null,
    playing: !!state.playing,
    pos: Math.max(0, state.pos ?? 0),
    active: state.active ?? togetherMode.value,
    by: deviceId,
    byName: myName.value || '我',
    title: state.title,
  }
  await push('listen', payload)
}

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
    togetherMode,
    setTogetherMode,
    listen,
    moonClaim,
    gaze,
    partnerGaze,
    partnerName,
    partnerOnline,
    todayKey,
    publishListen,
    publishGaze,
    claimMoon,
  }
}
