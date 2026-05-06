import { NextRequest, NextResponse } from 'next/server'
import { requireRole, getSupabaseClient } from '@/lib/auth-helpers'

export async function GET() {
  const result = await requireRole(['hod', 'principal'])
  if (result.error) return result.error

  const supabase = await getSupabaseClient()
  const dept = result.user.department

  // HOD sees only their department; principal sees all
  let query = supabase
    .from('profiles')
    .select('id, full_name, email, role, department, year_of_study, created_at')
    .order('created_at', { ascending: false })

  if (result.user.role === 'hod' && dept) {
    query = query.eq('department', dept)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const result = await requireRole(['hod', 'principal'])
  if (result.error) return result.error

  const { userId, role } = await req.json()
  if (!userId || !role) return NextResponse.json({ error: 'userId and role required' }, { status: 400 })

  const supabase = await getSupabaseClient()
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
