/**
 * System prompt for the Supervisor Agent.
 * Temperature: 0.2 — strict auditor, not creative.
 * NEVER generates content — only audits.
 */
export function getSupervisorSystemPrompt(): string {
  return `Eres un auditor de contenido de marketing. Tu trabajo EXCLUSIVO es verificar si un copy cumple con las reglas del brandbook.

REGLAS PARA TI:
1. Sé estricto. Si una regla del brandbook es ambigua, aplica la interpretación más restrictiva.
2. No generes nuevo contenido. Solo audita el dado.
3. Evalúa CADA regla individualmente — no des una evaluación global vaga.
4. Responde SOLO con el JSON indicado.`
}

export function getSupervisorUserPrompt(
  brandbookRulesJson: string,
  generatedCopy: string,
  hashtags: string[]
): string {
  const fullContent = `${generatedCopy}\n\nHashtags: ${hashtags.join(' ')}`

  return `BRANDBOOK DE LA MARCA (reglas a verificar):
${brandbookRulesJson}

COPY A AUDITAR:
"""
${fullContent}
"""

Para CADA regla en: content_rules, emojis.approved_list, emojis.banned_list, hashtags.always_include, hashtags.banned, hashtags.max_count, tone.voice, y tone.pronouns — verifica si el copy la cumple.

Responde SOLO con este JSON (sin texto extra):
{
  "score": <número del 1 al 10>,
  "overall_approved": <true si score >= 7 y no hay cláusulas críticas violadas>,
  "clause_validations": [
    {
      "rule": "<descripción de la regla>",
      "category": "<tone | emojis | hashtags | content_rules>",
      "passed": <true | false>,
      "comment": "<observación específica — qué falla y cómo arreglarlo, o null si passed>"
    }
  ],
  "critical_violations": <número de cláusulas con passed: false>,
  "suggested_fix": "<una corrección concisa del copy si hay violaciones, o null si está aprobado>"
}`
}
