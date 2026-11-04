<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Headphones, Moon } from 'lucide-vue-next'
import { useTogether } from '@/composables/useTogether'
import { findRiseSet } from '@/lib/skyMath'

const {
  ready,
  lastError,
  deviceId,
  myName,
  setMyName,
  togetherMode,
  setTogetherMode,
  listen,
  moonClaim,
  partnerName,
  partnerOnline,
  claimMoon,
} = useTogether()

const claimBusy = ref(false)
const claimHint = ref('')

/* ---------- 月亮升起窗口 ---------- */
const moonRise = ref<Date | null>(null)
const now = ref(Date.now())
let tick: number | null = null
let minuteCount = 0

const refreshRise = () => {
  moonRise.value = findRiseSet('moon', new Date()).rise
}

onMounted(() => {
  refreshRise()
  tick = window.setInterval(() => {
    now.value = Date.now()
    minuteCount += 1
    if (minuteCount >= 60) {
      minuteCount = 0
      refreshRise()
    }
  }, 1000)
})

onUnmounted(() => {
  if (tick !== null) clearInterval(tick)
})

/** 月升后 8 小时内可"认领"（当天有效） */
const moonWindowOpen = computed(() => {
  if (!moonRise.value) return false
  const rise = moonRise.value.getTime()
  return now.value >= rise && now.value < rise + 8 * 3600_000
})

const formatTime = (total: number) => {
  const t = Number.isFinite(total) && total > 0 ? total : 0
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/* ---------- 一起听：对方状态 ---------- */
const remote = computed(() => {
  const r = listen.value
  if (!r || !r.active || r.by === deviceId) return null
  const elapsed = r.playing ? (now.value - (r._updatedAt ?? now.value)) / 1000 : 0
  return {
    name: r.byName,
    playing: r.playing,
    pos: Math.max(0, r.pos + elapsed),
    title: r.title || '',
  }
})

/* ---------- 抢月亮 ---------- */
const moonOwner = computed(() => {
  const c = moonClaim.value
  if (!c) return null
  return { name: c.byName, mine: c.by === deviceId, day: new Date(c.at) }
})

const claim = async () => {
  if (!myName.value) return
  claimBusy.value = true
  claimHint.value = ''
  const result = await claimMoon()
  claimBusy.value = false
  if (result === 'taken') claimHint.value = '慢了一步，对方先看到的 🌙'
  if (result === 'error') claimHint.value = '网络没接上，再点一次试试'
}
</script>

<template>
  <div class="together-bar">
    <!-- 未初始化提示 -->
    <p v-if="!ready" class="tb-warn">
      互动功能还没建表：请在 Supabase 执行 supabase-room-state.sql
      <span v-if="lastError" class="tb-warn-detail">（{{ lastError }}）</span>
    </p>

    <template v-else>
      <!-- 身份选择 -->
      <div v-if="!myName" class="tb-ident">
        <span class="tb-ident-label">你是</span>
        <button class="tb-chip" @click="setMyName('小狗')">小狗</button>
        <button class="tb-chip" @click="setMyName('哥哥')">哥哥</button>
      </div>

      <template v-else>
        <span class="tb-me">{{ myName }}</span>

        <!-- 一起听 -->
        <button
          class="tb-action"
          :class="{ 'is-on': togetherMode }"
          @click="setTogetherMode(!togetherMode)"
        >
          <Headphones class="w-3.5 h-3.5" :stroke-width="1.8" />
          <span>{{ togetherMode ? '一起听已开启' : '一起听' }}</span>
        </button>

        <span v-if="togetherMode && remote" class="tb-status">
          {{ remote.name }}正在和你一起听 · {{ remote.playing ? formatTime(remote.pos) : '已暂停' }}
        </span>
        <span v-else-if="togetherMode && partnerOnline" class="tb-status tb-dim">
          {{ partnerName }}在线，等 ta 打开这一页
        </span>
        <span v-else-if="togetherMode && !partnerOnline" class="tb-status tb-dim">
          还没听到另一个人的心跳
        </span>

        <!-- 抢月亮 -->
        <span class="tb-sep" />
        <template v-if="moonOwner">
          <span class="tb-moon">
            <Moon class="w-3.5 h-3.5" :stroke-width="1.8" />
            {{ moonOwner.mine ? '你先看到了今晚的月亮' : `${moonOwner.name}先看到了今晚的月亮` }}
          </span>
        </template>
        <button
          v-else-if="moonWindowOpen"
          class="tb-action is-moon"
          :disabled="claimBusy"
          @click="claim"
        >
          <Moon class="w-3.5 h-3.5" :stroke-width="1.8" />
          <span>我看见月亮了</span>
        </button>
        <span v-else class="tb-status tb-dim">
          月亮升起后，这里会亮起来
        </span>

        <span v-if="claimHint" class="tb-hint">{{ claimHint }}</span>
      </template>
    </template>
  </div>
</template>

<style scoped>
.together-bar {
  max-width: 42rem;
  margin: 0 auto;
  padding: 14px 18px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px 14px;
  border-radius: 16px;
  border: 1px solid rgba(245, 166, 35, 0.16);
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(6px);
  font-size: 11px;
  letter-spacing: 0.1em;
  color: rgba(203, 213, 225, 0.72);
}

.tb-me {
  color: #f5c877;
  font-weight: 500;
}

.tb-ident {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tb-ident-label {
  color: rgba(203, 213, 225, 0.6);
}

.tb-chip {
  padding: 5px 14px;
  border-radius: 999px;
  border: 1px solid rgba(245, 166, 35, 0.28);
  color: #f5c877;
  background: rgba(245, 166, 35, 0.08);
  transition: all 0.25s ease;
}

.tb-chip:hover {
  background: rgba(245, 166, 35, 0.18);
}

.tb-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(226, 232, 240, 0.8);
  background: rgba(255, 255, 255, 0.04);
  transition: all 0.28s ease;
}

.tb-action:hover:not(:disabled) {
  color: #ffd49b;
  border-color: rgba(245, 166, 35, 0.36);
  background: rgba(245, 166, 35, 0.1);
}

.tb-action.is-on {
  color: #ffd9a2;
  border-color: rgba(245, 166, 35, 0.5);
  background: rgba(245, 166, 35, 0.16);
  box-shadow: 0 0 18px rgba(245, 166, 35, 0.16);
}

.tb-action.is-moon {
  border-color: rgba(180, 200, 255, 0.28);
  color: #c8dcff;
}

.tb-action.is-moon:hover:not(:disabled) {
  border-color: rgba(180, 200, 255, 0.5);
  background: rgba(150, 180, 255, 0.12);
  color: #dbe8ff;
}

.tb-action:disabled {
  opacity: 0.5;
}

.tb-status {
  color: rgba(203, 213, 225, 0.66);
}

.tb-dim {
  color: rgba(203, 213, 225, 0.38);
}

.tb-moon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #c8dcff;
}

.tb-sep {
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.1);
}

.tb-hint {
  color: rgba(245, 200, 120, 0.85);
}

.tb-warn {
  color: rgba(245, 200, 120, 0.8);
  line-height: 1.7;
  text-align: center;
}

.tb-warn-detail {
  color: rgba(245, 200, 120, 0.45);
}

@media (max-width: 640px) {
  .together-bar {
    font-size: 10px;
    gap: 8px 10px;
  }
  .tb-sep {
    display: none;
  }
}
</style>
