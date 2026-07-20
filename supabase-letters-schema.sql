CREATE TABLE IF NOT EXISTS letters (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS letter_comments (
    id BIGSERIAL PRIMARY KEY,
    letter_id BIGINT REFERENCES letters(id) ON DELETE CASCADE,
    selected_text TEXT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_letter_comments_letter_id ON letter_comments(letter_id);
CREATE INDEX IF NOT EXISTS idx_letters_created_at ON letters(created_at DESC);

ALTER TABLE letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read letters" ON letters FOR SELECT USING (true);
CREATE POLICY "Allow public insert letters" ON letters FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update letters" ON letters FOR UPDATE USING (true);

CREATE POLICY "Allow public read letter_comments" ON letter_comments FOR SELECT USING (true);
CREATE POLICY "Allow public insert letter_comments" ON letter_comments FOR INSERT WITH CHECK (true);

-- 允许管理员删除信件
CREATE POLICY "Allow admin delete letters" ON letters
    FOR DELETE USING (true);

-- 允许管理员删除信件评论
CREATE POLICY "Allow admin delete letter_comments" ON letter_comments
    FOR DELETE USING (true);