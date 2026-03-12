'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { 
  Calendar, Copy, Check, Lightbulb, Clock, CalendarCheck, X, 
  ChevronRight, Loader2 
} from 'lucide-react'

interface StrategistOutputProps {
  strategist: {
    agent: string
    strategy?: string
    best_time?: string
    best_day?: string
    frequency?: string
    engagement_tactics?: string[]
    kpis?: string[]
    calendar_proposal?: any
  }
  content: string
  brandId: string
  platform: string
  contentType: string
  contentId?: string
  onRegenerateStrategy?: () => void
  isRegenerating?: boolean
}

export function StrategistOutput({ 
  strategist, 
  content, 
  brandId, 
  platform, 
  contentType,
  contentId,
  onRegenerateStrategy,
  isRegenerating = false
}: StrategistOutputProps) {
  const [copied, setCopied] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Strategy can come as JSON string or as plain object with fields
  let strategy: any = null
  
  // If strategist has direct fields (best_time, best_day, etc), use them directly
  if (strategist.best_time || strategist.best_day || strategist.engagement_tactics || strategist.kpis) {
    // Extract strategy text - if it's JSON, try to get just the text
    let strategyText = strategist.strategy
    if (typeof strategyText === 'string' && strategyText.startsWith('{')) {
      try {
        const parsed = JSON.parse(strategyText)
        strategyText = parsed.strategy || parsed.estrategia || strategyText
      } catch {
        // Keep as is
      }
    }
    
    strategy = {
      strategy: strategyText,
      best_time: strategist.best_time,
      best_day: strategist.best_day,
      frequency: strategist.frequency,
      engagement_tactics: strategist.engagement_tactics,
      kpis: strategist.kpis,
      calendar_proposal: strategist.calendar_proposal,
    }
  } else if (strategist.strategy) {
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(strategist.strategy)
      strategy = {
        strategy: parsed.strategy || parsed.estrategia || null,
        best_time: parsed.best_time || parsed.mejor_hora,
        best_day: parsed.best_day || parsed.mejor_dia,
        frequency: parsed.frequency || parsed.frecuencia,
        engagement_tactics: parsed.engagement_tactics || parsed.tacticas_engagement || [],
        kpis: parsed.kpis || [],
        calendar_proposal: parsed.calendar_proposal || parsed.propuesta_calendario,
      }
    } catch {
      // If not JSON, use strategy as plain text
      strategy = { strategy: strategist.strategy }
    }
  }

  const handleCopyContent = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAcceptCalendarProposal = async () => {
    if (!strategy?.calendar_proposal) {
      alert('No hay propuesta de calendario disponible')
      return
    }
    if (!brandId) {
      alert('Error: No se encontro el ID de la marca')
      return
    }
    
    setAccepting(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Error: Usuario no autenticado')
        setAccepting(false)
        return
      }

      const proposal = strategy.calendar_proposal
      
      // Parse date - handle different formats
      let primaryDate = proposal.primary_date || proposal.fecha_principal || proposal.date
      let primaryTime = proposal.primary_time || proposal.hora || '09:00'
      
      if (!primaryDate) {
        // Use tomorrow as default if no date provided
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        primaryDate = tomorrow.toISOString().split('T')[0]
      }
      
      // Create calendar event for primary date
      const primaryDateTime = new Date(`${primaryDate}T${primaryTime}:00`)
      
      const { error } = await supabase.from('calendar_events').insert({
        brand_id: brandId,
        title: `Publicacion ${platform || 'Social'}`,
        description: content ? content.substring(0, 200) + '...' : 'Contenido programado',
        start_time: primaryDateTime.toISOString(),
        end_time: new Date(primaryDateTime.getTime() + 30 * 60000).toISOString(), // 30 min duration
        event_type: 'post',
        platform: platform || 'instagram',
        content_type: contentType || 'social',
        status: 'scheduled',
        content_id: contentId || null,
        metadata: {
          strategy_reasoning: proposal.reasoning || proposal.razon,
          alternative_dates: proposal.alternative_dates || proposal.fechas_alternativas,
          full_strategy: strategy,
        },
        created_by: user.id,
      })

      if (error) {
        console.error('Error creating calendar event:', error)
        alert('Error al crear evento: ' + error.message)
        setAccepting(false)
        return
      }

      // If there's a content series, create those events too
      const series = proposal.content_series || proposal.serie_contenidos || []
      if (series.length > 0) {
        for (const item of series) {
          const itemDate = item.date || item.fecha
          if (!itemDate) continue
          const itemDateTime = new Date(`${itemDate}T${item.time || item.hora || '09:00'}:00`)
          
          await supabase.from('calendar_events').insert({
            brand_id: brandId,
            title: `${item.content_type || item.tipo} - ${platform || 'Social'}`,
            description: item.description || item.descripcion || '',
            start_time: itemDateTime.toISOString(),
            end_time: new Date(itemDateTime.getTime() + 30 * 60000).toISOString(),
            event_type: 'post',
            platform: platform || 'instagram',
            content_type: item.content_type || item.tipo || 'social',
            status: 'draft',
            metadata: {
              series_parent_id: contentId,
              suggested_by_strategy: true,
            },
            created_by: user.id,
          })
        }
      }

      setAccepted(true)
      
      // Redirect to calendar after a short delay
      setTimeout(() => {
        router.push('/dashboard/calendar')
      }, 1500)
      
    } catch (error) {
      console.error('Error:', error)
      alert('Error al agendar en calendario')
    } finally {
      setAccepting(false)
    }
  }

  if (!strategy || (!strategy.strategy && !strategy.best_time && !strategy.calendar_proposal)) {
    // Nothing to show
    return null
  }

  return (
    <div className="space-y-4">
      {/* Strategy Card */}
      <div className="p-4 rounded-lg bg-secondary/50 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <span>📊</span>
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">Estratega</p>
            <p className="text-xs text-muted-foreground">{strategist.agent}</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {strategy.strategy && typeof strategy.strategy === 'string' && !strategy.strategy.startsWith('{') && (
            <div className="p-3 rounded bg-background/50">
              <p className="text-xs font-medium text-foreground mb-1">Estrategia:</p>
              <p className="text-sm text-muted-foreground">{strategy.strategy}</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2">
            {strategy.best_time && (
              <div className="p-2 rounded bg-secondary/50 flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Mejor hora</p>
                  <p className="text-sm font-medium text-foreground">{strategy.best_time}</p>
                </div>
              </div>
            )}
            {strategy.best_day && (
              <div className="p-2 rounded bg-secondary/50 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Mejor día</p>
                  <p className="text-sm font-medium text-foreground">{strategy.best_day}</p>
                </div>
              </div>
            )}
          </div>
          
          {strategy.engagement_tactics && strategy.engagement_tactics.length > 0 && (
            <div>
              <p className="text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" /> Tácticas de engagement:
              </p>
              <ul className="text-xs text-muted-foreground list-disc list-inside">
                {strategy.engagement_tactics.map((t: string, i: number) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          
          {strategy.kpis && strategy.kpis.length > 0 && (
            <div>
              <p className="text-xs font-medium text-foreground mb-1">KPIs a seguir:</p>
              <div className="flex flex-wrap gap-1">
                {strategy.kpis.map((kpi: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">{kpi}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Proposal Card */}
      {strategy.calendar_proposal && (
        <Card className="p-4 border-accent/50 bg-accent/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <CalendarCheck className="h-4 w-4 text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground text-sm">Propuesta de Calendario</p>
              <p className="text-xs text-muted-foreground">El estratega sugiere estas fechas</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Primary Date */}
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-accent">Fecha recomendada</span>
                <Badge className="bg-accent text-accent-foreground text-xs">Principal</Badge>
              </div>
              <p className="text-lg font-semibold text-foreground">
                {new Date(strategy.calendar_proposal.primary_date).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}
                {strategy.calendar_proposal.primary_time && (
                  <span className="text-muted-foreground font-normal text-sm ml-2">
                    a las {strategy.calendar_proposal.primary_time}
                  </span>
                )}
              </p>
              {strategy.calendar_proposal.reasoning && (
                <p className="text-xs text-muted-foreground mt-2">
                  {strategy.calendar_proposal.reasoning}
                </p>
              )}
            </div>

            {/* Alternative Dates */}
            {strategy.calendar_proposal.alternative_dates && strategy.calendar_proposal.alternative_dates.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Fechas alternativas:</p>
                <div className="flex flex-wrap gap-2">
                  {strategy.calendar_proposal.alternative_dates.map((date: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {new Date(date).toLocaleDateString('es-ES', { 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Content Series */}
            {strategy.calendar_proposal.content_series && strategy.calendar_proposal.content_series.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Serie de contenido sugerida:</p>
                <div className="space-y-1">
                  {strategy.calendar_proposal.content_series.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-secondary/50 text-xs">
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {new Date(item.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="font-medium text-foreground">{item.content_type}</span>
                      <span className="text-muted-foreground truncate flex-1">{item.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accept/Reject/Regenerate Buttons */}
            {!accepted ? (
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleAcceptCalendarProposal}
                    disabled={accepting || isRegenerating}
                    className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    {accepting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Agendando...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Aceptar propuesta
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-border"
                    disabled={isRegenerating}
                    onClick={() => router.push('/dashboard/calendar')}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Agendar manualmente
                  </Button>
                </div>
                {onRegenerateStrategy && (
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground"
                    onClick={onRegenerateStrategy}
                    disabled={isRegenerating}
                  >
                    {isRegenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generando nueva propuesta...
                      </>
                    ) : (
                      <>
                        <Lightbulb className="mr-2 h-4 w-4" />
                        Generar propuesta nueva
                      </>
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
                <Check className="h-5 w-5 text-success" />
                <span className="text-sm text-success font-medium">
                  Propuesta aceptada - Redirigiendo al calendario...
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Copy Content Button */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="flex-1 border-border"
          onClick={handleCopyContent}
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4 text-success" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copiar contenido
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
