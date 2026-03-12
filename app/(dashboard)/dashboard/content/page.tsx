'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  FileText, Filter, Trash2, Calendar, Eye, Copy, 
  Instagram, Facebook, Twitter, Linkedin, Mail, Megaphone,
  Check, X, Clock, Send, TrendingUp, BarChart3, Sparkles,
  ChevronRight, ExternalLink
} from 'lucide-react'
import Link from 'next/link'

interface Brand {
  id: string
  name: string
  logo_url: string | null
}

interface Content {
  id: string
  title: string | null
  body: string
  content_type: string
  platform: string | null
  status: string
  scheduled_date: string | null
  supervisor_score: number | null
  supervisor_feedback: string | null
  created_at: string
  brand_id: string
}

interface Strategy {
  id: string
  name: string
  platform: string
  days_count: number
  strategy_data: any
  created_at: string
  brand_id: string
}

interface MetricsReport {
  id: string
  competitor_id: string
  analyzed_at: string
  total_posts: number
  avg_likes: number
  avg_views: number
  avg_engagement_rate: number
  competitor?: {
    name: string
    platform: string
  }
}

const platformIcons: Record<string, React.ElementType> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  email: Mail,
  tiktok: Megaphone,
  google_ads: Megaphone,
  meta_ads: Megaphone,
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground', icon: FileText },
  pending_review: { label: 'Pendiente', color: 'bg-warning/20 text-warning', icon: Clock },
  approved: { label: 'Aprobado', color: 'bg-success/20 text-success', icon: Check },
  rejected: { label: 'Rechazado', color: 'bg-destructive/20 text-destructive', icon: X },
  scheduled: { label: 'Programado', color: 'bg-accent/20 text-accent', icon: Calendar },
  published: { label: 'Publicado', color: 'bg-success/20 text-success', icon: Send },
}

const contentTypeConfig: Record<string, { label: string; color: string }> = {
  social: { label: 'Redes Sociales', color: 'bg-chart-2/20 text-chart-2' },
  ads: { label: 'Publicidad', color: 'bg-chart-3/20 text-chart-3' },
  email: { label: 'Email Marketing', color: 'bg-chart-4/20 text-chart-4' },
  other: { label: 'Otro', color: 'bg-muted text-muted-foreground' },
}

