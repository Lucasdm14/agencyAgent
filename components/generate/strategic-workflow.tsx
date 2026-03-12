'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Loader2, Sparkles, Calendar, Target, CheckCircle2, XCircle, 
  Lightbulb, TrendingUp, Clock, Hash, ChevronRight, FileText,
  ThumbsUp, ThumbsDown, RefreshCw, Send, ImagePlus, X, Film,
  Save, FolderOpen, Trash2, MoreVertical, UserCheck, Download
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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

interface StrategicWorkflowProps {
  brands: { id: string; name: string }[]
  agents: { id: string; name: string; brand_id: string; type: string }[]
  metricsAccounts?: MetricsAccount[]
  initialStrategyId?: string
}

interface ContentStrategy {
  strategy_overview: {
    main_objective: string
    content_pillars: Array<{
      name: string
      description: string
      percentage: number
    }>
    key_messages: string[]
    tone_guidelines: string
  }
  content_calendar: Array<{
    day: number
    date_suggestion: string
    pillar: string
    theme: string
    content_type: string
    objective: string
    key_points: string[]
    suggested_hashtags: string[]
    best_time: string
    cta_suggestion: string
  }>
  weekly_kpis: {
    posts_per_week: number
    engagement_goal: string
    growth_focus: string
  }
}

interface GeneratedContent {
  content: {
    main_text: string
    hook: string
    body: string
    cta: string
    hashtags: string[]
    emojis_used: string[]
  }
  strategy_alignment: {
    pillar_match: boolean
    objective_addressed: string
    key_points_included: string[]
  }
}

interface ValidationResult {
  validation: {
    approved: boolean
    score: number
    strategy_compliance: {
      pillar_alignment: boolean
      theme_addressed: boolean
      objective_met: boolean
      key_points_coverage: number
    }
    brand_compliance: {
      tone_match: boolean
      values_reflected: boolean
      forbidden_words_check: boolean
      forbidden_words_found: string[]
    }
    quality_assessment: {
      clarity: number
      engagement_potential: number
      cta_effectiveness: number
    }
  }
  feedback: string
  improvements: string[]
  revised_version: string | null
}

