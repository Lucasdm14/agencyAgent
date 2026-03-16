'use client'

import { useState, useEffect, useRef } from 'react'
import { Users, Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp, Globe, Bot, Upload, FileText } from 'lucide-react'
import type { Brand, BrandbookRules, CompetitorHandle } from '@/lib/types'
import { getBrands, upsertBrand, deleteBrand, getBrandAgents } from '@/lib/storage'

const DEFAULT_BB: BrandbookRules = {
  tone: { voice: 'profesional', pronouns: 'vos', examples_good: [], examples_bad: [] },
  emojis: { allowed: true, max_per_post: 3, banned_list: [] },
  hashtags: { always_include: [], banned: [], max_count: 5 },
  content_rules: [],
}

function ChipInput({ label, values, onChange, placeholder }: {
  label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string
}) {
  const [input, setInput] = useState('')
  function add() {
    const v = input.trim()
    if (v && !values.includes(v)) { onChange([...values, v]); setInput('') }
  }
  return (
    <div className="space-y-2">
      <label className="text-xs text-muted uppercase tracking-wider">{label}</label>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder ?? 'Escribí y Enter'}
          className="flex-1 border border-border rounded px-3 py-1.5 text-sm outline-none focus:border-accent bg-paper" />
        <button type="button" onClick={add} className="border border-border rounded px-3 py-1.5 hover:bg-paper transition-colors"><Plus size={14} /></button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span key={i} className="flex items-center gap-1 text-xs bg-paper border border-border rounded px-2 py-0.5">
            {v}<button onClick={() => onChange(values.filter((_, j) => j !== i))}><X size={10} /></button>
          </span>
        ))}
      </div>
    </div>
  )
}

function CompetitorInput({ competitors, onChange }: { competitors: CompetitorHandle[]; onChange: (v: CompetitorHandle[]) => void }) {
  const [name, setName] = useState(''); const [fb, setFb] = useState(''); const [yt, setYt] = useState(''); const [web, setWeb] = useState('')
  function add() {
    if (!name.trim()) return
    onChange([...competitors, { name: name.trim(), facebook_page_name: fb.trim() || undefined, youtube_channel: yt.trim() || undefined, website_url: web.trim() || undefined }])
    setName(''); setFb(''); setYt(''); setWeb('')
  }
  return (
    <div className="space-y-3">
      <label className="text-xs text-muted uppercase tracking-wider">Competidores (opcional — para inteligencia competitiva)</label>
      <div className="grid grid-cols-2 gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre *" className="border border-border rounded px-3 py-1.5 text-sm outline-none focus:border-accent bg-paper" />
        <input value={fb}   onChange={e => setFb(e.target.value)}   placeholder="Facebook Page Name" className="border border-border rounded px-3 py-1.5 text-sm outline-none focus:border-accent bg-paper" />
        <input value={yt}   onChange={e => setYt(e.target.value)}   placeholder="Canal de YouTube"   className="border border-border rounded px-3 py-1.5 text-sm outline-none focus:border-accent bg-paper" />
        <input value={web}  onChange={e => setWeb(e.target.value)}  placeholder="URL del blog/RSS"   className="border border-border rounded px-3 py-1.5 text-sm outline-none focus:border-accent bg-paper" />
      </div>
      <button type="button" onClick={add} disabled={!name.trim()} className="text-xs border border-border rounded px-3 py-1.5 hover:bg-paper transition-colors disabled:opacity-40 flex items-center gap-1"><Plus size={12} /> Agregar competidor</button>
      {competitors.map((c, i) => (
        <div key={i} className="flex items-center justify-between bg-paper border border-border rounded px-3 py-2">
          <div>
            <p className="text-sm font-medium">{c.name}</p>
            <p className="text-xs text-muted">{[c.facebook_page_name && `FB: ${c.facebook_page_name}`, c.youtube_channel && `YT: ${c.youtube_channel}`].filter(Boolean).join(' · ') || 'Sin redes'}</p>
          </div>
          <button onClick={() => onChange(competitors.filter((_, j) => j !== i))}><X size={14} className="text-muted hover:text-red-600" /></button>
        </div>
      ))}
    </div>
  )
}

