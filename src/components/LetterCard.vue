<script setup lang="ts">
import { ref } from 'vue'
import { Eye, Clock } from 'lucide-vue-next'
import type { Letter } from '@/composables/useSupabaseStories'

const props = defineProps<{
  letter: Letter
}>()

const emit = defineEmits<{
  (e: 'open', letter: Letter): void
}>()

const handleClick = () => {
  emit('open', props.letter)
}
</script>

<template>
  <div 
    ref="cardRef"
    class="group letter-card glass rounded-3xl p-6 cursor-pointer transition-all duration-500 hover:bg-white/[0.08] hover:scale-[1.02] hover:shadow-warm-glow"
    @click="handleClick"
  >
    <div class="flex items-start gap-4">
      <div class="relative flex-shrink-0">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-warm-400/20 to-warm-600/20 flex items-center justify-center border border-warm-500/20 transition-all duration-300 group-hover:from-warm-400/30 group-hover:to-warm-600/30 relative overflow-hidden">
          <div class="absolute inset-0 flex items-center justify-center">
            <svg width="32" height="28" viewBox="0 0 32 28" class="text-warm-400 transition-transform duration-300 group-hover:scale-110">
              <path d="M2 8h28v14c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V8z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 8l14 8 14-8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
      
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <img
            v-if="letter.avatar"
            :src="letter.avatar"
            :alt="letter.author"
            class="w-5 h-5 rounded-full object-cover"
          />
          <span v-else class="text-warm-400 text-xs">{{ letter.author || '彤彤' }}</span>
        </div>
        <p class="text-warm-400/80 text-xs tracking-wider mb-1">
          {{ letter.date }}
        </p>
        <h4 class="font-serif text-lg text-warm-100 mb-2 truncate">
          {{ letter.title }}
        </h4>
        <div class="flex items-center gap-3 text-night-400 text-xs">
          <span class="flex items-center gap-1">
            <Eye class="w-3 h-3" />
            {{ letter.read_count }} 人读过
          </span>
        </div>
      </div>
    </div>
    
    <p class="mt-4 text-night-300 text-sm leading-relaxed line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
      "{{ letter.content.slice(0, 100) }}..."
    </p>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.letter-card {
  background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
  border: 1px solid rgba(245,166,35,0.15);
}
</style>