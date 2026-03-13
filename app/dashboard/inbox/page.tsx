'use client'

import { useState, useEffect } from 'react'
import {
  Inbox, CheckCircle2, AlertTriangle, XCircle,
  Loader2, ChevronDown, ChevronUp, Hash, Lightbulb, RefreshCw, Database, Bot,
} from 'lucide-react'
import type { Post, ClauseValidation, Agent } from '@/lib/types'
import { getPosts, upsertPost, getBrands, getAgents } from '@/lib/storage'

function ScoreBar({ score }: { score: number }) {
  const color = score >= 8 ? 'bg-success' : score >= 6 ? 'bg-warning' : 'bg-red-500'
  const text  = score >= 8 ? 'text-success' : score >= 6 ? 'text-warning' : 'text-red-600'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className={`text-xs font-mono font-bold ${text}`}>{score}/10</span>
    </div>
  )
}

function PostCard({ post, onUpdate }: { post: Post; onUpdate: (p: Post) => void }) {
  const [copy,               setCopy]               = useState(post.final_copy || post.generated_copy)
  const [date,               setDate]               = useState(post.scheduled_date || '')
  const [showValidation,     setShowValidation]     = useState(post.critical_violations > 2)
  const [showReject,         setShowReject]         = useState(false)
  const [rejectReason,       setRejectReason]       = useState('')
  const [loading,            setLoading]            = useState(false)
  const [regenerating,       setRegenerating]       = useState(false)
  const [instruction,        setInstruction]        = useState('')
  const [showRegenerate,     setShowRegenerate]     = useState(false)
  const [msg,                setMsg]                = useState('')
  const [supervisorScore,    setSupervisorScore]    = useState(post.supervisor_score)
  const [supervisorValidation, setSupervisorValidation] = useState(post.supervisor_validation)
  const [criticalViolations, setCriticalViolations] = useState(post.critical_violations)
  const [suggestedFix,       setSuggestedFix]       = useState(post.suggested_fix)
  const [hashtags,           setHashtags]           = useState(post.hashtags)

  function getBrand() {
    return getBrands().find(b => b.id === post.brand_id)
  }

  function getAgent(): Agent | null {
    if (!post.agent_id) return null
    return getAgents().find(a => a.id === post.agent_id) ?? null
  }

  async function approve() {
    if (!date) { setMsg('Seleccioná una fecha de publicación'); return }
    setLoading(true)
    setMsg('')

    // FIX: getBrand() can be undefined — guard and still proceed (webhook is optional)
    const brand      = getBrand()
    const webhookUrl = brand?.webhook_url ?? ''

    const updated = { ...post, final_copy: copy, hashtags, scheduled_date: date, status: 'approved' as const }
    try {
      const res = await fetch('/api/approve', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ post: updated, webhook_url: webhookUrl }),
      })
      const data = await res.json()
      const finalStatus = data.status === 'webhook_sent' ? 'webhook_sent' : 'approved'
      const saved = { ...updated, status: finalStatus as Post['status'] }
      upsertPost(saved)
      onUpdate(saved)
      if (data.warning) setMsg(`⚠️ ${data.warning}`)
    } catch {
      setMsg('Error de red al aprobar.')
    } finally {
      setLoading(false)
    }
  }

  async function regenerate() {
    if (!instruction.trim()) return
    setRegenerating(true)
    setMsg('')
    const brand = getBrand()
    if (!brand) { setMsg('Marca no encontrada en storage'); setRegenerating(false); return }
    const agent = getAgent()

    try {
      const res = await fetch('/api/generate/regenerate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          brand,
          original_copy: copy,
          instruction:   instruction.trim(),
          platform:      post.platform,
          agent,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setMsg(data.error ?? 'Error al regenerar'); return }
      setCopy(data.regenerated.generated_copy)
      setHashtags(data.regenerated.hashtags ?? [])
      setSupervisorScore(data.supervisor.score)
      setSupervisorValidation(data.supervisor.clause_validations)
      setCriticalViolations(data.supervisor.critical_violations)
      setSuggestedFix(data.supervisor.suggested_fix)
      setInstruction('')
      setShowRegenerate(false)
    } finally {
      setRegenerating(false)
    }
  }

  function reject() {
    const updated = { ...post, status: 'rejected' as const }
    upsertPost(updated)
    onUpdate(updated)
  }

  const isApproved = post.status === 'approved' || post.status === 'webhook_sent'

  return (
    <div className={`bg-card border rounded-xl overflow-hidden fade-up transition-all
      ${criticalViolations > 2 ? 'border-orange-300' : 'border-border'}
      ${isApproved ? 'opacity-60' : ''}
    `}>
      {/* Warnings */}
      {criticalViolations > 2 && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-2 flex items-center gap-2">
          <AlertTriangle size={14} className="text-orange-500" />
          <span className="text-xs font-medium text-orange-700">
            {criticalViolations} violación{criticalViolations !== 1 ? 'es' : ''} al brandbook
          </span>
        </div>
      )}

      {/* Agent badge */}
      {post.agent_name && (
        <div className="bg-accent/5 border-b border-accent/10 px-4 py-1.5 flex items-center gap-1.5">
          <Bot size={11} className="text-accent" />
          <span className="text-xs text-accent/80">Agente: <strong>{post.agent_name}</strong></span>
        </div>
      )}

      {/* Context badge */}
      {post.context_used && post.context_used.sources.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-1.5 flex items-center gap-1.5">
          <Database size={11} className="text-blue-400" />
          <span className="text-xs text-blue-600">
            Datos reales: {post.context_used.sources.join(', ')}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 divide-x divide-border">
        {/* Image */}
        <div className="relative bg-paper min-h-60">
          {post.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.image_url} alt="post" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute top-2 left-2 flex gap-1.5">
            <span className="text-xs bg-ink/70 text-white px-2 py-0.5 rounded font-mono">{post.platform}</span>
            <span className="text-xs bg-ink/70 text-white px-2 py-0.5 rounded">{post.brand_name}</span>
          </div>
          {isApproved && (
            <div className="absolute bottom-2 left-2">
              <span className="text-xs bg-success text-white px-2 py-0.5 rounded font-medium">
                {post.status === 'webhook_sent' ? '✓ Enviado' : '✓ Aprobado'}
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 flex flex-col gap-3">
          {/* Score */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-muted uppercase tracking-wider">Score supervisor</span>
              <button onClick={() => setShowValidation(v => !v)}
                className="text-xs text-accent hover:underline flex items-center gap-0.5">
                Cláusulas {showValidation ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
            <ScoreBar score={supervisorScore} />
          </div>

          {showValidation && (
            <div className="bg-paper rounded-lg p-3 space-y-1.5 max-h-36 overflow-y-auto">
              {supervisorValidation.map((v: ClauseValidation, i: number) => (
                <div key={i} className="flex items-start gap-1.5 text-xs">
                  {v.passed
                    ? <CheckCircle2 size={12} className="text-success mt-0.5 shrink-0" />
                    : <XCircle     size={12} className="text-red-500 mt-0.5 shrink-0" />
                  }
                  <div>
                    <span className={v.passed ? 'text-muted' : 'text-red-700 font-medium'}>{v.rule}</span>
                    {v.comment && <p className="text-muted mt-0.5">{v.comment}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {suggestedFix && criticalViolations > 0 && (
            <div className="bg-blue-50 rounded-lg p-2.5 flex gap-2">
              <Lightbulb size={12} className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">{suggestedFix}</p>
            </div>
          )}

          {/* Copy editor */}
          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1">Copy</label>
            <textarea value={copy} onChange={e => setCopy(e.target.value)} disabled={isApproved}
              className="w-full border border-border rounded px-3 py-2 text-sm resize-none min-h-24 bg-paper focus:bg-white outline-none focus:border-accent transition-colors disabled:opacity-60" />
          </div>

          {hashtags?.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Hash size={12} className="text-muted" />
              {hashtags.map((t, i) => (
                <span key={i} className="text-xs text-accent bg-orange-50 px-1.5 py-0.5 rounded font-mono">{t}</span>
              ))}
            </div>
          )}

          {post.ai_rationale && (
            <p className="text-xs text-muted italic border-t border-border pt-2">💡 {post.ai_rationale}</p>
          )}

          {/* Regenerate */}
          {!isApproved && (
            <div>
              {!showRegenerate ? (
                <button onClick={() => setShowRegenerate(true)}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-ink border border-border rounded px-3 py-1.5 hover:bg-paper transition-colors w-full justify-center">
                  <RefreshCw size={11} /> Regenerar con instrucción
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    value={instruction}
                    onChange={e => setInstruction(e.target.value)}
                    placeholder='"más corto", "sin emojis", "más formal"'
                    className="w-full border border-border rounded px-3 py-1.5 text-xs outline-none focus:border-accent"
                    onKeyDown={e => e.key === 'Enter' && regenerate()}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { setShowRegenerate(false); setInstruction('') }}
                      className="flex-1 text-xs border border-border rounded py-1.5 hover:bg-paper transition-colors">
                      Cancelar
                    </button>
                    <button onClick={regenerate} disabled={regenerating || !instruction.trim()}
                      className="flex-1 text-xs bg-ink text-white rounded py-1.5 hover:bg-ink/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                      {regenerating ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                      Regenerar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Date */}
          {!isApproved && (
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-1">Fecha de publicación</label>
              <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border border-border rounded px-3 py-2 text-sm bg-paper outline-none focus:border-accent transition-colors" />
            </div>
          )}

          {msg && <p className="text-xs text-warning bg-yellow-50 border border-yellow-200 rounded px-2 py-1.5">{msg}</p>}

          {/* Actions */}
          {!isApproved && !showReject && (
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowReject(true)} disabled={loading}
                className="flex items-center gap-1 text-xs border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 rounded transition-colors">
                <XCircle size={12} /> Rechazar
              </button>
              <button onClick={approve} disabled={loading}
                className="flex-1 flex items-center justify-center gap-1 text-xs bg-accent text-white hover:bg-orange-700 px-3 py-2 rounded transition-colors disabled:opacity-50">
                {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                Aprobar
              </button>
            </div>
          )}

          {showReject && (
            <div className="space-y-2">
              <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Razón (opcional)"
                className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent" />
              <div className="flex gap-2">
                <button onClick={() => setShowReject(false)}
                  className="flex-1 text-xs border border-border rounded py-2 hover:bg-paper transition-colors">
                  Cancelar
                </button>
                <button onClick={reject}
                  className="flex-1 text-xs bg-red-600 text-white rounded py-2 hover:bg-red-700 transition-colors">
                  Confirmar rechazo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [posts,  setPosts]  = useState<Post[]>([])
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending')

  useEffect(() => {
    setPosts(
      getPosts().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    )
  }, [])

  function handleUpdate(updated: Post) {
    setPosts(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  const filtered = posts.filter(p => {
    if (filter === 'pending')  return p.status === 'pm_review' || p.status === 'supervisor_review'
    if (filter === 'approved') return p.status === 'approved'  || p.status === 'webhook_sent'
    return true
  })

  const pendingCount = posts.filter(p => p.status === 'pm_review' || p.status === 'supervisor_review').length

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-8">
        <Inbox size={24} className="text-accent" />
        <h1 className="font-display text-3xl text-ink">Bandeja de Aprobación</h1>
        {pendingCount > 0 && (
          <span className="bg-accent text-white text-xs font-mono px-2 py-0.5 rounded-full">{pendingCount}</span>
        )}
      </div>

      <div className="flex gap-1 mb-6 bg-card border border-border rounded-lg p-1 w-fit">
        {(['pending', 'approved', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-xs rounded transition-all font-medium
              ${filter === f ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}>
            {f === 'pending' ? 'Pendientes' : f === 'approved' ? 'Aprobados' : 'Todos'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted">
          <CheckCircle2 size={48} className="text-success mb-4 opacity-50" />
          <p className="font-display text-2xl text-ink/40">
            {filter === 'pending' ? 'Todo al día' : 'Sin posts'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {filtered.map(p => <PostCard key={p.id} post={p} onUpdate={handleUpdate} />)}
        </div>
      )}
    </div>
  )
}
