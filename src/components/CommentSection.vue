<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { Send, Heart, MessageCircle } from 'lucide-vue-next'
import { useSupabaseStories } from '@/composables/useSupabaseStories'
import type { Comment } from '@/composables/useSupabaseStories'

const props = defineProps<{
  storyId: number
}>()

const { fetchComments, submitComment: submitToSupabase, isAdmin } = useSupabaseStories()

const comments = ref<Comment[]>([])
const newComment = ref('')
const isSubmitting = ref(false)
const showSuccess = ref(false)
const commentsContainerRef = ref<HTMLElement | null>(null)

const LINGCHUAN_AVATAR = '/avatar-lingchuan.jpg'
const TONGTONG_AVATAR = '/avatar-tongtong.jpg'

const loadComments = async () => {
  comments.value = await fetchComments(props.storyId)
}

const handleSubmit = async () => {
  if (!newComment.value.trim() || isSubmitting.value) return
  
  isSubmitting.value = true
  
  const author = isAdmin.value ? '灵川' : '彤彤'
  const avatar = isAdmin.value ? LINGCHUAN_AVATAR : TONGTONG_AVATAR
  const result = await submitToSupabase(props.storyId, newComment.value.trim(), author, avatar)
  
  if (result) {
    comments.value.unshift(result)
    newComment.value = ''
    showSuccess.value = true
    
    setTimeout(() => {
      showSuccess.value = false
    }, 2000)
    
    await nextTick()
    if (commentsContainerRef.value) {
      commentsContainerRef.value.scrollTop = 0
    }
  }
  
  isSubmitting.value = false
}

watch(() => props.storyId, () => {
  loadComments()
})

onMounted(() => {
  loadComments()
})
</script>

<template>
  <div class="w-full max-w-2xl mx-auto">
    <!-- 标题区域 -->
    <div class="text-center mb-8">
      <div class="flex items-center justify-center gap-3 mb-3">
        <MessageCircle class="w-5 h-5 text-warm-400" />
        <h3 class="font-serif text-xl text-warm-100 tracking-wider">
          树洞留言
        </h3>
        <Heart class="w-5 h-5 text-warm-400" />
      </div>
      <p class="text-night-400 text-sm">
        把想说的话放进树洞里，我会听到的
      </p>
    </div>
    
    <!-- 评论输入区 -->
    <div class="glass rounded-3xl p-6 mb-8">
      <div class="relative">
        <textarea
          v-model="newComment"
          placeholder="今天听完，有什么话想对我说吗？"
          rows="3"
          class="w-full px-5 py-4 rounded-2xl bg-night-800/50 border border-night-700/50 text-warm-50 placeholder-night-500 focus:outline-none focus:border-warm-500/50 focus:ring-2 focus:ring-warm-500/20 transition-all duration-300 resize-none text-sm leading-relaxed"
          maxlength="500"
        />
        <div class="absolute bottom-3 right-4 text-xs text-night-500">
          {{ newComment.length }}/500
        </div>
      </div>
      
      <div class="flex justify-end mt-4">
        <button
          @click="handleSubmit"
          :disabled="!newComment.trim() || isSubmitting"
          class="group flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-warm-500 to-warm-600 text-white text-sm font-medium tracking-wider hover:from-warm-400 hover:to-warm-500 transition-all duration-300 hover:shadow-warm-glow disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          <span v-if="showSuccess">已送达 ✨</span>
          <span v-else-if="isSubmitting">投递中...</span>
          <template v-else>
            <span>放入树洞</span>
            <Send class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </template>
        </button>
      </div>
    </div>
    
    <!-- 评论列表 -->
    <div 
      ref="commentsContainerRef"
      class="space-y-4 max-h-96 overflow-y-auto pr-2"
    >
      <div
        v-for="(comment, index) in comments"
        :key="comment.id"
        class="glass rounded-2xl p-5 transition-all duration-500 hover:bg-white/[0.08]"
        :style="{
          animationDelay: `${index * 0.1}s`,
        }"
      >
        <div class="flex items-start gap-4">
          <!-- 头像 -->
          <div class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-warm-500/30">
            <img
              :src="comment.avatar || TONGTONG_AVATAR"
              :alt="comment.author"
              class="w-full h-full object-cover"
            />
          </div>
          
          <!-- 评论内容 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-warm-200 text-sm font-medium">{{ comment.author || '彤彤' }}</span>
              <span class="text-night-500 text-xs">{{ comment.createdAt }}</span>
            </div>
            <p class="text-night-200 text-sm leading-relaxed break-words">
              {{ comment.content }}
            </p>
          </div>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div 
        v-if="comments.length === 0" 
        class="text-center py-12"
      >
        <div class="text-4xl mb-4">🌟</div>
        <p class="text-night-400 text-sm">
          还没有人留言，来说说你的心事吧
        </p>
      </div>
    </div>
  </div>
</template>