export function StrategicWorkflow({ brands, agents, metricsAccounts = [], initialStrategyId }: StrategicWorkflowProps) {
  const router = useRouter()
  const supabase = createClient()
  
  // State
  const [selectedBrand, setSelectedBrand] = useState('')
  const [platform, setPlatform] = useState('')
  const [customDays, setCustomDays] = useState(7) // Custom number of days
  const [selectedMetricsAccount, setSelectedMetricsAccount] = useState('none')
  
  // Agent selection
  const [selectedStrategist, setSelectedStrategist] = useState('')
  const [selectedCreator, setSelectedCreator] = useState('')
  const [selectedSupervisor, setSelectedSupervisor] = useState('')
  
  // Filter metrics accounts by platform (safely handle null/undefined)
  const filteredMetricsAccounts = (metricsAccounts || []).filter(a => 
    a && (!platform || a.platform === platform)
  )
  
  // Workflow state
  const [currentStep, setCurrentStep] = useState<'config' | 'strategy' | 'content' | 'validation'>('config')
  const [loading, setLoading] = useState(false)
  const [strategy, setStrategy] = useState<ContentStrategy | null>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  
  // Attachment
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null)
  
  // Saved strategies
  const [savedStrategies, setSavedStrategies] = useState<any[]>([])
  const [loadingStrategies, setLoadingStrategies] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  
  // Strategy-level supervisor feedback
  const [strategyFeedback, setStrategyFeedback] = useState<{
    overall_assessment: string
    score: number
    brand_compliance?: {
      tone_of_voice?: { compliant: boolean; notes: string }
      brand_values?: { compliant: boolean; notes: string }
      target_audience?: { compliant: boolean; notes: string }
      keywords_used?: { compliant: boolean; notes: string }
      forbidden_words?: { compliant: boolean; notes: string }
      style_guide?: { compliant: boolean; notes: string }
      brand_personality?: { compliant: boolean; notes: string }
    }
    strengths: string[]
    improvements: string[]
    brand_alignment: string
    expected_impact: string
    risks: string[]
    recommendations: string[]
  } | null>(null)
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [strategyName, setStrategyName] = useState('')
  const [savingStrategy, setSavingStrategy] = useState(false)
  const [currentStrategyId, setCurrentStrategyId] = useState<string | null>(null)

  // Filter agents by brand
  const brandAgents = agents.filter(a => a.brand_id === selectedBrand)
  const strategists = brandAgents.filter(a => a.type === 'strategist')
  const creators = brandAgents.filter(a => a.type === 'creator')
  const supervisors = brandAgents.filter(a => a.type === 'supervisor')

  const platforms = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'twitter', label: 'X (Twitter)' },
  ]

  // Reset selected metrics account when platform changes
  useEffect(() => {
    setSelectedMetricsAccount('none')
  }, [platform])

  // Load initial strategy if provided via URL
  useEffect(() => {
    async function loadInitialStrategy() {
      if (!initialStrategyId) return
      
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('content_strategies')
          .select('*')
          .eq('id', initialStrategyId)
          .single()
        
        if (data && !error) {
          // Set brand and platform from saved strategy
          setSelectedBrand(data.brand_id)
          setPlatform(data.platform)
          setCustomDays(data.days_count || 7)
          setStrategyName(data.name)
          setCurrentStrategyId(data.id)
          if (data.supervisor_agent_id) setSelectedSupervisor(data.supervisor_agent_id)
          if (data.creator_agent_id) setSelectedCreator(data.creator_agent_id)
          if (data.strategist_agent_id) setSelectedStrategist(data.strategist_agent_id)
          
          // Set the strategy data
          if (data.strategy_data) {
            setStrategy(data.strategy_data)
            setCurrentStep('strategy')
            
            // Auto-generate feedback if supervisor is available
            if (data.supervisor_agent_id) {
              // Small delay to ensure state is set
              setTimeout(() => {
                generateStrategyFeedbackAuto(data.strategy_data)
              }, 500)
            }
          }
        }
      } catch (error) {
        console.error('Error loading strategy:', error)
      }
      setLoading(false)
    }
    
    loadInitialStrategy()
  }, [initialStrategyId])

  // Load saved strategies when brand changes
  useEffect(() => {
    async function fetchStrategies() {
      if (!selectedBrand) {
        setSavedStrategies([])
        return
      }
      
      setLoadingStrategies(true)
      try {
        const response = await fetch(`/api/strategies?brand_id=${selectedBrand}`)
        if (response.ok) {
          const data = await response.json()
          setSavedStrategies(data)
        }
      } catch (error) {
        console.error('Error loading strategies:', error)
      }
      setLoadingStrategies(false)
    }
    
    fetchStrategies()
  }, [selectedBrand])

  // Handle file attachment
  function handleFileAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
    if (!validTypes.includes(file.type)) {
      alert('Formato no soportado. Usa JPG, PNG, GIF, WebP o MP4.')
      return
    }
    
    if (file.size > 20 * 1024 * 1024) {
      alert('El archivo es muy grande. Máximo 20MB.')
      return
    }
    
    setAttachedFile(file)
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => setAttachedPreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setAttachedPreview(null)
    }
  }

  // Load saved strategies when brand changes
  async function loadSavedStrategies() {
    if (!selectedBrand) {
      setSavedStrategies([])
      return
    }
    
    setLoadingStrategies(true)
    try {
      const response = await fetch(`/api/strategies?brand_id=${selectedBrand}`)
      if (response.ok) {
        const data = await response.json()
        setSavedStrategies(data)
      }
    } catch (error) {
      console.error('Error loading strategies:', error)
    }
    setLoadingStrategies(false)
  }

  // Save current strategy
  async function saveStrategy() {
    if (!strategy || !strategyName.trim()) {
      alert('Ingresa un nombre para la estrategia')
      return
    }

    setSavingStrategy(true)
    try {
      const hasMetrics = selectedMetricsAccount && selectedMetricsAccount !== 'none'
      const metricsData = hasMetrics
        ? metricsAccounts.find(a => a.id === selectedMetricsAccount)
        : null

      const payload = {
        brand_id: selectedBrand,
        name: strategyName,
        platform,
        days_count: customDays,
        strategy_data: strategy,
        supervisor_validation: strategy.supervisor_validation || null,
        metrics_account_id: hasMetrics ? selectedMetricsAccount : null,
        metrics_snapshot: metricsData ? {
          username: metricsData.platform_username,
          followers: metricsData.follower_count,
          engagement_rate: metricsData.engagement_rate,
        } : null,
        strategist_agent_id: selectedStrategist || null,
        creator_agent_id: selectedCreator || null,
        supervisor_agent_id: selectedSupervisor || null,
        status: 'draft',
      }

      let response
      if (currentStrategyId) {
        // Update existing
        response = await fetch('/api/strategies', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: currentStrategyId, ...payload }),
        })
      } else {
        // Create new
        response = await fetch('/api/strategies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (response.ok) {
        const saved = await response.json()
        setCurrentStrategyId(saved.id)
        setSaveDialogOpen(false)
        loadSavedStrategies()
        alert('Estrategia guardada correctamente')
      } else {
        const err = await response.json()
        alert('Error al guardar: ' + err.error)
      }
    } catch (error) {
      console.error('Error saving strategy:', error)
      alert('Error al guardar la estrategia')
    }
    setSavingStrategy(false)
  }

  // Load a saved strategy
  function loadStrategy(saved: any) {
    setStrategy(saved.strategy_data)
    setPlatform(saved.platform)
    setCustomDays(saved.days_count)
    setCurrentStrategyId(saved.id)
    setStrategyName(saved.name)
    if (saved.strategist_agent_id) setSelectedStrategist(saved.strategist_agent_id)
    if (saved.creator_agent_id) setSelectedCreator(saved.creator_agent_id)
    if (saved.supervisor_agent_id) setSelectedSupervisor(saved.supervisor_agent_id)
    if (saved.metrics_account_id) setSelectedMetricsAccount(saved.metrics_account_id)
    setCurrentStep('strategy')
    
    // Auto-generate feedback if supervisor is available
    if (saved.supervisor_agent_id && saved.strategy_data) {
      setTimeout(() => generateStrategyFeedbackAuto(saved.strategy_data), 500)
    }
  }

  // Delete a saved strategy
  async function deleteStrategy(id: string) {
    if (!confirm('Eliminar esta estrategia?')) return
    
    try {
      const response = await fetch(`/api/strategies?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        loadSavedStrategies()
        if (currentStrategyId === id) {
          setCurrentStrategyId(null)
          setStrategy(null)
          setCurrentStep('config')
        }
      }
    } catch (error) {
      console.error('Error deleting:', error)
    }
  }

  // STEP 1: Generate Strategy
  async function generateStrategy() {
    if (!selectedBrand || !platform) {
      alert('Selecciona marca y plataforma')
      return
    }
    
    // Verificar que haya al menos un estratega configurado
    if (strategists.length === 0) {
      alert('No hay un agente Estratega configurado para esta marca. Ve a Configuracion > Agentes y crea uno.')
      return
    }

    setLoading(true)
    setStrategy(null)
    setStrategyFeedback(null)
    
    try {
      // Get selected metrics account data
      const hasMetrics = selectedMetricsAccount && selectedMetricsAccount !== 'none'
      const metricsData = hasMetrics
        ? metricsAccounts.find(a => a.id === selectedMetricsAccount)
        : null
      
      console.log('[v0] Starting strategy request with:', {
        brand_id: selectedBrand,
        platform,
        days_count: customDays,
        strategist_id: selectedStrategist || strategists[0]?.id,
      })
      
      const response = await fetch('/api/content/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: selectedBrand,
          action: 'create_strategy',
          platform,
          days_count: customDays,
          copies_per_content: 3,
          strategist_agent_id: selectedStrategist || strategists[0]?.id,
          creator_agent_id: selectedCreator || creators[0]?.id,
          supervisor_agent_id: selectedSupervisor || supervisors[0]?.id,
          // Include metrics data for strategy generation
          metrics_account: metricsData ? {
            username: metricsData.platform_username,
            followers: metricsData.follower_count,
            engagement_rate: metricsData.engagement_rate,
            avg_likes: metricsData.avg_likes,
            avg_comments: metricsData.avg_comments,
            avg_views: metricsData.avg_views,
          } : undefined,
        }),
      })

      console.log('[v0] Response status:', response.status)
      const data = await response.json()
      console.log('[v0] Response data:', data)
      
      if (!response.ok) {
        console.error('[v0] Server error:', data.error)
        alert(data.error || 'Error en el servidor')
        setLoading(false)
        return
      }
      
      if (data.success && data.strategy) {
        console.log('[v0] Strategy received successfully')
        setStrategy(data.strategy)
        setCurrentStep('strategy')
        
        // Auto-generate supervisor feedback if supervisor is selected
        const supervisorId = selectedSupervisor || supervisors[0]?.id
        if (supervisorId && data.strategy) {
          setSelectedSupervisor(supervisorId)
          generateStrategyFeedbackAuto(data.strategy)
        }
      } else {
        console.error('[v0] Strategy generation failed:', data)
        alert(data.error || 'Error generando estrategia. Verifica que la marca tenga la informacion completa.')
      }
    } catch (error) {
      console.error('[v0] Network error:', error)
      alert('Error de conexion al generar estrategia')
    }
    setLoading(false)
  }

  // Auto-generate supervisor feedback (called automatically after strategy generation)
  async function generateStrategyFeedbackAuto(strategyData: any) {
    if (!selectedSupervisor) return
    
    setLoadingFeedback(true)
    try {
      const response = await fetch('/api/content/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'feedback_strategy',
          brand_id: selectedBrand,
          supervisor_agent_id: selectedSupervisor,
          strategy_data: strategyData,
          platform,
        }),
      })
      
      const data = await response.json()
      if (data.success && data.feedback) {
        setStrategyFeedback(data.feedback)
      }
    } catch (error) {
      console.error('Error generating feedback:', error)
    }
    setLoadingFeedback(false)
  }

  // STEP 2: Generate Content for Selected Day
  async function generateContentForDay(dayIndex: number) {
    if (!strategy) return
    
    const dayStrategy = strategy.content_calendar?.[dayIndex]
    if (!dayStrategy) {
      alert('No se encontró la estrategia para este día')
      return
    }
    setSelectedDay(dayIndex)
    setLoading(true)
    setGeneratedContent(null)
    setValidation(null)

    try {
      // Upload attachment if exists
      let attachmentUrl: string | undefined
      let attachmentType: 'image' | 'video' | undefined
      
      if (attachedFile) {
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
      }

      const response = await fetch('/api/content/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: selectedBrand,
          action: 'generate_copies_for_day',
          platform,
          copies_count: 3,
          strategy_context: {
            pillar: dayStrategy.pillar,
            theme: dayStrategy.theme,
            content_type: dayStrategy.content_type,
            objective: dayStrategy.objective,
            key_points: dayStrategy.key_points,
            suggested_hashtags: dayStrategy.suggested_hashtags,
            cta_suggestion: dayStrategy.cta_suggestion,
          },
          creator_agent_id: selectedCreator || undefined,
          supervisor_agent_id: selectedSupervisor || undefined,
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
        }),
      })

      const data = await response.json()
      if (data.success && data.copies) {
        // Update the strategy calendar with the new copies and supervisor feedback
        setStrategy((prev: any) => {
          if (!prev) return prev
          const newCalendar = [...(prev.content_calendar || [])]
          if (newCalendar[dayIndex]) {
            newCalendar[dayIndex] = {
              ...newCalendar[dayIndex],
              copies: data.copies,
              copies_generated_by: data.creator || 'AI',
              supervisor_feedback: data.supervisor_feedback || null,
              validated_by: data.supervisor || null,
            }
          }
          return { ...prev, content_calendar: newCalendar }
        })
      } else {
        alert(data.error || 'Error generando copys')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al generar contenido')
    }
    setLoading(false)
  }

  // STEP 3: Validate Content
  async function validateContent() {
    if (!strategy || selectedDay === null || !generatedContent) return

    const dayStrategy = strategy.content_calendar?.[selectedDay]
    if (!dayStrategy) return
    setLoading(true)

    try {
      const response = await fetch('/api/content/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: selectedBrand,
          action: 'validate_content',
          strategy_context: {
            pillar: dayStrategy.pillar,
            theme: dayStrategy.theme,
            objective: dayStrategy.objective,
            key_points: dayStrategy.key_points,
          },
          content_to_validate: generatedContent.content.main_text,
          supervisor_agent_id: selectedSupervisor || undefined,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setValidation(data.validation)
        setCurrentStep('validation')
      } else {
        alert(data.error || 'Error validando contenido')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al validar contenido')
    }
    setLoading(false)
  }

  // Generate supervisor feedback for the entire strategy
  async function generateStrategyFeedback() {
    if (!strategy || !selectedSupervisor) {
      alert('Selecciona un supervisor para obtener feedback')
      return
    }
    
    setLoadingFeedback(true)
    try {
      const response = await fetch('/api/content/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'feedback_strategy',
          brand_id: selectedBrand,
          supervisor_agent_id: selectedSupervisor,
          strategy_data: strategy,
          platform,
        }),
      })
      
      const data = await response.json()
      if (data.success && data.feedback) {
        setStrategyFeedback(data.feedback)
      } else {
        alert(data.error || 'Error generando feedback')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al generar feedback')
    }
    setLoadingFeedback(false)
  }

  // Schedule ALL content from strategy to calendar
  async function scheduleAllContent() {
    if (!strategy?.content_calendar) return
    
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const today = new Date()
      
      // Filter days that have generated copies
      const daysWithContent = strategy.content_calendar.filter(day => day.copies && day.copies.length > 0)
      
      if (daysWithContent.length === 0) {
        alert('No hay contenido generado para programar. Genera copys para al menos un dia.')
        setLoading(false)
        return
      }
      
      const events = daysWithContent.map((day, index) => {
        const scheduledDate = new Date(today)
        scheduledDate.setDate(today.getDate() + (day.day - 1))
        
        // Use the first (or recommended) copy
        const selectedCopy = day.copies[0]
        
        return {
          brand_id: selectedBrand,
          title: day.theme,
          content: selectedCopy.content,
          platform,
          content_type: day.content_type,
          scheduled_date: scheduledDate.toISOString().split('T')[0],
          scheduled_time: day.best_time,
          status: 'scheduled',
          hashtags: day.suggested_hashtags,
          pillar: day.pillar,
          created_by: user?.id,
        }
      })
      
      const { error } = await supabase.from('calendar_events').insert(events)
      
      if (error) throw error
      
      alert(`${events.length} contenidos programados exitosamente`)
      router.push('/dashboard/calendar')
    } catch (error) {
      console.error('Error scheduling:', error)
      alert('Error al programar contenido')
    }
    setLoading(false)
  }

  // Send strategy to validation module for client review
  async function sendToValidation() {
    if (!strategy || !currentStrategyId) {
      // First save the strategy if not saved
      if (!currentStrategyId) {
        alert('Primero guarda la estrategia antes de enviarla a validacion')
        setSaveDialogOpen(true)
        return
      }
    }
    
    // Navigate to validation module with strategy ID
    router.push(`/dashboard/validation?strategy=${currentStrategyId}`)
  }

  // Generate a new strategy proposal
  async function generateNewProposal() {
    if (!confirm('Esto generara una nueva estrategia. La actual se mantendra guardada si ya la guardaste. Continuar?')) return
    
    setStrategy(null)
    setStrategyFeedback(null)
    setSelectedDay(null)
    setCurrentStrategyId(null)
    generateStrategy()
  }

  // Export strategy as CSV
  function exportAsCSV() {
    if (!strategy) return
    
    const brandName = brands.find(b => b.id === selectedBrand)?.name || 'Marca'
    
    // Build CSV content
    let csv = 'Estrategia de Contenido - ' + brandName + '\n\n'
    
    // Overview section
    csv += 'RESUMEN DE ESTRATEGIA\n'
    csv += 'Objetivo Principal,' + (strategy.strategy_overview?.main_objective || '') + '\n'
    csv += 'Plataforma,' + platform + '\n'
    csv += 'Dias,' + (strategy.content_calendar?.length || 0) + '\n\n'
    
    // Pillars
    csv += 'PILARES DE CONTENIDO\n'
    csv += 'Nombre,Porcentaje,Descripcion\n'
    strategy.strategy_overview?.content_pillars?.forEach((p: any) => {
      csv += `"${p.name}",${p.percentage}%,"${p.description || ''}"\n`
    })
    csv += '\n'
    
    // Calendar
    csv += 'CALENDARIO DE CONTENIDO\n'
    csv += 'Dia,Fecha,Tema,Pilar,Tipo,Hora,Objetivo,Hashtags,Copy Recomendado\n'
    
    const today = new Date()
    strategy.content_calendar?.forEach((day: any) => {
      const date = new Date(today)
      date.setDate(today.getDate() + (day.day - 1))
      const dateStr = date.toLocaleDateString('es-ES')
      
      const recommendedCopy = day.copies?.find((c: any) => c.version === day.supervisor_feedback?.recommended_copy) || day.copies?.[0]
      const copyText = recommendedCopy?.content?.replace(/"/g, '""') || ''
      
      csv += `${day.day},"${dateStr}","${day.theme}","${day.pillar}","${day.content_type}","${day.best_time}","${day.objective || ''}","${day.suggested_hashtags?.join(' ') || ''}","${copyText}"\n`
    })
    
    // Add feedback if exists
    if (strategyFeedback) {
      csv += '\nFEEDBACK DEL SUPERVISOR\n'
      csv += 'Puntuacion,' + strategyFeedback.score + '/100\n'
      csv += 'Evaluacion General,"' + strategyFeedback.overall_assessment + '"\n'
      csv += 'Puntos Fuertes,"' + (strategyFeedback.strengths?.join('; ') || '') + '"\n'
      csv += 'Areas de Mejora,"' + (strategyFeedback.improvements?.join('; ') || '') + '"\n'
    }
    
    // Download
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `estrategia-${strategyName || brandName}-${platform}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export strategy as PDF
  function exportAsPDF() {
    if (!strategy) return
    
    const brandName = brands.find(b => b.id === selectedBrand)?.name || 'Marca'
    const doc = new jsPDF()
    let yPos = 20
    
    // Title
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Estrategia de Contenido', 105, yPos, { align: 'center' })
    yPos += 10
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text(brandName + ' - ' + platform.charAt(0).toUpperCase() + platform.slice(1), 105, yPos, { align: 'center' })
    yPos += 15
    
    // Overview
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Objetivo Principal:', 20, yPos)
    yPos += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const objective = strategy.strategy_overview?.main_objective || ''
    const splitObjective = doc.splitTextToSize(objective, 170)
    doc.text(splitObjective, 20, yPos)
    yPos += splitObjective.length * 5 + 10
    
    // Pillars
    if (strategy.strategy_overview?.content_pillars?.length > 0) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Pilares de Contenido:', 20, yPos)
      yPos += 7
      
      const pillarsData = strategy.strategy_overview.content_pillars.map((p: any) => [
        p.name,
        p.percentage + '%',
        p.description || ''
      ])
      
      autoTable(doc, {
        startY: yPos,
        head: [['Pilar', '%', 'Descripcion']],
        body: pillarsData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9 },
      })
      
      yPos = (doc as any).lastAutoTable.finalY + 10
    }
    
    // Supervisor Feedback
    if (strategyFeedback) {
      if (yPos > 230) {
        doc.addPage()
        yPos = 20
      }
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Feedback del Supervisor - Puntuacion: ' + strategyFeedback.score + '/100', 20, yPos)
      yPos += 7
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      const assessment = doc.splitTextToSize(strategyFeedback.overall_assessment || '', 170)
      doc.text(assessment, 20, yPos)
      yPos += assessment.length * 5 + 5
      
      if (strategyFeedback.strengths?.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.text('Puntos Fuertes:', 20, yPos)
        yPos += 5
        doc.setFont('helvetica', 'normal')
        strategyFeedback.strengths.forEach((s: string) => {
          const text = doc.splitTextToSize('• ' + s, 165)
          doc.text(text, 25, yPos)
          yPos += text.length * 5
        })
        yPos += 5
      }
      
      if (strategyFeedback.improvements?.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.text('Areas de Mejora:', 20, yPos)
        yPos += 5
        doc.setFont('helvetica', 'normal')
        strategyFeedback.improvements.forEach((s: string) => {
          const text = doc.splitTextToSize('• ' + s, 165)
          doc.text(text, 25, yPos)
          yPos += text.length * 5
        })
      }
      yPos += 10
    }
    
    // Calendar Table
    doc.addPage()
    yPos = 20
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Calendario de Contenido', 105, yPos, { align: 'center' })
    yPos += 10
    
    const today = new Date()
    const calendarData = strategy.content_calendar?.map((day: any) => {
      const date = new Date(today)
      date.setDate(today.getDate() + (day.day - 1))
      
      return [
        'Dia ' + day.day,
        date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }),
        day.theme,
        day.pillar,
        day.content_type,
        day.best_time
      ]
    }) || []
    
    autoTable(doc, {
      startY: yPos,
      head: [['Dia', 'Fecha', 'Tema', 'Pilar', 'Tipo', 'Hora']],
      body: calendarData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 15, right: 15 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 30 },
        2: { cellWidth: 50 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25 },
        5: { cellWidth: 20 },
      }
    })
    
    // Copies pages
    const daysWithCopies = strategy.content_calendar?.filter((d: any) => d.copies?.length > 0) || []
    
    if (daysWithCopies.length > 0) {
      doc.addPage()
      yPos = 20
      
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Copys Generados', 105, yPos, { align: 'center' })
      yPos += 15
      
      daysWithCopies.forEach((day: any, idx: number) => {
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }
        
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('Dia ' + day.day + ': ' + day.theme, 20, yPos)
        yPos += 7
        
        const recommendedCopy = day.copies?.find((c: any) => c.version === day.supervisor_feedback?.recommended_copy) || day.copies?.[0]
        
        if (recommendedCopy) {
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          const copyText = doc.splitTextToSize(recommendedCopy.content || '', 170)
          doc.text(copyText, 20, yPos)
          yPos += copyText.length * 4 + 10
        }
      })
    }
    
    // Save
    doc.save(`estrategia-${strategyName || brandName}-${platform}.pdf`)
  }

  // Export as JSON
  function exportAsJSON() {
    if (!strategy) return
    const brandName = brands.find(b => b.id === selectedBrand)?.name || 'Marca'
    const exportData = {
      brand: brandName,
      platform,
      strategyName,
      createdAt: new Date().toISOString(),
      strategy,
      feedback: strategyFeedback,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `estrategia-${strategyName || brandName}-${platform}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Schedule content to calendar (single day - legacy)
  async function scheduleContent() {
    if (!strategy || selectedDay === null) return

    const dayStrategy = strategy.content_calendar?.[selectedDay]
    if (!dayStrategy || !dayStrategy.copies?.length) {
      alert('Genera copys para este dia primero')
      return
    }
    
    const selectedCopy = dayStrategy.copies[0]

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Calculate scheduled date
      const today = new Date()
      const scheduledDate = new Date(today)
      scheduledDate.setDate(today.getDate() + (dayStrategy.day - 1))

      const { error } = await supabase
        .from('calendar_events')
        .insert({
          brand_id: selectedBrand,
          title: dayStrategy.theme,
          content: selectedCopy.content,
          platform,
          content_type: dayStrategy.content_type,
          scheduled_date: scheduledDate.toISOString().split('T')[0],
          scheduled_time: dayStrategy.best_time,
          status: 'scheduled',
          hashtags: dayStrategy.suggested_hashtags,
          pillar: dayStrategy.pillar,
          created_by: user?.id,
        })

      if (error) throw error

      alert('Contenido programado exitosamente')
      router.push('/dashboard/calendar')
    } catch (error) {
      console.error('Error scheduling:', error)
      alert('Error al programar contenido')
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {[
          { key: 'config', label: 'Configurar', canAccess: true },
          { key: 'strategy', label: 'Estrategia', canAccess: !!strategy },
          { key: 'content', label: 'Contenido', canAccess: !!strategy?.content_calendar?.some(d => d.copies?.length > 0) },
          { key: 'validation', label: 'Validación', canAccess: !!strategy?.content_calendar?.some(d => d.copies?.length > 0) },
        ].map((step, i) => (
          <div key={step.key} className="flex items-center">
            <button
              onClick={() => step.canAccess && setCurrentStep(step.key as any)}
              disabled={!step.canAccess}
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                currentStep === step.key 
                  ? 'bg-accent text-accent-foreground' 
                  : i < ['config', 'strategy', 'content', 'validation'].indexOf(currentStep)
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : step.canAccess 
                      ? 'bg-secondary text-muted-foreground hover:bg-secondary/80 cursor-pointer'
                      : 'bg-secondary/50 text-muted-foreground/50 cursor-not-allowed'
              }`}
            >
              {i + 1}
            </button>
            {i < 3 && <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step Labels */}
      <div className="flex justify-center gap-8 text-xs text-muted-foreground">
        {[
          { key: 'config', label: 'Configurar' },
          { key: 'strategy', label: 'Estrategia' },
          { key: 'content', label: 'Contenido' },
          { key: 'validation', label: 'Validación' },
        ].map((step) => (
          <span key={step.key} className={currentStep === step.key ? 'text-accent font-medium' : ''}>
            {step.label}
          </span>
        ))}
      </div>

      {/* STEP 1: Configuration */}
      {currentStep === 'config' && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Target className="h-5 w-5 text-accent" />
              Configurar Estrategia
            </CardTitle>
            <CardDescription>
              El Estratega analizará tu marca y creará un plan de contenido completo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Saved Strategies */}
            {selectedBrand && savedStrategies.length > 0 && (
              <div className="p-4 rounded-lg border border-border bg-secondary/30">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Estrategias Guardadas ({savedStrategies.length})
                  </h4>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {savedStrategies.map((saved) => (
                    <div 
                      key={saved.id}
                      className="flex items-center justify-between p-2 rounded-md bg-background hover:bg-accent/10 transition-colors"
                    >
                      <button
                        onClick={() => loadStrategy(saved)}
                        className="flex-1 text-left"
                      >
                        <p className="text-sm font-medium text-foreground">{saved.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {saved.platform} - {saved.days_count} dias - {new Date(saved.created_at).toLocaleDateString()}
                        </p>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => loadStrategy(saved)}>
                            <FolderOpen className="h-4 w-4 mr-2" />
                            Cargar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteStrategy(saved.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </div>
            )}

{/* Horizontal config row */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Marca</label>
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger className="bg-input border-border h-9">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map(brand => (
                      <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Plataforma</label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="bg-input border-border h-9">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Dias de contenido</label>
                <div className="flex gap-1 items-center">
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={customDays}
                    onChange={(e) => setCustomDays(Math.max(1, Math.min(90, parseInt(e.target.value) || 7)))}
                    className="w-14 h-9 px-2 text-center bg-input border border-border rounded-md text-foreground text-sm"
                  />
                  {[7, 14, 30].map(d => (
                    <Button 
                      key={d}
                      type="button" 
                      variant={customDays === d ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCustomDays(d)}
                      className={`h-9 px-2 ${customDays === d ? 'bg-accent' : ''}`}
                    >
                      {d}
                    </Button>
                  ))}
                </div>
              </div>

              {platform && filteredMetricsAccounts.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Metricas</label>
                  <Select value={selectedMetricsAccount} onValueChange={setSelectedMetricsAccount}>
                    <SelectTrigger className="bg-input border-border h-9">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin metricas</SelectItem>
                      {filteredMetricsAccounts
                        .filter(account => account && account.id)
                        .map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            @{account.platform_username || 'N/A'}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-end">
                <Button 
                  onClick={generateStrategy} 
                  disabled={loading || !selectedBrand || !platform}
                  className="h-9 bg-accent hover:bg-accent/90"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  Generar
                </Button>
              </div>
            </div>

              {/* Show selected metrics account info */}
            {selectedMetricsAccount && selectedMetricsAccount !== 'none' && (() => {
              const selectedAccount = (metricsAccounts || []).find(a => a?.id === selectedMetricsAccount)
              if (!selectedAccount) return null
              return (
                <Card className="bg-accent/10 border-accent/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <TrendingUp className="h-8 w-8 text-accent" />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          Metricas de @{selectedAccount.platform_username || 'N/A'}
                        </p>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{(selectedAccount.follower_count || 0).toLocaleString()} seguidores</span>
                          <span>{selectedAccount.engagement_rate != null ? Number(selectedAccount.engagement_rate).toFixed(2) : '0'}% engagement</span>
                          <span>{(selectedAccount.avg_likes || 0).toLocaleString()} likes promedio</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })()}

            <div className="grid gap-4 md:grid-cols-2">
              {selectedBrand && strategists.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Agente Estratega</label>
                  <Select value={selectedStrategist} onValueChange={setSelectedStrategist}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Selecciona estratega" />
                    </SelectTrigger>
                    <SelectContent>
                      {strategists.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedBrand && creators.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Agente Creador</label>
                  <Select value={selectedCreator} onValueChange={setSelectedCreator}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Selecciona creador" />
                    </SelectTrigger>
                    <SelectContent>
                      {creators.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedBrand && supervisors.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Agente Supervisor</label>
                  <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Selecciona supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisors.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {selectedBrand && !strategists.length && !creators.length && !supervisors.length && (
              <div className="text-sm text-yellow-500 p-3 bg-yellow-500/10 rounded-lg">
                Esta marca no tiene agentes configurados. Ve a Agentes AI para crear estratega, creador y supervisor.
              </div>
            )}

            {/* Removed duplicate agent selection - now in the grid above */}
            {false && selectedBrand && (
              <div className="grid gap-4 md:grid-cols-2 hidden">
                {creators.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Agente Creador</label>
                    <Select value={selectedCreator} onValueChange={setSelectedCreator}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Selecciona creador" />
                      </SelectTrigger>
                      <SelectContent>
                        {creators.map(agent => (
                          <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {supervisors.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Agente Supervisor</label>
                    <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Selecciona supervisor" />
                      </SelectTrigger>
                      <SelectContent>
                        {supervisors.map(agent => (
                          <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            </CardContent>
        </Card>
      )}

      {/* STEP 2: Strategy View */}
      {currentStep === 'strategy' && strategy && (
        <div className="space-y-4">
          {/* Compact Strategy Header */}
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-accent" />
                    <span className="font-semibold text-foreground">Estrategia</span>
                    {currentStrategyId && <Badge variant="outline" className="text-xs">Guardada</Badge>}
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex flex-wrap gap-1">
                    {strategy.strategy_overview?.content_pillars?.map((pillar, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {pillar.name} ({pillar.percentage}%)
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => setCurrentStep('config')}>
                    Configurar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(true)}>
                    <Save className="h-4 w-4 mr-1" />
                    {currentStrategyId ? 'Actualizar' : 'Guardar'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={generateStrategyFeedback}
                    disabled={loadingFeedback || !selectedSupervisor}
                  >
                    {loadingFeedback ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserCheck className="h-4 w-4 mr-1" />}
                    Feedback
                  </Button>
                </div>
              </div>
              
              {/* Agent Selectors Row */}
              <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">Agentes para copys:</span>
                
                {/* Creator selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Creador:</span>
                  <Select value={selectedCreator} onValueChange={setSelectedCreator}>
                    <SelectTrigger className="h-8 w-[140px] text-xs bg-input border-border">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.filter(a => a.brand_id === selectedBrand && a.type === 'creator').map(agent => (
                        <SelectItem key={agent.id} value={agent.id} className="text-xs">{agent.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Supervisor selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Supervisor:</span>
                  <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                    <SelectTrigger className="h-8 w-[140px] text-xs bg-input border-border">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.filter(a => a.brand_id === selectedBrand && a.type === 'supervisor').map(agent => (
                        <SelectItem key={agent.id} value={agent.id} className="text-xs">{agent.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {!selectedSupervisor && (
                  <span className="text-xs text-yellow-500">Selecciona un supervisor para obtener feedback</span>
                )}
              </div>
              
              {strategy.strategy_overview?.main_objective && (
                <p className="text-sm text-muted-foreground mt-2">{strategy.strategy_overview.main_objective}</p>
              )}

              {/* Feedback Loading Indicator */}
              {loadingFeedback && !strategyFeedback && (
                <div className="mt-4 p-4 rounded-lg bg-accent/10 border border-accent/20">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                    <div>
                      <h4 className="font-medium text-foreground">Analizando estrategia...</h4>
                      <p className="text-sm text-muted-foreground">
                        El supervisor esta evaluando tu estrategia
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* No supervisor warning */}
              {!selectedSupervisor && !strategyFeedback && (
                <div className="mt-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserCheck className="h-5 w-5 text-yellow-500" />
                      <div>
                        <h4 className="font-medium text-foreground">Sin supervisor asignado</h4>
                        <p className="text-sm text-muted-foreground">
                          Selecciona un supervisor en el panel de agentes para obtener feedback automatico
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setCurrentStep('config')}>
                      Configurar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Full Width Calendar Grid - More columns */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-3">
            {strategy.content_calendar?.map((day, i) => (
              <div
                key={i} 
                className={`p-3 rounded-lg border bg-card cursor-pointer transition-all hover:shadow-md ${
                  selectedDay === i ? 'ring-2 ring-accent border-accent' : 'border-border hover:border-accent/50'
                }`}
                onClick={() => setSelectedDay(selectedDay === i ? null : i)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                      {day.day}
                    </div>
                    <div className="text-xs text-muted-foreground">{day.date_suggestion}</div>
                  </div>
                  {day.copies && day.copies.length > 0 && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <Badge className="text-xs bg-accent/20 text-accent mb-1">{day.pillar}</Badge>
                <h4 className="font-medium text-foreground text-sm leading-tight line-clamp-2">{day.theme}</h4>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{day.content_type}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{day.best_time}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Selected Day Detail Panel - Full Width */}
          {selectedDay !== null && strategy.content_calendar?.[selectedDay] && (
            <Card className="bg-card border-accent/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                      <span className="text-lg font-bold text-accent">{strategy.content_calendar[selectedDay].day}</span>
                    </div>
                    <div>
                      <CardTitle className="text-foreground">{strategy.content_calendar[selectedDay].theme}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-accent/20 text-accent text-xs">{strategy.content_calendar[selectedDay].pillar}</Badge>
                        <Badge variant="secondary" className="text-xs">{strategy.content_calendar[selectedDay].content_type}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {strategy.content_calendar[selectedDay].best_time}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!strategy.content_calendar[selectedDay].copies?.length && (
                      <Button onClick={() => generateContentForDay(selectedDay)} disabled={loading} size="sm">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                        Generar Copys
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setSelectedDay(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Info Row */}
                <div className="flex flex-wrap gap-4 p-3 rounded-lg bg-secondary/30">
                  <div className="flex-1 min-w-[200px]">
                    <span className="text-xs text-muted-foreground block mb-1">Objetivo</span>
                    <p className="text-sm text-foreground">{strategy.content_calendar[selectedDay].objective}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Hashtags</span>
                    <div className="flex flex-wrap gap-1">
                      {strategy.content_calendar[selectedDay].suggested_hashtags?.slice(0, 5).map((tag: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3 Copies in Grid */}
                {strategy.content_calendar[selectedDay].copies?.length > 0 ? (
                  <div className="grid md:grid-cols-3 gap-4">
                    {strategy.content_calendar[selectedDay].copies.map((copy: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-lg border border-border bg-background flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                              <span className="text-xs font-bold text-accent-foreground">{idx + 1}</span>
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">{copy.approach || `Version ${idx + 1}`}</span>
                          </div>
                          {copy.supervisor_improved && (
                            <Badge variant="outline" className="text-xs text-green-500 border-green-500">OK</Badge>
                          )}
                        </div>
                        
                        {copy.hook && (
                          <p className="text-xs text-accent font-medium mb-2">"{copy.hook}"</p>
                        )}
                        
                        <div className="flex-1 p-3 rounded bg-secondary/50 mb-3 max-h-48 overflow-y-auto">
                          <p className="text-sm text-foreground whitespace-pre-wrap">{copy.content}</p>
                        </div>
                        
                        {copy.cta && (
                          <p className="text-xs text-muted-foreground mb-3">CTA: <span className="text-accent">{copy.cta}</span></p>
                        )}
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full mt-auto"
                          onClick={() => {
                            navigator.clipboard.writeText(copy.content)
                            alert('Copiado!')
                          }}
                        >
                          Copiar
                        </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 rounded-lg border border-dashed border-border text-center">
                      <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground mb-4">Genera 3 variaciones de copy para este dia</p>
                      <Button onClick={() => generateContentForDay(selectedDay)} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                        Generar 3 Copys
                      </Button>
                    </div>
                  )}

                {/* Supervisor Feedback Section */}
                {strategy.content_calendar[selectedDay].supervisor_feedback && (
                  <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                          <UserCheck className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-foreground">Feedback del Supervisor</span>
                          {strategy.content_calendar[selectedDay].validated_by && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({strategy.content_calendar[selectedDay].validated_by})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          strategy.content_calendar[selectedDay].supervisor_feedback.overall_quality === 'excelente' ? 'default' :
                          strategy.content_calendar[selectedDay].supervisor_feedback.overall_quality === 'bueno' ? 'secondary' : 'outline'
                        } className={
                          strategy.content_calendar[selectedDay].supervisor_feedback.overall_quality === 'excelente' ? 'bg-green-500' :
                          strategy.content_calendar[selectedDay].supervisor_feedback.overall_quality === 'bueno' ? 'bg-blue-500' : ''
                        }>
                          {strategy.content_calendar[selectedDay].supervisor_feedback.overall_quality}
                        </Badge>
                        <Badge variant="outline">
                          {strategy.content_calendar[selectedDay].supervisor_feedback.score}/100
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      {strategy.content_calendar[selectedDay].supervisor_feedback.strengths?.length > 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground block mb-1">Puntos fuertes</span>
                          <ul className="space-y-1">
                            {strategy.content_calendar[selectedDay].supervisor_feedback.strengths.map((s: string, i: number) => (
                              <li key={i} className="text-foreground flex items-start gap-1">
                                <ThumbsUp className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {strategy.content_calendar[selectedDay].supervisor_feedback.improvements?.length > 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground block mb-1">Sugerencias de mejora</span>
                          <ul className="space-y-1">
                            {strategy.content_calendar[selectedDay].supervisor_feedback.improvements.map((s: string, i: number) => (
                              <li key={i} className="text-foreground flex items-start gap-1">
                                <Lightbulb className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    {strategy.content_calendar[selectedDay].supervisor_feedback.strategic_notes && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <span className="text-xs text-muted-foreground block mb-1">Notas estrategicas</span>
                        <p className="text-sm text-foreground">
                          {strategy.content_calendar[selectedDay].supervisor_feedback.strategic_notes}
                        </p>
                      </div>
                    )}
                    
                    {strategy.content_calendar[selectedDay].supervisor_feedback.recommended_copy && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs text-accent border-accent">
                          Copy recomendado: Version {strategy.content_calendar[selectedDay].supervisor_feedback.recommended_copy}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* Schedule Day Button */}
                {strategy.content_calendar[selectedDay].copies?.length > 0 && (
                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button onClick={() => scheduleContent()} variant="outline" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      Programar este dia
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Strategy-Level Supervisor Feedback */}
          {strategyFeedback && (
            <Card className="bg-card border-accent/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <UserCheck className="h-5 w-5 text-accent" />
                    Feedback del Supervisor sobre la Estrategia
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={strategyFeedback.score >= 80 ? 'default' : strategyFeedback.score >= 60 ? 'secondary' : 'outline'}
                      className={strategyFeedback.score >= 80 ? 'bg-green-500' : strategyFeedback.score >= 60 ? 'bg-yellow-500' : ''}>
                      {strategyFeedback.score}/100
                    </Badge>
                  </div>
                </div>
                <CardDescription>{strategyFeedback.overall_assessment}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Brand Compliance Checklist */}
                {strategyFeedback.brand_compliance && (
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                    <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      Cumplimiento de Lineamientos de Marca
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(strategyFeedback.brand_compliance).map(([key, value]) => {
                        const labels: Record<string, string> = {
                          tone_of_voice: 'Tono de Voz',
                          brand_values: 'Valores de Marca',
                          target_audience: 'Publico Objetivo',
                          keywords_used: 'Palabras Clave',
                          forbidden_words: 'Palabras Prohibidas',
                          style_guide: 'Guias de Estilo',
                          brand_personality: 'Personalidad',
                        }
                        return (
                          <div 
                            key={key} 
                            className={`p-2 rounded-lg text-center ${
                              value.compliant 
                                ? 'bg-green-500/10 border border-green-500/20' 
                                : 'bg-red-500/10 border border-red-500/20'
                            }`}
                            title={value.notes}
                          >
                            <div className="flex items-center justify-center gap-1 mb-1">
                              {value.compliant ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            <span className="text-xs font-medium text-foreground">
                              {labels[key] || key}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    {/* Show notes for non-compliant items */}
                    {Object.entries(strategyFeedback.brand_compliance).some(([_, v]) => !v.compliant) && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <span className="text-xs font-medium text-red-500 block mb-2">Observaciones:</span>
                        {Object.entries(strategyFeedback.brand_compliance).map(([key, value]) => {
                          if (value.compliant) return null
                          const labels: Record<string, string> = {
                            tone_of_voice: 'Tono de Voz',
                            brand_values: 'Valores de Marca',
                            target_audience: 'Publico Objetivo',
                            keywords_used: 'Palabras Clave',
                            forbidden_words: 'Palabras Prohibidas',
                            style_guide: 'Guias de Estilo',
                            brand_personality: 'Personalidad',
                          }
                          return (
                            <p key={key} className="text-xs text-muted-foreground">
                              <strong>{labels[key]}:</strong> {value.notes}
                            </p>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Strengths */}
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <span className="text-xs font-medium text-green-500 block mb-2">Puntos Fuertes</span>
                    <ul className="space-y-1">
                      {strategyFeedback.strengths?.map((s, i) => (
                        <li key={i} className="text-sm text-foreground flex items-start gap-2">
                          <ThumbsUp className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Improvements */}
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <span className="text-xs font-medium text-yellow-500 block mb-2">Areas de Mejora</span>
                    <ul className="space-y-1">
                      {strategyFeedback.improvements?.map((s, i) => (
                        <li key={i} className="text-sm text-foreground flex items-start gap-2">
                          <Lightbulb className="h-3 w-3 text-yellow-500 mt-1 flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                {/* Brand Alignment & Impact */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <span className="text-xs font-medium text-muted-foreground block mb-1">Alineacion con la Marca</span>
                    <p className="text-sm text-foreground">{strategyFeedback.brand_alignment}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <span className="text-xs font-medium text-muted-foreground block mb-1">Impacto Esperado</span>
                    <p className="text-sm text-foreground">{strategyFeedback.expected_impact}</p>
                  </div>
                </div>
                
                {/* Risks & Recommendations */}
                {(strategyFeedback.risks?.length > 0 || strategyFeedback.recommendations?.length > 0) && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {strategyFeedback.risks?.length > 0 && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <span className="text-xs font-medium text-red-500 block mb-2">Riesgos Potenciales</span>
                        <ul className="space-y-1">
                          {strategyFeedback.risks.map((r, i) => (
                            <li key={i} className="text-sm text-foreground flex items-start gap-2">
                              <XCircle className="h-3 w-3 text-red-500 mt-1 flex-shrink-0" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {strategyFeedback.recommendations?.length > 0 && (
                      <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                        <span className="text-xs font-medium text-accent block mb-2">Recomendaciones</span>
                        <ul className="space-y-1">
                          {strategyFeedback.recommendations.map((r, i) => (
                            <li key={i} className="text-sm text-foreground flex items-start gap-2">
                              <Target className="h-3 w-3 text-accent mt-1 flex-shrink-0" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  {strategy.content_calendar?.filter(d => d.copies?.length > 0).length || 0} de {strategy.content_calendar?.length || 0} dias con copys generados
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Exportar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={exportAsPDF}>
                        <FileText className="h-4 w-4 mr-2 text-red-500" />
                        Exportar como PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportAsCSV}>
                        <FileText className="h-4 w-4 mr-2 text-green-500" />
                        Exportar como CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportAsJSON}>
                        <FileText className="h-4 w-4 mr-2 text-blue-500" />
                        Exportar como JSON
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="outline" onClick={generateNewProposal} disabled={loading}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Nueva Propuesta
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep('content')} 
                    disabled={!strategy.content_calendar?.some(d => d.copies?.length > 0)}
                  >
                    Siguiente: Contenido
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 3: Content Review */}
      {currentStep === 'content' && strategy && (
        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <FileText className="h-5 w-5 text-accent" />
                    Contenido Generado
                  </CardTitle>
                  <CardDescription>
                    Revisa todos los copys generados para tu estrategia
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentStep('strategy')}>
                  Volver a Estrategia
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {strategy.content_calendar?.filter(d => d.copies?.length > 0).length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No hay copys generados aun</p>
                  <Button onClick={() => setCurrentStep('strategy')}>
                    Volver a generar copys
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {strategy.content_calendar?.filter(d => d.copies?.length > 0).map((day, idx) => (
                    <Card key={idx} className="bg-secondary/30 border-border">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                              <span className="text-sm font-bold text-accent">{day.day}</span>
                            </div>
                            <div>
                              <h4 className="font-medium text-foreground">{day.theme}</h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="text-xs">{day.pillar}</Badge>
                                <span>{day.content_type}</span>
                                <span>{day.best_time}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-3 gap-3">
                          {day.copies?.map((copy: any, copyIdx: number) => (
                            <div 
                              key={copyIdx} 
                              className={`p-3 rounded-lg border ${
                                day.supervisor_feedback?.recommended_copy === copy.version 
                                  ? 'border-accent bg-accent/5' 
                                  : 'border-border bg-background'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                  Version {copy.version}
                                </span>
                                {day.supervisor_feedback?.recommended_copy === copy.version && (
                                  <Badge variant="default" className="text-xs bg-accent">Recomendado</Badge>
                                )}
                              </div>
                              <p className="text-sm text-foreground line-clamp-4">{copy.content}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 w-full text-xs"
                                onClick={() => {
                                  navigator.clipboard.writeText(copy.content)
                                  alert('Copiado!')
                                }}
                              >
                                Copiar
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  {strategy.content_calendar?.filter(d => d.copies?.length > 0).length} dias con contenido listo
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={scheduleAllContent} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calendar className="h-4 w-4 mr-2" />}
                    Programar Todo
                  </Button>
                  <Button onClick={() => setCurrentStep('validation')}>
                    Siguiente: Validacion
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 4: Validation */}
      {currentStep === 'validation' && strategy && (
        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                    Validacion y Aprobacion
                  </CardTitle>
                  <CardDescription>
                    Comparte la estrategia con tu cliente o equipo para aprobacion
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentStep('content')}>
                  Volver a Contenido
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid md:grid-cols-4 gap-4">
                <Card className="bg-secondary/30 border-border">
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{strategy.content_calendar?.length}</p>
                    <p className="text-xs text-muted-foreground">Dias planificados</p>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/30 border-border">
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {strategy.content_calendar?.filter(d => d.copies?.length > 0).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Con copys listos</p>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/30 border-border">
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {strategy.strategy_overview?.content_pillars?.length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Pilares de contenido</p>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/30 border-border">
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-accent capitalize">{platform}</p>
                    <p className="text-xs text-muted-foreground">Plataforma</p>
                  </CardContent>
                </Card>
              </div>

              {/* Supervisor Feedback Summary */}
              {strategyFeedback && (
                <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-foreground flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-accent" />
                      Evaluacion del Supervisor
                    </h4>
                    <Badge className={strategyFeedback.score >= 80 ? 'bg-green-500' : strategyFeedback.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}>
                      {strategyFeedback.score}/100
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{strategyFeedback.overall_assessment}</p>
                </div>
              )}

              {/* Export Options */}
              <div className="p-4 rounded-lg border border-border bg-secondary/30">
                <h4 className="font-medium text-foreground mb-4">Exportar Estrategia</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex-col items-center gap-2"
                    onClick={exportAsPDF}
                  >
                    <div className="p-2 rounded-lg bg-red-500/20">
                      <Download className="h-5 w-5 text-red-500" />
                    </div>
                    <span className="font-medium">PDF</span>
                    <span className="text-xs text-muted-foreground text-center">Documento formateado listo para imprimir</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex-col items-center gap-2"
                    onClick={exportAsCSV}
                  >
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <Download className="h-5 w-5 text-green-500" />
                    </div>
                    <span className="font-medium">CSV</span>
                    <span className="text-xs text-muted-foreground text-center">Hoja de calculo para Excel o Sheets</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex-col items-center gap-2"
                    onClick={exportAsJSON}
                  >
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Download className="h-5 w-5 text-blue-500" />
                    </div>
                    <span className="font-medium">JSON</span>
                    <span className="text-xs text-muted-foreground text-center">Datos estructurados para desarrollo</span>
                  </Button>
                </div>
              </div>

              {/* Share Actions */}
              <div className="p-4 rounded-lg border border-border bg-secondary/30">
                <h4 className="font-medium text-foreground mb-4">Compartir</h4>
                <Button 
                  variant="outline" 
                  className="w-full h-auto py-4 flex-col items-start"
                  onClick={() => {
                    const shareData = {
                      brand: brands.find(b => b.id === selectedBrand)?.name,
                      platform,
                      days: strategy.content_calendar?.length,
                      objective: strategy.strategy_overview?.main_objective,
                    }
                    navigator.clipboard.writeText(JSON.stringify(shareData, null, 2))
                    alert('Datos copiados para compartir')
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Send className="h-4 w-4" />
                    <span className="font-medium">Compartir con Cliente</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Copia los datos de la estrategia al portapapeles</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Final Actions */}
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  Estrategia lista para programar
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={() => setSaveDialogOpen(true)}>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Estrategia
                  </Button>
                  <Button onClick={scheduleAllContent} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calendar className="h-4 w-4 mr-2" />}
                    Programar en Calendario
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Save Strategy Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guardar Estrategia</DialogTitle>
            <DialogDescription>
              Guarda esta estrategia para poder retomarla mas tarde
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="strategy-name">Nombre de la estrategia</Label>
              <Input
                id="strategy-name"
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                placeholder="Ej: Estrategia Instagram Marzo 2026"
                className="bg-input"
              />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Plataforma: <span className="text-foreground">{platform}</span></p>
              <p>Dias: <span className="text-foreground">{customDays}</span></p>
              <p>Contenidos: <span className="text-foreground">{strategy?.content_calendar?.length || 0}</span></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={saveStrategy} 
              disabled={savingStrategy || !strategyName.trim()}
            >
              {savingStrategy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {currentStrategyId ? 'Actualizar' : 'Guardar'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
