import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

const APIFY_API_KEY = process.env.APIFY_API_KEY

// Apify actor for Meta Ad Library
// IMPORTANT: Use ~ instead of / for API URL format  
const META_ADS_ACTOR = 'apify~facebook-ads-scraper'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { competitorId, pageId, pageName, searchTerm } = await request.json()

    if (!competitorId) {
      return NextResponse.json({ error: 'Falta competitorId' }, { status: 400 })
    }

    // Get competitor to get facebook_page_id if available
    const { data: competitor } = await supabase
      .from('competitors')
      .select('name, platform, platform_username, facebook_page_id')
      .eq('id', competitorId)
      .single()

    // Determine search query - prioritize facebook_page_id, then pageId, then name
    const searchQuery = competitor?.facebook_page_id || pageId || pageName || competitor?.name || searchTerm
    
    if (!searchQuery) {
      return NextResponse.json({ error: 'Falta nombre o ID de pagina para buscar' }, { status: 400 })
    }
    
    console.log('[meta-ads] Search query:', searchQuery, 'for competitor:', competitor?.name)

    // If no APIFY key, fetch existing ads from DB and provide helpful message
    if (!APIFY_API_KEY) {
      const { data: existingAds } = await supabase
        .from('competitor_ads')
        .select('*')
        .eq('competitor_id', competitorId)
        .order('active', { ascending: false })
        .order('started_at', { ascending: false })
        .limit(100)

      const activeCount = existingAds?.filter(a => a.active).length || 0
      const totalCount = existingAds?.length || 0

      return NextResponse.json({
        success: true,
        message: totalCount > 0 
          ? `Mostrando ${totalCount} ads guardados. Para obtener ads nuevos, configura APIFY_API_KEY o sube un CSV desde Meta Ad Library.`
          : 'Para obtener ads, sube un CSV exportado de Meta Ad Library (facebook.com/ads/library) en la pestana "Cargar Datos".',
        summary: {
          total_active: activeCount,
          total: totalCount,
        },
        ads: existingAds || [],
      })
    }

    // Fetch ads from Meta Ad Library using Apify
    const adsData = await fetchMetaAds(searchQuery)
    
    // Analyze ads with AI
    const adsAnalysis = await analyzeAds(adsData)

    // Save to database
    const { data: existingAds } = await supabase
      .from('competitor_ads')
      .select('ad_id')
      .eq('competitor_id', competitorId)

    const existingAdIds = new Set(existingAds?.map(a => a.ad_id) || [])
    const currentAdIds = new Set(adsData.ads.map((a: any) => a.id))

    // Determine new, active, and stopped ads
    const newAds = adsData.ads.filter((a: any) => !existingAdIds.has(a.id))
    const activeAds = adsData.ads.filter((a: any) => existingAdIds.has(a.id))
    const stoppedAds = [...existingAdIds].filter(id => !currentAdIds.has(id))

    // Save new ads
    if (newAds.length > 0) {
      console.log('[meta-ads] Saving', newAds.length, 'new ads to database')
      
      const adsToInsert = newAds.map((ad: any) => ({
        competitor_id: competitorId,
        ad_id: ad.id,
        ad_type: ad.type || 'unknown',
        creative_url: ad.imageUrl,
        video_url: ad.videoUrl,
        headline: ad.headline,
        body_text: ad.bodyText,
        cta: ad.cta,
        landing_url: ad.landingUrl,
        started_at: ad.startDate ? new Date(ad.startDate) : new Date(),
        stopped_at: ad.endDate ? new Date(ad.endDate) : null,
        active: ad.isActive !== false,
        platforms: ad.platforms || ['facebook'],
        page_name: ad.pageName,
        raw_data: ad,
      }))
      
      const { error: insertError } = await supabase.from('competitor_ads').insert(adsToInsert)
      
      if (insertError) {
        console.error('[meta-ads] Error inserting ads:', insertError)
      }
    }

    // Mark stopped ads
    if (stoppedAds.length > 0) {
      await supabase
        .from('competitor_ads')
        .update({ active: false, stopped_at: new Date() })
        .in('ad_id', stoppedAds)
    }

    // Save ads snapshot
    await supabase.from('competitor_ads_snapshots').insert({
      competitor_id: competitorId,
      snapshot_date: new Date().toISOString().split('T')[0],
      total_active_ads: adsData.ads.length,
      new_ads_count: newAds.length,
      stopped_ads_count: stoppedAds.length,
      ads_by_format: adsData.adsByFormat,
      ads_analysis: adsAnalysis,
      raw_data: adsData,
    })

    // Fetch all ads from DB to return with correct field names
    const { data: allAds } = await supabase
      .from('competitor_ads')
      .select('*')
      .eq('competitor_id', competitorId)
      .order('started_at', { ascending: false })

    return NextResponse.json({
      success: true,
      summary: {
        total_active: adsData.ads.length,
        new_ads: newAds.length,
        still_active: activeAds.length,
        stopped: stoppedAds.length,
      },
      ads: allAds || [],
      analysis: adsAnalysis,
      ads_by_format: adsData.adsByFormat,
    })

  } catch (error: any) {
    console.error('[meta-ads] API error:', error?.message || error)
    return NextResponse.json({ 
      error: 'Error obteniendo ads', 
      details: error?.message || 'Error desconocido',
      success: false 
    }, { status: 500 })
  }
}

