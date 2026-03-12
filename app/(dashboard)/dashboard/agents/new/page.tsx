import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AgentForm } from '@/components/agents/agent-form'

export default async function NewAgentPage() {
  const supabase = await createClient()
  
  const { data: brands } = await supabase
    .from('brands')
    .select('id, name')
    .order('name')

  if (!brands || brands.length === 0) {
    redirect('/dashboard/brands/new')
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Nuevo Agente AI</h2>
        <p className="text-muted-foreground">Configura un nuevo agente para generar o supervisar contenido</p>
      </div>
      
      <AgentForm brands={brands} />
    </div>
  )
}
