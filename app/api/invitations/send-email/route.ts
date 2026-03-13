import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { invitationId } = await request.json()

    if (!invitationId) {
      return NextResponse.json({ error: 'ID de invitacion requerido' }, { status: 400 })
    }

    // Get invitation details
    const { data: invitation, error: invError } = await supabase
      .from('invitations')
      .select('*, brands(name)')
      .eq('id', invitationId)
      .single()

    if (invError || !invitation) {
      return NextResponse.json({ error: 'Invitacion no encontrada' }, { status: 404 })
    }

    if (!RESEND_API_KEY) {
      return NextResponse.json({ 
        error: 'RESEND_API_KEY no configurada. Agrega la variable de entorno para enviar emails.',
        link: `${process.env.NEXT_PUBLIC_APP_URL || ''}/auth/sign-up?token=${invitation.token}`
      }, { status: 400 })
    }

    // Send email using Resend
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'
    const inviteLink = `${baseUrl}/auth/sign-up?token=${invitation.token}`
    
    const roleLabels: Record<string, string> = {
      admin: 'Administrador',
      creator: 'Creador de Contenido',
      client: 'Cliente',
      guest: 'Invitado',
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AI Content Platform <noreply@yourdomain.com>',
        to: invitation.email,
        subject: 'Invitacion a la plataforma de contenido AI',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Has sido invitado!</h1>
            <p>Has recibido una invitacion para unirte a la plataforma de contenido AI.</p>
            <p><strong>Rol:</strong> ${roleLabels[invitation.role] || invitation.role}</p>
            ${invitation.brands?.name ? `<p><strong>Marca asignada:</strong> ${invitation.brands.name}</p>` : ''}
            <p>Haz clic en el siguiente enlace para crear tu cuenta:</p>
            <a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Crear mi cuenta
            </a>
            <p style="color: #666; font-size: 12px;">Este enlace expira el ${new Date(invitation.expires_at).toLocaleDateString('es-ES')}</p>
          </div>
        `,
      }),
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json()
      console.error('Resend error:', errorData)
      return NextResponse.json({ 
        error: 'Error al enviar email',
        details: errorData
      }, { status: 500 })
    }

    // Update invitation to mark email as sent
    await supabase
      .from('invitations')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', invitationId)

    return NextResponse.json({ 
      success: true,
      message: `Email enviado a ${invitation.email}`
    })

  } catch (error) {
    console.error('Error sending invitation email:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
