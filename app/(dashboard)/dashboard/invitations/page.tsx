import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InvitationsManager } from '@/components/invitations/invitations-manager'

export default async function InvitationsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Verificar que es admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  // Obtener invitaciones
  const { data: invitations } = await supabase
    .from('invitations')
    .select('*, brands(name)')
    .order('created_at', { ascending: false })

  // Obtener marcas para el selector
  const { data: brands } = await supabase
    .from('brands')
    .select('id, name')
    .order('name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Invitaciones</h1>
        <p className="text-muted-foreground">
          Gestiona las invitaciones para nuevos usuarios
        </p>
      </div>

      <InvitationsManager 
        invitations={invitations || []} 
        brands={brands || []} 
      />
    </div>
  )
}
