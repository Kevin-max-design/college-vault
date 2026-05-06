import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AppShell from '@/app/components/AppShell'
import ClassroomDetailClient from './ClassroomDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

/* ── Seed fallback classrooms (matches ClassroomsClient seed data) ── */
const SEED_CLASSROOMS: Record<string, {
  id: string; name: string; subject_type: string; type: string
  department: string; year: number; description: string; entry_code: string
}> = {
  'y1-1': { id: 'y1-1', name: 'Engineering Mathematics I', subject_type: 'core', type: 'study', department: 'Computer Science', year: 1, description: 'Calculus, matrices, and differential equations foundations.', entry_code: '' },
  'y1-2': { id: 'y1-2', name: 'Engineering Physics', subject_type: 'core', type: 'study', department: 'Computer Science', year: 1, description: 'Wave optics and quantum mechanics introduction.', entry_code: '' },
  'y1-3': { id: 'y1-3', name: 'Programming in C', subject_type: 'core', type: 'study', department: 'Computer Science', year: 1, description: 'First principles of programming logic and C syntax.', entry_code: '' },
  'y1-4': { id: 'y1-4', name: 'Basic Electronics', subject_type: 'elective', type: 'study', department: 'Computer Science', year: 1, description: 'Diodes, transistors, and basic circuit design.', entry_code: '' },
  'y2-1': { id: 'y2-1', name: 'Data Structures & Algorithms', subject_type: 'core', type: 'study', department: 'Computer Science', year: 2, description: 'Arrays, linked lists, trees, graphs, and sorting algorithms.', entry_code: '' },
  'y2-2': { id: 'y2-2', name: 'Object-Oriented Programming', subject_type: 'core', type: 'study', department: 'Computer Science', year: 2, description: 'Java classes, inheritance, polymorphism and design patterns.', entry_code: '' },
  'y2-3': { id: 'y2-3', name: 'Computer Organization', subject_type: 'core', type: 'study', department: 'Computer Science', year: 2, description: 'CPU architecture, memory hierarchy, instruction sets.', entry_code: '' },
  'y2-4': { id: 'y2-4', name: 'Discrete Mathematics', subject_type: 'core', type: 'study', department: 'Computer Science', year: 2, description: 'Logic, sets, relations, and graph theory.', entry_code: '' },
  'y3-1': { id: 'y3-1', name: 'Operating Systems', subject_type: 'core', type: 'study', department: 'Computer Science', year: 3, description: 'Process management, memory management, and file systems.', entry_code: '' },
  'y3-2': { id: 'y3-2', name: 'Database Management Systems', subject_type: 'core', type: 'study', department: 'Computer Science', year: 3, description: 'ER models, SQL, transactions and normalization.', entry_code: '' },
  'y3-3': { id: 'y3-3', name: 'Computer Networks', subject_type: 'core', type: 'study', department: 'Computer Science', year: 3, description: 'OSI model, TCP/IP, routing algorithms.', entry_code: '' },
  'y3-4': { id: 'y3-4', name: 'Machine Learning', subject_type: 'elective', type: 'study', department: 'Computer Science', year: 3, description: 'Neural networks and backpropagation deep dive.', entry_code: '' },
  'y3-5': { id: 'y3-5', name: 'Cloud Computing', subject_type: 'elective', type: 'study', department: 'Computer Science', year: 3, description: 'AWS practicals starting this week.', entry_code: '' },
  'y4-1': { id: 'y4-1', name: 'Distributed Systems', subject_type: 'core', type: 'study', department: 'Computer Science', year: 4, description: 'CAP theorem, consistency models, microservices.', entry_code: '' },
  'y4-2': { id: 'y4-2', name: 'Compiler Design', subject_type: 'core', type: 'study', department: 'Computer Science', year: 4, description: 'Lexical analysis, parsing, and code generation.', entry_code: '' },
  'y4-3': { id: 'y4-3', name: 'Information Security', subject_type: 'elective', type: 'study', department: 'Computer Science', year: 4, description: 'Cryptography, network security, ethical hacking overview.', entry_code: '' },
  'y4-4': { id: 'y4-4', name: 'Major Project Seminar', subject_type: 'elective', type: 'study', department: 'Computer Science', year: 4, description: 'Final year project discussions and progress reviews.', entry_code: '' },
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

  // Try fetching from DB first
  const { data: dbClassroom } = await supabase
    .from('classrooms')
    .select('id, name, subject_type, type, department, year, description, entry_code')
    .eq('id', id)
    .single()

  // Fall back to seed data if not in DB
  const classroom = dbClassroom ?? SEED_CLASSROOMS[id] ?? null

  // If neither DB nor seed, redirect back
  if (!classroom) redirect('/classrooms')

  // Only fetch posts if this is a real DB classroom (seed classrooms have no DB posts)
  const isSeedClassroom = !dbClassroom && !!SEED_CLASSROOMS[id]

  let posts: any[] = []
  let doubtCount = 0

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

    const { count } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('classroom_id', id)
      .eq('type', 'doubt')
      .eq('resolved', false)

    doubtCount = count ?? 0
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
