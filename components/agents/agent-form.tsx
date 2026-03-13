'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Loader2, ArrowLeft, Sparkles, Shield, Target } from 'lucide-react'
import Link from 'next/link'
import type { Agent, AgentType } from '@/lib/types'

interface AgentFormProps {
  agent?: Agent
  brands: { id: string; name: string }[]
}

const defaultCreatorPrompt = `Eres un copywriter creativo experto en marketing digital. Tu trabajo es crear contenido atractivo y efectivo.

RESPONSABILIDADES:
- Generar copies creativos y originales
- Adaptar el tono segun la marca
- Incluir CTAs efectivos
- Optimizar para cada plataforma
- Usar palabras clave de forma natural

ESTILO:
- Claro y conciso
- Emotivo cuando sea apropiado
- Enfocado en beneficios
- Con personalidad de marca`

const defaultSupervisorPrompt = `Eres un supervisor de contenido con amplia experiencia en marketing y comunicacion. Tu rol es revisar y validar el contenido generado. Tienes TODA la informacion de la marca y eres el guardian de su identidad.

CRITERIOS DE EVALUACION:
1. Alineacion con el tono de voz de la marca
2. Claridad y coherencia del mensaje
3. Efectividad del CTA
4. Uso apropiado de palabras clave
5. Optimizacion para la plataforma
6. Originalidad y creatividad
7. Correccion gramatical

ESCALA DE PUNTUACION (1-10):
- 1-3: Rechazado
- 4-5: Necesita cambios significativos
- 6-7: Aceptable con mejoras menores
- 8-9: Bueno, listo para cliente
- 10: Excelente`

const defaultStrategistPrompt = `Eres un estratega de contenido senior especializado en planificacion y distribucion de contenido digital. Tu rol es tomar el contenido aprobado y crear estrategias completas.

RESPONSABILIDADES:
1. Analizar el contenido aprobado
2. Definir la mejor estrategia de publicacion
3. Crear un calendario de contenido optimizado
4. Sugerir horarios ideales de publicacion
5. Definir la secuencia logica del contenido
6. Identificar oportunidades de repurposing
7. Proponer variaciones para diferentes plataformas

ENTREGABLES:
- Plan de contenido semanal/mensual
- Justificacion estrategica de cada pieza
- Metricas objetivo por publicacion
- Sugerencias de hashtags y menciones
- Recomendaciones de formato por plataforma`

export function AgentForm({ agent, brands }: AgentFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const isEditing = !!agent

  const [formData, setFormData] = useState({
    name: agent?.name || '',
    brand_id: agent?.brand_id || '',
    type: (agent?.type || 'creator') as AgentType,
    system_prompt: agent?.system_prompt || defaultCreatorPrompt,
    model: agent?.model || 'gpt-4o-mini',
    temperature: agent?.temperature || 0.7,
    is_active: agent?.is_active ?? true,
  })

  function handleTypeChange(type: AgentType) {
    const prompts = {
      creator: defaultCreatorPrompt,
      supervisor: defaultSupervisorPrompt,
      strategist: defaultStrategistPrompt,
    }
    setFormData(prev => ({
      ...prev,
      type,
      system_prompt: prompts[type],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const agentData = {
      name: formData.name,
      brand_id: formData.brand_id,
      type: formData.type,
      system_prompt: formData.system_prompt,
      model: formData.model,
      temperature: formData.temperature,
      is_active: formData.is_active,
    }

    if (isEditing) {
      const { error } = await supabase
        .from('agents')
        .update(agentData)
        .eq('id', agent.id)

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
    } else {
      const { error } = await supabase
        .from('agents')
        .insert(agentData)

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
    }

    router.push('/dashboard/agents')
    router.refresh()
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">Nombre del agente *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Agente Creativo Nike"
                required
                className="bg-input border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand" className="text-foreground">Marca *</Label>
              <Select 
                value={formData.brand_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, brand_id: value }))}
              >
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue placeholder="Selecciona una marca" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Tipo de agente *</Label>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => handleTypeChange('creator')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.type === 'creator'
                    ? 'border-chart-2 bg-chart-2/10'
                    : 'border-border hover:border-chart-2/50'
                }`}
              >
                <Sparkles className={`h-8 w-8 mx-auto mb-2 ${
                  formData.type === 'creator' ? 'text-chart-2' : 'text-muted-foreground'
                }`} />
                <p className={`font-medium ${
                  formData.type === 'creator' ? 'text-chart-2' : 'text-foreground'
                }`}>Creador</p>
                <p className="text-xs text-muted-foreground mt-1">Genera contenido</p>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('supervisor')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.type === 'supervisor'
                    ? 'border-chart-1 bg-chart-1/10'
                    : 'border-border hover:border-chart-1/50'
                }`}
              >
                <Shield className={`h-8 w-8 mx-auto mb-2 ${
                  formData.type === 'supervisor' ? 'text-chart-1' : 'text-muted-foreground'
                }`} />
                <p className={`font-medium ${
                  formData.type === 'supervisor' ? 'text-chart-1' : 'text-foreground'
                }`}>Supervisor</p>
                <p className="text-xs text-muted-foreground mt-1">Valida contenido</p>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('strategist')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.type === 'strategist'
                    ? 'border-chart-4 bg-chart-4/10'
                    : 'border-border hover:border-chart-4/50'
                }`}
              >
                <Target className={`h-8 w-8 mx-auto mb-2 ${
                  formData.type === 'strategist' ? 'text-chart-4' : 'text-muted-foreground'
                }`} />
                <p className={`font-medium ${
                  formData.type === 'strategist' ? 'text-chart-4' : 'text-foreground'
                }`}>Estratega</p>
                <p className="text-xs text-muted-foreground mt-1">Planifica estrategia</p>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="system_prompt" className="text-foreground">Prompt del sistema *</Label>
            <Textarea
              id="system_prompt"
              value={formData.system_prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
              placeholder="Instrucciones para el agente..."
              rows={10}
              required
              className="bg-input border-border text-foreground resize-none font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Define el comportamiento y personalidad del agente
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="model" className="text-foreground">Modelo</Label>
              <Select 
                value={formData.model} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
              >
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini (Rapido)</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o (Avanzado)</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-foreground">Temperatura: {formData.temperature}</Label>
              </div>
              <Slider
                value={[formData.temperature]}
                onValueChange={([value]) => setFormData(prev => ({ ...prev, temperature: value }))}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Menor = mas preciso, Mayor = mas creativo
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border">
            <div>
              <Label className="text-foreground">Agente activo</Label>
              <p className="text-xs text-muted-foreground">El agente estara disponible para usar</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
          </div>

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-4 pt-4">
            <Link href="/dashboard/agents">
              <Button type="button" variant="outline" className="border-border text-foreground hover:bg-secondary">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </Link>
            <Button 
              type="submit" 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading || !formData.brand_id}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Guardando...' : 'Creando...'}
                </>
              ) : (
                isEditing ? 'Guardar cambios' : 'Crear agente'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
