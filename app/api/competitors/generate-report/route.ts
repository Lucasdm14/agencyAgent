import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { competitorId, reportType = 'complete' } = await request.json()

    if (!competitorId) {
      return NextResponse.json({ error: 'Falta el ID del competidor' }, { status: 400 })
    }

    // Get competitor data
    const { data: competitor } = await supabase
      .from('competitors')
      .select('*')
      .eq('id', competitorId)
      .single()

    if (!competitor) {
      return NextResponse.json({ error: 'Competidor no encontrado' }, { status: 404 })
    }

    // Verificar que hay datos reales para generar el informe
    const hasRealData = competitor.follower_count !== null && competitor.follower_count > 0
    
    if (!hasRealData) {
      return NextResponse.json({ 
        error: 'No hay datos suficientes para generar el informe. Primero actualiza las metricas del perfil haciendo clic en "Actualizar".',
        needsSync: true
      }, { status: 400 })
    }

    // Get latest snapshots
    const { data: snapshots } = await supabase
      .from('competitor_snapshots')
      .select('*')
      .eq('competitor_id', competitorId)
      .order('snapshot_date', { ascending: false })
      .limit(30)
    
    // Get recent posts for content analysis
    const { data: recentPosts } = await supabase
      .from('competitor_posts')
      .select('*')
      .eq('competitor_id', competitorId)
      .order('posted_at', { ascending: false })
      .limit(20)
    
    // Get ads data
    const { data: ads } = await supabase
      .from('competitor_ads')
      .select('*')
      .eq('competitor_id', competitorId)
      .eq('active', true)
      .limit(10)

    // Generate comprehensive report with all data
    const report = await generateComprehensiveReport(
      competitor, 
      snapshots || [], 
      recentPosts || [],
      ads || [],
      reportType
    )

    // Save report
    const { data: savedReport, error: saveError } = await supabase
      .from('competitor_reports')
      .insert({
        competitor_id: competitorId,
        title: `Informe de ${competitor.name} - ${new Date().toLocaleDateString('es')}`,
        report_type: reportType,
        period_start: snapshots?.[snapshots.length - 1]?.snapshot_date || new Date().toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        summary: report.summary,
        metrics: report.metrics,
        insights: report.insights,
        recommendations: report.recommendations,
        html_content: report.html,
        created_by: user.id,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving report:', saveError)
    }

    return NextResponse.json({
      success: true,
      report: savedReport || report,
    })

  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Error al generar el informe' }, { status: 500 })
  }
}

