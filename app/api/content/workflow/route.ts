import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateWithOpenAI } from '@/lib/openai'

// Flujo: Creador -> Supervisor -> Estratega
// 1. Creador genera contenido con contexto de marca
// 2. Supervisor valida alineación con la marca
// 3. Estratega crea la estrategia de publicación

export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { 
      brand_id, 
      platform, 
      content_type,
      topic,
      additional_context,
      action = 'create', // create, validate, strategize, reject
      count = 1, // Cantidad de copys a generar
      // IDs de agentes específicos seleccionados por el usuario
      creator_agent_id,
      supervisor_agent_id,
      strategist_agent_id,
      // Attachment for visual content analysis
      attachment_url,
      attachment_type, // 'image' | 'video'
    } = body

    // Get brand with all context
    const { data: brand } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brand_id)
      .single()

    if (!brand) {
      return NextResponse.json({ error: 'Marca no encontrada' }, { status: 404 })
    }

    // Get agents for this brand
    const { data: agents } = await supabase
      .from('agents')
      .select('*')
      .eq('brand_id', brand_id)
      .eq('is_active', true)

    // Si se especificaron IDs de agentes, usarlos; si no, usar el primero de cada tipo
    const creatorAgent = creator_agent_id 
      ? agents?.find(a => a.id === creator_agent_id)
      : agents?.find(a => a.type === 'creator')
    const supervisorAgent = supervisor_agent_id
      ? agents?.find(a => a.id === supervisor_agent_id)
      : agents?.find(a => a.type === 'supervisor')
    const strategistAgent = strategist_agent_id
      ? agents?.find(a => a.id === strategist_agent_id)
      : agents?.find(a => a.type === 'strategist')

    if (!creatorAgent || !supervisorAgent || !strategistAgent) {
      return NextResponse.json({ 
        error: 'Se necesitan los 3 agentes (Creador, Supervisor, Estratega) configurados para esta marca',
        missing: {
          creator: !creatorAgent,
          supervisor: !supervisorAgent,
          strategist: !strategistAgent
        }
      }, { status: 400 })
    }

    // Build comprehensive brand context
    const brandContext = buildBrandContext(brand)

    if (action === 'create') {
      // Limit copies to avoid timeout
      const copyCount = Math.min(count, 10)
      
      // OPTIMIZED: Generate ALL copies in ONE call per agent (3 calls total instead of 3*N)
      
      // STEP 1: Creator generates ALL copies at once
      const creatorResult = await generateCreatorContent({
        brand,
        brandContext,
        creatorAgent,
        platform,
        content_type,
        topic,
        additional_context,
        copyCount, // Pass count to generate multiple
        attachment_url, // Image/video URL for visual analysis
        attachment_type,
      })
      
      // creatorResult.copies is an array of copies
      const copies = creatorResult.copies || [{ content: creatorResult.content, hashtags: creatorResult.hashtags }]
      
      // STEP 2: Supervisor validates ALL copies at once
      const supervisorResult = await validateWithSupervisor({
        brand,
        brandContext,
        supervisorAgent,
        copies, // Pass all copies
        platform,
        content_type,
      })
      
      // STEP 3: Strategist creates strategy for approved copies
      const approvedCopies = supervisorResult.validations?.filter((v: any) => v.approved) || []
      let strategyResult = null
      if (approvedCopies.length > 0) {
        strategyResult = await createStrategy({
          brand,
          brandContext,
          strategistAgent,
          copies: approvedCopies,
          platform,
          content_type,
        })
      }
      
      // Build results array from the batch response
      const results = copies.map((copy: any, i: number) => {
        const validation = supervisorResult.validations?.[i] || { approved: true, feedback: 'Aprobado' }
        return {
          creator: { content: copy.content, hashtags: copy.hashtags },
          supervisor: validation,
          strategist: validation.approved ? strategyResult : null,
        }
      })

      // Save all copies to database - ALL go to pending_review for user final approval
      const savedContents = []
      for (const result of results) {
        const { creator: cr, supervisor: sv, strategist: st } = result
        const contentText = sv.revised_content || cr.content
        
        // Map content_type to valid DB values (social, ads, email, other)
        const validContentTypes = ['social', 'ads', 'email', 'other']
        const dbContentType = validContentTypes.includes(content_type) ? content_type : 'social'
        
        const { data: saved, error: saveError } = await supabase
          .from('content')
          .insert({
            brand_id,
            platform,
            content_type: dbContentType,
            body: contentText, // Required field
            main_text: contentText,
            hashtags: cr.hashtags || [],
            workflow_status: 'pending_user_approval',
            creator_agent_id: creatorAgent.id,
            supervisor_agent_id: supervisorAgent.id,
            strategist_agent_id: strategistAgent.id,
            supervisor_feedback: sv.feedback,
            supervisor_score: sv.score || null,
            supervisor_approved: sv.approved,
            strategy_content: st?.strategy || null,
            strategy_created_at: st ? new Date().toISOString() : null,
            status: 'draft',
            created_by: user.id,
          })
          .select()
          .single()

        if (saveError) {
          console.error('[workflow] Error saving content:', saveError)
        }
        if (saved) {
          console.log('[workflow] Saved content with id:', saved.id)
          savedContents.push(saved)
        }
      }
      
      console.log('[workflow] Total saved contents:', savedContents.length)

      return NextResponse.json({
        success: true,
        multiple: results.length > 1,
        count: results.length,
        approved: results.filter(r => r.supervisor.approved).length,
        rejected: results.filter(r => !r.supervisor.approved).length,
        contents: savedContents,
        content: savedContents[0], // For backwards compatibility
        workflows: results.map((r, i) => ({
          index: i + 1,
          contentId: savedContents[i]?.id || null, // Include contentId directly in workflow
          creator: {
            agent: creatorAgent.name,
            content: r.creator.content,
            hashtags: r.creator.hashtags,
          },
          supervisor: {
            agent: supervisorAgent.name,
            approved: r.supervisor.approved,
            score: r.supervisor.score,
            feedback: r.supervisor.feedback,
            revised_content: r.supervisor.revised_content,
          },
          strategist: r.strategist ? {
            agent: strategistAgent.name,
            strategy: r.strategist.strategy,
            best_time: r.strategist.best_time,
            best_day: r.strategist.best_day,
            frequency: r.strategist.frequency,
            engagement_tactics: r.strategist.engagement_tactics,
            kpis: r.strategist.kpis,
            calendar_proposal: r.strategist.calendar_proposal,
          } : null,
        })),
        workflow: results[0] ? { // For backwards compatibility
          creator: {
            agent: creatorAgent.name,
            content: results[0].creator.content,
            hashtags: results[0].creator.hashtags,
          },
          supervisor: {
            agent: supervisorAgent.name,
            approved: results[0].supervisor.approved,
            feedback: results[0].supervisor.feedback,
            revised_content: results[0].supervisor.revised_content,
          },
          strategist: results[0].strategist ? {
            agent: strategistAgent.name,
            strategy: results[0].strategist.strategy,
            best_time: results[0].strategist.best_time,
            best_day: results[0].strategist.best_day,
            frequency: results[0].strategist.frequency,
            engagement_tactics: results[0].strategist.engagement_tactics,
            kpis: results[0].strategist.kpis,
            calendar_proposal: results[0].strategist.calendar_proposal,
          } : null,
        } : null,
      })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })

  } catch (error) {
    console.error('Workflow error:', error)
    return NextResponse.json({ error: 'Error en el flujo de trabajo' }, { status: 500 })
  }
}

