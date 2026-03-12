'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2, FileText, Calendar, CheckCircle, Clock, Bot, Target, Users } from 'lucide-react'

interface Brand {
  id: string
  name: string
  logo_url: string | null
}

interface Content {
  id: string
  title: string | null
  body: string
  status: string
  platform: string | null
  content_type: string | null
  created_at: string
  brand_id: string | null
  brand: { name: string } | null
}

interface Agent {
  id: string
  type: string
  brand_id: string | null
}

interface DashboardViewProps {
  brands: Brand[]
  allContent: Content[]
  agents: Agent[]
}

export function DashboardView({ brands, allContent, agents }: DashboardViewProps) {
  const [selectedBrand, setSelectedBrand] = useState<string>('all')

  // Filter content by brand
  const filteredContent = useMemo(() => {
    if (selectedBrand === 'all') return allContent
    return allContent.filter(c => c.brand_id === selectedBrand)
  }, [allContent, selectedBrand])

  // Filter agents by brand
  const filteredAgents = useMemo(() => {
    if (selectedBrand === 'all') return agents
    return agents.filter(a => a.brand_id === selectedBrand)
  }, [agents, selectedBrand])

  // Calculate stats based on filtered content
  const stats = useMemo(() => {
    const pending = filteredContent.filter(c => c.status === 'pending_review').length
    const approved = filteredContent.filter(c => c.status === 'approved').length
    const scheduled = filteredContent.filter(c => c.status === 'scheduled').length
    const creators = filteredAgents.filter(a => a.type === 'creator').length
    const supervisors = filteredAgents.filter(a => a.type === 'supervisor').length
    const strategists = filteredAgents.filter(a => a.type === 'strategist').length

    return [
      { name: 'Contenidos', value: filteredContent.length, icon: FileText, color: 'text-emerald-500' },
      { name: 'Pendientes', value: pending, icon: Clock, color: 'text-amber-500' },
      { name: 'Aprobados', value: approved, icon: CheckCircle, color: 'text-emerald-500' },
      { name: 'Programados', value: scheduled, icon: Calendar, color: 'text-violet-500' },
      { name: 'Agentes', value: filteredAgents.length, icon: Bot, color: 'text-sky-500', 
        subtitle: `${creators}C / ${supervisors}S / ${strategists}E` },
    ]
  }, [filteredContent, filteredAgents])

  // Recent content (last 5)
  const recentContent = filteredContent.slice(0, 5)

  // Get current brand name
  const currentBrandName = selectedBrand === 'all' 
    ? 'Todas las marcas' 
    : brands.find(b => b.id === selectedBrand)?.name || 'Marca'

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: 'Borrador', className: 'bg-muted text-muted-foreground' },
      pending_review: { label: 'Pendiente', className: 'bg-amber-500/20 text-amber-500' },
      approved: { label: 'Aprobado', className: 'bg-emerald-500/20 text-emerald-500' },
      rejected: { label: 'Rechazado', className: 'bg-destructive/20 text-destructive' },
      scheduled: { label: 'Programado', className: 'bg-violet-500/20 text-violet-500' },
      published: { label: 'Publicado', className: 'bg-sky-500/20 text-sky-500' },
    }
    const config = statusConfig[status] || statusConfig.draft
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground">
            {selectedBrand === 'all' ? 'Resumen general de tu agencia' : `Resumen de ${currentBrandName}`}
          </p>
        </div>
        
        {/* Brand Filter */}
        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
          <SelectTrigger className="w-[220px] bg-input border-border text-foreground">
            <SelectValue placeholder="Filtrar por marca" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Todas las marcas
              </div>
            </SelectItem>
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                <div className="flex items-center gap-2">
                  {brand.logo_url ? (
                    <img src={brand.logo_url} alt="" className="w-4 h-4 rounded object-cover" />
                  ) : (
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  )}
                  {brand.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.name}</p>
                  <p className="text-3xl font-bold text-card-foreground mt-1">{stat.value}</p>
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                  )}
                </div>
                <div className={`p-3 rounded-lg bg-secondary ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Content */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">Contenido Reciente</CardTitle>
          <CardDescription className="text-muted-foreground">
            {selectedBrand === 'all' 
              ? 'Los ultimos copys generados por tus agentes AI'
              : `Contenido reciente de ${currentBrandName}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentContent.length > 0 ? (
            <div className="space-y-4">
              {recentContent.map((content) => (
                <div 
                  key={content.id} 
                  className="flex items-start justify-between p-4 rounded-lg bg-secondary/50 border border-border"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground truncate">
                        {content.title || 'Sin titulo'}
                      </p>
                      {getStatusBadge(content.status)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {content.body}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {selectedBrand === 'all' && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {content.brand?.name || 'Sin marca'}
                        </span>
                      )}
                      <span>{content.platform || content.content_type}</span>
                      <span>{new Date(content.created_at).toLocaleDateString('es-ES')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No hay contenido aun</p>
              <p className="text-sm text-muted-foreground">
                {selectedBrand === 'all' 
                  ? 'Comienza creando una marca y generando copys'
                  : `No hay contenido para ${currentBrandName}`
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
