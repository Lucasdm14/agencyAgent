import { createClient } from '@/lib/supabase/server'
import { generateCopies } from '@/lib/openai'

export async function POST(req: Request) {
  const { 
    brandId, 
    contentType, 
    platform, 
    customPrompt, 
    freePrompt, 
    count = 10, 
    mode = 'context',
    agentId // Optional: use specific agent's prompt
  } = await req.json()

  const supabase = await createClient()
  
  // Get agent if specified
  let agentPrompt = ''
  if (agentId) {
    const { data: agent } = await supabase
      .from('agents')
      .select('system_prompt, name, type')
      .eq('id', agentId)
      .single()
    
    if (agent) {
      agentPrompt = `
PERSONALIDAD DEL AGENTE "${agent.name}":
${agent.system_prompt}

IMPORTANTE: Debes generar contenido siguiendo exactamente esta personalidad y estilo.
`
    }
  }
  
  // Free mode - with optional brand context
  if (mode === 'free') {
    let brandContext = ''
    
    // If brandId is provided, get brand context
    if (brandId) {
      const { data: brand } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()
      
      if (brand) {
        brandContext = `
CONTEXTO DE MARCA (usa esto para alinear el contenido):
- MARCA: ${brand.name}
- INDUSTRIA: ${brand.industry || 'General'}
- DESCRIPCION: ${brand.description || 'No disponible'}
- TONO DE VOZ: ${brand.tone_of_voice || 'Profesional'}
- AUDIENCIA: ${brand.target_audience || 'General'}
- VALORES: ${brand.brand_values?.join(', ') || 'No especificados'}
- PALABRAS CLAVE: ${brand.keywords?.join(', ') || 'Ninguna especificada'}

IMPORTANTE: El contenido debe estar alineado con esta marca, su tono y valores.
`
      }
    }
    
    try {
      const result = await generateCopies({
        system: `Eres un experto copywriter de agencias de publicidad. Tu trabajo es crear copies excepcionales basados exactamente en lo que el usuario solicita.
${agentPrompt}
${brandContext}
IMPORTANTE: Sigue las instrucciones del usuario al pie de la letra. Si pide un formato especifico, usalo. Si pide un tono especifico, respetalo.

Debes responder SIEMPRE en formato JSON con la estructura: {"copies": [{"title": "...", "body": "...", "hashtags": [...], "cta": "..."}]}`,
        prompt: `${freePrompt}

Genera exactamente ${count} variaciones/copys unicos basados en este prompt.`,
        count,
        temperature: 0.8,
      })

      return Response.json(result)
    } catch (error: unknown) {
      console.error('Error generating copies:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return Response.json({ error: `Error generando copies: ${errorMessage}` }, { status: 500 })
    }
  }

  // Context mode - requires brand
  // Get brand info
  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single()

  if (!brand) {
    return new Response('Brand not found', { status: 404 })
  }

  // Get metrics for context if available
  const { data: metrics } = await supabase
    .from('metrics')
    .select('*')
    .eq('brand_id', brandId)
    .order('date', { ascending: false })
    .limit(10)

  const metricsContext = metrics && metrics.length > 0
    ? `\n\nMETRICAS HISTORICAS (usa esto para optimizar el contenido):
${metrics.map(m => `- ${m.platform}: ${m.engagement} engagement, ${m.impressions} impresiones, ${m.clicks} clicks`).join('\n')}`
    : ''

  const platformInstructions: Record<string, string> = {
    instagram: 'Formato para Instagram: Usa emojis apropiados, hashtags relevantes, y copies de 150-300 caracteres ideales para engagement.',
    facebook: 'Formato para Facebook: Copies mas largos (hasta 500 caracteres), enfocados en generar conversacion y compartidos.',
    tiktok: 'Formato para TikTok: Copies cortos, dinamicos, usa trending hashtags y lenguaje casual/juvenil.',
    linkedin: 'Formato para LinkedIn: Tono profesional, enfocado en valor y expertise, ideal para B2B.',
    twitter: 'Formato para Twitter/X: Maximo 280 caracteres, directo al punto, usa hashtags con moderacion.',
    google_ads: 'Formato para Google Ads: Headlines de maximo 30 caracteres, descripciones de maximo 90 caracteres.',
    meta_ads: 'Formato para Meta Ads: Copy principal, headline y descripcion. Enfocado en conversion.',
    email: 'Formato para Email: Subject line atractivo, preview text, y body estructurado con CTA claro.',
  }

  const contentTypeInstructions: Record<string, string> = {
    social: 'Genera copies para publicaciones organicas en redes sociales.',
    ads: 'Genera copies para publicidad paga, enfocados en conversion y ROI.',
    email: 'Genera copies para email marketing, con subject lines y body.',
    other: 'Genera copies versatiles que se puedan adaptar a multiples formatos.',
  }

  const systemPrompt = `Eres un experto copywriter de agencias de publicidad. Tu trabajo es crear copies excepcionales.
${agentPrompt}
MARCA: ${brand.name}
INDUSTRIA: ${brand.industry || 'General'}
DESCRIPCION: ${brand.description || 'No disponible'}
TONO DE VOZ: ${brand.tone_of_voice || 'Profesional'}
AUDIENCIA: ${brand.target_audience || 'General'}
VALORES: ${brand.brand_values?.join(', ') || 'No especificados'}
PALABRAS CLAVE A INCLUIR: ${brand.keywords?.join(', ') || 'Ninguna especificada'}
COMPETIDORES: ${brand.competitors?.join(', ') || 'No especificados'}
${metricsContext}

TIPO DE CONTENIDO: ${contentTypeInstructions[contentType] || contentTypeInstructions.social}
${platform ? platformInstructions[platform] || '' : ''}

INSTRUCCIONES ADICIONALES DEL USUARIO: ${customPrompt || 'Ninguna'}

Genera exactamente ${count} copies unicos y creativos. Cada copy debe:
1. Ser unico y diferente a los demas
2. Respetar el tono de voz de la marca
3. Incluir las palabras clave cuando sea natural
4. Ser optimizado para el formato/plataforma indicada
5. Incluir un CTA claro cuando sea apropiado`

  try {
    const result = await generateCopies({
      system: systemPrompt + '\n\nDebes responder SIEMPRE en formato JSON con la estructura: {"copies": [{"title": "...", "body": "...", "hashtags": [...], "cta": "..."}]}',
      prompt: `Genera ${count} copies creativos para ${brand.name}`,
      count,
      temperature: 0.8,
    })

    return Response.json(result)
  } catch (error: unknown) {
    console.error('Error generating copies:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('Incorrect API key')) {
      return Response.json({ 
        error: 'API key de OpenAI no configurada o inválida. Por favor configura OPENAI_API_KEY en las variables de entorno.' 
      }, { status: 401 })
    }
    
    return Response.json({ 
      error: `Error generando copies: ${errorMessage}` 
    }, { status: 500 })
  }
}
