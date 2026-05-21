import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AppShell from '@/app/components/AppShell'
import ClassroomsClient, { Classroom } from './ClassroomsClient'
import { SEED_CLASSROOMS, DEPT_LABELS } from './data'

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

  const department  = profile?.department  ?? 'CSE'
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
  let classroomsByYear: Record<number, Classroom[]> = SEED_CLASSROOMS[department] ?? SEED_CLASSROOMS['CSE']

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
        departmentCode={department}
      />
    </AppShell>
  )
}
