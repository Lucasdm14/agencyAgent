'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Users, Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp,
  Globe, Bot, Upload, FileText, Image, Link, Loader2, CheckCircle2, RefreshCw, Sparkles,
} from 'lucide-react'
import type { Brand, BrandbookRules, CompetitorHandle, BrandImage, BrandAssets } from '@/lib/types'
import { getBrands, upsertBrand, deleteBrand, getBrandAgents } from '@/lib/storage'

const DEFAULT_BB: BrandbookRules = {
  tone: { voice: 'profesional', pronouns: 'vos', examples_good: [], examples_bad: [] },
  emojis: { allowed: true, max_per_post: 3, banned_list: [] },
  hashtags: { always_include: [], banned: [], max_count: 5 },
  content_rules: [],
}

const DEFAULT_ASSETS: BrandAssets = {
  drive_folder_url: '',
  drive_images:     [],
  uploaded_images:  [],
  manual_url:       '',
  manual_base64:    '',
  use_ai_matching:  false,
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
      <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</label>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder ?? 'Escribí y Enter'}
          className="flex-1 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 bg-white" />
        <button type="button" onClick={add} className="border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 transition"><Plus size={14} /></button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span key={i} className="flex items-center gap-1 text-xs bg-zinc-100 border border-zinc-200 rounded-full px-2.5 py-0.5">
            {v}<button onClick={() => onChange(values.filter((_, j) => j !== i))}><X size={9} /></button>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Asset Bank ───────────────────────────────────────────────────────────────

