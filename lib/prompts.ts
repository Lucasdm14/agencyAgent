import type { NewsItem, RSSItem, MetaAd, Agent } from './types'

// ─── Agent context block ──────────────────────────────────────────────────────

function agentBlock(agent: Agent | null | undefined): string {
  if (!agent) return ''
  return `
PERFIL DE AGENTE ACTIVO — orientá TODO el copy hacia este segmento:
  Nombre del agente: "${agent.name}"
  Segmento objetivo: ${agent.segment}
  Descripción: ${agent.description}
  Tono específico para este segmento: ${agent.tone_voice}, energía ${agent.energy}, formalidad ${agent.formality}
  Plataformas preferidas: ${agent.platform_focus.join(', ') || 'todas'}
  Prioridades de contenido: ${agent.content_priorities.join(', ') || 'ninguna definida'}
  Reglas extra de este agente: ${agent.extra_rules.length > 0 ? agent.extra_rules.join(' | ') : 'ninguna'}
IMPORTANTE: El brandbook define el ADN de la marca. El agente define a QUIÉN le hablás. Ambos se respetan simultáneamente.`
}

// ─── Creator Agent ────────────────────────────────────────────────────────────

export function creatorSystem(
  brandName: string,
  platform:  string,
  agent?:    Agent | null
) {
  const agentLine = agent
    ? ` Estás activando el agente "${agent.name}" — tu audiencia es: ${agent.segment}.`
    : ''
  return `Eres un experto copywriter de agencia. Tu único trabajo es crear el copy para un posteo de ${platform} para la marca "${brandName}".${agentLine}
Respeta TODAS las reglas del brandbook sin excepción.
REGLA ANTI-ALUCINACIÓN: Si se te proveen datos reales (noticias, posts de la industria, avisos de competidores), basate en ellos para dar relevancia al copy. NO inventes tendencias, estadísticas ni menciones externas que no estén en los datos provistos.
Respondé SOLO con JSON válido, sin texto adicional.`
}

export function creatorPrompt(
  brandbookJson: string,
  platform:      string,
  context:       { news: NewsItem[]; rss: RSSItem[]; competitor_ads: MetaAd[] },
  agent?:        Agent | null
) {
  const newsBlock = context.news.length > 0
    ? `\nNOTICIAS REALES DEL SECTOR (usá estas para dar relevancia, no inventés otras):\n` +
      context.news.slice(0, 4).map(n =>
        `- [${n.source}] "${n.title}" — ${n.description}`
      ).join('\n')
    : '\nNoticias del sector: sin datos disponibles.'

  const rssBlock = context.rss.length > 0
    ? `\nPUBLICACIONES RECIENTES DE LA INDUSTRIA:\n` +
      context.rss.slice(0, 4).map(r =>
        `- [${r.feed_name}] "${r.title}"`
      ).join('\n')
    : ''

  const adsBlock = context.competitor_ads.length > 0
    ? `\nAVISOS ACTIVOS DE COMPETIDORES (diferenciarse):\n` +
      context.competitor_ads.slice(0, 4).map(a =>
        `- ${a.page_name}: "${a.body_text?.slice(0, 120)}..."`
      ).join('\n')
    : ''

  return `BRANDBOOK (reglas estrictas):
${brandbookJson}
${agentBlock(agent)}
${newsBlock}${rssBlock}${adsBlock}

Analizá la imagen adjunta y generá 1 copy que:
1. Se relacione naturalmente con la imagen
2. Respete CADA regla del brandbook
3. Esté optimizado para ${platform}
4. Hable directamente al segmento del agente activo (si hay agente)
5. Sea relevante al contexto real del sector (si hay datos disponibles arriba)
6. Se diferencie de los mensajes de competidores (si los hay)

Respondé SOLO con este JSON:
{
  "generated_copy": "el copy completo",
  "hashtags": ["tag1", "tag2"],
  "visual_description": "qué ves en la imagen en 1-2 oraciones",
  "rationale": "por qué elegiste este enfoque, mencionando el agente si está activo"
}`
}

// ─── Supervisor Agent ─────────────────────────────────────────────────────────

export function supervisorSystem() {
  return `Eres un auditor de contenido de marketing. Tu trabajo EXCLUSIVO es verificar si un copy cumple las reglas del brandbook y el perfil del agente activo (si hay). Sé estricto. No generes contenido nuevo. Respondé SOLO con JSON válido.`
}

