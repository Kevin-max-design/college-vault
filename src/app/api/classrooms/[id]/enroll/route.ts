import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getSupabaseClient } from '@/lib/auth-helpers'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/classrooms/[id]/enroll
 * Enroll the current user in a classroom and get (or create) their unique enrollment ID.
 * Returns: { enrollment_id, seat_code, already_enrolled }
 */
export async function POST(_req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth()
  if (result.error) return result.error

  const { id: classroomId } = await ctx.params

  // Seed classrooms have non-UUID IDs — skip DB entirely
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(classroomId)) {
    return NextResponse.json({ enrollment_id: null, seat_code: null, already_enrolled: false })
  }

  const supabase = await getSupabaseClient()
  const userId = result.user.id

  // Check if already enrolled
  const { data: existing } = await supabase
    .from('classroom_members')
    .select('id, seat_code, anonymous_id, anonymous_handle')
    .eq('classroom_id', classroomId)
    .eq('user_id', userId)
    .single()

  if (existing) {
    return NextResponse.json({
      enrollment_id: existing.id,
      seat_code: existing.seat_code,
      anonymous_id: existing.anonymous_id,
      anonymous_handle: existing.anonymous_handle,
      already_enrolled: true,
    })
  }

  // Generate a unique seat code: CV-XXXX (4 random digits)
  const seatNumber = Math.floor(1000 + Math.random() * 9000)
  const seatCode = `CV-${seatNumber}`

  const adjectives = ['Curious', 'Studious', 'Analytical', 'Bright', 'Clever', 'Mindful', 'Academic', 'Creative']
  const nouns = ['Scholar', 'Mind', 'Explorer', 'Thinker', 'Learner', 'Guru', 'Innovator']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const randNum = Math.floor(100 + Math.random() * 900)
  const anonymousHandle = `u/${adj}_${noun}_${randNum}`
  const anonymousId = 'u_' + Math.random().toString(36).substring(2, 11)

  const { data: newEnrollment, error } = await supabase
    .from('classroom_members')
    .insert({
      classroom_id: classroomId,
      user_id: userId,
      seat_code: seatCode,
      anonymous_id: anonymousId,
      anonymous_handle: anonymousHandle,
    })
    .select('id, seat_code, anonymous_id, anonymous_handle')
    .single()

  if (error) {
    // If it's a unique constraint violation, fetch existing
    if (error.code === '23505') {
      const { data: retry } = await supabase
        .from('classroom_members')
        .select('id, seat_code, anonymous_id, anonymous_handle')
        .eq('classroom_id', classroomId)
        .eq('user_id', userId)
        .single()
      if (retry) {
        return NextResponse.json({
          enrollment_id: retry.id,
          seat_code: retry.seat_code,
          anonymous_id: retry.anonymous_id,
          anonymous_handle: retry.anonymous_handle,
          already_enrolled: true,
        })
      }
    }
    // If seat_code column doesn't exist yet, return a generated code
    return NextResponse.json({
      enrollment_id: null,
      seat_code: seatCode,
      anonymous_id: anonymousId,
      anonymous_handle: anonymousHandle,
      already_enrolled: false,
    })
  }

  return NextResponse.json({
    enrollment_id: newEnrollment.id,
    seat_code: newEnrollment.seat_code,
    anonymous_id: newEnrollment.anonymous_id,
    anonymous_handle: newEnrollment.anonymous_handle,
    already_enrolled: false,
  }, { status: 201 })
}

/**
 * GET /api/classrooms/[id]/enroll
 * List all enrolled members (for HOD/faculty)
 */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth()
  if (result.error) return result.error

  const { id: classroomId } = await ctx.params

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(classroomId)) {
    return NextResponse.json({ members: [] })
  }

  const supabase = await getSupabaseClient()

  const { data, error } = await supabase
    .from('classroom_members')
    .select(`
      id, seat_code, joined_at, anonymous_id, anonymous_handle,
      user:profiles!classroom_members_user_id_fkey(id, full_name, email, role, department)
    `)
    .eq('classroom_id', classroomId)
    .order('joined_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ members: data ?? [] })
}
