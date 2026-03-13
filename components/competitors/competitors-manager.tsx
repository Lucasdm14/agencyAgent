'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Plus,
  Search,
  Instagram,
  Trash2,
  BarChart3,
  TrendingUp,
  Loader2,
  Users,
  Image as ImageIcon,
  Tag,
  RefreshCw,
  FileText,
  Heart,
  MessageCircle,
  Eye,
  Sparkles,
  Pencil,
} from 'lucide-react'

// Platform icons and colors
const platformConfig = {
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    gradient: 'from-pink-500 via-purple-500 to-orange-500',
    color: 'text-pink-500',
  },
  facebook: {
    name: 'Facebook',
    icon: () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    gradient: 'from-blue-600 to-blue-700',
    color: 'text-blue-500',
  },
  tiktok: {
    name: 'TikTok',
    icon: () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
      </svg>
    ),
    gradient: 'from-black to-gray-800',
    color: 'text-foreground',
  },
  twitter: {
    name: 'Twitter/X',
    icon: () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    gradient: 'from-black to-gray-900',
    color: 'text-foreground',
  },
  youtube: {
    name: 'YouTube',
    icon: () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    gradient: 'from-red-600 to-red-700',
    color: 'text-red-500',
  },
}

interface Competitor {
  id: string
  brand_id: string | null
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
  is_active: boolean
  created_at: string
  brand: { id: string; name: string } | null
}

interface CompetitorsManagerProps {
  brands: { id: string; name: string }[]
  initialCompetitors: Competitor[]
}

