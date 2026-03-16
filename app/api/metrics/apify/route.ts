/**
 * POST /api/metrics/apify
 * Multi-mode Apify fetcher: instagram_posts, instagram_ads, instagram_analysis
 */
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { fetchInstagramMetrics, fetchMetaAdLibraryApify } from '@/lib/free-apis/apify'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function parseJSON<T>(raw: string): T {
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(clean) as T
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json() as {
    type:         'instagram_posts' | 'instagram_ads' | 'instagram_analysis' | 'meta_ads'
    username?:    string
    page_name?:   string
    period_days?: number
    countries?:   string[]
  }

  if (!process.env.APIFY_TOKEN) {
    return NextResponse.json(
      { error: 'APIFY_TOKEN no configurado. Agregalo en las variables de entorno de Vercel.' },
      { status: 422 }
    )
  }

  // ── Instagram Posts (organic) ──────────────────────────────────────────────
  if (body.type === 'instagram_posts') {
    if (!body.username) return NextResponse.json({ error: 'username requerido' }, { status: 400 })
    const metrics = await fetchInstagramMetrics(body.username, body.period_days ?? 30)
    if (!metrics) {
      return NextResponse.json(
        { error: `No se encontraron posts para @${body.username}. Verificá que la cuenta sea pública.` },
        { status: 404 }
      )
    }
    return NextResponse.json({ metrics })
  }

  // ── Instagram Ads via Meta Ad Library ─────────────────────────────────────
  if (body.type === 'instagram_ads' || body.type === 'meta_ads') {
    const name = body.page_name ?? body.username
    if (!name) return NextResponse.json({ error: 'page_name o username requerido' }, { status: 400 })
    const data = await fetchMetaAdLibraryApify(name, body.countries)
    return NextResponse.json({ data })
  }

  // ── AI Analysis of posts ───────────────────────────────────────────────────
  if (body.type === 'instagram_analysis') {
    if (!body.username) return NextResponse.json({ error: 'username requerido' }, { status: 400 })
    const metrics = await fetchInstagramMetrics(body.username, body.period_days ?? 30)
    if (!metrics) {
      return NextResponse.json({ error: `No se encontraron datos para @${body.username}` }, { status: 404 })
    }

    // Build data summary for AI
    const summary = {
      username:         metrics.username,
      period_days:      metrics.period_days,
      posts_count:      metrics.posts_count,
      avg_likes:        metrics.avg_likes,
      avg_comments:     metrics.avg_comments,
      avg_views:        metrics.avg_views,
      format_breakdown: metrics.format_breakdown,
      top_hooks:        metrics.top_hooks,
      best_content_types: metrics.best_content_types,
      top_posts_captions: metrics.top_posts.slice(0, 5).map(p => ({
        caption: p.caption?.slice(0, 200),
        likes:   p.likes,
        views:   p.views,
        type:    p.type,
        score:   Math.round(p.score),
      })),
    }

    try {
      const res = await openai.chat.completions.create({
        model:           'gpt-4o-mini',
        temperature:     0.3,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Sos un analista experto en contenido de Instagram para agencias de marketing. 
Analizás datos reales de cuentas y extraés insights accionables.
Solo trabajás con los datos que se te proveen. No inventés métricas.
Respondé SOLO con JSON válido.`,
          },
          {
            role: 'user',
            content: `Analizá esta cuenta de Instagram y generá un análisis completo:

DATOS REALES:
${JSON.stringify(summary, null, 2)}

Respondé SOLO con este JSON:
{
  "top_hook_patterns": ["patrón de hook detectado en los mejores posts"],
  "best_formats": ["formato con mejor performance y por qué"],
  "content_themes": ["tema recurrente en los mejores posts"],
  "posting_frequency": "frecuencia detectada basada en los datos",
  "engagement_insights": ["insight específico sobre engagement"],
  "recommendations": ["recomendación concreta y accionable basada en los datos"],
  "strengths": ["fortaleza detectada del contenido"],
  "weaknesses": ["debilidad o área de mejora detectada"]
}`,
          },
        ],
      })

      const analysis = parseJSON<{
        top_hook_patterns:   string[]
        best_formats:        string[]
        content_themes:      string[]
        posting_frequency:   string
        engagement_insights: string[]
        recommendations:     string[]
        strengths:           string[]
        weaknesses:          string[]
      }>(res.choices[0]?.message?.content ?? '{}')

      return NextResponse.json({
        metrics,
        ai_analysis: { ...analysis, generated_at: new Date().toISOString() },
      })
    } catch (err) {
      console.error('[Instagram Analysis]', err)
      return NextResponse.json({ error: 'Error al generar análisis IA' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'type inválido' }, { status: 400 })
}
