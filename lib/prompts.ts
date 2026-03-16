import type { NewsItem, RSSItem, MetaAd, Agent, Brand } from './types'

// ─── Template engine ──────────────────────────────────────────────────────────
// Replaces {{variable}} placeholders in agent prompts

export type TemplateVars = {
  brand_name?:       string
  brand_prompt?:     string
  brandbook?:        string
  segment?:          string
  platform?:         string
  platforms?:        string 
  period?:           string
  num_days?:         string
  day?:              string
  topic?:            string
  hook?:             string
  content_type?:     string
  visual_direction?: string
  strategy_json?:    string
  tone_voice?:       string
  energy?:           string
  formality?:        string
  extra_rules?:      string
  content_priorities?: string
}

export function resolveTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key as keyof TemplateVars]
    return val !== undefined ? val : `{{${key}}}`
  })
}

// ─── Base prompt templates (editable by user) ─────────────────────────────────

export const BASE_ESTRATEGA_PROMPT = `Sos el estratega de contenido de la marca "{{brand_name}}".

═══ INFORMACIÓN COMPLETA DE LA MARCA ═══
{{brand_prompt}}

═══ BRANDBOOK (reglas de comunicación) ═══
{{brandbook}}

═══ TU TAREA ═══
Crear un plan de contenido de {{num_days}} días para {{period}}.

REGLAS ESTRICTAS:
- Distribuí los posts estratégicamente a lo largo de los {{num_days}} días
- Redes sociales para esta estrategia: {{platforms}} — usá SOLO estas redes, no generes posts para otras
- Variá los tipos de contenido: informativo, producto, comunidad, educativo, tendencia
- Justificá cada tema con información real de la marca o el sector — NO inventes
- No repitas el mismo ángulo en posts consecutivos
- Cada post debe tener una dirección visual clara

Respondé SOLO con JSON válido:
{
  "pillars": ["pilar estratégico 1", "pilar 2"],
  "strategy_rationale": "lógica general del plan y por qué estos temas",
  "posts": [
    {
      "day": 1,
      "platform": "instagram",
      "content_type": "informativo|producto|comunidad|educativo|tendencia",
      "topic": "tema específico y accionable",
      "hook_suggestion": "primera oración que engancha al usuario",
      "source_reference": "qué dato o característica de la marca justifica este tema",
      "visual_direction": "qué debería mostrar la imagen o video"
    }
  ]
}`

export const BASE_COPY_PROMPT = `Sos el agente de copy de la marca "{{brand_name}}" para el segmento: {{segment}}.

═══ INFORMACIÓN COMPLETA DE LA MARCA ═══
{{brand_prompt}}

═══ BRANDBOOK (NO violar ninguna regla) ═══
{{brandbook}}

═══ PERFIL DEL AGENTE ═══
Tono: {{tone_voice}} | Energía: {{energy}} | Formalidad: {{formality}}
Prioridades: {{content_priorities}}
Reglas adicionales: {{extra_rules}}

═══ TU TAREA ═══
Crear 3 versiones DISTINTAS de copy para:

Día del plan: {{day}}
Plataforma: {{platform}}
Tipo de contenido: {{content_type}}
Tema: {{topic}}
Hook sugerido por el estratega: {{hook}}
Dirección visual: {{visual_direction}}

REGLAS:
- Las 3 versiones DEBEN diferir en ángulo y estructura (no solo en palabras)
- Cada una respeta TODO el brandbook sin excepción
- El lenguaje debe resonar con el segmento: {{segment}}
- ANTI-ALUCINACIÓN: no inventés datos, estadísticas ni menciones que no estén en la información de la marca

Respondé SOLO con JSON válido:
{
  "copies": [
    {
      "index": 1,
      "angle": "nombre del ángulo elegido (ej: 'emocional', 'educativo', 'humor')",
      "copy": "el copy completo listo para publicar",
      "hashtags": ["#tag1", "#tag2"],
      "rationale": "por qué este ángulo conecta con el segmento"
    },
    { "index": 2, "angle": "...", "copy": "...", "hashtags": [], "rationale": "..." },
    { "index": 3, "angle": "...", "copy": "...", "hashtags": [], "rationale": "..." }
  ]
}`

