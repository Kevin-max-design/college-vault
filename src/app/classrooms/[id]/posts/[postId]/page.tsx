import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AppShell from '@/app/components/AppShell'
import dynamic from 'next/dynamic'
import { SEED_CLASSROOMS as NESTED_SEED, DEPT_LABELS } from '../../../data'

import PostDetailClient from './PostDetailClient'

interface Props {
  params: Promise<{ id: string; postId: string }>
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

  // ── Classroom resolution: UUID direct lookup OR slug→UUID via RPC ──
  const isUuid = UUID_REGEX.test(id)
  let dbClassroom: any = null

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
  } else {
    // Slug-based: reuse the same RPC that ClassroomDetailPage uses
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
        if (!rpcErr && Array.isArray(resolved) && resolved.length > 0) {
          dbClassroom = resolved[0]
        } else if (rpcErr) {
          console.error('[PostDetail] RPC error:', rpcErr.message)
        }
      } catch (err) {
        console.error('[PostDetail] Slug resolution error:', err)
      }
    }
  }

  // Fall back to seed metadata only if DB is unreachable (degraded mode)
  const classroom = dbClassroom ?? SEED_CLASSROOMS[id] ?? null

  // If neither DB nor seed, redirect back
  if (!classroom) redirect('/classrooms')

  const isSeedClassroom = !dbClassroom && !!SEED_CLASSROOMS[id]

  // Always query posts by real UUID
  const classroomUUID: string | null = dbClassroom?.id ?? null

  let posts: any[] = []

  if (classroomUUID) {
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

    if (postsErr) console.error('[PostDetail] posts query error:', postsErr.message)

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
  } else if (isSeedClassroom) {
    // Degraded mode only
    console.warn('[PostDetail] DB unavailable — degraded mode for slug:', id)
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
