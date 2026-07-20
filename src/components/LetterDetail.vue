<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { X, MessageCircle, Send, Sparkles, Trash2 } from 'lucide-vue-next'
import { useSupabaseStories } from '@/composables/useSupabaseStories'
import type { Letter, LetterComment } from '@/composables/useSupabaseStories'

const props = defineProps<{
  letter: Letter
  cardRect: DOMRect | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'delete'): void
}>()

const { fetchLetterComments, submitLetterComment, deleteLetter, isAdmin } = useSupabaseStories()

const comments = ref<LetterComment[]>([])
const isLoadingComments = ref(false)
const isAnimating = ref(false)

const newComment = ref('')
const isSubmitting = ref(false)

const dialogRef = ref<HTMLElement | null>(null)

const dialogStyle = computed(() => {
  if (!props.cardRect || isAnimating.value) {
    return {}
  }
  
  const scale = Math.min(
    props.cardRect.width / 640,
    props.cardRect.height / (window.innerHeight * 0.85)
  )
  
  const translateX = props.cardRect.left + props.cardRect.width / 2 - window.innerWidth / 2
  const translateY = props.cardRect.top + props.cardRect.height / 2 - window.innerHeight / 2
  
  return {
    transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
    opacity: '0',
    borderRadius: '1.5rem'
  }
})

onMounted(async () => {
  await loadComments()
  
  requestAnimationFrame(() => {
    isAnimating.value = true
  })
})

onUnmounted(() => {})

watch(() => props.letter, async () => {
  await loadComments()
})

const loadComments = async () => {
  isLoadingComments.value = true
  comments.value = await fetchLetterComments(props.letter.id)
  isLoadingComments.value = false
}

const handleSubmitComment = async () => {
  if (!newComment.value.trim()) return
  
  isSubmitting.value = true
  
  const result = await submitLetterComment(
    props.letter.id,
    '',
    newComment.value
  )
  
  if (result) {
    comments.value.unshift(result)
    newComment.value = ''
  }
  
  isSubmitting.value = false
}

const handleDelete = async () => {
  if (confirm('确定要删除这封信吗？')) {
    await deleteLetter(props.letter.id)
    emit('delete')
  }
}

const handleClose = () => {
  if (!dialogRef.value) {
    emit('close')
    return
  }
  
  if (props.cardRect) {
    const scale = Math.min(
      props.cardRect.width / 640,
      props.cardRect.height / (window.innerHeight * 0.85)
    )
    
    const translateX = props.cardRect.left + props.cardRect.width / 2 - window.innerWidth / 2
    const translateY = props.cardRect.top + props.cardRect.height / 2 - window.innerHeight / 2
    
    dialogRef.value.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    dialogRef.value.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`
    dialogRef.value.style.opacity = '0'
    dialogRef.value.style.borderRadius = '1.5rem'
    
    setTimeout(() => {
      emit('close')
    }, 400)
  } else {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div 
        v-if="letter" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div 
          class="absolute inset-0 bg-night-900/0 transition-all duration-500"
          :class="isAnimating ? 'bg-night-900/90 backdrop-blur-md' : ''"
          @click="handleClose"
        ></div>
        
        <div 
          ref="dialogRef"
          class="relative w-full max-w-2xl h-[85vh] overflow-hidden transform transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)"
          :style="dialogStyle"
        >
          <div class="relative letter-detail-container rounded-3xl overflow-hidden shadow-2xl h-full">
            <div class="bg-[#f8f5ef] flex flex-col h-full">
              <div class="flex items-center justify-between p-6 border-b border-night-100 flex-shrink-0">
                <div>
                  <p class="text-night-400 text-xs tracking-wider mb-1">{{ letter.date }}</p>
                  <h2 class="font-serif text-xl text-night-900">{{ letter.title }}</h2>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    v-if="isAdmin"
                    @click="handleDelete"
                    class="w-10 h-10 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all duration-300 flex items-center justify-center"
                    title="删除信件"
                  >
                    <Trash2 class="w-5 h-5" />
                  </button>
                  <button
                    @click="handleClose"
                    class="w-10 h-10 rounded-full bg-night-200/20 text-night-600 hover:bg-night-200/40 transition-all duration-300 flex items-center justify-center"
                  >
                    <X class="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div class="flex-[2] overflow-y-auto p-6 md:p-8 min-h-0">
                <div class="letter-content whitespace-pre-wrap">
                  {{ letter.content }}
                </div>
              </div>
              
              <div class="flex-[1] flex flex-col min-h-0 border-t border-night-100">
                <div class="px-6 py-4 flex-shrink-0">
                  <div class="flex items-center gap-2">
                    <MessageCircle class="w-4 h-4 text-warm-500" />
                    <span class="text-night-700 text-sm font-medium">写下你的回应</span>
                  </div>
                </div>
                
                <div class="flex-1 overflow-y-auto px-6 pb-6">
                  <div class="mb-4">
                    <textarea
                      v-model="newComment"
                      placeholder="今天读完这封信，有什么话想说吗？"
                      rows="3"
                      class="w-full px-4 py-3 rounded-xl bg-white/80 border border-night-200 text-night-800 placeholder-night-400 focus:outline-none focus:border-warm-400 focus:ring-2 focus:ring-warm-400/20 transition-all duration-300 resize-none"
                      maxlength="500"
                      @keyup.enter.exact="handleSubmitComment"
                    ></textarea>
                    <div class="flex justify-end mt-2">
                      <button
                        @click="handleSubmitComment"
                        :disabled="!newComment.trim() || isSubmitting"
                        class="px-4 py-2 rounded-xl bg-warm-500 text-white text-sm hover:bg-warm-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <Send class="w-4 h-4" />
                        <span>{{ isSubmitting ? '投递中...' : '投递' }}</span>
                      </button>
                    </div>
                  </div>
                  
                  <div v-if="comments.length === 0" class="text-center py-6">
                    <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-warm-500/10 flex items-center justify-center">
                      <Sparkles class="w-6 h-6 text-warm-400" />
                    </div>
                    <p class="text-night-400 text-sm">还没有回应，写下你的心声吧</p>
                  </div>
                  
                  <div v-else class="space-y-3">
                    <div 
                      v-for="comment in comments" 
                      :key="comment.id"
                      class="comment-item p-4 rounded-xl bg-white/60 border border-night-100"
                    >
                      <div class="flex items-start gap-3">
                        <div class="w-8 h-8 rounded-full bg-warm-500/20 flex items-center justify-center flex-shrink-0">
                          <span class="text-warm-500 text-sm">✨</span>
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-night-700 text-sm leading-relaxed">
                            {{ comment.comment }}
                          </p>
                          <p class="text-night-400 text-xs mt-2">{{ comment.createdAt }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="h-2 bg-gradient-to-r from-warm-400 to-warm-600 flex-shrink-0"></div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.4s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .letter-detail-container,
.modal-leave-to .letter-detail-container {
  transform: scale(0.95) translateY(20px);
}

.letter-detail-container {
  background: linear-gradient(to bottom, #f8f5ef, #f5f2eb);
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    inset 0 0 60px rgba(245, 166, 35, 0.05);
}

.letter-content {
  font-family: 'Noto Serif SC', serif;
  font-size: 16px;
  line-height: 1.8;
  color: #2d3748;
}

.comment-item {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>