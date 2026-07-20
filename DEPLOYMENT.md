# 彤彤星空广播站 - Supabase + Vercel 部署指南

本指南将帮助你把星空广播站从本地开发环境部署到互联网上，让它拥有自己的域名，可以被公开访问。

---

## 📋 部署流程概览

```
1. 注册 Supabase → 2. 创建数据库表 → 3. 配置音频存储 → 4. 配置前端环境变量 → 5. 部署到 Vercel → 6. 公网访问！
```

---

## 第一步：注册 Supabase 并创建项目

### 1.1 注册 Supabase

1. 打开浏览器，访问 **https://supabase.com**
2. 点击右上角 **"Start your project"**
3. 使用 GitHub 账号登录（推荐）或邮箱注册
4. 登录后进入 Dashboard

### 1.2 创建新项目

1. 在 Dashboard 点击 **"New Project"**
2. 选择组织（默认只有一个）
3. 填写项目信息：
   - **Name**: `starry-radio`（或其他你喜欢的名字）
   - **Database Password**: 设置一个强密码（记住它，后面可能需要）
   - **Region**: 选择 `Northeast Asia (Tokyo)`（离中国最近，速度快）
4. 点击 **"Create new project"**
5. 等待约 2 分钟，项目创建完成

### 1.3 获取 API 密钥

项目创建完成后，你需要获取两个关键信息：

1. 在项目 Dashboard 左侧菜单点击 **"Settings" → "API"**
2. 复制以下两个值（稍后会用到）：
   - **Project URL**: `https://xxxxxx.supabase.co`（你的项目 ID）
   - **anon public key**: 一串很长的字符串（公开密钥）

> ⚠️ 注意：anon key 是公开密钥，可以安全地放在前端代码中，不需要保密。

---

## 第二步：创建数据库表

### 2.1 打开 SQL Editor

1. 在 Supabase Dashboard 左侧菜单点击 **"SQL Editor"**
2. 点击右上角 **"New query"**

### 2.2 执行建表 SQL

复制以下 SQL 语句，粘贴到编辑器中：

```sql
-- ============================================
-- 彤彤星空广播站 - 数据库建表 SQL
-- ============================================

-- 1. 创建 stories 表（存储睡前故事）
CREATE TABLE IF NOT EXISTS stories (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,                    -- 故事标题
    audio_url TEXT NOT NULL,                -- 音频文件地址
    audio_file_name TEXT,                   -- 音频文件名
    duration TEXT DEFAULT '00:00',          -- 音频时长
    description TEXT NOT NULL,              -- 晚安语
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- 发布时间
    star_number INTEGER DEFAULT 0           -- 星星编号
);

-- 2. 创建 comments 表（存储评论）
CREATE TABLE IF NOT EXISTS comments (
    id BIGSERIAL PRIMARY KEY,
    story_id BIGINT REFERENCES stories(id) ON DELETE CASCADE,
    content TEXT NOT NULL,                  -- 评论内容
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建索引提高查询性能
CREATE INDEX IF NOT EXISTS idx_comments_story_id ON comments(story_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);

-- 4. 设置 Row Level Security（允许公开读取）
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取故事
CREATE POLICY "Allow public read stories" ON stories
    FOR SELECT USING (true);

-- 允许所有人读取评论
CREATE POLICY "Allow public read comments" ON comments
    FOR SELECT USING (true);

-- 允许所有人添加评论
CREATE POLICY "Allow public insert comments" ON comments
    FOR INSERT WITH CHECK (true);

-- 5. 创建 letters 表（存储时光信箱的信件）
CREATE TABLE IF NOT EXISTS letters (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,                    -- 信件标题
    content TEXT NOT NULL,                   -- 信件内容（长文）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- 创建时间
    read_count INTEGER DEFAULT 0             -- 阅读次数
);

-- 6. 创建 letter_comments 表（存储信件评论）
CREATE TABLE IF NOT EXISTS letter_comments (
    id BIGSERIAL PRIMARY KEY,
    letter_id BIGINT REFERENCES letters(id) ON DELETE CASCADE,
    selected_text TEXT NOT NULL,             -- 选中的文字
    comment TEXT NOT NULL,                   -- 评论内容
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 创建索引
CREATE INDEX IF NOT EXISTS idx_letter_comments_letter_id ON letter_comments(letter_id);
CREATE INDEX IF NOT EXISTS idx_letters_created_at ON letters(created_at DESC);

-- 8. 设置安全策略
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_comments ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取信件
CREATE POLICY "Allow public read letters" ON letters
    FOR SELECT USING (true);

-- 允许所有人添加信件
CREATE POLICY "Allow public insert letters" ON letters
    FOR INSERT WITH CHECK (true);

-- 允许所有人读取信件评论
CREATE POLICY "Allow public read letter_comments" ON letter_comments
    FOR SELECT USING (true);

-- 允许所有人添加信件评论
CREATE POLICY "Allow public insert letter_comments" ON letter_comments
    FOR INSERT WITH CHECK (true);
```

