'use client'

import { useState, useEffect } from 'react'
import {
  Sparkles, Loader2, Bot, AlertCircle, CheckCircle2,
  ChevronRight, ChevronLeft, RefreshCw, ThumbsUp, ThumbsDown,
  Calendar, Clock, ArrowRight, X, Megaphone, RotateCcw,
} from 'lucide-react'
import type {
  Brand, Agent, StrategySession, StrategyPostWithCopies,
  CopyOption, SupervisorReport, Campaign, CampaignPost,
} from '@/lib/types'
import {
  getBrands, getBrandAgentsByRole, getStrategySession,
  saveStrategySession, clearStrategySession, upsertCampaign,
} from '@/lib/storage'

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS = ['instagram','facebook','linkedin','twitter','tiktok','youtube'] as const
type Platform = typeof PLATFORMS[number]

const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: 'text-pink-600  bg-pink-50   border-pink-200',
  facebook:  'text-blue-600  bg-blue-50   border-blue-200',
  linkedin:  'text-sky-700   bg-sky-50    border-sky-200',
  twitter:   'text-zinc-700  bg-zinc-50   border-zinc-200',
  tiktok:    'text-red-600   bg-red-50    border-red-200',
  youtube:   'text-red-700   bg-red-50    border-red-200',
}

const CONTENT_COLOR: Record<string, string> = {
  informativo: 'text-blue-700  bg-blue-50   border-blue-200',
  producto:    'text-orange-700 bg-orange-50 border-orange-200',
  comunidad:   'text-green-700 bg-green-50  border-green-200',
  educativo:   'text-purple-700 bg-purple-50 border-purple-200',
  tendencia:   'text-pink-700  bg-pink-50   border-pink-200',
}

const STEPS = ['Configurar', 'Plan', 'Copies', 'Supervisor']

// ─── Step 1 — Configure ───────────────────────────────────────────────────────

