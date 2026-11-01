import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

/**
 * 共读：两个地方同时播放同一颗星的时候，播放器上方亮起一行小字。
 * 只用 Supabase Realtime 的 presence 传递"我在听哪一颗、是否正在播放"，不落库，
 * 关掉页面就消失。
 */

interface PeerState {
  storyId: number | null
  playing: boolean
  at: number
}

const peer = ref<PeerState | null>(null)
const myStory = ref<number | null>(null)
const myPlaying = ref(false)
const clock = ref(Date.now())
const clientId = `star-${Math.random().toString(36).slice(2, 9)}`

let channel: any = null
let started = false
let heartbeat: number | undefined
let clockTimer: number | undefined

const publish = () => {
  channel?.track({
    storyId: myStory.value,
    playing: myPlaying.value,
    at: Date.now(),
  })
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
        storyId: found.storyId ?? null,
        playing: Boolean(found.playing),
        at: Number(found.at ?? Date.now()),
      }
    : null
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
        if (status === 'SUBSCRIBED') publish()
      })

    heartbeat = window.setInterval(publish, 20_000)
    // 对方长时间不动也要让"还在不在"的判断继续走
    clockTimer = window.setInterval(() => {
      clock.value = Date.now()
    }, 10_000)
  }

  const stop = () => {
    if (!started) return
    started = false
    if (heartbeat) window.clearInterval(heartbeat)
    if (clockTimer) window.clearInterval(clockTimer)
    channel?.unsubscribe()
    channel = null
    peer.value = null
  }

  const setMyStory = (id: number | null) => {
    myStory.value = id
    publish()
  }

  const setMyPlaying = (value: boolean) => {
    myPlaying.value = value
    publish()
  }

  // 对方两分钟没有动静才当作离开（窗口切到后台时定时器会被浏览器降到每分钟一次）
  const peerAlive = computed(() => !!peer.value && clock.value - peer.value.at < 120_000)

  // 两个人都在播、而且播的是同一颗星
  const coReading = computed(
    () =>
      peerAlive.value &&
      myPlaying.value &&
      !!myStory.value &&
      peer.value?.playing === true &&
      peer.value?.storyId === myStory.value,
  )

  return {
    peer,
    peerAlive,
    coReading,
    start,
    stop,
    setMyStory,
    setMyPlaying,
  }
}
