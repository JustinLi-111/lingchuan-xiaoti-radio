<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Star, Plus, Image, X, Trash2, Sparkles, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import NavBar from '@/components/NavBar.vue'
import { useMoments } from '@/composables/useMoments'
import { useSupabaseStories } from '@/composables/useSupabaseStories'
import { useStarrySky } from '@/composables/useStarrySky'
import { LINGCHUAN_AVATAR, XIAOHUA_AVATAR } from '@/lib/avatar'

const router = useRouter()
const { moments, loading, createMoment, deleteMoment, addComment, deleteComment } = useMoments()
const { isAdmin, checkAdmin } = useSupabaseStories()
const { requestShootingStar } = useStarrySky()

const showContent = ref(false)
const showCreateModal = ref(false)
const content = ref('')
const selectedImages = ref<File[]>([])
const imagePreviews = ref<string[]>([])
const isUploading = ref(false)
const previewImages = ref<string[]>([])
const previewIndex = ref(0)
const showPreviewModal = ref(false)
const previewImage = computed(() => previewImages.value[previewIndex.value] || '')
const commentInputs = ref<Record<number, string>>({})
const isSubmittingComment = ref<Record<number, boolean>>({})

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

const openImagePreview = (urls: string[], index: number) => {
  previewImages.value = urls
  previewIndex.value = index
  showPreviewModal.value = true
}

const closeImagePreview = () => {
  showPreviewModal.value = false
}

const stepPreview = (delta: number) => {
  const total = previewImages.value.length
  if (total <= 1) return
  previewIndex.value = (previewIndex.value + delta + total) % total
}

const handlePreviewKeydown = (e: KeyboardEvent) => {
  if (!showPreviewModal.value) return
  if (e.key === 'Escape') closeImagePreview()
  if (e.key === 'ArrowRight') stepPreview(1)
  if (e.key === 'ArrowLeft') stepPreview(-1)
}

const handleCreate = async () => {
  if (!content.value.trim() && selectedImages.value.length === 0) {
    alert('请输入内容或上传图片')
    return
  }

  isUploading.value = true
  const author = isAdmin.value ? '灵川' : '小华'
  const avatar = isAdmin.value ? LINGCHUAN_AVATAR : XIAOHUA_AVATAR
  const result = await createMoment(content.value, selectedImages.value, author, avatar)
  isUploading.value = false

  if (result) {
    content.value = ''
    selectedImages.value = []
    imagePreviews.value = []
    showCreateModal.value = false
    requestShootingStar()
  } else {
    alert('发布失败，请重试')
  }
}

const handleDelete = async (id: number) => {
  if (confirm('确定要删除这条动态吗？')) {
    await deleteMoment(id)
  }
}

const handleCommentSubmit = async (momentId: number) => {
  const commentContent = commentInputs.value[momentId]
  if (!commentContent || !commentContent.trim()) return

  isSubmittingComment.value[momentId] = true
  const author = isAdmin.value ? '灵川' : '小华'
  const avatar = isAdmin.value ? LINGCHUAN_AVATAR : XIAOHUA_AVATAR
  const result = await addComment(momentId, commentContent, author, avatar)
  isSubmittingComment.value[momentId] = false

  if (result) {
    commentInputs.value[momentId] = ''
  }
}

const handleDeleteComment = async (momentId: number, commentId: number) => {
  if (confirm('确定要删除这条评论吗？')) {
    await deleteComment(momentId, commentId)
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

  window.addEventListener('keydown', handlePreviewKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handlePreviewKeydown)
})
</script>

