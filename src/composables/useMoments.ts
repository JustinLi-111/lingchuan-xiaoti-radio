import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

export interface Moment {
  id: number
  content: string
  image_urls: string[]
  created_at: string
  date: string
}

const moments = ref<Moment[]>([])
const loading = ref(false)

const mapMoment = (dbMoment: any): Moment => {
  return {
    ...dbMoment,
    date: new Date(dbMoment.created_at).toLocaleDateString('zh-CN', {
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
      const { data, error } = await supabase
        .from('moments')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      moments.value = data.map(mapMoment)
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

  const uploadImages = async (files: File[]): Promise<string[]> => {
    const urls: string[] = []
    for (const file of files) {
      const fileName = `moment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${file.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage
        .from('moments')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('moments')
        .getPublicUrl(fileName)

      urls.push(data.publicUrl)
    }
    return urls
  }

  const createMoment = async (content: string, files: File[]): Promise<Moment | null> => {
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
  }
}