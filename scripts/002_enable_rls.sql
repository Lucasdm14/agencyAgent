-- AgencyCopilot RLS Policies
-- Migration 002: Enable Row Level Security

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_reports ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Brands policies
CREATE POLICY "brands_select_access" ON brands FOR SELECT USING (
  EXISTS (SELECT 1 FROM brand_access WHERE brand_id = id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "brands_insert_admin_creator" ON brands FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'creator'))
);
CREATE POLICY "brands_update_admin" ON brands FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM brand_access WHERE brand_id = id AND user_id = auth.uid() AND access_level = 'admin')
);
CREATE POLICY "brands_delete_admin" ON brands FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Agents policies
CREATE POLICY "agents_select_brand_access" ON agents FOR SELECT USING (
  EXISTS (SELECT 1 FROM brand_access WHERE brand_id = agents.brand_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "agents_insert_admin_creator" ON agents FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'creator'))
);
CREATE POLICY "agents_update_admin_creator" ON agents FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'creator'))
);
CREATE POLICY "agents_delete_admin" ON agents FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Conversations policies
CREATE POLICY "conversations_select_own" ON conversations FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "conversations_insert_own" ON conversations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "conversations_update_own" ON conversations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "conversations_delete_own" ON conversations FOR DELETE USING (user_id = auth.uid());

-- Messages policies
CREATE POLICY "messages_select_conversation_access" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversations WHERE id = messages.conversation_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "messages_insert_conversation_access" ON messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM conversations WHERE id = messages.conversation_id AND user_id = auth.uid())
);

-- Content policies
CREATE POLICY "content_select_brand_access" ON content FOR SELECT USING (
  EXISTS (SELECT 1 FROM brand_access WHERE brand_id = content.brand_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "content_select_client_reviewable" ON content FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN brand_access ba ON ba.user_id = p.id
    WHERE p.id = auth.uid()
    AND p.role = 'client'
    AND ba.brand_id = content.brand_id
    AND content.status IN ('pending_review', 'approved', 'rejected', 'scheduled', 'published')
  )
);
CREATE POLICY "content_insert_admin_creator" ON content FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'creator'))
);
CREATE POLICY "content_update_admin_creator" ON content FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'creator'))
);
CREATE POLICY "content_delete_admin" ON content FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Validations policies
CREATE POLICY "validations_select_content_access" ON validations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM content c
    JOIN brand_access ba ON ba.brand_id = c.brand_id
    WHERE c.id = validations.content_id AND ba.user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "validations_insert_client" ON validations FOR INSERT WITH CHECK (
  client_id = auth.uid()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'client')
);
CREATE POLICY "validations_update_own" ON validations FOR UPDATE USING (client_id = auth.uid());

-- Metrics policies
CREATE POLICY "metrics_select_brand_access" ON metrics FOR SELECT USING (
  EXISTS (SELECT 1 FROM brand_access WHERE brand_id = metrics.brand_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "metrics_insert_admin_creator" ON metrics FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'creator'))
);

-- Brand access policies
CREATE POLICY "brand_access_select_own" ON brand_access FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "brand_access_insert_admin" ON brand_access FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "brand_access_delete_admin" ON brand_access FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Uploaded reports policies
CREATE POLICY "uploaded_reports_select_brand_access" ON uploaded_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM brand_access WHERE brand_id = uploaded_reports.brand_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "uploaded_reports_insert_admin_creator" ON uploaded_reports FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'creator'))
);
