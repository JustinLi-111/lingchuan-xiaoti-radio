-- ============================================
-- 彤彤星空广播站 - Supabase 数据库建表 SQL
-- ============================================
-- 请在 Supabase 控制台的 SQL Editor 中执行以下语句

-- 1. 创建 stories 表（存储睡前故事）
CREATE TABLE IF NOT EXISTS stories (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,                    -- 故事标题
    audio_url TEXT NOT NULL,                -- 音频文件地址（Supabase Storage URL）
    audio_file_name TEXT,                   -- 音频文件名
    duration TEXT DEFAULT '00:00',          -- 音频时长
    description TEXT NOT NULL,              -- 晚安语
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- 发布时间
    star_number INTEGER DEFAULT 0           -- 星星编号
);

-- 2. 创建 comments 表（存储评论）
CREATE TABLE IF NOT EXISTS comments (
    id BIGSERIAL PRIMARY KEY,
    story_id BIGINT REFERENCES stories(id) ON DELETE CASCADE,  -- 关联故事
    content TEXT NOT NULL,                  -- 评论内容
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  -- 评论时间
);

-- 3. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_comments_story_id ON comments(story_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);

-- 4. 设置 Row Level Security (RLS)
-- 允许所有人读取故事和评论（公开访问）
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取故事
CREATE POLICY "Allow public read stories" ON stories
    FOR SELECT USING (true);

-- 允许所有人读取评论
CREATE POLICY "Allow public read comments" ON comments
    FOR SELECT USING (true);

-- 允许所有人添加评论（无需登录）
CREATE POLICY "Allow public insert comments" ON comments
    FOR INSERT WITH CHECK (true);

-- 允许管理员删除故事（使用服务端角色）
CREATE POLICY "Allow admin delete stories" ON stories
    FOR DELETE USING (true);

-- 允许管理员删除评论
CREATE POLICY "Allow admin delete comments" ON comments
    FOR DELETE USING (true);

-- 允许管理员插入故事
CREATE POLICY "Allow admin insert stories" ON stories
    FOR INSERT WITH CHECK (true);

-- 允许管理员更新故事
CREATE POLICY "Allow admin update stories" ON stories
    FOR UPDATE USING (true) WITH CHECK (true);

-- 5. 创建音频文件存储桶
-- 在 Supabase Storage 中手动创建名为 'audio' 的存储桶
-- 并设置为 public（公开访问）

-- ============================================
-- 查看已创建的表
-- ============================================
SELECT * FROM stories ORDER BY created_at DESC;
SELECT * FROM comments ORDER BY created_at DESC;