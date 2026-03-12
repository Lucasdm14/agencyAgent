'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  BarChart3, TrendingUp, Eye, MousePointer, 
  Heart, Upload, FileSpreadsheet, Loader2,
  ArrowUpRight, ArrowDownRight, Sparkles, Lightbulb,
  Target, AlertTriangle, CheckCircle, RefreshCw
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Metric, UploadedReport } from '@/lib/types'

interface MetricsDashboardProps {
  brands: { id: string; name: string }[]
  metrics: (Metric & { brand: { name: string } | null })[]
  reports: (UploadedReport & { brand: { name: string } | null; uploader: { full_name: string } | null })[]
}

export function MetricsDashboard({ brands, metrics, reports }: MetricsDashboardProps) {
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [manualDialogOpen, setManualDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState<string | null>(null) // reportId being analyzed
  const [selectedReport, setSelectedReport] = useState<(typeof reports)[0] | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadBrand, setUploadBrand] = useState('')
  const [manualData, setManualData] = useState({
    brand_id: '',
    platform: '',
    date: new Date().toISOString().split('T')[0],
    impressions: 0,
    reach: 0,
    engagement: 0,
    clicks: 0,
    conversions: 0,
    spend: 0,
  })
  
  const router = useRouter()
  const supabase = createClient()

  const filteredMetrics = selectedBrand === 'all'
    ? metrics
    : metrics.filter(m => m.brand_id === selectedBrand)

  // Calculate totals
  const totals = filteredMetrics.reduce((acc, m) => ({
    impressions: acc.impressions + m.impressions,
    reach: acc.reach + m.reach,
    engagement: acc.engagement + m.engagement,
    clicks: acc.clicks + m.clicks,
    conversions: acc.conversions + m.conversions,
    spend: acc.spend + m.spend,
  }), { impressions: 0, reach: 0, engagement: 0, clicks: 0, conversions: 0, spend: 0 })

  const engagementRate = totals.impressions > 0 
    ? ((totals.engagement / totals.impressions) * 100).toFixed(2)
    : '0'

  const ctr = totals.impressions > 0
    ? ((totals.clicks / totals.impressions) * 100).toFixed(2)
    : '0'

  async function handleFileUpload() {
    if (!uploadFile || !uploadBrand) return
    setUploading(true)

    const formData = new FormData()
    formData.append('file', uploadFile)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const { url } = await response.json()
        
        const { data: { user } } = await supabase.auth.getUser()
        
        const { data: insertedReport } = await supabase
          .from('uploaded_reports')
          .insert({
            brand_id: uploadBrand,
            file_url: url,
            file_name: uploadFile.name,
            file_type: uploadFile.type,
            uploaded_by: user?.id,
          })
          .select()
          .single()

        setUploadDialogOpen(false)
        setUploadFile(null)
        setUploadBrand('')
        router.refresh()
        
        // Automatically analyze the uploaded report
        if (insertedReport) {
          analyzeReport(insertedReport.id, url)
        }
      }
    } catch (error) {
      console.error('Upload error:', error)
    }

    setUploading(false)
  }
  
  async function analyzeReport(reportId: string, fileUrl: string) {
    setAnalyzing(reportId)
    try {
      const response = await fetch('/api/metrics/analyze-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, fileUrl }),
      })
      
      if (response.ok) {
        router.refresh()
      } else {
        const error = await response.json()
        console.error('Analysis error:', error)
      }
    } catch (error) {
      console.error('Analysis error:', error)
    }
    setAnalyzing(null)
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    setUploading(true)

    await supabase
      .from('metrics')
      .insert({
        ...manualData,
        source: 'manual',
      })

    setManualDialogOpen(false)
    setManualData({
      brand_id: '',
      platform: '',
      date: new Date().toISOString().split('T')[0],
      impressions: 0,
      reach: 0,
      engagement: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
    })
    router.refresh()
    setUploading(false)
  }

  // Component to display AI analysis results
  function ReportAnalysisDisplay({ analysis }: { analysis: any }) {
    return (
      <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
        {/* Summary */}
        {analysis.summary && (
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
            <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              Resumen del Analisis
            </h4>
            <p className="text-sm text-muted-foreground">{analysis.summary}</p>
          </div>
        )}

        {/* Key Metrics */}
        {analysis.key_metrics && (
          <div>
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Metricas Clave
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(analysis.key_metrics).map(([key, value]) => (
                <div key={key} className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                  <p className="text-lg font-semibold text-foreground">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance */}
        {analysis.performance && (
          <div className="p-4 rounded-lg bg-secondary/50">
            <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Rendimiento
            </h4>
            <p className="text-sm text-muted-foreground">{analysis.performance}</p>
          </div>
        )}

        {/* Strengths */}
        {analysis.strengths && analysis.strengths.length > 0 && (
          <div>
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Fortalezas
            </h4>
            <ul className="space-y-2">
              {analysis.strengths.map((strength: string, i: number) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-green-500 mt-1">+</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {analysis.weaknesses && analysis.weaknesses.length > 0 && (
          <div>
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Areas de Mejora
            </h4>
            <ul className="space-y-2">
              {analysis.weaknesses.map((weakness: string, i: number) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-yellow-500 mt-1">!</span>
                  {weakness}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations && analysis.recommendations.length > 0 && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-green-500" />
              Recomendaciones
            </h4>
            <div className="space-y-3">
              {analysis.recommendations.map((rec: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    rec.priority === 'alta' ? 'bg-red-500/20 text-red-400' : 
                    rec.priority === 'media' ? 'bg-yellow-500/20 text-yellow-400' : 
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{rec.title || rec}</p>
                    {rec.description && (
                      <p className="text-xs text-muted-foreground">{rec.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Items */}
        {analysis.action_items && analysis.action_items.length > 0 && (
          <div>
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-accent" />
              Proximos Pasos
            </h4>
            <ul className="space-y-2">
              {analysis.action_items.map((item: string, i: number) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 p-2 rounded bg-secondary/50">
                  <span className="text-accent font-medium">{i + 1}.</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Trends */}
        {analysis.trends && analysis.trends.length > 0 && (
          <div>
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-500" />
              Tendencias Detectadas
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysis.trends.map((trend: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {trend}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    suffix = '' 
  }: { 
    title: string
    value: string | number
    icon: React.ElementType
    trend?: number
    suffix?: string
  }) => (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
            </p>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 mt-1 text-sm ${
                trend >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                {trend >= 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-lg bg-secondary">
            <Icon className="h-5 w-5 text-accent" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="w-48 bg-input border-border">
                <SelectValue placeholder="Todas las marcas" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">Todas las marcas</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-border text-foreground">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Agregar metricas
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Agregar metricas manualmente</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Ingresa los datos de rendimiento de tu contenido
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleManualSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground">Marca</Label>
                        <Select 
                          value={manualData.brand_id}
                          onValueChange={(v) => setManualData(p => ({ ...p, brand_id: v }))}
                        >
                          <SelectTrigger className="bg-input border-border">
                            <SelectValue placeholder="Selecciona marca" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            {brands.map((brand) => (
                              <SelectItem key={brand.id} value={brand.id}>
                                {brand.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Plataforma</Label>
                        <Select 
                          value={manualData.platform}
                          onValueChange={(v) => setManualData(p => ({ ...p, platform: v }))}
                        >
                          <SelectTrigger className="bg-input border-border">
                            <SelectValue placeholder="Selecciona" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="facebook">Facebook</SelectItem>
                            <SelectItem value="twitter">Twitter/X</SelectItem>
                            <SelectItem value="linkedin">LinkedIn</SelectItem>
                            <SelectItem value="tiktok">TikTok</SelectItem>
                            <SelectItem value="google_ads">Google Ads</SelectItem>
                            <SelectItem value="meta_ads">Meta Ads</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Fecha</Label>
                      <Input
                        type="date"
                        value={manualData.date}
                        onChange={(e) => setManualData(p => ({ ...p, date: e.target.value }))}
                        className="bg-input border-border text-foreground"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground">Impresiones</Label>
                        <Input
                          type="number"
                          value={manualData.impressions}
                          onChange={(e) => setManualData(p => ({ ...p, impressions: parseInt(e.target.value) || 0 }))}
                          className="bg-input border-border text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Alcance</Label>
                        <Input
                          type="number"
                          value={manualData.reach}
                          onChange={(e) => setManualData(p => ({ ...p, reach: parseInt(e.target.value) || 0 }))}
                          className="bg-input border-border text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Engagement</Label>
                        <Input
                          type="number"
                          value={manualData.engagement}
                          onChange={(e) => setManualData(p => ({ ...p, engagement: parseInt(e.target.value) || 0 }))}
                          className="bg-input border-border text-foreground"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground">Clicks</Label>
                        <Input
                          type="number"
                          value={manualData.clicks}
                          onChange={(e) => setManualData(p => ({ ...p, clicks: parseInt(e.target.value) || 0 }))}
                          className="bg-input border-border text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Conversiones</Label>
                        <Input
                          type="number"
                          value={manualData.conversions}
                          onChange={(e) => setManualData(p => ({ ...p, conversions: parseInt(e.target.value) || 0 }))}
                          className="bg-input border-border text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Gasto ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={manualData.spend}
                          onChange={(e) => setManualData(p => ({ ...p, spend: parseFloat(e.target.value) || 0 }))}
                          className="bg-input border-border text-foreground"
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-accent text-accent-foreground"
                      disabled={uploading || !manualData.brand_id || !manualData.platform}
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Guardar metricas
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Upload className="h-4 w-4 mr-2" />
                    Subir reporte
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Subir reporte de metricas</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Sube un archivo CSV o Excel con tus metricas
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Marca</Label>
                      <Select value={uploadBrand} onValueChange={setUploadBrand}>
                        <SelectTrigger className="bg-input border-border">
                          <SelectValue placeholder="Selecciona marca" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Archivo</Label>
                      <div className="border-2 border-dashed border-border rounded-lg p-6">
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id="report-upload"
                        />
                        <label
                          htmlFor="report-upload"
                          className="flex flex-col items-center cursor-pointer"
                        >
                          <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            {uploadFile ? uploadFile.name : 'Click para seleccionar archivo'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            CSV, Excel (.xlsx, .xls)
                          </p>
                        </label>
                      </div>
                    </div>
                    <Button 
                      onClick={handleFileUpload}
                      className="w-full bg-accent text-accent-foreground"
                      disabled={uploading || !uploadFile || !uploadBrand}
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Subir reporte
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Impresiones" value={totals.impressions} icon={Eye} />
        <StatCard title="Alcance" value={totals.reach} icon={TrendingUp} />
        <StatCard title="Engagement" value={totals.engagement} icon={Heart} />
        <StatCard title="Clicks" value={totals.clicks} icon={MousePointer} />
        <StatCard title="Tasa Engagement" value={engagementRate} icon={Heart} suffix="%" />
        <StatCard title="CTR" value={ctr} icon={MousePointer} suffix="%" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="metrics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Metricas
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Reportes subidos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground">Historial de metricas</CardTitle>
              <CardDescription className="text-muted-foreground">
                Datos de rendimiento por plataforma y fecha
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredMetrics.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">Fecha</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">Marca</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">Plataforma</th>
                        <th className="text-right py-3 px-2 text-muted-foreground font-medium">Impresiones</th>
                        <th className="text-right py-3 px-2 text-muted-foreground font-medium">Alcance</th>
                        <th className="text-right py-3 px-2 text-muted-foreground font-medium">Engagement</th>
                        <th className="text-right py-3 px-2 text-muted-foreground font-medium">Clicks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMetrics.map((metric) => (
                        <tr key={metric.id} className="border-b border-border hover:bg-secondary/50">
                          <td className="py-3 px-2 text-foreground">
                            {new Date(metric.date).toLocaleDateString('es-ES')}
                          </td>
                          <td className="py-3 px-2 text-foreground">{metric.brand?.name}</td>
                          <td className="py-3 px-2 text-foreground capitalize">{metric.platform}</td>
                          <td className="py-3 px-2 text-foreground text-right">
                            {metric.impressions.toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-foreground text-right">
                            {metric.reach.toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-foreground text-right">
                            {metric.engagement.toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-foreground text-right">
                            {metric.clicks.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">No hay metricas registradas</p>
                  <p className="text-sm text-muted-foreground">Sube un reporte o agrega metricas manualmente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Reports List */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground">Reportes subidos</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Archivos de metricas cargados al sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reports.length > 0 ? (
                  <div className="space-y-3">
                    {reports.map((report) => (
                      <div 
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedReport?.id === report.id 
                            ? 'bg-accent/10 border-accent' 
                            : 'bg-secondary/50 border-border hover:border-accent/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-accent/20">
                            <FileSpreadsheet className="h-5 w-5 text-accent" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{report.file_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {report.brand?.name} - Subido por {report.uploader?.full_name}
                            </p>
                            {(report as any).analysis && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Analizado
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <p className="text-sm text-muted-foreground">
                            {new Date(report.created_at).toLocaleDateString('es-ES')}
                          </p>
                          <div className="flex items-center gap-2">
                            {analyzing === report.id ? (
                              <span className="text-xs text-accent flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Analizando...
                              </span>
                            ) : !(report as any).analysis ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  analyzeReport(report.id, report.file_url)
                                }}
                              >
                                <Sparkles className="h-3 w-3 mr-1" />
                                Analizar
                              </Button>
                            ) : null}
                            <a
                              href={report.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-accent hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Descargar
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No hay reportes subidos</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analysis Panel */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  Analisis de IA
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {selectedReport 
                    ? `Analisis de ${selectedReport.file_name}`
                    : 'Selecciona un reporte para ver el analisis'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedReport ? (
                  (selectedReport as any).analysis ? (
                    <ReportAnalysisDisplay analysis={(selectedReport as any).analysis} />
                  ) : (
                    <div className="text-center py-12">
                      <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground mb-4">Este reporte aun no ha sido analizado</p>
                      <Button
                        onClick={() => analyzeReport(selectedReport.id, selectedReport.file_url)}
                        disabled={analyzing === selectedReport.id}
                      >
                        {analyzing === selectedReport.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        Analizar con IA
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">Selecciona un reporte de la lista</p>
                    <p className="text-sm text-muted-foreground">para ver el analisis con recomendaciones de IA</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
