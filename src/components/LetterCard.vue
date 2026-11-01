<script setup lang="ts">
import { Eye } from 'lucide-vue-next'
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
  <div class="letter-card group glass rounded-[26px] p-5 md:p-6 cursor-pointer" @click="handleClick">
    <div class="letter-row">
    <!-- 信封 -->
    <div class="envelope flex-shrink-0">
      <div class="env-letter">
        <span class="env-lines" />
      </div>
      <div class="env-body" />
      <div class="env-flap" />
      <div class="env-front" />
      <div class="wax-seal">✦</div>
    </div>

    <!-- 信息 -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between gap-3 mb-2">
        <div class="flex items-center gap-2 min-w-0">
          <img
            v-if="letter.avatar"
            :src="letter.avatar"
            :alt="letter.author"
            class="w-6 h-6 rounded-full object-cover border border-warm-500/30 shadow-[0_0_10px_-3px_rgba(245,166,35,0.7)]"
          />
          <span v-else class="text-warm-400 text-xs">{{ letter.author || '小华' }}</span>
          <span class="text-night-600 text-[10px] tracking-[0.2em]">·</span>
          <span class="text-night-500 text-[10px] tracking-[0.18em] truncate">{{ letter.date }}</span>
        </div>
        <span class="postmark">星夜邮寄</span>
      </div>

      <h4 class="font-serif text-lg md:text-xl text-warm-100 mb-2 truncate transition-colors duration-300 group-hover:text-warm-50">
        {{ letter.title }}
      </h4>

      <div class="flex items-center gap-3 text-night-400 text-[11px] tracking-wider">
        <span class="flex items-center gap-1">
          <Eye class="w-3 h-3" />
          {{ letter.read_count }} 人读过
        </span>
        <span class="w-1 h-1 rounded-full bg-night-600" />
        <span class="text-warm-400/70 group-hover:text-warm-300 transition-colors duration-300">展开阅读 →</span>
      </div>
    </div>
    </div>

    <!-- 悬停时露出的正文 -->
    <div class="letter-preview">
      <p class="preview-text">“{{ letter.content }}”</p>
    </div>
  </div>
</template>

<style scoped>
.letter-card {
  position: relative;
  overflow: hidden;
  transition:
    transform 0.55s var(--ease-out-expo),
    border-color 0.4s ease,
    box-shadow 0.55s var(--ease-out-expo);
}

.letter-card:hover {
  transform: translateY(-4px);
  border-color: rgba(245, 166, 35, 0.26);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    0 26px 46px -26px rgba(0, 0, 0, 0.9),
    0 0 44px -18px rgba(245, 166, 35, 0.5);
}

.letter-row {
  display: flex;
  align-items: flex-start;
  gap: 18px;
}

/* ---------- 信封 ---------- */
.envelope {
  position: relative;
  width: 84px;
  height: 62px;
  perspective: 700px;
  flex-shrink: 0;
}

.env-body {
  position: absolute;
  inset: 0;
  border-radius: 7px;
  background: linear-gradient(150deg, #f8ecd2 0%, #eddab6 62%, #ddc79f 100%);
  box-shadow:
    0 8px 18px -10px rgba(0, 0, 0, 0.85),
    inset 0 0 0 1px rgba(140, 100, 50, 0.18);
}

.env-letter {
  position: absolute;
  left: 7px;
  right: 7px;
  top: 9px;
  bottom: 5px;
  z-index: 1;
  border-radius: 4px;
  background: #fffcf3;
  box-shadow: 0 6px 14px -8px rgba(0, 0, 0, 0.65);
  transition: transform 0.6s var(--ease-out-expo), top 0.6s var(--ease-out-expo);
}

.env-lines {
  position: absolute;
  inset: 8px 6px 6px;
  background: repeating-linear-gradient(
    to bottom,
    rgba(120, 90, 50, 0.28) 0px,
    rgba(120, 90, 50, 0.28) 1px,
    transparent 1px,
    transparent 6px
  );
  opacity: 0.7;
}

.env-flap {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 60%;
  z-index: 3;
  background: linear-gradient(180deg, #f3e2c0 0%, #e3cda2 100%);
  clip-path: polygon(0 0, 100% 0, 50% 100%);
  transform-origin: top center;
  transition: transform 0.7s var(--ease-out-expo);
  box-shadow: inset 0 -1px 0 rgba(140, 100, 50, 0.18);
}

.env-front {
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: 7px;
  background: linear-gradient(165deg, rgba(255, 250, 240, 0.9) 0%, rgba(240, 226, 198, 0.95) 100%);
  clip-path: polygon(0 100%, 0 0, 50% 46%, 100% 0, 100% 100%);
  box-shadow: inset 0 0 0 1px rgba(140, 100, 50, 0.15);
}

.wax-seal {
  position: absolute;
  left: 50%;
  top: 46%;
  z-index: 4;
  width: 20px;
  height: 20px;
  margin: -10px 0 0 -10px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #ffe9c4;
  background: radial-gradient(circle at 38% 32%, #cf6a4a 0%, #a63b2b 58%, #7d2418 100%);
  box-shadow:
    inset 0 1px 2px rgba(255, 200, 170, 0.5),
    0 2px 6px rgba(0, 0, 0, 0.5);
  transition: opacity 0.45s ease, transform 0.5s var(--ease-spring);
}

/* 悬停：拆信 */
.letter-card:hover .env-flap {
  transform: rotateX(-168deg);
}

.letter-card:hover .wax-seal {
  opacity: 0;
  transform: translateY(-6px) scale(0.7);
}

.letter-card:hover .env-letter {
  top: -6px;
  transform: translateY(-6px);
}

/* ---------- 文字 ---------- */
.postmark {
  flex-shrink: 0;
  font-size: 9px;
  letter-spacing: 0.22em;
  color: rgba(245, 166, 35, 0.5);
  border: 1px solid rgba(245, 166, 35, 0.2);
  border-radius: 3px;
  padding: 2px 5px;
  transform: rotate(-4deg);
}

.letter-preview {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  margin-top: 0;
  transition:
    max-height 0.55s var(--ease-out-expo),
    opacity 0.45s ease,
    margin-top 0.55s var(--ease-out-expo);
}

.letter-card:hover .letter-preview {
  max-height: 92px;
  opacity: 1;
  margin-top: 16px;
}

.preview-text {
  font-family: 'Noto Serif SC', serif;
  font-size: 12.5px;
  line-height: 1.8;
  color: rgba(203, 213, 225, 0.8);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 640px) {
  .envelope {
    width: 66px;
    height: 50px;
  }

  .letter-row {
    gap: 14px;
  }

  .postmark {
    display: none;
  }
}
</style>
