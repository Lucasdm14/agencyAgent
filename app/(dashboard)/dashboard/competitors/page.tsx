import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CompetitorsManager } from '@/components/competitors/competitors-manager'

export default async function CompetitorsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'creator'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const { data: brands } = await supabase
    .from('brands')
    .select('id, name')
    .order('name')

  const { data: competitors } = await supabase
    .from('competitors')
    .select(`
      *,
      brand:brands(id, name)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6">
      <CompetitorsManager 
        brands={brands || []} 
        initialCompetitors={competitors || []}
      />
    </div>
  )
}