async function generateComprehensiveReport(
  competitor: any, 
  snapshots: any[], 
  recentPosts: any[],
  ads: any[],
  reportType: string
) {
  const latestSnapshot = snapshots[0]
  const previousSnapshot = snapshots[1]

  // Calculate growth metrics
  const followerGrowth = latestSnapshot && previousSnapshot 
    ? latestSnapshot.follower_count - previousSnapshot.follower_count 
    : 0
  const engagementChange = latestSnapshot && previousSnapshot
    ? latestSnapshot.engagement_rate - previousSnapshot.engagement_rate
    : 0
  
  // Analyze top performing posts
  const topPosts = recentPosts
    .map(p => ({
      ...p,
      engagement: (p.likes || 0) + (p.comments || 0) * 2 + (p.shares || 0) * 3
    }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 5)
  
  // Build posts analysis text
  const postsAnalysis = topPosts.length > 0 
    ? `TOP 5 POSTS CON MEJOR RENDIMIENTO:\n${topPosts.map((p, i) => 
        `${i+1}. Tipo: ${p.post_type || 'post'} | Likes: ${p.likes || 0} | Comentarios: ${p.comments || 0} | Caption: "${(p.caption || '').substring(0, 100)}..."`
      ).join('\n')}`
    : 'No hay posts disponibles para analizar'
  
  // Build ads analysis text
  const adsAnalysis = ads.length > 0
    ? `ANUNCIOS ACTIVOS (${ads.length}):\n${ads.map((a, i) =>
        `${i+1}. Tipo: ${a.ad_type || 'unknown'} | Headline: "${a.headline || 'Sin titulo'}" | CTA: ${a.cta || 'Sin CTA'}`
      ).join('\n')}`
    : 'No hay anuncios activos detectados'

  // Generate AI insights with real data
  const { text: aiInsights } = await generateText({
    model: openai('gpt-4o-mini'),
    system: `Eres un analista de marketing digital experto. Genera informes profesionales basados EXCLUSIVAMENTE en los datos reales proporcionados. 
NO inventes datos ni metricas. Si algun dato no esta disponible, indicalo claramente.
Responde SOLO con un objeto JSON valido con esta estructura:
{
  "executive_summary": "Resumen ejecutivo basado en los datos reales (3-4 oraciones con numeros especificos)",
  "performance_analysis": "Analisis detallado del rendimiento con metricas reales",
  "content_analysis": "Analisis de los posts reales proporcionados - que tipo de contenido funciona mejor",
  "audience_analysis": "Analisis de la audiencia basado en engagement real",
  "ads_analysis": "Analisis de los anuncios activos si hay datos disponibles",
  "competitive_position": "Posicion basada en las metricas reales",
  "trends": ["Tendencia especifica 1 basada en datos", "Tendencia 2", "Tendencia 3"],
  "recommendations": [
    {"title": "Recomendacion especifica", "description": "Basada en los datos reales analizados", "priority": "alta"},
    {"title": "Recomendacion 2", "description": "Descripcion detallada", "priority": "media"}
  ],
  "action_items": ["Accion especifica 1", "Accion 2", "Accion 3"],
  "kpis_to_watch": ["KPI especifico 1", "KPI 2", "KPI 3"]
}`,
    prompt: `Genera un informe BASADO UNICAMENTE EN ESTOS DATOS REALES para el perfil de ${competitor.platform}:

===== DATOS DEL PERFIL =====
Usuario: @${competitor.platform_username || competitor.instagram_handle}
Nombre: ${competitor.name}
Categoria: ${competitor.category || 'No especificada'}
Plataforma: ${competitor.platform}

===== METRICAS REALES ACTUALES =====
- Seguidores: ${competitor.follower_count?.toLocaleString()}
- Siguiendo: ${competitor.following_count?.toLocaleString()}
- Total Publicaciones: ${competitor.posts_count}
- Engagement Rate: ${competitor.engagement_rate?.toFixed(2)}%
- Promedio Likes por post: ${competitor.avg_likes?.toLocaleString()}
- Promedio Comentarios por post: ${competitor.avg_comments?.toLocaleString()}
- Promedio Vistas por post: ${competitor.avg_views?.toLocaleString() || 'No disponible'}

===== CRECIMIENTO RECIENTE =====
- Cambio en seguidores: ${followerGrowth > 0 ? '+' : ''}${followerGrowth.toLocaleString()} (comparado con snapshot anterior)
- Cambio en engagement: ${engagementChange > 0 ? '+' : ''}${engagementChange.toFixed(2)} puntos porcentuales
- Snapshots historicos disponibles: ${snapshots.length}

===== ANALISIS DE CONTENIDO =====
${postsAnalysis}

===== PUBLICIDAD =====
${adsAnalysis}

${latestSnapshot?.ai_analysis ? `===== ANALISIS PREVIO =====\n${JSON.stringify(latestSnapshot.ai_analysis, null, 2)}` : ''}

IMPORTANTE: Basa tu analisis SOLO en los datos proporcionados arriba. Menciona numeros especificos. No inventes metricas.`,
  })

  let insights
  try {
    // Clean up AI response - remove markdown code blocks if present
    let cleanedResponse = aiInsights.trim()
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    insights = JSON.parse(cleanedResponse)
  } catch (parseError) {
    console.error('Error parsing AI insights:', parseError)
    // If parsing fails, create a basic structure with the raw text
    insights = { 
      executive_summary: aiInsights.substring(0, 500), // Limit to prevent storing huge strings
      recommendations: [], 
      action_items: [] 
    }
  }

  // Generate HTML report with all data
  const html = generateHTMLReport(competitor, snapshots, recentPosts, ads, insights)

  return {
    summary: JSON.stringify(insights), // Store full JSON for proper parsing in frontend
    metrics: {
      current: {
        followers: competitor.follower_count,
        following: competitor.following_count,
        posts: competitor.posts_count,
        engagement_rate: competitor.engagement_rate,
        avg_likes: competitor.avg_likes,
        avg_comments: competitor.avg_comments,
        avg_views: competitor.avg_views,
      },
      growth: {
        followers: followerGrowth,
        engagement_change: engagementChange,
      },
      historical: snapshots.map(s => ({
        date: s.snapshot_date,
        followers: s.follower_count,
        engagement: s.engagement_rate,
      })),
    },
    insights,
    recommendations: insights.recommendations || [],
    html,
  }
}

function generateHTMLReport(competitor: any, snapshots: any[], posts: any[], ads: any[], insights: any) {
  const latestSnapshot = snapshots[0]
  
  // Sort posts by engagement for top performers
  const topPosts = posts
    .map(p => ({ ...p, engagement: (p.likes || 0) + (p.comments || 0) * 2 }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 5)
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe - ${competitor.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 16px; margin-bottom: 30px; }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .header p { opacity: 0.9; }
    .card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .card h2 { font-size: 18px; color: #333; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #f0f0f0; }
    .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .metric { text-align: center; padding: 16px; background: #f8f9fa; border-radius: 8px; }
    .metric-value { font-size: 24px; font-weight: 700; color: #667eea; }
    .metric-label { font-size: 12px; color: #666; margin-top: 4px; }
    .insight { padding: 16px; background: #f0f4ff; border-left: 4px solid #667eea; margin-bottom: 12px; border-radius: 0 8px 8px 0; }
    .recommendation { padding: 16px; background: #f0fff4; border-left: 4px solid #10b981; margin-bottom: 12px; border-radius: 0 8px 8px 0; }
    .recommendation-title { font-weight: 600; margin-bottom: 4px; }
    .priority { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .priority-alta { background: #fee2e2; color: #dc2626; }
    .priority-media { background: #fef3c7; color: #d97706; }
    .priority-baja { background: #d1fae5; color: #059669; }
    .action-item { padding: 12px 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px; }
    .action-item::before { content: '→'; color: #667eea; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Informe de Análisis</h1>
      <p>@${competitor.platform_username || competitor.instagram_handle} · ${competitor.platform?.toUpperCase() || 'INSTAGRAM'}</p>
      <p style="margin-top: 8px; font-size: 14px;">Generado el ${new Date().toLocaleDateString('es', { dateStyle: 'long' })}</p>
    </div>

    <div class="card">
      <h2>Resumen Ejecutivo</h2>
      <p>${insights.executive_summary || 'No disponible'}</p>
    </div>

    <div class="card">
      <h2>Métricas Principales</h2>
      <div class="metrics-grid">
        <div class="metric">
          <div class="metric-value">${competitor.follower_count?.toLocaleString() || '-'}</div>
          <div class="metric-label">Seguidores</div>
        </div>
        <div class="metric">
          <div class="metric-value">${competitor.engagement_rate?.toFixed(2) || '-'}%</div>
          <div class="metric-label">Engagement Rate</div>
        </div>
        <div class="metric">
          <div class="metric-value">${competitor.posts_count?.toLocaleString() || '-'}</div>
          <div class="metric-label">Publicaciones</div>
        </div>
        <div class="metric">
          <div class="metric-value">${competitor.avg_likes?.toLocaleString() || '-'}</div>
          <div class="metric-label">Promedio Likes</div>
        </div>
        <div class="metric">
          <div class="metric-value">${competitor.avg_comments?.toLocaleString() || '-'}</div>
          <div class="metric-label">Promedio Comentarios</div>
        </div>
        <div class="metric">
          <div class="metric-value">${competitor.avg_views?.toLocaleString() || '-'}</div>
          <div class="metric-label">Promedio Vistas</div>
        </div>
      </div>
    </div>

    ${insights.performance_analysis ? `
    <div class="card">
      <h2>Análisis de Rendimiento</h2>
      <p>${insights.performance_analysis}</p>
    </div>
    ` : ''}

    ${insights.content_analysis ? `
    <div class="card">
      <h2>Analisis de Contenido</h2>
      <p>${insights.content_analysis}</p>
    </div>
    ` : ''}

    ${topPosts.length > 0 ? `
    <div class="card">
      <h2>Top 5 Posts con Mejor Rendimiento</h2>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${topPosts.map((post: any, i: number) => `
          <div style="display: flex; gap: 16px; padding: 12px; background: #f8f9fa; border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: #667eea; min-width: 30px;">#${i + 1}</div>
            <div style="flex: 1;">
              <div style="display: flex; gap: 16px; margin-bottom: 8px;">
                <span style="background: #e0e7ff; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${post.post_type || 'Post'}</span>
                <span style="color: #666; font-size: 14px;">❤️ ${(post.likes || 0).toLocaleString()}</span>
                <span style="color: #666; font-size: 14px;">💬 ${(post.comments || 0).toLocaleString()}</span>
              </div>
              <p style="font-size: 14px; color: #333; margin: 0;">${(post.caption || 'Sin caption').substring(0, 150)}${(post.caption || '').length > 150 ? '...' : ''}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    ${ads.length > 0 ? `
    <div class="card">
      <h2>Anuncios Activos (${ads.length})</h2>
      ${insights.ads_analysis ? `<p style="margin-bottom: 16px;">${insights.ads_analysis}</p>` : ''}
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${ads.slice(0, 5).map((ad: any) => `
          <div style="padding: 12px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0;">
            <div style="font-weight: 600; margin-bottom: 4px;">${ad.headline || 'Sin titulo'}</div>
            <div style="font-size: 14px; color: #666;">Tipo: ${ad.ad_type || 'Desconocido'} | CTA: ${ad.cta || 'Sin CTA'}</div>
            ${ad.body_text ? `<p style="font-size: 13px; color: #444; margin-top: 8px;">${ad.body_text.substring(0, 100)}...</p>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    ${insights.recommendations?.length > 0 ? `
    <div class="card">
      <h2>Recomendaciones</h2>
      ${insights.recommendations.map((rec: any) => `
        <div class="recommendation">
          <div class="recommendation-title">${rec.title} <span class="priority priority-${rec.priority}">${rec.priority}</span></div>
          <p>${rec.description}</p>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${insights.action_items?.length > 0 ? `
    <div class="card">
      <h2>Acciones Recomendadas</h2>
      ${insights.action_items.map((item: string) => `
        <div class="action-item">${item}</div>
      `).join('')}
    </div>
    ` : ''}

    <div class="footer">
      <p>Generado por ContentAI · ${new Date().toLocaleDateString('es')}</p>
    </div>
  </div>
</body>
</html>
  `
}
