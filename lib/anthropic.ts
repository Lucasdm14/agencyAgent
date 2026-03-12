import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export default anthropic

export interface ClaudeTextOptions {
  system: string
  prompt: string
  temperature?: number
  imageUrl?: string // signed URL from Supabase Storage
}

/**
 * Core Claude call — text or multimodal (image + text).
 * Always returns a parsed JSON-safe string.
 */
export async function callClaude({
  system,
  prompt,
  temperature = 0.7,
  imageUrl,
}: ClaudeTextOptions): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY no está configurada')
  }

  const userContent: Anthropic.MessageParam['content'] = imageUrl
    ? [
        {
          type: 'image',
          source: { type: 'url', url: imageUrl },
        },
        { type: 'text', text: prompt },
      ]
    : prompt

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    temperature,
    system,
    messages: [{ role: 'user', content: userContent }],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Claude devolvió un bloque no-texto')
  return block.text
}

/**
 * Parses Claude's response as JSON.
 * Strips markdown fences if present.
 */
export function parseJSON<T>(raw: string): T {
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(clean) as T
}
