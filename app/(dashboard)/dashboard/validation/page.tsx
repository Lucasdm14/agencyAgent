import { createClient } from '@/lib/supabase/server'
import { ValidationPortal } from '@/components/validation/validation-portal'

export default async function ValidationPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single()

  // Get content pending validation
  // For clients: only their assigned brands
  // For admin/creator: all content
  let query = supabase
    .from('content')
    .select(`
      *,
      brand:brands(id, name, logo_url),
      validations(*, client:profiles(full_name))
    `)
    .in('status', ['pending_review', 'approved', 'rejected', 'needs_changes'])
    .order('created_at', { ascending: false })

  if (profile?.role === 'client') {
    // Get brands the client has access to
    const { data: brandAccess } = await supabase
      .from('brand_access')
      .select('brand_id')
      .eq('user_id', user?.id)

    if (brandAccess && brandAccess.length > 0) {
      const brandIds = brandAccess.map(b => b.brand_id)
      query = query.in('brand_id', brandIds)
    }
  }

  const { data: content } = await query

  const { data: brands } = await supabase
    .from('brands')
    .select('id, name')
    .order('name')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Validacion de Contenido</h2>
        <p className="text-muted-foreground">
          {profile?.role === 'client' 
            ? 'Revisa y aprueba el contenido de tus marcas'
            : 'Gestiona las validaciones de contenido con tus clientes'
          }
        </p>
      </div>
      
      <ValidationPortal 
        content={content || []} 
        brands={brands || []}
        userRole={profile?.role || 'client'}
        userId={user?.id || ''}
      />
    </div>
  )
}
