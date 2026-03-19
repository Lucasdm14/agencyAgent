/**
 * Apify Instagram integration
 * Actor: apify/instagram-scraper (posts) + apify/instagram-profile-scraper (profile)
 */
import type { InstagramPost, InstagramProfile, InstagramAccountMetrics, FormatInsights, ContentFormat } from '../types'

const APIFY_BASE = 'https://api.apify.com/v2'

async function runActor<T>(actorId: string, input: Record<string, unknown>, timeoutSec = 120): Promise<T[]> {
  const token = process.env.APIFY_TOKEN
  if (!token) { console.warn('[Apify] APIFY_TOKEN not set'); return [] }
  try {
    const res = await fetch(
      `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=${timeoutSec}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout((timeoutSec + 15) * 1000),
      }
    )
    if (!res.ok) {
      console.error(`[Apify] ${actorId} ${res.status}:`, await res.text().catch(() => '').then(t => t.slice(0, 200)))
      return []
    }
    return await res.json() as T[]
  } catch (err) {
    console.error(`[Apify] ${actorId} error:`, err)
    return []
  }
}

// ─── Raw Apify post shape ─────────────────────────────────────────────────────

interface RawPost {
  url:            string
  shortCode?:     string
  type:           string
  caption?:       string
  hashtags?:      string[]
  likesCount?:    number
  commentsCount?: number
  videoViewCount?: number
  displayUrl?:    string
  videoUrl?:      string
  timestamp:      string
  ownerUsername?: string
  ownerFullName?: string
  locationName?:  string
  isSponsored?:   boolean
}

interface RawProfile {
  username?:           string
  fullName?:           string
  followersCount?:     number
  followsCount?:       number
  postsCount?:         number
  profilePicUrl?:      string
  biography?:          string
  verified?:           boolean
  isBusinessAccount?:  boolean
}

// ─── Compute engagement rate ──────────────────────────────────────────────────

function computeER(post: { likesCount: number; commentsCount: number; videoViewCount?: number }, followers: number): number {
  if (followers === 0) return 0
  const interactions = (post.likesCount ?? 0) + (post.commentsCount ?? 0)
  return Math.round((interactions / followers) * 10000) / 100   // percentage, 2 decimals
}

function computeScore(post: RawPost, followers: number): number {
  const likes    = post.likesCount    ?? 0
  const comments = post.commentsCount ?? 0
  const views    = post.videoViewCount ?? 0
  return likes + comments * 3 + views * 0.05 + computeER({ likesCount: likes, commentsCount: comments }, followers) * 100
}

// ─── Map format ───────────────────────────────────────────────────────────────

function mapFormat(type: string): ContentFormat {
  if (type === 'Video')   return 'reel'
  if (type === 'Sidecar') return 'carousel'
  return 'post'
}

// ─── Build FormatInsights from posts ─────────────────────────────────────────

function buildFormatInsights(
  brand_id: string,
  handle: string,
  posts: InstagramPost[],
  profile: InstagramProfile
): FormatInsights {
  const followers = profile.followersCount || 1

  // Group by format
  const byFormat: Record<string, InstagramPost[]> = {}
  posts.forEach(p => {
    const fmt = mapFormat(p.type)
    if (!byFormat[fmt]) byFormat[fmt] = []
    byFormat[fmt].push(p)
  })

  const format_stats: FormatInsights['format_stats'] = {}
  Object.entries(byFormat).forEach(([fmt, fmtPosts]) => {
    const avg_likes = Math.round(fmtPosts.reduce((s, p) => s + p.likesCount, 0) / fmtPosts.length)
    const avgViews  = fmtPosts.some(p => (p.videoViewCount ?? 0) > 0)
      ? Math.round(fmtPosts.reduce((s, p) => s + (p.videoViewCount ?? 0), 0) / fmtPosts.length)
      : null
    const avg_er    = Math.round(fmtPosts.reduce((s, p) => s + (p.er ?? 0), 0) / fmtPosts.length * 100) / 100
    format_stats[fmt as ContentFormat] = { count: fmtPosts.length, avg_er, avg_likes, avg_views: avgViews }
  })

  // Best format by avg ER
  const best_format = (Object.entries(format_stats)
    .sort(([, a], [, b]) => (b?.avg_er ?? 0) - (a?.avg_er ?? 0))[0]?.[0] ?? 'post') as ContentFormat

  // Best posting hours (from timestamps)
  const hourCounts: Record<number, { total_er: number; count: number }> = {}
  posts.forEach(p => {
    const hour = new Date(p.timestamp).getHours()
    if (!hourCounts[hour]) hourCounts[hour] = { total_er: 0, count: 0 }
    hourCounts[hour].total_er += p.er ?? 0
    hourCounts[hour].count++
  })
  const best_posting_hours = Object.entries(hourCounts)
    .sort(([, a], [, b]) => (b.total_er / b.count) - (a.total_er / a.count))
    .slice(0, 3)
    .map(([h]) => parseInt(h))

  // Top hashtags
  const hashtagCounts: Record<string, number> = {}
  posts.forEach(p => (p.hashtags ?? []).forEach(h => { hashtagCounts[h] = (hashtagCounts[h] ?? 0) + 1 }))
  const top_hashtags = Object.entries(hashtagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([h]) => `#${h}`)

  // Avg caption length
  const avg_caption_length = Math.round(
    posts.reduce((s, p) => s + (p.caption?.length ?? 0), 0) / Math.max(posts.length, 1)
  )

  return {
    brand_id, instagram_handle: handle,
    followers_count: profile.followersCount,
    posts_count:     posts.length,
    source:          'apify',
    best_format, format_stats,
    best_posting_hours, top_hashtags, avg_caption_length,
    generated_at: new Date().toISOString(),
  }
}

// ─── Main export: fetch full account metrics ──────────────────────────────────

export async function fetchInstagramAccount(
  username: string,
  brand_id:  string,
  periodDays = 30,
  limit = 80
): Promise<InstagramAccountMetrics | null> {

  // Run both in parallel
  const [rawPosts, rawProfiles] = await Promise.all([
    runActor<RawPost>('apify~instagram-scraper', {
      directUrls:    [`https://www.instagram.com/${username}/`],
      resultsType:   'posts',
      resultsLimit:  limit,
      addParentData: false,
    }),
    runActor<RawProfile>('apify~instagram-profile-scraper', {
      usernames: [username],
    }, 60),
  ])

  if (rawPosts.length === 0) return null

  const rawProfile = rawProfiles[0] ?? {}
  const profile: InstagramProfile = {
    username:           rawProfile.username ?? username,
    fullName:           rawProfile.fullName,
    followersCount:     rawProfile.followersCount ?? 0,
    followsCount:       rawProfile.followsCount   ?? 0,
    postsCount:         rawProfile.postsCount      ?? 0,
    profilePicUrl:      rawProfile.profilePicUrl,
    bio:                rawProfile.biography,
    isVerified:         rawProfile.verified,
    isBusinessAccount:  rawProfile.isBusinessAccount,
  }

  const followers = profile.followersCount || 1

  // Filter to period
  const cutoff   = Date.now() - periodDays * 86_400_000
  const inPeriod = rawPosts.filter(p => new Date(p.timestamp).getTime() >= cutoff)
  const raw      = inPeriod.length > 0 ? inPeriod : rawPosts

  // Map to InstagramPost
  const posts: InstagramPost[] = raw.map(p => {
    const likes    = p.likesCount    ?? 0
    const comments = p.commentsCount ?? 0
    const er       = computeER({ likesCount: likes, commentsCount: comments }, followers)
    const score    = computeScore(p, followers)
    return {
      url:           p.url,
      shortCode:     p.shortCode,
      type:          (p.type as 'Image' | 'Video' | 'Sidecar') || 'Image',
      caption:       p.caption ?? '',
      hashtags:      p.hashtags ?? [],
      likesCount:    likes,
      commentsCount: comments,
      videoViewCount: p.videoViewCount,
      displayUrl:    p.displayUrl,
      videoUrl:      p.videoUrl,
      timestamp:     p.timestamp,
      ownerUsername: p.ownerUsername ?? username,
      ownerFullName: p.ownerFullName,
      locationName:  p.locationName,
      isSponsored:   p.isSponsored,
      score, er,
    }
  }).sort((a, b) => b.score - a.score)

  // Top hooks
  const top_hooks = posts.slice(0, 5).map(p => {
    const first = p.caption?.split(/[.!?\n]/)[0]?.trim()
    return first?.slice(0, 120) ?? ''
  }).filter(Boolean)

  // Format breakdown
  const format_breakdown: Record<string, number> = {}
  posts.forEach(p => { format_breakdown[p.type] = (format_breakdown[p.type] ?? 0) + 1 })

  const format_insights = buildFormatInsights(brand_id, username, posts, profile)

  return {
    profile,
    period_days: periodDays,
    posts,
    top_posts:   posts.slice(0, 12),
    format_breakdown,
    format_insights,
    top_hooks,
    fetched_at: new Date().toISOString(),
  }
}

// ─── Meta Ad Library via Apify ────────────────────────────────────────────────

interface RawMetaAd {
  page_name?: string; body_text?: string; ad_id?: string
  start_date?: string; end_date?: string; platforms?: string[]
  cta_text?: string; media_type?: string
}

export async function fetchMetaAdLibraryApify(pageName: string, countries = ['AR', 'MX', 'ES']) {
  const items = await runActor<RawMetaAd>('apify~facebook-ads-scraper', {
    searchTerms: [pageName], countries, adActiveStatus: 'ACTIVE', limit: 40,
  })
  const now = Date.now(); const sevenDays = 7 * 86_400_000
  return {
    new_ads:    items.filter(a => a.start_date && (now - new Date(a.start_date).getTime()) < sevenDays),
    active_ads: items,
    main_messages:    [...new Set(items.map(a => a.body_text?.slice(0, 120)).filter(Boolean))] as string[],
    creative_formats: [...new Set(items.map(a => a.media_type).filter(Boolean))] as string[],
    cta_patterns:     [...new Set(items.map(a => a.cta_text).filter(Boolean))] as string[],
  }
}
