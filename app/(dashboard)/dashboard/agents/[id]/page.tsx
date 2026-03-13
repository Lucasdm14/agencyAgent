import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { AgentForm } from '@/components/agents/agent-form'

interface EditAgentPageProps {
  params: Promise<{ id: string }>
}

export default async function EditAgentPage({ params }: EditAgentPageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single()

  if (!agent) {
    notFound()
  }

  const { data: brands } = await supabase
    .from('brands')
    .select('id, name')
    .order('name')

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Editar Agente</h2>
        <p className="text-muted-foreground">Actualiza la configuracion de {agent.name}</p>
      </div>
      
      <AgentForm agent={agent} brands={brands || []} />
    </div>
  )
}
