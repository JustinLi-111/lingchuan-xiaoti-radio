<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, Send, Feather } from 'lucide-vue-next'
import { useStarrySky } from '@/composables/useStarrySky'
import { useSupabaseStories } from '@/composables/useSupabaseStories'
import type { Letter } from '@/composables/useSupabaseStories'
import { LINGCHUAN_AVATAR, XIAOHUA_AVATAR } from '@/lib/avatar'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', letter: Letter): void
}>()

const { addLetter, isAdmin } = useSupabaseStories()
const { requestShootingStar } = useStarrySky()

const title = ref('')
const content = ref('')
const isSubmitting = ref(false)
const showSuccess = ref(false)

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
    const avatar = isAdmin.value ? LINGCHUAN_AVATAR : XIAOHUA_AVATAR
    const letter = await addLetter(title.value, content.value, author, avatar)
    if (letter) {
      showSuccess.value = true
      requestShootingStar()
      setTimeout(() => {
        emit('submit', letter)
      }, 1600)
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
            <div class="paper-sheet paper-grain relative bg-[#fdfbf7] p-8 md:p-10">
              <!-- 关闭按钮 -->
              <button
                @click="handleClose"
                class="absolute top-4 right-4 w-8 h-8 rounded-full bg-night-200/20 text-night-600 hover:bg-night-200/40 transition-all duration-300 flex items-center justify-center"
              >
                <X class="w-4 h-4" />
              </button>
              
              <!-- 成功状态 -->
              <div v-if="showSuccess" class="text-center py-14">
                <div class="fly-letter">
                  <span>✉</span>
                </div>
                <h3 class="font-serif text-xl text-night-800 mb-2 tracking-wider">信已寄出</h3>
                <p class="text-night-500 text-sm">它会在星空中漂流，等待有缘人…</p>
              </div>
              
              <!-- 写信表单 -->
              <div v-else>
                <div class="text-center mb-8">
                  <div class="seal-badge">
                    <Feather class="w-4 h-4" :stroke-width="1.6" />
                  </div>
                  <h2 class="font-serif text-2xl text-night-800 mb-2 tracking-[0.12em]">写一封信</h2>
                  <p class="text-night-500 text-sm">写下你的心事，让它在星空中漂流</p>
                </div>
                
                <!-- 标题输入框 -->
                <div class="mb-6">
                  <label class="block text-night-600 text-sm mb-2">信的标题</label>
                  <input
                    v-model="title"
                    type="text"
                    placeholder="给这封信起个名字..."
                    class="letter-input w-full px-1 py-3 bg-transparent border-0 border-b border-night-300/60 text-night-800 placeholder-night-400/80 focus:outline-none focus:border-warm-500 transition-all duration-300 font-serif text-lg"
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
                    class="letter-textarea w-full px-4 py-3 rounded-lg bg-white/45 border border-night-200/80 text-night-800 placeholder-night-400/80 focus:outline-none focus:border-warm-400 focus:ring-2 focus:ring-warm-400/15 transition-all duration-300 font-serif leading-relaxed resize-none text-[15px]"
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
                
                <p class="text-center text-night-400 text-[11px] tracking-[0.2em] mt-5">
                  · 所有信件都是匿名的，请放心倾诉 ·
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

/* 信纸：左侧一道淡淡的页边线 */
.paper-sheet {
  background-image: linear-gradient(
    90deg,
    transparent 30px,
    rgba(190, 150, 100, 0.16) 30px,
    rgba(190, 150, 100, 0.16) 31px,
    transparent 31px
  );
}

.seal-badge {
  width: 40px;
  height: 40px;
  margin: 0 auto 12px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b45309;
  background: radial-gradient(circle at 36% 30%, #ffe9c4, #f3d49c 62%, #e3bd7d 100%);
  box-shadow:
    inset 0 1px 2px rgba(255, 255, 255, 0.7),
    0 4px 12px -4px rgba(150, 100, 40, 0.5);
}

.letter-input::placeholder {
  letter-spacing: 0.08em;
}

.letter-textarea {
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 29px,
    rgba(190, 170, 140, 0.18) 29px,
    rgba(190, 170, 140, 0.18) 30px
  );
  line-height: 30px;
  background-attachment: local;
}

.fly-letter {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 76px;
  margin-bottom: 8px;
  animation: flyOff 1.5s var(--ease-out-expo) 0.1s both;
}

.fly-letter span {
  font-size: 34px;
  color: #b45309;
  filter: drop-shadow(0 6px 12px rgba(180, 83, 9, 0.35));
}

@keyframes flyOff {
  0% {
    opacity: 0;
    transform: translate(-10px, 18px) rotate(-8deg) scale(0.9);
  }
  28% {
    opacity: 1;
    transform: translate(0, 0) rotate(0deg) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(70px, -52px) rotate(14deg) scale(0.72);
  }
}
</style>