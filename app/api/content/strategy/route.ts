import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateWithOpenAI } from '@/lib/openai'

// Nuevo flujo estratégico:
// 1. Estratega → Analiza la marca y crea estrategia de contenido
// 2. Creador → Genera copys basados en la estrategia
// 3. Supervisor → Valida alineación con estrategia y marca

export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    console.log('[v0] Strategy API called with action:', body.action)
    
    const { 
      brand_id,
      action, // 'create_strategy' | 'generate_from_strategy' | 'validate_content'
      platform,
      days_count = 7, // Custom number of days
      copies_per_content = 3, // Number of copy variations per content
      strategy_context, // Contexto de estrategia para generación
      creator_agent_id,
      supervisor_agent_id,
      strategist_agent_id,
      content_to_validate,
      attachment_url,
      attachment_type,
      metrics_account, // Datos de métricas de cuenta para optimizar estrategia
    } = body

    if (!brand_id) {
      console.log('[v0] Missing brand_id')
      return NextResponse.json({ error: 'Falta brand_id' }, { status: 400 })
    }

    // Get brand with all context
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brand_id)
      .single()

    if (brandError) {
      console.log('[v0] Brand error:', brandError)
      return NextResponse.json({ error: 'Error al buscar marca: ' + brandError.message }, { status: 500 })
    }

    if (!brand) {
      console.log('[v0] Brand not found:', brand_id)
      return NextResponse.json({ error: 'Marca no encontrada' }, { status: 404 })
    }
    
    console.log('[v0] Brand found:', brand.name)
    
    // Verificar que la marca tenga informacion suficiente para generar estrategia
    const hasBrandInfo = brand.description || brand.tone_of_voice || brand.target_audience
    if (!hasBrandInfo && action === 'create_strategy') {
      console.log('[v0] Brand missing info')
      return NextResponse.json({ 
        error: 'La marca necesita mas informacion para generar una estrategia. Completa al menos: descripcion, tono de voz y publico objetivo en Configuracion > Marcas.' 
      }, { status: 400 })
    }

    // Get agents for this brand
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .eq('brand_id', brand_id)
      .eq('is_active', true)
    
    console.log('[v0] Agents found:', agents?.length || 0, 'for brand', brand_id)
    if (agentsError) {
      console.log('[v0] Agents error:', agentsError)
    }

    const creatorAgent = creator_agent_id 
      ? agents?.find(a => a.id === creator_agent_id)
      : agents?.find(a => a.type === 'creator')
    const supervisorAgent = supervisor_agent_id
      ? agents?.find(a => a.id === supervisor_agent_id)
      : agents?.find(a => a.type === 'supervisor')
    const strategistAgent = strategist_agent_id
      ? agents?.find(a => a.id === strategist_agent_id)
      : agents?.find(a => a.type === 'strategist')

    if (!strategistAgent) {
      return NextResponse.json({ 
        error: 'Se necesita un agente Estratega configurado',
      }, { status: 400 })
    }

    const brandContext = buildBrandContext(brand)

    // PASO 1: Crear estrategia de contenido con validación del supervisor
    if (action === 'create_strategy') {
      console.log('[v0] Starting strategy generation for brand:', brand.name, 'platform:', platform)
      console.log('[v0] Strategist agent:', strategistAgent?.name, 'has prompt:', !!strategistAgent?.system_prompt)
      
      try {
        const strategy = await generateContentStrategy({
          brand,
          brandContext,
          strategistAgent,
          creatorAgent,
          supervisorAgent,
          platform,
          daysCount: days_count,
          copiesPerContent: copies_per_content,
          metricsData: metrics_account,
        })

        console.log('[v0] Strategy generated successfully')
        
        return NextResponse.json({
          success: true,
          strategy,
          strategist: strategistAgent?.name || 'Estratega',
          creator: creatorAgent?.name || null,
          supervisor: supervisorAgent?.name || null,
        })
      } catch (strategyError: any) {
        console.error('[v0] Strategy generation error:', strategyError)
        return NextResponse.json({ 
          error: 'Error generando estrategia: ' + (strategyError?.message || 'Error desconocido')
        }, { status: 500 })
      }
    }

    // Generate supervisor feedback for entire strategy
    if (action === 'feedback_strategy') {
      if (!supervisorAgent) {
        return NextResponse.json({ error: 'Se necesita un agente Supervisor' }, { status: 400 })
      }
      
      const { strategy_data } = body
      
      // Use the full supervisor prompt to ensure brand compliance
      const supervisorSystemPrompt = supervisorAgent.system_prompt || `Eres ${supervisorAgent.name}, el supervisor de contenido para ${brand.name}.`
      
      const feedbackPrompt = `${brandContext}

=== TU ROL COMO SUPERVISOR ===
${supervisorAgent.system_prompt || 'Supervisor de contenido'}

=== LINEAMIENTOS DE MARCA QUE DEBES VERIFICAR ===

1. TONO DE VOZ: ${brand.tone_of_voice || 'No especificado'}
   - Verifica que la estrategia mantenga este tono consistentemente

2. VALORES DE MARCA: ${brand.brand_values || 'No especificados'}
   - Asegurate que cada pilar y tema refleje estos valores

3. PUBLICO OBJETIVO: ${brand.target_audience || 'No especificado'}
   - Confirma que el contenido este dirigido correctamente a esta audiencia

4. PALABRAS CLAVE (deben aparecer): ${brand.keywords?.join(', ') || 'No especificadas'}
   - Verifica que se usen en la estrategia

5. PALABRAS PROHIBIDAS (NUNCA deben aparecer): ${brand.forbidden_words?.join(', ') || 'Ninguna'}
   - Asegurate que NINGUNA de estas palabras se use

6. GUIAS DE ESTILO: ${brand.style_guide || 'No especificadas'}
   - Verifica cumplimiento

7. PERSONALIDAD DE MARCA: ${brand.brand_personality || 'No especificada'}
   - La estrategia debe reflejar esta personalidad

8. PROPUESTA DE VALOR: ${brand.value_proposition || 'No especificada'}
   - Los mensajes deben comunicar este valor

---

ESTRATEGIA DE CONTENIDO A EVALUAR:

OBJETIVO PRINCIPAL: ${strategy_data.strategy_overview?.main_objective}

PILARES DE CONTENIDO:
${strategy_data.strategy_overview?.content_pillars?.map((p: any) => `- ${p.name} (${p.percentage}%): ${p.description}`).join('\n')}

MENSAJES CLAVE:
${strategy_data.strategy_overview?.key_messages?.map((m: string) => `- ${m}`).join('\n') || 'No especificados'}

GUIA DE TONO: ${strategy_data.strategy_overview?.tone_guidelines}

CALENDARIO (${strategy_data.content_calendar?.length} dias):
${strategy_data.content_calendar?.slice(0, 10).map((d: any) => `Dia ${d.day}: "${d.theme}" (${d.pillar}) - ${d.content_type} - Objetivo: ${d.objective || 'N/A'}`).join('\n')}
${strategy_data.content_calendar?.length > 10 ? `... y ${strategy_data.content_calendar.length - 10} dias mas` : ''}

---

TAREA: Como supervisor de contenido para ${brand.name}, realiza una evaluacion EXHAUSTIVA verificando el cumplimiento de TODOS los lineamientos de marca listados arriba.

Tu evaluacion debe:
1. Verificar que el TONO DE VOZ sea consistente con la marca
2. Confirmar que los VALORES DE MARCA se reflejan en los pilares y temas
3. Asegurar que el contenido esta dirigido al PUBLICO OBJETIVO correcto
4. Verificar el uso de PALABRAS CLAVE de la marca
5. Confirmar que NO se usan PALABRAS PROHIBIDAS
6. Evaluar el cumplimiento de las GUIAS DE ESTILO
7. Verificar que la PERSONALIDAD DE MARCA se mantiene
8. Confirmar que se comunica la PROPUESTA DE VALOR

Responde en formato JSON:
{
  "overall_assessment": "evaluacion general de la estrategia en 2-3 oraciones, mencionando especificamente como cumple o no con los lineamientos de marca",
  "score": 85,
  "brand_compliance": {
    "tone_of_voice": { "compliant": true, "notes": "observacion sobre el tono" },
    "brand_values": { "compliant": true, "notes": "como refleja los valores" },
    "target_audience": { "compliant": true, "notes": "alineacion con el publico" },
    "keywords_used": { "compliant": true, "notes": "palabras clave presentes" },
    "forbidden_words": { "compliant": true, "notes": "sin palabras prohibidas detectadas" },
    "style_guide": { "compliant": true, "notes": "cumplimiento de guias" },
    "brand_personality": { "compliant": true, "notes": "reflejo de personalidad" }
  },
  "strengths": ["punto fuerte especifico 1", "punto fuerte especifico 2", "punto fuerte especifico 3"],
  "improvements": ["mejora especifica basada en lineamientos de marca 1", "mejora especifica 2"],
  "brand_alignment": "evaluacion detallada de como la estrategia se alinea con la identidad de marca",
  "expected_impact": "impacto esperado en engagement y objetivos de marca",
  "risks": ["riesgo potencial relacionado con la marca 1"],
  "recommendations": ["recomendacion estrategica especifica para mejorar alineacion con marca 1", "recomendacion 2"]
}`

      const feedbackResponse = await generateWithOpenAI({
        system: supervisorSystemPrompt,
        prompt: feedbackPrompt,
        temperature: 0.3, // Lower temperature for more consistent evaluation
        jsonMode: true,
      })

      const feedback = JSON.parse(feedbackResponse)
      
      return NextResponse.json({
        success: true,
        feedback,
        supervisor: supervisorAgent.name,
      })
    }

    // PASO 2: Generar 3 copys para un día específico
    if (action === 'generate_copies_for_day') {
      if (!creatorAgent) {
        return NextResponse.json({ error: 'Se necesita un agente Creador' }, { status: 400 })
      }

      const result = await generateCopiesForDay({
        brand,
        brandContext,
        creatorAgent,
        supervisorAgent,
        strategyContext: strategy_context,
        platform,
        copiesCount: body.copies_count || 3,
      })

      return NextResponse.json({
        success: true,
        copies: result.copies,
        supervisor_feedback: result.supervisorFeedback,
        creator: creatorAgent.name,
        supervisor: supervisorAgent?.name || null,
      })
    }

    // PASO 2b: Generar contenido basado en estrategia (legacy)
    if (action === 'generate_from_strategy') {
      if (!creatorAgent) {
        return NextResponse.json({ error: 'Se necesita un agente Creador' }, { status: 400 })
      }

      const content = await generateContentFromStrategy({
        brand,
        brandContext,
        creatorAgent,
        strategyContext: strategy_context,
        platform,
        attachment_url,
        attachment_type,
      })

      return NextResponse.json({
        success: true,
        content,
        creator: creatorAgent.name,
      })
    }

    // PASO 3: Validar contenido contra estrategia
    if (action === 'validate_content') {
      if (!supervisorAgent) {
        return NextResponse.json({ error: 'Se necesita un agente Supervisor' }, { status: 400 })
      }

      const validation = await validateAgainstStrategy({
        brand,
        brandContext,
        supervisorAgent,
        strategyContext: strategy_context,
        contentToValidate: content_to_validate,
      })

      return NextResponse.json({
        success: true,
        validation,
        supervisor: supervisorAgent.name,
      })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })

  } catch (error) {
    console.error('Strategy workflow error:', error)
    return NextResponse.json({ error: 'Error en el flujo estratégico' }, { status: 500 })
  }
}