点击右下角 **"Run"** 按钮，看到 "Success" 表示创建成功。

### 2.3 验证表创建成功

在左侧菜单点击 **"Table Editor"**，你应该能看到四个表：
- `stories`
- `comments`
- `letters`
- `letter_comments`

---

## 第三步：创建音频存储桶

### 3.1 创建 Storage Bucket

1. 在左侧菜单点击 **"Storage"**
2. 点击 **"New bucket"**
3. 填写信息：
   - **Name**: `audio`
   - **Public bucket**: ✅ 勾选（公开访问，这样才能播放）
4. 点击 **"Create bucket"**

### 3.2 配置存储策略

创建完成后，需要设置访问策略：

1. 点击刚创建的 `audio` bucket
2. 点击右上角 **"Policies"**
3. 点击 **"New Policy"**
4. 选择 **"For full customization"**
5. 配置策略：
   ```sql
   -- 允许所有人下载/查看音频文件
   CREATE POLICY "Allow public access" ON storage.objects
   FOR SELECT USING (bucket_id = 'audio');
   
   -- 允许所有人上传音频文件（如果你想在前端上传）
   CREATE POLICY "Allow public upload" ON storage.objects
   FOR INSERT WITH CHECK (bucket_id = 'audio');
   ```
   
   或者简单点，直接勾选 "Allowed operations" 的所有选项。

---

## 第四步：配置前端环境变量

### 4.1 更新本地 .env 文件

打开项目中的 `.env` 文件，替换为你的实际值：

```env
VITE_SUPABASE_URL=https://你的项目ID.supabase.co
VITE_SUPABASE_ANON_KEY=你的anon-key
VITE_ADMIN_PASSWORD=adminxiaoti
```

> 🔐 提示：管理员密码可以改成你自己想要的密码。

### 4.2 测试本地连接

在终端运行：

```powershell
npm run dev
```

打开浏览器访问 http://localhost:5173，如果看到：
- 空状态提示"星空还在等待" = 数据库连接成功（只是没有数据）
- 报错信息 = 检查环境变量是否正确

---

## 第五步：部署到 Vercel

### 方式一：通过 GitHub（推荐）

#### 5.1 创建 GitHub 仓库

1. 打开 **https://github.com**
2. 点击右上角 **"+" → "New repository"**
3. 填写信息：
   - **Repository name**: `starry-radio`
   - **Public**（公开，可以部署）
4. 点击 **"Create repository"**

#### 5.2 推送代码到 GitHub

在本地终端执行：

```powershell
# 初始化 Git（如果还没有）
git init

# 添加所有文件
git add .

# 创建第一次提交
git commit -m "初始化彤彤星空广播站"

# 关联远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/starry-radio.git

# 推送到 GitHub
git push -u origin main
```

#### 5.3 在 Vercel 导入项目

1. 打开 **https://vercel.com**
2. 点击 **"Sign Up"**，使用 GitHub 登录
3. 登录后点击 **"Add New..." → "Project"**
4. 在列表中找到你的 `starry-radio` 仓库
5. 点击 **"Import"**

#### 5.4 配置环境变量

在 Vercel 配置页面：

1. 展开 **"Environment Variables"** 部分
2. 添加三个变量：

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://你的项目ID.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `你的anon-key` |
| `VITE_ADMIN_PASSWORD` | `adminxiaoti` |

