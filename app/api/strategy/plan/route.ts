/**
 * Step 2 — Estratega generates the content plan.
 * POST /api/strategy/plan
 */
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import OpenAI from 'openai'
import { resolveAgentPrompt } from '@/lib/prompts'
import type { Brand, Agent, StrategyPostPlan } from '@/lib/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function parseJSON<T>(raw: string): T {
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(clean) as T
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { brand, estratega, num_days, period_label, selected_platforms } = await req.json() as {
    brand:        Brand
    estratega:    Agent
    num_days:     number
    period_label: string
  }

  if (!brand || !estratega || !num_days || !period_label) {
    return NextResponse.json({ error: 'brand, estratega, num_days y period_label son requeridos' }, { status: 400 })
  }

  const systemPrompt = resolveAgentPrompt(estratega, brand, {
    num_days:     String(num_days),
    platforms:    (selected_platforms ?? ['instagram','facebook','linkedin']).join(', '),
    period:       period_label,
  })

  try {
    const res = await openai.chat.completions.create({
      model:           'gpt-4o',
      temperature:     0.6,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: `Creá el plan de ${num_days} días para ${period_label}.` },
      ],
    })

    const plan = parseJSON<{
      pillars:            string[]
      strategy_rationale: string
      posts:              StrategyPostPlan[]
    }>(res.choices[0]?.message?.content ?? '{}')

    return NextResponse.json(plan)
  } catch (err) {
    console.error('[Strategy/Plan]', err)
    return NextResponse.json({ error: 'Error al generar el plan. Verificá tu OPENAI_API_KEY.' }, { status: 500 })
  }
}
