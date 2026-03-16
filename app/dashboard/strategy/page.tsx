'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Sparkles, Loader2, Bot, AlertCircle, CheckCircle2,
  ChevronRight, ChevronLeft, RefreshCw, Star, ThumbsUp, ThumbsDown,
  Calendar, Clock, ArrowRight, X,
} from 'lucide-react'
import type {
  Brand, Agent, StrategySession, StrategyPostWithCopies, CopyOption, SupervisorReport,
} from '@/lib/types'
import {
  getBrands, getBrandAgentsByRole, getStrategySession,
  saveStrategySession, clearStrategySession,
} from '@/lib/storage'

// ─── helpers ──────────────────────────────────────────────────────────────────

const CONTENT_COLOR: Record<string, string> = {
  informativo: 'bg-blue-50 text-blue-700 border-blue-200',
  producto:    'bg-orange-50 text-orange-700 border-orange-200',
  comunidad:   'bg-green-50 text-green-700 border-green-200',
  educativo:   'bg-purple-50 text-purple-700 border-purple-200',
  tendencia:   'bg-pink-50 text-pink-700 border-pink-200',
}

function AgentPill({ agent, onClick, selected }: { agent: Agent; onClick: () => void; selected: boolean }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${selected ? 'border-accent bg-orange-50' : 'border-border bg-paper hover:border-accent/40'}`}>
      <div className="flex items-center gap-2">
        <Bot size={14} className={selected ? 'text-accent' : 'text-muted'} />
        <span className="font-medium text-sm">{agent.name}</span>
        {selected && <CheckCircle2 size={13} className="text-accent ml-auto" />}
      </div>
      {agent.description && <p className="text-xs text-muted mt-1 ml-5">{agent.description}</p>}
      {agent.segment     && <p className="text-xs text-muted/70 mt-0.5 ml-5 truncate">{agent.segment}</p>}
    </button>
  )
}

// ─── Step 1 — Configure ───────────────────────────────────────────────────────

function Step1Config({ onNext }: { onNext: (cfg: { brand: Brand; estratega: Agent; copyAgent: Agent; supervisor: Agent; numDays: number; periodLabel: string }) => void }) {
  const [brands,      setBrands]      = useState<Brand[]>([])
  const [brandId,     setBrandId]     = useState('')
  const [estrategas,  setEstrategas]  = useState<Agent[]>([])
  const [copyAgents,  setCopyAgents]  = useState<Agent[]>([])
  const [supervisors, setSupervisors] = useState<Agent[]>([])
  const [estrategaId, setEstrategaId] = useState('')
  const [copyId,      setCopyId]      = useState('')
  const [supervisorId, setSupervisorId] = useState('')
  const [numDays,     setNumDays]     = useState(15)
  const [periodLabel, setPeriodLabel] = useState('')

  useEffect(() => {
    const all = getBrands()
    setBrands(all)
    if (all.length > 0) loadBrandAgents(all[0].id)
  }, [])

  function loadBrandAgents(id: string) {
    setBrandId(id)
    const e = getBrandAgentsByRole(id, 'estratega')
    const c = getBrandAgentsByRole(id, 'copy')
    const s = getBrandAgentsByRole(id, 'supervisor')
    setEstrategas(e);  setEstrategaId(e[0]?.id ?? '')
    setCopyAgents(c);  setCopyId(c[0]?.id ?? '')
    setSupervisors(s); setSupervisorId(s[0]?.id ?? '')
  }

  function go() {
    const brand      = brands.find(b => b.id === brandId)
    const estratega  = estrategas.find(a => a.id === estrategaId)
    const copyAgent  = copyAgents.find(a => a.id === copyId)
    const supervisor = supervisors.find(a => a.id === supervisorId)
    if (!brand || !estratega || !copyAgent || !supervisor || !numDays) return
    const label = periodLabel.trim() || `Plan de ${numDays} días`
    onNext({ brand, estratega, copyAgent, supervisor, numDays, periodLabel: label })
  }

  const missing = !estrategas.length || !copyAgents.length || !supervisors.length

  return (
    <div className="max-w-2xl space-y-6">
      {/* Brand */}
      <div className="space-y-2">
        <label className="text-xs text-muted uppercase tracking-wider">Cliente</label>
        <select value={brandId} onChange={e => loadBrandAgents(e.target.value)}
          className="w-full border border-border rounded px-3 py-2.5 text-sm bg-paper outline-none focus:border-accent">
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {missing && brandId && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-3">
          <AlertCircle size={16} className="text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-800">Faltan agentes configurados</p>
            <p className="text-xs text-orange-700 mt-0.5">
              Para usar Estrategia necesitás al menos 1 agente de cada rol: Estratega, Copy y Supervisor.{' '}
              <a href="/dashboard/agents" className="underline font-medium">Configurar agentes →</a>
            </p>
            <div className="mt-2 flex gap-3 text-xs text-orange-600">
              {!estrategas.length && <span>✗ Sin estratega</span>}
              {!copyAgents.length  && <span>✗ Sin agente de copy</span>}
              {!supervisors.length && <span>✗ Sin supervisor</span>}
            </div>
          </div>
        </div>
      )}

      {!missing && brandId && (
        <>
          {/* Agent selectors */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-muted uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={11} /> Estratega
              </label>
              {estrategas.map(a => <AgentPill key={a.id} agent={a} selected={estrategaId === a.id} onClick={() => setEstrategaId(a.id)} />)}
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted uppercase tracking-wider flex items-center gap-1">
                <Bot size={11} /> Agente de Copy
              </label>
              {copyAgents.map(a => <AgentPill key={a.id} agent={a} selected={copyId === a.id} onClick={() => setCopyId(a.id)} />)}
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={11} /> Supervisor
              </label>
              {supervisors.map(a => <AgentPill key={a.id} agent={a} selected={supervisorId === a.id} onClick={() => setSupervisorId(a.id)} />)}
            </div>
          </div>

          {/* Days + label */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-muted uppercase tracking-wider">
                Cantidad de días
                <span className="ml-2 text-accent font-mono">{numDays}</span>
              </label>
              <input type="range" min={1} max={30} value={numDays} onChange={e => setNumDays(Number(e.target.value))}
                className="w-full accent-[#E8440A]" />
              <div className="flex justify-between text-xs text-muted">
                <span>1 día</span><span>30 días</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted uppercase tracking-wider">Nombre del período (opcional)</label>
              <input value={periodLabel} onChange={e => setPeriodLabel(e.target.value)}
                placeholder={`Plan de ${numDays} días`}
                className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent bg-paper" />
            </div>
          </div>

          <button onClick={go}
            disabled={!estrategaId || !copyId || !supervisorId}
            className="flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-40">
            <Sparkles size={16} /> Generar plan con Estratega
            <ChevronRight size={16} />
          </button>
        </>
      )}
    </div>
  )
}

// ─── Step 2 — Review plan ─────────────────────────────────────────────────────

function Step2Plan({ session, onApprove, onRegenerate, loading }: {
  session:      StrategySession
  onApprove:    () => void
  onRegenerate: () => void
  loading:      boolean
}) {
  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-ink">{session.period_label}</h2>
          <p className="text-xs text-muted mt-0.5">
            {session.posts.length} posts · Estratega: {session.estratega_name}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onRegenerate} disabled={loading}
            className="flex items-center gap-1.5 text-xs border border-border rounded px-3 py-2 hover:bg-paper transition-colors">
            <RefreshCw size={12} /> Regenerar plan
          </button>
          <button onClick={onApprove} disabled={loading}
            className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-40">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Aprobar plan → generar copies
          </button>
        </div>
      </div>

      {session.strategy_rationale && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs text-blue-700 italic">💡 {session.strategy_rationale}</p>
        </div>
      )}

      {session.pillars.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {session.pillars.map((p, i) => (
            <span key={i} className="text-xs bg-ink/5 text-ink/70 px-3 py-1 rounded-full border border-border">{p}</span>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {session.posts.sort((a, b) => a.day - b.day).map((post, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-mono bg-ink/5 text-ink/60 px-2 py-0.5 rounded">Día {post.day}</span>
              <span className="text-xs font-mono text-accent bg-orange-50 px-2 py-0.5 rounded">{post.platform}</span>
              <span className={`text-xs px-2 py-0.5 rounded border ${CONTENT_COLOR[post.content_type] ?? 'bg-paper border-border text-muted'}`}>
                {post.content_type}
              </span>
            </div>
            <p className="text-sm font-medium text-ink">{post.topic}</p>
            <p className="text-xs text-muted italic mt-1">"{post.hook_suggestion}"</p>
            {post.visual_direction && (
              <p className="text-xs text-muted mt-1">🎨 {post.visual_direction}</p>
            )}
            <p className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1 mt-2">📎 {post.source_reference}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Step 3 — Pick copies ─────────────────────────────────────────────────────

function Step3Copies({ session, onUpdate, onApprove, loading }: {
  session:   StrategySession
  onUpdate:  (posts: StrategyPostWithCopies[]) => void
  onApprove: () => void
  loading:   boolean
}) {
  const total    = session.posts.length
  const done     = session.posts.filter(p => p.copies_done).length
  const selected = session.posts.filter(p => p.selected_copy_index !== undefined).length
  const allPicked = selected === total

  function pickCopy(postDay: number, index: number) {
    const updated = session.posts.map(p =>
      p.day === postDay ? { ...p, selected_copy_index: index } : p
    )
    onUpdate(updated)
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-ink">Elegí los copies</h2>
          <p className="text-xs text-muted mt-0.5">
            {done}/{total} posts procesados · {selected}/{total} copies elegidos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden w-32">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${(done/total)*100}%` }} />
          </div>
          <button onClick={onApprove} disabled={!allPicked || loading}
            className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-40">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Enviar al Supervisor
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {session.posts.sort((a, b) => a.day - b.day).map(post => (
          <div key={post.day} className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Post header */}
            <div className="px-5 py-3 bg-paper border-b border-border flex items-center gap-3">
              <span className="text-xs font-mono bg-ink/5 px-2 py-0.5 rounded">Día {post.day}</span>
              <span className="text-xs font-mono text-accent">{post.platform}</span>
              <span className="text-sm font-medium text-ink">{post.topic}</span>
              {post.selected_copy_index !== undefined && (
                <span className="ml-auto text-xs text-success flex items-center gap-1">
                  <CheckCircle2 size={12} /> Opción {post.selected_copy_index} elegida
                </span>
              )}
              {!post.copies_done && (
                <span className="ml-auto flex items-center gap-1 text-xs text-muted">
                  <Loader2 size={11} className="animate-spin" /> Generando...
                </span>
              )}
            </div>

            {/* Copy options */}
            {post.copies && post.copies.length > 0 && (
              <div className="grid md:grid-cols-3 divide-x divide-border">
                {post.copies.map(option => (
                  <div key={option.index}
                    className={`p-4 cursor-pointer transition-all hover:bg-orange-50/50 ${post.selected_copy_index === option.index ? 'bg-orange-50 border-l-2 border-accent' : ''}`}
                    onClick={() => pickCopy(post.day, option.index)}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-muted">Opción {option.index}</span>
                      <span className="text-xs bg-ink/5 text-ink/60 px-2 py-0.5 rounded">{option.angle}</span>
                    </div>
                    <p className="text-sm text-ink leading-relaxed mb-3">{option.copy}</p>
                    {option.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {option.hashtags.slice(0, 4).map((h, i) => (
                          <span key={i} className="text-xs text-accent font-mono">{h}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted italic">{option.rationale}</p>
                    <button
                      onClick={e => { e.stopPropagation(); pickCopy(post.day, option.index) }}
                      className={`mt-3 w-full text-xs py-1.5 rounded border transition-all ${post.selected_copy_index === option.index ? 'bg-accent text-white border-accent' : 'border-border hover:border-accent hover:text-accent'}`}>
                      {post.selected_copy_index === option.index ? '✓ Elegida' : 'Elegir esta'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Step 4 — Supervisor report ───────────────────────────────────────────────

function Step4Report({ session, onBack, onFinish, loading }: {
  session:  StrategySession
  onBack:   () => void
  onFinish: () => void
  loading:  boolean
}) {
  const report = session.supervisor_report
  if (!report) return null

  const scoreColor = report.overall_score >= 8 ? 'text-success' : report.overall_score >= 6 ? 'text-warning' : 'text-red-600'

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-ink">Reporte del Supervisor</h2>
          <p className="text-xs text-muted mt-0.5">{session.supervisor_name}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-xs border border-border rounded px-3 py-2 hover:bg-paper transition-colors">
            <ChevronLeft size={12} /> Volver a copies
          </button>
          <button onClick={onFinish} disabled={loading}
            className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-40">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Finalizar estrategia
          </button>
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 text-center">
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Score General</p>
          <p className={`font-display text-5xl font-bold ${scoreColor}`}>{report.overall_score}<span className="text-2xl text-muted">/10</span></p>
          <p className="text-xs text-muted mt-2">{report.approved ? '✓ Aprobado' : '⚠ Requiere mejoras'}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 text-center">
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Alineación con Marca</p>
          <p className={`font-display text-5xl font-bold text-accent`}>{report.brand_alignment}<span className="text-2xl text-muted">/10</span></p>
          <p className="text-xs text-muted mt-2">Brandbook + Prompt</p>
        </div>
      </div>

      {/* Strengths & weaknesses */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <ThumbsUp size={14} className="text-success" />
            <span className="text-sm font-medium text-success">Puntos fuertes</span>
          </div>
          {report.strengths.map((s, i) => (
            <p key={i} className="text-xs text-green-800">• {s}</p>
          ))}
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <ThumbsDown size={14} className="text-red-500" />
            <span className="text-sm font-medium text-red-700">Puntos débiles</span>
          </div>
          {report.weaknesses.map((w, i) => (
            <p key={i} className="text-xs text-red-700">• {w}</p>
          ))}
        </div>
      </div>

      {/* Improvements */}
      {report.improvements.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-medium text-blue-800 mb-2 flex items-center gap-1"><Star size={12} /> Mejoras accionables</p>
          {report.improvements.map((imp, i) => (
            <p key={i} className="text-xs text-blue-700">• {imp}</p>
          ))}
        </div>
      )}

      {/* Calendar suggestion */}
      {report.calendar_suggestion.length > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-wider mb-3 flex items-center gap-1">
            <Calendar size={12} /> Calendarización sugerida
          </p>
          <div className="space-y-2">
            {report.calendar_suggestion.slice(0, 8).map((c, i) => (
              <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-2.5">
                <span className="text-xs font-mono text-muted w-12">Día {c.day}</span>
                <span className="text-xs font-mono text-accent">{c.platform}</span>
                <span className="flex items-center gap-1 text-xs text-ink font-medium">
                  <Clock size={11} /> {c.recommended_time}
                </span>
                <span className="text-xs text-muted flex-1 truncate">{c.reasoning}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Post feedback */}
      {report.post_feedback.length > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-wider mb-3">Feedback por post</p>
          <div className="space-y-1.5">
            {report.post_feedback.map((f, i) => (
              <div key={i} className={`flex items-start gap-2 text-xs px-3 py-2 rounded ${f.passed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
                {f.passed ? <CheckCircle2 size={12} className="mt-0.5 shrink-0" /> : <X size={12} className="mt-0.5 shrink-0" />}
                <span><strong>Día {f.day}:</strong> {f.topic}{f.comment ? ` — ${f.comment}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const STEPS = ['Configurar', 'Plan', 'Copies', 'Supervisor']

export default function StrategyPage() {
  const [session, setSession] = useState<StrategySession | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    const saved = getStrategySession()
    if (saved) setSession(saved)
  }, [])

  function updateSession(updates: Partial<StrategySession>) {
    setSession(prev => {
      if (!prev) return prev
      const next = { ...prev, ...updates }
      saveStrategySession(next)
      return next
    })
  }

  // ── Step 1 → 2: generate plan ──────────────────────────────────────────────
  async function handleConfig(cfg: { brand: Brand; estratega: Agent; copyAgent: Agent; supervisor: Agent; numDays: number; periodLabel: string }) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/strategy/plan', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          brand:        cfg.brand,
          estratega:    cfg.estratega,
          num_days:     cfg.numDays,
          period_label: cfg.periodLabel,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al generar el plan'); return }

      const newSession: StrategySession = {
        id:                 crypto.randomUUID(),
        brand_id:           cfg.brand.id,
        brand_name:         cfg.brand.name,
        estratega_id:       cfg.estratega.id,
        estratega_name:     cfg.estratega.name,
        copy_agent_id:      cfg.copyAgent.id,
        copy_agent_name:    cfg.copyAgent.name,
        supervisor_id:      cfg.supervisor.id,
        supervisor_name:    cfg.supervisor.name,
        num_days:           cfg.numDays,
        period_label:       cfg.periodLabel,
        step:               2,
        pillars:            data.pillars ?? [],
        strategy_rationale: data.strategy_rationale ?? '',
        posts:              (data.posts ?? []).map((p: StrategySession['posts'][0]) => ({ ...p, copies_done: false })),
        created_at:         new Date().toISOString(),
      }
      saveStrategySession(newSession)
      setSession(newSession)
    } catch { setError('Error de red.') }
    finally { setLoading(false) }
  }

  // ── Step 2 → 3: approve plan, generate copies for all posts ───────────────
  const handleApprovePlan = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError('')

    const updated: StrategySession = { ...session, step: 3 }
    saveStrategySession(updated)
    setSession(updated)
    setLoading(false)

    // Generate copies for each post sequentially (avoid hammering API)
    const brand     = getBrands().find(b => b.id === session.brand_id)
    const copyAgent = getBrandAgentsByRole(session.brand_id, 'copy').find(a => a.id === session.copy_agent_id)
    if (!brand || !copyAgent) { setError('Marca o agente de copy no encontrado'); return }

    for (const post of session.posts) {
      try {
        const res = await fetch('/api/strategy/copies', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ brand, copy_agent: copyAgent, post }),
        })
        const data = await res.json()
        const copies: CopyOption[] = data.copies ?? []

        setSession(prev => {
          if (!prev) return prev
          const nextPosts = prev.posts.map(p =>
            p.day === post.day ? { ...p, copies, copies_done: true } : p
          )
          const next = { ...prev, posts: nextPosts }
          saveStrategySession(next)
          return next
        })
      } catch {
        setSession(prev => {
          if (!prev) return prev
          const nextPosts = prev.posts.map(p =>
            p.day === post.day ? { ...p, copies: [], copies_done: true } : p
          )
          const next = { ...prev, posts: nextPosts }
          saveStrategySession(next)
          return next
        })
      }
    }
  }, [session])

  // ── Step 3 → 4: send to supervisor ────────────────────────────────────────
  async function handleSendToSupervisor() {
    if (!session) return
    setLoading(true)
    setError('')
    try {
      const brand      = getBrands().find(b => b.id === session.brand_id)
      const supervisor = getBrandAgentsByRole(session.brand_id, 'supervisor').find(a => a.id === session.supervisor_id)
      if (!brand || !supervisor) { setError('Marca o supervisor no encontrado'); return }

      const res = await fetch('/api/strategy/review', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          brand, supervisor,
          posts:        session.posts,
          num_days:     session.num_days,
          period_label: session.period_label,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al generar reporte'); return }
      updateSession({ step: 4, supervisor_report: data.report })
    } catch { setError('Error de red.') }
    finally { setLoading(false) }
  }

  function handleFinish() {
    clearStrategySession()
    setSession(null)
  }

  const step = session?.step ?? 1

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Sparkles size={24} className="text-accent" />
        <h1 className="font-display text-3xl text-ink">Estrategia de Contenido</h1>
      </div>
      <p className="text-sm text-muted mb-8">
        Flujo en 4 pasos: Estratega genera el plan → Copy agent crea 3 opciones por post → PM elige → Supervisor evalúa y calendariza.
      </p>

      {/* Stepper */}
      <div className="flex items-center gap-0 mb-10 w-fit">
        {STEPS.map((label, i) => {
          const s     = i + 1
          const done  = s < step
          const active = s === step
          return (
            <div key={s} className="flex items-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${active ? 'bg-accent text-white font-medium' : done ? 'text-success' : 'text-muted'}`}>
                {done ? <CheckCircle2 size={14} /> : <span className="font-mono text-xs">{s}</span>}
                {label}
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight size={14} className={`mx-1 ${s < step ? 'text-success' : 'text-border'}`} />
              )}
            </div>
          )
        })}
        {session && (
          <button onClick={() => { clearStrategySession(); setSession(null) }}
            className="ml-6 text-xs text-muted hover:text-red-600 border border-border rounded px-2.5 py-1 hover:border-red-300 transition-colors flex items-center gap-1">
            <X size={11} /> Reiniciar
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex gap-2 max-w-2xl">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading && step === 1 && (
        <div className="flex items-center gap-3 text-muted py-8">
          <Loader2 size={20} className="animate-spin text-accent" />
          <span className="text-sm">El estratega está armando el plan...</span>
        </div>
      )}

      {step === 1 && !loading && (
        <Step1Config onNext={handleConfig} />
      )}

      {step === 2 && session && (
        <Step2Plan
          session={session}
          loading={loading}
          onApprove={handleApprovePlan}
          onRegenerate={() => updateSession({ step: 1 })}
        />
      )}

      {step === 3 && session && (
        <Step3Copies
          session={session}
          loading={loading}
          onUpdate={posts => updateSession({ posts })}
          onApprove={handleSendToSupervisor}
        />
      )}

      {step === 4 && session && (
        <Step4Report
          session={session}
          loading={loading}
          onBack={() => updateSession({ step: 3 })}
          onFinish={handleFinish}
        />
      )}
    </div>
  )
}
