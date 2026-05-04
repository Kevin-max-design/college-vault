import AppShell from '@/app/components/AppShell'
import ClassroomsClient from '@/app/classrooms/ClassroomsClient'
import type { Classroom, Project } from '@/app/classrooms/ClassroomsClient'

const DEMO_CLASSROOMS: Classroom[] = [
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

const DEMO_PROJECTS: Project[] = [
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

export default function PreviewPage() {
  return (
    <AppShell
      pageTitle="CLASSROOMS"
      userInitials="KR"
    >
      <ClassroomsClient
        classrooms={DEMO_CLASSROOMS}
        projects={DEMO_PROJECTS}
        department="Computer Science"
        selectedYear={2}
      />
    </AppShell>
  )
}
