import { createClient } from '@/lib/supabase/server'
import { CopyGenerator } from '@/components/generate/copy-generator'

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ strategy?: string }>
}) {
  const { strategy: strategyId } = await searchParams
  const supabase = await createClient()
  
  const { data: brands } = await supabase
    .from('brands')
    .select('id, name')
    .order('name')

  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, brand_id, type')
    .eq('is_active', true)
    .order('name')

  // Get metrics accounts (competitors) for strategy optimization
  const { data: metricsAccounts } = await supabase
    .from('competitors')
    .select('id, name, platform, platform_username, follower_count, engagement_rate, avg_likes, avg_comments, avg_views, brand_id')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Estrategia de Contenido</h2>
        <p className="text-muted-foreground">Crea estrategias de contenido con IA basadas en metricas y lineamientos de marca</p>
      </div>
      
      <CopyGenerator 
        brands={brands || []} 
        agents={agents || []} 
        metricsAccounts={metricsAccounts || []}
        initialStrategyId={strategyId}
      />
    </div>
  )
}
