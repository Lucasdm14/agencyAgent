'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Upload,
  TrendingUp,
  PlayCircle,
  PauseCircle,
  StopCircle,
  Plus,
  BarChart3,
  FileText,
  Loader2,
  Sparkles,
  Target,
  Megaphone,
  ExternalLink,
  RefreshCw,
  Clock,
} from 'lucide-react'

interface Competitor {
  id: string
  name: string
  facebook_page_id: string | null
  brand: { id: string; name: string } | null
}

interface Analysis {
  id: string
  period_start: string
  period_end: string
  total_new_ads: number
  total_active_ads: number
  total_paused_ads: number
  total_ended_ads: number
  creative_formats: Record<string, number> | null
  main_messages: string[] | null
  offer_patterns: string[] | null
  cta_patterns: Record<string, number> | null
  frequency_analysis: {
    avg_ad_duration_days?: number
    creative_rotation_rate?: string
    period_days?: number
    new_ads_in_period?: number
  } | null
  strategy_summary: string | null
  analyzed_at: string
}

interface Ad {
  id: string
  ad_library_id: string | null
  ad_url: string | null
  status: string
  creative_type: string | null
  headline: string | null
  body_text: string | null
  cta: string | null
  started_at: string | null
  last_seen_at: string | null
  platforms: string[] | null
  ai_analysis: any
}

interface Props {
  competitor: Competitor
  analyses: Analysis[]
  ads: Ad[]
}

