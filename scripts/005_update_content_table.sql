-- Add new columns to content table for workflow support
ALTER TABLE content ADD COLUMN IF NOT EXISTS main_text TEXT;
ALTER TABLE content ADD COLUMN IF NOT EXISTS hashtags TEXT[];
ALTER TABLE content ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'draft';
ALTER TABLE content ADD COLUMN IF NOT EXISTS creator_agent_id UUID;
ALTER TABLE content ADD COLUMN IF NOT EXISTS supervisor_agent_id UUID;
ALTER TABLE content ADD COLUMN IF NOT EXISTS strategist_agent_id UUID;
ALTER TABLE content ADD COLUMN IF NOT EXISTS supervisor_approved BOOLEAN;
ALTER TABLE content ADD COLUMN IF NOT EXISTS supervisor_feedback TEXT;
ALTER TABLE content ADD COLUMN IF NOT EXISTS supervisor_score INTEGER;
ALTER TABLE content ADD COLUMN IF NOT EXISTS strategy_content TEXT;
ALTER TABLE content ADD COLUMN IF NOT EXISTS strategy_created_at TIMESTAMPTZ;
ALTER TABLE content ADD COLUMN IF NOT EXISTS user_approved_at TIMESTAMPTZ;
