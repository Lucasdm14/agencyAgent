import { createClient } from '@/lib/supabase/server'
import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

const AnalysisSchema = z.object({
  posting_frequency: z.string().describe('Frecuencia de publicación detectada'),
  best_performing_content: z.string().describe('Tipo de contenido con mejor rendimiento'),
  content_themes: z.array(z.string()).describe('Temas principales del contenido'),
  engagement_insights: z.string().describe('Insights sobre el engagement'),
  recommendations: z.string().describe('Recomendaciones basadas en el análisis'),
  hook_patterns: z.array(z.string()).describe('Patrones de hooks detectados'),
  cta_patterns: z.array(z.string()).describe('Patrones de CTAs detectados'),
})

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { competitorId, csvData, periodStart, periodEnd } = await request.json()

  if (!competitorId || !csvData || !periodStart || !periodEnd) {
    return Response.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  try {
    // Parse CSV data
    const lines = csvData.split('\n').filter((line: string) => line.trim())
    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase())
    
    const posts = lines.slice(1).map((line: string) => {
      const values = line.split(',')
      const post: Record<string, any> = {}
      headers.forEach((header: string, i: number) => {
        post[header] = values[i]?.trim() || ''
      })
      return post
    })

    // Calculate metrics
    let totalReels = 0, totalCarousels = 0, totalImages = 0
    let totalLikes = 0, totalViews = 0, totalComments = 0, totalShares = 0

    const processedPosts = posts.map((post: any) => {
      const postType = (post.post_type || post.type || 'image').toLowerCase()
      const likes = parseInt(post.likes || '0') || 0
      const views = parseInt(post.views || '0') || 0
      const comments = parseInt(post.comments || '0') || 0
      const shares = parseInt(post.shares || '0') || 0

      if (postType.includes('reel')) totalReels++
      else if (postType.includes('carousel')) totalCarousels++
      else totalImages++

      totalLikes += likes
      totalViews += views
      totalComments += comments
      totalShares += shares

      return {
        post_type: postType,
        caption: post.caption || post.description || '',
        likes,
        views,
        comments,
        shares,
        posted_at: post.posted_at || post.date || null,
        hook_text: post.hook || post.hook_text || null,
        cta_text: post.cta || post.cta_text || null,
      }
    })

    const totalPosts = processedPosts.length
    const avgLikes = totalPosts > 0 ? totalLikes / totalPosts : 0
    const avgViews = totalPosts > 0 ? totalViews / totalPosts : 0
    const avgEngagement = totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0

    // Calculate post scores using formula: likes * 1 + views * 0.1 + shares * 3
    const postsWithScores = processedPosts.map((post: any) => ({
      ...post,
      score: (post.likes * 1) + (post.views * 0.1) + (post.shares * 3)
    }))

    // Sort by score and get top 10 posts
    const topPosts = [...postsWithScores]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(p => ({
        post_type: p.post_type,
        caption: p.caption?.substring(0, 200),
        likes: p.likes,
        views: p.views,
        shares: p.shares,
        comments: p.comments,
        score: Math.round(p.score),
        posted_at: p.posted_at,
      }))

    // Calculate insights automáticos
    const captionLengths = processedPosts
      .filter((p: any) => p.caption)
      .map((p: any) => p.caption.length)
    const avgCaptionLength = captionLengths.length > 0 
      ? Math.round(captionLengths.reduce((a: number, b: number) => a + b, 0) / captionLengths.length)
      : 0

    // Find best performing format by average score
    const scoresByType: Record<string, { total: number; count: number }> = {}
    postsWithScores.forEach((p: any) => {
      if (!scoresByType[p.post_type]) {
        scoresByType[p.post_type] = { total: 0, count: 0 }
      }
      scoresByType[p.post_type].total += p.score
      scoresByType[p.post_type].count++
    })
    
    const bestFormat = Object.entries(scoresByType)
      .map(([type, data]) => ({ type, avgScore: data.total / data.count }))
      .sort((a, b) => b.avgScore - a.avgScore)[0]?.type || 'N/A'

    // Posting distribution by day of week
    const postsByDay: Record<string, number> = {}
    processedPosts.forEach((p: any) => {
      if (p.posted_at) {
        const day = new Date(p.posted_at).toLocaleDateString('es', { weekday: 'long' })
        postsByDay[day] = (postsByDay[day] || 0) + 1
      }
    })

    // Extract common hashtags
    const allHashtags: string[] = []
    processedPosts.forEach((p: any) => {
      const hashtags = p.caption?.match(/#\w+/g) || []
      allHashtags.push(...hashtags)
    })
    const hashtagCounts: Record<string, number> = {}
    allHashtags.forEach(tag => {
      hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1
    })
    const topHashtags = Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }))

    // AI Analysis
    let patternAnalysis = null
    try {
      const { output } = await generateText({
        model: openai('gpt-4o-mini'),
        system: `Eres un analista de marketing digital especializado en Instagram. 
Analiza los datos de posts de un competidor y extrae patrones, insights y recomendaciones.
Responde en español.`,
        prompt: `Analiza estos ${totalPosts} posts de Instagram:

MÉTRICAS GENERALES:
- Total Reels: ${totalReels}
- Total Carruseles: ${totalCarousels}
- Total Imágenes: ${totalImages}
- Promedio Likes: ${Math.round(avgLikes)}
- Promedio Views: ${Math.round(avgViews)}
- Engagement Rate: ${avgEngagement.toFixed(2)}%
- Longitud promedio de caption: ${avgCaptionLength} caracteres
- Mejor formato (por score): ${bestFormat}

TOP 5 POSTS (por score = likes*1 + views*0.1 + shares*3):
${topPosts.slice(0, 5).map((p, i) => `${i + 1}. [${p.post_type}] Score: ${p.score} | Likes: ${p.likes} | Views: ${p.views}
   Caption: ${p.caption || 'Sin caption'}`).join('\n')}

DISTRIBUCIÓN POR DÍA:
${Object.entries(postsByDay).map(([day, count]) => `- ${day}: ${count} posts`).join('\n')}

TOP HASHTAGS:
${topHashtags.slice(0, 5).map(h => `- ${h.tag}: ${h.count} veces`).join('\n')}

Proporciona un análisis detallado de patrones, temas y recomendaciones.`,
        output: Output.object({
          schema: AnalysisSchema,
        }),
      })
      patternAnalysis = output
    } catch (aiError) {
      console.error('AI analysis error:', aiError)
    }

    // Save analysis to database
    const { data: analysis, error: analysisError } = await supabase
      .from('competitor_instagram_analysis')
      .insert({
        competitor_id: competitorId,
        period_start: periodStart,
        period_end: periodEnd,
        total_posts: totalPosts,
        total_reels: totalReels,
        total_carousels: totalCarousels,
        total_images: totalImages,
        total_likes: totalLikes,
        total_views: totalViews,
        total_comments: totalComments,
        total_shares: totalShares,
        avg_likes: avgLikes,
        avg_views: avgViews,
        avg_engagement_rate: avgEngagement,
        top_posts: topPosts,
        pattern_analysis: {
          ...patternAnalysis,
          avg_caption_length: avgCaptionLength,
          best_performing_format: bestFormat,
          posting_distribution: postsByDay,
          top_hashtags: topHashtags,
        },
        raw_data: {
          total_posts_analyzed: totalPosts,
          score_formula: 'likes*1 + views*0.1 + shares*3',
        },
        analyzed_by: user.id,
      })
      .select()
      .single()

    if (analysisError) {
      console.error('Database error:', analysisError)
      return Response.json({ error: 'Error guardando análisis' }, { status: 500 })
    }

    // Save individual posts
    const postsToInsert = processedPosts.map((post: any) => ({
      competitor_id: competitorId,
      platform: 'instagram',
      ...post,
    }))

    await supabase.from('competitor_posts').insert(postsToInsert)

    return Response.json({ 
      success: true, 
      analysis,
      postsAnalyzed: totalPosts 
    })

  } catch (error) {
    console.error('Error:', error)
    return Response.json({ error: 'Error procesando datos' }, { status: 500 })
  }
}
