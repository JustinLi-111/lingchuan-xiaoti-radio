import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

export interface SecretItem {
  id: number
  image_url: string
  caption: string
  created_at: string
  date: string
}

const items = ref<SecretItem[]>([])
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

const mapItem = (dbItem: any): SecretItem => {
  return {
    ...dbItem,
    date: new Date(dbItem.created_at).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(/\//g, '-'),
  }
}

export function useSecretGarden() {
  const fetchItems = async () => {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('secret_garden')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      items.value = data.map(mapItem)
    } catch (err: any) {
      console.error('获取秘密花园数据失败:', err)
      const stored = localStorage.getItem('secret_garden_items')
      if (stored) {
        items.value = JSON.parse(stored)
      }
    } finally {
      loading.value = false
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
    const compressedFile = await compressImage(file, 1200, 0.7)

    const fileName = `garden-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('secret_garden')
      .upload(fileName, compressedFile)

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('secret_garden')
      .getPublicUrl(fileName)

    return data.publicUrl
  }

  const createItem = async (imageUrl: string, caption: string): Promise<SecretItem | null> => {
    try {
      const { data, error } = await supabase
        .from('secret_garden')
        .insert({
          image_url: imageUrl,
          caption: caption.trim(),
        })
        .select()
        .single()

      if (error) throw error

      const newItem = mapItem(data)
      items.value.unshift(newItem)

      const stored = localStorage.getItem('secret_garden_items')
      const storedItems = stored ? JSON.parse(stored) : []
      storedItems.unshift(newItem)
      localStorage.setItem('secret_garden_items', JSON.stringify(storedItems))

      return newItem
    } catch (err: any) {
      console.error('创建秘密花园条目失败:', err)
      return null
    }
  }

  const updateItem = async (id: number, caption: string): Promise<SecretItem | null> => {
    try {
      const { data, error } = await supabase
        .from('secret_garden')
        .update({
          caption: caption.trim(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const updatedItem = mapItem(data)
      const index = items.value.findIndex(item => item.id === id)
      if (index !== -1) {
        items.value[index] = updatedItem
      }

      return updatedItem
    } catch (err: any) {
      console.error('更新秘密花园条目失败:', err)
      return null
    }
  }

  const deleteItem = async (id: number) => {
    try {
      const { error } = await supabase
        .from('secret_garden')
        .delete()
        .eq('id', id)

      if (error) throw error

      items.value = items.value.filter(item => item.id !== id)

      const stored = localStorage.getItem('secret_garden_items')
      if (stored) {
        const storedItems = JSON.parse(stored).filter((item: SecretItem) => item.id !== id)
        localStorage.setItem('secret_garden_items', JSON.stringify(storedItems))
      }
    } catch (err: any) {
      console.error('删除秘密花园条目失败:', err)
    }
  }

  onMounted(() => {
    fetchItems()
  })

  return {
    items,
    loading,
    fetchItems,
    uploadImage,
    createItem,
    updateItem,
    deleteItem,
  }
}