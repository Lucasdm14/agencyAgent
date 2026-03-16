/**
 * Apify integrations:
 * - Instagram organic metrics (apify/instagram-scraper)
 * - Meta Ad Library enhanced (apify/facebook-ads-scraper)
 *
 * Requires APIFY_TOKEN env var.
 */

import type { InstagramPost, InstagramAccountMetrics } from '../types'

const APIFY_BASE = 'https://api.apify.com/v2'

/** Run an Apify actor synchronously and return dataset items */
async function runActor<T>(actorId: string, input: Record<string, unknown>): Promise<T[]> {
  const token = process.env.APIFY_TOKEN
  if (!token) {
    console.warn('[Apify] APIFY_TOKEN not set')
    return []
  }

  try {
    const res = await fetch(
      `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=120`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(input),
        signal:  AbortSignal.timeout(130_000),   // 2 min + buffer
      }
    )
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error(`[Apify] ${actorId} error ${res.status}:`, text.slice(0, 200))
      return []
    }
    return await res.json() as T[]
  } catch (err) {
    console.error(`[Apify] ${actorId} exception:`, err)
    return []
  }
}

// ─── Instagram Organic ────────────────────────────────────────────────────────

interface ApifyInstagramPost {
  url:           string
  type:          string   // "Image" | "Video" | "Sidecar"
  caption:       string
  likesCount:    number
  commentsCount: number
  videoViewCount?: number
  timestamp:     string
  ownerUsername: string
}

export async function fetchInstagramMetrics(
  username: string,
  periodDays = 30,
  limit = 50
): Promise<InstagramAccountMetrics | null> {
  const items = await runActor<ApifyInstagramPost>('apify~instagram-scraper', {
    directUrls:    [`https://www.instagram.com/${username}/`],
    resultsType:   'posts',
    resultsLimit:  limit,
    addParentData: false,
  })

  if (items.length === 0) return null

  // Filter to period
  const cutoff = Date.now() - periodDays * 86_400_000
  const inPeriod = items.filter(p => new Date(p.timestamp).getTime() >= cutoff)
  const posts = inPeriod.length > 0 ? inPeriod : items

  // Compute scores
  const scored: InstagramPost[] = posts.map(p => {
    const views = p.videoViewCount ?? 0
    const score = (p.likesCount ?? 0) + (p.commentsCount ?? 0) * 3 + views * 0.1
    return {
      url:       p.url,
      type:      (p.type as 'Image' | 'Video' | 'Sidecar') || 'Image',
      caption:   p.caption ?? '',
      likes:     p.likesCount   ?? 0,
      comments:  p.commentsCount ?? 0,
      views:     views > 0 ? views : null,
      timestamp: p.timestamp,
      score,
    }
  }).sort((a, b) => b.score - a.score)

  const total_likes    = scored.reduce((s, p) => s + p.likes,    0)
  const total_comments = scored.reduce((s, p) => s + p.comments, 0)
  const total_views    = scored.reduce((s, p) => s + (p.views ?? 0), 0)
  const hasViews       = scored.some(p => p.views !== null)

  // Format breakdown
  const format_breakdown: Record<string, number> = {}
  scored.forEach(p => { format_breakdown[p.type] = (format_breakdown[p.type] ?? 0) + 1 })

  // Top hooks (first sentence of top 5 posts)
  const top_hooks = scored.slice(0, 5).map(p => {
    const firstSentence = p.caption?.split(/[.!?\n]/)[0]?.trim()
    return firstSentence?.slice(0, 120) ?? ''
  }).filter(Boolean)

  // Best content types by avg score
  const byType: Record<string, number[]> = {}
  scored.forEach(p => {
    if (!byType[p.type]) byType[p.type] = []
    byType[p.type].push(p.score)
  })
  const best_content_types = Object.entries(byType)
    .sort(([, a], [, b]) => {
      const avgA = a.reduce((s, v) => s + v, 0) / a.length
      const avgB = b.reduce((s, v) => s + v, 0) / b.length
      return avgB - avgA
    })
    .map(([type]) => type)

  return {
    username,
    period_days:   periodDays,
    posts_count:   scored.length,
    total_likes,
    total_comments,
    total_views,
    avg_likes:    Math.round(total_likes    / scored.length),
    avg_comments: Math.round(total_comments / scored.length),
    avg_views:    hasViews ? Math.round(total_views / scored.length) : null,
    top_posts:    scored.slice(0, 10),
    format_breakdown,
    top_hooks,
    best_content_types,
    fetched_at: new Date().toISOString(),
  }
}

// ─── Meta Ad Library (enhanced via Apify) ────────────────────────────────────

interface ApifyMetaAd {
  page_name?:    string
  body_text?:    string
  ad_id?:        string
  start_date?:   string
  end_date?:     string
  platforms?:    string[]
  cta_text?:     string
  media_type?:   string
}

export async function fetchMetaAdLibraryApify(
  pageName: string,
  countries = ['AR', 'MX', 'ES']
): Promise<{
  new_ads:         ApifyMetaAd[]
  active_ads:      ApifyMetaAd[]
  main_messages:   string[]
  creative_formats: string[]
  cta_patterns:    string[]
}> {
  const items = await runActor<ApifyMetaAd>('apify~facebook-ads-scraper', {
    searchTerms:   [pageName],
    countries,
    adActiveStatus: 'ACTIVE',
    limit: 40,
  })

  const now = Date.now()
  const sevenDays = 7 * 86_400_000

  const new_ads    = items.filter(a => a.start_date && (now - new Date(a.start_date).getTime()) < sevenDays)
  const active_ads = items

  const main_messages   = [...new Set(items.map(a => a.body_text?.slice(0, 120)).filter(Boolean))] as string[]
  const creative_formats = [...new Set(items.map(a => a.media_type).filter(Boolean))] as string[]
  const cta_patterns    = [...new Set(items.map(a => a.cta_text).filter(Boolean))] as string[]

  return { new_ads, active_ads, main_messages, creative_formats, cta_patterns }
}
