<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Lock, Sparkles } from 'lucide-vue-next'
import StarryBackground from '@/components/StarryBackground.vue'
const ENTRY_PASSWORD = import.meta.env.VITE_ENTRY_PASSWORD || 'zhulaoshi'

const router = useRouter()
const password = ref('')
const isShaking = ref(false)
const showContent = ref(false)
const errorMessage = ref('')

const handleSubmit = () => {
  if (password.value === ENTRY_PASSWORD) {
    sessionStorage.setItem('starryEntry', 'true')
    router.push('/home')
  } else {
    isShaking.value = true
    errorMessage.value = '密码不对哦，再想想~'
    setTimeout(() => {
      isShaking.value = false
      errorMessage.value = ''
    }, 1500)
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    handleSubmit()
  }
}

onMounted(() => {
  const hasEntered = sessionStorage.getItem('starryEntry')
  if (hasEntered === 'true') {
    router.push('/home')
  }
  
  setTimeout(() => {
    showContent.value = true
  }, 300)
})
</script>

<template>
  <div class="relative min-h-screen flex items-center justify-center overflow-hidden">
    <StarryBackground />
    
    <div 
      class="relative z-10 w-full max-w-md px-8 transition-all duration-1000 ease-out"
      :class="showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
    >
      <!-- 标题区域 -->
      <div class="text-center mb-12">
        <div class="flex items-center justify-center gap-3 mb-4">
          <Sparkles class="w-6 h-6 text-warm-300 animate-pulse" />
          <h1 class="font-serif text-3xl font-light text-warm-100 tracking-widest">
            彤彤星空广播站
          </h1>
          <Sparkles class="w-6 h-6 text-warm-300 animate-pulse" />
        </div>
        <p class="text-night-400 text-sm tracking-wider">
          今夜，有一颗星星为你而亮
        </p>
      </div>
      
      <!-- 密码输入区域 -->
      <div 
        class="glass rounded-3xl p-8 shadow-soft"
        :class="{ 'animate-shake-soft': isShaking }"
      >
        <div class="flex justify-center mb-6">
          <div class="w-16 h-16 rounded-full bg-warm-500/10 flex items-center justify-center border border-warm-500/20">
            <Lock class="w-7 h-7 text-warm-400" />
          </div>
        </div>
        
        <p class="text-center text-night-300 text-sm mb-6">
          请输入今晚的入场密码
        </p>
        
        <div class="space-y-4">
          <input
            v-model="password"
            type="password"
            placeholder="今晚的秘密..."
            class="w-full px-5 py-4 rounded-2xl bg-night-800/50 border border-night-700/50 text-warm-50 placeholder-night-500 focus:outline-none focus:border-warm-500/50 focus:ring-2 focus:ring-warm-500/20 transition-all duration-300 text-center tracking-widest"
            @keydown="handleKeydown"
          />
          
          <p 
            v-if="errorMessage" 
            class="text-center text-red-400/80 text-sm"
          >
            {{ errorMessage }}
          </p>
          
          <button
            @click="handleSubmit"
            class="w-full py-4 rounded-2xl bg-gradient-to-r from-warm-500 to-warm-600 text-white font-medium tracking-wider hover:from-warm-400 hover:to-warm-500 transition-all duration-300 hover:shadow-warm-glow active:scale-98"
          >
            推开星门
          </button>
        </div>
        
      </div>
      
      <!-- 底部装饰 -->
      <div class="text-center mt-10">
        <p class="text-night-600 text-xs tracking-widest">
          · 每晚 23:00，为你点亮一颗星 ·
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-shake-soft {
  animation: shakeSoft 0.5s ease-in-out;
}

@keyframes shakeSoft {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-8px);
  }
  75% {
    transform: translateX(8px);
  }
}
</style>
