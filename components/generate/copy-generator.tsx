'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Loader2, Sparkles, Copy, Check, Send, Calendar, Clock,
  Instagram, Facebook, Twitter, Linkedin, Mail, Megaphone,
  ThumbsUp, ThumbsDown, MessageSquare, Users, CheckCircle2, XCircle, Lightbulb,
  ImagePlus, X, Film, Image as ImageIcon
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { StrategistOutput } from './strategist-output'
import { StrategicWorkflow } from './strategic-workflow'

interface MetricsAccount {
  id: string
  name: string
  platform: string
  platform_username: string | null
  follower_count: number | null
  engagement_rate: number | null
  avg_likes: number | null
  avg_comments: number | null
  avg_views: number | null
  brand_id: string | null
}

interface CopyGeneratorProps {
  brands: { id: string; name: string }[]
  agents: { id: string; name: string; brand_id: string; type: string }[]
  metricsAccounts?: MetricsAccount[]
  initialStrategyId?: string
}

interface GeneratedCopy {
  title: string
  body: string
  hashtags: string[] | null
  cta: string | null
}

interface SupervisorFeedback {
  score: number
  approved: boolean
  feedback: string
  suggestions: string[]
  improvedVersion: string | null
}

interface WorkflowResult {
  success: boolean
  rejected?: boolean
  multiple?: boolean
  count?: number
  approved?: number
  content?: any
  contents?: any[]
  workflow?: {
    creator: {
      agent: string
      content: string
      hashtags?: string[]
    }
    supervisor: {
      agent: string
      approved: boolean
      feedback: string
      revised_content?: string
      suggestions?: string[]
    }
    strategist?: {
      agent: string
      strategy: string
    }
  }
  workflows?: Array<{
    index: number
    creator: {
      agent: string
      content: string
      hashtags?: string[]
    }
    supervisor: {
      agent: string
      approved: boolean
      feedback: string
      revised_content?: string
    }
    strategist?: {
      agent: string
      strategy: string
    } | null
  }>
}

const platforms = [
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'twitter', label: 'Twitter/X', icon: Twitter },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'tiktok', label: 'TikTok', icon: Megaphone },
  { value: 'google_ads', label: 'Google Ads', icon: Megaphone },
  { value: 'meta_ads', label: 'Meta Ads', icon: Megaphone },
  { value: 'email', label: 'Email', icon: Mail },
]

const contentTypes = [
  { value: 'social', label: 'Redes Sociales' },
  { value: 'ads', label: 'Publicidad Paga' },
  { value: 'email', label: 'Email Marketing' },
  { value: 'other', label: 'Otro' },
]