function AssetBank({ assets, onChange }: { assets: BrandAssets; onChange: (a: BrandAssets) => void }) {
  const [driveUrl,       setDriveUrl]       = useState(assets.drive_folder_url ?? '')
  const [loadingDrive,   setLoadingDrive]   = useState(false)
  const [driveError,     setDriveError]     = useState('')
  const uploadRef = useRef<HTMLInputElement>(null)
  const manualRef = useRef<HTMLInputElement>(null)

  const allImages = [...(assets.uploaded_images ?? []), ...(assets.drive_images ?? [])]

  async function fetchDrive() {
    if (!driveUrl.trim()) return
    setLoadingDrive(true); setDriveError('')
    try {
      const res  = await fetch('/api/brand/assets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_url: driveUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setDriveError(data.error ?? 'Error al conectar Drive'); return }
      const driveImages: BrandImage[] = data.files.map((f: { id: string; name: string; mimeType: string; viewUrl: string }) => ({
        id:         f.id,
        name:       f.name,
        url:        f.viewUrl,
        source:     'drive' as const,
        mime_type:  f.mimeType,
        created_at: new Date().toISOString(),
      }))
      onChange({ ...assets, drive_folder_url: driveUrl.trim(), drive_images: driveImages })
    } catch { setDriveError('Error de red') }
    finally { setLoadingDrive(false) }
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) { alert(`${file.name} supera 5MB`); return }
      const reader = new FileReader()
      reader.onload = () => {
        const img: BrandImage = {
          id:         crypto.randomUUID(),
          name:       file.name,
          url:        reader.result as string,
          source:     'upload',
          mime_type:  file.type,
          created_at: new Date().toISOString(),
        }
        onChange({ ...assets, uploaded_images: [...(assets.uploaded_images ?? []), img] })
      }
      reader.readAsDataURL(file)
    })
    if (uploadRef.current) uploadRef.current.value = ''
  }

  function handleManual(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onChange({ ...assets, manual_base64: reader.result as string, manual_url: file.name })
    reader.readAsDataURL(file)
    if (manualRef.current) manualRef.current.value = ''
  }

  function removeImage(id: string) {
    onChange({
      ...assets,
      uploaded_images: (assets.uploaded_images ?? []).filter(i => i.id !== id),
      drive_images:    (assets.drive_images    ?? []).filter(i => i.id !== id),
    })
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-zinc-500 bg-blue-50 border border-blue-100 rounded-xl p-3 leading-relaxed">
        El banco de imágenes se usa al generar copies: la IA puede proponer automáticamente la imagen más relevante
        para cada post, o podés elegirla manualmente. Podés subir imágenes directamente o conectar una carpeta de Google Drive.
      </p>

      {/* AI matching toggle */}
      <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className={assets.use_ai_matching ? 'text-blue-600' : 'text-zinc-400'} />
          <div>
            <p className="text-sm font-medium text-zinc-800">Selección de imagen con IA</p>
            <p className="text-xs text-zinc-500">La IA elige la imagen más relevante según el tema del post</p>
          </div>
        </div>
        <button
          onClick={() => onChange({ ...assets, use_ai_matching: !assets.use_ai_matching })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${assets.use_ai_matching ? 'bg-blue-600' : 'bg-zinc-300'}`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${assets.use_ai_matching ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Manual de marca */}
      <div>
        <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Manual de marca / Logo</label>
        <div className="flex gap-2 items-center">
          {assets.manual_base64 ? (
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 flex-1">
              {assets.manual_base64.startsWith('data:image') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assets.manual_base64} alt="manual" className="h-8 w-8 object-contain rounded" />
              ) : (
                <FileText size={16} className="text-zinc-400" />
              )}
              <span className="text-xs text-zinc-600 truncate">{assets.manual_url}</span>
              <button onClick={() => onChange({ ...assets, manual_base64: '', manual_url: '' })} className="ml-auto">
                <X size={13} className="text-zinc-400 hover:text-red-500 transition" />
              </button>
            </div>
          ) : (
            <button onClick={() => manualRef.current?.click()}
              className="flex items-center gap-2 border border-dashed border-zinc-300 rounded-lg px-4 py-2 hover:border-blue-400 hover:bg-blue-50 transition text-sm text-zinc-500 hover:text-blue-600">
              <Upload size={14} /> Subir logo o manual (PDF / imagen)
            </button>
          )}
        </div>
        <input ref={manualRef} type="file" accept="image/*,.pdf" onChange={handleManual} className="hidden" />
      </div>

      {/* Google Drive */}
      <div>
        <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Link size={11} /> Carpeta de Google Drive (pública)
        </label>
        <div className="flex gap-2">
          <input value={driveUrl} onChange={e => setDriveUrl(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/..."
            className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 bg-white" />
          <button onClick={fetchDrive} disabled={!driveUrl.trim() || loadingDrive}
            className="flex items-center gap-1.5 text-sm bg-zinc-900 text-white rounded-lg px-3 py-2 hover:bg-zinc-700 transition disabled:opacity-40">
            {loadingDrive ? <><Loader2 size={13} className="animate-spin" /> Cargando...</> : <><RefreshCw size={13} /> Sincronizar</>}
          </button>
        </div>
        {driveError && <p className="text-xs text-red-600 mt-1">{driveError}</p>}
        {(assets.drive_images?.length ?? 0) > 0 && (
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 size={11} /> {assets.drive_images!.length} imágenes sincronizadas desde Drive
          </p>
        )}
        <p className="text-2xs text-zinc-400 mt-1">Requiere GOOGLE_API_KEY en Vercel. La carpeta debe estar compartida como "Cualquiera con el enlace".</p>
      </div>

      {/* Upload manual */}
      <div>
        <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Image size={11} /> Subir imágenes directamente
        </label>
        <button onClick={() => uploadRef.current?.click()}
          className="flex items-center gap-2 border border-dashed border-zinc-300 rounded-lg px-4 py-3 hover:border-blue-400 hover:bg-blue-50 transition text-sm text-zinc-500 hover:text-blue-600 w-full justify-center">
          <Upload size={15} /> Subir fotos del cliente (JPG, PNG, WebP — máx 5MB c/u)
        </button>
        <input ref={uploadRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
      </div>

      {/* Image grid */}
      {allImages.length > 0 && (
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
            Banco de imágenes ({allImages.length})
          </p>
          <div className="grid grid-cols-4 gap-2">
            {allImages.map(img => (
              <div key={img.id} className="relative group rounded-lg overflow-hidden border border-zinc-200 aspect-square bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.name}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <button onClick={() => removeImage(img.id)}
                    className="opacity-0 group-hover:opacity-100 bg-red-600 text-white rounded-full p-1 transition-all">
                    <X size={12} />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-all">
                  <p className="text-2xs text-white truncate">{img.name}</p>
                </div>
                {img.source === 'drive' && (
                  <div className="absolute top-1 right-1">
                    <span className="text-2xs bg-blue-600 text-white px-1 py-0.5 rounded">Drive</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Brand Form ───────────────────────────────────────────────────────────────

function BrandForm({ brand, onSave, onCancel }: { brand?: Brand; onSave: (b: Brand) => void; onCancel: () => void }) {
  const [name,         setName]         = useState(brand?.name ?? '')
  const [industry,     setIndustry]     = useState(brand?.industry ?? '')
  const [audience,     setAudience]     = useState(brand?.target_audience ?? '')
  const [webhook,      setWebhook]      = useState(brand?.webhook_url ?? '')
  const [brandPrompt,  setBrandPrompt]  = useState(brand?.brand_prompt ?? '')
  const [brandAssets,  setBrandAssets]  = useState<BrandAssets>(brand?.brand_assets ?? { ...DEFAULT_ASSETS })
  const [newsKeywords, setNewsKeywords] = useState<string[]>(brand?.news_keywords ?? [])
  const [competitors,  setCompetitors]  = useState<CompetitorHandle[]>(brand?.competitors ?? [])
  const [rssFeeds,     setRssFeeds]     = useState<string[]>(brand?.rss_feeds ?? [])
  const [bb,           setBb]           = useState<BrandbookRules>(brand?.brandbook_rules ?? { ...DEFAULT_BB })
  const [showBb,       setShowBb]       = useState(false)
  const [showContext,  setShowContext]   = useState(false)
  const [showAssets,   setShowAssets]   = useState(true)
  const [showPrompt,   setShowPrompt]   = useState(true)
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

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = reader.result as string
        if (file.name.endsWith('.csv')) { setBrandPrompt(text); return }
        const data = JSON.parse(text)
        const d = Array.isArray(data) ? data[0] : data
        if (d.name)          setName(d.name)
        if (d.industry)      setIndustry(d.industry)
        if (d.brand_prompt)  setBrandPrompt(d.brand_prompt)
        if (d.news_keywords) setNewsKeywords(d.news_keywords)
        if (d.brandbook_rules) setBb(d.brandbook_rules)
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
      brand_prompt: brandPrompt, brand_assets: brandAssets,
      webhook_url: webhook, news_keywords: newsKeywords,
      competitors, rss_feeds: rssFeeds,
      created_at: brand?.created_at ?? new Date().toISOString(),
    })
  }

  function CollapsibleSection({ title, open, onToggle, accent, children }: {
    title: React.ReactNode; open: boolean; onToggle: () => void; accent?: boolean; children: React.ReactNode
  }) {
    return (
      <div className={`border rounded-xl overflow-hidden ${accent ? 'border-blue-200' : 'border-zinc-200'}`}>
        <button onClick={onToggle}
          className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors ${accent ? 'bg-blue-50/50 hover:bg-blue-50 text-blue-700' : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700'}`}>
          {title}
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        {open && <div className="p-4 border-t border-zinc-100 space-y-4">{children}</div>}
      </div>
    )
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-800">{brand ? `Editando: ${brand.name}` : 'Nuevo cliente'}</h3>
        <div className="flex gap-2">
          <button onClick={() => importRef.current?.click()}
            className="flex items-center gap-1.5 text-xs border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 transition text-zinc-600">
            <Upload size={12} /> Importar JSON/CSV
          </button>
          <input ref={importRef} type="file" accept=".json,.csv" onChange={handleImport} className="hidden" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">Nombre *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Marca XYZ"
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 bg-white" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">Rubro</label>
          <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Gastronomía"
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 bg-white" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1.5">Audiencia general</label>
        <input value={audience} onChange={e => setAudience(e.target.value)} placeholder="Adultos 25-45..."
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 bg-white" />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1.5">Webhook URL (Zapier/Make)</label>
        <input value={webhook} onChange={e => setWebhook(e.target.value)} placeholder="https://hooks.zapier.com/..."
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 bg-white" />
      </div>

      {/* Brand Prompt */}
      <CollapsibleSection
        title={<span className="flex items-center gap-2"><FileText size={14} /> Prompt de la marca ★</span>}
        open={showPrompt} onToggle={() => setShowPrompt(v => !v)} accent>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Contexto maestro inyectado en todos los agentes. Incluí misión, valores, colores, voz, productos, diferenciadores, restricciones, etc.
        </p>
        <textarea value={brandPrompt} onChange={e => setBrandPrompt(e.target.value)} rows={10}
          placeholder="MISIÓN: ...\nVALORES: ...\nCOLORES: ...\nVOZ: ...\nPRODUCTOS: ..."
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 bg-white resize-y" />
        <p className="text-2xs text-zinc-400">{brandPrompt.length} caracteres</p>
      </CollapsibleSection>

      {/* Assets */}
      <CollapsibleSection
        title={<span className="flex items-center gap-2"><Image size={14} /> Banco de imágenes y assets visuales</span>}
        open={showAssets} onToggle={() => setShowAssets(v => !v)}>
        <AssetBank assets={brandAssets} onChange={setBrandAssets} />
      </CollapsibleSection>

      {/* Context */}
      <CollapsibleSection
        title={<span className="flex items-center gap-2"><Globe size={14} /> APIs de contexto de mercado</span>}
        open={showContext} onToggle={() => setShowContext(v => !v)}>
        <ChipInput label="Keywords NewsAPI" values={newsKeywords} onChange={setNewsKeywords} placeholder="gastronomía argentina" />
        <ChipInput label="Feeds RSS" values={rssFeeds} onChange={setRssFeeds} placeholder="https://blog.ejemplo.com/rss" />
        <div className="space-y-3">
          <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider">Competidores</label>
          {competitors.map((c, i) => (
            <div key={i} className="flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-zinc-400">{[c.facebook_page_name && `FB: ${c.facebook_page_name}`, c.youtube_channel && `YT: ${c.youtube_channel}`].filter(Boolean).join(' · ') || 'Sin redes'}</p>
              </div>
              <button onClick={() => setCompetitors(competitors.filter((_, j) => j !== i))}><X size={13} className="text-zinc-400 hover:text-red-500" /></button>
            </div>
          ))}
          <CompetitorAdd onAdd={c => setCompetitors([...competitors, c])} />
        </div>
      </CollapsibleSection>

      {/* Brandbook */}
      <CollapsibleSection
        title={<span className="flex items-center gap-2"><FileText size={14} /> Brandbook estructurado</span>}
        open={showBb} onToggle={() => setShowBb(v => !v)}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Tono base</label>
            <select value={bb.tone.voice} onChange={e => updateBb(['tone', 'voice'], e.target.value)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-400">
              {['profesional','informal','técnico','cercano','inspiracional','humorístico'].map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Pronombres</label>
            <select value={bb.tone.pronouns} onChange={e => updateBb(['tone', 'pronouns'], e.target.value)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-400">
              <option value="vos">Vos</option><option value="tú">Tú</option><option value="usted">Usted</option>
            </select>
          </div>
        </div>
        <ChipInput label="Hashtags siempre incluir" values={bb.hashtags.always_include} onChange={v => updateBb(['hashtags', 'always_include'], v)} placeholder="#MarcaXYZ" />
        <ChipInput label="Hashtags prohibidos" values={bb.hashtags.banned} onChange={v => updateBb(['hashtags', 'banned'], v)} placeholder="#viral" />
        <ChipInput label="Reglas de contenido" values={bb.content_rules} onChange={v => updateBb(['content_rules'], v)} placeholder="Nunca mencionar precios sin aprobación" />
        <ChipInput label="Emojis prohibidos" values={bb.emojis.banned_list} onChange={v => updateBb(['emojis', 'banned_list'], v)} placeholder="🔥" />
      </CollapsibleSection>

      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="flex items-center gap-1.5 text-sm border border-zinc-200 rounded-lg px-4 py-2 hover:bg-zinc-50 transition text-zinc-600"><X size={13} /> Cancelar</button>
        <button onClick={save} disabled={!name.trim()} className="flex items-center gap-1.5 text-sm bg-zinc-900 text-white rounded-lg px-4 py-2 hover:bg-zinc-700 transition disabled:opacity-40"><Save size={13} /> Guardar cliente</button>
      </div>
    </div>
  )
}

function CompetitorAdd({ onAdd }: { onAdd: (c: CompetitorHandle) => void }) {
  const [name, setName] = useState(''); const [fb, setFb] = useState(''); const [yt, setYt] = useState('')
  function add() {
    if (!name.trim()) return
    onAdd({ name: name.trim(), facebook_page_name: fb.trim() || undefined, youtube_channel: yt.trim() || undefined })
    setName(''); setFb(''); setYt('')
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre *" className="border border-zinc-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white" />
      <input value={fb}   onChange={e => setFb(e.target.value)}   placeholder="Facebook Page" className="border border-zinc-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white" />
      <div className="flex gap-1.5">
        <input value={yt} onChange={e => setYt(e.target.value)}   placeholder="YouTube" className="flex-1 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white" />
        <button onClick={add} disabled={!name.trim()} className="border border-zinc-200 rounded-lg px-2.5 hover:bg-zinc-50 transition disabled:opacity-40"><Plus size={14} /></button>
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
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-blue-600" />
          <h1 className="text-xl font-semibold text-zinc-900">Clientes</h1>
        </div>
        {editing === null && (
          <button onClick={() => setEditing('new')}
            className="flex items-center gap-2 text-sm bg-zinc-900 text-white rounded-lg px-4 py-2 hover:bg-zinc-700 transition">
            <Plus size={15} /> Nuevo cliente
          </button>
        )}
      </div>

      {editing === 'new' && <div className="mb-5"><BrandForm onSave={save} onCancel={() => setEditing(null)} /></div>}

      <div className="space-y-3">
        {brands.length === 0 && editing !== 'new' && (
          <div className="text-center py-16 text-zinc-300">
            <Users size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">Sin clientes</p>
          </div>
        )}
        {brands.map(b => {
          const agentCount = getBrandAgents(b.id).length
          const imageCount = (b.brand_assets?.uploaded_images?.length ?? 0) + (b.brand_assets?.drive_images?.length ?? 0)
          return (
            <div key={b.id}>
              {editing && typeof editing === 'object' && editing.id === b.id ? (
                <BrandForm brand={b} onSave={save} onCancel={() => setEditing(null)} />
              ) : (
                <div className="bg-white border border-zinc-200 rounded-xl px-5 py-4 flex items-center justify-between hover:border-zinc-300 shadow-sm transition-colors">
                  <div>
                    <p className="font-semibold text-zinc-900">{b.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                      <span>{b.industry || 'Sin rubro'}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5"><Bot size={10} /> {agentCount} agentes</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5"><Image size={10} /> {imageCount} imágenes</span>
                      <span>·</span>
                      {b.brand_prompt ? <span className="text-emerald-600 flex items-center gap-0.5"><CheckCircle2 size={10} /> Prompt</span> : <span className="text-amber-500">Sin prompt</span>}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(b)} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition"><Edit2 size={14} /></button>
                    <button onClick={() => remove(b.id)} className="p-2 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 transition"><Trash2 size={14} /></button>
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
