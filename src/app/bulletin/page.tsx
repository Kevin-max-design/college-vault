import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AppShell from '@/app/components/AppShell'
import dynamic from 'next/dynamic'

const BulletinClient = dynamic(() => import('./BulletinClient'), {
  loading: () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', fontFamily: 'var(--font-jakarta)' }}>
      <div style={{ color: '#00595c', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>sync</span>
        Loading Bulletin...
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
})

export default async function BulletinPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/onboarding/verify')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, role, department')
    .eq('id', user.id)
    .single()

  const avatarUrl  = profile?.avatar_url ?? null
  const fullName   = profile?.full_name?.trim() || ''
  const initials   = fullName
    ? (fullName.split(' ').slice(0, 2).map((n: string) => n ? n[0] : '').join('').toUpperCase() || 'U')
    : 'U'
  const userRole   = (profile?.role ?? 'student') as string
  const department = profile?.department ?? ''

  // Fetch all visible notices:
  // global ones + this user's department notices + personal/own
  const { data: notices } = await supabase
    .from('notices')
    .select(`
      id, title, body, scope, department, tag, pinned, archived, created_at,
      author:profiles!notices_author_id_fkey(id, full_name, avatar_url, role)
    `)
    .eq('archived', false)
    .or(
      `scope.eq.global,and(scope.eq.department,department.eq.${department}),scope.eq.personal`
    )
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <AppShell
      pageTitle="Bulletin"
      userAvatarUrl={avatarUrl}
      userInitials={initials}
    >
      <BulletinClient
        initialNotices={(notices ?? []).map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          scope: n.scope,
          department: n.department,
          tag: n.tag,
          pinned: n.pinned,
          created_at: n.created_at,
          author: Array.isArray(n.author) ? n.author[0] : n.author,
        }))}
        userId={user.id}
        userRole={userRole}
        userDepartment={department}
      />
    </AppShell>
  )
}
