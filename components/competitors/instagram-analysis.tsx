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
  Instagram,
  Heart,
  Eye,
  MessageCircle,
  Share2,
  TrendingUp,
  BarChart3,
  FileText,
  Loader2,
  Play,
  Image as ImageIcon,
  Grid3X3,
  Sparkles,
  Trophy,
  Hash,
  Calendar as CalendarIcon,
} from 'lucide-react'

interface Competitor {
  id: string
  name: string
  instagram_handle: string | null
  brand: { id: string; name: string } | null
}

interface TopPost {
  post_type: string
  caption: string
  likes: number
  views: number
  shares: number
  comments: number
  score: number
  posted_at: string | null
}

interface Analysis {
  id: string
  period_start: string
  period_end: string
  total_posts: number
  total_reels: number
  total_carousels: number
  total_images: number
  total_likes: number
  total_views: number
  total_comments: number
  total_shares: number
  avg_likes: number
  avg_views: number
  avg_engagement_rate: number
  top_posts: TopPost[] | null
  pattern_analysis: {
    posting_frequency?: string
    best_performing_content?: string
    content_themes?: string[]
    recommendations?: string
    avg_caption_length?: number
    best_performing_format?: string
    posting_distribution?: Record<string, number>
    top_hashtags?: { tag: string; count: number }[]
  } | null
  analyzed_at: string
}

interface Post {
  id: string
  post_type: string
  caption: string | null
  likes: number
  views: number
  comments: number
  shares: number
  posted_at: string | null
  hook_text: string | null
  cta_text: string | null
  ai_analysis: any
}

interface Props {
  competitor: Competitor
  analyses: Analysis[]
  posts: Post[]
}

