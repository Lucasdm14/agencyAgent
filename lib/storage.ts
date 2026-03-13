/**
 * Storage abstraction layer.
 * All app data goes through typed functions here.
 * Swap to Vercel KV: replace each function body with kv.get / kv.set calls.
 */

import type {
  Brand, Agent, Post, CompetitorAnalysis, MetricsReport, ContentStrategy,
} from './types'

// ─── Generic helpers ──────────────────────────────────────────────────────────

function get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function set<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

// ─── Brands ──────────────────────────────────────────────────────────────────

const BRANDS_KEY = 'autocm_brands'

export const getBrands   = (): Brand[]        => get<Brand[]>(BRANDS_KEY, [])
export const saveBrands  = (v: Brand[]): void => set(BRANDS_KEY, v)

export const upsertBrand = (b: Brand): void => {
  const all = getBrands()
  saveBrands(all.find(x => x.id === b.id)
    ? all.map(x => x.id === b.id ? b : x)
    : [...all, b]
  )
}

export const deleteBrand = (id: string): void => {
  saveBrands(getBrands().filter(b => b.id !== id))
  // Cascade-delete brand's agents
  saveAgents(getAgents().filter(a => a.brand_id !== id))
}

// ─── Agents ──────────────────────────────────────────────────────────────────

const AGENTS_KEY = 'autocm_agents'

export const getAgents      = (): Agent[]        => get<Agent[]>(AGENTS_KEY, [])
export const saveAgents     = (v: Agent[]): void => set(AGENTS_KEY, v)

/** Returns agents for a specific brand */
export const getBrandAgents = (brand_id: string): Agent[] =>
  getAgents().filter(a => a.brand_id === brand_id)

export const upsertAgent = (a: Agent): void => {
  const all = getAgents()
  saveAgents(all.find(x => x.id === a.id)
    ? all.map(x => x.id === a.id ? a : x)
    : [...all, a]
  )
}

export const deleteAgent = (id: string): void =>
  saveAgents(getAgents().filter(a => a.id !== id))

// ─── Posts ───────────────────────────────────────────────────────────────────

const POSTS_KEY = 'autocm_posts'

export const getPosts   = (): Post[]        => get<Post[]>(POSTS_KEY, [])
export const savePosts  = (v: Post[]): void => set(POSTS_KEY, v)
export const addPost    = (p: Post): void   => savePosts([p, ...getPosts()])

export const upsertPost = (p: Post): void => {
  const all = getPosts()
  savePosts(all.find(x => x.id === p.id)
    ? all.map(x => x.id === p.id ? p : x)
    : [p, ...all]
  )
}

// ─── Competitor Analyses ──────────────────────────────────────────────────────

const COMPETITORS_KEY = 'autocm_competitor_analyses'

export const getCompetitorAnalyses = (): CompetitorAnalysis[] =>
  get<CompetitorAnalysis[]>(COMPETITORS_KEY, [])

export const addCompetitorAnalysis = (a: CompetitorAnalysis): void =>
  set(COMPETITORS_KEY, [a, ...getCompetitorAnalyses()])

// ─── Metrics Reports ──────────────────────────────────────────────────────────

const METRICS_KEY = 'autocm_metrics'

export const getMetricsReports = (): MetricsReport[] =>
  get<MetricsReport[]>(METRICS_KEY, [])

export const addMetricsReport = (r: MetricsReport): void =>
  set(METRICS_KEY, [r, ...getMetricsReports()])

// ─── Content Strategies ───────────────────────────────────────────────────────

const STRATEGIES_KEY = 'autocm_strategies'

export const getStrategies = (): ContentStrategy[] =>
  get<ContentStrategy[]>(STRATEGIES_KEY, [])

export const addStrategy = (s: ContentStrategy): void =>
  set(STRATEGIES_KEY, [s, ...getStrategies()])
