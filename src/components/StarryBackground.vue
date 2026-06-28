<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Star {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  delay: number
  duration: number
}

const stars = ref<Star[]>([])
const shootingStars = ref<{ id: number; x: number; y: number; delay: number }[]>([])

const generateStars = () => {
  const starCount = 120
  const newStars: Star[] = []
  
  for (let i = 0; i < starCount; i++) {
    newStars.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.3,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 2,
    })
  }
  
  stars.value = newStars
}

const generateShootingStars = () => {
  const shooting: { id: number; x: number; y: number; delay: number }[] = []
  
  for (let i = 0; i < 3; i++) {
    shooting.push({
      id: i,
      x: Math.random() * 60 + 20,
      y: Math.random() * 30,
      delay: i * 8 + Math.random() * 5,
    })
  }
  
  shootingStars.value = shooting
}

onMounted(() => {
  generateStars()
  generateShootingStars()
})
</script>

<template>
  <div class="fixed inset-0 overflow-hidden pointer-events-none z-0 starry-gradient">
    <!-- 星星层 -->
    <div class="absolute inset-0">
      <div
        v-for="star in stars"
        :key="star.id"
        class="absolute rounded-full bg-white"
        :style="{
          left: `${star.x}%`,
          top: `${star.y}%`,
          width: `${star.size}px`,
          height: `${star.size}px`,
          opacity: star.opacity,
          animation: `twinkle ${star.duration}s ease-in-out infinite`,
          animationDelay: `${star.delay}s`,
        }"
      />
    </div>
    
    <!-- 较大的星星 -->
    <div class="absolute inset-0">
      <div
        v-for="n in 15"
        :key="'big-' + n"
        class="absolute rounded-full bg-warm-200"
        :style="{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 70}%`,
          width: `${Math.random() * 2 + 2}px`,
          height: `${Math.random() * 2 + 2}px`,
          opacity: 0.6,
          animation: `twinkle-slow ${Math.random() * 4 + 3}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 5}s`,
          boxShadow: '0 0 6px rgba(255, 216, 155, 0.8)',
        }"
      />
    </div>
    
    <!-- 流星 -->
    <div class="absolute inset-0 overflow-hidden">
      <div
        v-for="shooting in shootingStars"
        :key="'shooting-' + shooting.id"
        class="shooting-star"
        :style="{
          left: `${shooting.x}%`,
          top: `${shooting.y}%`,
          animationDelay: `${shooting.delay}s`,
        }"
      />
    </div>
    
    <!-- 柔和光晕 -->
    <div class="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20 blur-3xl bg-warm-500" />
    <div class="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl bg-starry-400" />
    <div class="absolute top-1/3 left-1/4 w-48 h-48 rounded-full opacity-15 blur-3xl bg-warm-300" />
    
    <!-- 底部渐变暗化 -->
    <div class="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-night-950 to-transparent" />
  </div>
</template>

<style scoped>
@keyframes twinkle {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

@keyframes twinkle-slow {
  0%, 100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.9;
  }
}

.shooting-star {
  position: absolute;
  width: 100px;
  height: 2px;
  background: linear-gradient(90deg, rgba(255, 216, 155, 0.8), transparent);
  transform: rotate(-45deg);
  opacity: 0;
  animation: shooting 12s ease-in-out infinite;
}

@keyframes shooting {
  0% {
    opacity: 0;
    transform: translate(0, 0) rotate(-45deg);
  }
  5% {
    opacity: 1;
  }
  15% {
    opacity: 0;
    transform: translate(200px, 200px) rotate(-45deg);
  }
  100% {
    opacity: 0;
    transform: translate(200px, 200px) rotate(-45deg);
  }
}
</style>
