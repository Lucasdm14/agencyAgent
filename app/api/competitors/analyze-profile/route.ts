import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateWithOpenAI } from '@/lib/openai'

const APIFY_API_KEY = process.env.APIFY_API_KEY

// Helper to safely convert timestamps to ISO date strings
function getValidDate(timestamp: any): string {
  if (!timestamp) return new Date().toISOString()
  
  try {
    // If it's a Unix timestamp (number of seconds since epoch)
    if (typeof timestamp === 'number') {
      // If it looks like milliseconds (13+ digits), use as is
      // If it looks like seconds (10 digits), multiply by 1000
      const ms = timestamp > 9999999999 ? timestamp : timestamp * 1000
      const date = new Date(ms)
      if (!isNaN(date.getTime())) return date.toISOString()
    }
    
    // If it's already a string, try to parse it
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp)
      if (!isNaN(date.getTime())) return date.toISOString()
    }
    
    return new Date().toISOString()
  } catch {
    return new Date().toISOString()
  }
}

// Apify actor IDs for each platform
// IMPORTANT: Use ~ instead of / for API URL format
const apifyActors: Record<string, string> = {
  instagram: 'apify~instagram-scraper',
  facebook: 'apify~facebook-posts-scraper',
  tiktok: 'clockworks~free-tiktok-scraper', 
  twitter: 'apidojo~tweet-scraper',
  youtube: 'streamers~youtube-scraper',
}