export function supervisorPrompt(
  brandbookJson: string,
  copy:          string,
  hashtags:      string[],
  agent?:        Agent | null
) {
  const agentSection = agent
    ? `\nPERFIL DE AGENTE A VALIDAR:\n  Segmento: ${agent.segment}\n  Tono esperado: ${agent.tone_voice}, ${agent.energy}, ${agent.formality}\n  Reglas extra: ${agent.extra_rules.join(' | ') || 'ninguna'}\n`
    : ''
  return `BRANDBOOK:
${brandbookJson}
${agentSection}
COPY A AUDITAR:
"""
${copy}
Hashtags: ${hashtags.join(' ')}
"""

Verificá CADA regla de: content_rules, emojis, hashtags, tone${agent ? ', y adecuación al segmento del agente' : ''}.

Respondé SOLO con este JSON:
{
  "score": <1-10>,
  "overall_approved": <true si score >= 7 y violaciones criticas <= 2>,
  "clause_validations": [
    { "rule": "...", "category": "tone|emojis|hashtags|content_rules|agent", "passed": true, "comment": null }
  ],
  "critical_violations": <número de passed:false>,
  "suggested_fix": "<corrección concisa o null>"
}`
}

// ─── Regenerate with instruction ──────────────────────────────────────────────

export function regeneratePrompt(
  originalCopy:  string,
  instruction:   string,
  brandbookJson: string,
  platform:      string,
  agent?:        Agent | null
) {
  return `BRANDBOOK:
${brandbookJson}
${agentBlock(agent)}
COPY ORIGINAL:
"""
${originalCopy}
"""

INSTRUCCIÓN DEL PM (aplicala estrictamente):
"${instruction}"

Reescribí el copy aplicando la instrucción del PM, manteniendo el brandbook${agent ? ` y orientando al segmento "${agent.segment}"` : ''} y optimizando para ${platform}.
IMPORTANTE: No alucines datos. Mantené referencias concretas del copy original.

Respondé SOLO con este JSON:
{
  "generated_copy": "el copy reescrito",
  "hashtags": ["tag1", "tag2"],
  "rationale": "qué cambios hiciste y por qué"
}`
}

// ─── Competitor Analysis ──────────────────────────────────────────────────────

export function competitorAnalysisSystem() {
  return `Eres un analista de inteligencia competitiva para agencias de marketing.
Tu trabajo es analizar EXCLUSIVAMENTE los datos reales que se te proveen.
REGLA ABSOLUTA: No inventes datos, estadísticas ni afirmaciones que no estén en los datos provistos.
Si los datos son insuficientes para una conclusión, decilo explícitamente.
Respondé SOLO con JSON válido.`
}

export function competitorAnalysisPrompt(
  competitorName: string,
  brandName:      string,
  realData: {
    meta_ads:        MetaAd[]
    youtube_videos:  { title: string; description: string; view_count: string }[]
    news:            NewsItem[]
    rss:             RSSItem[]
  }
) {
  const adsSection = realData.meta_ads.length > 0
    ? `AVISOS ACTIVOS EN META (${realData.meta_ads.length} avisos):\n` +
      realData.meta_ads.map(a =>
        `- Plataforma: ${a.platforms?.join(',')} | Mensaje: "${a.body_text?.slice(0, 150)}"`
      ).join('\n')
    : `AVISOS EN META: Sin avisos activos encontrados.`

  const ytSection = realData.youtube_videos.length > 0
    ? `\nYOUTUBE (${realData.youtube_videos.length} videos):\n` +
      realData.youtube_videos.map(v =>
        `- "${v.title}" | ${v.view_count} vistas | ${v.description?.slice(0, 80)}`
      ).join('\n')
    : `\nYOUTUBE: Sin datos de canal.`

  const newsSection = realData.news.length > 0
    ? `\nNOTICIAS (${realData.news.length} artículos):\n` +
      realData.news.map(n =>
        `- [${n.source}] "${n.title}" — ${n.description?.slice(0, 100)}`
      ).join('\n')
    : `\nNOTICIAS: Sin noticias recientes.`

  return `Analizá la estrategia de comunicación de "${competitorName}" para el cliente "${brandName}".

DATOS REALES (analizá SOLO esto):
${adsSection}
${ytSection}
${newsSection}

Respondé SOLO con este JSON:
{
  "active_ads_count": <número exacto>,
  "main_messages": ["mensaje detectado"],
  "content_themes": ["tema de youtube/rss"],
  "posting_cadence": "descripción basada en timestamps o 'sin datos suficientes'",
  "differentiation_opportunities": ["oportunidad para ${brandName}"],
  "topics_to_avoid": ["tema que el competidor ya saturó"],
  "recommended_angles": ["ángulo que el competidor no usa"],
  "confidence": "high|medium|low",
  "data_sources_used": ["Meta Ads", "YouTube", "Noticias"],
  "disclaimer": "qué datos faltaron"
}`
}

