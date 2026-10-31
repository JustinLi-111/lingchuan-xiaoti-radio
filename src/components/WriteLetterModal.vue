<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, Send } from 'lucide-vue-next'
import { useSupabaseStories } from '@/composables/useSupabaseStories'
import type { Letter } from '@/composables/useSupabaseStories'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', letter: Letter): void
}>()

const { addLetter, isAdmin } = useSupabaseStories()

const title = ref('')
const content = ref('')
const isSubmitting = ref(false)
const showSuccess = ref(false)

const LINGCHUAN_AVATAR = '/f52d1b93b90d9a847ca9761205376327.jpg'
const TONGTONG_AVATAR = '/微信图片_2026-08-06_121603_195.jpg'

watch(() => props.visible, (val) => {
  if (val) {
    title.value = ''
    content.value = ''
    showSuccess.value = false
  }
})

const handleSubmit = async () => {
  if (!title.value.trim() || !content.value.trim()) {
    return
  }
  
  isSubmitting.value = true
  
  try {
    const author = isAdmin.value ? '灵川' : '小华'
    const avatar = isAdmin.value ? LINGCHUAN_AVATAR : TONGTONG_AVATAR
    const letter = await addLetter(title.value, content.value, author, avatar)
    if (letter) {
      showSuccess.value = true
      setTimeout(() => {
        emit('submit', letter)
      }, 1500)
    }
  } catch (err) {
    console.error('提交失败:', err)
  } finally {
    isSubmitting.value = false
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
        v-if="visible" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- 背景遮罩 -->
        <div 
          class="absolute inset-0 bg-night-900/80 backdrop-blur-sm"
          @click="handleClose"
        ></div>
        
        <!-- 弹窗内容 -->
        <div class="relative w-full max-w-lg transform">
          <!-- 信封打开动画 -->
          <div class="relative letter-paper rounded-3xl overflow-hidden shadow-2xl">
            <!-- 信纸样式背景 -->
            <div class="bg-[#fdfbf7] p-8 md:p-10">
              <!-- 关闭按钮 -->
              <button
                @click="handleClose"
                class="absolute top-4 right-4 w-8 h-8 rounded-full bg-night-200/20 text-night-600 hover:bg-night-200/40 transition-all duration-300 flex items-center justify-center"
              >
                <X class="w-4 h-4" />
              </button>
              
              <!-- 成功状态 -->
              <div v-if="showSuccess" class="text-center py-12">
                <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h3 class="font-serif text-xl text-night-800 mb-2">信已寄出 ✉️</h3>
                <p class="text-night-500 text-sm">它会在星空中漂流，等待有缘人...</p>
              </div>
              
              <!-- 写信表单 -->
              <div v-else>
                <div class="text-center mb-8">
                  <h2 class="font-serif text-2xl text-night-800 mb-2">写一封信</h2>
                  <p class="text-night-500 text-sm">写下你的心事，让它在星空中漂流</p>
                </div>
                
                <!-- 标题输入框 -->
                <div class="mb-6">
                  <label class="block text-night-600 text-sm mb-2">信的标题</label>
                  <input
                    v-model="title"
                    type="text"
                    placeholder="给这封信起个名字..."
                    class="w-full px-4 py-3 rounded-xl bg-white/60 border border-night-200 text-night-800 placeholder-night-400 focus:outline-none focus:border-warm-400 focus:ring-2 focus:ring-warm-400/20 transition-all duration-300 font-serif"
                    maxlength="50"
                  />
                </div>
                
                <!-- 内容输入框 -->
                <div class="mb-8">
                  <label class="block text-night-600 text-sm mb-2">信的内容</label>
                  <textarea
                    v-model="content"
                    placeholder="在这里写下你想说的话...&#10;&#10;可以是心事、感悟，或者对未来的期许..."
                    rows="8"
                    class="w-full px-4 py-4 rounded-xl bg-white/60 border border-night-200 text-night-800 placeholder-night-400 focus:outline-none focus:border-warm-400 focus:ring-2 focus:ring-warm-400/20 transition-all duration-300 font-serif leading-relaxed resize-none"
                    maxlength="2000"
                  ></textarea>
                  <div class="text-right mt-2">
                    <span class="text-night-400 text-xs">{{ content.length }}/2000</span>
                  </div>
                </div>
                
                <!-- 提交按钮 -->
                <button
                  @click="handleSubmit"
                  :disabled="!title.trim() || !content.trim() || isSubmitting"
                  class="w-full py-3 rounded-xl bg-gradient-to-r from-warm-500 to-warm-600 text-white font-medium hover:from-warm-400 hover:to-warm-500 transition-all duration-300 hover:shadow-warm-glow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span v-if="isSubmitting">投递中...</span>
                  <template v-else>
                    <Send class="w-4 h-4" />
                    <span>寄出这封信</span>
                  </template>
                </button>
                
                <p class="text-center text-night-400 text-xs mt-4">
                  所有信件都是匿名的，请放心倾诉
                </p>
              </div>
            </div>
            
            <!-- 底部装饰 -->
            <div class="h-2 bg-gradient-to-r from-warm-400 to-warm-600"></div>
          </div>
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

.modal-enter-from .letter-paper,
.modal-leave-to .letter-paper {
  transform: scale(0.95) translateY(20px);
}

.letter-paper {
  background: linear-gradient(to bottom, #fdfbf7, #f8f5ef);
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    inset 0 0 60px rgba(245, 166, 35, 0.05);
}
</style>