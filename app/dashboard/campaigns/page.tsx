'use client'

import { useState, useEffect } from 'react'
import {
  Megaphone, CheckCircle2, Clock, Send, Edit2, Save, X, Loader2,
  ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Calendar, Hash,
  ExternalLink, Trash2, AlertCircle, Share2,
} from 'lucide-react'
import type { Campaign, CampaignPost, CampaignPostStatus, SocialAccount } from '@/lib/types'
import { getCampaigns, upsertCampaign, deleteCampaign, getBrandSocialAccounts } from '@/lib/storage'

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<CampaignPostStatus, { label: string; color: string }> = {
  draft:      { label: 'Borrador',   color: 'text-secondary bg-zinc-100 border-zinc-200' },
  scheduled:  { label: 'Agendado',   color: 'text-amber-700 bg-amber-50 border-amber-200' },
  published:  { label: 'Publicado',  color: 'text-success bg-green-50 border-green-200' },
  failed:     { label: 'Error',      color: 'text-danger bg-red-50 border-red-200' },
}

// ─── Post editor card ─────────────────────────────────────────────────────────

function PostCard({ post, campaign, socialAccounts, onUpdate }: {
  post:           CampaignPost
  campaign:       Campaign
  socialAccounts: SocialAccount[]
  onUpdate:       (p: CampaignPost) => void
}) {
  const [editing,     setEditing]     = useState(false)
  const [copy,        setCopy]        = useState(post.copy)
  const [hashtags,    setHashtags]    = useState(post.hashtags.join(' '))
  const [scheduledAt, setScheduledAt] = useState(post.scheduled_at ?? '')
  const [publishing,  setPublishing]  = useState(false)
  const [msg,         setMsg]         = useState('')

  const isPublished = post.status === 'published'
  const acct = socialAccounts.find(a => a.platform === post.platform)
  const statusCfg = STATUS_CONFIG[post.status]

  function saveEdit() {
    onUpdate({
      ...post,
      copy,
      hashtags: hashtags.split(/\s+/).filter(h => h.startsWith('#')),
      scheduled_at: scheduledAt || undefined,
    })
    setEditing(false)
  }

  async function publish() {
    if (!scheduledAt) { setMsg('Seleccioná fecha y hora de publicación'); return }
    setPublishing(true); setMsg('')
    try {
      const payload = {
        platform:     post.platform,
        copy:         post.copy,
        hashtags:     post.hashtags,
        scheduled_at: scheduledAt,
        brand_name:   campaign.brand_name,
        post_id:      post.id,
        handle:       acct?.handle ?? '',
        page_id:      acct?.page_id,
      }

      // Try webhook first, then direct API
      const webhookUrl = acct?.webhook_url
      if (webhookUrl) {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
          signal:  AbortSignal.timeout(10_000),
        })
        if (res.ok) {
          onUpdate({ ...post, status: 'scheduled', scheduled_at: scheduledAt })
          setMsg('✓ Enviado al webhook')
          return
        }
      }

      // Direct publish via our route
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...payload,
          access_token: acct?.access_token,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        onUpdate({ ...post, status: 'failed', error_msg: data.error ?? 'Error al publicar' })
        setMsg(`Error: ${data.error ?? 'Verificá las credenciales'}`)
        return
      }
      onUpdate({ ...post, status: data.scheduled ? 'scheduled' : 'published', scheduled_at: scheduledAt, published_at: new Date().toISOString() })
      setMsg('✓ Publicado exitosamente')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de red'
      onUpdate({ ...post, status: 'failed', error_msg: message })
      setMsg(`Error: ${message}`)
    } finally { setPublishing(false) }
  }

  return (
    <div className={`bg-card border rounded-xl overflow-hidden shadow-sm transition-colors ${isPublished ? 'opacity-70' : 'hover:border-zinc-300'} ${post.status === 'failed' ? 'border-red-200' : 'border-border'}`}>
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-canvas border-b border-border">
        <span className="text-xs font-mono text-tertiary">Día {post.day}</span>
        <span className="text-xs font-mono text-accent font-medium">{post.platform}</span>
        <span className="text-xs text-secondary">{post.content_type}</span>
        <span className={`ml-auto text-2xs px-2 py-0.5 rounded border ${statusCfg.color}`}>{statusCfg.label}</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Topic */}
        <p className="text-xs font-medium text-secondary">{post.topic}</p>

        {/* Copy editor or display */}
        {editing ? (
          <div className="space-y-2">
            <textarea value={copy} onChange={e => setCopy(e.target.value)}
              rows={5} className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition resize-none bg-white" />
            <input value={hashtags} onChange={e => setHashtags(e.target.value)}
              placeholder="#hashtag1 #hashtag2"
              className="w-full border border-border rounded px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white" />
          </div>
        ) : (
          <div>
            <p className="text-sm text-primary leading-relaxed whitespace-pre-wrap">{post.copy}</p>
            {post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.hashtags.map((h, i) => (
                  <span key={i} className="text-2xs font-mono text-accent bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">{h}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Visual direction hint */}
        {post.visual_direction && (
          <p className="text-2xs text-tertiary border-l-2 border-zinc-200 pl-2 italic">🎨 {post.visual_direction}</p>
        )}

        {/* Date + account */}
        {!isPublished && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="block text-2xs font-medium text-secondary mb-1">Fecha / hora</label>
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                className="w-full border border-border rounded px-2.5 py-1.5 text-xs outline-none focus:border-accent transition bg-white" />
            </div>
            <div>
              <label className="block text-2xs font-medium text-secondary mb-1">Cuenta vinculada</label>
              {acct ? (
                <div className="border border-border rounded px-2.5 py-1.5 text-xs text-secondary bg-canvas">
                  @{acct.handle}
                  {acct.access_token || acct.webhook_url
                    ? <span className="ml-1.5 text-success">✓</span>
                    : <span className="ml-1.5 text-warning">sin credenciales</span>
                  }
                </div>
              ) : (
                <div className="border border-amber-200 rounded px-2.5 py-1.5 text-2xs text-amber-700 bg-amber-50">
                  Sin cuenta para {post.platform}.{' '}
                  <a href="/dashboard/social" className="underline">Configurar →</a>
                </div>
              )}
            </div>
          </div>
        )}

        {msg && <p className={`text-xs rounded px-3 py-2 ${msg.startsWith('✓') ? 'bg-green-50 text-success border border-green-100' : 'bg-red-50 text-danger border border-red-100'}`}>{msg}</p>}
        {post.error_msg && !msg && <p className="text-xs rounded px-3 py-2 bg-red-50 text-danger border border-red-100">{post.error_msg}</p>}

        {/* Actions */}
        {!isPublished && (
          <div className="flex gap-2 pt-1">
            {editing ? (
              <>
                <button onClick={() => { setEditing(false); setCopy(post.copy); setHashtags(post.hashtags.join(' ')) }}
                  className="flex items-center gap-1.5 text-xs border border-border rounded px-3 py-1.5 hover:bg-canvas transition text-secondary">
                  <X size={11} /> Cancelar
                </button>
                <button onClick={saveEdit}
                  className="flex items-center gap-1.5 text-xs bg-primary text-white rounded px-3 py-1.5 hover:bg-zinc-800 transition">
                  <Save size={11} /> Guardar cambios
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-xs border border-border rounded px-3 py-1.5 hover:bg-canvas transition text-secondary">
                  <Edit2 size={11} /> Editar copy
                </button>
                <button onClick={publish} disabled={publishing || !scheduledAt}
                  className="flex items-center gap-2 text-xs bg-accent text-white rounded px-3 py-1.5 hover:bg-accentHover transition disabled:opacity-40 ml-auto">
                  {publishing ? <><Loader2 size={11} className="animate-spin" /> Enviando...</> : <><Send size={11} /> Publicar</>}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Campaign card ────────────────────────────────────────────────────────────

function CampaignCard({ campaign, onDelete }: { campaign: Campaign; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState(campaign)

  const socialAccounts = getBrandSocialAccounts(campaign.brand_id)
  const publishedCount = current.posts.filter(p => p.status === 'published' || p.status === 'scheduled').length
  const totalCount     = current.posts.length
  const pct            = totalCount > 0 ? Math.round((publishedCount / totalCount) * 100) : 0

  function updatePost(updated: CampaignPost) {
    const updatedPosts = current.posts.map(p => p.id === updated.id ? updated : p)
    const allDone = updatedPosts.every(p => p.status === 'published' || p.status === 'scheduled')
    const nextCampaign = { ...current, posts: updatedPosts, status: allDone ? 'done' as const : 'publishing' as const }
    setCurrent(nextCampaign)
    upsertCampaign(nextCampaign)
  }

  const scoreColor = current.overall_score >= 8 ? 'text-success' : current.overall_score >= 6 ? 'text-warning' : 'text-danger'

  return (
    <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
      {/* Campaign header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-primary">{current.brand_name}</h3>
              <span className="text-xs text-tertiary">·</span>
              <span className="text-sm text-secondary">{current.period_label}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-tertiary flex-wrap">
              <span>Estratega: {current.estratega_name}</span>
              <span>·</span>
              <span>Supervisor: {current.supervisor_name}</span>
              <span>·</span>
              <span>{new Date(current.created_at).toLocaleDateString('es-AR')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <p className={`text-xl font-bold ${scoreColor}`}>{current.overall_score}<span className="text-xs text-tertiary font-normal">/10</span></p>
              <p className="text-2xs text-tertiary">score supervisor</p>
            </div>
            <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-50 text-tertiary hover:text-danger transition ml-2">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-secondary mb-1.5">
            <span>{publishedCount}/{totalCount} posts publicados</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Supervisor insights (collapsed) */}
        {(current.strengths.length > 0 || current.weaknesses.length > 0) && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {current.strengths.slice(0, 2).map((s, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs">
                <ThumbsUp size={11} className="text-success shrink-0 mt-0.5" />
                <span className="text-secondary">{s}</span>
              </div>
            ))}
            {current.weaknesses.slice(0, 2).map((w, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs">
                <ThumbsDown size={11} className="text-warning shrink-0 mt-0.5" />
                <span className="text-secondary">{w}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary mt-4 transition">
          {open ? <><ChevronUp size={13} /> Ocultar posts</> : <><ChevronDown size={13} /> Ver y publicar {totalCount} posts</>}
        </button>
      </div>

      {/* Posts grid */}
      {open && (
        <div className="border-t border-border p-5 bg-canvas">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 fade-up">
            {current.posts.sort((a, b) => a.day - b.day).map(post => (
              <PostCard
                key={post.id}
                post={post}
                campaign={current}
                socialAccounts={socialAccounts}
                onUpdate={updatePost}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [filter,    setFilter]    = useState<'all' | 'draft' | 'publishing' | 'done'>('all')

  useEffect(() => { setCampaigns(getCampaigns()) }, [])

  function remove(id: string) {
    deleteCampaign(id)
    setCampaigns(getCampaigns())
  }

  const filtered = campaigns.filter(c => filter === 'all' || c.status === filter)

  const counts = {
    all:        campaigns.length,
    draft:      campaigns.filter(c => c.status === 'draft').length,
    publishing: campaigns.filter(c => c.status === 'publishing').length,
    done:       campaigns.filter(c => c.status === 'done').length,
  }

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Megaphone size={18} className="text-accent" />
          <h1 className="text-xl font-semibold text-primary">Campañas</h1>
        </div>
        <p className="text-sm text-secondary">
          Estrategias aprobadas listas para desplegar. Editá los copies, agendá y publicá en cada red social.
        </p>
      </div>

      {campaigns.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-2xl p-16 text-center">
          <Megaphone size={32} className="mx-auto mb-4 text-tertiary opacity-40" />
          <p className="text-base font-medium text-secondary mb-1">Sin campañas aún</p>
          <p className="text-sm text-tertiary mb-5">
            Generá una estrategia en{' '}
            <a href="/dashboard/strategy" className="text-accent hover:underline">Estrategia</a>{' '}
            y finalizala para que aparezca aquí.
          </p>
          <a href="/dashboard/strategy"
            className="inline-flex items-center gap-2 text-sm bg-primary text-white rounded-lg px-4 py-2.5 hover:bg-zinc-800 transition">
            Crear estrategia →
          </a>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex gap-1 mb-6 bg-canvas border border-border rounded-lg p-1 w-fit">
            {([
              { key: 'all',        label: 'Todas',       count: counts.all },
              { key: 'draft',      label: 'Borrador',    count: counts.draft },
              { key: 'publishing', label: 'En progreso', count: counts.publishing },
              { key: 'done',       label: 'Completadas', count: counts.done },
            ] as const).map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-all font-medium ${filter === f.key ? 'bg-primary text-white' : 'text-secondary hover:text-primary'}`}>
                {f.label}
                {f.count > 0 && <span className={`text-2xs rounded px-1.5 py-0.5 ${filter === f.key ? 'bg-white/20' : 'bg-zinc-100'}`}>{f.count}</span>}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            {filtered.map(c => (
              <CampaignCard key={c.id} campaign={c} onDelete={() => remove(c.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
