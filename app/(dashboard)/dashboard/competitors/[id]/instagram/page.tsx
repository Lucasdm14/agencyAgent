import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { InstagramAnalysis } from '@/components/competitors/instagram-analysis'

interface Props {
  params: Promise<{ id: string }>
}

export default async function InstagramAnalysisPage({ params }: Props) {
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
    .from('competitor_instagram_analysis')
    .select('*')
    .eq('competitor_id', id)
    .order('analyzed_at', { ascending: false })
    .limit(10)

  const { data: posts } = await supabase
    .from('competitor_posts')
    .select('*')
    .eq('competitor_id', id)
    .order('posted_at', { ascending: false })
    .limit(50)

  return (
    <InstagramAnalysis 
      competitor={competitor}
      analyses={analyses || []}
      posts={posts || []}
    />
  )
}