function buildBrandContext(brand: any): string {
  return `
=== CONTEXTO COMPLETO DE MARCA: ${brand.name} ===

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

PALABRAS PROHIBIDAS (NUNCA usar estas palabras):
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

IMPORTANTE: Todo el contenido generado DEBE respetar estrictamente este contexto de marca.
`.trim()
}

// Función para generar estrategia de contenido
async function generateContentStrategy({
  brand,
  brandContext,
  strategistAgent,
  creatorAgent,
  supervisorAgent,
  platform,
  daysCount,
  copiesPerContent,
  metricsData,
}: {
  brand: any
  brandContext: string
  strategistAgent: any
  creatorAgent?: any
  supervisorAgent?: any
  platform: string
  daysCount: number
  copiesPerContent: number
  metricsData?: {
    username: string
    followers: number
    engagement_rate: number
    avg_likes: number
    avg_comments: number
    avg_views: number
  }
}) {
  console.log('[v0] generateContentStrategy called')
  
  // El system prompt es el configurado por el usuario, o uno basico si no existe
  const systemPrompt = strategistAgent.system_prompt || `Eres un estratega de contenido para ${brand.name}. Tu rol es crear estrategias de contenido alineadas con la identidad de la marca. SOLO usa la informacion proporcionada, NO inventes datos.`
  
  console.log('[v0] Using system prompt length:', systemPrompt.length)

  const periodName = daysCount <= 7 ? 'semana' : daysCount <= 14 ? '2 semanas' : 'mes'

  // Build metrics context if available
  const metricsContext = metricsData ? `
METRICAS REALES DE LA CUENTA @${metricsData.username}:
- Seguidores: ${metricsData.followers?.toLocaleString() || 'N/A'}
- Tasa de Engagement: ${metricsData.engagement_rate?.toFixed(2) || 'N/A'}%
- Promedio de Likes: ${metricsData.avg_likes?.toLocaleString() || 'N/A'}
- Promedio de Comentarios: ${metricsData.avg_comments?.toLocaleString() || 'N/A'}
- Promedio de Vistas: ${metricsData.avg_views?.toLocaleString() || 'N/A'}
` : ''

  // El prompt del usuario es SOLO datos e instrucciones de formato - NO inventar
  const userPrompt = `===== INFORMACION DE LA MARCA (USAR SOLO ESTO) =====
${brandContext}

===== LINEAMIENTOS OBLIGATORIOS DE LA MARCA =====
TONO DE VOZ: ${brand.tone_of_voice || 'NO DEFINIDO - no asumir'}
PERSONALIDAD: ${brand.brand_personality || 'NO DEFINIDA - no asumir'}
PUBLICO OBJETIVO: ${brand.target_audience || 'NO DEFINIDO - no asumir'}
PROPUESTA DE VALOR: ${brand.value_proposition || 'NO DEFINIDA - no asumir'}
VALORES DE MARCA: ${brand.brand_values || 'NO DEFINIDOS - no asumir'}
PALABRAS CLAVE A USAR: ${brand.keywords?.length ? brand.keywords.join(', ') : 'NINGUNA DEFINIDA'}
PALABRAS PROHIBIDAS: ${brand.forbidden_words?.length ? brand.forbidden_words.join(', ') : 'NINGUNA DEFINIDA'}
INDUSTRIA: ${brand.industry || 'NO DEFINIDA'}
COMPETIDORES: ${brand.competitors || 'NO DEFINIDOS'}

===== METRICAS REALES =====
${metricsContext || 'No hay metricas disponibles'}

===== PARAMETROS DE LA SOLICITUD =====
- Plataforma: ${platform}
- Cantidad de dias: ${daysCount}
- Periodo: ${periodName}

===== INSTRUCCIONES ESTRICTAS =====
Genera una estrategia de contenido para ${daysCount} dias.

REGLAS CRITICAS QUE DEBES SEGUIR:
1. USA UNICAMENTE la informacion de marca proporcionada arriba
2. NO inventes datos, caracteristicas, beneficios o informacion que no este explicita en el contexto
3. Si un campo dice "NO DEFINIDO" o "NINGUNA DEFINIDA", NO asumas ni inventes ese dato
4. Los pilares de contenido DEBEN derivarse de la propuesta de valor y valores de marca reales
5. Los temas DEBEN estar directamente relacionados con lo que la marca realmente ofrece
6. Los mensajes clave DEBEN reflejar la propuesta de valor real, no frases genericas
7. El tono de cada contenido DEBE ser exactamente el tono de voz definido
8. NO uses frases genericas como "Descubre", "No te pierdas", "Increible" - se especifico con la marca

Responde en formato JSON:
{
  "strategy_overview": {
    "main_objective": "objetivo DERIVADO de la propuesta de valor real de la marca",
    "content_pillars": [
      {
        "name": "nombre del pilar BASADO en servicios/productos reales de la marca",
        "description": "descripcion usando SOLO info real proporcionada",
        "percentage": 30
      }
    ],
    "key_messages": ["mensaje que refleje la propuesta de valor REAL"],
    "tone_guidelines": "EXACTAMENTE el tono de voz definido en la marca"
  },
  "content_calendar": [
    {
      "day": 1,
      "date_suggestion": "Lunes",
      "pillar": "nombre del pilar",
      "theme": "tema ESPECIFICO relacionado con lo que la marca REALMENTE ofrece",
      "content_type": "reel/post/carousel/story",
      "objective": "objetivo alineado con la propuesta de valor real",
      "key_points": ["punto derivado de info REAL de la marca"],
      "suggested_hashtags": ["#hashtag"],
      "best_time": "18:00",
      "cta_suggestion": "CTA que refleje la propuesta de valor REAL"
    }
  ],
  "weekly_kpis": {
    "posts_per_week": 5,
    "engagement_goal": "meta basada en metricas reales si disponibles",
    "growth_focus": "enfoque derivado de objetivos reales de la marca"
  }
}`

  console.log('[v0] Calling OpenAI for strategy generation...')
  
  const response = await generateWithOpenAI({
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.7,
    jsonMode: true,
  })

  console.log('[v0] OpenAI response received, length:', response.length)

  let strategy
  try {
    strategy = JSON.parse(response)
    console.log('[v0] Strategy parsed successfully, calendar days:', strategy.content_calendar?.length)
  } catch (parseError) {
    console.error('[v0] Failed to parse strategy JSON:', parseError)
    return { raw: response, error: 'Failed to parse strategy' }
  }

  // PASO 2: Creador genera los copys para cada día basado en la estrategia
  if (creatorAgent && strategy.content_calendar) {
    // Usar 100% el prompt del agente - SIN fallback
    if (!creatorAgent.system_prompt) {
      console.warn('El agente Creador no tiene prompt configurado, usando contexto basico')
    }
    const creatorSystemPrompt = creatorAgent.system_prompt || `Eres un creador de contenido. Genera copys basandote UNICAMENTE en la informacion de marca proporcionada. NO inventes datos.`
    
    // Generate copies for each day in the calendar
    for (const day of strategy.content_calendar) {
      const copyPrompt = `===== INFORMACION DE LA MARCA (USAR SOLO ESTO) =====
${brandContext}

===== LINEAMIENTOS OBLIGATORIOS =====
TONO DE VOZ: ${brand.tone_of_voice || 'NO DEFINIDO'}
PERSONALIDAD: ${brand.brand_personality || 'NO DEFINIDA'}
PALABRAS CLAVE A USAR: ${brand.keywords?.length ? brand.keywords.join(', ') : 'NINGUNA'}
PALABRAS PROHIBIDAS: ${brand.forbidden_words?.length ? brand.forbidden_words.join(', ') : 'NINGUNA'}
PROPUESTA DE VALOR: ${brand.value_proposition || 'NO DEFINIDA'}

===== CONTEXTO DEL DIA ${day.day} =====
- Pilar: ${day.pillar}
- Tema: ${day.theme}
- Tipo de contenido: ${day.content_type}
- Objetivo: ${day.objective}
- Puntos clave: ${day.key_points?.join(', ') || 'N/A'}
- Hashtags sugeridos: ${day.suggested_hashtags?.join(' ') || ''}
- CTA sugerido: ${day.cta_suggestion || 'N/A'}

===== INSTRUCCIONES ESTRICTAS =====
Genera exactamente ${copiesPerContent} variaciones de copy para ${platform}.

REGLAS CRITICAS:
1. USA SOLO la informacion de marca proporcionada - NO inventes
2. El tono DEBE ser EXACTAMENTE: ${brand.tone_of_voice || 'el definido en la marca'}
3. INCLUYE las palabras clave SI estan definidas
4. NUNCA uses las palabras prohibidas
5. NO uses frases genericas como "Descubre", "Increible", "No te pierdas"
6. Cada copy debe sonar como si lo escribio la marca, no un copywriter generico
7. Si la propuesta de valor no esta definida, NO inventes beneficios

Responde en formato JSON:
{
  "copies": [
    {
      "version": 1,
      "content": "copy usando UNICAMENTE info real de la marca - sin inventar",
      "hook": "gancho basado en la propuesta de valor REAL",
      "cta": "CTA alineado con lo que la marca REALMENTE ofrece"
    }
  ]
}`

      try {
        const copyResponse = await generateWithOpenAI({
          system: creatorSystemPrompt,
          prompt: copyPrompt,
          temperature: 0.8,
          jsonMode: true,
        })
        
        const copyData = JSON.parse(copyResponse)
        day.copies = copyData.copies || []
        day.copies_generated_by = creatorAgent.name
      } catch (err) {
        console.error(`Error generating copies for day ${day.day}:`, err)
        day.copies = []
      }
    }
  }

  // PASO 3: Supervisor valida la estrategia y los copies
  if (supervisorAgent) {
    // Usar 100% el prompt del supervisor configurado
    if (!supervisorAgent.system_prompt) {
      console.warn('El agente Supervisor no tiene prompt configurado')
    }
    const supervisorSystemPrompt = supervisorAgent.system_prompt || `Eres un supervisor de contenido. Valida que el contenido este alineado con los lineamientos de marca proporcionados.`
    
    const validationPrompt = `===== LINEAMIENTOS DE MARCA PARA VALIDAR =====
${brandContext}

TONO DE VOZ REQUERIDO: ${brand.tone_of_voice || 'NO DEFINIDO'}
PERSONALIDAD REQUERIDA: ${brand.brand_personality || 'NO DEFINIDA'}
PALABRAS CLAVE OBLIGATORIAS: ${brand.keywords?.length ? brand.keywords.join(', ') : 'NINGUNA'}
PALABRAS PROHIBIDAS: ${brand.forbidden_words?.length ? brand.forbidden_words.join(', ') : 'NINGUNA'}
PROPUESTA DE VALOR: ${brand.value_proposition || 'NO DEFINIDA'}

===== ESTRATEGIA Y CONTENIDO A VALIDAR =====
${JSON.stringify(strategy, null, 2)}

===== CRITERIOS DE VALIDACION =====
Valida que cada contenido:
1. USE el tono de voz EXACTO definido en la marca
2. INCLUYA las palabras clave si estan definidas
3. NO USE ninguna palabra prohibida
4. NO INVENTE informacion que no este en el contexto de marca
5. Refleje la propuesta de valor REAL (si esta definida)
6. NO use frases genericas que cualquier marca podria usar

MARCA COMO NO APROBADO si:
- El copy incluye beneficios o caracteristicas NO mencionadas en la marca
- El tono no coincide con el definido
- Usa palabras prohibidas
- Es demasiado generico y no refleja la identidad unica de la marca

Responde en formato JSON:
{
  "strategy_approved": true/false,
  "strategy_feedback": "feedback basado en los lineamientos de marca reales",
  "content_validation": [
    {
      "day": 1,
      "copies_validation": [
        {
          "version": 1,
          "approved": true/false,
          "issues": ["problema especifico"],
          "improved_content": "version corregida si no fue aprobada"
        }
      ]
    }
  ],
  "overall_score": 85,
  "recommendations": ["recomendacion basada en lineamientos reales"]
}`

    const validationResponse = await generateWithOpenAI({
      system: supervisorSystemPrompt,
      prompt: validationPrompt,
      temperature: 0.3,
      jsonMode: true,
    })

    try {
      const validation = JSON.parse(validationResponse)
      
      // Apply improvements from supervisor to the strategy
      if (validation.content_validation) {
        for (const dayValidation of validation.content_validation) {
          const calendarDay = strategy.content_calendar?.find((d: any) => d.day === dayValidation.day)
          if (calendarDay && dayValidation.copies_validation) {
            for (const copyValidation of dayValidation.copies_validation) {
              if (!copyValidation.approved && copyValidation.improved_content && calendarDay.copies) {
                const copyToUpdate = calendarDay.copies.find((c: any) => c.version === copyValidation.version)
                if (copyToUpdate) {
                  copyToUpdate.content = copyValidation.improved_content
                  copyToUpdate.supervisor_improved = true
                }
              }
            }
          }
        }
      }
      
      return {
        ...strategy,
        supervisor_validation: validation,
      }
    } catch {
      return strategy
    }
  }

  return strategy
}

