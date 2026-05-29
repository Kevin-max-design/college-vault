import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AppShell from '@/app/components/AppShell'
import ClubsClient from './ClubsClient'

export const metadata = {
  title: 'Clubs & Communities — Campus Vault',
  description: 'Reserve your semester club slots at RGMCET. First-come-first-serve with year-wise limits.',
}

export default async function ClubsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/onboarding/verify')
  }

  let profile = null
  try {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, department, year_of_study, role')
      .eq('id', user.id)
      .single()
    profile = data
  } catch (err) {
    console.error('Error fetching profile on clubs page:', err)
  }

  const fullName = profile?.full_name?.trim() || ''
  const initials = fullName
    ? (fullName.split(' ').slice(0, 2).map((n: string) => n ? n[0] : '').join('').toUpperCase() || 'U')
    : 'U'

  return (
    <AppShell pageTitle="Clubs" userAvatarUrl={profile?.avatar_url} userInitials={initials}>
      <ClubsClient />
    </AppShell>
  )
}
