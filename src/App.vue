<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import StarryBackground from '@/components/StarryBackground.vue'
import ClickStardust from '@/components/ClickStardust.vue'
import { useStarrySky } from '@/composables/useStarrySky'

const route = useRoute()
const { requestShootingStar } = useStarrySky()

// 每次换页，让一颗流星替我们把上一页送走
watch(
  () => route.path,
  () => requestShootingStar(),
)
</script>

<template>
  <div class="relative min-h-screen">
    <StarryBackground />

    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" :key="route.path" />
      </transition>
    </router-view>

    <ClickStardust />
  </div>
</template>
