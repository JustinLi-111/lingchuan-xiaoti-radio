<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-vue-next'
import type { Story } from '@/composables/useSupabaseStories'

const props = defineProps<{
  story: Story
}>()

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const audioRef = ref<HTMLAudioElement | null>(null)

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const progress = computed(() => {
  if (duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
})

const togglePlay = () => {
  if (!audioRef.value) return
  
  if (isPlaying.value) {
    audioRef.value.pause()
    isPlaying.value = false
  } else {
    audioRef.value.play().then(() => {
      isPlaying.value = true
    }).catch(() => {
      isPlaying.value = false
    })
  }
}

const handleTimeUpdate = () => {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime
  }
}

const handleLoadedMetadata = () => {
  if (audioRef.value) {
    duration.value = audioRef.value.duration || 512
  }
}

const handleEnded = () => {
  isPlaying.value = false
  currentTime.value = 0
}

const handlePlay = () => {
  isPlaying.value = true
}

const handlePause = () => {
  isPlaying.value = false
}

const handleSeek = (e: Event) => {
  const target = e.target as HTMLInputElement
  const value = parseFloat(target.value)
  if (audioRef.value) {
    audioRef.value.currentTime = (value / 100) * duration.value
    currentTime.value = audioRef.value.currentTime
  }
}

const skipBackward = () => {
  if (audioRef.value) {
    audioRef.value.currentTime = Math.max(0, audioRef.value.currentTime - 10)
  }
}

const skipForward = () => {
  if (audioRef.value) {
    audioRef.value.currentTime = Math.min(duration.value, audioRef.value.currentTime + 10)
  }
}

watch(() => props.story, () => {
  isPlaying.value = false
  currentTime.value = 0
  if (audioRef.value) {
    audioRef.value.load()
  }
})

onMounted(() => {
  if (audioRef.value) {
    audioRef.value.addEventListener('timeupdate', handleTimeUpdate)
    audioRef.value.addEventListener('loadedmetadata', handleLoadedMetadata)
    audioRef.value.addEventListener('ended', handleEnded)
    audioRef.value.addEventListener('play', handlePlay)
    audioRef.value.addEventListener('pause', handlePause)
  }
})

onUnmounted(() => {
  if (audioRef.value) {
    audioRef.value.removeEventListener('timeupdate', handleTimeUpdate)
    audioRef.value.removeEventListener('loadedmetadata', handleLoadedMetadata)
    audioRef.value.removeEventListener('ended', handleEnded)
    audioRef.value.removeEventListener('play', handlePlay)
    audioRef.value.removeEventListener('pause', handlePause)
  }
})
</script>

<template>
  <div class="flex flex-col items-center">
    <audio ref="audioRef" :src="story.audioUrl" preload="metadata" />
    
    <!-- 播放按钮区域 -->
    <div class="relative mb-8">
      <!-- 呼吸灯光晕 -->
      <div 
        class="absolute inset-0 rounded-full transition-all duration-1000"
        :class="isPlaying ? 'animate-breath' : ''"
        :style="{
          background: 'radial-gradient(circle, rgba(245, 166, 35, 0.3) 0%, transparent 70%)',
          transform: 'scale(1.5)',
        }"
      />
      
      <!-- 外层光晕 -->
      <div 
        class="absolute inset-0 rounded-full transition-all duration-500"
        :style="{
          boxShadow: isPlaying 
            ? '0 0 60px rgba(245, 166, 35, 0.4), 0 0 120px rgba(245, 166, 35, 0.2)' 
            : '0 0 30px rgba(245, 166, 35, 0.2)',
        }"
      />
      
      <!-- 主播放按钮 -->
      <button
        @click="togglePlay"
        class="relative w-40 h-40 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-warm-400 to-warm-600 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 group"
      >
        <!-- 按钮内圈 -->
        <div class="absolute inset-2 rounded-full bg-gradient-to-br from-warm-300 to-warm-500 opacity-80" />
        
        <!-- 播放/暂停图标 -->
        <div class="relative z-10">
          <Play 
            v-if="!isPlaying" 
            class="w-16 h-16 md:w-20 md:h-20 text-white ml-2 drop-shadow-lg"
            :stroke-width="1.5"
          />
          <Pause 
            v-else 
            class="w-16 h-16 md:w-20 md:h-20 text-white drop-shadow-lg"
            :stroke-width="1.5"
          />
        </div>
        
        <!-- 星星装饰 -->
        <div class="absolute -top-2 -right-2 w-6 h-6 text-warm-200 animate-pulse">
          ✦
        </div>
        <div class="absolute -bottom-1 -left-3 w-4 h-4 text-warm-300 animate-pulse" style="animation-delay: 0.5s">
          ✧
        </div>
      </button>
    </div>
    
    <!-- 标题信息 -->
    <div class="text-center mb-6">
      <p class="text-warm-400 text-sm tracking-widest mb-2">
        {{ story.subtitle }}
      </p>
      <h2 class="font-serif text-2xl md:text-3xl font-light text-warm-100 mb-2">
        {{ story.title }}
      </h2>
      <p class="text-night-400 text-sm">
        {{ story.date }} · {{ story.duration }}
      </p>
    </div>
    
    <!-- 进度条 -->
    <div class="w-full max-w-md mb-4">
      <input
        type="range"
        min="0"
        max="100"
        :value="progress"
        @input="handleSeek"
        class="w-full h-1 cursor-pointer"
        :style="{
          background: `linear-gradient(to right, #f5a623 0%, #f5a623 ${progress}%, rgba(245, 166, 35, 0.2) ${progress}%, rgba(245, 166, 35, 0.2) 100%)`,
          borderRadius: '2px',
        }"
      />
      
      <!-- 时间显示 -->
      <div class="flex justify-between text-xs text-night-400 mt-2">
        <span>{{ formatTime(currentTime) }}</span>
        <span>{{ formatTime(duration || parseFloat(story.duration.split(':')[0]) * 60 + parseFloat(story.duration.split(':')[1])) }}</span>
      </div>
    </div>
    
    <!-- 控制按钮 -->
    <div class="flex items-center gap-8">
      <button
        @click="skipBackward"
        class="w-12 h-12 rounded-full bg-night-800/50 border border-night-700/50 flex items-center justify-center text-night-300 hover:text-warm-400 hover:border-warm-500/30 transition-all duration-300"
      >
        <SkipBack class="w-5 h-5" />
      </button>
      
      <button
        @click="skipForward"
        class="w-12 h-12 rounded-full bg-night-800/50 border border-night-700/50 flex items-center justify-center text-night-300 hover:text-warm-400 hover:border-warm-500/30 transition-all duration-300"
      >
        <SkipForward class="w-5 h-5" />
      </button>
    </div>
    
    <!-- 提示文字 -->
    <p class="text-night-500 text-xs mt-8 tracking-wider">
      戴上耳机，效果更好哦 ✨
    </p>
  </div>
</template>
