'use client'

import { useState, useEffect } from 'react'
import {
  Bot, Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp,
  Users, Target, Zap, AlertCircle,
} from 'lucide-react'
import type { Brand, Agent, AgentEnergy, AgentFormality } from '@/lib/types'
import { getBrands, getBrandAgents, upsertAgent, deleteAgent } from '@/lib/storage'

// ─── ChipInput helper ─────────────────────────────────────────────────────────

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
        <button type="button" onClick={add}
          className="border border-border rounded px-3 py-1.5 text-sm hover:bg-paper transition-colors">
          <Plus size={14} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span key={i} className="flex items-center gap-1 text-xs bg-paper border border-border rounded px-2 py-0.5">
            {v}
            <button onClick={() => onChange(values.filter((_, j) => j !== i))}><X size={10} /></button>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Agent form ───────────────────────────────────────────────────────────────

const PLATFORMS   = ['instagram', 'linkedin', 'facebook', 'twitter', 'tiktok', 'youtube']
const PRIORITIES  = ['aspiracional', 'precio-valor', 'educativo', 'tendencia', 'comunidad', 'producto', 'humor', 'emocional']
const TONE_VOICES = ['profesional', 'informal', 'técnico', 'cercano', 'inspiracional', 'humorístico', 'empático', 'autoritativo']

