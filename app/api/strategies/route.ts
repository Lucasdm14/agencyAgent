import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const brand_id = searchParams.get('brand_id')

  let query = supabase
    .from('content_strategies')
    .select('*')
    .order('created_at', { ascending: false })

  if (brand_id) {
    query = query.eq('brand_id', brand_id)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const {
    brand_id,
    name,
    platform,
    days_count,
    strategy_data,
    supervisor_validation,
    metrics_account_id,
    metrics_snapshot,
    strategist_agent_id,
    creator_agent_id,
    supervisor_agent_id,
    status = 'draft',
  } = body

  const { data, error } = await supabase
    .from('content_strategies')
    .insert({
      brand_id,
      name,
      platform,
      days_count,
      strategy_data,
      supervisor_validation,
      metrics_account_id,
      metrics_snapshot,
      strategist_agent_id,
      creator_agent_id,
      supervisor_agent_id,
      status,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { id, ...updateData } = body

  const { data, error } = await supabase
    .from('content_strategies')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('content_strategies')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