// ─── Metrics Analysis ────────────────────────────────────────────────────────

export function metricsSystem() {
  return `Eres un analista de performance de marketing digital.
Tu trabajo es interpretar datos reales de métricas y extraer insights accionables.
REGLA: Solo analizás los números que se te dan. No inventes benchmarks.
Respondé SOLO con JSON válido.`
}

export function metricsPrompt(parsedCsvData: string, platform: string, brandName: string) {
  return `DATOS REALES DE ${platform.toUpperCase()} para "${brandName}":
${parsedCsvData}

Analizá estos datos y respondé con este JSON:
{
  "best_performing_posts": [
    { "copy_preview": "primeras 50 chars", "metric": "nombre de la métrica", "value": 0 }
  ],
  "worst_performing_posts": [
    { "copy_preview": "...", "metric": "...", "value": 0 }
  ],
  "avg_engagement_rate": <número o null>,
  "best_day_of_week": "día o 'sin datos de fecha'",
  "best_time_of_day": "hora o 'sin datos de hora'",
  "top_content_themes": ["tema inferido de los datos"],
  "recommendations": ["recomendación específica"],
  "data_quality": "complete|partial|minimal",
  "columns_found": ["columnas del CSV"]
}`
}

// ─── Strategy Generator ──────────────────────────────────────────────────────

export function strategySystem(brandName: string, agent?: Agent | null) {
  const agentLine = agent
    ? ` Estás generando el plan para el agente "${agent.name}" (${agent.segment}).`
    : ''
  return `Eres un estratega de contenido para agencias de marketing.
Creás planes de contenido basados en datos reales del mercado.${agentLine}
REGLA ANTI-ALUCINACIÓN: Cada tema propuesto DEBE estar justificado por un dato real de los datos provistos. Si un tema no tiene justificación real, no lo incluyas.
Respondé SOLO con JSON válido.`
}

export function strategyPrompt(
  brandName:     string,
  brandbookJson: string,
  period:        string,
  daysInMonth:   number,
  realData: {
    news:            NewsItem[]
    rss:             RSSItem[]
    competitor_ads:  MetaAd[]
    best_days?:      string
  },
  agent?: Agent | null
) {
  const newsBlock = realData.news.length > 0
    ? `NOTICIAS DEL SECTOR (${realData.news.length}):\n` +
      realData.news.map(n => `- "${n.title}" [${n.source}]`).join('\n')
    : 'Noticias: sin datos.'

  const rssBlock = realData.rss.length > 0
    ? `\nTENDENCIAS (${realData.rss.length} posts):\n` +
      realData.rss.map(r => `- "${r.title}" [${r.feed_name}]`).join('\n')
    : ''

  const adsBlock = realData.competitor_ads.length > 0
    ? `\nMENSAJES DE COMPETIDORES (evitar saturar):\n` +
      realData.competitor_ads.slice(0, 6).map(a =>
        `- ${a.page_name}: "${a.body_text?.slice(0, 100)}"`
      ).join('\n')
    : ''

  const metricsBlock = realData.best_days
    ? `\nMEJOR RENDIMIENTO HISTÓRICO: ${realData.best_days}`
    : ''

  return `BRANDBOOK de "${brandName}":
${brandbookJson}
${agentBlock(agent)}

DATOS REALES DEL MERCADO (justificá cada post con uno de estos):
${newsBlock}${rssBlock}${adsBlock}${metricsBlock}

Creá un plan de contenido para ${period} con exactamente 12 posts distribuidos en los ${daysInMonth} días.${agent ? `\nEl plan debe orientarse al segmento del agente activo: ${agent.segment}. Preferencia de plataformas: ${agent.platform_focus.join(', ') || 'todas'}. Prioridades: ${agent.content_priorities.join(', ') || 'generales'}.` : ''}
Cada post DEBE tener un source_reference que cite uno de los datos reales provistos.

Respondé SOLO con este JSON:
{
  "pillars": ["pilar de contenido basado en datos"],
  "posts": [
    {
      "day": 3,
      "platform": "instagram",
      "content_type": "informativo|producto|comunidad|educativo|tendencia",
      "topic": "tema específico",
      "hook_suggestion": "primera oración sugerida",
      "source_reference": "noticia o dato real que justifica este tema"
    }
  ],
  "disclaimer": "qué datos estaban disponibles y cuáles no"
}`
}
