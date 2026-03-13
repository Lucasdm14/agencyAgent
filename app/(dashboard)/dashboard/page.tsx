import { createClient } from '@/lib/supabase/server'
import { DashboardView } from '@/components/dashboard/dashboard-view'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Fetch all data needed for the dashboard
  const [
    { data: brands },
    { data: allContent },
    { data: agents },
  ] = await Promise.all([
    supabase.from('brands').select('id, name, logo_url').order('name'),
    supabase.from('content').select('*, brand:brands(name)').order('created_at', { ascending: false }),
    supabase.from('agents').select('id, type, brand_id'),
  ])

  return (
    <DashboardView 
      brands={brands || []} 
      allContent={allContent || []} 
      agents={agents || []}
    />
  )
}
