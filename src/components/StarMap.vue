<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { ZoomIn, ZoomOut, Maximize2, X, Play } from 'lucide-vue-next'
import type { Story } from '@/composables/useSupabaseStories'

const props = defineProps<{ stories: Story[] }>()
const emit = defineEmits<{ (e: 'play', story: Story): void }>()

const MAP_W = 1200
const MAP_H = 800
const ORIGIN = { x: MAP_W / 2, y: MAP_H / 2 }
const GOLDEN_ANGLE = 2.39996

interface Cluster {
  key: number
  name: string
  cx: number
  cy: number
  radius: number
  count: number
}

interface MapStar {
  story: Story
  x: number
  y: number
  r: number
  weekIndex: number
}

interface MapLine {
  x1: number
  y1: number
  x2: number
  y2: number
  weekIndex: number
}

const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

const startOfWeek = (iso: string) => {
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

const formatTime = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const MOOD_RULES: { keys: string[]; name: string }[] = [
  { keys: ['想你', '想念', '思念', '挂念'], name: '想你座' },
  { keys: ['失眠', '睡不着', '夜醒'], name: '失眠座' },
  { keys: ['雨', '落雨', '潮湿', '淋'], name: '微雨座' },
  { keys: ['好梦', '做个好梦', '晚安', '梦里'], name: '好梦座' },
  { keys: ['风', '晚风', '凉'], name: '晚风座' },
  { keys: ['月', '月亮', '银河', '星光'], name: '望月座' },
  { keys: ['累', '倦', '疲惫', '困了'], name: '倦游座' },
  { keys: ['笑', '开心', '快乐', '甜'], name: '笑意座' },
]
const FALLBACK_NAMES = ['静夜座', '守夜座', '低语座', '远行座', '长夜座', '无名座', '残灯座']

const mapData = computed(() => {
  const ascending = [...props.stories].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  const weekGroups: { key: number; stories: Story[] }[] = []
  for (const story of ascending) {
    const key = startOfWeek(story.created_at)
    const last = weekGroups[weekGroups.length - 1]
    if (last && last.key === key) last.stories.push(story)
    else weekGroups.push({ key, stories: [story] })
  }

  const usedNames = new Set<string>()
  const clusters: Cluster[] = weekGroups.map((group, index) => {
    const text = group.stories.map((s) => `${s.title} ${s.description}`).join(' ')

    let name = ''
    for (const rule of MOOD_RULES) {
      if (!usedNames.has(rule.name) && rule.keys.some((k) => text.includes(k))) {
        name = rule.name
        break
      }
    }
    if (!name) name = FALLBACK_NAMES.find((n) => !usedNames.has(n)) ?? `第 ${index + 1} 夜座`
    usedNames.add(name)

    const ring = Math.min(380, 86 * Math.sqrt(index + 1))
    const angle = index * GOLDEN_ANGLE

    return {
      key: group.key,
      name,
      cx: ORIGIN.x + Math.cos(angle) * ring,
      cy: ORIGIN.y + Math.sin(angle) * ring,
      radius: 24 + 12 * Math.sqrt(group.stories.length),
      count: group.stories.length,
    }
  })

  const stars: MapStar[] = []
  const lines: MapLine[] = []

  weekGroups.forEach((group, weekIndex) => {
    const cluster = clusters[weekIndex]
    const count = group.stories.length
    const spread = count === 1 ? 0 : Math.min(300, 52 + count * 24)
    const step = count > 1 ? spread / (count - 1) : 0

    const placed = group.stories.map((story, i) => {
      const seed = story.star_number || story.id
      const base = -90 + (i - (count - 1) / 2) * step
      const jitter = count === 1 ? 0 : (rnd(seed) - 0.5) * step * 0.32
      const distance = cluster.radius * (0.68 + 0.5 * rnd(seed + 17))
      const rad = ((base + jitter) * Math.PI) / 180
      const star: MapStar = {
        story,
        x: cluster.cx + Math.cos(rad) * distance,
        y: cluster.cy + Math.sin(rad) * distance,
        r: 2.3 + rnd(seed + 5) * 1.5,
        weekIndex,
      }
      return star
    })

    placed.forEach((star, i) => {
      stars.push(star)
      if (i > 0) {
        const prev = placed[i - 1]
        lines.push({ x1: prev.x, y1: prev.y, x2: star.x, y2: star.y, weekIndex })
      }
    })
  })

  const bounds = clusters.length
    ? clusters.reduce(
        (acc, c) => ({
          minX: Math.min(acc.minX, c.cx - c.radius),
          maxX: Math.max(acc.maxX, c.cx + c.radius),
          minY: Math.min(acc.minY, c.cy - c.radius - 20),
          maxY: Math.max(acc.maxY, c.cy + c.radius),
        }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
      )
    : null

  return { clusters, stars, lines, bounds }
})

/* ---------------- 缩放与平移 ---------------- */

const view = ref({ x: 0, y: 0, k: 1 })
const svgRef = ref<SVGSVGElement | null>(null)
const shellRef = ref<HTMLElement | null>(null)
const pxPerUnit = ref(0.5)
const dragging = ref(false)
const hovered = ref<MapStar | null>(null)
const selected = ref<Story | null>(null)

const MIN_K = 0.35
const MAX_K = 3.4
const clampK = (k: number) => Math.min(MAX_K, Math.max(MIN_K, k))

const mapTransform = computed(
  () => `translate(${view.value.x} ${view.value.y}) scale(${view.value.k})`,
)

// 屏幕上一个 viewBox 单位对应多少像素（受缩放影响后，文字/命中区仍保持固定大小）
const screenScale = computed(() => view.value.k * pxPerUnit.value)
const labelSize = computed(() => 11 / screenScale.value)
const hitRadius = computed(() => 14 / screenScale.value)
const inverseScale = computed(() => 1 / screenScale.value)
const starRadius = (star: MapStar) => Math.max(star.r, 3.4 / screenScale.value)
const glowRadius = (star: MapStar) => starRadius(star) * 4

let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  const measure = () => {
    const box = shellRef.value?.getBoundingClientRect()
    if (box && box.width) pxPerUnit.value = Math.min(box.width / MAP_W, box.height / MAP_H)
  }
  measure()
  if (shellRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(shellRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})


const fitView = () => {
  const { bounds } = mapData.value
  if (!bounds) {
    view.value = { x: 0, y: 0, k: 1 }
    return
  }
  const pad = 100
  const width = bounds.maxX - bounds.minX + pad * 2
  const height = bounds.maxY - bounds.minY + pad * 2
  const k = Math.max(0.4, Math.min(2.4, Math.min(MAP_W / width, MAP_H / height)))
  const cx = (bounds.minX + bounds.maxX) / 2
  const cy = (bounds.minY + bounds.maxY) / 2
  view.value = { k, x: ORIGIN.x - cx * k, y: ORIGIN.y - cy * k }
}

const zoomAt = (anchorX: number, anchorY: number, factor: number) => {
  const next = clampK(view.value.k * factor)
  if (next === view.value.k) return
  const ratio = next / view.value.k
  view.value = {
    k: next,
    x: anchorX - (anchorX - view.value.x) * ratio,
    y: anchorY - (anchorY - view.value.y) * ratio,
  }
}

const onWheel = (e: WheelEvent) => {
  const svg = svgRef.value
  const ctm = svg?.getScreenCTM()
  if (!svg || !ctm) return
  const point = svg.createSVGPoint()
  point.x = e.clientX
  point.y = e.clientY
  const local = point.matrixTransform(ctm.inverse())
  zoomAt(local.x, local.y, e.deltaY > 0 ? 0.88 : 1.12)
}

const dragState = { pointerId: -1, startX: 0, startY: 0, originX: 0, originY: 0, moved: 0, scale: 1 }

const onPointerDown = (e: PointerEvent) => {
  dragState.pointerId = e.pointerId
  dragState.startX = e.clientX
  dragState.startY = e.clientY
  dragState.originX = view.value.x
  dragState.originY = view.value.y
  dragState.moved = 0
  const ctm = svgRef.value?.getScreenCTM()
  dragState.scale = ctm ? Math.hypot(ctm.a, ctm.b) : 1
  dragging.value = true
  svgRef.value?.setPointerCapture(e.pointerId)
}

const onPointerMove = (e: PointerEvent) => {
  if (!dragging.value || e.pointerId !== dragState.pointerId) return
  const dx = (e.clientX - dragState.startX) / dragState.scale
  const dy = (e.clientY - dragState.startY) / dragState.scale
  dragState.moved = Math.max(
    dragState.moved,
    Math.hypot(e.clientX - dragState.startX, e.clientY - dragState.startY),
  )
  view.value = { ...view.value, x: dragState.originX + dx, y: dragState.originY + dy }
}

const onPointerUp = (e: PointerEvent) => {
  if (e.pointerId !== dragState.pointerId) return
  const moved = dragState.moved
  dragging.value = false
  dragState.pointerId = -1

  // 如果没怎么动，当作点击：命中离当前光标最近的星
  // 阈值 8px：真实鼠标点击的微小抖动通常 ≤5px，留一点余量
  if (moved <= 8) {
    const svg = svgRef.value
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return
    const point = svg.createSVGPoint()
    point.x = e.clientX
    point.y = e.clientY
    const local = point.matrixTransform(ctm.inverse())
    // 在屏幕上用固定像素半径命中，不随缩放变
    const hitPx = 18
    let nearest: MapStar | null = null
    let nearestD = Infinity
    for (const star of mapData.value.stars) {
      const dx = star.x - local.x
      const dy = star.y - local.y
      const distLocal = Math.hypot(dx, dy)
      const distScreen = distLocal * ctm.a // ctm.a ≈ view.k * pxPerUnit
      if (distScreen < hitPx && distScreen < nearestD) {
        nearestD = distScreen
        nearest = star
      }
    }
    if (nearest) selected.value = nearest.story
    else selected.value = null
  }
}

const selectStar = (star: MapStar) => {
  selected.value = star.story
}

let hasFit = false
watch(
  () => mapData.value.stars.length,
  (count) => {
    if (count > 0 && !hasFit) {
      hasFit = true
      fitView()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div
    ref="shellRef"
    class="relative rounded-3xl border border-warm-500/15 overflow-hidden"
    style="height: clamp(360px, 56vh, 620px); background: radial-gradient(ellipse at 50% 45%, rgba(24, 32, 66, 0.55) 0%, rgba(9, 12, 28, 0.72) 62%, rgba(5, 7, 18, 0.85) 100%);"
  >
    <svg
      ref="svgRef"
      :viewBox="`0 0 ${MAP_W} ${MAP_H}`"
      preserveAspectRatio="xMidYMid meet"
      class="star-map"
      :class="dragging ? 'is-dragging' : ''"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel.prevent="onWheel"
    >
      <g :transform="mapTransform">
        <!-- 星座连线 -->
        <g class="constellation-lines">
          <line
            v-for="(line, i) in mapData.lines"
            :key="`line-${i}`"
            :x1="line.x1"
            :y1="line.y1"
            :x2="line.x2"
            :y2="line.y2"
            stroke="rgba(245, 176, 90, 0.34)"
            stroke-width="1"
            stroke-linecap="round"
            vector-effect="non-scaling-stroke"
          />
        </g>

        <!-- 星座名字 -->
        <text
          v-for="cluster in mapData.clusters"
          :key="`name-${cluster.key}`"
          :x="cluster.cx"
          :y="cluster.cy - cluster.radius - 14"
          text-anchor="middle"
          :font-size="labelSize"
          fill="rgba(245, 198, 120, 0.62)"
          letter-spacing="0.18em"
          font-family="serif"
        >{{ cluster.name }}</text>

        <!-- 星星 -->
        <g
          v-for="(star, i) in mapData.stars"
          :key="`star-${star.story.id}`"
          class="star-node"
          :class="{ 'is-selected': selected?.id === star.story.id }"
          @pointerenter="hovered = star"
          @pointerleave="hovered = null"
        >
          <circle :cx="star.x" :cy="star.y" :r="hitRadius" fill="transparent" />
          <circle
            class="star-glow"
            :cx="star.x"
            :cy="star.y"
            :r="glowRadius(star)"
            fill="rgba(245, 176, 90, 0.16)"
            :style="{ animationDelay: `${(i % 9) * 140}ms` }"
          />
          <circle
            class="star-core"
            :cx="star.x"
            :cy="star.y"
            :r="starRadius(star)"
            fill="#ffe9c6"
            :style="{ animationDelay: `${(i % 7) * 180}ms` }"
          />
        </g>

        <!-- 悬停提示：发布时间 -->
        <g
          v-if="hovered"
          :transform="`translate(${hovered.x} ${hovered.y}) scale(${inverseScale})`"
          class="star-tip"
        >
          <line x1="0" y1="-26" x2="0" y2="-14" stroke="rgba(245, 198, 120, 0.5)" stroke-width="1" />
          <rect x="-68" y="-52" width="136" height="26" rx="7" fill="rgba(10, 14, 30, 0.86)" stroke="rgba(245, 166, 35, 0.32)" stroke-width="1" />
          <text x="0" y="-34" text-anchor="middle" font-size="11" fill="#fde3b3" font-family="ui-monospace, Menlo, monospace">
            {{ formatTime(hovered.story.created_at) }}
          </text>
        </g>
      </g>
    </svg>

    <!-- 缩放控件 -->
    <div class="absolute right-3 bottom-3 flex flex-col gap-2 z-20">
      <button class="map-tool" title="放大" @click="zoomAt(ORIGIN.x, ORIGIN.y, 1.25)">
        <ZoomIn class="w-4 h-4" />
      </button>
      <button class="map-tool" title="缩小" @click="zoomAt(ORIGIN.x, ORIGIN.y, 0.8)">
        <ZoomOut class="w-4 h-4" />
      </button>
      <button class="map-tool" title="归位" @click="fitView">
        <Maximize2 class="w-4 h-4" />
      </button>
    </div>

    <!-- 操作提示 -->
    <div class="absolute left-3 bottom-3 text-[10px] tracking-[0.2em] text-night-500 pointer-events-none select-none">
      拖拽平移 · 滚轮缩放 · 悬停看时间
    </div>

    <!-- 星星详情卡 -->
    <transition name="sheet">
      <div
        v-if="selected"
        class="absolute inset-x-3 bottom-14 z-30 rounded-2xl border border-warm-500/25 bg-night-900/90 backdrop-blur-md px-4 py-3"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2 text-[10px] tracking-[0.18em] text-warm-400/85 mb-1.5">
              <span>{{ selected.subtitle }}</span>
              <span class="text-night-600">·</span>
              <span>{{ formatTime(selected.created_at) }}</span>
            </div>
            <h4 class="font-serif text-base text-warm-100 truncate">{{ selected.title }}</h4>
            <p class="text-night-300 text-xs leading-relaxed mt-1 line-clamp-2">
              {{ selected.goodnightText }}
            </p>
          </div>
          <button class="text-night-400 hover:text-warm-300 transition-colors shrink-0" @click="selected = null">
            <X class="w-4 h-4" />
          </button>
        </div>

        <button
          class="mt-2.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-warm-500 to-warm-600 text-white text-[11px] font-medium hover:from-warm-400 hover:to-warm-500 transition-all duration-300"
          @click="emit('play', selected)"
        >
          <Play class="w-3 h-3" />
          <span>播放这一晚</span>
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.star-map {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
  cursor: grab;
  user-select: none;
}

.star-map.is-dragging {
  cursor: grabbing;
}

.star-node {
  cursor: pointer;
}

.star-core {
  animation: starTwinkle 4.5s ease-in-out infinite;
  transition: fill 0.25s ease;
}

.star-glow {
  animation: glowBreath 6s ease-in-out infinite;
}

.star-node:hover .star-core,
.star-node.is-selected .star-core {
  fill: #fff7e6;
}

.star-node:hover .star-glow,
.star-node.is-selected .star-glow {
  fill: rgba(255, 214, 140, 0.3);
}

@keyframes starTwinkle {
  0%, 100% { opacity: 0.82; }
  50% { opacity: 1; }
}

@keyframes glowBreath {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

.map-tool {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: rgba(245, 198, 120, 0.75);
  background: rgba(18, 22, 44, 0.7);
  border: 1px solid rgba(245, 166, 35, 0.22);
  transition: all 0.25s ease;
}

.map-tool:hover {
  color: #fde68a;
  background: rgba(245, 166, 35, 0.18);
  border-color: rgba(245, 166, 35, 0.45);
}

.sheet-enter-active,
.sheet-leave-active {
  transition: all 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
