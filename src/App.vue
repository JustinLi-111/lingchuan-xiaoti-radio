<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import StarryBackground from '@/components/StarryBackground.vue'
import ClickStardust from '@/components/ClickStardust.vue'
import FireflyPresence from '@/components/FireflyPresence.vue'
import { useStarrySky } from '@/composables/useStarrySky'
import { usePresence } from '@/composables/usePresence'

const route = useRoute()
const { requestShootingStar } = useStarrySky()
const { start: startPresence } = usePresence()

// 每次换页，让一颗流星替我们把上一页送走
watch(
  () => route.path,
  (path) => {
    requestShootingStar()
    // 进了星门之后才开始"在场"，门口不打扰
    if (path !== '/') startPresence()
  },
)

onMounted(() => {
  if (route.path !== '/') startPresence()
})
</script>

<template>
  <div class="relative min-h-screen">
    <StarryBackground />

    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" :key="route.path" />
      </transition>
    </router-view>

    <FireflyPresence />
    <ClickStardust />
  </div>
</template>
