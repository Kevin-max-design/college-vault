import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getSupabaseClient } from '@/lib/auth-helpers'

/**
 * GET /api/notifications
 * Fetch all notifications for the authenticated user.
 */
export async function GET(req: NextRequest) {
  const result = await requireAuth()
  if (result.error) return result.error

  const userId = result.user.id
  const supabase = await getSupabaseClient()

  const { searchParams } = new URL(req.url)
  const includeRead = searchParams.get('includeRead') === 'true'

  let query = supabase
    .from('user_notifications')
    .select('*')
    .eq('user_id', userId)

  if (!includeRead) {
    query = query.is('read_at', null)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Map to UI NotificationItem structure
  const notifications = (data ?? []).map(n => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    time: n.created_at,
    read: n.read_at !== null,
    link: n.target_url,
    category: n.category ?? 'general',
    priority: n.priority ?? 'normal',
    source: n.source ?? null,
  }))

  return NextResponse.json({ notifications })
}

/**
 * POST /api/notifications
 * Add a new notification.
 */
export async function POST(req: NextRequest) {
  const result = await requireAuth()
  if (result.error) return result.error

  const userId = result.user.id

  try {
    const { type, title, body, link } = await req.json()
    if (!type || !title || !body || !link) {
      return NextResponse.json({ error: 'Missing type, title, body, or link.' }, { status: 400 })
    }

    const supabase = await getSupabaseClient()

    const { data, error } = await supabase
      .from('user_notifications')
      .insert({
        user_id: userId,
        type,
        title,
        body,
        target_url: link,
        read_at: null
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ notification: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid request body.' }, { status: 400 })
  }
}

/**
 * PATCH /api/notifications
 * Mark all or a specific notification as read.
 */
export async function PATCH(req: NextRequest) {
  const result = await requireAuth()
  if (result.error) return result.error

  const userId = result.user.id

  try {
    const { id } = await req.json().catch(() => ({}))
    const supabase = await getSupabaseClient()

    if (id) {
      // Mark specific notification as read
      const { data, error } = await supabase
        .from('user_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .is('read_at', null)
        .select('*')

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, updated: data })
    } else {
      // Mark all unread user notifications as read
      const { data, error } = await supabase
        .from('user_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null)
        .select('*')

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, updated: data })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error parsing request body.' }, { status: 400 })
  }
}
