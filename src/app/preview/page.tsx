import AppShell from '@/app/components/AppShell'
import ClassroomsClient from '@/app/classrooms/ClassroomsClient'
import type { Classroom } from '@/app/classrooms/ClassroomsClient'

const DEMO: Record<number, Classroom[]> = {
  1: [{ id: 'y1-1', name: 'Engineering Mathematics I', subject_type: 'core', description: 'Calculus and matrices.', doubt_count: 5, member_count: 60, is_active_doubt: true, year: 1 }],
  2: [{ id: 'y2-1', name: 'Data Structures & Algorithms', subject_type: 'core', description: 'Arrays, graphs, and sorting.', doubt_count: 12, member_count: 48, is_active_doubt: true, year: 2 }],
  3: [{ id: 'y3-1', name: 'Operating Systems', subject_type: 'core', description: 'Process and memory management.', doubt_count: 3, member_count: 42, is_active_doubt: false, year: 3 }],
  4: [{ id: 'y4-1', name: 'Distributed Systems', subject_type: 'core', description: 'CAP theorem and microservices.', doubt_count: 2, member_count: 28, is_active_doubt: false, year: 4 }],
}

export default function PreviewPage() {
  return (
    <AppShell pageTitle="CLASSROOMS" userInitials="KR">
      <ClassroomsClient
        classroomsByYear={DEMO}
        department="Computer Science"
        userYear={2}
      />
    </AppShell>
  )
}