function buildBrandContext(brand: any): string {
  return `
=== CONTEXTO DE MARCA: ${brand.name} ===

DESCRIPCIÓN:
${brand.description || 'No especificada'}

INDUSTRIA: ${brand.industry || 'No especificada'}

TONO DE VOZ:
${brand.tone_of_voice || 'No especificado'}

VALORES DE MARCA:
${brand.brand_values || 'No especificados'}

PÚBLICO OBJETIVO:
${brand.target_audience || 'No especificado'}

PALABRAS CLAVE:
${brand.keywords?.join(', ') || 'No especificadas'}

PALABRAS PROHIBIDAS:
${brand.forbidden_words?.join(', ') || 'Ninguna'}

GUÍAS DE ESTILO:
${brand.style_guide || 'No especificadas'}

PROPUESTA DE VALOR:
${brand.value_proposition || 'No especificada'}

PERSONALIDAD DE MARCA:
${brand.brand_personality || 'No especificada'}

COMPETIDORES:
${brand.competitors || 'No especificados'}

DIFERENCIADORES:
${brand.differentiators || 'No especificados'}
`.trim()
}

async function generateCreatorContent({
  brand,
  brandContext,
  creatorAgent,
  platform,
  content_type,
  topic,
  additional_context,
  copyCount = 1,
  attachment_url,
  attachment_type,
}: {
  brand: any
  brandContext: string
  creatorAgent: any
  platform: string
  content_type: string
  topic?: string
  additional_context?: string
  copyCount?: number
  attachment_url?: string
  attachment_type?: 'image' | 'video'
}) {
  // Usar SOLO el prompt configurado por el usuario - sin agregar nada extra
  const systemPrompt = creatorAgent.system_prompt || `Eres ${creatorAgent.name}, el agente creador de contenido para ${brand.name}.`

  // Build the attachment context instruction
  const attachmentInstruction = attachment_url 
    ? `\n\nCONTENIDO VISUAL ADJUNTO: Se ha adjuntado ${attachment_type === 'video' ? 'un video' : 'una imagen'} que debes analizar.
Genera los copys basándote en lo que ves en el contenido visual:
- Describe brevemente lo que ves
- Crea copys que complementen perfectamente la imagen/video
- El copy debe hacer referencia al contenido visual de forma natural
- Mantén coherencia entre lo visual y el texto`
    : ''

  // Incluir contexto de marca en el user prompt para que el agente lo tenga disponible
  const userPrompt = `${brandContext}

---

TAREA: Crea ${copyCount} ${copyCount > 1 ? 'variaciones de contenido DIFERENTES' : 'contenido'} para ${platform} (tipo: ${content_type}).
${topic ? `Tema: ${topic}` : ''}
${additional_context ? `Contexto adicional: ${additional_context}` : ''}${attachmentInstruction}

${copyCount > 1 ? 'Cada variación debe tener un enfoque, ángulo o estilo diferente.' : ''}

Responde en formato JSON:
{
  "copies": [
    {
      "content": "el texto del contenido",
      "hashtags": ["hashtag1", "hashtag2"]${attachment_url ? ',\n      "visual_description": "breve descripción de lo que se ve en la imagen/video"' : ''}
    }
  ]
}`

  // If there's an image attachment, use vision capabilities
  const text = await generateWithOpenAI({
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.8,
    jsonMode: true,
    imageUrl: attachment_type === 'image' ? attachment_url : undefined,
  })

  try {
    const parsed = JSON.parse(text)
    return {
      copies: parsed.copies || [parsed],
      content: parsed.copies?.[0]?.content || parsed.content,
      hashtags: parsed.copies?.[0]?.hashtags || parsed.hashtags || [],
    }
  } catch {
    return { copies: [{ content: text, hashtags: [] }], content: text, hashtags: [] }
  }
}

