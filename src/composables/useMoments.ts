import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

export interface MomentComment {
  id: number
  moment_id: number
  content: string
  author: string
  avatar: string
  created_at: string
  date: string
}

export interface Moment {
  id: number
  content: string
  image_urls: string[]
  created_at: string
  date: string
  author: string
  avatar: string
  comments: MomentComment[]
}

const moments = ref<Moment[]>([])
const loading = ref(false)

const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target?.result as string
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法创建 Canvas 上下文'))
          return
        }

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('压缩失败'))
              return
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => {
        reject(new Error('图片加载失败'))
      }
    }
    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }
  })
}

const mapMoment = (dbMoment: any): Moment => {
  return {
    ...dbMoment,
    comments: dbMoment.comments || [],
    date: new Date(dbMoment.created_at).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(/\//g, '-'),
  }
}

const mapComment = (dbComment: any): MomentComment => {
  return {
    ...dbComment,
    date: new Date(dbComment.created_at).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(/\//g, '-'),
  }
}

export function useMoments() {
  const fetchMoments = async () => {
    loading.value = true
    try {
      const { data: momentData, error: momentError } = await supabase
        .from('moments')
        .select('*')
        .order('created_at', { ascending: false })

      if (momentError) throw momentError

      const { data: commentData, error: commentError } = await supabase
        .from('moment_comments')
        .select('*')
        .order('created_at', { ascending: false })

      if (commentError) console.warn('获取评论失败:', commentError)

      const commentsByMoment = (commentData || []).reduce((acc: Record<number, MomentComment[]>, comment) => {
        const momentId = comment.moment_id
        if (!acc[momentId]) acc[momentId] = []
        acc[momentId].push(mapComment(comment))
        return acc
      }, {})

      moments.value = momentData.map((moment: any) => ({
        ...mapMoment(moment),
        comments: commentsByMoment[moment.id] || [],
      }))
    } catch (err: any) {
      console.error('获取动态失败:', err)
      const stored = localStorage.getItem('starry_moments')
      if (stored) {
        moments.value = JSON.parse(stored)
      }
    } finally {
      loading.value = false
    }
  }

  const fetchComments = async (momentId: number): Promise<MomentComment[]> => {
    try {
      const { data, error } = await supabase
        .from('moment_comments')
        .select('*')
        .eq('moment_id', momentId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data.map(mapComment)
    } catch (err: any) {
      console.error('获取评论失败:', err)
      return []
    }
  }

  const addComment = async (momentId: number, content: string, author: string, avatar: string): Promise<MomentComment | null> => {
    try {
      const { data, error } = await supabase
        .from('moment_comments')
        .insert({
          moment_id: momentId,
          content: content.trim(),
          author,
          avatar,
        })
        .select()
        .single()

      if (error) throw error

      const newComment = mapComment(data)
      const moment = moments.value.find(m => m.id === momentId)
      if (moment) {
        moment.comments.unshift(newComment)
      }

      return newComment
    } catch (err: any) {
      console.error('添加评论失败:', err)
      return null
    }
  }

  const deleteComment = async (momentId: number, commentId: number) => {
    try {
      const { error } = await supabase
        .from('moment_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      const moment = moments.value.find(m => m.id === momentId)
      if (moment) {
        moment.comments = moment.comments.filter(c => c.id !== commentId)
      }
    } catch (err: any) {
      console.error('删除评论失败:', err)
    }
  }

  const uploadImages = async (files: File[]): Promise<string[]> => {
    const urls: string[] = []
    for (const file of files) {
      const compressedFile = await compressImage(file, 1200, 0.7)
      
      const fileName = `moment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('moments')
        .upload(fileName, compressedFile)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('moments')
        .getPublicUrl(fileName)

      urls.push(data.publicUrl)
    }
    return urls
  }

  const createMoment = async (content: string, files: File[], author: string, avatar: string): Promise<Moment | null> => {
    try {
      const imageUrls: string[] = []
      if (files.length > 0) {
        const urls = await uploadImages(files)
        imageUrls.push(...urls)
      }

      const { data, error } = await supabase
        .from('moments')
        .insert({
          content: content.trim(),
          image_urls: imageUrls,
          author,
          avatar,
        })
        .select()
        .single()

      if (error) throw error

      const newMoment = mapMoment(data)
      moments.value.unshift(newMoment)

      const stored = localStorage.getItem('starry_moments')
      const storedMoments = stored ? JSON.parse(stored) : []
      storedMoments.unshift(newMoment)
      localStorage.setItem('starry_moments', JSON.stringify(storedMoments))

      return newMoment
    } catch (err: any) {
      console.error('创建动态失败:', err)
      return null
    }
  }

  const deleteMoment = async (id: number) => {
    try {
      const { error } = await supabase
        .from('moments')
        .delete()
        .eq('id', id)

      if (error) throw error

      moments.value = moments.value.filter(m => m.id !== id)

      const stored = localStorage.getItem('starry_moments')
      if (stored) {
        const storedMoments = JSON.parse(stored).filter((m: Moment) => m.id !== id)
        localStorage.setItem('starry_moments', JSON.stringify(storedMoments))
      }
    } catch (err: any) {
      console.error('删除动态失败:', err)
    }
  }

  onMounted(() => {
    fetchMoments()
  })

  return {
    moments,
    loading,
    fetchMoments,
    createMoment,
    deleteMoment,
    fetchComments,
    addComment,
    deleteComment,
  }
}