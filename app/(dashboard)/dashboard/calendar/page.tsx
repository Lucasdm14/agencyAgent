import { createClient } from '@/lib/supabase/server'
import { ContentCalendar } from '@/components/calendar/content-calendar'

export default async function CalendarPage() {
  const supabase = await createClient()
  
  const { data: brands } = await supabase
    .from('brands')
    .select('id, name')
    .order('name')

  const { data: content } = await supabase
    .from('content')
    .select('*, brand:brands(name)')
    .not('scheduled_date', 'is', null)
    .order('scheduled_date')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Calendario de Contenido</h2>
        <p className="text-muted-foreground">Programa y gestiona tus publicaciones</p>
      </div>
      
      <ContentCalendar brands={brands || []} initialContent={content || []} />
    </div>
  )
}
