<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ArrowLeft, Plus, Trash2, Edit, X, Heart, Image } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useSecretGarden } from '@/composables/useSecretGarden'
import { useSupabaseStories } from '@/composables/useSupabaseStories'
import type { SecretItem } from '@/composables/useSecretGarden'

const router = useRouter()
const { items, loading, uploadImage, createItem, updateItem, deleteItem } = useSecretGarden()
const { isAdmin } = useSupabaseStories()

const showUploadModal = ref(false)
const showDetailModal = ref(false)
const selectedItem = ref<SecretItem | null>(null)
const editingItem = ref<SecretItem | null>(null)
const editingCaption = ref('')

const newCaption = ref('')
const selectedFile = ref<File | null>(null)
const previewUrl = ref('')
const isUploading = ref(false)

const fileInputRef = ref<HTMLInputElement | null>(null)

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleUpload = async () => {
  if (!selectedFile.value || !newCaption.value.trim()) return
  
  isUploading.value = true
  
  try {
    const imageUrl = await uploadImage(selectedFile.value)
    await createItem(imageUrl, newCaption.value)
    
    showUploadModal.value = false
    newCaption.value = ''
    selectedFile.value = null
    previewUrl.value = ''
  } catch (err: any) {
    console.error('上传失败:', err)
    alert('上传失败，请重试')
  } finally {
    isUploading.value = false
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file) {
    selectedFile.value = file
    previewUrl.value = URL.createObjectURL(file)
  }
}

const handleOpenDetail = (item: SecretItem) => {
  selectedItem.value = item
  showDetailModal.value = true
}

const handleCloseDetail = () => {
  showDetailModal.value = false
  selectedItem.value = null
}

const handleEdit = (item: SecretItem) => {
  editingItem.value = item
  editingCaption.value = item.caption
}

const handleSaveEdit = async () => {
  if (!editingItem.value || !editingCaption.value.trim()) return
  
  await updateItem(editingItem.value.id, editingCaption.value)
  
  editingItem.value = null
  editingCaption.value = ''
}

const handleDelete = async (item: SecretItem) => {
  if (confirm('确定要删除这个秘密吗？')) {
    await deleteItem(item.id)
  }
}

interface BonePosition {
  left: string
  top: string
  fontSize: string
  rotation: string
  delay: string
}

const getBonePositions = (count: number): BonePosition[] => {
  const positions: BonePosition[] = []
  const gridSize = 100
  const gridCols = 8
  const gridRows = 6
  const cellWidth = gridSize / gridCols
  const cellHeight = gridSize / gridRows

  const availableCells: { col: number; row: number }[] = []
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      availableCells.push({ col, row })
    }
  }

  for (let i = 0; i < Math.min(count, availableCells.length); i++) {
    const randomIndex = Math.floor(Math.random() * availableCells.length)
    const cell = availableCells.splice(randomIndex, 1)[0]

    const offsetX = (Math.random() - 0.5) * cellWidth * 0.6
    const offsetY = (Math.random() - 0.5) * cellHeight * 0.6

    const left = `${cell.col * cellWidth + cellWidth / 2 + offsetX}%`
    const top = `${cell.row * cellHeight + cellHeight / 2 + offsetY}%`
    const fontSize = `${Math.random() * 16 + 24}px`
    const rotation = `${Math.random() * 40 - 20}deg`
    const delay = `${Math.random() * 2}s`

    positions.push({ left, top, fontSize, rotation, delay })
  }

  return positions
}

const bonePositions = computed(() => {
  return getBonePositions(items.value.length)
})

const handleBack = () => {
  router.back()
}

