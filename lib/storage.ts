/**
 * Storage abstraction layer — sessionStorage for testing.
 * Swap to Supabase/AWS: replace get/set functions only.
 * sessionStorage clears on tab close; perfect for testing without 5MB localStorage limit.
 */

import type {
  Brand, Agent, Post, CompetitorAnalysis, MetricsReport, ContentStrategy, StrategySession,
} from './types'

// ─── Generic helpers ──────────────────────────────────────────────────────────

function get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch { return fallback }
}

function set<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(key, JSON.stringify(value))
}

// ─── Brands ──────────────────────────────────────────────────────────────────

const BRANDS_KEY = 'autocm_brands'
export const getBrands   = (): Brand[]        => get<Brand[]>(BRANDS_KEY, [])
export const saveBrands  = (v: Brand[]): void => set(BRANDS_KEY, v)
export const upsertBrand = (b: Brand): void => {
  const all = getBrands()
  saveBrands(all.find(x => x.id === b.id) ? all.map(x => x.id === b.id ? b : x) : [...all, b])
}
export const deleteBrand = (id: string): void => {
  saveBrands(getBrands().filter(b => b.id !== id))
  saveAgents(getAgents().filter(a => a.brand_id !== id))
}

// ─── Agents ──────────────────────────────────────────────────────────────────

const AGENTS_KEY = 'autocm_agents'
export const getAgents      = (): Agent[]        => get<Agent[]>(AGENTS_KEY, [])
export const saveAgents     = (v: Agent[]): void => set(AGENTS_KEY, v)
export const getBrandAgents = (brand_id: string): Agent[] => getAgents().filter(a => a.brand_id === brand_id)
export const getBrandAgentsByRole = (brand_id: string, role: Agent['role']): Agent[] =>
  getAgents().filter(a => a.brand_id === brand_id && a.role === role)
export const upsertAgent = (a: Agent): void => {
  const all = getAgents()
  saveAgents(all.find(x => x.id === a.id) ? all.map(x => x.id === a.id ? a : x) : [...all, a])
}
export const deleteAgent = (id: string): void => saveAgents(getAgents().filter(a => a.id !== id))

// ─── Posts ───────────────────────────────────────────────────────────────────

const POSTS_KEY = 'autocm_posts'
export const getPosts   = (): Post[]        => get<Post[]>(POSTS_KEY, [])
export const savePosts  = (v: Post[]): void => set(POSTS_KEY, v)
export const addPost    = (p: Post): void   => savePosts([p, ...getPosts()])
export const upsertPost = (p: Post): void => {
  const all = getPosts()
  savePosts(all.find(x => x.id === p.id) ? all.map(x => x.id === p.id ? p : x) : [p, ...all])
}

// ─── Strategy Sessions ────────────────────────────────────────────────────────

const SESSION_KEY = 'autocm_strategy_session'
export const getStrategySession   = (): StrategySession | null => get<StrategySession | null>(SESSION_KEY, null)
export const saveStrategySession  = (s: StrategySession): void => set(SESSION_KEY, s)
export const clearStrategySession = (): void => { if (typeof window !== 'undefined') sessionStorage.removeItem(SESSION_KEY) }

// ─── Competitor Analyses ──────────────────────────────────────────────────────

const COMPETITORS_KEY = 'autocm_competitor_analyses'
export const getCompetitorAnalyses = (): CompetitorAnalysis[] => get<CompetitorAnalysis[]>(COMPETITORS_KEY, [])
export const addCompetitorAnalysis = (a: CompetitorAnalysis): void => set(COMPETITORS_KEY, [a, ...getCompetitorAnalyses()])

// ─── Metrics Reports ──────────────────────────────────────────────────────────

const METRICS_KEY = 'autocm_metrics'
export const getMetricsReports = (): MetricsReport[] => get<MetricsReport[]>(METRICS_KEY, [])
export const addMetricsReport  = (r: MetricsReport): void => set(METRICS_KEY, [r, ...getMetricsReports()])

// ─── Content Strategies (finalized) ───────────────────────────────────────────

const STRATEGIES_KEY = 'autocm_strategies'
export const getStrategies = (): ContentStrategy[] => get<ContentStrategy[]>(STRATEGIES_KEY, [])
export const addStrategy   = (s: ContentStrategy): void => set(STRATEGIES_KEY, [s, ...getStrategies()])
