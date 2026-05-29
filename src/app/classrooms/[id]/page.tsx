import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AppShell from '@/app/components/AppShell'
import dynamic from 'next/dynamic'
import { SEED_CLASSROOMS as NESTED_SEED, DEPT_LABELS } from '../data'

const ClassroomDetailClient = dynamic(() => import('./ClassroomDetailClient'), {
  loading: () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', fontFamily: 'var(--font-jakarta)' }}>
      <div style={{ color: '#00595c', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>sync</span>
        Loading Classroom...
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
})

interface Props {
  params: Promise<{ id: string }>
}

/* ── Flattened seed classrooms (matches ClassroomsClient seed data) ── */
const SEED_CLASSROOMS: Record<string, {
  id: string; name: string; subject_type: string; type: string
  department: string; year: number; description: string; entry_code: string
}> = {
  'proj-vault-redesign': {
    id: 'proj-vault-redesign',
    name: 'Campus Vault Redesign',
    subject_type: 'core',
    type: 'project',
    department: 'Computer Science & Engineering',
    year: 3,
    description: 'Collaborative project classroom for building and refining the CampusVault platform. Share UI designs, system architecture notes, and local development solutions.',
    entry_code: '',
  },
  'proj-ml-fundamentals': {
    id: 'proj-ml-fundamentals',
    name: 'ML Fundamentals',
    subject_type: 'elective',
    type: 'project',
    department: 'Computer Science & Engineering',
    year: 3,
    description: "Study group focused on machine learning foundations, working through Stanford CS229 and Andrew Ng's courses together.",
    entry_code: '',
  }
}

// Flatten the nested structure
Object.entries(NESTED_SEED).forEach(([deptCode, years]) => {
  const deptLabel = DEPT_LABELS[deptCode] ?? deptCode
  Object.entries(years).forEach(([yearStr, classrooms]) => {
    const year = parseInt(yearStr, 10)
    classrooms.forEach(c => {
      // Do not overwrite explicitly defined project classrooms
      if (!SEED_CLASSROOMS[c.id]) {
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
      }
    })
  })
})

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function ClassroomDetailPage({ params }: Props) {
  const { id } = await params
  console.log('[ClassroomDetail] Rendering page for id:', id)

  let cookieStore
  try {
    cookieStore = await cookies()
  } catch (err) {
    console.error('[ClassroomDetail] FATAL: cookies() failed:', err)
    redirect('/classrooms')
  }

  const supabase = createClient(cookieStore)

  let user: any = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user
  } catch (err) {
    console.error('[ClassroomDetail] FATAL: getUser() failed:', err)
  }
  if (!user) redirect('/onboarding/verify')

  // Safely fetch profile to avoid any crash
  let avatarUrl = null
  let fullName = ''
  let userRole = 'student'
  
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, role')
      .eq('id', user.id)
      .single()
      
    if (profile) {
      avatarUrl = profile.avatar_url ?? null
      fullName = profile.full_name ?? ''
      userRole = (profile.role ?? 'student') as string
    }
  } catch (err) {
    console.error('[ClassroomDetail] Error loading profile:', err)
  }

  const initials = fullName
    ? (fullName.split(' ').slice(0, 2).map((n: string) => n ? n[0] : '').join('').toUpperCase() || 'U')
    : 'U'

  const isUuid = UUID_REGEX.test(id)
  let dbClassroom: any = null

  if (isUuid) {
    // ── Standard UUID classroom lookup ─────────────────────────────
    try {
      const { data } = await supabase
        .from('classrooms')
        .select('id, name, subject_type, type, department, year, description, entry_code')
        .eq('id', id)
        .single()
      dbClassroom = data
    } catch (err) {
      console.error('[ClassroomDetail] Error loading DB classroom:', err)
    }
  } else {
    // ── Slug-based lookup: find or create seed classroom in Supabase ─
    // This makes all seed classrooms Supabase-backed so every user on
    // every device shares the same post feed for the same classroom.
    const seedData = SEED_CLASSROOMS[id]
    if (seedData) {
      try {
        const { data: resolved, error: rpcErr } = await supabase.rpc(
          'find_or_create_seed_classroom',
          {
            p_slug:         id,
            p_name:         seedData.name,
            p_subject_type: seedData.subject_type,
            p_type:         seedData.type ?? 'study',
            p_department:   seedData.department,
            p_year:         seedData.year,
            p_description:  seedData.description || '',
          }
        )
        if (rpcErr) {
          console.error('[ClassroomDetail] RPC find_or_create_seed_classroom error:', rpcErr.message)
        } else if (Array.isArray(resolved) && resolved.length > 0) {
          dbClassroom = resolved[0]
          console.log('[ClassroomDetail] Seed classroom resolved via slug:', id, '→ uuid:', dbClassroom.id)
        }
      } catch (err) {
        console.error('[ClassroomDetail] Error resolving seed classroom by slug:', err)
      }
    }
  }

  // Fall back to in-memory seed metadata ONLY if DB is unreachable (graceful degradation)
  const classroom = dbClassroom ?? SEED_CLASSROOMS[id] ?? null

  // If neither DB nor seed, redirect
  if (!classroom) redirect('/classrooms')

  // isSeedClassroom is true ONLY in degraded mode (DB unavailable).
  // Normally dbClassroom is always resolved, making isSeedClassroom = false,
  // which activates all Supabase paths in ClassroomDetailClient.
  const isSeedClassroom = !dbClassroom && !!SEED_CLASSROOMS[id]

  let posts: any[] = []
  let doubtCount = 0

  // Always use the real Supabase UUID for post queries
  const classroomUUID: string | null = dbClassroom?.id ?? null

  if (classroomUUID) {
    try {
      const { data: rawPosts, error: postsErr } = await supabase
        .from('posts')
        .select(`
          id, content, type, resolved, created_at, parent_id,
          author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role),
          reactions(emoji, user_id)
        `)
        .eq('classroom_id', classroomUUID)
        .order('created_at', { ascending: true })
        .limit(100)

      if (postsErr) {
        console.error('[ClassroomDetail] posts query error:', postsErr.message)
      }

      if (rawPosts) {
        posts = rawPosts.map((p: any) => ({
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

      const { count } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('classroom_id', classroomUUID)
        .eq('type', 'doubt')
        .eq('resolved', false)

      doubtCount = count ?? 0

      console.log(
        '[ClassroomDetail] classroomId:', classroomUUID,
        'userId:', user.id,
        'posts fetched:', posts.length,
        'open doubts:', doubtCount,
      )
    } catch (err) {
      console.error('[ClassroomDetail] Error loading posts:', err)
    }
  } else if (isSeedClassroom) {
    // Degraded mode only: static seed posts when DB is unreachable.
    // These are intentionally minimal so users see they need to retry.
    console.warn('[ClassroomDetail] DB unavailable — degraded mode for slug:', id)
    doubtCount = 0
  }

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
          type: classroom.type ?? 'study',
          department: classroom.department,
          year: classroom.year,
          description: classroom.description ?? '',
          entry_code: classroom.entry_code ?? '',
        }}
        initialPosts={posts}
        doubtCount={doubtCount}
        userId={user.id}
        userRole={userRole}
      />
    </AppShell>
  )
}
