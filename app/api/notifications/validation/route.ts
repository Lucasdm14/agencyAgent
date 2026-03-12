import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { contentId, userId, userEmail } = await request.json()

  if (!contentId || !userId) {
    return Response.json({ error: 'Faltan parametros' }, { status: 400 })
  }

  // Get content details
  const { data: content, error: contentError } = await supabase
    .from('content')
    .select(`
      *,
      brand:brands(name)
    `)
    .eq('id', contentId)
    .single()

  if (contentError || !content) {
    return Response.json({ error: 'Contenido no encontrado' }, { status: 404 })
  }

  // Get user details
  const { data: assignedUser, error: userError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (userError || !assignedUser) {
    return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  // Use the email passed from the frontend (from profiles joined with auth)
  const recipientEmail = userEmail

  if (!recipientEmail) {
    await supabase
      .from('content')
      .update({ notification_sent: true })
      .eq('id', contentId)

    return Response.json({ 
      success: true, 
      message: 'Contenido asignado. El usuario vera la notificacion en su dashboard.',
      emailSent: false 
    })
  }

  // Check if RESEND_API_KEY is configured
  const resendApiKey = process.env.RESEND_API_KEY
  
  if (!resendApiKey) {
    // No email service configured, just mark as assigned
    await supabase
      .from('content')
      .update({ notification_sent: true })
      .eq('id', contentId)

    return Response.json({ 
      success: true, 
      message: 'Contenido asignado. Configura RESEND_API_KEY para enviar emails.',
      emailSent: false 
    })
  }

  // Send email with Resend
  const resend = new Resend(resendApiKey)
  
  try {
    const { error: emailError } = await resend.emails.send({
      from: 'AgencyCopilot <noreply@resend.dev>',
      to: recipientEmail,
      subject: `Nuevo contenido para validar - ${content.brand?.name || 'Sin marca'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hola ${assignedUser.full_name},</h2>
          
          <p>Se te ha asignado un nuevo contenido para validar.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Marca:</strong> ${content.brand?.name || 'Sin marca'}</p>
            <p style="margin: 0 0 10px 0;"><strong>Titulo:</strong> ${content.title || 'Sin titulo'}</p>
            <p style="margin: 0;"><strong>Tipo:</strong> ${content.content_type}</p>
          </div>
          
          <p>Por favor ingresa a la plataforma para revisar y aprobar/rechazar el contenido.</p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Saludos,<br>
            <strong>AgencyCopilot</strong>
          </p>
        </div>
      `,
    })

    if (emailError) {
      console.error('Error sending email:', emailError)
      // Still mark as assigned even if email fails
      await supabase
        .from('content')
        .update({ notification_sent: true })
        .eq('id', contentId)

      return Response.json({ 
        success: true, 
        message: 'Contenido asignado pero hubo un error enviando el email.',
        emailSent: false,
        error: emailError.message
      })
    }

    // Mark notification as sent
    await supabase
      .from('content')
      .update({ notification_sent: true })
      .eq('id', contentId)

    return Response.json({ 
      success: true, 
      message: 'Notificacion enviada correctamente',
      emailSent: true
    })
  } catch (error) {
    console.error('Error sending email:', error)
    
    await supabase
      .from('content')
      .update({ notification_sent: true })
      .eq('id', contentId)

    return Response.json({ 
      success: true, 
      message: 'Contenido asignado pero hubo un error enviando el email.',
      emailSent: false
    })
  }
}