// Función para generar 3 copys para un día específico
async function generateCopiesForDay({
  brand,
  brandContext,
  creatorAgent,
  supervisorAgent,
  strategyContext,
  platform,
  copiesCount,
}: {
  brand: any
  brandContext: string
  creatorAgent: any
  supervisorAgent?: any
  strategyContext: {
    pillar: string
    theme: string
    content_type: string
    objective: string
    key_points?: string[]
    suggested_hashtags?: string[]
    cta_suggestion?: string
  }
  platform: string
  copiesCount: number
}) {
  // Usar 100% el prompt del agente configurado
  if (!creatorAgent.system_prompt) {
    console.warn('El agente Creador no tiene prompt configurado')
  }
  const systemPrompt = creatorAgent.system_prompt || `Eres un creador de contenido. Genera copys basandote UNICAMENTE en la informacion proporcionada. NO inventes datos.`

  const userPrompt = `===== INFORMACION DE LA MARCA (USAR SOLO ESTO) =====
${brandContext}

===== CONTEXTO DE LA PUBLICACION =====
CONTEXTO DEL CONTENIDO:
- Pilar: ${strategyContext.pillar}
- Tema: ${strategyContext.theme}
- Tipo de contenido: ${strategyContext.content_type}
- Objetivo: ${strategyContext.objective}
- Puntos clave: ${strategyContext.key_points?.join(', ') || 'N/A'}
- Hashtags sugeridos: ${strategyContext.suggested_hashtags?.join(' ') || ''}
- CTA sugerido: ${strategyContext.cta_suggestion || 'N/A'}

===== INSTRUCCIONES =====
Genera exactamente ${copiesCount} variaciones de copy para ${platform}.

REGLAS CRITICAS:
- USA SOLO la informacion de marca proporcionada arriba
- NO inventes caracteristicas, beneficios o datos que no esten en el contexto
- Cada version debe tener un ENFOQUE DIFERENTE:
  * Version 1: Enfoque emocional/storytelling
  * Version 2: Enfoque informativo/educativo  
  * Version 3: Enfoque directo/promocional
- Si algo no esta especificado en la marca, NO lo incluyas

Responde en formato JSON:
{
  "copies": [
    {
      "version": 1,
      "approach": "emocional",
      "content": "copy completo listo para publicar con emojis si aplica",
      "hook": "gancho inicial que captura atencion",
      "cta": "llamado a la accion especifico"
    },
    {
      "version": 2,
      "approach": "educativo",
      "content": "segundo copy con enfoque diferente",
      "hook": "otro gancho",
      "cta": "otro cta"
    },
    {
      "version": 3,
      "approach": "promocional",
      "content": "tercer copy con otro angulo",
      "hook": "tercer gancho",
      "cta": "tercer cta"
    }
  ]
}`

  const response = await generateWithOpenAI({
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.8,
    jsonMode: true,
  })

  let copies = []
  try {
    const parsed = JSON.parse(response)
    copies = parsed.copies || []
  } catch {
    return []
  }

  // Validar con supervisor y generar feedback si está disponible
  let supervisorFeedback = null
  
  if (supervisorAgent && copies.length > 0) {
    // Usar 100% el prompt del supervisor configurado
    if (!supervisorAgent.system_prompt) {
      console.warn('El agente Supervisor no tiene prompt configurado')
    }
    const supervisorSystemPrompt = supervisorAgent.system_prompt || `Eres un supervisor de contenido. Valida que el contenido cumpla con los lineamientos de marca.`
    
    const validationPrompt = `===== INFORMACION DE LA MARCA (REFERENCIA PARA VALIDAR) =====
${brandContext}

===== CONTENIDO A VALIDAR =====
Tema: ${strategyContext.theme}
PILAR: ${strategyContext.pillar}
OBJETIVO: ${strategyContext.objective}

===== LINEAMIENTOS DE VALIDACION =====
TONO DE VOZ REQUERIDO: ${brand.tone_of_voice || 'NO DEFINIDO'}
PALABRAS CLAVE OBLIGATORIAS: ${brand.keywords?.length ? brand.keywords.join(', ') : 'NINGUNA'}
PALABRAS PROHIBIDAS: ${brand.forbidden_words?.length ? brand.forbidden_words.join(', ') : 'NINGUNA'}

===== COPYS A VALIDAR =====
${copies.map((c: any, i: number) => `
COPY ${i + 1} (${c.approach}):
${c.content}
`).join('\n')}

===== CRITERIOS DE VALIDACION =====
MARCA COMO NO APROBADO si el copy:
- Incluye beneficios o caracteristicas NO mencionadas en la marca
- El tono no coincide con el definido
- Usa palabras prohibidas
- Es generico y no refleja la identidad de la marca
- Inventa informacion que no esta en el contexto

Responde en formato JSON:
{
  "validations": [
    {
      "version": 1,
      "approved": true/false,
      "improved_content": "version mejorada si no fue aprobada, null si ok",
      "feedback_individual": "comentario breve sobre este copy"
    }
  ],
  "general_feedback": {
    "overall_quality": "excelente/bueno/mejorable",
    "score": 85,
    "strengths": ["punto fuerte 1", "punto fuerte 2"],
    "improvements": ["sugerencia 1", "sugerencia 2"],
    "strategic_notes": "observaciones estrategicas sobre el contenido y su alineacion con los objetivos de la marca",
    "recommended_copy": 1
  }
}`

    try {
      const validationResponse = await generateWithOpenAI({
        system: supervisorSystemPrompt,
        prompt: validationPrompt,
        temperature: 0.3,
        jsonMode: true,
      })

      const validation = JSON.parse(validationResponse)
      
      // Apply improvements
      if (validation.validations) {
        for (const v of validation.validations) {
          const copyIndex = copies.findIndex((c: any) => c.version === v.version)
          if (copyIndex >= 0) {
            if (!v.approved && v.improved_content) {
              copies[copyIndex].content = v.improved_content
              copies[copyIndex].supervisor_improved = true
            }
            copies[copyIndex].feedback = v.feedback_individual
          }
        }
      }
      
      // Store general feedback
      supervisorFeedback = validation.general_feedback || null
      
    } catch (err) {
      console.error('Error validating copies:', err)
    }
  }

  return { copies, supervisorFeedback }
}

