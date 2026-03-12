import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebhookPayload {
  image_url: string
  final_copy: string
  scheduled_date: string
  client_name: string
  platform: string
  hashtags: string[]
  post_id: string
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { post_id, final_copy, scheduled_date } = await req.json()

  if (!post_id || !final_copy || !scheduled_date) {
    return NextResponse.json(
      { error: 'post_id, final_copy y scheduled_date son requeridos' },
      { status: 400 }
    )
  }

  // ── 1. Load post with brand webhook_url ───────────────────────────────────
  const { data: post } = await supabase
    .from('posts')
    .select('*, brands(name, webhook_url)')
    .eq('id', post_id)
    .single()

  if (!post) {
    return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })
  }

  // ── 2. Guard: only pm_review or supervisor_review posts can be approved ───
  if (!['pm_review', 'supervisor_review'].includes(post.status)) {
    return NextResponse.json(
      { error: `No se puede aprobar un post con status "${post.status}"` },
      { status: 409 }
    )
  }

  // ── 3. Log edit if PM changed the copy ───────────────────────────────────
  if (final_copy !== post.generated_copy) {
    await supabase.from('post_edit_log').insert({
      post_id,
      editor_type: 'pm',
      editor_id: user.id,
      previous_copy: post.generated_copy,
      new_copy: final_copy,
      edit_reason: 'Edición manual en dashboard de aprobación',
    })
  }

  // ── 4. Mark as approved ───────────────────────────────────────────────────
  await supabase
    .from('posts')
    .update({
      status: 'approved',
      final_copy,
      scheduled_date,
    })
    .eq('id', post_id)

  // ── 5. Fire webhook if configured ────────────────────────────────────────
  const webhookUrl = post.brands?.webhook_url
  if (webhookUrl) {
    // Generate a fresh signed URL for the webhook payload
    let publicImageUrl = post.image_url
    if (!post.image_url.startsWith('http')) {
      const { data: signedData } = await supabase.storage
        .from('posts')
        .createSignedUrl(post.image_url, 86400) // 24h valid for the scheduler
      if (signedData?.signedUrl) {
        publicImageUrl = signedData.signedUrl
      }
    }

    const payload: WebhookPayload = {
      image_url: publicImageUrl,
      final_copy,
      scheduled_date,
      client_name: post.brands.name,
      platform: post.platform,
      hashtags: post.hashtags ?? [],
      post_id,
    }

    try {
      const webhookRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      if (webhookRes.ok) {
        // ── 6a. Webhook success ─────────────────────────────────────────────
        await supabase
          .from('posts')
          .update({
            status: 'webhook_sent',
            webhook_payload: payload as unknown as Record<string, unknown>,
            webhook_sent_at: new Date().toISOString(),
          })
          .eq('id', post_id)

        return NextResponse.json({
          success: true,
          status: 'webhook_sent',
          message: 'Post aprobado y enviado al scheduler exitosamente.',
        })
      } else {
        // ── 6b. Webhook returned error ──────────────────────────────────────
        const errorText = await webhookRes.text().catch(() => 'Sin detalles')
        await supabase
          .from('posts')
          .update({
            webhook_error: `HTTP ${webhookRes.status}: ${errorText.slice(0, 500)}`,
            webhook_payload: payload as unknown as Record<string, unknown>,
          })
          .eq('id', post_id)

        // Post stays as "approved" — PM can retry manually
        return NextResponse.json({
          success: true,
          status: 'approved',
          warning: `Post aprobado pero el webhook respondió con error ${webhookRes.status}. Revisá la configuración del webhook.`,
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      await supabase
        .from('posts')
        .update({ webhook_error: errorMessage })
        .eq('id', post_id)

      return NextResponse.json({
        success: true,
        status: 'approved',
        warning: `Post aprobado pero no se pudo enviar el webhook: ${errorMessage}`,
      })
    }
  }

  // ── No webhook configured ─────────────────────────────────────────────────
  return NextResponse.json({
    success: true,
    status: 'approved',
    message: 'Post aprobado. No hay webhook configurado para este cliente.',
  })
}

// ─── PATCH: reject a post ─────────────────────────────────────────────────────

export async function PATCH(req: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { post_id, reject_reason } = await req.json()

  if (!post_id) {
    return NextResponse.json({ error: 'post_id es requerido' }, { status: 400 })
  }

  const { data: post } = await supabase
    .from('posts')
    .select('status, generated_copy')
    .eq('id', post_id)
    .single()

  if (!post) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })

  // Log the rejection
  if (reject_reason) {
    await supabase.from('post_edit_log').insert({
      post_id,
      editor_type: 'pm',
      editor_id: user.id,
      previous_copy: post.generated_copy ?? '',
      new_copy: post.generated_copy ?? '',
      edit_reason: `RECHAZADO: ${reject_reason}`,
    })
  }

  await supabase
    .from('posts')
    .update({ status: 'rejected' })
    .eq('id', post_id)

  return NextResponse.json({ success: true, status: 'rejected' })
}
