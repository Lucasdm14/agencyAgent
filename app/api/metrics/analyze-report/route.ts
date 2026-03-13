import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText, Output } from 'ai'
import { z } from 'zod'

export async function POST(req: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { reportId, fileUrl, brandId } = await req.json()

    if (!fileUrl) {
      return NextResponse.json({ error: 'URL del archivo requerida' }, { status: 400 })
    }

    // Fetch the CSV/Excel file content
    const fileResponse = await fetch(fileUrl)
    if (!fileResponse.ok) {
      return NextResponse.json({ error: 'No se pudo descargar el archivo' }, { status: 400 })
    }

    const fileContent = await fileResponse.text()
    
    // Parse CSV content to extract metrics
    const lines = fileContent.split('\n').filter(line => line.trim())
    const headers = lines[0]?.split(',').map(h => h.trim().toLowerCase()) || []
    const dataRows = lines.slice(1)
    
    // Build a summary of the data
    let dataSummary = `Archivo con ${dataRows.length} filas de datos.\n`
    dataSummary += `Columnas: ${headers.join(', ')}\n\n`
    dataSummary += `Primeras 20 filas de datos:\n`
    dataSummary += lines.slice(0, 21).join('\n')

    // Get brand info for context
    let brandContext = ''
    if (brandId) {
      const { data: brand } = await supabase
        .from('brands')
        .select('name, industry, target_audience, brand_voice')
        .eq('id', brandId)
        .single()
      
      if (brand) {
        brandContext = `\nContexto de la marca: ${brand.name}
        - Industria: ${brand.industry || 'No especificada'}
        - Audiencia objetivo: ${brand.target_audience || 'No especificada'}
        - Voz de marca: ${brand.brand_voice || 'No especificada'}`
      }
    }

    // Generate AI analysis
    const { output } = await generateText({
      model: 'openai/gpt-4o-mini',
      output: Output.object({
        schema: z.object({
          resumen_ejecutivo: z.string().describe('Resumen general del rendimiento en 2-3 oraciones'),
          metricas_clave: z.array(z.object({
            nombre: z.string(),
            valor: z.string(),
            tendencia: z.string().describe('positiva, negativa, o neutral'),
            interpretacion: z.string(),
          })).describe('Las metricas mas importantes encontradas'),
          fortalezas: z.array(z.string()).describe('Aspectos positivos del rendimiento'),
          areas_mejora: z.array(z.string()).describe('Areas que necesitan atencion'),
          recomendaciones: z.array(z.object({
            titulo: z.string(),
            descripcion: z.string(),
            prioridad: z.string().describe('alta, media, o baja'),
            impacto_esperado: z.string(),
          })).describe('Recomendaciones accionables'),
          proximos_pasos: z.array(z.string()).describe('Acciones inmediatas a tomar'),
          benchmark: z.object({
            engagement_rate_promedio: z.string().nullable(),
            comparacion_industria: z.string().nullable(),
          }).describe('Comparacion con estandares de la industria'),
        }),
      }),
      prompt: `Eres un analista experto en marketing digital y redes sociales. Analiza el siguiente reporte de metricas y proporciona insights accionables.
${brandContext}

DATOS DEL REPORTE:
${dataSummary}

Analiza estos datos y proporciona:
1. Un resumen ejecutivo del rendimiento
2. Las metricas clave identificadas con su interpretacion
3. Fortalezas del rendimiento actual
4. Areas que necesitan mejora
5. Recomendaciones especificas y accionables
6. Proximos pasos inmediatos
7. Comparacion con benchmarks de la industria (si es posible inferirlos)

IMPORTANTE: 
- Se especifico y usa los datos reales del reporte
- Las recomendaciones deben ser practicas y aplicables
- Considera el contexto de la marca si esta disponible
- Responde en espanol`,
    })

    // Transform output to frontend format
    const formattedAnalysis = output ? {
      summary: output.resumen_ejecutivo,
      key_metrics: output.metricas_clave?.reduce((acc: Record<string, string>, m: any) => {
        acc[m.nombre] = m.valor
        return acc
      }, {}),
      performance: output.benchmark?.comparacion_industria || 'Analisis de rendimiento completado',
      strengths: output.fortalezas,
      weaknesses: output.areas_mejora,
      recommendations: output.recomendaciones?.map((r: any) => ({
        title: r.titulo,
        description: r.descripcion,
        priority: r.prioridad === 'alta' ? 'alta' : r.prioridad === 'media' ? 'media' : 'baja',
      })),
      action_items: output.proximos_pasos,
      trends: output.metricas_clave?.filter((m: any) => m.tendencia === 'positiva').map((m: any) => m.nombre) || [],
    } : null

    // Save analysis to database
    if (reportId && formattedAnalysis) {
      await supabase
        .from('uploaded_reports')
        .update({
          analysis: formattedAnalysis,
          analyzed_at: new Date().toISOString(),
        })
        .eq('id', reportId)
    }

    // Also try to extract and save metrics from the CSV
    const extractedMetrics = extractMetricsFromCSV(headers, dataRows, brandId)
    if (extractedMetrics.length > 0) {
      await supabase
        .from('metrics')
        .insert(extractedMetrics.map(m => ({
          ...m,
          source: 'csv_upload',
        })))
    }

    return NextResponse.json({
      success: true,
      analysis: formattedAnalysis,
      metricsExtracted: extractedMetrics.length,
    })

  } catch (error) {
    console.error('Error analyzing report:', error)
    return NextResponse.json(
      { error: 'Error al analizar el reporte', details: String(error) },
      { status: 500 }
    )
  }
}

