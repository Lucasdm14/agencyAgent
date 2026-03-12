import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Usamos el service role para validar invitaciones sin autenticacion
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ valid: false, error: 'Token requerido' }, { status: 400 })
  }

  const { data: invitation, error } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !invitation) {
    return NextResponse.json({ 
      valid: false, 
      error: 'Invitacion invalida o expirada' 
    }, { status: 404 })
  }

  return NextResponse.json({
    valid: true,
    email: invitation.email,
    role: invitation.role,
    brandId: invitation.brand_id,
  })
}

export async function POST(request: NextRequest) {
  const { token } = await request.json()

  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
  }

  // Marcar la invitacion como usada
  const { error } = await supabaseAdmin
    .from('invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token)
    .is('used_at', null)

  if (error) {
    return NextResponse.json({ error: 'Error al procesar invitacion' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
