<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Home, Library, Mail, Sparkles, LogOut, Settings, Plus, X, Lock, Trash2, AlertTriangle, Star, Activity } from 'lucide-vue-next'
import AdminPanel from '@/components/AdminPanel.vue'
import { useSupabaseStories } from '@/composables/useSupabaseStories'

const emit = defineEmits<{
  (e: 'openUpload'): void
}>()

const router = useRouter()
const route = useRoute()
const { isAdmin, loginAdmin, logoutAdmin, checkAdmin, clearAllData } = useSupabaseStories()

const showAdminModal = ref(false)
const showAdminPanel = ref(false)
const adminPassword = ref('')
const adminError = ref('')
const showClearModal = ref(false)
const isClearing = ref(false)
const clearPassword = ref('')
const clearPasswordError = ref('')
const SECONDARY_PASSWORD = '520LJL0913111'

const goHome = () => {
  router.push('/home')
}

const goArchive = () => {
  router.push('/archive')
}

const goMailbox = () => {
    router.push('/mailbox')
  }

  const goMoments = () => {
    router.push('/moments')
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

const openClearModal = () => {
  clearPassword.value = ''
  clearPasswordError.value = ''
  showClearModal.value = true
}

const closeClearModal = () => {
  showClearModal.value = false
}

const handleClearAllData = async () => {
  if (clearPassword.value !== SECONDARY_PASSWORD) {
    clearPasswordError.value = '二级密码错误，请重试'
    setTimeout(() => {
      clearPasswordError.value = ''
    }, 2000)
    return
  }

  isClearing.value = true
  const result = await clearAllData()
  isClearing.value = false
  
  if (result.success) {
    alert('所有数据已清除 ✨')
    showClearModal.value = false
    router.push('/home')
  } else {
    alert(`清除数据失败：${result.error || '未知错误'}`)
  }
}

onMounted(() => {
  checkAdmin()
})
</script>

<template>
  <nav class="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-3 md:py-4">
    <div class="nav-shell max-w-4xl mx-auto flex items-center justify-between gap-2">
      <!-- Logo -->
      <button 
        @click="goHome"
        class="flex items-center gap-2 group px-2 py-1.5 rounded-xl"
      >
        <Sparkles class="w-5 h-5 text-warm-400 group-hover:text-warm-300 transition-colors duration-300" />
        <span class="font-serif text-warm-100 tracking-[0.18em] text-sm hidden sm:inline">
          小华星空
        </span>
      </button>
      
      <!-- 导航链接 -->
      <div class="flex items-center gap-1 md:gap-2">
        <button
          @click="goHome"
          class="nav-item flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl"
          :class="route.path === '/home' ? 'is-active' : ''"
        >
          <Home class="w-4 h-4" />
          <span class="text-sm hidden sm:inline">今夜星光</span>
        </button>
        
        <button
          @click="goArchive"
          class="nav-item flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl"
          :class="route.path === '/archive' ? 'is-active' : ''"
        >
          <Library class="w-4 h-4" />
          <span class="text-sm hidden sm:inline">时光留声</span>
        </button>

        <button
          @click="goMailbox"
          class="nav-item flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl"
          :class="route.path === '/mailbox' ? 'is-active' : ''"
        >
          <Mail class="w-4 h-4" />
          <span class="text-sm hidden sm:inline">时光信箱</span>
        </button>

        <button
          @click="goMoments"
          class="nav-item flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl"
          :class="route.path === '/moments' ? 'is-active' : ''"
        >
          <Star class="w-4 h-4" />
          <span class="text-sm hidden sm:inline">流星小记</span>
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

        <!-- 观测台 -->
        <button
          v-if="isAdmin"
          @click="showAdminPanel = true"
          class="flex items-center gap-2 px-3 py-2 rounded-xl text-warm-300/85 hover:text-warm-200 hover:bg-white/5 transition-all duration-300"
          title="打开观测台"
        >
          <Activity class="w-4 h-4" />
          <span class="text-sm hidden sm:inline">观测台</span>
        </button>

        <!-- 清除数据按钮 -->
        <button
          v-if="isAdmin"
          @click="openClearModal"
          class="flex items-center gap-2 px-3 py-2 rounded-xl text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
          title="清除所有数据"
        >
          <Trash2 class="w-4 h-4" />
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

    <!-- 观测台（管理员） -->
    <AdminPanel
      :visible="showAdminPanel"
      @close="showAdminPanel = false"
      @open-upload="emit('openUpload')"
    />

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

    <!-- 清除数据确认弹窗 -->
    <Teleport to="body">
      <div 
        v-if="showClearModal" 
        class="fixed inset-0 z-50 flex items-center justify-center p-6"
        @click.self="closeClearModal"
      >
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div class="relative glass rounded-3xl p-8 w-full max-w-sm animate-fade-in">
          <button
            @click="closeClearModal"
            class="absolute top-4 right-4 text-night-400 hover:text-warm-300 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
          
          <div class="text-center mb-6">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle class="w-8 h-8 text-red-400" />
            </div>
            <h3 class="font-serif text-xl text-warm-100 mb-2">清除所有数据</h3>
            <p class="text-night-400 text-sm">此操作将删除所有故事、信件和评论</p>
            <p class="text-red-400/80 text-xs mt-2">⚠️ 此操作无法撤销，请谨慎操作</p>
          </div>
          
          <div class="space-y-4">
            <input
              v-model="clearPassword"
              type="password"
              placeholder="请输入二级密码"
              class="w-full px-5 py-4 rounded-2xl bg-night-800/50 border border-night-700/50 text-warm-50 placeholder-night-500 focus:outline-none focus:border-warm-500/50 focus:ring-2 focus:ring-warm-500/20 transition-all duration-300 text-center"
              @keyup.enter="handleClearAllData"
            />
            
            <p v-if="clearPasswordError" class="text-center text-red-400/80 text-sm">
              {{ clearPasswordError }}
            </p>
            
            <button
              @click="handleClearAllData"
              :disabled="isClearing"
              class="w-full py-3 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white font-medium tracking-wider hover:from-red-400 hover:to-red-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isClearing">清除中...</span>
              <span v-else>确认清除所有数据</span>
            </button>
            
            <button
              @click="closeClearModal"
              class="w-full py-3 rounded-2xl bg-night-800/50 text-night-300 font-medium hover:bg-night-800 transition-all duration-300"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </nav>
</template>

<style scoped>
.nav-shell {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(10, 20, 34, 0.55);
  backdrop-filter: blur(18px) saturate(130%);
  -webkit-backdrop-filter: blur(18px) saturate(130%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 18px 40px -26px rgba(0, 0, 0, 0.9);
}

.nav-item {
  color: rgba(148, 163, 184, 0.9);
  transition:
    color 0.35s var(--ease-glide, ease),
    background 0.35s var(--ease-glide, ease),
    border-color 0.35s var(--ease-glide, ease),
    box-shadow 0.35s var(--ease-glide, ease),
    transform 0.25s var(--ease-out-expo, ease);
  border: 1px solid transparent;
}

.nav-item:hover {
  color: #ffd9a8;
  background: rgba(255, 255, 255, 0.06);
}

.nav-item.is-active {
  color: #ffd9a8;
  background: linear-gradient(160deg, rgba(245, 166, 35, 0.22), rgba(245, 166, 35, 0.08));
  border-color: rgba(245, 166, 35, 0.28);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    0 0 24px -10px rgba(245, 166, 35, 0.9);
}

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