<template>
  <div class="relative min-h-screen overflow-hidden">
    <NavBar />
    
    <div 
      class="relative z-10 pt-24 pb-16 px-6 transition-all duration-700 ease-out"
      :class="showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
    >
      <!-- 页面标题 -->
      <section v-reveal class="max-w-2xl mx-auto mb-10">
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
      <section v-reveal="90" class="max-w-2xl mx-auto mb-8">
        <button
          @click="showCreateModal = true"
          class="w-full glass rounded-3xl p-6 flex items-center gap-4 hover:bg-white/[0.08] hover:-translate-y-0.5 transition-all duration-500 group"
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
      <section class="max-w-5xl mx-auto">
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

        <!-- 动态卡片列表：两列瀑布流 -->
        <div v-else class="columns-1 lg:columns-2 gap-6 [column-fill:_balance]">
          <div
            v-for="(moment, index) in moments"
            :key="moment.id"
            v-reveal="Math.min(index * 80, 320)"
            class="moment-card glass rounded-3xl overflow-hidden mb-6 break-inside-avoid"
          >
            <!-- 头部 -->
            <div class="px-6 py-4 flex items-center justify-between border-b border-night-700/30">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full overflow-hidden border-2 border-warm-500/30 shadow-[0_0_16px_-4px_rgba(245,166,35,0.6)]">
                  <img
                    :src="moment.avatar || XIAOHUA_AVATAR"
                    :alt="moment.author"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p class="text-warm-100 text-sm font-medium">{{ moment.author || '小华' }}</p>
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
                <div v-if="moment.image_urls.length === 1" class="rounded-2xl overflow-hidden cursor-zoom-in" @click="openImagePreview(moment.image_urls, 0)">
                  <img
                    :src="moment.image_urls[0]"
                    alt="动态图片"
                    class="img-zoom shimmer w-full h-auto object-cover"
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
                    class="img-zoom shimmer w-full h-48 object-cover cursor-zoom-in"
                    @click="openImagePreview(moment.image_urls, index)"
                  />
                </div>

                <!-- 3张图片 - 1大2小 -->
                <div v-else-if="moment.image_urls.length === 3" class="rounded-2xl overflow-hidden">
                  <img
                    :src="moment.image_urls[0]"
                    alt="动态图片"
                    class="img-zoom shimmer w-full h-48 object-cover cursor-zoom-in"
                    @click="openImagePreview(moment.image_urls, 0)"
                  />
                  <div class="grid grid-cols-2 gap-2 mt-2">
                    <img
                      :src="moment.image_urls[1]"
                      alt="动态图片"
                      class="img-zoom shimmer w-full h-24 object-cover cursor-zoom-in"
                      @click="openImagePreview(moment.image_urls, 1)"
                    />
                    <img
                      :src="moment.image_urls[2]"
                      alt="动态图片"
                      class="img-zoom shimmer w-full h-24 object-cover cursor-zoom-in"
                      @click="openImagePreview(moment.image_urls, 2)"
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
                    class="img-zoom shimmer w-full h-32 object-cover cursor-zoom-in"
                    @click="openImagePreview(moment.image_urls, index)"
                  />
                </div>

                <!-- 5-9张图片 - 九宫格 -->
                <div v-else class="grid grid-cols-3 gap-2 rounded-2xl overflow-hidden">
                  <img
                    v-for="(url, index) in moment.image_urls"
                    :key="index"
                    :src="url"
                    alt="动态图片"
                    class="img-zoom shimmer w-full h-24 object-cover cursor-zoom-in"
                    @click="openImagePreview(moment.image_urls, index)"
                  />
                </div>
              </div>
            </div>

            <!-- 评论区 -->
            <div v-if="moment.comments && moment.comments.length > 0" class="px-6 py-3 border-t border-night-700/30">
              <div class="space-y-3">
                <div
                  v-for="comment in moment.comments"
                  :key="comment.id"
                  class="flex items-start gap-3"
                >
                  <div class="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                    <img
                      :src="comment.avatar || XIAOHUA_AVATAR"
                      :alt="comment.author"
                      class="w-full h-full object-cover"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="comment-star">✦</span>
                      <span class="text-warm-300 text-xs font-medium">{{ comment.author || '小华' }}</span>
                      <span class="text-night-600 text-xs">{{ comment.date }}</span>
                      <button
                        v-if="isAdmin"
                        @click="handleDeleteComment(moment.id, comment.id)"
                        class="ml-auto p-1 text-night-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 class="w-3 h-3" />
                      </button>
                    </div>
                    <p class="text-night-300 text-sm mt-1">{{ comment.content }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 评论输入框 -->
            <div class="px-6 py-3 border-t border-night-700/30">
              <div class="flex items-center gap-3">
                <input
                  :key="moment.id"
                  v-model="commentInputs[moment.id]"
                  type="text"
                  :placeholder="`写下你的评论...`"
                  class="flex-1 px-4 py-2 rounded-full bg-night-800/50 border border-night-700/30 text-warm-50 placeholder-night-500 text-sm focus:outline-none focus:border-warm-500/50 focus:ring-2 focus:ring-warm-500/20 transition-all"
                  @keyup.enter="handleCommentSubmit(moment.id)"
                />
                <button
                  @click="handleCommentSubmit(moment.id)"
                  :disabled="!commentInputs[moment.id]?.trim() || isSubmittingComment[moment.id]"
                  class="p-2 rounded-full bg-warm-500/20 text-warm-400 hover:bg-warm-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- 底部装饰 -->
            <div class="px-6 py-3 bg-night-800/30 flex items-center gap-4 text-night-500 text-xs">
              <span>✨</span>
              <span>记录于 {{ moment.date }}</span>
              <span v-if="moment.comments && moment.comments.length > 0" class="flex items-center gap-1">
                <MessageCircle class="w-3 h-3" />
                {{ moment.comments.length }} 条评论
              </span>
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

    <!-- 图片灯箱 -->
    <Teleport to="body">
      <Transition name="lightbox">
        <div v-if="showPreviewModal" class="fixed inset-0 z-[60] flex items-center justify-center">
          <div class="absolute inset-0 bg-night-950/92 backdrop-blur-xl" @click="closeImagePreview" />

          <button class="lb-close" title="关闭" @click="closeImagePreview">
            <X class="w-5 h-5" />
          </button>

          <button
            v-if="previewImages.length > 1"
            class="lb-nav lb-prev"
            title="上一张"
            @click.stop="stepPreview(-1)"
          >
            <ChevronLeft class="w-6 h-6" />
          </button>

          <img
            :key="previewImage"
            :src="previewImage"
            alt="预览"
            class="lb-img"
            @click.stop
          />

          <button
            v-if="previewImages.length > 1"
            class="lb-nav lb-next"
            title="下一张"
            @click.stop="stepPreview(1)"
          >
            <ChevronRight class="w-6 h-6" />
          </button>

          <div v-if="previewImages.length > 1" class="lb-counter">
            {{ previewIndex + 1 }} / {{ previewImages.length }}
          </div>
        </div>
      </Transition>
    </Teleport>

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
.moment-card {
  transition: transform 0.5s var(--ease-out-expo), border-color 0.4s ease, box-shadow 0.5s var(--ease-out-expo);
}

.moment-card:hover {
  transform: translateY(-3px);
  border-color: rgba(245, 166, 35, 0.22);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 28px 50px -30px rgba(0, 0, 0, 0.9),
    0 0 40px -20px rgba(245, 166, 35, 0.5);
}

.img-zoom {
  transition: transform 0.7s var(--ease-out-expo), filter 0.5s ease;
}

.img-zoom:hover {
  transform: scale(1.035);
  filter: brightness(1.06) saturate(1.08);
}

.comment-star {
  font-size: 9px;
  color: rgba(245, 166, 35, 0.55);
}

/* ---------- 灯箱 ---------- */
.lightbox-enter-active {
  transition: opacity 0.4s ease;
}

.lightbox-leave-active {
  transition: opacity 0.25s ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

.lb-img {
  position: relative;
  z-index: 10;
  max-width: 90vw;
  max-height: 88vh;
  object-fit: contain;
  border-radius: 14px;
  box-shadow: 0 40px 90px -30px rgba(0, 0, 0, 0.95), 0 0 60px -20px rgba(245, 166, 35, 0.35);
  animation: lbIn 0.5s var(--ease-out-expo);
}

@keyframes lbIn {
  from {
    opacity: 0;
    transform: scale(0.92);
    filter: blur(12px);
  }
  to {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
}

.lb-close {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 20;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(8px);
  transition: all 0.3s var(--ease-spring);
}

.lb-close:hover {
  background: rgba(255, 255, 255, 0.18);
  transform: rotate(90deg);
}

.lb-nav {
  position: absolute;
  z-index: 20;
  top: 50%;
  width: 46px;
  height: 46px;
  margin-top: -23px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 236, 200, 0.75);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: all 0.3s var(--ease-glide);
}

.lb-nav:hover {
  color: #ffd49b;
  background: rgba(245, 166, 35, 0.18);
  border-color: rgba(245, 166, 35, 0.4);
}

.lb-prev {
  left: 22px;
}

.lb-next {
  right: 22px;
}

.lb-counter {
  position: absolute;
  bottom: 26px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  font-size: 11px;
  letter-spacing: 0.24em;
  color: rgba(245, 166, 35, 0.7);
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(245, 166, 35, 0.2);
  background: rgba(8, 17, 32, 0.6);
  backdrop-filter: blur(8px);
}

@media (max-width: 640px) {
  .lb-prev {
    left: 8px;
  }

  .lb-next {
    right: 8px;
  }

  .lb-nav {
    width: 38px;
    height: 38px;
    margin-top: -19px;
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