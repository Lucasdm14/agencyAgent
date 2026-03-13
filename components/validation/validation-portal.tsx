'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  CheckCircle, XCircle, MessageSquare, Clock, 
  Eye, Send, Loader2, ImageIcon, FileVideo,
  ThumbsUp, ThumbsDown, AlertCircle, Plus
} from 'lucide-react'
import { AddContentDialog } from './add-content-dialog'
import { EditContentDialog } from './edit-content-dialog'
import { AssignValidatorDialog } from './assign-validator-dialog'
import type { Content, UserRole, Validation } from '@/lib/types'

interface ValidationPortalProps {
  content: (Content & { 
    brand: { id: string; name: string; logo_url: string | null } | null
    validations: (Validation & { client: { full_name: string } | null })[]
  })[]
  brands: { id: string; name: string }[]
  userRole: UserRole
  userId: string
}

// Helper to detect file type from URL (handles both direct URLs and API routes)
function getFileType(url: string): 'image' | 'video' | 'unknown' {
  const lowerUrl = url.toLowerCase()
  // Check for image extensions
  if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)($|\?)/i)) return 'image'
  // Check for video extensions
  if (lowerUrl.match(/\.(mp4|webm|mov|avi|mkv)($|\?)/i)) return 'video'
  // For API routes, try to extract filename from pathname param
  if (url.includes('/api/file?pathname=')) {
    const pathname = decodeURIComponent(url.split('pathname=')[1] || '')
    if (pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i)) return 'image'
    if (pathname.match(/\.(mp4|webm|mov|avi|mkv)$/i)) return 'video'
  }
  return 'unknown'
}

const statusConfig = {
  pending_review: { label: 'Pendiente', icon: Clock, color: 'bg-warning/20 text-warning border-warning/30' },
  approved: { label: 'Aprobado', icon: CheckCircle, color: 'bg-success/20 text-success border-success/30' },
  rejected: { label: 'Rechazado', icon: XCircle, color: 'bg-destructive/20 text-destructive border-destructive/30' },
  needs_changes: { label: 'Necesita cambios', icon: AlertCircle, color: 'bg-chart-3/20 text-chart-3 border-chart-3/30' },
}

