<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Library, Sparkles, Plus, ChevronDown } from 'lucide-vue-next'
import NavBar from '@/components/NavBar.vue'
import StoryCard from '@/components/StoryCard.vue'
import StarMap from '@/components/StarMap.vue'
import UploadStoryModal from '@/components/UploadStoryModal.vue'
import { useSupabaseStories } from '@/composables/useSupabaseStories'
import { useSkySnapshot } from '@/composables/useSkySnapshot'
import type { Story } from '@/composables/useSupabaseStories'

const router = useRouter()
const { stories, isAdmin, fetchStories, checkAdmin, deleteStory, init } = useSupabaseStories()
const { lock: lockSnapshot, unlock: unlockSnapshot } = useSkySnapshot()

const showContent = ref(false)
const showUploadModal = ref(false)
const showEasterEgg = ref(false)
const showMap = ref(false)

// 星图开关 → 关闭时恢复实时天幕
watch(showMap, (open) => {
  if (!open) unlockSnapshot()
})

// 星图点中某颗星 → 天幕切到那晚 23:00
const handleStarSelect = (story: Story | null) => {
  if (!story) {
    unlockSnapshot()
    return
  }
  lockSnapshot(story.created_at, {
    id: story.id,
    title: story.title,
    subtitle: story.subtitle ?? `第 ${story.star_number ?? story.id} 颗星`,
  })
}

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
    <NavBar @open-upload="openUploadModal" />
    
    <div 
      class="relative z-10 pt-24 pb-16 px-6 transition-all duration-700 ease-out"
      :class="showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
    >
      <!-- 标题区域 -->
      <section v-reveal class="max-w-4xl mx-auto py-8 md:py-12">
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
            v-reveal="Math.min(index * 90, 450)"
            class="relative group"
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
      
      <!-- 星图入口 -->
      <section v-if="stories.length > 0" class="max-w-4xl mx-auto pt-10">
        <button class="map-entry" @click="showMap = !showMap">
          <span class="map-entry-icon">✦</span>
          <div class="text-left flex-1 min-w-0">
            <p class="text-warm-100 font-serif text-base">星图模式</p>
            <p class="text-night-400 text-xs mt-1">
              把 {{ stories.length }} 颗星连成星座 · 拖动、缩放、点星展开 · 悬停看发布时间
            </p>
          </div>
          <ChevronDown
            class="w-4 h-4 text-warm-400 transition-transform duration-300"
            :class="showMap ? 'rotate-180' : ''"
          />
        </button>

        <div v-if="showMap" class="mt-4">
          <StarMap :stories="stories" @play="handlePlay" @select="handleStarSelect" />
        </div>
      </section>
      
      <!-- 底部提示 -->
      <section v-if="stories.length > 0" v-reveal class="max-w-4xl mx-auto py-8">
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
          小华星空广播站 · 每晚都在
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
    
    <!-- 隐藏彩蛋星星 -->
    <button
      v-if="true"
      @click="showEasterEgg = true"
      class="hidden-star-easter-egg"
      title="点击看看"
    >
      ✦
    </button>

    <!-- 彩蛋弹窗 -->
    <div v-if="showEasterEgg" class="easter-egg-modal" @click="showEasterEgg = false">
      <div class="modal-content" @click.stop>
        <div class="star-icon">✦</div>
        <p class="easter-text">哇小狗这么厉害这么有探索<br />恭喜小狗找到彩蛋<br />凭此截图找哥哥定制一个图片看哦</p>
        <button @click="showEasterEgg = false" class="close-btn">关闭</button>
      </div>
    </div>
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

.map-entry {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(245, 166, 35, 0.18);
  transition: all 0.3s ease;
}

.map-entry:hover {
  background: rgba(245, 166, 35, 0.08);
  border-color: rgba(245, 166, 35, 0.35);
  box-shadow: 0 0 30px -12px rgba(245, 166, 35, 0.8);
}

.map-entry-icon {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(245, 166, 35, 0.12);
  color: #f5c87a;
  font-size: 14px;
  flex-shrink: 0;
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

.easter-egg-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease-out;
}

.modal-content {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 2.5rem 2.5rem 2rem;
  border-radius: 16px;
  text-align: center;
  max-width: 90vw;
  border: 1px solid rgba(245, 166, 35, 0.3);
  box-shadow: 0 0 40px rgba(245, 166, 35, 0.2);
  animation: bounceIn 0.5s ease-out;
}

.star-icon {
  font-size: 2rem;
  color: #f5a623;
  margin-bottom: 1rem;
  animation: twinkle 2s ease-in-out infinite;
}

.easter-text {
  color: #fde68a;
  font-size: 1.25rem;
  font-family: serif;
  margin-bottom: 1.5rem;
  letter-spacing: 0.05em;
  line-height: 1.8;
}

.close-btn {
  margin-top: 0.5rem;
  padding: 0.5rem 1.5rem;
  background: rgba(245, 166, 35, 0.2);
  color: #f5a623;
  border: 1px solid rgba(245, 166, 35, 0.4);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(245, 166, 35, 0.35);
  color: #fde68a;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