function extractMetricsFromCSV(headers: string[], dataRows: string[], brandId: string) {
  const metrics: any[] = []
  
  // Common column name mappings
  const columnMappings: Record<string, string[]> = {
    impressions: ['impressions', 'impresiones', 'views', 'vistas', 'alcance_impresiones'],
    reach: ['reach', 'alcance', 'unique_views', 'usuarios_alcanzados'],
    engagement: ['engagement', 'interacciones', 'interactions', 'likes_comments_shares'],
    clicks: ['clicks', 'clics', 'link_clicks', 'clicks_enlace'],
    likes: ['likes', 'me_gusta', 'reactions', 'reacciones'],
    comments: ['comments', 'comentarios'],
    shares: ['shares', 'compartidos', 'compartir'],
    date: ['date', 'fecha', 'day', 'dia', 'periodo'],
    platform: ['platform', 'plataforma', 'red_social', 'network'],
  }

  // Find column indices
  const findColumnIndex = (names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex(h => h.includes(name))
      if (idx !== -1) return idx
    }
    return -1
  }

  const indices = {
    impressions: findColumnIndex(columnMappings.impressions),
    reach: findColumnIndex(columnMappings.reach),
    engagement: findColumnIndex(columnMappings.engagement),
    clicks: findColumnIndex(columnMappings.clicks),
    date: findColumnIndex(columnMappings.date),
    platform: findColumnIndex(columnMappings.platform),
  }

  // If we can't find any metric columns, return empty
  if (indices.impressions === -1 && indices.reach === -1 && indices.engagement === -1) {
    return []
  }

  // Parse each row
  for (const row of dataRows) {
    const values = row.split(',').map(v => v.trim())
    
    const metric = {
      brand_id: brandId,
      platform: indices.platform !== -1 ? values[indices.platform] || 'unknown' : 'unknown',
      date: indices.date !== -1 ? parseDate(values[indices.date]) : new Date().toISOString().split('T')[0],
      impressions: indices.impressions !== -1 ? parseInt(values[indices.impressions]) || 0 : 0,
      reach: indices.reach !== -1 ? parseInt(values[indices.reach]) || 0 : 0,
      engagement: indices.engagement !== -1 ? parseInt(values[indices.engagement]) || 0 : 0,
      clicks: indices.clicks !== -1 ? parseInt(values[indices.clicks]) || 0 : 0,
      conversions: 0,
      spend: 0,
    }

    // Only add if we have at least some data
    if (metric.impressions > 0 || metric.reach > 0 || metric.engagement > 0) {
      metrics.push(metric)
    }
  }

  return metrics
}

function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0]
  
  // Try various date formats
  const date = new Date(dateStr)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }
  
  // Try DD/MM/YYYY format
  const parts = dateStr.split(/[\/\-]/)
  if (parts.length === 3) {
    const [d, m, y] = parts
    const parsed = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0]
    }
  }
  
  return new Date().toISOString().split('T')[0]
}
