<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Home, Library, Sparkles, LogOut, Settings, Plus, X, Lock } from 'lucide-vue-next'
import { useSupabaseStories } from '@/composables/useSupabaseStories'

const emit = defineEmits<{
  (e: 'openUpload'): void
}>()

const router = useRouter()
const route = useRoute()
const { isAdmin, loginAdmin, logoutAdmin, checkAdmin } = useSupabaseStories()

const showAdminModal = ref(false)
const adminPassword = ref('')
const adminError = ref('')

const goHome = () => {
  router.push('/home')
}

const goArchive = () => {
  router.push('/archive')
}

const logout = () => {
  sessionStorage.removeItem('starryEntry')
  router.push('/')
}

const openAdminModal = () => {
  adminPassword.value = ''
  adminError.value = ''
  showAdminModal.value = true
}

const closeAdminModal = () => {
  showAdminModal.value = false
}

const handleAdminLogin = () => {
  if (loginAdmin(adminPassword.value)) {
    showAdminModal.value = false
  } else {
    adminError.value = '管理员密码不对哦~'
    setTimeout(() => {
      adminError.value = ''
    }, 2000)
  }
}

const handleAdminLogout = () => {
  logoutAdmin()
}

onMounted(() => {
  checkAdmin()
})
</script>

<template>
  <nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4">
    <div class="max-w-4xl mx-auto flex items-center justify-between">
      <!-- Logo -->
      <button 
        @click="goHome"
        class="flex items-center gap-2 group"
      >
        <Sparkles class="w-5 h-5 text-warm-400 group-hover:text-warm-300 transition-colors" />
        <span class="font-serif text-warm-100 tracking-wider text-sm hidden sm:inline">
          小提星空
        </span>
      </button>
      
      <!-- 导航链接 -->
      <div class="flex items-center gap-2">
        <button
          @click="goHome"
          class="flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300"
          :class="route.path === '/home' 
            ? 'bg-warm-500/20 text-warm-300' 
            : 'text-night-400 hover:text-warm-300 hover:bg-white/5'"
        >
          <Home class="w-4 h-4" />
          <span class="text-sm hidden sm:inline">今夜星光</span>
        </button>
        
        <button
          @click="goArchive"
          class="flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300"
          :class="route.path === '/archive' 
            ? 'bg-warm-500/20 text-warm-300' 
            : 'text-night-400 hover:text-warm-300 hover:bg-white/5'"
        >
          <Library class="w-4 h-4" />
          <span class="text-sm hidden sm:inline">时光留声</span>
        </button>

        <!-- 管理员上传按钮 -->
        <button
          v-if="isAdmin"
          @click="emit('openUpload')"
          class="flex items-center gap-2 px-4 py-2 rounded-xl bg-warm-500/20 text-warm-300 hover:bg-warm-500/30 transition-all duration-300"
        >
          <Plus class="w-4 h-4" />
          <span class="text-sm hidden sm:inline">上传新故事</span>
        </button>

        <!-- 管理员入口/退出 -->
        <button
          v-if="isAdmin"
          @click="handleAdminLogout"
          class="flex items-center gap-2 px-3 py-2 rounded-xl text-night-400 hover:text-warm-400 hover:bg-white/5 transition-all duration-300"
          title="退出管理员模式"
        >
          <Settings class="w-4 h-4" />
        </button>
        <button
          v-else
          @click="openAdminModal"
          class="flex items-center gap-2 px-3 py-2 rounded-xl text-night-500 hover:text-warm-400 hover:bg-white/5 transition-all duration-300"
          title="管理员入口"
        >
          <Settings class="w-4 h-4" />
        </button>
        
        <button
          @click="logout"
          class="flex items-center gap-2 px-3 py-2 rounded-xl text-night-500 hover:text-warm-400 hover:bg-white/5 transition-all duration-300"
          title="离开"
        >
          <LogOut class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- 管理员登录弹窗 -->
    <Teleport to="body">
      <div 
        v-if="showAdminModal" 
        class="fixed inset-0 z-50 flex items-center justify-center p-6"
        @click.self="closeAdminModal"
      >
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div class="relative glass rounded-3xl p-8 w-full max-w-sm animate-fade-in">
          <button
            @click="closeAdminModal"
            class="absolute top-4 right-4 text-night-400 hover:text-warm-300 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
          
          <div class="text-center mb-6">
            <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-warm-500/10 border border-warm-500/20 flex items-center justify-center">
              <Lock class="w-6 h-6 text-warm-400" />
            </div>
            <h3 class="font-serif text-xl text-warm-100 mb-2">管理员模式</h3>
            <p class="text-night-400 text-sm">输入管理员密码进入</p>
          </div>
          
          <div class="space-y-4">
            <input
              v-model="adminPassword"
              type="password"
              placeholder="管理员密码..."
              class="w-full px-5 py-4 rounded-2xl bg-night-800/50 border border-night-700/50 text-warm-50 placeholder-night-500 focus:outline-none focus:border-warm-500/50 focus:ring-2 focus:ring-warm-500/20 transition-all duration-300 text-center"
              @keyup.enter="handleAdminLogin"
            />
            
            <p v-if="adminError" class="text-center text-red-400/80 text-sm">
              {{ adminError }}
            </p>
            
            <button
              @click="handleAdminLogin"
              class="w-full py-3 rounded-2xl bg-gradient-to-r from-warm-500 to-warm-600 text-white font-medium tracking-wider hover:from-warm-400 hover:to-warm-500 transition-all duration-300 hover:shadow-warm-glow"
            >
              进入管理模式
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </nav>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
