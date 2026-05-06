import { NextRequest, NextResponse } from 'next/server'
import { requireRole, getSupabaseClient } from '@/lib/auth-helpers'

export async function GET() {
  const result = await requireRole(['hod', 'principal'])
  if (result.error) return result.error

  const supabase = await getSupabaseClient()
  const dept = result.user.department

  let query = supabase
    .from('classrooms')
    .select('id, name, subject_type, type, year, department, description')
    .order('year', { ascending: true })

  if (result.user.role === 'hod' && dept) {
    query = query.eq('department', dept)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ classrooms: data ?? [] })
}

export async function POST(req: NextRequest) {
  const result = await requireRole(['hod'])
  if (result.error) return result.error

  const body = await req.json()
  const { name, description, year, subject_type } = body

  if (!name || !year) return NextResponse.json({ error: 'name and year are required' }, { status: 400 })

  const supabase = await getSupabaseClient()
  const { data, error } = await supabase
    .from('classrooms')
    .insert({
      name,
      description: description ?? '',
      year: Number(year),
      subject_type: subject_type ?? 'core',
      type: 'study',
      department: result.user.department,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const result = await requireRole(['hod'])
  if (result.error) return result.error

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await getSupabaseClient()
  const { error } = await supabase.from('classrooms').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
