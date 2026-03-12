import { createClient } from '@/lib/supabase/server'
import { generateWithOpenAI } from '@/lib/openai'

export async function POST(req: Request) {
  const { brandId, content, contentType, platform } = await req.json()

  const supabase = await createClient()
  
  // Get brand info
  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single()

  if (!brand) {
    return new Response('Brand not found', { status: 404 })
  }

  // Get supervisor agent if exists
  const { data: supervisorAgent } = await supabase
    .from('agents')
    .select('*')
    .eq('brand_id', brandId)
    .eq('type', 'supervisor')
    .single()

  const systemPrompt = supervisorAgent?.system_prompt || `Eres un supervisor de contenido experto en marketing y publicidad.
Tu trabajo es revisar y validar el contenido generado para asegurar que cumple con los estandares de calidad.

CRITERIOS DE EVALUACION:
1. Alineacion con el tono de voz de la marca
2. Claridad y coherencia del mensaje
3. Efectividad del CTA (si aplica)
4. Uso apropiado de palabras clave
5. Optimizacion para la plataforma destino
6. Originalidad y creatividad
7. Correccion gramatical y ortografica
8. Potencial de engagement

ESCALA DE PUNTUACION:
- 1-3: Rechazado - Requiere reescritura completa
- 4-5: Necesita cambios significativos
- 6-7: Aceptable con mejoras menores
- 8-9: Bueno, listo para revision del cliente
- 10: Excelente, publicar directamente`

  const prompt = `Evalua el siguiente contenido para la marca ${brand.name}:

CONTEXTO DE LA MARCA:
- Tono de voz: ${brand.tone_of_voice || 'Profesional'}
- Audiencia: ${brand.target_audience || 'General'}
- Valores: ${brand.brand_values?.join(', ') || 'No especificados'}
- Palabras clave: ${brand.keywords?.join(', ') || 'Ninguna'}

CONTENIDO A EVALUAR:
Tipo: ${contentType}
Plataforma: ${platform || 'No especificada'}
Contenido:
"""
${content}
"""

Proporciona una evaluacion detallada con puntuacion, feedback constructivo, sugerencias especificas de mejora, y si es necesario, una version mejorada del copy.

Responde SOLO con un objeto JSON valido con esta estructura:
{
  "score": numero del 1 al 10,
  "approved": true o false,
  "feedback": "evaluacion detallada",
  "suggestions": ["sugerencia 1", "sugerencia 2"],
  "improvedVersion": "version mejorada del copy" o null si no es necesaria
}`

  try {
    const text = await generateWithOpenAI({
      system: systemPrompt,
      prompt,
      temperature: 0.3,
      jsonMode: true,
    })

    const output = JSON.parse(text)
    return Response.json(output)
  } catch (error) {
    console.error('Supervisor error:', error)
    return Response.json({ error: 'Error evaluando contenido' }, { status: 500 })
  }
}
