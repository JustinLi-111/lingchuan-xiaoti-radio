<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, Upload, Music, FileAudio, Check } from 'lucide-vue-next'
import { useSupabaseStories } from '@/composables/useSupabaseStories'
import { supabase } from '@/lib/supabase'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success'): void
}>()

const { addStory } = useSupabaseStories()

const title = ref('')
const goodnightText = ref('')
const audioFile = ref<File | null>(null)
const audioUrl = ref('')
const audioFileName = ref('')
const isDragging = ref(false)
const isSubmitting = ref(false)
const showSuccess = ref(false)

const fileInputRef = ref<HTMLInputElement | null>(null)

const handleFileSelect = (file: File) => {
  if (!file.type.startsWith('audio/')) {
    alert('请选择音频文件哦~')
    return
  }
  
  audioFile.value = file
  audioFileName.value = file.name
  
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
  audioUrl.value = URL.createObjectURL(file)
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
  
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    handleFileSelect(files[0])
  }
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const onFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    handleFileSelect(files[0])
  }
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const getAudioDuration = (): Promise<string> => {
  return new Promise((resolve) => {
    if (!audioUrl.value) {
      resolve('00:00')
      return
    }
    
    const audio = new Audio(audioUrl.value)
    audio.addEventListener('loadedmetadata', () => {
      resolve(formatDuration(audio.duration))
    })
    audio.addEventListener('error', () => {
      resolve('00:00')
    })
  })
}

const handleSubmit = async () => {
  if (!title.value.trim()) {
    alert('请输入故事标题哦~')
    return
  }
  if (!audioFile.value) {
    alert('请选择音频文件哦~')
    return
  }
  if (!goodnightText.value.trim()) {
    alert('请输入晚安语哦~')
    return
  }
  
  isSubmitting.value = true
  
  try {
    const duration = await getAudioDuration()
    
    // 生成纯英文文件名，避免中文导致上传失败
    const timestamp = Date.now()
    const ext = audioFileName.value.split('.').pop() || 'm4a'
    const fileName = `story-${timestamp}.${ext}`
    
    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(fileName, audioFile.value, {
        cacheControl: '3600',
        upsert: false,
      })
    
    if (uploadError) {
      throw uploadError
    }
    
    const { data: publicUrlData } = supabase.storage
      .from('audio')
      .getPublicUrl(fileName)
    
    const publicUrl = publicUrlData.publicUrl
    
    addStory({
      title: title.value.trim(),
      audioUrl: publicUrl,
      audioFileName: audioFileName.value,
      duration,
      goodnightText: goodnightText.value.trim(),
    })
    
    showSuccess.value = true
    setTimeout(() => {
      resetForm()
      emit('success')
      emit('close')
    }, 1500)
  } catch (error: any) {
    console.error('上传失败:', error)
    alert(`上传失败了，请重试~ ${error.message || ''}`)
  } finally {
    isSubmitting.value = false
  }
}

const resetForm = () => {
  title.value = ''
  goodnightText.value = ''
  audioFile.value = null
  audioFileName.value = ''
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
  audioUrl.value = ''
  showSuccess.value = false
  isSubmitting.value = false
}

const handleClose = () => {
  resetForm()
  emit('close')
}

watch(() => props.visible, (newVal) => {
  if (!newVal) {
    resetForm()
  }
})
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="visible" 
      class="fixed inset-0 z-50 flex items-center justify-center p-6"
      @click.self="handleClose"
    >
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <div class="relative glass rounded-3xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
        <button
          @click="handleClose"
          class="absolute top-4 right-4 text-night-400 hover:text-warm-300 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
        
        <!-- 成功提示 -->
        <div v-if="showSuccess" class="py-12 text-center">
          <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-warm-500/20 flex items-center justify-center">
            <Check class="w-10 h-10 text-warm-400" />
          </div>
          <h3 class="font-serif text-2xl text-warm-100 mb-2">上传成功！</h3>
          <p class="text-night-400">新的星星已经点亮啦 ✨</p>
        </div>
        
        <!-- 上传表单 -->
        <template v-else>
          <div class="text-center mb-8">
            <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-warm-500/10 border border-warm-500/20 flex items-center justify-center">
              <Upload class="w-6 h-6 text-warm-400" />
            </div>
            <h3 class="font-serif text-2xl text-warm-100 mb-2">点亮新的星星</h3>
            <p class="text-night-400 text-sm">上传今晚的睡前故事</p>
          </div>
          
          <div class="space-y-6">
            <!-- 音频上传区域 -->
            <div>
              <label class="block text-warm-200 text-sm mb-3">音频文件</label>
              
              <div
                class="relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300"
                :class="isDragging 
                  ? 'border-warm-500 bg-warm-500/10' 
                  : 'border-night-700 hover:border-warm-500/50 hover:bg-night-800/30'"
                @drop="handleDrop"
                @dragover="handleDragOver"
                @dragleave="handleDragLeave"
                @click="triggerFileInput"
              >
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="audio/*"
                  class="hidden"
                  @change="onFileChange"
                />
                
                <div v-if="!audioFile">
                  <FileAudio class="w-12 h-12 mx-auto mb-3 text-night-500" />
                  <p class="text-night-300 text-sm mb-1">点击或拖拽音频文件到这里</p>
                  <p class="text-night-500 text-xs">支持 MP3、WAV、M4A 等格式</p>
                </div>
                
                <div v-else class="flex items-center justify-center gap-3">
                  <Music class="w-8 h-8 text-warm-400" />
                  <div class="text-left">
                    <p class="text-warm-100 text-sm font-medium truncate max-w-xs">
                      {{ audioFileName }}
                    </p>
                    <p class="text-night-400 text-xs">点击重新选择</p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 标题输入 -->
            <div>
              <label class="block text-warm-200 text-sm mb-3">故事标题</label>
              <input
                v-model="title"
                type="text"
                placeholder="给今晚的故事起个名字吧"
                class="w-full px-5 py-4 rounded-2xl bg-night-800/50 border border-night-700/50 text-warm-50 placeholder-night-500 focus:outline-none focus:border-warm-500/50 focus:ring-2 focus:ring-warm-500/20 transition-all duration-300"
                maxlength="30"
              />
            </div>
            
            <!-- 晚安语输入 -->
            <div>
              <label class="block text-warm-200 text-sm mb-3">晚安语</label>
              <textarea
                v-model="goodnightText"
                placeholder="写下今晚想对她说的话..."
                rows="3"
                class="w-full px-5 py-4 rounded-2xl bg-night-800/50 border border-night-700/50 text-warm-50 placeholder-night-500 focus:outline-none focus:border-warm-500/50 focus:ring-2 focus:ring-warm-500/20 transition-all duration-300 resize-none text-sm leading-relaxed"
                maxlength="100"
              />
              <div class="text-right text-xs text-night-500 mt-1">
                {{ goodnightText.length }}/100
              </div>
            </div>
            
            <!-- 提交按钮 -->
            <button
              @click="handleSubmit"
              :disabled="isSubmitting"
              class="w-full py-4 rounded-2xl bg-gradient-to-r from-warm-500 to-warm-600 text-white font-medium tracking-wider hover:from-warm-400 hover:to-warm-500 transition-all duration-300 hover:shadow-warm-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              <span v-if="isSubmitting">点亮中...</span>
              <span v-else>点亮这颗星星 ✨</span>
            </button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
