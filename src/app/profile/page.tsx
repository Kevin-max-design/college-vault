import { requireAuth, getSupabaseClient } from '@/lib/auth-helpers'
import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient'
import AppShell from '../components/AppShell'

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

  return (
    <AppShell pageTitle="PROFILE">
      <ProfileClient 
        profile={profile}
        listings={listings ?? []}
        gameSessions={(gameSessions as any) ?? []}
        email={auth.user.email ?? ''}
      />
    </AppShell>
  )
}
