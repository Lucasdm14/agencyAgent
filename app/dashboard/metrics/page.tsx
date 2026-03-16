'use client'

import { useState, useEffect, useRef } from 'react'
import { BarChart3, Upload, Loader2, AlertCircle, CheckCircle2, TrendingUp, Instagram, Star, Eye } from 'lucide-react'
import type { Brand, MetricsReport, InstagramAccountMetrics } from '@/lib/types'
import { getBrands, addMetricsReport } from '@/lib/storage'

// ─── CSV uploader (existing) ──────────────────────────────────────────────────

function CsvUploader({ brands }: { brands: Brand[] }) {
  const [brandId,    setBrandId]    = useState(brands[0]?.id ?? '')
  const [platform,   setPlatform]   = useState('instagram')
  const [period,     setPeriod]     = useState('')
  const [csvContent, setCsvContent] = useState('')
  const [csvName,    setCsvName]    = useState('')
  const [loading,    setLoading]    = useState(false)
  const [result,     setResult]     = useState<MetricsReport | null>(null)
  const [error,      setError]      = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvName(file.name)
    const reader = new FileReader()
    reader.onload = () => setCsvContent(reader.result as string)
    reader.readAsText(file)
  }

  async function analyze() {
    if (!csvContent || !brandId || !platform) return
    setLoading(true); setError(''); setResult(null)
    const brand = brands.find(b => b.id === brandId)
    try {
      const res = await fetch('/api/metrics/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_content: csvContent, platform, brand_name: brand?.name ?? '' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al analizar'); return }
      const report: MetricsReport = {
        id: crypto.randomUUID(), brand_id: brandId, brand_name: brand?.name ?? '',
        platform, period: period || 'Sin especificar',
        uploaded_at: new Date().toISOString(), raw_rows: data.row_count, insights: data.insights,
      }
      addMetricsReport(report)
      setResult(report)
    } catch { setError('Error de red.') }
    finally { setLoading(false) }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-medium text-ink flex items-center gap-2"><Upload size={15} /> Analizar CSV de métricas</h3>
      <div className="grid grid-cols-3 gap-3">
        <select value={brandId} onChange={e => setBrandId(e.target.value)} className="border border-border rounded px-3 py-2 text-sm bg-paper outline-none focus:border-accent">
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={platform} onChange={e => setPlatform(e.target.value)} className="border border-border rounded px-3 py-2 text-sm bg-paper outline-none focus:border-accent">
          {['instagram','linkedin','facebook','tiktok','twitter'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        <input value={period} onChange={e => setPeriod(e.target.value)} placeholder="Período (ej: Enero 2025)"
          className="border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent bg-paper" />
      </div>
      <div onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${csvContent ? 'border-accent bg-orange-50' : 'border-border hover:border-accent/50'}`}>
        {csvContent ? <p className="text-sm text-accent font-medium">{csvName} — listo para analizar</p> : <p className="text-sm text-muted">Clic para subir CSV de Meta Business Suite o LinkedIn Analytics</p>}
      </div>
      <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
      <button onClick={analyze} disabled={loading || !csvContent || !brandId}
        className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-40">
        {loading ? <><Loader2 size={14} className="animate-spin" /> Analizando...</> : <><BarChart3 size={14} /> Analizar con IA</>}
      </button>
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs text-success font-medium flex items-center gap-1"><CheckCircle2 size={12} /> Análisis guardado — {result.raw_rows} filas procesadas</p>
          <p className="text-xs text-green-700 mt-1">Calidad de datos: <strong>{result.insights.data_quality}</strong> · Mejor día: <strong>{result.insights.best_day_of_week}</strong></p>
        </div>
      )}
    </div>
  )
}

// ─── Apify Instagram fetcher ──────────────────────────────────────────────────

function ApifyInstagram({ brands }: { brands: Brand[] }) {
  const [brandId,  setBrandId]  = useState(brands[0]?.id ?? '')
  const [username, setUsername] = useState('')
  const [days,     setDays]     = useState(30)
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<InstagramAccountMetrics | null>(null)
  const [error,    setError]    = useState('')

  async function fetch_() {
    if (!username.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/metrics/apify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'instagram', username: username.trim(), period_days: days }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al obtener métricas'); return }
      setResult(data.metrics)
    } catch { setError('Error de red.') }
    finally { setLoading(false) }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-medium text-ink flex items-center gap-2">
        <Instagram size={15} className="text-pink-500" /> Instagram Orgánico (vía Apify)
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <select value={brandId} onChange={e => setBrandId(e.target.value)} className="border border-border rounded px-3 py-2 text-sm bg-paper outline-none focus:border-accent">
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <div className="flex items-center gap-2 border border-border rounded px-3 py-2">
          <span className="text-muted text-sm">@</span>
          <input value={username} onChange={e => setUsername(e.target.value.replace('@',''))} placeholder="usuario"
            className="flex-1 text-sm outline-none bg-transparent" />
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))} className="border border-border rounded px-3 py-2 text-sm bg-paper outline-none focus:border-accent">
          <option value={7}>Últimos 7 días</option>
          <option value={30}>Últimos 30 días</option>
          <option value={60}>Últimos 60 días</option>
          <option value={90}>Últimos 90 días</option>
        </select>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
      <button onClick={fetch_} disabled={loading || !username.trim()}
        className="flex items-center gap-2 bg-pink-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-pink-600 transition-colors disabled:opacity-40">
        {loading ? <><Loader2 size={14} className="animate-spin" /> Obteniendo datos...</> : <><TrendingUp size={14} /> Obtener métricas</>}
      </button>

      {result && (
        <div className="space-y-4 fade-up">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Posts', value: result.posts_count },
              { label: 'Likes promedio', value: result.avg_likes.toLocaleString() },
              { label: 'Comentarios prom.', value: result.avg_comments.toLocaleString() },
              { label: 'Views promedio', value: result.avg_views?.toLocaleString() ?? 'N/A' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-paper border border-border rounded-lg p-3 text-center">
                <p className="text-xs text-muted mb-1">{label}</p>
                <p className="font-display text-xl text-ink">{value}</p>
              </div>
            ))}
          </div>

          {/* Formats */}
          <div className="bg-paper border border-border rounded-lg p-4">
            <p className="text-xs text-muted uppercase tracking-wider mb-2">Formatos</p>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(result.format_breakdown).map(([type, count]) => (
                <span key={type} className="text-xs bg-card border border-border rounded px-2 py-1">
                  <strong>{type}</strong>: {count} posts
                </span>
              ))}
            </div>
          </div>

          {/* Top hooks */}
          {result.top_hooks.length > 0 && (
            <div className="bg-paper border border-border rounded-lg p-4">
              <p className="text-xs text-muted uppercase tracking-wider mb-2 flex items-center gap-1"><Star size={11} /> Hooks de los top posts</p>
              {result.top_hooks.map((hook, i) => (
                <p key={i} className="text-xs text-ink border-l-2 border-accent pl-3 py-1 mb-1 italic">"{hook}"</p>
              ))}
            </div>
          )}

          {/* Top posts */}
          <div>
            <p className="text-xs text-muted uppercase tracking-wider mb-2 flex items-center gap-1"><Eye size={11} /> Top 5 posts del período</p>
            <div className="space-y-2">
              {result.top_posts.slice(0, 5).map((post, i) => (
                <div key={i} className="bg-card border border-border rounded-lg px-4 py-3 flex items-start gap-3">
                  <span className="text-xs font-mono text-muted w-4 shrink-0">#{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded">{post.type}</span>
                      <span className="text-xs text-muted">{new Date(post.timestamp).toLocaleDateString('es-AR')}</span>
                      <span className="text-xs font-medium text-ink ml-auto">Score: {Math.round(post.score)}</span>
                    </div>
                    <p className="text-xs text-ink/80 line-clamp-2">{post.caption?.slice(0, 150)}</p>
                    <div className="flex gap-3 mt-1 text-xs text-muted">
                      <span>❤️ {post.likes.toLocaleString()}</span>
                      <span>💬 {post.comments}</span>
                      {post.views && <span>👁 {post.views.toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Apify Meta Ads ───────────────────────────────────────────────────────────

function ApifyMetaAds({ brands }: { brands: Brand[] }) {
  const [brandId,   setBrandId]   = useState(brands[0]?.id ?? '')
  const [pageName,  setPageName]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [result,    setResult]    = useState<null | { new_ads: {body_text:string}[]; active_ads: {body_text:string}[]; main_messages: string[]; creative_formats: string[]; cta_patterns: string[] }>(null)
  const [error,     setError]     = useState('')

  async function fetch_() {
    if (!pageName.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/metrics/apify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'meta_ads', page_name: pageName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error'); return }
      setResult(data.data)
    } catch { setError('Error de red.') }
    finally { setLoading(false) }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-medium text-ink flex items-center gap-2">
        <TrendingUp size={15} className="text-blue-500" /> Meta Ad Library (vía Apify)
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <select value={brandId} onChange={e => setBrandId(e.target.value)} className="border border-border rounded px-3 py-2 text-sm bg-paper outline-none focus:border-accent">
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input value={pageName} onChange={e => setPageName(e.target.value)} placeholder="Nombre de la página en Facebook"
          className="border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent bg-paper" />
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
      <button onClick={fetch_} disabled={loading || !pageName.trim()}
        className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-40">
        {loading ? <><Loader2 size={14} className="animate-spin" /> Buscando ads...</> : <><TrendingUp size={14} /> Analizar ads activos</>}
      </button>
      {result && (
        <div className="space-y-3 fade-up">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-paper border border-border rounded-lg p-3 text-center">
              <p className="text-xs text-muted mb-1">Ads activos</p>
              <p className="font-display text-3xl text-ink">{result.active_ads.length}</p>
            </div>
            <div className="bg-paper border border-border rounded-lg p-3 text-center">
              <p className="text-xs text-muted mb-1">Nuevos (7 días)</p>
              <p className="font-display text-3xl text-accent">{result.new_ads.length}</p>
            </div>
          </div>
          {result.main_messages.length > 0 && (
            <div className="bg-paper border border-border rounded-lg p-4">
              <p className="text-xs text-muted uppercase tracking-wider mb-2">Mensajes principales detectados</p>
              {result.main_messages.slice(0, 5).map((m, i) => (
                <p key={i} className="text-xs text-ink border-l-2 border-blue-400 pl-3 py-1 mb-1">"{m}"</p>
              ))}
            </div>
          )}
          {result.cta_patterns.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted">CTAs:</span>
              {result.cta_patterns.map((c, i) => <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{c}</span>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MetricsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [tab, setTab] = useState<'csv' | 'instagram' | 'meta'>('instagram')

  useEffect(() => { setBrands(getBrands()) }, [])

  if (brands.length === 0) return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8"><BarChart3 size={24} className="text-accent" /><h1 className="font-display text-3xl text-ink">Métricas</h1></div>
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
        <AlertCircle size={24} className="mx-auto mb-2 text-orange-400" />
        <p className="font-medium text-orange-800 mb-2">Primero configurá un cliente</p>
        <a href="/dashboard/brands" className="inline-block text-sm bg-accent text-white px-4 py-2 rounded hover:bg-orange-700 transition-colors">Ir a Clientes →</a>
      </div>
    </div>
  )

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-2"><BarChart3 size={24} className="text-accent" /><h1 className="font-display text-3xl text-ink">Métricas</h1></div>
      <p className="text-sm text-muted mb-8">
        Analizá el rendimiento de tus clientes y competidores. Requiere <code className="text-xs bg-ink/5 px-1 rounded">APIFY_TOKEN</code> en las variables de entorno para las fuentes en tiempo real.
      </p>

      <div className="flex gap-1 mb-6 bg-card border border-border rounded-lg p-1 w-fit">
        {[
          { key: 'instagram', label: 'Instagram', icon: <Instagram size={13} className="text-pink-500" /> },
          { key: 'meta',      label: 'Meta Ads',  icon: <TrendingUp size={13} className="text-blue-500" /> },
          { key: 'csv',       label: 'CSV Manual', icon: <Upload size={13} /> },
        ].map(({ key, label, icon }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-all font-medium ${tab === key ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}>
            {icon} {label}
          </button>
        ))}
      </div>

      {tab === 'instagram' && <ApifyInstagram brands={brands} />}
      {tab === 'meta'      && <ApifyMetaAds   brands={brands} />}
      {tab === 'csv'       && <CsvUploader    brands={brands} />}
    </div>
  )
}
