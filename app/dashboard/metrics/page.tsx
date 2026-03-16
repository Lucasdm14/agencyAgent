'use client'

import { useState, useEffect } from 'react'
import {
  BarChart3, Loader2, AlertCircle, CheckCircle2, TrendingUp,
  Star, Eye, Heart, MessageCircle, Share2, RefreshCw, Download,
  Sparkles, Instagram, Play, Image, Layers, ChevronDown,
} from 'lucide-react'
import type { Brand, InstagramAccountMetrics, InstagramPost } from '@/lib/types'
import { getBrands } from '@/lib/storage'

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, icon, sub, accent }: {
  label: string; value: string | number; icon: React.ReactNode; sub?: string; accent?: boolean
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${accent ? 'bg-accent/10 text-accent' : 'bg-zinc-100 text-secondary'}`}>
          {icon}
        </div>
        {sub && <span className="text-2xs text-tertiary bg-zinc-100 px-2 py-0.5 rounded-full">{sub}</span>}
      </div>
      <p className="text-2xl font-bold text-primary">{typeof value === 'number' ? value.toLocaleString('es-AR') : value}</p>
      <p className="text-xs text-secondary mt-0.5">{label}</p>
    </div>
  )
}

// ─── Post thumbnail card ──────────────────────────────────────────────────────

function PostCard({ post, rank }: { post: InstagramPost; rank?: number }) {
  const typeIcon = post.type === 'Video' ? <Play size={11} /> : post.type === 'Sidecar' ? <Layers size={11} /> : <Image size={11} />
  const typeColor = post.type === 'Video' ? 'bg-red-50 text-red-600 border-red-200' : post.type === 'Sidecar' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-zinc-100 text-zinc-600 border-zinc-200'

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:border-zinc-300 transition-colors">
      {/* Thumbnail - real image from Apify or fallback */}
      <div className="relative h-36 bg-zinc-200 overflow-hidden">
        {post.displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.displayUrl} alt={post.caption?.slice(0, 40)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-200 to-zinc-300 flex items-center justify-center">
            <Instagram size={28} className="text-zinc-400 opacity-40" />
          </div>
        )}
        {rank && (
          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary text-white text-2xs font-bold flex items-center justify-center">
            {rank}
          </div>
        )}
        <div className={`absolute top-2 right-2 flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded border ${typeColor}`}>
          {typeIcon} {post.type}
        </div>
        <div className="absolute bottom-2 right-2">
          <span className="text-2xs bg-primary/80 text-white px-2 py-0.5 rounded font-mono">
            Score: {Math.round(post.score)}
          </span>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <p className="text-xs text-primary leading-relaxed line-clamp-3">{post.caption || '(sin caption)'}</p>
        <div className="flex items-center gap-3 text-xs text-tertiary">
          <span className="flex items-center gap-1"><Heart size={11} className="text-red-400" /> {post.likes.toLocaleString()}</span>
          <span className="flex items-center gap-1"><MessageCircle size={11} className="text-blue-400" /> {post.comments}</span>
          {post.views && <span className="flex items-center gap-1"><Eye size={11} className="text-purple-400" /> {post.views.toLocaleString()}</span>}
          <span className="ml-auto text-2xs">{new Date(post.timestamp).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>
        </div>
        <a href={post.url} target="_blank" rel="noreferrer"
          className="block text-center text-2xs text-accent hover:underline">Ver en Instagram →</a>
      </div>
    </div>
  )
}

// ─── Ads card ─────────────────────────────────────────────────────────────────

function AdsSection({ pageName, username, periodDays }: { pageName: string; username: string; periodDays: number }) {
  const [data,    setData]    = useState<{
    new_ads: {body_text:string;start_date?:string}[];
    active_ads: {body_text:string}[];
    main_messages: string[];
    creative_formats: string[];
    cta_patterns: string[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/metrics/apify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'instagram_ads', username: pageName || username }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Error'); return }
      setData(d.data)
    } catch { setError('Error de red') }
    finally { setLoading(false) }
  }

  if (!data && !loading) return (
    <div className="text-center py-12 text-secondary">
      <TrendingUp size={32} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm mb-4">Cargá los ads activos de esta cuenta en Meta Ad Library</p>
      <button onClick={load} className="bg-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-zinc-800 transition">
        Cargar ads
      </button>
    </div>
  )

  if (loading) return <div className="flex items-center gap-2 py-12 justify-center text-secondary text-sm"><Loader2 size={16} className="animate-spin" /> Buscando ads...</div>
  if (error)   return <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-xl p-4">{error}</p>
  if (!data)   return null

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="Ads activos" value={data.active_ads.length} icon={<TrendingUp size={16} />} accent />
        <MetricCard label="Nuevos (7 días)" value={data.new_ads.length} icon={<Star size={16} />} />
      </div>
      {data.main_messages.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs font-semibold text-secondary mb-3">Mensajes principales detectados</p>
          <div className="space-y-2">
            {data.main_messages.slice(0, 6).map((m, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-primary bg-canvas border border-border rounded-lg px-3 py-2">
                <span className="text-tertiary font-mono shrink-0">{i+1}.</span>
                <p className="leading-relaxed">{m}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.cta_patterns.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-semibold text-secondary mb-2">CTAs detectados</p>
          <div className="flex flex-wrap gap-2">
            {data.cta_patterns.map((c, i) => <span key={i} className="text-xs bg-blue-50 text-accent border border-blue-100 px-2.5 py-1 rounded-full">{c}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AI Analysis ──────────────────────────────────────────────────────────────

function AIAnalysisSection({ metrics }: { metrics: InstagramAccountMetrics }) {
  const [analysis, setAnalysis] = useState<{
    top_hook_patterns: string[]; best_formats: string[]; content_themes: string[]
    posting_frequency: string; engagement_insights: string[]
    recommendations: string[]; strengths: string[]; weaknesses: string[]
    generated_at: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function runAnalysis() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/metrics/apify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'instagram_analysis', username: metrics.username, period_days: metrics.period_days }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Error'); return }
      setAnalysis(d.ai_analysis)
    } catch { setError('Error de red') }
    finally { setLoading(false) }
  }

  if (!analysis && !loading) return (
    <div className="text-center py-12">
      <Sparkles size={32} className="mx-auto mb-3 text-accent opacity-60" />
      <p className="text-sm text-secondary mb-2">Análisis IA de {metrics.posts_count} posts</p>
      <p className="text-xs text-tertiary mb-5 max-w-sm mx-auto">
        La IA analiza los datos reales de la cuenta y extrae insights accionables sobre hooks, formatos, temas y recomendaciones.
      </p>
      <button onClick={runAnalysis}
        className="flex items-center gap-2 bg-accent text-white text-sm px-5 py-2.5 rounded-lg hover:bg-accentHover transition mx-auto">
        <Sparkles size={15} /> Generar análisis IA
      </button>
    </div>
  )

  if (loading) return (
    <div className="flex flex-col items-center gap-3 py-12 text-secondary">
      <Loader2 size={24} className="animate-spin text-accent" />
      <p className="text-sm">Analizando {metrics.posts_count} posts con IA...</p>
    </div>
  )
  if (error) return <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-xl p-4">{error}</p>
  if (!analysis) return null

  const sections: { title: string; items: string[]; color: string }[] = [
    { title: '🎣 Patrones de hooks que funcionan',  items: analysis.top_hook_patterns,   color: 'bg-blue-50 border-blue-200' },
    { title: '📊 Formatos con mejor performance',   items: analysis.best_formats,         color: 'bg-purple-50 border-purple-200' },
    { title: '📌 Temas recurrentes en top posts',   items: analysis.content_themes,       color: 'bg-amber-50 border-amber-200' },
    { title: '💪 Fortalezas detectadas',             items: analysis.strengths,            color: 'bg-green-50 border-green-200' },
    { title: '⚠️ Áreas de mejora',                   items: analysis.weaknesses,           color: 'bg-red-50 border-red-200' },
    { title: '💡 Recomendaciones concretas',          items: analysis.recommendations,      color: 'bg-orange-50 border-orange-200' },
    { title: '📈 Insights de engagement',             items: analysis.engagement_insights,  color: 'bg-sky-50 border-sky-200' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-accent" />
          <span className="text-sm font-semibold text-primary">Análisis IA</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-tertiary">Frecuencia: <strong className="text-secondary">{analysis.posting_frequency}</strong></span>
          <button onClick={runAnalysis} className="text-xs flex items-center gap-1 text-tertiary hover:text-secondary border border-border rounded px-2.5 py-1 hover:bg-canvas transition">
            <RefreshCw size={11} /> Regenerar
          </button>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {sections.map(({ title, items, color }) => (
          <div key={title} className={`border rounded-xl p-4 ${color}`}>
            <p className="text-xs font-semibold text-primary mb-2.5">{title}</p>
            <div className="space-y-1.5">
              {items.length > 0
                ? items.map((item, i) => <p key={i} className="text-xs text-secondary">• {item}</p>)
                : <p className="text-xs text-tertiary italic">Sin datos suficientes.</p>
              }
            </div>
          </div>
        ))}
      </div>
      <p className="text-2xs text-tertiary">Generado: {new Date(analysis.generated_at).toLocaleString('es-AR')}</p>
    </div>
  )
}

// ─── Main account view ────────────────────────────────────────────────────────

type Tab = 'posts' | 'ads' | 'analisis_ia' | 'historial'

function AccountView({ username, brandId, periodDays, onBack }: {
  username: string; brandId: string; periodDays: number; onBack: () => void
}) {
  const [metrics, setMetrics] = useState<InstagramAccountMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [tab,     setTab]     = useState<Tab>('posts')

  useEffect(() => { load() }, [username, periodDays])

  async function load() {
    setLoading(true); setError(''); setMetrics(null)
    try {
      const res = await fetch('/api/metrics/apify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'instagram_posts', username, period_days: periodDays }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Error'); return }
      setMetrics(d.metrics)
    } catch { setError('Error de red') }
    finally { setLoading(false) }
  }

  function exportJSON() {
    if (!metrics) return
    const blob = new Blob([JSON.stringify(metrics, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${username}-metrics.json`; a.click()
  }

  if (loading) return (
    <div className="flex flex-col items-center gap-3 py-24 text-secondary">
      <Loader2 size={24} className="animate-spin text-accent" />
      <p className="text-sm">Cargando datos de @{username}...</p>
    </div>
  )

  if (error) return (
    <div className="py-8">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 max-w-lg">
        <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-danger">{error}</p>
          <button onClick={load} className="text-xs text-danger hover:underline mt-1">Reintentar</button>
        </div>
      </div>
    </div>
  )

  if (!metrics) return null

  const tabs: { id: Tab; label: string }[] = [
    { id: 'analisis_ia', label: 'Análisis IA' },
    { id: 'posts',       label: 'Posts' },
    { id: 'ads',         label: 'Ads' },
    { id: 'historial',   label: 'Historial' },
  ]

  return (
    <div className="space-y-6">
      {/* Account header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-canvas rounded-lg transition text-secondary">
          <ChevronDown size={16} className="rotate-90" />
        </button>
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
          <Instagram size={22} className="text-white" />
        </div>
        <div>
          <p className="font-semibold text-primary text-lg">{metrics.username}</p>
          <a href={`https://instagram.com/${metrics.username}`} target="_blank" rel="noreferrer"
            className="text-xs text-accent hover:underline flex items-center gap-1">
            @{metrics.username} ↗
          </a>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={load}       className="flex items-center gap-1.5 text-xs border border-border rounded-lg px-3 py-2 hover:bg-canvas transition text-secondary"><RefreshCw size={12} /> Actualizar</button>
          <button onClick={exportJSON} className="flex items-center gap-1.5 text-xs border border-border rounded-lg px-3 py-2 hover:bg-canvas transition text-secondary"><Download size={12} /> JSON</button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-6 gap-3">
        <MetricCard label="Publicaciones"    value={metrics.posts_count}   icon={<Image size={14} />} />
        <MetricCard label="Avg. Likes"       value={metrics.avg_likes}     icon={<Heart size={14} />} accent />
        <MetricCard label="Avg. Comentarios" value={metrics.avg_comments}  icon={<MessageCircle size={14} />} />
        <MetricCard label="Avg. Vistas"      value={metrics.avg_views ?? 'N/A'}  icon={<Eye size={14} />} />
        {Object.entries(metrics.format_breakdown).slice(0, 2).map(([type, count]) => (
          <MetricCard key={type} label={type} value={count} icon={type === 'Video' ? <Play size={14} /> : <Image size={14} />} sub="posts" />
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-canvas border border-border rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 text-sm rounded transition-all font-medium ${tab === t.id ? 'bg-primary text-white' : 'text-secondary hover:text-primary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'posts' && (
        <div>
          <p className="text-xs font-semibold text-secondary mb-4">Top {metrics.top_posts.length} posts del período ({metrics.period_days} días)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {metrics.top_posts.map((post, i) => (
              <PostCard key={i} post={post} rank={i + 1} />
            ))}
          </div>
          {/* All posts (flattened) */}
          <details className="mt-6">
            <summary className="text-sm text-secondary cursor-pointer hover:text-primary flex items-center gap-1.5 mb-3">
              <ChevronDown size={14} /> Ver todos los posts del período
            </summary>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {metrics.top_posts.map((post, i) => <PostCard key={i} post={post} />)}
            </div>
          </details>
        </div>
      )}

      {tab === 'ads' && (
        <AdsSection pageName={metrics.username} username={metrics.username} periodDays={periodDays} />
      )}

      {tab === 'analisis_ia' && (
        <AIAnalysisSection metrics={metrics} />
      )}

      {tab === 'historial' && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-secondary mb-3">Todos los posts ordenados por fecha</p>
          {metrics.top_posts
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .map((post, i) => (
              <div key={i} className="flex items-start gap-4 bg-card border border-border rounded-xl p-4 hover:border-zinc-300 transition-colors shadow-sm">
                <div className={`shrink-0 p-2 rounded-lg ${post.type === 'Video' ? 'bg-red-50 text-red-500' : post.type === 'Sidecar' ? 'bg-purple-50 text-purple-500' : 'bg-zinc-100 text-zinc-500'}`}>
                  {post.type === 'Video' ? <Play size={14} /> : post.type === 'Sidecar' ? <Layers size={14} /> : <Image size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary leading-relaxed line-clamp-2">{post.caption || '(sin caption)'}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-tertiary">
                    <span>{new Date(post.timestamp).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    <span className="flex items-center gap-1"><Heart size={10} className="text-red-400" /> {post.likes.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={10} className="text-blue-400" /> {post.comments}</span>
                    {post.views && <span className="flex items-center gap-1"><Eye size={10} className="text-purple-400" /> {post.views.toLocaleString()}</span>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-primary">{Math.round(post.score)}</p>
                  <p className="text-2xs text-tertiary">score</p>
                </div>
                <a href={post.url} target="_blank" rel="noreferrer" className="shrink-0 text-2xs text-accent hover:underline">↗</a>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MetricsPage() {
  const [brands,       setBrands]       = useState<Brand[]>([])
  const [selectedView, setSelectedView] = useState<'dashboard' | 'account'>('dashboard')
  const [activeUsername, setActiveUsername] = useState('')
  const [activeBrandId,  setActiveBrandId]  = useState('')
  const [periodDays,   setPeriodDays]   = useState(30)

  // Quick add form
  const [newUsername,  setNewUsername]  = useState('')
  const [loadingNew,   setLoadingNew]   = useState(false)
  const [errorNew,     setErrorNew]     = useState('')

  useEffect(() => { setBrands(getBrands()) }, [])

  async function openAccount(username: string, brandId: string) {
    setActiveUsername(username); setActiveBrandId(brandId); setSelectedView('account')
  }

  async function quickAdd() {
    if (!newUsername.trim()) return
    setLoadingNew(true); setErrorNew('')
    // Just navigate to the account view with the typed username
    await openAccount(newUsername.trim().replace('@', ''), brands[0]?.id ?? '')
    setNewUsername(''); setLoadingNew(false)
  }

  if (selectedView === 'account') {
    return (
      <div className="p-8 max-w-6xl">
        <AccountView
          username={activeUsername}
          brandId={activeBrandId}
          periodDays={periodDays}
          onBack={() => setSelectedView('dashboard')}
        />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 size={18} className="text-accent" />
          <h1 className="text-xl font-semibold text-primary">Métricas</h1>
        </div>
        <p className="text-sm text-secondary">
          Analizá cuentas de clientes y competidores. Requires <code className="text-xs bg-zinc-100 px-1 rounded font-mono">APIFY_TOKEN</code> en variables de entorno.
        </p>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-xs font-medium text-secondary">Período:</span>
        {[7, 15, 30, 60, 90].map(d => (
          <button key={d} onClick={() => setPeriodDays(d)}
            className={`px-3 py-1 text-xs rounded-lg border transition-all ${periodDays === d ? 'bg-primary text-white border-primary' : 'border-border text-secondary hover:border-zinc-400'}`}>
            {d} días
          </button>
        ))}
      </div>

      {/* Quick add */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6 shadow-sm">
        <p className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
          <Instagram size={15} className="text-pink-500" /> Analizar cuenta de Instagram
        </p>
        <div className="flex gap-2">
          <div className="flex items-center border border-border rounded-lg overflow-hidden flex-1 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/20">
            <span className="px-3 py-2 text-sm text-tertiary bg-canvas border-r border-border">@</span>
            <input value={newUsername} onChange={e => setNewUsername(e.target.value.replace('@', ''))}
              onKeyDown={e => e.key === 'Enter' && quickAdd()}
              placeholder="usuario (ej: axontraining)"
              className="flex-1 px-3 py-2 text-sm outline-none bg-white" />
          </div>
          <button onClick={quickAdd} disabled={!newUsername.trim() || loadingNew}
            className="flex items-center gap-2 bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-800 transition disabled:opacity-40">
            {loadingNew ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
            Analizar
          </button>
        </div>
        {errorNew && <p className="text-xs text-danger mt-2">{errorNew}</p>}
      </div>

      {/* Cuentas de clientes */}
      {brands.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Cuentas de tus clientes</p>
          {brands.map(brand => {
            const ig = brand.competitors?.filter(c => c.facebook_page_name || c.name)
            return (
              <div key={brand.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <p className="text-sm font-semibold text-primary mb-3">{brand.name}</p>
                <div className="flex flex-wrap gap-2">
                  {/* Brand's own account (from news_keywords or name) */}
                  <button
                    onClick={() => openAccount(brand.name.toLowerCase().replace(/\s/g, ''), brand.id)}
                    className="flex items-center gap-2 text-xs border border-border rounded-lg px-3 py-2 hover:border-pink-300 hover:text-pink-700 hover:bg-pink-50 transition">
                    <Instagram size={12} className="text-pink-500" />
                    @{brand.name.toLowerCase().replace(/\s/g, '')}
                    <span className="text-2xs bg-zinc-100 px-1.5 rounded text-tertiary">propia</span>
                  </button>
                  {/* Competitor accounts */}
                  {brand.competitors?.map((c, i) => (
                    <button key={i}
                      onClick={() => openAccount(c.name.toLowerCase().replace(/\s/g, ''), brand.id)}
                      className="flex items-center gap-2 text-xs border border-border rounded-lg px-3 py-2 hover:border-zinc-400 hover:text-primary transition text-secondary">
                      <Instagram size={12} className="text-tertiary" />
                      @{c.name.toLowerCase().replace(/\s/g, '')}
                      <span className="text-2xs bg-zinc-100 px-1.5 rounded text-tertiary">competidor</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
