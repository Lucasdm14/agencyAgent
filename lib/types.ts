// ─── Brandbook ────────────────────────────────────────────────────────────────

export interface BrandbookRules {
  tone: { voice: string; pronouns: string; examples_good: string[]; examples_bad: string[] }
  emojis:        { allowed: boolean; max_per_post: number; banned_list: string[] }
  hashtags:      { always_include: string[]; banned: string[]; max_count: number }
  content_rules: string[]
}

// ─── Agent ────────────────────────────────────────────────────────────────────
// role: 'copy' | 'estratega' | 'supervisor'
// custom_system_prompt supports: {{brand_name}} {{brand_prompt}} {{brandbook}}
//   {{segment}} {{platform}} {{period}} {{num_days}} {{day}} {{topic}}
//   {{hook}} {{content_type}} {{visual_direction}} {{strategy_json}}

export type AgentRole      = 'copy' | 'estratega' | 'supervisor'
export type AgentEnergy    = 'alta' | 'media' | 'baja'
export type AgentFormality = 'formal' | 'semiformal' | 'informal'

export interface Agent {
  id:                   string
  brand_id:             string
  role:                 AgentRole
  name:                 string
  description:          string
  segment:              string
  tone_voice:           string
  energy:               AgentEnergy
  formality:            AgentFormality
  platform_focus:       string[]
  content_priorities:   string[]
  extra_rules:          string[]
  custom_system_prompt: string
  created_at:           string
}

// ─── Competitor ───────────────────────────────────────────────────────────────

export interface CompetitorHandle {
  name:                string
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
  brand_prompt:    string   // free-text master prompt injected into all agents
  webhook_url:     string
  news_keywords:   string[]
  competitors:     CompetitorHandle[]
  rss_feeds:       string[]
  created_at:      string
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export type PostStatus = 'pm_review' | 'supervisor_review' | 'approved' | 'webhook_sent' | 'rejected'

export interface ClauseValidation {
  rule:     string
  category: string
  passed:   boolean
  comment:  string | null
}

export interface Post {
  id:                    string
  brand_id:              string
  brand_name:            string
  agent_id?:             string
  agent_name?:           string
  image_url:             string
  platform:              string
  generated_copy:        string
  final_copy:            string
  hashtags:              string[]
  ai_rationale:          string
  supervisor_score:      number
  supervisor_validation: ClauseValidation[]
  critical_violations:   number
  suggested_fix:         string | null
  scheduled_date:        string
  status:                PostStatus
  context_used?: {
    news_count:           number
    rss_count:            number
    competitor_ads_count: number
    sources:              string[]
  }
  created_at: string
}

// ─── Real-world context ───────────────────────────────────────────────────────

export interface NewsItem  { title: string; description: string; source: string; published_at: string; url: string }
export interface RSSItem   { title: string; summary: string; feed_name: string; published_at: string; url: string }
export interface MetaAd    { id: string; page_name: string; body_text: string; started_at: string; platforms: string[] }
export interface YoutubeVideo { title: string; description: string; channel: string; published_at: string; view_count: string; url: string }

export interface RealContext {
  news: NewsItem[]; rss: RSSItem[]; meta_ads: MetaAd[]; youtube_videos: YoutubeVideo[]; fetched_at: string
}

// ─── Strategy Session (4-step wizard, lives in sessionStorage) ────────────────

export interface CopyOption {
  index:     number
  angle:     string
  copy:      string
  hashtags:  string[]
  rationale: string
}

export interface StrategyPostPlan {
  day:              number
  platform:         string
  content_type:     'informativo' | 'producto' | 'comunidad' | 'educativo' | 'tendencia'
  topic:            string
  hook_suggestion:  string
  source_reference: string
  visual_direction: string
}

export interface StrategyPostWithCopies extends StrategyPostPlan {
  copies?:              CopyOption[]
  selected_copy_index?: number
  copies_done?:         boolean
}

export interface SupervisorReport {
  overall_score:   number
  brand_alignment: number
  strengths:       string[]
  weaknesses:      string[]
  post_feedback:   { day: number; topic: string; passed: boolean; comment: string | null }[]
  calendar_suggestion: { day: number; platform: string; recommended_time: string; reasoning: string }[]
  improvements:    string[]
  approved:        boolean
}

export interface StrategySession {
  id:                 string
  brand_id:           string
  brand_name:         string
  estratega_id:       string
  estratega_name:     string
  copy_agent_id:      string
  copy_agent_name:    string
  supervisor_id:      string
  supervisor_name:    string
  num_days:           number
  period_label:       string
  step:               1 | 2 | 3 | 4
  pillars:            string[]
  strategy_rationale: string
  posts:              StrategyPostWithCopies[]
  supervisor_report?: SupervisorReport
  created_at:         string
}

// ─── Persisted strategy (saved after supervisor approval) ─────────────────────

export interface ContentStrategy {
  id: string; brand_id: string; brand_name: string
  agent_id?: string; agent_name?: string
  period: string; created_at: string; data_sources: string[]
  posts: StrategyPostPlan[]; pillars: string[]; disclaimer: string
}

export type StrategyPost = StrategyPostPlan

// ─── Competitor Analysis ──────────────────────────────────────────────────────

export interface CompetitorAnalysis {
  id: string; brand_id: string; brand_name: string; competitor_name: string; analyzed_at: string
  raw_data: RealContext
  insights: {
    active_ads_count: number; main_messages: string[]; content_themes: string[]
    posting_cadence: string; differentiation_opportunities: string[]
    topics_to_avoid: string[]; recommended_angles: string[]
    confidence: 'high' | 'medium' | 'low'; data_sources_used: string[]; disclaimer: string
  }
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export interface MetricsReport {
  id: string; brand_id: string; brand_name: string; platform: string
  period: string; uploaded_at: string; raw_rows: number
  insights: {
    best_performing_posts:  { copy_preview: string; metric: string; value: number }[]
    worst_performing_posts: { copy_preview: string; metric: string; value: number }[]
    avg_engagement_rate: number | null; best_day_of_week: string; best_time_of_day: string
    top_content_themes: string[]; recommendations: string[]
    data_quality: 'complete' | 'partial' | 'minimal'; columns_found: string[]
  }
}

// ─── Apify Instagram metrics ──────────────────────────────────────────────────

export interface InstagramPost {
  url: string; type: 'Image' | 'Video' | 'Sidecar'
  caption: string; likes: number; comments: number; views: number | null
  timestamp: string; score: number
}

export interface InstagramAccountMetrics {
  username: string; period_days: number; posts_count: number
  total_likes: number; total_comments: number; total_views: number
  avg_likes: number; avg_comments: number; avg_views: number | null
  top_posts: InstagramPost[]
  format_breakdown: Record<string, number>
  top_hooks: string[]
  best_content_types: string[]
  fetched_at: string
}

export interface MetaAdLibraryReport {
  page_name: string
  new_ads: MetaAd[]; active_ads: MetaAd[]; dropped_ads: MetaAd[]
  main_messages: string[]; creative_formats: string[]; cta_patterns: string[]
  fetched_at: string
}
