import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getSupabaseClient } from '@/lib/auth-helpers'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/classrooms/[id]/chat
 * Fetch all direct peer messages in this classroom involving the authenticated user.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth()
  if (result.error) return result.error

  const { id: classroomId } = await ctx.params
  const userId = result.user.id

  const supabase = await getSupabaseClient()

  // Fetch direct messages involving the current user in this classroom
  const { data, error } = await supabase
    .from('peer_messages')
    .select('*')
    .eq('classroom_id', classroomId)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages: data ?? [] })
}

/**
 * POST /api/classrooms/[id]/chat
 * Send a new peer direct message in this classroom.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth()
  if (result.error) return result.error

  const { id: classroomId } = await ctx.params
  const senderId = result.user.id

  try {
    const { receiver_id, body } = await req.json()
    if (!receiver_id || !body?.trim()) {
      return NextResponse.json({ error: 'Missing receiver_id or message body.' }, { status: 400 })
    }

    const supabase = await getSupabaseClient()

    const { data, error } = await supabase
      .from('peer_messages')
      .insert({
        classroom_id: classroomId,
        sender_id: senderId,
        receiver_id,
        body: body.trim(),
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid request body.' }, { status: 400 })
  }
}
