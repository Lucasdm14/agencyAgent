'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Megaphone, Trash2, ChevronRight, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react'
import type { Campaign } from '@/lib/types'
import { getCampaigns, deleteCampaign } from '@/lib/storage'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [filter,    setFilter]    = useState<'all' | 'draft' | 'publishing' | 'done'>('all')
  const router = useRouter()

  useEffect(() => { setCampaigns(getCampaigns()) }, [])

  function remove(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('¿Eliminar esta campaña?')) return
    deleteCampaign(id)
    setCampaigns(getCampaigns())
  }

  const filtered = campaigns.filter(c => filter === 'all' || c.status === filter)
  const counts = {
    all: campaigns.length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    publishing: campaigns.filter(c => c.status === 'publishing').length,
    done: campaigns.filter(c => c.status === 'done').length,
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Megaphone size={20} className="text-blue-600" />
          <h1 className="text-xl font-semibold text-zinc-900">Campañas</h1>
        </div>
        <p className="text-sm text-zinc-500">Estrategias aprobadas listas para publicar. Hacé clic en una campaña para editar y agendar.</p>
      </div>

      {campaigns.length === 0 ? (
        <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-16 text-center">
          <Megaphone size={32} className="mx-auto mb-4 text-zinc-300" />
          <p className="text-base font-medium text-zinc-400 mb-1">Sin campañas</p>
          <p className="text-sm text-zinc-400 mb-5">Generá una estrategia y finalizala para que aparezca aquí.</p>
          <a href="/dashboard/strategy" className="inline-flex items-center gap-2 text-sm bg-zinc-900 text-white rounded-lg px-4 py-2.5 hover:bg-zinc-700 transition">
            Crear estrategia →
          </a>
        </div>
      ) : (
        <>
          <div className="flex gap-1 mb-6 bg-white border border-zinc-200 rounded-lg p-1 w-fit shadow-sm">
            {([
              { key: 'all',        label: 'Todas',        count: counts.all },
              { key: 'draft',      label: 'Borrador',     count: counts.draft },
              { key: 'publishing', label: 'En progreso',  count: counts.publishing },
              { key: 'done',       label: 'Completadas',  count: counts.done },
            ] as const).map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all font-medium ${filter === f.key ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'}`}>
                {f.label}
                {f.count > 0 && <span className={`text-2xs rounded px-1.5 py-0.5 ${filter === f.key ? 'bg-white/20' : 'bg-zinc-100'}`}>{f.count}</span>}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(c => {
              const published = c.posts.filter(p => p.status === 'published' || p.status === 'scheduled').length
              const pct = Math.round((published / c.posts.length) * 100)
              const scoreColor = c.overall_score >= 8 ? 'text-emerald-600' : c.overall_score >= 6 ? 'text-amber-600' : 'text-red-600'
              return (
                <div key={c.id}
                  onClick={() => router.push(`/dashboard/campaigns/${c.id}`)}
                  className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:border-zinc-400 hover:shadow-md cursor-pointer transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-zinc-900">{c.brand_name}</p>
                      <p className="text-sm text-zinc-500 mt-0.5">{c.period_label}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`text-2xl font-bold ${scoreColor}`}>{c.overall_score}<span className="text-xs text-zinc-400 font-normal">/10</span></p>
                      <button onClick={e => remove(c.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-zinc-500 mb-1">
                      <span>{published}/{c.posts.length} posts</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {(c.strengths.length > 0 || c.weaknesses.length > 0) && (
                    <div className="space-y-1 mb-3">
                      {c.strengths.slice(0, 1).map((s, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs">
                          <ThumbsUp size={10} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-zinc-600 truncate">{s}</span>
                        </div>
                      ))}
                      {c.weaknesses.slice(0, 1).map((w, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs">
                          <ThumbsDown size={10} className="text-amber-500 shrink-0 mt-0.5" />
                          <span className="text-zinc-600 truncate">{w}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>{new Date(c.created_at).toLocaleDateString('es-AR')}</span>
                    <span className="flex items-center gap-1 text-blue-600 font-medium group-hover:underline">
                      Ver y publicar <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
