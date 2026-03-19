'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp, Loader2, AlertCircle, CheckCircle2,
  ChevronDown, ChevronUp, RefreshCw, Database, Target, ShieldAlert,
} from 'lucide-react'
import type { Brand, CompetitorHandle, CompetitorAnalysis, RealContext } from '@/lib/types'
import { getCompetitorAnalyses, addCompetitorAnalysis } from '@/lib/storage'
import { useBrand } from '@/lib/hooks/useBrand'

const CONFIDENCE_COLOR = {
  high:   'text-success bg-green-50 border-green-200',
  medium: 'text-warning bg-yellow-50 border-yellow-200',
  low:    'text-red-600 bg-red-50 border-red-200',
}

function DataBadge({ label, count, active }: { label: string; count: number; active: boolean }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-mono ${
      active && count > 0
        ? 'bg-green-50 text-green-800 border-green-200'
        : 'bg-paper text-muted border-border'
    }`}>
      {active && count > 0 ? '✓' : '○'} {label}: {count}
    </span>
  )
}

export default function CompetitorsPage() {
  const { brand, brands, selectBrand } = useBrand()
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorHandle | null>(null)
  const [analyses, setAnalyses] = useState<CompetitorAnalysis[]>([])
  const [fetching, setFetching] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [fetchSummary, setFetchSummary] = useState<{
    meta_ads_found: number
    news_found: number
    rss_found: number
    youtube_found: number
    has_any_data: boolean
  } | null>(null)
  const [realData, setRealData] = useState<RealContext | null>(null)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setAnalyses(getCompetitorAnalyses())
  }, [brand?.id])

  const competitors = brand?.competitors ?? []

  async function fetchData() {
    if (!selectedCompetitor || !brand) return
    setFetching(true)
    setError('')
    setFetchSummary(null)
    setRealData(null)

    try {
      const res = await fetch('/api/competitor/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitor: selectedCompetitor,
          keywords: brand.news_keywords ?? [],
          rss_feeds: brand.rss_feeds ?? [],
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al buscar datos'); return }
      setFetchSummary(data.summary)
      setRealData(data.context)
    } finally {
      setFetching(false)
    }
  }

  async function runAnalysis() {
    if (!selectedCompetitor || !brand || !realData) return
    setAnalyzing(true)
    setError('')

    try {
      const res = await fetch('/api/competitor/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitor_name: selectedCompetitor.name,
          brand_name: brand.name,
          real_data: realData,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al analizar'); return }

      const analysis: CompetitorAnalysis = {
        id: crypto.randomUUID(),
        brand_id: brand?.id ?? '',
        brand_name: brand.name,
        competitor_name: selectedCompetitor.name,
        analyzed_at: new Date().toISOString(),
        raw_data: realData,
        insights: data.insights,
      }
      addCompetitorAnalysis(analysis)
      setAnalyses(getCompetitorAnalyses())
      setExpandedId(analysis.id)
    } finally {
      setAnalyzing(false)
    }
  }

  const filteredAnalyses = analyses.filter(a => a.brand_id === brand?.id)

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <TrendingUp size={24} className="text-accent" />
        <h1 className="font-display text-3xl text-ink">Inteligencia Competitiva</h1>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex gap-3">
        <Database size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <strong>Anti-alucinación activo.</strong> El análisis se basa ÚNICAMENTE en datos reales fetched de APIs —
          Meta Ad Library, NewsAPI y YouTube. La IA no puede inventar datos que no estén en el resultado.
          Si una fuente no tiene datos, lo dice explícitamente.
        </div>
      </div>

      {/* Brand selector */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-muted uppercase tracking-wider">Cliente</label>
            <select value={brand?.id ?? ''} onChange={e => { selectBrand(e.target.value); setSelectedCompetitor(null); setFetchSummary(null); setRealData(null) }}
              className="w-full border border-border rounded px-3 py-2.5 text-sm bg-paper outline-none focus:border-accent">
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted uppercase tracking-wider">Competidor a analizar</label>
            <select
              value={selectedCompetitor?.name ?? ''}
              onChange={e => {
                const c = competitors.find(x => x.name === e.target.value) ?? null
                setSelectedCompetitor(c)
                setFetchSummary(null)
                setRealData(null)
              }}
              className="w-full border border-border rounded px-3 py-2.5 text-sm bg-paper outline-none focus:border-accent">
              <option value="">Seleccioná un competidor</option>
              {competitors.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {competitors.length === 0 && (
          <p className="text-xs text-muted bg-yellow-50 border border-yellow-200 rounded p-3">
            No hay competidores configurados para este cliente.{' '}
            <a href="/dashboard/brands" className="text-accent hover:underline">Ir a Clientes →</a>
          </p>
        )}

        {selectedCompetitor && (
          <div className="flex flex-wrap gap-2">
            <DataBadge label="Meta Ads" count={fetchSummary?.meta_ads_found ?? 0} active={!!selectedCompetitor.facebook_page_name} />
            <DataBadge label="YouTube" count={fetchSummary?.youtube_found ?? 0} active={!!selectedCompetitor.youtube_channel} />
            <DataBadge label="Noticias" count={fetchSummary?.news_found ?? 0} active={true} />
            <DataBadge label="RSS" count={fetchSummary?.rss_found ?? 0} active={!!selectedCompetitor.website_url} />
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={fetchData}
            disabled={fetching || !selectedCompetitor}
            className="flex items-center gap-2 text-sm border border-border rounded px-4 py-2 hover:bg-paper transition-colors disabled:opacity-40">
            {fetching ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
            {fetching ? 'Buscando datos reales...' : '1. Buscar datos reales'}
          </button>

          <button
            onClick={runAnalysis}
            disabled={analyzing || !realData || !fetchSummary?.has_any_data}
            className="flex items-center gap-2 text-sm bg-accent text-white rounded px-4 py-2 hover:bg-orange-700 transition-colors disabled:opacity-40">
            {analyzing ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
            {analyzing ? 'Analizando...' : '2. Analizar con IA'}
          </button>
        </div>

        {fetchSummary && !fetchSummary.has_any_data && (
          <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-3">
            No se encontraron datos para este competidor. Verificá que el Facebook Page Name, canal de YouTube o keywords estén correctamente configurados.
          </p>
        )}

        {fetching && (
          <p className="text-xs text-muted animate-pulse">
            Consultando Meta Ad Library · NewsAPI · YouTube en paralelo...
          </p>
        )}
      </div>

      {/* Past analyses */}
      <div className="space-y-4">
        <h2 className="font-display text-xl text-ink">Análisis anteriores</h2>

        {filteredAnalyses.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <TrendingUp size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aún no hay análisis para este cliente.</p>
          </div>
        ) : (
          filteredAnalyses.map(a => {
            const expanded = expandedId === a.id
            const conf = a.insights.confidence
            return (
              <div key={a.id} className="bg-card border border-border rounded-xl overflow-hidden fade-up">
                {/* Header */}
                <button
                  onClick={() => setExpandedId(expanded ? null : a.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-paper transition-colors">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-ink text-left">{a.competitor_name}</p>
                      <p className="text-xs text-muted">
                        {new Date(a.analyzed_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${CONFIDENCE_COLOR[conf]}`}>
                      Confianza: {conf}
                    </span>
                    <span className="text-xs text-muted">
                      {a.insights.active_ads_count} avisos · {a.raw_data.youtube_videos.length} videos · {a.raw_data.news.length} noticias
                    </span>
                  </div>
                  {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {expanded && (
                  <div className="px-5 pb-5 space-y-5 border-t border-border pt-4">
                    {/* Disclaimer */}
                    <p className="text-xs bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-800">
                      ⚠️ {a.insights.disclaimer}
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Opportunities */}
                      <div className="space-y-2">
                        <h3 className="text-xs font-medium text-muted uppercase tracking-wider flex items-center gap-1.5">
                          <Target size={12} /> Oportunidades detectadas
                        </h3>
                        {a.insights.differentiation_opportunities.length > 0 ? (
                          <ul className="space-y-1">
                            {a.insights.differentiation_opportunities.map((o, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 size={13} className="text-success mt-0.5 shrink-0" />
                                {o}
                              </li>
                            ))}
                          </ul>
                        ) : <p className="text-xs text-muted">Sin datos suficientes para detectar oportunidades.</p>}
                      </div>

                      {/* Topics to avoid */}
                      <div className="space-y-2">
                        <h3 className="text-xs font-medium text-muted uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldAlert size={12} /> Temas ya saturados por el competidor
                        </h3>
                        {a.insights.topics_to_avoid.length > 0 ? (
                          <ul className="space-y-1">
                            {a.insights.topics_to_avoid.map((t, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <AlertCircle size={13} className="text-orange-500 mt-0.5 shrink-0" />
                                {t}
                              </li>
                            ))}
                          </ul>
                        ) : <p className="text-xs text-muted">Sin datos.</p>}
                      </div>
                    </div>

                    {/* Main messages from ads */}
                    {a.insights.main_messages.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-medium text-muted uppercase tracking-wider">
                          Mensajes principales detectados en sus avisos
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {a.insights.main_messages.map((m, i) => (
                            <span key={i} className="text-xs bg-paper border border-border rounded px-2 py-1">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended angles */}
                    {a.insights.recommended_angles.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-medium text-muted uppercase tracking-wider">
                          Ángulos recomendados para {a.brand_name}
                        </h3>
                        <ul className="space-y-1">
                          {a.insights.recommended_angles.map((r, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-accent font-mono mt-0.5">→</span> {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted border-t border-border pt-3">
                      <Database size={11} />
                      Fuentes: {a.insights.data_sources_used.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
