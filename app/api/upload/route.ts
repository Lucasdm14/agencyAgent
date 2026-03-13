import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const brandId = formData.get('brand_id') as string | null

  if (!file || !brandId) {
    return NextResponse.json({ error: 'file y brand_id son requeridos' }, { status: 400 })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Solo se permiten imágenes (JPEG, PNG, WebP, GIF)' }, { status: 422 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'La imagen no puede superar 10MB' }, { status: 422 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const storagePath = `${brandId}/${Date.now()}.${ext}`
  const buffer = new Uint8Array(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('posts')
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('[Storage] Upload error:', uploadError)
    return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 })
  }

  return NextResponse.json({ storage_path: storagePath, message: 'Imagen subida correctamente' })
}