export function CompetitorsManager({ brands, initialCompetitors }: CompetitorsManagerProps) {
  const router = useRouter()
  const supabase = createClient()
  const [competitors, setCompetitors] = useState(initialCompetitors)
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    brand_id: '',
    platform: 'instagram',
    platform_username: '',
    facebook_page_id: '',
    category: '',
    notes: '',
  })
  
  // Edit modal state
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: '',
    platform: 'instagram',
    platform_username: '',
    facebook_page_id: '',
    category: '',
    brand_id: '',
    notes: '',
  })

  const categories = [
    'Cliente',
    'Competidor directo',
    'Competidor indirecto',
    'Inspiracion',
    'Industria',
    'Referente',
    'Otro',
  ]

  const [selectedCategory, setSelectedCategory] = useState<string>('')

  const filteredCompetitors = competitors.filter(c => {
    const matchesBrand = !selectedBrand || c.brand_id === selectedBrand
    const matchesCategory = !selectedCategory || c.category === selectedCategory
    const matchesPlatform = !selectedPlatform || c.platform === selectedPlatform
    const username = c.platform_username || c.instagram_handle || ''
    const matchesSearch = !searchTerm || 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      username.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesBrand && matchesCategory && matchesPlatform && matchesSearch
  })

  async function handleAddCompetitor() {
    if (!formData.platform_username) return

    setLoading(true)
    const username = formData.platform_username.replace('@', '')
    // Use username as name
    const name = username
    
    const { data, error } = await supabase
      .from('competitors')
      .insert({
        brand_id: formData.brand_id || null,
        name: name,
        platform: formData.platform,
        platform_username: username,
        instagram_handle: formData.platform === 'instagram' ? username : null,
        facebook_page_id: formData.platform === 'facebook' ? (formData.facebook_page_id || username) : null,
        category: formData.category || null,
        notes: formData.notes || null,
      })
      .select(`*, brand:brands(id, name)`)
      .single()

    if (!error && data) {
      setCompetitors([data, ...competitors])
      setShowAddDialog(false)
      setFormData({
        brand_id: '',
        platform: 'instagram',
        platform_username: '',
        facebook_page_id: '',
        category: '',
        notes: '',
      })
      // Auto-analyze the new profile
      handleAnalyzeProfile(data.id, data.platform, username)
    }
    setLoading(false)
  }
  
  function openEditDialog(competitor: Competitor) {
    setEditingCompetitor(competitor)
    setEditFormData({
      name: competitor.name,
      platform: competitor.platform,
      platform_username: competitor.platform_username || competitor.instagram_handle || '',
      facebook_page_id: competitor.facebook_page_id || '',
      category: competitor.category || '',
      brand_id: competitor.brand_id || '',
      notes: '',
    })
    setShowEditDialog(true)
  }
  
  async function handleUpdateCompetitor() {
    if (!editingCompetitor || !editFormData.platform_username) return
    
    setLoading(true)
    const username = editFormData.platform_username.replace('@', '')
    
    const { data, error } = await supabase
      .from('competitors')
      .update({
        name: editFormData.name || username,
        platform: editFormData.platform,
        platform_username: username,
        instagram_handle: editFormData.platform === 'instagram' ? username : null,
        facebook_page_id: editFormData.platform === 'facebook' ? (editFormData.facebook_page_id || username) : null,
        category: editFormData.category || null,
        brand_id: editFormData.brand_id || null,
      })
      .eq('id', editingCompetitor.id)
      .select(`*, brand:brands(id, name)`)
      .single()
    
    if (!error && data) {
      setCompetitors(prev => prev.map(c => c.id === data.id ? data : c))
      setShowEditDialog(false)
      setEditingCompetitor(null)
    }
    setLoading(false)
  }

  async function handleAnalyzeProfile(id: string, platform: string, username: string) {
    setAnalyzingId(id)
    
    try {
      console.log('[v0] Analyzing profile:', { id, platform, username })
      
      const response = await fetch('/api/competitors/analyze-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitorId: id, platform, username }),
      })

      const result = await response.json()
      console.log('[v0] Analysis response:', result)

      if (response.ok && result.data) {
        // Update local state with new data
        setCompetitors(prev => prev.map(c => 
          c.id === id ? {
            ...c,
            follower_count: result.data.profile.followers,
            following_count: result.data.profile.following,
            posts_count: result.data.profile.posts,
            engagement_rate: result.data.profile.engagement_rate,
            avg_likes: result.data.profile.avg_likes,
            avg_comments: result.data.profile.avg_comments,
            avg_views: result.data.profile.avg_views,
            last_synced_at: new Date().toISOString(),
          } : c
        ))
        alert('Perfil actualizado correctamente')
      } else {
        // Show error to user
        const errorMsg = result.error || result.details || 'Error desconocido'
        console.error('[v0] Analysis failed:', errorMsg)
        alert(`Error al analizar perfil: ${errorMsg}`)
      }
    } catch (error: any) {
      console.error('[v0] Error analyzing profile:', error)
      alert(`Error de conexion: ${error.message}`)
    }
    
    setAnalyzingId(null)
  }

  async function handleDeleteCompetitor(id: string) {
    if (!confirm('¿Eliminar este competidor y todos sus análisis?')) return

    const { error } = await supabase
      .from('competitors')
      .delete()
      .eq('id', id)

    if (!error) {
      setCompetitors(competitors.filter(c => c.id !== id))
    }
  }

  const formatNumber = (num: number | null) => {
    if (!num) return '-'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Metricas y Analisis</h1>
          <p className="text-muted-foreground">Analiza perfiles de clientes y competidores en redes sociales</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Perfil
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Agregar Perfil</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Platform Selection */}
              <div className="space-y-2">
                <Label className="text-foreground">Plataforma *</Label>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(platformConfig).map(([key, config]) => {
                    const Icon = config.icon
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, platform: key, platform_username: '', facebook_page_id: '' })}
                        className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                          formData.platform === key
                            ? 'border-accent bg-accent/10'
                            : 'border-border hover:border-accent/50'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${config.gradient} p-0.5`}>
                          <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                            <Icon />
                          </div>
                        </div>
                        <span className="text-[10px] text-foreground">{config.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Username field - different for Facebook */}
              {formData.platform === 'facebook' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Nombre de la Pagina *</Label>
                    <Input
                      value={formData.platform_username}
                      onChange={(e) => setFormData({ ...formData, platform_username: e.target.value })}
                      placeholder="Ej: Nike"
                      className="bg-input border-border text-foreground"
                    />
                    <p className="text-xs text-muted-foreground">
                      Nombre de la pagina de Facebook para buscar en Ad Library
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Page ID de Facebook (opcional)</Label>
                    <Input
                      value={formData.facebook_page_id}
                      onChange={(e) => setFormData({ ...formData, facebook_page_id: e.target.value })}
                      placeholder="Ej: 123456789012345"
                      className="bg-input border-border text-foreground"
                    />
                    <p className="text-xs text-muted-foreground">
                      ID numerico de la pagina. Lo encuentras en facebook.com/tu-pagina/about &gt; Transparencia
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-foreground">Usuario *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                    <Input
                      value={formData.platform_username}
                      onChange={(e) => setFormData({ ...formData, platform_username: e.target.value })}
                      placeholder="usuario"
                      className="pl-8 bg-input border-border text-foreground"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-foreground">Categoria *</Label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-input border border-border text-foreground"
                >
                  <option value="">Selecciona una categoría</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Vincular a marca (opcional)</Label>
                <select
                  value={formData.brand_id}
                  onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-input border border-border text-foreground"
                >
                  <option value="">Sin vincular</option>
                  {brands.map(brand => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Notas</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Información adicional..."
                  className="bg-input border-border text-foreground"
                  rows={2}
                />
              </div>

              <Button
                onClick={handleAddCompetitor}
                disabled={loading || !formData.platform_username || !formData.category}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Agregar y Analizar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o @usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-input border-border text-foreground"
          />
        </div>
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="h-10 px-3 rounded-md bg-input border border-border text-foreground"
        >
          <option value="">Todas las marcas</option>
          {brands.map(brand => (
            <option key={brand.id} value={brand.id}>{brand.name}</option>
          ))}
        </select>
        <select
          value={selectedPlatform}
          onChange={(e) => setSelectedPlatform(e.target.value)}
          className="h-10 px-3 rounded-md bg-input border border-border text-foreground"
        >
          <option value="">Todas las plataformas</option>
          {Object.entries(platformConfig).map(([key, config]) => (
            <option key={key} value={key}>{config.name}</option>
          ))}
        </select>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="h-10 px-3 rounded-md bg-input border border-border text-foreground"
        >
          <option value="">Todas las categorias</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Competitors Grid - Grouped by Brand */}
      {filteredCompetitors.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No hay perfiles agregados</h3>
            <p className="text-muted-foreground text-center mb-4">
              Agrega perfiles de redes sociales para analizar su contenido con IA
            </p>
            <Button 
              onClick={() => setShowAddDialog(true)}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Perfil
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Group competitors by brand */}
          {(() => {
            // Group by brand
            const grouped: Record<string, typeof filteredCompetitors> = {}
            filteredCompetitors.forEach(c => {
              const brandKey = c.brand?.name || 'Sin Marca'
              if (!grouped[brandKey]) grouped[brandKey] = []
              grouped[brandKey].push(c)
            })
            
            // Sort brand names, putting "Sin Marca" at the end
            const sortedBrands = Object.keys(grouped).sort((a, b) => {
              if (a === 'Sin Marca') return 1
              if (b === 'Sin Marca') return -1
              return a.localeCompare(b)
            })
            
            return sortedBrands.map(brandName => (
              <div key={brandName} className="space-y-4">
                {/* Brand Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-1 bg-accent rounded-full" />
                    <h2 className="text-lg font-semibold text-foreground">{brandName}</h2>
                    <Badge variant="secondary" className="text-xs">
                      {grouped[brandName].length} {grouped[brandName].length === 1 ? 'perfil' : 'perfiles'}
                    </Badge>
                  </div>
                  {brandName !== 'Sin Marca' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const brand = brands.find(b => b.name === brandName)
                        if (brand) setSelectedBrand(brand.id)
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Ver solo esta marca
                    </Button>
                  )}
                </div>
                
                {/* Competitors in this brand */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {grouped[brandName].map(competitor => {
                    const platform = platformConfig[competitor.platform as keyof typeof platformConfig] || platformConfig.instagram
                    const PlatformIcon = platform.icon
                    const username = competitor.platform_username || competitor.instagram_handle || ''
                    const isAnalyzing = analyzingId === competitor.id

                    return (
                      <Card key={competitor.id} className="bg-card border-border hover:border-accent/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${platform.gradient} p-0.5`}>
                        <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                          <PlatformIcon />
                        </div>
                      </div>
                      <div>
                        <CardTitle className="text-foreground text-base">{competitor.name}</CardTitle>
