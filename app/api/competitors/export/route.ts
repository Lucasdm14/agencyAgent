import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { competitorIds, format, dateFrom, dateTo, includeAds } = await request.json()

    if (!competitorIds || competitorIds.length === 0) {
      return NextResponse.json({ error: 'Selecciona al menos un competidor' }, { status: 400 })
    }

    // Fetch competitors
    const { data: competitors } = await supabase
      .from('competitors')
      .select('*')
      .in('id', competitorIds)

    if (!competitors || competitors.length === 0) {
      return NextResponse.json({ error: 'No se encontraron competidores' }, { status: 404 })
    }

    // Fetch snapshots with date filter
    let snapshotsQuery = supabase
      .from('competitor_snapshots')
      .select('*')
      .in('competitor_id', competitorIds)
      .order('snapshot_date', { ascending: false })

    if (dateFrom) {
      snapshotsQuery = snapshotsQuery.gte('snapshot_date', dateFrom)
    }
    if (dateTo) {
      snapshotsQuery = snapshotsQuery.lte('snapshot_date', dateTo)
    }

    const { data: snapshots } = await snapshotsQuery

    // Fetch ads if requested
    let ads: any[] = []
    if (includeAds) {
      const { data: adsData } = await supabase
        .from('competitor_ads')
        .select('*')
        .in('competitor_id', competitorIds)
        .order('started_at', { ascending: false })
      ads = adsData || []
    }

    // Build export data
    const exportData = competitors.map(competitor => {
      const competitorSnapshots = snapshots?.filter(s => s.competitor_id === competitor.id) || []
      const latestSnapshot = competitorSnapshots[0]
      const competitorAds = ads.filter(a => a.competitor_id === competitor.id)

      // Calculate period metrics
      const periodMetrics = calculatePeriodMetrics(competitorSnapshots)

      return {
        competitor: {
          name: competitor.name,
          platform: competitor.platform,
          username: competitor.platform_username,
          url: competitor.url,
        },
        current_metrics: {
          followers: competitor.follower_count,
          following: competitor.following_count,
          posts: competitor.posts_count,
          engagement_rate: competitor.engagement_rate,
          avg_likes: competitor.avg_likes,
          avg_comments: competitor.avg_comments,
          avg_views: competitor.avg_views,
        },
        period_metrics: periodMetrics,
        top_posts: latestSnapshot?.top_posts?.slice(0, 5) || [],
        ai_analysis: latestSnapshot?.ai_analysis || null,
        ads_summary: includeAds ? {
          total_ads: competitorAds.length,
          active_ads: competitorAds.filter(a => a.is_active).length,
          ads_by_type: competitorAds.reduce((acc: any, ad) => {
            acc[ad.ad_type] = (acc[ad.ad_type] || 0) + 1
            return acc
          }, {}),
          ads: competitorAds.slice(0, 10).map(ad => ({
            headline: ad.headline,
            cta: ad.cta,
            type: ad.ad_type,
            started: ad.started_at,
            is_active: ad.is_active,
          })),
        } : null,
        snapshots_count: competitorSnapshots.length,
      }
    })

    // Generate comparison if multiple competitors
    const comparison = competitors.length > 1 ? generateComparison(exportData) : null

    if (format === 'csv') {
      const csv = generateCSV(exportData, comparison)
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="competitors-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // Default JSON format
    return NextResponse.json({
      export_date: new Date().toISOString(),
      period: { from: dateFrom, to: dateTo },
      competitors: exportData,
      comparison,
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Error exportando datos' }, { status: 500 })
  }
}

function calculatePeriodMetrics(snapshots: any[]) {
  if (snapshots.length === 0) return null

  const first = snapshots[snapshots.length - 1]
  const last = snapshots[0]

  return {
    period_days: Math.ceil((new Date(last.snapshot_date).getTime() - new Date(first.snapshot_date).getTime()) / (1000 * 60 * 60 * 24)) + 1,
    follower_change: (last.follower_count || 0) - (first.follower_count || 0),
    follower_change_pct: first.follower_count ? (((last.follower_count - first.follower_count) / first.follower_count) * 100).toFixed(2) : 0,
    posts_change: (last.posts_count || 0) - (first.posts_count || 0),
    avg_engagement_rate: (snapshots.reduce((sum, s) => sum + (s.engagement_rate || 0), 0) / snapshots.length).toFixed(2),
    total_likes: snapshots.reduce((sum, s) => {
      const posts = s.recent_posts || s.top_posts || []
      return sum + posts.reduce((ps: number, p: any) => ps + (p.likes || 0), 0)
    }, 0),
    total_comments: snapshots.reduce((sum, s) => {
      const posts = s.recent_posts || s.top_posts || []
      return sum + posts.reduce((ps: number, p: any) => ps + (p.comments || 0), 0)
    }, 0),
    total_views: snapshots.reduce((sum, s) => {
      const posts = s.recent_posts || s.top_posts || []
      return sum + posts.reduce((ps: number, p: any) => ps + (p.views || 0), 0)
    }, 0),
  }
}

function generateComparison(exportData: any[]) {
  const sorted = {
    by_followers: [...exportData].sort((a, b) => (b.current_metrics.followers || 0) - (a.current_metrics.followers || 0)),
    by_engagement: [...exportData].sort((a, b) => (b.current_metrics.engagement_rate || 0) - (a.current_metrics.engagement_rate || 0)),
    by_growth: [...exportData].sort((a, b) => {
      const growthA = parseFloat(a.period_metrics?.follower_change_pct || 0)
      const growthB = parseFloat(b.period_metrics?.follower_change_pct || 0)
      return growthB - growthA
    }),
  }

  return {
    rankings: {
      by_followers: sorted.by_followers.map((c, i) => ({ rank: i + 1, name: c.competitor.name, value: c.current_metrics.followers })),
      by_engagement: sorted.by_engagement.map((c, i) => ({ rank: i + 1, name: c.competitor.name, value: c.current_metrics.engagement_rate })),
      by_growth: sorted.by_growth.map((c, i) => ({ rank: i + 1, name: c.competitor.name, value: `${c.period_metrics?.follower_change_pct || 0}%` })),
    },
    averages: {
      avg_followers: Math.round(exportData.reduce((sum, c) => sum + (c.current_metrics.followers || 0), 0) / exportData.length),
      avg_engagement: (exportData.reduce((sum, c) => sum + (c.current_metrics.engagement_rate || 0), 0) / exportData.length).toFixed(2),
      avg_posts: Math.round(exportData.reduce((sum, c) => sum + (c.current_metrics.posts || 0), 0) / exportData.length),
    },
  }
}

function generateCSV(exportData: any[], comparison: any) {
  const headers = [
    'Competidor',
    'Plataforma',
    'Username',
    'Seguidores',
    'Siguiendo',
    'Posts',
    'Engagement Rate',
    'Avg Likes',
    'Avg Comments',
    'Avg Views',
    'Cambio Seguidores',
    'Cambio Seguidores %',
    'Posts en Periodo',
    'Total Likes Periodo',
    'Total Comments Periodo',
    'Total Views Periodo',
  ]

  const rows = exportData.map(data => [
    data.competitor.name,
    data.competitor.platform,
    data.competitor.username,
    data.current_metrics.followers || 0,
    data.current_metrics.following || 0,
    data.current_metrics.posts || 0,
    data.current_metrics.engagement_rate || 0,
    data.current_metrics.avg_likes || 0,
    data.current_metrics.avg_comments || 0,
    data.current_metrics.avg_views || 0,
    data.period_metrics?.follower_change || 0,
    data.period_metrics?.follower_change_pct || 0,
    data.period_metrics?.posts_change || 0,
    data.period_metrics?.total_likes || 0,
    data.period_metrics?.total_comments || 0,
    data.period_metrics?.total_views || 0,
  ])

  let csv = headers.join(',') + '\n'
  csv += rows.map(row => row.join(',')).join('\n')

  // Add comparison section if available
  if (comparison) {
    csv += '\n\n--- COMPARATIVA ---\n'
    csv += 'Ranking por Seguidores\n'
    comparison.rankings.by_followers.forEach((r: any) => {
      csv += `${r.rank},${r.name},${r.value}\n`
    })
    csv += '\nRanking por Engagement\n'
    comparison.rankings.by_engagement.forEach((r: any) => {
      csv += `${r.rank},${r.name},${r.value}\n`
    })
    csv += '\nPromedios\n'
    csv += `Avg Seguidores,${comparison.averages.avg_followers}\n`
    csv += `Avg Engagement,${comparison.averages.avg_engagement}\n`
    csv += `Avg Posts,${comparison.averages.avg_posts}\n`
  }

  return csv
}