function Step1Config({
  onNext, loading,
}: {
  onNext: (cfg: {
    brand: Brand; estratega: Agent; copyAgent: Agent; supervisor: Agent
    numDays: number; periodLabel: string; selectedPlatforms: Platform[]
  }) => void
  loading: boolean
}) {
  const [brands,          setBrands]          = useState<Brand[]>([])
  const [brandId,         setBrandId]         = useState('')
  const [estrategas,      setEstrategas]      = useState<Agent[]>([])
  const [copyAgents,      setCopyAgents]      = useState<Agent[]>([])
  const [supervisors,     setSupervisors]     = useState<Agent[]>([])
  const [estrategaId,     setEstrategaId]     = useState('')
  const [copyId,          setCopyId]          = useState('')
  const [supervisorId,    setSupervisorId]    = useState('')
  const [numDays,         setNumDays]         = useState(15)
  const [periodLabel,     setPeriodLabel]     = useState('')
  const [selPlatforms,    setSelPlatforms]    = useState<Platform[]>(['instagram'])

  useEffect(() => {
    const all = getBrands()
    setBrands(all)
    if (all.length > 0) loadAgents(all[0].id)
  }, [])

  function loadAgents(id: string) {
    setBrandId(id)
    const e = getBrandAgentsByRole(id, 'estratega')
    const c = getBrandAgentsByRole(id, 'copy')
    const s = getBrandAgentsByRole(id, 'supervisor')
    setEstrategas(e);  setEstrategaId(e[0]?.id ?? '')
    setCopyAgents(c);  setCopyId(c[0]?.id ?? '')
    setSupervisors(s); setSupervisorId(s[0]?.id ?? '')
  }

  function togglePlatform(p: Platform) {
    setSelPlatforms(prev =>
      prev.includes(p) ? (prev.length > 1 ? prev.filter(x => x !== p) : prev) : [...prev, p]
    )
  }

  const missing  = !estrategas.length || !copyAgents.length || !supervisors.length
  const canGo    = !missing && estrategaId && copyId && supervisorId && numDays > 0 && selPlatforms.length > 0

  function go() {
    const brand      = brands.find(b => b.id === brandId)
    const estratega  = estrategas.find(a => a.id === estrategaId)
    const copyAgent  = copyAgents.find(a => a.id === copyId)
    const supervisor = supervisors.find(a => a.id === supervisorId)
    if (!brand || !estratega || !copyAgent || !supervisor) return
    onNext({
      brand, estratega, copyAgent, supervisor, numDays,
      periodLabel:       periodLabel.trim() || `Plan ${numDays} días`,
      selectedPlatforms: selPlatforms,
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Brand */}
      <div>
        <label className="block text-xs font-medium text-secondary mb-2">Cliente</label>
        <select value={brandId} onChange={e => loadAgents(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent bg-white">
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {missing && brandId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Faltan agentes</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Necesitás 1 Estratega, 1 Copy y 1 Supervisor por marca.{' '}
              <a href="/dashboard/agents" className="underline">Configurar →</a>
            </p>
          </div>
        </div>
      )}

      {!missing && brandId && (
        <>
          {/* Agents */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Estratega',   agents: estrategas,  selectedId: estrategaId,  setId: setEstrategaId },
              { label: 'Copy Agent',  agents: copyAgents,  selectedId: copyId,        setId: setCopyId },
              { label: 'Supervisor',  agents: supervisors, selectedId: supervisorId,  setId: setSupervisorId },
            ].map(({ label, agents, selectedId, setId }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-secondary mb-2">{label}</label>
                <div className="space-y-1.5">
                  {agents.map(a => (
                    <button key={a.id} onClick={() => setId(a.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${selectedId === a.id ? 'border-accent bg-blue-50/60 text-accent' : 'border-border bg-canvas text-secondary hover:border-zinc-300'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{a.name}</span>
                        {selectedId === a.id && <CheckCircle2 size={13} className="text-accent shrink-0" />}
                      </div>
                      {a.description && <p className="text-2xs text-tertiary mt-0.5 truncate">{a.description}</p>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Platform selector */}
          <div className="bg-canvas border border-border rounded-xl p-4">
            <label className="block text-xs font-medium text-secondary mb-3">
              Redes sociales para esta estrategia
              <span className="ml-2 font-normal text-tertiary">({selPlatforms.length} seleccionadas)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all capitalize ${selPlatforms.includes(p) ? PLATFORM_COLORS[p] : 'border-border text-tertiary hover:border-zinc-300 hover:text-secondary'}`}>
                  {p}
                </button>
              ))}
            </div>
            <p className="text-2xs text-tertiary mt-2">El estratega distribuirá los posts entre las redes elegidas.</p>
          </div>

          {/* Days + label */}
          <div className="grid grid-cols-2 gap-4 bg-canvas border border-border rounded-xl p-4">
            <div>
              <label className="block text-xs font-medium text-secondary mb-3">
                Duración
                <span className="ml-2 text-lg font-bold text-primary">{numDays}</span>
                <span className="text-secondary text-xs font-normal"> días</span>
              </label>
              <input type="range" min={1} max={30} value={numDays}
                onChange={e => setNumDays(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 rounded-full appearance-none cursor-pointer accent-accent" />
              <div className="flex justify-between text-2xs text-tertiary mt-1.5">
                <span>1</span><span>15</span><span>30 días</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-3">Nombre del período</label>
              <input value={periodLabel} onChange={e => setPeriodLabel(e.target.value)}
                placeholder={`Plan ${numDays} días`}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent bg-white" />
            </div>
          </div>

          <button onClick={go} disabled={!canGo || loading}
            className="flex items-center gap-2 bg-primary text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-zinc-800 transition disabled:opacity-40">
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Generando plan...</>
              : <><Sparkles size={15} /> Generar plan <ChevronRight size={15} /></>
            }
          </button>
        </>
      )}
    </div>
  )
}

// ─── Step 2 — Approve plan ────────────────────────────────────────────────────

function Step2Plan({ session, onApprove, onRegenerate, loading }: {
  session: StrategySession; onApprove: () => void; onRegenerate: () => void; loading: boolean
}) {
  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-lg text-primary">{session.period_label}</h2>
          <p className="text-sm text-secondary mt-0.5">
            {session.posts.length} posts · Estratega: {session.estratega_name} ·{' '}
            Redes: {session.selected_platforms?.join(', ') ?? 'varias'}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={onRegenerate} disabled={loading}
            className="flex items-center gap-1.5 text-sm border border-border rounded-lg px-3 py-2 hover:bg-canvas transition text-secondary disabled:opacity-40">
            <RefreshCw size={13} /> Regenerar
          </button>
          <button onClick={onApprove} disabled={loading}
            className="flex items-center gap-2 bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-800 transition disabled:opacity-40">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Aprobar y generar copies
          </button>
        </div>
      </div>

      {session.strategy_rationale && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <p className="text-xs text-blue-700 italic">💡 {session.strategy_rationale}</p>
        </div>
      )}

      {session.pillars.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {session.pillars.map((p, i) => (
            <span key={i} className="text-xs text-secondary bg-zinc-100 border border-zinc-200 px-3 py-1 rounded-full">{p}</span>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {session.posts.sort((a, b) => a.day - b.day).map((post, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 hover:border-zinc-300 transition-colors">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-mono text-tertiary bg-zinc-100 px-2 py-0.5 rounded">Día {post.day}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded border capitalize ${PLATFORM_COLORS[post.platform as Platform] ?? 'text-secondary bg-zinc-50 border-zinc-200'}`}>{post.platform}</span>
              <span className={`text-xs px-2 py-0.5 rounded border ${CONTENT_COLOR[post.content_type] ?? 'text-secondary bg-zinc-50 border-zinc-200'}`}>{post.content_type}</span>
            </div>
            <p className="text-sm font-medium text-primary">{post.topic}</p>
            <p className="text-xs text-secondary italic mt-1">"{post.hook_suggestion}"</p>
            {post.visual_direction && <p className="text-xs text-tertiary mt-1">🎨 {post.visual_direction}</p>}
            <p className="text-xs text-accent bg-blue-50 border border-blue-100 rounded px-2 py-1 mt-2 inline-block">📎 {post.source_reference}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Step 3 — Pick copies ─────────────────────────────────────────────────────

function Step3Copies({ session, onUpdate, onApprove, loading }: {
  session: StrategySession
  onUpdate: (posts: StrategyPostWithCopies[]) => void
  onApprove: () => void
  loading: boolean
}) {
  const [regenerating, setRegenerating] = useState<Record<number, boolean>>({})

  const total    = session.posts.length
  const done     = session.posts.filter(p => p.copies_done).length
  const selected = session.posts.filter(p => p.selected_copy_index !== undefined).length
  const allPicked = selected === total

  function pickCopy(day: number, index: number) {
    onUpdate(session.posts.map(p => p.day === day ? { ...p, selected_copy_index: index } : p))
  }

  async function regenerateCopy(post: StrategyPostWithCopies, instruction: string) {
    setRegenerating(prev => ({ ...prev, [post.day]: true }))
    try {
      const brand     = getBrands().find(b => b.id === session.brand_id)
      const copyAgent = getBrandAgentsByRole(session.brand_id, 'copy').find(a => a.id === session.copy_agent_id)
      if (!brand || !copyAgent) return

      // Pass supervisor improvements as instruction context
      const enhancedPost = { ...post, topic: `${post.topic} — MEJORA SOLICITADA: ${instruction}` }
      const res = await fetch('/api/strategy/copies', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ brand, copy_agent: copyAgent, post: enhancedPost }),
      })
      const data = await res.json()
      if (res.ok && data.copies) {
        onUpdate(session.posts.map(p => p.day === post.day ? { ...p, copies: data.copies, selected_copy_index: undefined } : p))
      }
    } finally {
      setRegenerating(prev => ({ ...prev, [post.day]: false }))
    }
  }

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg text-primary">Elegí los copies</h2>
          <p className="text-sm text-secondary mt-0.5">{done}/{total} generados · {selected}/{total} elegidos</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-32 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${(done / total) * 100}%` }} />
          </div>
          <button onClick={onApprove} disabled={!allPicked || loading}
            className="flex items-center gap-2 bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-800 transition disabled:opacity-40">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Enviar al Supervisor
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {session.posts.sort((a, b) => a.day - b.day).map(post => (
          <div key={post.day} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            {/* Post header */}
            <div className="flex items-center gap-3 px-5 py-3 bg-canvas border-b border-border">
              <span className="text-xs font-mono text-tertiary">Día {post.day}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded border capitalize ${PLATFORM_COLORS[post.platform as Platform] ?? ''}`}>{post.platform}</span>
              <span className="text-sm font-medium text-primary flex-1 truncate">{post.topic}</span>
              {post.selected_copy_index !== undefined && (
                <span className="text-xs text-success flex items-center gap-1 shrink-0">
                  <CheckCircle2 size={12} /> Opción {post.selected_copy_index}
                </span>
              )}
              {!post.copies_done && (
                <span className="text-xs text-tertiary flex items-center gap-1 shrink-0">
                  <Loader2 size={11} className="animate-spin" /> Generando...
                </span>
              )}
              {/* Regenerate button */}
              {post.copies_done && (
                <button
                  onClick={() => {
                    const reason = window.prompt('¿Qué querés mejorar? (ej: más corto, sin emojis, más formal, agregar urgencia)')
                    if (reason?.trim()) regenerateCopy(post, reason.trim())
                  }}
                  disabled={regenerating[post.day]}
                  className="flex items-center gap-1 text-2xs border border-border rounded px-2 py-1 text-secondary hover:text-primary hover:border-zinc-400 transition disabled:opacity-40 shrink-0">
                  <RotateCcw size={10} />
                  {regenerating[post.day] ? 'Regenerando...' : 'Regenerar'}
                </button>
              )}
            </div>

            {/* 3 copy options */}
            {post.copies && post.copies.length > 0 ? (
              <div className="grid md:grid-cols-3 divide-x divide-border">
                {post.copies.map((option: CopyOption) => (
                  <div key={option.index}
                    onClick={() => pickCopy(post.day, option.index)}
                    className={`p-4 cursor-pointer transition-all hover:bg-zinc-50 ${post.selected_copy_index === option.index ? 'bg-blue-50/40' : ''}`}>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-2xs font-semibold font-mono text-tertiary">OPCIÓN {option.index}</span>
                      <span className="text-2xs bg-zinc-100 text-secondary px-2 py-0.5 rounded-full">{option.angle}</span>
                    </div>
                    <p className="text-sm text-primary leading-relaxed mb-3 whitespace-pre-wrap">{option.copy}</p>
                    {option.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2.5">
                        {option.hashtags.slice(0, 5).map((h, i) => (
                          <span key={i} className="text-2xs font-mono text-accent">{h}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-2xs text-tertiary italic mb-3">{option.rationale}</p>
                    <button
                      onClick={e => { e.stopPropagation(); pickCopy(post.day, option.index) }}
                      className={`w-full text-xs py-1.5 rounded-lg border transition-all font-medium ${post.selected_copy_index === option.index ? 'bg-primary text-white border-primary' : 'border-border hover:border-accent hover:text-accent text-secondary'}`}>
                      {post.selected_copy_index === option.index ? '✓ Seleccionada' : 'Elegir esta'}
                    </button>
                  </div>
                ))}
              </div>
            ) : post.copies_done ? (
              <div className="p-8 text-center text-secondary text-sm">
                Error al generar copies para este post.
                <button onClick={() => regenerateCopy(post, 'regenerar')} className="ml-2 text-accent hover:underline">Reintentar</button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Step 4 — Supervisor report ───────────────────────────────────────────────

function Step4Report({ session, onBack, onFinish, loading }: {
  session: StrategySession; onBack: () => void; onFinish: () => void; loading: boolean
}) {
  const report = session.supervisor_report
  if (!report) return null

  const scoreColor = report.overall_score >= 8 ? 'text-success' : report.overall_score >= 6 ? 'text-warning' : 'text-danger'

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg text-primary">Reporte del Supervisor</h2>
          <p className="text-sm text-secondary mt-0.5">{session.supervisor_name}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-sm border border-border rounded-lg px-3 py-2 hover:bg-canvas transition text-secondary">
            <ChevronLeft size={13} /> Volver a copies
          </button>
          <button onClick={onFinish} disabled={loading}
            className="flex items-center gap-2 bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-800 transition disabled:opacity-40">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />}
            Crear campaña
          </button>
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 text-center shadow-sm">
          <p className="text-xs font-medium text-secondary mb-3">Score general</p>
          <p className={`text-5xl font-bold ${scoreColor}`}>
            {report.overall_score}<span className="text-xl text-tertiary font-normal">/10</span>
          </p>
          <p className="text-xs text-tertiary mt-2">{report.approved ? '✓ Aprobado' : '⚠ Requiere mejoras'}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 text-center shadow-sm">
          <p className="text-xs font-medium text-secondary mb-3">Alineación con marca</p>
          <p className="text-5xl font-bold text-accent">
            {report.brand_alignment}<span className="text-xl text-tertiary font-normal">/10</span>
          </p>
          <p className="text-xs text-tertiary mt-2">Brandbook + Prompt</p>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ThumbsUp size={14} className="text-success" />
            <span className="text-sm font-semibold text-success">Puntos fuertes</span>
          </div>
          <div className="space-y-1.5">
            {report.strengths.map((s, i) => <p key={i} className="text-xs text-green-800">• {s}</p>)}
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ThumbsDown size={14} className="text-danger" />
            <span className="text-sm font-semibold text-danger">Puntos débiles</span>
          </div>
          <div className="space-y-1.5">
            {report.weaknesses.map((w, i) => <p key={i} className="text-xs text-red-700">• {w}</p>)}
          </div>
        </div>
      </div>

      {/* Improvements */}
      {report.improvements.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-800 mb-2">⚡ Mejoras accionables</p>
          <div className="space-y-1">
            {report.improvements.map((imp, i) => (
              <p key={i} className="text-xs text-amber-700">• {imp}</p>
            ))}
          </div>
        </div>
      )}

      {/* Calendar */}
      {report.calendar_suggestion.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-secondary mb-3 flex items-center gap-1.5">
            <Calendar size={12} /> Calendarización sugerida
          </p>
          <div className="space-y-2">
            {report.calendar_suggestion.slice(0, 10).map((c, i) => (
              <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-2.5 shadow-sm">
                <span className="text-xs font-mono text-tertiary w-12 shrink-0">Día {c.day}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded border capitalize ${PLATFORM_COLORS[c.platform as Platform] ?? 'text-secondary bg-zinc-50 border-zinc-200'}`}>{c.platform}</span>
                <span className="flex items-center gap-1 text-xs text-primary font-medium">
                  <Clock size={11} /> {c.recommended_time}
                </span>
                <span className="text-xs text-tertiary flex-1 truncate">{c.reasoning}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Post feedback */}
      {report.post_feedback.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-secondary mb-3">Feedback por post</p>
          <div className="space-y-1.5">
            {report.post_feedback.map((f, i) => (
              <div key={i} className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg ${f.passed ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
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

// ─── Main Page ─────────────────────────────────────────────────────────────────

// getBrands imported from storage below
function _unused_getBrands() {

  return gb() as Brand[]
}

export default function StrategyPage() {
  const [session,  setSession]  = useState<StrategySession | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

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

  // ── Step 1 → 2 ─────────────────────────────────────────────────────────────
  async function handleConfig(cfg: {
    brand: Brand; estratega: Agent; copyAgent: Agent; supervisor: Agent
    numDays: number; periodLabel: string; selectedPlatforms: Platform[]
  }) {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/strategy/plan', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          brand:             cfg.brand,
          estratega:         cfg.estratega,
          num_days:          cfg.numDays,
          period_label:      cfg.periodLabel,
          selected_platforms: cfg.selectedPlatforms,
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
        selected_platforms: cfg.selectedPlatforms,
        step:               2,
        pillars:            data.pillars ?? [],
        strategy_rationale: data.strategy_rationale ?? '',
        posts:              (data.posts ?? []).map((p: StrategyPostWithCopies) => ({ ...p, copies_done: false })),
        created_at:         new Date().toISOString(),
      }
      saveStrategySession(newSession)
      setSession(newSession)
    } catch { setError('Error de red.') }
    finally { setLoading(false) }
  }

  // ── Step 2 → 3: generate copies sequentially ───────────────────────────────
  async function handleApprovePlan() {
    if (!session) return

    // Move to step 3 immediately so UI shows progress
    const step3Session = { ...session, step: 3 as const }
    saveStrategySession(step3Session)
    setSession(step3Session)

    // Find brand + copy agent fresh from storage (avoid stale closure)
    // Use module-level storage functions
    const brand     = getBrands().find((b: Brand) => b.id === step3Session.brand_id)
    const copyAgent = getBrandAgentsByRole(step3Session.brand_id, 'copy').find((a: Agent) => a.id === step3Session.copy_agent_id)
    if (!brand || !copyAgent) { setError('Marca o agente de copy no encontrado'); return }

    for (const post of step3Session.posts) {
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
          const nextPosts = prev.posts.map(p => p.day === post.day ? { ...p, copies, copies_done: true } : p)
          const next = { ...prev, posts: nextPosts }
          saveStrategySession(next)
          return next
        })
      } catch {
        setSession(prev => {
          if (!prev) return prev
          const nextPosts = prev.posts.map(p => p.day === post.day ? { ...p, copies: [], copies_done: true } : p)
          const next = { ...prev, posts: nextPosts }
          saveStrategySession(next)
          return next
        })
      }
    }
  }

  // ── Step 3 → 4 ─────────────────────────────────────────────────────────────
  async function handleSendToSupervisor() {
    if (!session) return
    setLoading(true); setError('')
    try {
      // Use module-level storage functions
      const brand      = getBrands().find((b: Brand) => b.id === session.brand_id)
      const supervisor = getBrandAgentsByRole(session.brand_id, 'supervisor').find((a: Agent) => a.id === session.supervisor_id)
      if (!brand || !supervisor) { setError('Marca o supervisor no encontrado'); return }

      const res = await fetch('/api/strategy/review', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ brand, supervisor, posts: session.posts, num_days: session.num_days, period_label: session.period_label }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al generar reporte'); return }
      updateSession({ step: 4, supervisor_report: data.report })
    } catch { setError('Error de red.') }
    finally { setLoading(false) }
  }

  // ── Step 4 → done: save as Campaign ────────────────────────────────────────
  async function handleFinish() {
    if (!session || !session.supervisor_report) return
    setLoading(true)
    try {
      // Convert strategy posts to campaign posts
      const campaignPosts: CampaignPost[] = session.posts.map(p => {
        const selectedCopy = p.copies?.find(c => c.index === p.selected_copy_index)
        return {
          id:              crypto.randomUUID(),
          day:             p.day,
          platform:        p.platform,
          topic:           p.topic,
          content_type:    p.content_type,
          hook_suggestion: p.hook_suggestion,
          visual_direction: p.visual_direction ?? '',
          copy:            selectedCopy?.copy ?? '',
          hashtags:        selectedCopy?.hashtags ?? [],
          status:          'draft' as const,
        }
      })

      const campaign: Campaign = {
        id:             crypto.randomUUID(),
        brand_id:       session.brand_id,
        brand_name:     session.brand_name,
        period_label:   session.period_label,
        estratega_name: session.estratega_name,
        supervisor_name: session.supervisor_name,
        overall_score:  session.supervisor_report.overall_score,
        strengths:      session.supervisor_report.strengths,
        weaknesses:     session.supervisor_report.weaknesses,
        posts:          campaignPosts,
        created_at:     new Date().toISOString(),
        status:         'draft',
      }

      upsertCampaign(campaign)
      clearStrategySession()
      setSession(null)

      // Redirect to campaigns
      window.location.href = '/dashboard/campaigns'
    } finally {
      setLoading(false)
    }
  }

  const step = session?.step ?? 1

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-accent" />
          <h1 className="text-xl font-semibold text-primary">Estrategia de Contenido</h1>
        </div>
        <p className="text-sm text-secondary">
          4 pasos: Estratega genera el plan → Copy agent crea 3 opciones → PM elige → Supervisor evalúa y calendariza.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0 my-7">
        {STEPS.map((label, i) => {
          const s      = i + 1
          const done   = s < step
          const active = s === step
          return (
            <div key={s} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${active ? 'bg-primary text-white font-medium' : done ? 'text-success' : 'text-tertiary'}`}>
                {done ? <CheckCircle2 size={13} /> : <span className="font-mono text-xs w-4 text-center">{s}</span>}
                {label}
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight size={13} className={`mx-2 ${s < step ? 'text-success' : 'text-zinc-300'}`} />
              )}
            </div>
          )
        })}

        {session && (
          <button onClick={() => { clearStrategySession(); setSession(null) }}
            className="ml-6 text-xs text-tertiary hover:text-danger border border-border rounded px-2.5 py-1 hover:border-red-200 transition flex items-center gap-1">
            <X size={11} /> Reiniciar
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex gap-2 max-w-2xl">
          <AlertCircle size={15} className="text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {step === 1 && (
        <Step1Config onNext={handleConfig} loading={loading} />
      )}
      {step === 2 && session && (
        <Step2Plan
          session={session} loading={loading}
          onApprove={handleApprovePlan}
          onRegenerate={() => { clearStrategySession(); setSession(null) }}
        />
      )}
      {step === 3 && session && (
        <Step3Copies
          session={session} loading={loading}
          onUpdate={posts => updateSession({ posts })}
          onApprove={handleSendToSupervisor}
        />
      )}
      {step === 4 && session && (
        <Step4Report
          session={session} loading={loading}
          onBack={() => updateSession({ step: 3 })}
          onFinish={handleFinish}
        />
      )}
    </div>
  )
}
