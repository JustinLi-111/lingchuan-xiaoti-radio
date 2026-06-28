import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

export interface Story {
  id: number
  title: string
  audio_url: string
  audio_file_name?: string
  duration: string
  description: string
  created_at: string
  star_number: number
  // 前端兼容字段
  subtitle: string
  date: string
  goodnightText: string
  audioUrl: string
  audioFileName: string
}

export interface Comment {
  id: number
  story_id: number
  content: string
  created_at: string
  // 前端兼容字段
  storyId: number
  createdAt: string
}

const stories = ref<Story[]>([])
const isAdmin = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'adminxiaoti'
const ADMIN_KEY = 'starry_admin'

// 将数据库字段映射为前端兼容格式
const mapStory = (dbStory: any): Story => {
  const dateStr = new Date(dbStory.created_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-')

  return {
    ...dbStory,
    subtitle: `第 ${dbStory.star_number} 颗星`,
    date: dateStr,
    goodnightText: dbStory.description,
    audioUrl: dbStory.audio_url,
    audioFileName: dbStory.audio_file_name || '',
  }
}

// 将数据库字段映射为前端兼容格式
const mapComment = (dbComment: any): Comment => {
  return {
    ...dbComment,
    storyId: dbComment.story_id,
    createdAt: new Date(dbComment.created_at).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

export function useSupabaseStories() {
  // 获取所有故事
  const fetchStories = async () => {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('stories')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      stories.value = data.map(mapStory)
    } catch (err: any) {
      console.error('获取故事失败:', err)
      error.value = err.message
      // 如果 Supabase 未配置，尝试使用 LocalStorage 作为备用
      const stored = localStorage.getItem('starry_stories')
      if (stored) {
        stories.value = JSON.parse(stored)
      }
    } finally {
      loading.value = false
    }
  }

  // 获取最新故事
  const latestStory = computed(() => {
    if (stories.value.length === 0) return null
    return stories.value[0]
  })

  // 获取指定故事的评论
  const fetchComments = async (storyId: number): Promise<Comment[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('comments')
        .select('*')
        .eq('story_id', storyId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      return data.map(mapComment)
    } catch (err: any) {
      console.error('获取评论失败:', err)
      // LocalStorage 备用
      const stored = localStorage.getItem(`comments-${storyId}`)
      return stored ? JSON.parse(stored) : []
    }
  }

  // 提交评论到树洞
  const submitComment = async (storyId: number, content: string): Promise<Comment | null> => {
    try {
      const { data, error: insertError } = await supabase
        .from('comments')
        .insert({
          story_id: storyId,
          content: content.trim(),
        })
        .select()
        .single()

      if (insertError) throw insertError

      return mapComment(data)
    } catch (err: any) {
      console.error('提交评论失败:', err)
      // LocalStorage 备用
      const comment: Comment = {
        id: Date.now(),
        story_id: storyId,
        storyId,
        content: content.trim(),
        created_at: new Date().toISOString(),
        createdAt: new Date().toLocaleString('zh-CN'),
      }
      const stored = localStorage.getItem(`comments-${storyId}`)
      const comments = stored ? JSON.parse(stored) : []
      comments.unshift(comment)
      localStorage.setItem(`comments-${storyId}`, JSON.stringify(comments))
      return comment
    }
  }

  // 添加新故事（管理员功能）
  const addStory = async (storyData: {
    title: string
    audioUrl: string
    audioFileName: string
    duration: string
    goodnightText: string
  }): Promise<Story | null> => {
    try {
      // 计算星星编号
      const starNumber = stories.value.length + 1

      const { data, error: insertError } = await supabase
        .from('stories')
        .insert({
          title: storyData.title,
          audio_url: storyData.audioUrl,
          audio_file_name: storyData.audioFileName,
          duration: storyData.duration,
          description: storyData.goodnightText,
          star_number: starNumber,
        })
        .select()
        .single()

      if (insertError) throw insertError

      const newStory = mapStory(data)
      stories.value.unshift(newStory)
      return newStory
    } catch (err: any) {
      console.error('添加故事失败:', err)
      return null
    }
  }

  // 删除故事（管理员功能）
  const deleteStory = async (id: number) => {
    try {
      const { error: deleteError } = await supabase
        .from('stories')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      stories.value = stories.value.filter(s => s.id !== id)
      // 重新编号
      stories.value.forEach((story, index) => {
        story.star_number = stories.value.length - index
        story.subtitle = `第 ${story.star_number} 颗星`
      })
    } catch (err: any) {
      console.error('删除故事失败:', err)
    }
  }

  // 管理员验证
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

  // 初始化
  const init = async () => {
    await fetchStories()
    checkAdmin()
  }

  onMounted(() => {
    init()
  })

  return {
    stories,
    isAdmin,
    loading,
    error,
    latestStory,
    fetchStories,
    fetchComments,
    submitComment,
    addStory,
    deleteStory,
    checkAdmin,
    loginAdmin,
    logoutAdmin,
    init,
  }
}