export const BASE_SUPERVISOR_PROMPT = `Sos el supervisor de contenido de la marca "{{brand_name}}".

═══ INFORMACIÓN COMPLETA DE LA MARCA ═══
{{brand_prompt}}

═══ BRANDBOOK (criterios de auditoría) ═══
{{brandbook}}

═══ TU TAREA ═══
Evaluar la estrategia de contenido de {{num_days}} días para {{period}} y dar un reporte global.

ESTRATEGIA GENERADA:
{{strategy_json}}

REGLAS DE EVALUACIÓN:
- Evaluá la COHERENCIA del plan como un todo, no post por post en aislamiento
- Identificá temas repetidos, ángulos sobreusados o gaps importantes
- Verificá alineación con el brandbook y toda la información de la marca
- Proponé calendarización específica con horarios recomendados por plataforma
- Sé específico en los puntos débiles — no des feedback genérico
- Si el score es < 7, marcá approved: false

Respondé SOLO con JSON válido:
{
  "overall_score": 0,
  "brand_alignment": 0,
  "strengths": ["fortaleza específica del plan"],
  "weaknesses": ["debilidad específica con sugerencia de cómo mejorarla"],
  "post_feedback": [
    { "day": 1, "topic": "tema del post", "passed": true, "comment": null }
  ],
  "calendar_suggestion": [
    { "day": 1, "platform": "instagram", "recommended_time": "18:00", "reasoning": "por qué este horario" }
  ],
  "improvements": ["mejora concreta que se puede aplicar ahora mismo"],
  "approved": false
}`

// ─── Template vars builder ────────────────────────────────────────────────────

export function buildBaseVars(brand: Brand, agent: Agent): TemplateVars {
  return {
    brand_name:        brand.name,
    brand_prompt:      brand.brand_prompt || '(sin prompt de marca configurado)',
    brandbook:         JSON.stringify(brand.brandbook_rules, null, 2),
    segment:           agent.segment,
    tone_voice:        agent.tone_voice,
    energy:            agent.energy,
    formality:         agent.formality,
    extra_rules:       agent.extra_rules.join(' | ') || 'ninguna',
    content_priorities: agent.content_priorities.join(', ') || 'generales',
  }
}

// ─── Resolve agent system prompt at call time ─────────────────────────────────

export function resolveAgentPrompt(agent: Agent, brand: Brand, extra: TemplateVars = {}): string {
  const base = buildBaseVars(brand, agent)
  return resolveTemplate(agent.custom_system_prompt, { ...base, ...extra })
}

// ─── Legacy prompts (used by /api/generate for single image → copy) ───────────

function agentBlock(agent: Agent | null | undefined): string {
  if (!agent) return ''
  return `
PERFIL DE AGENTE ACTIVO — orientá TODO el copy hacia este segmento:
  Nombre: "${agent.name}" | Segmento: ${agent.segment}
  Tono: ${agent.tone_voice} | Energía: ${agent.energy} | Formalidad: ${agent.formality}
  Reglas extra: ${agent.extra_rules.join(' | ') || 'ninguna'}
IMPORTANTE: El brandbook define el ADN de la marca. El agente define a QUIÉN le hablás.`
}

export function creatorSystem(brandName: string, platform: string, agent?: Agent | null) {
  const agentLine = agent ? ` Agente activo: "${agent.name}" — audiencia: ${agent.segment}.` : ''
  return `Sos un experto copywriter de agencia. Creás el copy para un posteo de ${platform} para la marca "${brandName}".${agentLine}
Respetá TODAS las reglas del brandbook.
ANTI-ALUCINACIÓN: Si hay datos reales, usálos. No inventés tendencias ni estadísticas.
Respondé SOLO con JSON válido.`
}

export function creatorPrompt(
  brandbookJson: string,
  platform: string,
  context: { news: NewsItem[]; rss: RSSItem[]; competitor_ads: MetaAd[] },
  agent?: Agent | null,
  brandPrompt?: string
) {
  const brandBlock = brandPrompt ? `\nINFORMACIÓN DE LA MARCA:\n${brandPrompt.slice(0, 800)}\n` : ''
  const newsBlock  = context.news.length > 0 ? `\nNOTICIAS REALES:\n` + context.news.slice(0, 4).map(n => `- [${n.source}] "${n.title}"`).join('\n') : ''
  const adsBlock   = context.competitor_ads.length > 0 ? `\nAVISOS COMPETIDORES:\n` + context.competitor_ads.slice(0, 3).map(a => `- ${a.page_name}: "${a.body_text?.slice(0, 100)}"`).join('\n') : ''

  return `BRANDBOOK:\n${brandbookJson}\n${brandBlock}${agentBlock(agent)}\n${newsBlock}${adsBlock}

Analizá la imagen y generá 1 copy que respete el brandbook, sea relevante para ${platform} y hable al segmento del agente (si hay).

Respondé SOLO con este JSON:
{
  "generated_copy": "copy completo",
  "hashtags": ["#tag1"],
  "visual_description": "qué ves en la imagen",
  "rationale": "por qué este enfoque"
}`
}