export function ValidationPortal({ content, brands, userRole, userId }: ValidationPortalProps) {
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [selectedContent, setSelectedContent] = useState<typeof content[0] | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [validating, setValidating] = useState(false)
  const [addContentOpen, setAddContentOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const filteredContent = selectedBrand === 'all' 
    ? content 
    : content.filter(c => c.brand_id === selectedBrand)

  const pendingContent = filteredContent.filter(c => c.status === 'pending_review')
  const approvedContent = filteredContent.filter(c => c.status === 'approved')
  const rejectedContent = filteredContent.filter(c => c.status === 'rejected' || c.status === 'needs_changes')

  async function handleValidation(status: 'approved' | 'rejected' | 'needs_changes') {
    if (!selectedContent) return
    setValidating(true)

    // Create validation record
    await supabase
      .from('validations')
      .insert({
        content_id: selectedContent.id,
        client_id: userId,
        status,
        comment: comment || null,
      })

    // Update content status
    await supabase
      .from('content')
      .update({ status })
      .eq('id', selectedContent.id)

    setValidating(false)
    setDetailsOpen(false)
    setComment('')
    router.refresh()
  }

  function openDetails(item: typeof content[0]) {
    setSelectedContent(item)
    setDetailsOpen(true)
  }

  const ContentCard = ({ item }: { item: typeof content[0] }) => {
    const status = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.pending_review
    const StatusIcon = status.icon

    return (
      <Card 
        className="bg-card border-border hover:border-accent/50 transition-colors cursor-pointer"
        onClick={() => openDetails(item)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center">
                <span className="text-xs font-medium text-foreground">
                  {item.brand?.name.charAt(0) || '?'}
                </span>
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">
                  {item.brand?.name || 'Sin marca'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.platform || item.content_type}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={status.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>

          <h4 className="font-medium text-foreground mb-2 line-clamp-1">
            {item.title || 'Sin titulo'}
          </h4>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {item.body}
          </p>

          {/* Media preview thumbnails */}
          {item.media_urls && item.media_urls.length > 0 && (
            <div className="mb-3">
              <div className="grid grid-cols-3 gap-1.5">
                {item.media_urls.slice(0, 3).map((url, index) => {
                  const fileType = getFileType(url)
                  return (
                    <div 
                      key={index} 
                      className="relative aspect-square rounded-md overflow-hidden bg-secondary"
                    >
                      {fileType === 'image' ? (
                        <img 
                          src={url} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      ) : fileType === 'video' ? (
                        <video 
                          src={url} 
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      {index === 2 && item.media_urls && item.media_urls.length > 3 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            +{item.media_urls.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {item.media_urls.length} archivo(s) adjunto(s)
              </p>
            </div>
          )}

          {/* Validations history */}
          {item.validations && item.validations.length > 0 && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">
                {item.validations.length} comentario(s)
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
            <Button variant="outline" size="sm" className="flex-1 border-border text-foreground">
              <Eye className="h-3 w-3 mr-1" />
              Ver
            </Button>
            {userRole !== 'client' && (
              <>
                <div onClick={(e) => e.stopPropagation()}>
                  <EditContentDialog content={item} onUpdate={() => router.refresh()} />
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <AssignValidatorDialog content={item} onAssign={() => router.refresh()} />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="w-48 bg-input border-border">
                  <SelectValue placeholder="Todas las marcas" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">Todas las marcas</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {userRole !== 'client' && (
              <Button 
                onClick={() => setAddContentOpen(true)}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar contenido
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="pending" className="data-[state=active]:bg-warning/20 data-[state=active]:text-warning">
            <Clock className="h-4 w-4 mr-2" />
            Pendientes ({pendingContent.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="data-[state=active]:bg-success/20 data-[state=active]:text-success">
            <CheckCircle className="h-4 w-4 mr-2" />
            Aprobados ({approvedContent.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive">
            <XCircle className="h-4 w-4 mr-2" />
            Rechazados ({rejectedContent.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingContent.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingContent.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Clock className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No hay contenido pendiente de validacion</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="approved">
          {approvedContent.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvedContent.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <CheckCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No hay contenido aprobado</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rejected">
          {rejectedContent.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rejectedContent.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <XCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No hay contenido rechazado</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Content Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedContent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2">
                  <span>{selectedContent.brand?.name}</span>
                  <Badge variant="outline" className={
                    statusConfig[selectedContent.status as keyof typeof statusConfig]?.color
                  }>
                    {statusConfig[selectedContent.status as keyof typeof statusConfig]?.label}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {selectedContent.platform || selectedContent.content_type} - 
                  Creado el {new Date(selectedContent.created_at).toLocaleDateString('es-ES')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Content preview */}
                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <h4 className="font-medium text-foreground mb-2">
                    {selectedContent.title || 'Sin titulo'}
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedContent.body}
                  </p>
                </div>

                {/* Media preview - Full size */}
                {selectedContent.media_urls && selectedContent.media_urls.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-foreground text-sm">
                      Archivos adjuntos ({selectedContent.media_urls.length})
                    </h5>
                    <div className="space-y-3">
                      {selectedContent.media_urls.map((url, index) => {
                        const fileType = getFileType(url)
                        return (
                          <div key={index} className="relative rounded-lg overflow-hidden bg-secondary border border-border">
                            {fileType === 'image' ? (
                              <img 
                                src={url} 
                                alt={`Adjunto ${index + 1}`} 
                                className="w-full max-h-80 object-contain bg-black/5"
                              />
                            ) : fileType === 'video' ? (
                              <video 
                                src={url} 
                                controls
                                className="w-full max-h-80"
                              >
                                Tu navegador no soporta video
                              </video>
                            ) : (
                              <img 
                                src={url} 
                                alt={`Adjunto ${index + 1}`} 
                                className="w-full max-h-80 object-contain bg-black/5"
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Supervisor feedback */}
                {selectedContent.supervisor_feedback && (
                  <div className="p-3 rounded-lg bg-chart-2/10 border border-chart-2/30">
                    <h5 className="font-medium text-chart-2 text-sm mb-1">
                      Feedback del supervisor (Score: {selectedContent.supervisor_score}/10)
                    </h5>
                    <p className="text-sm text-muted-foreground">
                      {selectedContent.supervisor_feedback}
                    </p>
                  </div>
                )}

                {/* Validation history */}
                {selectedContent.validations && selectedContent.validations.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-foreground text-sm">Historial de validaciones</h5>
                    <div className="space-y-2">
                      {selectedContent.validations.map((validation) => (
                        <div 
                          key={validation.id}
                          className={`p-3 rounded-lg border ${
                            statusConfig[validation.status as keyof typeof statusConfig]?.color
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">
                              {validation.client?.full_name || 'Usuario'}
                            </span>
                            <span className="text-xs">
                              {new Date(validation.created_at).toLocaleDateString('es-ES')}
                            </span>
                          </div>
                          {validation.comment && (
                            <p className="text-sm text-muted-foreground">{validation.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add comment */}
                <div className="space-y-2">
                  <h5 className="font-medium text-foreground text-sm">Agregar comentario</h5>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Escribe tu feedback o comentario..."
                    rows={3}
                    className="bg-input border-border text-foreground resize-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => handleValidation('needs_changes')}
                  disabled={validating}
                  className="flex-1 border-chart-3 text-chart-3 hover:bg-chart-3/10"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Necesita cambios
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleValidation('rejected')}
                  disabled={validating}
                  className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Rechazar
                </Button>
                <Button
                  onClick={() => handleValidation('approved')}
                  disabled={validating}
                  className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                >
                  {validating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ThumbsUp className="h-4 w-4 mr-2" />
                  )}
                  Aprobar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AddContentDialog
        open={addContentOpen}
        onOpenChange={setAddContentOpen}
        brands={brands}
        userId={userId}
      />
    </div>
  )
}
