// 头像资源与历史数据兼容：旧头像路径统一映射到新头像
export const LINGCHUAN_AVATAR = '/f52d1b93b90d9a847ca9761205376327.jpg'
export const XIAOHUA_AVATAR = '/22ac9f2d01f7211efc1f5d39a76f8e0c.jpg'

// 数据库里已经存下的旧头像路径（含 URL 编码写法），读取时统一换成新头像
const LEGACY_XIAOHUA_AVATARS = [
  '/微信图片_2026-08-06_121603_195.jpg',
  '/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_2026-08-06_121603_195.jpg',
]

export function normalizeAvatar(avatar?: string | null): string {
  if (!avatar) return ''
  return LEGACY_XIAOHUA_AVATARS.includes(avatar.trim()) ? XIAOHUA_AVATAR : avatar
}
