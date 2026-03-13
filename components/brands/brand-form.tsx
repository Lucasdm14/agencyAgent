'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, X, Save } from 'lucide-react'

const DEFAULT_BRANDBOOK = {
  tone: { voice: 'profesional', pronouns: 'vos', examples_good: [] as string[], examples_bad: [] as string[] },
  emojis: { allowed: true, max_per_post: 3, approved_list: [] as string[], banned_list: [] as string[] },
  hashtags: { always_include: [] as string[], banned: [] as string[], max_count: 5 },
  content_rules: [] as string[],
  platform_overrides: {} as Record<string, unknown>,
}

interface BrandFormProps {
  brand?: {
    id: string
    name: string
    industry: string | null
    target_audience: string | null
    brandbook_rules: typeof DEFAULT_BRANDBOOK | null
    webhook_url: string | null
  }
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
    <div>
      <Label className="text-sm text-gray-600 mb-1 block">{label}</Label>
      <div className="flex gap-2 mb-2">
        <Input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder ?? 'Escribí y presioná Enter'} className="text-sm" />
        <Button type="button" size="sm" variant="outline" onClick={add}><Plus className="w-4 h-4" /></Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <Badge key={i} variant="secondary" className="gap-1 pr-1">{v}
            <button onClick={() => onChange(values.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
          </Badge>
        ))}
      </div>
    </div>
  )
}

export function BrandForm({ brand }: BrandFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(brand?.name ?? '')
  const [industry, setIndustry] = useState(brand?.industry ?? '')
  const [targetAudience, setTargetAudience] = useState(brand?.target_audience ?? '')
  const [webhookUrl, setWebhookUrl] = useState(brand?.webhook_url ?? '')
  const [bb, setBb] = useState<typeof DEFAULT_BRANDBOOK>(brand?.brandbook_rules ?? { ...DEFAULT_BRANDBOOK })

  function updateBb(path: string[], value: unknown) {
    setBb(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      let obj: Record<string, unknown> = next
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]] as Record<string, unknown>
      obj[path[path.length - 1]] = value
      return next
    })
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const payload = { name, industry: industry || null, target_audience: targetAudience || null, brandbook_rules: bb, webhook_url: webhookUrl || null }
      if (brand?.id) { await supabase.from('brands').update(payload).eq('id', brand.id) }
      else { await supabase.from('brands').insert(payload) }
      router.push('/dashboard/brands'); router.refresh()
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{brand ? 'Editar cliente' : 'Nuevo cliente'}</h1>
        <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar
        </Button>
      </div>
      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">Datos básicos</TabsTrigger>
          <TabsTrigger value="brandbook">Brandbook</TabsTrigger>
          <TabsTrigger value="integration">Integración</TabsTrigger>
        </TabsList>
        <TabsContent value="basic" className="space-y-4 pt-4">
          <div><Label>Nombre del cliente *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Marca XYZ" className="mt-1" /></div>
          <div><Label>Rubro</Label><Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Ej: Gastronomía, Tecnología" className="mt-1" /></div>
          <div><Label>Audiencia objetivo</Label><Textarea value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="Describe quién es la audiencia de esta marca" className="mt-1" rows={3} /></div>
        </TabsContent>
        <TabsContent value="brandbook" className="space-y-6 pt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Tono de Voz</CardTitle><CardDescription>La IA aplicará esto estrictamente.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Tipo de voz</Label>
                <select value={bb.tone?.voice ?? 'profesional'} onChange={e => updateBb(['tone', 'voice'], e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
                  {['profesional','informal','técnico','cercano','inspiracional','humorístico'].map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>)}
                </select>
              </div>
              <div><Label>Pronombres</Label>
                <select value={bb.tone?.pronouns ?? 'vos'} onChange={e => updateBb(['tone', 'pronouns'], e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
                  <option value="vos">Vos (Argentina)</option><option value="tú">Tú (España/LATAM)</option><option value="usted">Usted (formal)</option>
                </select>
              </div>
              <ChipInput label="Ejemplos de copies BUENOS" values={bb.tone?.examples_good ?? []} onChange={v => updateBb(['tone','examples_good'],v)} placeholder="Pegá un copy que te gustó" />
              <ChipInput label="Ejemplos de copies MALOS" values={bb.tone?.examples_bad ?? []} onChange={v => updateBb(['tone','examples_bad'],v)} placeholder="Pegá un copy que NO querés" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Emojis</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="ea" checked={bb.emojis?.allowed ?? true} onChange={e => updateBb(['emojis','allowed'],e.target.checked)} className="w-4 h-4" />
                <Label htmlFor="ea">Permitir emojis en los copies</Label>
              </div>
              {bb.emojis?.allowed && <>
                <div><Label>Máximo por post</Label><Input type="number" min={0} max={10} value={bb.emojis?.max_per_post ?? 3} onChange={e => updateBb(['emojis','max_per_post'],parseInt(e.target.value))} className="mt-1 w-24" /></div>
                <ChipInput label="Emojis aprobados" values={bb.emojis?.approved_list ?? []} onChange={v => updateBb(['emojis','approved_list'],v)} placeholder="🚀" />
                <ChipInput label="Emojis prohibidos" values={bb.emojis?.banned_list ?? []} onChange={v => updateBb(['emojis','banned_list'],v)} placeholder="🔥" />
              </>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Hashtags</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <ChipInput label="Siempre incluir" values={bb.hashtags?.always_include ?? []} onChange={v => updateBb(['hashtags','always_include'],v)} placeholder="#NombreMarca" />
              <ChipInput label="Prohibidos" values={bb.hashtags?.banned ?? []} onChange={v => updateBb(['hashtags','banned'],v)} placeholder="#viral" />
              <div><Label>Máximo por post</Label><Input type="number" min={0} max={30} value={bb.hashtags?.max_count ?? 5} onChange={e => updateBb(['hashtags','max_count'],parseInt(e.target.value))} className="mt-1 w-24" /></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Reglas de Contenido</CardTitle><CardDescription>Cada regla será verificada individualmente por el Supervisor IA.</CardDescription></CardHeader>
            <CardContent>
              <ChipInput label="Reglas (una por entrada)" values={bb.content_rules ?? []} onChange={v => updateBb(['content_rules'],v)} placeholder='Ej: "Nunca mencionar precios sin aprobación"' />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="integration" className="space-y-4 pt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Webhook de Publicación</CardTitle>
              <CardDescription>URL de Zapier/Make. Payload al aprobar: {`{ image_url, final_copy, scheduled_date, client_name, platform, hashtags }`}</CardDescription>
            </CardHeader>
            <CardContent>
              <Label>URL del Webhook</Label>
              <Input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://hooks.zapier.com/hooks/catch/..." className="mt-1 font-mono text-sm" />
              {webhookUrl
                ? <p className="text-xs text-gray-500 mt-2">✅ Al presionar "Aprobar" en el inbox, se enviará un POST automático a esta URL.</p>
                : <p className="text-xs text-orange-500 mt-2">⚠️ Sin webhook, el post quedará como "Aprobado" pero no se programará automáticamente.</p>
              }
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
