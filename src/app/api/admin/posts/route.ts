import { NextRequest, NextResponse } from 'next/server'
import { requireRole, getSupabaseClient } from '@/lib/auth-helpers'

export async function GET() {
  const result = await requireRole(['hod', 'principal'])
  if (result.error) return result.error

  const supabase = await getSupabaseClient()

  const { data, error } = await supabase
    .from('posts')
    .select(`id, content, type, resolved, created_at, classroom_id, author:profiles!posts_author_id_fkey(full_name)`)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ posts: data ?? [] })
}

export async function DELETE(req: NextRequest) {
  const result = await requireRole(['hod', 'principal'])
  if (result.error) return result.error

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await getSupabaseClient()
  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
