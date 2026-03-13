'use client'

import { useState, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  Instagram,
  Users,
  Heart,
  MessageCircle,
  Eye,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  FileText,
  Download,
  Loader2,
  Sparkles,
  Target,
  Lightbulb,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
  Calendar,
  ExternalLink,
  Play,
  Share2,
  Filter,
  Grid3X3,
  Megaphone,
  DollarSign,
  FileSpreadsheet,
  Video,
  Link,
} from 'lucide-react'

// Post thumbnail component - only shows real images, no fakes
function PostThumbnail({ 
  src, 
  alt, 
  type 
}: { 
  src: string | null | undefined
  alt: string
  type: string
}) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  // No real image available
  if (!src || error) {
    return (
      <div className="aspect-square bg-gradient-to-br from-secondary to-secondary/50 flex flex-col items-center justify-center gap-2">
        {type === 'video' ? (
          <Play className="h-10 w-10 text-muted-foreground" />
        ) : type === 'carousel' ? (
          <Grid3X3 className="h-10 w-10 text-muted-foreground" />
        ) : (
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
        )}
        <span className="text-xs text-muted-foreground">
          {error ? 'Imagen no disponible' : 'Sin imagen'}
        </span>
      </div>
    )
  }
  
  // Use proxy for external social media URLs
  const needsProxy = src.includes('instagram') || 
    src.includes('cdninstagram') || 
    src.includes('fbcdn') ||
    src.includes('tiktok') ||
    src.includes('twimg')
  
  const imageUrl = needsProxy ? `/api/proxy-image?url=${encodeURIComponent(src)}` : src

  return (
    <div className="relative aspect-square bg-secondary overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary animate-pulse">
          <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
        </div>
      )}
      <img 
        src={imageUrl}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true)
          setLoading(false)
        }}
      />
      {type === 'video' && !loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Play className="h-12 w-12 text-white" />
        </div>
      )}
      {type === 'carousel' && !loading && !error && (
        <div className="absolute top-2 right-2">
          <Grid3X3 className="h-5 w-5 text-white drop-shadow" />
        </div>
      )}
    </div>
  )
}

