import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AppShell from '@/app/components/AppShell'
import dynamic from 'next/dynamic'
import { SEED_CLASSROOMS as NESTED_SEED, DEPT_LABELS } from '../../../data'

const PostDetailClient = dynamic(() => import('./PostDetailClient'), {
  loading: () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', fontFamily: 'var(--font-jakarta)' }}>
      <div style={{ color: '#00595c', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>sync</span>
        Loading Discussion...
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
})

interface Props {
  params: Promise<{ id: string; postId: string }>
}

/* ── Flattened seed classrooms (matches ClassroomsClient seed data) ── */
const SEED_CLASSROOMS: Record<string, {
  id: string; name: string; subject_type: string; type: string
  department: string; year: number; description: string; entry_code: string
}> = {}

// Flatten the nested structure
Object.entries(NESTED_SEED).forEach(([deptCode, years]) => {
  const deptLabel = DEPT_LABELS[deptCode] ?? deptCode
  Object.entries(years).forEach(([yearStr, classrooms]) => {
    const year = parseInt(yearStr, 10)
    classrooms.forEach(c => {
      SEED_CLASSROOMS[c.id] = {
        id: c.id,
        name: c.name,
        subject_type: c.subject_type,
        type: 'study',
        department: deptLabel,
        year: year,
        description: c.description,
        entry_code: '',
      }
    })
  })
})

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function PostDetailPage({ params }: Props) {
  const { id, postId } = await params
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
  const fullName  = profile?.full_name?.trim() || ''
  const initials  = fullName
    ? (fullName.split(' ').slice(0, 2).map((n: string) => n ? n[0] : '').join('').toUpperCase() || 'U')
    : 'U'
  const userRole  = (profile?.role ?? 'student') as string

  // Try fetching from DB first if ID is in valid UUID format
  const isUuid = UUID_REGEX.test(id)
  let dbClassroom = null

  if (isUuid) {
    try {
      const { data } = await supabase
        .from('classrooms')
        .select('id, name, subject_type, type, department, year, description, entry_code')
        .eq('id', id)
        .single()
      dbClassroom = data
    } catch (err) {
      console.error('[PostDetail] Error loading DB classroom:', err)
    }
  }

  // Fall back to seed data if not in DB
  const classroom = dbClassroom ?? SEED_CLASSROOMS[id] ?? null

  // If neither DB nor seed, redirect back
  if (!classroom) redirect('/classrooms')

  const isSeedClassroom = !dbClassroom && !!SEED_CLASSROOMS[id]

  let posts: any[] = []

  if (!isSeedClassroom) {
    const { data: rawPosts } = await supabase
      .from('posts')
      .select(`
        id, content, type, resolved, created_at, parent_id,
        author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role),
        reactions(emoji, user_id)
      `)
      .eq('classroom_id', id)
      .order('created_at', { ascending: true })
      .limit(100)

    posts = (rawPosts ?? []).map((p: any) => ({
      id: p.id,
      content: p.content,
      type: p.type,
      resolved: p.resolved,
      created_at: p.created_at,
      parent_id: p.parent_id ?? null,
      author: Array.isArray(p.author) ? p.author[0] : p.author,
      reactions: p.reactions ?? [],
    }))
  }

  return (
    <AppShell
      pageTitle={`${classroom.name} - Discussion`}
      userAvatarUrl={avatarUrl}
      userInitials={initials}
    >
      <PostDetailClient
        classroom={{
          id: classroom.id,
          name: classroom.name,
          subject_type: classroom.subject_type,
          type: classroom.type ?? 'study',
          department: classroom.department,
          year: classroom.year,
          description: classroom.description ?? '',
          entry_code: classroom.entry_code ?? '',
        }}
        postId={postId}
        initialPosts={posts}
        userId={user.id}
        userRole={userRole}
      />
    </AppShell>
  )
}