function AgentForm({ agent, brandId, brands, onSave, onCancel }: {
  agent?: Agent
  brandId: string
  brands: Brand[]
  onSave: (a: Agent) => void
  onCancel: () => void
}) {
  const [name,           setName]           = useState(agent?.name           ?? '')
  const [description,    setDescription]    = useState(agent?.description    ?? '')
  const [segment,        setSegment]        = useState(agent?.segment        ?? '')
  const [toneVoice,      setToneVoice]      = useState(agent?.tone_voice     ?? 'cercano')
  const [energy,         setEnergy]         = useState<AgentEnergy>(agent?.energy      ?? 'media')
  const [formality,      setFormality]      = useState<AgentFormality>(agent?.formality ?? 'semiformal')
  const [platformFocus,  setPlatformFocus]  = useState<string[]>(agent?.platform_focus  ?? [])
  const [contentPrios,   setContentPrios]   = useState<string[]>(agent?.content_priorities ?? [])
  const [extraRules,     setExtraRules]     = useState<string[]>(agent?.extra_rules    ?? [])
  const [selectedBrandId, setSelectedBrandId] = useState(agent?.brand_id ?? brandId)

  function save() {
    if (!name.trim() || !segment.trim() || !selectedBrandId) return
    onSave({
      id:                  agent?.id ?? crypto.randomUUID(),
      brand_id:            selectedBrandId,
      name:                name.trim(),
      description:         description.trim(),
      segment:             segment.trim(),
      tone_voice:          toneVoice,
      energy,
      formality,
      platform_focus:      platformFocus,
      content_priorities:  contentPrios,
      extra_rules:         extraRules,
      created_at:          agent?.created_at ?? new Date().toISOString(),
    })
  }

  const isValid = name.trim() && segment.trim() && selectedBrandId

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5 fade-up">
      <div className="grid grid-cols-2 gap-4">
        {/* Brand selector — only shown when creating from "all brands" view */}
        {!brandId && (
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs text-muted uppercase tracking-wider">Cliente *</label>
            <select value={selectedBrandId} onChange={e => setSelectedBrandId(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm bg-paper outline-none focus:border-accent">
              <option value="">Seleccioná un cliente</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs text-muted uppercase tracking-wider">Nombre del agente *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder='ej: "Millennials Premium"'
            className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent bg-paper" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted uppercase tracking-wider">Descripción corta</label>
          <input value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Resumen de 1 línea para el selector"
            className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent bg-paper" />
        </div>
      </div>

      {/* Segment — the most important field */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted uppercase tracking-wider">Segmento objetivo *</label>
        <textarea value={segment} onChange={e => setSegment(e.target.value)}
          placeholder="ej: Mujeres 25-35, urbanas, ABC1, interesadas en lifestyle, wellness y moda. Activas en Instagram y TikTok. Valoran la autenticidad sobre el lujo."
          rows={3}
          className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent bg-paper resize-none" />
        <p className="text-xs text-muted">Cuanto más específico, mejor orientará a la IA.</p>
      </div>

      {/* Tone controls */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-muted uppercase tracking-wider">Tono de voz</label>
          <select value={toneVoice} onChange={e => setToneVoice(e.target.value)}
            className="w-full border border-border rounded px-3 py-2 text-sm bg-paper outline-none focus:border-accent">
            {TONE_VOICES.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted uppercase tracking-wider">Energía</label>
          <select value={energy} onChange={e => setEnergy(e.target.value as AgentEnergy)}
            className="w-full border border-border rounded px-3 py-2 text-sm bg-paper outline-none focus:border-accent">
            <option value="alta">Alta ⚡</option>
            <option value="media">Media</option>
            <option value="baja">Baja 🌿</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted uppercase tracking-wider">Formalidad</label>
          <select value={formality} onChange={e => setFormality(e.target.value as AgentFormality)}
            className="w-full border border-border rounded px-3 py-2 text-sm bg-paper outline-none focus:border-accent">
            <option value="formal">Formal</option>
            <option value="semiformal">Semiformal</option>
            <option value="informal">Informal</option>
          </select>
        </div>
      </div>

      {/* Platform focus — multi-select chips */}
      <div className="space-y-2">
        <label className="text-xs text-muted uppercase tracking-wider">Plataformas preferidas</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <button key={p} type="button"
              onClick={() => setPlatformFocus(
                platformFocus.includes(p) ? platformFocus.filter(x => x !== p) : [...platformFocus, p]
              )}
              className={`text-xs px-3 py-1.5 rounded border transition-all font-mono
                ${platformFocus.includes(p)
                  ? 'bg-ink text-white border-ink'
                  : 'border-border text-muted hover:border-ink hover:text-ink'}`}>
              {p}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">Sin selección = todas las plataformas.</p>
      </div>

      {/* Content priorities — multi-select chips */}
      <div className="space-y-2">
        <label className="text-xs text-muted uppercase tracking-wider">Prioridades de contenido</label>
        <div className="flex flex-wrap gap-2">
          {PRIORITIES.map(p => (
            <button key={p} type="button"
              onClick={() => setContentPrios(
                contentPrios.includes(p) ? contentPrios.filter(x => x !== p) : [...contentPrios, p]
              )}
              className={`text-xs px-3 py-1.5 rounded border transition-all
                ${contentPrios.includes(p)
                  ? 'bg-accent text-white border-accent'
                  : 'border-border text-muted hover:border-accent hover:text-accent'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Extra rules */}
      <ChipInput
        label="Reglas extra de este agente"
        values={extraRules}
        onChange={setExtraRules}
        placeholder='ej: "Nunca usar precios exactos", "Siempre en vos"'
      />

      <div className="flex gap-2 pt-2">
        <button onClick={onCancel}
          className="flex items-center gap-1.5 text-sm border border-border rounded px-4 py-2 hover:bg-paper transition-colors">
          <X size={14} /> Cancelar
        </button>
        <button onClick={save} disabled={!isValid}
          className="flex items-center gap-1.5 text-sm bg-accent text-white rounded px-4 py-2 hover:bg-orange-700 transition-colors disabled:opacity-40">
          <Save size={14} /> Guardar agente
        </button>
      </div>
    </div>
  )
}

// ─── Agent card ───────────────────────────────────────────────────────────────

function AgentCard({ agent, brandName, onEdit, onDelete }: {
  agent:     Agent
  brandName: string
  onEdit:    () => void
  onDelete:  () => void
}) {
  const energyIcon   = agent.energy    === 'alta' ? '⚡' : agent.energy === 'baja' ? '🌿' : '●'
  const formalLabel  = agent.formality === 'formal' ? 'Formal' : agent.formality === 'informal' ? 'Informal' : 'Semiformal'

  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-accent/30 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <Bot size={18} className="text-accent" />
          </div>
          <div>
            <p className="font-medium text-ink text-sm">{agent.name}</p>
            <p className="text-xs text-muted">{brandName}</p>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded hover:bg-paper text-muted hover:text-ink transition-colors">
            <Edit2 size={14} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-50 text-muted hover:text-red-600 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {agent.description && (
        <p className="text-xs text-muted mb-3 italic">{agent.description}</p>
      )}

      <div className="space-y-2">
        <div className="flex items-start gap-1.5">
          <Target size={12} className="text-accent mt-0.5 shrink-0" />
          <p className="text-xs text-ink/80 leading-relaxed">{agent.segment}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs bg-paper border border-border rounded px-2 py-0.5 font-mono">
            {agent.tone_voice}
          </span>
          <span className="text-xs bg-paper border border-border rounded px-2 py-0.5">
            {energyIcon} {agent.energy}
          </span>
          <span className="text-xs bg-paper border border-border rounded px-2 py-0.5">
            {formalLabel}
          </span>
        </div>

        {agent.platform_focus.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Zap size={11} className="text-muted" />
            {agent.platform_focus.map(p => (
              <span key={p} className="text-xs font-mono text-accent bg-orange-50 px-1.5 py-0.5 rounded">
                {p}
              </span>
            ))}
          </div>
        )}

        {agent.content_priorities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {agent.content_priorities.map(p => (
              <span key={p} className="text-xs bg-ink/5 text-ink/60 px-2 py-0.5 rounded">
                {p}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [brands,       setBrands]       = useState<Brand[]>([])
  const [agents,       setAgents]       = useState<Agent[]>([])
  const [filterBrandId, setFilterBrandId] = useState<string>('all')
  const [editing,      setEditing]      = useState<Agent | null | 'new'>(null)
  const [expanded,     setExpanded]     = useState<Record<string, boolean>>({})

  useEffect(() => {
    const allBrands = getBrands()
    setBrands(allBrands)
    // Load all agents
    const all: Agent[] = []
    allBrands.forEach(b => all.push(...getBrandAgents(b.id)))
    setAgents(all)
    // Auto-expand first brand
    if (allBrands.length > 0) {
      setExpanded({ [allBrands[0].id]: true })
    }
  }, [])

  function refreshAgents() {
    const all: Agent[] = []
    brands.forEach(b => all.push(...getBrandAgents(b.id)))
    setAgents(all)
  }

  function save(a: Agent) {
    upsertAgent(a)
    refreshAgents()
    setEditing(null)
  }

  function remove(id: string) {
    deleteAgent(id)
    refreshAgents()
  }

  function toggle(brandId: string) {
    setExpanded(prev => ({ ...prev, [brandId]: !prev[brandId] }))
  }

  const displayedBrands = filterBrandId === 'all'
    ? brands
    : brands.filter(b => b.id === filterBrandId)

  if (brands.length === 0) {
    return (
      <div className="p-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <Bot size={24} className="text-accent" />
          <h1 className="font-display text-3xl text-ink">Agentes</h1>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-8 text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-orange-400" />
          <p className="font-medium text-orange-800 mb-2">Primero necesitás un cliente</p>
          <p className="text-sm text-orange-700 mb-4">Los agentes se crean dentro de cada marca.</p>
          <a href="/dashboard/brands"
            className="inline-block text-sm bg-accent text-white px-4 py-2 rounded hover:bg-orange-700 transition-colors">
            Ir a Clientes →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Bot size={24} className="text-accent" />
          <h1 className="font-display text-3xl text-ink">Agentes</h1>
          <span className="text-xs font-mono bg-ink/5 text-muted px-2 py-0.5 rounded">
            {agents.length} total
          </span>
        </div>
        <button onClick={() => setEditing('new')}
          className="flex items-center gap-2 text-sm bg-accent text-white rounded px-4 py-2 hover:bg-orange-700 transition-colors">
          <Plus size={16} /> Nuevo agente
        </button>
      </div>
      <p className="text-sm text-muted mb-8">
        Cada agente define un <strong>tono</strong> y <strong>segmento de audiencia</strong> específico.
        Al generar copy o una estrategia, elegís qué agente activar para que la IA oriente el contenido a ese público.
      </p>

      {/* Filter */}
      {brands.length > 1 && (
        <div className="flex gap-1 mb-6 bg-card border border-border rounded-lg p-1 w-fit overflow-x-auto">
          <button onClick={() => setFilterBrandId('all')}
            className={`px-3 py-1.5 text-xs rounded whitespace-nowrap transition-all font-medium
              ${filterBrandId === 'all' ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}>
            Todos
          </button>
          {brands.map(b => (
            <button key={b.id} onClick={() => setFilterBrandId(b.id)}
              className={`px-3 py-1.5 text-xs rounded whitespace-nowrap transition-all font-medium
                ${filterBrandId === b.id ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}>
              {b.name} ({getBrandAgents(b.id).length})
            </button>
          ))}
        </div>
      )}

      {/* New agent form */}
      {editing === 'new' && (
        <div className="mb-6">
          <AgentForm
            brandId={filterBrandId === 'all' ? '' : filterBrandId}
            brands={brands}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {/* Brands with their agents */}
      <div className="space-y-4">
        {displayedBrands.map(brand => {
          const brandAgents = agents.filter(a => a.brand_id === brand.id)
          const isOpen      = expanded[brand.id] !== false  // default open

          return (
            <div key={brand.id} className="border border-border rounded-xl overflow-hidden">
              {/* Brand header */}
              <button onClick={() => toggle(brand.id)}
                className="w-full flex items-center justify-between px-5 py-4 bg-card hover:bg-paper/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-ink/5 flex items-center justify-center">
                    <Users size={15} className="text-muted" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-ink">{brand.name}</p>
                    <p className="text-xs text-muted">
                      {brandAgents.length === 0 ? 'Sin agentes' : `${brandAgents.length} agente${brandAgents.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      setFilterBrandId(brand.id)
                      setEditing('new')
                      setExpanded(prev => ({ ...prev, [brand.id]: true }))
                    }}
                    className="text-xs flex items-center gap-1 border border-border rounded px-2.5 py-1 hover:bg-paper hover:border-accent/50 text-muted hover:text-accent transition-all">
                    <Plus size={12} /> Agente
                  </button>
                  {isOpen ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                </div>
              </button>

              {/* Agents grid */}
              {isOpen && (
                <div className="border-t border-border p-4">
                  {brandAgents.length === 0 ? (
                    <div className="text-center py-8 text-muted">
                      <Bot size={28} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Sin agentes para esta marca.</p>
                      <p className="text-xs mt-1">
                        Creá uno para que la IA pueda orientar el copy a un segmento específico.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {brandAgents.map(agent => (
                        editing && typeof editing === 'object' && editing.id === agent.id ? (
                          <div key={agent.id} className="sm:col-span-2 lg:col-span-3">
                            <AgentForm
                              agent={agent}
                              brandId={brand.id}
                              brands={brands}
                              onSave={save}
                              onCancel={() => setEditing(null)}
                            />
                          </div>
                        ) : (
                          <AgentCard
                            key={agent.id}
                            agent={agent}
                            brandName={brand.name}
                            onEdit={() => setEditing(agent)}
                            onDelete={() => remove(agent.id)}
                          />
                        )
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
