<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { X, MessageCircle, Send, Sparkles, Trash2 } from 'lucide-vue-next'
import { useSupabaseStories } from '@/composables/useSupabaseStories'
import type { Letter, LetterComment } from '@/composables/useSupabaseStories'

const props = defineProps<{
  letter: Letter
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'delete'): void
}>()

const { fetchLetterComments, submitLetterComment, deleteLetter, isAdmin } = useSupabaseStories()

const comments = ref<LetterComment[]>([])
const isLoadingComments = ref(false)

const newComment = ref('')
const isSubmitting = ref(false)

const LINGCHUAN_AVATAR = '/avatar-lingchuan.jpg'
const TONGTONG_AVATAR = '/avatar-tongtong.jpg'

onMounted(async () => {
  await loadComments()
})

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
  
  const author = isAdmin.value ? '灵川' : '彤彤'
  const avatar = isAdmin.value ? LINGCHUAN_AVATAR : TONGTONG_AVATAR
  const result = await submitLetterComment(
    props.letter.id,
    '',
    newComment.value,
    author,
    avatar
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
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div 
        v-if="letter" 
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      >
        <div 
          class="absolute inset-0 bg-night-900/90 backdrop-blur-md"
          @click="handleClose"
        ></div>
        
        <div class="relative w-full sm:max-w-2xl bg-[#f8f5ef] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[95vh] flex flex-col animate-slideUp">
          <div class="flex items-center justify-between p-4 md:p-6 border-b border-night-100 flex-shrink-0">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <img
                  v-if="letter.avatar"
                  :src="letter.avatar"
                  :alt="letter.author"
                  class="w-6 h-6 rounded-full object-cover"
                />
                <span class="text-warm-600 text-sm">{{ letter.author || '彤彤' }}</span>
              </div>
              <p class="text-night-400 text-xs tracking-wider mb-1">{{ letter.date }}</p>
              <h2 class="font-serif text-lg md:text-xl text-night-900">{{ letter.title }}</h2>
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
          
          <div class="flex-[2] overflow-y-auto p-4 md:p-6 min-h-0">
            <div class="letter-content whitespace-pre-wrap">
              {{ letter.content }}
            </div>
          </div>
          
          <div class="flex-[1] flex flex-col min-h-0 border-t border-night-100">
            <div class="px-4 md:px-6 py-3 flex-shrink-0">
              <div class="flex items-center gap-2">
                <MessageCircle class="w-4 h-4 text-warm-500" />
                <span class="text-night-700 text-sm font-medium">写下你的回应</span>
              </div>
            </div>
            
            <div class="flex-1 overflow-y-auto px-4 md:px-6 pb-4">
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
                    <div class="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      <img
                        :src="comment.avatar || TONGTONG_AVATAR"
                        :alt="comment.author"
                        class="w-full h-full object-cover"
                      />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-warm-600 text-sm font-medium">{{ comment.author || '彤彤' }}</span>
                        <span class="text-night-400 text-xs">{{ comment.createdAt }}</span>
                      </div>
                      <p class="text-night-700 text-sm leading-relaxed">
                        {{ comment.comment }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="h-2 bg-gradient-to-r from-warm-400 to-warm-600 flex-shrink-0"></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.letter-content {
  font-family: 'Noto Serif SC', serif;
  font-size: 15px;
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

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slideUp {
  animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>