// Función para generar contenido basado en la estrategia
async function generateContentFromStrategy({
  brand,
  brandContext,
  creatorAgent,
  strategyContext,
  platform,
  attachment_url,
  attachment_type,
}: {
  brand: any
  brandContext: string
  creatorAgent: any
  strategyContext: {
    pillar: string
    theme: string
    content_type: string
    objective: string
    key_points: string[]
    suggested_hashtags: string[]
    cta_suggestion: string
  }
  platform: string
  attachment_url?: string
  attachment_type?: 'image' | 'video'
}) {
  // Usar 100% el prompt del agente configurado
  if (!creatorAgent.system_prompt) {
    console.warn('El agente Creador no tiene prompt configurado')
  }
  const systemPrompt = creatorAgent.system_prompt || `Eres un creador de contenido. Genera copys basandote UNICAMENTE en la informacion proporcionada.`

  const attachmentInstruction = attachment_url 
    ? `\n\nCONTENIDO VISUAL ADJUNTO: Analiza ${attachment_type === 'video' ? 'el video' : 'la imagen'} adjunta y genera el copy que complemente este contenido visual.`
    : ''

  const userPrompt = `===== INFORMACION DE LA MARCA (USAR SOLO ESTO) =====
${brandContext}

===== LINEAMIENTOS OBLIGATORIOS =====
TONO DE VOZ: ${brand.tone_of_voice || 'NO DEFINIDO'}
PALABRAS CLAVE A USAR: ${brand.keywords?.length ? brand.keywords.join(', ') : 'NINGUNA'}
PALABRAS PROHIBIDAS: ${brand.forbidden_words?.length ? brand.forbidden_words.join(', ') : 'NINGUNA'}
PROPUESTA DE VALOR: ${brand.value_proposition || 'NO DEFINIDA'}

===== ESTRATEGIA DEFINIDA =====
- Pilar: ${strategyContext.pillar}
- Tema: ${strategyContext.theme}
- Tipo: ${strategyContext.content_type}
- Objetivo: ${strategyContext.objective}
- Puntos clave: ${strategyContext.key_points.join(', ')}
- Hashtags sugeridos: ${strategyContext.suggested_hashtags.join(' ')}
- CTA sugerido: ${strategyContext.cta_suggestion}
${attachmentInstruction}

===== INSTRUCCIONES ESTRICTAS =====
Genera contenido para ${platform}.

REGLAS CRITICAS:
1. USA SOLO la informacion de marca proporcionada
2. NO inventes beneficios, caracteristicas o datos
3. El tono DEBE ser EXACTAMENTE el definido
4. INCLUYE las palabras clave SI estan definidas
5. NUNCA uses palabras prohibidas
6. NO uses frases genericas

Responde en formato JSON:
{
  "content": {
    "main_text": "copy usando SOLO info real de la marca",
    "hook": "gancho basado en propuesta de valor REAL",
    "body": "desarrollo usando info REAL",
    "cta": "CTA alineado con lo que la marca REALMENTE ofrece",
    "hashtags": ["#hashtag1"],
    "emojis_used": []
  },
  "strategy_alignment": {
    "pillar_match": true,
    "objective_addressed": "como cumple el objetivo",
    "key_points_included": ["punto incluido"]
  }
}`

  const response = await generateWithOpenAI({
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.8,
    jsonMode: true,
    imageUrl: attachment_type === 'image' ? attachment_url : undefined,
  })

  try {
    return JSON.parse(response)
  } catch {
    return { raw: response }
  }
}

