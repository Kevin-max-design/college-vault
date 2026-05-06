import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AppShell from '@/app/components/AppShell'
import ClassroomsClient, { Classroom } from './ClassroomsClient'

/* ── Per-year seed data ─────────────────────────────────────────── */
const SEED_CLASSROOMS: Record<number, Classroom[]> = {
  1: [
    { id: 'y1-1', name: 'Engineering Mathematics I', subject_type: 'core', description: 'Calculus, matrices, and differential equations foundations.', doubt_count: 5, member_count: 60, is_active_doubt: true, year: 1 },
    { id: 'y1-2', name: 'Engineering Physics', subject_type: 'core', description: 'Wave optics and quantum mechanics introduction.', doubt_count: 2, member_count: 58, is_active_doubt: false, year: 1 },
    { id: 'y1-3', name: 'Programming in C', subject_type: 'core', description: 'First principles of programming logic and C syntax.', doubt_count: 18, member_count: 62, is_active_doubt: true, year: 1 },
    { id: 'y1-4', name: 'Basic Electronics', subject_type: 'elective', description: 'Diodes, transistors, and basic circuit design.', doubt_count: 0, member_count: 45, is_active_doubt: false, year: 1 },
  ],
  2: [
    { id: 'y2-1', name: 'Data Structures & Algorithms', subject_type: 'core', description: 'Arrays, linked lists, trees, graphs, and sorting algorithms.', doubt_count: 12, member_count: 48, is_active_doubt: true, year: 2 },
    { id: 'y2-2', name: 'Object-Oriented Programming', subject_type: 'core', description: 'Java classes, inheritance, polymorphism and design patterns.', doubt_count: 3, member_count: 50, is_active_doubt: false, year: 2 },
    { id: 'y2-3', name: 'Computer Organization', subject_type: 'core', description: 'CPU architecture, memory hierarchy, instruction sets.', doubt_count: 0, member_count: 42, is_active_doubt: false, year: 2 },
    { id: 'y2-4', name: 'Discrete Mathematics', subject_type: 'core', description: 'Logic, sets, relations, and graph theory.', doubt_count: 7, member_count: 44, is_active_doubt: true, year: 2 },
  ],
  3: [
    { id: 'y3-1', name: 'Operating Systems', subject_type: 'core', description: 'Process management, memory management, and file systems.', doubt_count: 3, member_count: 42, is_active_doubt: false, year: 3 },
    { id: 'y3-2', name: 'Database Management Systems', subject_type: 'core', description: 'ER models, SQL, transactions and normalization.', doubt_count: 9, member_count: 38, is_active_doubt: true, year: 3 },
    { id: 'y3-3', name: 'Computer Networks', subject_type: 'core', description: 'OSI model, TCP/IP, routing algorithms.', doubt_count: 4, member_count: 35, is_active_doubt: false, year: 3 },
    { id: 'y3-4', name: 'Machine Learning', subject_type: 'elective', description: 'Neural networks and backpropagation deep dive.', doubt_count: 7, member_count: 25, is_active_doubt: true, year: 3 },
    { id: 'y3-5', name: 'Cloud Computing', subject_type: 'elective', description: 'AWS practicals starting this week.', doubt_count: 0, member_count: 30, is_active_doubt: false, year: 3 },
  ],
  4: [
    { id: 'y4-1', name: 'Distributed Systems', subject_type: 'core', description: 'CAP theorem, consistency models, microservices.', doubt_count: 2, member_count: 28, is_active_doubt: false, year: 4 },
    { id: 'y4-2', name: 'Compiler Design', subject_type: 'core', description: 'Lexical analysis, parsing, and code generation.', doubt_count: 6, member_count: 30, is_active_doubt: true, year: 4 },
    { id: 'y4-3', name: 'Information Security', subject_type: 'elective', description: 'Cryptography, network security, ethical hacking overview.', doubt_count: 1, member_count: 22, is_active_doubt: false, year: 4 },
    { id: 'y4-4', name: 'Major Project Seminar', subject_type: 'elective', description: 'Final year project discussions and progress reviews.', doubt_count: 0, member_count: 35, is_active_doubt: false, year: 4 },
  ],
}

const DEPT_LABELS: Record<string, string> = {
  arts:        'Arts & Humanities',
  sciences:    'Natural Sciences',
  engineering: 'Engineering & Tech',
  business:    'Business & Economics',
  law:         'Law & Political Science',
  medicine:    'Medicine & Health Sciences',
  education:   'Education',
  cse:         'Computer Science',
}

/* ── Page (Server Component) ─────────────────────────────────────── */
export default async function ClassroomsPage() {
  const cookieStore = await cookies()
  const supabase    = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/onboarding/verify')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, department, year_of_study, avatar_url')
    .eq('id', user.id)
    .single()

  const department  = profile?.department  ?? 'cse'
  const userYear    = profile?.year_of_study ?? 1
  const avatarUrl   = profile?.avatar_url ?? null
  const fullName    = profile?.full_name ?? ''
  const initials    = fullName
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || 'CV'

  const deptLabel = DEPT_LABELS[department] ?? 'Computer Science'

  /* ── Try to fetch real classrooms per year from DB ─────────────── */
  let classroomsByYear: Record<number, Classroom[]> = SEED_CLASSROOMS

  try {
    const { data: rawClassrooms, error: clsErr } = await supabase
      .from('classrooms')
      .select(`id, name, subject_type, description, year, classroom_members(count)`)
      .eq('department', department)
      .order('created_at', { ascending: true })

    if (!clsErr && rawClassrooms && rawClassrooms.length > 0) {
      const grouped: Record<number, Classroom[]> = { 1: [], 2: [], 3: [], 4: [] }
      for (const row of rawClassrooms as any[]) {
        const yr = row.year ?? 1
        if (grouped[yr]) {
          grouped[yr].push({
            id: row.id,
            name: row.name,
            subject_type: row.subject_type ?? 'core',
            description: row.description ?? '',
            doubt_count: 0,
            member_count: row.classroom_members?.[0]?.count ?? 0,
            is_active_doubt: false,
            year: yr,
          })
        }
      }
      // Only override if we got real data
      if (Object.values(grouped).some(arr => arr.length > 0)) {
        classroomsByYear = grouped
      }
    }
  } catch {
    // Fallback to seed data
  }

  return (
    <AppShell
      pageTitle="CLASSROOMS"
      userAvatarUrl={avatarUrl}
      userInitials={initials}
    >
      <ClassroomsClient
        classroomsByYear={classroomsByYear}
        department={deptLabel}
        userYear={userYear}
      />
    </AppShell>
  )
}
