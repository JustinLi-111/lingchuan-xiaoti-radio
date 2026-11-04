-- ============================================
-- 双人实时互动：房间状态表
-- 请在 Supabase 控制台 → SQL Editor 中执行本文件
-- 支撑三个玩法：一起听（同步播放）、抢月亮、望远镜光点
-- ============================================

CREATE TABLE IF NOT EXISTS public.room_state (
    key TEXT PRIMARY KEY,                                  -- 状态键：listen / moon:YYYY-MM-DD / gaze / who:设备ID
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,            -- 状态内容
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()          -- 最后更新时间（同时作为服务端基准时钟）
);

CREATE INDEX IF NOT EXISTS idx_room_state_updated_at ON public.room_state(updated_at DESC);

ALTER TABLE public.room_state ENABLE ROW LEVEL SECURITY;

-- 私密双人站点：允许匿名读写（只有知道入口密码的人能进站）
DROP POLICY IF EXISTS "room_state_all" ON public.room_state;
CREATE POLICY "room_state_all" ON public.room_state
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 验证：执行后应能查询到空结果而不报错
-- SELECT * FROM public.room_state;