onMounted(() => {})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-pink-900 via-rose-800 to-red-900 relative overflow-hidden">
    <div class="absolute inset-0 pointer-events-none">
      <div class="heart-floating heart-1"></div>
      <div class="heart-floating heart-2"></div>
      <div class="heart-floating heart-3"></div>
      <div class="heart-floating heart-4"></div>
      <div class="heart-floating heart-5"></div>
      <div class="heart-floating heart-6"></div>
    </div>
    
    <div class="relative z-10 container mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <button
          @click="handleBack"
          class="flex items-center gap-2 text-pink-200 hover:text-white transition-colors"
        >
          <ArrowLeft class="w-5 h-5" />
          <span class="text-sm">返回</span>
        </button>
        
        <button
          v-if="isAdmin"
          @click="showUploadModal = true"
          class="flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500 hover:bg-pink-600 text-white text-sm transition-all duration-300 shadow-lg hover:shadow-pink-500/30"
        >
          <Plus class="w-4 h-4" />
          <span>添加秘密</span>
        </button>
      </div>
      
      <div class="text-center mb-12">
        <h1 class="text-3xl md:text-4xl font-serif text-pink-100 mb-4">
          🦴 小狗乐园
        </h1>
        <p class="text-pink-300 text-sm md:text-base">
          你看起来好可爱，像我的小狗
        </p>
      </div>
      
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block w-8 h-8 border-4 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-pink-300 mt-4">正在加载...</p>
      </div>
      
      <div v-else-if="items.length === 0" class="text-center py-12">
        <div class="text-6xl mb-4">🦴</div>
        <p class="text-pink-300">还没有秘密，快来添加第一个吧</p>
      </div>
      
      <div v-else class="relative min-h-[500px]">
        <button
          v-for="(item, index) in items"
          :key="item.id"
          @click="handleOpenDetail(item)"
          class="bone-item absolute cursor-pointer transition-all duration-300 hover:scale-150 hover:drop-shadow-lg"
          :style="{
            left: bonePositions[index].left,
            top: bonePositions[index].top,
            fontSize: bonePositions[index].fontSize,
            transform: `rotate(${bonePositions[index].rotation})`,
            animationDelay: bonePositions[index].delay
          }"
        >
          🦴
        </button>
      </div>
    </div>
    
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showUploadModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showUploadModal = false"></div>
          <div class="relative bg-gradient-to-br from-pink-800 to-rose-900 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-serif text-pink-100">添加秘密</h2>
              <button @click="showUploadModal = false" class="text-pink-300 hover:text-white">
                <X class="w-6 h-6" />
              </button>
            </div>
            
            <div class="mb-4">
              <label class="block text-pink-200 text-sm mb-2">上传图片</label>
              <div
                class="relative w-full h-48 rounded-xl border-2 border-dashed border-pink-400/50 flex flex-col items-center justify-center cursor-pointer hover:border-pink-400 transition-colors"
                @click="triggerFileInput"
              >
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleFileSelect"
                />
                <template v-if="previewUrl">
                  <img :src="previewUrl" class="w-full h-full object-cover rounded-xl" />
                </template>
                <template v-else>
                  <Image class="w-10 h-10 text-pink-400 mb-2" />
                  <span class="text-pink-300 text-sm">点击选择图片</span>
                </template>
              </div>
            </div>
            
            <div class="mb-6">
              <label class="block text-pink-200 text-sm mb-2">文字注解</label>
              <textarea
                v-model="newCaption"
                placeholder="写下这段秘密的故事..."
                rows="3"
                class="w-full px-4 py-3 rounded-xl bg-white/10 border border-pink-400/30 text-pink-100 placeholder-pink-400/50 focus:outline-none focus:border-pink-400 transition-colors resize-none"
                maxlength="200"
              ></textarea>
            </div>
            
            <button
              @click="handleUpload"
              :disabled="!selectedFile || !newCaption.trim() || isUploading"
              class="w-full py-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-medium transition-colors disabled:opacity-50"
            >
              {{ isUploading ? '上传中...' : '保存秘密' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
    
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showDetailModal && selectedItem"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div class="absolute inset-0 bg-black/80 backdrop-blur-md" @click="handleCloseDetail"></div>
          <div class="relative max-w-lg w-full bg-gradient-to-br from-pink-800/95 to-rose-900/95 rounded-3xl overflow-hidden shadow-2xl animate-scaleIn">
            <button
              @click="handleCloseDetail"
              class="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
            
            <div class="aspect-[4/3]">
              <img
                :src="selectedItem.image_url"
                :alt="selectedItem.caption"
                class="w-full h-full object-cover"
              />
            </div>
            
            <div class="p-6">
              <p class="text-pink-100 text-lg font-serif leading-relaxed mb-4">
                {{ selectedItem.caption }}
              </p>
              <div class="flex items-center justify-between">
                <span class="text-pink-400 text-sm">{{ selectedItem.date }}</span>
                <div class="flex items-center gap-2">
                  <span class="flex items-center gap-1 text-pink-400 text-sm">
                    <Heart class="w-4 h-4" />
                    <span>秘密</span>
                  </span>
                  <template v-if="isAdmin">
                    <button
                      @click="handleEdit(selectedItem)"
                      class="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                    >
                      <Edit class="w-4 h-4" />
                    </button>
                    <button
                      @click="handleDelete(selectedItem)"
                      class="w-8 h-8 rounded-full bg-red-500/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500/80 transition-colors"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="editingItem"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="editingItem = null"></div>
          <div class="relative bg-gradient-to-br from-pink-800 to-rose-900 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-serif text-pink-100">编辑秘密</h2>
              <button @click="editingItem = null" class="text-pink-300 hover:text-white">
                <X class="w-6 h-6" />
              </button>
            </div>
            
            <textarea
              v-model="editingCaption"
              placeholder="编辑这段秘密的故事..."
              rows="3"
              class="w-full px-4 py-3 rounded-xl bg-white/10 border border-pink-400/30 text-pink-100 placeholder-pink-400/50 focus:outline-none focus:border-pink-400 transition-colors resize-none mb-4"
              maxlength="200"
            ></textarea>
            
            <div class="flex gap-3">
              <button
                @click="editingItem = null"
                class="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-pink-100 transition-colors"
              >
                取消
              </button>
              <button
                @click="handleSaveEdit"
                :disabled="!editingCaption.trim()"
                class="flex-1 py-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white transition-colors disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.heart-floating {
  position: absolute;
  font-size: 24px;
  opacity: 0.3;
  animation: float 6s ease-in-out infinite;
}

.bone-item {
  animation: boneFloat 4s ease-in-out infinite;
}

.heart-1 {
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}

.heart-2 {
  top: 20%;
  right: 15%;
  animation-delay: 1s;
}

.heart-3 {
  top: 60%;
  left: 20%;
  animation-delay: 2s;
}

.heart-4 {
  top: 70%;
  right: 10%;
  animation-delay: 3s;
}

.heart-5 {
  top: 40%;
  left: 80%;
  animation-delay: 4s;
}

.heart-6 {
  top: 80%;
  left: 40%;
  animation-delay: 5s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
    opacity: 0.3;
  }
  50% {
    transform: translateY(-30px) rotate(10deg);
    opacity: 0.6;
  }
}

@keyframes boneFloat {
  0%, 100% {
    transform: translateY(0) rotate(var(--initial-rotate, 0deg));
  }
  50% {
    transform: translateY(-15px) rotate(calc(var(--initial-rotate, 0deg) + 10deg));
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-scaleIn {
  animation: scaleIn 0.3s ease-out;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>