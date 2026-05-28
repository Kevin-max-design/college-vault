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
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
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

  const initials = fullName.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase() || 'CV'

  const isUuid = UUID_REGEX.test(id)
  let dbClassroom = null

  // Only query DB if the ID is in valid UUID format
  if (isUuid) {
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
  }

  // Fall back to seed data if not in DB or if it's a seed ID
  const classroom = dbClassroom ?? SEED_CLASSROOMS[id] ?? null

  // If neither DB nor seed, redirect back
  if (!classroom) redirect('/classrooms')

  const isSeedClassroom = !dbClassroom && !!SEED_CLASSROOMS[id]

  let posts: any[] = []
  let doubtCount = 0

  if (!isSeedClassroom && isUuid) {
    try {
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
        .eq('classroom_id', id)
        .eq('type', 'doubt')
        .eq('resolved', false)

      doubtCount = count ?? 0
    } catch (err) {
      console.error('[ClassroomDetail] Error loading DB posts:', err)
    }
  } else {
    // Curated pre-populated seed posts for project classrooms
    if (id === 'proj-vault-redesign') {
      posts = [
        {
          id: 'p-vr-1',
          content: '🚀 PROJECT UPDATE: I have successfully enabled Dynamic imports & route-splitting across the CampusVault platform. The initial bundle size dropped significantly, achieving a 45% faster load time. Let us keep the app responsive!',
          type: 'announcement',
          resolved: false,
          created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          parent_id: null,
          author: { id: 'admin-dev', full_name: 'u/Lead_Architect_99', avatar_url: null, role: 'student' },
          reactions: [{ emoji: 'up', user_id: 'user-1' }, { emoji: 'up', user_id: 'user-2' }],
          replies: []
        },
        {
          id: 'p-vr-2',
          content: 'Is anyone else facing issues with Supabase OTP email limits during local testing? Every time I try registering more than 3 students, it throws a rate limit.',
          type: 'doubt',
          resolved: true,
          created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
          parent_id: null,
          author: { id: 'dev-2', full_name: 'u/Frontend_Ninja', avatar_url: null, role: 'student' },
          reactions: [{ emoji: 'up', user_id: 'user-3' }],
          replies: [
            {
              id: 'p-vr-2-r1',
              content: 'Yes! We just replaced it with email/password auth under /onboarding/verify so you do not need OTPs anymore. Make sure to turn off Confirm Email in your local Supabase dashboard settings!',
              type: 'thread',
              resolved: false,
              created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
              parent_id: 'p-vr-2',
              author: { id: 'admin-dev', full_name: 'u/Lead_Architect_99', avatar_url: null, role: 'student' },
              reactions: [{ emoji: 'up', user_id: 'user-2' }],
              replies: []
            }
          ]
        },
        {
          id: 'p-vr-3',
          content: 'Here is the Figma link for the new CampusVault color guidelines: Amber (#fea619), Teal (#00595c) and Earth-slate. Please follow this style guide for all custom CSS contributions.',
          type: 'material',
          resolved: false,
          created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
          parent_id: null,
          author: { id: 'designer-1', full_name: 'u/UI_Wizard', avatar_url: null, role: 'student' },
          reactions: [{ emoji: 'up', user_id: 'user-1' }],
          replies: []
        }
      ]
    } else if (id === 'proj-ml-fundamentals') {
      posts = [
        {
          id: 'p-ml-1',
          content: '📢 WEEKLY SEMINAR: We are starting our first hands-on session on convolutional neural networks (CNNs) this Saturday at 2 PM. We will build a handwritten digit classifier from scratch!',
          type: 'announcement',
          resolved: false,
          created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          parent_id: null,
          author: { id: 'ml-lead', full_name: 'u/ML_Guru_101', avatar_url: null, role: 'faculty' },
          reactions: [{ emoji: 'up', user_id: 'user-1' }],
          replies: []
        },
        {
          id: 'p-ml-2',
          content: 'Could someone explain why we prefer the ReLU activation function over Sigmoid or Tanh in deep hidden layers of a network? Does it actually prevent vanishing gradients?',
          type: 'doubt',
          resolved: false,
          created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
          parent_id: null,
          author: { id: 'student-ml', full_name: 'u/Curious_Neural_Net', avatar_url: null, role: 'student' },
          reactions: [{ emoji: 'up', user_id: 'user-2' }],
          replies: []
        }
      ]
    }
    doubtCount = posts.filter(p => p.type === 'doubt' && !p.resolved).length
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
