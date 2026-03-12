'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  LayoutGrid, List, Clock
} from 'lucide-react'
import { ScheduleContentDialog } from './schedule-content-dialog'
import type { Content } from '@/lib/types'

interface ContentCalendarProps {
  brands: { id: string; name: string }[]
  initialContent: (Content & { brand: { name: string } | null })[]
}

type ViewMode = 'month' | 'week' | 'day'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function ContentCalendar({ brands, initialContent }: ContentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [content, setContent] = useState(initialContent)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const supabase = createClient()

  const filteredContent = useMemo(() => {
    if (selectedBrand === 'all') return content
    return content.filter(c => c.brand_id === selectedBrand)
  }, [content, selectedBrand])

  function getContentForDate(date: Date) {
    const dateStr = date.toISOString().split('T')[0]
    return filteredContent.filter(c => c.scheduled_date === dateStr)
  }

  function navigateDate(direction: number) {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction)
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + direction * 7)
    } else {
      newDate.setDate(newDate.getDate() + direction)
    }
    setCurrentDate(newDate)
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  function handleDateClick(date: Date) {
    setSelectedDate(date)
    setDialogOpen(true)
  }

  async function handleContentUpdate() {
    const { data } = await supabase
      .from('content')
      .select('*, brand:brands(name)')
      .not('scheduled_date', 'is', null)
      .order('scheduled_date')
    
    if (data) setContent(data)
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      pending_review: 'bg-warning/20 text-warning border-warning/30',
      approved: 'bg-success/20 text-success border-success/30',
      rejected: 'bg-destructive/20 text-destructive border-destructive/30',
      scheduled: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
      published: 'bg-chart-1/20 text-chart-1 border-chart-1/30',
    }
    return colors[status] || colors.draft
  }

  // Generate calendar days for month view
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPadding = firstDay.getDay()
    const days: Date[] = []

    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const day = new Date(year, month, -i)
      days.push(day)
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    // Next month padding
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i))
    }

    return days
  }, [currentDate])

  // Generate week days
  const weekDays = useMemo(() => {
    const days: Date[] = []
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }
    
    return days
  }, [currentDate])

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDate(-1)}
                className="border-border"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={goToToday}
                className="border-border"
              >
                Hoy
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDate(1)}
                className="border-border"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold text-foreground ml-2">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="w-40 bg-input border-border">
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

              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'month' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className="rounded-none"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className="rounded-none"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'day' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('day')}
                  className="rounded-none"
                >
                  <Clock className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      {viewMode === 'month' && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((date, index) => {
                const dayContent = getContentForDate(date)
                const today = isToday(date)
                const currentMonth = isCurrentMonth(date)

                return (
                  <button
                    key={index}
                    onClick={() => handleDateClick(date)}
                    className={`
                      min-h-24 p-2 rounded-lg border text-left transition-colors
                      ${today ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50'}
                      ${!currentMonth ? 'opacity-40' : ''}
                    `}
                  >
                    <span className={`
                      text-sm font-medium
                      ${today ? 'text-accent' : 'text-foreground'}
                    `}>
                      {date.getDate()}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayContent.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className={`text-xs p-1 rounded truncate border ${getStatusColor(item.status)}`}
                        >
                          {item.title || item.body.substring(0, 20)}
                        </div>
                      ))}
                      {dayContent.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayContent.length - 3} mas
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((date, index) => {
                const dayContent = getContentForDate(date)
                const today = isToday(date)

                return (
                  <div
                    key={index}
                    className={`
                      min-h-64 p-3 rounded-lg border
                      ${today ? 'border-accent bg-accent/5' : 'border-border'}
                    `}
                  >
                    <div className="text-center mb-3">
                      <p className="text-xs text-muted-foreground">{DAYS[index]}</p>
                      <p className={`text-lg font-semibold ${today ? 'text-accent' : 'text-foreground'}`}>
                        {date.getDate()}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {dayContent.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleDateClick(date)}
                          className={`
                            text-xs p-2 rounded cursor-pointer border
                            ${getStatusColor(item.status)}
                          `}
                        >
                          <p className="font-medium truncate">
                            {item.title || 'Sin titulo'}
                          </p>
                          <p className="text-muted-foreground truncate mt-1">
                            {item.brand?.name}
                          </p>
                          {item.scheduled_time && (
                            <p className="mt-1">{item.scheduled_time}</p>
                          )}
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDateClick(date)}
                        className="w-full text-xs text-muted-foreground"
                      >
                        + Agregar
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">
              {currentDate.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const dayContent = getContentForDate(currentDate)
              return dayContent.length > 0 ? (
                <div className="space-y-4">
                  {dayContent.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border ${getStatusColor(item.status)}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-foreground">
                            {item.title || 'Sin titulo'}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {item.brand?.name} - {item.platform || item.content_type}
                          </p>
                        </div>
                        {item.scheduled_time && (
                          <span className="text-sm font-medium">
                            {item.scheduled_time}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {item.body}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No hay contenido programado para este dia</p>
                  <Button
                    className="mt-4 bg-accent text-accent-foreground"
                    onClick={() => handleDateClick(currentDate)}
                  >
                    Programar contenido
                  </Button>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      <ScheduleContentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedDate={selectedDate}
        brands={brands}
        onContentScheduled={handleContentUpdate}
      />
    </div>
  )
}
