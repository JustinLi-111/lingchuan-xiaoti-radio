<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { usePresence } from '@/composables/usePresence'

const { peer, peerAlive } = usePresence()

const pos = ref({ x: 0, y: 0 })
const hasPos = ref(false)

let rafId = 0
const tick = () => {
  if (peer.value) {
    if (!hasPos.value) {
      pos.value = { x: peer.value.x, y: peer.value.y }
      hasPos.value = true
    } else {
      pos.value = {
        x: pos.value.x + (peer.value.x - pos.value.x) * 0.09,
        y: pos.value.y + (peer.value.y - pos.value.y) * 0.09,
      }
    }
  }
  rafId = requestAnimationFrame(tick)
}

onMounted(() => {
  rafId = requestAnimationFrame(tick)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
})

watch(peerAlive, (alive) => {
  if (!alive) hasPos.value = false
})
</script>

<template>
  <div class="firefly-layer" aria-hidden="true">
    <Transition name="firefly">
      <div
        v-if="peerAlive && hasPos && peer"
        class="firefly"
        :style="{ left: pos.x * 100 + '%', top: pos.y * 100 + '%' }"
      >
        <span class="firefly-halo" />
        <span class="firefly-core" />
        <span class="firefly-tail" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.firefly-layer {
  position: fixed;
  inset: 0;
  z-index: 45;
  pointer-events: none;
  overflow: hidden;
}

.firefly {
  position: absolute;
  width: 10px;
  height: 10px;
  margin: -5px 0 0 -5px;
  will-change: left, top;
}

.firefly-halo {
  position: absolute;
  inset: -16px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 226, 150, 0.34) 0%, rgba(255, 200, 110, 0.14) 42%, transparent 72%);
  animation: fireflyPulse 2.6s ease-in-out infinite;
}

.firefly-core {
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: #ffe9b0;
  box-shadow: 0 0 10px 3px rgba(255, 214, 130, 0.55);
  animation: fireflyPulse 2.6s ease-in-out infinite;
}

.firefly-tail {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 26px;
  height: 26px;
  margin: -13px 0 0 -13px;
  border-radius: 50%;
  border: 1px solid rgba(255, 226, 160, 0.22);
  animation: fireflyRing 3.4s ease-out infinite;
}

@keyframes fireflyPulse {
  0%,
  100% {
    opacity: 0.55;
    transform: scale(0.86);
  }
  50% {
    opacity: 1;
    transform: scale(1.12);
  }
}

@keyframes fireflyRing {
  0% {
    opacity: 0.3;
    transform: scale(0.4);
  }
  100% {
    opacity: 0;
    transform: scale(1.35);
  }
}

.firefly-enter-active,
.firefly-leave-active {
  transition: opacity 0.5s ease;
}

.firefly-enter-from,
.firefly-leave-to {
  opacity: 0;
}
</style>
