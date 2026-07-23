<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Library, Sparkles, Plus } from 'lucide-vue-next'
import StarryBackground from '@/components/StarryBackground.vue'
import NavBar from '@/components/NavBar.vue'
import StoryCard from '@/components/StoryCard.vue'
import UploadStoryModal from '@/components/UploadStoryModal.vue'
import { useSupabaseStories } from '@/composables/useSupabaseStories'
import type { Story } from '@/composables/useSupabaseStories'

const router = useRouter()
const { stories, isAdmin, fetchStories, checkAdmin, deleteStory, init } = useSupabaseStories()

const showContent = ref(false)
const showUploadModal = ref(false)

const handlePlay = (story: Story) => {
  router.push({ path: '/home', query: { storyId: story.id } })
}

const openUploadModal = () => {
  showUploadModal.value = true
}

const closeUploadModal = () => {
  showUploadModal.value = false
}

const handleUploadSuccess = async () => {
  await fetchStories()
}

const handleDelete = async (id: number, e: Event) => {
  e.stopPropagation()
  if (confirm('确定要删除这颗星星吗？')) {
    await deleteStory(id)
  }
}

onMounted(async () => {
  const hasEntered = sessionStorage.getItem('starryEntry')
  if (hasEntered !== 'true') {
    router.push('/')
    return
  }
  
  await init()
  
  setTimeout(() => {
    showContent.value = true
  }, 200)
})
</script>

<template>
  <div class="relative min-h-screen overflow-hidden">
    <StarryBackground />
    <NavBar @open-upload="openUploadModal" />
    
    <div 
      class="relative z-10 pt-24 pb-16 px-6 transition-all duration-1000 ease-out"
      :class="showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
    >
      <!-- 标题区域 -->
      <section class="max-w-4xl mx-auto py-8 md:py-12">
        <div class="text-center">
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warm-500/10 border border-warm-500/20 mb-6">
            <Library class="w-4 h-4 text-warm-400" />
            <span class="text-warm-300 text-sm tracking-wider">时光留声机</span>
          </div>
          
          <h1 class="font-serif text-3xl md:text-4xl font-light text-warm-100 mb-4">
            往期星辰
          </h1>
          <p class="text-night-400 text-sm max-w-md mx-auto">
            每一颗星星都在等你，随时可以翻回去听
          </p>
          
          <div class="flex items-center justify-center gap-2 mt-6">
            <Sparkles class="w-4 h-4 text-warm-400" />
            <span class="text-warm-400 text-sm">
              共 {{ stories.length }} 颗星星
            </span>
            <Sparkles class="w-4 h-4 text-warm-400" />
          </div>
          
          <button
            v-if="isAdmin && stories.length > 0"
            @click="openUploadModal"
            class="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-warm-500/20 text-warm-300 hover:bg-warm-500/30 transition-all duration-300 text-sm"
          >
            <Plus class="w-4 h-4" />
            <span>再点亮一颗</span>
          </button>
        </div>
      </section>
      
      <!-- 空状态 -->
      <section v-if="stories.length === 0" class="max-w-2xl mx-auto py-16 text-center">
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-warm-500/10 border border-warm-500/20 flex items-center justify-center">
          <Sparkles class="w-8 h-8 text-warm-400 animate-pulse" />
        </div>
        <h3 class="font-serif text-xl text-warm-100 mb-3">
          还没有星星呢
        </h3>
        <p class="text-night-400 text-sm mb-6">
          上传第一个睡前故事，点亮第一颗星吧
        </p>
        <button
          v-if="isAdmin"
          @click="openUploadModal"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-warm-500 to-warm-600 text-white text-sm font-medium hover:from-warm-400 hover:to-warm-500 transition-all duration-300 hover:shadow-warm-glow"
        >
          <Plus class="w-4 h-4" />
          <span>点亮第一颗星星</span>
        </button>
      </section>
      
      <!-- 故事卡片列表 -->
      <section v-else class="max-w-4xl mx-auto py-8">
        <div class="grid gap-4 md:gap-6 relative">
          <div
            v-for="(story, index) in stories"
            :key="story.id"
            class="relative group"
            :style="{
              animationDelay: `${index * 0.1}s`,
            }"
          >
            <StoryCard :story="story" @play="handlePlay" />
            
            <!-- 删除按钮（仅管理员可见） -->
            <button
              v-if="isAdmin"
              @click="handleDelete(story.id, $event)"
              class="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-500/30 flex items-center justify-center text-xs"
              title="删除"
            >
              ✕
            </button>
          </div>
        </div>
      </section>
      
      <!-- 底部提示 -->
      <section v-if="stories.length > 0" class="max-w-4xl mx-auto py-8">
        <div class="text-center">
          <div class="inline-block glass rounded-2xl px-8 py-6">
            <p class="text-night-300 text-sm leading-relaxed">
              每晚 23:00，会有一颗新的星星为你点亮
            </p>
            <p class="text-night-500 text-xs mt-2">
              敬请期待明天的故事 ✨
            </p>
          </div>
        </div>
      </section>
      
      <!-- 页脚 -->
      <footer class="max-w-4xl mx-auto pt-8 pb-4 text-center">
        <p class="text-night-600 text-xs tracking-widest">
          彤彤星空广播站 · 每晚都在
        </p>
        <p class="text-night-700 text-xs mt-2">
          愿你每晚都有好梦 🌙
        </p>
      </footer>
    </div>
    
    <!-- 上传弹窗 -->
    <UploadStoryModal 
      :visible="showUploadModal" 
      @close="closeUploadModal"
      @success="handleUploadSuccess"
    />
    
    <!-- 隐藏彩蛋小骨头 -->
    <button
      @click="router.push('/secret-garden')"
      class="hidden-star-easter-egg"
      title="点击看看"
    >
      ✦
    </button>
  </div>
</template>

<style scoped>
@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
  }
}

.animate-bounce-in {
  animation: bounceIn 0.5s ease-out;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.hidden-star-easter-egg {
  position: fixed;
  bottom: 80px;
  right: 40px;
  font-size: 14px;
  color: rgba(245, 166, 35, 0.3);
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  z-index: 40;
  animation: twinkle 3s ease-in-out infinite;
  transform: rotate(15deg);
}

.hidden-star-easter-egg:hover {
  color: rgba(245, 166, 35, 0.8);
  animation: none;
  transform: rotate(15deg) scale(1.3);
  transition: all 0.3s ease;
}

@keyframes twinkle {
  0%, 100% {
    opacity: 0.3;
    transform: rotate(15deg) scale(1);
  }
  50% {
    opacity: 0.6;
    transform: rotate(15deg) scale(1.1);
  }
}
</style>
