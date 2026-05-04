import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AppShell from '@/app/components/AppShell'
import ClassroomsClient, { Classroom, Project } from './ClassroomsClient'

/* ── Seed / fallback data shown when DB tables don't exist yet ── */
const SEED_CLASSROOMS: Classroom[] = [
  {
    id: 'seed-1',
    name: 'Data Structures & Algorithms',
    subject_type: 'core',
    description: 'Focus on graph theory and dynamic programming patterns this week. TA sessions available.',
    doubt_count: 12,
    member_count: 48,
    is_active_doubt: true,
    year: 3,
  },
  {
    id: 'seed-2',
    name: 'Operating Systems',
    subject_type: 'core',
    description: 'Memory management modules ongoing.',
    doubt_count: 3,
    member_count: 42,
    is_active_doubt: false,
    year: 3,
  },
  {
    id: 'seed-3',
    name: 'Cloud Computing',
    subject_type: 'elective',
    description: 'AWS practicals starting tomorrow.',
    doubt_count: 0,
    member_count: 30,
    is_active_doubt: false,
    year: 4,
  },
  {
    id: 'seed-4',
    name: 'Machine Learning',
    subject_type: 'elective',
    description: 'Neural networks and backpropagation deep dive this sprint.',
    doubt_count: 7,
    member_count: 25,
    is_active_doubt: true,
    year: 4,
  },
]

const SEED_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Web-based DBMS',
    phase: 'Minor Project Phase I',
    description: 'Team Alpha — Sprint 2 active.',
    status: 'on_track',
    icon: 'architecture',
    header_color: 'teal',
    year: 3,
  },
  {
    id: 'proj-2',
    name: 'Linux Kernel Module',
    phase: 'Open Source Contrib',
    description: 'Reviewing patch submission guidelines.',
    status: 'blocked',
    icon: 'code',
    header_color: 'amber',
    year: 4,
  },
]

/* ── Helpers ─────────────────────────────────────────────────── */
function mapStatus(raw: string): 'on_track' | 'blocked' | 'at_risk' {
  if (raw === 'blocked') return 'blocked'
  if (raw === 'at_risk')  return 'at_risk'
  return 'on_track'
}

function mapHeaderColor(i: number): 'teal' | 'amber' {
  return i % 2 === 0 ? 'teal' : 'amber'
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

/* ── Page (Server Component) ─────────────────────────────────── */
export default async function ClassroomsPage() {
  const cookieStore = await cookies()
  const supabase    = createClient(cookieStore)

  /* Auth check */
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/onboarding/verify')

  /* Fetch profile */
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, department, year_of_study, avatar_url')
    .eq('id', user.id)
    .single()

  const department  = profile?.department  ?? 'cse'
  const yearOfStudy = (profile?.year_of_study ?? 3) - 1   // 0-based index
  const avatarUrl   = profile?.avatar_url ?? null
  const fullName    = profile?.full_name ?? ''
  const initials    = fullName
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || 'CV'

  const deptLabel = DEPT_LABELS[department] ?? 'Computer Science'

  /* ── Fetch classrooms ─────────────────────────────────────── */
  let classrooms: Classroom[] = SEED_CLASSROOMS
  let projects:   Project[]   = SEED_PROJECTS

  try {
    const { data: rawClassrooms, error: clsErr } = await supabase
      .from('classrooms')
      .select(`
        id, name, subject_type, description, year,
        classroom_members(count),
        classroom_doubts(count)
      `)
      .eq('department', department)
      .order('created_at', { ascending: true })

    if (!clsErr && rawClassrooms && rawClassrooms.length > 0) {
      classrooms = rawClassrooms.map((row: Record<string, unknown>) => {
        const doubtCount = (row.classroom_doubts as Array<{ count: number }>)?.[0]?.count ?? 0
        const memberCount = (row.classroom_members as Array<{ count: number }>)?.[0]?.count ?? 0
        return {
          id:               row.id as string,
          name:             row.name as string,
          subject_type:     (row.subject_type as 'core' | 'elective') ?? 'core',
          description:      row.description as string ?? '',
          doubt_count:      doubtCount,
          member_count:     memberCount,
          is_active_doubt:  doubtCount > 0,
          year:             (row.year as number) ?? 1,
        }
      })
    }

    /* ── Fetch projects ───────────────────────────────────────── */
    const { data: rawProjects, error: projErr } = await supabase
      .from('projects')
      .select('id, name, phase, description, status, icon, year')
      .eq('department', department)
      .order('created_at', { ascending: true })

    if (!projErr && rawProjects && rawProjects.length > 0) {
      projects = rawProjects.map((row: Record<string, unknown>, i: number) => ({
        id:           row.id as string,
        name:         row.name as string,
        phase:        row.phase as string ?? 'Project',
        description:  row.description as string ?? '',
        status:       mapStatus(row.status as string ?? 'on_track'),
        icon:         row.icon as string ?? 'architecture',
        header_color: mapHeaderColor(i),
        year:         (row.year as number) ?? 1,
      }))
    }
  } catch {
    // Tables might not exist yet — seed data is used as fallback
  }

  return (
    <AppShell
      pageTitle="CLASSROOMS"
      userAvatarUrl={avatarUrl}
      userInitials={initials}
    >
      <ClassroomsClient
        classrooms={classrooms}
        projects={projects}
        department={deptLabel}
        selectedYear={yearOfStudy}
      />
    </AppShell>
  )
}
