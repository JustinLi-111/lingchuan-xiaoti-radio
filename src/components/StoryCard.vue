<script setup lang="ts">
import { Play, Clock } from 'lucide-vue-next'
import type { Story } from '@/composables/useSupabaseStories'

defineProps<{
  story: Story
}>()

const emit = defineEmits<{
  (e: 'play', story: Story): void
}>()
</script>

<template>
  <div 
    class="group glass rounded-3xl p-6 cursor-pointer transition-all duration-500 hover:bg-white/[0.08] hover:scale-[1.02] hover:shadow-warm-glow"
    @click="emit('play', story)"
  >
    <div class="flex items-start gap-4">
      <!-- 播放按钮 -->
      <div class="relative flex-shrink-0">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-warm-400/20 to-warm-600/20 flex items-center justify-center border border-warm-500/20 transition-all duration-300 group-hover:from-warm-400/30 group-hover:to-warm-600/30">
          <Play 
            class="w-6 h-6 text-warm-400 ml-0.5 transition-transform duration-300 group-hover:scale-110" 
            :stroke-width="1.5"
          />
        </div>
        
        <!-- 星星编号 -->
        <div class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-night-800 border border-warm-500/30 flex items-center justify-center">
          <span class="text-warm-400 text-xs font-medium">{{ story.star_number }}</span>
        </div>
      </div>
      
      <!-- 信息区域 -->
      <div class="flex-1 min-w-0">
        <p class="text-warm-400/80 text-xs tracking-wider mb-1">
          {{ story.subtitle }}
        </p>
        <h4 class="font-serif text-lg text-warm-100 mb-2 truncate">
          {{ story.title }}
        </h4>
        <div class="flex items-center gap-3 text-night-400 text-xs">
          <span>{{ story.date }}</span>
          <span class="flex items-center gap-1">
            <Clock class="w-3 h-3" />
            {{ story.duration }}
          </span>
        </div>
      </div>
    </div>
    
    <!-- 晚安语预览 -->
    <p class="mt-4 text-night-300 text-sm leading-relaxed line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
      "{{ story.goodnightText }}"
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
</style>
