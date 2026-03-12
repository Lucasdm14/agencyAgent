'use client'

import { useState, useEffect } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Calendar } from 'lucide-react'
import type { Content } from '@/lib/types'

interface ScheduleContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date | null
  brands: { id: string; name: string }[]
  onContentScheduled: () => void
}

export function ScheduleContentDialog({
  open,
  onOpenChange,
  selectedDate,
  brands,
  onContentScheduled,
}: ScheduleContentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [drafts, setDrafts] = useState<Content[]>([])
  const [selectedContent, setSelectedContent] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [time, setTime] = useState('09:00')
  
  const supabase = createClient()

  useEffect(() => {
    if (open && selectedBrand) {
      loadDrafts()
    }
  }, [open, selectedBrand])

  async function loadDrafts() {
    const query = supabase
      .from('content')
      .select('*')
      .in('status', ['draft', 'approved'])
      .is('scheduled_date', null)
      .order('created_at', { ascending: false })

    if (selectedBrand) {
      query.eq('brand_id', selectedBrand)
    }

    const { data } = await query
    setDrafts(data || [])
  }

  async function handleSchedule() {
    if (!selectedContent || !selectedDate) return
    
    setLoading(true)

    const { error } = await supabase
      .from('content')
      .update({
        scheduled_date: selectedDate.toISOString().split('T')[0],
        scheduled_time: time,
        status: 'scheduled',
      })
      .eq('id', selectedContent)

    if (!error) {
      onContentScheduled()
      onOpenChange(false)
      setSelectedContent('')
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent" />
            Programar Contenido
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {selectedDate && (
              <>
                Fecha seleccionada: {selectedDate.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-foreground">Marca</Label>
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue placeholder="Selecciona una marca" />
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
            <Label className="text-foreground">Contenido a programar</Label>
            <Select 
              value={selectedContent} 
              onValueChange={setSelectedContent}
              disabled={!selectedBrand}
            >
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue placeholder={
                  selectedBrand 
                    ? (drafts.length > 0 ? "Selecciona un contenido" : "No hay contenido disponible")
                    : "Primero selecciona una marca"
                } />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border max-h-60">
                {drafts.map((draft) => (
                  <SelectItem key={draft.id} value={draft.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {draft.title || draft.body.substring(0, 30) + '...'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {draft.content_type} - {draft.status}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Hora de publicacion</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-input border-border text-foreground"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border text-foreground"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={loading || !selectedContent}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Programando...
              </>
            ) : (
              'Programar'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
