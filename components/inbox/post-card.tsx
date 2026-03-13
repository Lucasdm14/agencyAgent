'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  CheckCircle2, XCircle, RefreshCw, ChevronDown, ChevronUp,
  Loader2, AlertTriangle, Hash, Lightbulb, Eye
} from 'lucide-react'

interface ClauseValidation {
  rule: string
  category: string
  passed: boolean
  comment: string | null
}

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
  brands: { id: string; name: string; logo_url: string | null } | null
}

interface PostCardProps {
  post: Post
  loading: boolean
  highlightWarning?: boolean
  onApprove: (postId: string, finalCopy: string, scheduledDate: string) => Promise<void>
  onReject: (postId: string, reason: string) => Promise<void>
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: '📸 Instagram',
  linkedin: '💼 LinkedIn',
  facebook: '👥 Facebook',
  twitter: '🐦 Twitter/X',
  tiktok: '🎵 TikTok',
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 8 ? 'bg-green-500' : score >= 6 ? 'bg-yellow-500' : 'bg-red-500'
  const label = score >= 8 ? 'text-green-700' : score >= 6 ? 'text-yellow-700' : 'text-red-700'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className={`text-sm font-bold ${label}`}>{score}/10</span>
    </div>
  )
}

export function PostCard({ post, loading, highlightWarning = false, onApprove, onReject }: PostCardProps) {
  const [editedCopy, setEditedCopy] = useState(post.final_copy ?? post.generated_copy)
  const [scheduledDate, setScheduledDate] = useState(
    post.scheduled_date ? post.scheduled_date.slice(0, 16) : ''
  )
  const [showValidation, setShowValidation] = useState(highlightWarning)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [regenerating, setRegenerating] = useState(false)

  const isEdited = editedCopy !== post.generated_copy
  const violations = post.supervisor_validation?.filter(v => !v.passed) ?? []
  const score = post.supervisor_score ?? 0

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      const res = await fetch('/api/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: post.brand_id,
          image_url: post.image_url,
          platform: post.platform,
        }),
      })
      const data = await res.json()
      if (data.post) {
        setEditedCopy(data.post.generated_copy)
      }
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <Card className={`overflow-hidden border-2 transition-all ${
      highlightWarning
        ? 'border-orange-300 shadow-orange-100 shadow-lg'
        : 'border-gray-200 hover:border-purple-200 hover:shadow-md'
    }`}>
      {highlightWarning && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium text-orange-700">
            {post.critical_violations} violación{post.critical_violations !== 1 ? 'es' : ''} al brandbook detectada{post.critical_violations !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 divide-x divide-gray-100">
        {/* Left: Image */}
        <div className="relative bg-gray-50 min-h-64">
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src={`/api/proxy-image?pathname=${encodeURIComponent(post.image_url)}`}
              alt="Post image"
              className="object-cover w-full h-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.jpg'
              }}
            />
          </div>
          <div className="absolute top-2 left-2">
            <Badge className="bg-black/60 text-white text-xs border-0">
              {PLATFORM_LABELS[post.platform] ?? post.platform}
            </Badge>
          </div>
          {post.brands && (
            <div className="absolute bottom-2 left-2">
              <Badge variant="secondary" className="bg-white/90 text-gray-700 text-xs">
                {post.brands.name}
              </Badge>
            </div>
          )}
        </div>

        {/* Right: Copy + Controls */}
        <CardContent className="p-4 flex flex-col gap-3">
          {/* Supervisor Score */}
          {score > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 font-medium">Score Supervisor IA</span>
                <button
                  onClick={() => setShowValidation(v => !v)}
                  className="text-xs text-purple-600 hover:underline flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  {showValidation ? 'Ocultar' : 'Ver cláusulas'}
                  {showValidation ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
              <ScoreBar score={score} />
            </div>
          )}

          {/* Clause Validations */}
          {showValidation && post.supervisor_validation && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 max-h-40 overflow-y-auto">
              {post.supervisor_validation.map((v, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  {v.passed
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                    : <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                  }
                  <div>
                    <span className={v.passed ? 'text-gray-600' : 'text-red-700 font-medium'}>{v.rule}</span>
                    {v.comment && <p className="text-gray-400 mt-0.5">{v.comment}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Suggested fix */}
          {post.suggested_fix && violations.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-2.5 flex items-start gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">{post.suggested_fix}</p>
            </div>
          )}

          {/* Copy editor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-gray-500">Copy</Label>
              {isEdited && (
                <span className="text-xs text-purple-600 font-medium">✏️ Editado</span>
              )}
            </div>
            <Textarea
              value={editedCopy}
              onChange={e => setEditedCopy(e.target.value)}
              className="text-sm min-h-28 resize-none"
              placeholder="Copy generado por IA..."
            />
          </div>

          {/* Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="flex items-start gap-1.5 flex-wrap">
              <Hash className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
              {post.hashtags.map((tag, i) => (
                <span key={i} className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Rationale */}
          {post.ai_rationale && (
            <p className="text-xs text-gray-400 italic border-t border-gray-100 pt-2">
              💡 {post.ai_rationale}
            </p>
          )}

          {/* Date picker */}
          <div>
            <Label className="text-xs text-gray-500">Fecha y hora de publicación</Label>
            <Input
              type="datetime-local"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              className="mt-1 text-sm"
            />
          </div>

          {/* Action buttons */}
          {!showRejectInput ? (
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={handleRegenerate}
                disabled={loading || regenerating}
              >
                {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                Regenerar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setShowRejectInput(true)}
                disabled={loading}
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Rechazar
              </Button>
              <Button
                size="sm"
                className="flex-1 text-xs bg-purple-600 hover:bg-purple-700"
                onClick={() => onApprove(post.id, editedCopy, scheduledDate)}
                disabled={loading || !scheduledDate}
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                Aprobar
              </Button>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <Input
                placeholder="Razón del rechazo (opcional)"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setShowRejectInput(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1 text-xs"
                  onClick={() => onReject(post.id, rejectReason)}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
                  Confirmar rechazo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  )
}
