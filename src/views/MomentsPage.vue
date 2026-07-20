<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Star, Plus, Image, X, Trash2, Sparkles } from 'lucide-vue-next'
import StarryBackground from '@/components/StarryBackground.vue'
import NavBar from '@/components/NavBar.vue'
import { useMoments } from '@/composables/useMoments'
import { useSupabaseStories } from '@/composables/useSupabaseStories'

const router = useRouter()
const { moments, loading, createMoment, deleteMoment } = useMoments()
const { isAdmin, checkAdmin } = useSupabaseStories()

const showContent = ref(false)
const showCreateModal = ref(false)
const content = ref('')
const selectedImages = ref<File[]>([])
const imagePreviews = ref<string[]>([])
const isUploading = ref(false)

const handleImageSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (!files) return

  for (let i = 0; i < files.length; i++) {
    if (selectedImages.value.length >= 9) break
    const file = files[i]
    selectedImages.value.push(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreviews.value.push(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }
}

const removeImage = (index: number) => {
  selectedImages.value.splice(index, 1)
  imagePreviews.value.splice(index, 1)
}

const handleCreate = async () => {
  if (!content.value.trim() && selectedImages.value.length === 0) {
    alert('请输入内容或上传图片')
    return
  }

  isUploading.value = true
  const result = await createMoment(content.value, selectedImages.value)
  isUploading.value = false

  if (result) {
    content.value = ''
    selectedImages.value = []
    imagePreviews.value = []
    showCreateModal.value = false
  } else {
    alert('发布失败，请重试')
  }
}

const handleDelete = async (id: number) => {
  if (confirm('确定要删除这条动态吗？')) {
    await deleteMoment(id)
  }
}

onMounted(async () => {
  const hasEntered = sessionStorage.getItem('starryEntry')
  if (hasEntered !== 'true') {
    router.push('/')
    return
  }

  checkAdmin()

  setTimeout(() => {
    showContent.value = true
  }, 200)
})
</script>

<template>
  <div class="relative min-h-screen overflow-hidden">
    <StarryBackground />
    <NavBar />
    
    <div 
      class="relative z-10 pt-24 pb-16 px-6 transition-all duration-1000 ease-out"
      :class="showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
    >
      <!-- 页面标题 -->
      <section class="max-w-2xl mx-auto mb-10">
        <div class="text-center">
          <div class="inline-flex items-center gap-3 mb-4">
            <Star class="w-6 h-6 text-warm-400 animate-pulse" />
            <h1 class="font-serif text-3xl font-light text-warm-100 tracking-widest">
              流星小记
            </h1>
            <Star class="w-6 h-6 text-warm-400 animate-pulse" />
          </div>
          <p class="text-night-400 text-sm tracking-wider">
            记录每一天的小确幸 ✨
          </p>
        </div>
      </section>

      <!-- 发布按钮 -->
      <section class="max-w-2xl mx-auto mb-8">
        <button
          @click="showCreateModal = true"
          class="w-full glass rounded-3xl p-6 flex items-center gap-4 hover:bg-white/10 transition-all duration-300 group"
        >
          <div class="w-12 h-12 rounded-full bg-warm-500/20 flex items-center justify-center group-hover:bg-warm-500/30 transition-colors">
            <Plus class="w-6 h-6 text-warm-400" />
          </div>
          <span class="text-night-400 group-hover:text-warm-300 transition-colors">
            写下今天的故事...
          </span>
        </button>
      </section>

      <!-- 动态列表 -->
      <section class="max-w-2xl mx-auto">
        <!-- 空状态 -->
        <div v-if="!loading && moments.length === 0" class="text-center py-20">
          <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-warm-500/10 border border-warm-500/20 flex items-center justify-center">
            <Sparkles class="w-8 h-8 text-warm-400 animate-pulse" />
          </div>
          <h3 class="font-serif text-xl text-warm-100 mb-3">夜空还很安静</h3>
          <p class="text-night-500 text-sm">
            来发布第一条流星小记吧 ✨
          </p>
        </div>

        <!-- 加载中 -->
        <div v-if="loading" class="text-center py-10">
          <div class="w-8 h-8 mx-auto border-2 border-warm-500/30 border-t-warm-400 rounded-full animate-spin" />
        </div>

        <!-- 动态卡片列表 -->
        <div v-else class="space-y-6">
          <div
            v-for="moment in moments"
            :key="moment.id"
            class="glass rounded-3xl overflow-hidden animate-fade-in"
          >
            <!-- 头部 -->
            <div class="px-6 py-4 flex items-center justify-between border-b border-night-700/30">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-warm-400 to-warm-600 flex items-center justify-center">
                  <span class="text-white font-serif text-sm">星</span>
                </div>
                <div>
                  <p class="text-warm-100 text-sm font-medium">彤彤</p>
                  <p class="text-night-500 text-xs">{{ moment.date }}</p>
                </div>
              </div>
              <button
                v-if="isAdmin"
                @click="handleDelete(moment.id)"
                class="p-2 rounded-lg text-night-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>

            <!-- 内容区域 -->
            <div class="px-6 py-4">
              <!-- 文字内容 -->
              <p v-if="moment.content" class="text-warm-100 leading-relaxed mb-4 whitespace-pre-wrap">
                {{ moment.content }}
              </p>

              <!-- 图片区域 - 根据图片数量动态布局 -->
              <div v-if="moment.image_urls && moment.image_urls.length > 0">
                <!-- 1张图片 - 大图展示 -->
                <div v-if="moment.image_urls.length === 1" class="rounded-2xl overflow-hidden">
                  <img
                    :src="moment.image_urls[0]"
                    alt="动态图片"
                    class="w-full h-auto object-cover hover:scale-[1.02] transition-transform duration-500"
                    style="max-height: 400px;"
                  />
                </div>

                <!-- 2张图片 - 并排展示 -->
                <div v-else-if="moment.image_urls.length === 2" class="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
                  <img
                    v-for="(url, index) in moment.image_urls"
                    :key="index"
                    :src="url"
                    alt="动态图片"
                    class="w-full h-48 object-cover hover:scale-[1.02] transition-transform duration-500"
                  />
                </div>

                <!-- 3张图片 - 1大2小 -->
                <div v-else-if="moment.image_urls.length === 3" class="rounded-2xl overflow-hidden">
                  <img
                    :src="moment.image_urls[0]"
                    alt="动态图片"
                    class="w-full h-48 object-cover hover:scale-[1.02] transition-transform duration-500"
                  />
                  <div class="grid grid-cols-2 gap-2 mt-2">
                    <img
                      :src="moment.image_urls[1]"
                      alt="动态图片"
                      class="w-full h-24 object-cover hover:scale-[1.02] transition-transform duration-500"
                    />
                    <img
                      :src="moment.image_urls[2]"
                      alt="动态图片"
                      class="w-full h-24 object-cover hover:scale-[1.02] transition-transform duration-500"
                    />
                  </div>
                </div>

                <!-- 4张图片 - 2x2 网格 -->
                <div v-else-if="moment.image_urls.length === 4" class="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
                  <img
                    v-for="(url, index) in moment.image_urls"
                    :key="index"
                    :src="url"
                    alt="动态图片"
                    class="w-full h-32 object-cover hover:scale-[1.02] transition-transform duration-500"
                  />
                </div>

                <!-- 5-9张图片 - 九宫格 -->
                <div v-else class="grid grid-cols-3 gap-2 rounded-2xl overflow-hidden">
                  <img
                    v-for="(url, index) in moment.image_urls"
                    :key="index"
                    :src="url"
                    alt="动态图片"
                    class="w-full h-24 object-cover hover:scale-[1.02] transition-transform duration-500"
                  />
                </div>
              </div>
            </div>

            <!-- 底部装饰 -->
            <div class="px-6 py-3 bg-night-800/30 flex items-center gap-4 text-night-500 text-xs">
              <span>✨</span>
              <span>记录于 {{ moment.date }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 页脚 -->
      <footer class="max-w-2xl mx-auto pt-12 pb-4 text-center">
        <p class="text-night-600 text-xs tracking-widest">
          流星划过 · 美好永存
        </p>
      </footer>
    </div>

    <!-- 发布动态弹窗 -->
    <Teleport to="body">
      <div
        v-if="showCreateModal"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        @click.self="showCreateModal = false"
      >
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div class="relative glass w-full sm:w-full max-w-md sm:rounded-3xl rounded-t-3xl p-6 animate-slide-up">
          <div class="flex items-center justify-between mb-6">
            <h3 class="font-serif text-xl text-warm-100">发布流星小记</h3>
            <button
              @click="showCreateModal = false"
              class="p-2 rounded-lg text-night-400 hover:text-warm-300 transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <textarea
            v-model="content"
            placeholder="写下今天的故事..."
            class="w-full h-32 px-4 py-3 rounded-2xl bg-night-800/50 border border-night-700/50 text-warm-50 placeholder-night-500 focus:outline-none focus:border-warm-500/50 focus:ring-2 focus:ring-warm-500/20 transition-all resize-none"
          />

          <!-- 图片预览 -->
          <div v-if="imagePreviews.length > 0" class="grid grid-cols-4 gap-2 mt-4">
            <div
              v-for="(preview, index) in imagePreviews"
              :key="index"
              class="relative aspect-square rounded-xl overflow-hidden group"
            >
              <img :src="preview" alt="预览" class="w-full h-full object-cover" />
              <button
                @click="removeImage(index)"
                class="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- 上传图片按钮 -->
          <div class="mt-4">
            <label class="flex items-center gap-3 px-4 py-3 rounded-xl bg-night-800/30 text-night-400 hover:text-warm-300 hover:bg-night-800/50 cursor-pointer transition-all">
              <Image class="w-5 h-5" />
              <span class="text-sm">{{ selectedImages.length > 0 ? `已选择 ${selectedImages.length} 张图片` : '添加图片' }} (最多9张)</span>
              <input type="file" multiple accept="image/*" class="hidden" @change="handleImageSelect" />
            </label>
          </div>

          <!-- 发布按钮 -->
          <button
            @click="handleCreate"
            :disabled="isUploading || (!content.trim() && selectedImages.length === 0)"
            class="w-full mt-6 py-3 rounded-2xl bg-gradient-to-r from-warm-500 to-warm-600 text-white font-medium tracking-wider hover:from-warm-400 hover:to-warm-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isUploading">发布中...</span>
            <span v-else>记录这一刻 ✨</span>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slideUp 0.3s ease-out;
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
</style>