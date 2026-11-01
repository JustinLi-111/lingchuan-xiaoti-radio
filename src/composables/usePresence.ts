import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

/**
 * 在场感：把另一个人的光标变成一只萤火虫。
 * 用 Supabase Realtime 的 presence，不做任何消息存储，关掉页面就消失。
 */

interface PeerState {
  x: number // 归一化 0~1
  y: number
  storyId: number | null
  at: number
}

const peer = ref<PeerState | null>(null)
const connected = ref(false)
const myStory = ref<number | null>(null)
const clock = ref(Date.now())
const clientId = `firefly-${Math.random().toString(36).slice(2, 9)}`

let channel: any = null
let started = false
let heartbeat: number | undefined
let clockTimer: number | undefined
let lastPublish = 0
const cursor = { x: 0.5, y: 0.5 }

const publish = (force = false) => {
  if (!channel) return
  const now = Date.now()
  if (!force && now - lastPublish < 240) return
  lastPublish = now
  channel.track({ x: cursor.x, y: cursor.y, storyId: myStory.value, at: now })
}

const syncPeer = () => {
  if (!channel) return
  const state = channel.presenceState() as Record<string, any[]>
  let found: any = null
  for (const key of Object.keys(state)) {
    if (key === clientId) continue
    const meta = state[key]?.[0]
    if (meta) {
      found = meta
      break
    }
  }
  peer.value = found
    ? {
        x: Number(found.x ?? 0.5),
        y: Number(found.y ?? 0.5),
        storyId: found.storyId ?? null,
        at: Number(found.at ?? Date.now()),
      }
    : null
}

const onPointerMove = (e: PointerEvent) => {
  cursor.x = e.clientX / window.innerWidth
  cursor.y = e.clientY / window.innerHeight
  publish()
}

export const usePresence = () => {
  const start = () => {
    if (started || !supabase) return
    started = true

    channel = supabase.channel('starry-presence', {
      config: { presence: { key: clientId } },
    })

    channel
      .on('presence', { event: 'sync' }, syncPeer)
      .on('presence', { event: 'join' }, syncPeer)
      .on('presence', { event: 'leave' }, syncPeer)
      .subscribe((status: string) => {
        connected.value = status === 'SUBSCRIBED'
        if (status === 'SUBSCRIBED') publish(true)
      })

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    heartbeat = window.setInterval(() => publish(true), 15_000)
    // 对方长时间不动时也要让"还在不在"的判断继续走
    clockTimer = window.setInterval(() => {
      clock.value = Date.now()
    }, 10_000)
  }

  const stop = () => {
    if (!started) return
    started = false
    window.removeEventListener('pointermove', onPointerMove)
    if (heartbeat) window.clearInterval(heartbeat)
    if (clockTimer) window.clearInterval(clockTimer)
    channel?.unsubscribe()
    channel = null
    peer.value = null
    connected.value = false
  }

  const setMyStory = (id: number | null) => {
    myStory.value = id
    publish(true)
  }

  // 对方 45 秒内没有动静就当作离开了
  const peerAlive = computed(() => !!peer.value && clock.value - peer.value.at < 45_000)
  const coReading = computed(() => peerAlive.value && !!myStory.value && peer.value?.storyId === myStory.value)

  return {
    peer,
    peerAlive,
    connected,
    coReading,
    start,
    stop,
    setMyStory,
  }
}