// Report summary display component - parses JSON and shows formatted content
function ReportSummaryDisplay({ summary }: { summary: string }) {
  // Try to parse JSON from the summary
  let parsedData: any = null
  
  try {
    // Check if it starts with ```json or just {
    let jsonStr = summary.trim()
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    if (jsonStr.startsWith('{') || jsonStr.startsWith('[')) {
      parsedData = JSON.parse(jsonStr)
    }
  } catch {
    // Not valid JSON, show as plain text
  }
  
  // If we couldn't parse it, show as plain text
  if (!parsedData) {
    return <p className="text-sm text-muted-foreground whitespace-pre-wrap">{summary}</p>
  }
  
  return (
    <div className="space-y-4">
      {/* Executive Summary */}
      {parsedData.executive_summary && (
        <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
          <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            Resumen Ejecutivo
          </h4>
          <p className="text-sm text-muted-foreground">{parsedData.executive_summary}</p>
        </div>
      )}
      
      {/* Performance Analysis */}
      {parsedData.performance_analysis && (
        <div className="p-4 rounded-lg bg-secondary/50">
          <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            Analisis de Rendimiento
          </h4>
          <p className="text-sm text-muted-foreground">{parsedData.performance_analysis}</p>
        </div>
      )}
      
      {/* Content Analysis */}
      {parsedData.content_analysis && (
        <div className="p-4 rounded-lg bg-secondary/50">
          <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-green-500" />
            Analisis de Contenido
          </h4>
          <p className="text-sm text-muted-foreground">{parsedData.content_analysis}</p>
        </div>
      )}
      
      {/* Audience Analysis */}
      {parsedData.audience_analysis && (
        <div className="p-4 rounded-lg bg-secondary/50">
          <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-500" />
            Analisis de Audiencia
          </h4>
          <p className="text-sm text-muted-foreground">{parsedData.audience_analysis}</p>
        </div>
      )}
      
      {/* Competitive Position */}
      {parsedData.competitive_position && (
        <div className="p-4 rounded-lg bg-secondary/50">
          <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
            <Target className="h-4 w-4 text-orange-500" />
            Posicion Competitiva
          </h4>
          <p className="text-sm text-muted-foreground">{parsedData.competitive_position}</p>
        </div>
      )}
      
      {/* Trends */}
      {parsedData.trends && Array.isArray(parsedData.trends) && parsedData.trends.length > 0 && (
        <div className="p-4 rounded-lg bg-secondary/50">
          <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-cyan-500" />
            Tendencias Detectadas
          </h4>
          <ul className="list-disc list-inside space-y-1">
            {parsedData.trends.map((trend: string, i: number) => (
              <li key={i} className="text-sm text-muted-foreground">{trend}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Recommendations */}
      {parsedData.recommendations && Array.isArray(parsedData.recommendations) && parsedData.recommendations.length > 0 && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-green-500" />
            Recomendaciones
          </h4>
          <div className="space-y-3">
            {parsedData.recommendations.map((rec: any, i: number) => (
              <div key={i} className="flex gap-3">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  rec.priority === 'alta' ? 'bg-red-500/20 text-red-400' : 
                  rec.priority === 'media' ? 'bg-yellow-500/20 text-yellow-400' : 
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{rec.title}</p>
                  <p className="text-xs text-muted-foreground">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Action Items */}
      {parsedData.action_items && Array.isArray(parsedData.action_items) && parsedData.action_items.length > 0 && (
        <div className="p-4 rounded-lg bg-secondary/50">
          <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Acciones Recomendadas
          </h4>
          <ul className="space-y-2">
            {parsedData.action_items.map((item: string, i: number) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-accent">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* KPIs to Watch */}
      {parsedData.kpis_to_watch && Array.isArray(parsedData.kpis_to_watch) && parsedData.kpis_to_watch.length > 0 && (
        <div className="p-4 rounded-lg bg-secondary/50">
          <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            KPIs a Monitorear
          </h4>
          <div className="flex flex-wrap gap-2">
            {parsedData.kpis_to_watch.map((kpi: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {kpi}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Platform icons
const platformConfig = {
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    gradient: 'from-pink-500 via-purple-500 to-orange-500',
    url: 'instagram.com',
  },
  facebook: {
    name: 'Facebook',
    icon: () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    gradient: 'from-blue-600 to-blue-700',
    url: 'facebook.com',
  },
  tiktok: {
    name: 'TikTok',
    icon: () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
      </svg>
    ),
    gradient: 'from-black to-gray-800',
    url: 'tiktok.com/@',
  },
  twitter: {
    name: 'Twitter/X',
    icon: () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    gradient: 'from-black to-gray-900',
    url: 'twitter.com',
  },
  youtube: {
    name: 'YouTube',
    icon: () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    gradient: 'from-red-600 to-red-700',
    url: 'youtube.com/@',
  },
}

interface Competitor {
  id: string
  name: string
  platform: string
  platform_username: string | null
  instagram_handle: string | null
  facebook_page_id: string | null
  category: string | null
  follower_count: number | null
  following_count: number | null
  posts_count: number | null
  engagement_rate: number | null
  avg_likes: number | null
  avg_comments: number | null
  avg_views: number | null
  last_synced_at: string | null
}

interface Post {
  id: string
  type: string
  likes: number
  comments: number
  views: number
  shares?: number
  posted_at: string
  caption: string
  url?: string
  thumbnail?: string
}

interface Snapshot {
  id: string
  snapshot_date: string
  follower_count: number | null
  following_count: number | null
  posts_count: number | null
  engagement_rate: number | null
  avg_likes: number | null
  avg_comments: number | null
  avg_views: number | null
  recent_posts?: Post[]
  top_posts: Post[] | null
  ai_analysis: {
    summary?: string
    strengths?: string[]
    weaknesses?: string[]
    opportunities?: string[]
    content_strategy?: string
    posting_frequency?: string
    best_content_type?: string
    audience_insights?: string
    recommendations?: string[]
    competitive_score?: number
  } | null
  created_at: string
}

interface Report {
  id: string
  title: string
  report_type: string
  period_start: string
  period_end: string
  summary: string
  html_content: string
  created_at: string
}

interface Ad {
  id: string
  ad_id: string
  ad_type: string
  creative_url: string | null
  video_url: string | null
  headline: string | null
  body_text: string | null
  cta: string | null
  landing_url: string | null
  started_at: string | null
  stopped_at: string | null
  active: boolean
  platforms: string[]
}

interface CompetitorAnalysisProps {
  competitor: Competitor
  snapshots: Snapshot[]
  reports: Report[]
  ads?: Ad[]
}

export function CompetitorAnalysis({ competitor: initialCompetitor, snapshots, reports, ads = [] }: CompetitorAnalysisProps) {
  const router = useRouter()
  const [competitor, setCompetitor] = useState<Competitor>(initialCompetitor)
  const [analyzing, setAnalyzing] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [currentSnapshot, setCurrentSnapshot] = useState<Snapshot | null>(snapshots[0] || null)
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [showPosts, setShowPosts] = useState(false)
  const [loadingAds, setLoadingAds] = useState(false)
  const [competitorAds, setCompetitorAds] = useState<Ad[]>(ads)
  const [exporting, setExporting] = useState(false)

  // Filter snapshots by date
  const filteredSnapshots = useMemo(() => {
    return snapshots.filter(s => {
if (!s.snapshot_date) return true
    const date = new Date(s.snapshot_date)
    if (isNaN(date.getTime())) return true
    if (dateFrom && date < new Date(dateFrom)) return false
    if (dateTo && date > new Date(dateTo)) return false
      return true
    })
  }, [snapshots, dateFrom, dateTo])

  // Get all posts from current or latest snapshot
  const currentPosts = useMemo(() => {
    const snapshot = currentSnapshot || snapshots[0]
    if (!snapshot) return []
    return [...(snapshot.top_posts || []), ...(snapshot.recent_posts || [])]
      .filter((post, index, self) => self.findIndex(p => p.id === post.id) === index)
      .sort((a, b) => {
      const dateA = a.posted_at ? new Date(a.posted_at).getTime() : 0
      const dateB = b.posted_at ? new Date(b.posted_at).getTime() : 0
      return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA)
    })
  }, [currentSnapshot, snapshots])

  const platform = platformConfig[competitor.platform as keyof typeof platformConfig] || platformConfig.instagram
  const PlatformIcon = platform.icon
  const username = competitor.platform_username || competitor.instagram_handle || ''

  const formatNumber = (num: number | null) => {
    if (!num) return '-'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

async function handleRefreshAnalysis() {
  setAnalyzing(true)
  try {
  const response = await fetch('/api/competitors/analyze-profile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
  competitorId: competitor.id,
  platform: competitor.platform,
  username
  }),
  })
  
  const data = await response.json()
  
  if (response.ok && data.data?.profile) {
  // Update local state with new metrics immediately
  const profile = data.data.profile
  setCompetitor(prev => ({
    ...prev,
    follower_count: profile.followers,
    following_count: profile.following,
    posts_count: profile.posts,
    engagement_rate: profile.engagement_rate,
    avg_likes: profile.avg_likes,
    avg_comments: profile.avg_comments,
    avg_views: profile.avg_views,
    last_synced_at: new Date().toISOString(),
  }))
  // Also refresh the page data
  router.refresh()
  } else {
  alert(data.error || data.details || 'Error al actualizar datos')
  }
  } catch (error) {
      alert('Error de conexión al actualizar datos')
    }
    setAnalyzing(false)
  }

  async function handleGenerateReport() {
    setGeneratingReport(true)
    try {
      const response = await fetch('/api/competitors/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitorId: competitor.id }),
      })
      
      if (response.ok) {
        const { report } = await response.json()
        // Open report in new tab
        if (report?.html_content) {
          const blob = new Blob([report.html_content], { type: 'text/html' })
          const url = URL.createObjectURL(blob)
          window.open(url, '_blank')
        }
        router.refresh()
      }
    } catch (error) {
      console.error('Error:', error)
    }
    setGeneratingReport(false)
  }

  async function handleLoadAds() {
    setLoadingAds(true)
    try {
      const response = await fetch('/api/competitors/meta-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          competitorId: competitor.id,
          pageName: competitor.name,
          pageId: competitor.facebook_page_id,
        }),
      })
      
      const data = await response.json()
      
      if (data.success && data.ads) {
        setCompetitorAds(data.ads)
        if (data.message) {
          alert(data.message)
        }
        router.refresh()
      } else {
        alert(data.message || data.error || 'Error cargando anuncios')
      }
    } catch (error) {
      alert('Error de conexion al cargar anuncios')
    }
    setLoadingAds(false)
  }

  async function handleExport(format: 'csv' | 'json' | 'pdf') {
    setExporting(true)
    try {
      const response = await fetch('/api/competitors/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          competitorIds: [competitor.id],
          format,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${competitor.name}-analysis-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting:', error)
    }
    setExporting(false)
  }

  // Parse analysis - handle both object and string formats
  const rawAnalysis = currentSnapshot?.ai_analysis
  const analysis = useMemo(() => {
    if (!rawAnalysis) return null
    if (typeof rawAnalysis === 'object') return rawAnalysis
    // Try to parse if it's a string
    try {
      return JSON.parse(rawAnalysis)
    } catch {
      return { summary: 'Análisis no disponible' }
    }
  }, [rawAnalysis])
  
  // Helper function to check if an ad is real (not placeholder/fake)
  const isRealAd = (ad: Ad) => {
    if (!ad.creative_url && !ad.video_url) return false
    if (ad.creative_url?.includes('picsum.photos')) return false
    if (ad.creative_url?.includes('placeholder')) return false
    if (ad.ad_id?.startsWith('ad_') && ad.ad_id?.includes('_')) return false
    return true
  }
  
  const realAds = competitorAds.filter(isRealAd)
  const activeAds = realAds.filter(ad => ad.active)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/competitors')}
            className="text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${platform.gradient} p-0.5`}>
              <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                <PlatformIcon />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{competitor.name}</h1>
              <a 
                href={competitor.platform === 'facebook' 
                  ? `https://facebook.com/${competitor.facebook_page_id || username}`
                  : `https://${platform.url}${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-accent flex items-center gap-1"
              >
                {competitor.platform === 'facebook' ? username : `@${username}`}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefreshAnalysis}
            disabled={analyzing}
            className="border-border text-foreground"
          >
            {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Actualizar
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="border-border text-foreground"
          >
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('json')}
            disabled={exporting}
            className="border-border text-foreground"
          >
            <Download className="h-4 w-4 mr-2" />
            JSON
          </Button>
          <Button
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {generatingReport ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            Generar Informe
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Users className="h-8 w-8 text-muted-foreground" />
              {analysis?.competitive_score && (
                <Badge className="bg-accent/20 text-accent">
                  Score: {analysis.competitive_score}
                </Badge>
              )}
            </div>
            <p className="text-3xl font-bold text-foreground mt-2">
              {formatNumber(competitor.follower_count)}
            </p>
            <p className="text-sm text-muted-foreground">Seguidores</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <TrendingUp className="h-8 w-8 text-accent" />
            <p className="text-3xl font-bold text-accent mt-2">
              {competitor.engagement_rate ? `${competitor.engagement_rate.toFixed(2)}%` : '-'}
            </p>
            <p className="text-sm text-muted-foreground">Engagement Rate</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-3xl font-bold text-foreground mt-2">
              {formatNumber(competitor.posts_count)}
            </p>
            <p className="text-sm text-muted-foreground">Publicaciones</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <Heart className="h-8 w-8 text-pink-500" />
            <p className="text-3xl font-bold text-foreground mt-2">
              {formatNumber(competitor.avg_likes)}
            </p>
            <p className="text-sm text-muted-foreground">Avg. Likes</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <MessageCircle className="h-8 w-8 text-blue-500" />
            <p className="text-3xl font-bold text-foreground mt-2">
              {formatNumber(competitor.avg_comments)}
            </p>
            <p className="text-sm text-muted-foreground">Avg. Comentarios</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <Eye className="h-8 w-8 text-purple-500" />
            <p className="text-3xl font-bold text-foreground mt-2">
              {formatNumber(competitor.avg_views)}
            </p>
            <p className="text-sm text-muted-foreground">Avg. Vistas</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="analysis" className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="analysis" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            <Sparkles className="h-4 w-4 mr-2" />
            Análisis IA
          </TabsTrigger>
          <TabsTrigger value="posts" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            <Grid3X3 className="h-4 w-4 mr-2" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="ads" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            <Megaphone className="h-4 w-4 mr-2" />
            Ads
            {activeAds.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-accent/20 text-accent text-xs">
                {activeAds.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            <BarChart3 className="h-4 w-4 mr-2" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            <FileText className="h-4 w-4 mr-2" />
            Informes
          </TabsTrigger>
        </TabsList>

        {/* AI Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          {analysis ? (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Summary */}
              <Card className="bg-card border-border md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent" />
                    Resumen del Análisis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground">{analysis.summary}</p>
                  {analysis.content_strategy && (
                    <div className="mt-4 p-4 rounded-lg bg-secondary/50">
                      <p className="text-sm font-medium text-foreground mb-1">Estrategia de Contenido</p>
                      <p className="text-sm text-muted-foreground">{analysis.content_strategy}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Strengths */}
              {analysis.strengths && analysis.strengths.length > 0 && (
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Fortalezas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.strengths.map((strength, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <span className="text-green-500 mt-1">+</span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Weaknesses */}
              {analysis.weaknesses && analysis.weaknesses.length > 0 && (
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      Debilidades
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.weaknesses.map((weakness, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <span className="text-red-500 mt-1">-</span>
                          {weakness}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Opportunities */}
              {analysis.opportunities && analysis.opportunities.length > 0 && (
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-500" />
                      Oportunidades
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.opportunities.map((opportunity, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <span className="text-blue-500 mt-1">→</span>
                          {opportunity}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-500" />
                      Recomendaciones
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <span className="text-yellow-500 mt-1">{i + 1}.</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Quick Insights */}
              <Card className="bg-card border-border md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-foreground">Insights Rápidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {analysis.posting_frequency && (
                      <div className="p-4 rounded-lg bg-secondary/50">
                        <p className="text-sm font-medium text-foreground">Frecuencia</p>
                        <p className="text-sm text-muted-foreground">{analysis.posting_frequency}</p>
                      </div>
                    )}
                    {analysis.best_content_type && (
                      <div className="p-4 rounded-lg bg-secondary/50">
                        <p className="text-sm font-medium text-foreground">Mejor Contenido</p>
                        <p className="text-sm text-muted-foreground">{analysis.best_content_type}</p>
                      </div>
                    )}
                    {analysis.audience_insights && (
                      <div className="p-4 rounded-lg bg-secondary/50">
                        <p className="text-sm font-medium text-foreground">Audiencia</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{analysis.audience_insights}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Sin análisis disponible</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Actualiza el perfil para generar un análisis con IA
                </p>
                <Button 
                  onClick={handleRefreshAnalysis}
                  disabled={analyzing}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Analizar Ahora
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts" className="space-y-4">
          {currentPosts.length > 0 ? (
            <div className="space-y-4">
              {/* Posts Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {currentPosts.map((post, index) => (
                  <Card key={post.id || index} className="bg-card border-border overflow-hidden">
                    {/* Post Thumbnail */}
                    <PostThumbnail 
                      src={post.thumbnail} 
                      alt={`Post ${index + 1}`}
                      type={post.type}
                    />
                    
                    <CardContent className="p-4">
                      {/* Post Stats */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-foreground">
                            <Heart className="h-4 w-4 text-pink-500" />
                            {formatNumber(post.likes)}
                          </span>
                          <span className="flex items-center gap-1 text-foreground">
                            <MessageCircle className="h-4 w-4 text-blue-500" />
                            {formatNumber(post.comments)}
                          </span>
                          {post.views > 0 && (
                            <span className="flex items-center gap-1 text-foreground">
                              <Eye className="h-4 w-4 text-purple-500" />
                              {formatNumber(post.views)}
                            </span>
                          )}
                        </div>
                        {post.shares && post.shares > 0 && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Share2 className="h-3 w-3" />
                            {formatNumber(post.shares)}
                          </span>
                        )}
                      </div>
                      
                      {/* Caption */}
                      {post.caption && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {post.caption}
                        </p>
                      )}
                      
                      {/* Date & Link */}
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-xs text-muted-foreground">
                          {post.posted_at && !isNaN(new Date(post.posted_at).getTime()) ? new Date(post.posted_at).toLocaleDateString('es', { 
                            day: 'numeric', 
                            month: 'short',
                            year: 'numeric'
                          }) : '-'}
                        </span>
                        {post.url && (
                          <a 
                            href={post.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-accent hover:underline flex items-center gap-1"
                          >
                            Ver post
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Grid3X3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Sin posts disponibles</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Actualiza el perfil para obtener los ultimos posts
                </p>
                <Button 
                  onClick={handleRefreshAnalysis}
                  disabled={analyzing}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Actualizar Perfil
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Ads Tab */}
        <TabsContent value="ads" className="space-y-4">
          {/* Ads Header */}
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-accent" />
                    Anuncios Activos
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Datos de Meta Ad Library (Facebook e Instagram)
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{activeAds.length}</p>
                    <p className="text-xs text-muted-foreground">Activos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-muted-foreground">{realAds.length - activeAds.length}</p>
                    <p className="text-xs text-muted-foreground">Inactivos</p>
                  </div>
                  <Button
                    onClick={handleLoadAds}
                    disabled={loadingAds}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    {loadingAds ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Actualizar Ads
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {realAds.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {realAds.map((ad) => (
                <Card key={ad.id} className={`bg-card border-border overflow-hidden ${!ad.active ? 'opacity-60' : ''}`}>
                  {/* Ad Creative */}
                  <div className="relative aspect-square bg-secondary">
                    {ad.creative_url ? (
                      <img 
                        src={`/api/proxy-image?url=${encodeURIComponent(ad.creative_url)}`}
                        alt="Ad creative"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : ad.video_url ? (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-secondary/50">
                        <Video className="h-12 w-12 text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-secondary/50">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    {/* Status Badge */}
                    <div className="absolute top-2 right-2">
                      <Badge className={ad.active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}>
                        {ad.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    {/* Ad Type Badge */}
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="bg-black/50 text-white capitalize">
                        {ad.ad_type}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    {/* Headline */}
                    {ad.headline && (
                      <h4 className="font-medium text-foreground line-clamp-2">{ad.headline}</h4>
                    )}
                    
                    {/* Body Text */}
                    {ad.body_text && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{ad.body_text}</p>
                    )}

                    {/* CTA */}
                    {ad.cta && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-accent text-accent">
                          {ad.cta}
                        </Badge>
                      </div>
                    )}

                    {/* Platforms */}
                    {ad.platforms && ad.platforms.length > 0 && (
                      <div className="flex items-center gap-2">
                        {ad.platforms.includes('facebook') && (
                          <span className="text-xs text-blue-500">Facebook</span>
                        )}
                        {ad.platforms.includes('instagram') && (
                          <span className="text-xs text-pink-500">Instagram</span>
                        )}
                      </div>
                    )}

                    {/* Dates */}
                    <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
                      <span>
                        Inicio: {ad.started_at ? new Date(ad.started_at).toLocaleDateString('es') : '-'}
                      </span>
                      {ad.landing_url && (
                        <a 
                          href={ad.landing_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-accent hover:underline"
                        >
                          <Link className="h-3 w-3" />
                          Ver landing
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Sin anuncios detectados</h3>
                <p className="text-muted-foreground text-center mb-4 max-w-md">
                  Haz clic en "Actualizar Ads" para buscar anuncios activos de este competidor en Meta Ad Library
                </p>
                <Button
                  onClick={handleLoadAds}
                  disabled={loadingAds}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {loadingAds ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Megaphone className="h-4 w-4 mr-2" />}
                  Buscar Anuncios
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {/* Date Filters */}
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Filtrar por fecha:</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Desde</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-9 bg-input border-border text-foreground w-40"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Hasta</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-9 bg-input border-border text-foreground w-40"
                    />
                  </div>
                  {(dateFrom || dateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setDateFrom(''); setDateTo(''); }}
                      className="text-muted-foreground mt-5"
                    >
                      Limpiar
                    </Button>
                  )}
                </div>
                <div className="ml-auto text-sm text-muted-foreground">
                  {filteredSnapshots.length} de {snapshots.length} registros
                </div>
              </div>
            </CardContent>
          </Card>

          {filteredSnapshots.length > 0 ? (
            <div className="space-y-4">
              {filteredSnapshots.map(snapshot => (
                <Card key={snapshot.id} className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-foreground text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {snapshot.snapshot_date && !isNaN(new Date(snapshot.snapshot_date).getTime()) 
                        ? new Date(snapshot.snapshot_date).toLocaleDateString('es', { dateStyle: 'long' })
                        : 'Fecha no disponible'}
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentSnapshot(snapshot)}
                        className="border-border text-foreground"
                      >
                        Ver Análisis
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-6 gap-4 text-center">
                      <div>
                        <p className="text-lg font-semibold text-foreground">{formatNumber(snapshot.follower_count)}</p>
                        <p className="text-xs text-muted-foreground">Seguidores</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">{snapshot.engagement_rate?.toFixed(2) || '-'}%</p>
                        <p className="text-xs text-muted-foreground">Engagement</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">{formatNumber(snapshot.posts_count)}</p>
                        <p className="text-xs text-muted-foreground">Posts</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">{formatNumber(snapshot.avg_likes)}</p>
                        <p className="text-xs text-muted-foreground">Avg Likes</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">{formatNumber(snapshot.avg_comments)}</p>
                        <p className="text-xs text-muted-foreground">Avg Comments</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">{formatNumber(snapshot.avg_views)}</p>
                        <p className="text-xs text-muted-foreground">Avg Views</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {snapshots.length > 0 ? 'Sin resultados en este rango' : 'Sin historial'}
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  {snapshots.length > 0 
                    ? 'Intenta con otro rango de fechas'
                    : 'Actualiza el perfil para comenzar a registrar metricas'
                  }
                </p>
                {snapshots.length === 0 && (
                  <Button 
                    onClick={handleRefreshAnalysis}
                    disabled={analyzing}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Actualizar Perfil
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          {reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map(report => (
                <Card key={report.id} className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-foreground">{report.title}</CardTitle>
                        <CardDescription>
                          {report.period_start && !isNaN(new Date(report.period_start).getTime()) 
                            ? new Date(report.period_start).toLocaleDateString('es') 
                            : '-'} - {report.period_end && !isNaN(new Date(report.period_end).getTime())
                            ? new Date(report.period_end).toLocaleDateString('es')
                            : '-'}
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (report.html_content) {
                            const blob = new Blob([report.html_content], { type: 'text/html' })
                            const url = URL.createObjectURL(blob)
                            window.open(url, '_blank')
                          }
                        }}
                        className="border-border text-foreground"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Ver Informe
                      </Button>
                    </div>
                  </CardHeader>
                  {report.summary && (
                    <CardContent>
                      <ReportSummaryDisplay summary={report.summary} />
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Sin informes</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Genera un informe completo con análisis y recomendaciones
                </p>
                <Button 
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {generatingReport ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  Generar Informe
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
