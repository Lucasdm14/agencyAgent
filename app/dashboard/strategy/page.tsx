'use client'

import { useState, useEffect } from 'react'
import {
  Sparkles, Loader2, Bot, ChevronDown, AlertCircle, CheckCircle2, Database,
} from 'lucide-react'
import type { Brand, Agent, ContentStrategy, StrategyPost, MetricsReport } from '@/lib/types'
import { getBrands, getBrandAgents, getMetricsReports, addStrategy } from '@/lib/storage'

const CONTENT_TYPE_COLOR: Record<string, string> = {
  informativo: 'bg-blue-50  text-blue-700  border-blue-200',
  producto:    'bg-orange-50 text-orange-700 border-orange-200',
  comunidad:   'bg-green-50 text-green-700  border-green-200',
  educativo:   'bg-purple-50 text-purple-700 border-purple-200',
  tendencia:   'bg-pink-50  text-pink-700   border-pink-200',
}

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function AgentSelector({ agents, selectedId, onChange }: {
  agents:     Agent[]
  selectedId: string
  onChange:   (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = agents.find(a => a.id === selectedId)

  return (
    <div className="space-y-2 relative">
      <label className="text-xs text-muted uppercase tracking-wider">Agente (opcional)</label>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between border border-border rounded px-3 py-2.5 text-sm bg-paper hover:bg-white transition-colors outline-none focus:border-accent">
        <div className="flex items-center gap-2">
          <Bot size={14} className={selected ? 'text-accent' : 'text-muted'} />
          {selected ? (
            <span className="font-medium text-ink">{selected.name}
              <span className="text-muted font-normal ml-2 text-xs">{selected.description}</span>
            </span>
          ) : (
            <span className="text-muted">Sin agente — plan genérico</span>
          )}
        </div>
        <ChevronDown size={14} className="text-muted shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          <button onClick={() => { onChange(''); setOpen(false) }}
            className="w-full text-left px-4 py-3 text-sm hover:bg-paper transition-colors text-muted">
            Sin agente — plan genérico de la marca
          </button>
          <div className="border-t border-border" />
          {agents.map(a => (
            <button key={a.id} onClick={() => { onChange(a.id); setOpen(false) }}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-paper transition-colors
                ${selectedId === a.id ? 'bg-orange-50' : ''}`}>
              <span className="font-medium">{a.name}</span>
              <p className="text-xs text-muted mt-0.5 truncate">{a.segment}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function StrategyPage() {
  const [brands,         setBrands]         = useState<Brand[]>([])
  const [brandId,        setBrandId]        = useState('')
  const [agents,         setAgents]         = useState<Agent[]>([])
  const [agentId,        setAgentId]        = useState('')
  const [metricsReports, setMetricsReports] = useState<MetricsReport[]>([])
  const [metricsId,      setMetricsId]      = useState('')

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year,  setYear]  = useState(now.getFullYear())

  const [loading, setLoading] = useState(false)
  const [plan,    setPlan]    = useState<ContentStrategy | null>(null)
  const [error,   setError]   = useState('')

  useEffect(() => {
    const allBrands = getBrands()
    setBrands(allBrands)
    if (allBrands.length > 0) {
      setBrandId(allBrands[0].id)
      setAgents(getBrandAgents(allBrands[0].id))
    }
    setMetricsReports(getMetricsReports())
  }, [])

  function handleBrandChange(id: string) {
    setBrandId(id)
    setAgentId('')
    setAgents(getBrandAgents(id))
  }

  async function generate() {
    if (!brandId) return
    setLoading(true)
    setError('')
    setPlan(null)

    const brand  = brands.find(b => b.id === brandId)
    const agent  = agents.find(a => a.id === agentId) ?? null
    const period = `${MONTHS[month]} ${year}`
    const metricsReport = metricsReports.find(r => r.id === metricsId) ?? null

    if (!brand) { setError('Marca no encontrada'); setLoading(false); return }

    try {
      const res = await fetch('/api/strategy', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ brand, period, metrics_report: metricsReport, agent }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al generar estrategia')
        return
      }

      const strategy: ContentStrategy = {
        id:           crypto.randomUUID(),
        brand_id:     brandId,
        brand_name:   brand.name,
        agent_id:     agent?.id,
        agent_name:   agent?.name,
        period,
        created_at:   new Date().toISOString(),
        data_sources: data.data_sources,
        posts:        data.posts,
        pillars:      data.pillars,
        disclaimer:   data.disclaimer,
      }

      addStrategy(strategy)
      setPlan(strategy)
    } catch {
      setError('Error de red.')
    } finally {
      setLoading(false)
    }
  }

  const brandMetrics = metricsReports.filter(r => r.brand_id === brandId)

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-2">
        <Sparkles size={24} className="text-accent" />
        <h1 className="font-display text-3xl text-ink">Estrategia de Contenido</h1>
      </div>
      <p className="text-sm text-muted mb-8">
        Plan mensual generado desde datos reales de mercado. Cada post tiene justificación basada en noticias, RSS o análisis competitivo.
      </p>

      {brands.length === 0 ? (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
          <AlertCircle size={24} className="mx-auto mb-2 text-orange-400" />
          <p className="font-medium text-orange-800 mb-2">Primero configurá un cliente</p>
          <a href="/dashboard/brands"
            className="inline-block text-sm bg-accent text-white px-4 py-2 rounded hover:bg-orange-700 transition-colors">
            Ir a Clientes →
          </a>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Config panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              {/* Brand */}
              <div className="space-y-2">
                <label className="text-xs text-muted uppercase tracking-wider">Cliente</label>
                <select value={brandId} onChange={e => handleBrandChange(e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 text-sm bg-paper outline-none focus:border-accent">
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              {/* Agent */}
              <AgentSelector agents={agents} selectedId={agentId} onChange={setAgentId} />

              {/* Period */}
              <div className="space-y-2">
                <label className="text-xs text-muted uppercase tracking-wider">Período</label>
                <div className="grid grid-cols-2 gap-2">
                  <select value={month} onChange={e => setMonth(Number(e.target.value))}
                    className="border border-border rounded px-3 py-2 text-sm bg-paper outline-none focus:border-accent">
                    {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                  <select value={year} onChange={e => setYear(Number(e.target.value))}
                    className="border border-border rounded px-3 py-2 text-sm bg-paper outline-none focus:border-accent">
                    {[now.getFullYear(), now.getFullYear() + 1].map(y =>
                      <option key={y} value={y}>{y}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Metrics (optional) */}
              {brandMetrics.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs text-muted uppercase tracking-wider">
                    Métricas históricas (opcional)
                  </label>
                  <select value={metricsId} onChange={e => setMetricsId(e.target.value)}
                    className="w-full border border-border rounded px-3 py-2 text-sm bg-paper outline-none focus:border-accent">
                    <option value="">Sin métricas</option>
                    {brandMetrics.map(r => (
                      <option key={r.id} value={r.id}>{r.platform} — {r.period}</option>
                    ))}
                  </select>
                </div>
              )}

              <button onClick={generate} disabled={loading || !brandId}
                className="w-full flex items-center justify-center gap-2 bg-accent text-white py-2.5 rounded text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-40">
                {loading
                  ? <><Loader2 size={15} className="animate-spin" /> Generando...</>
                  : <><Sparkles size={15} /> Generar plan</>
                }
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-2">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* Plan */}
          <div className="lg:col-span-2">
            {!plan && !loading && (
              <div className="flex flex-col items-center justify-center h-full min-h-64 text-muted border-2 border-dashed border-border rounded-xl">
                <Sparkles size={32} className="mb-3 opacity-30" />
                <p className="text-sm">Seleccioná un cliente y generá el plan</p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center h-full min-h-64 text-muted">
                <Loader2 size={32} className="animate-spin mb-3 text-accent" />
                <p className="text-sm">Buscando datos del mercado y construyendo el plan...</p>
              </div>
            )}

            {plan && (
              <div className="space-y-5 fade-up">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-xl text-ink">{plan.period}</h2>
                    <p className="text-xs text-muted mt-0.5">{plan.brand_name}
                      {plan.agent_name && <span className="text-accent ml-2">· Agente: {plan.agent_name}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-success" />
                    <span className="text-xs font-medium text-success">{plan.posts.length} posts</span>
                  </div>
                </div>

                {/* Data sources badge */}
                {plan.data_sources.length > 0 && (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    <Database size={13} className="text-blue-400" />
                    <span className="text-xs text-blue-700">
                      Generado con: {plan.data_sources.join(' · ')}
                    </span>
                  </div>
                )}

                {/* Pillars */}
                {plan.pillars.length > 0 && (
                  <div>
                    <p className="text-xs text-muted uppercase tracking-wider mb-2">Pilares</p>
                    <div className="flex flex-wrap gap-2">
                      {plan.pillars.map((p, i) => (
                        <span key={i} className="text-xs bg-ink/5 text-ink/70 px-3 py-1 rounded-full border border-border">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Posts list */}
                <div className="space-y-3">
                  {plan.posts
                    .sort((a, b) => a.day - b.day)
                    .map((post: StrategyPost, i: number) => (
                      <div key={i} className="bg-card border border-border rounded-lg p-4 hover:border-accent/30 transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono bg-ink/5 text-ink/60 px-2 py-0.5 rounded">
                              Día {post.day}
                            </span>
                            <span className="text-xs font-mono text-accent bg-orange-50 px-2 py-0.5 rounded">
                              {post.platform}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded border ${CONTENT_TYPE_COLOR[post.content_type] ?? 'bg-paper border-border text-muted'}`}>
                              {post.content_type}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-ink mb-1">{post.topic}</p>
                        <p className="text-xs text-muted italic mb-2">"{post.hook_suggestion}"</p>
                        <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded px-2 py-1">
                          📎 {post.source_reference}
                        </p>
                      </div>
                    ))}
                </div>

                {/* Disclaimer */}
                {plan.disclaimer && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs text-yellow-800">⚠️ {plan.disclaimer}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