async function validateWithSupervisor({
  brand,
  brandContext,
  supervisorAgent,
  copies,
  platform,
  content_type,
}: {
  brand: any
  brandContext: string
  supervisorAgent: any
  copies: Array<{ content: string; hashtags?: string[] }>
  platform: string
  content_type: string
}) {
  // Usar SOLO el prompt configurado por el usuario - sin agregar nada extra
  const systemPrompt = supervisorAgent.system_prompt || `Eres ${supervisorAgent.name}, el supervisor de contenido para ${brand.name}.`

  const copiesText = copies.map((c, i) => `--- COPY ${i + 1} ---\n${c.content}`).join('\n\n')

  // Incluir contexto de marca en el user prompt
  const userPrompt = `${brandContext}

---

CONTENIDOS A EVALUAR para ${platform} (${content_type}):

${copiesText}

Evalúa cada copy según tu criterio y el contexto de la marca.

Responde en formato JSON:
{
  "validations": [
    {
      "index": 0,
      "approved": true/false,
      "score": 1-10,
      "feedback": "tu evaluación",
      "revised_content": "versión mejorada si aplica" o null
    }
  ]
}`

  const text = await generateWithOpenAI({
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.3,
    jsonMode: true,
  })

  try {
    const parsed = JSON.parse(text)
    return {
      validations: parsed.validations || copies.map(() => ({ approved: true, feedback: 'Aprobado' })),
    }
  } catch {
    // Si falla el parse, aprobar todos por defecto
    return { validations: copies.map(() => ({ approved: true, feedback: 'Aprobado' })) }
  }
}

