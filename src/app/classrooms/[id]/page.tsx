import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AppShell from '@/app/components/AppShell'
import ClassroomDetailClient from './ClassroomDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClassroomDetailPage({ params }: Props) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/onboarding/verify')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, role')
    .eq('id', user.id)
    .single()

  const avatarUrl = profile?.avatar_url ?? null
  const fullName  = profile?.full_name ?? ''
  const initials  = fullName.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase() || 'CV'
  const userRole  = (profile?.role ?? 'student') as string

  // Fetch classroom
  const { data: classroom, error: clsErr } = await supabase
    .from('classrooms')
    .select('id, name, subject_type, type, department, year, description, entry_code')
    .eq('id', id)
    .single()

  if (clsErr || !classroom) redirect('/classrooms')

  // Fetch posts (doubts + threads) — top-level only, newest first
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id, content, type, resolved, created_at, parent_id,
      author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role),
      reactions(emoji, user_id)
    `)
    .eq('classroom_id', id)
    .order('created_at', { ascending: true })
    .limit(200)

  // Doubt count
  const { count: doubtCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('classroom_id', id)
    .eq('type', 'doubt')
    .eq('resolved', false)

  return (
    <AppShell
      pageTitle={classroom.name}
      userAvatarUrl={avatarUrl}
      userInitials={initials}
    >
      <ClassroomDetailClient
        classroom={{
          id: classroom.id,
          name: classroom.name,
          subject_type: classroom.subject_type,
          type: classroom.type,
          department: classroom.department,
          year: classroom.year,
          description: classroom.description ?? '',
          entry_code: classroom.entry_code ?? '',
        }}
        initialPosts={(posts ?? []).map((p) => ({
          id: p.id,
          content: p.content,
          type: p.type,
          resolved: p.resolved,
          created_at: p.created_at,
          parent_id: p.parent_id,
          author: Array.isArray(p.author) ? p.author[0] : p.author,
          reactions: p.reactions ?? [],
        }))}
        doubtCount={doubtCount ?? 0}
        userId={user.id}
        userRole={userRole}
      />
    </AppShell>
  )
}
