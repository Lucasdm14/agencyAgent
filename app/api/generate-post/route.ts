import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { callClaude, parseJSON } from '@/lib/anthropic'
import { getCreatorSystemPrompt, getCreatorUserPrompt } from '@/lib/prompts/creator'
import { getSupervisorSystemPrompt, getSupervisorUserPrompt } from '@/lib/prompts/supervisor'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreatorOutput {
  generated_copy: string
  hashtags: string[]
  visual_description: string
  rationale: string
}

interface ClauseValidation {
  rule: string
  category: string
  passed: boolean
  comment: string | null
}

interface SupervisorOutput {
  score: number
  overall_approved: boolean
  clause_validations: ClauseValidation[]
  critical_violations: number
  suggested_fix: string | null
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { brand_id, image_url, platform, additional_context } = await req.json()

  if (!brand_id || !image_url || !platform) {
    return NextResponse.json({ error: 'brand_id, image_url y platform son requeridos' }, { status: 400 })
  }

  // ── 1. Load brand with structured brandbook ──────────────────────────────
  const { data: brand } = await supabase
    .from('brands')
    .select('id, name, brandbook_rules')
    .eq('id', brand_id)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Marca no encontrada' }, { status: 404 })
  }

  if (!brand.brandbook_rules) {
    return NextResponse.json(
      { error: 'Esta marca no tiene brandbook configurado. Completalo en Configuración → Brandbook.' },
      { status: 422 }
    )
  }

  const brandbookJson = JSON.stringify(brand.brandbook_rules, null, 2)

  // ── 2. Generate signed URL (ensures Claude can always access it) ──────────
  // image_url stored in DB is the storage path, e.g. "posts/brand_id/file.jpg"
  // We generate a fresh signed URL valid for 1 hour
  let signedImageUrl = image_url
  if (!image_url.startsWith('http')) {
    const { data: signedData } = await supabase.storage
      .from('posts')
      .createSignedUrl(image_url, 3600)
    if (!signedData?.signedUrl) {
      return NextResponse.json({ error: 'No se pudo generar URL firmada de la imagen' }, { status: 500 })
    }
    signedImageUrl = signedData.signedUrl
  }

  // ── 3. Creator Agent — Claude 3.5 Sonnet with vision ─────────────────────
  let creatorOutput: CreatorOutput
  try {
    const creatorRaw = await callClaude({
      system: getCreatorSystemPrompt(brand.name, platform),
      prompt: getCreatorUserPrompt(brandbookJson, platform, additional_context),
      temperature: 0.8,
      imageUrl: signedImageUrl,
    })
    creatorOutput = parseJSON<CreatorOutput>(creatorRaw)
  } catch (err) {
    console.error('[Creator] Error:', err)
    return NextResponse.json({ error: 'Error al generar el copy con IA. Intenta de nuevo.' }, { status: 500 })
  }

  // ── 4. Supervisor Agent — strict audit at low temperature ─────────────────
  let supervisorOutput: SupervisorOutput
  try {
    const supervisorRaw = await callClaude({
      system: getSupervisorSystemPrompt(),
      prompt: getSupervisorUserPrompt(brandbookJson, creatorOutput.generated_copy, creatorOutput.hashtags),
      temperature: 0.2,
    })
    supervisorOutput = parseJSON<SupervisorOutput>(supervisorRaw)
  } catch (err) {
    console.error('[Supervisor] Error:', err)
    // Supervisor failure should not block the PM from seeing the content
    // Default to cautious values so PM sees the post but with warning
    supervisorOutput = {
      score: 5,
      overall_approved: false,
      clause_validations: [],
      critical_violations: 0,
      suggested_fix: 'El supervisor IA no pudo auditar este copy. Revisá manualmente.',
    }
  }

  // ── 5. Determine status based on supervisor result ────────────────────────
  // If > 2 critical violations → supervisor_review (PM sees detailed warning)
  // Otherwise → pm_review (PM sees normal card)
  const status = supervisorOutput.critical_violations > 2 ? 'supervisor_review' : 'pm_review'

  // ── 6. Save post to DB ────────────────────────────────────────────────────
  const { data: post, error: insertError } = await supabase
    .from('posts')
    .insert({
      brand_id,
      image_url,                                          // store path, not signed URL
      platform,
      generated_copy: creatorOutput.generated_copy,
      hashtags: creatorOutput.hashtags,
      ai_rationale: creatorOutput.rationale,
      visual_description: creatorOutput.visual_description,
      supervisor_score: supervisorOutput.score,
      supervisor_validation: supervisorOutput.clause_validations,
      critical_violations: supervisorOutput.critical_violations,
      suggested_fix: supervisorOutput.suggested_fix,
      status,
      created_by: user.id,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[DB] Insert error:', insertError)
    return NextResponse.json({ error: 'Error al guardar el post' }, { status: 500 })
  }

  return NextResponse.json({
    post,
    creator: creatorOutput,
    supervisor: supervisorOutput,
    status,
  })
}
