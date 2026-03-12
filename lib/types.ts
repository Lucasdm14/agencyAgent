// ─── Base ─────────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'creator' | 'client' | 'guest'
export interface Profile { id: string; full_name: string; role: UserRole; avatar_url: string | null; created_at: string }

// ─── v1: Brandbook ────────────────────────────────────────────────────────────
export interface BrandbookRules {
  tone: { voice: string; pronouns: 'vos' | 'tú' | 'usted'; examples_good: string[]; examples_bad: string[] }
  emojis: { allowed: boolean; max_per_post: number; approved_list: string[]; banned_list: string[] }
  hashtags: { always_include: string[]; banned: string[]; max_count: number }
  content_rules: string[]
  platform_overrides: Record<string, unknown>
}

// ─── v1: Brand ────────────────────────────────────────────────────────────────
export interface Brand {
  id: string; name: string; description: string | null; logo_url: string | null
  industry: string | null; target_audience: string | null
  brandbook_rules: BrandbookRules | null
  webhook_url: string | null
  created_at: string; created_by: string | null
}

// ─── v1: Post FSM ─────────────────────────────────────────────────────────────
export type PostStatus = 'draft' | 'ai_generated' | 'supervisor_review' | 'pm_review' | 'approved' | 'webhook_sent' | 'rejected'

export interface ClauseValidation { rule: string; category: string; passed: boolean; comment: string | null }

export interface Post {
  id: string; brand_id: string; image_url: string
  platform: 'instagram' | 'linkedin' | 'facebook' | 'twitter' | 'tiktok'
  generated_copy: string | null; final_copy: string | null
  hashtags: string[] | null; ai_rationale: string | null; visual_description: string | null
  supervisor_score: number | null; supervisor_validation: ClauseValidation[] | null
  critical_violations: number; suggested_fix: string | null
  scheduled_date: string | null; status: PostStatus
  webhook_payload: Record<string, unknown> | null; webhook_sent_at: string | null; webhook_error: string | null
  created_by: string | null; created_at: string; updated_at: string
  brands?: Pick<Brand, 'id' | 'name' | 'logo_url' | 'webhook_url'>
}

export interface PostEditLog {
  id: string; post_id: string; editor_type: 'ai' | 'pm'; editor_id: string | null
  previous_copy: string; new_copy: string; edit_reason: string | null; created_at: string
}

// ─── Legacy types (kept for backward compat) ─────────────────────────────────
export type AgentType = 'creator' | 'supervisor' | 'strategist'
export interface Agent { id: string; brand_id: string; name: string; type: AgentType; system_prompt: string; model: string; temperature: number; is_active: boolean; created_at: string; brand?: Brand }
export type ContentType = 'social' | 'ads' | 'email' | 'other'
export type ContentStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'scheduled' | 'published'
export interface Content { id: string; brand_id: string; conversation_id: string | null; title: string | null; body: string; content_type: ContentType; platform: string | null; status: ContentStatus; scheduled_date: string | null; scheduled_time: string | null; media_urls: string[] | null; supervisor_feedback: string | null; supervisor_score: number | null; created_by: string | null; created_at: string; updated_at: string; brand?: Brand }
