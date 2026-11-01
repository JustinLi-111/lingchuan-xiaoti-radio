<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

interface Spark {
  id: number
  x: number
  y: number
  dx: number
  dy: number
  size: number
  delay: number
  warm: boolean
}

const sparks = ref<Spark[]>([])
let seq = 0
let lastAt = 0

const burst = (e: PointerEvent) => {
  // 触屏滑动、长按不产生星尘
  if (e.pointerType === 'touch' && e.buttons === 0) return

  const now = performance.now()
  if (now - lastAt < 110) return
  lastAt = now

  const count = 9
  const startId = seq

  for (let i = 0; i < count; i++) {
    seq++
    const angle = Math.random() * Math.PI * 2
    const distance = 22 + Math.random() * 66

    sparks.value.push({
      id: seq,
      x: e.clientX,
      y: e.clientY,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance + 14,
      size: 2 + Math.random() * 3,
      delay: Math.random() * 90,
      warm: Math.random() > 0.45,
    })
  }

  window.setTimeout(() => {
    sparks.value = sparks.value.filter((spark) => spark.id > startId + count)
  }, 950)
}

onMounted(() => {
  window.addEventListener('pointerdown', burst, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('pointerdown', burst)
})
</script>

<template>
  <div class="stardust-layer">
    <span
      v-for="spark in sparks"
      :key="spark.id"
      class="spark"
      :class="{ 'spark-warm': spark.warm }"
      :style="{
        left: spark.x + 'px',
        top: spark.y + 'px',
        width: spark.size + 'px',
        height: spark.size + 'px',
        animationDelay: spark.delay + 'ms',
        '--dx': spark.dx + 'px',
        '--dy': spark.dy + 'px',
      }"
    />
  </div>
</template>

<style scoped>
.stardust-layer {
  position: fixed;
  inset: 0;
  z-index: 70;
  pointer-events: none;
  overflow: hidden;
}

.spark {
  position: absolute;
  border-radius: 50%;
  background: #dfe9ff;
  box-shadow: 0 0 8px 1px rgba(190, 214, 255, 0.6);
  opacity: 0;
  animation: sparkFly 0.78s ease-out forwards;
}

.spark-warm {
  background: #ffe6bd;
  box-shadow: 0 0 10px 1px rgba(255, 200, 120, 0.7);
}

@keyframes sparkFly {
  0% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
  70% {
    opacity: 0.7;
  }
  100% {
    opacity: 0;
    transform: translate3d(var(--dx), var(--dy), 0) scale(0.25);
  }
}
</style>
