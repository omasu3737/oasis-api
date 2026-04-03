-- ============================================================
-- OASIS フェーズ1 新規テーブル
-- Supabase SQL Editorで実行してください
-- ============================================================

-- ============================================================
-- 1. diagnostic_results（選択式診断結果）
-- ============================================================

CREATE TABLE IF NOT EXISTS diagnostic_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 5軸スコア（0〜100）
  depth_score      INTEGER NOT NULL CHECK (depth_score BETWEEN 0 AND 100),
  will_score       INTEGER NOT NULL CHECK (will_score BETWEEN 0 AND 100),
  action_score     INTEGER NOT NULL CHECK (action_score BETWEEN 0 AND 100),
  resonance_score  INTEGER NOT NULL CHECK (resonance_score BETWEEN 0 AND 100),
  stability_score  INTEGER NOT NULL CHECK (stability_score BETWEEN 0 AND 100),

  -- 32タイプ判定結果
  personality_type TEXT,

  -- 各問への回答を保存 (例: {"q1": 3, "q2": 5, ...})
  raw_answers   JSONB NOT NULL DEFAULT '{}',

  -- 診断バージョン（将来問題改訂時に区別するため）
  version       INTEGER NOT NULL DEFAULT 1,

  completed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 1ユーザー1レコードに制限（再診断時は上書き）
  UNIQUE (user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_diagnostic_results_user_id
  ON diagnostic_results (user_id);

CREATE INDEX IF NOT EXISTS idx_diagnostic_results_personality_type
  ON diagnostic_results (personality_type);

-- RLS
ALTER TABLE diagnostic_results ENABLE ROW LEVEL SECURITY;

-- 自分の診断結果のみ参照可能
CREATE POLICY "diagnostic_results: select own"
  ON diagnostic_results FOR SELECT
  USING (auth.uid() = user_id);

-- 自分の診断結果のみ挿入可能
CREATE POLICY "diagnostic_results: insert own"
  ON diagnostic_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 自分の診断結果のみ更新可能
CREATE POLICY "diagnostic_results: update own"
  ON diagnostic_results FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 自分の診断結果のみ削除可能
CREATE POLICY "diagnostic_results: delete own"
  ON diagnostic_results FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 2. soul_questions（魂の問答・ユーザー投稿型）
-- ============================================================

CREATE TABLE IF NOT EXISTS soul_questions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 投稿者の性格タイプ（同じタイプのユーザーにのみ表示）
  personality_type TEXT NOT NULL,

  -- 問いの本文
  content          TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 300),

  -- 回答数（非正規化・パフォーマンス用）
  answer_count     INTEGER NOT NULL DEFAULT 0,

  -- いいね数（非正規化・パフォーマンス用）
  likes_count      INTEGER NOT NULL DEFAULT 0,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_soul_questions_personality_type
  ON soul_questions (personality_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_soul_questions_user_id
  ON soul_questions (user_id);

-- RLS
ALTER TABLE soul_questions ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全ての問いを閲覧可能
CREATE POLICY "soul_questions: select authenticated"
  ON soul_questions FOR SELECT
  USING (auth.role() = 'authenticated');

-- 自分の投稿のみ挿入可能
CREATE POLICY "soul_questions: insert own"
  ON soul_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 自分の投稿のみ更新可能
CREATE POLICY "soul_questions: update own"
  ON soul_questions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 自分の投稿のみ削除可能
CREATE POLICY "soul_questions: delete own"
  ON soul_questions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. soul_answers（魂の問答・回答）
--    soul_questionsとセットで必要なため一緒に作成
-- ============================================================

CREATE TABLE IF NOT EXISTS soul_answers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES soul_questions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 回答本文
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),

  -- いいね数（非正規化）
  likes_count INTEGER NOT NULL DEFAULT 0,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 1ユーザーが同じ問いに複数回答できないように制限
  UNIQUE (question_id, user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_soul_answers_question_id
  ON soul_answers (question_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_soul_answers_user_id
  ON soul_answers (user_id);

-- RLS
ALTER TABLE soul_answers ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全ての回答を閲覧可能
CREATE POLICY "soul_answers: select authenticated"
  ON soul_answers FOR SELECT
  USING (auth.role() = 'authenticated');

-- 自分の回答のみ挿入可能
CREATE POLICY "soul_answers: insert own"
  ON soul_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 自分の回答のみ更新可能
CREATE POLICY "soul_answers: update own"
  ON soul_answers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 自分の回答のみ削除可能
CREATE POLICY "soul_answers: delete own"
  ON soul_answers FOR DELETE
  USING (auth.uid() = user_id);

-- soul_answersが追加されたらsoul_questionsのanswer_countを自動更新するトリガー
CREATE OR REPLACE FUNCTION increment_answer_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE soul_questions
  SET answer_count = answer_count + 1,
      updated_at = NOW()
  WHERE id = NEW.question_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_answer_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE soul_questions
  SET answer_count = GREATEST(0, answer_count - 1),
      updated_at = NOW()
  WHERE id = OLD.question_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_increment_answer_count
  AFTER INSERT ON soul_answers
  FOR EACH ROW EXECUTE FUNCTION increment_answer_count();

CREATE TRIGGER trigger_decrement_answer_count
  AFTER DELETE ON soul_answers
  FOR EACH ROW EXECUTE FUNCTION decrement_answer_count();

-- ============================================================
-- 4. timeline_posts（タイプ別タイムライン）
-- ============================================================

CREATE TABLE IF NOT EXISTS timeline_posts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 投稿者の性格タイプ（同じタイプのフィードに流れる）
  personality_type TEXT NOT NULL,

  -- 投稿本文
  content          TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),

  -- いいね数（非正規化）
  likes_count      INTEGER NOT NULL DEFAULT 0,

  -- コメント数（非正規化）
  comments_count   INTEGER NOT NULL DEFAULT 0,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index（タイプ別・新着順で高速取得）
CREATE INDEX IF NOT EXISTS idx_timeline_posts_personality_type
  ON timeline_posts (personality_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_timeline_posts_user_id
  ON timeline_posts (user_id, created_at DESC);

-- RLS
ALTER TABLE timeline_posts ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全投稿を閲覧可能
CREATE POLICY "timeline_posts: select authenticated"
  ON timeline_posts FOR SELECT
  USING (auth.role() = 'authenticated');

-- 自分の投稿のみ挿入可能
CREATE POLICY "timeline_posts: insert own"
  ON timeline_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 自分の投稿のみ更新可能
CREATE POLICY "timeline_posts: update own"
  ON timeline_posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 自分の投稿のみ削除可能
CREATE POLICY "timeline_posts: delete own"
  ON timeline_posts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 完了メッセージ
-- ============================================================
-- 作成テーブル:
--   diagnostic_results  (+ UNIQUE index on user_id)
--   soul_questions
--   soul_answers        (+ trigger: answer_count 自動更新)
--   timeline_posts
--
-- 全テーブルにRLS有効・ポリシー設定済み
-- ============================================================
