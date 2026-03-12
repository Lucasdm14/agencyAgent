import { createClient } from '@/lib/supabase/server'
import { AgentsView } from '@/components/agents/agents-view'

export default async function AgentsPage() {
  const supabase = await createClient()
  
  const { data: agents } = await supabase
    .from('agents')
    .select('*, brand:brands(id, name, logo_url)')
    .order('brand_id', { ascending: true })
    .order('type', { ascending: true })

  const { data: brands } = await supabase
    .from('brands')
    .select('id, name, logo_url')
    .order('name')

  return <AgentsView agents={agents || []} brands={brands || []} />
}