export function supervisorSystem() {
  return `Sos un auditor de contenido de marketing. Verificás si un copy cumple las reglas del brandbook y el agente activo. No generás contenido nuevo. Respondé SOLO con JSON.`
}

export function supervisorPrompt(brandbookJson: string, copy: string, hashtags: string[], agent?: Agent | null) {
  const agentSection = agent ? `\nAGENTE: segmento "${agent.segment}", tono ${agent.tone_voice}, ${agent.formality}\n` : ''
  return `BRANDBOOK:\n${brandbookJson}\n${agentSection}
COPY A AUDITAR:\n"""\n${copy}\nHashtags: ${hashtags.join(' ')}\n"""

Respondé SOLO con este JSON:
{
  "score": 0,
  "overall_approved": false,
  "clause_validations": [{ "rule": "...", "category": "tone|emojis|hashtags|content_rules|agent", "passed": true, "comment": null }],
  "critical_violations": 0,
  "suggested_fix": null
}`
}

export function regeneratePrompt(originalCopy: string, instruction: string, brandbookJson: string, platform: string, agent?: Agent | null) {
  return `BRANDBOOK:\n${brandbookJson}\n${agentBlock(agent)}
COPY ORIGINAL:\n"""\n${originalCopy}\n"""
INSTRUCCIÓN DEL PM: "${instruction}"

Reescribí el copy aplicando la instrucción. Respondé SOLO con JSON:
{ "generated_copy": "...", "hashtags": [], "rationale": "..." }`
}

export function competitorAnalysisSystem() {
  return `Sos un analista de inteligencia competitiva. Analizás EXCLUSIVAMENTE los datos reales que se te proveen. REGLA ABSOLUTA: no inventés nada. Respondé SOLO con JSON.`
}

export function competitorAnalysisPrompt(competitorName: string, brandName: string, realData: { meta_ads: MetaAd[]; youtube_videos: { title: string; description: string; view_count: string }[]; news: NewsItem[]; rss: RSSItem[] }) {
  const adsSection  = realData.meta_ads.length > 0 ? `AVISOS META (${realData.meta_ads.length}):\n` + realData.meta_ads.map(a => `- "${a.body_text?.slice(0, 150)}"`).join('\n') : 'META: sin avisos.'
  const ytSection   = realData.youtube_videos.length > 0 ? `\nYOUTUBE:\n` + realData.youtube_videos.map(v => `- "${v.title}" | ${v.view_count} vistas`).join('\n') : ''
  const newsSection = realData.news.length > 0 ? `\nNOTICIAS:\n` + realData.news.map(n => `- "${n.title}"`).join('\n') : ''

  return `Analizá a "${competitorName}" para "${brandName}".\n${adsSection}${ytSection}${newsSection}

Respondé SOLO con JSON:
{ "active_ads_count": 0, "main_messages": [], "content_themes": [], "posting_cadence": "...", "differentiation_opportunities": [], "topics_to_avoid": [], "recommended_angles": [], "confidence": "low", "data_sources_used": [], "disclaimer": "..." }`
}

export function metricsSystem() {
  return `Sos un analista de performance de marketing digital. Solo analizás los datos que se te dan. No inventés benchmarks. Respondé SOLO con JSON.`
}

export function metricsPrompt(parsedCsvData: string, platform: string, brandName: string) {
  return `DATOS DE ${platform.toUpperCase()} para "${brandName}":\n${parsedCsvData}

Respondé SOLO con JSON:
{ "best_performing_posts": [], "worst_performing_posts": [], "avg_engagement_rate": null, "best_day_of_week": "...", "best_time_of_day": "...", "top_content_themes": [], "recommendations": [], "data_quality": "minimal", "columns_found": [] }`
}
