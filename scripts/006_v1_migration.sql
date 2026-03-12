-- AutoCM v1 Migration
-- Run after: 001, 002, 003, 005

-- ─────────────────────────────────────────────
-- 1. Add brandbook_rules + webhook_url to brands
-- ─────────────────────────────────────────────
ALTER TABLE brands 
  ADD COLUMN IF NOT EXISTS brandbook_rules JSONB,
  ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- Migrate existing tone_of_voice to brandbook_rules JSON structure
UPDATE brands 
SET brandbook_rules = jsonb_build_object(
  'tone', jsonb_build_object(
    'voice', COALESCE(tone_of_voice, 'profesional'),
    'pronouns', 'vos',
    'examples_good', '[]'::jsonb,
    'examples_bad', '[]'::jsonb
  ),
  'emojis', jsonb_build_object(
    'allowed', true,
    'max_per_post', 3,
    'approved_list', '[]'::jsonb,
    'banned_list', '[]'::jsonb
  ),
  'hashtags', jsonb_build_object(
    'always_include', COALESCE(
      (SELECT jsonb_agg(k) FROM unnest(keywords) k),
      '[]'::jsonb
    ),
    'banned', '[]'::jsonb,
    'max_count', 5
  ),
  'content_rules', '["Siempre incluir un CTA al final"]'::jsonb,
  'platform_overrides', '{}'::jsonb
)
WHERE brandbook_rules IS NULL;

-- ─────────────────────────────────────────────
-- 2. Create posts table (focused, replaces content for the v1 flow)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  image_url            TEXT NOT NULL,
  platform             TEXT NOT NULL CHECK (platform IN ('instagram', 'linkedin', 'facebook', 'twitter', 'tiktok')),
  
  -- AI outputs
  generated_copy       TEXT,
  final_copy           TEXT,          -- may differ if PM edited
  hashtags             TEXT[],
  ai_rationale         TEXT,
  visual_description   TEXT,
  
  -- Supervisor outputs
  supervisor_score     INTEGER CHECK (supervisor_score BETWEEN 1 AND 10),
  supervisor_validation JSONB,        -- array of { rule, category, passed, comment }
  critical_violations  INTEGER DEFAULT 0,
  suggested_fix        TEXT,
  
  -- Scheduling
  scheduled_date       TIMESTAMPTZ,
  
  -- Status FSM
  -- draft → ai_generated → supervisor_review → pm_review → approved → webhook_sent | rejected
  status               TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','ai_generated','supervisor_review','pm_review','approved','webhook_sent','rejected')),
  
  -- Webhook audit
  webhook_payload      JSONB,
  webhook_sent_at      TIMESTAMPTZ,
  webhook_error        TEXT,
  
  -- Metadata
  created_by           UUID REFERENCES profiles(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_brand_id ON posts(brand_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_date ON posts(scheduled_date);

-- ─────────────────────────────────────────────
-- 3. Create post_edit_log table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_edit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id        UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  editor_type    TEXT NOT NULL CHECK (editor_type IN ('ai', 'pm')),
  editor_id      UUID REFERENCES profiles(id),   -- null if editor_type = 'ai'
  previous_copy  TEXT NOT NULL,
  new_copy       TEXT NOT NULL,
  edit_reason    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_edit_log_post_id ON post_edit_log(post_id);

-- ─────────────────────────────────────────────
-- 4. RLS for posts
-- ─────────────────────────────────────────────
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_edit_log ENABLE ROW LEVEL SECURITY;

-- Admins and creators see all posts; clients see only their brand posts
CREATE POLICY "posts_select" ON posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'creator')
    )
    OR
    EXISTS (
      SELECT 1 FROM brand_access WHERE brand_id = posts.brand_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "posts_insert" ON posts FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'creator'))
  );

CREATE POLICY "posts_update" ON posts FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'creator'))
  );

CREATE POLICY "post_edit_log_select" ON post_edit_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'creator'))
  );

CREATE POLICY "post_edit_log_insert" ON post_edit_log FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'creator'))
  );

-- ─────────────────────────────────────────────
-- 5. updated_at trigger for posts
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posts_updated_at ON posts;
CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
