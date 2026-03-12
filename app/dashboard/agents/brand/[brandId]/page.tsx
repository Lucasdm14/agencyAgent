import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, Building2, Plus, Sparkles, Shield, Target, 
  Settings, CheckCircle2, AlertCircle, Zap, ChevronRight 
} from 'lucide-react'
import { DeleteAgentButton } from '@/components/agents/delete-agent-button'

const agentTypeConfig = {
  creator: { 
    label: 'Creador', 
    icon: Sparkles, 
    color: 'bg-emerald-500', 
    bgLight: 'bg-emerald-500/10',
    textColor: 'text-emerald-500',
    borderColor: 'border-emerald-500/30',
    description: 'Genera contenido creativo alineado con la marca',
  },
  supervisor: { 
    label: 'Supervisor', 
    icon: Shield, 
    color: 'bg-amber-500', 
    bgLight: 'bg-amber-500/10',
    textColor: 'text-amber-500',
    borderColor: 'border-amber-500/30',
    description: 'Valida que el contenido cumpla con las guias de marca',
  },
  strategist: { 
    label: 'Estratega', 
    icon: Target, 
    color: 'bg-violet-500', 
    bgLight: 'bg-violet-500/10',
    textColor: 'text-violet-500',
    borderColor: 'border-violet-500/30',
    description: 'Define la estrategia de publicacion y timing',
  },
}

export default async function BrandAgentsPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch brand info
  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single()

  if (!brand) redirect('/dashboard/agents')

  // Fetch agents for this brand
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('brand_id', brandId)
    .order('type', { ascending: true })

  const agentsList = agents || []
  const creatorAgents = agentsList.filter(a => a.type === 'creator')
  const supervisorAgents = agentsList.filter(a => a.type === 'supervisor')
  const strategistAgents = agentsList.filter(a => a.type === 'strategist')

  const hasCompleteWorkflow = creatorAgents.length > 0 && supervisorAgents.length > 0 && strategistAgents.length > 0

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/dashboard/agents" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Volver a Agentes
      </Link>

      {/* Brand Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-background flex items-center justify-center border border-border">
            {brand.logo_url ? (
              <img src={brand.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{brand.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {hasCompleteWorkflow ? (
                <Badge className="bg-emerald-500/20 text-emerald-500 border-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Workflow Completo
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-500 border-0">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Workflow Incompleto
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">{agentsList.length} agentes</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasCompleteWorkflow && (
            <Link href={`/dashboard/generate?brand=${brandId}&mode=agents`}>
              <Button variant="outline" className="border-accent text-accent hover:bg-accent/10">
                <Zap className="h-4 w-4 mr-2" />
                Generar contenido
              </Button>
            </Link>
          )}
          <Link href={`/dashboard/agents/new?brand=${brandId}`}>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Agente
            </Button>
          </Link>
        </div>
      </div>

      {/* Workflow Flow Indicator */}
      <Card className="bg-secondary/30 border-border">
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-4">
            <span className="text-sm text-muted-foreground">Flujo de trabajo:</span>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${creatorAgents.length > 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                <Sparkles className="h-4 w-4" />
                <span className="font-medium">Creador</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${supervisorAgents.length > 0 ? 'bg-amber-500/20 text-amber-500' : 'bg-muted text-muted-foreground'}`}>
                <Shield className="h-4 w-4" />
                <span className="font-medium">Supervisor</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${strategistAgents.length > 0 ? 'bg-violet-500/20 text-violet-500' : 'bg-muted text-muted-foreground'}`}>
                <Target className="h-4 w-4" />
                <span className="font-medium">Estratega</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agents by Role - Compact Layout */}
      <div className="space-y-4">
        {(['creator', 'supervisor', 'strategist'] as const).map((type) => {
          const config = agentTypeConfig[type]
          const Icon = config.icon
          const typeAgents = type === 'creator' ? creatorAgents : type === 'supervisor' ? supervisorAgents : strategistAgents

          return (
            <Card key={type} className="bg-card border-border">
              <CardContent className="p-4">
                {/* Role Header - Compact */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bgLight}`}>
                      <Icon className={`h-4 w-4 ${config.textColor}`} />
                    </div>
                    <div>
                      <h2 className="font-medium text-foreground">{config.label}</h2>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                  <Link href={`/dashboard/agents/new?brand=${brandId}&type=${type}`}>
                    <Button variant="ghost" size="sm" className={config.textColor}>
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar
                    </Button>
                  </Link>
                </div>

                {/* Agents List - Compact */}
                {typeAgents.length > 0 ? (
                  <div className="space-y-2">
                    {typeAgents.map((agent) => (
                      <div key={agent.id} className={`flex items-center justify-between p-3 rounded-lg border ${config.borderColor} bg-secondary/30`}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground text-sm truncate">{agent.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${agent.is_active ? 'bg-emerald-500/20 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                                {agent.is_active ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {agent.system_prompt.substring(0, 60)}...
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Link href={`/dashboard/agents/${agent.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 px-2">
                              <Settings className="h-3 w-3" />
                            </Button>
                          </Link>
                          <DeleteAgentButton agentId={agent.id} agentName={agent.name} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`p-4 rounded-lg border border-dashed ${config.borderColor} ${config.bgLight} text-center`}>
                    <p className="text-xs text-muted-foreground">Sin {config.label.toLowerCase()}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
