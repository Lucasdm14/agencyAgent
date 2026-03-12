import OpenAI from 'openai'

// Cliente de OpenAI usando la API key directamente
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default openai

// Helper para generar texto con OpenAI (con soporte de imágenes para visión)
export async function generateWithOpenAI({
  system,
  prompt,
  temperature = 0.7,
  model = 'gpt-4o-mini',
  jsonMode = false,
  imageUrl,
}: {
  system: string
  prompt: string
  temperature?: number
  model?: string
  jsonMode?: boolean
  imageUrl?: string // URL de imagen para análisis visual
}): Promise<string> {
  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no esta configurada')
  }
  
  // Build user message content (text or multimodal with image)
  let userContent: string | Array<{ type: 'text' | 'image_url', text?: string, image_url?: { url: string } }>
  
  if (imageUrl) {
    // Use multimodal content with image - requires gpt-4o or gpt-4o-mini
    userContent = [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: imageUrl } },
    ]
    // Ensure we use a vision-capable model
    if (!model.includes('gpt-4o')) {
      model = 'gpt-4o-mini'
    }
  } else {
    userContent = prompt
  }

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent as any },
      ],
      temperature,
      response_format: jsonMode ? { type: 'json_object' } : undefined,
    })

    return response.choices[0]?.message?.content || ''
  } catch (error: any) {
    console.error('[OpenAI Error]', error?.message || error)
    throw new Error('Error al comunicarse con OpenAI: ' + (error?.message || 'Error desconocido'))
  }
}

// Helper para generar múltiples copys
export async function generateCopies({
  system,
  prompt,
  count = 10,
  temperature = 0.8,
}: {
  system: string
  prompt: string
  count?: number
  temperature?: number
}): Promise<{
  copies: Array<{
    title: string
    body: string
    hashtags: string[] | null
    cta: string | null
  }>
}> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    temperature,
    response_format: { type: 'json_object' },
  })

  const text = response.choices[0]?.message?.content || '{}'
  
  try {
    return JSON.parse(text)
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1])
    }
    throw new Error('No se pudo parsear la respuesta de OpenAI')
  }
}
