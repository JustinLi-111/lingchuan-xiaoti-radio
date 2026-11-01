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
  <div class="story-card group glass rounded-[26px] p-5 md:p-6 cursor-pointer" @click="emit('play', story)">
    <div class="flex items-center gap-5">
      <!-- 唱片 -->
      <div class="disc-wrap flex-shrink-0">
        <div class="disc">
          <span class="disc-grooves" />
          <span class="label">
            <span class="label-star">{{ story.star_number }}</span>
          </span>
          <span class="spindle" />
        </div>
        <span class="disc-shine" />
      </div>

      <!-- 信息 -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-2">
          <span class="track-tag">TRACK</span>
          <span class="w-6 h-px bg-warm-500/40" />
          <span class="text-warm-400/70 text-[10px] tracking-[0.24em]">{{ story.subtitle }}</span>
        </div>

        <h4 class="font-serif text-lg md:text-xl text-warm-100 mb-2 truncate transition-colors duration-300 group-hover:text-warm-50">
          {{ story.title }}
        </h4>

        <div class="flex items-center gap-3 text-night-400 text-[11px] tracking-wider">
          <span>{{ story.date }}</span>
          <span class="w-1 h-1 rounded-full bg-night-600" />
          <span class="flex items-center gap-1">
            <Clock class="w-3 h-3" />
            {{ story.duration }}
          </span>
        </div>
      </div>

      <!-- 播放 -->
      <div class="play-ring flex-shrink-0">
        <Play class="w-4 h-4 text-warm-200 ml-0.5" :stroke-width="1.8" />
      </div>
    </div>

    <!-- 悬停时卷出晚安语 -->
    <div class="goodnight-block">
      <p class="goodnight-text">
        “{{ story.goodnightText }}”
      </p>
    </div>

    <span class="sheen-sweep" />
  </div>
</template>

<style scoped>
.story-card {
  position: relative;
  overflow: hidden;
  transition:
    transform 0.55s var(--ease-out-expo),
    background-color 0.4s ease,
    border-color 0.4s ease,
    box-shadow 0.55s var(--ease-out-expo);
}

.story-card:hover {
  transform: translateY(-4px);
  border-color: rgba(245, 166, 35, 0.28);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    0 26px 46px -26px rgba(0, 0, 0, 0.9),
    0 0 44px -18px rgba(245, 166, 35, 0.55);
}

/* ---------- 黑胶 ---------- */
.disc-wrap {
  position: relative;
  width: 86px;
  height: 86px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.disc {
  position: relative;
  width: 86px;
  height: 86px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 28%, rgba(255, 255, 255, 0.12), transparent 40%),
    repeating-radial-gradient(circle at 50% 50%, #121a2c 0px, #121a2c 2px, #0a1120 3px, #0a1120 4px);
  box-shadow:
    inset 0 0 22px rgba(0, 0, 0, 0.85),
    0 10px 24px -12px rgba(0, 0, 0, 0.9);
  animation: discSpin 22s linear infinite;
  animation-play-state: paused;
  transition: transform 0.5s var(--ease-out-expo);
}

.story-card:hover .disc {
  animation-play-state: running;
  transform: scale(1.04);
}

@keyframes discSpin {
  to {
    transform: rotate(360deg);
  }
}

.disc-grooves {
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  background: repeating-radial-gradient(
    circle at 50% 50%,
    rgba(255, 255, 255, 0.05) 0px,
    rgba(255, 255, 255, 0.05) 1px,
    transparent 1px,
    transparent 4px
  );
}

.label {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 44px;
  height: 44px;
  margin: -22px 0 0 -22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 40% 34%, #ffeacb 0%, #f5a623 52%, #b96f10 100%);
  box-shadow: inset 0 0 12px rgba(120, 70, 10, 0.45);
}

.label-star {
  font-family: 'Cormorant Garamond', serif;
  font-size: 20px;
  font-weight: 600;
  color: #3a2405;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
}

.spindle {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 6px;
  height: 6px;
  margin: -3px 0 0 -3px;
  border-radius: 50%;
  background: #1b1204;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.4);
}

.disc-shine {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(from 200deg, transparent 0%, rgba(255, 255, 255, 0.14) 10%, transparent 24%, transparent 56%, rgba(255, 236, 200, 0.1) 68%, transparent 82%);
  mix-blend-mode: screen;
  pointer-events: none;
  opacity: 0.8;
}

/* ---------- 文字 ---------- */
.track-tag {
  font-family: 'Cormorant Garamond', serif;
  font-size: 10px;
  letter-spacing: 0.32em;
  color: rgba(245, 166, 35, 0.6);
}

.play-ring {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(245, 166, 35, 0.22);
  background: rgba(245, 166, 35, 0.08);
  transition: all 0.4s var(--ease-spring);
}

.story-card:hover .play-ring {
  transform: scale(1.1);
  background: rgba(245, 166, 35, 0.22);
  border-color: rgba(255, 236, 200, 0.45);
  box-shadow: 0 0 22px rgba(245, 166, 35, 0.35);
}

/* 晚安语：从折叠到展开 */
.goodnight-block {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition:
    max-height 0.55s var(--ease-out-expo),
    opacity 0.45s ease,
    margin-top 0.55s var(--ease-out-expo);
}

.story-card:hover .goodnight-block {
  max-height: 96px;
  opacity: 1;
  margin-top: 16px;
}

.goodnight-text {
  font-size: 13px;
  line-height: 1.75;
  color: rgba(203, 213, 225, 0.82);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  padding-left: 12px;
  border-left: 1px solid rgba(245, 166, 35, 0.25);
}

/* 掠过的高光 */
.sheen-sweep {
  position: absolute;
  top: -60%;
  left: -30%;
  width: 34%;
  height: 220%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.14), transparent);
  transform: rotate(16deg);
  transition: left 0.85s var(--ease-out-expo);
  pointer-events: none;
}

.story-card:hover .sheen-sweep {
  left: 120%;
}

@media (max-width: 640px) {
  .disc-wrap,
  .disc {
    width: 70px;
    height: 70px;
  }

  .label {
    width: 36px;
    height: 36px;
    margin: -18px 0 0 -18px;
  }

  .label-star {
    font-size: 16px;
  }

  .play-ring {
    display: none;
  }
}
</style>