export function InstagramAnalysis({ competitor, analyses, posts }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [csvData, setCsvData] = useState<string>('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [currentAnalysis, setCurrentAnalysis] = useState<Analysis | null>(analyses[0] || null)

  const latestAnalysis = analyses[0]

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
      const response = await fetch('/api/competitors/analyze-instagram', {
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

  const postTypeIcons = {
    reel: Play,
    carousel: Grid3X3,
    image: ImageIcon,
    video: Play,
    story: ImageIcon,
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
            <Instagram className="h-6 w-6 text-pink-500" />
            {competitor.name}
          </h1>
          <p className="text-muted-foreground">
            @{competitor.instagram_handle} - {competitor.brand?.name}
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="upload">Cargar Datos</TabsTrigger>
          <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {latestAnalysis ? (
            <>
              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-pink-500/20">
                        <Heart className="h-5 w-5 text-pink-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {latestAnalysis.total_likes.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Likes</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Promedio: {Math.round(latestAnalysis.avg_likes).toLocaleString()} por post
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <Eye className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {latestAnalysis.total_views.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Views</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Promedio: {Math.round(latestAnalysis.avg_views).toLocaleString()} por post
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/20">
                        <MessageCircle className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {latestAnalysis.total_comments.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">Comentarios</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent/20">
                        <TrendingUp className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {latestAnalysis.avg_engagement_rate.toFixed(2)}%
                        </p>
                        <p className="text-sm text-muted-foreground">Engagement Rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Content Breakdown */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Distribución de Contenido</CardTitle>
                    <CardDescription>
                      {latestAnalysis.period_start} - {latestAnalysis.period_end}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-pink-500" />
                        <span className="text-foreground">Reels</span>
                      </div>
                      <span className="font-medium text-foreground">{latestAnalysis.total_reels}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Grid3X3 className="h-4 w-4 text-blue-500" />
                        <span className="text-foreground">Carruseles</span>
                      </div>
                      <span className="font-medium text-foreground">{latestAnalysis.total_carousels}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-green-500" />
                        <span className="text-foreground">Imágenes</span>
                      </div>
                      <span className="font-medium text-foreground">{latestAnalysis.total_images}</span>
                    </div>
                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-foreground">Total Posts</span>
                        <span className="text-accent">{latestAnalysis.total_posts}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Posts by Score */}
                {latestAnalysis.top_posts && latestAnalysis.top_posts.length > 0 && (
                  <Card className="bg-card border-border md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-foreground flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        Top Posts (por Score)
                      </CardTitle>
                      <CardDescription>
                        Score = likes×1 + views×0.1 + shares×3
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {latestAnalysis.top_posts.slice(0, 5).map((post, i) => {
                          const TypeIcon = postTypeIcons[post.post_type as keyof typeof postTypeIcons] || FileText
                          return (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/20 text-accent font-bold text-sm">
                                {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <TypeIcon className="h-3 w-3" />
                                    {post.post_type}
                                  </Badge>
                                  <span className="text-sm font-medium text-accent">
                                    Score: {post.score.toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">{post.caption || 'Sin caption'}</p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Heart className="h-3 w-3 text-pink-500" />
                                    {post.likes.toLocaleString()}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Eye className="h-3 w-3 text-blue-500" />
                                    {post.views.toLocaleString()}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Share2 className="h-3 w-3 text-green-500" />
                                    {post.shares.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Insights Grid */}
                <div className="grid gap-4 md:grid-cols-2 md:col-span-2">
                  {/* Top Hashtags */}
                  {latestAnalysis.pattern_analysis?.top_hashtags && latestAnalysis.pattern_analysis.top_hashtags.length > 0 && (
                    <Card className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-foreground text-sm flex items-center gap-2">
                          <Hash className="h-4 w-4 text-blue-500" />
                          Top Hashtags
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1">
                          {latestAnalysis.pattern_analysis.top_hashtags.slice(0, 8).map((h, i) => (
                            <Badge key={i} variant="outline" className="text-xs border-border text-foreground">
                              {h.tag} ({h.count})
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Posting Distribution */}
                  {latestAnalysis.pattern_analysis?.posting_distribution && (
                    <Card className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-foreground text-sm flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-green-500" />
                          Distribución por Día
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          {Object.entries(latestAnalysis.pattern_analysis.posting_distribution).map(([day, count]) => (
                            <div key={day} className="flex items-center justify-between text-sm">
                              <span className="text-foreground capitalize">{day}</span>
                              <span className="text-muted-foreground">{count} posts</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* AI Pattern Analysis */}
                {latestAnalysis.pattern_analysis && (
                  <Card className="bg-card border-border md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-foreground flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-accent" />
                        Análisis de Patrones (IA)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      {latestAnalysis.pattern_analysis.best_performing_format && (
                        <div>
                          <p className="text-sm font-medium text-foreground">Mejor Formato</p>
                          <p className="text-sm text-muted-foreground capitalize">{latestAnalysis.pattern_analysis.best_performing_format}</p>
                        </div>
                      )}
                      {latestAnalysis.pattern_analysis.avg_caption_length && (
                        <div>
                          <p className="text-sm font-medium text-foreground">Longitud Promedio Caption</p>
                          <p className="text-sm text-muted-foreground">{latestAnalysis.pattern_analysis.avg_caption_length} caracteres</p>
                        </div>
                      )}
                      {latestAnalysis.pattern_analysis.posting_frequency && (
                        <div>
                          <p className="text-sm font-medium text-foreground">Frecuencia de Publicación</p>
                          <p className="text-sm text-muted-foreground">{latestAnalysis.pattern_analysis.posting_frequency}</p>
                        </div>
                      )}
                      {latestAnalysis.pattern_analysis.best_performing_content && (
                        <div>
                          <p className="text-sm font-medium text-foreground">Mejor Contenido</p>
                          <p className="text-sm text-muted-foreground">{latestAnalysis.pattern_analysis.best_performing_content}</p>
                        </div>
                      )}
                      {latestAnalysis.pattern_analysis.content_themes && (
                        <div className="md:col-span-2">
                          <p className="text-sm font-medium text-foreground mb-1">Temas Principales</p>
                          <div className="flex flex-wrap gap-1">
                            {latestAnalysis.pattern_analysis.content_themes.map((theme: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {theme}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {latestAnalysis.pattern_analysis.recommendations && (
                        <div className="md:col-span-2">
                          <p className="text-sm font-medium text-foreground">Recomendaciones</p>
                          <p className="text-sm text-muted-foreground">{latestAnalysis.pattern_analysis.recommendations}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Sin análisis aún</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Carga datos de Instagram para generar el primer análisis
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Cargar Datos de Instagram</CardTitle>
              <CardDescription>
                Sube un archivo CSV con los datos de los posts del competidor
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
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {csvData ? 'CSV cargado correctamente' : 'Click para subir CSV'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Formato: post_type, caption, likes, views, comments, shares, posted_at
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
                    Analizar Contenido
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts" className="space-y-4">
          {posts.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Sin posts registrados</h3>
                <p className="text-muted-foreground text-center">
                  Los posts aparecerán aquí después de cargar y analizar datos
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {posts.map(post => {
                const TypeIcon = postTypeIcons[post.post_type as keyof typeof postTypeIcons] || FileText
                return (
                  <Card key={post.id} className="bg-card border-border">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <TypeIcon className="h-3 w-3" />
                          {post.post_type}
                        </Badge>
                        {post.posted_at && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(post.posted_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {post.caption && (
                        <p className="text-sm text-foreground line-clamp-3">{post.caption}</p>
                      )}

                      <div className="grid grid-cols-4 gap-2 text-center text-sm">
                        <div>
                          <Heart className="h-4 w-4 mx-auto text-pink-500 mb-1" />
                          <span className="text-foreground font-medium">{post.likes.toLocaleString()}</span>
                        </div>
                        <div>
                          <Eye className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                          <span className="text-foreground font-medium">{post.views.toLocaleString()}</span>
                        </div>
                        <div>
                          <MessageCircle className="h-4 w-4 mx-auto text-green-500 mb-1" />
                          <span className="text-foreground font-medium">{post.comments.toLocaleString()}</span>
                        </div>
                        <div>
                          <Share2 className="h-4 w-4 mx-auto text-accent mb-1" />
                          <span className="text-foreground font-medium">{post.shares.toLocaleString()}</span>
                        </div>
                      </div>

                      {post.hook_text && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Hook: </span>
                          <span className="text-foreground">{post.hook_text}</span>
                        </div>
                      )}
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
                          {analysis.total_posts} posts analizados
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {new Date(analysis.analyzed_at).toLocaleDateString()}
                        </p>
                        <Badge variant="secondary">
                          {analysis.avg_engagement_rate.toFixed(2)}% ER
                        </Badge>
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
