import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase 配置未设置，请在 .env 文件中配置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

// 把历史数据里直连 *.supabase.co 的存储地址统一改成当前配置地址（走同源代理）
export const toProxiedUrl = (url: string): string => {
  if (!url || !supabaseUrl) return url
  return url.replace(/^https:\/\/[a-z0-9]+\.supabase\.co/, supabaseUrl)
}

export default supabase