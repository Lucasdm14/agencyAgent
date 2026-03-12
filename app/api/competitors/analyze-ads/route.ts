import { createClient } from '@/lib/supabase/server'
import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

const AdsAnalysisSchema = z.object({
  strategy_overview: z.string().describe('Resumen de la estrategia publicitaria'),
  main_messages: z.array(z.string()).describe('Mensajes principales detectados'),
  offer_patterns: z.array(z.string()).describe('Patrones de ofertas/promociones'),
  creative_insights: z.string().describe('Insights sobre los creativos'),
  targeting_hypothesis: z.string().describe('Hipótesis sobre el targeting'),
  recommendations: z.string().describe('Recomendaciones para competir'),
})

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { competitorId, csvData, periodStart, periodEnd } = await request.json()

  if (!competitorId || !csvData || !periodStart || !periodEnd) {
    return Response.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  try {
    // Parse CSV data
    const lines = csvData.split('\n').filter((line: string) => line.trim())
    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase())
    
    const ads = lines.slice(1).map((line: string) => {
      const values = line.split(',')
      const ad: Record<string, any> = {}
      headers.forEach((header: string, i: number) => {
        ad[header] = values[i]?.trim() || ''
      })
      return ad
    })

    // Calculate metrics
    let totalNew = 0, totalActive = 0, totalPaused = 0, totalEnded = 0
    const creativeFormats: Record<string, number> = {}
    const ctaPatterns: Record<string, number> = {}
    const periodStartDate = new Date(periodStart)
    const periodEndDate = new Date(periodEnd)

    const processedAds = ads.map((ad: any) => {
      const status = (ad.status || 'active').toLowerCase()
      const startedAt = ad.started_at || ad.start_date || null
      const firstSeenAt = ad.first_seen_at || ad.first_seen || startedAt
      const lastSeenAt = ad.last_seen || ad.last_seen_at || null

      // Determine if ad is new (first_seen within period)
      const isNewInPeriod = firstSeenAt && new Date(firstSeenAt) >= periodStartDate && new Date(firstSeenAt) <= periodEndDate
      
      if (isNewInPeriod) totalNew++
      
      if (status.includes('active')) totalActive++
      else if (status.includes('paused')) totalPaused++
      else if (status.includes('ended') || status.includes('inactive')) totalEnded++

      const creativeType = ad.creative_type || ad.format || 'unknown'
      creativeFormats[creativeType] = (creativeFormats[creativeType] || 0) + 1

      const cta = ad.cta || ad.call_to_action || ''
      if (cta) {
        ctaPatterns[cta] = (ctaPatterns[cta] || 0) + 1
      }

      return {
        ad_library_id: ad.ad_id || ad.id || null,
        ad_url: ad.url || ad.ad_url || null,
        status: isNewInPeriod ? 'new' : status,
        creative_type: creativeType,
        headline: ad.headline || ad.title || null,
        body_text: ad.body || ad.body_text || ad.description || null,
        cta: cta || null,
        started_at: startedAt,
        last_seen_at: lastSeenAt,
        platforms: ad.platforms ? ad.platforms.split(';') : ['facebook'],
      }
    })

    // Calculate ad persistence (ads seen in multiple snapshots)
    const adsWithDuration = processedAds.filter((ad: any) => ad.started_at && ad.last_seen_at)
    const avgAdDuration = adsWithDuration.length > 0
      ? adsWithDuration.reduce((sum: number, ad: any) => {
          const start = new Date(ad.started_at)
          const end = new Date(ad.last_seen_at)
          return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        }, 0) / adsWithDuration.length
      : 0

    // Calculate creative rotation (how often they change creatives)
    const periodDays = Math.ceil((periodEndDate.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24))
    const creativeRotationRate = periodDays > 0 ? totalNew / periodDays : 0

    // AI Analysis
    let aiAnalysis = null
    try {
      const { output } = await generateText({
        model: openai('gpt-4o-mini'),
        system: `Eres un analista de publicidad digital especializado en Meta Ads. 
Analiza los anuncios de un competidor y extrae patrones estratégicos, mensajes clave y recomendaciones.
Responde en español.`,
        prompt: `Analiza estos ${processedAds.length} anuncios de Meta Ads del período ${periodStart} al ${periodEnd}:

MÉTRICAS GENERALES:
- Total anuncios analizados: ${processedAds.length}
- Anuncios nuevos en el período: ${totalNew}
- Anuncios activos: ${totalActive}
- Anuncios pausados: ${totalPaused}
- Anuncios finalizados: ${totalEnded}

MÉTRICAS DE ROTACIÓN:
- Duración promedio de ads: ${Math.round(avgAdDuration)} días
- Tasa de rotación creativa: ${creativeRotationRate.toFixed(2)} ads nuevos/día
- Período analizado: ${periodDays} días

FORMATOS CREATIVOS: ${JSON.stringify(creativeFormats)}

CTAs MÁS USADOS: ${JSON.stringify(ctaPatterns)}

MUESTRA DE ANUNCIOS (top 10):
${processedAds.slice(0, 10).map((a: any, i: number) => `
${i + 1}. [${a.status}] ${a.creative_type}
   Headline: ${a.headline || 'N/A'}
   Body: ${a.body_text?.substring(0, 100) || 'N/A'}
   CTA: ${a.cta || 'N/A'}`).join('\n')}

Proporciona un análisis estratégico completo incluyendo:
1. Estrategia general del competidor
2. Patrones de mensajes y ofertas
3. Insights sobre la rotación creativa
4. Hipótesis de targeting
5. Recomendaciones para competir`,
        output: Output.object({
          schema: AdsAnalysisSchema,
        }),
      })
      aiAnalysis = output
    } catch (aiError) {
      console.error('AI analysis error:', aiError)
    }

    // Save analysis to database
    const { data: analysis, error: analysisError } = await supabase
      .from('competitor_ads_analysis')
      .insert({
        competitor_id: competitorId,
        period_start: periodStart,
        period_end: periodEnd,
        total_new_ads: totalNew,
        total_active_ads: totalActive,
        total_paused_ads: totalPaused,
        total_ended_ads: totalEnded,
        creative_formats: creativeFormats,
        cta_patterns: ctaPatterns,
        main_messages: aiAnalysis?.main_messages || [],
        offer_patterns: aiAnalysis?.offer_patterns || [],
        frequency_analysis: {
          avg_ad_duration_days: Math.round(avgAdDuration),
          creative_rotation_rate: creativeRotationRate.toFixed(2),
          period_days: periodDays,
          new_ads_in_period: totalNew,
        },
        strategy_summary: aiAnalysis?.strategy_overview || null,
        raw_data: {
          total_ads_analyzed: processedAds.length,
          creative_insights: aiAnalysis?.creative_insights || null,
          targeting_hypothesis: aiAnalysis?.targeting_hypothesis || null,
        },
        analyzed_by: user.id,
      })
      .select()
      .single()

    if (analysisError) {
      console.error('Database error:', analysisError)
      return Response.json({ error: 'Error guardando análisis' }, { status: 500 })
    }

    // Save individual ads
    const adsToInsert = processedAds.map((ad: any) => ({
      competitor_id: competitorId,
      ...ad,
    }))

    await supabase.from('competitor_ads').insert(adsToInsert)

    return Response.json({ 
      success: true, 
      analysis,
      adsAnalyzed: processedAds.length 
    })

  } catch (error) {
    console.error('Error:', error)
    return Response.json({ error: 'Error procesando datos' }, { status: 500 })
  }
}
