/**
 * POST /api/metrics/apify
 * Fetches Instagram organic metrics and Meta Ad Library via Apify.
 */
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { fetchInstagramMetrics, fetchMetaAdLibraryApify } from '@/lib/free-apis/apify'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { type, username, page_name, period_days, countries } = await req.json() as {
    type:        'instagram' | 'meta_ads'
    username?:   string
    page_name?:  string
    period_days?: number
    countries?:  string[]
  }

  if (!process.env.APIFY_TOKEN) {
    return NextResponse.json(
      { error: 'APIFY_TOKEN no configurado. Agregalo en las variables de entorno de Vercel.' },
      { status: 422 }
    )
  }

  if (type === 'instagram') {
    if (!username) return NextResponse.json({ error: 'username es requerido' }, { status: 400 })
    const metrics = await fetchInstagramMetrics(username, period_days ?? 30)
    if (!metrics) {
      return NextResponse.json(
        { error: `No se encontraron posts para @${username}. Verificá que la cuenta sea pública.` },
        { status: 404 }
      )
    }
    return NextResponse.json({ metrics })
  }

  if (type === 'meta_ads') {
    if (!page_name) return NextResponse.json({ error: 'page_name es requerido' }, { status: 400 })
    const data = await fetchMetaAdLibraryApify(page_name, countries)
    return NextResponse.json({ data })
  }

  return NextResponse.json({ error: 'type debe ser "instagram" o "meta_ads"' }, { status: 400 })
}
