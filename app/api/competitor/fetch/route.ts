import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { fetchMetaAds } from '@/lib/free-apis/meta-ads'
import { fetchNews } from '@/lib/free-apis/newsapi'
import { fetchRSSFeed } from '@/lib/free-apis/rss'
import { fetchYouTubeVideos } from '@/lib/free-apis/youtube'
import type { CompetitorHandle, RealContext, RSSItem } from '@/lib/types'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { competitor, keywords, rss_feeds } = await req.json() as {
    competitor: CompetitorHandle
    keywords:   string[]
    rss_feeds:  string[]
  }

  if (!competitor?.name) {
    return NextResponse.json({ error: 'competitor.name es requerido' }, { status: 400 })
  }

  const [metaAds, news, competitorRss, youtubeVideos] = await Promise.all([
    competitor.facebook_page_name
      ? fetchMetaAds(competitor.facebook_page_name)
      : Promise.resolve([]),
    fetchNews([competitor.name, ...keywords].slice(0, 4)),
    competitor.website_url ? fetchRSSFeed(competitor.website_url) : Promise.resolve([]),
    competitor.youtube_channel ? fetchYouTubeVideos(competitor.youtube_channel) : Promise.resolve([]),
  ])

  // FIX: was using typeof rssItems (wrong scope) — now explicit RSSItem[]
  const industryRss: RSSItem[] = rss_feeds?.length > 0
    ? await Promise.allSettled(rss_feeds.slice(0, 3).map(u => fetchRSSFeed(u)))
        .then(results =>
          results
            .filter((r): r is PromiseFulfilledResult<RSSItem[]> => r.status === 'fulfilled')
            .flatMap(r => r.value)
        )
    : []

  const context: RealContext = {
    news,
    rss:            [...competitorRss, ...industryRss].slice(0, 20),
    meta_ads:       metaAds,
    youtube_videos: youtubeVideos,
    fetched_at:     new Date().toISOString(),
  }

  return NextResponse.json({
    context,
    summary: {
      meta_ads_found: metaAds.length,
      news_found:     news.length,
      rss_found:      context.rss.length,
      youtube_found:  youtubeVideos.length,
      has_any_data:   metaAds.length + news.length + context.rss.length + youtubeVideos.length > 0,
    },
  })
}
