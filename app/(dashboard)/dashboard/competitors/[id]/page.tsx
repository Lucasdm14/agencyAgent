import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CompetitorAnalysis } from '@/components/competitors/competitor-analysis'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CompetitorDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get competitor
  const { data: competitor } = await supabase
    .from('competitors')
    .select('*')
    .eq('id', id)
    .single()

  if (!competitor) {
    redirect('/dashboard/competitors')
  }

  // Get snapshots
  const { data: snapshots } = await supabase
    .from('competitor_snapshots')
    .select('*')
    .eq('competitor_id', id)
    .order('snapshot_date', { ascending: false })
    .limit(30)

  // Get reports
  const { data: reports } = await supabase
    .from('competitor_reports')
    .select('*')
    .eq('competitor_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get ads
  const { data: ads } = await supabase
    .from('competitor_ads')
    .select('*')
    .eq('competitor_id', id)
    .order('active', { ascending: false })
    .order('started_at', { ascending: false })
    .limit(50)

  return (
    <CompetitorAnalysis 
      competitor={competitor} 
      snapshots={snapshots || []} 
      reports={reports || []}
      ads={ads || []}
    />
  )
}
