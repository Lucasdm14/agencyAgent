'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Inbox, CheckCircle2, AlertTriangle } from 'lucide-react'
import { PostCard } from './post-card'

interface Post {
  id: string
  brand_id: string
  image_url: string
  platform: string
  generated_copy: string
  final_copy: string | null
  hashtags: string[] | null
  ai_rationale: string | null
  visual_description: string | null
  supervisor_score: number | null
  supervisor_validation: ClauseValidation[] | null
  critical_violations: number
  suggested_fix: string | null
  scheduled_date: string | null
  status: string
  created_at: string
  brands: { id: string; name: string; logo_url: string | null; webhook_url: string | null } | null
}

interface ClauseValidation {
  rule: string
  category: string
  passed: boolean
  comment: string | null
}

interface InboxViewProps {
  posts: Post[]
  brands: { id: string; name: string }[]
  userRole: string
}

export function InboxView({ posts: initialPosts, brands, userRole }: InboxViewProps) {
  const router = useRouter()
  const [posts, setPosts] = useState(initialPosts)
  const [selectedBrand, setSelectedBrand] = useState('all')
  const [loading, setLoading] = useState<string | null>(null)

  const filtered = selectedBrand === 'all'
    ? posts
    : posts.filter(p => p.brand_id === selectedBrand)

  const critical = filtered.filter(p => p.status === 'supervisor_review')
  const normal = filtered.filter(p => p.status === 'pm_review')

  async function handleApprove(postId: string, finalCopy: string, scheduledDate: string) {
    setLoading(postId)
    try {
      const res = await fetch('/api/approve-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, final_copy: finalCopy, scheduled_date: scheduledDate }),
      })
      const data = await res.json()
      if (data.success) {
        setPosts(prev => prev.filter(p => p.id !== postId))
        router.refresh()
      }
    } finally {
      setLoading(null)
    }
  }

  async function handleReject(postId: string, reason: string) {
    setLoading(postId)
    try {
      await fetch('/api/approve-post', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, reject_reason: reason }),
      })
      setPosts(prev => prev.filter(p => p.id !== postId))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Inbox className="w-6 h-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">Bandeja de Aprobación</h1>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            {filtered.length} pendiente{filtered.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos los clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los clientes</SelectItem>
            {brands.map(b => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <CheckCircle2 className="w-16 h-16 mb-4 text-green-400" />
          <p className="text-xl font-medium text-gray-600">Todo aprobado</p>
          <p className="text-sm mt-1">No hay posts pendientes de revisión.</p>
        </div>
      )}

      {/* Critical — supervisor flagged */}
      {critical.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-orange-700">Revisión sugerida ({critical.length})</h2>
            <span className="text-sm text-orange-500">El supervisor IA detectó más de 2 violaciones al brandbook</span>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {critical.map(post => (
              <PostCard
                key={post.id}
                post={post}
                loading={loading === post.id}
                onApprove={handleApprove}
                onReject={handleReject}
                highlightWarning
              />
            ))}
          </div>
        </section>
      )}

      {/* Normal queue */}
      {normal.length > 0 && (
        <section>
          {critical.length > 0 && (
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Cola normal ({normal.length})
            </h2>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            {normal.map(post => (
              <PostCard
                key={post.id}
                post={post}
                loading={loading === post.id}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
