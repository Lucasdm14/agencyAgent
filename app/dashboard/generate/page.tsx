'use client'

import { useState, useEffect, useRef } from 'react'
import { Zap, Upload, Loader2, CheckCircle2, ImagePlus, Info, Database, Bot, ChevronDown } from 'lucide-react'
import type { Brand, Agent, Post } from '@/lib/types'
import { getBrands, getBrandAgents, addPost } from '@/lib/storage'

const PLATFORMS = ['instagram', 'linkedin', 'facebook', 'twitter', 'tiktok']

// ─── Agent selector dropdown ──────────────────────────────────────────────────

function AgentSelector({ agents, selectedId, onChange }: {
  agents:     Agent[]
  selectedId: string
  onChange:   (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = agents.find(a => a.id === selectedId)

  if (agents.length === 0) return (
    <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
      <Bot size={14} className="mt-0.5 shrink-0" />
      <span>
        Sin agentes para este cliente.{' '}
        <a href="/dashboard/agents" className="underline font-medium">Crear agente →</a>
        {' '}para orientar el copy a un segmento específico.
      </span>
    </div>
  )

  return (
    <div className="space-y-2 relative">
      <label className="text-xs text-muted uppercase tracking-wider">Agente (segmento)</label>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between border border-border rounded px-3 py-2.5 text-sm bg-paper hover:bg-white transition-colors outline-none focus:border-accent">
        <div className="flex items-center gap-2 text-left">
          <Bot size={14} className={selected ? 'text-accent' : 'text-muted'} />
          {selected ? (
            <div>
              <span className="font-medium text-ink">{selected.name}</span>
              {selected.description && (
                <span className="text-muted ml-2 text-xs">{selected.description}</span>
              )}
            </div>
          ) : (
            <span className="text-muted">Sin agente — copy genérico</span>
          )}
        </div>
        <ChevronDown size={14} className="text-muted shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {/* "No agent" option */}
          <button onClick={() => { onChange(''); setOpen(false) }}
            className={`w-full text-left px-4 py-3 text-sm hover:bg-paper transition-colors flex items-center gap-2
              ${!selectedId ? 'bg-paper font-medium' : ''}`}>
            <Bot size={14} className="text-muted" />
            <div>
              <span className="text-muted">Sin agente</span>
              <p className="text-xs text-muted/70 mt-0.5">Copy genérico, basado solo en el brandbook</p>
            </div>
          </button>
          <div className="border-t border-border" />
          {agents.map(a => (
            <button key={a.id} onClick={() => { onChange(a.id); setOpen(false) }}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-paper transition-colors
                ${selectedId === a.id ? 'bg-orange-50' : ''}`}>
              <div className="flex items-center gap-2">
                <Bot size={14} className="text-accent shrink-0" />
                <div>
                  <span className="font-medium text-ink">{a.name}</span>
                  {a.description && <span className="text-muted text-xs ml-2">{a.description}</span>}
                  <p className="text-xs text-muted/80 mt-0.5 truncate max-w-xs">{a.segment}</p>
                </div>
              </div>
              <div className="flex gap-1.5 mt-1.5 flex-wrap ml-5">
                <span className="text-xs font-mono bg-paper border border-border rounded px-1.5 py-0.5">{a.tone_voice}</span>
                <span className="text-xs bg-paper border border-border rounded px-1.5 py-0.5">{a.energy}</span>
                {a.platform_focus.slice(0, 2).map(p => (
                  <span key={p} className="text-xs text-accent bg-orange-50 px-1.5 py-0.5 rounded font-mono">{p}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GeneratePage() {
  const [brands,      setBrands]      = useState<Brand[]>([])
  const [brandId,     setBrandId]     = useState('')
  const [agents,      setAgents]      = useState<Agent[]>([])
  const [agentId,     setAgentId]     = useState('')
  const [platform,    setPlatform]    = useState('instagram')
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageName,   setImageName]   = useState('')
  const [loading,     setLoading]     = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [result,      setResult]      = useState<{
    score:   number
    context: { news_count: number; rss_count: number; competitor_ads_count: number; sources: string[] }
    agent?:  string
  } | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const stored = getBrands()
    setBrands(stored)
    if (stored.length > 0) {
      setBrandId(stored[0].id)
      const brandAgents = getBrandAgents(stored[0].id).filter(a => a.role === 'copy' || !a.role)
      setAgents(brandAgents)
    }
  }, [])

  // When brand changes, reload agents and reset agent selection
  function handleBrandChange(id: string) {
    setBrandId(id)
    setAgentId('')
    setAgents(getBrandAgents(id).filter(a => a.role === 'copy' || !a.role))
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('La imagen supera 10MB'); return }
    setImageName(file.name)
    const reader = new FileReader()
    reader.onload = () => setImageBase64(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function generate() {
    if (!brandId || !imageBase64 || !platform) return
    setLoading(true)
    setError('')
    setResult(null)

    const brand = brands.find(b => b.id === brandId)
    if (!brand) { setError('Marca no encontrada'); setLoading(false); return }
    const agent = agents.find(a => a.id === agentId) ?? null

    try {
      setLoadingStep('Buscando contexto real del sector...')
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand, image_base64: imageBase64, platform, agent }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al generar'); setLoading(false); return }

      setLoadingStep('Guardando en bandeja...')

      // FIX: context_used now includes competitor_ads_count
      const post: Post = {
        id:                  crypto.randomUUID(),
        brand_id:            brandId,
        brand_name:          brand.name,
        agent_id:            agent?.id,
        agent_name:          agent?.name,
        image_url:           imageBase64,
        platform,
        generated_copy:      data.creator.generated_copy,
        final_copy:          data.creator.generated_copy,
        hashtags:            data.creator.hashtags          ?? [],
        ai_rationale:        data.creator.rationale         ?? '',
        supervisor_score:    data.supervisor.score          ?? 5,
        supervisor_validation: data.supervisor.clause_validations ?? [],
        critical_violations: data.supervisor.critical_violations  ?? 0,
        suggested_fix:       data.supervisor.suggested_fix        ?? null,
        scheduled_date:      '',
        status:              (data.supervisor.critical_violations ?? 0) > 2 ? 'supervisor_review' : 'pm_review',
        context_used:        data.context,
        created_at:          new Date().toISOString(),
      }

      addPost(post)
      setResult({ score: post.supervisor_score, context: data.context, agent: agent?.name })
      setImageBase64(null)
      setImageName('')
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      setError('Error de red. Verificá tu conexión.')
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }

  const selectedBrand = brands.find(b => b.id === brandId)
  const hasContext = selectedBrand && (
    (selectedBrand.news_keywords?.length ?? 0) > 0 ||
    (selectedBrand.rss_feeds?.length     ?? 0) > 0 ||
    (selectedBrand.competitors?.length   ?? 0) > 0
  )

  return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-3 mb-8">
        <Zap size={24} className="text-accent" />
        <h1 className="font-display text-3xl text-ink">Generar Contenido</h1>
      </div>

      {brands.length === 0 ? (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
          <p className="font-medium text-orange-800 mb-2">Primero necesitás un cliente</p>
          <a href="/dashboard/brands"
            className="inline-block text-sm bg-accent text-white px-4 py-2 rounded hover:bg-orange-700 transition-colors">
            Ir a Clientes →
          </a>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">

          {/* Brand selector */}
          <div className="space-y-2">
            <label className="text-xs text-muted uppercase tracking-wider">Cliente</label>
            <select value={brandId} onChange={e => handleBrandChange(e.target.value)}
              className="w-full border border-border rounded px-3 py-2.5 text-sm bg-paper outline-none focus:border-accent">
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Agent selector */}
          <AgentSelector agents={agents} selectedId={agentId} onChange={setAgentId} />

          {/* Context indicator */}
          {selectedBrand && (
            <div className={`flex items-start gap-2 rounded-lg p-3 text-xs ${
              hasContext
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
            }`}>
              <Database size={14} className="mt-0.5 shrink-0" />
              <div>
                {hasContext ? (
                  <>
                    <span className="font-medium">Contexto real configurado</span>
                    <span className="ml-1">
                      — {[
                        (selectedBrand.news_keywords?.length ?? 0) > 0 && `${selectedBrand.news_keywords.length} keywords`,
                        (selectedBrand.rss_feeds?.length     ?? 0) > 0 && `${selectedBrand.rss_feeds.length} RSS feeds`,
                        (selectedBrand.competitors?.length   ?? 0) > 0 && `${selectedBrand.competitors.length} competidores`,
                      ].filter(Boolean).join(', ')}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-medium">Sin contexto de mercado</span>
                    <p className="mt-0.5">
                      Configurá keywords y competidores en el cliente para que la IA use datos reales.{' '}
                      <a href="/dashboard/brands" className="underline">Configurar →</a>
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Platform */}
          <div className="space-y-2">
            <label className="text-xs text-muted uppercase tracking-wider">Plataforma</label>
            <div className="flex gap-2 flex-wrap">
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => setPlatform(p)}
                  className={`text-xs px-3 py-1.5 rounded border transition-all font-mono
                    ${platform === p
                      ? 'bg-ink text-white border-ink'
                      : 'border-border text-muted hover:border-ink hover:text-ink'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Image upload */}
          <div className="space-y-2">
            <label className="text-xs text-muted uppercase tracking-wider">Imagen</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                ${imageBase64
                  ? 'border-accent bg-orange-50'
                  : 'border-border hover:border-accent/50 hover:bg-paper'}`}
            >
              {imageBase64 ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageBase64} alt="preview" className="max-h-40 mx-auto rounded-lg object-contain" />
                  <p className="text-xs text-accent font-medium">{imageName}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <ImagePlus size={32} className="mx-auto text-muted" />
                  <p className="text-sm text-muted">Clic para subir imagen</p>
                  <p className="text-xs text-muted">JPG, PNG, WebP hasta 10MB</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          {result && (
            <div className="space-y-2 fade-up">
              <div className="flex items-center gap-2 text-sm text-success bg-green-50 border border-green-200 rounded px-3 py-2">
                <CheckCircle2 size={16} />
                Post generado con score {result.score}/10.{result.agent ? ` Agente: ${result.agent}.` : ''} Revisalo en la Bandeja.
              </div>
              {result.context.sources.length > 0 && (
                <div className="flex items-start gap-2 text-xs bg-blue-50 border border-blue-200 rounded px-3 py-2 text-blue-800">
                  <Info size={13} className="mt-0.5 shrink-0" />
                  <span>
                    Contexto real: {result.context.news_count} noticias,{' '}
                    {result.context.rss_count} posts RSS,{' '}
                    {result.context.competitor_ads_count} avisos de competidores.
                    Fuentes: {result.context.sources.join(', ')}.
                  </span>
                </div>
              )}
            </div>
          )}

          <button onClick={generate} disabled={loading || !imageBase64 || !brandId}
            className="w-full flex items-center justify-center gap-2 bg-accent text-white py-3 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-40">
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Generando...</>
              : <><Zap size={16} /> Generar Copy{agentId && agents.find(a => a.id === agentId) ? ` — ${agents.find(a => a.id === agentId)!.name}` : ''}</>
            }
          </button>
          {loading && (
            <p className="text-xs text-center text-muted animate-pulse">{loadingStep}</p>
          )}
        </div>
      )}
    </div>
  )
}
