// ─── Brandbook ────────────────────────────────────────────────────────────────

export interface BrandbookRules {
  tone: {
    voice: string
    pronouns: string
    examples_good: string[]
    examples_bad: string[]
  }
  emojis:       { allowed: boolean; max_per_post: number; banned_list: string[] }
  hashtags:     { always_include: string[]; banned: string[]; max_count: number }
  content_rules: string[]
}

// ─── Agent ────────────────────────────────────────────────────────────────────
//
// An Agent is a targeting + tone profile attached to a brand.
// Each brand can have N agents. When generating copy or a strategy,
// the PM selects which agent to activate. The agent overrides or
// extends the brandbook for that specific audience.

export type AgentEnergy    = 'alta'    | 'media'    | 'baja'
export type AgentFormality = 'formal'  | 'semiformal' | 'informal'

export interface Agent {
  id:          string
  brand_id:    string
  name:        string        // "Millennials Premium", "B2B Decision Makers"
  description: string        // short summary, shown in selectors
  segment:     string        // "Mujeres 25-35, urbanas, ABC1, interesadas en lifestyle y wellness"
  tone_voice:  string        // extends/overrides brandbook voice for this segment
  energy:      AgentEnergy
  formality:   AgentFormality
  platform_focus:      string[]   // preferred platforms ["instagram", "tiktok"]
  content_priorities:  string[]   // what to emphasize ["aspiracional", "precio-valor", "educativo"]
  extra_rules:         string[]   // agent-specific copy rules
  created_at:  string
}

// ─── Competitor ───────────────────────────────────────────────────────────────

export interface CompetitorHandle {
  name:               string
  facebook_page_name?: string
  youtube_channel?:    string
  website_url?:        string
}

// ─── Brand ────────────────────────────────────────────────────────────────────

export interface Brand {
  id:              string
  name:            string
  industry:        string
  target_audience: string
  brandbook_rules: BrandbookRules
  webhook_url:     string
  news_keywords:   string[]
  competitors:     CompetitorHandle[]
  rss_feeds:       string[]
  created_at:      string
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export type PostStatus =
  | 'pm_review'
  | 'supervisor_review'
  | 'approved'
  | 'webhook_sent'
  | 'rejected'

export interface ClauseValidation {
  rule:     string
  category: string
  passed:   boolean
  comment:  string | null
}

export interface Post {
  id:                   string
  brand_id:             string
  brand_name:           string
  // Agent used when generating (optional — older posts won't have it)
  agent_id?:            string
  agent_name?:          string
  image_url:            string
  platform:             string
  generated_copy:       string
  final_copy:           string
  hashtags:             string[]
  ai_rationale:         string
  supervisor_score:     number
  supervisor_validation: ClauseValidation[]
  critical_violations:  number
  suggested_fix:        string | null
  scheduled_date:       string
  status:               PostStatus
  // FIX: was missing competitor_ads_count — added to match API response
  context_used?: {
    news_count:           number
    rss_count:            number
    competitor_ads_count: number
    sources:              string[]
  }
  created_at: string
}

// ─── Real-world context ───────────────────────────────────────────────────────

export interface NewsItem {
  title:        string
  description:  string
  source:       string
  published_at: string
  url:          string
}

export interface RSSItem {
  title:        string
  summary:      string
  feed_name:    string
  published_at: string
  url:          string
}

export interface MetaAd {
  id:         string
  page_name:  string
  body_text:  string
  started_at: string
  platforms:  string[]
}

export interface YoutubeVideo {
  title:        string
  description:  string
  channel:      string
  published_at: string
  view_count:   string
  url:          string
}

export interface RealContext {
  news:           NewsItem[]
  rss:            RSSItem[]
  meta_ads:       MetaAd[]
  youtube_videos: YoutubeVideo[]
  fetched_at:     string
}

// ─── Competitor Analysis ──────────────────────────────────────────────────────

export interface CompetitorAnalysis {
  id:              string
  brand_id:        string
  brand_name:      string
  competitor_name: string
  analyzed_at:     string
  raw_data:        RealContext
  insights: {
    active_ads_count:                number
    main_messages:                   string[]
    content_themes:                  string[]
    posting_cadence:                 string
    differentiation_opportunities:   string[]
    topics_to_avoid:                 string[]
    recommended_angles:              string[]
    confidence:                      'high' | 'medium' | 'low'
    data_sources_used:               string[]
    disclaimer:                      string
  }
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export interface MetricsReport {
  id:           string
  brand_id:     string
  brand_name:   string
  platform:     string
  period:       string
  uploaded_at:  string
  raw_rows:     number
  insights: {
    best_performing_posts:  { copy_preview: string; metric: string; value: number }[]
    worst_performing_posts: { copy_preview: string; metric: string; value: number }[]
    avg_engagement_rate:    number | null
    best_day_of_week:       string
    best_time_of_day:       string
    top_content_themes:     string[]
    recommendations:        string[]
    data_quality:           'complete' | 'partial' | 'minimal'
    columns_found:          string[]
  }
}

// ─── Strategy ─────────────────────────────────────────────────────────────────

export interface ContentStrategy {
  id:           string
  brand_id:     string
  brand_name:   string
  agent_id?:    string
  agent_name?:  string
  period:       string
  created_at:   string
  data_sources: string[]
  posts:        StrategyPost[]
  pillars:      string[]
  disclaimer:   string
}

export interface StrategyPost {
  day:             number
  platform:        string
  content_type:    'informativo' | 'producto' | 'comunidad' | 'educativo' | 'tendencia'
  topic:           string
  hook_suggestion: string
  source_reference: string
}