export default function ContentHistoryPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'copies' | 'strategies' | 'metrics'>('copies')
  
  // Content (copies) state
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterContentType, setFilterContentType] = useState<string>('')
  const [filterPlatform, setFilterPlatform] = useState<string>('')
  
  // Strategies state
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loadingStrategies, setLoadingStrategies] = useState(false)
  
  // Metrics reports state
  const [metricsReports, setMetricsReports] = useState<MetricsReport[]>([])
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    async function loadBrands() {
      const { data } = await supabase
        .from('brands')
        .select('id, name, logo_url')
        .order('name')
      
      if (data && data.length > 0) {
        setBrands(data)
        setSelectedBrand(data[0].id)
      }
      setLoading(false)
    }
    loadBrands()
  }, [])

  useEffect(() => {
    if (!selectedBrand) return

    async function loadContents() {
      setLoading(true)
      let query = supabase
        .from('content')
        .select('*')
        .eq('brand_id', selectedBrand)
        .order('created_at', { ascending: false })
      
      if (filterStatus) {
        query = query.eq('status', filterStatus)
      }
      
      if (filterContentType) {
        query = query.eq('content_type', filterContentType)
      }
      
      if (filterPlatform) {
        query = query.eq('platform', filterPlatform)
      }

      const { data } = await query
      setContents(data || [])
      setLoading(false)
    }
    loadContents()
  }, [selectedBrand, filterStatus, filterContentType, filterPlatform])

  // Load strategies when brand changes
  useEffect(() => {
    if (!selectedBrand) return

    async function loadStrategies() {
      setLoadingStrategies(true)
      const { data } = await supabase
        .from('content_strategies')
        .select('*')
        .eq('brand_id', selectedBrand)
        .order('created_at', { ascending: false })

      setStrategies(data || [])
      setLoadingStrategies(false)
    }
    loadStrategies()
  }, [selectedBrand])

  // Load metrics reports when brand changes
  useEffect(() => {
    if (!selectedBrand) return

    async function loadMetrics() {
      setLoadingMetrics(true)
      
      // Get competitors for this brand
      const { data: competitors } = await supabase
        .from('competitors')
        .select('id, name, platform')
        .eq('brand_id', selectedBrand)

      if (competitors && competitors.length > 0) {
        const competitorIds = competitors.map(c => c.id)
        
        const { data: analyses } = await supabase
          .from('competitor_instagram_analysis')
          .select('id, competitor_id, analyzed_at, total_posts, avg_likes, avg_views, avg_engagement_rate')
          .in('competitor_id', competitorIds)
          .order('analyzed_at', { ascending: false })
          .limit(20)

        const reportsWithCompetitors = (analyses || []).map(a => ({
          ...a,
          competitor: competitors.find(c => c.id === a.competitor_id)
        }))
        
        setMetricsReports(reportsWithCompetitors)
      } else {
        setMetricsReports([])
      }
      
      setLoadingMetrics(false)
    }
    loadMetrics()
  }, [selectedBrand])

  async function handleDeleteContent(id: string) {
    if (!confirm('Estas seguro de eliminar este contenido?')) return

    const { error } = await supabase
      .from('content')
      .delete()
      .eq('id', id)

    if (!error) {
      setContents(contents.filter(c => c.id !== id))
    }
  }

  async function handleDeleteStrategy(id: string) {
    if (!confirm('Estas seguro de eliminar esta estrategia?')) return

    const { error } = await supabase
      .from('content_strategies')
      .delete()
      .eq('id', id)

    if (!error) {
      setStrategies(strategies.filter(s => s.id !== id))
    }
  }

  const selectedBrandData = brands.find(b => b.id === selectedBrand)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Historial</h1>
          <p className="text-muted-foreground">
            Copys generados, estrategias guardadas e informes de metricas
          </p>
        </div>
        <Link href="/dashboard/generate">
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Sparkles className="h-4 w-4 mr-2" />
            Nueva Estrategia
          </Button>
        </Link>
      </div>

      {/* Brand Selector */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-muted-foreground">Marca:</span>
        <div className="flex flex-wrap gap-2">
          {brands.map((brand) => (
            <button
              key={brand.id}
              onClick={() => setSelectedBrand(brand.id)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                selectedBrand === brand.id
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'bg-card border-border text-foreground hover:bg-secondary'
              }`}
            >
              {brand.name}
            </button>
          ))}
        </div>
      </div>

      {selectedBrandData && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <TabsList className="bg-secondary">
            <TabsTrigger value="copies" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <FileText className="h-4 w-4 mr-2" />
              Copys ({contents.length})
            </TabsTrigger>
            <TabsTrigger value="strategies" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <TrendingUp className="h-4 w-4 mr-2" />
              Estrategias ({strategies.length})
            </TabsTrigger>
            <TabsTrigger value="metrics" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <BarChart3 className="h-4 w-4 mr-2" />
              Metricas ({metricsReports.length})
            </TabsTrigger>
          </TabsList>

          {/* COPIES TAB */}
          <TabsContent value="copies">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-card-foreground">Copys Generados</CardTitle>
                  <CardDescription>Contenido creado para {selectedBrandData.name}</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={filterPlatform}
                    onChange={(e) => setFilterPlatform(e.target.value)}
                    className="h-8 px-2 rounded-md bg-input border border-border text-foreground text-xs"
                  >
                    <option value="">Todas las redes</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="twitter">Twitter/X</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-8 px-2 rounded-md bg-input border border-border text-foreground text-xs"
                  >
                    <option value="">Todos los estados</option>
                    {Object.entries(statusConfig).map(([value, config]) => (
                      <option key={value} value={value}>{config.label}</option>
                    ))}
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                  </div>
                ) : contents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground mb-4">No hay copys guardados</p>
                    <Link href="/dashboard/generate">
                      <Button variant="outline" size="sm">Generar Copys</Button>
                    </Link>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {contents.map((content) => {
                        const status = statusConfig[content.status] || statusConfig.draft
                        const StatusIcon = status.icon
                        const PlatformIcon = content.platform ? platformIcons[content.platform] || Megaphone : null

                        return (
                          <div
                            key={content.id}
                            className="p-4 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <Badge className={status.color}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {status.label}
                            </Badge>
                            {PlatformIcon && (
                              <Badge variant="outline" className="border-border text-muted-foreground">
                                <PlatformIcon className="h-3 w-3 mr-1" />
                                {content.platform}
                              </Badge>
                            )}
                            {content.supervisor_score && (
                              <Badge variant="outline" className="border-accent text-accent">
                                Score: {content.supervisor_score}/10
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {content.body}
                          </p>

                          {content.supervisor_feedback && (
                            <p className="text-xs text-muted-foreground/70 italic mb-2">
                              Feedback: {content.supervisor_feedback}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              {new Date(content.created_at).toLocaleDateString('es-AR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {content.scheduled_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Programado: {new Date(content.scheduled_date).toLocaleDateString('es-AR')}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              navigator.clipboard.writeText(content.body)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteContent(content.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* STRATEGIES TAB */}
          <TabsContent value="strategies">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground">Estrategias Guardadas</CardTitle>
                <CardDescription>Estrategias de contenido para {selectedBrandData.name}</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStrategies ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                  </div>
                ) : strategies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <TrendingUp className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground mb-4">No hay estrategias guardadas</p>
                    <Link href="/dashboard/generate">
                      <Button variant="outline" size="sm">Crear Estrategia</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {strategies.map((strategy) => (
                      <Card key={strategy.id} className="bg-secondary/30 border-border">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-medium text-foreground">{strategy.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs capitalize">
                                  {strategy.platform}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {strategy.days_count} dias
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteStrategy(strategy.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Pillars preview */}
                          {strategy.strategy_data?.strategy_overview?.content_pillars && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {strategy.strategy_data.strategy_overview.content_pillars.slice(0, 3).map((pillar: any, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {pillar.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {new Date(strategy.created_at).toLocaleDateString('es-AR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                            <Link href={`/dashboard/generate?strategy=${strategy.id}`}>
                              <Button variant="ghost" size="sm" className="h-7 text-xs">
                                Abrir <ChevronRight className="h-3 w-3 ml-1" />
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* METRICS TAB */}
          <TabsContent value="metrics">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground">Informes de Metricas</CardTitle>
                <CardDescription>Analisis de competidores para {selectedBrandData.name}</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingMetrics ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                  </div>
                ) : metricsReports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground mb-4">No hay informes de metricas</p>
                    <Link href="/dashboard/competitors">
                      <Button variant="outline" size="sm">Analizar Competidores</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {metricsReports.map((report) => (
                      <div
                        key={report.id}
                        className="p-4 rounded-lg bg-secondary/30 border border-border"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-foreground">
                              {report.competitor?.name || 'Competidor'}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <Badge variant="secondary" className="text-xs capitalize">
                                {report.competitor?.platform || 'instagram'}
                              </Badge>
                              <span>{report.total_posts} posts analizados</span>
                              <span>{report.avg_engagement_rate?.toFixed(2)}% engagement</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-foreground">
                              {report.avg_likes?.toLocaleString()} likes prom.
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(report.analyzed_at).toLocaleDateString('es-AR', {
                                day: 'numeric',
                                month: 'short'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