export function CopyGenerator({ brands, agents, metricsAccounts = [], initialStrategyId }: CopyGeneratorProps) {
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [selectedCreatorAgent, setSelectedCreatorAgent] = useState<string>('')
  const [selectedSupervisorAgent, setSelectedSupervisorAgent] = useState<string>('')
  const [selectedStrategistAgent, setSelectedStrategistAgent] = useState<string>('')
  const [generationMode, setGenerationMode] = useState<'context' | 'free' | 'agents' | 'strategy'>('strategy')
  const [workflowResult, setWorkflowResult] = useState<WorkflowResult | null>(null)
  const [workflowLoading, setWorkflowLoading] = useState(false)
  const [topic, setTopic] = useState('')
  const [contentType, setContentType] = useState('social')
  const [platform, setPlatform] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [freePrompt, setFreePrompt] = useState('')
  const [copyCount, setCopyCount] = useState(10)
  const [loading, setLoading] = useState(false)
  const [copies, setCopies] = useState<GeneratedCopy[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [supervisorLoading, setSupervisorLoading] = useState<number | null>(null)
  const [supervisorFeedback, setSupervisorFeedback] = useState<Record<number, SupervisorFeedback>>({})
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [savedCopies, setSavedCopies] = useState<Set<number>>(new Set())
  const [regeneratingStrategy, setRegeneratingStrategy] = useState(false)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  
  const supabase = createClient()
  
  // Handle file attachment
  function handleFileAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file type (images and videos)
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
    if (!validTypes.includes(file.type)) {
      alert('Formato no soportado. Usa JPG, PNG, GIF, WebP o MP4.')
      return
    }
    
    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      alert('El archivo es muy grande. Maximo 20MB.')
      return
    }
    
    setAttachedFile(file)
    
    // Create preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => setAttachedPreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      // For videos, create a video thumbnail or just show icon
      setAttachedPreview(null)
    }
  }
  
  function removeAttachment() {
    setAttachedFile(null)
    setAttachedPreview(null)
  }

  // Regenerate strategy proposal
  async function handleRegenerateStrategy() {
    if (!workflowResult || !selectedBrand) return
    
    setRegeneratingStrategy(true)
    
    try {
      // Get the content to analyze
      const contentText = workflowResult.workflows?.[0]?.supervisor?.revised_content || 
                         workflowResult.workflows?.[0]?.creator?.content ||
                         workflowResult.workflow?.supervisor?.revised_content ||
                         workflowResult.workflow?.creator?.content || ''
      
      // Call the strategist API to regenerate
      const response = await fetch('/api/content/strategist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrand,
          content: contentText,
          platform,
          contentType,
        }),
      })

      if (response.ok) {
        const newStrategy = await response.json()
        
        // Update the workflowResult with new strategy
        if (workflowResult.workflows) {
          const updatedWorkflows = workflowResult.workflows.map(wf => ({
            ...wf,
            strategist: newStrategy.strategist
          }))
          setWorkflowResult({ ...workflowResult, workflows: updatedWorkflows })
        } else if (workflowResult.workflow) {
          setWorkflowResult({
            ...workflowResult,
            workflow: {
              ...workflowResult.workflow,
              strategist: newStrategy.strategist
            }
          })
        }
      } else {
        const error = await response.json()
        alert('Error al regenerar estrategia: ' + (error.error || 'Error desconocido'))
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setRegeneratingStrategy(false)
    }
  }

  // User approval - sends content to Validation module
  async function handleApproveContent(contentId: string | undefined) {
    if (!contentId) {
      alert('Error: No se encontro el ID del contenido')
      return
    }
    
    const { data, error } = await supabase
      .from('content')
      .update({ 
        status: 'pending_review', // Goes to Validation module
        workflow_status: 'ready_for_validation',
        user_approved_at: new Date().toISOString()
      })
      .eq('id', contentId)
      .select()

    if (error) {
      alert('Error al aprobar: ' + error.message)
    } else {
      // Update local state
      if (workflowResult) {
        const updatedContents = workflowResult.contents?.map((c: any) => 
          c.id === contentId ? { ...c, status: 'pending_review' } : c
        )
        setWorkflowResult({ ...workflowResult, contents: updatedContents })
      }
      alert('Contenido enviado a Validacion')
    }
  }

  // User rejection
  async function handleRejectContent(contentId: string | undefined) {
    
    if (!contentId) {
      alert('Error: No se encontro el ID del contenido')
      return
    }
    
    const { data, error } = await supabase
      .from('content')
      .update({ 
        status: 'rejected',
        workflow_status: 'user_rejected'
      })
      .eq('id', contentId)
      .select()

    if (error) {
      alert('Error al rechazar: ' + error.message)
    } else {
      // Update local state
      if (workflowResult) {
        const updatedContents = workflowResult.contents?.map((c: any) => 
          c.id === contentId ? { ...c, status: 'rejected' } : c
        )
        setWorkflowResult({ ...workflowResult, contents: updatedContents })
      }
      alert('Contenido rechazado')
    }
  }

  async function handleGenerate() {
    if (generationMode === 'context' && !selectedBrand) {
      alert("Por favor selecciona una marca primero")
      return
    }
    
    if (generationMode === 'free' && !freePrompt.trim()) {
      alert("Por favor escribe un prompt")
      return
    }
    
    setLoading(true)
    setCopies([])
    setSupervisorFeedback({})

    try {
      const response = await fetch('/api/generate-copies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: generationMode === 'context' ? selectedBrand : undefined,
          contentType: generationMode === 'context' ? contentType : 'other',
          platform: generationMode === 'context' ? (platform || undefined) : undefined,
          customPrompt: generationMode === 'context' ? (customPrompt || undefined) : undefined,
          freePrompt: generationMode === 'free' ? freePrompt : undefined,
          count: copyCount,
          mode: generationMode,
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        alert(data.error || 'Error generando copies. Por favor intenta de nuevo.')
        return
      }

      setCopies(data.copies || [])
    } catch (error) {
      console.error('Error:', error)
      alert('Error de conexion. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSupervisorReview(index: number, copy: GeneratedCopy) {
    setSupervisorLoading(index)

    try {
      const response = await fetch('/api/supervisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrand,
          content: `${copy.title}\n\n${copy.body}${copy.hashtags ? '\n\n' + copy.hashtags.join(' ') : ''}`,
          contentType,
          platform: platform || undefined,
        }),
      })

      if (!response.ok) throw new Error('Error getting supervisor feedback')

      const feedback = await response.json()
      setSupervisorFeedback(prev => ({ ...prev, [index]: feedback }))
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setSupervisorLoading(null)
    }
  }

  async function handleSaveCopy(index: number, copy: GeneratedCopy, status: string = 'draft') {
    setSavingIndex(index)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const feedback = supervisorFeedback[index]

    const { error } = await supabase
      .from('content')
      .insert({
        brand_id: selectedBrand || null,
        title: copy.title,
        body: `${copy.body}${copy.hashtags ? '\n\n' + copy.hashtags.join(' ') : ''}${copy.cta ? '\n\nCTA: ' + copy.cta : ''}`,
        content_type: generationMode === 'context' ? contentType : 'other',
        platform: generationMode === 'context' ? (platform || null) : null,
        status,
        supervisor_feedback: feedback?.feedback || null,
        supervisor_score: feedback?.score || null,
        created_by: user.id,
      })

    if (error) {
      console.error('Error saving copy:', error)
      alert('Error al guardar el copy')
    } else {
      setSavedCopies(prev => new Set(prev).add(index))
    }

    setSavingIndex(null)
  }

  function handleCopyToClipboard(index: number, copy: GeneratedCopy) {
    const text = `${copy.title}\n\n${copy.body}${copy.hashtags ? '\n\n' + copy.hashtags.join(' ') : ''}${copy.cta ? '\n\nCTA: ' + copy.cta : ''}`
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const brandAgents = agents.filter(a => a.brand_id === selectedBrand)
  const creatorAgents = brandAgents.filter(a => a.type === 'creator')
  const supervisorAgents = brandAgents.filter(a => a.type === 'supervisor')
  const strategistAgents = brandAgents.filter(a => a.type === 'strategist')
  const hasAllAgents = creatorAgents.length > 0 && supervisorAgents.length > 0 && strategistAgents.length > 0

  async function handleWorkflowGenerate() {
    if (!selectedBrand || !platform) {
      alert('Selecciona una marca y plataforma')
      return
    }

    if (!hasAllAgents) {
      alert('La marca necesita tener los 3 agentes configurados: Creador, Supervisor y Estratega')
      return
    }

    setWorkflowLoading(true)
    setWorkflowResult(null)

    try {
      // Upload attached file if exists
      let attachmentUrl: string | undefined
      let attachmentType: 'image' | 'video' | undefined
      
      if (attachedFile) {
        setUploadingAttachment(true)
        try {
          const formData = new FormData()
          formData.append('file', attachedFile)
          
          const uploadResponse = await fetch('/api/upload-attachment', {
            method: 'POST',
            body: formData,
          })
          
          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json()
            attachmentUrl = uploadData.url
            attachmentType = attachedFile.type.startsWith('video/') ? 'video' : 'image'
          }
        } catch (uploadError) {
          console.error('Error uploading attachment:', uploadError)
        }
        setUploadingAttachment(false)
      }
      
      const response = await fetch('/api/content/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: selectedBrand,
          platform,
          content_type: contentType,
          topic: topic || undefined,
          additional_context: customPrompt || undefined,
          action: 'create',
          count: copyCount,
          // IDs de agentes seleccionados (permite elegir entre múltiples agentes del mismo tipo)
          creator_agent_id: selectedCreatorAgent || undefined,
          supervisor_agent_id: selectedSupervisorAgent || undefined,
          strategist_agent_id: selectedStrategistAgent || undefined,
          // Attachment info for visual analysis
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        if (data.missing) {
          alert(`Faltan agentes: ${data.missing.creator ? 'Creador, ' : ''}${data.missing.supervisor ? 'Supervisor, ' : ''}${data.missing.strategist ? 'Estratega' : ''}`)
        } else {
          alert(data.error || 'Error en el flujo de trabajo')
        }
        return
      }

      setWorkflowResult(data)
    } catch (error) {
      console.error('Workflow error:', error)
      alert('Error de conexión')
    } finally {
      setWorkflowLoading(false)
    }
  }

  // If in strategy mode, render full width layout
  if (generationMode === 'strategy') {
    return (
      <div className="space-y-4">
        {/* Mode Tabs - Always visible */}
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-2">
            <Tabs value={generationMode} onValueChange={(v) => setGenerationMode(v as 'context' | 'free' | 'agents' | 'strategy')}>
              <TabsList className="grid w-full max-w-md grid-cols-4 bg-secondary">
                <TabsTrigger value="strategy" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-xs">
                  Estrategia
                </TabsTrigger>
                <TabsTrigger value="agents" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-xs">
                  Con Agentes
                </TabsTrigger>
                <TabsTrigger value="context" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-xs">
                  Con Contexto
                </TabsTrigger>
                <TabsTrigger value="free" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-xs">
                  Prompt Libre
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Full Width Strategic Workflow */}
        <StrategicWorkflow brands={brands} agents={agents} metricsAccounts={metricsAccounts} initialStrategyId={initialStrategyId} />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Configuration Panel */}
      <Card className="bg-card border-border lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-card-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Generador de Copys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Tabs */}
          <Tabs value={generationMode} onValueChange={(v) => setGenerationMode(v as 'context' | 'free' | 'agents' | 'strategy')}>
            <TabsList className="grid w-full grid-cols-4 bg-secondary">
              <TabsTrigger value="strategy" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-xs">
                Estrategia
              </TabsTrigger>
              <TabsTrigger value="agents" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-xs">
                Con Agentes
              </TabsTrigger>
              <TabsTrigger value="context" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-xs">
                Con Contexto
              </TabsTrigger>
              <TabsTrigger value="free" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-xs">
                Prompt Libre
              </TabsTrigger>
            </TabsList>

            <TabsContent value="context" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-foreground">Marca *</Label>
                {brands.length === 0 ? (
                  <p className="text-sm text-destructive">No hay marcas creadas. Crea una marca primero.</p>
                ) : (
                  <select 
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full h-10 px-3 rounded-md bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Selecciona una marca</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Tipo de contenido</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger className="bg-input border-border text-foreground">
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

              <div className="space-y-2">
                <Label className="text-foreground">Plataforma</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <SelectValue placeholder="Selecciona plataforma (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {platforms.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex items-center gap-2">
                          <p.icon className="h-4 w-4" />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Instrucciones adicionales</Label>
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Ej: Enfocate en la promocion de verano, usa tono juvenil..."
                  rows={3}
                  className="bg-input border-border text-foreground resize-none"
                />
              </div>
            </TabsContent>

            <TabsContent value="agents" className="space-y-4 mt-4">
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-accent" />
                  <span className="font-medium text-sm text-foreground">Flujo con Agentes</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  El Creador genera → El Supervisor valida → El Estratega crea la estrategia
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Marca *</Label>
                {brands.length === 0 ? (
                  <p className="text-sm text-destructive">No hay marcas creadas.</p>
                ) : (
                  <select 
                    value={selectedBrand}
                    onChange={(e) => {
                      setSelectedBrand(e.target.value)
                      // Reset agent selections when brand changes
                      setSelectedCreatorAgent('')
                      setSelectedSupervisorAgent('')
                      setSelectedStrategistAgent('')
                    }}
                    className="w-full h-10 px-3 rounded-md bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Selecciona una marca</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedBrand && !hasAllAgents && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <p className="text-xs text-destructive">
                    Esta marca necesita los 3 agentes: Creador, Supervisor y Estratega
                  </p>
                </div>
              )}

              {selectedBrand && hasAllAgents && (
                <div className="space-y-3 p-3 bg-secondary/50 rounded-lg border border-border">
                  <p className="text-xs font-medium text-foreground">Selecciona los agentes para este contenido:</p>
                  
                  {/* Creator Agent Selector */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>Creador</span>
                      {creatorAgents.length > 1 && (
                        <Badge variant="outline" className="text-[10px] px-1">{creatorAgents.length} disponibles</Badge>
                      )}
                    </Label>
                    <Select 
                      value={selectedCreatorAgent} 
                      onValueChange={setSelectedCreatorAgent}
                    >
                      <SelectTrigger className="bg-input border-border text-foreground h-8 text-sm">
                        <SelectValue placeholder="Seleccionar creador..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {creatorAgents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Supervisor Agent Selector */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>Supervisor</span>
                      {supervisorAgents.length > 1 && (
                        <Badge variant="outline" className="text-[10px] px-1">{supervisorAgents.length} disponibles</Badge>
                      )}
                    </Label>
                    <Select 
                      value={selectedSupervisorAgent} 
                      onValueChange={setSelectedSupervisorAgent}
                    >
                      <SelectTrigger className="bg-input border-border text-foreground h-8 text-sm">
                        <SelectValue placeholder="Seleccionar supervisor..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {supervisorAgents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Strategist Agent Selector */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>Estratega</span>
                      {strategistAgents.length > 1 && (
                        <Badge variant="outline" className="text-[10px] px-1">{strategistAgents.length} disponibles</Badge>
                      )}
                    </Label>
                    <Select 
                      value={selectedStrategistAgent} 
                      onValueChange={setSelectedStrategistAgent}
                    >
                      <SelectTrigger className="bg-input border-border text-foreground h-8 text-sm">
                        <SelectValue placeholder="Seleccionar estratega..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {strategistAgents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-foreground">Plataforma *</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <SelectValue placeholder="Selecciona plataforma" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {platforms.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex items-center gap-2">
                          <p.icon className="h-4 w-4" />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Tema / Idea</Label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ej: Lanzamiento de producto, Black Friday..."
                  className="bg-input border-border text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Contexto adicional</Label>
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Instrucciones adicionales para los agentes..."
                  rows={2}
                  className="bg-input border-border text-foreground resize-none"
                />
              </div>

              {/* Adjuntar contenido visual */}
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <ImagePlus className="h-4 w-4" />
                  Adjuntar contenido (opcional)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Sube una imagen o video y la IA generara copys basados en el contenido visual
                </p>
                
                {attachedFile ? (
                  <div className="relative p-3 rounded-lg border border-border bg-secondary/30">
                    <div className="flex items-center gap-3">
                      {attachedPreview ? (
                        <img 
                          src={attachedPreview} 
                          alt="Preview" 
                          className="w-16 h-16 object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-md bg-accent/20 flex items-center justify-center">
                          <Film className="h-6 w-6 text-accent" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {attachedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {attachedFile.type.startsWith('video/') ? 'Video' : 'Imagen'} • {(attachedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={removeAttachment}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-2 pb-3">
                      <ImagePlus className="h-6 w-6 text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-accent">Click para subir</span> o arrastra
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        JPG, PNG, GIF, MP4 (max 20MB)
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
                      onChange={handleFileAttachment}
                    />
                  </label>
                )}
              </div>

              {/* Cantidad de copys */}
              <div className="space-y-2">
                <Label className="text-foreground">Cantidad de copys a generar</Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 5].map((num) => (
                    <Button
                      key={num}
                      type="button"
                      variant={copyCount === num ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCopyCount(num)}
                      className={copyCount === num ? 'bg-accent text-accent-foreground' : 'border-border'}
                    >
                      {num}
                    </Button>
                  ))}
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={copyCount}
                    onChange={(e) => setCopyCount(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-20 bg-input border-border text-foreground"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{'Flujo: Creador → Supervisor → Estratega (max 5 copys)'}</p>
              </div>

              <Button 
                onClick={handleWorkflowGenerate}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={workflowLoading || !selectedBrand || !platform || !hasAllAgents}
              >
                {workflowLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando flujo...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Generar {copyCount} copy{copyCount > 1 ? 's' : ''} con Agentes
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="free" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-foreground">Marca (opcional)</Label>
                <select 
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Sin contexto de marca</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {selectedBrand 
                    ? 'Se usara el contexto de esta marca para generar contenido alineado'
                    : 'Sin marca seleccionada, el prompt es completamente libre'
                  }
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Tu prompt *</Label>
                <Textarea
                  value={freePrompt}
                  onChange={(e) => setFreePrompt(e.target.value)}
                  placeholder={selectedBrand 
                    ? "Ej: Genera 5 ideas de hooks para un video de TikTok sobre nuestro nuevo producto..."
                    : "Escribe exactamente lo que necesitas generar. Ej: Genera 5 ideas de hooks para un video de TikTok sobre productividad para emprendedores..."
                  }
                  rows={6}
                  className="bg-input border-border text-foreground resize-none"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label className="text-foreground">Cantidad de copys</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={copyCount}
              onChange={(e) => setCopyCount(parseInt(e.target.value) || 10)}
              className="bg-input border-border text-foreground"
            />
          </div>

          <Button 
            onClick={handleGenerate}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={loading || (generationMode === 'context' && !selectedBrand) || (generationMode === 'free' && !freePrompt.trim())}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generar {copyCount} Copys
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Panel */}
      <Card className="bg-card border-border lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-card-foreground">Copys Generados</CardTitle>
          <CardDescription className="text-muted-foreground">
            {copies.length > 0 
              ? `${copies.length} copys generados - Revisa, edita y guarda`
              : 'Los copys apareceran aqui'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Workflow Results */}
          {generationMode === 'agents' && workflowResult && (
            <div className="space-y-4">
              {/* Workflow Summary */}
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-accent" />
                  <span className="font-medium text-foreground">
                    {workflowResult.count && workflowResult.count > 1 
                      ? `${workflowResult.count} copys generados - Pendientes de tu aprobacion`
                      : 'Copy generado - Pendiente de tu aprobacion'
                    }
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Los agentes procesaron el contenido. Revisa y aprueba los que quieras publicar.
                </p>
              </div>

              {/* Multiple copies display with approve/reject buttons */}
              {workflowResult.workflows && workflowResult.workflows.length > 0 ? (
                <div className="space-y-4">
                  {workflowResult.workflows
                    .filter((wf: any) => wf.creator?.content) // Filter out empty copies
                    .map((wf: any) => {
                    // Get contentId directly from workflow (set by API) or find by index
                    const originalIndex = wf.index - 1 // wf.index is 1-based
                    const contentId = wf.contentId || workflowResult.contents?.[originalIndex]?.id
                    const content = workflowResult.contents?.[originalIndex]
                    const status = content?.status || 'draft'
                    const isApproved = status === 'approved' || status === 'pending_review'
                    const isRejected = status === 'rejected'
                    const isPending = status === 'draft' || status === 'pending_user_approval'
                    
                    return (
                      <div key={wf.index} className={`p-4 rounded-lg border ${
                        isApproved ? 'bg-success/5 border-success/30' :
                        isRejected ? 'bg-destructive/5 border-destructive/30' :
                        'bg-secondary/50 border-border'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-foreground">Copy #{wf.index}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={
                              isApproved ? 'bg-success/20 text-success' :
                              isRejected ? 'bg-destructive/20 text-destructive' :
                              'bg-amber-500/20 text-amber-500'
                            }>
                              {status === 'pending_review' ? 'En Validacion' : isApproved ? 'Aprobado' : isRejected ? 'Rechazado' : 'Pendiente'}
                            </Badge>
                            {wf.supervisor?.score && (
                              <span className="text-xs text-muted-foreground">Score: {wf.supervisor.score}/10</span>
                            )}
                          </div>
                        </div>
                        <div className="p-3 rounded bg-background/50 mb-3">
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {wf.supervisor?.revised_content || wf.creator?.content}
                          </p>
                          {wf.creator?.hashtags && wf.creator.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {wf.creator.hashtags.map((tag: string, i: number) => (
                                <span key={i} className="text-xs text-accent">#{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        {wf.supervisor?.feedback && (
                          <p className="text-xs text-muted-foreground mb-3">
                            <strong>Feedback:</strong> {wf.supervisor.feedback}
                          </p>
                        )}
                        {/* User approval buttons */}
                        <div className="flex items-center gap-2 pt-3 border-t border-border">
                          {isPending ? (
                            <>
                              <Button 
                                size="sm" 
                                className="bg-success text-success-foreground hover:bg-success/90"
                                onClick={() => {
                                  if (contentId) handleApproveContent(contentId)
                                  else alert('Error: No se encontro el ID del contenido')
                                }}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Aprobar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="border-destructive text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  if (contentId) handleRejectContent(contentId)
                                  else alert('Error: No se encontro el ID del contenido')
                                }}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Rechazar
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {status === 'pending_review' ? 'Enviado a Validacion' : isApproved ? 'Aprobado' : 'Rechazado'}
                            </span>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="ml-auto"
                            onClick={() => {
                              navigator.clipboard.writeText(wf.supervisor?.revised_content || wf.creator?.content || '')
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copiar
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Strategist Output for multiple copies - only show once, not for single workflow */}
                  {workflowResult.workflows[0]?.strategist && !workflowResult.workflow && (
                    <StrategistOutput 
                      strategist={workflowResult.workflows[0].strategist}
                      content={workflowResult.workflows[0]?.supervisor?.revised_content || workflowResult.workflows[0]?.creator?.content || ''}
                      brandId={selectedBrand}
                      platform={platform}
                      contentType={contentType}
                      contentId={workflowResult.contents?.[0]?.id}
                      onRegenerateStrategy={handleRegenerateStrategy}
                      isRegenerating={regeneratingStrategy}
                    />
                  )}
                </div>
              ) : workflowResult.workflow && (
                <>
                  {/* Single copy - Creator Output */}
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-accent" />
                      <p className="font-medium text-foreground text-sm">Creador: {workflowResult.workflow.creator.agent}</p>
                    </div>
                    <div className="p-3 rounded bg-background/50">
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {workflowResult.workflow.creator.content}
                      </p>
                    </div>
                  </div>

                  {/* Single copy - Supervisor Output */}
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium text-foreground text-sm">Supervisor: {workflowResult.workflow.supervisor.agent}</p>
                      <Badge variant={workflowResult.workflow.supervisor.approved ? 'default' : 'secondary'} className={
                        workflowResult.workflow.supervisor.approved ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'
                      }>
                        {workflowResult.workflow.supervisor.approved ? 'Aprobado' : 'Rechazado'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{workflowResult.workflow.supervisor.feedback}</p>
                    {workflowResult.workflow.supervisor.revised_content && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-xs font-medium text-foreground mb-1">Version corregida:</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {workflowResult.workflow.supervisor.revised_content}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Strategist Output for single copy */}
              {workflowResult.workflow?.strategist && (
                <StrategistOutput 
                  strategist={workflowResult.workflow.strategist}
                  content={workflowResult.workflow.supervisor.revised_content || workflowResult.workflow.creator.content}
                  brandId={selectedBrand}
                  platform={platform}
                  contentType={contentType}
                  contentId={workflowResult.content?.id}
                  onRegenerateStrategy={handleRegenerateStrategy}
                  isRegenerating={regeneratingStrategy}
                />
              )}
            </div>
          )}

          {/* Workflow Loading */}
          {generationMode === 'agents' && workflowLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-accent" />
              </div>
              <p className="text-muted-foreground mt-4">Procesando flujo de agentes...</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span>Creador</span>
                <span>→</span>
                <span>Supervisor</span>
                <span>→</span>
                <span>Estratega</span>
              </div>
            </div>
          )}

          {/* Agents empty state */}
          {generationMode === 'agents' && !workflowLoading && !workflowResult && (
            <div className="flex flex-col items-center justify-center py-16">
              <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-center mb-2">
                Flujo de Agentes: Creador → Supervisor → Estratega
              </p>
              <p className="text-xs text-muted-foreground text-center max-w-sm">
                Selecciona una marca con los 3 agentes configurados para generar contenido validado y con estrategia de publicación
              </p>
            </div>
          )}

          {generationMode !== 'agents' && loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-accent mb-4" />
              <p className="text-muted-foreground">Generando copys creativos...</p>
            </div>
          ) : generationMode !== 'agents' && copies.length > 0 ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {copies.map((copy, index) => (
                <div 
                  key={index}
                  className="p-4 rounded-lg bg-secondary/50 border border-border"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-foreground">{copy.title}</h4>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyToClipboard(index, copy)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        {copiedIndex === index ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
                    {copy.body}
                  </p>
                  
                  {copy.hashtags && copy.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {copy.hashtags.map((tag, i) => (
                        <span key={i} className="text-xs text-accent">
                          {tag.startsWith('#') ? tag : `#${tag}`}
                        </span>
                      ))}
                    </div>
                  )}

                  {copy.cta && (
                    <p className="text-sm text-accent font-medium mb-3">
                      CTA: {copy.cta}
                    </p>
                  )}

                  {/* Supervisor Feedback */}
                  {supervisorFeedback[index] && (
                    <div className={`p-3 rounded-lg mb-3 ${
                      supervisorFeedback[index].approved 
                        ? 'bg-success/10 border border-success/30'
                        : 'bg-warning/10 border border-warning/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {supervisorFeedback[index].approved ? (
                          <ThumbsUp className="h-4 w-4 text-success" />
                        ) : (
                          <ThumbsDown className="h-4 w-4 text-warning" />
                        )}
                        <span className="font-medium text-sm">
                          Score: {supervisorFeedback[index].score}/10
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {supervisorFeedback[index].feedback}
                      </p>
                      {supervisorFeedback[index].suggestions.length > 0 && (
                        <ul className="text-xs text-muted-foreground list-disc list-inside">
                          {supervisorFeedback[index].suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSupervisorReview(index, copy)}
                      disabled={supervisorLoading === index}
                      className="border-border text-foreground hover:bg-secondary"
                    >
                      {supervisorLoading === index ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <MessageSquare className="mr-2 h-3 w-3" />
                      )}
                      Revisar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveCopy(index, copy, 'draft')}
                      disabled={savingIndex === index}
                      className="border-border text-foreground hover:bg-secondary"
                    >
                      {savingIndex === index ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-3 w-3" />
                      )}
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveCopy(index, copy, 'pending_review')}
                      disabled={savingIndex === index}
                      className="bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      <Send className="mr-2 h-3 w-3" />
                      Enviar a validar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : generationMode !== 'agents' ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Sparkles className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-center">
                Selecciona una marca y haz click en "Generar Copys" para comenzar
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
