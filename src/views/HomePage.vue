<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Moon, ChevronDown, Plus, Sparkles } from 'lucide-vue-next'
import StarryBackground from '@/components/StarryBackground.vue'
import NavBar from '@/components/NavBar.vue'
import AudioPlayer from '@/components/AudioPlayer.vue'
import CommentSection from '@/components/CommentSection.vue'
import UploadStoryModal from '@/components/UploadStoryModal.vue'
import { useSupabaseStories } from '@/composables/useSupabaseStories'

const router = useRouter()
const route = useRoute()
const { stories, latestStory, isAdmin, fetchStories, checkAdmin, init, loading } = useSupabaseStories()

const showContent = ref(false)
const showUploadModal = ref(false)

const currentStory = computed(() => {
  const storyId = route.query.storyId
  if (storyId) {
    const story = stories.value.find(s => s.id === Number(storyId))
    if (story) return story
  }
  return latestStory.value
})

const scrollToComments = () => {
  const commentsSection = document.getElementById('comments-section')
  if (commentsSection) {
    commentsSection.scrollIntoView({ behavior: 'smooth' })
  }
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
      <!-- 空状态：还没有星星 -->
      <template v-if="!currentStory">
        <section class="max-w-2xl mx-auto py-20 md:py-32 text-center">
          <div class="mb-8">
            <div class="w-24 h-24 mx-auto mb-6 rounded-full bg-warm-500/10 border border-warm-500/20 flex items-center justify-center">
              <Sparkles class="w-10 h-10 text-warm-400 animate-pulse" />
            </div>
            <h2 class="font-serif text-2xl md:text-3xl text-warm-100 mb-4">
              星空还在等待
            </h2>
            <p class="text-night-400 leading-relaxed">
              第一颗星星还没有点亮<br/>
              等你上传第一个睡前故事 ✨
            </p>
          </div>
          
          <button
            v-if="isAdmin"
            @click="openUploadModal"
            class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-warm-500 to-warm-600 text-white font-medium tracking-wider hover:from-warm-400 hover:to-warm-500 transition-all duration-300 hover:shadow-warm-glow"
          >
            <Plus class="w-5 h-5" />
            <span>点亮第一颗星星</span>
          </button>
          
          <p v-else class="text-night-500 text-sm">
            星星很快就会亮起来的 🌙
          </p>
        </section>
      </template>
      
      <!-- 有内容时的正常展示 -->
      <template v-else>
        <!-- 主播放器区域 -->
        <section class="max-w-4xl mx-auto py-12 md:py-16">
          <div class="text-center mb-8">
            <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warm-500/10 border border-warm-500/20 mb-6">
              <Moon class="w-4 h-4 text-warm-400" />
              <span class="text-warm-300 text-sm tracking-wider">今晚的星光</span>
            </div>
          </div>
          
          <AudioPlayer :story="currentStory" />
        </section>
        
        <!-- 晚安语区域 -->
        <section class="max-w-2xl mx-auto py-12 md:py-16">
          <div class="text-center">
            <div class="inline-block mb-6">
              <span class="text-warm-400 text-2xl">✦</span>
            </div>
            <p class="font-serif text-xl md:text-2xl text-warm-100 leading-relaxed font-light">
              "{{ currentStory.goodnightText }}"
            </p>
            <div class="mt-6">
              <span class="text-night-400 text-sm">—— 灵川</span>
            </div>
          </div>
        </section>
        
        <!-- 向下滚动提示 -->
        <div class="flex justify-center pb-8">
          <button
            @click="scrollToComments"
            class="flex flex-col items-center gap-2 text-night-400 hover:text-warm-400 transition-colors duration-300 group"
          >
            <span class="text-xs tracking-wider">树洞在下面</span>
            <ChevronDown class="w-5 h-5 animate-bounce" />
          </button>
        </div>
        
        <!-- 评论区 -->
        <section id="comments-section" class="max-w-4xl mx-auto py-12 md:py-16">
          <CommentSection :story-id="currentStory.id" />
        </section>
      </template>
      
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
  </div>
</template>
