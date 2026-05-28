import { requireAuth, getSupabaseClient } from '@/lib/auth-helpers'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import AppShell from '../components/AppShell'

const ProfileClient = dynamic(() => import('./ProfileClient'), {
  loading: () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', fontFamily: 'var(--font-jakarta)' }}>
      <div style={{ color: '#00595c', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>sync</span>
        Loading Profile...
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
})

export default async function ProfilePage() {
  const auth = await requireAuth()
  if (auth.error || !auth.user) {
    redirect('/onboarding/verify')
  }

  const supabase = await getSupabaseClient()

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', auth.user.id)
    .single()

  if (!profile) {
    redirect('/onboarding/role')
  }

  // Fetch user's listings
  const { data: listings } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_id', auth.user.id)
    .order('created_at', { ascending: false })

  // Fetch user's game sessions for trust score
  const { data: gameSessions } = await supabase
    .from('game_sessions')
    .select(`
      id, score, completed_at,
      game:games(title, type)
    `)
    .eq('player_id', auth.user.id)
    .order('completed_at', { ascending: false })

  const initials = profile?.full_name 
    ? profile.full_name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
    : 'CV'

  return (
    <AppShell 
      pageTitle="PROFILE"
      userAvatarUrl={profile?.avatar_url}
      userInitials={initials}
    >
      <ProfileClient 
        profile={profile}
        listings={listings ?? []}
        gameSessions={(gameSessions as any) ?? []}
        email={auth.user.email ?? ''}
      />
    </AppShell>
  )
}
