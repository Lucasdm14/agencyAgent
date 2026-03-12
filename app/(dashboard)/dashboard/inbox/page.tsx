import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InboxView } from '@/components/inbox/inbox-view'

export default async function InboxPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Load posts pending PM review
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      brands (id, name, logo_url, webhook_url)
    `)
    .in('status', ['pm_review', 'supervisor_review'])
    .order('created_at', { ascending: false })

  // Load brands for filter
  const { data: brands } = await supabase
    .from('brands')
    .select('id, name')
    .order('name')

  return (
    <InboxView
      posts={posts ?? []}
      brands={brands ?? []}
      userRole={profile?.role ?? 'creator'}
    />
  )
}