export function MetaAdsAnalysis({ competitor, analyses, ads: initialAds }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [fetchingAds, setFetchingAds] = useState(false)
  const [csvData, setCsvData] = useState<string>('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [currentAnalysis, setCurrentAnalysis] = useState<Analysis | null>(analyses[0] || null)
  const [ads, setAds] = useState<Ad[]>(initialAds)
  const [fetchResult, setFetchResult] = useState<{
    message?: string
    summary?: { total_active: number; new_ads?: number; total?: number }
    analysis?: any
  } | null>(null)

  const latestAnalysis = analyses[0]

  // Auto fetch ads from Meta Ad Library
  async function handleFetchAds() {
    setFetchingAds(true)
    setFetchResult(null)
    
    try {
      // Use pageId if available, otherwise use name
      const searchQuery = competitor.facebook_page_id || competitor.name
      
      const response = await fetch('/api/competitors/meta-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitorId: competitor.id,
          pageName: competitor.name,
          pageId: competitor.facebook_page_id,
          searchTerm: searchQuery,
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setFetchResult({
          message: data.message || `${data.summary?.total_active || 0} anuncios encontrados`,
          summary: data.summary,
          analysis: data.analysis,
        })
        
        if (data.ads && data.ads.length > 0) {
          // Transform ads from database format to component format
          const transformedAds = data.ads.map((ad: any) => ({
            id: ad.id,
            ad_library_id: ad.ad_id,
            ad_url: ad.landing_url,
            creative_url: ad.creative_url,
            video_url: ad.video_url,
            status: ad.active ? 'active' : 'ended',
            creative_type: ad.ad_type,
            headline: ad.headline,
            body_text: ad.body_text,
            cta: ad.cta,
            started_at: ad.started_at,
            last_seen_at: ad.stopped_at,
            platforms: ad.platforms,
            page_name: ad.page_name,
            ai_analysis: ad.ai_analysis,
          }))
          setAds(transformedAds)
        }
        
        router.refresh()
      } else {
        setFetchResult({
          message: data.error || 'Error obteniendo ads',
        })
      }
    } catch (error: any) {
      setFetchResult({
        message: `Error: ${error?.message || 'Error al obtener anuncios'}`,
      })
    }
    
    setFetchingAds(false)
  }

  async function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    setCsvData(text)
  }

  async function handleAnalyze() {
    if (!csvData || !periodStart || !periodEnd) {
      alert('Por favor completa todos los campos y sube el CSV')
      return
    }

    setAnalyzing(true)
    try {
      const response = await fetch('/api/competitors/analyze-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitorId: competitor.id,
          csvData,
          periodStart,
          periodEnd,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        router.refresh()
        setCurrentAnalysis(data.analysis)
        setCsvData('')
      } else {
        const error = await response.json()
        alert(error.error || 'Error al analizar')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al procesar el análisis')
    }
    setAnalyzing(false)
  }

  const statusConfig = {
    active: { label: 'Activo', icon: PlayCircle, color: 'bg-success/20 text-success' },
    paused: { label: 'Pausado', icon: PauseCircle, color: 'bg-warning/20 text-warning' },
    ended: { label: 'Finalizado', icon: StopCircle, color: 'bg-muted text-muted-foreground' },
    new: { label: 'Nuevo', icon: Plus, color: 'bg-accent/20 text-accent' },
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/competitors')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-blue-500" />
            {competitor.name}
          </h1>
          <p className="text-muted-foreground">
            Meta Ad Library - {competitor.brand?.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleFetchAds}
            disabled={fetchingAds}
            variant="outline"
            size="sm"
          >
            {fetchingAds ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Buscando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Buscar Ads
              </>
            )}
          </Button>
          <a
            href={`https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${encodeURIComponent(competitor.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-accent hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Ver en Ad Library
          </a>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="upload">Cargar Datos</TabsTrigger>
          <TabsTrigger value="ads">Anuncios ({ads.length})</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Fetch Result Message */}
          {fetchResult && (
            <Card className={`border-border ${
              fetchResult.summary?.total_active 
                ? 'bg-success/10 border-success/30' 
                : fetchResult.message?.includes('Error') 
                  ? 'bg-destructive/10 border-destructive/30'
                  : 'bg-warning/10 border-warning/30'
            }`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${fetchResult.message?.includes('Error') ? 'text-destructive' : 'text-foreground'}`}>
                      {fetchResult.message || `${fetchResult.summary?.total_active || 0} anuncios encontrados`}
                    </p>
                    {fetchResult.summary && (
                      <p className="text-sm text-muted-foreground">
                        {fetchResult.summary.new_ads !== undefined && fetchResult.summary.new_ads > 0 && `${fetchResult.summary.new_ads} nuevos, `}
                        {fetchResult.summary.total_active} activos
                        {fetchResult.summary.total !== undefined && `, ${fetchResult.summary.total} total en BD`}
                      </p>
                    )}
                    {!fetchResult.summary && !fetchResult.message?.includes('Error') && (
                      <p className="text-sm text-muted-foreground">
                        El proceso de scraping puede tardar hasta 60 segundos
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setFetchResult(null)}>
                    Cerrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats from Current Ads */}
          {ads.length > 0 && !latestAnalysis && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/20">
                      <PlayCircle className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {ads.filter(a => a.status === 'active').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Ads Activos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/20">
                      <FileText className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{ads.length}</p>
                      <p className="text-sm text-muted-foreground">Total Registrados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-chart-2/20">
                      <TrendingUp className="h-5 w-5 text-chart-2" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {[...new Set(ads.map(a => a.creative_type).filter(Boolean))].length}
                      </p>
                      <p className="text-sm text-muted-foreground">Formatos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {latestAnalysis ? (
            <>
              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent/20">
                        <Plus className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {latestAnalysis.total_new_ads}
                        </p>
                        <p className="text-sm text-muted-foreground">Anuncios Nuevos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-success/20">
                        <PlayCircle className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {latestAnalysis.total_active_ads}
                        </p>
                        <p className="text-sm text-muted-foreground">Activos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-warning/20">
                        <PauseCircle className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {latestAnalysis.total_paused_ads}
                        </p>
                        <p className="text-sm text-muted-foreground">Pausados</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <StopCircle className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {latestAnalysis.total_ended_ads}
                        </p>
                        <p className="text-sm text-muted-foreground">Finalizados</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Rotation Metrics */}
              {latestAnalysis.frequency_analysis && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="bg-card border-border">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-chart-2/20">
                          <Clock className="h-5 w-5 text-chart-2" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">
                            {latestAnalysis.frequency_analysis.avg_ad_duration_days || 0} días
                          </p>
                          <p className="text-sm text-muted-foreground">Duración Promedio de Ads</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Tiempo promedio que un anuncio permanece activo
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-chart-3/20">
                          <RefreshCw className="h-5 w-5 text-chart-3" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">
                            {latestAnalysis.frequency_analysis.creative_rotation_rate || '0'}/día
                          </p>
                          <p className="text-sm text-muted-foreground">Rotación Creativa</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Ads nuevos por día en el período analizado ({latestAnalysis.frequency_analysis.period_days} días)
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Analysis Cards */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Creative Formats */}
                {latestAnalysis.creative_formats && (
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-foreground">Formatos Creativos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(latestAnalysis.creative_formats).map(([format, count]) => (
                          <div key={format} className="flex items-center justify-between">
                            <span className="text-foreground capitalize">{format}</span>
                            <Badge variant="secondary">{count as number}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* CTA Patterns */}
                {latestAnalysis.cta_patterns && (
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-foreground">CTAs Más Usados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(latestAnalysis.cta_patterns).map(([cta, count]) => (
                          <Badge key={cta} variant="outline" className="text-foreground border-border">
                            {cta} ({count as number})
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Main Messages */}
                {latestAnalysis.main_messages && (
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-foreground">Mensajes Principales</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {(latestAnalysis.main_messages as string[]).slice(0, 5).map((msg, i) => (
                          <li key={i} className="text-sm text-muted-foreground">
                            • {msg}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Strategy Summary */}
                {latestAnalysis.strategy_summary && (
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-foreground flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-accent" />
                        Resumen Estratégico (IA)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {latestAnalysis.strategy_summary}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : ads.length === 0 && (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Sin datos de ads</h3>
                <p className="text-muted-foreground text-center mb-4 max-w-md">
                  Haz clic en "Buscar Ads" para obtener anuncios automaticamente, 
                  o sube un CSV desde la pestana "Cargar Datos" para un analisis mas detallado.
                </p>
                <div className="flex gap-3">
                  <Button onClick={handleFetchAds} disabled={fetchingAds}>
                    {fetchingAds ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Buscar Ads
                  </Button>
                  <a
                    href={`https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${encodeURIComponent(competitor.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver Ad Library
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Cargar Datos de Meta Ad Library</CardTitle>
              <CardDescription>
                Sube un archivo CSV con los datos exportados del Meta Ad Library
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Período de inicio</Label>
                  <Input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Período de fin</Label>
                  <Input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="bg-input border-border text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Archivo CSV</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                    id="ads-csv-upload"
                  />
                  <label htmlFor="ads-csv-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {csvData ? 'CSV cargado correctamente' : 'Click para subir CSV'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Formato: ad_id, status, creative_type, headline, body, cta, started_at
                    </p>
                  </label>
                </div>
              </div>

              {csvData && (
                <Badge className="bg-success/20 text-success">
                  CSV cargado - Listo para analizar
                </Badge>
              )}

              <Button
                onClick={handleAnalyze}
                disabled={analyzing || !csvData || !periodStart || !periodEnd}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Analizando con IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analizar Anuncios
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ads Tab */}
        <TabsContent value="ads" className="space-y-4">
          {ads.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Sin anuncios registrados</h3>
                <p className="text-muted-foreground text-center">
                  Los anuncios aparecerán aquí después de cargar y analizar datos
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {ads.map(ad => {
                const status = statusConfig[ad.status as keyof typeof statusConfig] || statusConfig.active
                const StatusIcon = status.icon
                return (
                  <Card key={ad.id} className="bg-card border-border">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className={status.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                            {ad.creative_type && (
                              <Badge variant="secondary">{ad.creative_type}</Badge>
                            )}
                            {ad.platforms && ad.platforms.map(p => (
                              <Badge key={p} variant="outline" className="text-xs border-border text-muted-foreground">
                                {p}
                              </Badge>
                            ))}
                          </div>

                          {ad.headline && (
                            <p className="font-medium text-foreground">{ad.headline}</p>
                          )}

                          {ad.body_text && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{ad.body_text}</p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {ad.cta && (
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                CTA: {ad.cta}
                              </span>
                            )}
                            {ad.started_at && (
                              <span>Inicio: {new Date(ad.started_at).toLocaleDateString()}</span>
                            )}
                            {ad.last_seen_at && (
                              <span>Último: {new Date(ad.last_seen_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        {ad.ad_url && (
                          <a
                            href={ad.ad_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-secondary rounded-md"
                          >
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {analyses.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Sin historial</h3>
                <p className="text-muted-foreground text-center">
                  Los análisis anteriores aparecerán aquí
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {analyses.map(analysis => (
                <Card 
                  key={analysis.id} 
                  className={`bg-card border-border cursor-pointer transition-colors hover:border-accent/50 ${
                    currentAnalysis?.id === analysis.id ? 'border-accent' : ''
                  }`}
                  onClick={() => setCurrentAnalysis(analysis)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          {analysis.period_start} - {analysis.period_end}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {analysis.total_active_ads} activos, {analysis.total_new_ads} nuevos
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {new Date(analysis.analyzed_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
