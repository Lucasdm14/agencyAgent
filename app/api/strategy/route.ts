import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import OpenAI from 'openai'
import { strategySystem, strategyPrompt } from '@/lib/prompts'
import { fetchNews } from '@/lib/free-apis/newsapi'
import { fetchMultipleFeeds } from '@/lib/free-apis/rss'
import { fetchMetaAds } from '@/lib/free-apis/meta-ads'
import type { Brand, Agent, MetricsReport } from '@/lib/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function parseJSON<T>(raw: string): T {
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(clean) as T
}

// FIX: was parsing month from a Spanish string which could silently fail.
// Now accepts an explicit year+month pair OR falls back to current month.
function getDaysInMonth(period: string): number {
  const yearMatch  = period.match(/\d{4}/)
  const year       = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear()

  const MONTH_NAMES: Record<string, number> = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
  }
  const found = Object.entries(MONTH_NAMES).find(([name]) =>
    period.toLowerCase().includes(name)
  )
  const month = found ? found[1] : new Date().getMonth()

  // new Date(year, month + 1, 0) → last day of the month
  return new Date(year, month + 1, 0).getDate()
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { brand, period, metrics_report, agent } = await req.json() as {
    brand:           Brand
    period:          string
    metrics_report?: MetricsReport | null
    agent?:          Agent | null
  }

  if (!brand || !period) {
    return NextResponse.json({ error: 'brand y period son requeridos' }, { status: 400 })
  }

  const brandbookJson = JSON.stringify(brand.brandbook_rules, null, 2)

  // ── Fetch real context ──────────────────────────────────────────────────────
  const keywords = brand.news_keywords?.length > 0
    ? brand.news_keywords
    : [brand.industry, brand.name].filter(Boolean)

  const competitorAdPromises = (brand.competitors ?? [])
    .filter(c => c.facebook_page_name)
    .slice(0, 3)
    .map(c => fetchMetaAds(c.facebook_page_name!))

  const [newsItems, rssItems, ...competitorAdArrays] = await Promise.all([
    fetchNews(keywords, 'es', 45),
    fetchMultipleFeeds(brand.rss_feeds ?? []),
    ...competitorAdPromises,
  ])

  const competitorAds = competitorAdArrays.flat().slice(0, 15)

  const dataSources = [
    ...(newsItems.length     > 0 ? [`NewsAPI (${newsItems.length} noticias)`]        : []),
    ...(rssItems.length      > 0 ? [`RSS (${rssItems.length} posts)`]                 : []),
    ...(competitorAds.length > 0 ? [`Meta Ads (${competitorAds.length} avisos)`]      : []),
    ...(metrics_report           ? ['Métricas históricas']                             : []),
  ]

  if (dataSources.length === 0) {
    return NextResponse.json(
      {
        error: 'Sin datos reales disponibles. Configurá news_keywords, RSS feeds o competidores en el perfil de la marca, y verificá que las API keys estén configuradas.',
        data_sources: [],
      },
      { status: 422 }
    )
  }

  const daysInMonth  = getDaysInMonth(period)
  const bestDaysHint = metrics_report?.insights
    ? `Mejor día: ${metrics_report.insights.best_day_of_week}, mejor hora: ${metrics_report.insights.best_time_of_day}`
    : undefined

  try {
    const res = await openai.chat.completions.create({
      model:           'gpt-4o-mini',
      temperature:     0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: strategySystem(brand.name, agent) },
        {
          role: 'user',
          content: strategyPrompt(
            brand.name,
            brandbookJson,
            period,
            daysInMonth,
            {
              news:           newsItems,
              rss:            rssItems,
              competitor_ads: competitorAds,
              best_days:      bestDaysHint,
            },
            agent
          ),
        },
      ],
    })

    const plan = parseJSON<{
      pillars:    string[]
      posts:      {
        day:              number
        platform:         string
        content_type:     string
        topic:            string
        hook_suggestion:  string
        source_reference: string
      }[]
      disclaimer: string
    }>(res.choices[0]?.message?.content ?? '{}')

    return NextResponse.json({
      ...plan,
      data_sources: dataSources,
      period,
    })
  } catch (err) {
    console.error('[Strategy]', err)
    return NextResponse.json(
      { error: 'Error al generar estrategia. Verificá tu OPENAI_API_KEY.' },
      { status: 500 }
    )
  }
}