async function fetchMetaAds(pageIdentifier: string) {
  if (!APIFY_API_KEY) {
    console.log('[meta-ads] No APIFY_API_KEY configured')
    return generateFallbackAdsData(pageIdentifier)
  }

  try {
    console.log('[meta-ads] Starting Apify scraper for:', pageIdentifier)
    
    // Build the correct input URL format for facebook-ads-scraper
    // The actor accepts either:
    // 1. Meta Ad Library URLs with filters
    // 2. Facebook page names/URLs
    let inputUrl: string
    
    if (pageIdentifier.includes('facebook.com/ads/library')) {
      // Already a Meta Ad Library URL - use as is
      inputUrl = pageIdentifier
    } else if (pageIdentifier.includes('facebook.com')) {
      // Facebook page URL - extract page name
      const pageName = pageIdentifier.split('facebook.com/')[1]?.split('/')[0]?.split('?')[0] || pageIdentifier
      inputUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&media_type=all&search_type=page&view_all_page_id=${pageName}`
    } else if (/^\d+$/.test(pageIdentifier)) {
      // Numeric Page ID - use view_all_page_id
      inputUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&media_type=all&search_type=page&view_all_page_id=${pageIdentifier}`
    } else {
      // Page name - use as keyword search first, or try as page name
      inputUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&media_type=all&search_type=page&view_all_page_id=${encodeURIComponent(pageIdentifier)}`
    }
    
    console.log('[meta-ads] Input URL:', inputUrl)

    // Start the actor run - the actor only needs the URL(s)
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${META_ADS_ACTOR}/runs?token=${APIFY_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: [inputUrl],
          scrapeAdDetails: true,
        }),
      }
    )

    if (!runResponse.ok) {
      const errorText = await runResponse.text()
      console.error('[meta-ads] Apify run failed to start:', runResponse.status, errorText)
      return generateFallbackAdsData(pageIdentifier)
    }

    const runData = await runResponse.json()
    const runId = runData.data?.id
    
    if (!runId) {
      console.error('[meta-ads] No run ID returned:', runData)
      return generateFallbackAdsData(pageIdentifier)
    }
    
    console.log('[meta-ads] Run started with ID:', runId)

    // Poll for completion (max 60 seconds)
    let status = 'RUNNING'
    let attempts = 0
    const maxAttempts = 30
    
    while ((status === 'RUNNING' || status === 'READY') && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`
      )
      const statusData = await statusResponse.json()
      status = statusData.data?.status || 'FAILED'
      attempts++
      
      console.log('[meta-ads] Poll attempt', attempts, 'status:', status)
    }

    if (status !== 'SUCCEEDED') {
      console.error('[meta-ads] Run did not succeed. Final status:', status)
      return generateFallbackAdsData(pageIdentifier)
    }

    // Fetch results from dataset
    const datasetResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_KEY}`
    )
    
    if (!datasetResponse.ok) {
      console.error('[meta-ads] Failed to fetch dataset:', datasetResponse.status)
      return generateFallbackAdsData(pageIdentifier)
    }
    
    const results = await datasetResponse.json()
    console.log('[meta-ads] Got', results.length, 'results from Apify')

    return parseMetaAdsResults(results)
  } catch (error) {
    console.error('[meta-ads] Apify Meta Ads error:', error)
    return generateFallbackAdsData(pageIdentifier)
  }
}

function parseMetaAdsResults(results: any[]) {
  console.log('[meta-ads] Parsing', results.length, 'results')
  
  if (results.length === 0) {
    return { ads: [], adsByFormat: {} }
  }
  
  // Log first result structure for debugging
  if (results[0]) {
    console.log('[meta-ads] First result sample keys:', Object.keys(results[0]).slice(0, 15))
  }
  
  const ads = results.map((ad, i) => {
    // Handle Apify facebook-ads-scraper output format
    // The ad object contains: snapshot, pageInfo, collationCount, etc.
    
    const snapshot = ad.snapshot || {}
    const pageInfo = ad.pageInfo?.page || ad.page || {}
    
    // Get images from snapshot
    const images = snapshot.images || snapshot.cards?.map((c: any) => c.resized_image_url) || []
    const imageUrl = images[0] || ad.imageUrl || ad.thumbnailUrl || null
    
    // Get videos from snapshot
    const videos = snapshot.videos || []
    const videoUrl = videos[0]?.video_sd_url || videos[0]?.video_hd_url || ad.videoUrl || null
    
    // Get ad text - can be in multiple places
    const bodyText = snapshot.body?.text || 
                     snapshot.cards?.[0]?.body || 
                     ad.body || 
                     ad.adCreativeBodies?.join(' ') || 
                     ''
    
    // Get headline/title
    const headline = snapshot.title || 
                     snapshot.cards?.[0]?.title ||
                     ad.title ||
                     ad.adCreativeLinkTitles?.[0] || 
                     ''
    
    // Get CTA
    const cta = snapshot.cta_text ||
                snapshot.cards?.[0]?.cta_text ||
                ad.callToAction ||
                ad.adCreativeLinkCaptions?.[0] ||
                ''
    
    // Get landing URL
    const landingUrl = snapshot.link_url ||
                       snapshot.cards?.[0]?.link_url ||
                       ad.linkUrl ||
                       ad.adCreativeLinkUrls?.[0] ||
                       ''
    
    // Get platforms
    const platforms = ad.publisherPlatform || 
                      ad.publisherPlatforms ||
                      snapshot.publisher_platforms ||
                      ['facebook']
    
    // Determine ad type
    let adType = 'image'
    if (videoUrl) adType = 'video'
    else if (snapshot.cards?.length > 1) adType = 'carousel'
    else if (ad.isAAAEligible) adType = 'dynamic'
    
    return {
      id: ad.adArchiveID || ad.id || ad.ad_id || `ad_${Date.now()}_${i}`,
      type: adType,
      headline,
      bodyText,
      cta,
      imageUrl,
      videoUrl,
      landingUrl,
      startDate: ad.startDate || ad.startDateFormatted || snapshot.creation_time,
      endDate: ad.endDate || ad.endDateFormatted || null,
      platforms: Array.isArray(platforms) ? platforms : [platforms],
      impressions: ad.impressionsText || ad.estimatedAudienceSize || null,
      spend: ad.spendText || ad.spend || null,
      pageName: pageInfo.name || ad.pageName || '',
      pageId: pageInfo.id || ad.pageId || '',
      isActive: ad.isActive !== false,
      collationCount: ad.collationCount || 1,
    }
  })

  // Group by format
  const adsByFormat = ads.reduce((acc: any, ad) => {
    const format = ad.type || 'unknown'
    acc[format] = (acc[format] || 0) + 1
    return acc
  }, {})

  console.log('[meta-ads] Parsed', ads.length, 'ads. Formats:', adsByFormat)

  return { ads, adsByFormat }
}

function generateFallbackAdsData(pageIdentifier: string) {
  // Return empty data - no fake/placeholder data
  console.log('[meta-ads] No ads data available for:', pageIdentifier)
  return { ads: [], adsByFormat: {}, is_fallback: true }
}

async function analyzeAds(adsData: any) {
  try {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: `Eres un experto en análisis de publicidad digital y estrategia de marketing.