async function createStrategy({
  brand,
  brandContext,
  strategistAgent,
  copies,
  platform,
  content_type,
}: {
  brand: any
  brandContext: string
  strategistAgent: any
  copies: Array<{ content?: string; revised_content?: string }>
  platform: string
  content_type: string
}) {
  // Usar SOLO el prompt configurado por el usuario - sin agregar nada extra
  const systemPrompt = strategistAgent.system_prompt || `Eres ${strategistAgent.name}, el estratega de contenido para ${brand.name}.`

  // Get current date for calendar proposal
  const today = new Date()
  const currentDay = today.toLocaleDateString('es-ES', { weekday: 'long' })
  const currentDate = today.toISOString().split('T')[0]
  
  const copiesText = copies.map((c, i) => `--- COPY ${i + 1} ---\n${c.revised_content || c.content}`).join('\n\n')

  // Incluir contexto de marca en el user prompt
  const userPrompt = `${brandContext}

---

CONTENIDOS para estrategia de ${platform} (${content_type}):

${copiesText}

Fecha actual: ${currentDate} (${currentDay})

Responde en formato JSON:
{
  "strategy": "estrategia completa",
  "best_time": "mejor horario para publicar (HH:MM)",
  "best_day": "mejor día de la semana",
  "frequency": "frecuencia recomendada",
  "complementary_content": ["ideas de contenido complementario"],
  "engagement_tactics": ["tácticas para aumentar engagement"],
  "kpis": ["m��tricas a seguir"],
  "a_b_test_suggestions": ["ideas para probar"],
  "calendar_proposal": {
    "primary_date": "YYYY-MM-DD",
    "primary_time": "HH:MM",
    "alternative_dates": ["YYYY-MM-DD", "YYYY-MM-DD"],
    "reasoning": "explicación de por qué se recomienda esta fecha",
    "content_series": [
      {
        "date": "YYYY-MM-DD",
        "time": "HH:MM",
        "content_type": "tipo de contenido sugerido",
        "description": "descripción breve"
      }
    ]
  }
}`

  const text = await generateWithOpenAI({
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.5,
    jsonMode: true,
  })

  try {
    const parsed = JSON.parse(text)
    return {
      strategy: JSON.stringify(parsed),
      best_time: parsed.best_time,
      best_day: parsed.best_day,
      frequency: parsed.frequency,
      complementary_content: parsed.complementary_content,
      engagement_tactics: parsed.engagement_tactics,
      kpis: parsed.kpis,
      calendar_proposal: parsed.calendar_proposal,
    }
  } catch {
    return { strategy: text }
  }
}

async function saveValidationHistory(
  supabase: any,
  contentId: string,
  validations: Array<{
    agent_id: string
    agent_type: string
    action: string
    content?: string
    feedback?: string
    original?: string
    revised?: string
  }>
) {
  for (const v of validations) {
    await supabase.from('content_validations').insert({
      content_id: contentId,
      agent_id: v.agent_id,
      agent_type: v.agent_type,
      action: v.action,
      feedback: v.feedback || null,
      original_content: v.original || v.content || null,
      revised_content: v.revised || null,
    })
  }
}