function BrandForm({ brand, onSave, onCancel }: { brand?: Brand; onSave: (b: Brand) => void; onCancel: () => void }) {
  const [name,         setName]         = useState(brand?.name ?? '')
  const [industry,     setIndustry]     = useState(brand?.industry ?? '')
  const [audience,     setAudience]     = useState(brand?.target_audience ?? '')
  const [webhook,      setWebhook]      = useState(brand?.webhook_url ?? '')
  const [brandPrompt,  setBrandPrompt]  = useState(brand?.brand_prompt ?? '')
  const [newsKeywords, setNewsKeywords] = useState<string[]>(brand?.news_keywords ?? [])
  const [competitors,  setCompetitors]  = useState<CompetitorHandle[]>(brand?.competitors ?? [])
  const [rssFeeds,     setRssFeeds]     = useState<string[]>(brand?.rss_feeds ?? [])
  const [bb,           setBb]           = useState<BrandbookRules>(brand?.brandbook_rules ?? { ...DEFAULT_BB })
  const [showBb,       setShowBb]       = useState(false)
  const [showContext,  setShowContext]   = useState(false)
  const [showPrompt,   setShowPrompt]   = useState(!brand || !!brand?.brand_prompt)
  const importRef = useRef<HTMLInputElement>(null)

  function updateBb(path: string[], value: unknown) {
    setBb(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      let obj: Record<string, unknown> = next
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]] as Record<string, unknown>
      obj[path[path.length - 1]] = value
      return next
    })
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = reader.result as string
        if (file.name.endsWith('.csv')) {
          // CSV: treat entire content as brand_prompt
          setBrandPrompt(text)
        } else {
          const parsed = JSON.parse(text)
          const data = Array.isArray(parsed) ? parsed[0] : parsed
          if (data.name)         setName(data.name)
          if (data.industry)     setIndustry(data.industry)
          if (data.brand_prompt) setBrandPrompt(data.brand_prompt)
          if (data.news_keywords) setNewsKeywords(data.news_keywords)
          if (data.brandbook_rules) setBb(data.brandbook_rules)
        }
      } catch { alert('Error al leer el archivo') }
    }
    reader.readAsText(file)
    if (importRef.current) importRef.current.value = ''
  }

  function save() {
    if (!name.trim()) return
    onSave({
      id: brand?.id ?? crypto.randomUUID(), name, industry,
      target_audience: audience, brandbook_rules: bb,
      brand_prompt: brandPrompt,
      webhook_url: webhook, news_keywords: newsKeywords, competitors, rss_feeds: rssFeeds,
      created_at: brand?.created_at ?? new Date().toISOString(),
    })
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-ink">{brand ? `Editando: ${brand.name}` : 'Nuevo cliente'}</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => importRef.current?.click()}
            className="flex items-center gap-1.5 text-xs border border-border rounded px-3 py-1.5 hover:bg-paper transition-colors">
            <Upload size={12} /> Importar JSON / CSV
          </button>
          <input ref={importRef} type="file" accept=".json,.csv" onChange={handleImportFile} className="hidden" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-muted uppercase tracking-wider">Nombre *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Marca XYZ"
            className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent bg-paper" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted uppercase tracking-wider">Rubro</label>
          <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Gastronomía"
            className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent bg-paper" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted uppercase tracking-wider">Audiencia general</label>
        <input value={audience} onChange={e => setAudience(e.target.value)} placeholder="Adultos 25-45..."
          className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent bg-paper" />
        <p className="text-xs text-muted">Para segmentación específica, configurá <a href="/dashboard/agents" className="text-accent underline">Agentes</a>.</p>
      </div>

      {/* Brand Prompt — most important field */}
      <div className="border border-accent/30 rounded-lg overflow-hidden">
        <button onClick={() => setShowPrompt(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-orange-50/50 text-sm font-medium hover:bg-orange-50 transition-colors">
          <span className="flex items-center gap-2 text-accent">
            <FileText size={14} /> Prompt completo de la marca ★
          </span>
          {showPrompt ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showPrompt && (
          <div className="p-4 border-t border-accent/20 space-y-3">
            <p className="text-xs text-muted bg-orange-50 border border-orange-200 rounded p-3">
              Este es el <strong>contexto maestro de la marca</strong>. Se inyecta en TODOS los agentes (Estratega, Copy, Supervisor) como variable <code className="font-mono">{'{{brand_prompt}}'}</code>.<br/>
              Incluí todo lo relevante: <strong>misión, valores, colores, logo URL, voz, productos, diferenciadores, público, keywords, restricciones legales, tono, etc.</strong><br/>
              También podés pegar JSON o cualquier estructura que quieras.
            </p>
            <textarea
              value={brandPrompt}
              onChange={e => setBrandPrompt(e.target.value)}
              rows={12}
              placeholder={`Ejemplo:
MISIÓN: Democratizar el acceso a [producto] para [audiencia].
VALORES: Honestidad, innovación, cercanía.
COLORES: Naranja #E8440A (principal), Negro #0D0D0D, Blanco.
LOGO: https://...
VOZ: Cercana, directa, sin tecnicismos.
PRODUCTOS: [Lista de productos y precios aproximados]
DIFERENCIADOR: Somos los únicos que [propuesta de valor única].
PÚBLICO: Mujeres 25-40, profesionales urbanas, ABC1.
KEYWORDS: [lista de keywords del negocio]
RESTRICCIONES: No mencionar a competidores por nombre. No prometer resultados específicos.
HISTORIA: Fundada en 2020 por...`}
              className="w-full border border-border rounded px-3 py-2 text-sm font-mono outline-none focus:border-accent bg-paper resize-y" />
            <p className="text-xs text-muted">{brandPrompt.length} caracteres · Podés pegar texto libre, JSON, o importar un archivo arriba.</p>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted uppercase tracking-wider">Webhook URL (Zapier/Make)</label>
        <input value={webhook} onChange={e => setWebhook(e.target.value)} placeholder="https://hooks.zapier.com/..."
          className="w-full border border-border rounded px-3 py-2 text-sm font-mono outline-none focus:border-accent bg-paper" />
      </div>

      {/* Context for anti-hallucination */}
      <div className="border border-border rounded-lg overflow-hidden">
        <button onClick={() => setShowContext(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-paper text-sm font-medium hover:bg-border/30 transition-colors">
          <span className="flex items-center gap-2"><Globe size={14} /> APIs de contexto de mercado</span>
          {showContext ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showContext && (
          <div className="p-4 space-y-5 border-t border-border">
            <p className="text-xs text-muted">Se buscan antes de generar copies para evitar que la IA alucine tendencias.</p>
            <ChipInput label="Keywords NewsAPI" values={newsKeywords} onChange={setNewsKeywords} placeholder="gastronomía argentina" />
            <ChipInput label="Feeds RSS" values={rssFeeds} onChange={setRssFeeds} placeholder="https://blog.ejemplo.com/rss" />
            <CompetitorInput competitors={competitors} onChange={setCompetitors} />
          </div>
        )}
      </div>

      {/* Brandbook */}
      <div className="border border-border rounded-lg overflow-hidden">
        <button onClick={() => setShowBb(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-paper text-sm font-medium hover:bg-border/30 transition-colors">
          <span>Brandbook estructurado (reglas de comunicación)</span>
          {showBb ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showBb && (
          <div className="p-4 space-y-5 border-t border-border">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted uppercase tracking-wider">Tono base</label>
                <select value={bb.tone.voice} onChange={e => updateBb(['tone', 'voice'], e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 text-sm bg-paper outline-none focus:border-accent">
                  {['profesional','informal','técnico','cercano','inspiracional','humorístico'].map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted uppercase tracking-wider">Pronombres</label>
                <select value={bb.tone.pronouns} onChange={e => updateBb(['tone', 'pronouns'], e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 text-sm bg-paper outline-none focus:border-accent">
                  <option value="vos">Vos (Argentina)</option>
                  <option value="tú">Tú (España/LATAM)</option>
                  <option value="usted">Usted (formal)</option>
                </select>
              </div>
            </div>
            <ChipInput label="Hashtags siempre incluir" values={bb.hashtags.always_include} onChange={v => updateBb(['hashtags', 'always_include'], v)} placeholder="#MarcaXYZ" />
            <ChipInput label="Hashtags prohibidos" values={bb.hashtags.banned} onChange={v => updateBb(['hashtags', 'banned'], v)} placeholder="#viral" />
            <ChipInput label="Reglas de contenido" values={bb.content_rules} onChange={v => updateBb(['content_rules'], v)} placeholder="Nunca mencionar precios sin aprobación" />
            <ChipInput label="Emojis prohibidos" values={bb.emojis.banned_list} onChange={v => updateBb(['emojis', 'banned_list'], v)} placeholder="🔥" />
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="flex items-center gap-1.5 text-sm border border-border rounded px-4 py-2 hover:bg-paper transition-colors"><X size={14} /> Cancelar</button>
        <button onClick={save} disabled={!name.trim()} className="flex items-center gap-1.5 text-sm bg-accent text-white rounded px-4 py-2 hover:bg-orange-700 transition-colors disabled:opacity-40"><Save size={14} /> Guardar cliente</button>
      </div>
    </div>
  )
}

export default function BrandsPage() {
  const [brands,  setBrands]  = useState<Brand[]>([])
  const [editing, setEditing] = useState<Brand | null | 'new'>(null)

  useEffect(() => { setBrands(getBrands()) }, [])

  function save(b: Brand) { upsertBrand(b); setBrands(getBrands()); setEditing(null) }
  function remove(id: string) { deleteBrand(id); setBrands(getBrands()) }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3"><Users size={24} className="text-accent" /><h1 className="font-display text-3xl text-ink">Clientes</h1></div>
        {editing === null && <button onClick={() => setEditing('new')} className="flex items-center gap-2 text-sm bg-accent text-white rounded px-4 py-2 hover:bg-orange-700 transition-colors"><Plus size={16} /> Nuevo cliente</button>}
      </div>

      {editing === 'new' && <div className="mb-6 fade-up"><BrandForm onSave={save} onCancel={() => setEditing(null)} /></div>}

      <div className="space-y-3">
        {brands.length === 0 && editing !== 'new' && (
          <div className="text-center py-16 text-muted">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-display text-xl text-ink/40">Sin clientes aún</p>
          </div>
        )}
        {brands.map(b => {
          const agentCount = getBrandAgents(b.id).length
          return (
            <div key={b.id}>
              {editing && typeof editing === 'object' && editing.id === b.id ? (
                <div className="fade-up"><BrandForm brand={b} onSave={save} onCancel={() => setEditing(null)} /></div>
              ) : (
                <div className="bg-card border border-border rounded-xl px-5 py-4 flex items-center justify-between hover:border-accent/30 transition-colors">
                  <div>
                    <p className="font-medium text-ink">{b.name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {b.industry || 'Sin rubro'} ·{' '}
                      <span className="inline-flex items-center gap-0.5"><Bot size={10} /> {agentCount} agente{agentCount !== 1 ? 's' : ''}</span> ·{' '}
                      {b.brand_prompt ? <span className="text-success">✓ Prompt</span> : <span className="text-warning">Sin prompt</span>} ·{' '}
                      {b.webhook_url ? '🔗 Webhook' : 'Sin webhook'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(b)} className="text-muted hover:text-ink p-2 rounded hover:bg-paper transition-colors"><Edit2 size={15} /></button>
                    <button onClick={() => remove(b.id)} className="text-muted hover:text-red-600 p-2 rounded hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
