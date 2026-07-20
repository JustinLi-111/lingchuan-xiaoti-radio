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

export interface Letter {
  id: number
  title: string
  content: string
  created_at: string
  read_count: number
  // 前端兼容字段
  date: string
}

export interface LetterComment {
  id: number
  letter_id: number
  selected_text: string
  comment: string
  created_at: string
  // 前端兼容字段
  letterId: number
  selectedText: string
  createdAt: string
}

const stories = ref<Story[]>([])
const letters = ref<Letter[]>([])
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

// 将数据库字段映射为前端兼容格式
const mapLetter = (dbLetter: any): Letter => {
  return {
    ...dbLetter,
    date: new Date(dbLetter.created_at).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(/\//g, '-'),
  }
}

// 将数据库字段映射为前端兼容格式
const mapLetterComment = (dbComment: any): LetterComment => {
  return {
    ...dbComment,
    letterId: dbComment.letter_id,
    selectedText: dbComment.selected_text,
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

  // 获取所有信件
  const fetchLetters = async () => {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('letters')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      letters.value = data.map(mapLetter)
    } catch (err: any) {
      console.error('获取信件失败:', err)
      error.value = err.message
      const stored = localStorage.getItem('starry_letters')
      if (stored) {
        letters.value = JSON.parse(stored)
      }
    } finally {
      loading.value = false
    }
  }

  // 获取指定信件的评论
  const fetchLetterComments = async (letterId: number): Promise<LetterComment[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('letter_comments')
        .select('*')
        .eq('letter_id', letterId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      return data.map(mapLetterComment)
    } catch (err: any) {
      console.error('获取信件评论失败:', err)
      const stored = localStorage.getItem(`letter_comments-${letterId}`)
      return stored ? JSON.parse(stored) : []
    }
  }

  // 提交信件评论（选中文字评论）
  const submitLetterComment = async (letterId: number, selectedText: string, comment: string): Promise<LetterComment | null> => {
    try {
      const { data, error: insertError } = await supabase
        .from('letter_comments')
        .insert({
          letter_id: letterId,
          selected_text: selectedText.trim(),
          comment: comment.trim(),
        })
        .select()
        .single()

      if (insertError) throw insertError

      return mapLetterComment(data)
    } catch (err: any) {
      console.error('提交信件评论失败:', err)
      const letterComment: LetterComment = {
        id: Date.now(),
        letter_id: letterId,
        letterId,
        selected_text: selectedText.trim(),
        selectedText: selectedText.trim(),
        comment: comment.trim(),
        created_at: new Date().toISOString(),
        createdAt: new Date().toLocaleString('zh-CN'),
      }
      const stored = localStorage.getItem(`letter_comments-${letterId}`)
      const comments = stored ? JSON.parse(stored) : []
      comments.unshift(letterComment)
      localStorage.setItem(`letter_comments-${letterId}`, JSON.stringify(comments))
      return letterComment
    }
  }

  // 添加新信件
  const addLetter = async (title: string, content: string): Promise<Letter | null> => {
    try {
      const { data, error: insertError } = await supabase
        .from('letters')
        .insert({
          title: title.trim(),
          content: content.trim(),
          read_count: 0,
        })
        .select()
        .single()

      if (insertError) throw insertError

      const newLetter = mapLetter(data)
      letters.value.unshift(newLetter)
      return newLetter
    } catch (err: any) {
      console.error('添加信件失败:', err)
      const letter: Letter = {
        id: Date.now(),
        title: title.trim(),
        content: content.trim(),
        created_at: new Date().toISOString(),
        read_count: 0,
        date: new Date().toLocaleDateString('zh-CN').replace(/\//g, '-'),
      }
      letters.value.unshift(letter)
      const stored = localStorage.getItem('starry_letters')
      const storedLetters = stored ? JSON.parse(stored) : []
      storedLetters.unshift(letter)
      localStorage.setItem('starry_letters', JSON.stringify(storedLetters))
      return letter
    }
  }

  // 更新阅读次数
  const incrementReadCount = async (letterId: number) => {
    try {
      await supabase
        .from('letters')
        .update({ read_count: supabase.rpc('increment', { value: 1 }) })
        .eq('id', letterId)
    } catch (err: any) {
      console.error('更新阅读次数失败:', err)
    }
  }

  // 删除信件（管理员功能）
  const deleteLetter = async (id: number) => {
    try {
      const { error: deleteError } = await supabase
        .from('letters')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      letters.value = letters.value.filter(l => l.id !== id)
    } catch (err: any) {
      console.error('删除信件失败:', err)
      letters.value = letters.value.filter(l => l.id !== id)
      const stored = localStorage.getItem('starry_letters')
      if (stored) {
        const storedLetters = JSON.parse(stored).filter((l: Letter) => l.id !== id)
        localStorage.setItem('starry_letters', JSON.stringify(storedLetters))
      }
    }
  }

  // 清除所有数据（管理员功能）
  const clearAllData = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      // 删除所有信件评论
      const { error: deleteLetterCommentsError } = await supabase
        .from('letter_comments')
        .delete()
        .neq('id', 0)

      if (deleteLetterCommentsError) throw new Error(`删除信件评论失败: ${deleteLetterCommentsError.message}`)

      // 删除所有信件
      const { error: deleteLettersError } = await supabase
        .from('letters')
        .delete()
        .neq('id', 0)

      if (deleteLettersError) throw new Error(`删除信件失败: ${deleteLettersError.message}`)

      // 删除所有评论
      const { error: deleteCommentsError } = await supabase
        .from('comments')
        .delete()
        .neq('id', 0)

      if (deleteCommentsError) throw new Error(`删除评论失败: ${deleteCommentsError.message}`)

      // 删除所有故事
      const { error: deleteStoriesError } = await supabase
        .from('stories')
        .delete()
        .neq('id', 0)

      if (deleteStoriesError) throw new Error(`删除故事失败: ${deleteStoriesError.message}`)

      // 清除本地缓存
      stories.value = []
      letters.value = []
      localStorage.removeItem('starry_stories')
      localStorage.removeItem('starry_letters')
      
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('comments-') || key.startsWith('letter_comments-')) {
          localStorage.removeItem(key)
        }
      })

      return { success: true }
    } catch (err: any) {
      console.error('清除所有数据失败:', err)
      return { success: false, error: err.message }
    }
  }

  // 初始化
  const init = async () => {
    await fetchStories()
    await fetchLetters()
    checkAdmin()
  }

  onMounted(() => {
    init()
  })

  return {
    stories,
    letters,
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
    fetchLetters,
    fetchLetterComments,
    submitLetterComment,
    addLetter,
    deleteLetter,
    clearAllData,
    incrementReadCount,
    init,
  }
}