<a 
                                          href={`https://${
                                                 competitor.platform === 'instagram' ? 'instagram.com/' : 
                                                 competitor.platform === 'facebook' ? 'facebook.com/' :
                                                 competitor.platform === 'tiktok' ? 'tiktok.com/@' :
                                                 competitor.platform === 'twitter' ? 'twitter.com/' :
                                                 'youtube.com/@'}${competitor.platform === 'facebook' ? (competitor.facebook_page_id || username) : username}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-muted-foreground hover:text-accent"
                                        >
                                          {competitor.platform === 'facebook' ? username : `@${username}`}
                                        </a>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className={platform.color}>
                        {platform.name}
                      </Badge>
                      {competitor.category && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1 border-border">
                          <Tag className="h-2 w-2" />
                          {competitor.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Main Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-lg bg-secondary/50 text-center">
                      <p className="text-xl font-bold text-foreground">
                        {formatNumber(competitor.follower_count)}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Users className="h-3 w-3" /> Seguidores
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50 text-center">
                      <p className="text-xl font-bold text-accent">
                        {competitor.engagement_rate ? `${competitor.engagement_rate.toFixed(2)}%` : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Engagement
                      </p>
                    </div>
                  </div>

                  {/* Secondary Stats */}
                  <div className="grid grid-cols-4 gap-1 text-center">
                    <div className="p-2">
                      <p className="text-sm font-semibold text-foreground">{formatNumber(competitor.posts_count)}</p>
                      <p className="text-xs text-muted-foreground"><ImageIcon className="h-3 w-3 mx-auto" /></p>
                    </div>
                    <div className="p-2">
                      <p className="text-sm font-semibold text-foreground">{formatNumber(competitor.avg_likes)}</p>
                      <p className="text-xs text-muted-foreground"><Heart className="h-3 w-3 mx-auto" /></p>
                    </div>
                    <div className="p-2">
                      <p className="text-sm font-semibold text-foreground">{formatNumber(competitor.avg_comments)}</p>
                      <p className="text-xs text-muted-foreground"><MessageCircle className="h-3 w-3 mx-auto" /></p>
                    </div>
                    <div className="p-2">
                      <p className="text-sm font-semibold text-foreground">{formatNumber(competitor.avg_views)}</p>
                      <p className="text-xs text-muted-foreground"><Eye className="h-3 w-3 mx-auto" /></p>
                    </div>
                  </div>

                  {/* Last synced */}
                  {competitor.last_synced_at && (
                    <p className="text-xs text-muted-foreground text-center">
                      Actualizado: {new Date(competitor.last_synced_at).toLocaleDateString('es')}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-border text-foreground"
                      onClick={() => handleAnalyzeProfile(competitor.id, competitor.platform, username)}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3 mr-1" />
                      )}
                      Actualizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-border text-foreground"
                      onClick={() => router.push(`/dashboard/competitors/${competitor.id}`)}
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Ver Análisis
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => openEditDialog(competitor)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteCompetitor(competitor.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))
          })()}
        </div>
      )}
      
      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Platform Selection */}
            <div className="space-y-2">
              <Label className="text-foreground">Plataforma</Label>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(platformConfig).map(([key, config]) => {
                  const Icon = config.icon
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setEditFormData({ ...editFormData, platform: key })}
                      className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                        editFormData.platform === key
                          ? 'border-accent bg-accent/10'
                          : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${config.gradient} p-0.5`}>
                        <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                          <Icon />
                        </div>
                      </div>
                      <span className="text-[10px] text-foreground">{config.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Username */}
            {editFormData.platform === 'facebook' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Nombre de la Pagina</Label>
                  <Input
                    value={editFormData.platform_username}
                    onChange={(e) => setEditFormData({ ...editFormData, platform_username: e.target.value })}
                    placeholder="Ej: Nike"
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Page ID de Facebook (opcional)</Label>
                  <Input
                    value={editFormData.facebook_page_id}
                    onChange={(e) => setEditFormData({ ...editFormData, facebook_page_id: e.target.value })}
                    placeholder="Ej: 123456789012345"
                    className="bg-input border-border text-foreground"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-foreground">Usuario</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <Input
                    value={editFormData.platform_username}
                    onChange={(e) => setEditFormData({ ...editFormData, platform_username: e.target.value })}
                    placeholder="usuario"
                    className="pl-8 bg-input border-border text-foreground"
                  />
                </div>
              </div>
            )}
            
            {/* Display Name */}
            <div className="space-y-2">
              <Label className="text-foreground">Nombre para mostrar (opcional)</Label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Se usara el usuario si esta vacio"
                className="bg-input border-border text-foreground"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-foreground">Categoria</Label>
              <select
                value={editFormData.category}
                onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-input border border-border text-foreground"
              >
                <option value="">Selecciona una categoria</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div className="space-y-2">
              <Label className="text-foreground">Vincular a marca</Label>
              <select
                value={editFormData.brand_id}
                onChange={(e) => setEditFormData({ ...editFormData, brand_id: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-input border border-border text-foreground"
              >
                <option value="">Sin vincular</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="flex-1 border-border"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateCompetitor}
                disabled={loading || !editFormData.platform_username}
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Guardar Cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
