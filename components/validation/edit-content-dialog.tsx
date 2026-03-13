'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Pencil, Upload, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Content } from '@/lib/types'

interface EditContentDialogProps {
  content: Content
  onUpdate: () => void
}

// Helper to detect file type from URL (handles both direct URLs and API routes)
function getFileType(url: string): 'image' | 'video' | 'unknown' {
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)($|\?)/i)) return 'image'
  if (lowerUrl.match(/\.(mp4|webm|mov|avi|mkv)($|\?)/i)) return 'video'
  if (url.includes('/api/file?pathname=')) {
    const pathname = decodeURIComponent(url.split('pathname=')[1] || '')
    if (pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i)) return 'image'
    if (pathname.match(/\.(mp4|webm|mov|avi|mkv)$/i)) return 'video'
  }
  return 'unknown'
}

export function EditContentDialog({ content, onUpdate }: EditContentDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState(content.title || '')
  const [body, setBody] = useState(content.body)
  const [platform, setPlatform] = useState(content.platform || '')
  const [mediaUrls, setMediaUrls] = useState<string[]>(content.media_urls || [])
  const [uploading, setUploading] = useState(false)

  const supabase = createClient()

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const newUrls: string[] = []

    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          const { pathname } = await response.json()
          // Store the API route URL for serving private files
          newUrls.push(`/api/file?pathname=${encodeURIComponent(pathname)}`)
        }
      } catch (error) {
        console.error('Error uploading file:', error)
      }
    }

    setMediaUrls([...mediaUrls, ...newUrls])
    setUploading(false)
  }

  function removeMedia(index: number) {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('content')
      .update({
        title,
        body,
        platform: platform || null,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', content.id)

    if (error) {
      console.error('Error updating content:', error)
      alert('Error al actualizar el contenido')
    } else {
      setOpen(false)
      onUpdate()
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-border">
          <Pencil className="h-4 w-4 mr-1" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Editar Contenido</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Modifica el contenido antes de enviarlo a validacion
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">Titulo</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titulo del contenido"
              className="bg-input border-border text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Contenido *</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Texto del copy..."
              rows={6}
              required
              className="bg-input border-border text-foreground resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Plataforma</Label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-input border border-border text-foreground"
            >
              <option value="">Seleccionar plataforma</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
              <option value="linkedin">LinkedIn</option>
              <option value="twitter">Twitter/X</option>
              <option value="google_ads">Google Ads</option>
              <option value="meta_ads">Meta Ads</option>
              <option value="email">Email</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Archivos adjuntos</Label>
            
            {mediaUrls.length > 0 && (
              <div className="space-y-2 mb-3">
                {mediaUrls.map((url, index) => {
                  const fileType = getFileType(url)
                  return (
                    <div key={index} className="relative group rounded-lg overflow-hidden border border-border">
                      {fileType === 'image' ? (
                        <img
                          src={url}
                          alt={`Media ${index + 1}`}
                          className="w-full max-h-48 object-contain bg-black/5"
                        />
                      ) : fileType === 'video' ? (
                        <video
                          src={url}
                          className="w-full max-h-48"
                          controls
                        >
                          Tu navegador no soporta video
                        </video>
                      ) : (
                        <img
                          src={url}
                          alt={`Media ${index + 1}`}
                          className="w-full max-h-48 object-contain bg-black/5"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(index)}
                        className="absolute top-2 right-2 p-1.5 bg-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3 text-destructive-foreground" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                className="bg-input border-border text-foreground"
              />
              {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-border"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !body.trim()}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar cambios'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