// Platform configurations
const platforms = {
  instagram: {
    name: 'Instagram',
    baseUrl: 'https://www.instagram.com',
    metrics: ['followers', 'following', 'posts', 'engagement_rate', 'avg_likes', 'avg_comments'],
  },
  facebook: {
    name: 'Facebook',
    baseUrl: 'https://www.facebook.com',
    metrics: ['followers', 'likes', 'posts', 'engagement_rate', 'avg_reactions', 'avg_comments'],
  },
  tiktok: {
    name: 'TikTok',
    baseUrl: 'https://www.tiktok.com',
    metrics: ['followers', 'following', 'likes', 'videos', 'avg_views', 'engagement_rate'],
  },
  twitter: {
    name: 'Twitter/X',
    baseUrl: 'https://twitter.com',
    metrics: ['followers', 'following', 'tweets', 'avg_likes', 'avg_retweets', 'engagement_rate'],
  },
  youtube: {
    name: 'YouTube',
    baseUrl: 'https://www.youtube.com',
    metrics: ['subscribers', 'total_views', 'videos', 'avg_views', 'engagement_rate'],
  },
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { competitorId, platform, username } = await request.json()
    console.log('[analyze-profile] Request received:', { competitorId, platform, username })

    if (!competitorId || !platform || !username) {
      console.log('[analyze-profile] Missing required data')
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    // Check if APIFY_API_KEY is configured
    if (!APIFY_API_KEY) {
      console.error('[analyze-profile] APIFY_API_KEY not configured')
      return NextResponse.json({ 
        error: 'APIFY_API_KEY no configurada',
        details: 'Configura la variable de entorno APIFY_API_KEY para usar esta funcionalidad.'
      }, { status: 500 })
    }

    // Fetch real data from Apify - throws error if fails
    let profileData
    try {
      console.log('[analyze-profile] Fetching profile data from Apify...')
      profileData = await fetchProfileData(platform, username)
      console.log('[analyze-profile] Profile data received:', { followers: profileData.followers, posts: profileData.posts })
    } catch (error: any) {
      console.error('[analyze-profile] Failed to fetch profile data:', error.message)
      return NextResponse.json({ 
        error: error.message || 'Error al obtener datos del perfil',
        details: 'No se pudieron obtener datos reales. Verifica que el username sea correcto y que la cuenta sea pública.'
      }, { status: 400 })
    }
    
    // Generate AI analysis
    const aiAnalysis = await generateProfileAnalysis(platform, username, profileData)

    // Save snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from('competitor_snapshots')
      .insert({
        competitor_id: competitorId,
        snapshot_date: new Date().toISOString().split('T')[0],
        follower_count: profileData.followers,
        following_count: profileData.following,
        posts_count: profileData.posts,
        engagement_rate: profileData.engagement_rate,
        avg_likes: profileData.avg_likes,
        avg_comments: profileData.avg_comments,
        avg_views: profileData.avg_views,
        recent_posts: profileData.recent_posts,
        top_posts: profileData.top_posts,
        ai_analysis: aiAnalysis,
        raw_data: profileData,
      })
      .select()
      .single()

    if (snapshotError) {
      console.error('Error saving snapshot:', snapshotError)
    }

    // Update competitor with latest data
    await supabase
      .from('competitors')
      .update({
        platform,
        platform_username: username,
        follower_count: profileData.followers,
        following_count: profileData.following,
        posts_count: profileData.posts,
        engagement_rate: profileData.engagement_rate,
        avg_likes: profileData.avg_likes,
        avg_comments: profileData.avg_comments,
        avg_views: profileData.avg_views,
        bio: profileData.bio,
        profile_image_url: profileData.profile_image,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', competitorId)

    return NextResponse.json({
      success: true,
      data: {
        profile: profileData,
        analysis: aiAnalysis,
        snapshot,
      },
    })

  } catch (error) {
    console.error('Error analyzing profile:', error)
    return NextResponse.json({ error: 'Error al analizar el perfil' }, { status: 500 })
  }
}

async function fetchProfileData(platform: string, username: string) {
  // Use Apify to scrape real profile data
  if (!APIFY_API_KEY) {
    console.error('[v0] APIFY_API_KEY not configured - cannot fetch real data')
    throw new Error('APIFY_API_KEY no configurada. Contacta al administrador para configurar la integración con Apify.')
  }

  const actorId = apifyActors[platform as keyof typeof apifyActors]
  if (!actorId) {
    throw new Error(`Plataforma ${platform} no soportada`)
  }

  // Prepare input based on platform
  const input = getApifyInput(platform, username)
  
  console.log('[apify] Starting actor:', actorId, 'with input:', JSON.stringify(input))
  
  // Run the Apify actor
  const runUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_API_KEY}`
  console.log('[apify] POST to:', runUrl.replace(APIFY_API_KEY!, '***'))
  
  const runResponse = await fetch(runUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  const runResponseText = await runResponse.text()
  console.log('[apify] Run response status:', runResponse.status)
  
  if (!runResponse.ok) {
    console.error('[apify] Run failed:', runResponseText)
    throw new Error(`Error al ejecutar Apify: ${runResponse.status} - ${runResponseText}`)
  }

  let runData
  try {
    runData = JSON.parse(runResponseText)
  } catch {
    console.error('[apify] Failed to parse run response:', runResponseText)
    throw new Error('Respuesta invalida de Apify')
  }
  
  const runId = runData.data?.id
  if (!runId) {
    console.error('[apify] No run ID in response:', runData)
    throw new Error('No se obtuvo ID de ejecucion de Apify')
  }
  
  console.log('[apify] Run started with ID:', runId)
  

  // Wait for the run to complete (poll status)
  let status = 'RUNNING'
  let attempts = 0
  const maxAttempts = 60 // Max 120 seconds wait

  console.log('[apify] Waiting for run to complete...')
  
  while (status === 'RUNNING' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const statusResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`
    )
    const statusData = await statusResponse.json()
    status = statusData.data?.status || 'UNKNOWN'
    attempts++
    
    if (attempts % 5 === 0) {
      console.log('[apify] Still waiting... attempt', attempts, 'status:', status)
    }
  }

  console.log('[apify] Final status:', status, 'after', attempts, 'attempts')

  if (status !== 'SUCCEEDED') {
    console.error('[apify] Run did not succeed:', status)
    throw new Error(`Apify no pudo completar la ejecucion: ${status}`)
  }

  // Get the results
  console.log('[apify] Fetching results...')
  const datasetResponse = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_KEY}`
  )
  const results = await datasetResponse.json()
  
  console.log('[apify] Results received:', results?.length || 0, 'items')

  if (!results || results.length === 0) {
    throw new Error(`No se encontraron datos para @${username} en ${platform}. Verifica que la cuenta existe y es publica.`)
  }

  // Parse results based on platform
  return parseApifyResults(platform, username, results)
}

function getApifyInput(platform: string, username: string) {
  // Clean username - remove @ if present
  const cleanUsername = username.replace('@', '').trim()
  
  switch (platform) {
    case 'instagram':
      // Official Apify Instagram Scraper input format
      return {
        directUrls: [`https://www.instagram.com/${cleanUsername}/`],
        resultsType: 'details',
        resultsLimit: 20,
        addParentData: true,
      }
    case 'facebook':
      // Facebook Posts Scraper (apify/facebook-posts-scraper)
      return {
        startUrls: [{ url: `https://www.facebook.com/${cleanUsername}` }],
        resultsLimit: 30,
        viewOption: 'CHRONOLOGICAL_POSTS',
        shouldExpandLinks: false,
        shouldScrapeReactions: true,
        shouldScrapeComments: false,
        startDateForPosts: '',
        endDateForPosts: '',
      }
    case 'tiktok':
      return {
        profiles: [cleanUsername],
        resultsPerPage: 30,
        shouldDownloadVideos: false,
      }
    case 'twitter':
      return {
        handles: [cleanUsername],
        tweetsDesired: 30,
        includeUserInfo: true,
      }
    case 'youtube':
      return {
        channelUrls: [`https://www.youtube.com/@${cleanUsername}`],
        maxResults: 30,
      }
    default:
      return { username: cleanUsername }
  }
}

