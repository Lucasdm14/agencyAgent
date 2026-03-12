-- Create calendar_events table for scheduling content
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  event_type TEXT DEFAULT 'post' CHECK (event_type IN ('post', 'story', 'reel', 'campaign', 'meeting', 'deadline', 'other')),
  platform TEXT,
  content_type TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'cancelled')),
  content_id UUID REFERENCES content(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_brand_id ON calendar_events(brand_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_platform ON calendar_events(platform);

-- Enable Row Level Security
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see events for brands they have access to
CREATE POLICY "Users can view calendar events for their brands" ON calendar_events
  FOR SELECT
  USING (
    brand_id IN (
      SELECT b.id FROM brands b WHERE b.user_id = auth.uid()
    )
  );

-- Policy: Users can insert events for their brands
CREATE POLICY "Users can create calendar events for their brands" ON calendar_events
  FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT b.id FROM brands b WHERE b.user_id = auth.uid()
    )
  );

-- Policy: Users can update their own events
CREATE POLICY "Users can update calendar events for their brands" ON calendar_events
  FOR UPDATE
  USING (
    brand_id IN (
      SELECT b.id FROM brands b WHERE b.user_id = auth.uid()
    )
  );

-- Policy: Users can delete their own events
CREATE POLICY "Users can delete calendar events for their brands" ON calendar_events
  FOR DELETE
  USING (
    brand_id IN (
      SELECT b.id FROM brands b WHERE b.user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER trigger_update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_events_updated_at();
