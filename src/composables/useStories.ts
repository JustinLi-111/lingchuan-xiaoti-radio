import { ref, computed, onMounted } from 'vue'

export interface Story {
  id: number
  title: string
  subtitle: string
  date: string
  starNumber: number
  audioUrl: string
  audioFileName: string
  duration: string
  goodnightText: string
}

export interface Comment {
  id: number
  storyId: number
  content: string
  createdAt: string
  avatar?: string
}

const STORIES_KEY = 'starry_stories'
const ADMIN_KEY = 'starry_admin'
const ADMIN_PASSWORD = 'adminxiaoti'

const stories = ref<Story[]>([])
const isAdmin = ref(false)

export function useStories() {
  const loadStories = () => {
    const stored = localStorage.getItem(STORIES_KEY)
    if (stored) {
      stories.value = JSON.parse(stored)
    } else {
      stories.value = []
    }
  }

  const saveStories = () => {
    localStorage.setItem(STORIES_KEY, JSON.stringify(stories.value))
  }

  const latestStory = computed(() => {
    if (stories.value.length === 0) return null
    return stories.value[0]
  })

  const addStory = (story: Omit<Story, 'id' | 'starNumber' | 'date' | 'subtitle'>) => {
    const now = new Date()
    const starNumber = stories.value.length + 1
    const dateStr = now.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(/\//g, '-')

    const newStory: Story = {
      id: Date.now(),
      title: story.title,
      subtitle: `第 ${starNumber} 颗星`,
      date: dateStr,
      starNumber,
      audioUrl: story.audioUrl,
      audioFileName: story.audioFileName,
      duration: story.duration || '00:00',
      goodnightText: story.goodnightText,
    }

    stories.value.unshift(newStory)
    saveStories()
    return newStory
  }

  const deleteStory = (id: number) => {
    stories.value = stories.value.filter(s => s.id !== id)
    stories.value.forEach((story, index) => {
      story.starNumber = stories.value.length - index
      story.subtitle = `第 ${story.starNumber} 颗星`
    })
    saveStories()
  }

  const checkAdmin = () => {
    const adminStatus = sessionStorage.getItem(ADMIN_KEY)
    isAdmin.value = adminStatus === 'true'
    return isAdmin.value
  }

  const loginAdmin = (password: string) => {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_KEY, 'true')
      isAdmin.value = true
      return true
    }
    return false
  }

  const logoutAdmin = () => {
    sessionStorage.removeItem(ADMIN_KEY)
    isAdmin.value = false
  }

  onMounted(() => {
    loadStories()
    checkAdmin()
  })

  return {
    stories,
    isAdmin,
    latestStory,
    loadStories,
    addStory,
    deleteStory,
    checkAdmin,
    loginAdmin,
    logoutAdmin,
  }
}
