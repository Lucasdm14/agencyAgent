'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Upload, X, ImageIcon, FileVideo } from 'lucide-react'

interface AddContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  brands: { id: string; name: string }[]
  userId: string
}

const contentTypes = [
  { value: 'social', label: 'Redes Sociales' },
  { value: 'ads', label: 'Publicidad' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Otro' },
]

const platforms = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
]

export function AddContentDialog({ open, onOpenChange, brands, userId }: AddContentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    brand_id: '',
    title: '',
    body: '',
    content_type: 'social',
    platform: '',
  })
  const [files, setFiles] = useState<File[]>([])
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
  
  const router = useRouter()
  const supabase = createClient()

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = e.target.files
    if (!selectedFiles) return

    setUploading(true)
    const newFiles = Array.from(selectedFiles)
    setFiles(prev => [...prev, ...newFiles])

    try {
      const urls: string[] = []
      for (const file of newFiles) {
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          const { pathname } = await response.json()
          // Store the API route URL for serving private files
          urls.push(`/api/file?pathname=${encodeURIComponent(pathname)}`)
        }
      }
      setUploadedUrls(prev => [...prev, ...urls])
    } catch (error) {
      console.error('Upload error:', error)
    }
    
    setUploading(false)
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setUploadedUrls(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('content')
      .insert({
        brand_id: formData.brand_id,
        title: formData.title || null,
        body: formData.body,
        content_type: formData.content_type,
        platform: formData.platform || null,
        status: 'pending_review',
        media_urls: uploadedUrls.length > 0 ? uploadedUrls : null,
        created_by: userId,
      })

    if (!error) {
      onOpenChange(false)
      setFormData({
        brand_id: '',
        title: '',
        body: '',
        content_type: 'social',
        platform: '',
      })
      setFiles([])
      setUploadedUrls([])
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">Agregar contenido para validacion</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Sube contenido con imagenes o videos para que el cliente lo valide
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Marca *</Label>
              <Select 
                value={formData.brand_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, brand_id: value }))}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Selecciona marca" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Tipo de contenido</Label>
              <Select 
                value={formData.content_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, content_type: value }))}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {contentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Plataforma</Label>
            <Select 
              value={formData.platform} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value }))}
            >
              <SelectTrigger className="bg-input border-border">
                <SelectValue placeholder="Selecciona plataforma (opcional)" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {platforms.map((platform) => (
                  <SelectItem key={platform.value} value={platform.value}>
                    {platform.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Titulo</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Titulo del contenido (opcional)"
              className="bg-input border-border text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Contenido *</Label>
            <Textarea
              value={formData.body}
              onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
              placeholder="El copy o texto del contenido..."
              rows={4}
              required
              className="bg-input border-border text-foreground resize-none"
            />
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <Label className="text-foreground">Imagenes / Videos</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4">
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {uploading ? 'Subiendo...' : 'Click para subir archivos'}
                </p>
              </label>
            </div>

            {files.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {files.map((file, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileVideo className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border text-foreground"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.brand_id || !formData.body}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Enviar a validacion'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