// Función para validar contenido contra la estrategia
async function validateAgainstStrategy({
  brand,
  brandContext,
  supervisorAgent,
  strategyContext,
  contentToValidate,
}: {
  brand: any
  brandContext: string
  supervisorAgent: any
  strategyContext: {
    pillar: string
    theme: string
    objective: string
    key_points: string[]
  }
  contentToValidate: string
}) {
  const systemPrompt = supervisorAgent.system_prompt || `Eres ${supervisorAgent.name}, el supervisor de contenido para ${brand.name}. Tu rol es asegurar que todo el contenido cumpla con la estrategia y los estándares de la marca.`

  const userPrompt = `${brandContext}

---

ESTRATEGIA QUE DEBE CUMPLIR:
- Pilar de contenido: ${strategyContext.pillar}
- Tema: ${strategyContext.theme}
- Objetivo: ${strategyContext.objective}
- Puntos clave requeridos: ${strategyContext.key_points.join(', ')}

CONTENIDO A VALIDAR:
${contentToValidate}

---

TAREA: Valida si el contenido cumple con:
1. La estrategia definida (pilar, tema, objetivo)
2. El contexto de marca (tono, valores, personalidad)
3. Las palabras prohibidas (NO debe contener ninguna)
4. Los puntos clave que debían incluirse
5. La calidad y efectividad del mensaje

Responde en formato JSON:
{
  "validation": {
    "approved": true/false,
    "score": 85,
    "strategy_compliance": {
      "pillar_alignment": true/false,
      "theme_addressed": true/false,
      "objective_met": true/false,
      "key_points_coverage": 80
    },
    "brand_compliance": {
      "tone_match": true/false,
      "values_reflected": true/false,
      "forbidden_words_check": true/false,
      "forbidden_words_found": []
    },
    "quality_assessment": {
      "clarity": 85,
      "engagement_potential": 80,
      "cta_effectiveness": 75
    }
  },
  "feedback": "retroalimentación detallada",
  "improvements": ["mejora 1", "mejora 2"],
  "revised_version": "versión mejorada si no fue aprobada, o null si fue aprobada"
}`

  const response = await generateWithOpenAI({
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.5,
    jsonMode: true,
  })

  try {
    return JSON.parse(response)
  } catch {
    return { raw: response }
  }
}
