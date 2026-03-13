import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { MetaAdsAnalysis } from '@/components/competitors/meta-ads-analysis'

interface Props {
  params: Promise<{ id: string }>
}

export default async function MetaAdsAnalysisPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: competitor } = await supabase
    .from('competitors')
    .select(`
      *,
      brand:brands(id, name)
    `)
    .eq('id', id)
    .single()

  if (!competitor) notFound()

  const { data: analyses } = await supabase
    .from('competitor_ads_analysis')
    .select('*')
    .eq('competitor_id', id)
    .order('analyzed_at', { ascending: false })
    .limit(10)

  const { data: ads } = await supabase
    .from('competitor_ads')
    .select('*')
    .eq('competitor_id', id)
    .order('last_seen_at', { ascending: false })
    .limit(50)

  return (
    <MetaAdsAnalysis 
      competitor={competitor}
      analyses={analyses || []}
      ads={ads || []}
    />
  )
}
