'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Megaphone, ChevronLeft, Edit2, Save, X, Send, Loader2,
  CheckCircle2, Clock, AlertCircle, Hash, Calendar,
} from 'lucide-react'
import type { Campaign, CampaignPost, SocialAccount } from '@/lib/types'
import { getCampaigns, upsertCampaign, getBrandSocialAccounts } from '@/lib/storage'

const STATUS_CONFIG = {
  draft:      { label: 'Borrador',  color: 'text-zinc-500  bg-zinc-100   border-zinc-200' },
  scheduled:  { label: 'Agendado', color: 'text-amber-700 bg-amber-50   border-amber-200' },
  published:  { label: 'Publicado',color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  failed:     { label: 'Error',    color: 'text-red-700   bg-red-50     border-red-200' },
}

function PostEditor({ post, accounts, onSave }: {
  post:     CampaignPost
  accounts: SocialAccount[]
  onSave:   (p: CampaignPost) => void
}) {
  const [copy,       setCopy]       = useState(post.copy)
  const [hashtags,   setHashtags]   = useState(post.hashtags.join(' '))
  const [schedAt,    setSchedAt]    = useState(post.scheduled_at ?? '')
  const [publishing, setPublishing] = useState(false)
  const [editing,    setEditing]    = useState(false)
  const [msg,        setMsg]        = useState('')

  const acct      = accounts.find(a => a.platform === post.platform)
  const statusCfg = STATUS_CONFIG[post.status]
  const isPublished = post.status === 'published'

  function saveEdit() {
    onSave({ ...post, copy, hashtags: hashtags.split(/\s+/).filter(h => h.startsWith('#')), scheduled_at: schedAt || undefined })
    setEditing(false)
  }

  async function publish() {
    if (!schedAt) { setMsg('Seleccioná fecha y hora'); return }
    setPublishing(true); setMsg('')
    try {
      const payload = { platform: post.platform, copy, hashtags: post.hashtags, scheduled_at: schedAt, brand_name: '', post_id: post.id, handle: acct?.handle ?? '', page_id: acct?.page_id, access_token: acct?.access_token }
      const webhookUrl = acct?.webhook_url
      if (webhookUrl) {
        await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10_000) })
        onSave({ ...post, status: 'scheduled', scheduled_at: schedAt }); setMsg('✓ Enviado al webhook'); return
      }
      const res  = await fetch('/api/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { onSave({ ...post, status: 'failed', error_msg: data.error }); setMsg(`Error: ${data.error}`); return }
      onSave({ ...post, status: data.scheduled ? 'scheduled' : 'published', scheduled_at: schedAt })
      setMsg('✓ Publicado')
    } catch (e) { setMsg(`Error: ${e instanceof Error ? e.message : 'desconocido'}`) }
    finally { setPublishing(false) }
  }

  return (
    <div className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-colors ${post.status === 'failed' ? 'border-red-200' : 'border-zinc-200 hover:border-zinc-300'}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-50 border-b border-zinc-100">
        <span className="text-xs font-mono text-zinc-400">Día {post.day}</span>
        <span className="text-xs font-semibold text-blue-600 capitalize">{post.platform}</span>
        <span className="text-xs text-zinc-500 flex-1 truncate">{post.topic}</span>
        <span className={`text-2xs px-2 py-0.5 rounded border ${statusCfg.color}`}>{statusCfg.label}</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Copy */}
        {editing ? (
          <div className="space-y-2">
            <textarea value={copy} onChange={e => setCopy(e.target.value)} rows={5}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 resize-none" />
            <input value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="#hashtag1 #hashtag2"
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20" />
          </div>
        ) : (
          <div>
            <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">{post.copy}</p>
            {post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.hashtags.map((h, i) => <span key={i} className="text-2xs font-mono text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">{h}</span>)}
              </div>
            )}
          </div>
        )}

        {post.visual_direction && (
          <p className="text-2xs text-zinc-400 border-l-2 border-zinc-200 pl-2 italic">🎨 {post.visual_direction}</p>
        )}

        {/* Schedule + account */}
        {!isPublished && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-2xs font-medium text-zinc-500 mb-1">Fecha y hora</label>
              <input type="datetime-local" value={schedAt} onChange={e => setSchedAt(e.target.value)}
                className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-400 bg-white" />
            </div>
            <div>
              <label className="block text-2xs font-medium text-zinc-500 mb-1">Cuenta</label>
              {acct ? (
                <div className="border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-600 bg-zinc-50">
                  @{acct.handle}
                  {(acct.access_token || acct.webhook_url) ? <span className="ml-1 text-emerald-600">✓</span> : <span className="ml-1 text-amber-500">sin creds</span>}
                </div>
              ) : (
                <div className="border border-amber-200 rounded-lg px-2.5 py-1.5 text-2xs text-amber-700 bg-amber-50">
                  Sin cuenta. <a href="/dashboard/social" className="underline">Configurar →</a>
                </div>
              )}
            </div>
          </div>
        )}

        {msg && <p className={`text-xs rounded-lg px-3 py-2 ${msg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>{msg}</p>}
        {post.error_msg && !msg && <p className="text-xs rounded-lg px-3 py-2 bg-red-50 text-red-700 border border-red-100">{post.error_msg}</p>}

        {/* Actions */}
        {!isPublished && (
          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={() => { setEditing(false); setCopy(post.copy); setHashtags(post.hashtags.join(' ')) }}
                  className="flex items-center gap-1 text-xs border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 transition text-zinc-600">
                  <X size={11} /> Cancelar
                </button>
                <button onClick={saveEdit}
                  className="flex items-center gap-1.5 text-xs bg-zinc-900 text-white rounded-lg px-3 py-1.5 hover:bg-zinc-700 transition">
                  <Save size={11} /> Guardar
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1 text-xs border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 transition text-zinc-600">
                  <Edit2 size={11} /> Editar
                </button>
                <button onClick={publish} disabled={publishing || !schedAt}
                  className="flex items-center gap-1.5 text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 transition disabled:opacity-40 ml-auto">
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

export default function CampaignDetailPage() {
  const params   = useParams()
  const router   = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [accounts, setAccounts] = useState<SocialAccount[]>([])

  useEffect(() => {
    const found = getCampaigns().find(c => c.id === params.id)
    if (found) {
      setCampaign(found)
      setAccounts(getBrandSocialAccounts(found.brand_id))
    }
  }, [params.id])

  function updatePost(updated: CampaignPost) {
    if (!campaign) return
    const posts = campaign.posts.map(p => p.id === updated.id ? updated : p)
    const allDone = posts.every(p => p.status === 'published' || p.status === 'scheduled')
    const next = { ...campaign, posts, status: allDone ? 'done' as const : 'publishing' as const }
    setCampaign(next)
    upsertCampaign(next)
  }

  if (!campaign) return (
    <div className="flex items-center justify-center py-24 text-zinc-400">
      <AlertCircle size={20} className="mr-2" /> Campaña no encontrada
    </div>
  )

  const published = campaign.posts.filter(p => p.status === 'published' || p.status === 'scheduled').length
  const pct       = Math.round((published / campaign.posts.length) * 100)
  const scoreColor = campaign.overall_score >= 8 ? 'text-emerald-600' : campaign.overall_score >= 6 ? 'text-amber-600' : 'text-red-600'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/dashboard/campaigns')}
          className="p-2 rounded-lg hover:bg-zinc-100 transition text-zinc-500">
          <ChevronLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-blue-600" />
            <h1 className="text-xl font-semibold text-zinc-900">{campaign.brand_name}</h1>
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-600">{campaign.period_label}</span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5 ml-7">
            Estratega: {campaign.estratega_name} · Supervisor: {campaign.supervisor_name} · {new Date(campaign.created_at).toLocaleDateString('es-AR')}
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-zinc-500 mb-1">Score supervisor</p>
          <p className={`text-3xl font-bold ${scoreColor}`}>{campaign.overall_score}<span className="text-sm text-zinc-400 font-normal">/10</span></p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-zinc-500 mb-1">Posts totales</p>
          <p className="text-3xl font-bold text-zinc-900">{campaign.posts.length}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-zinc-500 mb-1">Publicados / Agendados</p>
          <p className="text-3xl font-bold text-blue-600">{published}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-zinc-500 mb-2">Progreso</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-bold text-zinc-700">{pct}%</span>
          </div>
        </div>
      </div>

      {/* Supervisor insights */}
      {(campaign.strengths.length > 0 || campaign.weaknesses.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-emerald-700 mb-2">👍 Puntos fuertes</p>
            {campaign.strengths.map((s, i) => <p key={i} className="text-xs text-emerald-700">• {s}</p>)}
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-700 mb-2">⚠️ Puntos débiles</p>
            {campaign.weaknesses.map((w, i) => <p key={i} className="text-xs text-red-700">• {w}</p>)}
          </div>
        </div>
      )}

      {/* Posts grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {campaign.posts.sort((a, b) => a.day - b.day).map(post => (
          <PostEditor key={post.id} post={post} accounts={accounts} onSave={updatePost} />
        ))}
      </div>
    </div>
  )
}