function parseApifyResults(platform: string, username: string, results: any[]) {
  switch (platform) {
    case 'instagram':
      return parseInstagramResults(username, results)
    case 'facebook':
      return parseFacebookResults(username, results)
    case 'tiktok':
      return parseTikTokResults(username, results)
    case 'twitter':
      return parseTwitterResults(username, results)
    case 'youtube':
      return parseYouTubeResults(username, results)
    default:
      throw new Error(`Plataforma ${platform} no soportada para parsing`)
  }
}

function parseInstagramResults(username: string, results: any[]) {
  console.log('[apify] Parsing Instagram results, first item keys:', results[0] ? Object.keys(results[0]) : 'empty')
  
  // Find profile data - different actors return different structures
  const profile = results.find(r => 
    r.username || r.profileName || r.ownerUsername || r.inputUrl?.includes(username)
  ) || results[0]
  
  // Posts can be in different places depending on actor
  // Sometimes all results are posts, sometimes they're nested
  let posts = results.filter(r => 
    r.type === 'post' || 
    r.likesCount !== undefined || 
    r.likes !== undefined ||
    r.commentsCount !== undefined ||
    r.shortCode !== undefined ||
    r.displayUrl !== undefined ||
    r.edge_liked_by !== undefined
  )
  
  // If no posts found but we have latestPosts in profile
  if (posts.length === 0 && profile?.latestPosts) {
    posts = profile.latestPosts
  }
  
  // If still no posts, check if results themselves are the posts
  if (posts.length === 0 && results.length > 0 && !profile?.followersCount) {
    posts = results // All results might be posts
  }
  
  console.log('[apify] Found', posts.length, 'posts for metrics calculation')

  // Try multiple field names for followers/following
  const followers = profile?.followersCount || profile?.followers || profile?.edge_followed_by?.count || 0
  const following = profile?.followingCount || profile?.following || profile?.edge_follow?.count || 0
  const postsCount = profile?.postsCount || profile?.edge_owner_to_timeline_media?.count || posts.length

  // Calculate averages from posts - try multiple field names
  const totalLikes = posts.reduce((sum: number, p: any) => {
    const likes = p.likesCount || p.likes || p.edge_liked_by?.count || p.edge_media_preview_like?.count || 0
    return sum + likes
  }, 0)
  const totalComments = posts.reduce((sum: number, p: any) => {
    const comments = p.commentsCount || p.comments || p.edge_media_to_comment?.count || 0
    return sum + comments
  }, 0)
  const totalViews = posts.reduce((sum: number, p: any) => {
    const views = p.videoViewCount || p.views || p.video_view_count || p.playCount || 0
    return sum + views
  }, 0)
  
  console.log('[apify] Metrics - totalLikes:', totalLikes, 'totalComments:', totalComments, 'totalViews:', totalViews)
  
  const avgLikes = posts.length > 0 ? Math.round(totalLikes / posts.length) : 0
  const avgComments = posts.length > 0 ? Math.round(totalComments / posts.length) : 0
  const avgViews = posts.length > 0 ? Math.round(totalViews / posts.length) : 0
  const engagementRate = followers > 0 ? ((avgLikes + avgComments) / followers) * 100 : 0

  // Map recent posts with better thumbnail extraction
  const recentPosts = posts.slice(0, 10).map((p: any, i: number) => {
    // Try multiple fields for thumbnail
    const thumbnail = p.displayUrl || 
                     p.thumbnailUrl || 
                     p.imageUrl ||
                     p.previewUrl ||
                     p.images?.[0] ||
                     p.thumbnailSrc ||
                     p.thumbnail_src ||
                     p.image_versions2?.candidates?.[0]?.url ||
                     null
    
    return {
      id: p.id || p.shortCode || `post_${i}`,
      type: p.type || (p.videoUrl || p.isVideo ? 'video' : p.images?.length > 1 || p.sidecarImages ? 'carousel' : 'image'),
      likes: p.likesCount || p.likes || 0,
      comments: p.commentsCount || p.comments || 0,
      views: p.videoViewCount || p.views || p.videoPlayCount || 0,
      shares: p.sharesCount || 0,
      posted_at: getValidDate(p.timestamp || p.takenAt || p.taken_at_timestamp),
      caption: p.caption || p.edge_media_to_caption?.edges?.[0]?.node?.text || '',
      url: p.url || p.postUrl || `https://instagram.com/p/${p.shortCode || p.id}`,
      thumbnail,
    }
  })

  // Calculate top posts by score
  const topPosts = [...recentPosts]
    .map(p => ({ ...p, score: p.likes + p.comments * 2 + p.views * 0.1 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return {
    username,
    platform: 'instagram',
    followers,
    following,
    posts: postsCount,
    avg_likes: avgLikes,
    avg_comments: avgComments,
    avg_views: avgViews,
    engagement_rate: parseFloat(engagementRate.toFixed(2)),
    bio: profile?.biography || profile?.bio || '',
    profile_image: profile?.profilePicUrl || profile?.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${username}`,
    recent_posts: recentPosts,
    top_posts: topPosts,
    verified: profile?.verified || false,
    growth: {
      followers_7d: 0,
      followers_30d: 0,
      engagement_trend: 'stable',
    },
  }
}

function parseTikTokResults(username: string, results: any[]) {
  const profile = results.find(r => r.authorMeta || r.userInfo) || {}
  const authorMeta = profile.authorMeta || profile.userInfo || profile
  const videos = results.filter(r => r.videoMeta || r.stats)

  const followers = authorMeta?.fans || authorMeta?.followerCount || 0
  const following = authorMeta?.following || authorMeta?.followingCount || 0
  const totalLikes = authorMeta?.heart || authorMeta?.heartCount || 0
  const videosCount = authorMeta?.video || videos.length

  // Calculate averages
  const totalVideoViews = videos.reduce((sum: number, v: any) => sum + (v.playCount || v.stats?.playCount || 0), 0)
  const totalVideoLikes = videos.reduce((sum: number, v: any) => sum + (v.diggCount || v.stats?.diggCount || 0), 0)
  const totalVideoComments = videos.reduce((sum: number, v: any) => sum + (v.commentCount || v.stats?.commentCount || 0), 0)
  
  const avgViews = videos.length > 0 ? Math.round(totalVideoViews / videos.length) : 0
  const avgLikes = videos.length > 0 ? Math.round(totalVideoLikes / videos.length) : 0
  const avgComments = videos.length > 0 ? Math.round(totalVideoComments / videos.length) : 0
  const engagementRate = avgViews > 0 ? ((avgLikes + avgComments) / avgViews) * 100 : 0

  const recentPosts = videos.slice(0, 10).map((v: any, i: number) => {
    // Try multiple fields for thumbnail
    const thumbnail = v.covers?.default ||
                     v.cover ||
                     v.videoMeta?.cover ||
                     v.originCover ||
                     v.dynamicCover ||
                     v.thumbnail ||
                     null

    return {
      id: v.id || `video_${i}`,
      type: 'video',
      likes: v.diggCount || v.stats?.diggCount || 0,
      comments: v.commentCount || v.stats?.commentCount || 0,
      views: v.playCount || v.stats?.playCount || 0,
      shares: v.shareCount || v.stats?.shareCount || 0,
      posted_at: getValidDate(v.createTime),
      caption: v.desc || v.text || '',
      url: v.webVideoUrl || `https://tiktok.com/@${username}/video/${v.id}`,
      thumbnail,
    }
  })

  const topPosts = [...recentPosts]
    .map(p => ({ ...p, score: p.likes + p.comments * 2 + p.views * 0.01 + p.shares * 3 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return {
    username,
    platform: 'tiktok',
    followers,
    following,
    posts: videosCount,
    total_likes: totalLikes,
    avg_likes: avgLikes,
    avg_comments: avgComments,
    avg_views: avgViews,
    engagement_rate: parseFloat(engagementRate.toFixed(2)),
    bio: authorMeta?.signature || '',
    profile_image: authorMeta?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${username}`,
    recent_posts: recentPosts,
    top_posts: topPosts,
    verified: authorMeta?.verified || false,
    growth: {
      followers_7d: 0,
      followers_30d: 0,
      engagement_trend: 'stable',
    },
  }
}

function parseTwitterResults(username: string, results: any[]) {
  const userInfo = results.find(r => r.user || r.author)?.user || results.find(r => r.user || r.author)?.author || {}
  const tweets = results.filter(r => r.text || r.full_text)

  const followers = userInfo?.followers_count || userInfo?.followersCount || 0
  const following = userInfo?.friends_count || userInfo?.followingCount || 0
  const tweetsCount = userInfo?.statuses_count || tweets.length

  const totalLikes = tweets.reduce((sum: number, t: any) => sum + (t.favorite_count || t.likeCount || 0), 0)
  const totalRetweets = tweets.reduce((sum: number, t: any) => sum + (t.retweet_count || t.retweetCount || 0), 0)
  const totalViews = tweets.reduce((sum: number, t: any) => sum + (t.views || t.viewCount || 0), 0)

  const avgLikes = tweets.length > 0 ? Math.round(totalLikes / tweets.length) : 0
  const avgRetweets = tweets.length > 0 ? Math.round(totalRetweets / tweets.length) : 0
  const avgViews = tweets.length > 0 ? Math.round(totalViews / tweets.length) : 0
  const engagementRate = followers > 0 ? ((avgLikes + avgRetweets) / followers) * 100 : 0

  const recentPosts = tweets.slice(0, 10).map((t: any, i: number) => {
    // Try to get media thumbnail
    const thumbnail = t.extended_entities?.media?.[0]?.media_url_https ||
                     t.entities?.media?.[0]?.media_url_https ||
                     t.media?.photo?.[0]?.url ||
                     t.media?.video?.thumbnail ||
                     null

    return {
      id: t.id_str || t.id || `tweet_${i}`,
      type: t.extended_entities?.media ? 'media' : 'text',
      likes: t.favorite_count || t.likeCount || 0,
      comments: t.reply_count || t.replyCount || 0,
      views: t.views || t.viewCount || 0,
      shares: t.retweet_count || t.retweetCount || 0,
      posted_at: getValidDate(t.created_at),
      caption: t.text || t.full_text || '',
      url: `https://twitter.com/${username}/status/${t.id_str || t.id}`,
      thumbnail,
    }
  })

  const topPosts = [...recentPosts]
    .map(p => ({ ...p, score: p.likes + p.comments * 2 + p.shares * 3 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return {
    username,
    platform: 'twitter',
    followers,
    following,
    posts: tweetsCount,
    avg_likes: avgLikes,
    avg_comments: avgRetweets,
    avg_views: avgViews,
    engagement_rate: parseFloat(engagementRate.toFixed(2)),
    bio: userInfo?.description || '',
    profile_image: userInfo?.profile_image_url_https || `https://api.dicebear.com/7.x/initials/svg?seed=${username}`,
    recent_posts: recentPosts,
    top_posts: topPosts,
    verified: userInfo?.verified || false,
    growth: {
      followers_7d: 0,
      followers_30d: 0,
      engagement_trend: 'stable',
    },
  }
}

function parseYouTubeResults(username: string, results: any[]) {
  const channel = results.find(r => r.channelName || r.subscriberCount) || results[0] || {}
  const videos = results.filter(r => r.videoId || r.title)

  const subscribers = channel?.subscriberCount || channel?.statistics?.subscriberCount || 0
  const totalViews = channel?.viewCount || channel?.statistics?.viewCount || 0
  const videosCount = channel?.videoCount || videos.length

  const totalVideoViews = videos.reduce((sum: number, v: any) => sum + (v.viewCount || v.views || 0), 0)
  const totalLikes = videos.reduce((sum: number, v: any) => sum + (v.likeCount || v.likes || 0), 0)
  const totalComments = videos.reduce((sum: number, v: any) => sum + (v.commentCount || v.comments || 0), 0)

  const avgViews = videos.length > 0 ? Math.round(totalVideoViews / videos.length) : 0
  const avgLikes = videos.length > 0 ? Math.round(totalLikes / videos.length) : 0
  const avgComments = videos.length > 0 ? Math.round(totalComments / videos.length) : 0
  const engagementRate = avgViews > 0 ? ((avgLikes + avgComments) / avgViews) * 100 : 0

  const recentPosts = videos.slice(0, 10).map((v: any, i: number) => ({
    id: v.videoId || v.id || `video_${i}`,
    type: 'video',
    likes: v.likeCount || v.likes || 0,
    comments: v.commentCount || v.comments || 0,
    views: v.viewCount || v.views || 0,
    shares: 0,
    posted_at: getValidDate(v.publishedAt || v.uploadDate),
    caption: v.title || '',
    url: `https://youtube.com/watch?v=${v.videoId || v.id}`,
    thumbnail: v.thumbnailUrl || v.thumbnail || null,
  }))

  const topPosts = [...recentPosts]
    .map(p => ({ ...p, score: p.likes + p.comments * 2 + p.views * 0.001 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return {
    username,
    platform: 'youtube',
    followers: subscribers,
    following: 0,
    posts: videosCount,
    total_views: totalViews,
    avg_likes: avgLikes,
    avg_comments: avgComments,
    avg_views: avgViews,
    engagement_rate: parseFloat(engagementRate.toFixed(2)),
    bio: channel?.description || '',
    profile_image: channel?.thumbnailUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${username}`,
    recent_posts: recentPosts,
    top_posts: topPosts,
    verified: channel?.verified || false,
    growth: {
      followers_7d: 0,
      followers_30d: 0,
      engagement_trend: 'stable',
    },
  }
}

function parseFacebookResults(username: string, results: any[]) {
  console.log('[apify] Parsing Facebook results, count:', results.length)
  if (results[0]) {
    console.log('[apify] First result keys:', Object.keys(results[0]).slice(0, 25))
  }
  
  // Facebook Posts Scraper returns an array of posts
  // Each post has: pageName, pageUrl, likes, comments, shares, postText, media, etc.
  const posts = results.filter(r => r.postText !== undefined || r.text !== undefined || r.pageName)
  
  // Try to extract page info from first post
  const firstPost = posts[0] || {}
  const pageName = firstPost.pageName || firstPost.pageTitle || username
  const pageUrl = firstPost.pageUrl || `https://facebook.com/${username}`
  const pageLogo = firstPost.pageLogo || firstPost.profilePicture || null
  
  // Get followers/likes from page info if available
  const pageInfo = firstPost.pageInfo || {}
  const followers = pageInfo.followers || pageInfo.likes || firstPost.pageLikes || 0
  const pageLikes = pageInfo.likes || firstPost.pageLikes || followers
  
  console.log('[apify] Facebook - pageName:', pageName, 'posts:', posts.length, 'followers:', followers)
  
  // Calculate averages from posts
  const totalReactions = posts.reduce((sum: number, p: any) => {
    // Reactions can be total or broken down
    const reactions = p.likes || p.reactions?.total || p.reactionsCount || 0
    return sum + reactions
  }, 0)
  const totalComments = posts.reduce((sum: number, p: any) => {
    const comments = p.comments || p.commentsCount || 0
    return sum + comments
  }, 0)
  const totalShares = posts.reduce((sum: number, p: any) => {
    const shares = p.shares || p.sharesCount || 0
    return sum + shares
  }, 0)
  const totalViews = posts.reduce((sum: number, p: any) => {
    const views = p.videoViews || p.views || p.videoViewCount || 0
    return sum + views
  }, 0)
  
  const avgLikes = posts.length > 0 ? Math.round(totalReactions / posts.length) : 0
  const avgComments = posts.length > 0 ? Math.round(totalComments / posts.length) : 0
  const avgShares = posts.length > 0 ? Math.round(totalShares / posts.length) : 0
  const avgViews = posts.length > 0 ? Math.round(totalViews / posts.length) : 0
  
  // Calculate engagement rate (if we have followers)
  const engagementRate = followers > 0 
    ? ((avgLikes + avgComments + avgShares) / followers) * 100 
    : (avgLikes + avgComments > 0 ? 1 : 0) // Default to 1% if we have engagement but no follower count

  // Map recent posts
  const recentPosts = posts.slice(0, 10).map((p: any, i: number) => {
    // Determine post type from media
    let type = 'text'
    const media = p.media || []
    if (p.isVideo || media.some((m: any) => m.type === 'video')) type = 'video'
    else if (media.length > 1) type = 'album'
    else if (media.length === 1 || p.imageUrl || p.photoUrl) type = 'photo'
    else if (p.link || p.externalUrl) type = 'link'
    
    // Get thumbnail
    const thumbnail = p.imageUrl || 
                     p.photoUrl ||
                     media[0]?.thumbnail ||
                     media[0]?.url ||
                     p.videoThumbnail ||
                     null

    return {
      id: p.postId || p.id || p.postUrl?.split('/').pop() || `post_${i}`,
      type,
      likes: p.likes || p.reactions?.total || p.reactionsCount || 0,
      comments: p.comments || p.commentsCount || 0,
      views: p.videoViews || p.views || 0,
      shares: p.shares || p.sharesCount || 0,
      posted_at: getValidDate(p.time || p.timestamp || p.date || p.publishedAt),
      caption: p.postText || p.text || p.message || '',
      url: p.postUrl || p.url || `https://facebook.com/${p.postId || p.id}`,
      thumbnail,
    }
  })

  // Calculate top posts by score
  const topPosts = [...recentPosts]
    .map(p => ({ ...p, score: p.likes + p.comments * 2 + p.shares * 3 + p.views * 0.1 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return {
    username,
    platform: 'facebook',
    page_name: pageName,
    followers,
    following: 0, // Facebook pages don't have following count
    posts: posts.length,
    page_likes: pageLikes,
    avg_likes: avgLikes,
    avg_comments: avgComments,
    avg_shares: avgShares,
    avg_views: avgViews,
    engagement_rate: parseFloat(engagementRate.toFixed(2)),
    bio: firstPost.pageDescription || firstPost.about || '',
    profile_image: pageLogo || `https://api.dicebear.com/7.x/initials/svg?seed=${username}`,
    cover_image: firstPost.coverPhoto || null,
    category: firstPost.pageCategory || '',
    website: firstPost.pageWebsite || pageInfo.website || '',
    recent_posts: recentPosts,
    top_posts: topPosts,
    verified: firstPost.isVerified || false,
    growth: {
      followers_7d: 0,
      followers_30d: 0,
      engagement_trend: 'stable',
    },
  }
}

async function generateProfileAnalysis(platform: string, username: string, data: any) {
  const platformConfig = platforms[platform as keyof typeof platforms]
  
  const text = await generateWithOpenAI({
    system: `Eres un analista de redes sociales experto. Analiza perfiles y proporciona insights accionables en español.`,
    prompt: `Analiza este perfil de ${platformConfig.name}:

Usuario: @${username}
Seguidores: ${data.followers.toLocaleString()}
Siguiendo: ${data.following.toLocaleString()}
Publicaciones: ${data.posts}
Engagement Rate: ${data.engagement_rate}%
Promedio Likes: ${data.avg_likes.toLocaleString()}
Promedio Comentarios: ${data.avg_comments.toLocaleString()}
Promedio Vistas: ${data.avg_views.toLocaleString()}

Crecimiento:
- Últimos 7 días: ${data.growth.followers_7d > 0 ? '+' : ''}${data.growth.followers_7d.toLocaleString()} seguidores
- Últimos 30 días: ${data.growth.followers_30d > 0 ? '+' : ''}${data.growth.followers_30d.toLocaleString()} seguidores
- Tendencia engagement: ${data.growth.engagement_trend === 'up' ? 'Subiendo' : 'Bajando'}

Top 5 posts por engagement:
${data.top_posts.map((p: any, i: number) => `${i + 1}. [${p.type}] Likes: ${p.likes.toLocaleString()}, Comentarios: ${p.comments.toLocaleString()}, Vistas: ${p.views.toLocaleString()}`).join('\n')}

Responde con un objeto JSON con esta estructura:
{
  "summary": "Resumen ejecutivo del perfil (2-3 oraciones)",
  "strengths": ["Fortaleza 1", "Fortaleza 2", "Fortaleza 3"],
  "weaknesses": ["Debilidad 1", "Debilidad 2"],
  "opportunities": ["Oportunidad 1", "Oportunidad 2"],
  "content_strategy": "Descripción de la estrategia de contenido detectada",
  "posting_frequency": "Frecuencia de publicación estimada",
  "best_content_type": "Tipo de contenido con mejor rendimiento",
  "audience_insights": "Insights sobre la audiencia",
  "recommendations": ["Recomendación 1", "Recomendación 2", "Recomendación 3"],
  "competitive_score": 85
}`,
    temperature: 0.5,
    jsonMode: true,
  })

  try {
    return JSON.parse(text)
  } catch {
    return {
      summary: 'Análisis no disponible - error al procesar respuesta',
      strengths: [],
      weaknesses: [],
      opportunities: [],
      recommendations: [],
      competitive_score: 70,
    }
  }
}
