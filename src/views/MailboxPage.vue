<script setup lang="ts">import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Mail, PenLine, Sparkles, Eye } from 'lucide-vue-next';
import NavBar from '@/components/NavBar.vue';
import LetterCard from '@/components/LetterCard.vue';
import WriteLetterModal from '@/components/WriteLetterModal.vue';
import LetterDetail from '@/components/LetterDetail.vue';
import { useSupabaseStories } from '@/composables/useSupabaseStories';
import type { Letter } from '@/composables/useSupabaseStories';
const router = useRouter();
const { letters, fetchLetters, addLetter, init } = useSupabaseStories();
const showContent = ref(false);
const showUploadModal = ref(false);
const selectedLetter = ref<Letter | null>(null);
const handleOpenLetter = (letter: Letter) => {
 selectedLetter.value = letter;
};
const closeLetterDetail = () => {
 selectedLetter.value = null;
};
const openUploadModal = () => {
 showUploadModal.value = true;
};
const closeUploadModal = () => {
 showUploadModal.value = false;
};
const handleUploadSuccess = async (letter: Letter) => {
 await fetchLetters();
 showUploadModal.value = false;
 selectedLetter.value = letter;
};
const handleLetterDelete = () => {
 selectedLetter.value = null;
};
onMounted(async () => {
 const hasEntered = sessionStorage.getItem('starryEntry');
 if (hasEntered !== 'true') {
 router.push('/');
 return;
 }
 await init();
 setTimeout(() => {
 showContent.value = true;
 }, 200);
});
</script>

<template>
  <div class="relative min-h-screen overflow-hidden">
    <NavBar />
    
    <div 
      class="relative z-10 pt-24 pb-16 px-6 transition-all duration-700 ease-out"
      :class="showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
    >
      <!-- 标题区域 -->
      <section v-reveal class="max-w-4xl mx-auto py-8 md:py-12">
        <div class="text-center">
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warm-500/10 border border-warm-500/20 mb-6">
            <Mail class="w-4 h-4 text-warm-400" />
            <span class="text-warm-300 text-sm tracking-wider">时光信箱</span>
          </div>
          
          <h1 class="font-serif text-3xl md:text-4xl font-light text-warm-100 mb-4">
            星空来信
          </h1>
          <p class="text-night-400 text-sm max-w-md mx-auto">
            写下你的心事，让它在星空中漂流...
          </p>
          
          <div class="flex items-center justify-center gap-2 mt-6">
            <Sparkles class="w-4 h-4 text-warm-400" />
            <span class="text-warm-400 text-sm">
              共 {{ letters.length }} 封信件
            </span>
            <Sparkles class="w-4 h-4 text-warm-400" />
          </div>
          
          <button
            @click="openUploadModal"
            class="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-warm-500/20 text-warm-300 hover:bg-warm-500/30 transition-all duration-300 text-sm"
          >
            <PenLine class="w-4 h-4" />
            <span>写一封信</span>
          </button>
        </div>
      </section>
      
      <!-- 空状态 -->
      <section v-if="letters.length === 0" class="max-w-2xl mx-auto py-16 text-center">
        <div class="w-24 h-24 mx-auto mb-6 rounded-full bg-warm-500/10 border border-warm-500/20 flex items-center justify-center">
          <Mail class="w-10 h-10 text-warm-400 animate-pulse" />
        </div>
        <h3 class="font-serif text-xl text-warm-100 mb-3">
          信箱还是空的呢
        </h3>
        <p class="text-night-400 text-sm mb-6">
          写下第一封信，开启这段温暖的旅程吧
        </p>
        <button
          @click="openUploadModal"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-warm-500 to-warm-600 text-white text-sm font-medium hover:from-warm-400 hover:to-warm-500 transition-all duration-300 hover:shadow-warm-glow"
        >
          <PenLine class="w-4 h-4" />
          <span>写下第一封信</span>
        </button>
      </section>
      
      <!-- 信件列表 -->
      <section v-else class="max-w-4xl mx-auto py-8">
        <div class="grid gap-4 md:gap-6 relative">
          <div
            v-for="(letter, index) in letters"
            :key="letter.id"
            v-reveal="Math.min(index * 90, 450)"
            class="relative group"
          >
            <LetterCard :letter="letter" @open="handleOpenLetter" />
          </div>
        </div>
      </section>
      
      <!-- 底部提示 -->
      <section v-if="letters.length > 0" class="max-w-4xl mx-auto py-8">
        <div class="text-center">
          <div class="inline-block glass rounded-2xl px-8 py-6">
            <p class="text-night-300 text-sm leading-relaxed">
              每一封信都是一颗星星，照亮夜空的角落
            </p>
            <p class="text-night-500 text-xs mt-2">
              愿你收到温暖的回信 ✨
            </p>
          </div>
        </div>
      </section>
      
      <!-- 页脚 -->
      <footer class="max-w-4xl mx-auto pt-8 pb-4 text-center">
        <p class="text-night-600 text-xs tracking-widest">
          小华星空广播站 · 时光信箱
        </p>
        <p class="text-night-700 text-xs mt-2">
          愿你的每封信都有回音 🌙
        </p>
      </footer>
    </div>
    
    <!-- 写信弹窗 -->
    <WriteLetterModal 
      :visible="showUploadModal" 
      @close="closeUploadModal"
      @submit="handleUploadSuccess"
    />
    
    <!-- 信件详情 -->
    <LetterDetail 
      v-if="selectedLetter"
      :letter="selectedLetter"
      @close="closeLetterDetail"
      @delete="handleLetterDelete"
    />
  </div>
</template>