import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import OpenAI from 'openai'
import {
  creatorSystem, creatorPrompt,
  supervisorSystem, supervisorPrompt,
} from '@/lib/prompts'
import { fetchNews } from '@/lib/free-apis/newsapi'
import { fetchMultipleFeeds } from '@/lib/free-apis/rss'
import { fetchMetaAds } from '@/lib/free-apis/meta-ads'
import type { Brand, Agent } from '@/lib/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function parseJSON<T>(raw: string): T {
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(clean) as T
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { brand, image_base64, platform, agent } = await req.json() as {
    brand:        Brand
    image_base64: string
    platform:     string
    agent?:       Agent | null
  }

  if (!brand || !image_base64 || !platform) {
    return NextResponse.json(
      { error: 'brand, image_base64 y platform son requeridos' },
      { status: 400 }
    )
  }

  const brandbookJson = JSON.stringify(brand.brandbook_rules, null, 2)

  // ── 1. Fetch real-world context (anti-hallucination layer) ─────────────────
  const keywords = brand.news_keywords?.length > 0
    ? brand.news_keywords
    : [brand.industry, brand.name].filter(Boolean)

  const competitorAdPromises = (brand.competitors ?? [])
    .filter(c => c.facebook_page_name)
    .slice(0, 2)
    .map(c => fetchMetaAds(c.facebook_page_name!))

  const [newsItems, rssItems, ...competitorAdArrays] = await Promise.all([
    fetchNews(keywords),
    fetchMultipleFeeds(brand.rss_feeds ?? []),
    ...competitorAdPromises,
  ])

  const competitorAds = competitorAdArrays.flat().slice(0, 10)

  const contextSummary = {
    news_count:           newsItems.length,
    rss_count:            rssItems.length,
    competitor_ads_count: competitorAds.length,
    sources: [
      ...(newsItems.length     > 0 ? ['NewsAPI'] : []),
      ...(rssItems.length      > 0 ? ['RSS feeds'] : []),
      ...(competitorAds.length > 0 ? ['Meta Ad Library'] : []),
    ],
  }

  // ── 2. Creator — GPT-4o with vision ──────────────────────────────────────
  let creator: {
    generated_copy:    string
    hashtags:          string[]
    visual_description: string
    rationale:         string
  }

  try {
    const res = await openai.chat.completions.create({
      model:           'gpt-4o',
      temperature:     0.8,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: creatorSystem(brand.name, platform, agent) },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: image_base64 } },
            {
              type: 'text',
              text: creatorPrompt(brandbookJson, platform, {
                news:            newsItems,
                rss:             rssItems,
                competitor_ads:  competitorAds,
              }, agent),
            },
          ],
        },
      ],
    })
    creator = parseJSON(res.choices[0]?.message?.content ?? '{}')
  } catch (err) {
    console.error('[Creator]', err)
    return NextResponse.json(
      { error: 'Error al generar copy. Verificá tu OPENAI_API_KEY.' },
      { status: 500 }
    )
  }

  // ── 3. Supervisor — GPT-4o-mini ───────────────────────────────────────────
  let supervisor: {
    score:              number
    overall_approved:   boolean
    clause_validations: { rule: string; category: string; passed: boolean; comment: string | null }[]
    critical_violations: number
    suggested_fix:      string | null
  }

  try {
    const res = await openai.chat.completions.create({
      model:           'gpt-4o-mini',
      temperature:     0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: supervisorSystem() },
        {
          role: 'user',
          content: supervisorPrompt(brandbookJson, creator.generated_copy, creator.hashtags, agent),
        },
      ],
    })
    supervisor = parseJSON(res.choices[0]?.message?.content ?? '{}')
  } catch {
    supervisor = {
      score:               5,
      overall_approved:    false,
      clause_validations:  [],
      critical_violations: 0,
      suggested_fix:       'Supervisor no disponible — revisá manualmente.',
    }
  }

  return NextResponse.json({ creator, supervisor, context: contextSummary })
}
