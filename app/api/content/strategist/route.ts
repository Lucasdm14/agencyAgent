import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

async function generateWithOpenAI({
  system,
  prompt,
  temperature = 0.7,
  jsonMode = false,
}: {
  system: string
  prompt: string
  temperature?: number
  jsonMode?: boolean
}) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature,
      response_format: jsonMode ? { type: 'json_object' } : undefined,
    }),
  })

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { brandId, content, platform, contentType } = await request.json()

    if (!brandId || !content) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    // Get brand
    const { data: brand } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single()

    if (!brand) {
      return NextResponse.json({ error: 'Marca no encontrada' }, { status: 404 })
    }

    // Get strategist agent for this brand
    const { data: strategistAgent } = await supabase
      .from('agents')
      .select('*')
      .eq('brand_id', brandId)
      .eq('type', 'strategist')
      .eq('is_active', true)
      .single()

    if (!strategistAgent) {
      return NextResponse.json({ error: 'No hay agente estratega configurado para esta marca' }, { status: 400 })
    }

    // Build brand context
    const brandContext = `MARCA: ${brand.name}
${brand.description ? `DESCRIPCION: ${brand.description}` : ''}
${brand.industry ? `INDUSTRIA: ${brand.industry}` : ''}
${brand.target_audience ? `AUDIENCIA: ${brand.target_audience}` : ''}
${brand.tone_of_voice ? `TONO DE VOZ: ${brand.tone_of_voice}` : ''}
${brand.key_messages ? `MENSAJES CLAVE: ${brand.key_messages}` : ''}`

    // System prompt from agent
    const systemPrompt = strategistAgent.system_prompt || `Eres ${strategistAgent.name}, el estratega de contenido para ${brand.name}.`

    // Get current date for calendar proposal
    const today = new Date()
    const currentDay = today.toLocaleDateString('es-ES', { weekday: 'long' })
    const currentDate = today.toISOString().split('T')[0]

    const userPrompt = `${brandContext}

---

CONTENIDO para estrategia de ${platform} (${contentType}):

${content}

Fecha actual: ${currentDate} (${currentDay})

Genera una NUEVA propuesta de estrategia y calendario diferente a la anterior.
Se creativo y propone fechas y horarios alternativos.

Responde en formato JSON:
{
  "strategy": "estrategia completa",
  "best_time": "mejor horario para publicar (HH:MM)",
  "best_day": "mejor dia de la semana",
  "frequency": "frecuencia recomendada",
  "complementary_content": ["ideas de contenido complementario"],
  "engagement_tactics": ["tacticas para aumentar engagement"],
  "kpis": ["metricas a seguir"],
  "calendar_proposal": {
    "primary_date": "YYYY-MM-DD",
    "primary_time": "HH:MM",
    "alternative_dates": ["YYYY-MM-DD", "YYYY-MM-DD"],
    "reasoning": "explicacion de por que se recomienda esta fecha",
    "content_series": [
      {
        "date": "YYYY-MM-DD",
        "time": "HH:MM",
        "content_type": "tipo de contenido sugerido",
        "description": "descripcion breve"
      }
    ]
  }
}`

    const text = await generateWithOpenAI({
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.8, // Higher temperature for more variety
      jsonMode: true,
    })

    let strategy
    try {
      strategy = JSON.parse(text)
    } catch {
      strategy = { strategy: text }
    }

    return NextResponse.json({
      success: true,
      strategist: {
        agent: strategistAgent.name,
        strategy: strategy.strategy,
        best_time: strategy.best_time,
        best_day: strategy.best_day,
        frequency: strategy.frequency,
        engagement_tactics: strategy.engagement_tactics,
        kpis: strategy.kpis,
        calendar_proposal: strategy.calendar_proposal,
      }
    })

  } catch (error: any) {
    console.error('[strategist] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
