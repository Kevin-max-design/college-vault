import { NextResponse } from 'next/server'
import { requireRole, getSupabaseClient } from '@/lib/auth-helpers'

export async function GET() {
  const result = await requireRole(['hod', 'principal'])
  if (result.error) return result.error

  const supabase = await getSupabaseClient()

  const { data, error } = await supabase
    .from('listings')
    .select(`id, title, price, type, category, status, created_at, seller:profiles!listings_seller_id_fkey(full_name)`)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ listings: data ?? [] })
}