Analiza los anuncios de la competencia y proporciona insights accionables.
Responde en formato JSON.`,
      prompt: `Analiza estos anuncios de la competencia:

Total de ads activos: ${adsData.ads.length}
Formatos: ${JSON.stringify(adsData.adsByFormat)}

Muestra de ads:
${adsData.ads.slice(0, 5).map((ad: any) => `
- Tipo: ${ad.type}
- Headline: ${ad.headline}
- Copy: ${ad.bodyText?.slice(0, 100)}
- CTA: ${ad.cta}
`).join('\n')}

Genera un análisis JSON con:
{
  "main_messages": ["mensaje principal 1", "mensaje principal 2"],
  "creative_formats": {"format": "porcentaje o cantidad"},
  "offer_patterns": ["patron de oferta 1", "patron 2"],
  "cta_patterns": ["CTA mas usado 1", "CTA 2"],
  "creative_frequency": "descripcion de frecuencia de nuevas creatividades",
  "key_insights": ["insight 1", "insight 2"],
  "recommendations": ["recomendacion 1", "recomendacion 2"]
}`,
    })

    return JSON.parse(text)
  } catch (error) {
    console.error('Error analyzing ads:', error)
    return {
      main_messages: ['No se pudo analizar'],
      creative_formats: adsData.adsByFormat,
      offer_patterns: [],
      cta_patterns: [],
      creative_frequency: 'Desconocido',
      key_insights: [],
      recommendations: [],
    }
  }
}
