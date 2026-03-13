'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Sparkles, Shield, Target, Building2, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react'

interface Agent {
  id: string
  name: string
  type: 'creator' | 'supervisor' | 'strategist'
  system_prompt: string
  is_active: boolean
  brand: {
    id: string
    name: string
    logo_url: string | null
  } | null
}

interface Brand {
  id: string
  name: string
  logo_url: string | null
  industry?: string
}

export function AgentsView({ agents, brands }: { agents: Agent[], brands: Brand[] }) {
  // Get agents grouped by brand
  const agentsByBrand = useMemo(() => {
    const grouped: Record<string, { creator: Agent[], supervisor: Agent[], strategist: Agent[] }> = {}
    brands.forEach(brand => {
      const brandAgents = agents.filter(a => a.brand?.id === brand.id)
      grouped[brand.id] = {
        creator: brandAgents.filter(a => a.type === 'creator'),
        supervisor: brandAgents.filter(a => a.type === 'supervisor'),
        strategist: brandAgents.filter(a => a.type === 'strategist'),
      }
    })
    return grouped
  }, [agents, brands])

  // Check if brand has complete workflow
  const hasCompleteWorkflow = (brandId: string) => {
    const ba = agentsByBrand[brandId]
    return ba?.creator.length > 0 && ba?.supervisor.length > 0 && ba?.strategist.length > 0
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Agentes AI</h2>
          <p className="text-muted-foreground">Selecciona una marca para ver y configurar sus agentes</p>
        </div>
        <Link href="/dashboard/agents/new">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Agente
          </Button>
        </Link>
      </div>

      {brands.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No hay marcas</h3>
            <p className="text-muted-foreground text-center mb-6">
              Primero necesitas crear una marca antes de configurar agentes
            </p>
            <Link href="/dashboard/brands/new">
              <Button className="bg-primary text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" />
                Crear marca
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => {
            const brandAgents = agentsByBrand[brand.id] || { creator: [], supervisor: [], strategist: [] }
            const totalAgents = brandAgents.creator.length + brandAgents.supervisor.length + brandAgents.strategist.length
            const isComplete = hasCompleteWorkflow(brand.id)
            
            return (
              <Link key={brand.id} href={`/dashboard/agents/brand/${brand.id}`}>
                <Card className="bg-card border-border hover:border-accent hover:shadow-lg transition-all cursor-pointer h-full">
                  <CardContent className="p-5">
                    {/* Brand Logo & Name */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-secondary to-background flex items-center justify-center flex-shrink-0 border border-border">
                        {brand.logo_url ? (
                          <img src={brand.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <Building2 className="h-7 w-7 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground truncate">{brand.name}</h3>
                        <p className="text-sm text-muted-foreground">{totalAgents} agentes</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* Status Badge */}
                    <div className="mb-4">
                      {isComplete ? (
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
                    </div>

                    {/* Agent Type Summary */}
                    <div className="flex items-center gap-3 pt-3 border-t border-border">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${brandAgents.creator.length > 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{brandAgents.creator.length}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${brandAgents.supervisor.length > 0 ? 'bg-amber-500/20 text-amber-500' : 'bg-muted text-muted-foreground'}`}>
                        <Shield className="h-3.5 w-3.5" />
                        <span>{brandAgents.supervisor.length}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${brandAgents.strategist.length > 0 ? 'bg-violet-500/20 text-violet-500' : 'bg-muted text-muted-foreground'}`}>
                        <Target className="h-3.5 w-3.5" />
                        <span>{brandAgents.strategist.length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