3. 点击 **"Deploy"**

#### 5.5 等待部署完成

约 1-2 分钟后，部署完成！Vercel 会给你一个域名，类似：
- `https://starry-radio.vercel.app`

点击域名就可以访问你的网站了！

---

### 方式二：直接拖拽上传（简单但每次更新都要重新上传）

1. 打开 **https://vercel.com**，登录
2. 点击 **"Add New..." → "Project"**
3. 选择 **"Continue with GitHub"** 旁边有拖拽区域
4. 把你的项目文件夹直接拖进去
5. 配置环境变量（同上）
6. 点击 **"Deploy"**

---

## 第六步：上传第一个故事（管理员操作）

### 方式一：通过 Supabase Dashboard（推荐新手）

#### 6.1 上传音频文件

1. 在 Supabase Dashboard 点击 **"Storage" → "audio"**
2. 点击 **"Upload files"**
3. 选择你的 `.mp3` 音频文件
4. 上传完成后，点击文件名，复制 **"Public URL"**

#### 6.2 添加故事数据

1. 在 Supabase Dashboard 点击 **"Table Editor" → "stories"**
2. 点击 **"Insert row"**
3. 填写信息：

| 字段 | 示例值 |
|------|-------|
| `title` | `今晚的风很温柔` |
| `audio_url` | `https://你的项目ID.supabase.co/storage/v1/object/public/audio/文件名.mp3` |
| `audio_file_name` | `今晚的风很温柔.mp3` |
| `duration` | `08:32` |
| `description` | `愿你今晚的梦，像棉花糖一样柔软...` |
| `star_number` | `1` |

4. 点击 **"Save"**

现在打开你的网站，应该能看到第一颗星星了！

---

### 方式二：通过网站前端上传（需要配置管理员写入权限）

如果你想在前端直接上传，需要额外配置 Supabase 的写入策略：

```sql
-- 允许管理员写入故事（需要在 SQL Editor 执行）
CREATE POLICY "Allow admin insert stories" ON stories
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admin delete stories" ON stories
    FOR DELETE USING (true);

-- 允许上传音频到 storage
CREATE POLICY "Allow public upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'audio');
```

然后在前端：
1. 输入管理员密码 `adminxiaoti`
2. 点击"上传新故事"
3. 选择音频文件，填写标题和晚安语
4. 点击"点亮这颗星星"

---

## 🎉 完成！

现在你的星空广播站已经：

1. ✅ 有自己的公网域名（如 `https://starry-radio.vercel.app`）
2. ✅ 数据存储在云端（Supabase）
3. ✅ 音频文件云端存储，可以正常播放
4. ✅ 评论功能正常工作

---

## 📱 分享给彤彤

把网址发给她：
- 她输入入场密码 `zhulaoshi` 进入
- 她可以收听故事、查看往期、发表评论
- 她无法上传或删除故事（除非知道管理员密码）

---

## 🔧 后续维护

### 每天上传新故事

**推荐方式**：通过 Supabase Dashboard
1. 打开 Supabase → Storage → audio → Upload 上传 MP3
2. 打开 Supabase → Table Editor → stories → Insert row 添加记录
3. 自动显示在网站上

### 更新代码后重新部署

如果修改了代码：
```powershell
git add .
git commit -m "更新内容"
git push
```

Vercel 会自动检测更新并重新部署！

---

## 🆘 常见问题

### Q: 音频播放不出来？
检查：
1. Storage bucket 是否设置为 Public
2. audio_url 是否正确（可以点击链接直接访问测试）

### Q: 网站显示空白或报错？
检查：
1. Vercel 环境变量是否正确配置
2. Supabase URL 和 Key 是否正确

### Q: 评论提交失败？
检查：
1. comments 表的 RLS 策略是否允许 INSERT
2. 在 SQL Editor 重新执行建表 SQL

---

## 📞 需要帮助？

如果遇到问题，可以：
1. 查看 Supabase Dashboard 的 Logs（左侧菜单）
2. 查看 Vercel Dashboard 的 Deployment Logs
3. 或者告诉我具体问题，我帮你排查！

祝你的星空广播站成功上线！✨