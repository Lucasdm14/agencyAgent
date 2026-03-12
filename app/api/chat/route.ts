import { streamText, convertToModelMessages } from 'ai'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { messages, agentId, brandId } = await req.json()

  const supabase = await createClient()
  
  // Get agent and brand info
  const { data: agent } = await supabase
    .from('agents')
    .select('*, brand:brands(*)')
    .eq('id', agentId)
    .single()

  if (!agent) {
    return new Response('Agent not found', { status: 404 })
  }

  const brand = agent.brand

  // Build system prompt with brand context
  const systemPrompt = `${agent.system_prompt}

CONTEXTO DE LA MARCA:
- Nombre: ${brand.name}
- Industria: ${brand.industry || 'No especificada'}
- Descripcion: ${brand.description || 'No disponible'}
- Tono de voz: ${brand.tone_of_voice || 'Profesional'}
- Audiencia objetivo: ${brand.target_audience || 'General'}
- Valores de marca: ${brand.brand_values?.join(', ') || 'No especificados'}
- Palabras clave: ${brand.keywords?.join(', ') || 'No especificadas'}
- Competidores: ${brand.competitors?.join(', ') || 'No especificados'}

Siempre genera contenido alineado con el tono y valores de la marca.`

  const result = streamText({
    model: 'openai/gpt-4o-mini',
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    temperature: agent.temperature || 0.7,
  })

  return result.toUIMessageStreamResponse()
}
